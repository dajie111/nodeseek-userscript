// ==UserScript==
// @name         NS综合插件
// @namespace    http://tampermonkey.net/
// @version      2026.04.09
// @description  NodeSeek 论坛黑名单，拉黑后红色高亮并可备注，增加域名检测控制按钮显隐，支持折叠功能，显示用户详细信息，快捷回复功能
// @author       YourName
// @match        https://www.nodeseek.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @connect      hb.396663.xyz
// @connect      api.nodeimage.com
// @connect      www.nodeimage.com
// @run-at       document-end
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/filter.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/statistics.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/blacklist.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/collect.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/Friends.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/Clockin.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/focus.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/quickReply.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/emojis.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/login.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/vps.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/History.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/notes.js
// @require      https://raw.githubusercontent.com/dajie111/nodeseek-userscript/refs/heads/main/nodeImage.js
// ==/UserScript==

(function () {
    'use strict';

    // --------------------------------------------------------
    // 新增功能：跳过跳转提示页面
    // 检查开关状态 (默认为 false)
    const skipJumpVal = localStorage.getItem('nodeseek_skip_jump_page');
    const isSkipJumpEnabled = skipJumpVal === null ? false : skipJumpVal === 'true';
    if (isSkipJumpEnabled) {
        if (location.pathname === '/jump' && location.search.includes('to=')) {
            const params = new URLSearchParams(location.search);
            if (params.has('to')) {
                const target = params.get('to');
                if (target) {
                    try {
                        const targetUrlStr = decodeURIComponent(target);
                        const targetUrl = new URL(targetUrlStr);
                        const targetDomain = targetUrl.hostname;

                        const modeRaw = localStorage.getItem('nodeseek_skip_jump_mode');
                        const mode = (modeRaw === 'whitelist') ? 'whitelist' : 'all';
                        const listSaved = localStorage.getItem('nodeseek_skip_jump_list');
                        const list = listSaved ? JSON.parse(listSaved) : [];

                        let shouldSkip = true;
                        if (mode === 'whitelist') {
                            // 如果是白名单模式，且名单为空，则不跳过（即显示跳转提醒）
                            if (list.length === 0) {
                                shouldSkip = false;
                            } else {
                                // 仅匹配域名本身或其子域名
                                shouldSkip = list.some(domain => targetDomain === domain || targetDomain.endsWith('.' + domain));
                            }
                        }

                        if (shouldSkip) {
                            // 立即跳转
                            window.location.replace(targetUrlStr);
                            return; // 停止执行后续脚本
                        }
                    } catch (e) {
                        // URL 解析失败，按原逻辑直接跳转
                        window.location.replace(decodeURIComponent(target));
                        return;
                    }
                }
            }
        }
    }
    // --------------------------------------------------------

    // 黑名单数据结构：{ username: {remark: 'xxx'} }
    const STORAGE_KEY = 'nodeseek_blacklist';


    // 新增：折叠状态的存储键
    const COLLAPSED_STATE_KEY = 'nodeseek_buttons_collapsed';
    const PANEL_THEME_MODE_KEY = 'nodeseek_panel_theme_mode';

    // 新增：用户数据缓存的存储键
    const USER_DATA_CACHE_KEY = 'nodeseek_user_data_cache';

    // 新增：用户信息显示状态的存储键
    const USER_INFO_DISPLAY_KEY = 'nodeseek_user_info_display';
    const VIEWED_HISTORY_ENABLED_KEY = 'nodeseek_viewed_history_enabled';
    const VIEWED_COLOR_KEY = 'nodeseek_viewed_color';
    // 新增：跳过跳转页面开关
    const SKIP_JUMP_PAGE_KEY = 'nodeseek_skip_jump_page';
    const SKIP_JUMP_MODE_KEY = 'nodeseek_skip_jump_mode'; // 'blacklist' or 'whitelist'
    const SKIP_JUMP_LIST_KEY = 'nodeseek_skip_jump_list'; // Array of domains

    // 新增：浏览历史记录的存储键
    const BROWSE_HISTORY_KEY = 'nodeseek_browse_history';

    // 新增：新标签页打开帖子开关
    const OPEN_POST_NEW_TAB_KEY = 'nodeseek_open_post_new_tab';

    function getOpenPostNewTabEnabled() {
        const val = localStorage.getItem(OPEN_POST_NEW_TAB_KEY);
        return val === 'true'; // 默认关闭
    }

    function setOpenPostNewTabEnabled(enabled) {
        localStorage.setItem(OPEN_POST_NEW_TAB_KEY, enabled.toString());
    }

    // 新增：获取用户信息显示状态
    function getUserInfoDisplayState() {
        return localStorage.getItem(USER_INFO_DISPLAY_KEY) !== 'false'; // 默认开启
    }

    // 新增：保存用户信息显示状态
    function setUserInfoDisplayState(isEnabled) {
        localStorage.setItem(USER_INFO_DISPLAY_KEY, isEnabled.toString());
    }

    // 新增：获取是否开启跳过跳转页面
    function getSkipJumpPageEnabled() {
        const val = localStorage.getItem(SKIP_JUMP_PAGE_KEY);
        return val === null ? false : val === 'true'; // 默认关闭
    }

    // 新增：设置是否开启跳过跳转页面
    function setSkipJumpPageEnabled(enabled) {
        localStorage.setItem(SKIP_JUMP_PAGE_KEY, enabled.toString());
    }

    // 新增：获取跳转模式
    function getSkipJumpMode() {
        const mode = localStorage.getItem(SKIP_JUMP_MODE_KEY);
        return (mode === 'whitelist') ? 'whitelist' : 'all'; // 默认为 all，处理旧有的 blacklist 为 all
    }

    // 新增：设置跳转模式
    function setSkipJumpMode(mode) {
        localStorage.setItem(SKIP_JUMP_MODE_KEY, mode);
    }

    // 新增：获取跳转名单列表
    function getSkipJumpList() {
        const saved = localStorage.getItem(SKIP_JUMP_LIST_KEY);
        try {
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    // 新增：设置跳转名单列表
    function setSkipJumpList(list) {
        localStorage.setItem(SKIP_JUMP_LIST_KEY, JSON.stringify(list));
    }

    // 新增：获取阅读记忆开启状态
    function getViewedHistoryEnabled() {
        return localStorage.getItem(VIEWED_HISTORY_ENABLED_KEY) !== 'false'; // 默认开启
    }

    // 新增：保存阅读记忆开启状态
    function setViewedHistoryEnabled(enabled) {
        localStorage.setItem(VIEWED_HISTORY_ENABLED_KEY, enabled.toString());
    }

    // 新增：获取阅读后颜色
    function getViewedColor() {
        return localStorage.getItem(VIEWED_COLOR_KEY) || '#9aa0a6';
    }

    // 新增：保存阅读后颜色
    function setViewedColor(color) {
        localStorage.setItem(VIEWED_COLOR_KEY, color);
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


    // 新增：获取折叠状态
    function getCollapsedState() {
        return localStorage.getItem(COLLAPSED_STATE_KEY) === 'true';
    }

    // 新增：保存折叠状态
    function setCollapsedState(isCollapsed) {
        localStorage.setItem(COLLAPSED_STATE_KEY, isCollapsed.toString());
    }

    function getPanelThemeMode() {
        const saved = localStorage.getItem(PANEL_THEME_MODE_KEY);
        if (saved === 'dark' || saved === 'light') return saved;
        const root = document.documentElement;
        const pageTheme = root.getAttribute('data-theme');
        const isDarkByAttr = pageTheme === 'dark';
        const isDarkByClass = root.classList.contains('dark') || document.body?.classList?.contains('dark') || document.body?.classList?.contains('theme-dark');
        const isDarkByMedia = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const inferred = (isDarkByAttr || isDarkByClass || isDarkByMedia) ? 'dark' : 'light';
        localStorage.setItem(PANEL_THEME_MODE_KEY, inferred);
        return inferred;
    }

    function setPanelThemeMode(mode) {
        const safe = (mode === 'dark' || mode === 'light') ? mode : getPanelThemeMode();
        localStorage.setItem(PANEL_THEME_MODE_KEY, safe);
    }

    function applyPanelThemeMode(mode) {
        const root = document.documentElement;
        root.setAttribute('data-ns-theme', mode === 'dark' ? 'dark' : 'light');
    }

    function cyclePanelThemeMode() {
        const current = getPanelThemeMode();
        const next = current === 'dark' ? 'light' : 'dark';
        setPanelThemeMode(next);
        applyPanelThemeMode(next);
        return next;
    }

    function panelThemeModeLabel(mode) {
        return mode === 'dark' ? '暗' : '亮';
    }

    function panelThemeModeTitle(mode) {
        const text = mode === 'dark' ? '暗黑' : '亮色';
        return `主题：${text}，点击切换`;
    }

    try { applyPanelThemeMode(getPanelThemeMode()); } catch (e) { }

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
        infoDiv.innerHTML = `加入: ${joinDays}天 | 等级: ${userData.rank} | 鸡腿: ${userData.coin} | 星辰: ${userData.stardust} | 主题: ${userData.nPost} | 评论: ${userData.nComment} | 粉丝: ${userData.fans} | 关注: ${userData.follows}`;

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
    style.innerHTML = `.friend-user { color: #2ea44f !important; font-weight: bold; white-space: nowrap; } .blacklisted-user { color: red !important; font-weight: bold; white-space: nowrap; } .blacklist-remark { color: #d00; font-size: 12px; margin-left: 4px; max-width: 220px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: text-bottom; } .friend-remark { color: #2ea44f; font-size: 12px; margin-left: 4px; max-width: 220px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: text-bottom; } .ns-viewed-title { color: var(--ns-viewed-color, #9aa0a6) !important; }
    .ns-page-notification .app-switch a,
    .ns-page-notification .app-switch a.btn,
    .ns-page-notification .app-switch a[class*="btn-"] {
        background: transparent !important;
        background-image: none !important;
        box-shadow: none !important;
    }
    :root {
        --ns-panel-bg: rgba(255, 255, 255, 0.95);
        --ns-panel-border: rgba(0, 0, 0, 0.08);
        --ns-panel-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        --ns-panel-surface-bg: #fff;
        --ns-panel-surface-border: #eee;
        --ns-panel-surface-text: #111;
        --ns-panel-collapse-bg: #f0f0f0;
        --ns-panel-collapse-border: #ccc;
        --ns-panel-collapse-color: #666;
        --ns-panel-collapse-hover-bg: #e0e0e0;
    }
    #nodeseek-plugin-buttons-container {
        background: var(--ns-panel-bg) !important;
        border: 1px solid var(--ns-panel-border) !important;
        box-shadow: var(--ns-panel-shadow) !important;
    }
    #ns-highlight-stats-container {
        background: var(--ns-panel-surface-bg) !important;
        border: 1px solid var(--ns-panel-surface-border) !important;
        color: var(--ns-panel-surface-text) !important;
    }
    .collapse-btn {
        background: var(--ns-panel-collapse-bg) !important;
        border-color: var(--ns-panel-collapse-border) !important;
        color: var(--ns-panel-collapse-color) !important;
    }
    .collapse-btn:hover { background: var(--ns-panel-collapse-hover-bg) !important; }
    @media (prefers-color-scheme: dark) {
        :root {
            --ns-panel-bg: rgba(28, 28, 30, 0.92);
            --ns-panel-border: rgba(255, 255, 255, 0.12);
            --ns-panel-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
            --ns-panel-surface-bg: rgba(17, 17, 19, 0.88);
            --ns-panel-surface-border: rgba(255, 255, 255, 0.12);
            --ns-panel-surface-text: rgba(255, 255, 255, 0.86);
            --ns-panel-collapse-bg: rgba(44, 44, 46, 0.95);
            --ns-panel-collapse-border: rgba(255, 255, 255, 0.12);
            --ns-panel-collapse-color: rgba(255, 255, 255, 0.78);
            --ns-panel-collapse-hover-bg: rgba(58, 58, 60, 0.95);
        }
    }
    html[data-theme="dark"], html.dark, body.dark, body.theme-dark {
        --ns-panel-bg: rgba(28, 28, 30, 0.92);
        --ns-panel-border: rgba(255, 255, 255, 0.12);
        --ns-panel-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
        --ns-panel-surface-bg: rgba(17, 17, 19, 0.88);
        --ns-panel-surface-border: rgba(255, 255, 255, 0.12);
        --ns-panel-surface-text: rgba(255, 255, 255, 0.86);
        --ns-panel-collapse-bg: rgba(44, 44, 46, 0.95);
        --ns-panel-collapse-border: rgba(255, 255, 255, 0.12);
        --ns-panel-collapse-color: rgba(255, 255, 255, 0.78);
        --ns-panel-collapse-hover-bg: rgba(58, 58, 60, 0.95);
    }
    html[data-ns-theme="dark"] {
        --ns-panel-bg: rgba(28, 28, 30, 0.92);
        --ns-panel-border: rgba(255, 255, 255, 0.12);
        --ns-panel-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
        --ns-panel-surface-bg: rgba(17, 17, 19, 0.88);
        --ns-panel-surface-border: rgba(255, 255, 255, 0.12);
        --ns-panel-surface-text: rgba(255, 255, 255, 0.86);
        --ns-panel-collapse-bg: rgba(44, 44, 46, 0.95);
        --ns-panel-collapse-border: rgba(255, 255, 255, 0.12);
        --ns-panel-collapse-color: rgba(255, 255, 255, 0.78);
        --ns-panel-collapse-hover-bg: rgba(58, 58, 60, 0.95);
    }
    html[data-ns-theme="light"] {
        --ns-panel-bg: rgba(255, 255, 255, 0.95);
        --ns-panel-border: rgba(0, 0, 0, 0.08);
        --ns-panel-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        --ns-panel-surface-bg: #fff;
        --ns-panel-surface-border: #eee;
        --ns-panel-surface-text: #111;
        --ns-panel-collapse-bg: #f0f0f0;
        --ns-panel-collapse-border: #ccc;
        --ns-panel-collapse-color: #666;
        --ns-panel-collapse-hover-bg: #e0e0e0;
    }
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
    .theme-toggle-btn { top: 36px; }
    .collapse-btn:hover { background: #e0e0e0; }
    .nodeseek-plugin-container-collapsed {
        width: 0 !important;
        height: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: hidden !important;
        border: none !important;
        box-shadow: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
    }

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
            margin-left: 0 !important; /* 移除左边距，避免布局错乱 */
            width: auto !important; /* 强制自适应宽度 */
            min-width: unset !important; /* 移除最小宽度限制 */
            max-width: 100% !important; /* 确保不超出容器 */
            white-space: nowrap !important; /* 防止文字换行 */
        }

        /* 针对签到按钮的特殊适配 */
        #sign-in-btn {
            width: 100% !important; /* 签到按钮占满一行 */
        }

        /* 修复按钮容器内间距 */
        #nodeseek-plugin-buttons-container {
            gap: 5px !important; /* 减小间距 */
            padding: 8px !important;
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

    // 初始化已读标题颜色变量
    try {
        const initialViewedColor = getViewedColor();
        document.documentElement.style.setProperty('--ns-viewed-color', initialViewedColor);
    } catch(e) {}

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
                        if (isFriend(username)) {
                            removeFriend(username, true);
                        }

                        // 不刷新页面，直接更新按钮和用户显示
                        btn.textContent = '移除黑名单';
                        btn.className = 'blacklist-btn ' + SCRIPT_BUTTON_MARKER_CLASS + ' red';

                        // 更新当前页面上该用户的所有显示
                        highlightBlacklisted(username);
                        try { ensureBlacklistNavEntryAndMeta(true); } catch (e) { }

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
                    highlightBlacklisted(username);
                    try { ensureBlacklistNavEntryAndMeta(true); } catch (e) { }

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
                        try { ensureBlacklistNavEntryAndMeta(true); } catch (e) { }
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

    function highlightBlacklisted(targetUsername) {
        const list = getBlacklist();
        const friends = getFriends();
        const friendMap = new Map();
        if (Array.isArray(friends)) {
            friends.forEach(f => {
                if (f && f.username) friendMap.set(String(f.username).trim(), f);
            });
        }

        const normalizedTarget = (typeof targetUsername === 'string' && targetUsername.trim())
            ? targetUsername.trim()
            : '';

        document.querySelectorAll('a.author-name').forEach(function (a) {
            const username = a.textContent.trim();
            if (normalizedTarget && username !== normalizedTarget) return;
            // 先移除样式
            a.classList.remove('blacklisted-user', 'friend-user');
            // 移除备注和网址
            const oldRemark = a.parentNode.querySelector('.blacklist-remark');
            if (oldRemark) oldRemark.remove();
            const oldUrl = a.parentNode.querySelector('.blacklist-url');
            if (oldUrl) oldUrl.remove();
            const oldFriendRemark = a.parentNode.querySelector('.friend-remark');
            if (oldFriendRemark) oldFriendRemark.remove();

            // 新增：移除旧的黑名单信息容器（在metaInfo下）
            let metaInfo = a.closest('.nsk-content-meta-info');
            if (metaInfo) {
                const oldContainer = metaInfo.querySelector('.blacklist-info-container');
                if (oldContainer) oldContainer.remove();
                // 兼容旧版本：移除单独的拉黑时间
                const oldTime = metaInfo.querySelector('.blacklist-time');
                if (oldTime) oldTime.remove();
                const oldFriendContainer = metaInfo.querySelector('.friend-info-container');
                if (oldFriendContainer) oldFriendContainer.remove();
                const oldFriendTime = metaInfo.querySelector('.friend-time');
                if (oldFriendTime) oldFriendTime.remove();
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
                    container.style.top = isMobile ? '' : '23px';
                    container.style.display = 'flex';
                    container.style.alignItems = 'center';
                    container.style.zIndex = isMobile ? '' : '10';
                    container.style.background = 'transparent';
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
            } else if (friendMap.has(username)) {
                const friend = friendMap.get(username);
                a.classList.add('friend-user');

                const remark = friend && friend.remark ? String(friend.remark) : '';
                if (remark) {
                    const span = document.createElement('span');
                    span.className = 'friend-remark';
                    span.textContent = remark;
                    span.title = remark;
                    a.parentNode.appendChild(span);
                }

                if (metaInfo && friend && friend.timestamp) {
                    const isMobile = window.innerWidth <= 767;
                    metaInfo.style.position = 'relative';

                    const container = document.createElement('div');
                    container.className = 'friend-info-container';
                    container.style.position = isMobile ? 'static' : 'absolute';
                    container.style.right = isMobile ? '' : '-6px';
                    container.style.top = isMobile ? '' : '23px';
                    container.style.display = 'flex';
                    container.style.alignItems = 'center';
                    container.style.zIndex = isMobile ? '' : '10';
                    container.style.background = 'transparent';
                    container.style.padding = '0';
                    container.style.flexWrap = isMobile ? 'wrap' : 'nowrap';
                    container.style.gap = isMobile ? '6px' : '';
                    container.style.marginTop = isMobile ? '4px' : '';

                    const timeSpan = document.createElement('span');
                    timeSpan.className = 'friend-time';

                    const date = new Date(friend.timestamp);
                    const timeStr = date.getFullYear() + '-' +
                        String(date.getMonth() + 1).padStart(2, '0') + '-' +
                        String(date.getDate()).padStart(2, '0') + ' ' +
                        String(date.getHours()).padStart(2, '0') + ':' +
                        String(date.getMinutes()).padStart(2, '0') + ':' +
                        String(date.getSeconds()).padStart(2, '0');

                    timeSpan.textContent = '添加时间：' + timeStr;
                    timeSpan.style.color = '#2ea44f';
                    timeSpan.style.fontSize = '10px';
                    timeSpan.style.whiteSpace = 'nowrap';
                    container.appendChild(timeSpan);

                    metaInfo.appendChild(container);
                }
            }
        });
        scheduleBlacklistRemarkWidthUpdate();
    }

    // 新增：高亮好友用户并显示备注
    // highlightFriends 函数已移动到 Friends.js 模块
    const highlightFriends = (username) => window.NodeSeekFriends?.highlightFriends(username);

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

    let lastViewedTitlesRunAt = 0;
    let lastVisitedHistoryRaw = null;
    let cachedVisitedUrlSet = new Set();

    function normalizeVisitedUrl(urlStr) {
        try {
            const urlObj = new URL(urlStr, window.location.origin);
            let pathname = urlObj.pathname;
            const postMatch = pathname.match(/^\/post-(\d+)-\d+$/);
            if (postMatch) {
                pathname = `/post-${postMatch[1]}-1`;
            }
            return urlObj.origin + pathname + urlObj.search;
        } catch (e) {
            return (urlStr || '').toString().split('#')[0];
        }
    }

    // 全局点击拦截：点击标题链接时立即记录历史 + 更新链接样式（不依赖页面 load/DOMContentLoaded）
    document.addEventListener('click', function(e) {
        const a = e.target.closest('a');
        if (!a || !a.href) return;
        const href = a.getAttribute('href') || '';
        if (!/\/post-\d+|\/topic\/|\/article\//.test(href) && !/\/post-\d+|\/topic\/|\/article\//.test(a.href)) return;
        const text = (a.textContent || '').trim();
        if (text.length < 1) return;
        if (a.closest('#nodeseek-plugin-container, #browse-history-dialog, #favorites-dialog, #blacklist-dialog, #friends-dialog, #logs-dialog, footer')) return;

        // 立即记录到已读历史（任意进帖链接均可记录）；仅标题链接触发阅读记忆颜色（帖子详情页不着色）
        if (getViewedHistoryEnabled()) {
            addToViewedTitles(a.href);
            if (!isPostThreadDetailPage()) {
                const normalized = normalizeVisitedUrl(a.href);
                if (isLikelyTitleLink(a) && cachedVisitedUrlSet.has(normalized)) {
                    a.classList.add('ns-viewed-title');
                } else {
                    a.classList.remove('ns-viewed-title');
                }
            }
        }

        // 同时记录到浏览历史
        if (window.NodeSeekViewedTitles && window.NodeSeekViewedTitles.add) {
            window.NodeSeekViewedTitles.add(a.href);
        }
    }, true);

    // 新增：已读标题记录管理（独立存储）
    const VIEWED_TITLES_STORAGE_KEY = 'nodeseek_viewed_titles_data';

    function getViewedTitlesData() {
        return JSON.parse(localStorage.getItem(VIEWED_TITLES_STORAGE_KEY) || '[]');
    }

    function setViewedTitlesData(list) {
        localStorage.setItem(VIEWED_TITLES_STORAGE_KEY, JSON.stringify(list));
    }

    function addToViewedTitles(url) {
        const history = getViewedTitlesData();
        const normalizedUrl = normalizeVisitedUrl(url);

        // 检查是否存在
        const existingIndex = history.indexOf(normalizedUrl);
        if (existingIndex !== -1) {
            // 移动到最前
            history.splice(existingIndex, 1);
        }

        history.unshift(normalizedUrl);

        // 限制最大条数 5000
        if (history.length > 5000) {
            history.length = 5000;
        }

        setViewedTitlesData(history);
        // 更新缓存
        cachedVisitedUrlSet = new Set(history);
    }

    // 暴露接口给 History.js 和同步功能使用
    window.NodeSeekViewedTitles = {
        add: addToViewedTitles,
        getData: getViewedTitlesData,
        setData: setViewedTitlesData,
        refresh: function() {
            cachedVisitedUrlSet = null; // 强制清除缓存
            markViewedTitles(true); // 重新渲染
        }
    };

    function getVisitedUrlSet() {
        // 优先使用新的独立存储
        const raw = localStorage.getItem(VIEWED_TITLES_STORAGE_KEY);
        if (raw) {
            if (raw === lastVisitedHistoryRaw) return cachedVisitedUrlSet;
            lastVisitedHistoryRaw = raw;
            try {
                const history = JSON.parse(raw);
                cachedVisitedUrlSet = new Set(history);
                return cachedVisitedUrlSet;
            } catch(e) {
                return new Set();
            }
        }

        // 迁移旧数据（如果存在且新存储为空）
        try {
            const history = getBrowseHistory();
            const set = new Set();
            const list = [];
            if (Array.isArray(history)) {
                for (const item of history) {
                    if (!item || !item.url) continue;
                    const normalized = normalizeVisitedUrl(item.url);
                    if (!set.has(normalized)) {
                        set.add(normalized);
                        list.push(normalized);
                    }
                }
            }
            // 保存迁移数据
            if (list.length > 0) {
                setViewedTitlesData(list);
            }
            cachedVisitedUrlSet = set;
            return cachedVisitedUrlSet;
        } catch (e) {
            cachedVisitedUrlSet = new Set();
            return cachedVisitedUrlSet;
        }
    }

    /** 链接可见文本仅为日期时间（如最后回复时间），不是帖子标题 */
    function anchorTextLooksLikeReplyOrPostTime(text) {
        const t = (text || '').trim();
        if (!t) return false;
        if (/^编辑时间\s+/u.test(t)) return true;
        // 完整本地时间：2026-03-24 01:40:17
        if (/^\d{4}-\d{2}-\d{2}(\s+\d{1,2}:\d{2}(:\d{2})?)?$/u.test(t)) return true;
        return false;
    }

    /** 主题页楼层锚点（#13）；与同帖 URL 规范化后一致，不能当「标题」染阅读记忆色 */
    function anchorTextLooksLikeFloorLink(text) {
        const t = (text || '').trim().replace(/\s+/g, '');
        if (!t) return false;
        return /^#\d+$/.test(t);
    }

    function isLikelyTitleLink(a) {
        if (!(a instanceof HTMLAnchorElement)) return false;
        if (!a.href) return false;
        if (a.closest('#nodeseek-plugin-container, #browse-history-dialog, #favorites-dialog, #blacklist-dialog, #friends-dialog, #logs-dialog')) return false;
        if (a.closest('footer')) return false;
        if (a.closest('.floor-link-wrapper')) return false;
        // 列表项底部元信息行（作者、浏览、回复、最后回复时间等）内的帖子链不是标题
        if (a.closest('.nsk-content-meta-info')) return false;
        const path = window.location.pathname || '';
        const isDetailPage = path.includes('/topic/') || path.includes('/article/') || /\/post-\d+/.test(path);
        if (isDetailPage) {
            if (a.closest('.topic-header, .thread-header, .article-header, .topic-detail-header')) return false;
            if (a.closest('h1')) return false;
        }
        const text = (a.textContent || '').trim();
        if (anchorTextLooksLikeReplyOrPostTime(text)) return false;
        if (anchorTextLooksLikeFloorLink(text)) return false;
        if (isSamePostThreadPageLink(a)) return false;
        const href = a.getAttribute('href') || '';
        if (!/\/post-\d+|\/topic\/|\/article\//.test(href) && !/\/post-\d+|\/topic\/|\/article\//.test(a.href)) return false;
        return true;
    }

    /** 个人主页「主题帖」「评论」「收藏」标签（含 #/discussions 与 #discussions 等写法） */
    function isUserSpaceTab() {
        const path = window.location.pathname || '';
        if (!/^\/space\/\d+/.test(path)) return false;
        const hash = window.location.hash || '';
        return /^#\/?discussions(\b|\/|\?|$)/.test(hash) || /^#\/?comments(\b|\/|\?|$)/.test(hash) || /^#\/?favorites?(\b|\/|\?|$)/.test(hash);
    }

    function isNotificationPage() {
        const path = window.location.pathname || '';
        return path === '/notification' || path.startsWith('/notification/');
    }

    /** 论坛帖子详情页（/post-123-1）；不在此页应用阅读记忆标题颜色 */
    function isPostThreadDetailPage() {
        const path = window.location.pathname || '';
        return /^\/post-\d+/i.test(path);
    }

    /** 帖子内翻页、省略号跳转等与当前帖同 ID（/post-{id}-*），应保持站点默认打开方式，不强制新标签页 */
    function isSamePostThreadPageLink(a) {
        if (!(a instanceof HTMLAnchorElement)) return false;
        const path = window.location.pathname || '';
        const cur = path.match(/^\/post-(\d+)/i);
        if (!cur) return false;
        try {
            const u = new URL(a.href, window.location.href);
            const linkPath = u.pathname || '';
            const tgt = linkPath.match(/^\/post-(\d+)/i);
            return !!(tgt && tgt[1] === cur[1]);
        } catch (e) {
            return false;
        }
    }

    function updatePageScopeClasses() {
        const root = document.documentElement;
        if (!root) return;
        root.classList.toggle('ns-page-notification', isNotificationPage());
    }

    // ====== MutationObserver：Vue SPA 渲染完成后自动触发标记和链接处理 ======
    (function() {
        const CONTENT_ROOT_SELECTORS = [
            '#app', 'main', '.nsk-content',
            '.post-content', '.topic-list',
            '.thread-list', '.post-list'
        ];

        function contentRoot() {
            for (const sel of CONTENT_ROOT_SELECTORS) {
                const el = document.querySelector(sel);
                if (el) return el;
            }
            return document.body;
        }

        const obs = new MutationObserver(function(mutations) {
            for (const m of mutations) {
                if (m.type !== 'childList' || m.addedNodes.length === 0) continue;
                for (const node of m.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;
                    if (node.id && /^nodeseek-plugin|blacklist-dialog|friends-dialog|favorites-dialog|browse-history-dialog|logs-dialog/.test(node.id)) continue;
                    if (node.closest && node.closest('#nodeseek-plugin-container, #blacklist-dialog, #friends-dialog, #favorites-dialog, #browse-history-dialog, #logs-dialog')) continue;
                    // 立即同步执行，不 debounce
                    markViewedTitles(true);
                    applyNewTabLinks();
                    return;
                }
            }
        });

        function initObserver() {
            obs.observe(contentRoot(), { childList: true, subtree: true });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initObserver);
        } else {
            initObserver();
        }

        // hash 路由切换时：立即同步执行 + 多次补漏（Vue 渲染可能分批）
        window.addEventListener('hashchange', function() {
            markViewedTitles(true);
            applyNewTabLinks();
            setTimeout(function() { markViewedTitles(true); applyNewTabLinks(); }, 150);
            setTimeout(function() { markViewedTitles(true); applyNewTabLinks(); }, 400);
        });
    })();

    // 新增：应用新标签页打开帖子逻辑
    function applyNewTabLinks() {
        const isEnabled = getOpenPostNewTabEnabled();
        const isSpaceTab = isUserSpaceTab();

        // 曾误判为标题链的节点（如帖内翻页、省略号）需摘掉本脚本写入的 target 标记
        document.querySelectorAll('a[data-ns-original-target]').forEach(function (el) {
            if (!(el instanceof HTMLAnchorElement)) return;
            if (isLikelyTitleLink(el)) return;
            const originalTarget = el.getAttribute('data-ns-original-target');
            if (originalTarget) {
                el.target = originalTarget;
            } else {
                el.removeAttribute('target');
            }
            el.removeAttribute('data-ns-original-target');
        });

        // 通用选择器（所有页面都用）
        const generalSelectors = [
            'a.topic-title', '.topic-title a',
            'a.thread-title', '.thread-title a',
            'a.post-title', '.post-title a',
            'a.article-title', '.article-title a',
            '.subject a',
            'h2 a[href*="/post-"]', 'h3 a[href*="/post-"]',
            'a[href*="/post-"][class*="title"]',
            'a[href*="/topic/"][class*="title"]',
            'a[href*="/article/"][class*="title"]'
        ];

        // 用户空间 tab 专用（.title 在论坛列表页会误匹配，这里只对用户空间页额外补充）
        const spaceSelectors = isSpaceTab ? [
            '.title a',
            'a[href*="/post-"]',
            'a[href*="/topic/"]',
            'a[href*="/article/"]'
        ] : [];

        const allSelectors = [...generalSelectors, ...spaceSelectors];

        const candidates = new Set();
        for (const selector of allSelectors) {
            const list = document.querySelectorAll(selector);
            for (const el of list) {
                if (el instanceof HTMLAnchorElement) candidates.add(el);
            }
        }

        // fallback：始终兜底查找所有帖子链接
        const fallback = document.querySelectorAll('a[href*="/post-"], a[href*="/topic/"], a[href*="/article/"]');
        for (const el of fallback) {
            if (el instanceof HTMLAnchorElement && isLikelyTitleLink(el)) candidates.add(el);
        }

        for (const a of candidates) {
            if (!isLikelyTitleLink(a)) continue;
            if (isEnabled) {
                if (!a.hasAttribute('data-ns-original-target')) {
                    a.setAttribute('data-ns-original-target', a.target || '');
                }
                a.target = '_blank';
            } else {
                if (a.hasAttribute('data-ns-original-target')) {
                    const originalTarget = a.getAttribute('data-ns-original-target');
                    if (originalTarget) {
                        a.target = originalTarget;
                    } else {
                        a.removeAttribute('target');
                    }
                    a.removeAttribute('data-ns-original-target');
                }
            }
        }
    }

    function markViewedTitles(force = false) {
        const isEnabled = getViewedHistoryEnabled();
        const now = Date.now();
        if (!force && now - lastViewedTitlesRunAt < 1200) return;
        lastViewedTitlesRunAt = now;

        // 如果功能关闭，移除已有的样式并退出
        if (!isEnabled) {
            const marked = document.querySelectorAll('.ns-viewed-title');
            for (const el of marked) {
                el.classList.remove('ns-viewed-title');
                el.style.removeProperty('color');
            }
            return;
        }

        if (isNotificationPage()) {
            // /notification 列表页本身（无 hash 或其他 hash）不染色；#/reply 和 #/atMe 子页面需要染标题色
            const hash = window.location.hash || '';
            const isReplyOrAtMe = /^#\/reply\b/i.test(hash) || /^#\/atMe\b/i.test(hash);
            if (!isReplyOrAtMe) {
                const marked = document.querySelectorAll('.ns-viewed-title');
                for (const el of marked) {
                    el.classList.remove('ns-viewed-title');
                    el.style.removeProperty('color');
                }
                return;
            }
        }

        if (isPostThreadDetailPage()) {
            const marked = document.querySelectorAll('.ns-viewed-title');
            for (const el of marked) {
                el.classList.remove('ns-viewed-title');
                el.style.removeProperty('color');
            }
            return;
        }

        // 排除 /ruling 页面（帖子聚合/榜单页面）不显示阅读记忆
        const rulingPage = /\/ruling/.test(window.location.pathname);
        if (rulingPage) {
            const marked = document.querySelectorAll('.ns-viewed-title');
            for (const el of marked) {
                el.classList.remove('ns-viewed-title');
                el.style.removeProperty('color');
            }
            return;
        }

        const visitedSet = getVisitedUrlSet();
        const isSpaceTab = isUserSpaceTab();

        const generalSelectors = [
            'a.topic-title', '.topic-title a',
            'a.thread-title', '.thread-title a',
            'a.post-title', '.post-title a',
            'a.article-title', '.article-title a',
            '.subject a',
            'h2 a[href*="/post-"]', 'h3 a[href*="/post-"]',
            'a[href*="/post-"][class*="title"]',
            'a[href*="/topic/"][class*="title"]',
            'a[href*="/article/"][class*="title"]',
            // 通知页 #/reply 和 #/atMe 标题链接
            '.notification-title a',
            '.notify-title a',
            '.notify-item a[href*="/post-"]',
            'a.notify-link[href*="/post-"]',
            'a[href*="/post-"][class*="notification"]',
            'a[href*="/post-"][class*="notify"]',
            '.app-main a[href*="/post-"]',
            '.notification-content a[href*="/post-"]'
        ];

        const spaceSelectors = isSpaceTab ? [
            '.title a',
            'a[href*="/post-"]',
            'a[href*="/topic/"]',
            'a[href*="/article/"]'
        ] : [];

        const candidates = new Set();
        for (const selector of [...generalSelectors, ...spaceSelectors]) {
            const list = document.querySelectorAll(selector);
            for (const el of list) {
                if (el instanceof HTMLAnchorElement) candidates.add(el);
            }
        }

        // fallback：始终兜底查找所有帖子链接
        const fallback = document.querySelectorAll('a[href*="/post-"], a[href*="/topic/"], a[href*="/article/"]');
        for (const el of fallback) {
            if (el instanceof HTMLAnchorElement) candidates.add(el);
        }

        for (const a of candidates) {
            if (!isLikelyTitleLink(a)) continue;
            const normalized = normalizeVisitedUrl(a.href);
            const isViewed = visitedSet.has(normalized);

            if (isViewed) {
                a.classList.add('ns-viewed-title');
                // 移除旧的内联样式
                if (a.style.color) {
                    a.style.removeProperty('color');
                }
            } else {
                a.classList.remove('ns-viewed-title');
                // 如果之前设置过颜色，移除它
                if (a.style.color) {
                    a.style.removeProperty('color');
                }
            }
        }
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

        updatePageScopeClasses();
        processUsernames();
        highlightBlacklisted();
        highlightFriends(); // 新增调用
        processUserAvatars(); // 新增：处理用户头像信息显示
        replaceRelativeTimeWithAbsolute(); // 新增：替换相对时间为完整时间
        markViewedTitles();
        applyNewTabLinks(); // 新增：应用新标签页打开帖子逻辑
    }

    // 兼容异步加载，定时检查
    setInterval(updateAll, 2000);

    // ====== 导出/导入黑名单功能 ======
    function exportBlacklist() {
        // 同时导出所有用户数据：黑名单、好友、收藏、操作日志、浏览历史、热点统计等
        const blacklist = getBlacklist();
        const friends = getFriends();
        const favorites = (nsCollect() && nsCollect().getFavorites) ? nsCollect().getFavorites() : [];
        // 新增：收藏分类
        const favoriteCategories = (nsCollect() && nsCollect().getFavoriteCategories) ? nsCollect().getFavoriteCategories() : [];
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

        // 新增：签到设置（是否开启自动签到及模式）
        let signSettings = {};
        try {
            const signEnabled = localStorage.getItem('nodeseek_sign_enabled');
            if (signEnabled !== null) {
                signSettings.enabled = signEnabled === 'true';
            }
            const signMode = localStorage.getItem('nodeseek_sign_mode');
            if (signMode !== null) {
                signSettings.mode = signMode;
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

        // 添加阅读记忆数据
        let viewedTitles = {};
        try {
            const enabled = localStorage.getItem('nodeseek_viewed_history_enabled');
            const color = localStorage.getItem('nodeseek_viewed_color');
            const data = localStorage.getItem('nodeseek_viewed_titles_data');

            if (enabled !== null) viewedTitles.enabled = enabled === 'true';
            if (color !== null) viewedTitles.color = color;
            if (data !== null) viewedTitles.data = JSON.parse(data);
        } catch (error) {
            console.error('导出阅读记忆数据失败:', error);
        }

        // 添加备份设置
        let backupLimit = 3;
        try {
            const limit = localStorage.getItem('nodeseek_backup_limit');
            if (limit) {
                backupLimit = parseInt(limit);
            }
        } catch (error) {
            console.error('导出备份设置失败:', error);
        }

        // 新增：用户信息显示设置
        let userInfoSettings = {};
        try {
            const userInfoDisplay = localStorage.getItem('nodeseek_user_info_display');
            if (userInfoDisplay !== null) {
                userInfoSettings.display = userInfoDisplay !== 'false';
            }
        } catch (error) {
            console.error('导出用户信息显示设置失败:', error);
        }

        // 新增：屏蔽URL跳转提醒设置
        let skipJumpSettings = {};
        try {
            skipJumpSettings.enabled = getSkipJumpPageEnabled();
            skipJumpSettings.mode = getSkipJumpMode();
            skipJumpSettings.list = getSkipJumpList();
        } catch (error) {
            console.error('导出屏蔽URL跳转提醒设置失败:', error);
        }

        // 新增：新标签页打开帖子设置
        let openPostNewTabSettings = {};
        try {
            openPostNewTabSettings.enabled = getOpenPostNewTabEnabled();
        } catch (error) {
            console.error('导出新标签页打开帖子设置失败:', error);
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
            userInfoSettings: userInfoSettings, // 新增：用户信息显示设置
            skipJumpSettings: skipJumpSettings, // 新增：屏蔽URL跳转提醒设置
            openPostNewTabSettings: openPostNewTabSettings, // 新增：新标签页打开帖子设置
            chickenLegStats: chickenLegStats, // 添加鸡腿统计数据
            filterData: filterData, // 添加关键词过滤数据
            notesData: notesData, // 添加笔记数据
            viewedTitles: viewedTitles, // 添加阅读记忆数据
            autoSync: autoSync,
            backupLimit: backupLimit // 添加备份设置
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
        const hasViewedTitles = Object.keys(viewedTitles).length > 0;
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
        if (hasViewedTitles) {
            exportDesc += '、阅读记忆';
        }
        // 不在导出日志中包含“自动同步设置”
        // 始终包含备份设置
        exportDesc += '、设置';
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
                        if (nsCollect() && nsCollect().setFavorites) nsCollect().setFavorites(json.favorites);
                        importInfo.push("收藏");
                    }

                    // 新增：处理收藏分类数据
                    if (json.favoriteCategories && Array.isArray(json.favoriteCategories)) {
                        try {
                            if (nsCollect() && nsCollect().setFavoriteCategories) nsCollect().setFavoriteCategories(json.favoriteCategories);
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

                    // 新增：处理签到设置（是否开启自动签到及模式）
                    if (json.signSettings && typeof json.signSettings === 'object') {
                        try {
                            if (typeof json.signSettings.enabled !== 'undefined') {
                                localStorage.setItem('nodeseek_sign_enabled', json.signSettings.enabled ? 'true' : 'false');
                            }
                            if (typeof json.signSettings.mode !== 'undefined') {
                                localStorage.setItem('nodeseek_sign_mode', json.signSettings.mode);
                            }
                            const modeStr = json.signSettings.mode === 'fixed' ? '固定' : (json.signSettings.mode === 'random' ? '随机' : '默认');
                            importInfo.push(`签到设置(${json.signSettings.enabled ? '开启' : '关闭'}, ${modeStr})`);
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

                    // 新增：处理用户信息显示设置
                    if (json.userInfoSettings && typeof json.userInfoSettings === 'object') {
                        try {
                            if (typeof json.userInfoSettings.display !== 'undefined') {
                                setUserInfoDisplayState(json.userInfoSettings.display);
                                importInfo.push(`用户信息显示设置(${json.userInfoSettings.display ? '开启' : '关闭'})`);
                            }
                        } catch (error) {
                            console.error('导入用户信息显示设置失败:', error);
                            importInfo.push('用户信息显示设置(失败)');
                        }
                    }

    // 新增：处理屏蔽URL跳转提醒设置
                    if (json.skipJumpSettings && typeof json.skipJumpSettings === 'object') {
                        try {
                            if (typeof json.skipJumpSettings.enabled !== 'undefined') {
                                setSkipJumpPageEnabled(json.skipJumpSettings.enabled);
                            }
                            if (json.skipJumpSettings.mode) {
                                // 兼容旧数据的 blacklist 模式，将其转为 all
                                const mode = json.skipJumpSettings.mode === 'whitelist' ? 'whitelist' : 'all';
                                setSkipJumpMode(mode);
                            }
                            if (json.skipJumpSettings.list) {
                                setSkipJumpList(json.skipJumpSettings.list);
                            }
                            const modeText = (getSkipJumpMode() === 'whitelist') ? '白名单' : '全放行';
                            importInfo.push(`屏蔽URL跳转提醒设置(${json.skipJumpSettings.enabled ? '开启' : '关闭'}, ${modeText})`);
                        } catch (error) {
                            console.error('导入屏蔽URL跳转提醒设置失败:', error);
                            importInfo.push('屏蔽URL跳转提醒设置(失败)');
                        }
                    }

                    // 新增：处理新标签页打开帖子设置
                    if (json.openPostNewTabSettings && typeof json.openPostNewTabSettings === 'object') {
                        try {
                            if (typeof json.openPostNewTabSettings.enabled !== 'undefined') {
                                setOpenPostNewTabEnabled(json.openPostNewTabSettings.enabled);
                                importInfo.push(`新标签页打开帖子设置(${json.openPostNewTabSettings.enabled ? '开启' : '关闭'})`);
                            }
                        } catch (error) {
                            console.error('导入新标签页打开帖子设置失败:', error);
                            importInfo.push('新标签页打开帖子设置(失败)');
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

                    // 处理阅读记忆数据
                    if (json.viewedTitles && typeof json.viewedTitles === 'object') {
                        try {
                            if (typeof json.viewedTitles.enabled !== 'undefined') {
                                localStorage.setItem('nodeseek_viewed_history_enabled', json.viewedTitles.enabled ? 'true' : 'false');
                            }
                            if (json.viewedTitles.color) {
                                localStorage.setItem('nodeseek_viewed_color', json.viewedTitles.color);
                            }
                            if (Array.isArray(json.viewedTitles.data)) {
                                localStorage.setItem('nodeseek_viewed_titles_data', JSON.stringify(json.viewedTitles.data));
                            }

                            // 刷新缓存
                            if (window.NodeSeekViewedTitles && typeof window.NodeSeekViewedTitles.refresh === 'function') {
                                window.NodeSeekViewedTitles.refresh();
                            }

                            const count = Array.isArray(json.viewedTitles.data) ? json.viewedTitles.data.length : 0;
                            importInfo.push(`阅读记忆(${json.viewedTitles.enabled ? '开启' : '关闭'}, ${count}条)`);
                        } catch (error) {
                            console.error('导入阅读记忆数据失败:', error);
                            importInfo.push('阅读记忆(失败)');
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

                    // 导入备份设置
                    if (json.backupLimit) {
                        try {
                            localStorage.setItem('nodeseek_backup_limit', json.backupLimit.toString());
                            importInfo.push(`备份设置(保留${json.backupLimit}份)`);
                        } catch (e) {
                            importInfo.push('备份设置(失败)');
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
                    // 始终包含备份设置
                    if (json.backupLimit) importDesc += '、设置';
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

    // 新增：显示跳转名单设置弹窗
    function showJumpListDialog() {
        const existing = document.getElementById('jump-list-dialog');
        if (existing) {
            existing.remove();
            return;
        }

        const mode = getSkipJumpMode();
        const modeText = mode === 'whitelist' ? '白名单' : '全放行';
        const list = getSkipJumpList();

        const dialog = document.createElement('div');
        dialog.id = 'jump-list-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '100px';
        dialog.style.left = '50%';
        dialog.style.transform = 'translateX(-50%)';
        dialog.style.zIndex = '10001';
        dialog.style.background = '#fff';
        dialog.style.border = '1px solid #ccc';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
        dialog.style.padding = '20px';
        dialog.style.width = '350px';
        dialog.style.maxHeight = '80vh';
        dialog.style.display = 'flex';
        dialog.style.flexDirection = 'column';
        dialog.style.overflow = 'hidden';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '15px';

        const title = document.createElement('div');
        title.textContent = `屏蔽URL跳转提醒 - ${modeText}设置`;
        title.style.fontWeight = 'bold';
        title.style.fontSize = '16px';

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '24px';
        closeBtn.onclick = function() { dialog.remove(); };

        header.appendChild(title);
        header.appendChild(closeBtn);
        dialog.appendChild(header);

        const isMobile = (window.NodeSeekFilter && typeof window.NodeSeekFilter.isMobileDevice === 'function')
            ? window.NodeSeekFilter.isMobileDevice()
            : (window.innerWidth <= 767);

        if (isMobile) {
            dialog.style.width = '90%';
            dialog.style.maxWidth = '420px';
            dialog.style.left = '50%';
            dialog.style.top = '50%';
            dialog.style.transform = 'translate(-50%, -50%)';
            dialog.style.padding = '16px';
        }

        const dragHandle = document.createElement('div');
        dragHandle.style.position = 'absolute';
        dragHandle.style.top = '0';
        dragHandle.style.left = '0';
        dragHandle.style.width = '20px';
        dragHandle.style.height = '20px';
        dragHandle.style.cursor = isMobile ? 'default' : 'move';
        dragHandle.style.zIndex = '10002';
        dialog.appendChild(dragHandle);

        if (!isMobile) {
            let isDragging = false;
            let startX = 0;
            let startY = 0;
            let startLeft = 0;
            let startTop = 0;

            const onMouseMove = (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                const rect = dialog.getBoundingClientRect();
                const maxLeft = Math.max(0, window.innerWidth - rect.width);
                const maxTop = Math.max(0, window.innerHeight - rect.height);
                const nextLeft = Math.min(maxLeft, Math.max(0, startLeft + dx));
                const nextTop = Math.min(maxTop, Math.max(0, startTop + dy));
                dialog.style.left = nextLeft + 'px';
                dialog.style.top = nextTop + 'px';
            };

            const onMouseUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            dragHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const rect = dialog.getBoundingClientRect();
                dialog.style.transform = '';
                dialog.style.left = rect.left + 'px';
                dialog.style.top = rect.top + 'px';

                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                startLeft = rect.left;
                startTop = rect.top;

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }

        const desc = document.createElement('div');
        desc.style.fontSize = '12px';
        desc.style.color = '#666';
        desc.style.marginBottom = '12px';
        desc.textContent = mode === 'whitelist'
            ? '在此名单内的域名将直接跳转（不显示提醒）。'
            : '当前处于“全放行”模式，所有外链都将自动跳转。';
        dialog.appendChild(desc);

        // 输入区域
        const inputRow = document.createElement('div');
        inputRow.style.display = 'flex';
        inputRow.style.gap = '8px';
        inputRow.style.marginBottom = '15px';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '输入域名，如: github.com';
        input.style.flex = '1';
        input.style.padding = '6px 10px';
        input.style.border = '1px solid #ddd';
        input.style.borderRadius = '4px';
        input.style.outline = 'none';

        const addBtn = document.createElement('button');
        addBtn.textContent = '添加';
        addBtn.style.padding = '6px 15px';
        addBtn.style.background = '#1890ff';
        addBtn.style.color = '#fff';
        addBtn.style.border = 'none';
        addBtn.style.borderRadius = '4px';
        addBtn.style.cursor = 'pointer';

        inputRow.appendChild(input);
        inputRow.appendChild(addBtn);
        dialog.appendChild(inputRow);

        // 名单显示区域
        const listContainer = document.createElement('div');
        listContainer.style.overflowY = 'auto';
        listContainer.style.flex = '1';
        listContainer.style.border = '1px solid #eee';
        listContainer.style.borderRadius = '4px';
        listContainer.style.background = '#f9f9f9';
        listContainer.style.padding = '5px';
        listContainer.style.minHeight = '150px';

        function renderList() {
            listContainer.innerHTML = '';
            const currentList = getSkipJumpList();
            if (currentList.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = '暂无记录';
                empty.style.textAlign = 'center';
                empty.style.color = '#999';
                empty.style.marginTop = '60px';
                empty.style.fontSize = '13px';
                listContainer.appendChild(empty);
                return;
            }

            currentList.forEach((domain, index) => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.padding = '6px 10px';
                item.style.borderBottom = '1px solid #eee';
                item.style.fontSize = '13px';

                const name = document.createElement('span');
                name.textContent = domain;
                name.style.wordBreak = 'break-all';

                const delBtn = document.createElement('span');
                delBtn.textContent = '删除';
                delBtn.style.color = '#ff4d4f';
                delBtn.style.cursor = 'pointer';
                delBtn.style.fontSize = '12px';
                delBtn.onclick = function() {
                    const newList = getSkipJumpList();
                    newList.splice(index, 1);
                    setSkipJumpList(newList);
                    renderList();
                    addLog(`从跳转${modeText}中删除域名: ${domain}`);
                    if (getSkipJumpPageEnabled()) {
                        // 立即应用更改：先恢复所有链接，再按更新后的名单重写
                        restoreJumpLinks();
                        rewriteJumpLinks();
                    }
                };

                item.appendChild(name);
                item.appendChild(delBtn);
                listContainer.appendChild(item);
            });
        }

        addBtn.onclick = function() {
            const domain = input.value.trim().toLowerCase();
            if (!domain) return;

            const currentList = getSkipJumpList();
            if (currentList.includes(domain)) {
                alert('该域名已在名单中');
                return;
            }

            currentList.unshift(domain);
            setSkipJumpList(currentList);
            input.value = '';
            renderList();
            addLog(`添加到跳转${modeText}: ${domain}`);
            if (getSkipJumpPageEnabled()) {
                // 立即应用更改：先恢复所有链接，再按更新后的名单重写
                restoreJumpLinks();
                rewriteJumpLinks();
            }
        };

        input.onkeydown = function(e) {
            if (e.key === 'Enter') addBtn.click();
        };

        renderList();
        dialog.appendChild(listContainer);
        document.body.appendChild(dialog);
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

        const themeToggleBtn = document.createElement('button');
        themeToggleBtn.id = 'theme-toggle-btn';
        themeToggleBtn.className = 'collapse-btn theme-toggle-btn';
        const initialThemeMode = getPanelThemeMode();
        themeToggleBtn.textContent = panelThemeModeLabel(initialThemeMode);
        themeToggleBtn.title = panelThemeModeTitle(initialThemeMode);
        themeToggleBtn.onclick = function (e) {
            e.stopPropagation();
            const mode = cyclePanelThemeMode();
            themeToggleBtn.textContent = panelThemeModeLabel(mode);
            themeToggleBtn.title = panelThemeModeTitle(mode);
        };

        // 组装UI - 先添加折叠按钮，再添加内容容器
        mainContainer.appendChild(collapseBtn);
        mainContainer.appendChild(themeToggleBtn);
        mainContainer.appendChild(container);

        // 处理折叠状态
        const isCollapsed = getCollapsedState();
        if (isCollapsed) {
            container.classList.add('nodeseek-plugin-container-collapsed');
            collapseBtn.innerHTML = '&gt;'; // 折叠状态显示 >
            themeToggleBtn.style.display = 'none'; // 折叠时隐藏主题按钮
        }

        // 日志按钮
        const logBtn = document.createElement('button');
        logBtn.id = 'sign-log-btn';
        logBtn.className = 'blacklist-btn';
        logBtn.textContent = '日志';
        logBtn.style.background = '#795548';
        logBtn.onclick = showLogs;


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

        // 移除所有按钮的固定宽度设置，改为 minWidth
        // logBtn.style.width = btnWidth;
        logBtn.style.minWidth = btnWidth;

        // 导出和导入按钮已使用百分比宽度，不需要再设置
        // viewBtn.style.width = btnWidth;
        viewBtn.style.minWidth = btnWidth;

        // viewFriendsBtn.style.width = btnWidth;
        viewFriendsBtn.style.minWidth = btnWidth;

        // quickEditBtn.style.width = btnWidth; // 设置快捷编辑按钮宽度
        quickEditBtn.style.minWidth = btnWidth;

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

        // 创建一个水平排列的容器，用于收藏相关按钮
        const favoriteContainer = document.createElement('div');
        favoriteContainer.style.display = 'flex';
        favoriteContainer.style.flexDirection = 'row';
        favoriteContainer.style.gap = '10px';
        favoriteContainer.style.width = '100%';

        // 调用 collect.js 创建收藏按钮
        if (nsCollect() && typeof nsCollect().createFavoriteButtons === 'function') {
            nsCollect().createFavoriteButtons(favoriteContainer);
        }

        // 新增：关键词过滤按钮单独一行
        const filterBtnContainer = document.createElement('div');
        filterBtnContainer.style.display = 'flex';
        filterBtnContainer.style.flexDirection = 'row';
        filterBtnContainer.style.gap = '10px';
        filterBtnContainer.style.width = '100%';
        filterBtnContainer.appendChild(filterBtn);

        // 新增：设置按钮
        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'settings-btn';
        settingsBtn.className = 'blacklist-btn';
        settingsBtn.style.background = '#607D8B'; // 蓝灰色背景
        settingsBtn.textContent = '设置';
        settingsBtn.style.width = '100%';
        settingsBtn.style.marginTop = '1px';
        settingsBtn.onclick = showSettingsDialog;

        // 新增：设置按钮单独一行
        const settingsContainer = document.createElement('div');
        settingsContainer.style.display = 'flex';
        settingsContainer.style.flexDirection = 'row';
        settingsContainer.style.gap = '10px';
        settingsContainer.style.width = '100%';
        settingsContainer.appendChild(settingsBtn);

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

        // 新增：NS 图床（NodeImage API，window.NodeSeekNodeImage）
        const nodeImageBtn = document.createElement('button');
        nodeImageBtn.id = 'ns-nodeimage-btn';
        nodeImageBtn.className = 'blacklist-btn';
        nodeImageBtn.style.background = '#0d9488';
        nodeImageBtn.textContent = 'NS图床';
        nodeImageBtn.style.width = '100%';
        nodeImageBtn.style.marginTop = '1px';
        nodeImageBtn.onclick = function () {
            if (window.NodeSeekNodeImage && typeof window.NodeSeekNodeImage.open === 'function') {
                window.NodeSeekNodeImage.open();
            } else {
                alert('NS图床模块未加载');
            }
        };
        const nodeImageBtnContainer = document.createElement('div');
        nodeImageBtnContainer.style.display = 'flex';
        nodeImageBtnContainer.style.flexDirection = 'row';
        nodeImageBtnContainer.style.gap = '10px';
        nodeImageBtnContainer.style.width = '100%';
        nodeImageBtnContainer.appendChild(nodeImageBtn);

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
                themeToggleBtn.style.display = 'flex'; // 展开时显示主题按钮
                setCollapsedState(false);
            } else {
                // 折叠
                container.classList.add('nodeseek-plugin-container-collapsed');
                collapseBtn.innerHTML = '&gt;';
                themeToggleBtn.style.display = 'none'; // 折叠时隐藏主题按钮
                setCollapsedState(true);
            }
        };

        // 按照指定顺序添加按钮
        container.appendChild(settingsContainer); // 设置按钮行
        container.appendChild(dataContainer); // 导出和导入按钮
        container.appendChild(logBtn);        // 日志
        container.appendChild(viewBtn);       // 查看黑名单
        container.appendChild(viewFriendsBtn); // 查看好友
        container.appendChild(quickEditBtn);  // 快捷编辑
        container.appendChild(favoriteContainer); // 收藏相关按钮行
        container.appendChild(filterBtnContainer); // 关键词过滤按钮行
        container.appendChild(quickReplyContainer); // 快捷回复按钮行
        container.appendChild(emojiBtnContainer); // 表情按钮行
        container.appendChild(nodeImageBtnContainer); // NS 图床
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

    function nsCollect() {
        return window.NodeSeekCollect;
    }
    function showFavoritesDialog() {
        if (nsCollect() && typeof nsCollect().showFavoritesDialog === 'function') {
            nsCollect().showFavoritesDialog();
        } else {
            console.error('收藏模块 collect.js 未加载');
            alert('收藏模块未加载，请检查 @require collect.js');
        }
    }
    function showAddFavoriteDialog() {
        if (nsCollect() && typeof nsCollect().showAddFavoriteDialog === 'function') {
            nsCollect().showAddFavoriteDialog();
        } else {
            console.error('收藏模块 collect.js 未加载');
        }
    }
    function isCurrentPageFavorited() {
        if (!nsCollect()) return false;
        return nsCollect().isCurrentPageFavorited();
    }
    function removeFromFavorites(url) {
        if (!nsCollect()) return false;
        nsCollect().removeFromFavorites(url);
        return true;
    }

    // 更新收藏按钮状态
    function updateFavoriteButton() {
        const btn = document.getElementById('favorite-add-btn');
        if (btn) {
            const isFavorited = isCurrentPageFavorited();
            btn.textContent = isFavorited ? '已收藏' : '收藏';
            btn.style.background = isFavorited ? '#52c41a' : '#1890ff';
        }
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
            table.innerHTML = '<thead><tr><th style="text-align:left;font-size:13px;vertical-align:bottom;">用户名</th><th style="text-align:left;font-size:13px;padding-left:5px;min-width:135px;vertical-align:bottom;">备注</th><th style="text-align:left;font-size:13px;padding-left:0;position:relative;left:-2px;vertical-align:bottom;">拉黑时间</th><th style="text-align:left;font-size:13px;padding-left:5px;vertical-align:bottom;">页面</th><th style="vertical-align:bottom;"></th></tr></thead>';

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
            tdRemark.style.minWidth = '135px';
            tdRemark.style.maxWidth = '135px';
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
        tdTime.style.paddingLeft = '0';
        tdTime.style.position = 'relative';
        tdTime.style.left = '-2px';
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

    // 新增：显示设置弹窗
    function showSettingsDialog() {
        // 打开弹窗时先更新一次标题状态，确保样式类已添加且内联样式已清除，以便颜色预览生效
        if (getViewedHistoryEnabled()) {
            setTimeout(() => markViewedTitles(true), 0);
        }

        const existingDialog = document.getElementById('settings-dialog');
        if (existingDialog) {
            existingDialog.remove();
            return;
        }

        const dialog = document.createElement('div');
        dialog.id = 'settings-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '60px';
        dialog.style.right = '16px';
        dialog.style.zIndex = '10000';
        dialog.style.background = '#fff';
        dialog.style.border = '1px solid #ccc';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        dialog.style.padding = '18px 20px';
        dialog.style.width = '300px';

        // 移动端适配
        const isMobile = (window.NodeSeekFilter && typeof window.NodeSeekFilter.isMobileDevice === 'function')
            ? window.NodeSeekFilter.isMobileDevice()
            : (window.innerWidth <= 767);
        if (isMobile) {
            dialog.style.width = '90%';
            dialog.style.left = '50%';
            dialog.style.top = '50%';
            dialog.style.transform = 'translate(-50%, -50%)';
            dialog.style.right = 'auto';
        }

        // 标题栏
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.marginBottom = '15px';
        header.style.borderBottom = '1px solid #eee';
        header.style.paddingBottom = '8px';
        // if (!isMobile) {
        //    header.style.cursor = 'move'; // PC端显示拖动光标
        // }

        const title = document.createElement('div');
        title.textContent = '插件设置';
        title.style.fontWeight = 'bold';
        title.style.fontSize = '16px';
        title.style.color = '#333';
        // 阻止标题文字被选中，避免拖动时体验不佳
        title.style.userSelect = 'none';

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '24px';
        closeBtn.style.lineHeight = '20px';
        closeBtn.style.color = '#999';
        closeBtn.onclick = function() { dialog.remove(); };

        header.appendChild(title);
        header.appendChild(closeBtn);
        dialog.appendChild(header);

        // 新增：左上角20px拖动区域
        const dragHandle = document.createElement('div');
        dragHandle.style.position = 'absolute';
        dragHandle.style.top = '0';
        dragHandle.style.left = '0';
        dragHandle.style.width = '20px';
        dragHandle.style.height = '20px';
        dragHandle.style.cursor = 'move';
        dragHandle.style.zIndex = '10001'; // 确保在最上层
        dragHandle.title = '按住拖动';
        // 可选：添加一点微弱的背景色或边框提示，或者完全透明
        // dragHandle.style.background = 'rgba(0,0,0,0.05)';
        dialog.appendChild(dragHandle);

        // 拖动逻辑实现
        if (!isMobile) {
            let isDragging = false;
            let startX, startY, initialLeft, initialTop;

            dragHandle.onmousedown = function(e) {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;

                const rect = dialog.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;

                // 防止选中文本
                e.preventDefault();

                document.onmousemove = function(e) {
                    if (isDragging) {
                        const dx = e.clientX - startX;
                        const dy = e.clientY - startY;

                        // 移除 right 定位，改为 left/top 定位以支持拖动
                        dialog.style.right = 'auto';
                        dialog.style.left = (initialLeft + dx) + 'px';
                        dialog.style.top = (initialTop + dy) + 'px';
                    }
                };

                document.onmouseup = function() {
                    isDragging = false;
                    document.onmousemove = null;
                    document.onmouseup = null;
                };
            };
        }

        // 设置项容器
        const content = document.createElement('div');
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.gap = '15px';

        // 1. 用户信息显示开关
        const userInfoRow = document.createElement('div');
        userInfoRow.style.display = 'flex';
        userInfoRow.style.justifyContent = 'space-between';
        userInfoRow.style.alignItems = 'center';
        if (isMobile) userInfoRow.style.flexWrap = 'wrap';

        const userInfoLabel = document.createElement('label');
        userInfoLabel.textContent = '显示用户信息';
        userInfoLabel.style.fontWeight = '500';
        userInfoLabel.style.color = '#555';

        const userInfoSwitch = document.createElement('input');
        userInfoSwitch.type = 'checkbox';
        userInfoSwitch.checked = getUserInfoDisplayState();
        userInfoSwitch.style.transform = 'scale(1.2)';
        userInfoSwitch.onchange = function() {
            const newState = this.checked;
            setUserInfoDisplayState(newState);
            if (newState) {
                processUserAvatars();
                addLog('用户信息显示：开启');
            } else {
                const userInfoElements = document.querySelectorAll('.user-info-display');
                userInfoElements.forEach(el => el.remove());
                addLog('用户信息显示：关闭');
            }
        };

        userInfoRow.appendChild(userInfoLabel);
        userInfoRow.appendChild(userInfoSwitch);
        content.appendChild(userInfoRow);

        // 2. 阅读记忆开关（含颜色选择）
        const historyRow = document.createElement('div');
        historyRow.style.display = 'flex';
        historyRow.style.justifyContent = 'space-between';
        historyRow.style.alignItems = 'center';

        const historyLabel = document.createElement('label');
        historyLabel.textContent = '开启阅读记忆';
        historyLabel.style.fontWeight = '500';
        historyLabel.style.color = '#555';

        // 右侧容器：包含 颜色选择器 + 重置 + 开关
        const rightContainer = document.createElement('div');
        rightContainer.style.display = 'flex';
        rightContainer.style.alignItems = 'center';
        rightContainer.style.gap = '12px';

        // 颜色选择部分
        const colorInputContainer = document.createElement('div');
        colorInputContainer.style.display = 'flex';
        colorInputContainer.style.alignItems = 'center';
        colorInputContainer.style.gap = '6px';

        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = getViewedColor();
        colorPicker.style.border = 'none';
        colorPicker.style.width = '24px';
        colorPicker.style.height = '24px';
        colorPicker.style.padding = '0';
        colorPicker.style.cursor = 'pointer';
        colorPicker.style.background = 'none';
        colorPicker.title = '选择已读标题颜色';

        const colorResetBtn = document.createElement('span');
        colorResetBtn.textContent = '颜色重置';
        colorResetBtn.style.fontSize = '12px';
        colorResetBtn.style.color = '#1890ff';
        colorResetBtn.style.cursor = 'pointer';
        colorResetBtn.style.textDecoration = 'underline';
        colorResetBtn.onclick = function() {
            if (confirm('确定要重置阅读记忆颜色吗？')) {
                colorPicker.value = '#9aa0a6';
                colorPicker.dispatchEvent(new Event('input')); // 触发实时预览
                colorPicker.dispatchEvent(new Event('change')); // 触发保存
            }
        };

        // 实时预览颜色
        colorPicker.oninput = function() {
            const newColor = this.value;
            document.documentElement.style.setProperty('--ns-viewed-color', newColor);
        };

        colorPicker.onchange = function() {
            const newColor = this.value;
            setViewedColor(newColor);
            document.documentElement.style.setProperty('--ns-viewed-color', newColor);
            if (getViewedHistoryEnabled()) {
                markViewedTitles(true); // 立即应用
            }
        };

        colorInputContainer.appendChild(colorPicker);
        colorInputContainer.appendChild(colorResetBtn);

        // 新增：清除阅读记录按钮
        const clearHistoryBtn = document.createElement('span');
        clearHistoryBtn.textContent = '清除';
        clearHistoryBtn.style.fontSize = '12px';
        clearHistoryBtn.style.color = '#ff4d4f';
        clearHistoryBtn.style.cursor = 'pointer';
        clearHistoryBtn.style.textDecoration = 'underline';
        clearHistoryBtn.style.marginLeft = '4px'; // 增加一点间距
        clearHistoryBtn.title = '清除所有已记录的阅读历史';
        clearHistoryBtn.onclick = function() {
            if (confirm('确定要清除所有阅读记忆吗？此操作不可恢复。')) {
                // 清除本地存储
                setViewedTitlesData([]);
                // 清除内存缓存
                cachedVisitedUrlSet = new Set();
                // 刷新页面显示
                markViewedTitles(true); // 传入 true 强制刷新，此时 Set 为空，会清除页面上的灰色样式
                addLog('已清除所有阅读记忆');
                // alert('阅读记忆已清除！');
            }
        };
        colorInputContainer.appendChild(clearHistoryBtn);

        // 开关部分
        const historySwitch = document.createElement('input');
        historySwitch.type = 'checkbox';
        historySwitch.checked = getViewedHistoryEnabled();
        historySwitch.style.transform = 'scale(1.2)';
        historySwitch.onchange = function() {
            const newState = this.checked;
            setViewedHistoryEnabled(newState);
            markViewedTitles(); // 立即应用
            addLog('阅读记忆：' + (newState ? '开启' : '关闭'));
        };

        // 将组件加入右侧容器
        rightContainer.appendChild(colorInputContainer);
        rightContainer.appendChild(historySwitch);

        historyRow.appendChild(historyLabel);
        historyRow.appendChild(rightContainer);
        content.appendChild(historyRow);

        // 3. 自动签到设置
        const signRow = document.createElement('div');
        signRow.style.display = 'flex';
        signRow.style.justifyContent = 'space-between';
        signRow.style.alignItems = 'center';

        const signLabel = document.createElement('label');
        signLabel.textContent = '自动签到';
        signLabel.style.fontWeight = '500';
        signLabel.style.color = '#555';

        const signRightContainer = document.createElement('div');
        signRightContainer.style.display = 'flex';
        signRightContainer.style.alignItems = 'center';
        signRightContainer.style.gap = '12px';

        // 模式选择容器
        const signModeContainer = document.createElement('div');
        signModeContainer.style.display = 'flex';
        signModeContainer.style.alignItems = 'center';
        signModeContainer.style.gap = '8px';
        signModeContainer.style.fontSize = '12px';
        signModeContainer.style.color = '#666';

        // 获取当前模式，默认为 fixed
        const currentSignMode = localStorage.getItem('nodeseek_sign_mode') || 'fixed';
        // 确保如果是第一次使用，也存入 fixed
        if (!localStorage.getItem('nodeseek_sign_mode')) {
             localStorage.setItem('nodeseek_sign_mode', 'fixed');
        }

        // 固定签到单选
        const fixedRadio = document.createElement('input');
        fixedRadio.type = 'radio';
        fixedRadio.name = 'sign-mode';
        fixedRadio.value = 'fixed';
        fixedRadio.checked = currentSignMode === 'fixed';
        fixedRadio.style.cursor = 'pointer';
        fixedRadio.onchange = function() {
            if (this.checked) {
                localStorage.setItem('nodeseek_sign_mode', 'fixed');
                if (window.NodeSeekClockIn && window.NodeSeekClockIn.setSignMode) {
                    window.NodeSeekClockIn.setSignMode('fixed');
                }
                addLog('签到模式：固定');
            }
        };

        const fixedLabel = document.createElement('label');
        fixedLabel.textContent = '固定';
        fixedLabel.style.cursor = 'pointer';
        fixedLabel.onclick = function() { fixedRadio.click(); };

        // 随机签到单选
        const randomRadio = document.createElement('input');
        randomRadio.type = 'radio';
        randomRadio.name = 'sign-mode';
        randomRadio.value = 'random';
        randomRadio.checked = currentSignMode === 'random';
        randomRadio.style.cursor = 'pointer';
        randomRadio.onchange = function() {
            if (this.checked) {
                localStorage.setItem('nodeseek_sign_mode', 'random');
                if (window.NodeSeekClockIn && window.NodeSeekClockIn.setSignMode) {
                    window.NodeSeekClockIn.setSignMode('random');
                }
                addLog('签到模式：随机');
            }
        };

        const randomLabel = document.createElement('label');
        randomLabel.textContent = '随机';
        randomLabel.style.cursor = 'pointer';
        randomLabel.onclick = function() { randomRadio.click(); };

        signModeContainer.appendChild(fixedRadio);
        signModeContainer.appendChild(fixedLabel);
        signModeContainer.appendChild(randomRadio);
        signModeContainer.appendChild(randomLabel);

        // 签到开关
        const signSwitch = document.createElement('input');
        signSwitch.type = 'checkbox';
        signSwitch.checked = localStorage.getItem('nodeseek_sign_enabled') === 'true';
        signSwitch.style.transform = 'scale(1.2)';
        signSwitch.onchange = function() {
            const newState = this.checked;
            localStorage.setItem('nodeseek_sign_enabled', newState.toString());
            addLog('自动签到：' + (newState ? '开启' : '关闭'));

            // 立即触发一次状态更新（如果是开启）
             if (newState && window.NodeSeekClockIn && window.NodeSeekClockIn.scheduleNextHourlySign) {
                 window.NodeSeekClockIn.scheduleNextHourlySign();
             }
        };

        signRightContainer.appendChild(signModeContainer);
        signRightContainer.appendChild(signSwitch);

        signRow.appendChild(signLabel);
        signRow.appendChild(signRightContainer);
        content.appendChild(signRow);

        // 新增：新标签页打开帖子开关
        const openPostNewTabRow = document.createElement('div');
        openPostNewTabRow.style.display = 'flex';
        openPostNewTabRow.style.justifyContent = 'space-between';
        openPostNewTabRow.style.alignItems = 'center';

        const openPostNewTabLabel = document.createElement('label');
        openPostNewTabLabel.textContent = '新标签页打开帖子';
        openPostNewTabLabel.style.fontWeight = '500';
        openPostNewTabLabel.style.color = '#555';

        const openPostNewTabSwitch = document.createElement('input');
        openPostNewTabSwitch.type = 'checkbox';
        openPostNewTabSwitch.checked = getOpenPostNewTabEnabled();
        openPostNewTabSwitch.style.transform = 'scale(1.2)';
        openPostNewTabSwitch.onchange = function() {
            const newState = this.checked;
            setOpenPostNewTabEnabled(newState);
            applyNewTabLinks(); // 立即应用
            addLog('新标签页打开帖子：' + (newState ? '开启' : '关闭'));
        };

        openPostNewTabRow.appendChild(openPostNewTabLabel);
        openPostNewTabRow.appendChild(openPostNewTabSwitch);
        content.appendChild(openPostNewTabRow);

        // 4. 跳过跳转页面开关 -> 改为 屏蔽URL跳转提醒
        const skipJumpRow = document.createElement('div');
        skipJumpRow.style.display = 'flex';
        skipJumpRow.style.justifyContent = 'space-between';
        skipJumpRow.style.alignItems = 'center';
        skipJumpRow.style.marginBottom = '12px';
        skipJumpRow.style.gap = '4px'; // 紧凑间距

        const skipJumpLabel = document.createElement('label');
        skipJumpLabel.textContent = '屏蔽URL跳转提醒';
        skipJumpLabel.style.fontWeight = '500';
        skipJumpLabel.style.color = '#555';
        skipJumpLabel.style.fontSize = '12px';
        skipJumpLabel.style.whiteSpace = 'nowrap';
        skipJumpLabel.style.overflow = 'hidden';
        skipJumpLabel.style.textOverflow = 'ellipsis';

        const skipJumpRightContainer = document.createElement('div');
        skipJumpRightContainer.style.display = 'flex';
        skipJumpRightContainer.style.alignItems = 'center';
        skipJumpRightContainer.style.gap = '6px';

        const modeSelect = document.createElement('select');
        modeSelect.style.fontSize = '12px';
        modeSelect.style.padding = '1px 2px';
        modeSelect.style.borderRadius = '4px';
        modeSelect.style.border = '1px solid #ddd';
        modeSelect.style.outline = 'none';
        modeSelect.style.cursor = 'pointer';
        modeSelect.style.width = '75px'; // 固定宽度更整齐

        const optAll = document.createElement('option');
        optAll.value = 'all';
        optAll.textContent = '全放行';
        const optWhite = document.createElement('option');
        optWhite.value = 'whitelist';
        optWhite.textContent = '白名单';

        modeSelect.appendChild(optAll);
        modeSelect.appendChild(optWhite);
        modeSelect.value = getSkipJumpMode();

        const configBtn = document.createElement('button');
        configBtn.textContent = '编辑';
        configBtn.style.fontSize = '12px';
        configBtn.style.padding = '2px 6px';
        configBtn.style.background = '#1890ff';
        configBtn.style.color = '#fff';
        configBtn.style.border = 'none';
        configBtn.style.borderRadius = '4px';
        configBtn.style.cursor = 'pointer';
        configBtn.style.whiteSpace = 'nowrap';
        configBtn.title = '管理白名单域名';
        configBtn.onclick = function() {
            showJumpListDialog();
        };

        // 更新设置按钮状态的函数
        const updateConfigBtnStatus = () => {
            if (modeSelect.value === 'whitelist') {
                configBtn.disabled = false;
                configBtn.style.opacity = '1';
                configBtn.style.cursor = 'pointer';
                configBtn.style.background = '#1890ff';
            } else {
                configBtn.disabled = true;
                configBtn.style.opacity = '0.5';
                configBtn.style.cursor = 'not-allowed';
                configBtn.style.background = '#ccc';
            }
        };

        // 初始化按钮状态
        updateConfigBtnStatus();

        modeSelect.onchange = function() {
             setSkipJumpMode(this.value);
             updateConfigBtnStatus();
             addLog('屏蔽URL跳转提醒模式：' + (this.value === 'whitelist' ? '白名单' : '全放行'));

             // 立即应用模式更改
             if (getSkipJumpPageEnabled()) {
                 // 切换模式前先恢复所有链接，确保逻辑干净
                 restoreJumpLinks();
                 // 再按新模式重写
                 rewriteJumpLinks();
             } else {
                 restoreJumpLinks();
             }
         };

        const skipJumpSwitch = document.createElement('input');
        skipJumpSwitch.type = 'checkbox';
        skipJumpSwitch.checked = getSkipJumpPageEnabled();
        skipJumpSwitch.style.transform = 'scale(1.1)';
        skipJumpSwitch.onchange = function() {
            const newState = this.checked;
            setSkipJumpPageEnabled(newState);
            addLog('屏蔽URL跳转提醒：' + (newState ? '开启' : '关闭'));
            if (newState) {
                rewriteJumpLinks(); // 立即尝试重写当前页面的链接
            } else {
                restoreJumpLinks(); // 立即恢复原始链接
            }
        };

        skipJumpRightContainer.appendChild(modeSelect);
        skipJumpRightContainer.appendChild(configBtn);
        skipJumpRightContainer.appendChild(skipJumpSwitch);

        skipJumpRow.appendChild(skipJumpLabel);
        skipJumpRow.appendChild(skipJumpRightContainer);
        content.appendChild(skipJumpRow);

        const UPDATE_POST_URL = 'https://www.nodeseek.com/post-364796-1';
        const versionRow = document.createElement('div');
        versionRow.style.display = 'flex';
        versionRow.style.justifyContent = 'space-between';
        versionRow.style.alignItems = 'center';
        versionRow.style.flexWrap = 'wrap';
        versionRow.style.gap = '8px';
        versionRow.style.paddingTop = '10px';
        versionRow.style.borderTop = '1px solid #eee';
        versionRow.style.marginTop = '2px';

        let scriptVersionText = '—';
        try {
            if (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version != null) {
                const v = String(GM_info.script.version).trim();
                if (v) scriptVersionText = v;
            }
        } catch (e) { /* ignore */ }

        const versionLabel = document.createElement('span');
        versionLabel.textContent = '当前版本：' + scriptVersionText;
        versionLabel.style.fontWeight = '500';
        versionLabel.style.color = '#555';
        versionLabel.style.fontSize = '13px';

        const updateLink = document.createElement('a');
        updateLink.href = UPDATE_POST_URL;
        updateLink.textContent = '更新链接';
        updateLink.target = '_blank';
        updateLink.rel = 'noopener noreferrer';
        updateLink.style.fontSize = '13px';
        updateLink.style.color = '#1890ff';
        updateLink.style.cursor = 'pointer';
        updateLink.style.textDecoration = 'underline';
        updateLink.title = UPDATE_POST_URL;

        versionRow.appendChild(versionLabel);
        versionRow.appendChild(updateLink);
        content.appendChild(versionRow);

        dialog.appendChild(content);
        document.body.appendChild(dialog);
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

    function ensureBlacklistNavEntryAndMeta(force = false) {
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
        if (!force && minInterval && (now - lastCheckAt) < minInterval) return;
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

    function rewriteJumpLinks() {
        if (!getSkipJumpPageEnabled()) return;

        const mode = getSkipJumpMode();
        const list = getSkipJumpList();

        document.querySelectorAll('a[href*="/jump?to="]').forEach(link => {
            try {
                if (link.href.includes('/jump?to=')) {
                    const url = new URL(link.href);
                    const target = url.searchParams.get('to');
                    if (target) {
                        const targetUrlStr = decodeURIComponent(target);
                        let targetDomain = '';
                        try {
                            targetDomain = new URL(targetUrlStr).hostname;
                        } catch (e) { }

                        let shouldSkip = true;
                        if (mode === 'whitelist') {
                            // 如果是白名单模式，且名单为空，则不跳过（即显示跳转提醒）
                            if (list.length === 0) {
                                shouldSkip = false;
                            } else {
                                // 仅匹配域名本身或其子域名
                                shouldSkip = list.some(domain => targetDomain === domain || targetDomain.endsWith('.' + domain));
                            }
                        }

                        if (shouldSkip) {
                            // 保存原始链接以便恢复
                            if (!link.getAttribute('data-ns-jump-url')) {
                                link.setAttribute('data-ns-jump-url', link.href);
                            }
                            link.href = targetUrlStr;
                            if (!link.target) link.target = '_blank';
                            link.rel = 'noopener noreferrer';
                        } else {
                            // 如果不应该跳过，但之前可能被重写过，则恢复
                            const originalUrl = link.getAttribute('data-ns-jump-url');
                            if (originalUrl) {
                                link.href = originalUrl;
                                link.removeAttribute('data-ns-jump-url');
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('Error rewriting jump link', e);
            }
        });
    }

    function restoreJumpLinks() {
        document.querySelectorAll('a[data-ns-jump-url]').forEach(link => {
            try {
                const originalUrl = link.getAttribute('data-ns-jump-url');
                if (originalUrl) {
                    link.href = originalUrl;
                    link.removeAttribute('data-ns-jump-url');
                    // 可选：如果需要恢复 target/rel 属性，可以在这里处理
                    // 但通常外部链接保持 _blank 是合适的，所以这里只恢复 href
                }
            } catch (e) {
                console.error('Error restoring jump link', e);
            }
        });
    }

    let nsBlacklistNavTimer = null;
    function scheduleEnsureBlacklistNav() {
        if (nsBlacklistNavTimer) return;
        nsBlacklistNavTimer = setTimeout(() => {
            nsBlacklistNavTimer = null;
            ensureBlacklistNavEntryAndMeta();
            rewriteJumpLinks();
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
