// ==NodeSeek Login Module==
// NodeSeek 配置同步模块 - 登录注册和配置同步功能

(function() {
    'use strict';

    // 配置
    const CONFIG = {
        API_BASE: 'https://log.396663.xyz/api',
        STORAGE_KEY: 'nodeseek_login_state'
    };

    // 全局状态
    let loginState = {
        isLoggedIn: false,
        user: null,
        syncInProgress: false
    };

    // 工具函数
    function log(message) {
        console.log(`[NodeSeek Sync] ${message}`);
        if (window.addLog) {
            window.addLog(`配置同步: ${message}`);
        }
    }

    function showMessage(message, type = 'info') {
        if (type === 'error') {
            alert(`错误: ${message}`);
        } else {
            log(message);
        }
    }

    // HTTP 请求封装
    async function apiRequest(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE}${endpoint}`;
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // 包含 cookies
        };

        const requestOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, requestOptions);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            log(`API请求失败: ${error.message}`);
            throw error;
        }
    }

    // 用户注册
    async function register(username, password, email = '') {
        try {
            const response = await apiRequest('/register', {
                method: 'POST',
                body: JSON.stringify({
                    username,
                    password,
                    email
                })
            });

            if (response.success) {
                log(`注册成功: ${username}`);
                showMessage('注册成功');
                return true;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            showMessage(`注册失败: ${error.message}`, 'error');
            return false;
        }
    }

    // 用户登录
    async function login(username, password) {
        try {
            const response = await apiRequest('/login', {
                method: 'POST',
                body: JSON.stringify({
                    username,
                    password
                })
            });

            if (response.success) {
                loginState.isLoggedIn = true;
                loginState.user = response.user;
                saveLoginState();
                
                log(`登录成功: ${username}`);
                showMessage('登录成功');
                updateLoginUI();
                return true;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            showMessage(`登录失败: ${error.message}`, 'error');
            return false;
        }
    }

    // 用户退出
    async function logout() {
        try {
            await apiRequest('/logout', {
                method: 'POST'
            });
            
            loginState.isLoggedIn = false;
            loginState.user = null;
            saveLoginState();
            
            log('退出登录成功');
            showMessage('退出登录成功');
            updateLoginUI();
            return true;
        } catch (error) {
            showMessage(`退出失败: ${error.message}`, 'error');
            return false;
        }
    }

    // 检查登录状态
    async function checkLoginStatus() {
        try {
            const response = await apiRequest('/status');
            
            if (response.success && response.logged_in) {
                loginState.isLoggedIn = true;
                loginState.user = response.user;
                saveLoginState();
                updateLoginUI();
                return true;
            } else {
                loginState.isLoggedIn = false;
                loginState.user = null;
                saveLoginState();
                updateLoginUI();
                return false;
            }
        } catch (error) {
            log(`检查登录状态失败: ${error.message}`);
            return false;
        }
    }

    // 同步配置到服务器
    async function syncToServer() {
        if (!loginState.isLoggedIn) {
            showMessage('请先登录', 'error');
            return false;
        }

        if (loginState.syncInProgress) {
            showMessage('同步正在进行中...', 'error');
            return false;
        }

        try {
            loginState.syncInProgress = true;
            updateSyncButton();

            // 收集所有配置数据
            const config = {
                blacklist: JSON.parse(localStorage.getItem('nodeseek_blacklist') || '{}'),
                friends: JSON.parse(localStorage.getItem('nodeseek_friends') || '[]'),
                favorites: JSON.parse(localStorage.getItem('nodeseek_favorites') || '[]'),
                logs: JSON.parse(localStorage.getItem('nodeseek_sign_logs') || '[]'),
                browseHistory: JSON.parse(localStorage.getItem('nodeseek_browse_history') || '[]'),
                userInfoDisplay: localStorage.getItem('nodeseek_user_info_display'),
                signEnabled: localStorage.getItem('nodeseek_sign_enabled'),
                collapsedState: localStorage.getItem('nodeseek_buttons_collapsed'),
                // 热点统计数据
                hotTopicsData: {
                    rssHistory: JSON.parse(localStorage.getItem('nodeseek_rss_history') || '[]'),
                    hotWordsHistory: JSON.parse(localStorage.getItem('nodeseek_hot_words_history') || '[]'),
                    timeDistributionHistory: JSON.parse(localStorage.getItem('nodeseek_time_distribution_history') || '[]'),
                    userStatsHistory: JSON.parse(localStorage.getItem('nodeseek_user_stats_history') || '[]'),
                    globalState: JSON.parse(localStorage.getItem('nodeseek_focus_global_state') || '{}')
                },
                // 快捷回复数据
                quickReplies: JSON.parse(localStorage.getItem('nodeseek_quick_reply') || '{}'),
                // 过滤器设置
                filterSettings: JSON.parse(localStorage.getItem('nodeseek_filter_settings') || '{}'),
                // 其他设置
                otherSettings: {
                    userDataCache: JSON.parse(localStorage.getItem('nodeseek_user_data_cache') || '{}')
                },
                syncTime: new Date().toISOString()
            };

            const response = await apiRequest('/sync', {
                method: 'POST',
                body: JSON.stringify({ config })
            });

            if (response.success) {
                log('配置同步到服务器成功');
                showMessage('配置同步到服务器成功');
                return true;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            showMessage(`同步到服务器失败: ${error.message}`, 'error');
            return false;
        } finally {
            loginState.syncInProgress = false;
            updateSyncButton();
        }
    }

    // 从服务器同步配置
    async function syncFromServer() {
        if (!loginState.isLoggedIn) {
            showMessage('请先登录', 'error');
            return false;
        }

        if (loginState.syncInProgress) {
            showMessage('同步正在进行中...', 'error');
            return false;
        }

        try {
            loginState.syncInProgress = true;
            updateSyncButton();

            const response = await apiRequest('/sync');

            if (response.success) {
                const config = response.config;
                
                if (!config || Object.keys(config).length === 0) {
                    showMessage('服务器上没有配置数据');
                    return true;
                }

                // 恢复配置数据
                if (config.blacklist) {
                    localStorage.setItem('nodeseek_blacklist', JSON.stringify(config.blacklist));
                }
                if (config.friends) {
                    localStorage.setItem('nodeseek_friends', JSON.stringify(config.friends));
                }
                if (config.favorites) {
                    localStorage.setItem('nodeseek_favorites', JSON.stringify(config.favorites));
                }
                if (config.logs) {
                    localStorage.setItem('nodeseek_sign_logs', JSON.stringify(config.logs));
                }
                if (config.browseHistory) {
                    localStorage.setItem('nodeseek_browse_history', JSON.stringify(config.browseHistory));
                }
                if (config.userInfoDisplay !== undefined) {
                    localStorage.setItem('nodeseek_user_info_display', config.userInfoDisplay);
                }
                if (config.signEnabled !== undefined) {
                    localStorage.setItem('nodeseek_sign_enabled', config.signEnabled);
                }
                if (config.collapsedState !== undefined) {
                    localStorage.setItem('nodeseek_buttons_collapsed', config.collapsedState);
                }

                // 恢复热点统计数据
                if (config.hotTopicsData) {
                    const hotData = config.hotTopicsData;
                    if (hotData.rssHistory) {
                        localStorage.setItem('nodeseek_rss_history', JSON.stringify(hotData.rssHistory));
                    }
                    if (hotData.hotWordsHistory) {
                        localStorage.setItem('nodeseek_hot_words_history', JSON.stringify(hotData.hotWordsHistory));
                    }
                    if (hotData.timeDistributionHistory) {
                        localStorage.setItem('nodeseek_time_distribution_history', JSON.stringify(hotData.timeDistributionHistory));
                    }
                    if (hotData.userStatsHistory) {
                        localStorage.setItem('nodeseek_user_stats_history', JSON.stringify(hotData.userStatsHistory));
                    }
                    if (hotData.globalState) {
                        localStorage.setItem('nodeseek_focus_global_state', JSON.stringify(hotData.globalState));
                    }
                }

                // 恢复快捷回复数据
                if (config.quickReplies) {
                    localStorage.setItem('nodeseek_quick_reply', JSON.stringify(config.quickReplies));
                }

                // 恢复过滤器设置
                if (config.filterSettings) {
                    localStorage.setItem('nodeseek_filter_settings', JSON.stringify(config.filterSettings));
                }

                // 恢复其他设置
                if (config.otherSettings && config.otherSettings.userDataCache) {
                    localStorage.setItem('nodeseek_user_data_cache', JSON.stringify(config.otherSettings.userDataCache));
                }

                log('从服务器同步配置成功');
                showMessage('从服务器同步配置成功，即将刷新页面');
                
                // 延迟刷新页面以应用新配置
                setTimeout(() => {
                    location.reload();
                }, 1000);
                
                return true;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            showMessage(`从服务器同步失败: ${error.message}`, 'error');
            return false;
        } finally {
            loginState.syncInProgress = false;
            updateSyncButton();
        }
    }

    // 保存登录状态到本地存储
    function saveLoginState() {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(loginState));
    }

    // 从本地存储加载登录状态
    function loadLoginState() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                loginState = { ...loginState, ...parsed };
            }
        } catch (error) {
            log('加载登录状态失败');
        }
    }

    // 更新登录UI
    function updateLoginUI() {
        const loginDialog = document.getElementById('nodeseek-login-dialog');
        if (loginDialog) {
            // 更新对话框内容
            const statusDiv = loginDialog.querySelector('.login-status');
            if (statusDiv) {
                if (loginState.isLoggedIn && loginState.user) {
                    statusDiv.innerHTML = `
                        <div style="color: #4CAF50; font-weight: bold; margin-bottom: 10px;">
                            已登录: ${loginState.user.username}
                        </div>
                    `;
                } else {
                    statusDiv.innerHTML = `
                        <div style="color: #f44336; margin-bottom: 10px;">
                            未登录
                        </div>
                    `;
                }
            }

            // 更新按钮状态
            const loginForm = loginDialog.querySelector('.login-form');
            const logoutBtn = loginDialog.querySelector('.logout-btn');
            const syncButtons = loginDialog.querySelector('.sync-buttons');

            if (loginForm && logoutBtn && syncButtons) {
                if (loginState.isLoggedIn) {
                    loginForm.style.display = 'none';
                    logoutBtn.style.display = 'block';
                    syncButtons.style.display = 'block';
                } else {
                    loginForm.style.display = 'block';
                    logoutBtn.style.display = 'none';
                    syncButtons.style.display = 'none';
                }
            }
        }
    }

    // 更新同步按钮状态
    function updateSyncButton() {
        const uploadBtn = document.getElementById('sync-upload-btn');
        const downloadBtn = document.getElementById('sync-download-btn');
        
        if (uploadBtn) {
            uploadBtn.disabled = loginState.syncInProgress;
            uploadBtn.textContent = loginState.syncInProgress ? '同步中...' : '上传配置';
        }
        
        if (downloadBtn) {
            downloadBtn.disabled = loginState.syncInProgress;
            downloadBtn.textContent = loginState.syncInProgress ? '同步中...' : '下载配置';
        }
    }

    // 创建登录对话框
    function createLoginDialog() {
        // 检查是否已存在
        const existingDialog = document.getElementById('nodeseek-login-dialog');
        if (existingDialog) {
            existingDialog.remove();
            return;
        }

        const dialog = document.createElement('div');
        dialog.id = 'nodeseek-login-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 60px;
            right: 16px;
            z-index: 10000;
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.15);
            padding: 18px 20px 12px 20px;
            width: 400px;
            max-height: 80vh;
            overflow-y: auto;
        `;

        dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <div style="font-weight: bold; font-size: 16px;">配置同步</div>
                <span class="close-btn" style="cursor: pointer; font-size: 20px;">×</span>
            </div>

            <div class="login-status"></div>

            <div class="login-form">
                <div style="margin-bottom: 10px;">
                    <input type="text" id="login-username" placeholder="用户名" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                </div>
                <div style="margin-bottom: 10px;">
                    <input type="password" id="login-password" placeholder="密码" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                </div>
                <div style="margin-bottom: 10px;">
                    <input type="email" id="login-email" placeholder="邮箱 (注册时可选)" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                </div>
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <button id="login-btn" style="flex: 1; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">登录</button>
                    <button id="register-btn" style="flex: 1; padding: 8px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">注册</button>
                </div>
            </div>

            <div class="logout-btn" style="display: none; margin-bottom: 15px;">
                <button id="logout-btn" style="width: 100%; padding: 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">退出登录</button>
            </div>

            <div class="sync-buttons" style="display: none;">
                <div style="margin-bottom: 10px;">
                    <button id="sync-upload-btn" style="width: 100%; padding: 8px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 5px;">上传配置</button>
                </div>
                <div style="margin-bottom: 10px;">
                    <button id="sync-download-btn" style="width: 100%; padding: 8px; background: #9C27B0; color: white; border: none; border-radius: 4px; cursor: pointer;">下载配置</button>
                </div>
            </div>

            <div style="font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
                <p>• 配置包含：黑名单、好友、收藏、日志、热点统计等所有数据</p>
                <p>• 登录会话永不过期，除非手动退出</p>
                <p>• 保留原有导出/导入功能</p>
            </div>
        `;

        document.body.appendChild(dialog);

        // 绑定事件
        const closeBtn = dialog.querySelector('.close-btn');
        const loginBtn = dialog.querySelector('#login-btn');
        const registerBtn = dialog.querySelector('#register-btn');
        const logoutBtn = dialog.querySelector('#logout-btn');
        const uploadBtn = dialog.querySelector('#sync-upload-btn');
        const downloadBtn = dialog.querySelector('#sync-download-btn');

        closeBtn.onclick = () => dialog.remove();

        loginBtn.onclick = async () => {
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value.trim();
            
            if (!username || !password) {
                showMessage('请输入用户名和密码', 'error');
                return;
            }

            await login(username, password);
        };

        registerBtn.onclick = async () => {
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value.trim();
            const email = document.getElementById('login-email').value.trim();
            
            if (!username || !password) {
                showMessage('请输入用户名和密码', 'error');
                return;
            }

            const success = await register(username, password, email);
            if (success) {
                // 注册成功后自动登录
                setTimeout(() => {
                    login(username, password);
                }, 500);
            }
        };

        logoutBtn.onclick = async () => {
            await logout();
        };

        uploadBtn.onclick = async () => {
            await syncToServer();
        };

        downloadBtn.onclick = async () => {
            if (confirm('从服务器下载配置将覆盖本地配置，是否继续？')) {
                await syncFromServer();
            }
        };

        // 支持回车键登录
        const inputs = dialog.querySelectorAll('input');
        inputs.forEach(input => {
            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    loginBtn.click();
                }
            };
        });

        // 使对话框可拖动
        if (window.makeDraggable) {
            window.makeDraggable(dialog, {width: 50, height: 50});
        }

        // 更新UI状态
        updateLoginUI();
    }

    // 初始化模块
    function init() {
        loadLoginState();
        
        // 检查登录状态
        checkLoginStatus();
        
        log('配置同步模块已加载');
    }

    // 暴露给全局
    window.NodeSeekLogin = {
        init,
        login,
        logout,
        register,
        syncToServer,
        syncFromServer,
        checkLoginStatus,
        createLoginDialog,
        getLoginState: () => loginState
    };

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(); 
