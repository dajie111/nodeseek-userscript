// ========== 自动签到 ==========
(function() {
    'use strict';

    // NodeSeek 签到系统配置
    const CONFIG = {
        SIGN_API: '/api/attendance?random=true',
        STORAGE_KEYS: {
            signedToday: 'nodeseek_signed_today',
            masterPageId: 'nodeseek_master_page_id',
            lastHeartbeat: 'nodeseek_last_heartbeat'
        },
        INTERVALS: {
            signCheck: 60000,      // 签到检查间隔：1分钟
            heartbeat: 5000,       // 心跳间隔：5秒
            keepAlive: 35000       // 保活间隔：30-40秒随机
        }
    };

    class NodeSeekSignIn {
        constructor() {
            this.pageId = this.generatePageId();
            this.isMasterPage = false;
            this.timers = [];
            this.keepAliveElement = null;
            
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

            // 清理过期数据
            this.cleanExpiredData();

            // 多标签页管理
                this.initMultiTabManagement();
                
            // 设置每日重置
            this.setupDailyReset();
            
            // 创建保活元素
            this.createKeepAliveElement();
            
            // 页面卸载清理
            this.setupPageUnloadHandler();
        }

        // 检查是否是NodeSeek页面
        isNodeSeekPage() {
            return window.location.hostname === 'www.nodeseek.com';
        }

        // 多标签页管理
        initMultiTabManagement() {
            this.electMasterPage();
            this.startHeartbeat();
            this.setupStorageListener();
        }

        // 竞选主页面
        electMasterPage() {
            const currentMasterId = localStorage.getItem(CONFIG.STORAGE_KEYS.masterPageId);
            const lastHeartbeat = localStorage.getItem(CONFIG.STORAGE_KEYS.lastHeartbeat);
            
            // 如果没有主页面或主页面已失效（超过15秒无心跳）
            if (!currentMasterId || !lastHeartbeat || 
                Date.now() - parseInt(lastHeartbeat) > 15000) {
                this.becomeMasterPage();
            }
        }

        // 成为主页面
        becomeMasterPage() {
            this.isMasterPage = true;
            localStorage.setItem(CONFIG.STORAGE_KEYS.masterPageId, this.pageId);
            localStorage.setItem(CONFIG.STORAGE_KEYS.lastHeartbeat, Date.now().toString());
            
            // 开始签到检查
            this.startSignInCheck();
            
            // 开始保活机制
            this.startKeepAlive();
        }

        // 开始心跳检测
        startHeartbeat() {
            const heartbeatTimer = setInterval(() => {
                if (this.isMasterPage) {
                    // 主页面发送心跳
                    localStorage.setItem(CONFIG.STORAGE_KEYS.lastHeartbeat, Date.now().toString());
                } else {
                    // 从页面检查主页面健康状态
                    this.checkMasterPageHealth();
                }
            }, CONFIG.INTERVALS.heartbeat);
            
            this.timers.push(heartbeatTimer);
        }

        // 检查主页面健康状态
        checkMasterPageHealth() {
            const lastHeartbeat = localStorage.getItem(CONFIG.STORAGE_KEYS.lastHeartbeat);
            const currentMasterId = localStorage.getItem(CONFIG.STORAGE_KEYS.masterPageId);
            
            if (!lastHeartbeat || !currentMasterId || 
                Date.now() - parseInt(lastHeartbeat) > 15000) {
                // 主页面失效，紧急接管
                this.emergencyTakeover();
            }
        }

        // 紧急接管
        emergencyTakeover() {
            this.becomeMasterPage();
        }

        // 监听localStorage变化
        setupStorageListener() {
            window.addEventListener('storage', (e) => {
                if (e.key === CONFIG.STORAGE_KEYS.masterPageId && e.newValue !== this.pageId) {
                    // 其他页面成为主页面，当前页面变为从页面
                    this.isMasterPage = false;
                    this.stopMasterPageTasks();
                }
            });
        }

        // 停止主页面任务
        stopMasterPageTasks() {
            // 停止保活机制
            this.stopKeepAlive();
        }

        // 开始签到检查
        startSignInCheck() {
            // 立即检查一次
            this.checkSignIn();
            
            // 定期检查签到
            const signTimer = setInterval(() => {
                this.checkSignIn();
            }, CONFIG.INTERVALS.signCheck);
            
            this.timers.push(signTimer);
            }

        // 检查并执行签到
        async checkSignIn() {
            if (!this.isMasterPage) return;

            // 检查今日是否已签到
            if (this.hasSignedToday()) return;

            // 执行签到
            await this.performSignIn();
        }

        // 执行签到API
        async performSignIn() {
            try {
                const response = await fetch(CONFIG.SIGN_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                if (response.ok) {
                    // 签到成功
                    this.recordSignInSuccess();
                    this.logToOperationDialog('✅ 自动签到成功！');
                } else {
                    // 签到失败
                    this.logToOperationDialog(`❌ 签到失败：HTTP ${response.status}`);
                }
            } catch (error) {
                // 签到异常
                this.logToOperationDialog(`❌ 签到异常：${error.message}`);
            }
        }

        // 检查今日是否已签到
        hasSignedToday() {
            const today = this.getTodayString();
            const signedDate = localStorage.getItem(CONFIG.STORAGE_KEYS.signedToday);
            return signedDate === today;
        }

        // 记录签到成功
        recordSignInSuccess() {
            const today = this.getTodayString();
            localStorage.setItem(CONFIG.STORAGE_KEYS.signedToday, today);
        }

        // 获取今日日期字符串
        getTodayString() {
            return new Date().toISOString().split('T')[0];
        }

        // 设置每日重置
        setupDailyReset() {
            const resetTimer = setInterval(() => {
                const now = new Date();
                // 在00:00:00清除状态后立即执行签到
                if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
                    this.resetDailyStatusAndSignIn();
                }
            }, 1000);
            
            this.timers.push(resetTimer);
        }

        // 重置每日状态
        resetDailyStatus() {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.signedToday);
        }

        // 00:00:00清除状态后立即执行签到
        resetDailyStatusAndSignIn() {
            if (!this.isMasterPage) return;
            
            // 先清除今日签到状态
            this.resetDailyStatus();
            
            // 立即执行签到，无延迟
            this.performSignIn();
        }

        // 立即执行签到（新的一天开始时）
        immediateSignInCheck() {
            if (!this.isMasterPage) return;
            
            // 00:00:00立即执行签到，无延迟
            this.performSignIn();
        }

        // 创建保活元素
        createKeepAliveElement() {
            if (!this.isNodeSeekPage()) return;
            
            this.keepAliveElement = document.createElement('div');
            this.keepAliveElement.style.cssText = `
                position: fixed;
                top: -2px;
                left: -2px;
                width: 1px;
                height: 1px;
                opacity: 0.001;
                pointer-events: none;
                z-index: -9999;
                background: transparent;
            `;
            document.body.appendChild(this.keepAliveElement);
        }

        // 开始保活机制
        startKeepAlive() {
            if (!this.isMasterPage || !this.keepAliveElement) return;
            
            const keepAliveTimer = setInterval(() => {
                this.performKeepAlive();
            }, this.getRandomKeepAliveInterval());
            
            this.timers.push(keepAliveTimer);
        }

        // 停止保活机制
        stopKeepAlive() {
            // 定时器会在清理时统一停止
        }

        // 执行保活操作
        performKeepAlive() {
            if (!this.keepAliveElement) return;
            
            // 极微透明度微调（0.0001-0.0003之间）
            const opacity = 0.0001 + Math.random() * 0.0002;
            this.keepAliveElement.style.opacity = opacity.toFixed(4);
            
            // 更远位置微调（-5px到-10px之间）
            const top = -5 - Math.random() * 5;
            const left = -5 - Math.random() * 5;
            this.keepAliveElement.style.top = `${top.toFixed(1)}px`;
            this.keepAliveElement.style.left = `${left.toFixed(1)}px`;
        }

        // 获取随机保活间隔（30-40秒）
        getRandomKeepAliveInterval() {
            return 30000 + Math.random() * 10000;
        }

        // 清理过期数据
        cleanExpiredData() {
            // 清理非今日的签到记录
            const today = this.getTodayString();
            const signedDate = localStorage.getItem(CONFIG.STORAGE_KEYS.signedToday);
            if (signedDate && signedDate !== today) {
                localStorage.removeItem(CONFIG.STORAGE_KEYS.signedToday);
        }

            // 清理过期的主页面信息
            const lastHeartbeat = localStorage.getItem(CONFIG.STORAGE_KEYS.lastHeartbeat);
            if (lastHeartbeat && Date.now() - parseInt(lastHeartbeat) > 300000) { // 5分钟
                localStorage.removeItem(CONFIG.STORAGE_KEYS.masterPageId);
                localStorage.removeItem(CONFIG.STORAGE_KEYS.lastHeartbeat);
                }
            }

        // 页面卸载处理
        setupPageUnloadHandler() {
            const handleUnload = () => {
                // 清理所有定时器
                this.timers.forEach(timer => clearInterval(timer));
                this.timers = [];
                
                // 如果是主页面，释放主页面权限
                if (this.isMasterPage) {
                    localStorage.removeItem(CONFIG.STORAGE_KEYS.masterPageId);
                    localStorage.removeItem(CONFIG.STORAGE_KEYS.lastHeartbeat);
                }
                
                // 清理保活元素
                if (this.keepAliveElement && this.keepAliveElement.parentNode) {
                    this.keepAliveElement.parentNode.removeChild(this.keepAliveElement);
                }
            };

            window.addEventListener('beforeunload', handleUnload);
            window.addEventListener('pagehide', handleUnload);
        }

        // 输出到操作日志弹窗（只输出签到结果）
        logToOperationDialog(message) {
            if (typeof window.addLog === 'function') {
                window.addLog(message);
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
