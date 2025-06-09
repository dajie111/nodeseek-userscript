// ========== 签到功能模块 ==========
(function() {
    'use strict';

    // 签到功能的存储键
    const SIGN_ENABLED_KEY = 'nodeseek_sign_enabled';
    const SIGN_STATUS_KEY = 'nodeseek_sign_status';
    const SIGN_LOCK_KEY = 'nodeseek_sign_lock';
    const SIGN_TODAY_KEY = 'nodeseek_sign_today';
    const SIGN_SUCCESS_KEY = 'nodeseek_sign_success';
    const ACTIVE_PAGE_KEY = 'nodeseek_active_page';

    // 添加日志函数引用
    let addLog = function(message) {
        console.log('[签到模块] ' + message);
    };

    // 设置日志函数
    function setAddLogFunction(logFunc) {
        if (typeof logFunc === 'function') {
            addLog = logFunc;
        }
    }

    // 检查签到是否启用
    function isSignEnabled() {
        return localStorage.getItem(SIGN_ENABLED_KEY) === 'true';
    }

    // 获取今日日期字符串
    function getTodayString() {
        const now = new Date();
        return now.getFullYear() + '-' + 
               String(now.getMonth() + 1).padStart(2, '0') + '-' + 
               String(now.getDate()).padStart(2, '0');
    }

    // 获取当前时间的精确信息
    function getCurrentTimeInfo() {
        const now = new Date();
        return {
            hours: now.getHours(),
            minutes: now.getMinutes(),
            seconds: now.getSeconds(),
            timestamp: now.getTime(),
            dateString: getTodayString()
        };
    }

    // 检查是否在签到时间窗口内 (00:00:00 - 00:00:10)
    function isInSignTimeWindow() {
        const timeInfo = getCurrentTimeInfo();
        return timeInfo.hours === 0 && 
               timeInfo.minutes === 0 && 
               timeInfo.seconds >= 0 && 
               timeInfo.seconds <= 10;
    }

    // 检查是否在预签到模式 (23:59:55 - 23:59:59)
    function isInPreSignMode() {
        const timeInfo = getCurrentTimeInfo();
        return timeInfo.hours === 23 && 
               timeInfo.minutes === 59 && 
               timeInfo.seconds >= 55;
    }

    // 检查是否在补偿时间窗口内 (00:00:00 - 00:00:30)
    function isInCompensationWindow() {
        const timeInfo = getCurrentTimeInfo();
        return timeInfo.hours === 0 && 
               timeInfo.minutes === 0 && 
               timeInfo.seconds >= 0 && 
               timeInfo.seconds <= 30;
    }

    // 获取签到锁状态
    function getSignLock() {
        const lockData = localStorage.getItem(SIGN_LOCK_KEY);
        if (!lockData) return null;
        
        try {
            const lock = JSON.parse(lockData);
            const now = Date.now();
            
            // 锁过期时间5秒
            if (now - lock.timestamp > 5000) {
                localStorage.removeItem(SIGN_LOCK_KEY);
                return null;
            }
            
            return lock;
        } catch (e) {
            localStorage.removeItem(SIGN_LOCK_KEY);
            return null;
        }
    }

    // 设置签到锁
    function setSignLock(pageId) {
        const lockData = {
            pageId: pageId,
            timestamp: Date.now(),
            url: window.location.href
        };
        localStorage.setItem(SIGN_LOCK_KEY, JSON.stringify(lockData));
    }

    // 释放签到锁
    function releaseSignLock() {
        localStorage.removeItem(SIGN_LOCK_KEY);
    }

    // 生成当前页面ID
    function generatePageId() {
        return 'page_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 检查今日是否已签到
    function isTodayAlreadySigned() {
        const today = getTodayString();
        const signToday = localStorage.getItem(SIGN_TODAY_KEY);
        const signSuccess = localStorage.getItem(SIGN_SUCCESS_KEY);
        
        return signToday === today && signSuccess === 'true';
    }

    // 设置今日签到状态
    function setTodaySignStatus(success) {
        const today = getTodayString();
        localStorage.setItem(SIGN_TODAY_KEY, today);
        localStorage.setItem(SIGN_SUCCESS_KEY, success.toString());
    }

    // 清理过期数据
    function cleanupExpiredData() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        // 清理过期锁
        const lock = getSignLock();
        if (!lock) {
            localStorage.removeItem(SIGN_LOCK_KEY);
        }
        
        // 清理非签到时间段的当日标记（每小时清理一次）
        const timeInfo = getCurrentTimeInfo();
        if (timeInfo.minutes === 0 && timeInfo.seconds < 30) {
            if (timeInfo.hours !== 0) {
                // 非签到小时，清理可能的错误标记
                const signToday = localStorage.getItem(SIGN_TODAY_KEY);
                const today = getTodayString();
                if (signToday === today && timeInfo.hours > 1) {
                    // 允许1小时的宽限期后再清理
                    localStorage.removeItem(SIGN_TODAY_KEY);
                    localStorage.removeItem(SIGN_SUCCESS_KEY);
                }
            }
        }
    }

    // 执行签到流程
    async function performSignIn() {
        try {
            addLog('开始执行签到流程');
            
            // 检查当前页面是否是签到页面
            const currentUrl = window.location.href;
            const isBoardPage = currentUrl.includes('/board');
            
            if (!isBoardPage) {
                addLog('当前不在签到页面，跳转到签到页面');
                // 保存当前页面URL用于返回
                sessionStorage.setItem('nodeseek_return_url', currentUrl);
                window.location.href = 'https://www.nodeseek.com/board';
                return;
            }
            
            addLog('当前在签到页面，开始查找签到按钮');
            
            // 在签到页面查找"试试手气"按钮
            const signButton = findSignButton();
            
            if (signButton) {
                addLog('找到签到按钮，准备点击');
                
                // 模拟人工点击，添加随机延迟
                setTimeout(() => {
                    try {
                        // 使用JavaScript点击确保成功
                        signButton.click();
                        addLog('签到按钮点击成功');
                        
                        // 设置签到成功标记
                        setTodaySignStatus(true);
                        
                        // 延迟返回上一页
                        setTimeout(() => {
                            returnToPreviousPage();
                        }, 2000 + Math.random() * 3000); // 2-5秒随机延迟
                        
                    } catch (error) {
                        addLog('点击签到按钮失败: ' + error.message);
                        setTodaySignStatus(false);
                        returnToPreviousPage();
                    }
                }, 500 + Math.random() * 1500); // 0.5-2秒随机延迟
                
            } else {
                addLog('未找到签到按钮，可能已经签到过了');
                
                // 检查页面是否显示已签到信息
                const pageText = document.body.textContent;
                if (pageText.includes('今日已签到') || 
                    pageText.includes('已经签到') || 
                    pageText.includes('签到成功')) {
                    addLog('检测到已签到信息，设置签到成功状态');
                    setTodaySignStatus(true);
                } else {
                    addLog('未检测到签到信息，签到可能失败');
                    setTodaySignStatus(false);
                }
                
                // 返回上一页
                setTimeout(() => {
                    returnToPreviousPage();
                }, 1000);
            }
            
        } catch (error) {
            addLog('签到流程执行失败: ' + error.message);
            setTodaySignStatus(false);
            returnToPreviousPage();
        } finally {
            // 释放签到锁
            releaseSignLock();
        }
    }

    // 查找签到按钮
    function findSignButton() {
        // 查找包含"试试手气"文本的按钮
        const buttons = document.querySelectorAll('button, a, input[type="button"], .btn');
        
        for (let button of buttons) {
            const text = button.textContent || button.value || '';
            if (text.includes('试试手气') || 
                text.includes('签到') || 
                text.includes('打卡')) {
                return button;
            }
        }
        
        // 如果没找到，尝试查找可能的签到元素
        const signElements = document.querySelectorAll('[class*="sign"], [id*="sign"], [class*="checkin"], [id*="checkin"]');
        for (let element of signElements) {
            if (element.tagName === 'BUTTON' || 
                element.tagName === 'A' || 
                (element.tagName === 'INPUT' && element.type === 'button')) {
                return element;
            }
        }
        
        return null;
    }

    // 返回上一页
    function returnToPreviousPage() {
        const returnUrl = sessionStorage.getItem('nodeseek_return_url');
        
        if (returnUrl && returnUrl !== window.location.href) {
            addLog('返回到之前的页面: ' + returnUrl);
            sessionStorage.removeItem('nodeseek_return_url');
            window.location.href = returnUrl;
        } else {
            // 如果没有保存的返回URL，返回首页
            addLog('返回到首页');
            window.location.href = 'https://www.nodeseek.com/';
        }
    }

    // 检查是否需要执行签到
    function checkAndPerformSignIn(source = 'timer') {
        if (!isSignEnabled()) {
            return;
        }
        
        // 清理过期数据
        cleanupExpiredData();
        
        // 检查是否已经签到
        if (isTodayAlreadySigned()) {
            if (source !== 'timer') {
                addLog('今日已签到完成，跳过签到检查');
            }
            return;
        }
        
        // 检查是否在签到时间窗口内
        if (!isInSignTimeWindow()) {
            const timeInfo = getCurrentTimeInfo();
            if (source !== 'timer' && isInCompensationWindow()) {
                addLog(`补偿机制触发: 当前时间 ${String(timeInfo.hours).padStart(2, '0')}:${String(timeInfo.minutes).padStart(2, '0')}:${String(timeInfo.seconds).padStart(2, '0')}，但已超过签到窗口`);
            }
            return;
        }
        
        // 检查是否有其他页面正在执行签到
        const currentLock = getSignLock();
        const currentPageId = window.nodeseekPageId || generatePageId();
        
        if (currentLock && currentLock.pageId !== currentPageId) {
            addLog('其他页面正在执行签到，当前页面跳过');
            return;
        }
        
        // 设置签到锁
        setSignLock(currentPageId);
        
        addLog(`签到检查通过，开始执行签到 (触发源: ${source})`);
        
        // 执行签到
        performSignIn();
    }

    // 页面活跃状态管理
    function updateActivePageStatus() {
        const pageData = {
            pageId: window.nodeseekPageId || generatePageId(),
            url: window.location.href,
            timestamp: Date.now()
        };
        
        localStorage.setItem(ACTIVE_PAGE_KEY, JSON.stringify(pageData));
    }

    // 检查是否为活跃页面
    function isActivePage() {
        const activePageData = localStorage.getItem(ACTIVE_PAGE_KEY);
        if (!activePageData) return true;
        
        try {
            const data = JSON.parse(activePageData);
            const currentPageId = window.nodeseekPageId || '';
            
            // 如果是当前页面，或者活跃页面超过30秒未更新，则认为当前页面可以获得控制权
            return data.pageId === currentPageId || 
                   (Date.now() - data.timestamp > 30000);
        } catch (e) {
            return true;
        }
    }

    // 强制获得签到控制权（用于补偿机制）
    function forceGetSignControl() {
        if (!isActivePage()) {
            const currentPageId = window.nodeseekPageId || generatePageId();
            window.nodeseekPageId = currentPageId;
            updateActivePageStatus();
            addLog('检测到无活跃页面或原活跃页面失效，当前页面强制获得签到控制权');
            return true;
        }
        return false;
    }

    // 用户活动监听（节流）
    let lastActivityTime = 0;
    function onUserActivity() {
        const now = Date.now();
        if (now - lastActivityTime < 2000) return; // 2秒节流
        lastActivityTime = now;
        
        updateActivePageStatus();
        
        if (isInCompensationWindow() && isSignEnabled()) {
            forceGetSignControl();
            checkAndPerformSignIn('user_activity');
        }
    }

    // 页面可见性变化监听
    function onVisibilityChange() {
        if (document.hidden) {
            // 页面变为后台时记录时间
            window.nodeseekBackgroundTime = Date.now();
        } else {
            // 页面变为前台时检查
            updateActivePageStatus();
            
            const backgroundTime = window.nodeseekBackgroundTime;
            if (backgroundTime) {
                const backgroundDuration = Date.now() - backgroundTime;
                addLog(`页面从后台恢复，后台时长: ${Math.round(backgroundDuration / 1000)}秒`);
                window.nodeseekBackgroundTime = null;
            }
            
            if (isInCompensationWindow() && isSignEnabled()) {
                forceGetSignControl();
                checkAndPerformSignIn('visibility_change');
            }
        }
    }

    // 窗口焦点变化监听
    function onWindowFocus() {
        updateActivePageStatus();
        
        if (isInCompensationWindow() && isSignEnabled()) {
            forceGetSignControl();
            checkAndPerformSignIn('window_focus');
        }
    }

    // 页面加载时检查
    function onPageLoad() {
        updateActivePageStatus();
        
        if (isInCompensationWindow() && isSignEnabled()) {
            forceGetSignControl();
            checkAndPerformSignIn('page_load');
        }
    }

    // 主定时器
    function startMainTimer() {
        setInterval(() => {
            if (!isSignEnabled()) return;
            
            updateActivePageStatus();
            
            const timeInfo = getCurrentTimeInfo();
            const currentTime = `${String(timeInfo.hours).padStart(2, '0')}:${String(timeInfo.minutes).padStart(2, '0')}:${String(timeInfo.seconds).padStart(2, '0')}`;
            
            // 预签到模式 - 强化监控
            if (isInPreSignMode()) {
                if (timeInfo.seconds % 2 === 0) { // 每2秒输出一次状态
                    addLog(`[本地时间 ${currentTime}] 预签到模式 - 即将进入签到时间窗口`);
                }
                forceGetSignControl();
            }
            
            // 签到时间窗口检查
            if (isInSignTimeWindow()) {
                if (!isTodayAlreadySigned()) {
                    addLog(`[本地时间 ${currentTime}] 进入签到时间窗口，准备执行签到`);
                    forceGetSignControl();
                    checkAndPerformSignIn('main_timer');
                }
            }
            
        }, 1000); // 每秒检查一次
    }

    // 初始化签到功能
    function initClockIn() {
        // 生成页面唯一ID
        window.nodeseekPageId = generatePageId();
        
        // 清理过期数据
        cleanupExpiredData();
        
        // 更新活跃页面状态
        updateActivePageStatus();
        
        // 页面加载时检查
        onPageLoad();
        
        // 启动主定时器
        startMainTimer();
        
        // 添加事件监听器
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('focus', onWindowFocus);
        
        // 用户活动监听（节流）
        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(eventType => {
            document.addEventListener(eventType, onUserActivity, { passive: true });
        });
        
        addLog('签到功能初始化完成');
        
        // 输出当前状态
        const timeInfo = getCurrentTimeInfo();
        const currentTime = `${String(timeInfo.hours).padStart(2, '0')}:${String(timeInfo.minutes).padStart(2, '0')}:${String(timeInfo.seconds).padStart(2, '0')}`;
        const signEnabled = isSignEnabled();
        const todaySigned = isTodayAlreadySigned();
        
        addLog(`当前时间: ${currentTime}, 签到功能: ${signEnabled ? '开启' : '关闭'}, 今日签到: ${todaySigned ? '已完成' : '未完成'}`);
    }

    // 导出功能到全局对象
    window.NodeSeekClockIn = {
        init: initClockIn,
        setAddLogFunction: setAddLogFunction,
        checkAndPerformSignIn: checkAndPerformSignIn,
        isSignEnabled: isSignEnabled,
        isTodayAlreadySigned: isTodayAlreadySigned,
        isInSignTimeWindow: isInSignTimeWindow,
        isInPreSignMode: isInPreSignMode
    };

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initClockIn);
    } else {
        initClockIn();
    }

})();
