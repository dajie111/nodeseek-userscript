// ========== 账号同步 ==========

(function() {
    'use strict';

    // 配置
    const CONFIG = {
        SERVER_URL: 'https://hb.396663.xyz',
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

        // HTTP请求（带重试机制）
        request: async function(url, options = {}) {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 15000, // 15秒超时
                retries: 2, // 重试次数
                retryDelay: 1000, // 重试延迟（毫秒）
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

            const maxRetries = finalOptions.retries || 0;
            let lastError;

            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                // 添加超时控制
                const controller = new AbortController();
                const timeout = finalOptions.timeout || 15000;
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                const requestOptions = {
                    ...finalOptions,
                    signal: controller.signal
                };
                
                // 移除自定义选项
                delete requestOptions.timeout;
                delete requestOptions.retries;
                delete requestOptions.retryDelay;

                try {
                    const response = await fetch(url, requestOptions);
                    clearTimeout(timeoutId);
                    
                    // 检查响应是否成功
                    if (!response.ok) {
                        let errorMessage;
                        try {
                            const errorData = await response.json();
                            errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
                        } catch {
                            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                        }
                        
                        // 对于某些状态码，不需要重试
                        if (response.status === 401 || response.status === 403 || response.status === 404) {
                            throw new Error(errorMessage);
                        }
                        
                        lastError = new Error(errorMessage);
                        if (attempt === maxRetries) throw lastError;
                        
                        // 等待后重试
                        await new Promise(resolve => setTimeout(resolve, finalOptions.retryDelay || 1000));
                        continue;
                    }
                    
                    // 解析JSON响应
                    const data = await response.json();
                    return data;
                } catch (error) {
                    clearTimeout(timeoutId);
                    
                    // 处理不同类型的错误
                    if (error.name === 'AbortError') {
                        lastError = new Error('请求超时，请检查网络连接');
                    } else if (error instanceof TypeError && error.message.includes('fetch')) {
                        lastError = new Error('网络连接失败，请检查网络或服务器状态');
                    } else if (error.message.includes('JSON')) {
                        lastError = new Error('服务器响应格式错误');
                    } else {
                        lastError = error;
                    }
                    
                    // 对于网络错误，尝试重试
                    if (attempt < maxRetries && (error.name === 'AbortError' || error instanceof TypeError)) {
                        console.log(`请求失败，${finalOptions.retryDelay}ms后进行第${attempt + 1}次重试...`);
                        await new Promise(resolve => setTimeout(resolve, finalOptions.retryDelay || 1000));
                        continue;
                    }
                    
                    console.error('Request failed after all retries:', lastError);
                    throw lastError;
                }
            }
            
            throw lastError;
        },

        // 获取所有配置数据
        getAllConfig: function(selectedItems) {
            const config = {};
            
            // 如果没有选择特定项目，默认获取所有配置
            if (!selectedItems || selectedItems.length === 0) {
                selectedItems = ['blacklist', 'friends', 'favorites', 'logs', 'browseHistory', 'quickReplies', 'emojiFavorites', 'chickenLegStats', 'hotTopicsData'];
            }
            
            // 获取黑名单数据
            if (selectedItems.includes('blacklist')) {
                config.blacklist = JSON.parse(localStorage.getItem('nodeseek_blacklist') || '{}');
            }
            
            // 获取好友数据
            if (selectedItems.includes('friends')) {
                try {
                    if (window.NodeSeekFriends && typeof window.NodeSeekFriends.getFriends === 'function') {
                        config.friends = window.NodeSeekFriends.getFriends();
                    } else {
                        config.friends = JSON.parse(localStorage.getItem('nodeseek_friends') || '{}');
                    }
                } catch (e) {
                    config.friends = {};
                }
            }
            
            // 获取收藏数据
            if (selectedItems.includes('favorites')) {
                config.favorites = JSON.parse(localStorage.getItem('nodeseek_favorites') || '[]');
            }
            
            // 获取操作日志
            if (selectedItems.includes('logs')) {
                config.logs = JSON.parse(localStorage.getItem('nodeseek_sign_logs') || '[]');
            }
            
            // 获取浏览历史
            if (selectedItems.includes('browseHistory')) {
                config.browseHistory = JSON.parse(localStorage.getItem('nodeseek_browse_history') || '[]');
            }
            
            // 获取快捷回复数据
            if (selectedItems.includes('quickReplies')) {
                try {
                    if (window.NodeSeekQuickReply && typeof window.NodeSeekQuickReply.getQuickReplies === 'function') {
                        config.quickReplies = window.NodeSeekQuickReply.getQuickReplies();
                    } else {
                        const quickReplyData = JSON.parse(localStorage.getItem('nodeseek_quick_reply') || '{}');
                        // 确保数据包含categoryOrder
                        if (quickReplyData && typeof quickReplyData === 'object' && !quickReplyData.categoryOrder) {
                            quickReplyData.categoryOrder = Object.keys(quickReplyData).filter(key => key !== 'categoryOrder');
                        }
                        config.quickReplies = quickReplyData;
                    }
                } catch (error) {
                    config.quickReplies = {};
                }
            }

            // 获取常用表情数据（emojis.js 本地收藏）
            if (selectedItems.includes('emojiFavorites')) {
                try {
                    const ef = JSON.parse(localStorage.getItem('ns_emoji_favorites') || '[]');
                    config.emojiFavorites = Array.isArray(ef) ? ef : [];
                } catch (error) {
                    config.emojiFavorites = [];
                }
            }
            
            // 获取鸡腿统计数据
            if (selectedItems.includes('chickenLegStats')) {
                try {
                    if (window.NodeSeekRegister && typeof window.NodeSeekRegister.getChickenLegStats === 'function') {
                        config.chickenLegStats = window.NodeSeekRegister.getChickenLegStats();
                    } else {
                        // 如果模块未加载，尝试直接从localStorage获取
                        const lastFetch = localStorage.getItem('nodeseek_chicken_leg_last_fetch');
                        const nextAllow = localStorage.getItem('nodeseek_chicken_leg_next_allow');
                        const lastHtml = localStorage.getItem('nodeseek_chicken_leg_last_html');
                        const history = localStorage.getItem('nodeseek_chicken_leg_history');
                        
                        if (lastFetch || nextAllow || lastHtml || history) {
                            config.chickenLegStats = {
                                lastFetch: lastFetch,
                                nextAllow: nextAllow,
                                lastHtml: lastHtml,
                                history: history ? JSON.parse(history) : []
                            };
                        }
                    }
                } catch (error) {
                    console.error('获取鸡腿统计数据失败:', error);
                }
            }
            
            // 获取热点统计数据
            if (selectedItems.includes('hotTopicsData')) {
                const hotTopicsData = {};
                try {
                    // RSS历史采集数据
                    const rssHistory = localStorage.getItem('nodeseek_rss_history');
                    if (rssHistory) {
                        hotTopicsData.rssHistory = JSON.parse(rssHistory);
                    }
                    
                    // 热词历史数据
                    const hotWordsHistory = localStorage.getItem('nodeseek_hot_words_history');
                    if (hotWordsHistory) {
                        hotTopicsData.hotWordsHistory = JSON.parse(hotWordsHistory);
                    }
                    
                    // 时间分布统计数据
                    const timeDistributionHistory = localStorage.getItem('nodeseek_time_distribution_history');
                    if (timeDistributionHistory) {
                        hotTopicsData.timeDistributionHistory = JSON.parse(timeDistributionHistory);
                    }
                    
                    // 用户统计数据
                    const userStatsHistory = localStorage.getItem('nodeseek_user_stats_history');
                    if (userStatsHistory) {
                        hotTopicsData.userStatsHistory = JSON.parse(userStatsHistory);
                    }
                    
                    // 全局状态数据
                    const globalState = localStorage.getItem('nodeseek_focus_global_state');
                    if (globalState) {
                        hotTopicsData.globalState = JSON.parse(globalState);
                    }
                    
                    // 只在有数据时才添加到配置中
                    if (Object.keys(hotTopicsData).length > 0) {
                        config.hotTopicsData = hotTopicsData;
                    }
                } catch (error) {
                    console.error('获取热点统计数据失败:', error);
                }
            }
            
            // 获取关键词过滤数据
            if (selectedItems.includes('filterData')) {
                const filterData = {};
                try {
                    // 屏蔽关键词
                    const customKeywords = localStorage.getItem('ns-filter-custom-keywords');
                    if (customKeywords) {
                        filterData.customKeywords = JSON.parse(customKeywords);
                    }
                    
                    // 显示关键词
                    const displayKeywords = localStorage.getItem('ns-filter-keywords');
                    if (displayKeywords) {
                        filterData.displayKeywords = JSON.parse(displayKeywords);
                    }
                    
                    // 高亮关键词
                    const highlightKeywords = localStorage.getItem('ns-filter-highlight-keywords');
                    if (highlightKeywords) {
                        filterData.highlightKeywords = JSON.parse(highlightKeywords);
                    }
                    
                    // 高亮作者选项
                    const highlightAuthorEnabled = localStorage.getItem('ns-filter-highlight-author-enabled');
                    if (highlightAuthorEnabled) {
                        filterData.highlightAuthorEnabled = JSON.parse(highlightAuthorEnabled);
                    }
                    
                    // 高亮颜色
                    const highlightColor = localStorage.getItem('ns-filter-highlight-color');
                    if (highlightColor) {
                        filterData.highlightColor = highlightColor;
                    }
                    
                    // 弹窗位置
                    const dialogPosition = localStorage.getItem('ns-filter-dialog-position');
                    if (dialogPosition) {
                        filterData.dialogPosition = JSON.parse(dialogPosition);
                    }
                    
                    // 只在有数据时才添加到配置中
                    if (Object.keys(filterData).length > 0) {
                        config.filterData = filterData;
                    }
                } catch (error) {
                    console.error('获取关键词过滤数据失败:', error);
                }
            }

            config.timestamp = new Date().toISOString();
            return config;
        },

        // 应用配置数据
        applyConfig: function(config, selectedItems) {
            let applied = [];
            
            // 如果没有选择特定项目，默认应用所有配置
            if (!selectedItems || selectedItems.length === 0) {
                selectedItems = ['blacklist', 'friends', 'favorites', 'logs', 'browseHistory', 'quickReplies', 'emojiFavorites', 'chickenLegStats', 'hotTopicsData'];
            }
            
            try {
                // 应用黑名单数据
                if (selectedItems.includes('blacklist') && config.blacklist) {
                    localStorage.setItem('nodeseek_blacklist', JSON.stringify(config.blacklist));
                    applied.push("黑名单");
                }

                // 应用好友数据
                if (selectedItems.includes('friends') && config.friends) {
                    if (window.NodeSeekFriends && typeof window.NodeSeekFriends.setFriends === 'function') {
                        window.NodeSeekFriends.setFriends(config.friends);
                    } else {
                        localStorage.setItem('nodeseek_friends', JSON.stringify(config.friends));
                    }
                    applied.push("好友");
                }

                // 应用收藏数据
                if (selectedItems.includes('favorites') && config.favorites && Array.isArray(config.favorites)) {
                    localStorage.setItem('nodeseek_favorites', JSON.stringify(config.favorites));
                    applied.push("收藏");
                }

                // 应用操作日志
                if (selectedItems.includes('logs') && config.logs && Array.isArray(config.logs)) {
                    localStorage.setItem('nodeseek_sign_logs', JSON.stringify(config.logs));
                    applied.push("操作日志");
                }

                // 应用浏览历史
                if (selectedItems.includes('browseHistory') && config.browseHistory && Array.isArray(config.browseHistory)) {
                    localStorage.setItem('nodeseek_browse_history', JSON.stringify(config.browseHistory));
                    applied.push("浏览历史");
                }

                // 应用快捷回复数据
                if (selectedItems.includes('quickReplies') && config.quickReplies && typeof config.quickReplies === 'object') {
                    // 确保数据包含categoryOrder
                    if (!config.quickReplies.categoryOrder) {
                        config.quickReplies.categoryOrder = Object.keys(config.quickReplies).filter(key => key !== 'categoryOrder');
                    }
                    
                    if (window.NodeSeekQuickReply && typeof window.NodeSeekQuickReply.setQuickReplies === 'function') {
                        window.NodeSeekQuickReply.setQuickReplies(config.quickReplies);
                    } else {
                        localStorage.setItem('nodeseek_quick_reply', JSON.stringify(config.quickReplies));
                    }
                    const categoriesCount = config.quickReplies.categoryOrder ? config.quickReplies.categoryOrder.length : Object.keys(config.quickReplies).filter(key => key !== 'categoryOrder').length;
                    applied.push(`快捷回复(${categoriesCount}个分类)`);
                }

                // 应用常用表情数据
                if (selectedItems.includes('emojiFavorites') && Array.isArray(config.emojiFavorites)) {
                    localStorage.setItem('ns_emoji_favorites', JSON.stringify(config.emojiFavorites));
                    const favCount = config.emojiFavorites.length || 0;
                    applied.push(`常用表情(${favCount}个)`);
                }

                // 应用鸡腿统计数据
                if (selectedItems.includes('chickenLegStats') && config.chickenLegStats && typeof config.chickenLegStats === 'object') {
                    try {
                        if (window.NodeSeekRegister && typeof window.NodeSeekRegister.setChickenLegStats === 'function') {
                            window.NodeSeekRegister.setChickenLegStats(config.chickenLegStats);
                            const historyCount = config.chickenLegStats.history ? config.chickenLegStats.history.length : 0;
                            applied.push(`鸡腿统计(${historyCount}条记录)`);
                        } else {
                            // 如果模块未加载，直接保存到localStorage的相应键中
                            let importedCount = 0;
                            
                            if (config.chickenLegStats.lastFetch) {
                                localStorage.setItem('nodeseek_chicken_leg_last_fetch', config.chickenLegStats.lastFetch);
                                importedCount++;
                            }
                            
                            if (config.chickenLegStats.nextAllow) {
                                localStorage.setItem('nodeseek_chicken_leg_next_allow', config.chickenLegStats.nextAllow);
                                importedCount++;
                            }
                            
                            if (config.chickenLegStats.lastHtml) {
                                localStorage.setItem('nodeseek_chicken_leg_last_html', config.chickenLegStats.lastHtml);
                                importedCount++;
                            }
                            
                            if (config.chickenLegStats.history && Array.isArray(config.chickenLegStats.history)) {
                                localStorage.setItem('nodeseek_chicken_leg_history', JSON.stringify(config.chickenLegStats.history));
                                applied.push(`鸡腿统计(${config.chickenLegStats.history.length}条记录)`);
                            } else {
                                applied.push("鸡腿统计");
                            }
                        }
                    } catch (error) {
                        console.error('应用鸡腿统计数据失败:', error);
                        applied.push("鸡腿统计(失败)");
                    }
                }

                // 应用热点统计数据
                if (selectedItems.includes('hotTopicsData') && config.hotTopicsData && typeof config.hotTopicsData === 'object') {
                    try {
                        const hotData = config.hotTopicsData;
                        let hotImportCount = 0;
                        
                        // 导入RSS历史数据
                        if (hotData.rssHistory && Array.isArray(hotData.rssHistory)) {
                            localStorage.setItem('nodeseek_rss_history', JSON.stringify(hotData.rssHistory));
                            hotImportCount++;
                        }
                        
                        // 导入热词历史数据
                        if (hotData.hotWordsHistory && Array.isArray(hotData.hotWordsHistory)) {
                            localStorage.setItem('nodeseek_hot_words_history', JSON.stringify(hotData.hotWordsHistory));
                            hotImportCount++;
                        }
                        
                        // 导入时间分布数据
                        if (hotData.timeDistributionHistory && Array.isArray(hotData.timeDistributionHistory)) {
                            localStorage.setItem('nodeseek_time_distribution_history', JSON.stringify(hotData.timeDistributionHistory));
                            hotImportCount++;
                        }
                        
                        // 导入用户统计数据
                        if (hotData.userStatsHistory && Array.isArray(hotData.userStatsHistory)) {
                            localStorage.setItem('nodeseek_user_stats_history', JSON.stringify(hotData.userStatsHistory));
                            hotImportCount++;
                        }
                        
                        // 导入全局状态数据
                        if (hotData.globalState && typeof hotData.globalState === 'object') {
                            localStorage.setItem('nodeseek_focus_global_state', JSON.stringify(hotData.globalState));
                            hotImportCount++;
                        }
                        
                        if (hotImportCount > 0) {
                            applied.push(`热点统计(${hotImportCount}项)`);
                        }
                    } catch (error) {
                        console.error('应用热点统计数据失败:', error);
                        applied.push("热点统计(失败)");
                    }
                }

                // 应用关键词过滤数据
                if (selectedItems.includes('filterData') && config.filterData && typeof config.filterData === 'object') {
                    try {
                        let filterImportCount = 0;
                        
                        // 导入屏蔽关键词
                        if (config.filterData.customKeywords && Array.isArray(config.filterData.customKeywords)) {
                            localStorage.setItem('ns-filter-custom-keywords', JSON.stringify(config.filterData.customKeywords));
                            filterImportCount += config.filterData.customKeywords.length;
                        }
                        
                        // 导入显示关键词
                        if (config.filterData.displayKeywords && Array.isArray(config.filterData.displayKeywords)) {
                            localStorage.setItem('ns-filter-keywords', JSON.stringify(config.filterData.displayKeywords));
                        }
                        
                        // 导入高亮关键词
                        let highlightImportCount = 0;
                        if (config.filterData.highlightKeywords && Array.isArray(config.filterData.highlightKeywords)) {
                            localStorage.setItem('ns-filter-highlight-keywords', JSON.stringify(config.filterData.highlightKeywords));
                            highlightImportCount = config.filterData.highlightKeywords.length;
                        }
                        
                        // 导入高亮作者选项
                        if (config.filterData.highlightAuthorEnabled !== undefined) {
                            localStorage.setItem('ns-filter-highlight-author-enabled', JSON.stringify(config.filterData.highlightAuthorEnabled));
                        }
                        
                        // 导入高亮颜色
                        if (config.filterData.highlightColor) {
                            localStorage.setItem('ns-filter-highlight-color', config.filterData.highlightColor);
                        }
                        
                        // 导入弹窗位置
                        if (config.filterData.dialogPosition && typeof config.filterData.dialogPosition === 'object') {
                            localStorage.setItem('ns-filter-dialog-position', JSON.stringify(config.filterData.dialogPosition));
                        }
                        
                        if (filterImportCount > 0 || highlightImportCount > 0) {
                            const parts = [];
                            if (filterImportCount > 0) parts.push(`${filterImportCount}个屏蔽词`);
                            if (highlightImportCount > 0) parts.push(`${highlightImportCount}个高亮词`);
                            applied.push(`关键词过滤(${parts.join('、')})`);
                        } else {
                            applied.push("关键词过滤");
                        }
                    } catch (error) {
                        console.error('应用关键词过滤数据失败:', error);
                        applied.push("关键词过滤(失败)");
                    }
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

        // 验证token（增强错误处理）
        validateToken: async function() {
            if (!authToken) return false;

            try {
                const data = await Utils.request(`${CONFIG.SERVER_URL}/api/user`, {
                    method: 'GET',
                    retries: 1 // 减少重试次数，因为token验证失败通常不是网络问题
                });
                
                if (data.success) {
                    currentUser = data.user;
                    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(currentUser));
                    return true;
                }
            } catch (error) {
                console.error('Token验证失败:', error);
                // 如果是认证错误，清除本地存储的认证信息
                if (error.message.includes('401') || error.message.includes('403')) {
                    this.clearAuth();
                    Utils.showMessage('登录已过期，请重新登录', 'warning');
                } else {
                    // 网络错误时不清除认证信息，保持登录状态
                    console.warn('网络错误，保持当前登录状态');
                }
            }
            return false;
        }
    };

    // 配置同步
    const Sync = {
        // 显示配置选择对话框
        // onCancel: 可选，当用户关闭/取消对话框且未执行同步时触发
        showConfigSelectionDialog: function(mode, callback, onCancel) {
            // 移除已存在的对话框
            const existingDialog = document.getElementById('config-selection-dialog');
            if (existingDialog) {
                existingDialog.remove();
            }

            const dialog = document.createElement('div');
            dialog.id = 'config-selection-dialog';
            const isMobile = window.innerWidth <= 768;
            
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: ${isMobile ? '90vw' : '480px'};
                max-width: ${isMobile ? '90vw' : '480px'};
                z-index: 10001;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                padding: 20px;
                max-height: 80vh;
                overflow-y: auto;
                box-sizing: border-box;
            `;

            // 添加左上角拖拽区域
            const dragHandle = document.createElement('div');
            dragHandle.className = 'dialog-title-draggable'; // 添加可拖拽标识
            dragHandle.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 30px;
                height: 30px;
                cursor: move;
                background: transparent;
                z-index: 1;
                user-select: none;
            `;

            // 标题
            const title = document.createElement('div');
            title.textContent = `选择要${mode === 'upload' ? '上传' : '下载'}的配置`;
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
            closeBtn.onclick = () => {
                // 用户主动关闭对话框
                try {
                    if (typeof onCancel === 'function') onCancel();
                } finally {
                    dialog.remove();
                }
            };

            // 配置选项
            const configOptions = [
                { key: 'blacklist', label: '黑名单' },
                { key: 'friends', label: '好友' },
                { key: 'favorites', label: '收藏' },
                { key: 'logs', label: '操作日志' },
                { key: 'browseHistory', label: '浏览历史' },
                { key: 'quickReplies', label: '快捷回复' },
                { key: 'emojiFavorites', label: '常用表情' },
                { key: 'chickenLegStats', label: '鸡腿统计' },
                { key: 'hotTopicsData', label: '热点统计' },
                { key: 'filterData', label: '关键词过滤' }
            ];

            // 全选/取消全选
            const selectAllContainer = document.createElement('div');
            selectAllContainer.style.cssText = `
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid #eee;
            `;

            const selectAllCheckbox = document.createElement('input');
            selectAllCheckbox.type = 'checkbox';
            selectAllCheckbox.id = 'select-all-config';
            selectAllCheckbox.checked = true;
            selectAllCheckbox.style.marginRight = '8px';

            const selectAllLabel = document.createElement('label');
            selectAllLabel.htmlFor = 'select-all-config';
            selectAllLabel.textContent = '全选';
            selectAllLabel.style.cssText = `
                cursor: pointer;
                font-weight: bold;
                color: #1890ff;
            `;

            selectAllContainer.appendChild(selectAllCheckbox);
            selectAllContainer.appendChild(selectAllLabel);

            // 配置项列表
            const configList = document.createElement('div');
            configList.style.cssText = `
                margin-bottom: 20px;
                display: grid;
                grid-template-columns: ${isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'};
                gap: ${isMobile ? '6px' : '8px'};
                max-height: 200px;
                overflow-y: auto;
            `;

            const checkboxes = [];

            configOptions.forEach(option => {
                const item = document.createElement('div');
                item.style.cssText = `
                    min-width: 0;
                    padding: ${isMobile ? '6px 8px' : '8px 12px'};
                    background: #f8f9fa;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    transition: background-color 0.2s ease;
                    cursor: pointer;
                    white-space: nowrap;
                `;
                
                // 添加hover效果
                item.onmouseover = () => {
                    item.style.backgroundColor = '#e9ecef';
                };
                item.onmouseout = () => {
                    item.style.backgroundColor = '#f8f9fa';
                };

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `config-${option.key}`;
                checkbox.value = option.key;
                checkbox.checked = true;
                checkbox.style.marginRight = isMobile ? '4px' : '6px';

                const label = document.createElement('label');
                label.htmlFor = `config-${option.key}`;
                label.style.cssText = `
                    cursor: pointer;
                    font-weight: bold;
                    font-size: ${isMobile ? '12px' : '13px'};
                    color: #333;
                    user-select: none;
                    flex: 1;
                `;
                label.textContent = option.label;

                // 统一的点击处理函数
                const toggleCheckbox = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    checkbox.checked = !checkbox.checked;
                    // 触发change事件以更新全选状态
                    checkbox.dispatchEvent(new Event('change'));
                };

                // 点击整个item区域切换checkbox状态
                item.onclick = toggleCheckbox;
                
                // 点击label文本切换checkbox状态
                label.onclick = toggleCheckbox;
                
                // 阻止checkbox的默认行为，使用我们的统一处理
                checkbox.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleCheckbox(e);
                };

                item.appendChild(checkbox);
                item.appendChild(label);
                configList.appendChild(item);

                checkboxes.push(checkbox);
            });

            // 全选逻辑
            selectAllCheckbox.onchange = function() {
                checkboxes.forEach(cb => cb.checked = this.checked);
            };

            // 单个选择逻辑
            checkboxes.forEach(cb => {
                cb.onchange = function() {
                    const allChecked = checkboxes.every(c => c.checked);
                    const anyChecked = checkboxes.some(c => c.checked);
                    selectAllCheckbox.checked = allChecked;
                    selectAllCheckbox.indeterminate = !allChecked && anyChecked;
                };
            });

            // 进度条容器
            const progressContainer = document.createElement('div');
            progressContainer.style.cssText = `
                margin-bottom: 15px;
                display: none;
            `;

            // 进度条标签
            const progressLabel = document.createElement('div');
            progressLabel.style.cssText = `
                font-size: 12px;
                color: #666;
                margin-bottom: 5px;
                text-align: center;
            `;

            // 进度条背景
            const progressBar = document.createElement('div');
            progressBar.style.cssText = `
                width: 100%;
                height: 8px;
                background: #f0f0f0;
                border-radius: 4px;
                overflow: hidden;
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
            `;

            // 进度条填充
            const progressFill = document.createElement('div');
            progressFill.style.cssText = `
                height: 100%;
                background: linear-gradient(90deg, #1890ff, #40a9ff);
                width: 0%;
                transition: width 0.5s ease;
                border-radius: 4px;
                position: relative;
                box-shadow: 0 1px 2px rgba(24,144,255,0.3);
                overflow: hidden;
            `;
            
            // 添加闪烁效果
            const progressShine = document.createElement('div');
            progressShine.style.cssText = `
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                animation: shine 2s infinite;
            `;
            
            // 添加CSS动画
            const style = document.createElement('style');
            style.textContent = `
                @keyframes shine {
                    0% { left: -100%; }
                    50% { left: 100%; }
                    100% { left: 100%; }
                }
            `;
            
            if (!document.head.querySelector('style[data-progress-shine]')) {
                style.setAttribute('data-progress-shine', 'true');
                document.head.appendChild(style);
            }
            
            progressFill.appendChild(progressShine);

            progressBar.appendChild(progressFill);
            progressContainer.appendChild(progressLabel);
            progressContainer.appendChild(progressBar);

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 10px;
                justify-content: center;
            `;

            // 确认按钮
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = mode === 'upload' ? '上传选中配置' : '下载选中配置';
            confirmBtn.style.cssText = `
                flex: 1;
                padding: 8px 16px;
                background: #1890ff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;

            // 取消按钮
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.style.cssText = `
                flex: 1;
                padding: 8px 16px;
                background: #f0f0f0;
                color: #666;
                border: 1px solid #ccc;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;

            // 事件处理
            confirmBtn.onclick = async () => {
                const selectedItems = checkboxes
                    .filter(cb => cb.checked)
                    .map(cb => cb.value);

                if (selectedItems.length === 0) {
                    Utils.showMessage('请至少选择一个配置项', 'warning');
                    return;
                }

                // 禁用按钮并显示同步中状态
                confirmBtn.disabled = true;
                cancelBtn.disabled = true;
                const originalText = confirmBtn.textContent;
                confirmBtn.textContent = mode === 'upload' ? '上传中...' : '下载中...';
                confirmBtn.style.background = '#ccc';
                
                // 显示进度条
                progressContainer.style.display = 'block';
                progressLabel.textContent = mode === 'upload' ? '准备上传配置...' : '准备下载配置...';
                progressFill.style.width = '10%';
                
                let opSuccess = false;
                try {
                    // 进度步骤1：数据准备
                    progressLabel.textContent = mode === 'upload' ? '正在收集配置数据...' : '正在获取服务器配置...';
                    progressFill.style.width = '30%';
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // 进度步骤2：执行同步
                    progressLabel.textContent = mode === 'upload' ? '正在上传配置...' : '正在应用配置...';
                    progressFill.style.width = '70%';
                    // 通知开始（只在用户真正点击确认后触发）
                    try { window.dispatchEvent(new CustomEvent('ns-sync-start', { detail: { mode } })); } catch (e) {}
                    
                    // 执行同步操作
                    opSuccess = await callback(selectedItems);
                    
                    // 进度步骤3：完成
                    progressLabel.textContent = mode === 'upload' ? '上传完成!' : '下载完成!';
                    progressFill.style.width = '100%';
                    progressShine.style.animation = 'none'; // 停止闪烁动画
                    
                    // 等待一下让用户看到完成状态
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                } catch (error) {
                    console.error('同步操作失败:', error);
                    progressLabel.textContent = '同步失败';
                    progressFill.style.background = 'linear-gradient(90deg, #f44336, #e57373)';
                    progressFill.style.width = '100%';
                    progressShine.style.animation = 'none'; // 停止闪烁动画
                    
                    // 等待一下让用户看到失败状态
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } finally {
                    // 隐藏进度条
                    progressContainer.style.display = 'none';
                    progressFill.style.width = '0%';
                    progressFill.style.background = 'linear-gradient(90deg, #1890ff, #40a9ff)';
                    progressShine.style.animation = 'shine 2s infinite'; // 恢复闪烁动画
                    
                    // 恢复按钮状态并关闭对话框
                    confirmBtn.disabled = false;
                    cancelBtn.disabled = false;
                    confirmBtn.textContent = originalText;
                    confirmBtn.style.background = '#1890ff';
                    // 通知结束
                    try { window.dispatchEvent(new CustomEvent('ns-sync-end', { detail: { mode, success: !!opSuccess } })); } catch (e) {}
                    dialog.remove();
                }
            };

            cancelBtn.onclick = () => {
                // 用户点击取消
                try {
                    if (typeof onCancel === 'function') onCancel();
                } finally {
                    dialog.remove();
                }
            };

            // 组装对话框
            dialog.appendChild(dragHandle);
            dialog.appendChild(title);
            dialog.appendChild(closeBtn);
            dialog.appendChild(selectAllContainer);
            dialog.appendChild(configList);
            dialog.appendChild(progressContainer);
            buttonContainer.appendChild(confirmBtn);
            buttonContainer.appendChild(cancelBtn);
            dialog.appendChild(buttonContainer);

            document.body.appendChild(dialog);
            
            // 使对话框可拖动
            UI.makeDraggable(dialog);
        },

        // 上传配置到服务器
        upload: async function() {
            if (!Auth.isLoggedIn()) {
                Utils.showMessage('请先登录', 'error');
                return false;
            }

            // 返回一个Promise，等待配置选择对话框完成
            return new Promise((resolve, reject) => {
                // 显示配置选择对话框
                this.showConfigSelectionDialog('upload', async (selectedItems) => {
                    try {
                        // 收集配置数据
                        const config = Utils.getAllConfig(selectedItems);
                        
                        // 发送到服务器
                        const data = await Utils.request(`${CONFIG.SERVER_URL}/api/sync`, {
                            method: 'POST',
                            body: JSON.stringify({ config })
                        });

                        if (data.success) {
                            const itemNames = selectedItems.map(item => {
                                const option = {
                                    'blacklist': '黑名单',
                                    'friends': '好友',
                                    'favorites': '收藏',
                                    'logs': '操作日志',
                                    'browseHistory': '浏览历史',
                                    'quickReplies': '快捷回复',
                                    'emojiFavorites': '常用表情',
                                    'chickenLegStats': '鸡腿统计',
                                    'hotTopicsData': '热点统计',
                                    'filterData': '关键词过滤'
                                }[item];
                                return option || item;
                            });
                            Utils.showMessage(`配置已同步到服务器 (${itemNames.join('、')})`, 'success');
                            
                            // 延迟更新存储空间信息，确保对话框关闭后再更新
                            setTimeout(() => {
                                // 查找当前页面上的存储空间信息元素并更新
                                const currentStorageInfo = document.querySelector('#login-auth-dialog .storage-info-container');
                                if (currentStorageInfo) {
                                    UI.loadStorageInfo(currentStorageInfo);
                                }
                            }, 500);
                            
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    } catch (error) {
                        Utils.showMessage(`配置同步失败: ${error.message}`, 'error');
                        reject(error); // 重新抛出错误，让进度条能够显示失败状态
                    }
                }, () => {
                    // 取消/关闭对话框
                    try { resolve(false); } catch (e) { /* no-op */ }
                });
            });
        },

        // 删除同步数据
        deleteServerConfig: async function() {
            if (!Auth.isLoggedIn()) {
                Utils.showMessage('请先登录', 'error');
                return false;
            }

            // 确认删除操作
            if (!confirm('确定要删除服务器上的所有同步数据吗？\n\n⚠️ 此操作不可恢复！')) {
                return false;
            }

            try {
                // 发送删除请求
                const data = await Utils.request(`${CONFIG.SERVER_URL}/api/sync`, {
                    method: 'DELETE',
                    retries: 1 // 删除操作只重试1次
                });

                if (data.success) {
                    Utils.showMessage('服务器同步数据已清除', 'success');
                    return true;
                } else {
                    Utils.showMessage(data.message || '删除失败', 'error');
                    return false;
                }
            } catch (error) {
                if (error.message.includes('404')) {
                    Utils.showMessage('服务器上没有同步数据', 'warning');
                } else {
                    Utils.showMessage(`删除失败: ${error.message}`, 'error');
                }
                return false;
            }
        },

        // 显示删除同步数据确认对话框
        showDeleteConfigDialog: function() {
            // 移除已存在的对话框
            const existingDialog = document.getElementById('delete-config-dialog');
            if (existingDialog) {
                existingDialog.remove();
            }

            const dialog = document.createElement('div');
            dialog.id = 'delete-config-dialog';
            const isMobile = window.innerWidth <= 768;
            
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: ${isMobile ? '90vw' : '420px'};
                max-width: ${isMobile ? '90vw' : '420px'};
                z-index: 10001;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                padding: 20px;
                box-sizing: border-box;
            `;

            // 添加左上角拖拽区域
            const dragHandle = document.createElement('div');
            dragHandle.className = 'dialog-title-draggable';
            dragHandle.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 30px;
                height: 30px;
                cursor: move;
                background: transparent;
                z-index: 1;
                user-select: none;
            `;

            // 标题
            const title = document.createElement('div');
            title.textContent = '清除同步数据';
            title.style.cssText = `
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 15px;
                text-align: center;
                color: #f44336;
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

            // 警告内容
            const warningContent = document.createElement('div');
            warningContent.style.cssText = `
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 6px;
                padding: 15px;
                margin-bottom: 20px;
                color: #856404;
                line-height: 1.5;
            `;
            warningContent.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 8px; color: #f44336;">⚠️ 危险操作警告</div>
                <div>此操作将永久删除服务器上存储的所有同步数据，包括：</div>
                <ul style="margin: 8px 0; padding-left: 20px;">
                    <li>黑名单、好友列表</li>
                    <li>收藏、操作日志</li>
                    <li>浏览历史、快捷回复</li>
                    <li>常用表情、统计数据</li>
                    <li>关键词过滤设置</li>
                </ul>
                <div style="color: #f44336; font-weight: bold;">该操作不可恢复！</div>
                <div style="margin-top: 8px; color: #666;">本地数据不会受到影响，仅删除服务器上的备份数据。</div>
            `;

            // 进度条容器
            const progressContainer = document.createElement('div');
            progressContainer.style.cssText = `
                margin-bottom: 15px;
                display: none;
            `;

            // 进度条标签
            const progressLabel = document.createElement('div');
            progressLabel.style.cssText = `
                font-size: 12px;
                color: #666;
                margin-bottom: 5px;
                text-align: center;
            `;

            // 进度条背景
            const progressBar = document.createElement('div');
            progressBar.style.cssText = `
                width: 100%;
                height: 8px;
                background: #f0f0f0;
                border-radius: 4px;
                overflow: hidden;
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
            `;

            // 进度条填充
            const progressFill = document.createElement('div');
            progressFill.style.cssText = `
                height: 100%;
                background: linear-gradient(90deg, #f44336, #e57373);
                width: 0%;
                transition: width 0.5s ease;
                border-radius: 4px;
            `;

            progressBar.appendChild(progressFill);
            progressContainer.appendChild(progressLabel);
            progressContainer.appendChild(progressBar);

            // 确认输入框
            const confirmContainer = document.createElement('div');
            confirmContainer.style.cssText = `
                margin-bottom: 20px;
            `;

            const confirmLabel = document.createElement('div');
            confirmLabel.textContent = '请输入 "DELETE" 确认删除操作：';
            confirmLabel.style.cssText = `
                font-weight: bold;
                margin-bottom: 8px;
                color: #f44336;
            `;

            const confirmInput = document.createElement('input');
            confirmInput.type = 'text';
            confirmInput.placeholder = '请输入 DELETE';
            confirmInput.style.cssText = `
                width: 100%;
                padding: 8px 12px;
                border: 2px solid #f44336;
                border-radius: 4px;
                box-sizing: border-box;
                font-size: 14px;
                text-align: center;
                font-weight: bold;
            `;

            confirmContainer.appendChild(confirmLabel);
            confirmContainer.appendChild(confirmInput);

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 10px;
                justify-content: center;
            `;

            // 确认删除按钮
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = '确认清除';
            confirmBtn.disabled = true;
            confirmBtn.style.cssText = `
                flex: 1;
                padding: 8px 16px;
                background: #ccc;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: not-allowed;
                font-size: 14px;
                font-weight: bold;
            `;

            // 取消按钮
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.style.cssText = `
                flex: 1;
                padding: 8px 16px;
                background: #f0f0f0;
                color: #666;
                border: 1px solid #ccc;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;

            // 输入验证
            confirmInput.addEventListener('input', function() {
                const isValid = this.value.trim() === 'DELETE';
                confirmBtn.disabled = !isValid;
                if (isValid) {
                    confirmBtn.style.background = '#f44336';
                    confirmBtn.style.cursor = 'pointer';
                } else {
                    confirmBtn.style.background = '#ccc';
                    confirmBtn.style.cursor = 'not-allowed';
                }
            });

            // 事件处理
            confirmBtn.onclick = async () => {
                if (confirmInput.value.trim() !== 'DELETE') {
                    Utils.showMessage('请正确输入 DELETE 确认删除', 'warning');
                    return;
                }

                // 禁用按钮并显示删除中状态
                confirmBtn.disabled = true;
                cancelBtn.disabled = true;
                const originalText = confirmBtn.textContent;
                confirmBtn.textContent = '清除中...';
                confirmBtn.style.background = '#ccc';
                
                // 显示进度条
                progressContainer.style.display = 'block';
                progressLabel.textContent = '正在清除服务器同步数据...';
                progressFill.style.width = '30%';
                
                try {
                    // 进度步骤
                    progressLabel.textContent = '正在发送删除请求...';
                    progressFill.style.width = '70%';
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // 执行删除操作
                    await Sync.deleteServerConfig();
                    
                    // 完成
                    progressLabel.textContent = '清除完成!';
                    progressFill.style.width = '100%';
                    
                    // 等待一下让用户看到完成状态
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                } catch (error) {
                    console.error('删除操作失败:', error);
                    progressLabel.textContent = '清除失败';
                    progressFill.style.background = 'linear-gradient(90deg, #f44336, #e57373)';
                    progressFill.style.width = '100%';
                    
                    // 等待一下让用户看到失败状态
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } finally {
                    // 恢复按钮状态并关闭对话框
                    confirmBtn.disabled = false;
                    cancelBtn.disabled = false;
                    confirmBtn.textContent = originalText;
                    confirmBtn.style.background = '#f44336';
                    dialog.remove();
                }
            };

            cancelBtn.onclick = () => dialog.remove();

            // 回车确认
            confirmInput.onkeydown = (e) => {
                if (e.key === 'Enter' && !confirmBtn.disabled) {
                    confirmBtn.click();
                }
            };

            // 组装对话框
            buttonContainer.appendChild(confirmBtn);
            buttonContainer.appendChild(cancelBtn);

            dialog.appendChild(dragHandle);
            dialog.appendChild(title);
            dialog.appendChild(closeBtn);
            dialog.appendChild(warningContent);
            dialog.appendChild(confirmContainer);
            dialog.appendChild(progressContainer);
            dialog.appendChild(buttonContainer);

            document.body.appendChild(dialog);
            
            // 使对话框可拖动
            UI.makeDraggable(dialog);
            
            // 聚焦输入框
            confirmInput.focus();
        },

        // 从服务器下载配置
        download: async function() {
            if (!Auth.isLoggedIn()) {
                Utils.showMessage('请先登录', 'error');
                return false;
            }

            // 返回一个Promise，等待配置选择对话框完成
            return new Promise((resolve, reject) => {
                // 显示配置选择对话框
                this.showConfigSelectionDialog('download', async (selectedItems) => {
                    try {
                        // 获取服务器配置数据
                        const data = await Utils.request(`${CONFIG.SERVER_URL}/api/sync`);

                        if (data.success && data.config) {
                            // 应用配置
                            const applied = Utils.applyConfig(data.config, selectedItems);
                            
                            if (applied.length > 0) {
                                // 延迟显示确认对话框，让成功提示先显示
                                setTimeout(() => {
                                    const shouldReload = confirm(`配置同步成功！\n\n已同步: ${applied.join('、')}\n\n是否刷新页面以应用更改？`);
                                    if (shouldReload) {
                                        location.reload();
                                    } else {
                                        Utils.showMessage('配置已同步，建议刷新页面以完全应用更改', 'info');
                                        
                                        // 更新存储空间信息
                                        const currentStorageInfo = document.querySelector('#login-auth-dialog .storage-info-container');
                                        if (currentStorageInfo) {
                                            UI.loadStorageInfo(currentStorageInfo);
                                        }
                                    }
                                }, 500);
                                resolve(true);
                            } else {
                                Utils.showMessage('从服务器获取配置成功，但没有数据需要应用', 'info');
                                resolve(false);
                            }
                        } else {
                            Utils.showMessage('服务器返回的配置数据格式错误', 'error');
                            reject(new Error('配置数据格式错误'));
                        }
                    } catch (error) {
                        if (error.message.includes('404')) {
                            Utils.showMessage('服务器上没有配置数据，请先上传配置', 'warning');
                        } else {
                            Utils.showMessage(`配置下载失败: ${error.message}`, 'error');
                        }
                        reject(error); // 重新抛出错误，让进度条能够显示失败状态
                    }
                }, () => {
                    // 取消/关闭对话框
                    try { resolve(false); } catch (e) { /* no-op */ }
                });
            });
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

            // 添加左上角拖拽区域
            const dragHandle = document.createElement('div');
            dragHandle.className = 'dialog-title-draggable'; // 添加可拖拽标识
            dragHandle.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 30px;
                height: 30px;
                cursor: move;
                background: transparent;
                z-index: 1;
                user-select: none;
            `;

            const title = document.createElement('div');
            title.textContent = '配置同步';
            title.style.cssText = `
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 15px;
                text-align: center;
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

            dialog.appendChild(dragHandle);
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
                    // 显示处理中状态（不会影响最终恢复）
                    if (isRegisterMode) { registerBtn.textContent = '处理中...'; }
                    else { loginBtn.textContent = '处理中...'; }

                    if (isLogin) {
                        await Auth.login(username, password);
                    } else {
                        // 先注册
                        await Auth.register(username, password, securityCode);
                        // 注册成功后自动登录
                        await Auth.login(username, password);
                        // 清空输入框
                        usernameInput.value = '';
                        passwordInput.value = '';
                        securityCodeInput.value = '';
                        // 恢复按钮文案
                        loginBtn.textContent = '登录';
                        registerBtn.textContent = '注册';
                    }

                    // 登录成功后更新界面（包括注册后自动登录的场景）
                    if (Auth.isLoggedIn()) {
                        container.innerHTML = '';
                        
                        // 添加左上角拖拽区域
                        const dragHandle = document.createElement('div');
                        dragHandle.className = 'dialog-title-draggable'; // 添加可拖拽标识
                        dragHandle.style.cssText = `
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 30px;
                            height: 30px;
                            cursor: move;
                            background: transparent;
                            z-index: 1;
                            user-select: none;
                        `;
                        
                        const title = document.createElement('div');
                        title.textContent = '配置同步';
                        title.style.cssText = `
                            font-weight: bold;
                            font-size: 16px;
                            margin-bottom: 15px;
                            text-align: center;
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

                        container.appendChild(dragHandle);
                        container.appendChild(title);
                        container.appendChild(closeBtn);
                        this.createUserPanel(container);
                        
                        // 重要：重新绑定拖拽功能
                        this.makeDraggable(container);
                    }
                } catch (error) {
                    // 错误已在Auth模块中处理
                } finally {
                    // 无论当前模式如何，统一恢复两个按钮的状态与文案
                    loginBtn.disabled = false;
                    registerBtn.disabled = false;
                    loginBtn.textContent = '登录';
                    registerBtn.textContent = '注册';
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

            // 添加左上角拖拽区域
            const dragHandle = document.createElement('div');
            dragHandle.className = 'dialog-title-draggable'; // 添加可拖拽标识
            dragHandle.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 30px;
                height: 30px;
                cursor: move;
                background: transparent;
                z-index: 1;
                user-select: none;
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

            dialog.appendChild(dragHandle);
            dialog.appendChild(title);
            dialog.appendChild(closeBtn);
            dialog.appendChild(form);

            document.body.appendChild(dialog);
            
            // 使对话框可拖动
            this.makeDraggable(dialog);
            
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

            // 存储空间信息（异步加载）
            const storageInfo = document.createElement('div');
            storageInfo.className = 'storage-info-container'; // 添加特殊类名以便查找
            storageInfo.style.cssText = `
                background: #e6f7ff;
                border: 1px solid #91d5ff;
                border-radius: 4px;
                padding: 8px 12px;
                margin-bottom: 15px;
                font-size: 12px;
                color: #1890ff;
                line-height: 1.4;
                text-align: center;
            `;
            storageInfo.innerHTML = `
                <div>存储空间: 加载中...</div>
            `;
            
            // 异步加载存储空间信息
            UI.loadStorageInfo(storageInfo);

            // 数据保留政策提示
            const policyTip = document.createElement('div');
            policyTip.style.cssText = `
                background: #fff7e6;
                border: 1px solid #ffd591;
                border-radius: 4px;
                padding: 8px 12px;
                margin-bottom: 15px;
                font-size: 12px;
                color: #d46b08;
                line-height: 1.4;
                text-align: center;
            `;
            policyTip.innerHTML = `
                <div>数据自动保留30天（每日00:00清理过期）</div>
                <div>30天无活动账号自动删除</div>
            `;

            // 添加元素到容器
            container.appendChild(userInfo);
            container.appendChild(storageInfo);
            container.appendChild(policyTip);

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
                // 只监听事件来切换状态，避免弹窗未确认就进入“同步中”
                const onStart = (e) => {
                    if (e && e.detail && e.detail.mode === 'upload') {
                        uploadBtn.disabled = true;
                        uploadBtn.textContent = '同步中...';
                    }
                };
                const onEnd = (e) => {
                    if (!e || !e.detail || e.detail.mode !== 'upload') return;
                    uploadBtn.disabled = false;
                    uploadBtn.textContent = '同步到服务器';
                    if (e.detail.success) {
                        // 同步成功后刷新存储空间信息
                        UI.loadStorageInfo(storageInfo);
                    }
                    window.removeEventListener('ns-sync-start', onStart);
                    window.removeEventListener('ns-sync-end', onEnd);
                };
                window.addEventListener('ns-sync-start', onStart, { once: false });
                window.addEventListener('ns-sync-end', onEnd, { once: false });
                await Sync.upload();
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
                const onStart = (e) => {
                    if (e && e.detail && e.detail.mode === 'download') {
                        downloadBtn.disabled = true;
                        downloadBtn.textContent = '同步中...';
                    }
                };
                const onEnd = (e) => {
                    if (!e || !e.detail || e.detail.mode !== 'download') return;
                    downloadBtn.disabled = false;
                    downloadBtn.textContent = '从服务器同步';
                    if (e.detail.success) {
                        UI.loadStorageInfo(storageInfo);
                    }
                    window.removeEventListener('ns-sync-start', onStart);
                    window.removeEventListener('ns-sync-end', onEnd);
                };
                window.addEventListener('ns-sync-start', onStart, { once: false });
                window.addEventListener('ns-sync-end', onEnd, { once: false });
                await Sync.download();
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

            // 删除同步数据按钮
            const deleteConfigBtn = document.createElement('button');
            deleteConfigBtn.textContent = '清除同步数据';
            deleteConfigBtn.style.cssText = `
                padding: 8px;
                background: #f44336;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                min-width: 120px;
            `;
            deleteConfigBtn.onclick = async () => {
                deleteConfigBtn.disabled = true;
                const originalText = deleteConfigBtn.textContent;
                deleteConfigBtn.textContent = '清除中...';
                try {
                    await Sync.deleteServerConfig();
                    // 清除成功后刷新存储空间信息
                    UI.loadStorageInfo(storageInfo);
                } finally {
                    deleteConfigBtn.disabled = false;
                    deleteConfigBtn.textContent = originalText;
                }
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
            this.optimizeButtonForMobile(deleteConfigBtn, isMobile);
            this.optimizeButtonForMobile(logoutBtn, isMobile);
            
            syncContainer.appendChild(uploadBtn);
            syncContainer.appendChild(downloadBtn);
            syncContainer.appendChild(changePasswordBtn);
            syncContainer.appendChild(deleteConfigBtn);

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

            // 添加左上角拖拽区域
            const dragHandle = document.createElement('div');
            dragHandle.className = 'dialog-title-draggable'; // 添加可拖拽标识
            dragHandle.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 30px;
                height: 30px;
                cursor: move;
                background: transparent;
                z-index: 1;
                user-select: none;
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

            dialog.appendChild(dragHandle);
            dialog.appendChild(title);
            dialog.appendChild(closeBtn);
            dialog.appendChild(form);

            document.body.appendChild(dialog);
            
            // 使对话框可拖动
            this.makeDraggable(dialog);
            
            // 聚焦当前密码输入框
            currentPasswordInput.focus();
        },

        // 获取当前token
        getToken: function() {
            return authToken;
        },

        // 加载存储空间信息
        loadStorageInfo: async function(storageElement) {
            try {
                const data = await Utils.request(`${CONFIG.SERVER_URL}/api/user`, {
                    method: 'GET'
                });

                if (data.success && data.user && data.user.storage) {
                    const storage = data.user.storage;
                    const usageColor = storage.usage_percent >= 90 ? '#ff4d4f' : 
                                     storage.usage_percent >= 70 ? '#faad14' : '#52c41a';
                    
                    storageElement.innerHTML = `
                        <div style="font-weight: bold; margin-bottom: 4px;">存储空间</div>
                        <div>已使用: ${storage.usage_mb}MB / ${storage.limit_mb}MB</div>
                        <div style="color: ${usageColor}; font-weight: bold;">剩余: ${storage.remaining_mb}MB (${storage.usage_percent}%)</div>
                    `;
                } else {
                    storageElement.innerHTML = `
                        <div style="font-weight: bold; margin-bottom: 4px;">存储空间</div>
                        <div style="color: #999;">数据格式错误</div>
                    `;
                }
            } catch (error) {
                console.error('获取存储空间信息失败:', error);
                let errorMessage = '获取失败';
                if (error.message.includes('超时')) {
                    errorMessage = '请求超时';
                } else if (error.message.includes('网络')) {
                    errorMessage = '网络错误';
                } else if (error.message.includes('401') || error.message.includes('403')) {
                    errorMessage = '认证失败';
                }
                
                storageElement.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 4px;">存储空间</div>
                    <div style="color: #999;">${errorMessage}</div>
                `;
            }
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

})(); 
