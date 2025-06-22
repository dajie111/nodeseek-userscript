// ========== 自动签到 ==========
(function() {
    'use strict';

    // NodeSeek 签到API配置
    const SIGN_API = '/api/attendance?random=true';
    
    // 存储键名
    const STORAGE_KEYS = {
        signedToday: 'nodeseek_signed_today',       // 今日签到状态
        masterWindow: 'nodeseek_master_window',     // 主窗口标识
        lastHeartbeat: 'nodeseek_last_heartbeat'    // 心跳时间
    };

    class SimpleSignIn {
        constructor() {
            this.windowId = 'window_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            this.isMaster = false;
            this.timers = [];
            
            this.init();
        }

        init() {
            // 只在NodeSeek网站运行
            if (window.location.hostname !== 'www.nodeseek.com') {
                return;
            }

            // 清理过期数据
            this.cleanExpiredData();
            
            // 多窗口协调
            this.setupMultiWindow();
            
            // 页面卸载清理
            this.setupCleanup();
            
            // 设置全局接口
            this.setupGlobalInterface();
            
            // 监听按钮事件
            this.setupButtonListener();
        }

        // 设置全局接口
        setupGlobalInterface() {
            window.NodeSeekSignIn = {
                clearSignStatus: () => this.clearSignStatus(),
                hasSignedToday: () => this.hasSignedToday(),
                getWindowId: () => this.windowId,
                isMasterWindow: () => this.isMaster
            };
        }

        // 监听"开启签到"按钮事件
        setupButtonListener() {
            // 监听localStorage变化，检测按钮状态变化
            window.addEventListener('storage', (e) => {
                if (e.key === 'nodeseek_sign_enabled' && e.newValue === 'true') {
                    // 当开启签到时，清除签到状态
                    this.clearSignStatus();
                    this.logMessage('🔄 检测到开启签到，已清除签到状态');
                }
            });

            // 直接监听按钮点击（如果按钮存在）
            const checkButton = () => {
                const signBtn = document.getElementById('sign-in-btn');
                if (signBtn && !signBtn.hasClockInListener) {
                    signBtn.hasClockInListener = true;
                    signBtn.addEventListener('click', () => {
                        setTimeout(() => {
                            const isEnabled = localStorage.getItem('nodeseek_sign_enabled') === 'true';
                            if (isEnabled) {
                                this.clearSignStatus();
                                this.logMessage('🔄 开启签到按钮已点击，已清除签到状态');
                            }
                        }, 100);
                    });
                }
            };

            // 延迟检查按钮（确保按钮已加载）
            setTimeout(checkButton, 1000);
            setInterval(checkButton, 5000); // 定期检查，防止按钮重新创建
        }

        // 清除签到状态
        clearSignStatus() {
            localStorage.removeItem(STORAGE_KEYS.signedToday);
            localStorage.removeItem(STORAGE_KEYS.signedToday + '_time');
            this.logMessage('✨ 签到状态已清除，可重新签到');
        }

        // 多窗口协调机制
        setupMultiWindow() {
            // 竞选主窗口
            this.electMaster();
            
            // 开始心跳
            this.startHeartbeat();
            
            // 监听其他窗口变化
            this.listenStorageChanges();
        }

        // 竞选主窗口
        electMaster() {
            const currentMaster = localStorage.getItem(STORAGE_KEYS.masterWindow);
            const lastHeartbeat = localStorage.getItem(STORAGE_KEYS.lastHeartbeat);
            
            // 如果没有主窗口或主窗口已超时（30秒）
            if (!currentMaster || !lastHeartbeat || 
                Date.now() - parseInt(lastHeartbeat) > 30000) {
                this.becomeMaster();
            }
        }

        // 成为主窗口
        becomeMaster() {
            this.isMaster = true;
            localStorage.setItem(STORAGE_KEYS.masterWindow, this.windowId);
            localStorage.setItem(STORAGE_KEYS.lastHeartbeat, Date.now().toString());
            
            // 开始签到循环
            this.startSignInLoop();
            
            // 开始状态重置监控
            this.startResetMonitor();
        }

        // 开始心跳机制
        startHeartbeat() {
            const heartbeatTimer = setInterval(() => {
                if (this.isMaster) {
                    // 主窗口发送心跳
                    localStorage.setItem(STORAGE_KEYS.lastHeartbeat, Date.now().toString());
                } else {
                    // 从窗口检查主窗口状态
                    this.checkMasterStatus();
                }
            }, 10000); // 10秒心跳
            
            this.timers.push(heartbeatTimer);
        }

        // 检查主窗口状态
        checkMasterStatus() {
            const currentMaster = localStorage.getItem(STORAGE_KEYS.masterWindow);
            const lastHeartbeat = localStorage.getItem(STORAGE_KEYS.lastHeartbeat);
            
            // 如果主窗口失效，立即接管
            if (!currentMaster || currentMaster === this.windowId || 
                !lastHeartbeat || Date.now() - parseInt(lastHeartbeat) > 30000) {
                this.becomeMaster();
            }
        }

        // 监听localStorage变化
        listenStorageChanges() {
            window.addEventListener('storage', (e) => {
                if (e.key === STORAGE_KEYS.masterWindow && e.newValue !== this.windowId) {
                    // 其他窗口成为主窗口，当前窗口变为从窗口
                    this.isMaster = false;
                }
            });
        }

        // 开始签到循环
        startSignInLoop() {
            // 立即检查一次
            this.checkAndSignIn();
            
            // 每5秒检查一次
            const signInTimer = setInterval(() => {
                this.checkAndSignIn();
            }, 5000);
            
            this.timers.push(signInTimer);
        }

        // 检查并执行签到
        async checkAndSignIn() {
            if (!this.isMaster) return;
            
            // 检查今日是否已签到
            if (this.hasSignedToday()) {
                return;
            }

            // 执行签到
            await this.performSignIn();
        }

        // 执行签到API
        async performSignIn() {
            try {
                this.logMessage('🚀 执行签到API...');
                
                // 立即记录签到状态（不等待结果）
                this.recordSignIn();

                const response = await fetch(SIGN_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                if (response.ok) {
                    this.logMessage('✅ 签到API执行完成');
                } else {
                    this.logMessage(`⚠️ 签到API返回: ${response.status}`);
                }
            } catch (error) {
                this.logMessage(`❌ 签到异常: ${error.message}`);
            }
        }

        // 检查今日是否已签到
        hasSignedToday() {
            const today = this.getTodayString();
            const signedDate = localStorage.getItem(STORAGE_KEYS.signedToday);
            return signedDate === today;
        }

        // 记录签到状态
        recordSignIn() {
            const today = this.getTodayString();
            const signTime = Date.now(); // 记录签到的具体时间戳
            localStorage.setItem(STORAGE_KEYS.signedToday, today);
            localStorage.setItem(STORAGE_KEYS.signedToday + '_time', signTime.toString());
        }

        // 获取今日日期字符串 (YYYY-MM-DD)
        getTodayString() {
            return new Date().toISOString().split('T')[0];
        }

        // 开始状态重置监控
        startResetMonitor() {
            const resetTimer = setInterval(() => {
                const now = new Date();
                
                // 在00:00:00重置状态
                if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
                    this.resetDailyStatus('时间到达00:00:00');
                    return;
                }
                
                // 检查累计时间重置条件（23小时59分50秒）
                this.checkTimeBasedReset();
            }, 1000);
            
            this.timers.push(resetTimer);
        }

        // 检查基于累计时间的重置
        checkTimeBasedReset() {
            const signedDate = localStorage.getItem(STORAGE_KEYS.signedToday);
            const signedTimeStr = localStorage.getItem(STORAGE_KEYS.signedToday + '_time');
            
            if (!signedDate || !signedTimeStr) return;
            
            const today = this.getTodayString();
            if (signedDate !== today) return; // 已经是不同日期了
            
            // 计算从签到时间到现在的累计时间
            const signedTime = parseInt(signedTimeStr);
            const now = Date.now();
            const elapsedMs = now - signedTime;
            
            // 23小时59分50秒 = 86390000毫秒
            const resetThreshold = 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 50 * 1000;
            
            if (elapsedMs >= resetThreshold) {
                this.resetDailyStatus('累计时间超过23小时59分50秒');
            }
        }

        // 重置每日状态
        resetDailyStatus(reason = '状态重置') {
            localStorage.removeItem(STORAGE_KEYS.signedToday);
            localStorage.removeItem(STORAGE_KEYS.signedToday + '_time');
            this.logMessage(`🔄 ${reason}，状态已重置，可重新签到`);
        }

        // 清理过期数据
        cleanExpiredData() {
            const today = this.getTodayString();
            const signedDate = localStorage.getItem(STORAGE_KEYS.signedToday);
            
            // 清理非今日的签到记录
            if (signedDate && signedDate !== today) {
                localStorage.removeItem(STORAGE_KEYS.signedToday);
                localStorage.removeItem(STORAGE_KEYS.signedToday + '_time');
            }
        }

        // 页面卸载清理
        setupCleanup() {
            const cleanup = () => {
                // 清理所有定时器
                this.timers.forEach(timer => clearInterval(timer));
                this.timers = [];
                
                // 如果是主窗口，释放权限
                if (this.isMaster) {
                    localStorage.removeItem(STORAGE_KEYS.masterWindow);
                    localStorage.removeItem(STORAGE_KEYS.lastHeartbeat);
                }
            };

            window.addEventListener('beforeunload', cleanup);
            window.addEventListener('pagehide', cleanup);
        }

        // 输出日志消息
        logMessage(message) {
            // 输出到操作日志弹窗
            if (typeof window.addLog === 'function') {
                window.addLog(message);
            }
        }
    }

    // 启动签到系统
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new SimpleSignIn();
        });
    } else {
        new SimpleSignIn();
    }

})();
