// NodeSeek 屏蔽功能模块
// 支持屏蔽关键词和用户，包含配置导出导入功能

(function() {
    'use strict';

    // 存储键定义
    const BLOCKED_KEYWORDS_KEY = 'nodeseek_blocked_keywords';
    const BLOCKED_USERS_KEY = 'nodeseek_blocked_users';
    const BLOCKER_CONFIG_KEY = 'nodeseek_blocker_config';

    // 默认配置
    const DEFAULT_CONFIG = {
        enabled: true,
        hideBlockedContent: true,
        showBlockedCount: true,
        caseSensitive: false,
        matchMode: 'contains' // 'contains', 'exact', 'regex'
    };

    // 获取屏蔽的关键词列表
    function getBlockedKeywords() {
        return JSON.parse(localStorage.getItem(BLOCKED_KEYWORDS_KEY) || '[]');
    }

    // 设置屏蔽的关键词列表
    function setBlockedKeywords(keywords) {
        localStorage.setItem(BLOCKED_KEYWORDS_KEY, JSON.stringify(keywords));
    }

    // 添加屏蔽关键词
    function addBlockedKeyword(keyword, remark = '') {
        const keywords = getBlockedKeywords();
        const existingIndex = keywords.findIndex(k => k.keyword.toLowerCase() === keyword.toLowerCase());
        
        if (existingIndex >= 0) {
            // 更新现有关键词的备注
            keywords[existingIndex].remark = remark;
            keywords[existingIndex].updatedAt = new Date().toISOString();
        } else {
            // 添加新关键词
            keywords.push({
                keyword: keyword,
                remark: remark,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        setBlockedKeywords(keywords);
        return true;
    }

    // 移除屏蔽关键词
    function removeBlockedKeyword(keyword) {
        const keywords = getBlockedKeywords();
        const filteredKeywords = keywords.filter(k => k.keyword.toLowerCase() !== keyword.toLowerCase());
        setBlockedKeywords(filteredKeywords);
        return keywords.length !== filteredKeywords.length;
    }

    // 检查关键词是否被屏蔽
    function isKeywordBlocked(text) {
        if (!text) return false;
        
        const keywords = getBlockedKeywords();
        const config = getBlockerConfig();
        
        return keywords.some(item => {
            const keyword = item.keyword;
            const testText = config.caseSensitive ? text : text.toLowerCase();
            const testKeyword = config.caseSensitive ? keyword : keyword.toLowerCase();
            
            switch (config.matchMode) {
                case 'exact':
                    return testText === testKeyword;
                case 'regex':
                    try {
                        const regex = new RegExp(testKeyword, config.caseSensitive ? '' : 'i');
                        return regex.test(testText);
                    } catch (e) {
                        // 如果正则表达式无效，回退到包含匹配
                        return testText.includes(testKeyword);
                    }
                case 'contains':
                default:
                    return testText.includes(testKeyword);
            }
        });
    }

    // 获取屏蔽的用户列表
    function getBlockedUsers() {
        return JSON.parse(localStorage.getItem(BLOCKED_USERS_KEY) || '[]');
    }

    // 设置屏蔽的用户列表
    function setBlockedUsers(users) {
        localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(users));
    }

    // 添加屏蔽用户
    function addBlockedUser(username, remark = '') {
        const users = getBlockedUsers();
        const existingIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
        
        if (existingIndex >= 0) {
            // 更新现有用户的备注
            users[existingIndex].remark = remark;
            users[existingIndex].updatedAt = new Date().toISOString();
        } else {
            // 添加新用户
            users.push({
                username: username,
                remark: remark,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        setBlockedUsers(users);
        return true;
    }

    // 移除屏蔽用户
    function removeBlockedUser(username) {
        const users = getBlockedUsers();
        const filteredUsers = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
        setBlockedUsers(filteredUsers);
        return users.length !== filteredUsers.length;
    }

    // 检查用户是否被屏蔽
    function isUserBlocked(username) {
        if (!username) return false;
        
        const users = getBlockedUsers();
        const config = getBlockerConfig();
        
        return users.some(user => {
            const testUsername = config.caseSensitive ? username : username.toLowerCase();
            const testBlockedUser = config.caseSensitive ? user.username : user.username.toLowerCase();
            return testUsername === testBlockedUser;
        });
    }

    // 获取屏蔽器配置
    function getBlockerConfig() {
        const savedConfig = localStorage.getItem(BLOCKER_CONFIG_KEY);
        if (savedConfig) {
            return { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) };
        }
        return { ...DEFAULT_CONFIG };
    }

    // 设置屏蔽器配置
    function setBlockerConfig(config) {
        localStorage.setItem(BLOCKER_CONFIG_KEY, JSON.stringify(config));
    }

    // 更新屏蔽器配置
    function updateBlockerConfig(updates) {
        const config = getBlockerConfig();
        const newConfig = { ...config, ...updates };
        setBlockerConfig(newConfig);
        return newConfig;
    }

    // 屏蔽内容处理
    function processBlockedContent() {
        const config = getBlockerConfig();
        if (!config.enabled) return;

        let blockedCount = 0;

        // 处理帖子标题和内容
        const processTextElements = () => {
            const textSelectors = [
                '.topic-title', // 帖子标题
                '.topic-content', // 帖子内容
                '.comment-content', // 评论内容
                '.reply-content', // 回复内容
                '.post-content', // 帖子内容
                '.message-content' // 消息内容
            ];

            textSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element.dataset.blockerProcessed) return; // 避免重复处理
                    
                    const text = element.textContent || element.innerText;
                    if (text && isKeywordBlocked(text)) {
                        if (config.hideBlockedContent) {
                            element.style.display = 'none';
                        } else {
                            element.style.opacity = '0.3';
                            element.style.filter = 'blur(2px)';
                        }
                        blockedCount++;
                        element.dataset.blockerProcessed = 'true';
                    }
                });
            });
        };

        // 处理用户相关元素
        const processUserElements = () => {
            const userSelectors = [
                '.username',
                '.user-name',
                '.author',
                '.post-author',
                '.comment-author'
            ];

            userSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element.dataset.blockerProcessed) return;
                    
                    const username = element.textContent || element.innerText;
                    if (username && isUserBlocked(username)) {
                        // 找到包含该用户的整个帖子/评论容器
                        let container = element.closest('.topic-item, .comment-item, .post-item, .reply-item');
                        if (!container) {
                            container = element.parentElement;
                        }
                        
                        if (container) {
                            if (config.hideBlockedContent) {
                                container.style.display = 'none';
                            } else {
                                container.style.opacity = '0.3';
                                container.style.filter = 'blur(2px)';
                            }
                            blockedCount++;
                            container.dataset.blockerProcessed = 'true';
                        }
                    }
                });
            });
        };

        // 执行屏蔽处理
        processTextElements();
        processUserElements();

        // 显示屏蔽统计
        if (config.showBlockedCount && blockedCount > 0) {
            showBlockedCount(blockedCount);
        }
    }

    // 显示屏蔽统计
    function showBlockedCount(count) {
        let countElement = document.getElementById('blocker-count');
        if (!countElement) {
            countElement = document.createElement('div');
            countElement.id = 'blocker-count';
            countElement.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: #ff4444;
                color: white;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                z-index: 10000;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            `;
            document.body.appendChild(countElement);
        }
        
        countElement.textContent = `已屏蔽 ${count} 项内容`;
        
        // 3秒后自动隐藏
        setTimeout(() => {
            if (countElement && countElement.parentNode) {
                countElement.parentNode.removeChild(countElement);
            }
        }, 3000);
    }

    // 导出配置
    function exportBlockerConfig() {
        const config = {
            keywords: getBlockedKeywords(),
            users: getBlockedUsers(),
            settings: getBlockerConfig(),
            exportTime: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nodeseek_blocker_config_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return config;
    }

    // 导入配置
    function importBlockerConfig(configData) {
        try {
            if (typeof configData === 'string') {
                configData = JSON.parse(configData);
            }

            let importCount = 0;

            // 导入关键词
            if (configData.keywords && Array.isArray(configData.keywords)) {
                setBlockedKeywords(configData.keywords);
                importCount += configData.keywords.length;
            }

            // 导入用户
            if (configData.users && Array.isArray(configData.users)) {
                setBlockedUsers(configData.users);
                importCount += configData.users.length;
            }

            // 导入设置
            if (configData.settings && typeof configData.settings === 'object') {
                setBlockerConfig(configData.settings);
            }

            return {
                success: true,
                count: importCount,
                message: `成功导入 ${importCount} 项配置`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '导入配置失败：' + error.message
            };
        }
    }

    // 清空所有屏蔽数据
    function clearAllBlockedData() {
        setBlockedKeywords([]);
        setBlockedUsers([]);
        setBlockerConfig(DEFAULT_CONFIG);
        return true;
    }

    // 获取屏蔽统计信息
    function getBlockerStats() {
        const keywords = getBlockedKeywords();
        const users = getBlockedUsers();
        const config = getBlockerConfig();

        return {
            totalKeywords: keywords.length,
            totalUsers: users.length,
            enabled: config.enabled,
            hideContent: config.hideBlockedContent,
            showCount: config.showBlockedCount,
            caseSensitive: config.caseSensitive,
            matchMode: config.matchMode
        };
    }

    // 监听DOM变化，自动处理新内容
    function initAutoProcess() {
        const observer = new MutationObserver((mutations) => {
            let shouldProcess = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldProcess = true;
                }
            });

            if (shouldProcess) {
                // 延迟处理，确保DOM完全加载
                setTimeout(processBlockedContent, 100);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        return observer;
    }

    // 初始化屏蔽功能
    function initBlocker() {
        const config = getBlockerConfig();
        if (config.enabled) {
            // 初始处理
            processBlockedContent();
            
            // 启动自动处理
            initAutoProcess();
            
            // 定期处理（防止遗漏）
            setInterval(processBlockedContent, 5000);
        }
    }

    // 显示屏蔽管理弹窗
    function showBlockerDialog() {
        // 检查弹窗是否已存在
        const existingDialog = document.getElementById('blocker-dialog');
        if (existingDialog) {
            existingDialog.remove();
            return;
        }

        const dialog = document.createElement('div');
        dialog.id = 'blocker-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10001;
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            padding: 20px;
            max-width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
            font-family: Arial, sans-serif;
        `;

        // 标题和关闭按钮
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        `;

        const title = document.createElement('h3');
        title.textContent = '屏蔽管理';
        title.style.margin = '0';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
        `;
        closeBtn.onclick = () => dialog.remove();

        header.appendChild(title);
        header.appendChild(closeBtn);
        dialog.appendChild(header);

        // 创建标签页
        const tabContainer = document.createElement('div');
        tabContainer.style.cssText = `
            display: flex;
            border-bottom: 1px solid #ddd;
            margin-bottom: 20px;
        `;

        const createTab = (text, active = false) => {
            const tab = document.createElement('button');
            tab.textContent = text;
            tab.style.cssText = `
                background: ${active ? '#007bff' : '#f8f9fa'};
                color: ${active ? 'white' : '#333'};
                border: 1px solid #ddd;
                border-bottom: none;
                padding: 10px 20px;
                cursor: pointer;
                margin-right: 5px;
                border-radius: 5px 5px 0 0;
            `;
            return tab;
        };

        const keywordsTab = createTab('关键词屏蔽', true);
        const usersTab = createTab('用户屏蔽');
        const settingsTab = createTab('设置');

        tabContainer.appendChild(keywordsTab);
        tabContainer.appendChild(usersTab);
        tabContainer.appendChild(settingsTab);
        dialog.appendChild(tabContainer);

        // 内容区域
        const contentArea = document.createElement('div');
        contentArea.id = 'blocker-content-area';
        dialog.appendChild(contentArea);

        // 关键词屏蔽页面
        function showKeywordsTab() {
            contentArea.innerHTML = '';
            
            const keywords = getBlockedKeywords();
            const config = getBlockerConfig();

            // 添加关键词表单
            const addForm = document.createElement('div');
            addForm.style.cssText = `
                margin-bottom: 20px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 5px;
            `;

            const formTitle = document.createElement('h4');
            formTitle.textContent = '添加屏蔽关键词';
            formTitle.style.margin = '0 0 10px 0';

            const keywordInput = document.createElement('input');
            keywordInput.type = 'text';
            keywordInput.placeholder = '输入要屏蔽的关键词';
            keywordInput.style.cssText = `
                width: 60%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-right: 10px;
            `;

            const remarkInput = document.createElement('input');
            remarkInput.type = 'text';
            remarkInput.placeholder = '备注（可选）';
            remarkInput.style.cssText = `
                width: 25%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-right: 10px;
            `;

            const addBtn = document.createElement('button');
            addBtn.textContent = '添加';
            addBtn.style.cssText = `
                padding: 8px 15px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;

            addBtn.onclick = () => {
                const keyword = keywordInput.value.trim();
                const remark = remarkInput.value.trim();
                if (keyword) {
                    addBlockedKeyword(keyword, remark);
                    keywordInput.value = '';
                    remarkInput.value = '';
                    showKeywordsTab(); // 刷新列表
                }
            };

            addForm.appendChild(formTitle);
            addForm.appendChild(keywordInput);
            addForm.appendChild(remarkInput);
            addForm.appendChild(addBtn);
            contentArea.appendChild(addForm);

            // 关键词列表
            const listTitle = document.createElement('h4');
            listTitle.textContent = `已屏蔽关键词 (${keywords.length}个)`;
            listTitle.style.margin = '20px 0 10px 0';
            contentArea.appendChild(listTitle);

            if (keywords.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = '暂无屏蔽关键词';
                empty.style.cssText = `
                    text-align: center;
                    color: #666;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 5px;
                `;
                contentArea.appendChild(empty);
            } else {
                const table = document.createElement('table');
                table.style.cssText = `
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                `;

                table.innerHTML = `
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">关键词</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">备注</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">添加时间</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${keywords.map(item => `
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.keyword}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.remark || '-'}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(item.createdAt).toLocaleString()}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                                    <button onclick="window.NodeSeekBlocker.removeBlockedKeyword('${item.keyword}'); window.NodeSeekBlocker.showBlockerDialog();" 
                                            style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                                        删除
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                `;

                contentArea.appendChild(table);
            }
        }

        // 用户屏蔽页面
        function showUsersTab() {
            contentArea.innerHTML = '';
            
            const users = getBlockedUsers();

            // 添加用户表单
            const addForm = document.createElement('div');
            addForm.style.cssText = `
                margin-bottom: 20px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 5px;
            `;

            const formTitle = document.createElement('h4');
            formTitle.textContent = '添加屏蔽用户';
            formTitle.style.margin = '0 0 10px 0';

            const usernameInput = document.createElement('input');
            usernameInput.type = 'text';
            usernameInput.placeholder = '输入要屏蔽的用户名';
            usernameInput.style.cssText = `
                width: 60%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-right: 10px;
            `;

            const remarkInput = document.createElement('input');
            remarkInput.type = 'text';
            remarkInput.placeholder = '备注（可选）';
            remarkInput.style.cssText = `
                width: 25%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-right: 10px;
            `;

            const addBtn = document.createElement('button');
            addBtn.textContent = '添加';
            addBtn.style.cssText = `
                padding: 8px 15px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;

            addBtn.onclick = () => {
                const username = usernameInput.value.trim();
                const remark = remarkInput.value.trim();
                if (username) {
                    addBlockedUser(username, remark);
                    usernameInput.value = '';
                    remarkInput.value = '';
                    showUsersTab(); // 刷新列表
                }
            };

            addForm.appendChild(formTitle);
            addForm.appendChild(usernameInput);
            addForm.appendChild(remarkInput);
            addForm.appendChild(addBtn);
            contentArea.appendChild(addForm);

            // 用户列表
            const listTitle = document.createElement('h4');
            listTitle.textContent = `已屏蔽用户 (${users.length}个)`;
            listTitle.style.margin = '20px 0 10px 0';
            contentArea.appendChild(listTitle);

            if (users.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = '暂无屏蔽用户';
                empty.style.cssText = `
                    text-align: center;
                    color: #666;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 5px;
                `;
                contentArea.appendChild(empty);
            } else {
                const table = document.createElement('table');
                table.style.cssText = `
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                `;

                table.innerHTML = `
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">用户名</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">备注</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">添加时间</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(item => `
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.username}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.remark || '-'}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(item.createdAt).toLocaleString()}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                                    <button onclick="window.NodeSeekBlocker.removeBlockedUser('${item.username}'); window.NodeSeekBlocker.showBlockerDialog();" 
                                            style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                                        删除
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                `;

                contentArea.appendChild(table);
            }
        }

        // 设置页面
        function showSettingsTab() {
            contentArea.innerHTML = '';
            
            const config = getBlockerConfig();
            const stats = getBlockerStats();

            // 统计信息
            const statsDiv = document.createElement('div');
            statsDiv.style.cssText = `
                margin-bottom: 20px;
                padding: 15px;
                background: #e9ecef;
                border-radius: 5px;
            `;
            statsDiv.innerHTML = `
                <h4 style="margin: 0 0 10px 0;">统计信息</h4>
                <p style="margin: 5px 0;">屏蔽关键词: ${stats.totalKeywords} 个</p>
                <p style="margin: 5px 0;">屏蔽用户: ${stats.totalUsers} 个</p>
            `;
            contentArea.appendChild(statsDiv);

            // 设置选项
            const settingsDiv = document.createElement('div');
            settingsDiv.style.cssText = `
                margin-bottom: 20px;
            `;

            const settingsTitle = document.createElement('h4');
            settingsTitle.textContent = '屏蔽设置';
            settingsTitle.style.margin = '0 0 15px 0';
            settingsDiv.appendChild(settingsTitle);

            // 启用/禁用屏蔽
            const enableDiv = document.createElement('div');
            enableDiv.style.cssText = `
                margin-bottom: 10px;
                display: flex;
                align-items: center;
            `;
            
            const enableCheckbox = document.createElement('input');
            enableCheckbox.type = 'checkbox';
            enableCheckbox.checked = config.enabled;
            enableCheckbox.style.marginRight = '10px';
            
            const enableLabel = document.createElement('label');
            enableLabel.textContent = '启用屏蔽功能';
            enableLabel.style.cursor = 'pointer';
            
            enableCheckbox.onchange = () => {
                updateBlockerConfig({ enabled: enableCheckbox.checked });
            };
            
            enableDiv.appendChild(enableCheckbox);
            enableDiv.appendChild(enableLabel);
            settingsDiv.appendChild(enableDiv);

            // 隐藏屏蔽内容
            const hideDiv = document.createElement('div');
            hideDiv.style.cssText = `
                margin-bottom: 10px;
                display: flex;
                align-items: center;
            `;
            
            const hideCheckbox = document.createElement('input');
            hideCheckbox.type = 'checkbox';
            hideCheckbox.checked = config.hideBlockedContent;
            hideCheckbox.style.marginRight = '10px';
            
            const hideLabel = document.createElement('label');
            hideLabel.textContent = '完全隐藏屏蔽内容（否则显示为半透明）';
            hideLabel.style.cursor = 'pointer';
            
            hideCheckbox.onchange = () => {
                updateBlockerConfig({ hideBlockedContent: hideCheckbox.checked });
            };
            
            hideDiv.appendChild(hideCheckbox);
            hideDiv.appendChild(hideLabel);
            settingsDiv.appendChild(hideDiv);

            // 显示屏蔽统计
            const countDiv = document.createElement('div');
            countDiv.style.cssText = `
                margin-bottom: 10px;
                display: flex;
                align-items: center;
            `;
            
            const countCheckbox = document.createElement('input');
            countCheckbox.type = 'checkbox';
            countCheckbox.checked = config.showBlockedCount;
            countCheckbox.style.marginRight = '10px';
            
            const countLabel = document.createElement('label');
            countLabel.textContent = '显示屏蔽统计';
            countLabel.style.cursor = 'pointer';
            
            countCheckbox.onchange = () => {
                updateBlockerConfig({ showBlockedCount: countCheckbox.checked });
            };
            
            countDiv.appendChild(countCheckbox);
            countDiv.appendChild(countLabel);
            settingsDiv.appendChild(countDiv);

            // 大小写敏感
            const caseDiv = document.createElement('div');
            caseDiv.style.cssText = `
                margin-bottom: 10px;
                display: flex;
                align-items: center;
            `;
            
            const caseCheckbox = document.createElement('input');
            caseCheckbox.type = 'checkbox';
            caseCheckbox.checked = config.caseSensitive;
            caseCheckbox.style.marginRight = '10px';
            
            const caseLabel = document.createElement('label');
            caseLabel.textContent = '大小写敏感';
            caseLabel.style.cursor = 'pointer';
            
            caseCheckbox.onchange = () => {
                updateBlockerConfig({ caseSensitive: caseCheckbox.checked });
            };
            
            caseDiv.appendChild(caseCheckbox);
            caseDiv.appendChild(caseLabel);
            settingsDiv.appendChild(caseDiv);

            // 匹配模式
            const matchDiv = document.createElement('div');
            matchDiv.style.cssText = `
                margin-bottom: 10px;
                display: flex;
                align-items: center;
            `;
            
            const matchLabel = document.createElement('label');
            matchLabel.textContent = '匹配模式: ';
            matchLabel.style.marginRight = '10px';
            
            const matchSelect = document.createElement('select');
            matchSelect.style.cssText = `
                padding: 5px;
                border: 1px solid #ddd;
                border-radius: 4px;
            `;
            
            const options = [
                { value: 'contains', text: '包含匹配' },
                { value: 'exact', text: '精确匹配' },
                { value: 'regex', text: '正则表达式' }
            ];
            
            options.forEach(option => {
                const opt = document.createElement('option');
                opt.value = option.value;
                opt.textContent = option.text;
                opt.selected = config.matchMode === option.value;
                matchSelect.appendChild(opt);
            });
            
            matchSelect.onchange = () => {
                updateBlockerConfig({ matchMode: matchSelect.value });
            };
            
            matchDiv.appendChild(matchLabel);
            matchDiv.appendChild(matchSelect);
            settingsDiv.appendChild(matchDiv);

            contentArea.appendChild(settingsDiv);

            // 数据管理
            const dataDiv = document.createElement('div');
            dataDiv.style.cssText = `
                margin-bottom: 20px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 5px;
            `;

            const dataTitle = document.createElement('h4');
            dataTitle.textContent = '数据管理';
            dataTitle.style.margin = '0 0 15px 0';
            dataDiv.appendChild(dataTitle);

            // 导出配置按钮
            const exportBtn = document.createElement('button');
            exportBtn.textContent = '导出配置';
            exportBtn.style.cssText = `
                padding: 8px 15px;
                background: #17a2b8;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                margin-right: 10px;
            `;
            exportBtn.onclick = () => {
                exportBlockerConfig();
            };

            // 导入配置按钮
            const importBtn = document.createElement('button');
            importBtn.textContent = '导入配置';
            importBtn.style.cssText = `
                padding: 8px 15px;
                background: #6f42c1;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                margin-right: 10px;
            `;
            importBtn.onclick = () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const result = importBlockerConfig(e.target.result);
                                if (result.success) {
                                    alert(result.message);
                                    showSettingsTab(); // 刷新页面
                                } else {
                                    alert(result.message);
                                }
                            } catch (error) {
                                alert('导入失败: ' + error.message);
                            }
                        };
                        reader.readAsText(file);
                    }
                };
                input.click();
            };

            // 清空数据按钮
            const clearBtn = document.createElement('button');
            clearBtn.textContent = '清空所有数据';
            clearBtn.style.cssText = `
                padding: 8px 15px;
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;
            clearBtn.onclick = () => {
                if (confirm('确定要清空所有屏蔽数据吗？此操作不可恢复！')) {
                    clearAllBlockedData();
                    alert('数据已清空');
                    showSettingsTab(); // 刷新页面
                }
            };

            dataDiv.appendChild(exportBtn);
            dataDiv.appendChild(importBtn);
            dataDiv.appendChild(clearBtn);
            contentArea.appendChild(dataDiv);
        }

        // 标签页切换事件
        keywordsTab.onclick = () => {
            keywordsTab.style.background = '#007bff';
            keywordsTab.style.color = 'white';
            usersTab.style.background = '#f8f9fa';
            usersTab.style.color = '#333';
            settingsTab.style.background = '#f8f9fa';
            settingsTab.style.color = '#333';
            showKeywordsTab();
        };

        usersTab.onclick = () => {
            usersTab.style.background = '#007bff';
            usersTab.style.color = 'white';
            keywordsTab.style.background = '#f8f9fa';
            keywordsTab.style.color = '#333';
            settingsTab.style.background = '#f8f9fa';
            settingsTab.style.color = '#333';
            showUsersTab();
        };

        settingsTab.onclick = () => {
            settingsTab.style.background = '#007bff';
            settingsTab.style.color = 'white';
            keywordsTab.style.background = '#f8f9fa';
            keywordsTab.style.color = '#333';
            usersTab.style.background = '#f8f9fa';
            usersTab.style.color = '#333';
            showSettingsTab();
        };

        // 默认显示关键词页面
        showKeywordsTab();

        document.body.appendChild(dialog);
    }

    // 暴露到全局对象
    window.NodeSeekBlocker = {
        // 关键词管理
        getBlockedKeywords,
        setBlockedKeywords,
        addBlockedKeyword,
        removeBlockedKeyword,
        isKeywordBlocked,
        
        // 用户管理
        getBlockedUsers,
        setBlockedUsers,
        addBlockedUser,
        removeBlockedUser,
        isUserBlocked,
        
        // 配置管理
        getBlockerConfig,
        setBlockerConfig,
        updateBlockerConfig,
        
        // 功能控制
        processBlockedContent,
        showBlockedCount,
        initBlocker,
        showBlockerDialog,
        
        // 数据管理
        exportBlockerConfig,
        importBlockerConfig,
        clearAllBlockedData,
        getBlockerStats
    };

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBlocker);
    } else {
        initBlocker();
    }

})();
