/**
 * NodeSeek 配置同步客户端模块
 * 提供用户登录、注册、配置上传下载功能
 */

(function() {
    'use strict';

    // 配置同步服务器地址 - 请根据实际情况修改
    const SYNC_SERVER_URL = 'https://log.396663.xyz';
    
    // 存储键
    const SESSION_KEY = 'nodeseek_sync_session';
    const USER_KEY = 'nodeseek_sync_user';
    
    // 同步客户端类
    class NodeSeekSyncClient {
        constructor() {
            this.serverUrl = SYNC_SERVER_URL;
            this.sessionToken = this.getStoredSession();
            this.currentUser = this.getStoredUser();
            this.addLogFunction = null;
        }

        // 设置日志函数
        setAddLogFunction(logFunc) {
            this.addLogFunction = logFunc;
        }

        // 记录日志
        log(message) {
            if (this.addLogFunction) {
                this.addLogFunction(message);
            } else {
                console.log('[同步] ' + message);
            }
        }

        // 存储会话信息
        storeSession(sessionToken, user) {
            localStorage.setItem(SESSION_KEY, sessionToken);
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            this.sessionToken = sessionToken;
            this.currentUser = user;
        }

        // 获取存储的会话
        getStoredSession() {
            return localStorage.getItem(SESSION_KEY);
        }

        // 获取存储的用户信息
        getStoredUser() {
            const userStr = localStorage.getItem(USER_KEY);
            return userStr ? JSON.parse(userStr) : null;
        }

        // 清除会话信息
        clearSession() {
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(USER_KEY);
            this.sessionToken = null;
            this.currentUser = null;
        }

        // 检查是否已登录
        isLoggedIn() {
            return !!(this.sessionToken && this.currentUser);
        }

        // 发送HTTP请求
        async request(endpoint, options = {}) {
            const url = `${this.serverUrl}${endpoint}`;
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            // 添加认证头
            if (this.sessionToken) {
                defaultOptions.headers['Authorization'] = `Bearer ${this.sessionToken}`;
            }

            const finalOptions = {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers,
                },
            };

            try {
                const response = await fetch(url, finalOptions);
                const data = await response.json();
                
                // 如果返回401未授权，清除本地会话
                if (response.status === 401) {
                    this.clearSession();
                }
                
                return data;
            } catch (error) {
                this.log(`请求失败: ${error.message}`);
                throw new Error(`网络请求失败: ${error.message}`);
            }
        }

        // 用户注册
        async register(username, password) {
            try {
                const response = await this.request('/api/register', {
                    method: 'POST',
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });

                if (response.success) {
                    this.log(`注册成功: ${username}`);
                    return response;
                } else {
                    throw new Error(response.message || '注册失败');
                }
            } catch (error) {
                this.log(`注册失败: ${error.message}`);
                throw error;
            }
        }

        // 用户登录
        async login(username, password) {
            try {
                const response = await this.request('/api/login', {
                    method: 'POST',
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });

                if (response.success) {
                    this.storeSession(response.session_token, response.user);
                    this.log(`登录成功: ${username}`);
                    return response;
                } else {
                    throw new Error(response.message || '登录失败');
                }
            } catch (error) {
                this.log(`登录失败: ${error.message}`);
                throw error;
            }
        }

        // 用户登出
        async logout() {
            try {
                if (this.sessionToken) {
                    await this.request('/api/logout', {
                        method: 'POST',
                        body: JSON.stringify({
                            session_token: this.sessionToken
                        })
                    });
                }
                
                const username = this.currentUser?.username || '用户';
                this.clearSession();
                this.log(`${username} 登出成功`);
                
                return { success: true };
            } catch (error) {
                // 即使服务器请求失败，也清除本地会话
                this.clearSession();
                this.log(`登出失败: ${error.message}`);
                throw error;
            }
        }

        // 获取用户信息
        async getUserInfo() {
            try {
                const response = await this.request('/api/user/info');
                
                if (response.success) {
                    return response.user;
                } else {
                    throw new Error(response.message || '获取用户信息失败');
                }
            } catch (error) {
                this.log(`获取用户信息失败: ${error.message}`);
                throw error;
            }
        }

        // 上传配置
        async uploadConfig(configType, configData) {
            try {
                const response = await this.request('/api/config/upload', {
                    method: 'POST',
                    body: JSON.stringify({
                        config_type: configType,
                        config_data: configData
                    })
                });

                if (response.success) {
                    this.log(`${configType} 配置上传成功`);
                    return response;
                } else {
                    throw new Error(response.message || '上传配置失败');
                }
            } catch (error) {
                this.log(`上传${configType}配置失败: ${error.message}`);
                throw error;
            }
        }

        // 下载配置
        async downloadConfig(configType) {
            try {
                const response = await this.request(`/api/config/download?config_type=${configType}`);

                if (response.success) {
                    this.log(`${configType} 配置下载成功`);
                    return response;
                } else {
                    throw new Error(response.message || '下载配置失败');
                }
            } catch (error) {
                this.log(`下载${configType}配置失败: ${error.message}`);
                throw error;
            }
        }

        // 获取配置列表
        async listConfigs() {
            try {
                const response = await this.request('/api/config/list');

                if (response.success) {
                    return response.configs;
                } else {
                    throw new Error(response.message || '获取配置列表失败');
                }
            } catch (error) {
                this.log(`获取配置列表失败: ${error.message}`);
                throw error;
            }
        }

        // 删除配置
        async deleteConfig(configType) {
            try {
                const response = await this.request('/api/config/delete', {
                    method: 'DELETE',
                    body: JSON.stringify({
                        config_type: configType
                    })
                });

                if (response.success) {
                    this.log(`${configType} 配置删除成功`);
                    return response;
                } else {
                    throw new Error(response.message || '删除配置失败');
                }
            } catch (error) {
                this.log(`删除${configType}配置失败: ${error.message}`);
                throw error;
            }
        }

        // 检查服务器状态
        async checkServerStatus() {
            try {
                const response = await this.request('/api/status');
                return response.success;
            } catch (error) {
                return false;
            }
        }

        // 同步所有配置到服务器
        async syncToServer() {
            try {
                if (!this.isLoggedIn()) {
                    throw new Error('请先登录');
                }

                // 收集所有配置数据
                const configs = {};

                // 黑名单
                const blacklist = JSON.parse(localStorage.getItem('nodeseek_blacklist') || '{}');
                if (Object.keys(blacklist).length > 0) {
                    configs.blacklist = blacklist;
                }

                // 好友
                const friends = JSON.parse(localStorage.getItem('nodeseek_friends') || '[]');
                if (friends.length > 0) {
                    configs.friends = friends;
                }

                // 收藏
                const favorites = JSON.parse(localStorage.getItem('nodeseek_favorites') || '[]');
                if (favorites.length > 0) {
                    configs.favorites = favorites;
                }

                // 浏览历史
                const browseHistory = JSON.parse(localStorage.getItem('nodeseek_browse_history') || '[]');
                if (browseHistory.length > 0) {
                    configs.browseHistory = browseHistory;
                }

                // 操作日志
                const logs = JSON.parse(localStorage.getItem('nodeseek_sign_logs') || '[]');
                if (logs.length > 0) {
                    configs.logs = logs;
                }

                // 快捷回复
                const quickReplies = JSON.parse(localStorage.getItem('nodeseek_quick_reply') || '{}');
                if (Object.keys(quickReplies).length > 0) {
                    configs.quickReplies = quickReplies;
                }

                // 热点统计数据
                const hotTopicsData = {};
                const rssHistory = localStorage.getItem('nodeseek_rss_history');
                if (rssHistory) {
                    hotTopicsData.rssHistory = JSON.parse(rssHistory);
                }
                const hotWordsHistory = localStorage.getItem('nodeseek_hot_words_history');
                if (hotWordsHistory) {
                    hotTopicsData.hotWordsHistory = JSON.parse(hotWordsHistory);
                }
                const timeDistributionHistory = localStorage.getItem('nodeseek_time_distribution_history');
                if (timeDistributionHistory) {
                    hotTopicsData.timeDistributionHistory = JSON.parse(timeDistributionHistory);
                }
                const userStatsHistory = localStorage.getItem('nodeseek_user_stats_history');
                if (userStatsHistory) {
                    hotTopicsData.userStatsHistory = JSON.parse(userStatsHistory);
                }
                const globalState = localStorage.getItem('nodeseek_focus_global_state');
                if (globalState) {
                    hotTopicsData.globalState = JSON.parse(globalState);
                }
                if (Object.keys(hotTopicsData).length > 0) {
                    configs.hotTopicsData = hotTopicsData;
                }

                // 上传完整备份
                if (Object.keys(configs).length > 0) {
                    await this.uploadConfig('full_backup', configs);
                    
                    let syncInfo = [];
                    if (configs.blacklist) syncInfo.push(`黑名单(${Object.keys(configs.blacklist).length}项)`);
                    if (configs.friends) syncInfo.push(`好友(${configs.friends.length}项)`);
                    if (configs.favorites) syncInfo.push(`收藏(${configs.favorites.length}项)`);
                    if (configs.browseHistory) syncInfo.push(`浏览历史(${configs.browseHistory.length}项)`);
                    if (configs.logs) syncInfo.push(`操作日志(${configs.logs.length}项)`);
                    if (configs.quickReplies) syncInfo.push(`快捷回复(${Object.keys(configs.quickReplies).length}个分类)`);
                    if (configs.hotTopicsData) syncInfo.push(`热点统计(${Object.keys(configs.hotTopicsData).length}项)`);
                    
                    this.log(`配置上传成功 (${syncInfo.join('、')})`);
                } else {
                    this.log('没有找到可同步的配置数据');
                }

                return { success: true, configs: Object.keys(configs) };

            } catch (error) {
                this.log(`同步到服务器失败: ${error.message}`);
                throw error;
            }
        }

        // 从服务器同步配置
        async syncFromServer() {
            try {
                if (!this.isLoggedIn()) {
                    throw new Error('请先登录');
                }

                // 下载完整备份
                const response = await this.downloadConfig('full_backup');
                const configs = response.config_data;

                if (!configs || typeof configs !== 'object') {
                    throw new Error('服务器上没有配置数据');
                }

                let restoredInfo = [];

                // 恢复黑名单
                if (configs.blacklist && typeof configs.blacklist === 'object') {
                    localStorage.setItem('nodeseek_blacklist', JSON.stringify(configs.blacklist));
                    restoredInfo.push(`黑名单(${Object.keys(configs.blacklist).length}项)`);
                }

                // 恢复好友
                if (configs.friends && Array.isArray(configs.friends)) {
                    localStorage.setItem('nodeseek_friends', JSON.stringify(configs.friends));
                    restoredInfo.push(`好友(${configs.friends.length}项)`);
                }

                // 恢复收藏
                if (configs.favorites && Array.isArray(configs.favorites)) {
                    localStorage.setItem('nodeseek_favorites', JSON.stringify(configs.favorites));
                    restoredInfo.push(`收藏(${configs.favorites.length}项)`);
                }

                // 恢复浏览历史
                if (configs.browseHistory && Array.isArray(configs.browseHistory)) {
                    localStorage.setItem('nodeseek_browse_history', JSON.stringify(configs.browseHistory));
                    restoredInfo.push(`浏览历史(${configs.browseHistory.length}项)`);
                }

                // 恢复操作日志
                if (configs.logs && Array.isArray(configs.logs)) {
                    localStorage.setItem('nodeseek_sign_logs', JSON.stringify(configs.logs));
                    restoredInfo.push(`操作日志(${configs.logs.length}项)`);
                }

                // 恢复快捷回复
                if (configs.quickReplies && typeof configs.quickReplies === 'object') {
                    localStorage.setItem('nodeseek_quick_reply', JSON.stringify(configs.quickReplies));
                    restoredInfo.push(`快捷回复(${Object.keys(configs.quickReplies).length}个分类)`);
                }

                // 恢复热点统计数据
                if (configs.hotTopicsData && typeof configs.hotTopicsData === 'object') {
                    const hotData = configs.hotTopicsData;
                    let hotCount = 0;
                    
                    if (hotData.rssHistory) {
                        localStorage.setItem('nodeseek_rss_history', JSON.stringify(hotData.rssHistory));
                        hotCount++;
                    }
                    if (hotData.hotWordsHistory) {
                        localStorage.setItem('nodeseek_hot_words_history', JSON.stringify(hotData.hotWordsHistory));
                        hotCount++;
                    }
                    if (hotData.timeDistributionHistory) {
                        localStorage.setItem('nodeseek_time_distribution_history', JSON.stringify(hotData.timeDistributionHistory));
                        hotCount++;
                    }
                    if (hotData.userStatsHistory) {
                        localStorage.setItem('nodeseek_user_stats_history', JSON.stringify(hotData.userStatsHistory));
                        hotCount++;
                    }
                    if (hotData.globalState) {
                        localStorage.setItem('nodeseek_focus_global_state', JSON.stringify(hotData.globalState));
                        hotCount++;
                    }
                    
                    if (hotCount > 0) {
                        restoredInfo.push(`热点统计(${hotCount}项)`);
                    }
                }

                if (restoredInfo.length > 0) {
                    this.log(`配置下载成功 (${restoredInfo.join('、')})`);
                    this.log('请刷新页面以应用新配置');
                } else {
                    this.log('服务器上没有可恢复的配置数据');
                }

                return { success: true, restored: restoredInfo, updated_at: response.updated_at };

            } catch (error) {
                this.log(`从服务器同步失败: ${error.message}`);
                throw error;
            }
        }

        // 显示登录对话框
        showLoginDialog() {
            // 检查是否已有对话框
            const existingDialog = document.getElementById('sync-login-dialog');
            if (existingDialog) {
                existingDialog.remove();
            }

            // 创建对话框
            const dialog = document.createElement('div');
            dialog.id = 'sync-login-dialog';
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10000;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                padding: 20px;
                width: 350px;
                max-width: 90vw;
            `;

            dialog.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 10px 0; color: #333;">配置同步登录</h3>
                    <p style="margin: 0; color: #666; font-size: 14px;">登录后可将配置同步到云端</p>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #333;">用户名:</label>
                    <input type="text" id="sync-username" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; color: #333;">密码:</label>
                    <input type="password" id="sync-password" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button id="sync-login-btn" style="flex: 1; padding: 10px; background: #1890ff; color: white; border: none; border-radius: 4px; cursor: pointer;">登录</button>
                    <button id="sync-register-btn" style="flex: 1; padding: 10px; background: #52c41a; color: white; border: none; border-radius: 4px; cursor: pointer;">注册</button>
                </div>
                
                <div style="text-align: center;">
                    <button id="sync-cancel-btn" style="padding: 8px 20px; background: #f5f5f5; color: #666; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">取消</button>
                </div>
                
                <div id="sync-status" style="margin-top: 15px; text-align: center; color: #666; font-size: 14px;"></div>
            `;

            // 添加事件监听
            const usernameInput = dialog.querySelector('#sync-username');
            const passwordInput = dialog.querySelector('#sync-password');
            const loginBtn = dialog.querySelector('#sync-login-btn');
            const registerBtn = dialog.querySelector('#sync-register-btn');
            const cancelBtn = dialog.querySelector('#sync-cancel-btn');
            const statusDiv = dialog.querySelector('#sync-status');

            const setStatus = (message, color = '#666') => {
                statusDiv.textContent = message;
                statusDiv.style.color = color;
            };

            const closeDialog = () => {
                dialog.remove();
            };

            // 登录
            loginBtn.addEventListener('click', async () => {
                const username = usernameInput.value.trim();
                const password = passwordInput.value;

                if (!username || !password) {
                    setStatus('请输入用户名和密码', '#f5222d');
                    return;
                }

                try {
                    loginBtn.disabled = true;
                    setStatus('登录中...', '#1890ff');

                    await this.login(username, password);
                    setStatus('登录成功！', '#52c41a');
                    
                    setTimeout(closeDialog, 1000);
                    
                } catch (error) {
                    setStatus(error.message, '#f5222d');
                } finally {
                    loginBtn.disabled = false;
                }
            });

            // 注册
            registerBtn.addEventListener('click', async () => {
                const username = usernameInput.value.trim();
                const password = passwordInput.value;

                if (!username || !password) {
                    setStatus('请输入用户名和密码', '#f5222d');
                    return;
                }

                if (username.length < 3 || username.length > 20) {
                    setStatus('用户名长度必须在3-20个字符之间', '#f5222d');
                    return;
                }

                if (password.length < 6) {
                    setStatus('密码长度至少6个字符', '#f5222d');
                    return;
                }

                try {
                    registerBtn.disabled = true;
                    setStatus('注册中...', '#1890ff');

                    await this.register(username, password);
                    setStatus('注册成功！现在可以登录了', '#52c41a');
                    
                } catch (error) {
                    setStatus(error.message, '#f5222d');
                } finally {
                    registerBtn.disabled = false;
                }
            });

            // 取消
            cancelBtn.addEventListener('click', closeDialog);

            // 回车键登录
            const handleEnter = (e) => {
                if (e.key === 'Enter') {
                    loginBtn.click();
                }
            };
            usernameInput.addEventListener('keypress', handleEnter);
            passwordInput.addEventListener('keypress', handleEnter);

            document.body.appendChild(dialog);
            usernameInput.focus();
        }

        // 显示同步对话框
        showSyncDialog() {
            // 检查是否已有对话框
            const existingDialog = document.getElementById('sync-config-dialog');
            if (existingDialog) {
                existingDialog.remove();
            }

            // 创建对话框
            const dialog = document.createElement('div');
            dialog.id = 'sync-config-dialog';
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10000;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                padding: 20px;
                width: 400px;
                max-width: 90vw;
                max-height: 80vh;
                overflow-y: auto;
            `;

            const userInfo = this.currentUser ? `${this.currentUser.username}` : '未登录';

            dialog.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 10px 0; color: #333;">配置同步管理</h3>
                    <p style="margin: 0; color: #666; font-size: 14px;">当前用户: ${userInfo}</p>
                </div>
                
                ${this.isLoggedIn() ? `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                    <button id="sync-upload-btn" style="padding: 12px; background: #1890ff; color: white; border: none; border-radius: 4px; cursor: pointer;">上传到云端</button>
                    <button id="sync-download-btn" style="padding: 12px; background: #52c41a; color: white; border: none; border-radius: 4px; cursor: pointer;">从云端下载</button>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <button id="sync-logout-btn" style="width: 100%; padding: 10px; background: #f5222d; color: white; border: none; border-radius: 4px; cursor: pointer;">退出登录</button>
                </div>
                ` : `
                <div style="margin-bottom: 20px;">
                    <button id="sync-show-login-btn" style="width: 100%; padding: 12px; background: #1890ff; color: white; border: none; border-radius: 4px; cursor: pointer;">登录/注册</button>
                </div>
                `}
                
                <div style="text-align: center;">
                    <button id="sync-close-btn" style="padding: 8px 20px; background: #f5f5f5; color: #666; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">关闭</button>
                </div>
                
                <div id="sync-status" style="margin-top: 15px; text-align: center; color: #666; font-size: 14px;"></div>
            `;

            // 添加事件监听
            const statusDiv = dialog.querySelector('#sync-status');

            const setStatus = (message, color = '#666') => {
                statusDiv.textContent = message;
                statusDiv.style.color = color;
            };

            const closeDialog = () => {
                dialog.remove();
            };

            // 显示登录对话框
            const showLoginBtn = dialog.querySelector('#sync-show-login-btn');
            if (showLoginBtn) {
                showLoginBtn.addEventListener('click', () => {
                    closeDialog();
                    this.showLoginDialog();
                });
            }

            // 上传配置
            const uploadBtn = dialog.querySelector('#sync-upload-btn');
            if (uploadBtn) {
                uploadBtn.addEventListener('click', async () => {
                    try {
                        uploadBtn.disabled = true;
                        setStatus('正在上传配置...', '#1890ff');

                        await this.syncToServer();
                        setStatus('配置上传成功！', '#52c41a');
                        
                    } catch (error) {
                        setStatus(error.message, '#f5222d');
                    } finally {
                        uploadBtn.disabled = false;
                    }
                });
            }

            // 下载配置
            const downloadBtn = dialog.querySelector('#sync-download-btn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', async () => {
                    if (!confirm('下载配置将覆盖本地数据，确定继续吗？')) {
                        return;
                    }

                    try {
                        downloadBtn.disabled = true;
                        setStatus('正在下载配置...', '#1890ff');

                        await this.syncFromServer();
                        setStatus('配置下载成功！请刷新页面', '#52c41a');
                        
                    } catch (error) {
                        setStatus(error.message, '#f5222d');
                    } finally {
                        downloadBtn.disabled = false;
                    }
                });
            }

            // 退出登录
            const logoutBtn = dialog.querySelector('#sync-logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    try {
                        await this.logout();
                        closeDialog();
                        
                    } catch (error) {
                        setStatus(error.message, '#f5222d');
                    }
                });
            }

            // 关闭对话框
            const closeBtn = dialog.querySelector('#sync-close-btn');
            closeBtn.addEventListener('click', closeDialog);

            document.body.appendChild(dialog);
        }
    }

    // 创建全局实例
    window.NodeSeekSyncClient = new NodeSeekSyncClient();

})(); 
