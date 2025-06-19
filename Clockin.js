// ========== 自动签到 ==========
(function() {
    'use strict';

    // NodeSeek 自动签到系统
    class NodeSeekAutoSignIn {
        constructor() {
            this.storageKeys = {
                lastSignTime: 'nodeseek_last_sign_time',
                signLock: 'nodeseek_sign_lock',
                executingLock: 'nodeseek_executing_lock',
                masterPageId: 'nodeseek_master_page_id',
                pageRegistry: 'nodeseek_page_registry',
                lastHeartbeat: 'nodeseek_last_heartbeat'
            };
            this.SIGN_API = '/api/attendance?random=true';
            this.isDebug = true;
            this.isPreSignMode = false;
            this.lastActiveTime = Date.now();
            this.backgroundStartTime = null;
            
            // 多标签页管理
            this.pageId = this.generatePageId();
            this.isMasterPage = false;
            this.heartbeatInterval = null;
            
            this.init();
        }

        // 初始化
        init() {
            this.log(`🎲 NodeSeek自动签到系统启动 [页面ID: ${this.pageId}]`);

            // 清理过期数据
            this.cleanExpiredData();

            // 检查当前页面是否是NodeSeek
            if (this.isNodeSeekPage()) {
                this.log('✅ 检测到NodeSeek页面');
                
                // 初始化多标签页管理
                this.initMultiTabManagement();
                
                this.startSignInMonitor();
                this.setupCompensationMechanisms();
                
                // 添加重置状态监控
                this.setupDailyReset();
                
                // 检查今日签到状态
                this.checkTodaySignInStatus();
            }
        }

        // 检查是否是NodeSeek页面
        isNodeSeekPage() {
            return window.location.hostname === 'www.nodeseek.com';
        }

        // 设置每日重置监控
        setupDailyReset() {
            // 每秒检查是否到了23:59:59
            setInterval(() => {
                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();
                const second = now.getSeconds();

                // 在23:59:59重置状态
                if (hour === 23 && minute === 59 && second === 59) {
                    this.resetDailyStatus();
                }
            }, 1000);
        }

        // 重置每日状态
        resetDailyStatus() {
            localStorage.removeItem(this.storageKeys.lastSignTime);
            this.logToOperationDialog('🔄 签到状态已重置，准备明日签到');
            this.log('🔄 23:59:59 - 签到状态已重置');
        }

        // 检查今日签到状态
        checkTodaySignInStatus() {
            if (this.hasSignedToday()) {
                this.logToOperationDialog('✅ 今日已签到');
                this.log('✅ 系统启动 - 检测到今日已签到');
            } else {
                this.log('📅 系统启动 - 今日尚未签到，等待签到时间');
            }
        }

        // 启动签到监控
        startSignInMonitor() {
            // 立即检查一次
            setTimeout(() => this.checkAndSignIn(), 1000);

            // 主定时器：每秒检查
            setInterval(() => {
                // 如果今日已签到，跳过所有检查
                if (this.hasSignedToday()) {
                    return;
                }

                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();
                const second = now.getSeconds();

                // 预签到模式：23:59:55开始进入预签到模式
                if (hour === 23 && minute === 59 && second >= 55) {
                    if (!this.isPreSignMode) {
                        this.isPreSignMode = true;
                    }
                }

                // 签到时间检查：从00:00:00开始，全天可签到
                if (hour >= 0) {
                    this.checkAndSignIn();
                }

                // 退出预签到模式：00:01:00后退出
                if (hour === 0 && minute >= 1) {
                    if (this.isPreSignMode) {
                        this.isPreSignMode = false;
                    }
                }
            }, 1000);

            // 备用定时器：每10秒检查一次（降低频率）
            setInterval(() => {
                // 如果今日已签到，跳过检查
                if (this.hasSignedToday()) {
                    return;
                }
                this.checkAndSignIn();
            }, 10000);

            this.log('📅 自动签到监控已启动');
        }

        // 设置补偿机制
        setupCompensationMechanisms() {
            // 页面可见性变化监听
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.handlePageRestore('页面可见性恢复');
                } else {
                    this.backgroundStartTime = Date.now();
                }
            });

            // 窗口焦点变化监听
            window.addEventListener('focus', () => {
                this.handlePageRestore('窗口焦点恢复');
            });

            window.addEventListener('blur', () => {
                this.backgroundStartTime = Date.now();
            });

            // 用户活动监听（节流）
            let userActivityTimer = null;
            const handleUserActivity = () => {
                this.lastActiveTime = Date.now();
                if (userActivityTimer) return;
                
                userActivityTimer = setTimeout(() => {
                    userActivityTimer = null;
                    if (!this.hasSignedToday()) {
                        this.checkAndSignIn();
                    }
                }, 2000);
            };

            ['mousedown', 'keydown', 'scroll', 'click', 'touchstart', 'touchmove'].forEach(event => {
                document.addEventListener(event, handleUserActivity, { passive: true });
            });

            // 页面加载时立即检查签到
            setTimeout(() => {
                if (!this.hasSignedToday()) {
                    this.checkAndSignIn();
                }
            }, 1000);

            // 长时间挂机补偿：高精度检查器
            this.setupHighPrecisionChecker();

            // Performance API 补偿
            this.setupPerformanceCompensation();

            // 页面卸载前处理
            this.setupPageUnloadHandler();

            // 定时器异常恢复机制
            this.setupTimerRecovery();

            // 递归检测器（最后防线）
            this.setupRecursiveChecker();

            this.log('🛡️ 长时间挂机补偿机制已启动');
            
            // 定期显示多标签页状态（仅主页面显示，避免日志混乱）
            this.setupMultiTabStatusDisplay();
        }

        // 多标签页状态显示
        setupMultiTabStatusDisplay() {
            setInterval(() => {
                if (this.isMasterPage) {
                    const registry = this.getPageRegistry();
                    const activePages = Object.keys(registry).length;
                    const now = new Date();
                    
                    // 只在关键时刻显示状态，避免日志过多
                    if ((now.getHours() === 23 && now.getMinutes() === 59 && now.getSeconds() >= 45) ||
                        (now.getHours() === 0 && now.getMinutes() === 0)) {
                        this.log(`📊 多标签页状态 - 活跃页面: ${activePages}个 | 主页面: ${this.pageId.slice(-8)}`);
                    }
                }
            }, 10000); // 10秒检查一次
        }

        // 高精度检查器（关键时刻强化）
        setupHighPrecisionChecker() {
            setInterval(() => {
                // 如果今日已签到，跳过检查
                if (this.hasSignedToday()) {
                    return;
                }

                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();
                const second = now.getSeconds();

                // 在关键时刻（23:59:50-00:01:00）进行高频检查
                if ((hour === 23 && minute === 59 && second >= 50) || 
                    (hour === 0 && minute === 0)) {
                    this.checkAndSignIn();
                }
            }, 500); // 0.5秒一次高精度检查
        }

        // Performance API 补偿
        setupPerformanceCompensation() {
            if ('performance' in window && 'now' in performance) {
                let lastCheckTime = performance.now();
                
                setInterval(() => {
                    const currentTime = performance.now();
                    const timeDiff = currentTime - lastCheckTime;
                    
                    // 如果时间差异过大（超过5秒），说明可能被暂停过
                    if (timeDiff > 5000) {
                        this.log(`⚡ Performance API检测到时间跳跃: ${Math.round(timeDiff/1000)}秒`);
                        this.log('🔄 Performance API触发签到检查');
                        this.checkAndSignIn();
                    }
                    
                    lastCheckTime = currentTime;
                }, 3000);
            }
        }

        // 生成页面唯一ID
        generatePageId() {
            return 'page_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        // 初始化多标签页管理
        initMultiTabManagement() {
            // 注册当前页面
            this.registerCurrentPage();
            
            // 竞选主页面
            this.electMasterPage();
            
            // 开始心跳检测
            this.startHeartbeat();
            
            // 监听localStorage变化（页面间通信）
            this.setupStorageListener();
            
            this.log(`📋 多标签页管理初始化完成 [主页面: ${this.isMasterPage}]`);
        }

        // 注册当前页面
        registerCurrentPage() {
            const registry = this.getPageRegistry();
            registry[this.pageId] = {
                timestamp: Date.now(),
                isActive: true,
                url: window.location.href
            };
            this.setPageRegistry(registry);
        }

        // 竞选主页面
        electMasterPage() {
            const currentMasterId = localStorage.getItem(this.storageKeys.masterPageId);
            const registry = this.getPageRegistry();
            
            // 如果没有主页面，或主页面已失效
            if (!currentMasterId || !registry[currentMasterId] || 
                Date.now() - registry[currentMasterId].timestamp > 10000) {
                
                this.becomeMasterPage();
            } else {
                this.isMasterPage = false;
                this.log(`👥 当前页面为从页面，主页面: ${currentMasterId}`);
            }
        }

        // 成为主页面
        becomeMasterPage() {
            this.isMasterPage = true;
            localStorage.setItem(this.storageKeys.masterPageId, this.pageId);
            localStorage.setItem(this.storageKeys.lastHeartbeat, Date.now().toString());
            this.log(`👑 当前页面成为主页面 [${this.pageId}]`);
        }

        // 开始心跳检测
        startHeartbeat() {
            this.heartbeatInterval = setInterval(() => {
                if (this.isMasterPage) {
                    // 主页面发送心跳
                    localStorage.setItem(this.storageKeys.lastHeartbeat, Date.now().toString());
                    this.updatePageRegistry();
                } else {
                    // 从页面检查主页面是否还活着
                    this.checkMasterPageHealth();
                }
            }, 3000); // 3秒心跳
        }

        // 更新页面注册信息
        updatePageRegistry() {
            const registry = this.getPageRegistry();
            if (registry[this.pageId]) {
                registry[this.pageId].timestamp = Date.now();
                registry[this.pageId].isActive = !document.hidden;
                this.setPageRegistry(registry);
            }
            
            // 清理过期页面
            this.cleanExpiredPages();
        }

        // 检查主页面健康状态
        checkMasterPageHealth() {
            const lastHeartbeat = localStorage.getItem(this.storageKeys.lastHeartbeat);
            const currentMasterId = localStorage.getItem(this.storageKeys.masterPageId);
            
            if (!lastHeartbeat || !currentMasterId || 
                Date.now() - parseInt(lastHeartbeat) > 15000) { // 15秒无心跳
                
                this.log('💔 检测到主页面失效，立即接管签到职责');
                this.emergencyTakeover();
            }
        }

        // 紧急接管机制
        emergencyTakeover() {
            // 立即成为主页面
            this.becomeMasterPage();
            
            // 立即检查签到状态
            this.log('🚨 紧急接管期间立即检查签到状态');
            setTimeout(() => this.checkAndSignIn(), 1000);
            
            // 广播接管信息给其他页面
            this.broadcastTakeover();
        }

        // 广播接管信息
        broadcastTakeover() {
            const takeoverInfo = {
                newMasterId: this.pageId,
                timestamp: Date.now(),
                reason: 'emergency_takeover'
            };
            
            localStorage.setItem('nodeseek_takeover_broadcast', JSON.stringify(takeoverInfo));
            
            // 清理广播信息（避免持久化）
            setTimeout(() => {
                localStorage.removeItem('nodeseek_takeover_broadcast');
            }, 5000);
        }

        // 清理过期页面
        cleanExpiredPages() {
            const registry = this.getPageRegistry();
            const now = Date.now();
            let hasExpired = false;
            
            for (const [pageId, info] of Object.entries(registry)) {
                if (now - info.timestamp > 30000) { // 30秒无活动
                    delete registry[pageId];
                    hasExpired = true;
                    this.log(`🗑️ 清理过期页面: ${pageId}`);
                }
            }
            
            if (hasExpired) {
                this.setPageRegistry(registry);
            }
        }

        // 获取页面注册表
        getPageRegistry() {
            const registry = localStorage.getItem(this.storageKeys.pageRegistry);
            return registry ? JSON.parse(registry) : {};
        }

        // 设置页面注册表
        setPageRegistry(registry) {
            localStorage.setItem(this.storageKeys.pageRegistry, JSON.stringify(registry));
        }

        // 监听localStorage变化
        setupStorageListener() {
            window.addEventListener('storage', (e) => {
                if (e.key === this.storageKeys.masterPageId && e.newValue !== this.pageId) {
                    this.isMasterPage = false;
                    this.log(`👥 检测到新的主页面: ${e.newValue}`);
                }
                
                // 监听紧急接管广播
                if (e.key === 'nodeseek_takeover_broadcast' && e.newValue) {
                    try {
                        const takeoverInfo = JSON.parse(e.newValue);
                        if (takeoverInfo.newMasterId !== this.pageId) {
                            this.isMasterPage = false;
                            this.log(`🚨 收到紧急接管广播，新主页面: ${takeoverInfo.newMasterId}`);
                        }
                    } catch (error) {
                        this.log('❌ 解析接管广播失败:', error);
                    }
                }
            });
        }

        // 页面卸载前处理
        setupPageUnloadHandler() {
            const handleUnload = () => {
                // 清理心跳
                if (this.heartbeatInterval) {
                    clearInterval(this.heartbeatInterval);
                }
                
                // 如果是主页面，释放主页面权限
                if (this.isMasterPage) {
                    localStorage.removeItem(this.storageKeys.masterPageId);
                    localStorage.removeItem(this.storageKeys.lastHeartbeat);
                    this.log('👑 主页面卸载，释放主页面权限');
                }
                
                // 从注册表中移除当前页面
                const registry = this.getPageRegistry();
                delete registry[this.pageId];
                this.setPageRegistry(registry);
                
                // 清理锁状态，避免影响其他页面
                this.releaseExecutingLock();
                this.releaseLock();
                this.log(`🚪 页面卸载完成 [${this.pageId}]`);
            };

            window.addEventListener('beforeunload', handleUnload);
            window.addEventListener('pagehide', handleUnload);
        }

        // 定时器异常恢复机制
        setupTimerRecovery() {
            let recoveryCheckCount = 0;
            
            setInterval(() => {
                recoveryCheckCount++;
                
                // 每分钟检查一次签到状态
                if (recoveryCheckCount % 20 === 0) { // 3秒 * 20 = 60秒
                    this.log('🔧 定时器异常恢复检查');
                    this.checkAndSignIn();
                }
            }, 3000);
        }

        // 递归检测器（最后防线）
        setupRecursiveChecker() {
            const recursiveCheck = () => {
                // 如果今日已签到，跳过检查
                if (this.hasSignedToday()) {
                    setTimeout(recursiveCheck, 60000); // 已签到后每分钟检查一次即可
                    return;
                }

                this.checkAndSignIn();
                
                // 在关键时刻更频繁检查
                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();
                const second = now.getSeconds();
                
                let nextDelay = 30000; // 默认30秒
                
                if ((hour === 23 && minute === 59 && second >= 50) || 
                    (hour === 0 && minute === 0)) {
                    nextDelay = 5000; // 关键时刻5秒一次
                }
                
                setTimeout(recursiveCheck, nextDelay);
            };
            
            setTimeout(recursiveCheck, 5000);
        }

        // 处理页面恢复
        handlePageRestore(source) {
            const now = Date.now();
            let backgroundDuration = 0;
            
            if (this.backgroundStartTime) {
                backgroundDuration = now - this.backgroundStartTime;
                this.backgroundStartTime = null;
            }

            const durationMinutes = Math.round(backgroundDuration / 60000);
            this.log(`🔄 ${source} (后台时长: ${durationMinutes}分钟)`);

            // 页面恢复时立即检查签到
            setTimeout(() => {
                if (!this.hasSignedToday()) {
                    this.checkAndSignIn();
                }
            }, 1000);
        }

        // 安全执行签到
        async safeExecuteSignIn() {
            // 首先检查今日是否已签到（最重要的检查）
            if (this.hasSignedToday()) {
                // 今日已签到，完全跳过，不输出任何日志避免刷屏
                return;
            }

            // 检查是否为主页面
            if (!this.isMasterPage) {
                return;
            }

            // 检查执行锁
            if (this.isExecuting()) {
                return;
            }

            // 检查签到锁
            if (this.isLocked()) {
                return;
            }

            // 执行签到前再次确认未签到
            if (this.hasSignedToday()) {
                return;
            }

            await this.performSignIn();
        }

        // 检查并执行签到
        async checkAndSignIn() {
            try {
                await this.safeExecuteSignIn();
            } catch (error) {
                this.log('❌ 签到检查出错:', error);
            }
        }

        // 执行签到
        async performSignIn() {
            // 执行前最后一次检查
            if (this.hasSignedToday()) {
                return;
            }

            // ⚡ 关键：执行签到API前立即记录状态，防止重复执行
            this.recordSignInSuccess();
            this.logToOperationDialog('✅ 今日已签到');

            // 设置执行锁和签到锁
            this.setExecutingLock();
            this.setLock();

            try {
                const response = await fetch(this.SIGN_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                // 签到API已执行，无论成功失败都不再重复
                
            } catch (error) {
                // 即使失败也不重试，因为已记录状态
            } finally {
                // 释放执行锁和签到锁
                this.releaseExecutingLock();
                this.releaseLock();
            }
        }

        // 处理签到响应（已废弃，因为执行前已记录状态）
        handleSignInResponse(data) {
            // 不再处理响应，因为在执行API前已经记录状态
            // 无论成功失败都不影响签到状态记录
        }

        // 检查是否在签到时间
        isSignInTime() {
            const now = new Date();
            const hour = now.getHours();

            // 签到时间：从00:00:00开始，全天可签到
            return hour >= 0;
        }

        // 检查是否在扩展签到时间（补偿用）
        isExtendedSignInTime() {
            // 扩展签到时间和主签到时间相同
            return this.isSignInTime();
        }

        // 检查今日是否已签到
        hasSignedToday() {
            const today = this.getTodayString();
            const lastSignTime = localStorage.getItem(this.storageKeys.lastSignTime);
            return lastSignTime === today;
        }

        // 记录签到成功
        recordSignInSuccess() {
            const today = this.getTodayString();
            localStorage.setItem(this.storageKeys.lastSignTime, today);
            // 不输出控制台日志
        }

        // 获取今日日期字符串
        getTodayString() {
            return new Date().toISOString().split('T')[0];
        }

        // 设置执行锁
        setExecutingLock() {
            const lockTime = Date.now() + 10000; // 10秒锁定
            localStorage.setItem(this.storageKeys.executingLock, lockTime.toString());
            this.log('🔒 设置签到执行锁');
        }

        // 检查是否正在执行
        isExecuting() {
            const lockTime = localStorage.getItem(this.storageKeys.executingLock);
            if (!lockTime) return false;

            const now = Date.now();
            const lock = parseInt(lockTime);

            if (now < lock) {
                return true;
            } else {
                // 锁已过期，清理
                localStorage.removeItem(this.storageKeys.executingLock);
                return false;
            }
        }

        // 释放执行锁
        releaseExecutingLock() {
            localStorage.removeItem(this.storageKeys.executingLock);
            this.log('🔓 释放签到执行锁');
        }

        // 设置签到锁
        setLock() {
            const lockTime = Date.now() + 15000; // 15秒锁定
            localStorage.setItem(this.storageKeys.signLock, lockTime.toString());
            this.log('🔒 设置签到锁');
        }

        // 检查是否被锁定
        isLocked() {
            const lockTime = localStorage.getItem(this.storageKeys.signLock);
            if (!lockTime) return false;

            const now = Date.now();
            const lock = parseInt(lockTime);

            if (now < lock) {
                return true;
            } else {
                // 锁已过期，清理
                localStorage.removeItem(this.storageKeys.signLock);
                return false;
            }
        }

        // 释放签到锁
        releaseLock() {
            localStorage.removeItem(this.storageKeys.signLock);
            this.log('🔓 释放签到锁');
        }

        // 清理过期数据
        cleanExpiredData() {
            // 清理过期的锁
            this.isLocked();
            this.isExecuting();

            // 清理非今日的签到记录
            const today = this.getTodayString();
            const lastSignTime = localStorage.getItem(this.storageKeys.lastSignTime);
            if (lastSignTime && lastSignTime !== today) {
                localStorage.removeItem(this.storageKeys.lastSignTime);
                this.log('🧹 清理了昨日签到记录');
            }

            // 清理过期的多标签页数据
            this.cleanExpiredMultiTabData();
        }

        // 清理过期的多标签页数据
        cleanExpiredMultiTabData() {
            const registry = this.getPageRegistry();
            const now = Date.now();
            let hasChanges = false;

            // 清理超过5分钟无活动的页面
            for (const [pageId, info] of Object.entries(registry)) {
                if (now - info.timestamp > 300000) { // 5分钟
                    delete registry[pageId];
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                this.setPageRegistry(registry);
                this.log('🧹 清理了过期的多标签页数据');
            }

            // 检查主页面是否过期
            const masterPageId = localStorage.getItem(this.storageKeys.masterPageId);
            const lastHeartbeat = localStorage.getItem(this.storageKeys.lastHeartbeat);
            
            if (masterPageId && (!registry[masterPageId] || 
                (lastHeartbeat && now - parseInt(lastHeartbeat) > 300000))) {
                localStorage.removeItem(this.storageKeys.masterPageId);
                localStorage.removeItem(this.storageKeys.lastHeartbeat);
                this.log('🧹 清理了过期的主页面信息');
            }
        }

        // 输出到操作日志弹窗
        logToOperationDialog(message) {
            // 检查是否有全局的addLog函数（来自主脚本）
            if (typeof window.addLog === 'function') {
                window.addLog(message);
            }
            // 不再输出到控制台
        }

        // 日志输出（已禁用所有控制台输出）
        log(...args) {
            // 完全禁用控制台输出
        }
    }

    // 启动自动签到系统
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new NodeSeekAutoSignIn();
        });
    } else {
        new NodeSeekAutoSignIn();
    }

})();
