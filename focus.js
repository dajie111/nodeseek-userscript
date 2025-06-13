// ========== 论坛热点统计 ==========

(function() {
    'use strict';

    // 热点统计模块
    const NodeSeekFocus = {
        // RSS数据缓存
        rssCache: null,
        rssCacheTime: 0,
        cacheExpireTime: 10 * 60 * 1000, // 10分钟缓存

        // 常用停止词列表（中文）
        stopWords: new Set([
            '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '但是', '那', '只', '下', '把', '还', '多', '没', '为', '又', '可', '家', '学', '只是', '过', '时间', '很多', '来', '两', '用', '她', '国', '动', '进', '成', '回', '什', '边', '作', '对', '开', '而', '已', '些', '现', '山', '民', '候', '经', '发', '工', '向', '事', '命', '给', '长', '水', '几', '义', '三', '声', '于', '高', '手', '知', '理', '眼', '志', '点', '心', '战', '二', '问', '但', '体', '方', '实', '吃', '做', '叫', '当', '住', '听', '革', '打', '呢', '真', '全', '才', '四', '已经', '从', '达', '听到', '头', '风', '今', '如果', '总', '合', '技', '化', '报', '叫', '教', '记', '或', '特', '数', '各', '结', '此', '白', '深', '近', '论', '美', '计', '等', '集', '任', '认', '千', '万', '关', '信', '听', '决', '选', '约', '话', '意', '情', '究', '入', '整', '联', '才能', '导', '争', '运', '世', '被', '加', '脑', '保', '则', '哪', '觉', '元', '请', '切', '由', '钱', '那么', '定', '每', '希', '术', '领', '位', '所', '它', '此外', '将', '感', '期', '神', '导致', '除', '年', '最', '后', '能', '主', '立', '机', '分', '门', '如何', '因为', '可以', '这个', '那个', '他', '她', '它们', '他们', '我们', '时候', '地方', '可能', '应该', '能够', '以及', '因此', '所以', '然后', '不过', '如此', '其实', '当然', '确实', '虽然', '尽管', '无论', '不管', '只要', '即使', '哪怕', '既然', '由于', '除了', '根据', '按照', '为了', '通过', '利用', '关于', '针对', '依据', '基于'
        ]),

        // 数字和符号正则
        numberSymbolRegex: /^[\d\[\]()【】（）\-\+\*\/=<>≤≥！!？?。，、：；"'""''…\s]+$/,

        // 初始化模块
        init() {
            console.log('热点统计模块初始化完成');
        },

        // 抓取RSS数据
        async fetchRSSData() {
            const now = Date.now();
            
            // 检查缓存
            if (this.rssCache && (now - this.rssCacheTime) < this.cacheExpireTime) {
                console.log('使用缓存的RSS数据');
                return this.rssCache;
            }

            try {
                console.log('开始抓取RSS数据...');
                
                // 使用代理服务或直接请求
                const proxyUrl = 'https://api.allorigins.win/raw?url=';
                const targetUrl = 'https://rss.nodeseek.com/';
                const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
                
                if (!response.ok) {
                    throw new Error(`HTTP错误! 状态码: ${response.status}`);
                }

                const rssText = await response.text();
                console.log('RSS数据抓取成功，长度:', rssText.length);

                // 解析RSS
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(rssText, 'text/xml');
                
                // 检查解析错误
                const parseError = xmlDoc.querySelector('parsererror');
                if (parseError) {
                    throw new Error('RSS解析失败');
                }

                // 提取标题
                const items = xmlDoc.querySelectorAll('item');
                const titles = [];
                
                items.forEach(item => {
                    const titleElement = item.querySelector('title');
                    if (titleElement && titleElement.textContent) {
                        // 清理CDATA标签
                        let title = titleElement.textContent.trim();
                        title = title.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
                        if (title) {
                            titles.push(title);
                        }
                    }
                });

                console.log(`提取到 ${titles.length} 个标题`);
                
                // 缓存数据
                this.rssCache = titles;
                this.rssCacheTime = now;
                
                return titles;

            } catch (error) {
                console.error('抓取RSS失败:', error);
                
                // 如果有缓存数据，即使过期也返回
                if (this.rssCache) {
                    console.log('使用过期的缓存数据作为备用');
                    return this.rssCache;
                }
                
                throw error;
            }
        },

        // 中文分词（简单实现）
        segmentChinese(text) {
            const words = [];
            let currentWord = '';
            
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                
                // 中文字符范围
                if (/[\u4e00-\u9fff]/.test(char)) {
                    currentWord += char;
                    
                    // 检查是否可以形成更长的词
                    let foundLongerWord = false;
                    for (let len = Math.min(8, text.length - i); len >= 2; len--) {
                        const candidate = text.substr(i, len);
                        if (this.isValidWord(candidate)) {
                            words.push(candidate);
                            i += len - 1;
                            currentWord = '';
                            foundLongerWord = true;
                            break;
                        }
                    }
                    
                    if (!foundLongerWord && currentWord.length >= 1) {
                        // 单个中文字符也可以是词
                        if (currentWord.length === 1) {
                            words.push(currentWord);
                            currentWord = '';
                        }
                    }
                } else {
                    // 非中文字符，结束当前词
                    if (currentWord) {
                        words.push(currentWord);
                        currentWord = '';
                    }
                    
                    // 处理英文单词和数字
                    if (/[a-zA-Z0-9]/.test(char)) {
                        let word = char;
                        while (i + 1 < text.length && /[a-zA-Z0-9]/.test(text[i + 1])) {
                            i++;
                            word += text[i];
                        }
                        if (word.length >= 2) {
                            words.push(word);
                        }
                    }
                }
            }
            
            // 添加剩余的词
            if (currentWord) {
                words.push(currentWord);
            }
            
            return words;
        },

        // 判断是否为有效词汇
        isValidWord(word) {
            if (!word || word.length < 2) return false;
            if (this.stopWords.has(word)) return false;
            if (this.numberSymbolRegex.test(word)) return false;
            
            // 一些常见的有效词汇模式
            const validPatterns = [
                /^[\u4e00-\u9fff]{2,}$/, // 纯中文词汇
                /^[a-zA-Z]{3,}$/, // 英文词汇
                /^[\u4e00-\u9fff]+[a-zA-Z0-9]+$/, // 中文+英文数字
                /^[a-zA-Z0-9]+[\u4e00-\u9fff]+$/, // 英文数字+中文
                /^\d{2,}$/ // 纯数字（年份等）
            ];
            
            return validPatterns.some(pattern => pattern.test(word));
        },

        // 词频统计
        analyzeWordFrequency(titles) {
            const wordCount = new Map();
            
            console.log('开始分析词频...');
            
            titles.forEach(title => {
                // 预处理：移除特殊字符，但保留中文、英文、数字
                const cleanTitle = title.replace(/[^\u4e00-\u9fff\w\s]/g, ' ');
                
                // 分词
                const words = this.segmentChinese(cleanTitle);
                
                words.forEach(word => {
                    if (this.isValidWord(word)) {
                        const count = wordCount.get(word) || 0;
                        wordCount.set(word, count + 1);
                    }
                });
            });
            
            // 转换为数组并排序
            const sortedWords = Array.from(wordCount.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 50); // 取前50个

            console.log(`词频分析完成，共找到 ${wordCount.size} 个不同词汇`);
            
            return sortedWords;
        },

        // 显示热点统计弹窗
        async showHotTopicsDialog() {
            // 检查弹窗是否已存在
            const existingDialog = document.getElementById('hot-topics-dialog');
            if (existingDialog) {
                existingDialog.remove();
                return;
            }

            // 创建加载提示
            const loadingDialog = this.createLoadingDialog();
            document.body.appendChild(loadingDialog);

            try {
                // 抓取数据
                const titles = await this.fetchRSSData();
                
                // 分析词频
                const wordFrequency = this.analyzeWordFrequency(titles);
                
                // 移除加载提示
                loadingDialog.remove();
                
                // 显示结果弹窗
                this.createResultDialog(titles, wordFrequency);
                
            } catch (error) {
                loadingDialog.remove();
                
                // 显示错误信息
                this.createErrorDialog(error.message);
                
                // 记录到日志
                if (window.addLog) {
                    window.addLog('热点统计失败: ' + error.message);
                }
            }
        },

        // 创建加载对话框
        createLoadingDialog() {
            const dialog = document.createElement('div');
            dialog.id = 'hot-topics-loading';
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10000;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                padding: 30px;
                text-align: center;
                min-width: 200px;
            `;

            dialog.innerHTML = `
                <div style="font-size: 16px; margin-bottom: 15px;">正在抓取热点数据...</div>
                <div style="font-size: 12px; color: #666;">请稍候</div>
            `;

            return dialog;
        },

        // 创建错误对话框
        createErrorDialog(errorMessage) {
            const dialog = document.createElement('div');
            dialog.id = 'hot-topics-error';
            dialog.style.cssText = `
                position: fixed;
                top: 60px;
                right: 16px;
                z-index: 10000;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                padding: 20px;
                max-width: 400px;
            `;

            dialog.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <div style="font-weight: bold; font-size: 16px; color: #f44336;">热点统计失败</div>
                    <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; font-size: 20px; color: #999;">&times;</span>
                </div>
                <div style="color: #666; font-size: 14px;">${errorMessage}</div>
                <div style="margin-top: 10px;">
                    <button onclick="this.parentElement.parentElement.remove()" style="padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer;">关闭</button>
                </div>
            `;

            document.body.appendChild(dialog);
            
            // 5秒后自动关闭
            setTimeout(() => {
                if (dialog.parentElement) {
                    dialog.remove();
                }
            }, 5000);
        },

        // 创建结果对话框
        createResultDialog(titles, wordFrequency) {
            const dialog = document.createElement('div');
            dialog.id = 'hot-topics-dialog';
            dialog.style.cssText = `
                position: fixed;
                top: 60px;
                right: 16px;
                z-index: 10000;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                padding: 18px 20px 12px 20px;
                max-height: 80vh;
                overflow-y: auto;
            `;

            // 移动端适配
            if (window.innerWidth <= 767) {
                dialog.style.cssText += `
                    position: fixed !important;
                    width: 96% !important;
                    left: 2% !important;
                    right: 2% !important;
                    top: 10px !important;
                    max-height: 88vh !important;
                `;
            } else {
                dialog.style.width = '500px';
            }

            // 标题和关闭按钮
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                margin-bottom: 15px;
                position: relative;
            `;

            const title = document.createElement('div');
            title.textContent = `NodeSeek热点统计 (共${titles.length}条)`;
            title.style.cssText = `
                font-weight: bold;
                font-size: 16px;
                color: #FF5722;
            `;

            const closeBtn = document.createElement('span');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                position: absolute;
                right: 0;
                top: -5px;
                cursor: pointer;
                font-size: 20px;
                color: #999;
            `;
            closeBtn.onclick = () => dialog.remove();

            header.appendChild(title);
            header.appendChild(closeBtn);
            dialog.appendChild(header);

            // 统计信息
            const statsDiv = document.createElement('div');
            statsDiv.style.cssText = `
                background: #f5f5f5;
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 15px;
                font-size: 12px;
                color: #666;
            `;
            
            const cacheInfo = this.rssCacheTime ? `缓存时间：${new Date(this.rssCacheTime).toLocaleString()}` : '实时数据';
            statsDiv.innerHTML = `
                数据来源：NodeSeek RSS<br>
                ${cacheInfo}<br>
                分析文章：${titles.length} 篇<br>
                热门词汇：${wordFrequency.length} 个
            `;
            dialog.appendChild(statsDiv);

            // 词频列表
            if (wordFrequency.length > 0) {
                const listContainer = document.createElement('div');
                listContainer.style.cssText = `
                    max-height: 50vh;
                    overflow-y: auto;
                    border: 1px solid #eee;
                    border-radius: 5px;
                `;

                wordFrequency.forEach((item, index) => {
                    const [word, count] = item;
                    const itemDiv = document.createElement('div');
                    itemDiv.style.cssText = `
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 12px;
                        border-bottom: 1px solid #f0f0f0;
                        background: ${index < 3 ? '#fff3e0' : '#fff'};
                    `;

                    // 排名标记
                    let rankMark = '';
                    if (index === 0) rankMark = '🥇';
                    else if (index === 1) rankMark = '🥈';
                    else if (index === 2) rankMark = '🥉';
                    else rankMark = `#${index + 1}`;

                    // 热度条
                    const maxCount = wordFrequency[0][1];
                    const percentage = (count / maxCount) * 100;
                    
                    itemDiv.innerHTML = `
                        <div style="display: flex; align-items: center; flex: 1;">
                            <span style="margin-right: 8px; font-size: 14px; min-width: 30px;">${rankMark}</span>
                            <span style="font-weight: ${index < 5 ? 'bold' : 'normal'}; color: ${index < 3 ? '#FF5722' : '#333'};">${word}</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <div style="width: 60px; height: 8px; background: #f0f0f0; border-radius: 4px; margin-right: 8px; overflow: hidden;">
                                <div style="width: ${percentage}%; height: 100%; background: ${index < 3 ? '#FF5722' : '#2196F3'}; border-radius: 4px;"></div>
                            </div>
                            <span style="font-size: 12px; color: #666; min-width: 25px; text-align: right;">${count}</span>
                        </div>
                    `;

                    listContainer.appendChild(itemDiv);
                });

                dialog.appendChild(listContainer);
            } else {
                const emptyDiv = document.createElement('div');
                emptyDiv.textContent = '暂无热点数据';
                emptyDiv.style.cssText = `
                    text-align: center;
                    color: #888;
                    margin: 20px 0;
                `;
                dialog.appendChild(emptyDiv);
            }

            // 刷新按钮
            const refreshBtn = document.createElement('button');
            refreshBtn.textContent = '刷新数据';
            refreshBtn.style.cssText = `
                margin-top: 15px;
                padding: 5px 15px;
                background: #FF5722;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            `;
            refreshBtn.onclick = () => {
                // 清除缓存并重新获取
                this.rssCache = null;
                this.rssCacheTime = 0;
                dialog.remove();
                this.showHotTopicsDialog();
            };
            dialog.appendChild(refreshBtn);

            document.body.appendChild(dialog);

            // 添加拖拽功能
            if (window.makeDraggable) {
                window.makeDraggable(dialog, {width: 50, height: 50});
            }

            // 记录到日志
            if (window.addLog) {
                window.addLog(`热点统计完成：分析 ${titles.length} 条数据，发现 ${wordFrequency.length} 个热门词汇`);
            }
        }
    };

    // 暴露到全局
    window.NodeSeekFocus = NodeSeekFocus;
    
    // 初始化
    NodeSeekFocus.init();

})();
