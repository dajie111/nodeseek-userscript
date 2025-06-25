// ==========自动签到 ==========
(function() {
    'use strict';

    // 配置
    const SIGN_API = '/api/attendance?random=true';
    const STORAGE_KEYS = {
        signStatus: 'nodeseek_sign_status',           // 签到状态
        masterWindow: 'nodeseek_master_window',       // 主窗口ID
        lastHeartbeat: 'nodeseek_last_heartbeat',     // 心跳时间
        lastClearTime: 'nodeseek_last_clear_time'     // 上次清理时间
    };

    class AutoSignSystem {
        constructor() {
            this.windowId = 'window_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            this.isMaster = false;
            this.timers = [];
            this.init();
        }

        init() {
            // 只在NodeSeek网站运行
            if (window.location.hostname !== 'www.nodeseek.com') {
                return;
            }

            // 启动网页保活机制
            this.setupKeepAlive();
            
            // 多窗口协调
            this.setupMultiWindow();
            
            // 页面卸载清理
            this.setupCleanup();
        }

        // 网页保活机制
        setupKeepAlive() {
            // 1. 创建隐形保活元素
            this.createKeepAliveElement();
            
            // 2. 启动多重保活机制
            this.startKeepAliveMechanisms();
            
            // 3. 监听页面状态变化
            this.setupPageVisibilityHandlers();
        }

        // 创建隐形保活元素
        createKeepAliveElement() {
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
            
            if (document.body) {
                document.body.appendChild(this.keepAliveElement);
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.body.appendChild(this.keepAliveElement);
                });
            }
        }

        // 启动多重保活机制
        startKeepAliveMechanisms() {
            // 方法1: 微调透明度保活 (每30-60秒)
            const opacityTimer = setInterval(() => {
                if (this.keepAliveElement) {
                    const opacity = 0.001 + Math.random() * 0.002;
                    this.keepAliveElement.style.opacity = opacity.toFixed(4);
                }
            }, 30000 + Math.random() * 30000);
            this.timers.push(opacityTimer);

            // 方法2: 微调位置保活 (每45-90秒)
            const positionTimer = setInterval(() => {
                if (this.keepAliveElement) {
                    const top = -10 + Math.random() * 5;
                    const left = -10 + Math.random() * 5;
                    this.keepAliveElement.style.top = `${top.toFixed(1)}px`;
                    this.keepAliveElement.style.left = `${left.toFixed(1)}px`;
                }
            }, 45000 + Math.random() * 45000);
            this.timers.push(positionTimer);

            // 方法3: localStorage心跳保活 (每2-3分钟)
            const storageTimer = setInterval(() => {
                const heartbeat = Date.now().toString();
                localStorage.setItem('nodeseek_keepalive_ping', heartbeat);
                setTimeout(() => {
                    localStorage.removeItem('nodeseek_keepalive_ping');
                }, 1000);
            }, 120000 + Math.random() * 60000);
            this.timers.push(storageTimer);

            // 方法4: 虚拟鼠标事件保活 (每3-5分钟)
            const mouseTimer = setInterval(() => {
                if (this.keepAliveElement) {
                    const event = new MouseEvent('mousemove', {
                        clientX: -100,
                        clientY: -100,
                        bubbles: false,
                        cancelable: false
                    });
                    this.keepAliveElement.dispatchEvent(event);
                }
            }, 180000 + Math.random() * 120000);
            this.timers.push(mouseTimer);

            // 方法5: 微任务保活 (每1-2分钟)
            const taskTimer = setInterval(() => {
                Promise.resolve().then(() => {
                    const now = Date.now();
                    Math.random() * now; // 轻量级计算
                });
            }, 60000 + Math.random() * 60000);
            this.timers.push(taskTimer);

            // 方法6: Web Audio API保活
            this.setupAudioKeepAlive();

            // 方法7: requestAnimationFrame保活
            this.setupRAFKeepAlive();

            // 方法8: WebSocket保活
            this.setupWebSocketKeepAlive();

            // 方法9: Service Worker保活
            this.setupServiceWorkerKeepAlive();

            // 方法10: IndexedDB保活
            this.setupIndexedDBKeepAlive();

            // 方法11: Canvas动画保活
            this.setupCanvasKeepAlive();

            // 方法12: Video元素保活
            this.setupVideoKeepAlive();

            // 方法13: 网络请求保活
            this.setupNetworkKeepAlive();

            // 方法14: Notification API保活
            this.setupNotificationKeepAlive();

            // 方法15: Performance Observer保活
            this.setupPerformanceKeepAlive();
        }

        // Audio API保活
        setupAudioKeepAlive() {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                gainNode.gain.value = 0; // 静音
                oscillator.frequency.value = 20000; // 超高频
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                const audioTimer = setInterval(() => {
                    try {
                        if (audioContext.state === 'suspended') {
                            audioContext.resume();
                        }
                        // 短暂播放保持活跃
                        const newOscillator = audioContext.createOscillator();
                        newOscillator.connect(gainNode);
                        newOscillator.start();
                        setTimeout(() => newOscillator.stop(), 100);
                    } catch (e) {
                        // 忽略错误
                    }
                }, 300000); // 每5分钟
                
                this.timers.push(audioTimer);
            } catch (e) {
                // Audio API不可用时跳过
            }
        }

        // requestAnimationFrame保活
        setupRAFKeepAlive() {
            let rafId;
            const rafKeepAlive = () => {
                if (this.keepAliveElement) {
                    const opacity = parseFloat(this.keepAliveElement.style.opacity) || 0.001;
                    this.keepAliveElement.style.opacity = (opacity + 0.0001).toFixed(4);
                }
                
                setTimeout(() => {
                    rafId = requestAnimationFrame(rafKeepAlive);
                }, 240000); // 每4分钟
            };
            
            rafId = requestAnimationFrame(rafKeepAlive);
            
            // 保存RAF ID用于清理
            this.rafId = rafId;
        }

        // 页面可见性处理
        setupPageVisibilityHandlers() {
            // 监听页面可见性变化
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    // 页面重新可见时强化保活
                    this.strengthenKeepAlive();
                }
            });

            // 监听窗口焦点变化
            window.addEventListener('focus', () => {
                this.strengthenKeepAlive();
            });

            // 监听页面恢复事件
            window.addEventListener('pageshow', (e) => {
                if (e.persisted) {
                    this.strengthenKeepAlive();
                }
            });
        }

        // WebSocket保活
        setupWebSocketKeepAlive() {
            try {
                // 创建本地WebSocket连接保持网络栈活跃
                const ws = new WebSocket('wss://echo.websocket.org/');
                ws.onopen = () => {
                    const pingTimer = setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
                        }
                    }, 240000); // 每4分钟
                    this.timers.push(pingTimer);
                };
                ws.onerror = () => {
                    // 静默处理错误
                };
            } catch (e) {
                // WebSocket不可用时跳过
            }
        }

        // Service Worker保活
        setupServiceWorkerKeepAlive() {
            if ('serviceWorker' in navigator) {
                try {
                    const swCode = `
                        self.addEventListener('message', event => {
                            if (event.data.type === 'keepalive') {
                                event.ports[0].postMessage({type: 'alive', timestamp: Date.now()});
                            }
                        });
                    `;
                    const blob = new Blob([swCode], { type: 'application/javascript' });
                    const swUrl = URL.createObjectURL(blob);
                    
                    navigator.serviceWorker.register(swUrl).then(registration => {
                        const channel = new MessageChannel();
                        const swTimer = setInterval(() => {
                            if (registration.active) {
                                registration.active.postMessage({type: 'keepalive'}, [channel.port2]);
                            }
                        }, 300000); // 每5分钟
                        this.timers.push(swTimer);
                    }).catch(() => {
                        // Service Worker注册失败时静默处理
                    });
                } catch (e) {
                    // Service Worker不可用时跳过
                }
            }
        }

        // IndexedDB保活
        setupIndexedDBKeepAlive() {
            try {
                const dbRequest = indexedDB.open('NodeSeekKeepAlive', 1);
                dbRequest.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('keepalive')) {
                        db.createObjectStore('keepalive', { keyPath: 'id' });
                    }
                };
                dbRequest.onsuccess = (event) => {
                    const db = event.target.result;
                    const dbTimer = setInterval(() => {
                        const transaction = db.transaction(['keepalive'], 'readwrite');
                        const store = transaction.objectStore('keepalive');
                        store.put({ id: 'ping', timestamp: Date.now() });
                    }, 180000); // 每3分钟
                    this.timers.push(dbTimer);
                };
            } catch (e) {
                // IndexedDB不可用时跳过
            }
        }

        // Canvas动画保活
        setupCanvasKeepAlive() {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 1;
                canvas.height = 1;
                canvas.style.cssText = `
                    position: fixed;
                    top: -10px;
                    left: -10px;
                    opacity: 0;
                    pointer-events: none;
                    z-index: -9999;
                `;
                document.body.appendChild(canvas);
                
                const ctx = canvas.getContext('2d');
                let frame = 0;
                
                const animate = () => {
                    ctx.clearRect(0, 0, 1, 1);
                    ctx.fillStyle = `rgba(${frame % 255}, ${(frame * 2) % 255}, ${(frame * 3) % 255}, 0.001)`;
                    ctx.fillRect(0, 0, 1, 1);
                    frame++;
                    
                    setTimeout(() => {
                        requestAnimationFrame(animate);
                    }, 120000); // 每2分钟
                };
                
                requestAnimationFrame(animate);
                this.canvasElement = canvas;
            } catch (e) {
                // Canvas不可用时跳过
            }
        }

        // Video元素保活
        setupVideoKeepAlive() {
            try {
                const video = document.createElement('video');
                video.style.cssText = `
                    position: fixed;
                    top: -10px;
                    left: -10px;
                    width: 1px;
                    height: 1px;
                    opacity: 0;
                    muted: true;
                    volume: 0;
                    pointer-events: none;
                    z-index: -9999;
                `;
                
                // 创建1秒钟的空白视频数据URL
                const canvas = document.createElement('canvas');
                canvas.width = 1;
                canvas.height = 1;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'rgba(0,0,0,0.001)';
                ctx.fillRect(0, 0, 1, 1);
                
                video.muted = true;
                video.loop = true;
                video.autoplay = true;
                
                // 使用MediaStream保持视频活跃
                if (canvas.captureStream) {
                    video.srcObject = canvas.captureStream(0.1); // 极低帧率
                }
                
                document.body.appendChild(video);
                
                const videoTimer = setInterval(() => {
                    if (video.paused) {
                        video.play().catch(() => {});
                    }
                }, 300000); // 每5分钟检查
                
                this.timers.push(videoTimer);
                this.videoElement = video;
            } catch (e) {
                // Video不可用时跳过
            }
        }

        // 网络请求保活
        setupNetworkKeepAlive() {
            const networkTimer = setInterval(() => {
                // 发送HEAD请求到当前域名保持连接
                fetch(window.location.origin + '/favicon.ico', {
                    method: 'HEAD',
                    cache: 'no-cache',
                    mode: 'no-cors'
                }).catch(() => {
                    // 静默处理网络错误
                });
            }, 360000); // 每6分钟
            
            this.timers.push(networkTimer);
        }

        // Notification API保活
        setupNotificationKeepAlive() {
            if ('Notification' in window && Notification.permission === 'granted') {
                const notificationTimer = setInterval(() => {
                    // 创建静默通知（立即关闭）
                    const notification = new Notification('', {
                        body: '',
                        icon: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                        silent: true,
                        tag: 'keepalive'
                    });
                    
                    setTimeout(() => {
                        notification.close();
                    }, 1);
                }, 600000); // 每10分钟
                
                this.timers.push(notificationTimer);
            }
        }

        // Performance Observer保活
        setupPerformanceKeepAlive() {
            try {
                if ('PerformanceObserver' in window) {
                    const observer = new PerformanceObserver((list) => {
                        // 处理性能条目保持观察器活跃
                        list.getEntries();
                    });
                    
                    observer.observe({ entryTypes: ['navigation', 'resource'] });
                    
                    // 定期触发性能监控
                    const perfTimer = setInterval(() => {
                        performance.mark('keepalive-mark-' + Date.now());
                    }, 480000); // 每8分钟
                    
                    this.timers.push(perfTimer);
                    this.performanceObserver = observer;
                }
            } catch (e) {
                // Performance Observer不可用时跳过
            }
        }

        // 强化保活机制
        strengthenKeepAlive() {
            // 立即执行一次保活操作
            if (this.keepAliveElement) {
                this.keepAliveElement.style.opacity = '0.002';
                setTimeout(() => {
                    this.keepAliveElement.style.opacity = '0.001';
                }, 100);
            }
            
            // 强制localStorage操作
            localStorage.setItem('nodeseek_wakeup_ping', Date.now().toString());
            setTimeout(() => {
                localStorage.removeItem('nodeseek_wakeup_ping');
            }, 500);

            // 强制触发多种保活机制
            if (this.canvasElement) {
                const ctx = this.canvasElement.getContext('2d');
                ctx.fillStyle = `rgba(${Math.random() * 255}, 0, 0, 0.001)`;
                ctx.fillRect(0, 0, 1, 1);
            }

            if (this.videoElement && this.videoElement.paused) {
                this.videoElement.play().catch(() => {});
            }

            // 强制性能标记
            try {
                performance.mark('wakeup-mark-' + Date.now());
            } catch (e) {}
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
            
            // 启动签到循环
            this.startSignLoop();
            
            // 启动状态清理监控
            this.startClearMonitor();
            
            // 启动特殊时间监控
            this.startSpecialTimeMonitor();
        }

        // 心跳机制
        startHeartbeat() {
            const heartbeatTimer = setInterval(() => {
                if (this.isMaster) {
                    localStorage.setItem(STORAGE_KEYS.lastHeartbeat, Date.now().toString());
                } else {
                    this.checkMasterStatus();
                }
            }, 10000);
            
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
                }
            });
        }

        // 启动签到循环 (24小时执行)
        startSignLoop() {
            const signTimer = setInterval(() => {
                this.checkAndSign();
            }, 30000); // 每30秒检查一次
            
            this.timers.push(signTimer);
        }

        // 检查并执行签到
        async checkAndSign() {
            if (!this.isMaster) return;
            
            const signStatus = localStorage.getItem(STORAGE_KEYS.signStatus);
            
            // 如果状态是500，停止签到（静默处理）
            if (signStatus === '500') {
                return;
            }

            // 执行签到
            await this.performSignIn();
        }

        // 执行签到API
        async performSignIn() {
            try {
                const response = await fetch(SIGN_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                // 如果返回500，记录状态并停止签到（静默处理）
                if (response.status === 500) {
                    localStorage.setItem(STORAGE_KEYS.signStatus, '500');
                    return;
                }

                // 根据响应状态处理，只在成功时输出日志
                if (response.ok) {
                    this.addLog('✅ 签到成功');
                }

            } catch (error) {
                // 签到异常时静默处理
            }
        }



        // 启动状态清理监控 (每60分钟)
        startClearMonitor() {
            const clearTimer = setInterval(() => {
                this.checkAndClearStatus();
            }, 60000); // 每分钟检查一次
            
            this.timers.push(clearTimer);
        }

        // 检查并清理状态
        checkAndClearStatus() {
            const lastClearTime = localStorage.getItem(STORAGE_KEYS.lastClearTime);
            const now = Date.now();
            
            // 如果距离上次清理超过60分钟
            if (!lastClearTime || now - parseInt(lastClearTime) >= 3600000) {
                this.clearStatusAndSign();
            }
        }

        // 清除状态并立即签到
        async clearStatusAndSign() {
            localStorage.removeItem(STORAGE_KEYS.signStatus);
            localStorage.removeItem('nodeseek_last_status_notify'); // 清除状态提示记录
            localStorage.setItem(STORAGE_KEYS.lastClearTime, Date.now().toString());
            
            // 静默重置状态，立即执行签到
            await this.performSignIn();
        }

        // 启动特殊时间监控 (00:00:00)
        startSpecialTimeMonitor() {
            const specialTimer = setInterval(() => {
                this.checkSpecialTime();
            }, 1000); // 每秒检查
            
            this.timers.push(specialTimer);
        }

        // 检查特殊时间
        checkSpecialTime() {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();
            
            // 在00:00:00执行特殊清理和签到
            if (hours === 0 && minutes === 0 && seconds === 0) {
                this.specialClearAndSign();
            }
        }

        // 特殊时间清理状态并签到
        async specialClearAndSign() {
            localStorage.removeItem(STORAGE_KEYS.signStatus);
            localStorage.removeItem('nodeseek_last_status_notify'); // 清除状态提示记录
            localStorage.setItem(STORAGE_KEYS.lastClearTime, Date.now().toString());
            
            // 静默重置状态，立即执行签到
            await this.performSignIn();
        }

        // 页面卸载清理
        setupCleanup() {
            const cleanup = () => {
                this.timers.forEach(timer => clearInterval(timer));
                this.timers = [];
                
                // 清理RAF
                if (this.rafId) {
                    cancelAnimationFrame(this.rafId);
                }
                
                // 清理保活元素
                if (this.keepAliveElement && this.keepAliveElement.parentNode) {
                    this.keepAliveElement.parentNode.removeChild(this.keepAliveElement);
                }
                
                // 清理Canvas元素
                if (this.canvasElement && this.canvasElement.parentNode) {
                    this.canvasElement.parentNode.removeChild(this.canvasElement);
                }
                
                // 清理Video元素
                if (this.videoElement) {
                    this.videoElement.pause();
                    if (this.videoElement.parentNode) {
                        this.videoElement.parentNode.removeChild(this.videoElement);
                    }
                }
                
                // 清理Performance Observer
                if (this.performanceObserver) {
                    this.performanceObserver.disconnect();
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
