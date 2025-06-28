// ==========快捷回复功能==========
(function() {
    'use strict';

    // 快捷回复系统类
    class QuickReplySystem {
        constructor() {
            this.addLogFunction = null;
            this.predefinedReplies = [
                {
                    category: '常用回复',
                    items: [
                        '感谢分享！',
                        '已收藏，谢谢！',
                        '非常有用的信息',
                        '学到了，感谢楼主',
                        '支持一下！',
                        '同意楼主观点',
                        '确实如此',
                        '我也遇到过同样的问题'
                    ]
                },
                {
                    category: '技术讨论',
                    items: [
                        '这个方案确实可行',
                        '建议再考虑一下稳定性',
                        '有没有更详细的教程？',
                        '性能表现如何？',
                        '兼容性怎么样？',
                        '安全性有保障吗？',
                        '成本大概多少？',
                        '部署复杂度如何？'
                    ]
                },
                {
                    category: '询问相关',
                    items: [
                        '请问具体怎么操作？',
                        '能提供更多细节吗？',
                        '有相关文档链接吗？',
                        '这个问题解决了吗？',
                        '楼主还在吗？',
                        '能否分享一下经验？',
                        '有遇到过坑吗？',
                        '后续有更新吗？'
                    ]
                },
                {
                    category: '礼貌用语',
                    items: [
                        '打个卡，mark一下',
                        '坐等大佬回复',
                        '新手求教',
                        '先收藏再研究',
                        '感谢大佬无私分享',
                        '实用！已加书签',
                        '很详细，赞一个',
                        '干货满满，收藏了'
                    ]
                },
                {
                    category: '购买相关',
                    items: [
                        '价格如何？',
                        '还有库存吗？',
                        '支持什么付款方式？',
                        '售后服务怎么样？',
                        '有优惠券吗？',
                        '发货速度快吗？',
                        '质量有保证吗？',
                        'PM详谈'
                    ]
                }
            ];
            
            // 自定义回复存储
            this.customRepliesKey = 'nodeseek_custom_replies';
            this.init();
        }

        init() {
            // 只在NodeSeek网站运行
            if (window.location.hostname !== 'www.nodeseek.com') {
                return;
            }
            
            // 注册全局接口
            window.NodeSeekQuickReply = this;
        }

        // 设置日志记录函数
        setAddLogFunction(addLogFn) {
            this.addLogFunction = addLogFn;
        }

        // 添加日志
        addLog(message) {
            if (typeof this.addLogFunction === 'function') {
                this.addLogFunction(message);
            } else {
                console.log(`[快捷回复] ${message}`);
            }
        }

        // 获取自定义回复
        getCustomReplies() {
            try {
                return JSON.parse(localStorage.getItem(this.customRepliesKey) || '[]');
            } catch (e) {
                return [];
            }
        }

        // 保存自定义回复
        saveCustomReplies(replies) {
            localStorage.setItem(this.customRepliesKey, JSON.stringify(replies));
        }

        // 添加自定义回复
        addCustomReply(content) {
            const customReplies = this.getCustomReplies();
            if (!customReplies.includes(content)) {
                customReplies.unshift(content); // 添加到最前面
                // 限制最多20条自定义回复
                if (customReplies.length > 20) {
                    customReplies.length = 20;
                }
                this.saveCustomReplies(customReplies);
                return true;
            }
            return false;
        }

        // 删除自定义回复
        removeCustomReply(content) {
            const customReplies = this.getCustomReplies();
            const index = customReplies.indexOf(content);
            if (index > -1) {
                customReplies.splice(index, 1);
                this.saveCustomReplies(customReplies);
                return true;
            }
            return false;
        }

        // 获取当前页面的帖子ID
        getCurrentTopicId() {
            // 从URL中提取帖子ID
            const pathname = window.location.pathname;
            
            // 匹配 /topic/数字 格式
            let match = pathname.match(/\/topic\/(\d+)/);
            if (match) {
                return match[1];
            }
            
            // 匹配 /post-数字 格式  
            match = pathname.match(/\/post-(\d+)/);
            if (match) {
                return match[1];
            }
            
            return null;
        }

        // 检查是否在回复页面
        isReplyPage() {
            const topicId = this.getCurrentTopicId();
            return topicId !== null;
        }

        // 发送回复API
        async sendReply(content, topicId) {
            try {
                // 构建回复数据
                const replyData = {
                    content: content,
                    topic_id: topicId
                };

                // 发送POST请求到回复API
                const response = await fetch('/api/topics/' + topicId + '/replies', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(replyData)
                });

                if (response.ok) {
                    const result = await response.json();
                    this.addLog('✅ 回复发送成功');
                    
                    // 刷新页面显示新回复
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                    
                    return { success: true, data: result };
                } else {
                    const errorText = await response.text();
                    this.addLog(`❌ 回复发送失败: HTTP ${response.status}`);
                    console.error('回复失败:', errorText);
                    return { success: false, error: `HTTP ${response.status}` };
                }
            } catch (error) {
                this.addLog(`❌ 回复发送异常: ${error.message}`);
                console.error('回复异常:', error);
                return { success: false, error: error.message };
            }
        }

        // 显示快捷回复弹窗
        showQuickReplyDialog() {
            // 检查是否在合适的页面
            if (!this.isReplyPage()) {
                alert('当前页面不支持快捷回复功能');
                return;
            }

            // 检查弹窗是否已存在
            const existingDialog = document.getElementById('quick-reply-dialog');
            if (existingDialog) {
                existingDialog.remove();
                return;
            }

            const topicId = this.getCurrentTopicId();
            
            // 创建弹窗
            const dialog = document.createElement('div');
            dialog.id = 'quick-reply-dialog';
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10001;
                background: #fff;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
            `;

            // 创建标题栏
            const header = document.createElement('div');
            header.style.cssText = `
                padding: 16px 20px;
                border-bottom: 1px solid #eee;
                background: #f8f9fa;
                border-radius: 8px 8px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            const title = document.createElement('h3');
            title.textContent = '快捷回复';
            title.style.cssText = `
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #333;
            `;

            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                font-size: 24px;
                color: #666;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            closeBtn.onmouseover = () => closeBtn.style.background = '#eee';
            closeBtn.onmouseout = () => closeBtn.style.background = 'none';
            closeBtn.onclick = () => dialog.remove();

            header.appendChild(title);
            header.appendChild(closeBtn);

            // 创建内容区域
            const content = document.createElement('div');
            content.style.cssText = `
                padding: 0;
                max-height: 60vh;
                overflow-y: auto;
            `;

            // 创建标签页容器
            const tabContainer = document.createElement('div');
            tabContainer.style.cssText = `
                display: flex;
                border-bottom: 1px solid #eee;
                background: #f8f9fa;
            `;

            // 标签页数据
            const tabs = [
                { name: '预设回复', id: 'predefined' },
                { name: '自定义回复', id: 'custom' },
                { name: '自由输入', id: 'freestyle' }
            ];

            const tabContents = {};
            let activeTab = 'predefined';

            // 创建标签页
            tabs.forEach(tab => {
                const tabBtn = document.createElement('button');
                tabBtn.textContent = tab.name;
                tabBtn.style.cssText = `
                    padding: 12px 20px;
                    border: none;
                    background: none;
                    cursor: pointer;
                    font-size: 14px;
                    color: #666;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s;
                `;

                tabBtn.onclick = () => {
                    // 更新活跃标签
                    tabContainer.querySelectorAll('button').forEach(btn => {
                        btn.style.color = '#666';
                        btn.style.borderBottomColor = 'transparent';
                        btn.style.background = 'none';
                    });
                    tabBtn.style.color = '#1890ff';
                    tabBtn.style.borderBottomColor = '#1890ff';
                    tabBtn.style.background = '#fff';

                    // 显示对应内容
                    Object.values(tabContents).forEach(tc => tc.style.display = 'none');
                    tabContents[tab.id].style.display = 'block';
                    activeTab = tab.id;
                };

                // 默认激活第一个标签
                if (tab.id === activeTab) {
                    tabBtn.style.color = '#1890ff';
                    tabBtn.style.borderBottomColor = '#1890ff';
                    tabBtn.style.background = '#fff';
                }

                tabContainer.appendChild(tabBtn);
            });

            // 创建预设回复内容
            const predefinedContent = document.createElement('div');
            predefinedContent.style.cssText = `
                padding: 16px;
                display: block;
            `;

            this.predefinedReplies.forEach(category => {
                const categoryDiv = document.createElement('div');
                categoryDiv.style.marginBottom = '20px';

                const categoryTitle = document.createElement('h4');
                categoryTitle.textContent = category.category;
                categoryTitle.style.cssText = `
                    margin: 0 0 10px 0;
                    font-size: 14px;
                    color: #333;
                    font-weight: 600;
                `;

                const itemsDiv = document.createElement('div');
                itemsDiv.style.cssText = `
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                `;

                category.items.forEach(item => {
                    const itemBtn = document.createElement('button');
                    itemBtn.textContent = item;
                    itemBtn.style.cssText = `
                        padding: 6px 12px;
                        border: 1px solid #d9d9d9;
                        border-radius: 4px;
                        background: #fff;
                        color: #333;
                        cursor: pointer;
                        font-size: 13px;
                        transition: all 0.2s;
                        white-space: nowrap;
                    `;
                    itemBtn.onmouseover = () => {
                        itemBtn.style.borderColor = '#1890ff';
                        itemBtn.style.color = '#1890ff';
                    };
                    itemBtn.onmouseout = () => {
                        itemBtn.style.borderColor = '#d9d9d9';
                        itemBtn.style.color = '#333';
                    };
                    itemBtn.onclick = () => this.handleReplySelect(item, topicId, dialog);

                    itemsDiv.appendChild(itemBtn);
                });

                categoryDiv.appendChild(categoryTitle);
                categoryDiv.appendChild(itemsDiv);
                predefinedContent.appendChild(categoryDiv);
            });

            tabContents['predefined'] = predefinedContent;

            // 创建自定义回复内容
            const customContent = document.createElement('div');
            customContent.style.cssText = `
                padding: 16px;
                display: none;
            `;

            // 自定义回复输入区
            const customInputArea = document.createElement('div');
            customInputArea.style.marginBottom = '16px';

            const customInput = document.createElement('input');
            customInput.type = 'text';
            customInput.placeholder = '输入自定义回复内容...';
            customInput.style.cssText = `
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #d9d9d9;
                border-radius: 4px;
                font-size: 14px;
                margin-bottom: 8px;
                box-sizing: border-box;
            `;

            const addCustomBtn = document.createElement('button');
            addCustomBtn.textContent = '添加到自定义回复';
            addCustomBtn.style.cssText = `
                padding: 8px 16px;
                background: #1890ff;
                color: #fff;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;
            addCustomBtn.onclick = () => {
                const content = customInput.value.trim();
                if (content) {
                    if (this.addCustomReply(content)) {
                        customInput.value = '';
                        this.addLog('✅ 自定义回复已添加');
                        this.refreshCustomReplies(customRepliesDiv, topicId, dialog);
                    } else {
                        alert('该回复已存在');
                    }
                } else {
                    alert('请输入回复内容');
                }
            };

            // 自定义回复列表
            const customRepliesDiv = document.createElement('div');
            this.refreshCustomReplies(customRepliesDiv, topicId, dialog);

            customInputArea.appendChild(customInput);
            customInputArea.appendChild(addCustomBtn);
            customContent.appendChild(customInputArea);
            customContent.appendChild(customRepliesDiv);

            tabContents['custom'] = customContent;

            // 创建自由输入内容
            const freestyleContent = document.createElement('div');
            freestyleContent.style.cssText = `
                padding: 16px;
                display: none;
            `;

            const freestyleTextarea = document.createElement('textarea');
            freestyleTextarea.placeholder = '输入你的回复内容...';
            freestyleTextarea.style.cssText = `
                width: 100%;
                height: 120px;
                padding: 12px;
                border: 1px solid #d9d9d9;
                border-radius: 4px;
                font-size: 14px;
                resize: vertical;
                font-family: inherit;
                box-sizing: border-box;
                margin-bottom: 12px;
            `;

            const freestyleSendBtn = document.createElement('button');
            freestyleSendBtn.textContent = '发送回复';
            freestyleSendBtn.style.cssText = `
                padding: 10px 20px;
                background: #52c41a;
                color: #fff;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            `;
            freestyleSendBtn.onclick = () => {
                const content = freestyleTextarea.value.trim();
                if (content) {
                    this.handleReplySelect(content, topicId, dialog);
                } else {
                    alert('请输入回复内容');
                }
            };

            freestyleContent.appendChild(freestyleTextarea);
            freestyleContent.appendChild(freestyleSendBtn);

            tabContents['freestyle'] = freestyleContent;

            // 组装弹窗
            content.appendChild(tabContainer);
            content.appendChild(predefinedContent);
            content.appendChild(customContent);
            content.appendChild(freestyleContent);

            dialog.appendChild(header);
            dialog.appendChild(content);

            // 添加到页面
            document.body.appendChild(dialog);

            // 添加背景遮罩
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10000;
            `;
            overlay.onclick = () => {
                dialog.remove();
                overlay.remove();
            };
            document.body.insertBefore(overlay, dialog);

            // 点击弹窗外部关闭
            dialog.onclick = (e) => e.stopPropagation();
        }

        // 刷新自定义回复列表
        refreshCustomReplies(container, topicId, dialog) {
            container.innerHTML = '';
            const customReplies = this.getCustomReplies();

            if (customReplies.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.textContent = '暂无自定义回复';
                emptyDiv.style.cssText = `
                    text-align: center;
                    color: #999;
                    padding: 20px;
                    font-style: italic;
                `;
                container.appendChild(emptyDiv);
                return;
            }

            customReplies.forEach(reply => {
                const replyDiv = document.createElement('div');
                replyDiv.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    border: 1px solid #f0f0f0;
                    border-radius: 4px;
                    margin-bottom: 8px;
                    background: #fafafa;
                `;

                const replyText = document.createElement('span');
                replyText.textContent = reply;
                replyText.style.cssText = `
                    flex: 1;
                    cursor: pointer;
                    color: #333;
                `;
                replyText.onclick = () => this.handleReplySelect(reply, topicId, dialog);

                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '×';
                deleteBtn.style.cssText = `
                    background: none;
                    border: none;
                    color: #999;
                    cursor: pointer;
                    font-size: 16px;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    border-radius: 2px;
                `;
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm('确定删除这条自定义回复吗？')) {
                        if (this.removeCustomReply(reply)) {
                            this.addLog('✅ 自定义回复已删除');
                            this.refreshCustomReplies(container, topicId, dialog);
                        }
                    }
                };

                replyDiv.appendChild(replyText);
                replyDiv.appendChild(deleteBtn);
                container.appendChild(replyDiv);
            });
        }

        // 处理回复选择
        async handleReplySelect(content, topicId, dialog) {
            if (!confirm(`确定发送以下回复吗？\n\n${content}`)) {
                return;
            }

            // 显示发送中状态
            const loadingDiv = document.createElement('div');
            loadingDiv.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255,255,255,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                color: #1890ff;
                z-index: 1;
            `;
            loadingDiv.textContent = '发送中...';
            dialog.style.position = 'relative';
            dialog.appendChild(loadingDiv);

            try {
                const result = await this.sendReply(content, topicId);
                
                setTimeout(() => {
                    dialog.remove();
                    // 移除背景遮罩
                    const overlay = document.querySelector('div[style*="rgba(0,0,0,0.5)"]');
                    if (overlay) overlay.remove();
                }, 500);

            } catch (error) {
                loadingDiv.remove();
                alert('发送失败，请重试');
            }
        }
    }

    // 启动系统
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new QuickReplySystem();
        });
    } else {
        new QuickReplySystem();
    }

})(); 
