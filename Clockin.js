// ========== 自动签到 ==========
(function() {
    'use strict';

    // NodeSeek 签到API地址
    const SIGN_API = '/api/attendance?random=true';

    // 签到系统类
    class NodeSeekSignIn {
        constructor() {
            this.pageId = this.generatePageId();
            this.isMasterPage = false;
            this.timers = [];
            this.isExecuting = false; // 执行锁
            
            // 存储键名
            this.keys = {
                signedToday: 'nodeseek_signed_today',
                masterPageId: 'nodeseek_master_page',
                pageRegistry: 'nodeseek_page_registry',
                lastHeartbeat: 'nodeseek_heartbeat',
                executingLock: 'nodeseek_executing_lock'
            };
            
            this.init();
        }

        // 生成页面唯一ID
        generatePageId() {
            return 'page_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        }

        // 初始化
        init() {
            if (!this.isNodeSeekPage()) {
                return;
            }

            this.log('🎯 NodeSeek签到系统启动中...');
            
            // 清理过期数据
            this.cleanExpiredData();
            
            // 初始化多窗口管理
            this.initMultiWindow();
            
            // 检查签到状态并启动监控
            this.checkAndStartMonitor();
            
            // 设置每日重置
            this.setupDailyReset();
            
            // 设置页面卸载处理
            this.setupUnloadHandler();
        }

        // 检查是否为NodeSeek页面
        isNodeSeekPage() {
            return window.location.hostname === 'www.nodeseek.com';
        }

        // 输出到操作日志弹窗（不输出到控制台）
        log(message) {
            if (typeof window.addLog === 'function') {
                window.addLog(message);
            }
        }

        // 初始化多窗口管理
        initMultiWindow() {
            // 注册当前页面
            this.registerPage();
            
            // 竞选主页面
            this.electMasterPage();
            
            // 开始心跳
            this.startHeartbeat();
            
            // 监听其他页面
            this.setupStorageListener();
        }

        // 注册页面
        registerPage() {
            const registry = this.getPageRegistry();
            registry[this.pageId] = {
                timestamp: Date.now(),
                url: window.location.href
            };
            this.setPageRegistry(registry);
        }

        // 竞选主页面
        electMasterPage() {
            const currentMaster = localStorage.getItem(this.keys.masterPageId);
            const registry = this.getPageRegistry();
            
            // 如果没有主页面或主页面已失效
            if (!currentMaster || !registry[currentMaster] || 
                Date.now() - registry[currentMaster].timestamp > 15000) {
                
                this.becomeMasterPage();
            } else {
                this.isMasterPage = false;
                this.log('📱 当前为从页面，等待主页面管理');
            }
        }

        // 成为主页面
        becomeMasterPage() {
            this.isMasterPage = true;
            localStorage.setItem(this.keys.masterPageId, this.pageId);
            localStorage.setItem(this.keys.lastHeartbeat, Date.now().toString());
            this.log('👑 成为主页面，开始管理签到任务');
        }

        // 心跳检测
        startHeartbeat() {
            const heartbeatTimer = setInterval(() => {
                if (this.isMasterPage) {
                    // 主页面发送心跳
                    localStorage.setItem(this.keys.lastHeartbeat, Date.now().toString());
                    this.updatePageRegistry();
                } else {
                    // 从页面检查主页面状态
                    this.checkMasterHealth();
                }
            }, 5000);
            
            this.timers.push(heartbeatTimer);
        }

        // 更新页面注册信息
        updatePageRegistry() {
            const registry = this.getPageRegistry();
            if (registry[this.pageId]) {
                registry[this.pageId].timestamp = Date.now();
                this.setPageRegistry(registry);
            }
            this.cleanExpiredPages();
        }

        // 检查主页面健康状态
        checkMasterHealth() {
            const lastHeartbeat = localStorage.getItem(this.keys.lastHeartbeat);
            if (!lastHeartbeat || Date.now() - parseInt(lastHeartbeat) > 20000) {
                this.log('🚨 主页面失效，准备接管...');
                this.emergencyTakeover();
            }
        }

        // 紧急接管
        emergencyTakeover() {
            this.becomeMasterPage();
            // 接管后立即检查签到
            setTimeout(() => this.checkAndSign(), 1000);
        }

        // 清理过期页面
        cleanExpiredPages() {
            const registry = this.getPageRegistry();
            const now = Date.now();
            let hasChanges = false;
            
            for (const [pageId, info] of Object.entries(registry)) {
                if (now - info.timestamp > 60000) { // 1分钟无活动
                    delete registry[pageId];
                    hasChanges = true;
                }
            }
            
            if (hasChanges) {
                this.setPageRegistry(registry);
            }
        }

        // 获取页面注册表
        getPageRegistry() {
            const registry = localStorage.getItem(this.keys.pageRegistry);
            return registry ? JSON.parse(registry) : {};
        }

        // 设置页面注册表
        setPageRegistry(registry) {
            localStorage.setItem(this.keys.pageRegistry, JSON.stringify(registry));
        }

        // 监听localStorage变化
        setupStorageListener() {
            window.addEventListener('storage', (e) => {
                if (e.key === this.keys.masterPageId && e.newValue !== this.pageId) {
                    this.isMasterPage = false;
                    this.log('📱 已转为从页面');
                }
            });
        }

        // 检查签到状态并启动监控
        checkAndStartMonitor() {
            if (this.hasSignedToday()) {
                this.log('✅ 今日已签到');
                return;
            }
            
            this.log('⏰ 开始签到监控...');
            this.startSignMonitor();
        }

        // 启动签到监控
        startSignMonitor() {
            // 主定时器 - 每30秒检查一次
            const mainTimer = setInterval(() => {
                this.checkAndSign();
            }, 30000);
            this.timers.push(mainTimer);
            
            // 备用定时器 - 每1分钟检查一次
            const backupTimer = setInterval(() => {
                this.checkAndSign();
            }, 60000);
            this.timers.push(backupTimer);
            
            // 立即检查一次
            setTimeout(() => this.checkAndSign(), 2000);
            
            // 设置长时间挂机保障机制
            this.setupAntiHangMechanisms();
        }

        // 设置长时间挂机保障机制
        setupAntiHangMechanisms() {
            let lastRecoveryTime = 0; // 防止短时间内多次恢复触发
            
            // 页面恢复检查（带防抖）
            const delayedCheck = () => {
                const now = Date.now();
                if (now - lastRecoveryTime < 5000) return; // 5秒内只触发一次
                lastRecoveryTime = now;
                setTimeout(() => this.checkAndSign(), 2000);
            };

            // 页面可见性变化监听
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    delayedCheck();
                }
            });

            // 窗口焦点变化监听
            window.addEventListener('focus', () => {
                delayedCheck();
            });

            // 用户活动监听（节流处理）
            let userActivityTimer = null;
            const handleUserActivity = () => {
                if (userActivityTimer) return;
                userActivityTimer = setTimeout(() => {
                    userActivityTimer = null;
                    this.checkAndSign();
                }, 5000); // 增加到5秒防止频繁触发
            };

            ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
                document.addEventListener(event, handleUserActivity, { passive: true });
            });

            // 高频检查器 - 每15秒检查一次（降低频率）
            const highFreqTimer = setInterval(() => {
                this.checkAndSign();
            }, 15000);
            this.timers.push(highFreqTimer);

            // Performance API 时间跳跃检测
            if ('performance' in window) {
                let lastTime = performance.now();
                const perfTimer = setInterval(() => {
                    const currentTime = performance.now();
                    const timeDiff = currentTime - lastTime;
                    
                    // 如果时间差异过大，说明可能被暂停过
                    if (timeDiff > 20000) { // 增加到20秒防止误触发
                        delayedCheck();
                    }
                    lastTime = currentTime;
                }, 8000); // 降低检查频率
                this.timers.push(perfTimer);
            }

            // 递归检测器（最后防线）
            const recursiveCheck = () => {
                this.checkAndSign();
                setTimeout(recursiveCheck, 60000); // 增加到60秒
            };
            setTimeout(recursiveCheck, 15000);
        }

        // 检查并执行签到
        async checkAndSign() {
            // 只有主页面才能执行签到
            if (!this.isMasterPage) {
                return;
            }

            // 检查是否已签到
            if (this.hasSignedToday()) {
                return;
            }

            // 检查是否正在执行（本地锁）
            if (this.isExecuting) {
                return;
            }

            // 检查全局执行锁
            if (this.isGloballyExecuting()) {
                return;
            }

            // 执行签到
            await this.performSignIn();
        }

        // 执行签到
        async performSignIn() {
            // 最后一次检查，确保不重复执行
            if (this.hasSignedToday() || this.isExecuting || this.isGloballyExecuting()) {
                return;
            }

            try {
                // 设置执行锁
                this.isExecuting = true;
                this.setGlobalExecutingLock();
                
                // 立即记录签到状态，防止重复执行
                this.recordSignedToday();
                this.log('🎯 正在执行签到...');

                const response = await fetch(SIGN_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.log('✅ 签到成功');
                    this.stopAllMonitors();
                } else {
                    this.log('❌ 签到失败：HTTP ' + response.status);
                }
            } catch (error) {
                this.log('❌ 签到失败：网络错误');
            } finally {
                // 释放执行锁
                this.isExecuting = false;
                this.clearGlobalExecutingLock();
            }
        }

        // 检查今日是否已签到
        hasSignedToday() {
            const today = this.getTodayString();
            const signedDate = localStorage.getItem(this.keys.signedToday);
            return signedDate === today;
        }

        // 记录今日已签到
        recordSignedToday() {
            const today = this.getTodayString();
            localStorage.setItem(this.keys.signedToday, today);
        }

        // 获取今日日期字符串
        getTodayString() {
            return new Date().toISOString().split('T')[0];
        }

        // 停止所有监控
        stopAllMonitors() {
            this.timers.forEach(timer => clearInterval(timer));
            this.timers = [];
            this.log('⏸️ 签到完成，监控已停止');
        }

        // 检查是否全局正在执行
        isGloballyExecuting() {
            const lockTime = localStorage.getItem(this.keys.executingLock);
            if (!lockTime) return false;

            const now = Date.now();
            const lock = parseInt(lockTime);

            if (now < lock) {
                return true;
            } else {
                // 锁已过期，清理
                localStorage.removeItem(this.keys.executingLock);
                return false;
            }
        }

        // 设置全局执行锁
        setGlobalExecutingLock() {
            const lockTime = Date.now() + 10000; // 10秒锁定
            localStorage.setItem(this.keys.executingLock, lockTime.toString());
        }

        // 清理全局执行锁
        clearGlobalExecutingLock() {
            localStorage.removeItem(this.keys.executingLock);
        }

        // 设置每日重置
        setupDailyReset() {
            const resetTimer = setInterval(() => {
                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();
                const second = now.getSeconds();

                // 在23:59:59重置状态
                if (hour === 23 && minute === 59 && second === 59) {
                    this.resetDailyStatus();
                }
            }, 1000);
            
            this.timers.push(resetTimer);
        }

        // 重置每日状态
        resetDailyStatus() {
            localStorage.removeItem(this.keys.signedToday);
            this.log('🔄 签到状态已重置，准备新一天的签到');
            
            // 重新启动监控
            if (this.isMasterPage) {
                setTimeout(() => {
                    this.log('🚀 新一天签到监控已启动');
                    this.startSignMonitor();
                }, 2000);
            }
        }

        // 设置页面卸载处理
        setupUnloadHandler() {
            const handleUnload = () => {
                // 清理所有定时器
                this.timers.forEach(timer => clearInterval(timer));
                
                // 清理执行锁
                this.isExecuting = false;
                this.clearGlobalExecutingLock();
                
                // 如果是主页面，释放主页面权限
                if (this.isMasterPage) {
                    localStorage.removeItem(this.keys.masterPageId);
                    localStorage.removeItem(this.keys.lastHeartbeat);
                }
                
                // 从页面注册表移除自己
                const registry = this.getPageRegistry();
                delete registry[this.pageId];
                this.setPageRegistry(registry);
            };

            window.addEventListener('beforeunload', handleUnload);
            window.addEventListener('pagehide', handleUnload);
        }

        // 清理过期数据
        cleanExpiredData() {
            // 清理非今日的签到记录
            const today = this.getTodayString();
            const signedDate = localStorage.getItem(this.keys.signedToday);
            if (signedDate && signedDate !== today) {
                localStorage.removeItem(this.keys.signedToday);
            }

            // 清理过期的执行锁
            this.isGloballyExecuting(); // 这个方法会自动清理过期锁

            // 清理过期的页面注册数据
            this.cleanExpiredPages();
            
            // 检查主页面是否过期
            const masterPageId = localStorage.getItem(this.keys.masterPageId);
            const lastHeartbeat = localStorage.getItem(this.keys.lastHeartbeat);
            const registry = this.getPageRegistry();
            
            if (masterPageId && (!registry[masterPageId] || 
                (lastHeartbeat && Date.now() - parseInt(lastHeartbeat) > 300000))) {
                localStorage.removeItem(this.keys.masterPageId);
                localStorage.removeItem(this.keys.lastHeartbeat);
            }
        }
    }

    // 启动签到系统
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new NodeSeekSignIn();
        });
    } else {
        new NodeSeekSignIn();
    }

})();
