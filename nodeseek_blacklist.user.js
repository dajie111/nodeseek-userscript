// ==UserScript==
// @name         NodeSeek 综合插件
// @namespace    http://tampermonkey.net/
// @version      2026.01.04
// @description  NodeSeek 论坛黑名单，拉黑后红色高亮并可备注，增加域名检测控制按钮显隐，支持折叠功能，显示用户详细信息，快捷回复功能
// @author       YourName
// @match        https://www.nodeseek.com/*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/filter.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/statistics.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/blacklist.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/Friends.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/Clockin.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/focus.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/quickReply.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/emojis.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/login.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/vps.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/History.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/notes.js

// ==/UserScript==

(function () {
    'use strict';

    // 黑名单数据结构：{ username: {remark: 'xxx'} }
    const STORAGE_KEY = 'nodeseek_blacklist';

    // 收藏数据结构：[{title, url, remark, timestamp, category}]
    const FAVORITES_KEY = 'nodeseek_favorites';
    // 收藏分类列表存储键
    const FAVORITES_CATEGORIES_KEY = 'nodeseek_favorites_categories';
    const FAVORITE_CATEGORY_NAME_MAX_LEN = 4;
    const FAVORITE_CATEGORY_MAX_COUNT = 6;

    // 新增：折叠状态的存储键
    const COLLAPSED_STATE_KEY = 'nodeseek_buttons_collapsed';

    // 新增：用户数据缓存的存储键
    const USER_DATA_CACHE_KEY = 'nodeseek_user_data_cache';

    // 新增：用户信息显示状态的存储键
    const USER_INFO_DISPLAY_KEY = 'nodeseek_user_info_display';

    // 新增：浏览历史记录的存储键
    const BROWSE_HISTORY_KEY = 'nodeseek_browse_history';

    // 新增：获取用户信息显示状态
    function getUserInfoDisplayState() {
        return localStorage.getItem(USER_INFO_DISPLAY_KEY) !== 'false'; // 默认开启
    }

    // 新增：保存用户信息显示状态
    function setUserInfoDisplayState(isEnabled) {
        localStorage.setItem(USER_INFO_DISPLAY_KEY, isEnabled.toString());
    }

    // 新增：浏览历史记录管理
    function getBrowseHistory() {
        if (window.NodeSeekHistory && window.NodeSeekHistory.getBrowseHistory) {
            return window.NodeSeekHistory.getBrowseHistory();
        }
        return JSON.parse(localStorage.getItem(BROWSE_HISTORY_KEY) || '[]');
    }

    function setBrowseHistory(list) {
        if (window.NodeSeekHistory && window.NodeSeekHistory.setBrowseHistory) {
            return window.NodeSeekHistory.setBrowseHistory(list);
        }
        localStorage.setItem(BROWSE_HISTORY_KEY, JSON.stringify(list));
    }

    function addToBrowseHistory(title, url) {
        if (window.NodeSeekHistory && window.NodeSeekHistory.addToBrowseHistory) {
            return window.NodeSeekHistory.addToBrowseHistory(title, url);
        }
    }

    function clearBrowseHistory() {
        if (window.NodeSeekHistory && window.NodeSeekHistory.clearBrowseHistory) {
            return window.NodeSeekHistory.clearBrowseHistory();
        }
        localStorage.removeItem(BROWSE_HISTORY_KEY);
    }

    // 新增：清理现有的重复记录
    function cleanupDuplicateHistory() {
        if (window.NodeSeekHistory && window.NodeSeekHistory.cleanupDuplicateHistory) {
            return window.NodeSeekHistory.cleanupDuplicateHistory();
        }
        return false;
    }

    // 读取黑名单
    function getBlacklist() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    }

    // 保存黑名单
    function setBlacklist(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    // 读取收藏
    function getFavorites() {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    }

    // 保存收藏
    function setFavorites(list) {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
    }

    function normalizeFavoriteCategoryName(rawName) {
        if (rawName === null || rawName === undefined) return '';
        const name = String(rawName).trim();
        if (!name) return '';
        if (name === '未分类') return '未分类';
        return name.slice(0, FAVORITE_CATEGORY_NAME_MAX_LEN);
    }

    // 获取收藏分类列表
    function getFavoriteCategories() {
        const rawCategories = JSON.parse(localStorage.getItem(FAVORITES_CATEGORIES_KEY) || '[]');
        const keptCustom = [];
        const seen = new Set();

        if (Array.isArray(rawCategories)) {
            for (const raw of rawCategories) {
                const normalized = normalizeFavoriteCategoryName(raw);
                if (!normalized || normalized === '未分类') continue;
                if (seen.has(normalized)) continue;
                if (keptCustom.length >= FAVORITE_CATEGORY_MAX_COUNT) continue;
                seen.add(normalized);
                keptCustom.push(normalized);
            }
        }

        const sanitized = ['未分类', ...keptCustom];
        let categoriesChanged = !Array.isArray(rawCategories) || rawCategories.length !== sanitized.length;
        if (!categoriesChanged) {
            for (let i = 0; i < sanitized.length; i++) {
                if (rawCategories[i] !== sanitized[i]) {
                    categoriesChanged = true;
                    break;
                }
            }
        }
        if (categoriesChanged) {
            setFavoriteCategories(sanitized);
        }

        const favorites = getFavorites();
        let favoritesChanged = false;
        if (Array.isArray(favorites) && favorites.length > 0) {
            for (const fav of favorites) {
                const rawCat = fav && fav.category ? fav.category : '未分类';
                const normalized = normalizeFavoriteCategoryName(rawCat) || '未分类';
                const nextCategory = (normalized !== '未分类' && seen.has(normalized)) ? normalized : '未分类';
                if (fav && fav.category !== nextCategory) {
                    fav.category = nextCategory;
                    favoritesChanged = true;
                }
            }
        }
        if (favoritesChanged) {
            setFavorites(favorites);
        }

        return sanitized;
    }

    // 保存收藏分类列表
    function setFavoriteCategories(categories) {
        localStorage.setItem(FAVORITES_CATEGORIES_KEY, JSON.stringify(categories));
    }

    // 添加收藏分类
    function addFavoriteCategory(category) {
        const normalized = normalizeFavoriteCategoryName(category);
        if (!normalized || normalized === '未分类') return false;
        const categories = getFavoriteCategories();
        const customCount = categories.filter(c => c !== '未分类').length;
        if (customCount >= FAVORITE_CATEGORY_MAX_COUNT) return false;
        if (categories.includes(normalized)) return false;
        categories.push(normalized);
        setFavoriteCategories(categories);
        return true;
    }

    // 删除收藏分类
    function removeFavoriteCategory(category) {
        if (category === '未分类') return false; // 不能删除默认分类
        const categories = getFavoriteCategories();
        const index = categories.indexOf(category);
        if (index === -1) return false;
        categories.splice(index, 1);
        setFavoriteCategories(categories);
        // 将该分类下的收藏移动到"未分类"
        const favorites = getFavorites();
        favorites.forEach(fav => {
            if (fav.category === category) {
                fav.category = '未分类';
            }
        });
        setFavorites(favorites);
        return true;
    }

    // 重命名收藏分类
    function renameFavoriteCategory(oldName, newName) {
        if (oldName === '未分类') return false; // 不能重命名默认分类
        const normalized = normalizeFavoriteCategoryName(newName);
        if (!normalized || normalized === '未分类') return false;
        const categories = getFavoriteCategories();
        if (categories.includes(normalized)) return false; // 新名称已存在
        const index = categories.indexOf(oldName);
        if (index === -1) return false;
        categories[index] = normalized;
        setFavoriteCategories(categories);
        // 更新该分类下的收藏
        const favorites = getFavorites();
        favorites.forEach(fav => {
            if (fav.category === oldName) {
                fav.category = normalized;
            }
        });
        setFavorites(favorites);
        return true;
    }

    // 新增：获取折叠状态
    function getCollapsedState() {
        return localStorage.getItem(COLLAPSED_STATE_KEY) === 'true';
    }

    // 新增：保存折叠状态
    function setCollapsedState(isCollapsed) {
        localStorage.setItem(COLLAPSED_STATE_KEY, isCollapsed.toString());
    }

    // 新增：用户数据缓存管理
    function getUserDataCache() {
        const cache = JSON.parse(localStorage.getItem(USER_DATA_CACHE_KEY) || '{}');
        // 清理过期缓存（1小时过期）
        const now = Date.now();
        const expireTime = 1 * 60 * 60 * 1000; // 1小时
        Object.keys(cache).forEach(userId => {
            if (cache[userId].timestamp && (now - cache[userId].timestamp) > expireTime) {
                delete cache[userId];
            }
        });
        localStorage.setItem(USER_DATA_CACHE_KEY, JSON.stringify(cache));
        return cache;
    }

    function setUserDataCache(userId, data) {
        const cache = getUserDataCache();
        cache[userId] = {
            ...data,
            timestamp: Date.now()
        };
        localStorage.setItem(USER_DATA_CACHE_KEY, JSON.stringify(cache));
    }

    // 新增：抓取用户数据
    async function fetchUserData(userId) {
        try {
            // 先检查缓存
            const cache = getUserDataCache();
            if (cache[userId] && cache[userId].timestamp) {
                return cache[userId];
            }

            // 从API获取数据
            const response = await fetch(`https://www.nodeseek.com/api/account/getInfo/${userId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.detail) {
                const userInfo = {
                    member_id: data.detail.member_id,
                    member_name: data.detail.member_name,
                    rank: data.detail.rank,
                    coin: data.detail.coin,
                    stardust: data.detail.stardust,
                    created_at: data.detail.created_at,
                    nPost: data.detail.nPost,
                    nComment: data.detail.nComment,
                    follows: data.detail.follows,
                    fans: data.detail.fans,
                    created_at_str: data.detail.created_at_str
                };

                // 缓存数据
                setUserDataCache(userId, userInfo);
                return userInfo;
            }
            return null;
        } catch (error) {
            console.error('获取用户数据失败:', error);
            return null;
        }
    }

    // 新增：计算加入天数
    function calculateJoinDays(createdAt) {
        if (!createdAt) return '未知';
        const joinDate = new Date(createdAt);
        const now = new Date();
        const diffTime = Math.abs(now - joinDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    // 新增：批量处理用户信息的队列
    let userInfoQueue = new Set();
    let isProcessingQueue = false;

    // 新增：显示用户信息
    async function displayUserInfo(userElement, userId) {
        // 确保父元素有相对定位
        const parentElement = userElement.closest('.nsk-content-meta-info') || userElement.parentElement;

        // 检查父元素是否已经显示过用户信息
        if (parentElement && parentElement.querySelector('.user-info-display')) {
            return;
        }

        const userData = await fetchUserData(userId);
        if (!userData) {
            return;
        }

        await displayUserInfoFromData(userElement, userData);
    }

    // 优化后的批量处理用户头像和信息显示
    async function processUserAvatars() {
        // 查找所有用户头像或用户名链接
        const userElements = document.querySelectorAll('a.author-name, .user-avatar, .nsk-content-meta-info a[href*="/space/"]');

        // 收集所有需要处理的用户ID
        const userIds = new Set();
        const elementUserMap = new Map();

        for (const element of userElements) {
            // 检查是否已经显示过用户信息
            const parentElement = element.closest('.nsk-content-meta-info') || element.parentElement;
            if (parentElement && parentElement.querySelector('.user-info-display')) {
                continue;
            }

            let userId = null;
            // 从链接中提取用户ID
            if (element.href && element.href.includes('/space/')) {
                const match = element.href.match(/\/space\/(\d+)/);
                if (match) {
                    userId = match[1];
                    userIds.add(userId);
                    if (!elementUserMap.has(userId)) {
                        elementUserMap.set(userId, []);
                    }
                    elementUserMap.get(userId).push(element);
                }
            }
        }

        // 如果没有新的用户需要处理，直接返回
        if (userIds.size === 0) {
            return;
        }

        // 批量获取用户数据
        await batchFetchUserData(Array.from(userIds), elementUserMap);
    }

    // 新增：批量获取用户数据
    async function batchFetchUserData(userIds, elementUserMap) {
        // 检查缓存，分离需要请求的用户ID
        const cache = getUserDataCache();
        const cachedUsers = [];
        const needFetchUsers = [];

        userIds.forEach(userId => {
            if (cache[userId] && cache[userId].timestamp) {
                cachedUsers.push({ userId, data: cache[userId] });
            } else {
                needFetchUsers.push(userId);
            }
        });

        // 先处理缓存的用户数据
        for (const { userId, data } of cachedUsers) {
            const elements = elementUserMap.get(userId) || [];
            for (const element of elements) {
                await displayUserInfoFromData(element, data);
            }
        }

        // 并发获取需要请求的用户数据（限制并发数）
        const concurrencyLimit = 3; // 限制并发请求数
        const chunks = [];
        for (let i = 0; i < needFetchUsers.length; i += concurrencyLimit) {
            chunks.push(needFetchUsers.slice(i, i + concurrencyLimit));
        }

        for (const chunk of chunks) {
            const promises = chunk.map(async userId => {
                try {
                    const userData = await fetchUserData(userId);
                    if (userData) {
                        const elements = elementUserMap.get(userId) || [];
                        for (const element of elements) {
                            await displayUserInfoFromData(element, userData);
                        }
                    }
                } catch (error) {
                    console.error(`获取用户${userId}数据失败:`, error);
                }
            });

            await Promise.all(promises);
            // 批次间添加小延迟，避免请求过于频繁
            if (chunks.indexOf(chunk) < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
    }

    // 新增：从已有数据显示用户信息
    async function displayUserInfoFromData(userElement, userData) {
        // 检查用户信息显示开关状态
        if (!getUserInfoDisplayState()) {
            return;
        }

        const parentElement = userElement.closest('.nsk-content-meta-info') || userElement.parentElement;

        // 检查父元素是否已经显示过用户信息
        if (parentElement && parentElement.querySelector('.user-info-display')) {
            return;
        }

        // 计算加入天数
        const joinDays = calculateJoinDays(userData.created_at);

        // 创建用户信息显示元素
        const infoDiv = document.createElement('div');
        infoDiv.className = 'user-info-display';
        infoDiv.style.cssText = `
            position: absolute;
            top: -14px;
            left: 0;
            right: auto;
            max-width: calc(100% - 60px);
            color:rgb(173, 87, 223); # 自动显示用户详细信息，字体颜色。
            padding: 0px 1px;
            border-radius: 1px;
            font-size: 11px;
            white-space: nowrap;
            z-index: 1; /* 极低的z-index值，确保弹窗可以遮盖此元素 */
            pointer-events: auto; /* 允许选择和复制文本 */
            display: flex;
            align-items: center;
            user-select: text;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            line-height: 1;
            overflow: hidden;
            text-overflow: ellipsis;
        `;

        // 横向显示所有信息
        infoDiv.innerHTML = `加入: ${joinDays}天 | 等级: ${userData.rank} | 鸡腿: ${userData.coin} | 星尘: ${userData.stardust} | 主题: ${userData.nPost} | 评论: ${userData.nComment} | 粉丝: ${userData.fans} | 关注: ${userData.follows}`;

        // 确保父元素有相对定位，但不影响其他子元素的布局
        if (parentElement) {
            // 保存原始position值
            const originalPosition = getComputedStyle(parentElement).position;
            if (originalPosition === 'static') {
                parentElement.style.position = 'relative';
            }

            // 为了不影响楼层号位置，确保楼层号元素保持在右侧
            const floorElements = parentElement.querySelectorAll('*');
            floorElements.forEach(el => {
                if (el.textContent && el.textContent.match(/^#\d+$/)) {
                    // 找到楼层号元素，确保其样式不被影响，并向右移动8px
                    const computedStyle = getComputedStyle(el);
                    if (computedStyle.position !== 'absolute' && computedStyle.position !== 'fixed') {
                        el.style.position = 'relative';
                        el.style.zIndex = '1001';
                        el.style.right = '-8px';
                    }
                }
            });

            parentElement.appendChild(infoDiv);
        }
    }

    // 添加收藏
    function addToFavorites(remark, category) {
        const list = getFavorites();

        // 获取当前页面标题和URL
        const title = document.title.replace(' - NodeSeek', '').trim();
        const url = window.location.href;

        // 如果没有指定分类，使用"未分类"
        if (!category) {
            category = '未分类';
        }

        // 检查是否已经收藏过
        const existingIndex = list.findIndex(item => item.url === url);
        if (existingIndex >= 0) {
            // 已收藏，则更新备注、分类和时间
            list[existingIndex].remark = remark || '';
            list[existingIndex].category = category;
            list[existingIndex].timestamp = new Date().toISOString();
            addLog(`更新收藏: ${title}`);
        } else {
            // 新收藏
            const newItem = {
                title: title,
                url: url,
                remark: remark || '',
                category: category,
                timestamp: new Date().toISOString(),
                pinned: false // 默认不置顶
            };
            
            // 插入到第一个非置顶的位置，确保新收藏在非置顶区的顶部
            const firstUnpinnedIndex = list.findIndex(item => !item.pinned);
            if (firstUnpinnedIndex === -1) {
                // 如果没有非置顶项（列表为空或全置顶），则添加到末尾
                list.push(newItem);
            } else {
                list.splice(firstUnpinnedIndex, 0, newItem);
            }
            addLog(`添加收藏: ${title}`);
        }

        setFavorites(list);
        return existingIndex >= 0; // 返回是否为更新操作
    }

    // 移除收藏
    function removeFromFavorites(url) {
        let list = getFavorites();
        const index = list.findIndex(item => item.url === url);
        if (index >= 0) {
            const title = list[index].title;
            list.splice(index, 1);
            setFavorites(list);
            addLog(`移除收藏: ${title}`);
            return true;
        }
        return false;
    }

    // 检查当前页面是否已收藏
    function isCurrentPageFavorited() {
        const list = getFavorites();
        const url = window.location.href;
        return list.some(item => item.url === url);
    }

    // 获取当前页面的收藏备注
    function getCurrentPageFavoriteRemark() {
        const list = getFavorites();
        const url = window.location.href;
        const item = list.find(item => item.url === url);
        return item ? item.remark : '';
    }

    // 添加黑名单
    function addToBlacklist(username, remark, userLinkElement, buttonElement) {
        const list = getBlacklist();

        // 尝试获取用户ID
        let userId = null;
        let postId = null; // 楼层ID

        // 优先从当前操作的上下文中获取楼层信息
        if (userLinkElement) {
            // 获取用户ID
            if (userLinkElement.href) {
                const match = userLinkElement.href.match(/\/space\/(\d+)/) || userLinkElement.href.match(/[?&]to=(\d+)/) || userLinkElement.href.match(/\/user\/(\d+)/);
                if (match) userId = match[1];
            }

            // 查找当前元素所在的楼层
            // 1. 首先查找最近的带有明确楼层标识的元素
            let currentElement = userLinkElement;
            let floorElement = null;

            // 查找当前元素附近的楼层标记
            // 向上查找最多15层父元素，寻找楼层相关元素
            for (let i = 0; i < 15 && currentElement; i++) {
                // 先检查当前元素及其子元素中是否包含如"#1"、"#2"这样的楼层标记
                const floorMarkers = Array.from(currentElement.querySelectorAll('*'))
                    .filter(el => el.textContent && el.textContent.trim().match(/^#\d+$/));

                // 也检查当前元素本身的文本
                if (currentElement.textContent && currentElement.textContent.trim().match(/^#\d+$/)) {
                    floorMarkers.push(currentElement);
                }

                if (floorMarkers.length > 0) {
                    // 找到了楼层标记，获取楼层号
                    const floorNumber = floorMarkers[0].textContent.trim().replace('#', '');
                    postId = 'post-' + floorNumber;
                    break;
                }

                // 检查是否存在带有"#数字"形式的链接（常见于楼层链接）
                const floorLinks = Array.from(currentElement.querySelectorAll('a[href*="#"]'))
                    .filter(a => a.href && a.href.match(/#\d+$/));

                if (floorLinks.length > 0) {
                    const floorMatch = floorLinks[0].href.match(/#(\d+)$/);
                    if (floorMatch) {
                        postId = 'post-' + floorMatch[1];
                        break;
                    }
                }

                // 检查是否为带有class="floor"的元素（一些论坛使用此类标记楼层）
                const floorClassElements = Array.from(currentElement.querySelectorAll('.floor, .post-number, .floor-number'));
                if (floorClassElements.length > 0) {
                    const floorText = floorClassElements[0].textContent.trim();
                    const floorMatch = floorText.match(/(\d+)/);
                    if (floorMatch) {
                        postId = 'post-' + floorMatch[1];
                        break;
                    }
                }

                // 查找是否在文章内有明确的楼层标识，如"#2"
                const postNumberElements = Array.from(currentElement.querySelectorAll('[class*="post-number"], [class*="floor"]'));
                for (const el of postNumberElements) {
                    const text = el.textContent.trim();
                    const match = text.match(/#(\d+)/);
                    if (match) {
                        postId = 'post-' + match[1];
                        break;
                    }
                }

                // 向上移动到父元素
                currentElement = currentElement.parentElement;
            }

            // 2. 如果找不到明确标识，则尝试从URL中识别当前楼层
            if (!postId) {
                // 检查当前URL是否包含楼层信息
                if (window.location.hash) {
                    // 尝试匹配#post-数字或#数字格式
                    const hashMatch = window.location.hash.match(/#post-(\d+)/) || window.location.hash.match(/#(\d+)/);
                    if (hashMatch) {
                        postId = 'post-' + hashMatch[1];
                    }
                }
            }

            // 3. 尝试查找整个文章区域的data-post-id属性
            if (!postId && buttonElement) {
                let element = buttonElement;
                // 向上查找包含post-id的元素
                for (let i = 0; i < 10 && element; i++) {
                    if (element.getAttribute('data-post-id')) {
                        postId = 'post-' + element.getAttribute('data-post-id');
                        break;
                    }

                    // 检查元素ID是否为post-数字格式
                    if (element.id && element.id.match(/^post-\d+$/)) {
                        postId = element.id;
                        break;
                    }

                    element = element.parentElement;
                }
            }
        } else {
            // 如果没有传入元素，则使用原有逻辑
            const userLink = Array.from(document.querySelectorAll('a.author-name'))
                .find(a => a.textContent.trim() === username);

            if (userLink && userLink.href) {
                const match = userLink.href.match(/\/space\/(\d+)/) || userLink.href.match(/[?&]to=(\d+)/) || userLink.href.match(/\/user\/(\d+)/);
                if (match) userId = match[1];
            }
            // 方法2：如果还没找到postId，尝试从URL中解析
            if (!postId && window.location.hash) {
                const hashMatch = window.location.hash.match(/#post-(\d+)/);
                if (hashMatch) {
                    postId = 'post-' + hashMatch[1];
                } else {
                    // 尝试直接匹配数字
                    const directMatch = window.location.hash.match(/#(\d+)/);
                    if (directMatch) {
                        postId = 'post-' + directMatch[1];
                    }
                }
            }
        }

        // 增加：尝试从当前页面URL检查是否在用户主页，可以直接获取用户ID
        if (!userId) {
            const currentPageMatch = window.location.pathname.match(/\/space\/(\d+)/);
            if (currentPageMatch) {
                // 检查当前页面是否显示的就是要拉黑的用户
                const pageUsername = document.querySelector('.user-card .user-info h3')?.textContent?.trim();
                if (pageUsername === username) {
                    userId = currentPageMatch[1];
                }
            }
        }

        // 直接保存备注，无需截断
        list[username] = {
            remark: remark || '',
            url: window.location.href, // 记录拉黑时的网址
            timestamp: new Date().toISOString(), // 记录拉黑时间
            userId: userId, // 记录用户ID用于构建主页链接
            postId: postId // 新增：记录楼层ID用于精确跳转
        };
        setBlacklist(list);
        // 记录操作日志
        addLog(`将用户 ${username} 加入黑名单${remark ? ` (备注: ${remark})` : ''}${postId ? ` (楼层ID: ${postId})` : ''}`);
        // 新增：拉黑时自动移除好友
        removeFriend(username, true);
    }

    // 移除黑名单
    function removeFromBlacklist(username) {
        const list = getBlacklist();
        delete list[username];
        setBlacklist(list);
        // 记录操作日志
        addLog(`将用户 ${username} 从黑名单中移除`);
    }

    // 判断是否在黑名单
    function isBlacklisted(username) {
        const list = getBlacklist();
        return !!list[username];
    }

    // 获取备注
    function getRemark(username) {
        const list = getBlacklist();
        return list[username] ? list[username].remark : '';
    }

    // 新增：获取拉黑时的网址
    function getBlacklistUrl(username) {
        const list = getBlacklist();
        return list[username] ? list[username].url : '';
    }

    // 新增：获取拉黑时间
    function getBlacklistTime(username) {
        const list = getBlacklist();
        return list[username] ? list[username].timestamp : '';
    }

    function getBlacklistedEntryByUserId(userId) {
        if (userId === null || typeof userId === 'undefined') return null;
        const normalized = String(userId).trim();
        if (!normalized) return null;
        const list = getBlacklist();
        for (const username of Object.keys(list)) {
            const info = list[username];
            if (!info) continue;
            if (info.userId !== null && typeof info.userId !== 'undefined' && String(info.userId) === normalized) {
                return { username, info };
            }
        }
        return null;
    }

    function getHashQueryParam(name) {
        try {
            const hash = window.location.hash || '';
            const idx = hash.indexOf('?');
            if (idx === -1) return null;
            const qs = hash.slice(idx + 1);
            const params = new URLSearchParams(qs);
            return params.get(name);
        } catch (e) {
            return null;
        }
    }

    function findTalkTitleElement() {
        const selectors = [
            'h1', 'h2', 'h3', 'h4',
            '.card-header', '.panel-heading', '.message-header', '.talk-header', '.chat-header',
            '.card-title', '.panel-title', '.talk-title', '.chat-title'
        ];
        const nodes = [];
        selectors.forEach(sel => {
            try {
                document.querySelectorAll(sel).forEach(el => nodes.push(el));
            } catch (e) { }
        });
        for (const el of nodes) {
            const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
            if (!t) continue;
            if (/^与.{1,32}的对话$/.test(t)) return el;
        }

        try {
            const candidates = [];
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null);
            let node = walker.currentNode;
            while (node) {
                const el = node;
                if (el && el.id !== 'ns-blacklist-talk-indicator') {
                    const raw = (el.textContent || '').trim().replace(/\s+/g, ' ');
                    if (raw && /^与.{1,32}的对话$/.test(raw)) {
                        const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
                        if (rect && rect.width > 0 && rect.height > 0) {
                            const computed = window.getComputedStyle ? window.getComputedStyle(el) : null;
                            if (computed && (computed.display === 'none' || computed.visibility === 'hidden')) {
                                // skip
                            } else if ((el.children?.length || 0) <= 3) {
                                candidates.push(el);
                            }
                        }
                    }
                }
                node = walker.nextNode();
            }
            if (candidates.length === 0) return null;

            candidates.sort((a, b) => {
                const ra = a.getBoundingClientRect();
                const rb = b.getBoundingClientRect();
                const ha = ra ? ra.height : 9999;
                const hb = rb ? rb.height : 9999;
                if (ha !== hb) return ha - hb;
                const wa = ra ? ra.width : 9999;
                const wb = rb ? rb.width : 9999;
                if (wa !== wb) return wa - wb;
                const da = (a.children?.length || 0);
                const db = (b.children?.length || 0);
                return da - db;
            });
            return candidates[0];
        } catch (e) {
            return null;
        }
    }

    function updateTalkBlacklistIndicator() {
        try {
            const existing = document.getElementById('ns-blacklist-talk-indicator');
            if (existing) existing.remove();
            return;
        } catch (e) { }
    }

    // ====== 好友功能数据结构 ======
    // 好友功能已移动到 Friends.js 模块，通过 window.NodeSeekFriends 访问
    const getFriends = () => window.NodeSeekFriends?.getFriends() || [];
    const setFriends = (list) => window.NodeSeekFriends?.setFriends(list);
    const addFriend = (username, remarkInput) => window.NodeSeekFriends?.addFriend(username, remarkInput);
    const removeFriend = (username, silent) => window.NodeSeekFriends?.removeFriend(username, silent);
    const isFriend = (username) => window.NodeSeekFriends?.isFriend(username) || false;

    // 红色高亮样式
    const style = document.createElement('style');
    style.innerHTML = `.blacklisted-user { color: red !important; font-weight: bold; white-space: nowrap; } .friend-user { color: #2ea44f !important; font-weight: bold; white-space: nowrap; } .blacklist-remark { color: #d00; font-size: 12px; margin-left: 4px; max-width: 220px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: text-bottom; } .friend-remark { color: #2ea44f; font-size: 12px; margin-left: 4px; max-width: 220px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: text-bottom; }
    .blacklist-btn {
        margin-left: 7px;
        cursor: pointer;
        color: #fff;
        background: #000;
        border: none;
        border-radius: 3px;
        padding: 1.8px 5.4px;
        font-size: 10.8px;
    }
    .blacklist-btn.red { background: #d00 !important; }
    .blacklist-time { color: #d00; font-size: 10px; margin-left: 4px; }
    /* 新增：代码块复制按钮样式 */
    .code-block-wrapper {
        position: relative;
        display: inline-block;
        width: 100%;
    }
    .code-copy-btn {
        position: absolute;
        top: 5px;
        right: 5px;
        padding: 2.7px 5.4px;
        font-size: 10.8px;
        color: #fff;
        background-color: #555;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s;
        z-index: 10;
        pointer-events: auto;
    }
    .code-block-wrapper:hover .code-copy-btn { opacity: 1; }
    .code-copy-btn:hover { background-color: #333; }
    .code-copy-btn.copied { background-color: #28a745; }
    /* 新增：收藏按钮样式 */
    .favorite-btn {
        background-color: #1890ff;
        border: none;
        border-radius: 3px;
        color: white;
        padding: 2.7px 7.2px;
        cursor: pointer;
        margin-right: 4.5px;
        font-size: 10.8px;
    }
    .favorite-btn.favorited { background-color: #ff9800; }
    /* 新增：折叠按钮样式 */
    .collapse-btn {
        position: absolute;
        left: -21.6px;
        top: 10px;
        width: 21.6px;
        height: 21.6px;
        background: #f0f0f0;
        border: 1px solid #ccc;
        border-right: none;
        border-radius: 4px 0 0 4px;
        cursor: pointer;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #666;
        font-weight: bold;
        font-size: 12.6px;
        z-index: 9998;
        transition: transform 0.3s ease;
    }
    .collapse-btn:hover { background: #e0e0e0; }
    .nodeseek-plugin-container-collapsed { width: 0 !important; padding: 0 !important; overflow: hidden !important; }

    /* 新增：确保用户弹窗能完全遮盖用户信息显示 */
    .hover-user-card, .user-card {
        z-index: 1000 !important;
        background-color: var(--bg-main-color, #fff) !important;
    }

    /* 移动设备适配样式 */
    @media (max-width: 767px) {
        /* 弹窗样式移动适配 */
        #logs-dialog, #blacklist-dialog, #friends-dialog, #favorites-dialog, #browse-history-dialog {
            position: fixed !important;
            width: 96% !important;
            min-width: unset !important;
            max-width: 96% !important;
            left: 2% !important;
            right: 2% !important;
            top: 10px !important;
            max-height: 88vh !important; /* 增加最大高度 */
            padding: 12px 8px 8px 8px !important; /* 减少内部填充 */
            overflow-y: auto !important;
            overflow-x: hidden !important;
            border-radius: 10px !important;
            box-shadow: 0 2px 20px rgba(0,0,0,0.2) !important;
        }

        /* 弹窗关闭按钮适配 */
        #logs-dialog .close-btn, #blacklist-dialog .close-btn,
        #friends-dialog .close-btn, #favorites-dialog .close-btn, #browse-history-dialog .close-btn {
            right: 8px !important;
            top: 5px !important;
            font-size: 24px !important;
            width: 30px !important;
            height: 30px !important;
            line-height: 30px !important;
            text-align: center !important;
        }

        /* 按钮适配 */
        .blacklist-btn {
            padding: 3px 6px !important;
            font-size: 12px !important;
            margin-left: 5px !important;
        }

        /* 表格容器适配 - 移动端纵向布局 */
        #blacklist-dialog table, #friends-dialog table, #favorites-dialog table, #browse-history-dialog table,
        #blacklist-dialog tbody, #friends-dialog tbody, #favorites-dialog tbody, #browse-history-dialog tbody {
            width: 100% !important;
            display: block !important;
        }

        /* 移动端表格行转为卡片式布局 */
        #blacklist-dialog tr, #friends-dialog tr, #favorites-dialog tr, #browse-history-dialog tr {
            display: block !important;
            border: 1px solid #e0e0e0 !important;
            border-radius: 8px !important;
            margin-bottom: 8px !important; /* 减少卡片间距 */
            padding: 6px !important; /* 减少内部填充 */
            background-color: #f9f9f9 !important;
        }

        /* 移动端表头隐藏 */
        #blacklist-dialog thead, #friends-dialog thead, #favorites-dialog thead, #browse-history-dialog thead {
            display: none !important;
        }

        /* 表格单元格纵向排列 */
        #blacklist-dialog td, #friends-dialog td, #favorites-dialog td, #browse-history-dialog td {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 1px 0 !important; /* 减少上下填充 */
            border: none !important;
            text-align: left !important;
            font-size: 13px !important;
            margin-bottom: 2px !important; /* 减少单元格间距 */
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            line-height: 1.3 !important; /* 减少行高 */
        }

        /* 用户名和标题样式特殊处理 */
        #blacklist-dialog td:first-child, #friends-dialog td:first-child, #favorites-dialog td:first-child, #browse-history-dialog td:first-child {
            font-size: 15px !important;
            font-weight: bold !important;
            border-bottom: 1px solid #eaeaea !important;
            padding-bottom: 3px !important; /* 减少下边距 */
            margin-bottom: 4px !important; /* 减少下边距 */
        }

        /* 备注特殊处理 - 显示为单独一行带前缀 */
        #blacklist-dialog td:nth-child(2)::before,
        #friends-dialog td:nth-child(2)::before,
        #favorites-dialog td:nth-child(2)::before {
            content: "备注：" !important;
            font-weight: bold !important;
            color: #666 !important;
            font-size: 12px !important; /* 减小前缀字体大小 */
        }

        /* 备注行样式 */
        #blacklist-dialog td:nth-child(2),
        #friends-dialog td:nth-child(2),
        #favorites-dialog td:nth-child(2) {
            white-space: normal !important; /* 允许备注内容换行 */
            line-height: 1.3 !important; /* 减少行高 */
            max-height: 50px !important; /* 减少最大高度 */
            overflow-y: auto !important;
            padding: 2px 0 !important; /* 减少上下填充 */
            margin-bottom: 3px !important; /* 减少下边距 */
        }

        /* 时间特殊处理 */
        #blacklist-dialog td:nth-child(3)::before,
        #friends-dialog td:nth-child(3)::before,
        #favorites-dialog td:nth-child(4)::before {
            content: "时间：" !important;
            font-weight: bold !important;
            color: #666 !important;
            font-size: 12px !important; /* 减小前缀字体大小 */
        }

        /* 拉黑页面特殊处理 */
        #blacklist-dialog td:nth-child(4)::before {
            content: "页面：" !important;
            font-weight: bold !important;
            color: #666 !important;
            font-size: 12px !important; /* 减小前缀字体大小 */
        }

        /* 操作按钮放在底部，居中显示 */
        #blacklist-dialog td:last-child,
        #friends-dialog td:last-child,
        #favorites-dialog td:last-child,
        #browse-history-dialog td:last-child {
            text-align: center !important;
            padding-top: 4px !important; /* 减少上填充 */
            border-top: 1px solid #eaeaea !important;
            margin-top: 2px !important; /* 减少上边距 */
        }

        /* 移除按钮在移动端内更显眼 */
        #blacklist-dialog td:last-child button,
        #friends-dialog td:last-child button,
        #favorites-dialog td:last-child button,
        #browse-history-dialog td:last-child button {
            width: 65px !important; /* 稍微减少按钮宽度 */
            padding: 3px 0 !important; /* 减少按钮内部填充 */
            font-size: 12px !important; /* 减小字体 */
        }

        /* 弹窗内部滚动区域 */
        #logs-dialog pre, #blacklist-dialog div, #friends-dialog div, #favorites-dialog div, #browse-history-dialog div {
            max-height: 65vh !important;
            overflow-y: auto !important;
        }

        /* 收藏弹窗特殊处理 */
        #favorites-dialog {
            min-width: unset !important;
        }

        /* 收藏弹窗标题优化 */
        #favorites-dialog td:first-child a {
            width: 100% !important;
            display: block !important;
        }

        /* 当备注为空时显示提示文本 */
        #blacklist-dialog td:nth-child(2):empty::after,
        #friends-dialog td:nth-child(2):empty::after,
        #favorites-dialog td:nth-child(2):empty::after {
            content: "无" !important;
            color: #999 !important;
            font-style: italic !important;
        }

        /* 历史浏览记录弹窗移动端特殊处理 */
        @media (max-width: 767px) {
            /* 访问时间特殊处理 */
            #browse-history-dialog td:nth-child(2)::before {
                content: "访问：" !important;
                font-weight: bold !important;
                color: #666 !important;
                font-size: 12px !important;
            }

            /* 访问次数特殊处理 */
            #browse-history-dialog td:nth-child(3)::before {
                content: "次数：" !important;
                font-weight: bold !important;
                color: #666 !important;
                font-size: 12px !important;
            }

            /* 访问次数样式 */
            #browse-history-dialog td:nth-child(3) {
                text-align: left !important;
                white-space: nowrap !important;
            }
        }

        /* 历史浏览记录表格行高度控制 */
        #browse-history-dialog table {
            table-layout: fixed !important;
        }

        #browse-history-dialog tr {
            height: auto !important;
            min-height: 35px !important;
        }

        #browse-history-dialog td {
            vertical-align: middle !important;
            box-sizing: border-box !important;
            word-wrap: break-word !important;
        }

        /* 确保访问次数列在所有设备上都不换行 */
        #browse-history-dialog td:nth-child(3) {
            white-space: nowrap !important;
        }
    }`;
    document.head.appendChild(style);

    // 处理所有用户名节点
    function processUsernames() {
        const SCRIPT_BUTTON_MARKER_CLASS = 'userscript-nodeseek-interaction-btn'; // 新增标记类

        document.querySelectorAll('a.author-name').forEach(function (a) {
            const username = a.textContent.trim();
            const parent = a.parentNode;

            // 总是先移除此脚本之前为该用户添加的交互按钮
            parent.querySelectorAll('.' + SCRIPT_BUTTON_MARKER_CLASS).forEach(btn => btn.remove());

            // 添加按钮
            a.style.whiteSpace = 'nowrap';

            // 拉黑按钮
            const btn = document.createElement('button');
            // 为按钮添加标记类
            btn.className = 'blacklist-btn ' + SCRIPT_BUTTON_MARKER_CLASS + (isBlacklisted(username) ? ' red' : '');
            btn.textContent = isBlacklisted(username) ? '移除黑名单' : '拉黑';
            btn.onclick = function (e) {
                e.stopPropagation();
                if (isBlacklisted(username)) {
                    if (confirm('确定要移除黑名单？')) {
                        removeFromBlacklist(username);

                        // 不刷新页面，直接更新按钮和用户显示
                        btn.textContent = '拉黑';
                        btn.className = 'blacklist-btn ' + SCRIPT_BUTTON_MARKER_CLASS;

                        // 更新当前页面上该用户的所有显示
                        document.querySelectorAll('a.author-name').forEach(function (link) {
                            if (link.textContent.trim() === username) {
                                // 移除黑名单样式
                                link.classList.remove('blacklisted-user');
                                // 移除备注和链接
                                const oldRemark = link.parentNode.querySelector('.blacklist-remark');
                                if (oldRemark) oldRemark.remove();
                                const oldUrl = link.parentNode.querySelector('.blacklist-url');
                                if (oldUrl) oldUrl.remove();
                                // 移除拉黑时间
                                const metaInfo = link.closest('.nsk-content-meta-info');
                                if (metaInfo) {
                                    const oldTime = metaInfo.querySelector('.blacklist-time');
                                    if (oldTime) oldTime.remove();
                                }
                            }
                        });

                        // 如果黑名单列表弹窗是打开的，立即更新弹窗内容
                        const blacklistDialog = document.getElementById('blacklist-dialog');
                        if (blacklistDialog) {
                            // 查找该用户在弹窗中对应的行
                            const tbody = blacklistDialog.querySelector('tbody');
                            if (tbody) {
                                Array.from(tbody.children).forEach(function (row) {
                                    const userNameCell = row.querySelector('td:first-child a');
                                    if (userNameCell && userNameCell.textContent.trim() === username) {
                                        // 添加淡出动画
                                        row.style.opacity = '0.5';
                                        row.style.transition = 'opacity 0.2s';

                                        setTimeout(function () {
                                            row.remove();

                                            // 检查是否还有其他用户，如果没有则显示空提示
                                            if (tbody.children.length === 0) {
                                                const empty = document.createElement('div');
                                                empty.textContent = '暂无黑名单用户';
                                                empty.style.textAlign = 'center';
                                                empty.style.color = '#888';
                                                empty.style.margin = '18px 0 8px 0';
                                                blacklistDialog.querySelector('table').after(empty);
                                            }
                                        }, 200);
                                    }
                                });
                            }
                        }
                    }
                } else {
                    const remark = prompt('请输入备注（可选）：', '');
                    if (remark !== null) {
                        addToBlacklist(username, remark, a, btn);

                        // 不刷新页面，直接更新按钮和用户显示
                        btn.textContent = '移除黑名单';
                        btn.className = 'blacklist-btn ' + SCRIPT_BUTTON_MARKER_CLASS + ' red';

                        // 更新当前页面上该用户的所有显示
                        highlightBlacklisted();

                        // 更新好友按钮状态（如果存在）
                        if (friendBtn) {
                            friendBtn.style.background = '#2ea44f';
                            friendBtn.textContent = '添加好友';
                        }

                        // 如果黑名单列表弹窗是打开的，立即更新弹窗内容
                        const blacklistDialog = document.getElementById('blacklist-dialog');
                        if (blacklistDialog) {
                            updateBlacklistDialogWithNewUser(username, remark, a, btn);
                        }
                    }
                }
            };
            parent.appendChild(btn);

            // 添加好友按钮
            const friendBtn = document.createElement('button');
            // 为按钮添加标记类
            friendBtn.className = 'blacklist-btn ' + SCRIPT_BUTTON_MARKER_CLASS;
            friendBtn.style.background = isFriend(username) ? '#aaa' : '#2ea44f';
            friendBtn.style.marginLeft = '4px';
            friendBtn.textContent = isFriend(username) ? '删除好友' : '添加好友';
            friendBtn.onclick = function (e) {
                e.stopPropagation();
                if (!isFriend(username)) {
                    if (isBlacklisted(username)) {
                        removeFromBlacklist(username);
                        // 更新黑名单按钮状态
                        btn.textContent = '拉黑';
                        btn.className = 'blacklist-btn ' + SCRIPT_BUTTON_MARKER_CLASS;

                        // 如果黑名单弹窗是打开的，立即更新弹窗内容
                        const blacklistDialog = document.getElementById('blacklist-dialog');
                        if (blacklistDialog) {
                            // 查找该用户在弹窗中对应的行
                            const tbody = blacklistDialog.querySelector('tbody');
                            if (tbody) {
                                Array.from(tbody.children).forEach(function (row) {
                                    const userNameCell = row.querySelector('td:first-child a');
                                    if (userNameCell && userNameCell.textContent.trim() === username) {
                                        // 添加淡出动画
                                        row.style.opacity = '0.5';
                                        row.style.transition = 'opacity 0.2s';

                                        setTimeout(function () {
                                            row.remove();

                                            // 检查是否还有其他用户，如果没有则显示空提示
                                            if (tbody.children.length === 0) {
                                                const empty = document.createElement('div');
                                                empty.textContent = '暂无黑名单用户';
                                                empty.style.textAlign = 'center';
                                                empty.style.color = '#888';
                                                empty.style.margin = '18px 0 8px 0';
                                                blacklistDialog.querySelector('table').after(empty);
                                            }
                                        }, 200);
                                    }
                                });
                            }
                        }
                    }
                    let remark = prompt('请输入好友备注（可选）：', '');
                    if (remark === null) return;
                    addFriend(username, remark);

                    // 不刷新页面，直接更新按钮和用户显示
                    friendBtn.textContent = '删除好友';
                    friendBtn.style.background = '#aaa';

                    // 更新当前页面上该用户的所有显示
                    highlightFriends();

                    // 如果好友列表弹窗是打开的，立即更新弹窗内容
                    if (window.NodeSeekFriends && typeof window.NodeSeekFriends.updateFriendsDialogWithNewUser === 'function') {
                        window.NodeSeekFriends.updateFriendsDialogWithNewUser(username, remark);
                    }
                } else {
                    if (confirm('确定要删除该好友？')) {
                        removeFriend(username);

                        // 不刷新页面，直接更新按钮和用户显示
                        friendBtn.textContent = '添加好友';
                        friendBtn.style.background = '#2ea44f';

                        // 更新当前页面上该用户的所有显示
                        document.querySelectorAll('a.author-name').forEach(function (link) {
                            if (link.textContent.trim() === username) {
                                // 移除好友样式
                                link.classList.remove('friend-user');
                                // 移除备注
                                const oldRemark = link.parentNode.querySelector('.friend-remark');
                                if (oldRemark) oldRemark.remove();
                                // 移除右侧“添加时间”显示
                                const metaInfo = link.closest('.nsk-content-meta-info');
                                if (metaInfo) {
                                    const oldFriendTime = metaInfo.querySelector('.friend-time');
                                    if (oldFriendTime) oldFriendTime.remove();
                                }

                                // 更新页面上该用户的好友按钮状态
                                const userButtons = link.parentNode.querySelectorAll('.userscript-nodeseek-interaction-btn');
                                userButtons.forEach(btn => {
                                    if (btn.textContent === '删除好友') {
                                        btn.textContent = '添加好友';
                                        btn.style.background = '#2ea44f';
                                    }
                                });
                            }
                        });

                        // 如果好友列表弹窗是打开的，立即从弹窗中移除该用户
                        if (window.NodeSeekFriends && typeof window.NodeSeekFriends.removeFriendFromDialog === 'function') {
                            window.NodeSeekFriends.removeFriendFromDialog(username);
                        }
                    }
                }
            };
            parent.appendChild(friendBtn);
        });
    }

    // 高亮黑名单用户并显示备注和网址
    let blacklistRemarkWidthRaf = null;
    function findFloorMarkerElement(metaInfo) {
        const anchorFloor = Array.from(metaInfo.querySelectorAll('a')).find(el => el.textContent && el.textContent.trim().match(/^#\d+$/));
        if (anchorFloor) return anchorFloor.closest('.floor-link-wrapper') || anchorFloor;
        const anyFloor = Array.from(metaInfo.querySelectorAll('*')).find(el => el.childElementCount === 0 && el.textContent && el.textContent.trim().match(/^#\d+$/));
        if (!anyFloor) return null;
        return anyFloor.closest('.floor-link-wrapper') || anyFloor;
    }

    function updateBlacklistRemarkWidthsInMeta(metaInfo) {
        const floorEl = findFloorMarkerElement(metaInfo);
        if (!floorEl) return;

        const floorRect = floorEl.getBoundingClientRect();
        metaInfo.querySelectorAll('.blacklist-remark, .friend-remark').forEach(span => {
            const spanRect = span.getBoundingClientRect();
            const available = Math.floor(floorRect.left - spanRect.left - 6);
            span.style.maxWidth = Math.max(20, available) + 'px';
        });
    }

    function updateAllBlacklistRemarkWidths() {
        document.querySelectorAll('.nsk-content-meta-info').forEach(metaInfo => updateBlacklistRemarkWidthsInMeta(metaInfo));
    }

    function scheduleBlacklistRemarkWidthUpdate() {
        if (blacklistRemarkWidthRaf) cancelAnimationFrame(blacklistRemarkWidthRaf);
        blacklistRemarkWidthRaf = requestAnimationFrame(() => {
            blacklistRemarkWidthRaf = null;
            updateAllBlacklistRemarkWidths();
        });
    }

    if (!window.__nsBlacklistRemarkResizeBound) {
        window.__nsBlacklistRemarkResizeBound = true;
        window.addEventListener('resize', scheduleBlacklistRemarkWidthUpdate);
    }

    function highlightBlacklisted() {
        const list = getBlacklist();

        document.querySelectorAll('a.author-name').forEach(function (a) {
            const username = a.textContent.trim();
            // 先移除样式
            a.classList.remove('blacklisted-user');
            // 移除备注和网址
            const oldRemark = a.parentNode.querySelector('.blacklist-remark');
            if (oldRemark) oldRemark.remove();
            const oldUrl = a.parentNode.querySelector('.blacklist-url');
            if (oldUrl) oldUrl.remove();
            
            // 新增：移除旧的黑名单信息容器（在metaInfo下）
            let metaInfo = a.closest('.nsk-content-meta-info');
            if (metaInfo) {
                const oldContainer = metaInfo.querySelector('.blacklist-info-container');
                if (oldContainer) oldContainer.remove();
                // 兼容旧版本：移除单独的拉黑时间
                const oldTime = metaInfo.querySelector('.blacklist-time');
                if (oldTime) oldTime.remove();
            }

            if (isBlacklisted(username)) {
                a.classList.add('blacklisted-user');

                // 获取黑名单信息
                const info = list[username];

                // 修改：为用户名链接直接添加用户主页跳转
                // 如果黑名单条目中保存了userId，直接使用它构建主页链接
                if (info && info.userId) {
                    // 修改原始链接为用户主页链接
                    a.href = 'https://www.nodeseek.com/space/' + info.userId + '#/general';
                    a.target = '_blank';
                    a.title = '点击访问用户主页';
                }

                // 显示备注
                const remark = getRemark(username);
                if (remark) {
                    const span = document.createElement('span');
                    span.className = 'blacklist-remark';
                    span.textContent = remark; // 移除“备注：”前缀，直接显示内容
                    span.title = remark; // 悬停显示完整备注
                    a.parentNode.appendChild(span);
                }
                
                // 准备底部显示的信息：拉黑页面链接 和 拉黑时间
                const url = getBlacklistUrl(username);
                const timestamp = getBlacklistTime(username);

                if (metaInfo && (url || timestamp)) {
                    const isMobile = window.innerWidth <= 767;
                    // 让父容器相对定位，便于绝对定位子元素
                    metaInfo.style.position = 'relative';
                    
                    // 创建容器
                    const container = document.createElement('div');
                    container.className = 'blacklist-info-container';
                    container.style.position = isMobile ? 'static' : 'absolute';
                    container.style.right = isMobile ? '' : '-6px';
                    container.style.top = isMobile ? '' : '21px';
                    container.style.display = 'flex';
                    container.style.alignItems = 'center';
                    container.style.zIndex = isMobile ? '' : '10';
                    container.style.background = isMobile ? 'transparent' : '#fff';
                    container.style.padding = '0';
                    container.style.flexWrap = isMobile ? 'wrap' : 'nowrap';
                    container.style.gap = isMobile ? '6px' : '';
                    container.style.marginTop = isMobile ? '4px' : '';
                    
                    // 1. 显示拉黑时的网址 (在左侧)
                    if (url) {
                        const link = document.createElement('a');
                        link.className = 'blacklist-url';
                        
                        // 构建包含精确楼层的链接
                        let targetUrl = url;
                        // 检查是否有楼层信息
                        if (info.postId) {
                            // 提取楼层号
                            const floorNumber = info.postId.replace('post-', '');
                            // 移除原始URL中可能存在的锚点
                            targetUrl = targetUrl.split('#')[0];
                            // 添加新的锚点（不带post-前缀）
                            targetUrl += '#' + floorNumber;
                        }

                        link.href = targetUrl;
                        link.textContent = info.postId ? '【拉黑页面#' + info.postId.replace('post-', '') + '】' : '【拉黑页面】';
                        link.target = '_blank';
                        link.style.color = '#06c';
                        link.style.fontSize = '10px'; // 调整字体大小以匹配时间
                        link.style.position = 'relative'; // 使用相对定位
                        link.style.left = isMobile ? '0px' : '10px';
                        // link.style.marginLeft = '20px'; // 移除之前的 margin-left
                        link.style.marginRight = isMobile ? '0px' : '8px';
                        link.style.whiteSpace = 'nowrap';
                        link.style.textDecoration = 'none'; // 去掉下划线
                        container.appendChild(link);
                    }

                    // 2. 显示拉黑时间 (在右侧)
                    if (timestamp) {
                        const timeSpan = document.createElement('span');
                        timeSpan.className = 'blacklist-time';
                        
                        const date = new Date(timestamp);
                        const timeStr = date.getFullYear() + '-' +
                            String(date.getMonth() + 1).padStart(2, '0') + '-' +
                            String(date.getDate()).padStart(2, '0') + ' ' +
                            String(date.getHours()).padStart(2, '0') + ':' +
                            String(date.getMinutes()).padStart(2, '0') + ':' +
                            String(date.getSeconds()).padStart(2, '0');
                            
                        timeSpan.textContent = '拉黑时间：' + timeStr;
                        timeSpan.style.color = '#d00';
                        timeSpan.style.fontSize = '10px';
                        timeSpan.style.whiteSpace = 'nowrap';
                        
                        container.appendChild(timeSpan);
                    }
                    
                    metaInfo.appendChild(container);
                }
            }
        });
        scheduleBlacklistRemarkWidthUpdate();
    }

    // 新增：高亮好友用户并显示备注
    // highlightFriends 函数已移动到 Friends.js 模块
    const highlightFriends = () => window.NodeSeekFriends?.highlightFriends();

    // 新增：为代码块添加复制按钮
    function addCopyButtonsToCodeBlocks() {
        // 检查是否有激活的编辑器，如果有，则移除复制按钮并返回
        if (document.querySelector('.ProseMirror-focused, textarea:focus, input:focus')) {
            document.querySelectorAll('.code-block-wrapper .code-copy-btn').forEach(btn => btn.remove());
            return;
        }

        document.querySelectorAll('pre').forEach(preElement => {
            // 如果在编辑器内部，则不添加按钮
            if (preElement.closest('.ProseMirror')) {
                return;
            }

            // 如果已经被包装过，则不重复处理
            if (preElement.parentElement && preElement.parentElement.classList.contains('code-block-wrapper')) {
                return;
            }

            // 如果已经存在复制按钮，则不重复添加
            if (preElement.querySelector('.code-copy-btn')) {
                return;
            }

            const codeElement = preElement.querySelector('code');
            if (!codeElement) return; //确保pre中有code标签

            // 创建包装器
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block-wrapper';

            // 将pre元素包装在wrapper中
            preElement.parentNode.insertBefore(wrapper, preElement);
            wrapper.appendChild(preElement);

            const copyBtn = document.createElement('button');
            copyBtn.textContent = '复制';
            copyBtn.className = 'code-copy-btn';
            copyBtn.setAttribute('aria-label', '复制代码');

            copyBtn.onclick = (e) => {
                e.stopPropagation(); // 阻止事件冒泡

                const codeToCopy = codeElement.innerText;
                navigator.clipboard.writeText(codeToCopy).then(() => {
                    copyBtn.textContent = '已复制!';
                    copyBtn.classList.add('copied'); // 确保添加 copied 类
                    addLog('代码块内容已复制到剪贴板'); // 日志可以保持不变，或根据需要调整
                }).catch(err => {
                    console.error('复制失败:', err);
                    copyBtn.textContent = '失败'; // 提示复制失败，并保持此状态
                    copyBtn.classList.remove('copied'); // 失败时移除 copied 类
                    addLog('代码块内容复制失败: ' + err.message);
                });
            };

            // 将按钮添加到包装器中，而不是pre元素中
            wrapper.appendChild(copyBtn);
        });
    }

    // 将相对时间替换为悬停 title 中的完整时间
    function replaceRelativeTimeWithAbsolute() {
        const processedAttr = 'data-ns-time-replaced';
        const elements = document.querySelectorAll('[title]:not([' + processedAttr + '])');
        elements.forEach(function (element) {
            try {
                const titleText = element.getAttribute('title') || '';
                if (!titleText) return;
                const originalText = (element.textContent || '').trim();
                const lowerText = originalText.toLowerCase();
                // 仅处理看起来是相对时间的文本
                const looksLikeRelative = /\bago\b/.test(lowerText) || /刚刚|分钟前|小时|天前|月前|年前/.test(originalText);
                if (!looksLikeRelative) return;

                let displayText = titleText;
                if (/\bedited\b/.test(lowerText)) {
                    // 去掉 title 开头可能自带的 "Edited " 或中文 "编辑于 " 前缀
                    let clean = titleText.replace(/^\s*edited\s*/i, '').replace(/^\s*编辑于\s*/i, '');
                    displayText = '编辑时间 ' + clean;
                }

                element.textContent = displayText;
                element.setAttribute(processedAttr, 'true');
            } catch (e) {
                // 忽略单个元素异常
            }
        });
    }

    // 优化主更新函数，减少不必要的重复调用
    let lastUpdateTime = 0;
    function updateAll() {
        const now = Date.now();
        // 避免过于频繁的更新
        if (now - lastUpdateTime < 1000) {
            return;
        }
        lastUpdateTime = now;

        processUsernames();
        highlightBlacklisted();
        highlightFriends(); // 新增调用
        addCopyButtonsToCodeBlocks();
        addFavoriteButton(); // 新增收藏按钮
        processUserAvatars(); // 新增：处理用户头像信息显示
        replaceRelativeTimeWithAbsolute(); // 新增：替换相对时间为完整时间
    }

    // 兼容异步加载，定时检查
    setInterval(updateAll, 2000);

    // ====== 导出/导入黑名单功能 ======
    function exportBlacklist() {
        // 同时导出所有用户数据：黑名单、好友、收藏、操作日志、浏览历史、热点统计等
        const blacklist = getBlacklist();
        const friends = getFriends();
        const favorites = getFavorites();
        // 新增：收藏分类
        const favoriteCategories = getFavoriteCategories();
        const logs = getLogs();
        const browseHistory = getBrowseHistory();

        // 常用表情（emojis.js 本地收藏）
        let emojiFavorites = [];
        try {
            const ef = localStorage.getItem('ns_emoji_favorites');
            if (ef) {
                const parsed = JSON.parse(ef);
                if (Array.isArray(parsed)) emojiFavorites = parsed;
            }
        } catch (error) {
            console.error('导出常用表情数据失败:', error);
        }

        // 不再导出热点统计相关数据

        // 添加快捷回复数据
        let quickReplies = {};
        try {
            if (window.NodeSeekQuickReply) {
                quickReplies = window.NodeSeekQuickReply.getQuickReplies();
            }
        } catch (error) {
            console.error('导出快捷回复数据失败:', error);
        }

        // 新增：快捷回复设置（自动发布）
        let quickReplySettings = {};
        try {
            const autoSubmit = localStorage.getItem('nodeseek_quick_reply_auto_submit');
            if (autoSubmit !== null) {
                quickReplySettings.autoSubmit = autoSubmit === 'true';
            }
        } catch (error) {
            console.error('导出快捷回复设置失败:', error);
        }

        // 新增：签到设置（是否开启自动签到）
        let signSettings = {};
        try {
            const signEnabled = localStorage.getItem('nodeseek_sign_enabled');
            if (signEnabled !== null) {
                signSettings.enabled = signEnabled === 'true';
            }
        } catch (error) {
            console.error('导出签到设置失败:', error);
        }

        let autoSync = {};
        try {
            const enabledRaw = localStorage.getItem('nodeseek_auto_sync_enabled');
            const itemsRaw = localStorage.getItem('nodeseek_auto_sync_items');
            const lastRaw = localStorage.getItem('nodeseek_auto_sync_last_time');
            let enabled = false;
            if (enabledRaw !== null) {
                try { enabled = JSON.parse(enabledRaw); } catch (e) { enabled = enabledRaw === 'true'; }
            }
            const items = itemsRaw ? JSON.parse(itemsRaw) : [];
            const last = lastRaw ? parseInt(lastRaw) : 0;
            autoSync = {
                enabled: !!enabled,
                items: Array.isArray(items) ? items : [],
                intervalMs: 24 * 60 * 60 * 1000,
                lastTime: isNaN(last) ? 0 : last
            };
        } catch (error) {
            console.error('导出自动同步设置失败:', error);
        }

        // 添加鸡腿统计数据
        let chickenLegStats = {};
        try {
            if (window.NodeSeekRegister && typeof window.NodeSeekRegister.getChickenLegStats === 'function') {
                chickenLegStats = window.NodeSeekRegister.getChickenLegStats();
            } else {
                // 如果模块函数不存在，尝试直接从localStorage获取所有相关数据
                const lastFetch = localStorage.getItem('nodeseek_chicken_leg_last_fetch');
                const nextAllow = localStorage.getItem('nodeseek_chicken_leg_next_allow');
                const lastHtml = localStorage.getItem('nodeseek_chicken_leg_last_html');
                const history = localStorage.getItem('nodeseek_chicken_leg_history');

                if (lastFetch || nextAllow || lastHtml || history) {
                    chickenLegStats = {
                        lastFetch: lastFetch,
                        nextAllow: nextAllow,
                        lastHtml: lastHtml,
                        history: history ? JSON.parse(history) : []
                    };
                }
            }
        } catch (error) {
            console.error('导出鸡腿统计数据失败:', error);
        }

        // 添加关键词过滤数据
        let filterData = {};
        try {
            if (window.NodeSeekFilter) {
                const customKeywords = localStorage.getItem('ns-filter-custom-keywords');
                const displayKeywords = localStorage.getItem('ns-filter-keywords');
                const highlightKeywords = localStorage.getItem('ns-filter-highlight-keywords');
                const highlightPostKeywords = localStorage.getItem('ns-filter-highlight-post-keywords');
                const highlightAuthorEnabled = localStorage.getItem('ns-filter-highlight-author-enabled');
                const highlightColor = localStorage.getItem('ns-filter-highlight-color');
                const dialogPosition = localStorage.getItem('ns-filter-dialog-position');
                const whitelistUsers = localStorage.getItem('ns-filter-whitelist-users');

                if (customKeywords || displayKeywords || highlightKeywords || highlightPostKeywords || highlightAuthorEnabled || highlightColor || dialogPosition || whitelistUsers) {
                    filterData = {
                        customKeywords: customKeywords ? JSON.parse(customKeywords) : [],
                        displayKeywords: displayKeywords ? JSON.parse(displayKeywords) : [],
                        highlightKeywords: highlightKeywords ? JSON.parse(highlightKeywords) : [],
                        highlightPostKeywords: highlightPostKeywords ? JSON.parse(highlightPostKeywords) : [],
                        highlightAuthorEnabled: highlightAuthorEnabled ? JSON.parse(highlightAuthorEnabled) : false,
                        highlightColor: highlightColor || '#ffeb3b',
                        dialogPosition: dialogPosition ? JSON.parse(dialogPosition) : null,
                        whitelistUsers: whitelistUsers ? JSON.parse(whitelistUsers) : []
                    };
                }
            }
        } catch (error) {
            console.error('导出关键词过滤数据失败:', error);
        }

        // 添加笔记数据
        let notesData = {};
        try {
            if (window.NodeSeekNotes && typeof window.NodeSeekNotes.exportNotesData === 'function') {
                notesData = window.NodeSeekNotes.exportNotesData();
            }
        } catch (error) {
            console.error('导出笔记数据失败:', error);
        }

        const data = JSON.stringify({
            blacklist: blacklist,
            friends: friends,
            favorites: favorites,
            favoriteCategories: favoriteCategories,
            logs: logs,
            browseHistory: browseHistory,
            emojiFavorites: emojiFavorites,
            quickReplies: quickReplies, // 添加快捷回复数据
            quickReplySettings: quickReplySettings, // 新增：快捷回复设置
            signSettings: signSettings, // 新增：签到设置
            chickenLegStats: chickenLegStats, // 添加鸡腿统计数据
            filterData: filterData, // 添加关键词过滤数据
            notesData: notesData, // 添加笔记数据
            autoSync: autoSync
        }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nodeseek_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        // 记录操作日志
        const hasQuickReplies = Object.keys(quickReplies).length > 0;
        const hasQuickReplySettings = Object.keys(quickReplySettings).length > 0;
        const hasSignSettings = Object.keys(signSettings).length > 0;
        const hasChickenLegStats = Object.keys(chickenLegStats).length > 0;
        const emojiFavCount = Array.isArray(emojiFavorites) ? emojiFavorites.length : 0;
        const hasFilterData = Object.keys(filterData).length > 0;
        const hasNotesData = Object.keys(notesData).length > 0;
        let exportDesc = '导出数据备份 (黑名单、好友、收藏、操作日志、浏览历史';
        if (hasQuickReplies) {
            exportDesc += '、快捷回复';
        }
        if (emojiFavCount > 0) {
            exportDesc += '、常用表情';
        }
        if (hasChickenLegStats) {
            exportDesc += '、鸡腿统计';
        }
        if (hasFilterData) {
            exportDesc += '、关键词过滤';
        }
        if (hasNotesData) {
            exportDesc += '、笔记';
        }
        // 不在导出日志中包含“自动同步设置”
        exportDesc += ')';
        addLog(exportDesc);
    }

    function importBlacklist() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = function (e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (evt) {
                try {
                    const json = JSON.parse(evt.target.result);
                    // 记录导入前信息
                    let importInfo = [];

                    // 处理黑名单数据
                    if (json.blacklist) {
                        setBlacklist(json.blacklist);
                        importInfo.push("黑名单");
                    }

                    // 处理好友数据
                    if (json.friends) {
                        setFriends(json.friends);
                        importInfo.push("好友");
                    }

                    // 处理收藏数据
                    if (json.favorites && Array.isArray(json.favorites)) {
                        setFavorites(json.favorites);
                        importInfo.push("收藏");
                    }

                    // 新增：处理收藏分类数据
                    if (json.favoriteCategories && Array.isArray(json.favoriteCategories)) {
                        try {
                            setFavoriteCategories(json.favoriteCategories);
                        } catch (e) {
                            console.error('导入收藏分类失败:', e);
                        }
                    }

                    // 处理日志数据
                    if (json.logs && Array.isArray(json.logs)) {
                        localStorage.setItem(LOGS_KEY, JSON.stringify(json.logs));
                        importInfo.push("操作日志");
                    }

                    // 处理浏览历史数据
                    if (json.browseHistory && Array.isArray(json.browseHistory)) {
                        setBrowseHistory(json.browseHistory);
                        importInfo.push("浏览历史");
                    }

                    // 处理常用表情数据
                    if (json.emojiFavorites && Array.isArray(json.emojiFavorites)) {
                        try {
                            localStorage.setItem('ns_emoji_favorites', JSON.stringify(json.emojiFavorites));
                            importInfo.push(`常用表情(${json.emojiFavorites.length}个)`);
                        } catch (e) {
                            console.error('导入常用表情失败:', e);
                            importInfo.push('常用表情(失败)');
                        }
                    }

                    // 处理热点统计数据
                    if (json.hotTopicsData && typeof json.hotTopicsData === 'object') {
                        try {
                            const hotData = json.hotTopicsData;
                            let hotImportCount = 0;

                            // 导入RSS历史数据
                            if (hotData.rssHistory && Array.isArray(hotData.rssHistory)) {
                                localStorage.setItem('nodeseek_rss_history', JSON.stringify(hotData.rssHistory));
                                hotImportCount++;
                            }

                            // 导入热词历史数据
                            if (hotData.hotWordsHistory && Array.isArray(hotData.hotWordsHistory)) {
                                localStorage.setItem('nodeseek_hot_words_history', JSON.stringify(hotData.hotWordsHistory));
                                hotImportCount++;
                            }

                            // 导入时间分布数据
                            if (hotData.timeDistributionHistory && Array.isArray(hotData.timeDistributionHistory)) {
                                localStorage.setItem('nodeseek_time_distribution_history', JSON.stringify(hotData.timeDistributionHistory));
                                hotImportCount++;
                            }

                            // 导入用户统计数据
                            if (hotData.userStatsHistory && Array.isArray(hotData.userStatsHistory)) {
                                localStorage.setItem('nodeseek_user_stats_history', JSON.stringify(hotData.userStatsHistory));
                                hotImportCount++;
                            }

                            // 导入全局状态数据
                            if (hotData.globalState && typeof hotData.globalState === 'object') {
                                localStorage.setItem('nodeseek_focus_global_state', JSON.stringify(hotData.globalState));
                                hotImportCount++;
                            }

                            if (hotImportCount > 0) {
                                importInfo.push(`热点统计(${hotImportCount}项)`);
                            }
                        } catch (error) {
                            console.error('导入热点统计数据失败:', error);
                            importInfo.push("热点统计(失败)");
                        }
                    }

                    // 处理快捷回复数据
                    if (json.quickReplies && typeof json.quickReplies === 'object') {
                        try {
                            if (window.NodeSeekQuickReply) {
                                window.NodeSeekQuickReply.setQuickReplies(json.quickReplies);
                                const categoriesCount = Object.keys(json.quickReplies).length;
                                importInfo.push(`快捷回复(${categoriesCount}个分类)`);
                            } else {
                                // 如果模块未加载，直接保存到localStorage
                                localStorage.setItem('nodeseek_quick_reply', JSON.stringify(json.quickReplies));
                                importInfo.push("快捷回复");
                            }
                        } catch (error) {
                            console.error('导入快捷回复数据失败:', error);
                            importInfo.push("快捷回复(失败)");
                        }
                    }

                    // 新增：处理快捷回复设置（自动发布）
                    if (json.quickReplySettings && typeof json.quickReplySettings === 'object') {
                        try {
                            if (typeof json.quickReplySettings.autoSubmit !== 'undefined') {
                                localStorage.setItem('nodeseek_quick_reply_auto_submit', json.quickReplySettings.autoSubmit ? 'true' : 'false');
                                importInfo.push(`快捷回复设置(自动发布${json.quickReplySettings.autoSubmit ? '开启' : '关闭'})`);
                            }
                        } catch (error) {
                            console.error('导入快捷回复设置失败:', error);
                            importInfo.push('快捷回复设置(失败)');
                        }
                    } else if (typeof json.quickReplyAutoSubmit !== 'undefined') {
                        // 兼容可能的旧字段名
                        try {
                            localStorage.setItem('nodeseek_quick_reply_auto_submit', json.quickReplyAutoSubmit ? 'true' : 'false');
                            importInfo.push(`快捷回复设置(自动发布${json.quickReplyAutoSubmit ? '开启' : '关闭'})`);
                        } catch (error) {
                            console.error('导入快捷回复设置(兼容字段)失败:', error);
                            importInfo.push('快捷回复设置(失败)');
                        }
                    }

                    // 新增：处理签到设置（是否开启自动签到）
                    if (json.signSettings && typeof json.signSettings === 'object') {
                        try {
                            if (typeof json.signSettings.enabled !== 'undefined') {
                                localStorage.setItem('nodeseek_sign_enabled', json.signSettings.enabled ? 'true' : 'false');
                                importInfo.push(`签到设置(${json.signSettings.enabled ? '开启' : '关闭'})`);
                            }
                        } catch (error) {
                            console.error('导入签到设置失败:', error);
                            importInfo.push('签到设置(失败)');
                        }
                    } else if (typeof json.signEnabled !== 'undefined') {
                        // 兼容可能的旧字段名
                        try {
                            localStorage.setItem('nodeseek_sign_enabled', json.signEnabled ? 'true' : 'false');
                            importInfo.push(`签到设置(${json.signEnabled ? '开启' : '关闭'})`);
                        } catch (error) {
                            console.error('导入签到设置(兼容字段)失败:', error);
                            importInfo.push('签到设置(失败)');
                        }
                    }

                    // 处理鸡腿统计数据
                    if (json.chickenLegStats && typeof json.chickenLegStats === 'object') {
                        try {
                            if (window.NodeSeekRegister && typeof window.NodeSeekRegister.setChickenLegStats === 'function') {
                                window.NodeSeekRegister.setChickenLegStats(json.chickenLegStats);
                                const historyCount = json.chickenLegStats.history ? json.chickenLegStats.history.length : 0;
                                importInfo.push(`鸡腿统计(${historyCount}条记录)`);
                            } else {
                                // 如果模块未加载，直接保存到localStorage的相应键中
                                let importedCount = 0;

                                if (json.chickenLegStats.lastFetch) {
                                    localStorage.setItem('nodeseek_chicken_leg_last_fetch', json.chickenLegStats.lastFetch);
                                    importedCount++;
                                }

                                if (json.chickenLegStats.nextAllow) {
                                    localStorage.setItem('nodeseek_chicken_leg_next_allow', json.chickenLegStats.nextAllow);
                                    importedCount++;
                                }

                                if (json.chickenLegStats.lastHtml) {
                                    localStorage.setItem('nodeseek_chicken_leg_last_html', json.chickenLegStats.lastHtml);
                                    importedCount++;
                                }

                                if (json.chickenLegStats.history && Array.isArray(json.chickenLegStats.history)) {
                                    localStorage.setItem('nodeseek_chicken_leg_history', JSON.stringify(json.chickenLegStats.history));
                                    importedCount++;
                                    importInfo.push(`鸡腿统计(${json.chickenLegStats.history.length}条记录)`);
                                } else {
                                    importInfo.push("鸡腿统计");
                                }
                            }
                        } catch (error) {
                            console.error('导入鸡腿统计数据失败:', error);
                            importInfo.push("鸡腿统计(失败)");
                        }
                    }

                    // 处理旧格式数据
                    // 处理关键词过滤数据
                    if (json.filterData && typeof json.filterData === 'object') {
                        try {
                            let filterImportCount = 0;

                            // 导入屏蔽关键词
                            if (json.filterData.customKeywords && Array.isArray(json.filterData.customKeywords)) {
                                localStorage.setItem('ns-filter-custom-keywords', JSON.stringify(json.filterData.customKeywords));
                                filterImportCount += json.filterData.customKeywords.length;
                            }

                            // 导入显示关键词
                            if (json.filterData.displayKeywords && Array.isArray(json.filterData.displayKeywords)) {
                                localStorage.setItem('ns-filter-keywords', JSON.stringify(json.filterData.displayKeywords));
                            }

                            // 导入高亮关键词
                            if (json.filterData.highlightKeywords && Array.isArray(json.filterData.highlightKeywords)) {
                                localStorage.setItem('ns-filter-highlight-keywords', JSON.stringify(json.filterData.highlightKeywords));
                            }

                            // 导入帖子内容高亮关键词
                            if (json.filterData.highlightPostKeywords && Array.isArray(json.filterData.highlightPostKeywords)) {
                                localStorage.setItem('ns-filter-highlight-post-keywords', JSON.stringify(json.filterData.highlightPostKeywords));
                            }

                            // 导入作者高亮选项
                            if (json.filterData.highlightAuthorEnabled !== undefined) {
                                localStorage.setItem('ns-filter-highlight-author-enabled', JSON.stringify(json.filterData.highlightAuthorEnabled));
                            }

                            // 导入高亮颜色
                            if (json.filterData.highlightColor) {
                                localStorage.setItem('ns-filter-highlight-color', json.filterData.highlightColor);
                            }

                            // 导入弹窗位置
                            if (json.filterData.dialogPosition && typeof json.filterData.dialogPosition === 'object') {
                                localStorage.setItem('ns-filter-dialog-position', JSON.stringify(json.filterData.dialogPosition));
                            }

                            // 导入不屏蔽用户
                            if (json.filterData.whitelistUsers && Array.isArray(json.filterData.whitelistUsers)) {
                                localStorage.setItem('ns-filter-whitelist-users', JSON.stringify(json.filterData.whitelistUsers));
                            }

                            if (filterImportCount > 0 || (json.filterData.displayKeywords && json.filterData.displayKeywords.length > 0) || (json.filterData.highlightKeywords && json.filterData.highlightKeywords.length > 0) || json.filterData.highlightAuthorEnabled !== undefined || (json.filterData.whitelistUsers && json.filterData.whitelistUsers.length > 0)) {
                                const customCount = json.filterData.customKeywords ? json.filterData.customKeywords.length : 0;
                                const displayCount = json.filterData.displayKeywords ? json.filterData.displayKeywords.length : 0;
                                const highlightCount = json.filterData.highlightKeywords ? json.filterData.highlightKeywords.length : 0;
                                const whitelistCount = json.filterData.whitelistUsers ? json.filterData.whitelistUsers.length : 0;
                                const authorHighlightEnabled = json.filterData.highlightAuthorEnabled ? '开启' : '关闭';
                                importInfo.push(`关键词过滤(屏蔽${customCount}个,显示${displayCount}个,高亮${highlightCount}个,不屏蔽用户${whitelistCount}个,作者高亮${authorHighlightEnabled})`);
                            } else {
                                importInfo.push("关键词过滤");
                            }
                        } catch (error) {
                            console.error('导入关键词过滤数据失败:', error);
                            importInfo.push("关键词过滤(失败)");
                        }
                    }

                    // 处理笔记数据
                    if (json.notesData && typeof json.notesData === 'object') {
                        try {
                            if (window.NodeSeekNotes && typeof window.NodeSeekNotes.importNotesData === 'function') {
                                const success = window.NodeSeekNotes.importNotesData(json.notesData);
                                if (success) {
                                    const categoriesCount = json.notesData.categories ? json.notesData.categories.length : 0;
                                    const notesCount = json.notesData.notes ? Object.keys(json.notesData.notes).length : 0;
                                    const trashCount = json.notesData.trash ? json.notesData.trash.length : 0;
                                    importInfo.push(`笔记(${categoriesCount}个分类,${notesCount}篇笔记,${trashCount}条回收站)`);
                                } else {
                                    importInfo.push("笔记(失败)");
                                }
                            } else {
                                // 如果模块未加载，直接保存到localStorage
                                if (json.notesData.categories) {
                                    localStorage.setItem('nodeseek_notes_categories', JSON.stringify(json.notesData.categories));
                                }
                                if (json.notesData.notes) {
                                    localStorage.setItem('nodeseek_notes_data', JSON.stringify(json.notesData.notes));
                                }
                                if (json.notesData.fontColors) {
                                    localStorage.setItem('nodeseek_notes_font_colors', JSON.stringify(json.notesData.fontColors));
                                }
                                if (json.notesData.bgColors) {
                                    localStorage.setItem('nodeseek_notes_bg_colors', JSON.stringify(json.notesData.bgColors));
                                }
                                if (json.notesData.lastSelectedNote) {
                                    localStorage.setItem('nodeseek_notes_last_selected', JSON.stringify(json.notesData.lastSelectedNote));
                                }
                                if (json.notesData.trash) {
                                    localStorage.setItem('nodeseek_notes_trash', JSON.stringify(json.notesData.trash));
                                }
                                const categoriesCount = json.notesData.categories ? json.notesData.categories.length : 0;
                                const notesCount = json.notesData.notes ? Object.keys(json.notesData.notes).length : 0;
                                const trashCount = json.notesData.trash ? json.notesData.trash.length : 0;
                                importInfo.push(`笔记(${categoriesCount}个分类,${notesCount}篇笔记,${trashCount}条回收站)`);
                            }
                        } catch (error) {
                            console.error('导入笔记数据失败:', error);
                            importInfo.push("笔记(失败)");
                        }
                    }

                    if (json.autoSync && typeof json.autoSync === 'object') {
                        try {
                            const enabled = !!json.autoSync.enabled;
                            localStorage.setItem('nodeseek_auto_sync_enabled', enabled ? 'true' : 'false');
                            if (Array.isArray(json.autoSync.items)) {
                                localStorage.setItem('nodeseek_auto_sync_items', JSON.stringify(json.autoSync.items));
                            }
                            const last = typeof json.autoSync.lastTime === 'number' ? json.autoSync.lastTime : 0;
                            localStorage.setItem('nodeseek_auto_sync_last_time', ((last && !isNaN(last)) ? last : Date.now()).toString());
                            localStorage.removeItem('nodeseek_auto_sync_lock_until');
                            importInfo.push(`自动同步设置(${enabled ? '开启' : '关闭'})`);
                        } catch (e) {
                            importInfo.push('自动同步设置(失败)');
                        }
                    }

                    if (!json.blacklist && !json.friends && !json.logs && !json.favorites && !json.hotTopicsData && !json.quickReplies && !json.chickenLegStats && !json.filterData && !json.notesData) {
                        // 旧格式，直接作为黑名单
                        setBlacklist(json);
                        importInfo.push("旧格式黑名单");
                    }

                    const hasQuickRepliesLog = json.quickReplies && typeof json.quickReplies === 'object' && Object.keys(json.quickReplies).length > 0;
                    const emojiFavCountLog = Array.isArray(json.emojiFavorites) ? json.emojiFavorites.length : 0;
                    const hasChickenLegStatsLog = json.chickenLegStats && typeof json.chickenLegStats === 'object' && Object.keys(json.chickenLegStats).length > 0;
                    const hasFilterDataLog = json.filterData && typeof json.filterData === 'object' && Object.keys(json.filterData).length > 0;
                    const hasNotesDataLog = json.notesData && typeof json.notesData === 'object' && Object.keys(json.notesData).length > 0;
                    let importDesc = '导入数据备份 (黑名单、好友、收藏、操作日志、浏览历史';
                    if (hasQuickRepliesLog) importDesc += '、快捷回复';
                    if (emojiFavCountLog > 0) importDesc += '、常用表情';
                    if (hasChickenLegStatsLog) importDesc += '、鸡腿统计';
                    if (hasFilterDataLog) importDesc += '、关键词过滤';
                    if (hasNotesDataLog) importDesc += '、笔记';
                    importDesc += ')';
                    addLog(importDesc);

                    location.reload();
                } catch (err) {
                    alert('导入失败，文件格式不正确');
                    // 记录操作日志
                    addLog('导入数据备份失败: 文件格式不正确');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // 显示历史浏览记录弹窗
    function showBrowseHistoryDialog() {
        if (window.NodeSeekHistory && window.NodeSeekHistory.showDialog) {
            return window.NodeSeekHistory.showDialog();
        }
    }

    // 日志记录功能
    const LOGS_KEY = 'nodeseek_sign_logs';

    // 添加日志
    function addLog(message) {
        const now = new Date();
        const timeStr = now.toLocaleString();
        const logEntry = `[${timeStr}] ${message}`;

        // 获取现有日志
        const logs = getLogs();

        // 添加新日志（限制最多保存100条）
        logs.unshift(logEntry);
        if (logs.length > 100) {
            logs.length = 100;
        }

        // 保存日志
        localStorage.setItem(LOGS_KEY, JSON.stringify(logs));

        // 如果日志对话框已打开，则更新其内容
        updateLogDialogIfOpen(logEntry);
    }

    window.addLog = addLog;

    // 新增：如果日志对话框已打开，立即更新其内容
    function updateLogDialogIfOpen(newLogEntry) {
        const logDialog = document.getElementById('logs-dialog');
        if (logDialog) {
            const logContent = logDialog.querySelector('pre');
            if (logContent) {
                // 如果当前是空状态占位或空字符串，直接替换为首条日志
                const current = (logContent.textContent || '').trim();
                if (!current || current === '暂无日志记录') {
                    logContent.textContent = newLogEntry;
                } else {
                    // 在顶部添加新日志
                    logContent.textContent = newLogEntry + '\n' + logContent.textContent;
                }
            }
        }
    }

    // 获取日志
    function getLogs() {
        return JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    }

    // 清除日志
    function clearLogs() {
        localStorage.removeItem(LOGS_KEY);
    }

    // 显示日志弹窗
    function showLogs() {
        // 检查弹窗是否已存在
        const existingDialog = document.getElementById('logs-dialog');
        if (existingDialog) {
            // 如果已存在，则关闭弹窗
            existingDialog.remove();
            return;
        }

        const logs = getLogs();

        // 创建弹窗
        const dialog = document.createElement('div');
        dialog.id = 'logs-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '60px';
        dialog.style.right = '16px';
        dialog.style.zIndex = 10000;
        dialog.style.background = '#fff';
        dialog.style.border = '1px solid #ccc';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        dialog.style.padding = '18px 20px 12px 20px';
        // 移除固定width设置，在PC设备上保留
        if (window.innerWidth > 767) {
            dialog.style.width = '600px';  // 只在PC设备上设置
        }
        dialog.style.maxHeight = '80vh';
        dialog.style.overflowY = 'auto';

        // 标题和关闭按钮
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.marginBottom = '10px';

        const title = document.createElement('div');
        title.textContent = '操作日志记录';
        title.style.fontWeight = 'bold';
        title.style.fontSize = '16px';

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.position = 'absolute';
        closeBtn.style.right = '12px';
        closeBtn.style.top = '8px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '20px';
        closeBtn.onclick = function () { dialog.remove(); };
        // 添加类名便于CSS选择器选中
        closeBtn.className = 'close-btn';

        header.appendChild(title);
        header.appendChild(closeBtn);
        dialog.appendChild(header);

        // 清空按钮
        const clearBtn = document.createElement('button');
        clearBtn.textContent = '清空日志';
        clearBtn.style.marginBottom = '10px';
        clearBtn.style.padding = '3px 8px';
        clearBtn.style.background = '#f44336';
        clearBtn.style.color = 'white';
        clearBtn.style.border = 'none';
        clearBtn.style.borderRadius = '3px';
        clearBtn.style.cursor = 'pointer';
        clearBtn.onclick = function () {
            if (confirm('确定要清空所有日志吗？')) {
                clearLogs();
                // 不再提示任何文本，直接清空显示内容
                // 清空后展示空状态占位文案
                logContent.textContent = '暂无日志记录';
            }
        };
        dialog.appendChild(clearBtn);
        // 新增：鸡腿统计按钮
        const chickenLegBtn = document.createElement('button');
        chickenLegBtn.textContent = '鸡腿统计';
        chickenLegBtn.style.marginBottom = '10px';
        chickenLegBtn.style.marginLeft = '10px'; // 与清空日志按钮的间距
        chickenLegBtn.style.padding = '3px 8px';
        chickenLegBtn.style.background = '#007bff'; // 蓝色
        chickenLegBtn.style.color = 'white';
        chickenLegBtn.style.border = 'none';
        chickenLegBtn.style.borderRadius = '3px';
        chickenLegBtn.style.cursor = 'pointer';
        chickenLegBtn.onclick = function () {
            if (window.NodeSeekRegister && typeof window.NodeSeekRegister.showChickenLegStatsDialog === 'function') {
                try {
                    window.NodeSeekRegister.showChickenLegStatsDialog();
                } catch (error) {
                    addLog('鸡腿统计功能调用失败: ' + error.message);
                }
            } else {
                if (!window.NodeSeekRegister) {
                    addLog('鸡腿统计模块未加载。');
                } else {
                    addLog('鸡腿统计功能不可用。');
                }
            }
        };
        dialog.appendChild(chickenLegBtn); // 添加到日志弹窗中

        // 新增：历史浏览记录按钮
        const browseHistoryBtn = document.createElement('button');
        browseHistoryBtn.textContent = '历史浏览记录';
        browseHistoryBtn.style.marginBottom = '10px';
        browseHistoryBtn.style.marginLeft = '10px'; // 与鸡腿统计按钮的间距
        browseHistoryBtn.style.padding = '3px 8px';
        browseHistoryBtn.style.background = '#28a745'; // 绿色
        browseHistoryBtn.style.color = 'white';
        browseHistoryBtn.style.border = 'none';
        browseHistoryBtn.style.borderRadius = '3px';
        browseHistoryBtn.style.cursor = 'pointer';
        browseHistoryBtn.onclick = function () {
            showBrowseHistoryDialog();
        };
        dialog.appendChild(browseHistoryBtn); // 添加到日志弹窗中

        // 新增：热点统计按钮
        const hotTopicsBtn = document.createElement('button');
        hotTopicsBtn.textContent = '热点统计';
        hotTopicsBtn.style.marginBottom = '10px';
        hotTopicsBtn.style.marginLeft = '10px'; // 与历史浏览记录按钮的间距
        hotTopicsBtn.style.padding = '3px 8px';
        hotTopicsBtn.style.background = '#FF5722'; // 橙红色
        hotTopicsBtn.style.color = 'white';
        hotTopicsBtn.style.border = 'none';
        hotTopicsBtn.style.borderRadius = '3px';
        hotTopicsBtn.style.cursor = 'pointer';
        hotTopicsBtn.onclick = function () {
            if (window.NodeSeekFocus && typeof window.NodeSeekFocus.showHotTopicsDialog === 'function') {
                try {
                    window.NodeSeekFocus.showHotTopicsDialog();
                } catch (error) {
                    addLog('热点统计功能调用失败: ' + error.message);
                }
            } else {
                if (!window.NodeSeekFocus) {
                    addLog('热点统计模块未加载。');
                } else {
                    addLog('热点统计功能不可用。');
                }
            }
        };
        dialog.appendChild(hotTopicsBtn); // 添加到日志弹窗中

        // 新增：配置同步按钮
        const configSyncBtn = document.createElement('button');
        configSyncBtn.textContent = '配置同步';
        configSyncBtn.style.marginBottom = '10px';
        configSyncBtn.style.marginLeft = '10px'; // 与热点统计按钮的间距
        configSyncBtn.style.padding = '3px 8px';
        configSyncBtn.style.background = '#FF6B35'; // 橙色背景
        configSyncBtn.style.color = 'white';
        configSyncBtn.style.border = 'none';
        configSyncBtn.style.borderRadius = '3px';
        configSyncBtn.style.cursor = 'pointer';
        configSyncBtn.onclick = function () {
            if (window.NodeSeekLogin && typeof window.NodeSeekLogin.showDialog === 'function') {
                try {
                    window.NodeSeekLogin.showDialog();
                } catch (error) {
                    addLog('配置同步功能调用失败: ' + error.message);
                }
            } else {
                if (!window.NodeSeekLogin) {
                    addLog('配置同步模块未加载。');
                } else {
                    addLog('配置同步功能不可用。');
                }
            }
        };
        dialog.appendChild(configSyncBtn); // 添加到日志弹窗中

        // 新增：VPS计算器按钮
        const vpsCalculatorBtn = document.createElement('button');
        vpsCalculatorBtn.textContent = 'VPS计算器';
        vpsCalculatorBtn.style.marginBottom = '10px';
        vpsCalculatorBtn.style.marginLeft = '10px'; // 与配置同步按钮的间距
        vpsCalculatorBtn.style.padding = '3px 8px';
        vpsCalculatorBtn.style.background = '#9C27B0'; // 紫色背景
        vpsCalculatorBtn.style.color = 'white';
        vpsCalculatorBtn.style.border = 'none';
        vpsCalculatorBtn.style.borderRadius = '3px';
        vpsCalculatorBtn.style.cursor = 'pointer';
        vpsCalculatorBtn.onclick = function () {
            if (window.NodeSeekVPS && typeof window.NodeSeekVPS.showCalculatorDialog === 'function') {
                try {
                    window.NodeSeekVPS.showCalculatorDialog();
                } catch (error) {
                    addLog('VPS计算器功能调用失败: ' + error.message);
                }
            } else {
                if (!window.NodeSeekVPS) {
                    addLog('VPS计算器模块未加载。');
                } else {
                    addLog('VPS计算器功能不可用。');
                }
            }
        };
        dialog.appendChild(vpsCalculatorBtn); // 添加到日志弹窗中

        // 新增：笔记按钮（放在 VPS计算器 旁边）
        const notesBtn = document.createElement('button');
        notesBtn.textContent = '笔记';
        notesBtn.style.marginBottom = '10px';
        notesBtn.style.marginLeft = '10px';
        notesBtn.style.padding = '3px 8px';
        notesBtn.style.background = '#607D8B';
        notesBtn.style.color = 'white';
        notesBtn.style.border = 'none';
        notesBtn.style.borderRadius = '3px';
        notesBtn.style.cursor = 'pointer';
        notesBtn.onclick = function () {
            if (window.NodeSeekNotes && typeof window.NodeSeekNotes.showNotesDialog === 'function') {
                try {
                    window.NodeSeekNotes.showNotesDialog();
                } catch (error) {
                    addLog('笔记功能调用失败: ' + error.message);
                }
            } else {
                if (!window.NodeSeekNotes) {
                    addLog('笔记模块未加载。');
                } else {
                    addLog('笔记功能不可用。');
                }
            }
        };
        dialog.appendChild(notesBtn);

        // 日志内容
        const logContent = document.createElement('pre');
        logContent.style.background = '#f5f5f5';
        logContent.style.padding = '10px';
        logContent.style.borderRadius = '4px';
        logContent.style.whiteSpace = 'pre-wrap';
        logContent.style.fontSize = '13px';
        logContent.style.maxHeight = '60vh';
        logContent.style.overflowY = 'auto';

        if (logs.length > 0) {
            // 修复日志内容换行问题
            let logStr = logs.join('\n');
            // 兼容历史数据中的\\n和\n
            logStr = logStr.replace(/\\n/g, '\n').replace(/\n/g, '\n');
            logContent.textContent = logStr;
        } else {
            logContent.textContent = '暂无日志记录';
        }

        dialog.appendChild(logContent);
        document.body.appendChild(dialog);
        makeDraggable(dialog, { width: 50, height: 50 }); // Make logs dialog draggable, increased drag area for testing
    }



    // 删除域名连通性检测功能模块

    // ====== 按钮插入到页面右上角 ======
    function addExportImportButtons() {
        if (document.getElementById('blacklist-export-btn')) return;

        // 创建主容器
        const mainContainer = document.createElement('div');
        mainContainer.id = 'nodeseek-plugin-main-container';
        mainContainer.style.position = 'fixed';
        mainContainer.style.top = '30px';
        mainContainer.style.right = '4px';
        mainContainer.style.zIndex = 9999;
        mainContainer.style.display = 'flex'; // 使用flex布局
        mainContainer.style.flexDirection = 'row'; // 水平方向

        // 创建按钮容器
        const container = document.createElement('div');
        container.id = 'nodeseek-plugin-buttons-container'; // 给容器一个ID，方便需要时获取
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.background = 'rgba(255, 255, 255, 0.95)';
        container.style.padding = '10px';
        container.style.borderRadius = '5px';
        container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        container.style.transition = 'all 0.3s ease'; // 添加过渡效果
        container.style.width = 'auto'; // 确保初始宽度正确

        // 新增：添加折叠按钮
        const collapseBtn = document.createElement('button');
        collapseBtn.id = 'collapse-btn';
        collapseBtn.className = 'collapse-btn';
        collapseBtn.innerHTML = '&lt;'; // 默认显示 <
        collapseBtn.title = '点击折叠/展开';

        // 组装UI - 先添加折叠按钮，再添加内容容器
        mainContainer.appendChild(collapseBtn);
        mainContainer.appendChild(container);

        // 处理折叠状态
        const isCollapsed = getCollapsedState();
        if (isCollapsed) {
            container.classList.add('nodeseek-plugin-container-collapsed');
            collapseBtn.innerHTML = '&gt;'; // 折叠状态显示 >
        }

        // 日志按钮
        const logBtn = document.createElement('button');
        logBtn.id = 'sign-log-btn';
        logBtn.className = 'blacklist-btn';
        logBtn.textContent = '日志';
        logBtn.style.background = '#795548';
        logBtn.onclick = showLogs;

        // 签到按钮（界面保留但功能移除）
        const signInBtn = document.createElement('button');
        signInBtn.id = 'sign-in-btn';
        signInBtn.className = 'blacklist-btn';

        // 恢复签到状态
        const signInEnabled = localStorage.getItem('nodeseek_sign_enabled') === 'true';

        // 根据签到状态设置按钮文本和颜色
        if (signInEnabled) {
            signInBtn.textContent = '关闭签到';
            signInBtn.style.background = '#f44336'; // 红色表示可以关闭
        } else {
            signInBtn.textContent = '开启签到';
            signInBtn.style.background = '#4CAF50'; // 绿色表示可以开启
        }

        // 设置按钮宽度一致
        signInBtn.style.width = '100px';

        // 签到按钮点击逻辑
        signInBtn.addEventListener('click', function () {
            // 切换状态
            const newStatus = localStorage.getItem('nodeseek_sign_enabled') !== 'true';
            localStorage.setItem('nodeseek_sign_enabled', newStatus);

            if (newStatus) {
                // 开启签到
                signInBtn.textContent = '关闭签到';
                signInBtn.style.background = '#f44336'; // 红色表示可以关闭

                // 记录日志
                addLog('开启签到功能');

                // 如果签到模块已加载，显示当前状态
                if (window.NodeSeekClockIn) {
                    const todaySigned = window.NodeSeekClockIn.isTodayAlreadySigned();
                    const inSignWindow = window.NodeSeekClockIn.isInSignTimeWindow();
                    const inPreSign = window.NodeSeekClockIn.isInPreSignMode();

                    let statusMsg = '';
                    if (todaySigned) {
                        statusMsg = '今日已签到完成';
                    } else if (inSignWindow) {
                        statusMsg = '当前在签到时间窗口内';
                    } else if (inPreSign) {
                        statusMsg = '当前在预签到模式';
                    } else {
                        statusMsg = '等待签到时间 (00:00:00-00:00:10)';
                    }
                    addLog('签到状态: ' + statusMsg);
                }
            } else {
                // 关闭签到
                signInBtn.textContent = '开启签到';
                signInBtn.style.background = '#4CAF50'; // 绿色表示可以开启

                // 记录日志
                addLog('关闭签到功能');
            }
        });

        // 初始化签到功能模块
        function initClockInFeature() {
            // 延迟检查，确保 Clockin.js 加载完成
            const checkClockIn = () => {
                if (window.NodeSeekClockIn && window.NodeSeekClockIn.setAddLogFunction) {
                    // 确保 addLog 函数能够传递给 Clockin.js
                    window.NodeSeekClockIn.setAddLogFunction(addLog);
                } else {
                    // 延迟重试
                    setTimeout(checkClockIn, 500);
                }
            };
            checkClockIn();
        }

        // 延迟初始化，确保所有模块都加载完成
        setTimeout(initClockInFeature, 100);

        // 初始化统计功能
        function initStatisticsFeature() {
            // 延迟检查，确保 statistics.js 加载完成
            const checkStatistics = () => {
                if (window.NodeSeekRegister && window.NodeSeekRegister.setAddLogFunction) {
                    // 确保 addLog 函数能够传递给 statistics.js
                    window.NodeSeekRegister.setAddLogFunction(addLog);
                } else {
                    // 延迟重试
                    setTimeout(checkStatistics, 500);
                }
            };
            checkStatistics();
        }

        // 延迟初始化，确保所有模块都加载完成
        setTimeout(initStatisticsFeature, 100);

        const exportBtn = document.createElement('button');
        exportBtn.id = 'blacklist-export-btn';
        exportBtn.className = 'blacklist-btn';
        exportBtn.textContent = '导出';
        exportBtn.onclick = exportBlacklist;
        exportBtn.style.width = '50%'; // 设置为50%宽度，与导入按钮共享一行

        const importBtn = document.createElement('button');
        importBtn.id = 'blacklist-import-btn';
        importBtn.className = 'blacklist-btn';
        importBtn.textContent = '导入';
        importBtn.onclick = importBlacklist;
        importBtn.style.width = '50%'; // 设置为50%宽度，与导出按钮共享一行

        // 创建一个水平排列的容器，用于导出和导入按钮
        const dataContainer = document.createElement('div');
        dataContainer.style.display = 'flex';
        dataContainer.style.flexDirection = 'row';
        dataContainer.style.gap = '10px';
        dataContainer.style.width = '100%';

        // 将导出和导入按钮添加到水平容器中
        dataContainer.appendChild(exportBtn); // 导出
        dataContainer.appendChild(importBtn); // 导入

        // 新增：查看黑名单按钮
        const viewBtn = document.createElement('button');
        viewBtn.id = 'blacklist-view-btn';
        viewBtn.className = 'blacklist-btn';
        viewBtn.textContent = '查看黑名单';
        viewBtn.style.background = '#2ea44f';
        viewBtn.onclick = showBlacklistDialog;

        // 新增：查看好友按钮
        const viewFriendsBtn = document.createElement('button');
        viewFriendsBtn.id = 'friends-view-btn';
        viewFriendsBtn.className = 'blacklist-btn';
        viewFriendsBtn.style.background = '#2ea44f';
        viewFriendsBtn.textContent = '查看好友';
        viewFriendsBtn.onclick = showFriendsDialog;

        // 新增：快捷编辑按钮
        const quickEditBtn = document.createElement('button');
        quickEditBtn.id = 'quick-edit-btn';
        quickEditBtn.className = 'blacklist-btn';
        quickEditBtn.style.background = '#2196F3'; // 蓝色背景
        quickEditBtn.textContent = '快捷编辑';
        quickEditBtn.title = "编辑#0帖子"; // 添加鼠标悬停提示文本
        // 添加功能：点击时自动点击#0楼层的编辑按钮
        quickEditBtn.onclick = function () {
            // 寻找#0楼层的编辑按钮并点击
            function findAndClickEditButton() {
                // 查找所有包含"编辑"文本的菜单项
                const menuItems = document.querySelectorAll('.menu-item');
                let editButton = null;
                let foundZeroFloor = false;

                // 首先确认页面上是否存在#0楼层
                const floorElements = document.querySelectorAll('*');
                for (let i = 0; i < floorElements.length; i++) {
                    const el = floorElements[i];
                    if (el.textContent && el.textContent.trim() === '#0') {
                        foundZeroFloor = true;
                        break;
                    }
                }

                // 如果没有找到#0楼层，则提示并返回
                if (!foundZeroFloor) {
                    addLog('快捷编辑：当前页面没有找到#0楼层');
                    return;
                }

                // 遍历所有菜单项，找到包含"编辑"文本的项
                for (let i = 0; i < menuItems.length; i++) {
                    const item = menuItems[i];
                    const spanText = item.querySelector('span')?.textContent;
                    if (spanText === '编辑') {
                        // 查找是否在#0楼层附近
                        let parent = item;
                        let found = false;
                        // 向上查找最多5层父元素，检查是否有准确的#0标识
                        for (let j = 0; j < 5; j++) {
                            parent = parent.parentElement;
                            if (!parent) break;

                            // 两种检查方式：
                            // 1. 精确匹配：查找是否有文本内容恰好为"#0"的元素
                            const hasExactZeroMark = Array.from(parent.querySelectorAll('*')).some(
                                el => el.textContent && el.textContent.trim() === '#0'
                            );

                            // 2. 检查是否有明确包含"#0"但不包含其他楼层号的元素
                            const hasZeroMark = parent.textContent.includes('#0') &&
                                !parent.textContent.includes('#1') &&
                                !parent.textContent.includes('#2');

                            if (hasExactZeroMark || hasZeroMark) {
                                found = true;
                                editButton = item;
                                break;
                            }
                        }

                        if (found) break;
                    }
                }

                // 如果找到了#0楼层的编辑按钮，进行点击
                if (editButton) {
                    // 记录操作日志
                    addLog('快捷编辑：点击了#0楼层的编辑按钮');
                    editButton.click();
                } else {
                    // 提示未找到编辑按钮
                    addLog('快捷编辑：未找到#0楼层的编辑按钮');
                }
            }

            // 执行查找和点击
            findAndClickEditButton();
        };

        // 调整按钮宽度使其统一
        const btnWidth = '100px';

        logBtn.style.width = btnWidth;
        // 导出和导入按钮已使用百分比宽度，不需要再设置
        viewBtn.style.width = btnWidth;
        viewFriendsBtn.style.width = btnWidth;
        quickEditBtn.style.width = btnWidth; // 设置快捷编辑按钮宽度

        // 新增：查看按钮
        const viewFavoritesBtn = document.createElement('button');
        viewFavoritesBtn.id = 'favorites-view-btn';
        viewFavoritesBtn.className = 'blacklist-btn';
        viewFavoritesBtn.style.background = '#1890ff'; // 蓝色背景
        viewFavoritesBtn.textContent = '查看';
        viewFavoritesBtn.style.width = '50%'; // 设置为50%宽度，与收藏按钮共享一行
        viewFavoritesBtn.onclick = showFavoritesDialog;

        // 新增：关键词过滤按钮
        const filterBtn = document.createElement('button');
        filterBtn.id = 'keyword-filter-btn';
        filterBtn.className = 'blacklist-btn';
        filterBtn.style.background = '#4CAF50';
        filterBtn.textContent = '关键词过滤';
        filterBtn.style.width = '100%';
        filterBtn.style.marginTop = '1px';
        filterBtn.onclick = function () {
            if (window.NodeSeekFilter && typeof window.NodeSeekFilter.createFilterUI === 'function') {
                window.NodeSeekFilter.createFilterUI();
            } else {
                alert('关键词过滤功能未加载');
            }
        };

        // 新增：收藏当前页面按钮
        const addFavoriteBtn = document.createElement('button');
        addFavoriteBtn.id = 'favorite-add-btn';
        addFavoriteBtn.className = 'blacklist-btn';
        addFavoriteBtn.style.background = '#1890ff'; // 蓝色背景
        addFavoriteBtn.textContent = '收藏';
        addFavoriteBtn.style.width = '50%'; // 设置为50%宽度，与查看按钮共享一行
        addFavoriteBtn.onclick = function () {
            // 获取当前页面URL
            const url = window.location.href;
            // 获取当前页面标题
            const title = document.title.replace(' - NodeSeek', '').trim();

            // 检查是否已收藏
            const isFavorited = isCurrentPageFavorited();
            if (isFavorited) {
                // 已收藏，询问是否取消收藏
                if (confirm('当前页面已收藏，是否取消收藏？')) {
                    removeFromFavorites(url);
                    // 不显示弹窗提示
                }
            } else {
                // 未收藏，添加收藏 - 使用自定义弹窗选择分类
                showAddFavoriteDialog();
            }
        };

        // 创建一个水平排列的容器，用于收藏相关按钮
        const favoriteContainer = document.createElement('div');
        favoriteContainer.style.display = 'flex';
        favoriteContainer.style.flexDirection = 'row';
        favoriteContainer.style.gap = '10px';
        favoriteContainer.style.width = '100%';

        // 将收藏和查看按钮添加到水平容器中
        favoriteContainer.appendChild(addFavoriteBtn); // 收藏
        favoriteContainer.appendChild(viewFavoritesBtn); // 查看收藏列表

        // 新增：关键词过滤按钮单独一行
        const filterBtnContainer = document.createElement('div');
        filterBtnContainer.style.display = 'flex';
        filterBtnContainer.style.flexDirection = 'row';
        filterBtnContainer.style.gap = '10px';
        filterBtnContainer.style.width = '100%';
        filterBtnContainer.appendChild(filterBtn);

        // 新增：用户信息显示开关按钮
        const userInfoToggleBtn = document.createElement('button');
        userInfoToggleBtn.id = 'user-info-toggle-btn';
        userInfoToggleBtn.className = 'blacklist-btn';
        const isUserInfoEnabled = getUserInfoDisplayState();
        userInfoToggleBtn.style.background = isUserInfoEnabled ? '#f44336' : '#4CAF50';
        userInfoToggleBtn.textContent = isUserInfoEnabled ? '关闭信息' : '开启信息';
        userInfoToggleBtn.style.width = '100%';
        userInfoToggleBtn.style.marginTop = '1px';
        userInfoToggleBtn.onclick = toggleUserInfoDisplay;

        // 新增：用户信息开关按钮单独一行
        const userInfoToggleContainer = document.createElement('div');
        userInfoToggleContainer.style.display = 'flex';
        userInfoToggleContainer.style.flexDirection = 'row';
        userInfoToggleContainer.style.gap = '10px';
        userInfoToggleContainer.style.width = '100%';
        userInfoToggleContainer.appendChild(userInfoToggleBtn);

        // 新增：快捷回复按钮
        const quickReplyBtn = document.createElement('button');
        quickReplyBtn.id = 'quick-reply-btn';
        quickReplyBtn.className = 'blacklist-btn';
        quickReplyBtn.style.background = '#9C27B0'; // 紫色背景
        quickReplyBtn.textContent = '快捷回复';
        quickReplyBtn.style.width = '100%';
        quickReplyBtn.style.marginTop = '1px';
        quickReplyBtn.onclick = function () {
            if (window.NodeSeekQuickReply && typeof window.NodeSeekQuickReply.showQuickReplyDialog === 'function') {
                window.NodeSeekQuickReply.showQuickReplyDialog();
            } else {
                alert('快捷回复功能未加载');
            }
        };

        // 新增：快捷回复按钮单独一行
        const quickReplyContainer = document.createElement('div');
        quickReplyContainer.style.display = 'flex';
        quickReplyContainer.style.flexDirection = 'row';
        quickReplyContainer.style.gap = '10px';
        quickReplyContainer.style.width = '100%';
        quickReplyContainer.appendChild(quickReplyBtn);

        // 新增：表情按钮
        const emojiBtn = document.createElement('button');
        emojiBtn.id = 'emoji-btn';
        emojiBtn.className = 'blacklist-btn';
        emojiBtn.style.background = '#2563eb';
        emojiBtn.textContent = '表情';
        emojiBtn.style.width = '100%';
        emojiBtn.style.marginTop = '1px';
        emojiBtn.onclick = function () {
            if (window.NodeSeekEmoji && typeof window.NodeSeekEmoji.open === 'function') {
                window.NodeSeekEmoji.open();
            } else {
                alert('表情功能未加载');
            }
        };

        // 新增：表情按钮单独一行，放在快捷回复下面
        const emojiBtnContainer = document.createElement('div');
        emojiBtnContainer.style.display = 'flex';
        emojiBtnContainer.style.flexDirection = 'row';
        emojiBtnContainer.style.gap = '10px';
        emojiBtnContainer.style.width = '100%';
        emojiBtnContainer.appendChild(emojiBtn);

        // 新增：高亮统计显示区域
        const statsContainer = document.createElement('div');
        statsContainer.id = 'ns-highlight-stats-container';
        statsContainer.style.width = '100%';
        statsContainer.style.marginTop = '5px';
        statsContainer.style.backgroundColor = '#fff';
        statsContainer.style.borderRadius = '4px';
        statsContainer.style.border = '1px solid #eee';
        statsContainer.style.padding = '4px';
        statsContainer.style.boxSizing = 'border-box';

        // 初始提示（如果 filter.js 还没准备好）
        statsContainer.innerHTML = '<div style="text-align:center;padding:5px;font-size:12px;color:#999;">无高亮记录</div>';


        // 折叠按钮点击事件
        collapseBtn.onclick = function () {
            const isCurrentlyCollapsed = container.classList.contains('nodeseek-plugin-container-collapsed');

            if (isCurrentlyCollapsed) {
                // 展开
                container.classList.remove('nodeseek-plugin-container-collapsed');
                collapseBtn.innerHTML = '&lt;';
                setCollapsedState(false);
            } else {
                // 折叠
                container.classList.add('nodeseek-plugin-container-collapsed');
                collapseBtn.innerHTML = '&gt;';
                setCollapsedState(true);
            }
        };

        // 按照指定顺序添加按钮
        container.appendChild(signInBtn);     // 开启签到
        container.appendChild(userInfoToggleContainer); // 用户信息开关按钮行
        container.appendChild(dataContainer); // 导出和导入按钮
        container.appendChild(logBtn);        // 日志
        container.appendChild(viewBtn);       // 查看黑名单
        container.appendChild(viewFriendsBtn); // 查看好友
        container.appendChild(quickEditBtn);  // 快捷编辑
        container.appendChild(favoriteContainer); // 收藏相关按钮行
        container.appendChild(filterBtnContainer); // 关键词过滤按钮行
        container.appendChild(quickReplyContainer); // 快捷回复按钮行
        container.appendChild(emojiBtnContainer); // 表情按钮行
        container.appendChild(statsContainer); // 高亮统计显示区域

        // 尝试立即渲染（如果统计数据已就绪）
        if (window.NodeSeekFilter && typeof window.NodeSeekFilter.renderHighlightStatsToContainer === 'function') {
            window.NodeSeekFilter.renderHighlightStatsToContainer();
        }


        document.body.appendChild(mainContainer);
    }

    // 新增：黑名单弹窗 - 调用外部模块
    function showBlacklistDialog() {
        if (window.NodeSeekBlacklistViewer && typeof window.NodeSeekBlacklistViewer.showBlacklistDialog === 'function') {
            window.NodeSeekBlacklistViewer.showBlacklistDialog();
        } else {
            console.error('黑名单查看功能未加载');
        }
    }

    // ====== 好友弹窗 ======
    // showFriendsDialog 函数已移动到 Friends.js 模块
    const showFriendsDialog = () => window.NodeSeekFriends?.showFriendsDialog();



    // updateFriendRemark 函数已移动到 Friends.js 模块
    const updateFriendRemark = (username, newRemark) => window.NodeSeekFriends?.updateFriendRemark(username, newRemark);

    // 显示收藏列表对话框
    function showFavoritesDialog() {
        // 检查弹窗是否已存在
        const existingDialog = document.getElementById('favorites-dialog');
        if (existingDialog) {
            // 如果已存在，则关闭弹窗
            existingDialog.remove();
            return;
        }

        // 获取收藏列表并按时间戳降序排序（最新的在最前面）
        let list = getFavorites();
        // 兼容旧数据：为没有category字段的收藏添加"未分类"
        let hasOldData = false;
        list.forEach(item => {
            if (!item.category) {
                item.category = '未分类';
                hasOldData = true;
            }
        });
        if (hasOldData) {
            setFavorites(list);
        }
        list.sort((a, b) => {
            // 如果没有时间戳，则排在后面
            if (!a.timestamp) return 1;
            if (!b.timestamp) return -1;
            // 比较时间戳，降序排列
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        const dialog = document.createElement('div');
        dialog.id = 'favorites-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '60px';
        dialog.style.right = '16px';
        dialog.style.zIndex = 10000;
        dialog.style.background = '#fff';
        dialog.style.border = '1px solid #ccc';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        dialog.style.padding = '18px 20px 12px 20px';
        // 移除固定宽度设置，让媒体查询CSS接管
        // 只在桌面设备上设置最小宽度
        const isMobile = (window.NodeSeekFilter && typeof window.NodeSeekFilter.isMobileDevice === 'function')
            ? window.NodeSeekFilter.isMobileDevice()
            : (window.innerWidth <= 767);
        if (!isMobile) {
            // 桌面端固定宽度，增加30%
            dialog.style.width = '832px';
            dialog.style.minWidth = '832px';
            dialog.style.maxWidth = '832px';
            // 改为“最大高度600px，未满自动伸缩”，并采用纵向flex布局
            dialog.style.maxHeight = '600px';
            dialog.style.display = 'flex';
            dialog.style.flexDirection = 'column';
        } else {
            // 移动端自适应与居中显示
            dialog.style.width = '95%';
            dialog.style.minWidth = 'unset';
            dialog.style.maxWidth = '95%';
            dialog.style.left = '50%';
            dialog.style.top = '50%';
            dialog.style.transform = 'translate(-50%, -50%)';
            dialog.style.right = 'auto';
            dialog.style.maxHeight = '85vh';
            dialog.style.padding = '12px 8px 8px 8px';
            dialog.style.overflowY = 'auto';
            dialog.style.overflowX = 'hidden';
            dialog.style.borderRadius = '12px';
            dialog.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)';
        }
        // 让标题区域不随内容滚动：滚动交由内容容器处理
        dialog.style.overflow = 'visible';

        // 标题和关闭按钮
        const titleBar = document.createElement('div');
        titleBar.style.display = 'flex';
        titleBar.style.justifyContent = 'space-between';
        titleBar.style.alignItems = 'center';
        titleBar.style.marginBottom = '10px';

        const title = document.createElement('div');
        title.textContent = `收藏列表 (${list.length}条)`;
        title.style.fontWeight = 'bold';
        title.style.fontSize = '16px';
        titleBar.appendChild(title);

        // 分类管理按钮
        const categoryManageBtn = document.createElement('button');
        categoryManageBtn.textContent = '分类管理';
        categoryManageBtn.className = 'blacklist-btn';
        categoryManageBtn.style.fontSize = '12px';
        categoryManageBtn.style.padding = '4px 8px';
        // 右上角分类管理按钮左移30px：通过增加右侧外边距实现
        categoryManageBtn.style.marginRight = '38px';
        categoryManageBtn.onclick = function () {
            showCategoryManageDialog();
        };
        titleBar.appendChild(categoryManageBtn);

        dialog.appendChild(titleBar);

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.position = 'absolute';
        closeBtn.style.right = '12px';
        closeBtn.style.top = '8px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '20px';
        closeBtn.className = 'close-btn'; // 添加类名便于CSS选择器选中
        closeBtn.onclick = function () { dialog.remove(); };
        dialog.appendChild(closeBtn);

        // 简繁体与大小写标准化函数（优先使用 NodeSeekFilter.normalizeText）
        const normalizeForSearch = function (text) {
            const s = (text || '').toString();
            if (window.NodeSeekFilter && typeof window.NodeSeekFilter.normalizeText === 'function') {
                return window.NodeSeekFilter.normalizeText(s);
            }
            let t = s.replace(/\s+/g, '').toLowerCase();
            if (window.NodeSeekFilter && typeof window.NodeSeekFilter.convertTraditionalToSimplified === 'function') {
                t = window.NodeSeekFilter.convertTraditionalToSimplified(t);
            }
            return t;
        };

        // 搜索区和分类筛选
        const searchContainer = document.createElement('div');
        searchContainer.style.marginBottom = '10px';
        searchContainer.style.display = 'flex';
        searchContainer.style.gap = '8px';
        searchContainer.style.alignItems = 'center';

        // 分类筛选下拉框
        const categoryFilter = document.createElement('select');
        categoryFilter.id = 'favorites-category-filter';
        categoryFilter.style.padding = isMobile ? '10px 8px' : '6px 8px';
        categoryFilter.style.border = '1px solid #ddd';
        categoryFilter.style.borderRadius = '4px';
        categoryFilter.style.fontSize = isMobile ? '16px' : '13px';
        categoryFilter.style.outline = 'none';
        categoryFilter.style.boxSizing = 'border-box';
        categoryFilter.style.minWidth = isMobile ? '120px' : '100px';
        categoryFilter.style.background = '#fff';
        categoryFilter.style.cursor = 'pointer';

        // 初始化分类选项（移除“未分类”在弹窗下拉中的显示）
        function updateCategoryFilter() {
            const categories = getFavoriteCategories().filter(cat => cat !== '未分类');
            categoryFilter.innerHTML = '<option value="">全部分类</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                categoryFilter.appendChild(option);
            });
        }
        updateCategoryFilter();

        searchContainer.appendChild(categoryFilter);

        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        // 不显示提示占位文字
        searchInput.placeholder = '';
        searchInput.style.flex = '1';
        searchInput.style.padding = isMobile ? '10px 12px' : '6px 8px';
        searchInput.style.border = '1px solid #ddd';
        searchInput.style.borderRadius = '4px';
        searchInput.style.fontSize = isMobile ? '16px' : '13px';
        searchInput.style.outline = 'none';
        searchInput.style.boxSizing = 'border-box';

        searchContainer.appendChild(searchInput);
        dialog.appendChild(searchContainer);

        const contentRoot = document.createElement('div');
        dialog.appendChild(contentRoot);

        // 标题横向展开浮层（单例）
        function ensureTitlePopover() {
            if (dialog._titlePopover) return dialog._titlePopover;
            const pop = document.createElement('div');
            pop.id = 'favorites-title-popover';
            pop.style.position = 'absolute';
            pop.style.left = '20px';
            pop.style.right = '20px';
            pop.style.top = '0px';
            pop.style.zIndex = '10001';
            pop.style.background = 'rgba(255,255,255,0.98)';
            pop.style.border = '1px solid #1890ff';
            pop.style.borderRadius = '6px';
            pop.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
            pop.style.padding = '8px 12px';
            pop.style.display = 'none';
            pop.style.whiteSpace = 'nowrap';
            pop.style.overflowX = 'auto';
            pop.style.maxHeight = '32px';

            const close = document.createElement('span');
            close.textContent = '收起';
            close.style.float = 'right';
            close.style.cursor = 'pointer';
            close.style.color = '#1890ff';
            close.onclick = () => { pop.style.display = 'none'; };
            pop.appendChild(close);

            const content = document.createElement('div');
            content.style.marginRight = '52px';
            content.style.whiteSpace = 'nowrap';
            content.style.overflowX = 'auto';
            content.style.color = '#333';
            pop.appendChild(content);
            pop._content = content;
            dialog.appendChild(pop);

            // 点击弹窗空白处收起
            dialog.addEventListener('click', (e) => {
                if (pop.style.display === 'none') return;
                if (!pop.contains(e.target)) pop.style.display = 'none';
            });
            // Esc 收起
            dialog.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') pop.style.display = 'none';
            });

            dialog._titlePopover = pop;
            return pop;
        }

        // 切换置顶状态
        function togglePin(url) {
            const list = getFavorites();
            const index = list.findIndex(item => item.url === url);
            if (index === -1) return;

            const item = list[index];
            item.pinned = !item.pinned;

            // 从当前位置移除
            list.splice(index, 1);

            if (item.pinned) {
                // 置顶：移动到列表最顶部
                list.unshift(item);
            } else {
                // 取消置顶：移动到第一个非置顶项之后（即非置顶区的顶部）
                const firstUnpinned = list.findIndex(i => !i.pinned);
                if (firstUnpinned === -1) {
                    // 如果全是置顶项（不应该发生，因为刚移除了一个），或者列表为空，放到末尾
                    list.push(item);
                } else {
                    list.splice(firstUnpinned, 0, item);
                }
            }

            setFavorites(list);
            performSearch();
        }

        // 移动非置顶项
        function moveUnpinnedItem(srcUrl, targetUrl) {
            const list = getFavorites();
            const srcIndex = list.findIndex(item => item.url === srcUrl);
            const targetIndex = list.findIndex(item => item.url === targetUrl); // Original target index

            if (srcIndex === -1 || targetIndex === -1) return;
            // 只有非置顶项可以拖拽和接收放置
            if (list[srcIndex].pinned || list[targetIndex].pinned) return;

            const [item] = list.splice(srcIndex, 1);
            // 重新获取目标索引，因为列表已变化
            let newTargetIndex = list.findIndex(item => item.url === targetUrl);
            
            // 如果是向下拖拽（原索引 < 原目标索引），则插入到目标项之后
            if (srcIndex < targetIndex) {
                newTargetIndex++;
            }
            
            list.splice(newTargetIndex, 0, item);
             
            setFavorites(list);
            performSearch();
        }

        // 移动置顶项（仅在置顶区内排序）
        function movePinnedItem(srcUrl, targetUrl) {
            const list = getFavorites();
            const srcIndex = list.findIndex(item => item.url === srcUrl);
            const targetIndex = list.findIndex(item => item.url === targetUrl); // Original target index

            if (srcIndex === -1 || targetIndex === -1) return;
            // 只有置顶项可以拖拽和接收放置
            if (!list[srcIndex].pinned || !list[targetIndex].pinned) return;

            const [item] = list.splice(srcIndex, 1);
            let newTargetIndex = list.findIndex(item => item.url === targetUrl);

            if (srcIndex < targetIndex) {
                newTargetIndex++;
            }

            list.splice(newTargetIndex, 0, item);

            setFavorites(list);
            performSearch();
        }

        function renderTable(data, isDragEnabled = false) {
            contentRoot.innerHTML = '';

            // 注入样式
            if (!document.getElementById('ns-blacklist-custom-style')) {
                const style = document.createElement('style');
                style.id = 'ns-blacklist-custom-style';
                style.textContent = `
                    .ns-row-pinned { background: transparent; }
                    .ns-row-pinned td { color: #555; }
                    .ns-row-dragging { opacity: 0.5; background: #e6f7ff; }
                    .ns-row-draggable { cursor: default; }
                    .ns-row-draggable td { background-color: transparent; }
                `;
                document.head.appendChild(style);
            }

            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            // 固定表格布局，按列宽分配，减少空白
            table.style.tableLayout = 'fixed';
            table.innerHTML = '<thead><tr>'
                + '<th style="text-align:left;font-size:13px;width:42%;">标题</th>'
                + '<th style="text-align:left;font-size:13px;width:19%;padding-left:18px;position:relative;left:102px;">备注</th>'
                + '<th style="text-align:left;font-size:13px;width:18%;padding-left:42px;white-space:nowrap;position:relative;left:65px;">分类</th>'
                + '<th style="text-align:left;font-size:13px;width:11%;padding-left:0px;position:relative;left:-7px;">收藏时间</th>'
                + '<th style="width:100px;text-align:right;">操作</th></tr></thead>'; // 增加操作列宽度以容纳两个按钮

            try {
                const thead = table.tHead;
                if (thead && thead.style) {
                    thead.style.position = 'sticky';
                    thead.style.top = '0';
                    thead.style.background = '#fff';
                    thead.style.zIndex = '1';
                }
            } catch (e) { }

            const tableWrapper = document.createElement('div');
            // 将滚动容器上移到内容根（contentRoot），避免百分比高度在某些环境下不生效
            // 表包裹层保持自动高度，仅用于承载表格与粘性表头
            tableWrapper.style.height = 'auto';
            tableWrapper.style.maxHeight = 'unset';
            tableWrapper.style.overflowY = 'visible';
            tableWrapper.style.overflowX = 'auto';
            tableWrapper.appendChild(table);

            const tbody = document.createElement('tbody');

            if (!data || data.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = '暂无收藏';
                empty.style.textAlign = 'center';
                empty.style.color = '#888';
                empty.style.margin = '18px 0 8px 0';
                contentRoot.appendChild(empty);
                return;
            }

            // 维持自动高度，由内容根容器负责滚动
            tableWrapper.style.height = 'auto';
            tableWrapper.style.maxHeight = 'unset';
            tableWrapper.style.overflowY = 'visible';

            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #eee';
                if (item.pinned) {
                    tr.classList.add('ns-row-pinned');
                }

                // 拖拽支持
                if (isDragEnabled) {
                    tr.draggable = false;
                    tr.classList.add('ns-row-draggable');
                    tr.dataset.url = item.url;

                    tr.addEventListener('dragstart', (e) => {
                        if (!tr.draggable) return;
                        e.dataTransfer.setData('text/plain', item.url);
                        e.dataTransfer.effectAllowed = 'move';
                        tr.classList.add('ns-row-dragging');
                    });

                    tr.addEventListener('dragend', (e) => {
                        tr.classList.remove('ns-row-dragging');
                        tr.draggable = false;
                    });

                    tr.addEventListener('dragover', (e) => {
                        e.preventDefault(); // 允许放置
                        e.dataTransfer.dropEffect = 'move';
                    });

                    tr.addEventListener('drop', (e) => {
                        e.preventDefault();
                        const srcUrl = e.dataTransfer.getData('text/plain');
                        const targetUrl = tr.dataset.url;
                        if (srcUrl && targetUrl && srcUrl !== targetUrl) {
                            const list = getFavorites();
                            const srcItem = list.find(i => i.url === srcUrl);
                            const targetItem = list.find(i => i.url === targetUrl);
                            if (!srcItem || !targetItem) return;
                            if (srcItem.pinned && targetItem.pinned) {
                                movePinnedItem(srcUrl, targetUrl);
                            } else if (!srcItem.pinned && !targetItem.pinned) {
                                moveUnpinnedItem(srcUrl, targetUrl);
                            }
                        }
                    });
                }

                const tdTitle = document.createElement('td');
                const rowPaddingY = '1px';
                tdTitle.style.paddingTop = rowPaddingY;
                tdTitle.style.paddingBottom = rowPaddingY;
                const titleLink = document.createElement('a');
                titleLink.href = item.url;
                titleLink.textContent = item.title;
                titleLink.target = '_blank';
                titleLink.style.color = '#1890ff';
                titleLink.style.fontWeight = 'normal';
                // 保持站点默认字号，不进行修改
                titleLink.style.textDecoration = 'none';
                titleLink.style.display = 'block';
                // 修复标题末尾无法点击的问题（被备注列padding遮挡）
                titleLink.style.position = 'relative';
                titleLink.style.zIndex = '5';
                // 单行省略，保持横向布局不换行
                // 桌面端让标题向右延伸到备注列左移产生的空白区
                if (window.innerWidth > 767) {
                    const extraTitleWidth = getCollapsedState() ? 5 : 0;
                    titleLink.style.width = `calc(100% + ${110 + extraTitleWidth}px)`;
                } else {
                    titleLink.style.width = '100%';
                }
                titleLink.style.overflow = 'hidden';
                titleLink.style.textOverflow = 'ellipsis';
                titleLink.style.whiteSpace = 'nowrap';
                // 保持默认行高与间距，不做压缩；点击标题直接跳转链接
                titleLink.title = item.title;
                tdTitle.appendChild(titleLink);
                tr.appendChild(tdTitle);

                const tdRemark = document.createElement('td');
                const isMobile = window.innerWidth <= 767;
                tdRemark.textContent = item.remark || '';
                tdRemark.style.paddingTop = rowPaddingY;
                tdRemark.style.paddingBottom = rowPaddingY;
                tdRemark.style.color = '#888';
                tdRemark.style.fontSize = '12px';
                tdRemark.style.textAlign = 'left';
                tdRemark.style.cssText += 'text-align:left !important;';
                // 备注列整体右移（不改变列宽）
                tdRemark.style.paddingLeft = '18px';
                tdRemark.style.position = 'relative';
                tdRemark.style.left = '102px';
                tdRemark.style.zIndex = '2';
                if (!isMobile) {
                    // 备注列使用固定布局下的列宽，移除硬编码maxWidth，减少空白
                    tdRemark.style.overflow = 'hidden';
                    tdRemark.style.textOverflow = 'ellipsis';
                    tdRemark.style.whiteSpace = 'nowrap';
                } else {
                    tdRemark.style.wordBreak = 'break-word';
                }
                if (item.remark) {
                    tdRemark.title = item.remark;
                    if (!isMobile) {
                        tdRemark.onmouseover = function () {
                            if (this.offsetWidth < this.scrollWidth) {
                                this.style.position = 'relative';
                            }
                        };
                    }
                } else {
                    tdRemark.title = '点击编辑备注';
                }
                tdRemark.style.cursor = 'pointer';
                tdRemark.onclick = function (e) {
                    e.stopPropagation();
                    if (tdRemark.querySelector('input')) return;
                    const currentText = tdRemark.textContent;
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = currentText;
                    input.style.width = '95%';
                    input.style.padding = '2px';
                    input.style.border = '1px solid #1890ff';
                    input.style.borderRadius = '3px';
                    input.style.fontSize = '12px';
                    if (isMobile) { input.style.padding = '5px'; input.style.fontSize = '14px'; }
                    tdRemark.textContent = '';
                    tdRemark.appendChild(input);
                    input.focus();
                    input.onblur = function () {
                        const newRemark = input.value;
                        input.remove();
                        tdRemark.textContent = newRemark;
                        tdRemark.title = newRemark || '点击编辑备注';
                        let favorites = getFavorites();
                        const index = favorites.findIndex(fav => fav.url === item.url);
                        if (index !== -1) {
                            favorites[index].remark = newRemark;
                            setFavorites(favorites);
                            addLog(`更新收藏备注: ${item.title}`);
                            item.remark = newRemark;
                        }
                    };
                    input.onkeydown = function (e) {
                        if (e.key === 'Enter') input.blur();
                        else if (e.key === 'Escape') { tdRemark.textContent = currentText; tdRemark.title = currentText || '点击编辑备注'; }
                    };
                };
                tr.appendChild(tdRemark);

                // 分类列
                const tdCategory = document.createElement('td');
                // 兼容旧数据，没有category字段的默认为"未分类"；展示时不显示"未分类"
                let category = item.category || '未分类';
                tdCategory.style.paddingTop = rowPaddingY;
                tdCategory.style.paddingBottom = rowPaddingY;
                tdCategory.style.color = '#666';
                tdCategory.style.fontSize = '12px';
                tdCategory.style.textAlign = 'left';
                tdCategory.style.paddingLeft = '42px';
                tdCategory.style.whiteSpace = 'nowrap';
                tdCategory.style.position = 'relative';
                tdCategory.style.left = '65px';
                tdCategory.style.zIndex = '1';
                tdCategory.style.cursor = 'pointer';
                tdCategory.title = '点击修改分类';

                const renderCategoryText = (categoryValue) => {
                    const displayText = (categoryValue === '未分类') ? '全部分类' : categoryValue;
                    tdCategory.textContent = '';
                    const categoryText = document.createElement('span');
                    categoryText.textContent = displayText;
                    tdCategory.appendChild(categoryText);
                };

                renderCategoryText(category);

                tdCategory.onclick = function (e) {
                    e.stopPropagation();
                    if (tdCategory.querySelector('select')) return;
                    const prevOverflow = tdCategory.style.overflow;
                    const prevZIndex = tdCategory.style.zIndex;
                    const prevPointerEvents = tdCategory.style.pointerEvents;
                    const restoreCategoryCellStyle = () => {
                        tdCategory.style.overflow = prevOverflow;
                        tdCategory.style.zIndex = prevZIndex;
                        tdCategory.style.pointerEvents = prevPointerEvents;
                    };

                    tdCategory.style.overflow = 'visible';
                    tdCategory.style.zIndex = '3';
                    tdCategory.style.pointerEvents = 'none';

                    const select = document.createElement('select');
                    select.style.pointerEvents = 'auto';
                    const categories = getFavoriteCategories();
                    select.style.boxSizing = 'border-box';
                    select.style.position = 'relative';
                    select.style.zIndex = '2';
                    if (isMobile) {
                        select.style.width = '100%';
                        select.style.maxWidth = '100%';
                        select.style.minWidth = '100%';
                        select.style.padding = '5px';
                    } else {
                        select.style.width = '4.6em';
                        select.style.maxWidth = '4.6em';
                        select.style.minWidth = '4.6em';
                        select.style.padding = '0px 2px';
                    }
                    const computedCategoryStyle = window.getComputedStyle(tdCategory);
                    select.style.fontSize = computedCategoryStyle.fontSize || tdCategory.style.fontSize || '12px';
                    select.style.fontFamily = computedCategoryStyle.fontFamily;
                    select.style.fontWeight = computedCategoryStyle.fontWeight;
                    select.style.lineHeight = '1.2';
                    select.style.border = '0.5px solid rgba(0,0,0,0.5)';
                    select.style.borderRadius = '3px';
                    select.style.outline = 'none';
                    select.style.boxShadow = 'none';
                    // 隐藏下拉箭头
                    select.style.appearance = 'none';
                    select.style.webkitAppearance = 'none';
                    select.style.mozAppearance = 'none';
                    select.style.textAlign = 'left';
                    categories.forEach(cat => {
                        const option = document.createElement('option');
                        option.value = cat;
                        option.textContent = (cat === '未分类') ? '全部分类' : cat;
                        if (cat === category) option.selected = true;
                        select.appendChild(option);
                    });
                    tdCategory.textContent = '';
                    tdCategory.appendChild(select);
                    select.focus();
                    try {
                        if (typeof select.showPicker === 'function') {
                            select.showPicker();
                        } else {
                            select.click();
                            const mouseEventInit = { bubbles: true, cancelable: true, view: window };
                            select.dispatchEvent(new MouseEvent('mousedown', mouseEventInit));
                            select.dispatchEvent(new MouseEvent('mouseup', mouseEventInit));
                            select.dispatchEvent(new MouseEvent('click', mouseEventInit));
                        }
                    } catch (err) { }
                    select.onblur = function () {
                        const newCategory = select.value;
                        select.remove();
                        restoreCategoryCellStyle();
                        category = newCategory;
                        renderCategoryText(newCategory);
                        let favorites = getFavorites();
                        const index = favorites.findIndex(fav => fav.url === item.url);
                        if (index !== -1) {
                            favorites[index].category = newCategory;
                            setFavorites(favorites);
                            addLog(`更新收藏分类: ${item.title} -> ${newCategory}`);
                            item.category = newCategory;
                        }
                    };
                    select.onkeydown = function (e) {
                        if (e.key === 'Enter') select.blur();
                        else if (e.key === 'Escape') {
                            const oldCategory = category;
                            select.remove();
                            restoreCategoryCellStyle();
                            renderCategoryText(oldCategory);
                        }
                    };
                };

                tr.appendChild(tdCategory);

                const tdTime = document.createElement('td');
                if (item.timestamp) {
                    const date = new Date(item.timestamp);
                    tdTime.textContent = date.getFullYear() + '-' +
                        String(date.getMonth() + 1).padStart(2, '0') + '-' +
                        String(date.getDate()).padStart(2, '0') + ' ' +
                        String(date.getHours()).padStart(2, '0') + ':' +
                        String(date.getMinutes()).padStart(2, '0');
                } else { tdTime.textContent = ''; }
                tdTime.style.paddingTop = rowPaddingY;
                tdTime.style.paddingBottom = rowPaddingY;
                tdTime.style.fontSize = '12px';
                tdTime.style.whiteSpace = 'nowrap';
                tdTime.style.paddingLeft = '0px';
                tdTime.style.position = 'relative';
                tdTime.style.left = '-7px';
                // 提高层级，防止被分类列遮挡导致点击误触分类修改
                tdTime.style.zIndex = '5';
                tr.appendChild(tdTime);

                const tdOp = document.createElement('td');
                tdOp.style.paddingTop = rowPaddingY;
                tdOp.style.paddingBottom = rowPaddingY;
                tdOp.style.textAlign = 'right';
                tdOp.style.whiteSpace = 'nowrap';

                // 置顶/取消置顶按钮
                const pinBtn = document.createElement('button');
                pinBtn.textContent = item.pinned ? '取消' : '置顶';
                pinBtn.className = 'blacklist-btn';
                pinBtn.style.fontSize = '11px';
                pinBtn.style.marginRight = '4px';
                pinBtn.style.padding = '2px 4px';
                // 稍微区分颜色
                pinBtn.style.color = item.pinned ? '#faad14' : '#1890ff';
                pinBtn.style.border = `1px solid ${item.pinned ? '#faad14' : '#1890ff'}`;
                pinBtn.style.background = '#fff';
                
                pinBtn.onclick = function(e) {
                    e.stopPropagation();
                    togglePin(item.url);
                };
                tdOp.appendChild(pinBtn);

                const removeBtn = document.createElement('button');
                removeBtn.textContent = '移除';
                removeBtn.className = 'blacklist-btn red';
                removeBtn.style.fontSize = '11px';
                removeBtn.onclick = function (e) {
                    e.stopPropagation();
                    if (confirm(`确定要移除该收藏？\n${item.title}`)) {
                        if (removeFromFavorites(item.url)) {
                            // 移除后重新搜索以刷新列表
                            performSearch();
                        }
                    }
                };
                tdOp.appendChild(removeBtn);
                tr.appendChild(tdOp);

                // 仅在非“收藏时间/操作”区域按下鼠标时允许拖拽
                if (isDragEnabled) {
                    const enableDrag = () => { tr.draggable = true; };
                    const disableDrag = () => { tr.draggable = false; };

                    const bindEnable = (el) => {
                        if (!el) return;
                        el.addEventListener('mousedown', enableDrag, true);
                        el.addEventListener('pointerdown', enableDrag, true);
                    };
                    const bindDisable = (el) => {
                        if (!el) return;
                        el.addEventListener('mouseenter', disableDrag, true);
                        el.addEventListener('mouseover', disableDrag, true);
                        el.addEventListener('mousedown', disableDrag, true);
                        el.addEventListener('pointerdown', disableDrag, true);
                    };

                    bindEnable(tdTitle);
                    bindEnable(tdRemark);
                    bindEnable(tdCategory);

                    bindDisable(tdTime);
                    bindDisable(tdOp);

                    tr.addEventListener('mouseleave', disableDrag, true);
                }

                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            contentRoot.appendChild(tableWrapper);
        }

        function performSearch() {
            const kw = normalizeForSearch(searchInput.value.trim());
            const selectedCategory = categoryFilter.value;
            let base = getFavorites();
            // 兼容旧数据
            base.forEach(item => {
                if (!item.category) {
                    item.category = '未分类';
                }
                if (typeof item.pinned === 'undefined') {
                    item.pinned = false;
                }
            });
            // 移除默认的时间排序，改用列表本身的顺序（支持拖拽排序）
            // base = base.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

            // 先按分类筛选
            let filtered = base;
            if (selectedCategory) {
                filtered = filtered.filter(item => (item.category || '未分类') === selectedCategory);
            }

            // 再按关键词搜索
            if (kw) {
                filtered = filtered.filter(item =>
                    (item.title && normalizeForSearch(item.title).includes(kw)) ||
                    (item.remark && normalizeForSearch(item.remark).includes(kw))
                );
                title.textContent = `收藏列表 (${filtered.length}条搜索结果)`;
            } else {
                if (selectedCategory) {
                    title.textContent = `收藏列表 (${filtered.length}条 - ${selectedCategory})`;
                } else {
                    title.textContent = `收藏列表 (${filtered.length}条)`;
                }
            }
            
            // 只有在无搜索词且无分类筛选（显示全部）时，才允许拖拽排序
            const isDragEnabled = !kw && !selectedCategory;
            renderTable(filtered, isDragEnabled);
        }

        // 添加实时搜索事件监听
        searchInput.addEventListener('input', performSearch);
        categoryFilter.addEventListener('change', performSearch);

        // 初次渲染（通过 performSearch 触发，确保逻辑一致）
        performSearch();

        document.body.appendChild(dialog);
        // 内容根节点占据剩余空间，未满600px时自然高度；超过时由内容根自身滚动
        try {
            contentRoot.style.flex = '1 1 auto';
            contentRoot.style.minHeight = '0'; // 使flex子项可在父容器内滚动
            contentRoot.style.overflowY = 'auto';
            contentRoot.style.overflowX = 'hidden';
        } catch (e) { }
        if (!isMobile && typeof makeDraggable === 'function') {
            try { makeDraggable(dialog, { width: 30, height: 30 }); } catch (e) { }
        }
    }

    // 显示分类管理弹窗
    function showCategoryManageDialog() {
        const existingDialog = document.getElementById('category-manage-dialog');
        if (existingDialog) {
            existingDialog.remove();
            return;
        }

        const dialog = document.createElement('div');
        dialog.id = 'category-manage-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.zIndex = 10001;
        dialog.style.background = '#fff';
        dialog.style.border = '1px solid #ccc';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        dialog.style.padding = '20px';
        dialog.style.minWidth = '400px';
        dialog.style.maxWidth = '90%';
        dialog.style.maxHeight = '80vh';
        dialog.style.overflowY = 'auto';

        const isMobile = (window.NodeSeekFilter && typeof window.NodeSeekFilter.isMobileDevice === 'function')
            ? window.NodeSeekFilter.isMobileDevice()
            : (window.innerWidth <= 767);
        if (isMobile) {
            dialog.style.width = '90%';
            dialog.style.minWidth = 'unset';
        }

        // 标题
        const titleBar = document.createElement('div');
        titleBar.style.display = 'flex';
        titleBar.style.justifyContent = 'space-between';
        titleBar.style.alignItems = 'center';
        titleBar.style.marginBottom = '15px';

        const title = document.createElement('div');
        title.textContent = '分类管理';
        title.style.fontWeight = 'bold';
        title.style.fontSize = '16px';
        titleBar.appendChild(title);

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.color = '#999';
        closeBtn.onclick = function () { dialog.remove(); };
        titleBar.appendChild(closeBtn);

        dialog.appendChild(titleBar);

        // 分类列表
        const categoryList = document.createElement('div');
        categoryList.id = 'category-list';
        dialog.appendChild(categoryList);

        function renderCategoryList() {
            categoryList.innerHTML = '';
            const categories = getFavoriteCategories();
            const favorites = getFavorites();
            // 在分类管理列表中隐藏默认分类“未分类”
            const displayCategories = categories.filter(cat => cat !== '未分类');

            if (displayCategories.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = '暂无分类';
                empty.style.textAlign = 'center';
                empty.style.color = '#888';
                empty.style.padding = '20px';
                categoryList.appendChild(empty);
                return;
            }

            displayCategories.forEach(category => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.padding = '5px';
                item.style.borderBottom = '1px solid #eee';
                item.style.marginBottom = '2px';

                const leftDiv = document.createElement('div');
                leftDiv.style.flex = '1';

                const nameDiv = document.createElement('div');
                nameDiv.textContent = category;
                nameDiv.style.fontSize = '14px';
                nameDiv.style.fontWeight = '500';
                leftDiv.appendChild(nameDiv);

                // 移除每个分类下的“X条收藏”计数文案

                item.appendChild(leftDiv);

                const btnDiv = document.createElement('div');
                btnDiv.style.display = 'flex';
                btnDiv.style.gap = '5px';

                if (category !== '未分类') {
                    // 重命名按钮
                    const renameBtn = document.createElement('button');
                    renameBtn.textContent = '重命名';
                    renameBtn.className = 'blacklist-btn';
                    renameBtn.style.fontSize = '11px';
                    renameBtn.style.padding = '4px 8px';
                    renameBtn.onclick = function () {
                        const newName = prompt('请输入新分类名称（最多4个字符）：', category);
                        const normalized = normalizeFavoriteCategoryName(newName);
                        if (normalized && normalized !== category) {
                            if (renameFavoriteCategory(category, normalized)) {
                                renderCategoryList();
                                // 刷新收藏列表弹窗
                                const favoritesDialog = document.getElementById('favorites-dialog');
                                if (favoritesDialog) {
                                    favoritesDialog.remove();
                                    showFavoritesDialog();
                                }
                                addLog(`重命名分类: ${category} -> ${normalized}`);
                            } else {
                                alert('重命名失败：分类名称已存在或超过字符限制');
                            }
                        }
                    };
                    btnDiv.appendChild(renameBtn);

                    // 删除按钮
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = '删除';
                    deleteBtn.className = 'blacklist-btn red';
                    deleteBtn.style.fontSize = '11px';
                    deleteBtn.style.padding = '4px 8px';
                    deleteBtn.onclick = function () {
                        if (confirm(`确定要删除分类"${category}"吗？该分类下的收藏将移动到"全部分类"。`)) {
                            if (removeFavoriteCategory(category)) {
                                renderCategoryList();
                                // 刷新收藏列表弹窗
                                const favoritesDialog = document.getElementById('favorites-dialog');
                                if (favoritesDialog) {
                                    favoritesDialog.remove();
                                    showFavoritesDialog();
                                }
                                addLog(`删除分类: ${category}`);
                            } else {
                                alert('删除失败');
                            }
                        }
                    };
                    btnDiv.appendChild(deleteBtn);
                } else {
                    // 原标注“默认分类”移除：不再在未分类项右侧显示说明文字
                }

                item.appendChild(btnDiv);
                categoryList.appendChild(item);
            });
        }

        renderCategoryList();

        // 添加分类区域
        const addCategoryDiv = document.createElement('div');
        addCategoryDiv.style.marginTop = '20px';
        addCategoryDiv.style.paddingTop = '20px';
        addCategoryDiv.style.borderTop = '1px solid #eee';

        const addLabel = document.createElement('div');
        addLabel.textContent = '添加新分类（最多6个）';
        addLabel.style.fontSize = '14px';
        addLabel.style.fontWeight = '500';
        addLabel.style.marginBottom = '10px';
        addCategoryDiv.appendChild(addLabel);

        const addInputDiv = document.createElement('div');
        addInputDiv.style.display = 'flex';
        addInputDiv.style.gap = '8px';

        const addInput = document.createElement('input');
        addInput.type = 'text';
        addInput.placeholder = '请输入分类名称（最多4个字符）';
        addInput.style.flex = '1';
        addInput.style.padding = isMobile ? '10px' : '6px 8px';
        addInput.style.border = '1px solid #ddd';
        addInput.style.borderRadius = '4px';
        addInput.style.fontSize = isMobile ? '16px' : '13px';
        addInput.style.outline = 'none';
        // 添加字符长度提示
        const lengthHint = document.createElement('div');
        lengthHint.style.fontSize = '12px';
        lengthHint.style.color = '#999';
        lengthHint.style.marginLeft = '8px';
        lengthHint.style.whiteSpace = 'nowrap';
        lengthHint.textContent = '0/4';
        addInputDiv.appendChild(addInput);

        // 实时显示字符长度
        let isComposingCategoryName = false;
        addInput.addEventListener('compositionstart', function () { isComposingCategoryName = true; });
        addInput.addEventListener('compositionend', function () {
            isComposingCategoryName = false;
            if (this.value.length > FAVORITE_CATEGORY_NAME_MAX_LEN) {
                this.value = this.value.slice(0, FAVORITE_CATEGORY_NAME_MAX_LEN);
            }
            lengthHint.textContent = `${this.value.length}/${FAVORITE_CATEGORY_NAME_MAX_LEN}`;
            lengthHint.style.color = '#999';
        });
        addInput.addEventListener('input', function () {
            if (isComposingCategoryName) {
                lengthHint.textContent = `${this.value.length}/${FAVORITE_CATEGORY_NAME_MAX_LEN}`;
                return;
            }
            if (this.value.length > FAVORITE_CATEGORY_NAME_MAX_LEN) {
                this.value = this.value.slice(0, FAVORITE_CATEGORY_NAME_MAX_LEN);
            }
            lengthHint.textContent = `${this.value.length}/${FAVORITE_CATEGORY_NAME_MAX_LEN}`;
            lengthHint.style.color = '#999';
        });

        const addBtn = document.createElement('button');
        addBtn.textContent = '添加';
        addBtn.className = 'blacklist-btn';
        addBtn.style.padding = isMobile ? '10px 16px' : '6px 12px';
        addBtn.onclick = function () {
            const categories = getFavoriteCategories();
            const customCount = categories.filter(c => c !== '未分类').length;
            if (customCount >= FAVORITE_CATEGORY_MAX_COUNT) {
                alert(`分类数量已达上限（${FAVORITE_CATEGORY_MAX_COUNT}个）`);
                return;
            }

            const categoryName = normalizeFavoriteCategoryName(addInput.value);
            if (!categoryName) {
                alert('请输入分类名称');
                return;
            }
            if (addFavoriteCategory(categoryName)) {
                addInput.value = '';
                lengthHint.textContent = '0/4';
                lengthHint.style.color = '#999';
                renderCategoryList();
                // 刷新收藏列表弹窗
                const favoritesDialog = document.getElementById('favorites-dialog');
                if (favoritesDialog) {
                    favoritesDialog.remove();
                    showFavoritesDialog();
                }
                addLog(`添加分类: ${categoryName}`);
            } else {
                alert('添加失败：分类名称已存在或超过数量/字符限制');
            }
        };
        addInput.onkeydown = function (e) {
            if (e.key === 'Enter') {
                addBtn.onclick();
            }
        };
        addInputDiv.appendChild(addBtn);

        addCategoryDiv.appendChild(addInputDiv);
        dialog.appendChild(addCategoryDiv);

        document.body.appendChild(dialog);
        // 修正拖拽“乱飘”：在桌面端取消居中 transform，使用像素化 left/top 作为拖拽基准
        if (!isMobile && typeof window.makeDraggable === 'function') {
            try {
                const rect = dialog.getBoundingClientRect();
                dialog.style.transform = 'none';
                dialog.style.right = 'auto';
                dialog.style.left = rect.left + 'px';
                dialog.style.top = Math.max(0, rect.top) + 'px';
                window.makeDraggable(dialog, { width: 30, height: 30 });
            } catch (e) { }
        }
        if (addInput) addInput.focus();
    }

    // 显示添加收藏弹窗
    function showAddFavoriteDialog() {
        const existingDialog = document.getElementById('add-favorite-dialog');
        if (existingDialog) {
            existingDialog.remove();
            return;
        }

        // 检查当前页面是否已收藏
        const isFavorited = isCurrentPageFavorited();
        const currentFavorite = isFavorited ? getFavorites().find(f => f.url === window.location.href) : null;

        const dialog = document.createElement('div');
        dialog.id = 'add-favorite-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.zIndex = 10001;
        dialog.style.background = '#fff';
        dialog.style.border = '1px solid #ccc';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        dialog.style.padding = '20px';
        dialog.style.minWidth = '350px';
        dialog.style.maxWidth = '90%';

        const isMobile = (window.NodeSeekFilter && typeof window.NodeSeekFilter.isMobileDevice === 'function')
            ? window.NodeSeekFilter.isMobileDevice()
            : (window.innerWidth <= 767);
        if (isMobile) {
            dialog.style.width = '90%';
            dialog.style.minWidth = 'unset';
        }

        // 标题
        const titleBar = document.createElement('div');
        titleBar.style.display = 'flex';
        titleBar.style.justifyContent = 'space-between';
        titleBar.style.alignItems = 'center';
        titleBar.style.marginBottom = '15px';

        const title = document.createElement('div');
        title.textContent = isFavorited ? '编辑收藏' : '添加收藏';
        title.style.fontWeight = 'bold';
        title.style.fontSize = '16px';
        titleBar.appendChild(title);

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.color = '#999';
        closeBtn.onclick = function () { dialog.remove(); };
        titleBar.appendChild(closeBtn);

        dialog.appendChild(titleBar);

        // 备注输入
        const remarkLabel = document.createElement('div');
        remarkLabel.textContent = '备注（可选）：';
        remarkLabel.style.fontSize = '14px';
        remarkLabel.style.marginBottom = '8px';
        dialog.appendChild(remarkLabel);

        const remarkInput = document.createElement('input');
        remarkInput.type = 'text';
        remarkInput.placeholder = '请输入备注';
        remarkInput.value = currentFavorite ? (currentFavorite.remark || '') : '';
        remarkInput.style.width = '100%';
        remarkInput.style.padding = isMobile ? '10px' : '6px 8px';
        remarkInput.style.border = '1px solid #ddd';
        remarkInput.style.borderRadius = '4px';
        remarkInput.style.fontSize = isMobile ? '16px' : '13px';
        remarkInput.style.outline = 'none';
        remarkInput.style.boxSizing = 'border-box';
        remarkInput.style.marginBottom = '15px';
        dialog.appendChild(remarkInput);

        // 分类选择
        const categoryLabel = document.createElement('div');
        categoryLabel.textContent = '分类：';
        categoryLabel.style.fontSize = '14px';
        categoryLabel.style.marginBottom = '8px';
        dialog.appendChild(categoryLabel);

        const categorySelect = document.createElement('select');
        categorySelect.style.width = '100%';
        categorySelect.style.padding = isMobile ? '10px 8px' : '6px 8px';
        categorySelect.style.border = '1px solid #ddd';
        categorySelect.style.borderRadius = '4px';
        categorySelect.style.fontSize = isMobile ? '16px' : '13px';
        categorySelect.style.outline = 'none';
        categorySelect.style.boxSizing = 'border-box';
        categorySelect.style.background = '#fff';
        categorySelect.style.cursor = 'pointer';
        categorySelect.style.marginBottom = '20px';

        const categories = getFavoriteCategories();
        const currentCategory = currentFavorite ? (currentFavorite.category || '未分类') : '未分类';
        categories.forEach(cat => {
            const option = document.createElement('option');
            // 值保持真实分类名，展示将“未分类”映射为“全部分类”
            option.value = cat;
            option.textContent = (cat === '未分类') ? '全部分类' : cat;
            if (cat === currentCategory) option.selected = true;
            categorySelect.appendChild(option);
        });

        dialog.appendChild(categorySelect);

        // 按钮区域
        const btnDiv = document.createElement('div');
        btnDiv.style.display = 'flex';
        btnDiv.style.justifyContent = 'flex-end';
        btnDiv.style.gap = '10px';

        // 取消按钮移除：仅保留确定按钮；可用右上角“×”关闭弹窗

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确定';
        confirmBtn.className = 'blacklist-btn';
        confirmBtn.style.background = '#1890ff';
        confirmBtn.style.padding = isMobile ? '10px 16px' : '6px 12px';
        confirmBtn.onclick = function () {
            const remark = remarkInput.value.trim();
            const category = categorySelect.value;
            addToFavorites(remark, category);
            dialog.remove();
        };
        btnDiv.appendChild(confirmBtn);

        dialog.appendChild(btnDiv);

        document.body.appendChild(dialog);
        remarkInput.focus();

        // 回车键确认
        remarkInput.onkeydown = function (e) {
            if (e.key === 'Enter') {
                confirmBtn.onclick();
            }
        };
        categorySelect.onkeydown = function (e) {
            if (e.key === 'Enter') {
                confirmBtn.onclick();
            }
        };
    }

    // 显示收藏或取消收藏按钮
    function addFavoriteButton() {
        // 只在帖子页面添加收藏按钮
        if (!window.location.pathname.includes('/topic/') &&
            !window.location.pathname.includes('/article/')) {
            return;
        }

        // 如果已经存在，则不重复添加
        if (document.getElementById('favorite-btn')) {
            return;
        }

        // 尝试找到页面中合适的位置添加按钮
        // 通常在帖子标题旁边或帖子操作区域
        const headerArea = document.querySelector('.topic-header .topic-title') ||
            document.querySelector('.thread-header h1') ||
            document.querySelector('.article-header h1') ||
            document.querySelector('.topic-detail-header h1');

        if (!headerArea) return;

        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'inline-block';
        buttonContainer.style.marginLeft = '8px';
        buttonContainer.style.verticalAlign = 'middle';

        // 创建收藏按钮
        const favoriteBtn = document.createElement('button');
        favoriteBtn.id = 'favorite-btn';
        favoriteBtn.className = 'favorite-btn';

        // 检查当前页面是否已收藏
        const isFavorited = isCurrentPageFavorited();
        if (isFavorited) {
            favoriteBtn.textContent = '取消收藏';
            favoriteBtn.classList.add('favorited');
        } else {
            favoriteBtn.textContent = '收藏';
        }

        // 添加点击事件
        favoriteBtn.onclick = function () {
            if (isFavorited) {
                // 取消收藏
                if (confirm('确定要取消收藏吗？')) {
                    if (removeFromFavorites(window.location.href)) {
                        favoriteBtn.textContent = '收藏';
                        favoriteBtn.classList.remove('favorited');
                    }
                }
            } else {
                // 添加收藏 - 使用自定义弹窗选择分类
                showAddFavoriteDialog();
                // 延迟更新按钮状态，等待弹窗关闭
                setTimeout(function () {
                    if (isCurrentPageFavorited()) {
                        favoriteBtn.textContent = '取消收藏';
                        favoriteBtn.classList.add('favorited');
                    }
                }, 100);
            }
        };

        buttonContainer.appendChild(favoriteBtn);
        headerArea.appendChild(buttonContainer);
    }

    // 防止重复记录的变量
    let lastRecordedUrl = '';
    let lastRecordedTime = 0;

    // 自动记录浏览历史
    function recordBrowseHistory() {
        // 防止短时间内重复记录同一页面
        const currentUrl = window.location.href;
        const currentTime = Date.now();

        // 标准化URL进行比较
        const normalizeUrl = (urlStr) => {
            try {
                const urlObj = new URL(urlStr);
                let pathname = urlObj.pathname;

                // 处理NodeSeek帖子分页格式：/post-数字-页码 -> /post-数字-1
                const postMatch = pathname.match(/^\/post-(\d+)-\d+$/);
                if (postMatch) {
                    pathname = `/post-${postMatch[1]}-1`; // 统一为第一页
                }

                return urlObj.origin + pathname + urlObj.search;
            } catch (e) {
                // 如果URL解析失败，简单处理
                let cleanUrl = urlStr.split('#')[0];
                // 处理帖子分页格式
                const postMatch = cleanUrl.match(/\/post-(\d+)-\d+/);
                if (postMatch) {
                    cleanUrl = cleanUrl.replace(/\/post-(\d+)-\d+/, `/post-${postMatch[1]}-1`);
                }
                return cleanUrl;
            }
        };

        const normalizedCurrentUrl = normalizeUrl(currentUrl);
        const normalizedLastUrl = normalizeUrl(lastRecordedUrl);

        if (normalizedLastUrl === normalizedCurrentUrl && (currentTime - lastRecordedTime) < 5000) {
            return; // 5秒内不重复记录同一页面
        }

        // 只记录帖子和文章页面
        if (window.location.pathname.includes('/topic/') ||
            window.location.pathname.includes('/article/') ||
            window.location.pathname.includes('/space/') ||
            window.location.pathname.match(/\/post-\d+/)) { // 添加对 /post-数字 格式的支持

            // 获取页面标题，去除网站名称后缀
            let title = document.title.replace(' - NodeSeek', '').trim();

            // 如果标题为空，尝试从其他元素获取
            if (!title || title === 'NodeSeek') {
                const titleElement = document.querySelector('.topic-title, .article-title, h1, .thread-title, .post-title, .content-title');
                if (titleElement) {
                    title = titleElement.textContent.trim();
                }
            }

            // 特别处理post-数字格式的页面，尝试从页面中找到帖子标题
            if ((!title || title === 'NodeSeek') && window.location.pathname.match(/\/post-\d+/)) {
                // 尝试多种可能的标题选择器
                const titleSelectors = [
                    'h1', 'h2', 'h3',
                    '.subject', '.title', '.topic-title', '.thread-title',
                    '[class*="title"]', '[class*="subject"]',
                    '.nsk-content-title'
                ];

                for (const selector of titleSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent.trim() &&
                        element.textContent.trim().length > 3 &&
                        !element.textContent.includes('NodeSeek')) {
                        title = element.textContent.trim();
                        break;
                    }
                }
            }

            // 如果仍然没有标题，使用URL路径作为标题
            if (!title || title === 'NodeSeek') {
                title = window.location.pathname.split('/')[1] + ' - ' + window.location.pathname.split('/')[2];
            }

            // 记录浏览历史
            const url = window.location.href;
            addToBrowseHistory(title, url);

            // 更新防重复记录变量
            lastRecordedUrl = url;
            lastRecordedTime = Date.now();

            // 不再在控制台输出浏览记录
        }
    }

    // 多次尝试记录浏览历史，以适应不同的页面加载情况
    setTimeout(recordBrowseHistory, 500);  // 第一次尝试
    setTimeout(recordBrowseHistory, 1500); // 第二次尝试
    setTimeout(recordBrowseHistory, 3000); // 第三次尝试，确保页面完全加载

    // 监听页面完全加载事件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', recordBrowseHistory);
    }

    // 监听窗口加载完成事件
    window.addEventListener('load', recordBrowseHistory);

    // 首次加载
    updateAll();
    addExportImportButtons();

    // 清理重复的浏览历史记录
    setTimeout(() => {
        const cleaned = cleanupDuplicateHistory();
        if (cleaned) {
            addLog('已自动清理重复的浏览历史记录');
        }
    }, 1000);

    // 新增：初始化关键词过滤 observer
    if (window.NodeSeekFilter && typeof window.NodeSeekFilter.initFilterObserver === 'function') {
        window.NodeSeekFilter.initFilterObserver();
    }

    // 新增：实时更新黑名单弹窗中的内容
    function updateBlacklistDialogWithNewUser(username, remark, userLinkElement, buttonElement) {
        const blacklistDialog = document.getElementById('blacklist-dialog');
        if (!blacklistDialog) return;

        // 移除可能存在的空提示
        const emptyDiv = blacklistDialog.querySelector('div:last-child');
        if (emptyDiv && emptyDiv.textContent === '暂无黑名单用户') {
            emptyDiv.remove();
        }

        // 获取最新的黑名单信息
        const list = getBlacklist();
        const info = list[username];
        if (!info) return;

        // 查找或创建表格
        let table = blacklistDialog.querySelector('table');
        if (!table) {
            // 如果没有表格，创建一个
            table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.verticalAlign = 'bottom';
            table.innerHTML = '<thead><tr><th style="text-align:left;font-size:13px;vertical-align:bottom;">用户名</th><th style="text-align:left;font-size:13px;padding-left:5px;min-width:180px;vertical-align:bottom;">备注</th><th style="text-align:left;font-size:13px;padding-left:8px;vertical-align:bottom;">拉黑时间</th><th style="text-align:left;font-size:13px;padding-left:5px;vertical-align:bottom;">页面</th><th style="vertical-align:bottom;"></th></tr></thead>';

            const tbody = document.createElement('tbody');
            table.appendChild(tbody);
            blacklistDialog.appendChild(table);
        }

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        // 创建新行
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #eee';
        tr.style.opacity = '0'; // 初始透明
        tr.style.transition = 'opacity 0.3s ease-in';

        // 用户名列
        const tdUser = document.createElement('td');
        tdUser.style.verticalAlign = 'bottom';

        const nameLink = document.createElement('a');
        nameLink.textContent = username;
        nameLink.style.color = '#d00';
        nameLink.style.fontWeight = 'bold';
        nameLink.style.fontSize = '13px';
        nameLink.style.whiteSpace = 'nowrap';
        nameLink.title = '点击访问主页';
        nameLink.target = '_blank';

        // 设置用户主页链接
        if (info.userId) {
            nameLink.href = 'https://www.nodeseek.com/space/' + info.userId + '#/general';
        } else if (info.url) {
            let targetUrl = info.url;
            if (info.postId && !targetUrl.includes('#post-') && !targetUrl.includes('#' + info.postId.replace('post-', ''))) {
                targetUrl = targetUrl.split('#')[0];
                targetUrl += '#' + info.postId.replace('post-', '');
            }
            nameLink.href = targetUrl;
        }

        tdUser.appendChild(nameLink);
        tr.appendChild(tdUser);

        // 备注列
        const tdRemark = document.createElement('td');
        const isMobile = window.innerWidth <= 767;

        if (!isMobile) {
            tdRemark.textContent = info.remark || '　';
            tdRemark.style.fontSize = '12px';
            tdRemark.style.minWidth = '180px';
            tdRemark.style.maxWidth = '180px';
            tdRemark.style.overflow = 'hidden';
            tdRemark.style.textOverflow = 'ellipsis';
            tdRemark.style.whiteSpace = 'nowrap';
            tdRemark.style.display = 'inline-block';
            tdRemark.style.verticalAlign = 'bottom';
            tdRemark.style.paddingTop = '2px';
        } else {
            tdRemark.textContent = info.remark || '　';
            tdRemark.style.verticalAlign = 'bottom';
        }

        tdRemark.style.textAlign = 'left';
        tdRemark.style.cssText += 'text-align:left !important;';
        tdRemark.style.cursor = 'pointer';
        tdRemark.style.paddingLeft = '5px';
        tdRemark.title = info.remark ? info.remark : '点击编辑备注';

        // 添加备注编辑功能（复用现有逻辑）
        tdRemark.onclick = function (e) {
            e.stopPropagation();
            e.preventDefault();

            if (document.getElementById('blacklist-edit-overlay')) return;

            const currentText = (info.remark || '');
            const cellRect = tdRemark.getBoundingClientRect();

            // 创建编辑器（复用blacklist.js中的逻辑）
            const overlay = document.createElement('div');
            overlay.id = 'blacklist-edit-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'transparent';
            overlay.style.zIndex = '10001';

            const editor = document.createElement('div');
            editor.style.position = 'fixed';
            editor.style.top = cellRect.top + 'px';
            editor.style.left = cellRect.left + 'px';
            editor.style.width = cellRect.width + 'px';
            editor.style.height = cellRect.height + 'px';
            editor.style.zIndex = '10002';
            editor.style.backgroundColor = '#fff';
            editor.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
            editor.style.padding = '0';
            editor.style.boxSizing = 'border-box';
            editor.style.borderRadius = '3px';

            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentText;
            input.style.width = '100%';
            input.style.height = '100%';
            input.style.border = '1px solid #d00';
            input.style.borderRadius = '3px';
            input.style.padding = '0 5px';
            input.style.boxSizing = 'border-box';
            input.style.fontSize = '12px';
            input.style.outline = 'none';

            editor.appendChild(input);
            overlay.appendChild(editor);
            document.body.appendChild(overlay);

            input.focus();
            const textLength = input.value.length;
            input.setSelectionRange(textLength, textLength);

            const closeEditor = function (save) {
                const newText = save ? input.value : currentText;
                document.body.removeChild(overlay);

                if (save && newText !== currentText) {
                    tdRemark.textContent = newText || '　';
                    tdRemark.title = newText || '点击编辑备注';

                    // 调用blacklist.js中的更新函数
                    if (window.NodeSeekBlacklistViewer && window.NodeSeekBlacklistViewer.updateBlacklistRemark) {
                        window.NodeSeekBlacklistViewer.updateBlacklistRemark(username, newText);
                    }

                    info.remark = newText;
                }
            };

            overlay.addEventListener('mousedown', function (e) {
                if (e.target === overlay) {
                    closeEditor(true);
                }
            });

            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    closeEditor(true);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeEditor(false);
                }
            });
        };

        tr.appendChild(tdRemark);

        // 拉黑时间列
        const tdTime = document.createElement('td');
        tdTime.style.verticalAlign = 'bottom';
        if (info.timestamp) {
            const date = new Date(info.timestamp);
            tdTime.textContent = date.getFullYear() + '-' +
                String(date.getMonth() + 1).padStart(2, '0') + '-' +
                String(date.getDate()).padStart(2, '0') + ' ' +
                String(date.getHours()).padStart(2, '0') + ':' +
                String(date.getMinutes()).padStart(2, '0') + ':' +
                String(date.getSeconds()).padStart(2, '0');
        } else {
            tdTime.textContent = '';
        }
        tdTime.style.fontSize = '11px';
        tdTime.style.whiteSpace = 'nowrap';
        tdTime.style.textAlign = 'left';
        tdTime.style.paddingLeft = '8px';
        tr.appendChild(tdTime);

        // 拉黑页面列
        const tdUrl = document.createElement('td');
        tdUrl.style.verticalAlign = 'bottom';
        tdUrl.style.paddingLeft = '5px';
        if (info.url) {
            const a = document.createElement('a');
            let targetUrl = info.url;

            if (info.postId && !targetUrl.includes('#post-') && !targetUrl.includes('#' + info.postId.replace('post-', ''))) {
                targetUrl = targetUrl.split('#')[0];
                targetUrl += '#' + info.postId.replace('post-', '');
            }

            a.href = targetUrl;
            a.textContent = info.postId ? `楼层#${info.postId.replace('post-', '')}` : '页面';
            a.target = '_blank';
            a.style.fontSize = '11px';
            a.style.color = '#06c';
            tdUrl.appendChild(a);
        }
        tr.appendChild(tdUrl);

        // 操作列
        const tdOp = document.createElement('td');
        tdOp.style.verticalAlign = 'bottom';
        tdOp.style.paddingLeft = '3px';
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '移除';
        removeBtn.className = 'blacklist-btn red';
        removeBtn.style.fontSize = '11px';
        removeBtn.onclick = function () {
            if (confirm('确定要移除该用户？')) {
                removeFromBlacklist(username);

                tr.style.opacity = '0.5';
                tr.style.transition = 'opacity 0.2s';

                setTimeout(function () {
                    tr.remove();

                    if (tbody && tbody.children.length === 0) {
                        const empty = document.createElement('div');
                        empty.textContent = '暂无黑名单用户';
                        empty.style.textAlign = 'center';
                        empty.style.color = '#888';
                        empty.style.margin = '18px 0 8px 0';
                        table.after(empty);
                    }

                    // 更新页面上的用户显示
                    document.querySelectorAll('a.author-name').forEach(function (link) {
                        if (link.textContent.trim() === username) {
                            link.classList.remove('blacklisted-user');
                            const oldRemark = link.parentNode.querySelector('.blacklist-remark');
                            if (oldRemark) oldRemark.remove();
                            const oldUrl = link.parentNode.querySelector('.blacklist-url');
                            if (oldUrl) oldUrl.remove();
                            const metaInfo = link.closest('.nsk-content-meta-info');
                            if (metaInfo) {
                                const oldTime = metaInfo.querySelector('.blacklist-time');
                                if (oldTime) oldTime.remove();
                            }
                        }
                    });
                }, 200);
            }
        };
        tdOp.appendChild(removeBtn);
        tr.appendChild(tdOp);

        // 将新行添加到表格顶部（最新的在最前面）
        if (tbody.firstChild) {
            tbody.insertBefore(tr, tbody.firstChild);
        } else {
            tbody.appendChild(tr);
        }

        // 添加淡入动画效果
        setTimeout(function () {
            tr.style.opacity = '1';
        }, 50);
    }

    // 新增：切换用户信息显示状态
    function toggleUserInfoDisplay() {
        const currentState = getUserInfoDisplayState();
        const newState = !currentState;
        setUserInfoDisplayState(newState);

        // 更新按钮文本
        const toggleBtn = document.getElementById('user-info-toggle-btn');
        if (toggleBtn) {
            toggleBtn.textContent = newState ? '关闭信息' : '开启信息';
            toggleBtn.style.background = newState ? '#f44336' : '#4CAF50';
        }

        if (newState) {
            // 开启时重新处理用户信息显示
            processUserAvatars();
            addLog('用户信息显示：开启');
        } else {
            // 关闭时移除所有用户信息显示
            const userInfoElements = document.querySelectorAll('.user-info-display');
            userInfoElements.forEach(el => el.remove());
            addLog('用户信息显示：关闭');
        }
    }

    // ========== 快捷回复功能UI ==========

    // 为快捷回复模块暴露日志函数
    window.addQuickReplyLog = addLog;

    function findTalkTitleElementFast() {
        const selectors = [
            'h1', 'h2', 'h3', 'h4',
            '.card-header', '.panel-heading', '.message-header', '.talk-header', '.chat-header',
            '.card-title', '.panel-title', '.talk-title', '.chat-title'
        ];
        const nodes = [];
        selectors.forEach(sel => {
            try {
                document.querySelectorAll(sel).forEach(el => nodes.push(el));
            } catch (e) { }
        });
        for (const el of nodes) {
            const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
            if (!t) continue;
            if (/^与.{1,32}的对话$/.test(t)) return el;
        }
        return null;
    }

    function formatIsoToLocalText(timestamp) {
        try {
            if (!timestamp) return '';
            const date = new Date(timestamp);
            if (Number.isNaN(date.getTime())) return String(timestamp);
            return date.getFullYear() + '-' +
                String(date.getMonth() + 1).padStart(2, '0') + '-' +
                String(date.getDate()).padStart(2, '0') + ' ' +
                String(date.getHours()).padStart(2, '0') + ':' +
                String(date.getMinutes()).padStart(2, '0') + ':' +
                String(date.getSeconds()).padStart(2, '0');
        } catch (e) {
            return '';
        }
    }

    function buildBlacklistTargetUrl(info) {
        try {
            if (!info || !info.url) return '';
            let targetUrl = String(info.url);
            if (info.postId && !targetUrl.includes('#post-') && !targetUrl.includes('#' + String(info.postId).replace('post-', ''))) {
                targetUrl = targetUrl.split('#')[0];
                targetUrl += '#' + String(info.postId).replace('post-', '');
            }
            return targetUrl;
        } catch (e) {
            return '';
        }
    }

    function getCurrentTalkBlacklistedMatch() {
        try {
            const to = getHashQueryParam('to');
            if (to) {
                const byId = getBlacklistedEntryByUserId(to);
                if (byId) return byId;
            }

            const titleEl = findTalkTitleElementFast();
            if (!titleEl) return null;
            const titleText = (titleEl.textContent || '').trim().replace(/\s+/g, ' ');
            const nameMatch = titleText.match(/^与(.+)的对话$/);
            const talkUsername = nameMatch ? nameMatch[1].trim() : '';
            if (!talkUsername) return null;

            if (!isBlacklisted(talkUsername)) return null;
            const list = getBlacklist();
            return { username: talkUsername, info: list[talkUsername] };
        } catch (e) {
            return null;
        }
    }

    function getCurrentTalkFriendMatch() {
        try {
            const friends = getFriends();
            const to = getHashQueryParam('to');

            if (to) {
                const match = friends.find(f => {
                    if (!f.pmUrl) return false;
                    const matchId = f.pmUrl.match(/[?&]to=(\d+)/);
                    return matchId && matchId[1] === to;
                });
                if (match) return match;
            }

            const titleEl = findTalkTitleElementFast();
            if (!titleEl) return null;
            const titleText = (titleEl.textContent || '').trim().replace(/\s+/g, ' ');
            const nameMatch = titleText.match(/^与(.+)的对话$/);
            const talkUsername = nameMatch ? nameMatch[1].trim() : '';
            if (!talkUsername) return null;

            return friends.find(f => f.username === talkUsername);
        } catch (e) {
            return null;
        }
    }

    function ensureBlacklistNavEntryAndMeta() {
        const appSwitch = document.querySelector('.app-switch');
        if (!appSwitch) return;

        const links = appSwitch.querySelectorAll('a');
        let pmLink = null;
        for (const link of links) {
            if ((link.textContent || '').includes('私信')) {
                pmLink = link;
                break;
            }
        }
        if (!pmLink) return;

        try {
            appSwitch.querySelectorAll('.ns-blacklist-entry').forEach(el => el.remove());
        } catch (e) { }

        let meta = appSwitch.querySelector('.ns-blacklist-entry-meta');
        const isMobile = window.innerWidth <= 767;
        if (!meta) {
            meta = document.createElement('span');
            meta.className = 'ns-blacklist-entry-meta';
            meta.style.marginLeft = isMobile ? '10px' : '30px';
            meta.style.fontSize = isMobile ? '12px' : '14px';
            meta.style.color = '#fc5154ff';
            meta.style.whiteSpace = isMobile ? 'normal' : 'nowrap';
            meta.style.verticalAlign = 'middle';
            meta.style.display = 'inline-flex';
            meta.style.alignItems = 'center';
            meta.style.flexWrap = isMobile ? 'wrap' : 'nowrap';
            meta.style.columnGap = isMobile ? '6px' : '';
            meta.style.rowGap = isMobile ? '2px' : '';
            meta.style.lineHeight = isMobile ? '12px' : '14px';
            meta.style.display = 'none';
        }
        meta.style.fontSize = isMobile ? '12px' : '14px';
        meta.style.marginLeft = isMobile ? '10px' : '30px';
        meta.style.whiteSpace = isMobile ? 'normal' : 'nowrap';
        meta.style.flexWrap = isMobile ? 'wrap' : 'nowrap';
        meta.style.columnGap = isMobile ? '6px' : '';
        meta.style.rowGap = isMobile ? '2px' : '';
        meta.style.lineHeight = isMobile ? '12px' : '14px';

        if (pmLink.nextSibling) {
            if (meta.parentNode !== pmLink.parentNode || pmLink.nextSibling !== meta) {
                pmLink.parentNode.insertBefore(meta, pmLink.nextSibling);
            }
        } else {
            if (meta.parentNode !== pmLink.parentNode || meta !== pmLink.parentNode.lastChild) {
                pmLink.parentNode.appendChild(meta);
            }
        }

        const routeKey = (window.location.pathname || '') + '|' + (window.location.hash || '');
        const now = Date.now();
        const lastRouteKey = ensureBlacklistNavEntryAndMeta._lastRouteKey || '';
        const lastCheckAt = ensureBlacklistNavEntryAndMeta._lastCheckAt || 0;
        const minInterval = (routeKey === lastRouteKey) ? 1500 : 0;
        if (minInterval && (now - lastCheckAt) < minInterval) return;
        ensureBlacklistNavEntryAndMeta._lastCheckAt = now;

        const matched = getCurrentTalkBlacklistedMatch();
        const friendMatched = getCurrentTalkFriendMatch();

        const key = [
            matched ? 'BL' : 'NB',
            matched?.username || '',
            matched?.info?.timestamp || '',
            matched?.info?.remark || '',
            matched?.info?.url || '',
            matched?.info?.postId || '',
            friendMatched ? 'FR' : 'NF',
            friendMatched?.username || '',
            friendMatched?.timestamp || '',
            friendMatched?.remark || ''
        ].join('|');

        if (ensureBlacklistNavEntryAndMeta._lastKey === key) return;
        ensureBlacklistNavEntryAndMeta._lastKey = key;
        ensureBlacklistNavEntryAndMeta._lastRouteKey = routeKey;

        if ((!matched || !matched.info) && !friendMatched) {
            meta.textContent = '';
            meta.style.display = 'none';
            return;
        }

        while (meta.firstChild) meta.removeChild(meta.firstChild);
        
        // 优先显示黑名单
        if (matched && matched.info) {
            meta.style.color = '#fc5154ff';
            
            const timeText = formatIsoToLocalText(matched.info.timestamp);
            const remark = matched.info.remark ? String(matched.info.remark) : '';
            const url = buildBlacklistTargetUrl(matched.info);
            const pageText = matched.info.postId ? `楼层#${String(matched.info.postId).replace('post-', '')}` : '页面';

            const timeSpan = document.createElement('span');
            timeSpan.textContent = `拉黑时间：${timeText || '未知'}`;
            timeSpan.style.lineHeight = isMobile ? '12px' : '14px';
            meta.appendChild(timeSpan);

            const remarkSpan = document.createElement('span');
            remarkSpan.style.marginLeft = '8px';
            remarkSpan.style.maxWidth = 'none';
            remarkSpan.style.display = 'inline';
            remarkSpan.style.overflow = 'visible';
            remarkSpan.style.textOverflow = 'clip';
            remarkSpan.style.whiteSpace = 'nowrap';
            remarkSpan.style.flex = '0 0 auto';
            remarkSpan.style.lineHeight = isMobile ? '12px' : '14px';

            const rawRemarkText = remark || '无';
            const remarkChars = Array.from(String(rawRemarkText));
            const shownRemark = remarkChars.length > 20 ? remarkChars.slice(0, 20).join('') + '…' : String(rawRemarkText);
            remarkSpan.textContent = `备注：${shownRemark}`;
            remarkSpan.title = rawRemarkText;
            meta.appendChild(remarkSpan);

            if (url) {
                const pageLink = document.createElement('a');
                pageLink.href = url;
                pageLink.target = '_blank';
                pageLink.rel = 'noopener noreferrer';
                pageLink.style.marginLeft = '8px';
                pageLink.style.color = 'rgba(74, 162, 250, 1)';
                pageLink.style.textDecoration = 'none';
                pageLink.style.whiteSpace = 'nowrap';
                pageLink.style.lineHeight = isMobile ? '12px' : '14px';
                pageLink.textContent = `拉黑页面：${pageText}`;
                pageLink.onmouseenter = function () { pageLink.style.textDecoration = 'underline'; };
                pageLink.onmouseleave = function () { pageLink.style.textDecoration = 'none'; };
                meta.appendChild(pageLink);
            } else {
                const none = document.createElement('span');
                none.style.marginLeft = '8px';
                none.style.color = '#06c';
                none.style.lineHeight = isMobile ? '12px' : '14px';
                none.textContent = `拉黑页面：${pageText}`;
                meta.appendChild(none);
            }
        } else if (friendMatched) {
            meta.style.color = '#2ea44f';
            
            const timeText = formatIsoToLocalText(friendMatched.timestamp);
            const remark = friendMatched.remark ? String(friendMatched.remark) : '';
            
            const timeSpan = document.createElement('span');
            timeSpan.textContent = `添加时间：${timeText || '未知'}`;
            timeSpan.style.lineHeight = isMobile ? '12px' : '14px';
            meta.appendChild(timeSpan);

            const remarkSpan = document.createElement('span');
            remarkSpan.style.marginLeft = '8px';
            remarkSpan.style.maxWidth = 'none';
            remarkSpan.style.display = 'inline';
            remarkSpan.style.overflow = 'visible';
            remarkSpan.style.textOverflow = 'clip';
            remarkSpan.style.whiteSpace = 'nowrap';
            remarkSpan.style.flex = '0 0 auto';
            remarkSpan.style.lineHeight = isMobile ? '12px' : '14px';

            const rawRemarkText = remark || '无';
            const remarkChars = Array.from(String(rawRemarkText));
            const shownRemark = remarkChars.length > 20 ? remarkChars.slice(0, 20).join('') + '…' : String(rawRemarkText);
            remarkSpan.textContent = `备注：${shownRemark}`;
            remarkSpan.title = rawRemarkText;
            meta.appendChild(remarkSpan);
        }

        meta.style.display = 'inline-flex';
    }

    let nsBlacklistNavTimer = null;
    function scheduleEnsureBlacklistNav() {
        if (nsBlacklistNavTimer) return;
        nsBlacklistNavTimer = setTimeout(() => {
            nsBlacklistNavTimer = null;
            ensureBlacklistNavEntryAndMeta();
        }, 200);
    }

    const blacklistEntryObserver = new MutationObserver(() => {
        scheduleEnsureBlacklistNav();
    });

    try {
        blacklistEntryObserver.observe(document.body, { childList: true, subtree: true });
    } catch (e) { }

    window.addEventListener('hashchange', scheduleEnsureBlacklistNav);
    setTimeout(scheduleEnsureBlacklistNav, 300);
    setTimeout(scheduleEnsureBlacklistNav, 1500);

})();
