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
            this.isDebug = false;
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
                
                // 立即检查是否在签到时间（页面加载时）
                if (this.isSignInTime()) {
                    this.log('🚨 页面加载时检测到签到时间，立即执行签到');
                    setTimeout(() => this.forceSignIn(), 2000);
                }
                
                // 初始化多标签页管理
                this.initMultiTabManagement();
                
                this.startSignInMonitor();
                this.setupCompensationMechanisms();
            }
        }

        // 检查是否是NodeSeek页面
        isNodeSeekPage() {
            return window.location.hostname === 'www.nodeseek.com';
        }

        // 启动签到监控
        startSignInMonitor() {
            // 立即检查一次
            setTimeout(() => this.checkAndSignIn(), 1000);
            
            // 强制签到机制：每天00:00:30强制检查一次
            this.setupForceSignIn();
            
            // 多重保险机制：确保到时间一定运行
            this.setupMultipleInsurance();

            // 主定时器：每秒检查
            setInterval(() => {
                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();
                const second = now.getSeconds();

                // 预签到模式：23:59:55开始进入预签到模式
                if (hour === 23 && minute === 59 && second >= 55) {
                    if (!this.isPreSignMode) {
                        this.isPreSignMode = true;
                        this.log('🎯 进入预签到模式，强化监控中...');
                    }
                }

                // 预签到模式状态输出
                if (this.isPreSignMode && second % 2 === 0) {
                    this.log(`⏰ 预签到模式 - 当前时间: ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`);
                }

                // 精确签到时间检查：00:00:00-00:00:05
                if (hour === 0 && minute === 0 && second <= 5) {
                    this.checkAndSignIn();
                }

                // 退出预签到模式
                if (hour === 0 && minute === 0 && second > 5) {
                    if (this.isPreSignMode) {
                        this.isPreSignMode = false;
                        this.log('🔚 退出预签到模式');
                    }
                }
            }, 1000);

            // 备用定时器：防止主定时器失效
            setInterval(() => {
                if (this.isSignInTime() || this.isExtendedSignInTime()) {
                    this.checkAndSignIn();
                }
            }, 1500);

            this.log('📅 自动签到监控已启动');
        }

        // 设置强制签到机制
        setupForceSignIn() {
            setInterval(() => {
                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();
                const second = now.getSeconds();
                
                // 每天00:00:30强制检查签到
                if (hour === 0 && minute === 0 && second === 30) {
                    this.log('🚨 强制签到检查触发');
                    this.forceSignIn();
                }
            }, 1000);
        }

        // 多重保险机制：确保到时间一定运行
        setupMultipleInsurance() {
            // 保险机制1：使用setTimeout精确定时到00:00:00
            this.scheduleExactSignIn();
            
            // 保险机制2：Web Worker（如果支持）
            this.setupWebWorkerTimer();
            
            // 保险机制3：requestAnimationFrame循环检查
            this.setupAnimationFrameChecker();
            
            // 保险机制4：多个setInterval交错检查
            this.setupMultipleIntervals();
            
            // 保险机制5：页面可见性API强化
            this.setupVisibilityAPIChecker();
            
            // 保险机制6：SharedArrayBuffer原子操作（如果支持）
            this.setupSharedArrayBufferTimer();
            
            // 保险机制7：localStorage轮询检查
            this.setupLocalStoragePoller();
        }

        // 保险机制1：精确定时到下一个00:00:00
        scheduleExactSignIn() {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            const timeUntilMidnight = tomorrow.getTime() - now.getTime();
            
            this.log(`⏰ 设置精确定时器，${Math.round(timeUntilMidnight/1000/60)}分钟后执行签到`);
            
            setTimeout(() => {
                this.log('🎯 精确定时器触发！');
                this.forceSignIn();
                
                // 递归设置下一天的定时器
                this.scheduleExactSignIn();
            }, timeUntilMidnight);
        }

        // 保险机制2：Web Worker定时器
        setupWebWorkerTimer() {
            try {
                const workerCode = `
                    let lastCheck = Date.now();
                    setInterval(() => {
                        const now = new Date();
                        const hour = now.getHours();
                        const minute = now.getMinutes();
                        const second = now.getSeconds();
                        
                        if (hour === 0 && minute === 0 && second <= 5) {
                            postMessage({type: 'signInTime', time: now.getTime()});
                        }
                        
                        // 检测时间跳跃
                        const currentTime = Date.now();
                        if (currentTime - lastCheck > 10000) {
                            postMessage({type: 'timeJump', gap: currentTime - lastCheck});
                        }
                        lastCheck = currentTime;
                    }, 1000);
                `;
                
                const blob = new Blob([workerCode], {type: 'application/javascript'});
                const worker = new Worker(URL.createObjectURL(blob));
                
                worker.onmessage = (e) => {
                    if (e.data.type === 'signInTime') {
                        this.log('🔧 Web Worker检测到签到时间');
                        this.forceSignIn();
                    } else if (e.data.type === 'timeJump') {
                                            this.log(`⚡ Web Worker检测到时间跳跃: ${Math.round(e.data.gap/1000)}秒`);
                    if (this.isSignInTime()) {
                        this.forceSignIn();
                    }
                    }
                };
                
                this.log('🔧 Web Worker定时器已启动');
            } catch (error) {
                this.log('❌ Web Worker不支持:', error.message);
            }
        }

        // 保险机制3：requestAnimationFrame循环检查
        setupAnimationFrameChecker() {
            let lastCheckTime = Date.now();
            
            const animationCheck = () => {
                const now = Date.now();
                const timeDiff = now - lastCheckTime;
                
                // 如果时间差异过大，说明可能被暂停过
                if (timeDiff > 5000) {
                    this.log(`🎬 AnimationFrame检测到时间跳跃: ${Math.round(timeDiff/1000)}秒`);
                    if (this.isSignInTime()) {
                        this.forceSignIn();
                    }
                }
                
                // 检查是否是签到时间
                const date = new Date(now);
                if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() <= 5) {
                    if (Math.random() < 0.01) { // 1%概率执行，避免过于频繁
                        this.log('🎬 AnimationFrame检测到签到时间');
                        this.forceSignIn();
                    }
                }
                
                lastCheckTime = now;
                requestAnimationFrame(animationCheck);
            };
            
            requestAnimationFrame(animationCheck);
            this.log('🎬 AnimationFrame检查器已启动');
        }

        // 保险机制4：多个setInterval交错检查
        setupMultipleIntervals() {
            // 1.1秒间隔的检查器
            setInterval(() => {
                if (this.isSignInTime()) {
                    this.log('⏱️ 1.1秒检查器触发');
                    this.forceSignIn();
                }
            }, 1100);
            
            // 1.3秒间隔的检查器
            setInterval(() => {
                if (this.isSignInTime()) {
                    this.log('⏱️ 1.3秒检查器触发');
                    this.forceSignIn();
                }
            }, 1300);
            
            // 2.7秒间隔的检查器
            setInterval(() => {
                if (this.isSignInTime()) {
                    this.log('⏱️ 2.7秒检查器触发');
                    this.forceSignIn();
                }
            }, 2700);
            
            this.log('⏱️ 多重间隔检查器已启动');
        }

        // 保险机制5：页面可见性API强化
        setupVisibilityAPIChecker() {
            let hiddenTime = null;
            
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    hiddenTime = Date.now();
                    this.log('👁️ 页面进入后台');
                } else {
                    if (hiddenTime) {
                        const hiddenDuration = Date.now() - hiddenTime;
                        this.log(`👁️ 页面恢复前台，后台时长: ${Math.round(hiddenDuration/1000)}秒`);
                        
                        // 如果后台时间跨越了签到时间，立即检查
                        const hiddenStart = new Date(hiddenTime);
                        const now = new Date();
                        
                        if (hiddenStart.getDate() !== now.getDate() || 
                            (hiddenStart.getHours() === 23 && now.getHours() === 0 && 
                             now.getMinutes() === 0 && now.getSeconds() <= 5)) {
                            this.log('👁️ 检测到跨越签到时间，立即执行');
                            this.forceSignIn();
                        }
                    }
                    hiddenTime = null;
                }
            });
            
            this.log('👁️ 页面可见性检查器已启动');
        }

        // 保险机制6：SharedArrayBuffer原子操作
        setupSharedArrayBufferTimer() {
            try {
                if (typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined') {
                    const buffer = new SharedArrayBuffer(16);
                    const view = new Int32Array(buffer);
                    
                    // 在Web Worker中使用原子操作
                    const workerCode = `
                        self.onmessage = function(e) {
                            const buffer = e.data.buffer;
                            const view = new Int32Array(buffer);
                            
                            setInterval(() => {
                                const now = Date.now();
                                Atomics.store(view, 0, now);
                                
                                const date = new Date(now);
                                if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() <= 5) {
                                    Atomics.store(view, 1, 1); // 信号：需要签到
                                }
                            }, 1000);
                        };
                    `;
                    
                    const blob = new Blob([workerCode], {type: 'application/javascript'});
                    const worker = new Worker(URL.createObjectURL(blob));
                    worker.postMessage({buffer: buffer});
                    
                    // 主线程检查原子信号
                    setInterval(() => {
                        const signalValue = Atomics.load(view, 1);
                        if (signalValue === 1) {
                            this.log('⚛️ SharedArrayBuffer检测到签到信号');
                            Atomics.store(view, 1, 0); // 重置信号
                            this.forceSignIn();
                        }
                    }, 500);
                    
                    this.log('⚛️ SharedArrayBuffer定时器已启动');
                } else {
                    this.log('❌ SharedArrayBuffer不支持');
                }
            } catch (error) {
                this.log('❌ SharedArrayBuffer设置失败:', error.message);
            }
        }

        // 保险机制7：localStorage轮询检查
        setupLocalStoragePoller() {
            const TIMER_KEY = 'nodeseek_timer_heartbeat';
            const SIGNAL_KEY = 'nodeseek_signin_signal';
            
            // 设置一个独立的定时器更新localStorage
            setInterval(() => {
                const now = Date.now();
                localStorage.setItem(TIMER_KEY, now.toString());
                
                                            const date = new Date(now);
                            if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() <= 5) {
                                localStorage.setItem(SIGNAL_KEY, now.toString());
                            }
            }, 1000);
            
            // 监听localStorage变化
            let lastHeartbeat = Date.now();
            setInterval(() => {
                const heartbeat = localStorage.getItem(TIMER_KEY);
                const signal = localStorage.getItem(SIGNAL_KEY);
                
                if (heartbeat) {
                    const heartbeatTime = parseInt(heartbeat);
                    
                    // 检测时间跳跃
                    if (heartbeatTime - lastHeartbeat > 10000) {
                        this.log(`💾 localStorage检测到时间跳跃: ${Math.round((heartbeatTime - lastHeartbeat)/1000)}秒`);
                        if (this.isSignInTime()) {
                            this.forceSignIn();
                        }
                    }
                    lastHeartbeat = heartbeatTime;
                }
                
                if (signal) {
                    const signalTime = parseInt(signal);
                    const now = Date.now();
                    
                    // 如果信号是最近5秒内的，执行签到
                    if (now - signalTime < 5000) {
                        this.log('💾 localStorage检测到签到信号');
                        localStorage.removeItem(SIGNAL_KEY); // 清除信号
                        this.forceSignIn();
                    }
                }
            }, 1500);
            
            this.log('💾 localStorage轮询检查器已启动');
        }

        // 强制签到（绕过所有检查）
        async forceSignIn() {
            // 检查今日是否已签到
            if (this.hasSignedToday()) {
                this.log('✅ 今日已签到，跳过强制签到');
                return;
            }

            this.log('🚨 执行强制签到');
            
            // 临时成为主页面
            const originalMasterStatus = this.isMasterPage;
            this.isMasterPage = true;
            
            try {
                await this.performSignIn();
            } catch (error) {
                this.log('❌ 强制签到失败:', error);
            } finally {
                // 恢复原始状态
                this.isMasterPage = originalMasterStatus;
            }
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
                        if (this.isSignInTime()) {
                            this.log('👆 检测到用户活动，检查补偿签到');
                            this.checkAndSignIn();
                        }
                    }, 2000);
            };

            ['mousedown', 'keydown', 'scroll', 'click', 'touchstart', 'touchmove'].forEach(event => {
                document.addEventListener(event, handleUserActivity, { passive: true });
            });

            // 页面加载补偿（仅在5秒窗口内）
            if (this.isSignInTime()) {
                this.log('🔄 页面在签到时间段内加载，立即检查补偿签到');
                setTimeout(() => this.checkAndSignIn(), 2000);
            }

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

            // this.log('🛡️ 长时间挂机补偿机制已启动'); // 已删除此日志输出
            
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
                        (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() <= 30)) {
                        // this.log(`📊 多标签页状态 - 活跃页面: ${activePages}个 | 主页面: ${this.pageId.slice(-8)}`); // 已删除此日志输出
                    }
                }
            }, 10000); // 10秒检查一次
        }

        // 高精度检查器（关键时刻强化）
        setupHighPrecisionChecker() {
            setInterval(() => {
                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();
                const second = now.getSeconds();

                // 在关键时刻（23:59:50-00:00:05）进行高频检查
                if ((hour === 23 && minute === 59 && second >= 50) || 
                    (hour === 0 && minute === 0 && second <= 5)) {
                    if (this.isSignInTime()) {
                        this.checkAndSignIn();
                    }
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
                        // this.log(`⚡ Performance API检测到时间跳跃: ${Math.round(timeDiff/1000)}秒`); // 已删除此日志输出
                        if (this.isSignInTime()) {
                            // this.log('🔄 Performance API触发补偿签到'); // 已删除此日志输出
                            this.checkAndSignIn();
                        }
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
            
            // this.log(`📋 多标签页管理初始化完成 [主页面: ${this.isMasterPage}]`); // 已删除此日志输出
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
            
            // 如果没有主页面，或主页面已失效，或者是第一个页面
            if (!currentMasterId || !registry[currentMasterId] || 
                Date.now() - registry[currentMasterId].timestamp > 10000 ||
                Object.keys(registry).length === 1) {
                
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
            
            // 如果是在签到时间段，立即检查是否需要补偿签到（仅5秒窗口）
            if (this.isSignInTime()) {
                this.log('🚨 紧急接管期间检测到签到时间，立即执行补偿签到');
                setTimeout(() => this.checkAndSignIn(), 1000);
            }
            
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
                    // this.log(`🗑️ 清理过期页面: ${pageId}`); // 已删除此日志输出
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
                    // this.log(`👥 检测到新的主页面: ${e.newValue}`); // 已删除此日志输出
                }
                
                // 监听紧急接管广播
                if (e.key === 'nodeseek_takeover_broadcast' && e.newValue) {
                    try {
                        const takeoverInfo = JSON.parse(e.newValue);
                        if (takeoverInfo.newMasterId !== this.pageId) {
                            this.isMasterPage = false;
                            // this.log(`🚨 收到紧急接管广播，新主页面: ${takeoverInfo.newMasterId}`); // 已删除此日志输出
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
                    // this.log('👑 主页面卸载，释放主页面权限'); // 已删除此日志输出
                }
                
                // 从注册表中移除当前页面
                const registry = this.getPageRegistry();
                delete registry[this.pageId];
                this.setPageRegistry(registry);
                
                // 清理锁状态，避免影响其他页面
                this.releaseExecutingLock();
                this.releaseLock();
                // this.log(`🚪 页面卸载完成 [${this.pageId}]`); // 已删除此日志输出
            };

            window.addEventListener('beforeunload', handleUnload);
            window.addEventListener('pagehide', handleUnload);
        }

        // 定时器异常恢复机制
        setupTimerRecovery() {
            let recoveryCheckCount = 0;
            
            setInterval(() => {
                recoveryCheckCount++;
                
                // 每分钟在签到时间段内检查一次
                if (recoveryCheckCount % 20 === 0) { // 3秒 * 20 = 60秒
                    if (this.isSignInTime()) {
                        this.log('🔧 定时器异常恢复检查');
                        this.checkAndSignIn();
                    }
                }
            }, 3000);
        }

        // 递归检测器（最后防线）
        setupRecursiveChecker() {
            const recursiveCheck = () => {
                if (this.isSignInTime()) {
                    this.log('🔁 递归检测器触发');
                    this.checkAndSignIn();
                }
                
                // 在关键时刻更频繁检查
                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();
                const second = now.getSeconds();
                
                let nextDelay = 10000; // 默认10秒
                
                if ((hour === 23 && minute === 59 && second >= 50) || 
                    (hour === 0 && minute === 0 && second <= 5)) {
                    nextDelay = 2000; // 关键时刻2秒一次
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
            // this.log(`🔄 ${source} (后台时长: ${durationMinutes}分钟)`); // 已删除此日志输出

            // 在签到时间段内恢复时立即检查（仅5秒窗口）
            if (this.isSignInTime()) {
                this.log('⚡ 页面在签到时间段内恢复，立即检查补偿签到');
                setTimeout(() => this.checkAndSignIn(), 1000);
            }
        }

        // 安全执行签到
        async safeExecuteSignIn() {
            // 检查是否为主页面
            if (!this.isMasterPage) {
                // 从页面不执行签到，但在关键时刻显示状态
                if (this.isSignInTime() && Math.random() < 0.1) { // 10%概率显示，避免日志过多
                    this.log(`👥 从页面等待主页面执行签到 [${this.pageId}]`);
                }
                return;
            }

            // 检查执行锁
            if (this.isExecuting()) {
                this.log('🔒 签到正在执行中，跳过（执行锁）');
                return;
            }

            // 检查签到锁
            if (this.isLocked()) {
                this.log('🔒 签到正在执行中，跳过（签到锁）');
                return;
            }

            // 检查时间条件（仅在5秒窗口内）
            if (!this.isSignInTime()) {
                return;
            }

            // 检查今日是否已签到
            if (this.hasSignedToday()) {
                this.log('✅ 今日已签到，跳过');
                return;
            }

            this.log(`🎯 主页面签到时间到！开始执行自动签到 [${this.pageId}]`);
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
            // 设置执行锁和签到锁
            this.setExecutingLock();
            this.setLock();

            try {
                this.log('🎲 发送签到请求...');

                const response = await fetch(this.SIGN_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                this.handleSignInResponse(data);

            } catch (error) {
                this.log('❌ 自动签到失败:', error);
            } finally {
                // 释放执行锁和签到锁
                this.releaseExecutingLock();
                this.releaseLock();
            }
        }

        // 处理签到响应
        handleSignInResponse(data) {
            this.log('📥 签到响应:', data);

            if (data.success) {
                // 签到成功
                const message = `🎲 自动签到成功！${data.message || ''}`;
                const details = `💰 获得: ${data.gain}鸡腿 | 💳 余额: ${data.current}鸡腿`;

                this.log(`✅ ${message}`);
                this.log(`💰 ${details}`);

                // 记录签到成功
                this.recordSignInSuccess();

            } else {
                // 签到失败或已签到
                const message = data.message || '签到失败';
                this.log(`⚠️ ${message}`);

                // 如果是已签到，记录状态
                if (message.includes('已签到') || message.includes('已经签到')) {
                    this.recordSignInSuccess();
                }
            }
        }

        // 检查是否在精确签到时间
        isSignInTime() {
            const now = new Date();
            const hour = now.getHours();
            const minute = now.getMinutes();
            const second = now.getSeconds();

            // 精确签到时间窗口：00:00:00 - 00:00:05（仅5秒窗口）
            return hour === 0 && minute === 0 && second <= 5;
        }

        // 检查是否在扩展签到时间（补偿用）
        isExtendedSignInTime() {
            const now = new Date();
            const hour = now.getHours();
            const minute = now.getMinutes();
            const second = now.getSeconds();

            // 扩展签到时间：00:00:00 - 00:00:05（补偿机制也使用相同窗口）
            return hour === 0 && minute === 0 && second <= 5;
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
            this.log('📝 记录签到成功状态');
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

        // 日志输出（已禁用）
        log(...args) {
            // 不输出任何日志，保持签到功能正常运行
            // const timestamp = new Date().toLocaleTimeString();
            // console.log(`[${timestamp}] [NodeSeek自动签到]`, ...args);
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
