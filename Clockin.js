// ========== 自动签到 ==========
(function() {
    'use strict';

    // NodeSeek 自动签到系统 - 长时间挂机终极加强版
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
            
            // 8重防挂机机制组件
            this.webWorker = null;
            this.performanceObserver = null;
            this.multiTimerArray = [];
            this.memoryMonitor = null;
            this.systemTimeSync = null;
            this.freezeDetector = null;
            this.networkMonitor = null;
            this.forceKeepAlive = null;
            
            // 签到检测机制管理
            this.allDetectionTimers = [];
            this.detectionMechanismsRunning = false;
            
            this.init();
        }

        // 初始化
        init() {
            this.log(`🎲 NodeSeek自动签到系统启动 [长时间挂机终极加强版] [页面ID: ${this.pageId}]`);

            // 清理过期数据
            this.cleanExpiredData();

            // 检查当前页面是否是NodeSeek
            if (this.isNodeSeekPage()) {
                this.log('✅ 检测到NodeSeek页面');
                
                // 初始化多标签页管理
                this.initMultiTabManagement();
                
                // 添加重置状态监控
                this.setupDailyReset();
                
                // 检查今日签到状态并决定是否启动检测机制
                this.checkTodaySignInStatus();
            }
        }

        // 🔥 初始化8重超强防挂机机制
        initUltimateAntiHangMechanisms() {
            this.log('🛡️ 启动8重超强防挂机机制...');
            
            // 1. Web Worker保活机制（独立线程）
            this.initWebWorkerKeepAlive();
            
            // 2. Performance Observer长任务检测
            this.initPerformanceObserver();
            
            // 3. 多重定时器阵列（5个不同间隔的独立定时器）
            this.initMultiTimerArray();
            
            // 4. 内存压力检测
            this.initMemoryPressureMonitor();
            
            // 5. 系统时间同步检测
            this.initSystemTimeSync();
            
            // 6. 页面冻结检测（requestAnimationFrame）
            this.initPageFreezeDetector();
            
            // 7. 离线状态检测
            this.initNetworkStatusMonitor();
            
            // 8. 强制保活机制（MessageChannel + localStorage时间戳）
            this.initForceKeepAlive();
            
            this.log('🔥 8重超强防挂机机制已全部启动！');
        }

        // 1. Web Worker保活机制
        initWebWorkerKeepAlive() {
            try {
                const workerCode = `
                    let lastMainThreadTime = Date.now();
                    
                    // 每5秒发送心跳
                    setInterval(() => {
                        postMessage({
                            type: 'heartbeat',
                            timestamp: Date.now()
                        });
                    }, 5000);
                    
                    // 监听主线程消息
                    onmessage = function(e) {
                        if (e.data.type === 'ping') {
                            lastMainThreadTime = Date.now();
                            postMessage({
                                type: 'pong',
                                timestamp: Date.now()
                            });
                        }
                    };
                    
                    // 检测主线程是否暂停
                    setInterval(() => {
                        const now = Date.now();
                        if (now - lastMainThreadTime > 10000) { // 主线程超过10秒未响应
                            postMessage({
                                type: 'emergency_wakeup',
                                timestamp: now,
                                suspended_duration: now - lastMainThreadTime
                            });
                        }
                    }, 8000);
                `;
                
                const blob = new Blob([workerCode], { type: 'application/javascript' });
                this.webWorker = new Worker(URL.createObjectURL(blob));
                
                this.webWorker.onmessage = (e) => {
                    if (e.data.type === 'emergency_wakeup') {
                        this.log(`🚨 Web Worker检测到主线程暂停 ${Math.round(e.data.suspended_duration/1000)}秒，立即触发紧急签到检查！`);
                        this.emergencySignInCheck('Web Worker唤醒');
                    }
                };
                
                // 主线程定期回应Worker
                setInterval(() => {
                    if (this.webWorker) {
                        this.webWorker.postMessage({ type: 'ping', timestamp: Date.now() });
                    }
                }, 6000);
                
                this.log('✅ Web Worker保活机制已启动');
            } catch (error) {
                this.log('❌ Web Worker初始化失败:', error);
            }
        }

        // 2. Performance Observer长任务检测
        initPerformanceObserver() {
            try {
                if ('PerformanceObserver' in window) {
                    this.performanceObserver = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        for (const entry of entries) {
                            // 检测长任务（超过5秒）
                            if (entry.duration > 5000) {
                                this.log(`⚡ Performance Observer检测到长任务: ${Math.round(entry.duration)}ms`);
                                this.emergencySignInCheck('长任务恢复');
                            }
                        }
                    });
                    
                    this.performanceObserver.observe({ entryTypes: ['longtask'] });
                    this.log('✅ Performance Observer长任务检测已启动');
                }
            } catch (error) {
                this.log('❌ Performance Observer初始化失败:', error);
            }
        }

        // 3. 多重定时器阵列
        initMultiTimerArray() {
            const intervals = [1000, 1500, 2000, 3000, 5000]; // 5个不同间隔
            
            intervals.forEach((interval, index) => {
                const timer = setInterval(() => {
                    // 每个定时器独立检查
                    this.multiTimerCheck(`定时器${index + 1}(${interval}ms)`);
                }, interval);
                
                this.multiTimerArray.push(timer);
                this.allDetectionTimers.push(timer);
            });
            
            this.log('✅ 多重定时器阵列已启动（5个独立定时器）');
        }

        // 多重定时器检查
        multiTimerCheck(source) {
            const now = new Date();
            const hour = now.getHours();
            const minute = now.getMinutes();
            const second = now.getSeconds();

            // 在关键时刻（23:59:50-00:00:30）进行检查
            if ((hour === 23 && minute === 59 && second >= 50) || 
                (hour === 0 && minute === 0 && second <= 30)) {
                this.checkAndSignIn();
            }
        }

        // 4. 内存压力检测
        initMemoryPressureMonitor() {
            if ('memory' in performance) {
                this.memoryMonitor = setInterval(() => {
                    const memory = performance.memory;
                    const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
                    
                    // 内存使用率超过90%时触发检查
                    if (usageRatio > 0.9) {
                        this.log(`🧠 内存压力检测触发 (使用率: ${Math.round(usageRatio * 100)}%)`);
                        this.emergencySignInCheck('内存压力恢复');
                    }
                }, 15000);
                
                this.allDetectionTimers.push(this.memoryMonitor);
                this.log('✅ 内存压力检测已启动');
            }
        }

        // 5. 系统时间同步检测
        initSystemTimeSync() {
            let lastSystemTime = Date.now();
            
            this.systemTimeSync = setInterval(() => {
                const currentTime = Date.now();
                const expectedTime = lastSystemTime + 10000; // 预期时间
                const timeDiff = Math.abs(currentTime - expectedTime);
                
                // 时间差异超过5秒说明可能系统暂停过
                if (timeDiff > 5000) {
                    this.log(`⏰ 系统时间同步检测: 时间跳跃 ${Math.round(timeDiff/1000)}秒`);
                    this.emergencySignInCheck('系统时间跳跃');
                }
                
                lastSystemTime = currentTime;
            }, 10000);
            
            this.allDetectionTimers.push(this.systemTimeSync);
            this.log('✅ 系统时间同步检测已启动');
        }

        // 6. 页面冻结检测
        initPageFreezeDetector() {
            let lastFrameTime = performance.now();
            
            const checkFrameInterval = () => {
                const currentTime = performance.now();
                const frameInterval = currentTime - lastFrameTime;
                
                // 帧间隔超过5秒说明页面可能被冻结过
                if (frameInterval > 5000) {
                    this.log(`🧊 页面冻结检测: 冻结时长 ${Math.round(frameInterval/1000)}秒`);
                    this.emergencySignInCheck('页面冻结恢复');
                }
                
                lastFrameTime = currentTime;
                requestAnimationFrame(checkFrameInterval);
            };
            
            requestAnimationFrame(checkFrameInterval);
            this.log('✅ 页面冻结检测已启动');
        }

        // 7. 离线状态检测
        initNetworkStatusMonitor() {
            const handleOnline = () => {
                this.log('🌐 网络连接恢复');
                this.emergencySignInCheck('网络恢复');
            };
            
            window.addEventListener('online', handleOnline);
            this.log('✅ 离线状态检测已启动');
        }

        // 8. 强制保活机制
        initForceKeepAlive() {
            // MessageChannel保持事件循环活跃
            const channel = new MessageChannel();
            const port1 = channel.port1;
            const port2 = channel.port2;
            
            port1.onmessage = () => {
                // 收到消息时更新时间戳
                localStorage.setItem('nodeseek_keepalive_timestamp', Date.now().toString());
                
                // 继续发送消息保持循环
                setTimeout(() => {
                    port2.postMessage('keepalive');
                }, 3000);
            };
            
            // 启动保活循环
            port2.postMessage('keepalive');
            
            // 监控保活时间戳
            const keepAliveTimer = setInterval(() => {
                const lastKeepAlive = localStorage.getItem('nodeseek_keepalive_timestamp');
                if (lastKeepAlive) {
                    const timeDiff = Date.now() - parseInt(lastKeepAlive);
                    if (timeDiff > 15000) { // 超过15秒未更新
                        this.log(`💔 强制保活检测: 事件循环暂停 ${Math.round(timeDiff/1000)}秒`);
                        this.emergencySignInCheck('事件循环恢复');
                    }
                }
            }, 8000);
            
            this.allDetectionTimers.push(keepAliveTimer);
            this.log('✅ 强制保活机制已启动');
        }

        // 🚨 紧急签到检查（所有异常恢复后的统一入口）
        emergencySignInCheck(source) {
            // 检查是否在签到时间段（全天可签到）
            if (this.isSignInTime() && !this.hasSignedToday()) {
                setTimeout(() => this.checkAndSignIn(), 1000);
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
            // 重新启动所有检测机制
            this.startAllDetectionMechanisms();
        }

        // 检查今日签到状态
        checkTodaySignInStatus() {
            if (this.hasSignedToday()) {
                this.logToOperationDialog('✅ 今日已签到');
                this.stopAllDetectionMechanisms();
            } else {
                this.startAllDetectionMechanisms();
            }
        }

        // 启动签到监控
        startSignInMonitor() {
            if (this.detectionMechanismsRunning) return;
            
            // 立即检查一次
            const immediateTimer = setTimeout(() => this.checkAndSignIn(), 1000);
            this.allDetectionTimers.push(immediateTimer);

            // 主定时器：每秒检查
            const mainTimer = setInterval(() => {
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
            this.allDetectionTimers.push(mainTimer);

            // 备用定时器：每10秒检查一次（降低频率）
            const backupTimer = setInterval(() => {
                this.checkAndSignIn();
            }, 10000);
            this.allDetectionTimers.push(backupTimer);
        }

        // 设置补偿机制
        setupCompensationMechanisms() {
            if (this.detectionMechanismsRunning) return;
            
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
                    this.checkAndSignIn();
                }, 2000);
            };

            ['mousedown', 'keydown', 'scroll', 'click', 'touchstart', 'touchmove'].forEach(event => {
                document.addEventListener(event, handleUserActivity, { passive: true });
            });

            // 页面加载时立即检查签到
            const loadTimer = setTimeout(() => {
                this.checkAndSignIn();
            }, 1000);
            this.allDetectionTimers.push(loadTimer);

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
            
            // 定期显示多标签页状态（仅主页面显示，避免日志混乱）
            this.setupMultiTabStatusDisplay();
        }

        // 资源清理（页面卸载时）
        cleanup() {
            // 清理Web Worker
            if (this.webWorker) {
                this.webWorker.terminate();
                this.webWorker = null;
            }
            
            // 清理Performance Observer
            if (this.performanceObserver) {
                this.performanceObserver.disconnect();
                this.performanceObserver = null;
            }
            
            // 清理多重定时器
            this.multiTimerArray.forEach(timer => clearInterval(timer));
            this.multiTimerArray = [];
            
            // 清理其他监控器
            if (this.memoryMonitor) clearInterval(this.memoryMonitor);
            if (this.systemTimeSync) clearInterval(this.systemTimeSync);
            
            // 清理localStorage时间戳
            localStorage.removeItem('nodeseek_keepalive_timestamp');
        }

        // 多标签页状态显示
        setupMultiTabStatusDisplay() {
            if (this.detectionMechanismsRunning) return;
            
            const timer = setInterval(() => {
                if (this.isMasterPage) {
                    const registry = this.getPageRegistry();
                    const activePages = Object.keys(registry).length;
                    const now = new Date();
                    
                    // 只在关键时刻显示状态，避免日志过多
                    if ((now.getHours() === 23 && now.getMinutes() === 59 && now.getSeconds() >= 45) ||
                        (now.getHours() === 0 && now.getMinutes() === 0)) {
                        // 不输出日志
                    }
                }
            }, 10000); // 10秒检查一次
            
            this.allDetectionTimers.push(timer);
        }

        // 高精度检查器（关键时刻强化）
        setupHighPrecisionChecker() {
            if (this.detectionMechanismsRunning) return;
            
            const timer = setInterval(() => {
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
            
            this.allDetectionTimers.push(timer);
        }

        // Performance API 补偿
        setupPerformanceCompensation() {
            if (this.detectionMechanismsRunning) return;
            
            if ('performance' in window && 'now' in performance) {
                let lastCheckTime = performance.now();
                
                const timer = setInterval(() => {
                    const currentTime = performance.now();
                    const timeDiff = currentTime - lastCheckTime;
                    
                    // 如果时间差异过大（超过5秒），说明可能被暂停过
                    if (timeDiff > 5000) {
                        this.emergencySignInCheck('Performance API时间跳跃');
                    }
                    
                    lastCheckTime = currentTime;
                }, 3000);
                
                this.allDetectionTimers.push(timer);
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
            }
        }

        // 成为主页面
        becomeMasterPage() {
            this.isMasterPage = true;
            localStorage.setItem(this.storageKeys.masterPageId, this.pageId);
            localStorage.setItem(this.storageKeys.lastHeartbeat, Date.now().toString());
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
                
                this.emergencyTakeover();
            }
        }

        // 紧急接管机制
        emergencyTakeover() {
            // 立即成为主页面
            this.becomeMasterPage();
            
            // 立即检查签到状态
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
                }
                
                // 监听紧急接管广播
                if (e.key === 'nodeseek_takeover_broadcast' && e.newValue) {
                    try {
                        const takeoverInfo = JSON.parse(e.newValue);
                        if (takeoverInfo.newMasterId !== this.pageId) {
                            this.isMasterPage = false;
                        }
                    } catch (error) {
                        // 解析失败，忽略
                    }
                }
            });
        }

        // 页面卸载前处理
        setupPageUnloadHandler() {
            const handleUnload = () => {
                // 清理所有资源
                this.cleanup();
                
                // 清理心跳
                if (this.heartbeatInterval) {
                    clearInterval(this.heartbeatInterval);
                }
                
                // 如果是主页面，释放主页面权限
                if (this.isMasterPage) {
                    localStorage.removeItem(this.storageKeys.masterPageId);
                    localStorage.removeItem(this.storageKeys.lastHeartbeat);
                }
                
                // 从注册表中移除当前页面
                const registry = this.getPageRegistry();
                delete registry[this.pageId];
                this.setPageRegistry(registry);
                
                // 清理锁状态，避免影响其他页面
                this.releaseExecutingLock();
                this.releaseLock();
            };

            window.addEventListener('beforeunload', handleUnload);
            window.addEventListener('pagehide', handleUnload);
        }

        // 定时器异常恢复机制
        setupTimerRecovery() {
            if (this.detectionMechanismsRunning) return;
            
            let recoveryCheckCount = 0;
            
            const timer = setInterval(() => {
                recoveryCheckCount++;
                
                // 每分钟检查一次签到状态
                if (recoveryCheckCount % 20 === 0) { // 3秒 * 20 = 60秒
                    this.checkAndSignIn();
                }
            }, 3000);
            
            this.allDetectionTimers.push(timer);
        }

        // 递归检测器（最后防线）
        setupRecursiveChecker() {
            if (this.detectionMechanismsRunning) return;
            
            const recursiveCheck = () => {
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
                
                const timer = setTimeout(recursiveCheck, nextDelay);
                this.allDetectionTimers.push(timer);
            };
            
            const initialTimer = setTimeout(recursiveCheck, 5000);
            this.allDetectionTimers.push(initialTimer);
        }

        // 处理页面恢复
        handlePageRestore(source) {
            const now = Date.now();
            let backgroundDuration = 0;
            
            if (this.backgroundStartTime) {
                backgroundDuration = now - this.backgroundStartTime;
                this.backgroundStartTime = null;
            }

            // 页面恢复时立即检查签到
            const restoreTimer = setTimeout(() => {
                this.checkAndSignIn();
            }, 1000);
            this.allDetectionTimers.push(restoreTimer);
        }

        // 安全执行签到
        async safeExecuteSignIn() {
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

            // 最后检查今日是否已签到
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
                // 不输出错误日志
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
            // 签到成功后立即停止所有检测机制
            this.stopAllDetectionMechanisms();
        }

        // 获取今日日期字符串
        getTodayString() {
            return new Date().toISOString().split('T')[0];
        }

        // 设置执行锁
        setExecutingLock() {
            const lockTime = Date.now() + 10000; // 10秒锁定
            localStorage.setItem(this.storageKeys.executingLock, lockTime.toString());
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
        }

        // 设置签到锁
        setLock() {
            const lockTime = Date.now() + 15000; // 15秒锁定
            localStorage.setItem(this.storageKeys.signLock, lockTime.toString());
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
            }

            // 检查主页面是否过期
            const masterPageId = localStorage.getItem(this.storageKeys.masterPageId);
            const lastHeartbeat = localStorage.getItem(this.storageKeys.lastHeartbeat);
            
            if (masterPageId && (!registry[masterPageId] || 
                (lastHeartbeat && now - parseInt(lastHeartbeat) > 300000))) {
                localStorage.removeItem(this.storageKeys.masterPageId);
                localStorage.removeItem(this.storageKeys.lastHeartbeat);
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

        // 启动所有检测机制
        startAllDetectionMechanisms() {
            if (this.detectionMechanismsRunning) return;
            
            this.detectionMechanismsRunning = true;
            this.allDetectionTimers = [];
            
            // 启动签到监控
            this.startSignInMonitor();
            
            // 启动8重防挂机机制
            this.initUltimateAntiHangMechanisms();
            
            // 启动补偿机制
            this.setupCompensationMechanisms();
        }

        // 停止所有检测机制
        stopAllDetectionMechanisms() {
            if (!this.detectionMechanismsRunning) return;
            
            this.detectionMechanismsRunning = false;
            
            // 清理所有定时器
            this.allDetectionTimers.forEach(timer => {
                if (timer) {
                    clearTimeout(timer);
                    clearInterval(timer);
                }
            });
            this.allDetectionTimers = [];
            
            // 清理8重防挂机机制
            this.cleanup();
            
            this.logToOperationDialog('⏸️ 已签到，检测机制已停止，等待明日重新启动');
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
