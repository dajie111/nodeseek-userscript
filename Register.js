// NodeSeek 签到功能模块
// 包含所有签到相关的逻辑代码

(function() {
    'use strict';

    // 签到功能命名空间
    window.NodeSeekSignIn = {
        // 签到状态管理
        isSignInEnabled: function() {
            return localStorage.getItem('nodeseek_sign_enabled') === 'true';
        },

        setSignInEnabled: function(enabled) {
            localStorage.setItem('nodeseek_sign_enabled', enabled);
        },

        // 获取页面主内容文本，排除日志和弹窗区域
        getPageMainText: function() {
            // 克隆 body
            const bodyClone = document.body.cloneNode(true);
            // 移除日志、黑名单、好友、收藏等弹窗
            const dialogs = bodyClone.querySelectorAll('#logs-dialog, #blacklist-dialog, #friends-dialog, #favorites-dialog');
            dialogs.forEach(d => d.remove());
            return bodyClone.textContent || '';
        },

        // 添加日志函数（需要从主程序传入）
        addLog: null,

        // 检查登录状态
        checkLoginState: function() {
            const loginBtn = document.querySelector('button, a, input[type="button"], div')?.textContent?.includes('登录');
            const registerBtn = document.querySelector('button, a, input[type="button"], div')?.textContent?.includes('注册');
            const strangerText = this.getPageMainText().includes('你好啊，陌生人');
            const newcomerText = this.getPageMainText().includes('我的朋友，看起来你是新来的');

            // 如果未登录或登录相关页面
            if ((strangerText && newcomerText) ||
                (loginBtn && registerBtn) ||
                (strangerText && loginBtn)) {

                // 立即关闭签到功能
                this.setSignInEnabled(false);
                if (this.addLog) {
                    this.addLog('启动时检测到未登录状态，自动签到已禁用');
                }

                // 更新签到按钮
                this.updateSignInButton();

                return true; // 检测到未登录状态
            }

            // 判断登录后签到关键词只在board页面(签到页面)检测
            const isInBoardPage = window.location.href.includes('/board');
            const loginToSignText = this.getPageMainText();

            if (isInBoardPage && loginToSignText.includes('登录后签到')) {
                // 立即关闭签到功能
                this.setSignInEnabled(false);
                if (this.addLog) {
                    this.addLog('启动时检测到"登录后签到"文字，自动签到已禁用');
                }

                // 更新签到按钮
                this.updateSignInButton();

                return true; // 检测到未登录状态
            }

            return false; // 未检测到未登录状态
        },

        // 更新签到按钮状态
        updateSignInButton: function() {
            const signInBtn = document.getElementById('sign-in-btn');
            if (signInBtn) {
                if (this.isSignInEnabled()) {
                    signInBtn.textContent = '关闭签到';
                    signInBtn.style.background = '#f44336'; // 红色表示可以关闭
                } else {
                    signInBtn.textContent = '开启签到';
                    signInBtn.style.background = '#4CAF50'; // 绿色表示可以开启
                }
            }
        },

        // 强制停止签到
        forceStopSignIn: function(reason) {
            // 关闭签到
            this.setSignInEnabled(false);
            
            // 记录原因
            if (this.addLog) {
                this.addLog('强制停止签到: ' + reason);
            }
            
            // 更新按钮状态
            this.updateSignInButton();
            
            // 清除签到流程标记
            localStorage.removeItem('nodeseek_signing_in');
        },

        // 检查是否在签到页面且已签到
        checkAlreadySignedIn: function() {
            const pageText = this.getPageMainText();
            return pageText.includes('今日已签到') || pageText.includes('您今天已经签到过了');
        },

        // 查找并点击签到按钮
        findAndClickSignInButton: function() {
            // 查找"试试手气"按钮
            let signInButton = Array.from(document.querySelectorAll('button, a, div[role="button"], span[role="button"]'))
                .find(btn => btn.textContent && btn.textContent.trim() === '试试手气');

            if (signInButton) {
                // 点击签到按钮
                if (this.addLog) {
                    this.addLog('点击签到按钮');
                }
                signInButton.click();
                return true;
            } else {
                // 尝试查找其他可能的签到按钮
                signInButton = Array.from(document.querySelectorAll('button, a, div[role="button"], span[role="button"]'))
                    .find(btn => btn.textContent && (btn.textContent.includes('签到') || btn.textContent.includes('打卡')));
                
                if (signInButton) {
                    if (this.addLog) {
                        this.addLog('找到备用签到按钮，点击');
                    }
                    signInButton.click();
                    return true;
                } else {
                    if (this.addLog) {
                        this.addLog('未找到签到按钮，签到失败');
                    }
                    return false;
                }
            }
        },

        // 在签到页面执行签到
        performSignInOnPage: function() {
            // 检查是否已经签到
            if (this.checkAlreadySignedIn()) {
                if (this.addLog) {
                    this.addLog('检测到今日已签到，跳过签到流程');
                }
                localStorage.removeItem('nodeseek_signing_in');
                return;
            }

            // 查找并点击签到按钮
            if (this.findAndClickSignInButton()) {
                // 使用 MutationObserver 观察页面变化
                const observer = new MutationObserver((mutations) => {
                    // 检查是否签到成功
                    if (this.checkAlreadySignedIn()) {
                        if (this.addLog) {
                            this.addLog('签到成功！');
                        }
                        observer.disconnect();
                        localStorage.removeItem('nodeseek_signing_in');
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });

                // 设置超时，避免无限等待
                setTimeout(() => {
                    observer.disconnect();
                    localStorage.removeItem('nodeseek_signing_in');
                    if (this.addLog) {
                        this.addLog('签到流程超时结束');
                    }
                }, 10000);
            } else {
                localStorage.removeItem('nodeseek_signing_in');
            }
        },

        // 执行签到流程
        doSignIn: function() {
            if (this.addLog) {
                this.addLog('开始执行签到流程');
            }

            // 检查用户登录状态
            if (this.checkLoginState()) {
                if (this.addLog) {
                    this.addLog('用户未登录，停止签到');
                }
                return;
            }

            // 检查是否有强制停止签到的标记
            if (!this.isSignInEnabled()) {
                if (this.addLog) {
                    this.addLog('签到功能已禁用，停止签到');
                }
                return;
            }

            // 跳转到签到页面
            if (this.addLog) {
                this.addLog('跳转到签到页面');
            }
            localStorage.setItem('nodeseek_signing_in', 'true');
            window.location.href = 'https://www.nodeseek.com/board';
        },

        // 检查签到状态并执行签到流程
        checkAndPerformSignIn: function() {
            // 如果在签到页面且有签到标记
            if (window.location.href.includes('/board') && localStorage.getItem('nodeseek_signing_in') === 'true') {
                if (this.addLog) {
                    this.addLog('到达签到页面，开始签到流程');
                }
                // 延迟执行，确保页面完全加载
                setTimeout(() => {
                    this.performSignInOnPage();
                }, 2000);
            }
        },

        // 启动签到定时器
        startSignInTimer: function() {
            // 启动时立即检测登录状态
            if (this.checkLoginState()) {
                return; // 如果检测到未登录，直接返回
            }

            // 每10秒检查一次时间
            const checkInterval = setInterval(() => {
                const now = new Date();
                const timeStr = now.toTimeString().split(' ')[0]; // 获取 HH:MM:SS 格式
                
                // 每10秒输出一次当前时间日志
                if (this.addLog) {
                    this.addLog(`当前时间: ${timeStr}`);
                }
                
                // 检查是否在00:00:00-00:00:10之间
                if (timeStr >= '00:00:00' && timeStr <= '00:00:10') {
                    // 检查签到是否启用
                    if (this.isSignInEnabled()) {
                        if (this.addLog) {
                            this.addLog('到达签到时间，开始执行签到');
                        }
                        this.doSignIn();
                    } else {
                        if (this.addLog) {
                            this.addLog('到达签到时间，但签到功能已禁用');
                        }
                    }
                }
            }, 10000); // 每10秒检查一次

            // 页面加载时检查签到状态
            this.checkAndPerformSignIn();
        },

        // 初始化签到功能
        init: function(addLogFunction) {
            // 设置日志函数
            this.addLog = addLogFunction;
            
            // 启动签到定时器
            this.startSignInTimer();
            
            if (this.addLog) {
                this.addLog('签到功能模块已初始化');
            }
        }
    };
})();