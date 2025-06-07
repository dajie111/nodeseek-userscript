// ==UserScript==
// @name         NodeSeek Register Backend
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Backend functions for NodeSeek Blacklist plugin (e.g., auto-sign-in)
// @author       YourName
// @match        https://www.nodeseek.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 定义一个引用 addLog 的函数，以便在 Register.js 中调用
    let _addLog = console.log; // 默认使用 console.log

    // 用于从外部设置 addLog 函数的引用
    function setAddLogFunction(func) {
        _addLog = func;
    }

    // ========== 新增：获取页面主内容文本，排除日志和弹窗区域 ==========
    function getPageMainText() {
        // 克隆 body
        const bodyClone = document.body.cloneNode(true);
        // 移除日志、黑名单、好友、收藏等弹窗
        const dialogs = bodyClone.querySelectorAll('#logs-dialog, #blacklist-dialog, #friends-dialog, #favorites-dialog, #chicken-leg-stats-dialog'); // 增加对鸡腿统计弹窗的排除
        dialogs.forEach(d => d.remove());
        return bodyClone.textContent || '';
    }

    // 新版自动签到功能
    function startSignInTimer() {
        // 立即检测当前页面状态 - 如果是未登录页面，立即禁用签到功能
        function checkLoginState() {
            const loginBtn = document.querySelector('button, a, input[type="button"], div')?.textContent?.includes('登录');
            const registerBtn = document.querySelector('button, a, input[type="button"], div')?.textContent?.includes('注册');
            const strangerText = getPageMainText().includes('你好啊，陌生人');
            const newcomerText = getPageMainText().includes('我的朋友，看起来你是新来的');

            // 如果未登录或登录相关页面
            if ((strangerText && newcomerText) ||
                (loginBtn && registerBtn) ||
                (strangerText && loginBtn)) {

                // 立即关闭签到功能
                localStorage.setItem('nodeseek_sign_enabled', 'false');
                _addLog('启动时检测到未登录状态，自动签到已禁用');

                // 更新签到按钮
                const signInBtn = document.getElementById('sign-in-btn');
                if (signInBtn) {
                    signInBtn.textContent = '开启签到';
                    signInBtn.style.background = '#4CAF50'; // 绿色表示可以开启
                }

                return true; // 检测到未登录状态
            }

            // 判断登录后签到关键词只在board页面(签到页面)检测
            const isInBoardPage = window.location.href.includes('/board');
            const loginToSignText = getPageMainText();

            if (isInBoardPage && loginToSignText.includes('登录后签到')) {
                // 立即关闭签到功能
                localStorage.setItem('nodeseek_sign_enabled', 'false');
                _addLog('启动时检测到"登录后签到"文字，自动签到已禁用');

                // 更新签到按钮
                const signInBtn = document.getElementById('sign-in-btn');
                if (signInBtn) {
                    signInBtn.textContent = '开启签到';
                    signInBtn.style.background = '#4CAF50'; // 绿色表示可以开启
                }

                return true; // 检测到未登录状态
            }

            return false; // 未检测到未登录状态
        }

        // 启动时立即检测登录状态
        if (checkLoginState()) {
            return; // 如果检测到未登录状态，终止启动签到计时器
        }

        // 多页面协调相关常量
        const SIGN_ACTIVE_PAGE_KEY = 'nodeseek_sign_active_page';
        const SIGN_LAST_ACTIVE_TIME_KEY = 'nodeseek_sign_last_active_time';
        const SIGN_LAST_SIGN_TIME_KEY = 'nodeseek_sign_last_sign_time';
        const PAGE_ACTIVE_INTERVAL = 3000; // 3秒心跳检查
        const PAGE_EXPIRY_TIME = 5000; // 5秒过期时间

        // 创建唯一的页面ID
        const pageId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        let isActivePage = false;
        let timerRunning = false;
        let intervalId = null;

        // 获取当前时间
        function getCurrentTime() {
            return new Date();
        }

        // 检查是否是活跃页面
        function checkActiveStatus() {
            const now = Date.now();
            const lastActiveTime = parseInt(localStorage.getItem(SIGN_LAST_ACTIVE_TIME_KEY) || '0');
            const currentActivePage = localStorage.getItem(SIGN_ACTIVE_PAGE_KEY);

            // 自动获取控制权：只要是当前页面，就获取控制权（刷新的页面会立即获取控制权）
            // 更新心跳时间和活跃页面ID
            localStorage.setItem(SIGN_LAST_ACTIVE_TIME_KEY, now.toString());
            localStorage.setItem(SIGN_ACTIVE_PAGE_KEY, pageId);

            if (!isActivePage) {
                isActivePage = true;
                console.log('获得签到控制权，当前页面将负责定时签到');
                // _addLog('此页面获得签到控制权'); // 已按需删除

                // 如果计时器还没有运行，启动它
                if (!timerRunning) {
                    startCheckingTime();
                }
            }
            return true;
        }

        // 设置心跳更新
        const heartbeatId = setInterval(() => {
            if (localStorage.getItem('nodeseek_sign_enabled') !== 'true') {
                clearInterval(heartbeatId);
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                    timerRunning = false;
                }
                return;
            }

            const currentActivePage = localStorage.getItem(SIGN_ACTIVE_PAGE_KEY);
            const lastActiveTime = parseInt(localStorage.getItem(SIGN_LAST_ACTIVE_TIME_KEY) || '0');
            const now = Date.now();

            // 日志输出当前页面ID和活跃页面ID，方便排查
            // _addLog(`当前页面ID: ${pageId}，活跃页面ID: ${currentActivePage}，心跳: ${now - lastActiveTime}ms`);

            // 如果没有活跃页面，或活跃页面心跳超时，当前页面直接争夺控制权
            if (!currentActivePage || now - lastActiveTime > PAGE_EXPIRY_TIME) {
                localStorage.setItem(SIGN_ACTIVE_PAGE_KEY, pageId);
                localStorage.setItem(SIGN_LAST_ACTIVE_TIME_KEY, now.toString());
                if (!isActivePage) {
                    isActivePage = true;
                    if (!timerRunning) {
                        startCheckingTime();
                    }
                    _addLog('检测到无活跃页面或原活跃页面失效，当前页面强制获得签到控制权');
                }
                return;
            }

            if (currentActivePage === pageId) {
                localStorage.setItem(SIGN_LAST_ACTIVE_TIME_KEY, now.toString());
                if (!isActivePage) {
                    isActivePage = true;
                    if (!timerRunning) {
                        startCheckingTime();
                    }
                }
            } else {
                if (isActivePage) {
                    isActivePage = false;
                    console.log('检测到其他页面已刷新并获得签到控制权');
                }
            }
        }, PAGE_ACTIVE_INTERVAL);

        // 页面关闭时清理
        window.addEventListener('beforeunload', () => {
            clearInterval(heartbeatId);
            if (intervalId) {
                clearInterval(intervalId);
            }

            // 如果是当前活跃页面，清除活跃页面ID
            if (isActivePage) {
                if (localStorage.getItem(SIGN_ACTIVE_PAGE_KEY) === pageId) {
                    localStorage.removeItem(SIGN_ACTIVE_PAGE_KEY);
                }
            }
        });

        // 启动倒计时检查
        function startCheckingTime() {
            if (timerRunning) return;

            let lastLogTime = 0;
            timerRunning = true;

            intervalId = setInterval(() => {
                // 如果不再是活跃页面，不执行操作
                if (!isActivePage) return;

                const now = getCurrentTime();
                const h = now.getHours();
                const m = now.getMinutes();
                const s = now.getSeconds();

                // 检查是否在规定时间内（00:00:00 - 01:00:00）
                if (h === 0) {
                    // 生成今日标记key
                    const todayKey = 'nodeseek_sign_board_jumped_' + now.getFullYear() + '-' + (now.getMonth()+1) + '-' + now.getDate();
                    // 检查是否已在本小时内签到过
                    const lastSignTime = localStorage.getItem(SIGN_LAST_SIGN_TIME_KEY);
                    let signedThisHour = false;
                    if (lastSignTime) {
                        const lastSignDate = new Date(parseInt(lastSignTime));
                        if (
                            lastSignDate.getFullYear() === now.getFullYear() &&
                            lastSignDate.getMonth() === now.getMonth() &&
                            lastSignDate.getDate() === now.getDate() &&
                            lastSignDate.getHours() === now.getHours()
                        ) {
                            signedThisHour = true;
                        }
                    }
                    // 检查是否跳转过签到页
                    const jumped = localStorage.getItem(todayKey) === 'true';
                    if (signedThisHour && jumped) {
                        // 已签到且已跳转过，不再执行
                        return;
                    }
                    if (!jumped) {
                        _addLog('本小时内尚未跳转过签到页，继续尝试签到');
                    }
                    // 记录当前签到时间
                    localStorage.setItem(SIGN_LAST_SIGN_TIME_KEY, now.getTime().toString());
                    // 执行签到
                    doSignIn(todayKey);
                } else {
                    // 非签到时间段，重置跳转标记
                    const todayKey = 'nodeseek_sign_board_jumped_' + now.getFullYear() + '-' + (now.getMonth()+1) + '-' + now.getDate();
                    localStorage.removeItem(todayKey);
                }
            }, 1000);
        }

        // 立即检查控制权
        checkActiveStatus();

        // ========== 页面激活自动重启定时器 + 日志提醒 ==========
        if (!window.__nodeseek_sign_visibility_listener_added) {
            document.addEventListener('visibilitychange', function() {
                if (document.visibilityState === 'visible') {
                    if (!timerRunning) {
                        _addLog('页面重新激活，自动重启签到定时器');
                        startCheckingTime();
                    }
                }
            });
            window.__nodeseek_sign_visibility_listener_added = true;
        }
    }

    // 签到流程
    function doSignIn(todayKey) {
        // 用户未登录检测 - 更强的检测方式
        // 1. 首先，直接检查DOM元素
        const loginBtn = document.querySelector('button, a, input[type="button"], div')?.textContent?.includes('登录');
        const registerBtn = document.querySelector('button, a, input[type="button"], div')?.textContent?.includes('注册');
        const strangerText = getPageMainText().includes('你好啊，陌生人');
        const newcomerText = getPageMainText().includes('我的朋友，看起来你是新来的');

        // 2. 创建一个立即停止签到的函数，以在任何条件满足时调用
        function forceStopSignIn(reason) {
            // 立即关闭签到功能
            localStorage.setItem('nodeseek_sign_enabled', 'false');
            // 记录关闭原因
            _addLog(`自动签到已关闭: ${reason}`);

            // 更新签到按钮状态（如果存在）
            const signInBtn = document.getElementById('sign-in-btn');
            if (signInBtn) {
                signInBtn.textContent = '开启签到';
                signInBtn.style.background = '#4CAF50'; // 绿色表示可以开启
            }

            // 清除签到进程标记
            localStorage.removeItem('nodeseek_sign_in_progress');
            return; // 中止签到流程
        }

        // 检查各种情况
        if ((strangerText && newcomerText) ||
            (loginBtn && registerBtn) ||
            (strangerText && loginBtn)) {
            return forceStopSignIn("检测到未登录状态");
        }

        // 判断登录后签到关键词只在board页面(签到页面)检测
        const isInBoardPage = window.location.href.includes('/board');
        const loginToSignText = getPageMainText();

        if (isInBoardPage && loginToSignText.includes('登录后签到')) {
            return forceStopSignIn("检测到'登录后签到'文字");
        }

        // 如果通过了所有检测，继续签到流程

        // 直接在当前页面导航到签到页面
        _addLog('跳转到签到页面');
        if (todayKey) {
            localStorage.setItem(todayKey, 'true');
        }
        window.location.href = 'https://www.nodeseek.com/board';

        // 设置标记表明正在签到中
        localStorage.setItem('nodeseek_sign_in_progress', 'true');
    }

    // 签到流程检查函数
    function checkSignInProcess() {
        // 判断是否在签到流程中
        if (localStorage.getItem('nodeseek_sign_in_progress') !== 'true') {
            return; // 不在签到流程中，直接返回
        }

        // 用户未登录检测 - 更强的检测方式
        // 1. 首先，直接检查DOM元素
        const loginBtn = document.querySelector('button, a, input[type="button"], div')?.textContent?.includes('登录');
        const registerBtn = document.querySelector('button, a, input[type="button"], div')?.textContent?.includes('注册');
        const strangerText = getPageMainText().includes('你好啊，陌生人');
        const newcomerText = getPageMainText().includes('我的朋友，看起来你是新来的');

        // 2. 创建一个立即停止签到的函数，以在任何条件满足时调用
        function forceStopSignIn(reason) {
            // 立即关闭签到功能
            localStorage.setItem('nodeseek_sign_enabled', 'false');
            // 记录关闭原因
            _addLog(`签到流程中: 自动签到已关闭: ${reason}`);

            // 更新签到按钮状态（如果存在）
            const signInBtn = document.getElementById('sign-in-btn');
            if (signInBtn) {
                signInBtn.textContent = '开启签到';
                signInBtn.style.background = '#4CAF50'; // 绿色表示可以开启
            }

            // 清除签到流程状态
            localStorage.removeItem('nodeseek_sign_in_progress');
            return true; // 表示已处理
        }

        // 检查各种情况
        if ((strangerText && newcomerText) ||
            (loginBtn && registerBtn) ||
            (strangerText && loginBtn)) {
            return forceStopSignIn("检测到未登录状态");
        }

        // 判断登录后签到关键词只在board页面(签到页面)检测
        const isInBoardPage = window.location.href.includes('/board');
        const loginToSignText = getPageMainText();

        if (isInBoardPage && loginToSignText.includes('登录后签到')) {
            return forceStopSignIn("检测到'登录后签到'文字");
        }

        // 检查当前是否在签到页面
        if (isInBoardPage) {
            setTimeout(function() {
                // 检查是否已经签到
                if (getPageMainText().includes('今日签到获得鸡腿')) {
                    if (localStorage.getItem('nodeseek_sign_in_progress') === 'true') {
                        _addLog('检测到已签到，返回上一页');
                        localStorage.removeItem('nodeseek_sign_in_progress');
                        window.history.back();
                    }
                    return;
                }

                // 找到并点击"试试手气"按钮
                function tryFindAndClickLuckButton() {
                    const allButtons = document.querySelectorAll('button');
                    let luckButton = null;

                    for (let i = 0; i < allButtons.length; i++) {
                        const buttonText = allButtons[i].textContent.trim();
                        if (buttonText.includes('试试手气')) {
                            luckButton = allButtons[i];
                            break;
                        }
                    }

                    if (luckButton) {
                        // 点击"试试手气"按钮
                        _addLog('找到"试试手气"按钮，点击执行签到');
                        luckButton.click();

                        // 等待签到完成后返回
                        setTimeout(function() {
                            // 清除签到流程状态
                            localStorage.removeItem('nodeseek_sign_in_progress');

                            _addLog('签到完成，返回上一页');
                            // 使用浏览器的后退功能
                            window.history.back();
                        }, 1000);

                        return true;
                    }
                    return false;
                }

                // 首次尝试查找并点击按钮
                if (!tryFindAndClickLuckButton()) {
                    // 设置观察器持续观察页面变化
                    const observer = new MutationObserver(() => {
                        if (tryFindAndClickLuckButton()) {
                            observer.disconnect();
                        }
                    });

                    // 开始观察页面变化
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });

                    // 设置5秒超时，防止无限等待
                    setTimeout(() => {
                        observer.disconnect();
                        if (localStorage.getItem('nodeseek_sign_in_progress') === 'true') {
                            _addLog('未找到"试试手气"按钮，签到超时返回');
                            // 清除签到流程状态
                            localStorage.removeItem('nodeseek_sign_in_progress');
                            // 返回上一页
                            window.history.back();
                        }
                    }, 5000); // 5秒超时
                }
            }, 500);
        }
    }

    // ========== 鸡腿统计功能 ==========
    let chickenLegTimeoutId = null;
    const CHICKEN_LEG_MIN_INTERVAL = 30; // 秒
    const CHICKEN_LEG_MAX_INTERVAL = 50; // 秒
    const CHICKEN_LEG_LAST_FETCH_KEY = 'nodeseek_chicken_leg_last_fetch';
    const CHICKEN_LEG_NEXT_ALLOW_KEY = 'nodeseek_chicken_leg_next_allow';
    const CHICKEN_LEG_LAST_HTML_KEY = 'nodeseek_chicken_leg_last_html';
    const CHICKEN_LEG_HISTORY_KEY = 'nodeseek_chicken_leg_history';

    function showChickenLegStatsDialog() {
        const dialogId = 'chicken-leg-stats-dialog';
        const existingDialog = document.getElementById(dialogId);
        if (existingDialog) {
            existingDialog.remove();
            if (chickenLegTimeoutId) {
                clearTimeout(chickenLegTimeoutId);
                chickenLegTimeoutId = null;
            }
            return;
        }

        const dialog = document.createElement('div');
        dialog.id = dialogId;
        dialog.style.position = 'fixed';
        dialog.style.zIndex = 10000;
        dialog.style.background = '#fff';
        dialog.style.border = '1px solid #ccc';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        dialog.style.padding = '0 20px 12px 20px';
        if (window.innerWidth > 767) {
            dialog.style.width = '600px';
        }
        dialog.style.maxHeight = '80vh';
        dialog.style.overflowY = 'auto';

        // 居中显示弹窗，且避免与其他弹窗重叠
        // 检查是否有其他居中弹窗（如日志弹窗）
        let initialTopPercent = 50;
        if (document.getElementById('logs-dialog')) {
            initialTopPercent = 55; // 如果有日志弹窗，稍微下移
        }
        dialog.style.left = '50%';
        dialog.style.top = initialTopPercent + '%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.right = 'auto';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.paddingBottom = '10px';
        header.style.alignItems = 'center';
        header.style.height = '32px';
        header.style.fontWeight = 'bold';
        header.style.fontSize = '16px';
        header.style.paddingLeft = '2px';
        header.style.background = '#fff';
        header.style.borderBottom = '1px solid #eee';
        header.style.position = 'sticky';
        header.style.top = '0';
        header.style.zIndex = '10';

        const title = document.createElement('div');
        title.textContent = '鸡腿统计';
        title.style.marginTop = '4px'; // 向下移动4px

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.position = 'absolute';
        closeBtn.style.right = '12px';
        closeBtn.style.top = '8px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '20px';
        closeBtn.className = 'close-btn';
        closeBtn.onclick = function() {
            dialog.remove();
            if (chickenLegTimeoutId) {
                clearTimeout(chickenLegTimeoutId);
                chickenLegTimeoutId = null;
            }
        };

        header.appendChild(title);
        header.appendChild(closeBtn);
        dialog.appendChild(header);

        // 左上角30x30像素拖动区域（position: fixed，动态定位于弹窗左上角）
        const dragCorner = document.createElement('div');
        dragCorner.style.position = 'fixed';
        dragCorner.style.width = '30px';
        dragCorner.style.height = '30px';
        dragCorner.style.cursor = 'move';
        dragCorner.title = '拖动';
        dragCorner.style.zIndex = '10002';
        // dragCorner.style.background = 'rgba(0,0,0,0.08)'; // 可选：调试时可加背景
        document.body.appendChild(dragCorner); // 作为body直接子元素

        // 动态定位dragCorner到dialog左上角
        function updateDragCornerPosition() {
            const rect = dialog.getBoundingClientRect();
            dragCorner.style.left = rect.left + 'px';
            dragCorner.style.top = rect.top + 'px';
        }
        // 保证弹窗一打开就立即同步dragCorner位置
        setTimeout(updateDragCornerPosition, 0);
        // 监听窗口resize和滚动
        window.addEventListener('resize', updateDragCornerPosition);
        window.addEventListener('scroll', updateDragCornerPosition, true);
        // 监听弹窗内容滚动
        dialog.addEventListener('scroll', updateDragCornerPosition);

        // 在弹窗移动后也要更新dragCorner位置
        function makeDraggableByCorner(dialog, dragArea) {
            let isDragging = false;
            let initialMouseX, initialMouseY;
            let initialDialogX, initialDialogY;

            dragArea.addEventListener('mousedown', function(e) {
                isDragging = true;
                initialMouseX = e.clientX;
                initialMouseY = e.clientY;
                const rect = dialog.getBoundingClientRect();
                dialog.style.transform = '';
                dialog.style.left = rect.left + 'px';
                dialog.style.top = rect.top + 'px';
                dialog.style.right = 'auto';
                initialDialogX = rect.left;
                initialDialogY = rect.top;
                document.body.classList.add('dragging-active');
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                e.preventDefault();
            });

            function onMouseMove(e) {
                if (!isDragging) return;
                const dx = e.clientX - initialMouseX;
                const dy = e.clientY - initialMouseY;
                dialog.style.left = (initialDialogX + dx) + 'px';
                dialog.style.top = (initialDialogY + dy) + 'px';
                dialog.style.right = 'auto';
                updateDragCornerPosition(); // 拖动时同步更新dragCorner位置
            }

            function onMouseUp() {
                isDragging = false;
                document.body.classList.remove('dragging-active');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            dragArea.addEventListener('mouseenter', function() {
                dragArea.style.cursor = 'move';
            });
            dragArea.addEventListener('mouseleave', function() {
                dragArea.style.cursor = 'default';
            });
        }
        makeDraggableByCorner(dialog, dragCorner);
        // 保证每次弹窗显示后都同步一次dragCorner位置
        setTimeout(updateDragCornerPosition, 100);

        const contentArea = document.createElement('div');
        contentArea.style.background = '#fff';
        contentArea.style.padding = '0';
        contentArea.style.borderRadius = '4px';
        contentArea.style.maxHeight = '60vh';
        contentArea.style.overflowY = 'auto';
        dialog.appendChild(contentArea);

        // ========== 区间筛选UI ==========
        const filterBar = document.createElement('div');
        filterBar.style.display = 'flex';
        filterBar.style.alignItems = 'center';
        filterBar.style.margin = '10px 0 10px 0';

        // 拉取区间数据按钮和进度
        const fetchRangeBtn = document.createElement('button');
        fetchRangeBtn.innerHTML = '拉取<br>数据'; // 上下两行显示
        fetchRangeBtn.style.padding = '8px 12px'; // Adjusted padding for buttons
        fetchRangeBtn.style.fontSize = '14px';
        fetchRangeBtn.style.background = '#28a745';
        fetchRangeBtn.style.color = 'white';
        fetchRangeBtn.style.border = 'none';
        fetchRangeBtn.style.borderRadius = '3px';
        fetchRangeBtn.style.cursor = 'pointer';
        fetchRangeBtn.style.textAlign = 'center';
        fetchRangeBtn.style.lineHeight = '1.1';
        const fetchRangeStatus = document.createElement('span');
        fetchRangeStatus.style.marginLeft = '10px'; // Keep this style for now
        fetchRangeStatus.style.color = '#d00';

        // Function to update the fetch button's state and countdown
        function updateFetchButtonState() {
            const nextAllowTime = parseInt(localStorage.getItem(CHICKEN_LEG_NEXT_ALLOW_KEY) || '0');
            const now = Date.now();

            if (now < nextAllowTime) {
                fetchRangeBtn.disabled = true;
                let remainingSeconds = Math.ceil((nextAllowTime - now) / 1000);
                fetchRangeStatus.textContent = `请等待 ${remainingSeconds} 秒后再次拉取`;
                // Set a timeout to update the countdown
                if (chickenLegTimeoutId) clearTimeout(chickenLegTimeoutId); // Clear previous timeout
                chickenLegTimeoutId = setTimeout(updateFetchButtonState, 1000); // Update every second
            } else {
                fetchRangeBtn.disabled = false;
                fetchRangeStatus.textContent = '';
                if (chickenLegTimeoutId) {
                    clearTimeout(chickenLegTimeoutId);
                    chickenLegTimeoutId = null;
                }
            }
        }

        // Initial update when the dialog opens
        updateFetchButtonState();

        // 清除本地数据按钮
        const clearBtn = document.createElement('button');
        clearBtn.innerHTML = '清除<br>数据'; // 上下两行显示
        clearBtn.style.padding = '8px 12px'; // Adjusted padding for buttons
        clearBtn.style.fontSize = '14px';
        clearBtn.style.background = '#f44336';
        clearBtn.style.color = 'white';
        clearBtn.style.border = 'none';
        clearBtn.style.borderRadius = '3px';
        clearBtn.style.cursor = 'pointer';
        clearBtn.style.textAlign = 'center';
        clearBtn.style.lineHeight = '1.1';

        const startInput = document.createElement('input');
        startInput.type = 'date';
        startInput.style.padding = '6px 6px'; // Adjusted padding for inputs
        startInput.style.fontSize = '14px';
        startInput.style.border = '1px solid #ccc';
        startInput.style.borderRadius = '3px';
        startInput.title = '起始日期';

        const endInput = document.createElement('input');
        endInput.type = 'date';
        endInput.style.padding = '6px 6px'; // Adjusted padding for inputs
        endInput.style.fontSize = '14px';
        endInput.style.border = '1px solid #ccc';
        endInput.style.borderRadius = '3px';
        endInput.title = '结束日期';
        // 默认填写当前日期
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        endInput.value = `${year}-${month}-${day}`;

        // 默认填写起始日期为结束日期减去一年
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        const startYear = oneYearAgo.getFullYear();
        const startMonth = String(oneYearAgo.getMonth() + 1).padStart(2, '0');
        const startDay = String(oneYearAgo.getDate()).padStart(2, '0');
        startInput.value = `${startYear}-${startMonth}-${startDay}`;

        // Create a wrapper for fetch and clear buttons
        const buttonsWrapper = document.createElement('div');
        buttonsWrapper.style.display = 'flex';
        buttonsWrapper.style.gap = '8px';
        buttonsWrapper.style.marginRight = '20px'; // Add margin to separate from date inputs
        buttonsWrapper.appendChild(fetchRangeBtn);
        buttonsWrapper.appendChild(clearBtn);

        // Create a wrapper for '起始日期' and startInput
        const startDateWrapper = document.createElement('div');
        startDateWrapper.style.display = 'flex';
        startDateWrapper.style.alignItems = 'center';
        startDateWrapper.style.gap = '4px';
        startDateWrapper.style.marginRight = '12px'; // Smaller margin to separate from end date
        startDateWrapper.style.marginLeft = '-7px'; // 向左移动7px
        const startDateLabel = document.createElement('span'); // Use span for text node
        startDateLabel.textContent = '起始日期:';
        startDateLabel.style.whiteSpace = 'nowrap'; // Prevent wrapping
        startDateWrapper.appendChild(startDateLabel);
        startDateWrapper.appendChild(startInput);

        // Create a wrapper for '结束日期' and endInput
        const endDateWrapper = document.createElement('div');
        endDateWrapper.style.display = 'flex';
        endDateWrapper.style.alignItems = 'center';
        endDateWrapper.style.gap = '4px';
        endDateWrapper.style.marginLeft = '-7px'; // 向左移动7px
        const endDateLabel = document.createElement('span'); // Use span for text node
        endDateLabel.textContent = '结束日期:';
        endDateLabel.style.whiteSpace = 'nowrap'; // Prevent wrapping
        endDateWrapper.appendChild(endDateLabel);
        endDateWrapper.appendChild(endInput);

        filterBar.appendChild(buttonsWrapper);
        filterBar.appendChild(startDateWrapper);
        filterBar.appendChild(endDateWrapper);
        // 重新引入筛选按钮
        const filterBtn = document.createElement('button');
        filterBtn.textContent = '筛选';
        filterBtn.style.padding = '8px 12px'; // Adjusted padding for buttons
        filterBtn.style.fontSize = '14px';
        filterBtn.style.background = '#007bff'; // 蓝色
        filterBtn.style.color = 'white';
        filterBtn.style.border = 'none';
        filterBtn.style.borderRadius = '3px';
        filterBtn.style.cursor = 'pointer';
        filterBtn.style.marginLeft = 'auto'; // Push to the right
        filterBar.appendChild(filterBtn);

        dialog.appendChild(filterBar);

        // New: Status message container, placed below filterBar
        const fetchStatusContainer = document.createElement('div');
        fetchStatusContainer.style.margin = '8px 0';
        fetchStatusContainer.style.fontSize = '13px';
        fetchStatusContainer.style.textAlign = 'center';
        fetchStatusContainer.appendChild(fetchRangeStatus); // Move status span here
        dialog.appendChild(fetchStatusContainer);

        // ========== 统计信息区 ==========
        const statsDiv = document.createElement('div');
        statsDiv.style.margin = '8px 0 8px 0';
        statsDiv.style.fontSize = '14px';
        statsDiv.style.fontWeight = 'bold';
        dialog.appendChild(statsDiv);

        // ========== 渲染表格和统计 ==========
        function renderTableAndStats(dataArr) {
            // 分类统计
            let beTouw = 0, beTouwCount = 0;
            let touw = 0, touwCount = 0;
            const reasonMap = new Map();
            // 新增：签到天数统计
            const signDaysSet = new Set();
            dataArr.forEach(item => {
                let reason = item[2] || '未知';
                const change = Number(item[0]);
                // 签到天数统计
                if (reason.includes('签到收益')) {
                    // 取日期部分
                    let dateStr = String(item[3]).trim();
                    let d = null;
                    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                        dateStr = dateStr.replace(' ', 'T') + 'Z';
                        d = new Date(dateStr);
                    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                        dateStr = dateStr + 'Z';
                        d = new Date(dateStr);
                    } else {
                        d = new Date(dateStr);
                    }
                    if (!isNaN(d.getTime())) {
                        const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        signDaysSet.add(dayStr);
                    }
                }
                // 分开统计投喂鸡腿
                if (reason.includes('投喂鸡腿')) {
                    if (reason.includes('被') && change > 0) {
                        beTouw += change;
                        beTouwCount += 1;
                        return;
                    } else if (!reason.includes('被') && change < 0) {
                        touw += change;
                        touwCount += 1;
                        return;
                    }
                }
                // 其他理由正常统计
                if (!reasonMap.has(reason)) {
                    reasonMap.set(reason, { total: 0, count: 0 });
                }
                reasonMap.get(reason).total += change;
                reasonMap.get(reason).count += 1;
            });
            // 提取签到收益N个鸡腿，排序
            const signInReasons = [];
            const otherReasons = [];
            reasonMap.forEach((v, k) => {
                const match = k.match(/^签到收益(\d+)个鸡腿$/);
                if (match) {
                    signInReasons.push({ reason: k, n: parseInt(match[1]), ...v });
                } else {
                    otherReasons.push({ reason: k, ...v });
                }
            });
            signInReasons.sort((a, b) => a.n - b.n);
            // 美化输出为表格
            let reasonStats = '<div style="margin-bottom:8px;font-weight:bold;">分类统计：</div>';
            // 新增：签到天数统计展示
            // 统计连续签到天数和最长连续天数
            let currentStreak = 0, maxStreak = 0;
            if (signDaysSet.size > 0) {
                // 转为排序数组
                const daysArr = Array.from(signDaysSet).sort(); // yyyy-MM-dd 升序
                let streak = 1;
                maxStreak = 1;
                let lastDate = new Date(daysArr[0]);
                for (let i = 1; i < daysArr.length; i++) {
                    const curDate = new Date(daysArr[i]);
                    const diff = (curDate - lastDate) / (24 * 3600 * 1000);
                    if (diff === 1) {
                        streak++;
                    } else {
                        streak = 1;
                    }
                    if (streak > maxStreak) maxStreak = streak;
                    lastDate = curDate;
                }
                // 当前连续签到天数
                // 从最后一天往前推
                currentStreak = 1;
                for (let i = daysArr.length - 1; i > 0; i--) {
                    const curDate = new Date(daysArr[i]);
                    const prevDate = new Date(daysArr[i - 1]);
                    const diff = (curDate - prevDate) / (24 * 3600 * 1000);
                    if (diff === 1) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }
            }
            reasonStats += `<div style=\"margin-bottom:8px;font-weight:normal;color:#2ea44f;\">累计签到天数：<b>${signDaysSet.size}</b> 天`;
            reasonStats += `，当前连续签到：<b>${currentStreak}</b> 天，历史最长连续签到：<b>${maxStreak}</b> 天</div>`;
            reasonStats += '<table style="width:100%;border-collapse:collapse;font-size:14px;">';
            reasonStats += '<thead><tr style="background:#f5f5f5;"><th style="padding:6px 8px;border:1px solid #eee;">分类</th><th style="padding:6px 8px;border:1px solid #eee;">总变动</th><th style="padding:6px 8px;border:1px solid #eee;">次数</th></tr></thead><tbody>';
            const addRow = (name, total, count) => {
              reasonStats += `<tr>
                <td style="padding:6px 8px;border:1px solid #eee;font-weight:bold;">${name}</td>
                <td style="padding:6px 8px;border:1px solid #eee;color:${total>0?'#2ea44f':(total<0?'#d00':'#333')};font-weight:bold;">${total}</td>
                <td style="padding:6px 8px;border:1px solid #eee;">${count}</td>
              </tr>`;
            };
            if (beTouwCount > 0) addRow('被投喂鸡腿', beTouw, beTouwCount);
            if (touwCount > 0) addRow('主动投喂鸡腿', touw, touwCount);
            otherReasons.forEach(v => addRow(v.reason, v.total, v.count));
            signInReasons.forEach(v => addRow(v.reason, v.total, v.count));
            reasonStats += '</tbody></table>';
            statsDiv.innerHTML = reasonStats;

            // 渲染表格
            contentArea.innerHTML = '';
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.border = '1px solid #ccc';
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            const headers = ['鸡腿变动', '鸡腿总计', '理由', '时间'];
            headers.forEach(text => {
                const th = document.createElement('th');
                th.textContent = text;
                th.style.padding = '8px';
                th.style.border = '1px solid #eee';
                th.style.textAlign = 'left';
                th.style.backgroundColor = '#f0f0f0';
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);
            const tbody = document.createElement('tbody');
            dataArr.forEach(item => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #eee';
                const change = item[0] !== undefined ? String(item[0]) : '';
                const total = item[1] !== undefined ? String(item[1]) : '';
                const reason = item[2] !== undefined ? String(item[2]) : '';
                // 时间格式化为中国时间
                let cnTime = '';
                if (item[3]) {
                    let dateStr = String(item[3]).trim();
                    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                        dateStr = dateStr.replace(' ', 'T') + 'Z';
                    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                        dateStr = dateStr + 'Z';
                    }
                    const utcDate = new Date(dateStr);
                    if (!isNaN(utcDate.getTime())) {
                        cnTime = utcDate.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' })
                            .replace(/\//g, '-')
                            .replace(/\b(\d)\b/g, '0$1');
                        cnTime = cnTime.replace(/(\d{4})-(\d{1,2})-(\d{1,2})[\sT]+(\d{1,2}):(\d{1,2}):(\d{1,2})/, function(_, y, m, d, h, min, s) {
                            return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0') + ' ' + String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0') + ':' + String(s).padStart(2, '0');
                        });
                    } else {
                        cnTime = '';
                    }
                }
                [change, total, reason, cnTime].forEach((cellText, index) => {
                    const td = document.createElement('td');
                    td.textContent = cellText;
                    td.style.padding = '8px';
                    td.style.border = '1px solid #eee';
                    td.style.verticalAlign = 'top';
                    if (index === 0 || index === 1) {
                        td.style.textAlign = 'right';
                    } else {
                        td.style.textAlign = 'left';
                    }
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            contentArea.appendChild(table);
        }

        // ========== 加载历史数据并初始化 ===========
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem(CHICKEN_LEG_HISTORY_KEY) || '[]');
        } catch (e) { history = []; }
        // 按时间降序
        history.sort((a, b) => new Date(b[3]) - new Date(a[3]));
        renderTableAndStats(history);
        // 自动设置起止日期为本地数据最早和最晚时间
        if (history.length > 0) {
            let minDate = null, maxDate = null, minDateStr = '', maxDateStr = '';
            history.forEach(item => {
                let dateStr = String(item[3]).trim();
                if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                    dateStr = dateStr.replace(' ', 'T') + 'Z';
                } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                    dateStr = dateStr + 'Z';
                }
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return;
                if (!minDate || d < minDate) { minDate = d; minDateStr = item[3]; }
                if (!maxDate || d > maxDate) { maxDate = d; maxDateStr = item[3]; }
            });
            function toDateInputStr(dateStr) {
                if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                    dateStr = dateStr.replace(' ', 'T') + 'Z';
                } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                    dateStr = dateStr + 'Z';
                }
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return '';
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
            startInput.value = toDateInputStr(minDateStr);
            endInput.value = toDateInputStr(maxDateStr);
        }

        // ========== 筛选按钮事件 ==========
        filterBtn.onclick = function() {
            const start = startInput.value ? new Date(startInput.value + 'T00:00:00') : null;
            const end = endInput.value ? new Date(endInput.value + 'T23:59:59') : null;
            const filtered = history.filter(item => {
                if (!item[3]) return false;
                let dateStr = String(item[3]).trim();
                if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                    dateStr = dateStr.replace(' ', 'T') + 'Z';
                } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                    dateStr = dateStr + 'Z';
                }
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return false;
                if (start && d < start) return false;
                if (end && d > end) return false;
                return true;
            });
            renderTableAndStats(filtered);
        };

        document.body.appendChild(dialog);

        // ========== 拉取区间数据 ==========
        fetchRangeBtn.onclick = async function() {
            const nextAllowTime = parseInt(localStorage.getItem(CHICKEN_LEG_NEXT_ALLOW_KEY) || '0');
            const now = Date.now();

            if (now < nextAllowTime) {
                // Should already be disabled, but double check
                updateFetchButtonState();
                return;
            }

            // Set cooldown
            const ONE_MINUTE = 60 * 1000;
            localStorage.setItem(CHICKEN_LEG_LAST_FETCH_KEY, now.toString());
            localStorage.setItem(CHICKEN_LEG_NEXT_ALLOW_KEY, (now + ONE_MINUTE).toString());

            fetchRangeBtn.disabled = true;
            fetchRangeStatus.textContent = '正在拉取...';
            // Stop existing countdown if any
            if (chickenLegTimeoutId) {
                clearTimeout(chickenLegTimeoutId);
                chickenLegTimeoutId = null;
            }

            // 1. 先读取本地数据，找出本地已有的唯一key集合
            let history = [];
            try {
                history = JSON.parse(localStorage.getItem(CHICKEN_LEG_HISTORY_KEY) || '[]');
            } catch (e) { history = []; }
            const localKeySet = new Set();
            history.forEach(item => {
                if (item && item.length === 4) {
                    const key = item[3] + '|' + item[2] + '|' + item[0];
                    localKeySet.add(key);
                }
            });
            let allData = [];
            let emptyCount = 0;
            let shouldStop = false;
            let finalStatusMessage = ''; // To store the final message

            for (let page = 1; page <= 100 && !shouldStop; page++) {
                fetchRangeStatus.textContent = `正在拉取第${page}页...`;
                try {
                    const resp = await fetch(`https://www.nodeseek.com/api/account/credit/page-${page}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json, text/plain, */*',
                            'User-Agent': navigator.userAgent,
                        },
                        credentials: 'same-origin',
                    });
                    if (!resp.ok) {
                         // If API returns non-ok status, stop fetching and report error
                         finalStatusMessage = `拉取失败：HTTP 错误 ${resp.status}`;
                         shouldStop = true; // Stop loop and go to final message display
                         break;
                    }
                    const json = await resp.json();
                    if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
                        emptyCount++;
                        if (emptyCount >= 2) break;
                        continue;
                    }
                    emptyCount = 0;
                    for (const item of json.data) {
                        if (item && item.length === 4) {
                            const key = item[3] + '|' + item[2] + '|' + item[0];
                            if (localKeySet.has(key)) {
                                shouldStop = true;
                                break;
                            }
                            allData.push(item);
                        }
                    }
                } catch (e) {
                    finalStatusMessage = `拉取失败：第${page}页拉取失败：${e.message}`;
                    shouldStop = true; // Stop loop and go to final message display
                    break;
                }
                await new Promise(r => setTimeout(r, 300));
            }

            // After the loop, determine final message and display for 3 seconds
            if (finalStatusMessage === '') { // No error occurred during fetching
                if (allData.length > 0) {
                    saveChickenLegHistory(allData);
                    finalStatusMessage = `拉取完成，共${allData.length}条，已保存。`;
                    // 刷新历史和表格
                    try {
                        history = JSON.parse(localStorage.getItem(CHICKEN_LEG_HISTORY_KEY) || '[]');
                    } catch (e) { history = []; }
                    history.sort((a, b) => new Date(b[3]) - new Date(a[3]));
                    renderTableAndStats(history);
                    // 自动设置起止日期为本地数据最早和最晚时间
                    if (history.length > 0) {
                        // 遍历找最早和最晚的日期
                        let minDate = null, maxDate = null, minDateStr = '', maxDateStr = '';
                        history.forEach(item => {
                            let dateStr = String(item[3]).trim();
                            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                                dateStr = dateStr.replace(' ', 'T') + 'Z';
                            } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                                dateStr = dateStr + 'Z';
                            }
                            const d = new Date(dateStr);
                            if (isNaN(d.getTime())) return;
                            if (!minDate || d < minDate) { minDate = d; minDateStr = item[3]; }
                            if (!maxDate || d > maxDate) { maxDate = d; maxDateStr = item[3]; }
                        });
                        function toDateInputStr(dateStr) {
                            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                                dateStr = dateStr.replace(' ', 'T') + 'Z';
                            } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                                dateStr = dateStr + 'Z';
                            }
                            const d = new Date(dateStr);
                            if (isNaN(d.getTime())) return '';
                            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        }
                        startInput.value = toDateInputStr(minDateStr);
                        endInput.value = toDateInputStr(maxDateStr);
                    }
                } else {
                    finalStatusMessage = '未获取到任何数据。';
                }
            }

            fetchRangeStatus.textContent = finalStatusMessage;
            setTimeout(() => {
                updateFetchButtonState(); // This will show the cooldown or re-enable the button
            }, 3000);
        };

        // ========== 清除本地数据 ==========
        clearBtn.onclick = function() {
            if (confirm('确定要清除所有本地鸡腿历史数据吗？此操作不可恢复！')) {
                localStorage.removeItem(CHICKEN_LEG_HISTORY_KEY);
                fetchRangeStatus.textContent = '本地数据已清除';
                // 刷新历史和表格
                history = [];
                renderTableAndStats(history);
            }
        };

        if (window.innerWidth <= 767) {
            dialog.style.position = 'fixed';
            dialog.style.width = '96%';
            dialog.style.minWidth = 'unset';
            dialog.style.maxWidth = '96%';
            dialog.style.left = '2%';
            dialog.style.right = '2%';
            dialog.style.top = '10px';
            dialog.style.transform = 'none';
            dialog.style.borderRadius = '10px';
            dialog.style.maxHeight = '88vh';
            dialog.style.padding = '12px 8px 8px 8px';
            dialog.style.overflowY = 'auto';
            // 关闭按钮
            closeBtn.style.right = '8px';
            closeBtn.style.top = '5px';
            closeBtn.style.fontSize = '24px';
            closeBtn.style.width = '30px';
            closeBtn.style.height = '30px';
            closeBtn.style.lineHeight = '30px';
            closeBtn.style.textAlign = 'center';
            // 按钮
            fetchRangeBtn.style.fontSize = '16px';
            fetchRangeBtn.style.padding = '8px 16px';
            clearBtn.style.fontSize = '16px';
            clearBtn.style.padding = '8px 16px';
            filterBtn.style.fontSize = '16px';
            filterBtn.style.padding = '8px 16px';
            // 输入框
            startInput.style.fontSize = '16px';
            startInput.style.padding = '6px 8px';
            endInput.style.fontSize = '16px';
            endInput.style.padding = '6px 8px';
            // 筛选栏竖排
            filterBar.style.flexDirection = 'column';
            filterBar.style.alignItems = 'stretch';
            filterBar.style.gap = '6px';
            // 表格卡片化
            contentArea.style.padding = '0';
            contentArea.style.overflowX = 'auto';
            // statsDiv字体
            statsDiv.style.fontSize = '15px';
        }
    }

    // 将 `fetchChickenLegData` 和 `saveChickenLegHistory` 函数移到 `showChickenLegStatsDialog` 外部，
    // 确保它们是独立的辅助函数，只在 `fetchRangeBtn.onclick` 中被调用。
    // 这是为了满足用户需求，`showChickenLegStatsDialog` 不再自动获取数据。

    // 将 `fetchChickenLegData` 和 `saveChickenLegHistory` 函数移到 `showChickenLegStatsDialog` 外部
    // 确保它们是独立的辅助函数，只在 `fetchRangeBtn.onclick` 中被调用
    async function fetchChickenLegData(contentArea) {
        _addLog(`正在获取鸡腿统计页面内容...`);
        contentArea.innerHTML = `正在加载...`;
        try {
            const response = await fetch('https://www.nodeseek.com/api/account/credit/page-1', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'User-Agent': navigator.userAgent,
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`HTTP 错误！状态码: ${response.status}`);
            }

            const jsonData = await response.json();

            if (jsonData.success && Array.isArray(jsonData.data)) {
                contentArea.innerHTML = '';
                // 保存历史数据
                saveChickenLegHistory(jsonData.data);
                const table = document.createElement('table');
                table.style.width = '100%';
                table.style.borderCollapse = 'collapse';
                table.style.border = '1px solid #ccc';
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                const headers = ['鸡腿变动', '鸡腿总计', '理由', '时间'];
                headers.forEach(text => {
                    const th = document.createElement('th');
                    th.textContent = text;
                    th.style.padding = '8px';
                    th.style.border = '1px solid #eee';
                    th.style.textAlign = 'left';
                    th.style.backgroundColor = '#f0f0f0';
                    headerRow.appendChild(th);
                });
                thead.appendChild(headerRow);
                table.appendChild(thead);
                const tbody = document.createElement('tbody');
                jsonData.data.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid #eee';
                    const change = item[0] !== undefined ? String(item[0]) : '';
                    const total = item[1] !== undefined ? String(item[1]) : '';
                    const reason = item[2] !== undefined ? String(item[2]) : '';
                    const timestamp = item[3] !== undefined ? String(item[3]).replace('T', ' ').slice(0, 19) : '';
                    // 转换为中国时间（东八区）
                    let cnTime = '';
                    if (item[3]) {
                        let dateStr = String(item[3]).trim();
                        // "2025-06-01 03:07:41" => "2025-06-01T03:07:41Z"
                        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                            dateStr = dateStr.replace(' ', 'T') + 'Z';
                        } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                            dateStr = dateStr + 'Z';
                        }
                        const utcDate = new Date(dateStr);
                        if (!isNaN(utcDate.getTime())) {
                            cnTime = utcDate.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' })
                                .replace(/\//g, '-')
                                .replace(/\b(\d)\b/g, '0$1');
                            cnTime = cnTime.replace(/(\d{4})-(\d{1,2})-(\d{1,2})[\sT]+(\d{1,2}):(\d{1,2}):(\d{1,2})/, function(_, y, m, d, h, min, s) {
                                return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0') + ' ' + String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0') + ':' + String(s).padStart(2, '0');
                            });
                        } else {
                            cnTime = '';
                        }
                    }
                    [change, total, reason, cnTime].forEach((cellText, index) => {
                        const td = document.createElement('td');
                        td.textContent = cellText;
                        td.style.padding = '8px';
                        td.style.border = '1px solid #eee';
                        td.style.verticalAlign = 'top';
                        if (index === 0 || index === 1) {
                            td.style.textAlign = 'right';
                        } else {
                            td.style.textAlign = 'left';
                        }
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                contentArea.appendChild(table);
                // 缓存HTML内容
                localStorage.setItem(CHICKEN_LEG_LAST_HTML_KEY, contentArea.innerHTML);
                _addLog('鸡腿统计数据已成功获取并展示。');
            } else {
                contentArea.textContent = 'API响应数据格式不正确或无数据。';
                _addLog('获取鸡腿统计页面成功，但API响应数据格式不正确或无数据。');
                console.log('API响应数据：', jsonData);
            }
        } catch (error) {
            _addLog(`获取鸡腿统计页面失败: ${error.message}`);
            contentArea.textContent = `加载失败: ${error.message}. 请检查网络或Cloudflare阻拦。`;
        }
    }

    // 保存历史鸡腿数据，去重（以时间+理由+变动唯一），不再按时间过滤，全部保留
    function saveChickenLegHistory(newDataArr) {
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem(CHICKEN_LEG_HISTORY_KEY) || '[]');
        } catch (e) { history = []; }
        const map = new Map();
        history.forEach(item => {
            if (item && item.length === 4) {
                const key = item[3] + '|' + item[2] + '|' + item[0];
                map.set(key, item);
            }
        });
        newDataArr.forEach(item => {
            if (item && item.length === 4) {
                const key = item[3] + '|' + item[2] + '|' + item[0];
                map.set(key, item);
            }
        });
        // 不再按时间过滤，全部保留
        const merged = Array.from(map.values());
        localStorage.setItem(CHICKEN_LEG_HISTORY_KEY, JSON.stringify(merged));
    }

    // 暴露给全局，供 nodeseek_blacklist.user.js 调用
    window.NodeSeekRegister = {
        setAddLogFunction: setAddLogFunction,
        startSignInTimer: startSignInTimer,
        checkSignInProcess: checkSignInProcess,
        showChickenLegStatsDialog: showChickenLegStatsDialog // 暴露鸡腿统计函数
    };

    console.log('NodeSeek Register Backend (Register.js) 已加载');

})();
