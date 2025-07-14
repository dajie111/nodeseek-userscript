// ========== 账号同步 ==========

(function() {
    'use strict';

    // 配置
    const CONFIG = {
        SERVER_URL: 'https://log.396663.xyz',
        STORAGE_KEY: 'nodeseek_login_token',
        USER_KEY: 'nodeseek_login_user'
    };

    // 全局变量
    let currentUser = null;
    let authToken = null;

    // 工具函数
    const Utils = {
        // 显示消息
        showMessage: function(message, type = 'info') {
            // 记录日志
            if (typeof window.addLog === 'function') {
                window.addLog(`[配置同步] ${message}`);
            } else {
                console.log(`[配置同步] ${message}`);
            }
            
            // 显示界面提示
            this.showToast(message, type);
        },

        // 显示临时提示框
        showToast: function(message, type = 'info') {
            // 移除现有的提示框
            const existingToast = document.getElementById('nodeseek-login-toast');
            if (existingToast) {
                existingToast.remove();
            }

            // 创建提示框
            const toast = document.createElement('div');
            toast.id = 'nodeseek-login-toast';
            toast.textContent = message;
            
            // 根据类型设置样式
            let backgroundColor = '#2196F3'; // 默认蓝色
            let textColor = '#fff';
            
            if (type === 'error') {
                backgroundColor = '#f44336'; // 红色
            } else if (type === 'success') {
                backgroundColor = '#4CAF50'; // 绿色
            } else if (type === 'warning') {
                backgroundColor = '#ff9800'; // 橙色
            }
            
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: ${backgroundColor};
                color: ${textColor};
                padding: 12px 20px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10001;
                max-width: 300px;
                word-wrap: break-word;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                pointer-events: auto;
            `;

            document.body.appendChild(toast);

            // 显示动画
            setTimeout(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(0)';
            }, 10);

            // 3秒后自动隐藏
            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(100%)';
                    setTimeout(() => {
                        if (toast && toast.parentNode) {
                            toast.remove();
                        }
                    }, 300);
                }
            }, 3000);

            // 点击隐藏
            toast.onclick = () => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (toast && toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            };
        },

        // HTTP请求
        request: async function(url, options = {}) {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            if (authToken) {
                defaultOptions.headers['Authorization'] = `Bearer ${authToken}`;
            }

            const finalOptions = {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            };

            try {
                const response = await fetch(url, finalOptions);
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || `HTTP error! status: ${response.status}`);
                }
                
                return data;
            } catch (error) {
                console.error('Request failed:', error);
                throw error;
            }
        },

        // 获取所有配置数据
        getAllConfig: function() {
            // 获取黑名单数据
            const blacklist = JSON.parse(localStorage.getItem('nodeseek_blacklist') || '{}');
            
            // 获取好友数据
            let friends = {};
            try {
                if (window.NodeSeekFriends && typeof window.NodeSeekFriends.getFriends === 'function') {
                    friends = window.NodeSeekFriends.getFriends();
                } else {
                    friends = JSON.parse(localStorage.getItem('nodeseek_friends') || '{}');
                }
            } catch (e) {
                friends = {};
            }
            
            // 获取收藏数据
            const favorites = JSON.parse(localStorage.getItem('nodeseek_favorites') || '[]');
            
            // 获取操作日志
            const logs = JSON.parse(localStorage.getItem('nodeseek_sign_logs') || '[]');
            
            // 获取浏览历史
            const browseHistory = JSON.parse(localStorage.getItem('nodeseek_browse_history') || '[]');
            
            // 获取热点统计数据
            const hotTopicsData = {};
            try {
                const rssHistory = localStorage.getItem('nodeseek_rss_history');
                if (rssHistory) hotTopicsData.rssHistory = JSON.parse(rssHistory);
                
                const hotWordsHistory = localStorage.getItem('nodeseek_hot_words_history');
                if (hotWordsHistory) hotTopicsData.hotWordsHistory = JSON.parse(hotWordsHistory);
                
                const timeDistributionHistory = localStorage.getItem('nodeseek_time_distribution_history');
                if (timeDistributionHistory) hotTopicsData.timeDistributionHistory = JSON.parse(timeDistributionHistory);
                
                const userStatsHistory = localStorage.getItem('nodeseek_user_stats_history');
                if (userStatsHistory) hotTopicsData.userStatsHistory = JSON.parse(userStatsHistory);
                
                const globalState = localStorage.getItem('nodeseek_focus_global_state');
                if (globalState) hotTopicsData.globalState = JSON.parse(globalState);
            } catch (error) {
                console.error('获取热点统计数据失败:', error);
            }
            
            // 获取快捷回复数据
            let quickReplies = {};
            try {
                if (window.NodeSeekQuickReply && typeof window.NodeSeekQuickReply.getQuickReplies === 'function') {
                    quickReplies = window.NodeSeekQuickReply.getQuickReplies();
                } else {
                    quickReplies = JSON.parse(localStorage.getItem('nodeseek_quick_reply') || '{}');
                }
            } catch (error) {
                quickReplies = {};
            }

            return {
                blacklist,
                friends,
                favorites,
                logs,
                browseHistory,
                hotTopicsData,
                quickReplies,
                timestamp: new Date().toISOString()
            };
        },

        // 应用配置数据
        applyConfig: function(config) {
            let applied = [];
            
            try {
                // 应用黑名单数据
                if (config.blacklist) {
                    localStorage.setItem('nodeseek_blacklist', JSON.stringify(config.blacklist));
                    applied.push("黑名单");
                }

                // 应用好友数据
                if (config.friends) {
                    if (window.NodeSeekFriends && typeof window.NodeSeekFriends.setFriends === 'function') {
                        window.NodeSeekFriends.setFriends(config.friends);
                    } else {
                        localStorage.setItem('nodeseek_friends', JSON.stringify(config.friends));
                    }
                    applied.push("好友");
                }

                // 应用收藏数据
                if (config.favorites && Array.isArray(config.favorites)) {
                    localStorage.setItem('nodeseek_favorites', JSON.stringify(config.favorites));
                    applied.push("收藏");
                }

                // 应用操作日志
                if (config.logs && Array.isArray(config.logs)) {
                    localStorage.setItem('nodeseek_sign_logs', JSON.stringify(config.logs));
                    applied.push("操作日志");
                }

                // 应用浏览历史
                if (config.browseHistory && Array.isArray(config.browseHistory)) {
                    localStorage.setItem('nodeseek_browse_history', JSON.stringify(config.browseHistory));
                    applied.push("浏览历史");
                }

                // 应用热点统计数据
                if (config.hotTopicsData && typeof config.hotTopicsData === 'object') {
                    let hotImportCount = 0;
                    
                    if (config.hotTopicsData.rssHistory) {
                        localStorage.setItem('nodeseek_rss_history', JSON.stringify(config.hotTopicsData.rssHistory));
                        hotImportCount++;
                    }
                    
                    if (config.hotTopicsData.hotWordsHistory) {
                        localStorage.setItem('nodeseek_hot_words_history', JSON.stringify(config.hotTopicsData.hotWordsHistory));
                        hotImportCount++;
                    }
                    
                    if (config.hotTopicsData.timeDistributionHistory) {
                        localStorage.setItem('nodeseek_time_distribution_history', JSON.stringify(config.hotTopicsData.timeDistributionHistory));
                        hotImportCount++;
                    }
                    
                    if (config.hotTopicsData.userStatsHistory) {
                        localStorage.setItem('nodeseek_user_stats_history', JSON.stringify(config.hotTopicsData.userStatsHistory));
                        hotImportCount++;
                    }
                    
                    if (config.hotTopicsData.globalState) {
                        localStorage.setItem('nodeseek_focus_global_state', JSON.stringify(config.hotTopicsData.globalState));
                        hotImportCount++;
                    }
                    
                    if (hotImportCount > 0) {
                        applied.push(`热点统计(${hotImportCount}项)`);
                    }
                }

                // 应用快捷回复数据
                if (config.quickReplies && typeof config.quickReplies === 'object') {
                    if (window.NodeSeekQuickReply && typeof window.NodeSeekQuickReply.setQuickReplies === 'function') {
                        window.NodeSeekQuickReply.setQuickReplies(config.quickReplies);
                    } else {
                        localStorage.setItem('nodeseek_quick_reply', JSON.stringify(config.quickReplies));
                    }
                    const categoriesCount = Object.keys(config.quickReplies).length;
                    applied.push(`快捷回复(${categoriesCount}个分类)`);
                }

                return applied;
            } catch (error) {
                console.error('应用配置失败:', error);
                throw error;
            }
        }
    };

    // 认证管理
    const Auth = {
        // 初始化
        init: function() {
            // 从localStorage加载token和用户信息
            authToken = localStorage.getItem(CONFIG.STORAGE_KEY);
            const userStr = localStorage.getItem(CONFIG.USER_KEY);
            if (userStr) {
                try {
                    currentUser = JSON.parse(userStr);
                } catch (e) {
                    currentUser = null;
                }
            }
        },

        // 保存认证信息
        saveAuth: function(token, user) {
            authToken = token;
            currentUser = user;
            localStorage.setItem(CONFIG.STORAGE_KEY, token);
            localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
        },

        // 清除认证信息
        clearAuth: function() {
            authToken = null;
            currentUser = null;
            localStorage.removeItem(CONFIG.STORAGE_KEY);
            localStorage.removeItem(CONFIG.USER_KEY);
        },

        // 检查是否已登录
        isLoggedIn: function() {
            return !!(authToken && currentUser);
        },

        // 获取当前用户
        getCurrentUser: function() {
            return currentUser;
        },

        // 注册
        register: async function(username, password, securityCode) {
            try {
                const data = await Utils.request(`${CONFIG.SERVER_URL}/api/register`, {
                    method: 'POST',
                    body: JSON.stringify({ username, password, securityCode })
                });

                // 注册成功
                Utils.showMessage(data.message || '注册成功！', 'success');
                return data;
            } catch (error) {
                Utils.showMessage(`注册失败: ${error.message}`, 'error');
                throw error;
            }
        },

        // 找回密码
        resetPassword: async function(username, securityCode, newPassword) {
            try {
                const data = await Utils.request(`${CONFIG.SERVER_URL}/api/reset-password`, {
                    method: 'POST',
                    body: JSON.stringify({ username, securityCode, newPassword })
                });

                Utils.showMessage(data.message || '密码重置成功！', 'success');
                return data;
            } catch (error) {
                Utils.showMessage(`密码重置失败: ${error.message}`, 'error');
                throw error;
            }
        },

        // 修改密码
        changePassword: async function(currentPassword, newPassword) {
            try {
                const data = await Utils.request(`${CONFIG.SERVER_URL}/api/change-password`, {
                    method: 'POST',
                    body: JSON.stringify({ currentPassword, newPassword })
                });

                Utils.showMessage(data.message || '密码修改成功！', 'success');
                return data;
            } catch (error) {
                Utils.showMessage(`密码修改失败: ${error.message}`, 'error');
                throw error;
            }
        },

        // 登录
        login: async function(username, password) {
            try {
                const data = await Utils.request(`${CONFIG.SERVER_URL}/api/login`, {
                    method: 'POST',
                    body: JSON.stringify({ username, password })
                });

                if (data.success) {
                    this.saveAuth(data.token, { username: data.username });
                    Utils.showMessage(`登录成功，欢迎 ${data.username}`, 'success');
                }

                return data;
            } catch (error) {
                Utils.showMessage(`登录失败: ${error.message}`, 'error');
                throw error;
            }
        },

        // 退出登录
        logout: async function() {
            try {
                if (authToken) {
                    await Utils.request(`${CONFIG.SERVER_URL}/api/logout`, {
                        method: 'POST'
                    });
                }
            } catch (error) {
                console.error('退出登录请求失败:', error);
            } finally {
                this.clearAuth();
                Utils.showMessage('已退出登录');
            }
        },

        // 验证token
        validateToken: async function() {
            if (!authToken) return false;

            try {
                const data = await Utils.request(`${CONFIG.SERVER_URL}/api/user`);
                if (data.success) {
                    currentUser = data.user;
                    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(currentUser));
                    return true;
                }
            } catch (error) {
                console.error('Token验证失败:', error);
                this.clearAuth();
            }
            return false;
        }
    };

    // 配置同步
    const Sync = {
        // 上传配置到服务器
        upload: async function() {
            if (!Auth.isLoggedIn()) {
                Utils.showMessage('请先登录', 'error');
                return false;
            }

            try {
                const config = Utils.getAllConfig();
                const data = await Utils.request(`${CONFIG.SERVER_URL}/api/sync`, {
                    method: 'POST',
                    body: JSON.stringify({ config })
                });

                if (data.success) {
                    Utils.showMessage('配置已同步到服务器', 'success');
                    return true;
                }
            } catch (error) {
                Utils.showMessage(`配置同步失败: ${error.message}`, 'error');
            }
            return false;
        },

        // 从服务器下载配置
        download: async function() {
            if (!Auth.isLoggedIn()) {
                Utils.showMessage('请先登录', 'error');
                return false;
            }

            try {
                const data = await Utils.request(`${CONFIG.SERVER_URL}/api/sync`);

                if (data.success) {
                    const applied = Utils.applyConfig(data.config);
                    if (applied.length > 0) {
                        // 延迟显示确认对话框，让成功提示先显示
                        setTimeout(() => {
                            const shouldReload = confirm(`配置同步成功！\n\n已同步: ${applied.join('、')}\n\n是否刷新页面以应用更改？`);
                            if (shouldReload) {
                                location.reload();
                            } else {
                                Utils.showMessage('配置已同步，建议刷新页面以完全应用更改', 'info');
                            }
                        }, 500);
                    } else {
                        Utils.showMessage('从服务器获取配置成功，但没有数据需要应用', 'info');
                    }
                    return true;
                }
            } catch (error) {
                if (error.message.includes('404')) {
                    Utils.showMessage('服务器上没有配置数据，请先上传配置', 'warning');
                } else {
                    Utils.showMessage(`配置下载失败: ${error.message}`, 'error');
                }
            }
            return false;
        }
    };

    // UI管理
    const UI = {
        // 创建登录/注册对话框
        showAuthDialog: function() {
            // 检查是否已存在对话框
            const existingDialog = document.getElementById('login-auth-dialog');
            if (existingDialog) {
                existingDialog.remove();
                return;
            }

            const dialog = document.createElement('div');
            dialog.id = 'login-auth-dialog';
            // 检测是否为移动端
            const isMobile = window.innerWidth <= 768;
            
            dialog.style.cssText = `
                position: fixed;
                ${isMobile ? `
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 90vw;
                    max-width: 350px;
                ` : `
                    top: 60px;
                    right: 16px;
                    width: 300px;
                `}
                z-index: 10000;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                padding: ${isMobile ? '16px' : '20px'};
                max-height: ${isMobile ? '90vh' : '80vh'};
                overflow-y: auto;
                box-sizing: border-box;
            `;

            const title = document.createElement('div');
            title.textContent = '配置同步';
            title.className = 'dialog-title-draggable'; // 添加可拖拽标识
            title.style.cssText = `
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 15px;
                text-align: center;
                cursor: move;
                padding: 10px 5px;
                margin: -10px -5px 15px -5px;
                user-select: none;
            `;

            const closeBtn = document.createElement('span');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                position: absolute;
                right: 12px;
                top: 8px;
                cursor: pointer;
                font-size: 20px;
            `;
            closeBtn.onclick = () => dialog.remove();

            dialog.appendChild(title);
            dialog.appendChild(closeBtn);

            // 如果已登录，显示用户信息和同步功能
            if (Auth.isLoggedIn()) {
                this.createUserPanel(dialog);
            } else {
                this.createAuthPanel(dialog);
            }

            document.body.appendChild(dialog);
            
            // 使对话框可拖动
            this.makeDraggable(dialog);
        },

        // 优化输入框样式（移动端适配）
        optimizeInputForMobile: function(input, isMobile) {
            const styles = `
                width: 100%;
                padding: ${isMobile ? '12px 8px' : '8px'};
                border: 1px solid #ccc;
                border-radius: 4px;
                margin-bottom: 10px;
                box-sizing: border-box;
                font-size: ${isMobile ? '16px' : '14px'};
                line-height: 1.4;
                -webkit-appearance: none;
                transition: border-color 0.2s ease;
            `;
            input.style.cssText = styles;
            
            // 移动端禁用自动缩放
            if (isMobile) {
                input.setAttribute('autocapitalize', 'off');
                input.setAttribute('autocorrect', 'off');
            }
        },

        // 优化按钮样式（移动端适配）
        optimizeButtonForMobile: function(button, isMobile) {
            const currentStyles = button.style.cssText;
            button.style.cssText = currentStyles + `
                min-height: ${isMobile ? '44px' : '32px'};
                touch-action: manipulation;
                -webkit-appearance: none;
            `;
        },

        // 创建认证面板
        createAuthPanel: function(container) {
            const form = document.createElement('div');
            const isMobile = window.innerWidth <= 768;

            // 用户名输入
            const usernameLabel = document.createElement('div');
            usernameLabel.textContent = '用户名:';
            usernameLabel.style.marginBottom = '5px';

            const usernameInput = document.createElement('input');
            usernameInput.type = 'text';
            usernameInput.placeholder = '请输入用户名';
            this.optimizeInputForMobile(usernameInput, isMobile);

            // 密码输入
            const passwordLabel = document.createElement('div');
            passwordLabel.textContent = '密码:';
            passwordLabel.style.marginBottom = '5px';

            const passwordInput = document.createElement('input');
            passwordInput.type = 'password';
            passwordInput.placeholder = '请输入密码';
            this.optimizeInputForMobile(passwordInput, isMobile);

            // 安全码输入（仅注册时显示）
            const securityCodeLabel = document.createElement('div');
            securityCodeLabel.textContent = '安全码:';
            securityCodeLabel.style.marginBottom = '5px';
            securityCodeLabel.style.display = 'none';

            const securityCodeInput = document.createElement('input');
            securityCodeInput.type = 'password';
            securityCodeInput.placeholder = '请输入安全码（用于找回密码）';
            this.optimizeInputForMobile(securityCodeInput, isMobile);
            securityCodeInput.style.display = 'none'; // 默认隐藏

            // 模式切换提示
            const modeHint = document.createElement('div');
            modeHint.textContent = '登录模式';
            modeHint.style.cssText = `
                text-align: center;
                color: #666;
                font-size: 12px;
                margin-bottom: 15px;
            `;

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
            `;

            // 登录按钮
            const loginBtn = document.createElement('button');
            loginBtn.textContent = '登录';
            loginBtn.style.cssText = `
                flex: 1;
                padding: 8px;
                background: #1890ff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;

            // 注册按钮
            const registerBtn = document.createElement('button');
            registerBtn.textContent = '注册';
            registerBtn.style.cssText = `
                flex: 1;
                padding: 8px;
                background: #52c41a;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                display: none;
            `;

            // 模式切换容器
            const switchContainer = document.createElement('div');
            switchContainer.style.cssText = `
                display: flex;
                gap: 5px;
                margin-bottom: 10px;
            `;

            // 切换到注册模式按钮
            const switchToRegisterBtn = document.createElement('button');
            switchToRegisterBtn.textContent = '切换到注册';
            switchToRegisterBtn.style.cssText = `
                flex: 1;
                padding: 6px;
                background: #f0f0f0;
                color: #666;
                border: 1px solid #ccc;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            `;

            // 切换到登录模式按钮
            const switchToLoginBtn = document.createElement('button');
            switchToLoginBtn.textContent = '切换到登录';
            switchToLoginBtn.style.cssText = `
                flex: 1;
                padding: 6px;
                background: #f0f0f0;
                color: #666;
                border: 1px solid #ccc;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                display: none;
            `;

            // 找回密码按钮
            const forgotPasswordBtn = document.createElement('button');
            forgotPasswordBtn.textContent = '找回密码';
            forgotPasswordBtn.style.cssText = `
                width: 100%;
                padding: 6px;
                background: #faad14;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                margin-bottom: 5px;
            `;

            // 当前模式：false=登录，true=注册
            let isRegisterMode = false;

            // 切换模式函数
            const toggleMode = () => {
                isRegisterMode = !isRegisterMode;
                if (isRegisterMode) {
                    // 切换到注册模式
                    securityCodeLabel.style.display = 'block';
                    securityCodeInput.style.display = 'block';
                    modeHint.textContent = '注册模式 - 请设置安全码用于找回密码';
                    switchToRegisterBtn.style.display = 'none';
                    switchToLoginBtn.style.display = 'block';
                    // 只显示注册按钮
                    loginBtn.style.display = 'none';
                    registerBtn.style.display = 'block';
                } else {
                    // 切换到登录模式
                    securityCodeLabel.style.display = 'none';
                    securityCodeInput.style.display = 'none';
                    modeHint.textContent = '登录模式';
                    switchToRegisterBtn.style.display = 'block';
                    switchToLoginBtn.style.display = 'none';
                    // 只显示登录按钮
                    loginBtn.style.display = 'block';
                    registerBtn.style.display = 'none';
                }
            };

            switchToRegisterBtn.onclick = toggleMode;
            switchToLoginBtn.onclick = toggleMode;

            // 找回密码功能
            const showForgotPasswordDialog = () => {
                this.createForgotPasswordDialog();
            };

            forgotPasswordBtn.onclick = showForgotPasswordDialog;

            // 事件处理
            const handleAuth = async (isLogin) => {
                const username = usernameInput.value.trim();
                const password = passwordInput.value;
                const securityCode = securityCodeInput.value.trim();

                if (!username || !password) {
                    alert('请输入用户名和密码');
                    return;
                }

                if (!isLogin && !securityCode) {
                    alert('注册时请输入安全码');
                    return;
                }

                try {
                    loginBtn.disabled = true;
                    registerBtn.disabled = true;
                    if (isRegisterMode) {
                        registerBtn.textContent = '处理中...';
                    } else {
                        loginBtn.textContent = '处理中...';
                    }

                    if (isLogin) {
                        await Auth.login(username, password);
                    } else {
                        await Auth.register(username, password, securityCode);
                        // 注册成功后清空输入框
                        usernameInput.value = '';
                        passwordInput.value = '';
                        securityCodeInput.value = '';
                        // 切换回登录模式
                        toggleMode();
                    }

                    // 登录成功后更新界面
                    if (isLogin && Auth.isLoggedIn()) {
                        container.innerHTML = '';
                        const title = document.createElement('div');
                        title.textContent = '配置同步';
                        title.className = 'dialog-title-draggable'; // 添加可拖拽标识
                        const isMobile = window.innerWidth <= 768;
                        title.style.cssText = `
                            font-weight: bold;
                            font-size: 16px;
                            margin-bottom: 15px;
                            text-align: center;
                            cursor: move;
                            padding: 10px 5px;
                            margin: -10px -5px 15px -5px;
                            user-select: none;
                        `;
                        
                        const closeBtn = document.createElement('span');
                        closeBtn.textContent = '×';
                        closeBtn.style.cssText = `
                            position: absolute;
                            right: 12px;
                            top: 8px;
                            cursor: pointer;
                            font-size: 20px;
                        `;
                        closeBtn.onclick = () => container.remove();

                        container.appendChild(title);
                        container.appendChild(closeBtn);
                        this.createUserPanel(container);
                        
                        // 重要：重新绑定拖拽功能
                        this.makeDraggable(container);
                    }
                } catch (error) {
                    // 错误已在Auth模块中处理
                } finally {
                    loginBtn.disabled = false;
                    registerBtn.disabled = false;
                    if (isRegisterMode) {
                        registerBtn.textContent = '注册';
                    } else {
                        loginBtn.textContent = '登录';
                    }
                }
            };

            loginBtn.onclick = () => handleAuth(true);
            registerBtn.onclick = () => handleAuth(false);

            // 回车提交（根据当前模式决定是登录还是注册）
            passwordInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    handleAuth(!isRegisterMode);  // 登录模式=true，注册模式=false
                }
            };
            
            // 安全码输入框也支持回车提交
            securityCodeInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    handleAuth(!isRegisterMode);  // 登录模式=true，注册模式=false
                }
            };

            // 优化按钮移动端适配
            this.optimizeButtonForMobile(loginBtn, isMobile);
            this.optimizeButtonForMobile(registerBtn, isMobile);
            
            buttonContainer.appendChild(loginBtn);
            buttonContainer.appendChild(registerBtn);

            // 优化其他按钮移动端适配
            this.optimizeButtonForMobile(switchToRegisterBtn, isMobile);
            this.optimizeButtonForMobile(switchToLoginBtn, isMobile);
            this.optimizeButtonForMobile(forgotPasswordBtn, isMobile);
            
            // 添加安全码输入到切换容器中
            switchContainer.appendChild(switchToRegisterBtn);
            switchContainer.appendChild(switchToLoginBtn);

            form.appendChild(modeHint);
            form.appendChild(usernameLabel);
            form.appendChild(usernameInput);
            form.appendChild(passwordLabel);
            form.appendChild(passwordInput);
            form.appendChild(securityCodeLabel);
            form.appendChild(securityCodeInput);
            form.appendChild(buttonContainer);
            form.appendChild(switchContainer);
            form.appendChild(forgotPasswordBtn);

            container.appendChild(form);
        },

        // 创建找回密码对话框
        createForgotPasswordDialog: function() {
            // 移除可能存在的对话框
            const existingDialog = document.getElementById('nodeseek-forgot-password-dialog');
            if (existingDialog) {
                existingDialog.remove();
            }

            // 创建对话框
            const dialog = document.createElement('div');
            dialog.id = 'nodeseek-forgot-password-dialog';
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border: 1px solid #ccc;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10001;
                width: 350px;
                max-width: 90vw;
            `;

            // 标题
            const title = document.createElement('div');
            title.textContent = '找回密码';
            title.style.cssText = `
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 15px;
                text-align: center;
            `;

            // 关闭按钮
            const closeBtn = document.createElement('span');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                position: absolute;
                right: 12px;
                top: 8px;
                cursor: pointer;
                font-size: 20px;
            `;
            closeBtn.onclick = () => dialog.remove();

            // 表单
            const form = document.createElement('div');

            // 用户名输入
            const usernameLabel = document.createElement('div');
            usernameLabel.textContent = '用户名:';
            usernameLabel.style.marginBottom = '5px';

            const usernameInput = document.createElement('input');
            usernameInput.type = 'text';
            usernameInput.placeholder = '请输入用户名';
            usernameInput.style.cssText = `
                width: 100%;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                margin-bottom: 10px;
                box-sizing: border-box;
            `;

            // 安全码输入
            const securityCodeLabel = document.createElement('div');
            securityCodeLabel.textContent = '安全码:';
            securityCodeLabel.style.marginBottom = '5px';

            const securityCodeInput = document.createElement('input');
            securityCodeInput.type = 'password';
            securityCodeInput.placeholder = '请输入注册时设置的安全码';
            securityCodeInput.style.cssText = `
                width: 100%;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                margin-bottom: 10px;
                box-sizing: border-box;
            `;

            // 新密码输入
            const newPasswordLabel = document.createElement('div');
            newPasswordLabel.textContent = '新密码:';
            newPasswordLabel.style.marginBottom = '5px';

            const newPasswordInput = document.createElement('input');
            newPasswordInput.type = 'password';
            newPasswordInput.placeholder = '请输入新密码（至少6个字符）';
            newPasswordInput.style.cssText = `
                width: 100%;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                margin-bottom: 15px;
                box-sizing: border-box;
            `;

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 10px;
            `;

            // 重置密码按钮
            const resetBtn = document.createElement('button');
            resetBtn.textContent = '重置密码';
            resetBtn.style.cssText = `
                flex: 1;
                padding: 8px;
                background: #faad14;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;

            // 取消按钮
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.style.cssText = `
                flex: 1;
                padding: 8px;
                background: #f0f0f0;
                color: #666;
                border: 1px solid #ccc;
                border-radius: 4px;
                cursor: pointer;
            `;

            // 事件处理
            const handleReset = async () => {
                const username = usernameInput.value.trim();
                const securityCode = securityCodeInput.value.trim();
                const newPassword = newPasswordInput.value;

                if (!username || !securityCode || !newPassword) {
                    alert('请填写所有字段');
                    return;
                }

                if (newPassword.length < 6) {
                    alert('新密码至少6个字符');
                    return;
                }

                try {
                    resetBtn.disabled = true;
                    resetBtn.textContent = '重置中...';

                    await Auth.resetPassword(username, securityCode, newPassword);
                    dialog.remove();
                } catch (error) {
                    // 错误已在Auth模块中处理
                } finally {
                    resetBtn.disabled = false;
                    resetBtn.textContent = '重置密码';
                }
            };

            resetBtn.onclick = handleReset;
            cancelBtn.onclick = () => dialog.remove();

            // 回车提交
            newPasswordInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    handleReset();
                }
            };

            // 组装界面
            buttonContainer.appendChild(resetBtn);
            buttonContainer.appendChild(cancelBtn);

            form.appendChild(usernameLabel);
            form.appendChild(usernameInput);
            form.appendChild(securityCodeLabel);
            form.appendChild(securityCodeInput);
            form.appendChild(newPasswordLabel);
            form.appendChild(newPasswordInput);
            form.appendChild(buttonContainer);

            dialog.appendChild(title);
            dialog.appendChild(closeBtn);
            dialog.appendChild(form);

            document.body.appendChild(dialog);
            
            // 聚焦用户名输入框
            usernameInput.focus();
        },

        // 创建用户面板
        createUserPanel: function(container) {
            const user = Auth.getCurrentUser();
            const isMobile = window.innerWidth <= 768;

            // 用户信息
            const userInfo = document.createElement('div');
            userInfo.style.cssText = `
                background: #f5f5f5;
                padding: 10px;
                border-radius: 4px;
                margin-bottom: 15px;
                text-align: center;
            `;
            userInfo.innerHTML = `
                <div style="font-weight: bold; color: #1890ff;">已登录</div>
                <div style="margin-top: 5px;">${user.username}</div>
            `;

            // 同步按钮容器
            const syncContainer = document.createElement('div');
            syncContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-bottom: 15px;
            `;

            // 上传配置按钮
            const uploadBtn = document.createElement('button');
            uploadBtn.textContent = '同步到服务器';
            uploadBtn.style.cssText = `
                padding: 8px;
                background: #52c41a;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;
            uploadBtn.onclick = async () => {
                uploadBtn.disabled = true;
                uploadBtn.textContent = '同步中...';
                try {
                    await Sync.upload();
                } finally {
                    uploadBtn.disabled = false;
                    uploadBtn.textContent = '同步到服务器';
                }
            };

            // 下载配置按钮
            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = '从服务器同步';
            downloadBtn.style.cssText = `
                padding: 8px;
                background: #1890ff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;
            downloadBtn.onclick = async () => {
                downloadBtn.disabled = true;
                downloadBtn.textContent = '同步中...';
                try {
                    await Sync.download();
                } finally {
                    downloadBtn.disabled = false;
                    downloadBtn.textContent = '从服务器同步';
                }
            };

            // 修改密码按钮
            const changePasswordBtn = document.createElement('button');
            changePasswordBtn.textContent = '修改密码';
            changePasswordBtn.style.cssText = `
                padding: 8px;
                background: #722ed1;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;
            changePasswordBtn.onclick = () => {
                this.createChangePasswordDialog();
            };

            // 退出登录按钮
            const logoutBtn = document.createElement('button');
            logoutBtn.textContent = '退出登录';
            logoutBtn.style.cssText = `
                padding: 8px;
                background: #f5222d;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;
            logoutBtn.onclick = async () => {
                if (confirm('确定要退出登录吗？')) {
                    await Auth.logout();
                    container.remove();
                }
            };

            // 优化用户面板按钮移动端适配
            this.optimizeButtonForMobile(uploadBtn, isMobile);
            this.optimizeButtonForMobile(downloadBtn, isMobile);
            this.optimizeButtonForMobile(changePasswordBtn, isMobile);
            this.optimizeButtonForMobile(logoutBtn, isMobile);
            
            syncContainer.appendChild(uploadBtn);
            syncContainer.appendChild(downloadBtn);
            syncContainer.appendChild(changePasswordBtn);

            container.appendChild(userInfo);
            container.appendChild(syncContainer);
            container.appendChild(logoutBtn);
        },

        // 创建修改密码对话框
        createChangePasswordDialog: function() {
            // 移除可能存在的对话框
            const existingDialog = document.getElementById('nodeseek-change-password-dialog');
            if (existingDialog) {
                existingDialog.remove();
            }

            // 创建对话框
            const dialog = document.createElement('div');
            dialog.id = 'nodeseek-change-password-dialog';
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border: 1px solid #ccc;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10001;
                width: 350px;
                max-width: 90vw;
            `;

            // 标题
            const title = document.createElement('div');
            title.textContent = '修改密码';
            title.style.cssText = `
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 15px;
                text-align: center;
            `;

            // 关闭按钮
            const closeBtn = document.createElement('span');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                position: absolute;
                right: 12px;
                top: 8px;
                cursor: pointer;
                font-size: 20px;
            `;
            closeBtn.onclick = () => dialog.remove();

            // 表单
            const form = document.createElement('div');

            // 当前密码输入
            const currentPasswordLabel = document.createElement('div');
            currentPasswordLabel.textContent = '当前密码:';
            currentPasswordLabel.style.marginBottom = '5px';

            const currentPasswordInput = document.createElement('input');
            currentPasswordInput.type = 'password';
            currentPasswordInput.placeholder = '请输入当前密码';
            currentPasswordInput.style.cssText = `
                width: 100%;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                margin-bottom: 10px;
                box-sizing: border-box;
            `;

            // 新密码输入
            const newPasswordLabel = document.createElement('div');
            newPasswordLabel.textContent = '新密码:';
            newPasswordLabel.style.marginBottom = '5px';

            const newPasswordInput = document.createElement('input');
            newPasswordInput.type = 'password';
            newPasswordInput.placeholder = '请输入新密码（至少6个字符）';
            newPasswordInput.style.cssText = `
                width: 100%;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                margin-bottom: 10px;
                box-sizing: border-box;
            `;

            // 确认新密码输入
            const confirmPasswordLabel = document.createElement('div');
            confirmPasswordLabel.textContent = '确认新密码:';
            confirmPasswordLabel.style.marginBottom = '5px';

            const confirmPasswordInput = document.createElement('input');
            confirmPasswordInput.type = 'password';
            confirmPasswordInput.placeholder = '请再次输入新密码';
            confirmPasswordInput.style.cssText = `
                width: 100%;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                margin-bottom: 15px;
                box-sizing: border-box;
            `;

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 10px;
            `;

            // 确认修改按钮
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = '确认修改';
            confirmBtn.style.cssText = `
                flex: 1;
                padding: 8px;
                background: #722ed1;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;

            // 取消按钮
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.style.cssText = `
                flex: 1;
                padding: 8px;
                background: #f0f0f0;
                color: #666;
                border: 1px solid #ccc;
                border-radius: 4px;
                cursor: pointer;
            `;

            // 事件处理
            const handleChange = async () => {
                const currentPassword = currentPasswordInput.value;
                const newPassword = newPasswordInput.value;
                const confirmPassword = confirmPasswordInput.value;

                if (!currentPassword || !newPassword || !confirmPassword) {
                    alert('请填写所有字段');
                    return;
                }

                if (newPassword.length < 6) {
                    alert('新密码至少6个字符');
                    return;
                }

                if (newPassword !== confirmPassword) {
                    alert('两次输入的新密码不一致');
                    return;
                }

                try {
                    confirmBtn.disabled = true;
                    confirmBtn.textContent = '修改中...';

                    await Auth.changePassword(currentPassword, newPassword);
                    dialog.remove();
                } catch (error) {
                    // 错误已在Auth模块中处理
                } finally {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = '确认修改';
                }
            };

            confirmBtn.onclick = handleChange;
            cancelBtn.onclick = () => dialog.remove();

            // 回车提交
            confirmPasswordInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    handleChange();
                }
            };

            // 组装界面
            buttonContainer.appendChild(confirmBtn);
            buttonContainer.appendChild(cancelBtn);

            form.appendChild(currentPasswordLabel);
            form.appendChild(currentPasswordInput);
            form.appendChild(newPasswordLabel);
            form.appendChild(newPasswordInput);
            form.appendChild(confirmPasswordLabel);
            form.appendChild(confirmPasswordInput);
            form.appendChild(buttonContainer);

            dialog.appendChild(title);
            dialog.appendChild(closeBtn);
            dialog.appendChild(form);

            document.body.appendChild(dialog);
            
            // 聚焦当前密码输入框
            currentPasswordInput.focus();
        },

        // 使对话框可拖动（支持PC和移动端）
        makeDraggable: function(element) {
            let isDragging = false;
            let startX, startY, startLeft, startTop;

            // 通用的开始拖拽函数
            const startDrag = function(clientX, clientY, target) {
                // 只有点击标题区域才能拖动
                if (target.className === 'dialog-title-draggable' || 
                    target.closest('.dialog-title-draggable')) {
                    isDragging = true;
                    startX = clientX;
                    startY = clientY;
                    startLeft = parseInt(window.getComputedStyle(element).left, 10);
                    startTop = parseInt(window.getComputedStyle(element).top, 10);
                    return true;
                }
                return false;
            };

            // 通用的拖拽移动函数
            const handleDrag = function(clientX, clientY) {
                if (isDragging) {
                    const deltaX = clientX - startX;
                    const deltaY = clientY - startY;
                    element.style.left = (startLeft + deltaX) + 'px';
                    element.style.top = (startTop + deltaY) + 'px';
                }
            };

            // 通用的结束拖拽函数
            const endDrag = function() {
                if (isDragging) {
                    isDragging = false;
                }
            };

            // PC端鼠标事件
            element.addEventListener('mousedown', function(e) {
                if (startDrag(e.clientX, e.clientY, e.target)) {
                    e.preventDefault();
                }
            });

            document.addEventListener('mousemove', function(e) {
                handleDrag(e.clientX, e.clientY);
            });

            document.addEventListener('mouseup', function() {
                endDrag();
            });

            // 移动端触摸事件
            element.addEventListener('touchstart', function(e) {
                if (e.touches.length === 1) {
                    const touch = e.touches[0];
                    if (startDrag(touch.clientX, touch.clientY, e.target)) {
                        e.preventDefault();
                    }
                }
            }, { passive: false });

            document.addEventListener('touchmove', function(e) {
                if (e.touches.length === 1) {
                    const touch = e.touches[0];
                    handleDrag(touch.clientX, touch.clientY);
                    if (isDragging) {
                        e.preventDefault();
                    }
                }
            }, { passive: false });

            document.addEventListener('touchend', function() {
                endDrag();
            });

            document.addEventListener('touchcancel', function() {
                endDrag();
            });
        }
    };

    // 主对象
    const NodeSeekLogin = {
        init: function() {
            Auth.init();
            
            // 验证token有效性
            if (Auth.isLoggedIn()) {
                Auth.validateToken();
            }
        },

        // 显示登录对话框
        showDialog: function() {
            UI.showAuthDialog();
        },

        // 获取当前用户
        getCurrentUser: function() {
            return Auth.getCurrentUser();
        },

        // 检查是否已登录
        isLoggedIn: function() {
            return Auth.isLoggedIn();
        },

        // 同步配置到服务器
        syncToServer: async function() {
            return await Sync.upload();
        },

        // 从服务器同步配置
        syncFromServer: async function() {
            return await Sync.download();
        }
    };

    // 导出到全局
    window.NodeSeekLogin = NodeSeekLogin;

    // 初始化
    NodeSeekLogin.init();

    console.log('NodeSeek 配置同步功能已加载');

})(); 
