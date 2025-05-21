#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import time
import json
import logging
import signal
import subprocess
import feedparser
import requests
import datetime
import re
import random
import resource  # 添加resource库用于设置系统资源限制
import gc  # 添加gc库用于主动垃圾回收
import psutil  # 添加psutil库用于监控内存使用
from logging.handlers import RotatingFileHandler
from bs4 import BeautifulSoup  # 添加BeautifulSoup库用于解析HTML
import cloudscraper  # 添加cloudscraper库用于绕过CloudFlare

try:
    import readline
except ImportError:
    pass

# 配置文件和日志文件路径
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, 'config.json')
LOG_FILE = os.path.join(BASE_DIR, 'monitor.log')
PID_FILE = os.path.join(BASE_DIR, 'monitor.pid')
SERVICE_FILE = '/etc/systemd/system/rss_monitor.service'

# 日志配置
log_handler = RotatingFileHandler(LOG_FILE, maxBytes=5*1024*1024, backupCount=1)
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[log_handler]
)
logger = logging.getLogger(__name__)

# 默认配置
DEFAULT_CONFIG = {
    'keywords': [],
    'notified_entries': {},
    'telegram': {
        'bot_token': '',
        'chat_id': ''
    }
}

def load_config():
    """加载配置文件"""
    # 尝试从主配置文件和备份文件加载配置
    config = None
    backup_file = CONFIG_FILE + '.bak'
    
    # 尝试从主配置文件加载
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
            logger.debug("从主配置文件加载配置成功")
        except json.JSONDecodeError:
            logger.error("主配置文件JSON格式错误")
            config = None
        except Exception as e:
            logger.error(f"加载主配置文件失败: {e}")
            config = None
    
    # 如果主配置文件加载失败，尝试从备份文件加载
    if config is None and os.path.exists(backup_file):
        try:
            logger.info("主配置文件加载失败，尝试从备份文件加载")
            with open(backup_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            logger.info("从备份配置文件加载配置成功")
            # 如果从备份加载成功，则恢复到主配置文件
            save_config(config)
        except Exception as e:
            logger.error(f"从备份配置文件加载失败: {e}")
            config = None
    
    # 如果都失败了，使用默认配置
    if config is None:
        logger.warning("无法加载配置文件，使用默认配置")
        config = DEFAULT_CONFIG
        save_config(config)
    else:
        # 确保配置中包含所有必要的键
        if 'keywords' not in config:
            config['keywords'] = []
        if 'notified_entries' not in config:
            config['notified_entries'] = {}
        if 'telegram' not in config:
            config['telegram'] = {'bot_token': '', 'chat_id': ''}
        elif not isinstance(config['telegram'], dict):
            config['telegram'] = {'bot_token': '', 'chat_id': ''}
        else:
            if 'bot_token' not in config['telegram']:
                config['telegram']['bot_token'] = ''
            if 'chat_id' not in config['telegram']:
                config['telegram']['chat_id'] = ''
    
    return config

def save_config(config):
    """保存配置文件"""
    # 定义备份文件路径
    backup_file = CONFIG_FILE + '.bak'
    temp_file = CONFIG_FILE + '.tmp'
    
    try:
        # 检查配置对象大小，防止过大导致内存占用
        # 对历史记录进行清理，防止配置文件无限增长
        # 限制 notified_entries 记录数
        if 'notified_entries' in config and len(config['notified_entries']) > 50:
            # 按照时间排序，保留最新的50条
            sorted_entries = sorted(
                config['notified_entries'].items(),
                key=lambda item: item[1]['time'] if isinstance(item[1], dict) and 'time' in item[1] else '',
                reverse=True
            )[:50]
            config['notified_entries'] = dict(sorted_entries)
            logger.debug("配置保存前已限制通知记录为50条")
        
        # 限制 title_notifications 记录数
        if 'title_notifications' in config and len(config['title_notifications']) > 100:
            # 按照时间排序，保留最新的100条
            sorted_titles = sorted(
                config['title_notifications'].items(),
                key=lambda item: item[1]['time'] if isinstance(item[1], dict) and 'time' in item[1] else '',
                reverse=True
            )[:100]
            config['title_notifications'] = dict(sorted_titles)
            logger.debug("配置保存前已限制标题记录为100条")
        
        # 检查config对象是否有效且可序列化
        try:
            # 测试JSON序列化
            config_str = json.dumps(config, ensure_ascii=False)
            # 检查序列化后的配置文件大小，防止过大
            if len(config_str) > 1024 * 1024:  # 如果大于1MB
                logger.warning(f"配置文件过大 ({len(config_str)/1024:.2f} KB)，尝试清理")
                
                # 保留基本配置，清理历史记录
                basic_config = {
                    'keywords': config.get('keywords', []),
                    'telegram': config.get('telegram', {'bot_token': '', 'chat_id': ''}),
                    'notified_entries': {},
                    'title_notifications': {}
                }
                
                # 仅保留最新的少量记录
                if 'notified_entries' in config and config['notified_entries']:
                    sorted_entries = sorted(
                        config['notified_entries'].items(),
                        key=lambda item: item[1]['time'] if isinstance(item[1], dict) and 'time' in item[1] else '',
                        reverse=True
                    )[:20]  # 只保留最新的20条
                    basic_config['notified_entries'] = dict(sorted_entries)
                
                if 'title_notifications' in config and config['title_notifications']:
                    sorted_titles = sorted(
                        config['title_notifications'].items(),
                        key=lambda item: item[1]['time'] if isinstance(item[1], dict) and 'time' in item[1] else '',
                        reverse=True
                    )[:20]  # 只保留最新的20条
                    basic_config['title_notifications'] = dict(sorted_titles)
                
                # 使用清理后的配置
                config = basic_config
                config_str = json.dumps(config, ensure_ascii=False)
                logger.info(f"配置文件清理后大小: {len(config_str)/1024:.2f} KB")
        except (TypeError, ValueError) as e:
            logger.error(f"配置对象序列化失败: {e}")
            # 如果序列化失败，回退到默认配置
            config = DEFAULT_CONFIG
        
        # 先写入临时文件
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=4)
        
        # 如果原配置文件存在，先创建备份
        if os.path.exists(CONFIG_FILE):
            try:
                # 尝试复制原文件为备份
                import shutil
                shutil.copy2(CONFIG_FILE, backup_file)
            except Exception as e:
                logger.warning(f"创建配置文件备份失败: {e}")
        
        # 将临时文件重命名为正式配置文件
        os.replace(temp_file, CONFIG_FILE)
        
        # 执行垃圾回收
        gc.collect()
    except Exception as e:
        logger.error(f"保存配置文件失败: {e}")
        # 如果有备份，尝试从备份恢复
        if os.path.exists(backup_file):
            try:
                # 尝试从备份恢复
                import shutil
                shutil.copy2(backup_file, CONFIG_FILE)
                logger.info("已从备份恢复配置文件")
            except Exception as e2:
                logger.error(f"从备份恢复配置文件失败: {e2}")
    finally:
        # 清理可能残留的临时文件
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except Exception:
                pass

def send_telegram_message(message, config):
    """发送Telegram消息"""
    bot_token = config['telegram']['bot_token']
    chat_id = config['telegram']['chat_id']
    
    if not bot_token or not chat_id:
        logger.error("Telegram配置不完整")
        return False
    
    try:
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        data = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML"
        }
        response = requests.post(url, data=data)
        if response.status_code == 200:
            logger.info(f"Telegram消息发送成功")
            return True
        else:
            logger.error(f"Telegram消息发送失败: {response.text}")
            return False
    except Exception as e:
        logger.error(f"Telegram消息发送异常: {e}")
        return False

def check_rss_feed(config):
    """检查网页并匹配关键词"""
    # 确保config字典包含必要的键
    if 'keywords' not in config or not isinstance(config['keywords'], list):
        config['keywords'] = []
    
    if 'notified_entries' not in config or not isinstance(config['notified_entries'], dict):
        config['notified_entries'] = {}
    
    # 添加标题-链接映射，用于跟踪已经发送通知的标题，防止重复通知
    if 'title_notifications' not in config:
        config['title_notifications'] = {}
    
    if not config['keywords']:
        logger.warning("没有设置关键词，跳过检查")
        return
    
    max_retries = 3
    retry_delay = 10
    
    # 用于跟踪是否有新的通知，只有在有通知时才保存配置
    config_changed = False
    
    for attempt in range(max_retries):
        try:
            logger.info("尝试使用cloudscraper绕过CloudFlare防护...")
            
            # 创建一个cloudscraper实例，这是专门为绕过CloudFlare防护设计的
            scraper = cloudscraper.create_scraper(
                browser={
                    'browser': 'chrome',
                    'platform': 'windows',
                    'desktop': True
                },
                delay=5  # 每次请求之间的延迟
            )
            
            # 首先访问主页以获取所有必要的cookie和令牌
            logger.info("访问主页获取必要的Cookie和令牌...")
            scraper.get("https://www.nodeseek.com", timeout=30)
            
            # 随机延迟，模拟人类行为
            human_delay = random.uniform(3, 7)
            logger.info(f"模拟人类浏览行为，等待{human_delay:.2f}秒...")
            time.sleep(human_delay)
            
            # 请求NodeSeek网页
            logger.info("请求帖子列表页面...")
            response = scraper.get("https://www.nodeseek.com/?sortBy=postTime", timeout=30)
            
            if response.status_code != 200:
                logger.error(f"获取网页失败，HTTP状态码: {response.status_code}")
                
                # 尝试打印响应内容以便调试
                logger.error(f"响应内容: {response.text[:500]}...")
                
                if attempt < max_retries - 1:
                    # 增加失败后的等待时间
                    current_retry_delay = retry_delay * (attempt + 2)  # 进一步增加等待时间
                    logger.info(f"将在{current_retry_delay}秒后重试 ({attempt+1}/{max_retries})")
                    time.sleep(current_retry_delay)
                    continue
                return
            
            # 使用BeautifulSoup解析HTML，使用lxml解析器以减少内存占用
            html_content = response.text
            response = None  # 释放response对象，减少内存占用
            
            # 使用BeautifulSoup解析HTML之前先进行一次垃圾回收
            gc.collect()
            
            # 使用内存效率更高的lxml解析器
            soup = BeautifulSoup(html_content, 'lxml')
            
            # 获取必要信息后释放原始HTML内容
            html_content = None
            gc.collect()  # 再次进行垃圾回收
            
            # 检查页面内容是否包含NodeSeek的典型内容
            is_valid_page = False
            if soup.title:
                logger.info(f"页面标题: {soup.title.text}")
                if 'NodeSeek' in soup.title.text or '论坛' in soup.title.text:
                    is_valid_page = True
            
            if not is_valid_page:
                # 尝试查找页面上的关键元素来确认是否是有效的NodeSeek页面
                if soup.select('.navbar') or soup.select('header') or soup.select('footer'):
                    is_valid_page = True
            
            if not is_valid_page:
                logger.error("获取到的页面似乎不是有效的NodeSeek页面，可能仍被CloudFlare拦截")
                # 保存一部分页面内容以便分析（限制大小）
                debug_content = str(soup)[:1000]  # 限制为1000字符
                logger.debug(f"页面内容片段: {debug_content}")
                
                # 释放soup对象
                soup = None
                gc.collect()
                
                if attempt < max_retries - 1:
                    current_retry_delay = retry_delay * (attempt + 2)
                    logger.info(f"将在{current_retry_delay}秒后重试 ({attempt+1}/{max_retries})")
                    time.sleep(current_retry_delay)
                    continue
                return
            
            # 正常页面，开始查找帖子
            logger.info("成功获取NodeSeek页面，开始查找帖子...")
            
            # 查找帖子列表（根据NodeSeek网页结构调整选择器）
            # 尝试多种可能的CSS选择器
            selectors_to_try = [
                '.post-list .post-item', 
                '.post-card', 
                '.post-item',
                '.category-post-item',
                'article',
                '.topic-item',
                '.thread-item',
                '.card',
                '.topic-list .topic',  # 新增选择器
                '.topic-list .topic-item',  # 新增选择器
                '.topic-list tr',  # 新增选择器
                '.row.topic-list-item',  # 新增选择器
                '.node-teaser',  # 新增选择器
                'tbody tr',  # 新增选择器
                '.item',  # 更通用的选择器
                '.list-item',  # 更通用的选择器
                '.thread',  # 新增选择器
                '.post',  # 新增选择器
                'a.subject',  # 可能的标题链接
                '[class*="post"]',  # 部分匹配class包含post的元素
                '[class*="topic"]'  # 部分匹配class包含topic的元素
            ]
            
            post_items = []
            
            # 优化查找过程，一旦找到符合条件的选择器就停止尝试
            found_selector = None
            for selector in selectors_to_try:
                items = soup.select(selector)
                if items and len(items) >= 5:  # 至少有5个项目才算有效
                    logger.info(f"使用选择器 '{selector}' 找到了 {len(items)} 个元素")
                    post_items = items[:40]  # 只处理前40个帖子
                    found_selector = selector
                    break
            
            # 如果找不到帖子，获取页面HTML并记录下来以便分析
            if not post_items:
                logger.info("常规选择器未找到帖子，尝试分析页面结构...")
                
                # 保存页面的一些关键信息以帮助调试
                logger.info(f"页面标题: {soup.title.text if soup.title else 'No title'}")
                
                # 尝试查找任何包含链接的div元素
                logger.info("尝试查找带有链接的div元素...")
                potential_post_divs = []
                for div in soup.find_all('div', limit=100):  # 限制搜索范围减少内存使用
                    links = div.find_all('a', limit=5)
                    if links and len(div.get_text(strip=True)) > 20:  # 确保div有一定的内容
                        potential_post_divs.append(div)
                        if len(potential_post_divs) >= 40:
                            break  # 找到足够多的元素后停止
                
                if potential_post_divs:
                    logger.info(f"通过div+链接方式找到了 {len(potential_post_divs)} 个可能的帖子")
                    post_items = potential_post_divs[:40]  # 只处理前40个帖子
            
            # 如果还是找不到，尝试直接查找所有链接
            if not post_items:
                logger.info("尝试直接查找所有链接...")
                link_elements = soup.select('a[href*="/post/"], a[href*="/topic/"], a[href*="/thread/"], a[href*="/discussion/"]', limit=40)
                if link_elements:
                    logger.info(f"找到了 {len(link_elements)} 个可能的帖子链接")
                    # 直接使用链接元素作为帖子项
                    post_items = link_elements
            
            # 如果以上方法都失败，尝试查找表格行
            if not post_items:
                logger.info("尝试查找表格行...")
                table_rows = soup.select('table tr', limit=40)
                if table_rows and len(table_rows) > 1:  # 跳过表头
                    logger.info(f"找到了 {len(table_rows)-1} 个表格行")
                    post_items = table_rows[1:40] if len(table_rows) > 40 else table_rows[1:]  # 跳过表头，限制数量
            
            # 如果还是找不到，记录错误并重试
            if not post_items:
                logger.error("无法在网页中找到帖子列表，可能网页结构已更改")
                
                # 释放soup对象
                soup = None
                gc.collect()
                
                if attempt < max_retries - 1:
                    current_retry_delay = retry_delay * (attempt + 2)
                    logger.info(f"将在{current_retry_delay}秒后重试 ({attempt+1}/{max_retries})")
                    time.sleep(current_retry_delay)
                    continue
                return
            
            logger.info(f"成功获取帖子列表，共找到 {len(post_items)} 条帖子")
            
            # 处理找到的帖子
            processed_count = 0
            for post in post_items:
                try:
                    # 每处理10个帖子进行一次垃圾回收，减少内存占用
                    processed_count += 1
                    if processed_count % 10 == 0:
                        gc.collect()
                    
                    # 尝试多种可能的标题选择器
                    title_element = None
                    title_selectors = [
                        'a.post-title', '.post-title', 'h3', 'h2', '.title', 'h4', 
                        'a[href*="/post/"]', 'a[href*="/topic/"]', 'a[href*="/thread/"]', 
                        'a.subject', '.subject', 'a.title', 'td.topic-title a',
                        'a[class*="title"]', '.topic-name a', '.thread-title a', 'a.thread-link',
                        'a' # 最后尝试任何链接
                    ]
                    
                    for selector in title_selectors:
                        title_element = post.select_one(selector)
                        if title_element:
                            logger.debug(f"使用选择器 '{selector}' 找到了标题元素")
                            break
                    
                    # 如果没有找到标题元素但post本身是链接，则使用post作为标题元素
                    if not title_element and post.name == 'a':
                        title_element = post
                        logger.debug("帖子本身是链接，直接使用")
                    
                    # 如果仍然没有找到标题元素，尝试查找任何链接
                    if not title_element:
                        links = post.find_all('a', limit=3)  # 限制搜索数量
                        if links:
                            # 使用第一个链接作为标题元素
                            title_element = links[0]
                            logger.debug("使用第一个链接作为标题")
                    
                    if not title_element:
                        logger.warning("无法解析帖子的标题元素")
                        continue
                        
                    # 提取标题文本
                    if hasattr(title_element, 'get_text'):
                        title = title_element.get_text(strip=True)
                    else:
                        title = str(title_element).strip()
                    
                    # 如果标题为空，尝试其他方法
                    if not title:
                        # 尝试获取任何文本内容
                        title = post.get_text(strip=True)
                        logger.debug(f"使用帖子完整文本作为标题: {title[:30]}...")
                        
                        # 如果内容太长，取前50个字符
                        if len(title) > 50:
                            title = title[:50] + "..."
                    
                    # 过滤掉太短的标题，可能是误判
                    if len(title) < 2:
                        logger.warning(f"跳过标题过短的帖子: '{title}'")
                        continue
                    
                    # 提取链接URL
                    link = None
                    
                    # 如果标题元素有href属性，直接获取
                    if hasattr(title_element, 'get') and title_element.get('href'):
                        link = title_element.get('href')
                        logger.debug(f"从标题元素获取链接: {link}")
                    
                    # 如果没有获取到链接，尝试在帖子中查找链接
                    if not link:
                        link_selectors = [
                            'a[href*="/post/"]', 'a[href*="/topic/"]', 'a[href*="/thread/"]',
                            'a[href*="/discussion/"]', 'a.subject', 'a.title', 'a[class*="title"]',
                            'a' # 最后尝试任何链接
                        ]
                        
                        for selector in link_selectors:
                            link_element = post.select_one(selector)
                            if link_element and link_element.get('href'):
                                link = link_element.get('href')
                                logger.debug(f"使用选择器 '{selector}' 找到链接: {link}")
                                break
                    
                    # 如果链接是相对路径，转换为绝对URL
                    if link and not link.startswith('http'):
                        if link.startswith('/'):
                            link = 'https://www.nodeseek.com' + link
                        else:
                            link = 'https://www.nodeseek.com/' + link
                        logger.debug(f"转换为绝对URL: {link}")
                    
                    if not link:
                        logger.warning("无法获取帖子的链接")
                        continue
                    
                    # 过滤掉包含/space/的链接，避免重复通知
                    if '/space/' in link:
                        logger.debug(f"跳过用户空间链接，避免重复通知: {link}")
                        continue
                    
                    # 输出调试信息
                    logger.debug(f"帖子标题='{title}', 链接={link}")
                    
                    # 提取帖子ID，用于唯一性判断
                    post_id = None
                    post_id_patterns = [
                        r'/post/(\d+)',
                        r'/topic/(\d+)',
                        r'/thread/(\d+)',
                        r'/space/(\d+)',
                        r'/discussion/(\d+)'
                    ]
                    
                    for pattern in post_id_patterns:
                        match = re.search(pattern, link)
                        if match:
                            post_id = match.group(1)
                            break
                    
                    # 生成唯一ID（优先使用帖子ID，如果没有则使用完整链接）
                    entry_id = f"post_{post_id}" if post_id else link
                    
                    # 检查标题是否已经通知过(无论链接如何)
                    normalized_title = title.lower().strip()
                    current_time = datetime.datetime.now()
                    # 清理超过24小时的标题记录
                    title_cleanup = []
                    for t_key, t_data in config.get('title_notifications', {}).items():
                        last_time = datetime.datetime.strptime(t_data['time'], '%Y-%m-%d %H:%M:%S')
                        if (current_time - last_time).total_seconds() > 86400:  # 24小时
                            title_cleanup.append(t_key)
                    
                    for t_key in title_cleanup:
                        if t_key in config['title_notifications']:
                            del config['title_notifications'][t_key]
                    
                    # 检查是否有相似标题已经通知过
                    title_already_notified = False
                    for t_key, t_data in config.get('title_notifications', {}).items():
                        # 标题相似度检查 - 如果标题完全相同或者包含关系
                        if normalized_title == t_key or normalized_title in t_key or t_key in normalized_title:
                            # 检查时间是否在2小时内
                            last_time = datetime.datetime.strptime(t_data['time'], '%Y-%m-%d %H:%M:%S')
                            if (current_time - last_time).total_seconds() < 7200:  # 2小时内
                                logger.debug(f"跳过已通知过的相似标题: {title}, 原标题: {t_data['title']}")
                                title_already_notified = True
                                break
                    
                    if title_already_notified:
                        continue
                    
                    # 检查是否在ID列表中
                    if entry_id in config['notified_entries']:
                        logger.debug(f"跳过已通知过的帖子ID: {entry_id}")
                        continue
                    
                    # 匹配关键词
                    matched_keywords = []
                    for keyword in config['keywords']:
                        if keyword.lower() in title.lower():
                            matched_keywords.append(keyword)
                    
                    if matched_keywords:
                        # 记录到标题通知历史
                        config['title_notifications'][normalized_title] = {
                            'title': title,
                            'link': link,
                            'time': current_time.strftime('%Y-%m-%d %H:%M:%S')
                        }
                        
                        # 记录到已通知列表（只保存必要信息）
                        config['notified_entries'][entry_id] = {
                            'title': title,
                            'link': link,
                            'keywords': matched_keywords,
                            'time': current_time.strftime('%Y-%m-%d %H:%M:%S')
                        }
                        
                        # 标记配置已更改
                        config_changed = True
                        
                        # 发送Telegram通知
                        message = f"<b>NodeSeek 网页监控 检测到关键词匹配！</b>\n\n关键词: {', '.join(matched_keywords)}\n标题: {title}\n链接: {link}"
                        if send_telegram_message(message, config):
                            logger.info(f"检测到关键词 '{', '.join(matched_keywords)}' 在帖子 '{title}' 并成功发送通知")
                        else:
                            logger.error(f"发送通知失败，帖子标题: {title}")
                            # 如果发送失败，从已通知列表中移除
                            if entry_id in config['notified_entries']:
                                del config['notified_entries'][entry_id]
                except Exception as e:
                    logger.error(f"处理帖子时出错: {str(e)}")
                    continue
            
            # 释放soup对象
            soup = None
            post_items = None
            gc.collect()
            
            # 限制notified_entries的数量为最新的50条
            if len(config['notified_entries']) > 50:
                # 按照时间排序，保留最新的50条
                sorted_entries = sorted(
                    config['notified_entries'].items(),
                    key=lambda item: item[1]['time'],
                    reverse=True
                )[:50]
                
                # 更新为只包含最新50条的字典
                config['notified_entries'] = dict(sorted_entries)
                logger.info(f"已限制记录数量为50条")
                config_changed = True
            
            # 限制title_notifications的数量
            if len(config.get('title_notifications', {})) > 100:
                # 按照时间排序，保留最新的100条
                sorted_titles = sorted(
                    config['title_notifications'].items(),
                    key=lambda item: item[1]['time'],
                    reverse=True
                )[:100]
                
                # 更新为只包含最新100条的字典
                config['title_notifications'] = dict(sorted_titles)
                logger.info(f"已限制标题记录数量为100条")
                config_changed = True
            
            # 只有在配置有变更时才保存配置
            if config_changed:
                save_config(config)
                
            return  # 成功完成，退出函数
            
        except cloudscraper.exceptions.CloudflareException as e:
            logger.error(f"CloudScraper错误: {str(e)}")
        except requests.exceptions.Timeout:
            logger.error(f"获取网页超时 (尝试 {attempt+1}/{max_retries})")
        except requests.exceptions.ConnectionError:
            logger.error(f"连接网站服务器失败: 连接错误 (尝试 {attempt+1}/{max_retries})")
        except MemoryError:
            logger.error(f"内存溢出错误 (尝试 {attempt+1}/{max_retries})")
            # 强制进行垃圾回收
            gc.collect()
            # 如果不是最后一次尝试，休息较长时间后再重试
            if attempt < max_retries - 1:
                recovery_delay = retry_delay * 3
                logger.info(f"内存溢出后恢复中，将在{recovery_delay}秒后重试")
                time.sleep(recovery_delay)
        except Exception as e:
            logger.error(f"检查网页时出错: {str(e)} (尝试 {attempt+1}/{max_retries})")
        
        # 如果不是最后一次尝试，则等待后重试
        if attempt < max_retries - 1:
            # 增加失败后的等待时间
            current_retry_delay = retry_delay * (attempt + 2)
            logger.info(f"将在{current_retry_delay}秒后重试 ({attempt+1}/{max_retries})")
            time.sleep(current_retry_delay)

def monitor_loop():
    """监控循环"""
    logger.info("开始网页监控")
    
    # 尝试增加系统文件描述符限制（仅Linux系统）
    if os.name != 'nt' and 'resource' in sys.modules:
        try:
            soft, hard = resource.getrlimit(resource.RLIMIT_NOFILE)
            logger.info(f"当前文件描述符限制: 软限制={soft}, 硬限制={hard}")
            
            # 尝试设置为硬限制值或者较大的值（如果可能）
            new_soft = min(hard, 4096)  # 将软限制提高到硬限制或4096
            resource.setrlimit(resource.RLIMIT_NOFILE, (new_soft, hard))
            new_soft, new_hard = resource.getrlimit(resource.RLIMIT_NOFILE)
            logger.info(f"已调整文件描述符限制: 软限制={new_soft}, 硬限制={new_hard}")
        except Exception as e:
            logger.warning(f"无法调整文件描述符限制: {e}")
    else:
        logger.info("在Windows系统上运行，跳过文件描述符限制设置")
    
    # 记录PID到文件，以便其他进程可以检测到监控正在运行
    with open(PID_FILE, 'w') as f:
        f.write(str(os.getpid()))
    
    # 设置检查间隔（秒）
    min_interval = 10  # 最小间隔10秒
    max_interval = 20  # 最大间隔20秒
    consecutive_errors = 0
    max_consecutive_errors = 5
    
    # 错误计数器，用于自适应调整检查间隔
    error_stats = {
        'total_errors': 0,
        'cf_errors': 0,
        'last_success': time.time()
    }
    
    # 加载初始配置
    config = load_config()
    # 设置配置重新加载计数器
    reload_counter = 0
    
    # 内存监控变量
    gc_counter = 0  # 垃圾回收计数器
    memory_check_counter = 0  # 内存检查计数器
    memory_threshold = 200 * 1024 * 1024  # 内存阈值（200MB）
    last_gc_time = time.time()  # 上次垃圾回收时间
    
    # 添加检测计数器，用于在检测10次后重启进程
    detection_counter = 0
    max_detection_count = 10
    
    try:
        while True:
            try:
                # 定期进行垃圾回收（每10次循环）
                gc_counter += 1
                if gc_counter >= 10:
                    logger.debug("执行周期性垃圾回收...")
                    gc.collect()
                    gc_counter = 0
                    last_gc_time = time.time()
                
                # 内存使用监控（每5次循环）
                memory_check_counter += 1
                if memory_check_counter >= 5:
                    try:
                        process = psutil.Process(os.getpid())
                        memory_info = process.memory_info()
                        memory_usage = memory_info.rss  # 实际物理内存使用
                        
                        logger.debug(f"当前内存使用: {memory_usage / (1024 * 1024):.2f} MB")
                        
                        # 如果内存使用超过阈值，强制进行垃圾回收
                        if memory_usage > memory_threshold:
                            logger.warning(f"内存使用超过阈值 ({memory_usage / (1024 * 1024):.2f} MB > {memory_threshold / (1024 * 1024)} MB)，执行强制垃圾回收")
                            # 执行完整的垃圾回收
                            gc.collect(2)
                            
                            # 检查垃圾回收后的内存使用
                            new_memory_info = process.memory_info()
                            new_memory_usage = new_memory_info.rss
                            
                            # 如果垃圾回收后内存仍然过高，可能存在内存泄漏
                            if new_memory_usage > memory_threshold * 0.9:  # 如果仍然超过阈值的90%
                                logger.error(f"垃圾回收后内存使用仍然过高 ({new_memory_usage / (1024 * 1024):.2f} MB)，可能存在内存泄漏，尝试重启监控进程")
                                # 重启进程 - 区分Windows和Linux
                                if os.name == 'nt':  # Windows
                                    logger.info("Windows系统上不支持直接重启进程，建议手动重启程序")
                                    # 可以考虑在Windows上使用其他方式重启
                                    # 例如创建一个bat文件然后执行
                                    restart_cmd = f'@echo off\ntimeout /t 5\n"{sys.executable}" "{sys.argv[0]}" {" ".join(sys.argv[1:])}'
                                    restart_bat = os.path.join(BASE_DIR, 'restart.bat')
                                    try:
                                        with open(restart_bat, 'w') as f:
                                            f.write(restart_cmd)
                                        # 使用subprocess启动，不等待结果
                                        subprocess.Popen(['start', restart_bat], shell=True)
                                        logger.info(f"已创建重启脚本: {restart_bat}")
                                        # 清理当前进程
                                        if os.path.exists(PID_FILE):
                                            os.remove(PID_FILE)
                                        sys.exit(0)  # 正常退出当前进程
                                    except Exception as e:
                                        logger.error(f"创建重启脚本失败: {e}")
                                else:  # Linux
                                    # 使用execv重启进程
                                    os.execv(sys.executable, [sys.executable] + sys.argv)
                    except Exception as e:
                        logger.error(f"内存监控出错: {e}")
                    
                    memory_check_counter = 0
                
                # 只有在每10次循环或出错后才重新加载配置
                if reload_counter >= 10:
                    config = load_config()
                    reload_counter = 0
                else:
                    reload_counter += 1
                
                check_rss_feed(config)
                consecutive_errors = 0  # 重置错误计数
                error_stats['last_success'] = time.time()  # 记录上次成功时间
                
                # 增加检测计数器
                detection_counter += 1
                logger.info(f"完成第 {detection_counter}/{max_detection_count} 次检测")
                
                # 如果达到10次检测，重启进程
                if detection_counter >= max_detection_count:
                    logger.info(f"已完成 {max_detection_count} 次检测，准备重启进程...")
                    
                    # 重启进程 - 区分Windows和Linux
                    if os.name == 'nt':  # Windows
                        logger.info("Windows系统上通过创建批处理文件重启进程")
                        restart_cmd = f'@echo off\ntimeout /t 5\n"{sys.executable}" "{sys.argv[0]}" {" ".join(sys.argv[1:])}'
                        restart_bat = os.path.join(BASE_DIR, 'restart.bat')
                        try:
                            with open(restart_bat, 'w') as f:
                                f.write(restart_cmd)
                            # 使用subprocess启动，不等待结果
                            subprocess.Popen(['start', restart_bat], shell=True)
                            logger.info(f"已创建重启脚本: {restart_bat}")
                            # 清理当前进程
                            if os.path.exists(PID_FILE):
                                os.remove(PID_FILE)
                            sys.exit(0)  # 正常退出当前进程
                        except Exception as e:
                            logger.error(f"创建重启脚本失败: {e}")
                            # 重置计数器，继续运行
                            detection_counter = 0
                    else:  # Linux
                        logger.info("Linux系统上使用execv重启进程")
                        # 使用execv重启进程
                        if os.path.exists(PID_FILE):
                            os.remove(PID_FILE)
                        os.execv(sys.executable, [sys.executable] + sys.argv)
            except Exception as e:
                error_msg = str(e)
                consecutive_errors += 1
                error_stats['total_errors'] += 1
                
                # 检查是否是CloudFlare相关错误
                if '403' in error_msg or 'cloudflare' in error_msg.lower() or 'cloud' in error_msg.lower():
                    error_stats['cf_errors'] += 1
                    logger.error(f"CloudFlare相关错误: {e}")
                elif 'Too many open files' in error_msg:
                    logger.error(f"文件描述符耗尽错误: {e}")
                    # 文件描述符耗尽时，强制进行垃圾回收
                    gc.collect()
                    # 等待系统释放资源
                    time.sleep(30)
                    # 重置计数器，强制下次重新加载配置
                    reload_counter = 10
                # 添加内存错误处理
                elif 'MemoryError' in error_msg or 'memory' in error_msg.lower():
                    logger.error(f"可能的内存相关错误: {e}")
                    # 执行完整的垃圾回收
                    gc.collect(2)
                    # 睡眠一段时间让系统恢复
                    time.sleep(30)
                    # 如果超过一小时没有进行过垃圾回收，可能是内存泄漏，尝试重启进程
                    if time.time() - last_gc_time > 3600:  # 1小时
                        logger.error("可能存在内存泄漏，尝试重启监控进程")
                        # 区分Windows和Linux重启方式
                        if os.name == 'nt':  # Windows
                            logger.info("Windows系统上不支持直接重启进程，建议手动重启程序")
                            # 同样创建bat脚本重启
                            restart_cmd = f'@echo off\ntimeout /t 5\n"{sys.executable}" "{sys.argv[0]}" {" ".join(sys.argv[1:])}'
                            restart_bat = os.path.join(BASE_DIR, 'restart.bat')
                            try:
                                with open(restart_bat, 'w') as f:
                                    f.write(restart_cmd)
                                # 使用subprocess启动，不等待结果
                                subprocess.Popen(['start', restart_bat], shell=True)
                                logger.info(f"已创建重启脚本: {restart_bat}")
                                # 清理当前进程
                                if os.path.exists(PID_FILE):
                                    os.remove(PID_FILE)
                                sys.exit(0)  # 正常退出当前进程
                            except Exception as e:
                                logger.error(f"创建重启脚本失败: {e}")
                        else:  # Linux
                            # 使用execv重启进程
                            os.execv(sys.executable, [sys.executable] + sys.argv)
                else:
                    logger.error(f"监控循环异常: {e}")
                
                # 如果连续错误次数过多，增加检查间隔
                if consecutive_errors >= max_consecutive_errors:
                    logger.warning(f"连续出现{consecutive_errors}次错误，增加检查间隔")
                    
                    # 立即进行长时间等待
                    long_wait = max_interval * 2
                    logger.info(f"等待{long_wait}秒后恢复检查...")
                    time.sleep(long_wait)
                    consecutive_errors = 0  # 重置错误计数
                    # 强制下次重新加载配置
                    reload_counter = 10
                    continue
            
            # 生成随机等待时间
            check_interval = random.uniform(min_interval, max_interval)
            
            # 记录等待时间和下次检查时间点
            next_check_time = datetime.datetime.now() + datetime.timedelta(seconds=check_interval)
            logger.info(f"等待{check_interval:.2f}秒后进行下一次检查 (预计时间: {next_check_time.strftime('%H:%M:%S')})")
            
            # 正常等待下一次检查
            time.sleep(check_interval)
    except KeyboardInterrupt:
        logger.info("监控被用户中断")
    except Exception as e:
        logger.error(f"监控循环严重异常: {e}")
    finally:
        # 清理PID文件
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)

def is_monitoring_running():
    """检查监控进程是否在运行"""
    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE, 'r') as f:
                pid = int(f.read().strip())
            
            # 检查进程是否存在
            os.kill(pid, 0)
            return True
        except (ProcessLookupError, ValueError, FileNotFoundError):
            # 进程不存在或PID文件内容无效
            if os.path.exists(PID_FILE):
                os.remove(PID_FILE)
            return False
    return False

def start_background_monitor():
    """在后台启动监控"""
    if is_monitoring_running():
        print("监控已经在后台运行中")
        return False
    
    config = load_config()
    if not config['telegram']['bot_token'] or not config['telegram']['chat_id']:
        print("错误: 请先配置Telegram设置")
        return False
    
    if not config['keywords']:
        print("警告: 没有设置关键词，监控将不会有任何通知")
    
    try:
        # 使用nohup启动后台进程
        cmd = f"nohup {sys.executable} {__file__} --daemon > /dev/null 2>&1 & echo $! > {PID_FILE}"
        subprocess.run(cmd, shell=True)
        print("监控已在后台启动")
        logger.info("监控在后台启动")
        return True
    except Exception as e:
        print(f"启动后台监控失败: {e}")
        logger.error(f"启动后台监控失败: {e}")
        return False

def stop_background_monitor():
    """停止后台监控"""
    pid = None
    found_process = False
    
    # 首先检查是否是通过systemd服务启动的
    is_systemd_service = False
    try:
        # 检查服务是否正在运行
        systemd_check_cmd = "systemctl is-active rss_monitor.service"
        result = subprocess.run(systemd_check_cmd, shell=True, capture_output=True, text=True)
        if result.stdout.strip() == "active":
            is_systemd_service = True
            logger.info("检测到通过systemd服务启动的监控进程")
            print("检测到通过systemd服务启动的监控")
            
            # 尝试停止systemd服务
            try:
                print("正在停止systemd服务...")
                stop_cmd = "systemctl stop rss_monitor.service"
                subprocess.run(stop_cmd, shell=True)
                
                # 验证服务是否已停止
                time.sleep(2)  # 给一些时间让服务停止
                verify_cmd = "systemctl is-active rss_monitor.service"
                verify_result = subprocess.run(verify_cmd, shell=True, capture_output=True, text=True)
                
                if verify_result.stdout.strip() != "active":
                    logger.info("systemd服务已成功停止")
                    print("监控已成功停止")
                    
                    # 清理PID文件(如果存在)
                    if os.path.exists(PID_FILE):
                        try:
                            os.remove(PID_FILE)
                        except Exception as e:
                            logger.error(f"删除PID文件失败: {e}")
                    
                    return True
                else:
                    logger.error("无法通过systemd停止服务")
                    print("无法通过systemd停止服务，尝试其他方法...")
            except Exception as e:
                logger.error(f"停止systemd服务时出错: {e}")
                print(f"停止systemd服务时出错: {e}")
    except Exception as e:
        logger.error(f"检查systemd服务状态时出错: {e}")
    
    # 方法1：通过PID文件获取进程ID
    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE, 'r') as f:
                pid = int(f.read().strip())
                found_process = True
            logger.debug(f"从PID文件中读取到进程ID: {pid}")
        except (ValueError, FileNotFoundError) as e:
            logger.error(f"读取PID文件时出错: {e}")
    
    if not found_process:
        print("PID文件不存在或无效，尝试查找运行中的监控进程...")
        
        # 方法2：尝试使用ps命令查找进程
        try:
            cmd = f"ps aux | grep '{sys.executable}.*{os.path.basename(__file__)}.*--daemon' | grep -v grep"
            logger.info(f"执行命令: {cmd}")
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.stdout.strip():
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    parts = line.split()
                    if len(parts) > 1:
                        pid = int(parts[1])
                        found_process = True
                        logger.info(f"通过ps命令找到进程ID: {pid}")
                        break
        except Exception as e:
            logger.error(f"使用ps命令查找进程时出错: {e}")
    
    if not found_process:
        # 方法3：尝试查找包含rss_monitor的所有Python进程
        try:
            print("尝试查找所有监控相关进程...")
            cmd = f"ps aux | grep python | grep 'rss_monitor' | grep -v grep"
            logger.info(f"执行命令: {cmd}")
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.stdout.strip():
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    parts = line.split()
                    if len(parts) > 1:
                        pid = int(parts[1])
                        found_process = True
                        logger.info(f"通过扩展ps命令找到进程ID: {pid}")
                        break
        except Exception as e:
            logger.error(f"使用扩展ps命令查找进程时出错: {e}")
    
    if not found_process:
        print("没有找到运行中的监控进程")
        # 清理可能残留的PID文件
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)
        return False
    
    success = False
    
    # 使用kill命令终止进程
    if pid:
        try:
            # 首先尝试使用SIGTERM信号终止进程
            logger.info(f"正在尝试使用SIGTERM终止进程 PID: {pid}")
            os.kill(pid, signal.SIGTERM)
            
            # 等待进程终止，最多等待10秒
            max_wait = 20  # 最多等待20秒(40次*0.5秒)
            for i in range(max_wait):
                time.sleep(0.5)
                try:
                    # 检查进程是否还在运行
                    os.kill(pid, 0)
                    # 如果能执行到这里，表示进程还在运行
                    if i % 4 == 0:  # 每2秒输出一次等待信息
                        print(f"等待进程终止... ({i//2+1}/{max_wait//2}秒)")
                except ProcessLookupError:
                    # 进程已经终止
                    success = True
                    logger.info(f"进程 {pid} 已成功终止")
                    break
                except Exception as e:
                    logger.error(f"检查进程状态时出错: {e}")
                    break
            
            # 如果SIGTERM没有效果，尝试SIGKILL
            if not success:
                logger.warning(f"SIGTERM信号无效，尝试使用SIGKILL强制终止进程 PID: {pid}")
                try:
                    os.kill(pid, signal.SIGKILL)
                    
                    # 再次等待确认进程终止
                    for i in range(10):  # 最多等待5秒
                        time.sleep(0.5)
                        try:
                            os.kill(pid, 0)
                            # 进程仍在运行
                        except ProcessLookupError:
                            # 进程已终止
                            success = True
                            logger.info(f"进程 {pid} 已通过SIGKILL成功终止")
                            break
                except ProcessLookupError:
                    # 进程已经终止
                    success = True
                    logger.info(f"进程 {pid} 已终止")
                except Exception as e:
                    logger.error(f"发送SIGKILL信号时出错: {e}")
        except Exception as e:
            logger.error(f"尝试终止进程时出错: {e}")
    
    # 如果前面的方法都失败，尝试使用pkill命令
    if not success:
        logger.warning("标准终止方法失败，尝试使用pkill命令...")
        try:
            # 使用pkill强制终止所有相关进程
            print("尝试使用pkill命令强制终止所有相关进程...")
            pkill_cmd = f"pkill -9 -f '{os.path.basename(__file__)} --daemon'"
            logger.info(f"执行命令: {pkill_cmd}")
            subprocess.run(pkill_cmd, shell=True)
            time.sleep(2)  # 给进程一些时间终止
            
            # 验证进程是否终止
            check_cmd = f"pgrep -f '{os.path.basename(__file__)} --daemon'"
            result = subprocess.run(check_cmd, shell=True, capture_output=True)
            if result.returncode != 0:  # 没有找到进程，表示已终止
                success = True
                logger.info("进程已通过pkill成功终止")
            else:
                # 最后手段，尝试终止所有Python进程中包含rss_monitor的进程
                print("尝试终止所有相关Python进程...")
                pkill_cmd = f"pkill -9 -f 'python.*rss_monitor'"
                logger.info(f"执行命令: {pkill_cmd}")
                subprocess.run(pkill_cmd, shell=True)
                time.sleep(2)
                
                # 再次检查
                check_cmd = f"pgrep -f 'python.*rss_monitor'"
                result = subprocess.run(check_cmd, shell=True, capture_output=True)
                if result.returncode != 0:
                    success = True
                    logger.info("所有相关Python进程已终止")
        except Exception as e:
            logger.error(f"使用pkill终止进程时出错: {e}")
    
    # 清理PID文件
    if os.path.exists(PID_FILE):
        try:
            os.remove(PID_FILE)
            logger.info("已删除PID文件")
        except Exception as e:
            logger.error(f"删除PID文件时出错: {e}")
    
    if success:
        print("监控已成功停止")
        logger.info("监控已成功停止")
        return True
    else:
        print("警告: 无法确认监控进程是否已终止，请手动检查并终止进程")
        logger.error("无法确认进程终止状态")
        return False

def setup_autostart(enable=True):
    """设置开机自启"""
    config = load_config()
    if enable and (not config['telegram']['bot_token'] or not config['telegram']['chat_id']):
        print("错误: 请先配置Telegram设置")
        return False
    
    # 修改服务文件内容，直接使用--daemon参数启动后台监控
    service_content = f"""[Unit]
Description=NodeSeek网页监控服务
After=network.target

[Service]
ExecStart={sys.executable} {os.path.abspath(__file__)} --daemon
WorkingDirectory={BASE_DIR}
Restart=always
User={os.getenv('USER', 'root')}

[Install]
WantedBy=multi-user.target
"""
    
    try:
        if enable:
            with open(SERVICE_FILE, 'w') as f:
                f.write(service_content)
            
            subprocess.run("systemctl daemon-reload", shell=True)
            subprocess.run("systemctl enable rss_monitor", shell=True)
            print("已启用开机自启")
            logger.info("已启用开机自启")
            return True
        else:
            if os.path.exists(SERVICE_FILE):
                subprocess.run("systemctl disable rss_monitor", shell=True)
                os.remove(SERVICE_FILE)
                print("已禁用开机自启")
                logger.info("已禁用开机自启")
                return True
            else:
                print("开机自启未设置")
                return False
    except Exception as e:
        print(f"设置开机自启失败: {e}")
        logger.error(f"设置开机自启失败: {e}")
        return False

def view_logs(lines=50):
    """查看日志"""
    if not os.path.exists(LOG_FILE):
        print("日志文件不存在")
        return
    
    try:
        with open(LOG_FILE, 'r', encoding='utf-8') as f:
            log_content = f.readlines()
        
        # 限制行数在20-2000之间
        while True:
            try:
                lines = int(input(f"请输入要查看的日志行数 (20-2000，默认{lines}): ") or lines)
                if 20 <= lines <= 2000:
                    break
                else:
                    print("行数必须在20-2000之间")
            except ValueError:
                print("请输入有效的数字")
        
        # 显示最后N行日志
        log_lines = log_content[-lines:] if len(log_content) > lines else log_content
        for line in log_lines:
            print(line.strip())
        
        input("按回车键继续...")
    except Exception as e:
        print(f"查看日志失败: {e}")

def add_keyword():
    """添加关键词"""
    config = load_config()
    
    # 确保config字典包含keywords键且是列表类型
    if 'keywords' not in config or not isinstance(config['keywords'], list):
        config['keywords'] = []
        save_config(config)
    
    try:
        print("请输入要添加的关键词:")
        try:
            keyword = input("").strip()
        except UnicodeDecodeError:
            print("输入过程中出现编码错误，可能是终端不兼容中文退格。请直接重新输入，不要在中文输入时频繁退格。")
            input("按回车键继续...")
            return
        # 移除所有多余的空格
        keyword = re.sub(r'\s+', ' ', keyword).strip()
        if not keyword:
            print("关键词不能为空")
            input("按回车键继续...")
            return
        if keyword in config['keywords']:
            print(f"关键词 '{keyword}' 已存在")
        else:
            config['keywords'].append(keyword)
            save_config(config)
            print(f"关键词 '{keyword}' 已添加")
            logger.info(f"关键词 '{keyword}' 已添加")
        input("按回车键继续...")
    except EOFError:
        print("\n输入被中断")
        input("按回车键继续...")
    except KeyboardInterrupt:
        print("\n操作已取消")
        input("按回车键继续...")
    except Exception as e:
        print(f"\n输入过程出错: {e}")
        input("按回车键继续...")

def delete_keyword():
    """删除关键词"""
    config = load_config()
    
    # 确保config字典包含keywords键且是列表类型
    if 'keywords' not in config or not isinstance(config['keywords'], list):
        config['keywords'] = []
        save_config(config)
    
    if not config['keywords']:
        print("没有设置关键词")
        input("按回车键继续...")
        return
    
    try:
        print("当前关键词列表:")
        for i, keyword in enumerate(config['keywords'], 1):
            print(f"{i}. {keyword}")
        
        choice = input("请输入要删除的关键词编号 (0取消): ")
        if not choice.strip() or choice.strip() == '0':
            # 直接返回主菜单，不显示消息也不等待用户按回车
            return
            
        choice = int(choice)
        
        if 1 <= choice <= len(config['keywords']):
            keyword = config['keywords'][choice-1]
            config['keywords'].pop(choice-1)
            save_config(config)
            print(f"关键词 '{keyword}' 已删除")
            logger.info(f"关键词 '{keyword}' 已删除")
        else:
            print("无效的选择")
    except ValueError:
        print("请输入有效的数字")
    except (EOFError, KeyboardInterrupt):
        print("\n操作已取消")
    except Exception as e:
        print(f"发生错误: {e}")
    
    input("按回车键继续...")

def view_keywords():
    """查看所有关键词"""
    try:
        config = load_config()
        
        # 确保config字典包含keywords键且是列表类型
        if 'keywords' not in config or not isinstance(config['keywords'], list):
            config['keywords'] = []
            save_config(config)
        
        if not config['keywords']:
            print("没有设置关键词")
        else:
            print("当前关键词列表:")
            for i, keyword in enumerate(config['keywords'], 1):
                print(f"{i}. {keyword}")
    except Exception as e:
        print(f"查看关键词失败: {e}")
    
    input("按回车键继续...")

def setup_telegram():
    """设置Telegram"""
    config = load_config()
    
    print("Telegram设置")
    print("1. 设置Bot Token")
    print("2. 设置Chat ID")
    print("3. 发送测试消息")
    print("0. 返回")
    
    choice = input("请选择: ")
    
    if choice == '1':
        token = input("请输入Bot Token: ").strip()
        if token:
            config['telegram']['bot_token'] = token
            save_config(config)
            print("Bot Token已设置")
            # 停留750毫秒后返回主菜单
            time.sleep(0.75)
        # 直接返回主菜单，不需要按回车
        return
    elif choice == '2':
        chat_id = input("请输入Chat ID: ").strip()
        if chat_id:
            config['telegram']['chat_id'] = chat_id
            save_config(config)
            print("Chat ID已设置")
            # 停留750毫秒后返回主菜单
            time.sleep(0.75)
        # 直接返回主菜单，不需要按回车
        return
    elif choice == '3':
        if not config['telegram']['bot_token'] or not config['telegram']['chat_id']:
            print("请先设置Bot Token和Chat ID")
        else:
            if send_telegram_message("这是一条测试消息，NodeSeek网页监控已成功配置！", config):
                print("测试消息发送成功")
            else:
                print("测试消息发送失败，请检查配置")
        # 只在发送测试消息后保留按回车键返回主菜单
        input("按回车键继续...")

def is_autostart_enabled():
    """检查开机自启是否已启用"""
    return os.path.exists(SERVICE_FILE) and subprocess.run("systemctl is-enabled rss_monitor", shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).returncode == 0

def main_menu():
    """主菜单"""
    while True:
        os.system('clear' if os.name == 'posix' else 'cls')
        print("NodeSeek论坛网页监控程序")
        print("=" * 30)
        print("1. 添加关键词")
        print("2. 删除关键词")
        print("3. 查看所有关键词")
        print("4. 查看日志")
        print("5. 在后台启动监控（SSH关闭后继续运行）")
        print("6. 停止后台监控")
        print("7. 启用开机自启")
        print("8. 关闭开机自启")
        print("9. Telegram设置")
        print("0. 退出")
        print("=" * 30)
        
        # 显示当前监控状态
        monitor_status = "运行中" if is_monitoring_running() else "未运行"
        autostart_status = "已启用" if is_autostart_enabled() else "未启用"
        print(f"当前监控状态: {monitor_status}")
        print(f"开机自启状态: {autostart_status}")
        print("=" * 30)
        
        choice = input("请选择: ")
        
        if choice == '1':
            add_keyword()
        elif choice == '2':
            delete_keyword()
        elif choice == '3':
            view_keywords()
        elif choice == '4':
            view_logs()
        elif choice == '5':
            start_background_monitor()
            input("按回车键继续...")
        elif choice == '6':
            stop_background_monitor()
            input("按回车键继续...")
        elif choice == '7':
            setup_autostart(True)
            input("按回车键继续...")
        elif choice == '8':
            setup_autostart(False)
            input("按回车键继续...")
        elif choice == '9':
            setup_telegram()
        elif choice == '0':
            print("退出程序")
            break
        else:
            print("无效的选择")
            input("按回车键继续...")

if __name__ == "__main__":
    # 检查必要的库是否已安装
    missing_libraries = []
    try:
        import psutil
    except ImportError:
        missing_libraries.append("psutil")
    
    try:
        import cloudscraper
    except ImportError:
        missing_libraries.append("cloudscraper")
    
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        missing_libraries.append("beautifulsoup4")
    
    try:
        import lxml
    except ImportError:
        missing_libraries.append("lxml")
    
    # 如果有缺失的库，提示安装
    if missing_libraries:
        print("检测到缺少以下库，请先安装:")
        for lib in missing_libraries:
            print(f"  - {lib}")
        print("\n可以使用以下命令安装所有缺失的库:")
        print(f"pip install {' '.join(missing_libraries)}")
        sys.exit(1)
    
    # 检查是否在Windows系统上
    if os.name == 'nt':  # Windows系统
        # Windows系统上不使用resource库
        resource = None
        # 修改PID_FILE路径为Windows兼容
        PID_FILE = os.path.join(BASE_DIR, 'monitor.pid.txt')
        # 警告用户一些功能在Windows上可能不可用
        print("提示: 在Windows系统上运行，部分Linux功能可能不可用")
    
    if len(sys.argv) > 1 and sys.argv[1] == "--daemon":
        # 后台守护进程模式
        try:
            # 设置信号处理
            def signal_handler(sig, frame):
                logger.info("接收到终止信号，停止网页监控")
                if os.path.exists(PID_FILE):
                    os.remove(PID_FILE)
                sys.exit(0)
            
            signal.signal(signal.SIGTERM, signal_handler)
            signal.signal(signal.SIGINT, signal_handler)
            
            monitor_loop()
        except KeyboardInterrupt:
            logger.info("监控被用户中断")
            if os.path.exists(PID_FILE):
                os.remove(PID_FILE)
        except Exception as e:
            logger.error(f"监控异常: {e}")
            if os.path.exists(PID_FILE):
                os.remove(PID_FILE)
    else:
        # 交互式菜单模式
        try:
            main_menu()
        except KeyboardInterrupt:
            print("\n程序已退出")
