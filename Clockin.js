// ==========自动签到 ==========
(function() {
    'use strict';

    // 配置
    const APIS = {
        random: '/api/attendance?random=true',
        fixed: '/api/attendance?random=false'
    };
    const STORAGE_KEYS = {
        signStatus: 'nodeseek_sign_status',           // 签到状态
        masterWindow: 'nodeseek_master_window',       // 主窗口ID
        lastHeartbeat: 'nodeseek_last_heartbeat',     // 心跳时间
        hourlySignTime: 'nodeseek_hourly_sign_time',  // 小时签到时间记录
        signMode: 'nodeseek_sign_mode',               // 签到模式：random 或 fixed
        signEnabled: 'nodeseek_sign_enabled'          // 签到开关
    };

    class AutoSignSystem {
        constructor() {
            this.windowId = 'window_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            this.isMaster = false;
            this.timers = [];
            this.nextSignTimer = null;
            
            // 暴露全局接口，供外部调用
            window.NodeSeekClockIn = this;
            
            this.init();
        }

        init() {
            // 只在NodeSeek网站运行
            if (window.location.hostname !== 'www.nodeseek.com') {
                return;
            }
            
            // 多窗口协调
            this.setupMultiWindow();
            
            // 页面卸载清理
            this.setupCleanup();
        }

        // 多窗口协调机制
        setupMultiWindow() {
            this.electMaster();
            this.startHeartbeat();
            this.listenStorageChanges();
        }

        // 竞选主窗口
        electMaster() {
            const currentMaster = localStorage.getItem(STORAGE_KEYS.masterWindow);
            const lastHeartbeat = localStorage.getItem(STORAGE_KEYS.lastHeartbeat);
            
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
            
            // 设置下一个整点签到
            this.scheduleNextHourlySign();
        }

        // 心跳机制
        startHeartbeat() {
            const heartbeatTimer = setInterval(() => {
                if (this.isMaster) {
                    localStorage.setItem(STORAGE_KEYS.lastHeartbeat, Date.now().toString());
                } else {
                    this.checkMasterStatus();
                }
            }, 10000); // 每10秒心跳一次
            
            this.timers.push(heartbeatTimer);
        }

        // 检查主窗口状态
        checkMasterStatus() {
            const currentMaster = localStorage.getItem(STORAGE_KEYS.masterWindow);
            const lastHeartbeat = localStorage.getItem(STORAGE_KEYS.lastHeartbeat);
            
            if (!currentMaster || currentMaster === this.windowId || 
                !lastHeartbeat || Date.now() - parseInt(lastHeartbeat) > 30000) {
                this.becomeMaster();
            }
        }

        // 监听localStorage变化
        listenStorageChanges() {
            window.addEventListener('storage', (e) => {
                if (e.key === STORAGE_KEYS.masterWindow && e.newValue !== this.windowId) {
                    this.isMaster = false;
                    // 如果不再是主窗口，清除签到定时器
                    if (this.nextSignTimer) {
                        clearTimeout(this.nextSignTimer);
                        this.nextSignTimer = null;
                    }
                }
            });
        }

        // 计算并设置下一个整点签到
        scheduleNextHourlySign() {
            if (!this.isMaster) return;
            
            // 清除可能存在的旧定时器
            if (this.nextSignTimer) {
                clearTimeout(this.nextSignTimer);
                this.nextSignTimer = null;
            }
            
            const now = new Date();
            const nextHour = new Date(now);
            
            // 设置为下一个整点
            nextHour.setHours(now.getHours() + 1);
            nextHour.setMinutes(0);
            nextHour.setSeconds(0);
            nextHour.setMilliseconds(0);
            
            // 计算到下一个整点的毫秒数
            const timeUntilNextHour = nextHour.getTime() - now.getTime();
            
            // 获取当前小时
            const currentHour = now.getHours();
            
            // 获取上次签到的小时记录
            const lastSignTimeStr = localStorage.getItem(STORAGE_KEYS.hourlySignTime);
            let lastSignTime = null;
            let lastSignHour = -1;
            
            if (lastSignTimeStr) {
                lastSignTime = new Date(parseInt(lastSignTimeStr));
                lastSignHour = lastSignTime.getHours();
            }
            
            // 如果当前是整点(00分00秒)且这个小时还没签到过，立即签到
            if (now.getMinutes() === 0 && now.getSeconds() === 0 && lastSignHour !== currentHour) {
                this.performSignIn();
            }

            // 设置下一个整点的定时器
            this.nextSignTimer = setTimeout(() => {
                const hourToSign = nextHour.getHours();
                this.performSignIn();
                
                // 签到后再次设置下一个整点的定时器
                this.scheduleNextHourlySign();
            }, timeUntilNextHour);
            
            // 将定时器ID添加到timers数组中，以便清理
            this.timers.push(this.nextSignTimer);
        }

        // 执行签到API
        async performSignIn() {
            // 检查是否开启了自动签到
            if (localStorage.getItem(STORAGE_KEYS.signEnabled) !== 'true') {
                // this.addLog('自动签到已关闭，跳过执行');
                return;
            }

            try {
                // 记录当前小时已签到
                const now = new Date();
                localStorage.setItem(STORAGE_KEYS.hourlySignTime, now.getTime().toString());
                
                // 获取当前签到模式
                const mode = localStorage.getItem(STORAGE_KEYS.signMode) || 'fixed';
                const api = APIS[mode] || APIS.fixed;
                
                // this.addLog(`开始执行自动签到 (模式: ${mode === 'fixed' ? '固定' : '随机'})...`);

                const response = await fetch(api, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                // 只在签到成功时输出日志
                if (response.ok) {
                    const result = await response.json();
                    const modeText = mode === 'fixed' ? '固定' : '随机';
                    this.addLog(`✅ 自动签到成功(${modeText})！${result.message || 'OK'}`);
                } else {
                    // this.addLog(`❌ 自动签到失败: ${response.status}`);
                }

            } catch (error) {
                // 签到异常时静默处理，但如果有日志函数则记录
                // this.addLog(`❌ 签到出错: ${error.message}`);
            }
        }

        // 设置签到模式
        setSignMode(mode) {
            if (APIS[mode]) {
                localStorage.setItem(STORAGE_KEYS.signMode, mode);
                // this.addLog(`已切换签到模式为: ${mode === 'random' ? '随机签到' : '固定签到'}`);
                return true;
            }
            return false;
        }

        // 获取当前签到模式
        getSignMode() {
            return localStorage.getItem(STORAGE_KEYS.signMode) || 'fixed';
        }

        // 页面卸载清理
        setupCleanup() {
            const cleanup = () => {
                // 清理所有定时器
                this.timers.forEach(timer => {
                    clearInterval(timer);
                    clearTimeout(timer);
                });
                this.timers = [];
                
                // 清理签到定时器
                if (this.nextSignTimer) {
                    clearTimeout(this.nextSignTimer);
                    this.nextSignTimer = null;
                }
                
                if (this.isMaster) {
                    localStorage.removeItem(STORAGE_KEYS.masterWindow);
                    localStorage.removeItem(STORAGE_KEYS.lastHeartbeat);
                }
            };

            window.addEventListener('beforeunload', cleanup);
            window.addEventListener('pagehide', cleanup);
        }

        // 添加操作日志
        addLog(message) {
            if (typeof window.addLog === 'function') {
                window.addLog(message);
            }
        }
    }

    // 启动系统
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new AutoSignSystem();
        });
    } else {
        new AutoSignSystem();
    }

})();
