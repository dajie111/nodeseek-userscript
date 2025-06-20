// ========== 自动签到 ==========
(function() {
    'use strict';

    // NodeSeek 签到API地址
    const SIGN_API = '/api/attendance?random=true';

    // 存储键名
    const STORAGE_KEYS = {
        lastSignTime: 'nodeseek_last_sign_time',
        masterPageId: 'nodeseek_master_page_id',
        signLock: 'nodeseek_sign_lock'
    };

    // NodeSeek自动签到系统
    class SimpleSignInSystem {
        constructor() {
            this.pageId = this.generatePageId();
            this.isMasterPage = false;
            this.timers = [];
            this.init();
        }

        // 生成页面唯一ID
        generatePageId() {
            return 'page_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        }

        // 初始化系统
        init() {
            if (!this.isNodeSeekPage()) {
                return;
            }

            // 静默启动
            
            // 清理过期数据
            this.cleanExpiredData();
            
            // 选举主窗口
            this.electMasterPage();
            
            // 设置每日重置
            this.setupDailyReset();
            
            // 设置长时间挂机恢复机制
            this.setupHangRecovery();
            
            // 开始签到检查
            this.startSignInCheck();
            
            // 页面卸载时清理
            this.setupCleanup();
        }

        // 检查是否为NodeSeek页面
        isNodeSeekPage() {
            return window.location.hostname === 'www.nodeseek.com';
        }

        // 输出到操作日志弹窗
        logToOperationDialog(message) {
            if (typeof window.addLog === 'function') {
                window.addLog(message);
            }
        }

        // 选举主窗口
        electMasterPage() {
            const currentMasterId = localStorage.getItem(STORAGE_KEYS.masterPageId);
            const masterTimestamp = localStorage.getItem(STORAGE_KEYS.masterPageId + '_timestamp');
            
            // 如果没有主窗口或主窗口超时（30秒无更新）
            if (!currentMasterId || !masterTimestamp || 
                Date.now() - parseInt(masterTimestamp) > 30000) {
                this.becomeMasterPage();
            } else {
                this.isMasterPage = false;
                // 静默运行：当前为从窗口
            }
            
            // 定期检查主窗口状态
            const checkTimer = setInterval(() => {
                this.checkMasterPageHealth();
            }, 10000); // 每10秒检查一次
            this.timers.push(checkTimer);
        }

        // 成为主窗口
        becomeMasterPage() {
            this.isMasterPage = true;
            localStorage.setItem(STORAGE_KEYS.masterPageId, this.pageId);
            localStorage.setItem(STORAGE_KEYS.masterPageId + '_timestamp', Date.now().toString());
            // 静默运行：成为主窗口
            
            // 主窗口定期发送心跳
            const heartbeatTimer = setInterval(() => {
                if (this.isMasterPage) {
                    localStorage.setItem(STORAGE_KEYS.masterPageId + '_timestamp', Date.now().toString());
                }
            }, 5000); // 每5秒发送心跳
            this.timers.push(heartbeatTimer);
        }

        // 检查主窗口健康状态
        checkMasterPageHealth() {
            if (this.isMasterPage) return;
            
            const currentMasterId = localStorage.getItem(STORAGE_KEYS.masterPageId);
            const masterTimestamp = localStorage.getItem(STORAGE_KEYS.masterPageId + '_timestamp');
            
            // 如果主窗口失效，接管主窗口
            if (!currentMasterId || !masterTimestamp || 
                Date.now() - parseInt(masterTimestamp) > 20000) {
                // 静默运行：主窗口失效，紧急接管
                this.becomeMasterPage();
            }
        }

        // 设置每日重置
        setupDailyReset() {
            const resetTimer = setInterval(() => {
                const now = new Date();
                if (now.getHours() === 23 && now.getMinutes() === 59 && now.getSeconds() === 59) {
                    this.resetDailyStatus();
                }
            }, 1000);
            this.timers.push(resetTimer);
        }

        // 重置每日状态
        resetDailyStatus() {
            localStorage.removeItem(STORAGE_KEYS.lastSignTime);
            // 静默运行：签到状态已重置
        }

        // 设置长时间挂机恢复机制
        setupHangRecovery() {
            // 页面可见性变化监听
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && this.isMasterPage) {
                    // 静默运行：页面恢复可见，检查签到状态
                    setTimeout(() => this.checkAndSignIn(), 1000);
                }
            });

            // 窗口焦点恢复监听
            window.addEventListener('focus', () => {
                if (this.isMasterPage) {
                    // 静默运行：窗口获得焦点，检查签到状态
                    setTimeout(() => this.checkAndSignIn(), 1000);
                }
            });

            // 用户活动监听（防止过度频繁，使用节流）
            let userActivityTimer = null;
            const handleUserActivity = () => {
                if (!this.isMasterPage || userActivityTimer) return;
                
                userActivityTimer = setTimeout(() => {
                    userActivityTimer = null;
                    this.checkAndSignIn();
                }, 3000); // 3秒节流
            };

            ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
                document.addEventListener(event, handleUserActivity, { passive: true });
            });
        }

        // 开始签到检查
        startSignInCheck() {
            // 立即检查一次
            this.checkAndSignIn();
            
            // 定期检查（每60秒检查一次，避免过于频繁）
            const checkTimer = setInterval(() => {
                if (this.isMasterPage) {
                    this.checkAndSignIn();
                }
            }, 60000); // 每分钟检查一次
            this.timers.push(checkTimer);
        }

        // 检查并执行签到
        async checkAndSignIn() {
            // 只有主窗口才执行签到
            if (!this.isMasterPage) {
                return;
            }

            // 检查今日是否已签到
            if (this.hasSignedToday()) {
                return;
            }

            // 检查签到锁，防止重复签到
            if (this.isSignLocked()) {
                return;
            }

            // 执行签到
            await this.performSignIn();
        }

        // 检查今日是否已签到
        hasSignedToday() {
            const today = this.getTodayString();
            const lastSignTime = localStorage.getItem(STORAGE_KEYS.lastSignTime);
            return lastSignTime === today;
        }

        // 获取今日日期字符串
        getTodayString() {
            return new Date().toDateString(); // 使用toDateString()更简洁
        }

        // 检查签到锁
        isSignLocked() {
            const lockTime = localStorage.getItem(STORAGE_KEYS.signLock);
            if (!lockTime) return false;

            const now = Date.now();
            const lock = parseInt(lockTime);

            if (now < lock) {
                return true;
            } else {
                // 锁已过期，清理
                localStorage.removeItem(STORAGE_KEYS.signLock);
                return false;
            }
        }

        // 设置签到锁（10秒锁定期）
        setSignLock() {
            const lockTime = Date.now() + 10000; // 10秒锁定
            localStorage.setItem(STORAGE_KEYS.signLock, lockTime.toString());
        }

        // 执行签到
        async performSignIn() {
            // 设置签到锁，防止重复执行
            this.setSignLock();
            
            // 静默开始签到

            try {
                const response = await fetch(SIGN_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                if (response.ok) {
                    // 签到成功，记录状态
                    this.recordSignInSuccess();
                    this.logToOperationDialog('✅ 自动签到成功！');
                } else {
                    this.logToOperationDialog(`❌ 签到失败：HTTP ${response.status}`);
                }
            } catch (error) {
                this.logToOperationDialog(`❌ 签到异常：${error.message}`);
            }
        }

        // 记录签到成功状态
        recordSignInSuccess() {
            const today = this.getTodayString();
            localStorage.setItem(STORAGE_KEYS.lastSignTime, today);
        }

        // 清理过期数据
        cleanExpiredData() {
            // 清理过期的签到锁
            this.isSignLocked();

            // 清理非今日的签到记录
            const today = this.getTodayString();
            const lastSignTime = localStorage.getItem(STORAGE_KEYS.lastSignTime);
            if (lastSignTime && lastSignTime !== today) {
                localStorage.removeItem(STORAGE_KEYS.lastSignTime);
            }
        }

        // 设置页面卸载清理
        setupCleanup() {
            const cleanup = () => {
                // 清理所有定时器
                this.timers.forEach(timer => clearInterval(timer));
                this.timers = [];
                
                // 如果是主窗口，释放主窗口权限
                if (this.isMasterPage) {
                    localStorage.removeItem(STORAGE_KEYS.masterPageId);
                    localStorage.removeItem(STORAGE_KEYS.masterPageId + '_timestamp');
                }
            };

            window.addEventListener('beforeunload', cleanup);
            window.addEventListener('pagehide', cleanup);
        }
    }

    // 启动签到系统
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new SimpleSignInSystem();
        });
    } else {
        new SimpleSignInSystem();
    }

})();
