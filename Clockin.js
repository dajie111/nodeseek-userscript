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
            
            // 启动浏览器保活机制
            this.setupBrowserKeepAlive();
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
                
                // 清理保活元素
                if (this.keepAliveElement && this.keepAliveElement.parentNode) {
                    this.keepAliveElement.parentNode.removeChild(this.keepAliveElement);
                }
                
                // 如果是主窗口，释放权限
                if (this.isMaster) {
                    localStorage.removeItem(STORAGE_KEYS.masterWindow);
                    localStorage.removeItem(STORAGE_KEYS.lastHeartbeat);
                }
                
                // 清理保活心跳记录
                localStorage.removeItem('nodeseek_keepalive_heartbeat');
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

        // 浏览器保活机制
        setupBrowserKeepAlive() {
            // 1. 创建隐形保活元素
            this.createKeepAliveElement();
            
            // 2. 启动多重保活机制
            this.startMultipleKeepAlive();
            
            // 3. 监听页面状态变化
            this.setupPageVisibilityHandlers();
            
            // 4. 防止浏览器节能模式
            this.preventPowerSaving();
        }

        // 创建隐形保活元素
        createKeepAliveElement() {
            // 创建一个完全隐形的div
            this.keepAliveElement = document.createElement('div');
            this.keepAliveElement.style.cssText = `
                position: fixed;
                top: -10px;
                left: -10px;
                width: 1px;
                height: 1px;
                opacity: 0.001;
                pointer-events: none;
                z-index: -9999;
                background: transparent;
                overflow: hidden;
            `;
            
            // 添加到页面
            if (document.body) {
                document.body.appendChild(this.keepAliveElement);
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.body.appendChild(this.keepAliveElement);
                });
            }
        }

        // 启动多重保活机制
        startMultipleKeepAlive() {
            // 方法1: 微调透明度 (每30-60秒)
            const opacityKeepAlive = setInterval(() => {
                if (this.keepAliveElement) {
                    const opacity = 0.001 + Math.random() * 0.002;
                    this.keepAliveElement.style.opacity = opacity.toFixed(4);
                }
            }, 30000 + Math.random() * 30000);
            this.timers.push(opacityKeepAlive);

            // 方法2: 微调位置 (每45-90秒)
            const positionKeepAlive = setInterval(() => {
                if (this.keepAliveElement) {
                    const top = -10 + Math.random() * 5;
                    const left = -10 + Math.random() * 5;
                    this.keepAliveElement.style.top = `${top.toFixed(1)}px`;
                    this.keepAliveElement.style.left = `${left.toFixed(1)}px`;
                }
            }, 45000 + Math.random() * 45000);
            this.timers.push(positionKeepAlive);

            // 方法3: 创建无害的微任务 (每60-120秒)
            const taskKeepAlive = setInterval(() => {
                // 创建一个微任务来保持引擎活跃
                Promise.resolve().then(() => {
                    const now = Date.now();
                    // 执行一个轻量级计算
                    Math.random() * now;
                });
            }, 60000 + Math.random() * 60000);
            this.timers.push(taskKeepAlive);

            // 方法4: localStorage心跳 (每2-5分钟)
            const storageKeepAlive = setInterval(() => {
                const heartbeat = Date.now().toString();
                localStorage.setItem('nodeseek_keepalive_heartbeat', heartbeat);
                // 立即删除，避免存储污染
                setTimeout(() => {
                    localStorage.removeItem('nodeseek_keepalive_heartbeat');
                }, 1000);
            }, 120000 + Math.random() * 180000);
            this.timers.push(storageKeepAlive);

            // 方法5: 虚拟鼠标活动模拟 (每3-8分钟)
            const mouseKeepAlive = setInterval(() => {
                // 创建虚拟鼠标移动事件（不会被用户感知）
                const virtualEvent = new MouseEvent('mousemove', {
                    clientX: -100,
                    clientY: -100,
                    bubbles: false,
                    cancelable: false
                });
                if (this.keepAliveElement) {
                    this.keepAliveElement.dispatchEvent(virtualEvent);
                }
            }, 180000 + Math.random() * 300000);
            this.timers.push(mouseKeepAlive);
        }

        // 页面可见性处理
        setupPageVisibilityHandlers() {
            // 监听页面可见性变化
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    // 页面重新可见时，强制检查签到状态
                    setTimeout(() => {
                        if (this.isMaster) {
                            this.checkAndSignIn();
                        }
                    }, 1000);
                }
            });

            // 监听窗口焦点变化
            window.addEventListener('focus', () => {
                // 窗口重新获得焦点时检查
                setTimeout(() => {
                    if (this.isMaster) {
                        this.checkAndSignIn();
                    }
                }, 500);
            });

            // 监听页面恢复事件
            window.addEventListener('pageshow', (e) => {
                if (e.persisted) {
                    // 从缓存恢复时重新检查
                    setTimeout(() => {
                        if (this.isMaster) {
                            this.checkAndSignIn();
                        }
                    }, 2000);
                }
            });
        }

        // 防止浏览器节能模式
        preventPowerSaving() {
            // 方法1: 使用Web Audio API保持活跃
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                // 设置为静音
                gainNode.gain.value = 0;
                oscillator.frequency.value = 20000; // 超高频，人耳听不到
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                // 每10分钟重启一次，防止被浏览器暂停
                const audioKeepAlive = setInterval(() => {
                    try {
                        oscillator.start();
                        setTimeout(() => {
                            oscillator.stop();
                        }, 100);
                    } catch (e) {
                        // 忽略错误，避免重复启动
                    }
                }, 600000);
                this.timers.push(audioKeepAlive);
            } catch (e) {
                // 如果Audio API不可用，跳过
            }

            // 方法2: 使用requestAnimationFrame保持活跃
            let rafId;
            const rafKeepAlive = () => {
                // 执行轻量级操作
                if (this.keepAliveElement) {
                    const opacity = parseFloat(this.keepAliveElement.style.opacity) || 0.001;
                    // 微调透明度（变化极小，不可见）
                    this.keepAliveElement.style.opacity = (opacity + 0.0001).toFixed(4);
                }
                
                // 每5分钟执行一次
                setTimeout(() => {
                    rafId = requestAnimationFrame(rafKeepAlive);
                }, 300000);
            };
            
            // 启动RAF保活
            rafId = requestAnimationFrame(rafKeepAlive);
            
            // 清理时取消RAF
            const originalCleanup = this.setupCleanup;
            this.setupCleanup = () => {
                if (rafId) {
                    cancelAnimationFrame(rafId);
                }
                originalCleanup.call(this);
            };
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
