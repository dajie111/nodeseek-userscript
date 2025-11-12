// ========== 快捷回复功能 ==========
(function() {
    'use strict';

    // 存储键
    const QUICK_REPLY_KEY = 'nodeseek_quick_reply';
    const QUICK_REPLY_CATEGORIES_KEY = 'nodeseek_quick_reply_categories';

    // 默认预设回复文本和分类
    const DEFAULT_REPLIES = {
        '抽奖板块': [
            '感谢分享，参与抽奖！',
            '楼主好人！支持抽奖活动！',
            '参与抽奖，感谢楼主！',
            '好活动，支持一下！',
            '感谢楼主的慷慨分享！'
        ],
        '感谢板块': [
            '感谢楼主的无私分享！',
            '非常感谢，收藏了！',
            '楼主好人，感谢分享！',
            '谢谢分享，很有用！',
            '感谢提供，学习了！'
        ],
        '学习板块': [
            '学习了，感谢分享经验！',
            '很有用的内容，收藏学习！',
            '感谢楼主的详细教程！',
            '学到了新知识，谢谢！',
            '非常实用，马克学习！'
        ],
        '发问板块': [
            '遇到同样问题，关注答案',
            '同求解答，感谢！',
            '我也想知道，坐等大神！',
            '期待有经验的朋友分享！',
            '关注问题，学习一下！'
        ],
        '通用回复': [
            '感谢分享！',
            '支持楼主！',
            '很不错的内容！',
            '学习了！',
            '收藏了，谢谢！'
        ]
    };

    // 获取快捷回复数据
    function getQuickReplies() {
        const stored = localStorage.getItem(QUICK_REPLY_KEY);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                // 如果数据中没有categoryOrder，则从现有分类生成
                if (!data.categoryOrder) {
                    data.categoryOrder = Object.keys(data).filter(key => key !== 'categoryOrder');
                }
                return data;
            } catch (e) {
                console.error('解析快捷回复数据失败:', e);
            }
        }
        // 返回默认数据，包含分类顺序
        const defaultData = JSON.parse(JSON.stringify(DEFAULT_REPLIES));
        defaultData.categoryOrder = Object.keys(DEFAULT_REPLIES);
        return defaultData;
    }

    // 保存快捷回复数据
    function setQuickReplies(data) {
        // 确保数据包含categoryOrder
        if (data && typeof data === 'object' && !data.categoryOrder) {
            data.categoryOrder = Object.keys(data).filter(key => key !== 'categoryOrder');
        }
        localStorage.setItem(QUICK_REPLY_KEY, JSON.stringify(data));
    }

    // 获取分类列表
    function getCategories() {
        const replies = getQuickReplies();
        return replies.categoryOrder;
    }

    // 计算混合长度：中文2，英文/数字1
    function getMixedLength(str) {
        let len = 0;
        for (let ch of str) {
            if (/^[\u4e00-\u9fa5]$/.test(ch)) {
                len += 2;
            } else if (/^[A-Za-z0-9]$/.test(ch)) {
                len += 1;
            } else {
                len += 1; // 其它符号算1
            }
        }
        return len;
    }

    // 添加新分类
    function addCategory(categoryName) {
        const replies = getQuickReplies();
        const actualCategories = replies.categoryOrder ? replies.categoryOrder.length : Object.keys(replies).filter(key => key !== 'categoryOrder').length;
        if (actualCategories >= 5) {
            alert('最多只能添加5个分类');
            return false;
        }
        if (!categoryName || categoryName.trim() === '') return false;
        const trimmedName = categoryName.trim();
        if (getMixedLength(trimmedName) > 8) {
            alert('分类名限中英文混合8字符以内（中文算2，英文/数字算1）');
            return false;
        }
        if (replies[trimmedName]) {
            return false; // 分类已存在
        }
        replies[trimmedName] = [];
        // 将新分类添加到顺序数组的末尾
        if (!replies.categoryOrder) {
            replies.categoryOrder = [];
        }
        replies.categoryOrder.push(trimmedName);
        setQuickReplies(replies);
        return true;
    }

    // 删除分类
    function deleteCategory(categoryName) {
        const replies = getQuickReplies();
        if (replies[categoryName]) {
            delete replies[categoryName];
            // 从顺序数组中移除
            if (replies.categoryOrder) {
                const index = replies.categoryOrder.indexOf(categoryName);
                if (index > -1) {
                    replies.categoryOrder.splice(index, 1);
                }
            }
            setQuickReplies(replies);
            return true;
        }
        return false;
    }

    // 重命名分类
    function renameCategory(oldName, newName) {
        if (!newName || newName.trim() === '' || oldName === newName) return false;

        const replies = getQuickReplies();
        const trimmedNewName = newName.trim();

        if (!replies[oldName] || replies[trimmedNewName]) {
            return false; // 原分类不存在或新分类名已存在
        }

        // 保持分类顺序：重建整个对象，保持原始位置
        const newReplies = {};
        newReplies.categoryOrder = [];
        
        for (const categoryName of replies.categoryOrder) {
            if (categoryName === oldName) {
                newReplies[trimmedNewName] = replies[oldName]; // 在原位置插入新名称
                newReplies.categoryOrder.push(trimmedNewName);
            } else {
                newReplies[categoryName] = replies[categoryName];
                newReplies.categoryOrder.push(categoryName);
            }
        }

        setQuickReplies(newReplies);
        return true;
    }

    // 重新排序分类
    function reorderCategories(newOrder) {
        const replies = getQuickReplies();
        const newReplies = {};

        // 按新顺序重建对象
        newOrder.forEach(categoryName => {
            if (replies[categoryName]) {
                newReplies[categoryName] = replies[categoryName];
            }
        });

        // 更新分类顺序
        newReplies.categoryOrder = newOrder;

        setQuickReplies(newReplies);
        return true;
    }

    // 获取分类下的回复列表
    function getCategoryReplies(categoryName) {
        const replies = getQuickReplies();
        return replies[categoryName] || [];
    }

    // 添加回复到分类
    function addReplyToCategory(categoryName, replyText) {
        if (!replyText || replyText.trim() === '') return false;

        const replies = getQuickReplies();
        if (!replies[categoryName]) {
            replies[categoryName] = [];
        }

        const trimmedText = replyText.trim();

        // 检查是否已存在相同回复
        if (replies[categoryName].includes(trimmedText)) {
            return false;
        }

        // 使用 unshift 将新回复添加到数组开头，显示在最上面
        replies[categoryName].unshift(trimmedText);
        setQuickReplies(replies);
        return true;
    }

    // 删除分类中的回复
    function deleteReplyFromCategory(categoryName, replyText) {
        const replies = getQuickReplies();
        if (!replies[categoryName]) return false;

        const index = replies[categoryName].indexOf(replyText);
        if (index > -1) {
            replies[categoryName].splice(index, 1);
            setQuickReplies(replies);
            return true;
        }
        return false;
    }

    // 编辑回复文本
    function editReplyText(categoryName, oldText, newText) {
        if (!newText || newText.trim() === '' || oldText === newText) return false;

        const replies = getQuickReplies();
        if (!replies[categoryName]) return false;

        const trimmedNewText = newText.trim();
        const index = replies[categoryName].indexOf(oldText);

        if (index > -1 && !replies[categoryName].includes(trimmedNewText)) {
            replies[categoryName][index] = trimmedNewText;
            setQuickReplies(replies);
            return true;
        }
        return false;
    }

    // 重新排序分类中的回复
    function reorderRepliesInCategory(categoryName, newOrder) {
        const replies = getQuickReplies();
        if (!replies[categoryName]) return false;

        // 验证新顺序数组的有效性
        if (newOrder.length !== replies[categoryName].length) return false;

        // 更新回复顺序
        replies[categoryName] = newOrder;
        setQuickReplies(replies);
        return true;
    }

    // 查找编辑器元素
    function findEditor() {
        // 查找CodeMirror编辑器
        const codeMirror = document.querySelector('.CodeMirror');
        if (codeMirror && codeMirror.CodeMirror) {
            return {
                type: 'codemirror',
                element: codeMirror,
                setValue: (text) => codeMirror.CodeMirror.setValue(text),
                getValue: () => codeMirror.CodeMirror.getValue(),
                focus: () => codeMirror.CodeMirror.focus()
            };
        }

        // 查找普通文本框
        const textarea = document.querySelector('textarea[placeholder*="鼓励友善发言"]') ||
                        document.querySelector('#code-mirror-editor textarea') ||
                        document.querySelector('.content-area textarea');

        if (textarea) {
            return {
                type: 'textarea',
                element: textarea,
                setValue: (text) => {
                    textarea.value = text;
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                },
                getValue: () => textarea.value,
                focus: () => textarea.focus()
            };
        }

        return null;
    }

    // 插入回复文本到编辑器
    function insertReplyText(text) {
        const editor = findEditor();
        if (!editor) {
            console.error('未找到编辑器');
            return false;
        }

        const currentText = editor.getValue();
        let newText;

        if (currentText.trim() === '') {
            newText = text;
        } else {
            // 如果已有内容，在末尾添加
            newText = currentText + '\n\n' + text;
        }

        editor.setValue(newText);
        editor.focus();

        return true;
    }

    // 重置为默认回复
    function resetToDefault() {
        const defaultData = JSON.parse(JSON.stringify(DEFAULT_REPLIES));
        defaultData.categoryOrder = Object.keys(DEFAULT_REPLIES);
        setQuickReplies(defaultData);
    }

    // ========== 快捷回复UI功能 ==========

    // 快捷回复弹窗样式
    function addQuickReplyStyles() {
        if (document.getElementById('quick-reply-styles')) return;

        const style = document.createElement('style');
        style.id = 'quick-reply-styles';
        style.textContent = `
            .quick-reply-dialog {
                width: 500px;
                min-width: unset;
                max-width: unset;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .quick-reply-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 15px;
                border-bottom: 1px solid #e0e0e0;
                margin-bottom: 15px;
            }

            .quick-reply-title {
                font-size: 18px;
                font-weight: 600;
                color: #333;
                margin: 0;
                flex-shrink: 0;
            }

            .quick-reply-close {
                background: none;
                border: none;
                font-size: 24px;
                color: #666;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s;
            }

            .quick-reply-close:hover {
                background-color: #f5f5f5;
                color: #333;
            }

            .quick-reply-tabs {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 20px;
                border-bottom: 1px solid #e0e0e0;
                padding-bottom: 10px;
            }

            .quick-reply-tab {
                padding: 8px 16px;
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 20px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
                white-space: nowrap;
            }

            .quick-reply-tab.active {
                background: #9C27B0;
                color: white;
                border-color: #9C27B0;
            }

            .quick-reply-tab:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .quick-reply-content {
                height: 275px;
                overflow-y: auto;
                margin-bottom: 20px;
            }

            .quick-reply-items {
                display: grid;
                gap: 8px;
            }

            .quick-reply-item {
                display: flex;
                align-items: center;
                padding: 12px;
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
            }

            .quick-reply-item:hover {
                background: #e3f2fd;
                border-color: #9C27B0;
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .quick-reply-text {
                flex: 1;
                font-size: 14px;
                color: #333;
                margin-right: 10px;
                word-break: break-word;
            }

            .quick-reply-actions {
                display: flex;
                gap: 8px;
                opacity: 0;
                transition: opacity 0.2s;
            }

            .quick-reply-item:hover .quick-reply-actions {
                opacity: 1;
            }

            .quick-reply-btn-small {
                padding: 4px 8px;
                font-size: 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .quick-reply-btn-edit {
                background: #4CAF50;
                color: white;
            }

            .quick-reply-btn-edit:hover {
                background: #45a049;
            }

            .quick-reply-btn-delete {
                background: #f44336;
                color: white;
            }

            .quick-reply-btn-delete:hover {
                background: #da190b;
            }

            .quick-reply-footer {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                justify-content: space-between;
                align-items: center;
                padding-top: 15px;
                border-top: 1px solid #e0e0e0;
            }

            .quick-reply-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
                min-width: 80px;
            }

            .quick-reply-btn-primary {
                background: #9C27B0;
                color: white;
            }

            .quick-reply-btn-primary:hover {
                background: #7B1FA2;
                transform: translateY(-1px);
            }

            .quick-reply-btn-secondary {
                background: #6c757d;
                color: white;
            }

            .quick-reply-btn-secondary:hover {
                background: #5a6268;
            }

            .quick-reply-btn-success {
                background: #28a745;
                color: white;
            }

            .quick-reply-btn-success:hover {
                background: #218838;
            }

            .quick-reply-btn-warning {
                background: #ffc107;
                color: #212529;
            }

            .quick-reply-btn-warning:hover {
                background: #e0a800;
            }

            .quick-reply-empty {
                text-align: center;
                color: #666;
                padding: 40px 20px;
                font-size: 14px;
            }

            .quick-reply-input-group {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
                flex-wrap: wrap;
            }

            .quick-reply-input {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
                min-width: 200px;
            }

            .quick-reply-input:focus {
                outline: none;
                border-color: #9C27B0;
                box-shadow: 0 0 0 2px rgba(156, 39, 176, 0.2);
            }

            /* 自动发布选项样式 */
            .quick-reply-auto-submit-container {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 15px;
                padding: 10px;
                background-color: #f8f9fa;
                border-radius: 6px;
                border: 1px solid #dee2e6;
                transition: border-color 0.2s;
            }

            .quick-reply-auto-submit-container:hover {
                border-color: #9C27B0;
            }

            .quick-reply-auto-submit-checkbox {
                transform: scale(1.2);
                accent-color: #9C27B0;
            }

            .quick-reply-auto-submit-label {
                font-size: 14px;
                color: #333;
                cursor: pointer;
                user-select: none;
                line-height: 1.4;
            }

            /* 拖拽排序样式 */
            .category-item-draggable {
                cursor: default;
                transition: all 0.2s;
                user-select: none;
            }

            .reply-item-draggable {
                cursor: default;
                transition: all 0.2s;
                user-select: none;
            }

            .category-item-draggable:hover, .reply-item-draggable:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }

            .category-item-dragging, .reply-item-dragging {
                opacity: 0.5;
                transform: rotate(2deg);
                z-index: 1000;
                box-shadow: 0 8px 25px rgba(0,0,0,0.2);
            }

            .category-item-drag-over, .reply-item-drag-over {
                border-top: 3px solid #9C27B0;
                margin-top: 3px;
            }

            .category-drag-handle {
                position: absolute;
                left: 8px;
                top: 50%;
                transform: translateY(-50%);
                color: #666;
                font-size: 16px;
                cursor: move;
                opacity: 0;
                transition: all 0.2s;
                z-index: 10;
                padding: 2px;
                border-radius: 4px;
            }

            .category-drag-handle:hover {
                background-color: rgba(156, 39, 176, 0.1);
                color: #9C27B0;
                opacity: 1 !important;
            }

            .category-item-draggable:hover .category-drag-handle,
            .reply-item-draggable:hover .reply-drag-handle {
                opacity: 1;
            }

            .category-item-draggable .quick-reply-text {
                padding-left: 30px;
            }

            .category-drop-placeholder, .reply-drop-placeholder {
                height: 3px;
                background: #9C27B0;
                border-radius: 2px;
                margin: 4px 0;
                opacity: 0;
                transition: opacity 0.2s;
            }

            .category-drop-placeholder.active, .reply-drop-placeholder.active {
                opacity: 1;
            }

            /* 移动端适配 */
            @media (max-width: 768px) {
                .quick-reply-dialog {
                    left: 10px !important;
                    right: 10px !important;
                    top: 20px !important;
                    width: auto !important;
                    min-width: auto !important;
                    max-height: 90vh;
                }

                .quick-reply-header {
                    flex-wrap: wrap;
                    justify-content: flex-start;
                }

                .quick-reply-title {
                    width: 100%;
                    text-align: center;
                    margin-bottom: 10px;
                }

                .quick-reply-header .quick-reply-btn-secondary {
                    margin-left: 0 !important;
                    width: 48%;
                    box-sizing: border-box;
                }

                .quick-reply-close {
                    position: absolute;
                    right: 10px;
                    top: 10px;
                }

                .quick-reply-tabs {
                    gap: 5px;
                }

                .quick-reply-tab {
                    padding: 6px 12px;
                    font-size: 13px;
                }

                .quick-reply-footer {
                    flex-direction: column;
                    gap: 8px;
                }

                .quick-reply-btn {
                    width: 100%;
                }

                .quick-reply-input-group {
                    flex-direction: column;
                }

                .quick-reply-input {
                    min-width: auto;
                }

                .quick-reply-auto-submit-label {
                    font-size: 13px;
                }

                .category-drag-handle {
                    opacity: 1;
                    font-size: 18px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 显示快捷回复弹窗
function showQuickReplyDialog() {
        // 检查弹窗是否已存在
        const existingDialog = document.getElementById('quick-reply-dialog');
        if (existingDialog) {
            existingDialog.remove();
            return;
        }

        // 添加样式
        addQuickReplyStyles();

        // 创建弹窗
        const dialog = document.createElement('div');
        dialog.id = 'quick-reply-dialog';
        dialog.className = 'quick-reply-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '60px';
        dialog.style.right = '20px';
        dialog.style.zIndex = 10000;
        dialog.style.background = '#fff';
        dialog.style.border = '1px solid #ddd';
        dialog.style.borderRadius = '12px';
        dialog.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)';
        dialog.style.padding = '20px';
        dialog.style.minWidth = '400px';
        dialog.style.maxWidth = '600px';

        // 创建弹窗内容
        createQuickReplyContent(dialog);

        document.body.appendChild(dialog);

        // 使用全局的 makeDraggable 函数
        if (window.makeDraggable) {
            window.makeDraggable(dialog, {width: 60, height: 40});
        }

        // 记录日志
    
    }

    // 创建快捷回复弹窗内容
    function createQuickReplyContent(dialog) {
        let categories = getCategories();
        let activeCategory = categories[0] || '通用回复';

        // 清空弹窗内容
        dialog.innerHTML = '';

        // 头部
        const header = document.createElement('div');
        header.className = 'quick-reply-header';

        const title = document.createElement('h3');
        title.className = 'quick-reply-title';
        title.textContent = '快捷回复';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'quick-reply-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => dialog.remove();

        // 新增：管理分类按钮
        const manageCategoryBtn = document.createElement('button');
        manageCategoryBtn.className = 'quick-reply-btn quick-reply-btn-secondary';
        manageCategoryBtn.textContent = '管理分类';
        manageCategoryBtn.style.minWidth = 'unset'; // 移除最小宽度限制
        manageCategoryBtn.style.padding = '5px 10px'; // 调整内边距
        manageCategoryBtn.style.fontSize = '13px'; // 调整字体大小
        manageCategoryBtn.onclick = () => showCategoryManageDialog();

        // 新增：重置按钮
        const resetBtn = document.createElement('button');
        resetBtn.className = 'quick-reply-btn quick-reply-btn-secondary';
        resetBtn.textContent = '重置';
        resetBtn.style.minWidth = 'unset'; // 移除最小宽度限制
        resetBtn.style.padding = '5px 10px'; // 调整内边距
        resetBtn.style.fontSize = '13px'; // 调整字体大小
        resetBtn.onclick = () => {
            if (confirm('确定要重置为默认快捷回复吗？这将删除所有自定义内容。')) {
                resetToDefault();
                updateQuickReplyContent();
                if (window.addQuickReplyLog) {
                    window.addQuickReplyLog('重置快捷回复为默认设置');
                }
            }
        };

        // 创建一个容器来包裹管理分类和重置按钮
        const actionButtonsWrapper = document.createElement('div');
        actionButtonsWrapper.style.display = 'flex';
        actionButtonsWrapper.style.alignItems = 'center';
        actionButtonsWrapper.style.gap = '8px'; // 按钮之间的间距
        actionButtonsWrapper.style.marginLeft = 'auto'; // 推到最右侧
        actionButtonsWrapper.style.marginRight = '110px'; // 整体向左移动 110px

        actionButtonsWrapper.appendChild(manageCategoryBtn);
        actionButtonsWrapper.appendChild(resetBtn);

        header.appendChild(title);
        header.appendChild(actionButtonsWrapper); // 添加按钮容器
        header.appendChild(closeBtn);
        dialog.appendChild(header);

        // 分类标签容器
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'quick-reply-tabs';
        dialog.appendChild(tabsContainer);

        // 重建分类标签的函数
        function rebuildTabs() {
            categories = getCategories();

            // 检查当前活跃分类是否还存在
            if (!categories.includes(activeCategory)) {
                activeCategory = categories[0] || '通用回复';
            }

            tabsContainer.innerHTML = '';
            categories.forEach(category => {
                const tab = document.createElement('div');
                tab.className = 'quick-reply-tab';
                if (category === activeCategory) {
                    tab.classList.add('active');
                }
                tab.textContent = category;
                tab.onclick = () => {
                    activeCategory = category;
                    updateQuickReplyContent();
                };
                tabsContainer.appendChild(tab);
            });
        }

        // 初始化分类标签
        rebuildTabs();

        // 内容区域
        const contentContainer = document.createElement('div');
        contentContainer.className = 'quick-reply-content';
        dialog.appendChild(contentContainer);

        // 添加新回复输入区
        const inputGroup = document.createElement('div');
        inputGroup.className = 'quick-reply-input-group';

        const input = document.createElement('input');
        input.className = 'quick-reply-input';
        input.placeholder = '输入新的快捷回复或评论内容...';
        input.id = 'new-reply-input';

        const addReplyBtn = document.createElement('button');
        addReplyBtn.className = 'quick-reply-btn quick-reply-btn-success';
        addReplyBtn.textContent = '添加回复';
        addReplyBtn.onclick = () => {
            const text = input.value.trim();
            if (text) {
                if (addReplyToCategory(activeCategory, text)) {
                    input.value = '';
                    updateQuickReplyContent();
                    if (window.addQuickReplyLog) {
                        window.addQuickReplyLog(`添加快捷回复: ${text}`);
                    }
                } else {
                    alert('添加失败，可能已存在相同回复');
                }
            } else {
                alert('请输入要添加的回复内容。');
                input.focus();
            }
        };

        const quickPublishBtn = document.createElement('button');
        quickPublishBtn.className = 'quick-reply-btn quick-reply-btn-primary';
        quickPublishBtn.textContent = '快速发表';
        quickPublishBtn.onclick = () => {
            const content = input.value.trim();

            if (content) {
                // 如果有内容，先插入文本
                if (!insertReplyText(content)) {
                    alert('未找到编辑器，请确保在帖子评论页面使用');
                    return;
                }
                if (window.addQuickReplyLog) {
                    window.addQuickReplyLog(`快速发表评论: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
                }
            } else {
                if (window.addQuickReplyLog) {
                    window.addQuickReplyLog('尝试快速发表空评论');
                }
            }

            // 延迟一点时间确保文本已插入，然后尝试点击发布按钮
            setTimeout(() => {
                const selectors = [
                    'button[data-v-2664b64e].submit.btn.focus-visible',
                    'button[data-v-2664b64e].submit.btn',
                    'button.submit.btn.focus-visible',
                    'button.submit.btn',
                    'button.submit',
                    'button[type="submit"]',
                    'button:contains("发布评论")',
                    '[class*="submit"][class*="btn"]',
                    '[class*="comment"][class*="submit"]',
                    'input[type="submit"][value="发布评论"]', // 针对input[type=submit]的情况
                    'button[role="button"]:contains("发布评论")' // 针对通用按钮
                ];

                let submitButton = null;

                for (const selector of selectors) {
                    try {
                        // 特殊处理 :contains 伪类，因为它不是标准CSS选择器
                        if (selector.includes(':contains')) {
                            const tempButtons = document.querySelectorAll(selector.split(':contains')[0]);
                            for (const btn of tempButtons) {
                                if (btn.textContent && btn.textContent.includes('发布评论')) {
                                    submitButton = btn;
                                    break;
                                }
                            }
                        } else {
                            const btn = document.querySelector(selector);
                            // 再次检查textContent确保是发布按钮
                            if (btn && btn.textContent && btn.textContent.includes('发布评论')) {
                                submitButton = btn;
                                break;
                            }
                        }
                    } catch (e) {
                        // 忽略选择器错误，继续尝试下一个
                        // console.warn(`Selector failed: ${selector}, Error: ${e.message}`); // 调试用，最终移除
                        continue;
                    }
                    if (submitButton) break;
                }

                if (submitButton) {
                    try {
                        submitButton.click();
                        if (window.addQuickReplyLog) {
                            window.addQuickReplyLog('✅ 评论已自动发布');
                        }
                    } catch (e) {
                        if (window.addQuickReplyLog) {
                            window.addQuickReplyLog('❌ 自动发布失败: ' + e.message);
                        }
                    }
                } else {
                    if (window.addQuickReplyLog) {
                        window.addQuickReplyLog('⚠️ 未找到发布评论按钮，请手动发布');
                    }
                }
            }, 400); // 稍微增加延迟确保文本插入完成，并给页面足够时间渲染

            // 如果输入框有内容，清空输入框并关闭弹窗
            if (content) {
                input.value = '';
                dialog.remove();
            }
        };

        // 回车键添加或快速发表
        input.addEventListener('keydown', (e) => { // 使用 keydown 以便捕获 Ctrl 组合键
            if (e.key === 'Enter') {
                e.preventDefault(); // 阻止默认回车行为 (如换行)
                if (e.ctrlKey) {
                    quickPublishBtn.click(); // Ctrl + Enter 快速发表
                } else {
                    addReplyBtn.click(); // Enter 添加回复
                }
            }
        });

        inputGroup.appendChild(input);
        inputGroup.appendChild(addReplyBtn);
        inputGroup.appendChild(quickPublishBtn);
        dialog.appendChild(inputGroup);

        // 自动发布选项
        const autoSubmitContainer = document.createElement('div');
        autoSubmitContainer.className = 'quick-reply-auto-submit-container';

        const autoSubmitCheckbox = document.createElement('input');
        autoSubmitCheckbox.type = 'checkbox';
        autoSubmitCheckbox.id = 'auto-submit-checkbox';
        autoSubmitCheckbox.className = 'quick-reply-auto-submit-checkbox';
        autoSubmitCheckbox.checked = localStorage.getItem('nodeseek_quick_reply_auto_submit') === 'true';

        const autoSubmitLabel = document.createElement('label');
        autoSubmitLabel.htmlFor = 'auto-submit-checkbox';
        autoSubmitLabel.className = 'quick-reply-auto-submit-label';

        // 创建状态提示文本
        const updateLabelText = () => {
            const isChecked = autoSubmitCheckbox.checked;
            autoSubmitLabel.innerHTML = `
                选择回复后自动点击发布评论按钮
                <span style="color: ${isChecked ? '#28a745' : '#6c757d'}; font-weight: 500;">
                    ${isChecked ? '(已开启)' : '(已关闭)'}
                </span>
            `;
        };

        // 初始化文本
        updateLabelText();

        // 保存自动发布设置
        autoSubmitCheckbox.addEventListener('change', () => {
            localStorage.setItem('nodeseek_quick_reply_auto_submit', autoSubmitCheckbox.checked.toString());
            updateLabelText(); // 更新状态显示
            if (window.addQuickReplyLog) {
                window.addQuickReplyLog(`${autoSubmitCheckbox.checked ? '开启' : '关闭'}自动发布评论功能`);
            }
        });

        autoSubmitContainer.appendChild(autoSubmitCheckbox);
        autoSubmitContainer.appendChild(autoSubmitLabel);
        dialog.appendChild(autoSubmitContainer);

        // 更新内容函数
        function updateQuickReplyContent() {
            // 重建分类标签（防止分类发生变化）
            rebuildTabs();

            // 更新回复列表
            const replies = getCategoryReplies(activeCategory);
            contentContainer.innerHTML = '';

            // 拖拽相关变量
            let replyDraggedElement = null;
            let replyDraggedIndex = -1;
            let replyTouchStartY = 0;
            let replyTouchCurrentY = 0;
            let isReplyTouchDragging = false;

            // 回复拖拽处理函数
            function handleReplyDragStart(e) {
                replyDraggedElement = this;
                replyDraggedIndex = parseInt(this.dataset.index);
                this.classList.add('reply-item-dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', this.outerHTML);
            }

            function handleReplyDragOver(e) {
                if (e.preventDefault) {
                    e.preventDefault();
                }
                e.dataTransfer.dropEffect = 'move';

                const targetIndex = parseInt(this.dataset.index);
                if (targetIndex !== replyDraggedIndex) {
                    this.classList.add('reply-item-drag-over');
                }
                return false;
            }

            function handleReplyDrop(e) {
                if (e.stopPropagation) {
                    e.stopPropagation();
                }

                const targetIndex = parseInt(this.dataset.index);
                if (replyDraggedIndex !== targetIndex) {
                    reorderRepliesAfterDrag(replyDraggedIndex, targetIndex);
                }

                // 清理样式
                document.querySelectorAll('.reply-item-drag-over').forEach(el => {
                    el.classList.remove('reply-item-drag-over');
                });

                return false;
            }

            function handleReplyDragEnd() {
                this.classList.remove('reply-item-dragging');
                document.querySelectorAll('.reply-item-drag-over').forEach(el => {
                    el.classList.remove('reply-item-drag-over');
                });
                replyDraggedElement = null;
                replyDraggedIndex = -1;
            }

            // 移动端触摸处理
            function handleReplyTouchStart(e) {
                if (e.target.closest('.quick-reply-actions')) {
                    return; // 如果点击的是按钮，不启动拖拽
                }

                const touch = e.touches[0];
                replyTouchStartY = touch.clientY;
                replyDraggedElement = this;
                replyDraggedIndex = parseInt(this.dataset.index);
                isReplyTouchDragging = false;

                // 延迟启动拖拽，避免与点击冲突
                setTimeout(() => {
                    if (replyDraggedElement === this) {
                        isReplyTouchDragging = true;
                        this.classList.add('reply-item-dragging');
                    }
                }, 150);
            }

            function handleReplyTouchMove(e) {
                if (!isReplyTouchDragging || !replyDraggedElement) return;

                e.preventDefault();
                const touch = e.touches[0];
                replyTouchCurrentY = touch.clientY;

                // 查找触摸点下的元素
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                const replyItem = elementBelow?.closest('.reply-item-draggable');

                // 清除之前的高亮
                document.querySelectorAll('.reply-item-drag-over').forEach(el => {
                    el.classList.remove('reply-item-drag-over');
                });

                if (replyItem && replyItem !== replyDraggedElement) {
                    replyItem.classList.add('reply-item-drag-over');
                }
            }

            function handleReplyTouchEnd(e) {
                if (!isReplyTouchDragging || !replyDraggedElement) {
                    replyDraggedElement = null;
                    return;
                }

                const touch = e.changedTouches[0];
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetItem = elementBelow?.closest('.reply-item-draggable');

                if (targetItem && targetItem !== replyDraggedElement) {
                    const targetIndex = parseInt(targetItem.dataset.index);
                    if (replyDraggedIndex !== targetIndex) {
                        reorderRepliesAfterDrag(replyDraggedIndex, targetIndex);
                    }
                }

                // 清理状态
                document.querySelectorAll('.reply-item-dragging, .reply-item-drag-over').forEach(el => {
                    el.classList.remove('reply-item-dragging', 'reply-item-drag-over');
                });

                replyDraggedElement = null;
                replyDraggedIndex = -1;
                isReplyTouchDragging = false;
            }

            // 拖拽完成后重新排序回复
            function reorderRepliesAfterDrag(fromIndex, toIndex) {
                const currentReplies = getCategoryReplies(activeCategory);
                const movedReply = currentReplies[fromIndex];

                // 创建新的顺序数组
                const newOrder = [...currentReplies];
                newOrder.splice(fromIndex, 1); // 移除原位置的元素
                newOrder.splice(toIndex, 0, movedReply); // 插入到新位置

                // 保存新顺序
                reorderRepliesInCategory(activeCategory, newOrder);

                // 更新界面
                updateQuickReplyContent();

                if (window.addQuickReplyLog) {
                    window.addQuickReplyLog(`移动回复: ${movedReply.substring(0, 20)}${movedReply.length > 20 ? '...' : ''} (${fromIndex + 1} → ${toIndex + 1})`);
                }
            }

            if (replies.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'quick-reply-empty';
                empty.textContent = '暂无快捷回复，点击上方输入框添加';
                contentContainer.appendChild(empty);
            } else {
                const itemsContainer = document.createElement('div');
                itemsContainer.className = 'quick-reply-items';

                replies.forEach((reply, index) => {
                    const item = document.createElement('div');
                    item.className = 'quick-reply-item reply-item-draggable';
                    item.style.position = 'relative';
                    item.draggable = true;
                    item.dataset.reply = reply;
                    item.dataset.index = index;

                    const text = document.createElement('div');
                    text.className = 'quick-reply-text';
                    text.textContent = reply;

                    const actions = document.createElement('div');
                    actions.className = 'quick-reply-actions';

                    const editBtn = document.createElement('button');
                    editBtn.className = 'quick-reply-btn-small quick-reply-btn-edit';
                    editBtn.textContent = '编辑';
                    editBtn.onclick = (e) => {
                        e.stopPropagation();
                        editQuickReply(activeCategory, reply);
                    };

                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'quick-reply-btn-small quick-reply-btn-delete';
                    deleteBtn.textContent = '删除';
                    deleteBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (confirm('确定要删除这条快捷回复吗？')) {
                            deleteReplyFromCategory(activeCategory, reply);
                            updateQuickReplyContent();
                            if (window.addQuickReplyLog) {
                                window.addQuickReplyLog(`删除快捷回复: ${reply}`);
                            }
                        }
                    };

                    actions.appendChild(editBtn);
                    actions.appendChild(deleteBtn);

                    item.appendChild(text);
                    item.appendChild(actions);

                    // 添加拖拽事件监听器
                    item.addEventListener('dragstart', handleReplyDragStart);
                    item.addEventListener('dragover', handleReplyDragOver);
                    item.addEventListener('drop', handleReplyDrop);
                    item.addEventListener('dragend', handleReplyDragEnd);

                    // 移动端触摸事件
                    item.addEventListener('touchstart', handleReplyTouchStart, { passive: false });
                    item.addEventListener('touchmove', handleReplyTouchMove, { passive: false });
                    item.addEventListener('touchend', handleReplyTouchEnd);

                    // 点击插入回复
                    item.onclick = () => {
                        if (insertReplyText(reply)) {
                            if (window.addQuickReplyLog) {
                                window.addQuickReplyLog(`使用快捷回复: ${reply}`);
                            }

                            // 检查是否需要自动发布
                            const autoSubmit = localStorage.getItem('nodeseek_quick_reply_auto_submit') === 'true';
                            if (autoSubmit) {
                                // 延迟一点时间确保文本已插入
                                setTimeout(() => {
                                    // 尝试多种选择器查找发布评论按钮
                                    const selectors = [
                                        'button[data-v-2664b64e].submit.btn.focus-visible',
                                        'button[data-v-2664b64e].submit.btn',
                                        'button.submit.btn.focus-visible',
                                        'button.submit.btn',
                                        'button.submit',
                                        'button[type="submit"]',
                                        'button:contains("发布评论")',
                                        '[class*="submit"][class*="btn"]'
                                    ];

                                    let submitBtn = null;

                                    // 遍历选择器尝试找到按钮
                                    for (const selector of selectors) {
                                        try {
                                            if (selector.includes(':contains')) {
                                                // 对于包含文本的选择器，手动查找
                                                const buttons = document.querySelectorAll('button');
                                                for (const btn of buttons) {
                                                    if (btn.textContent && btn.textContent.includes('发布评论')) {
                                                        submitBtn = btn;
                                                        break;
                                                    }
                                                }
                                            } else {
                                                const btn = document.querySelector(selector);
                                                if (btn && btn.textContent && btn.textContent.includes('发布评论')) {
                                                    submitBtn = btn;
                                                    break;
                                                }
                                            }
                                        } catch (e) {
                                            // 忽略选择器错误，继续尝试下一个
                                            continue;
                                        }

                                        if (submitBtn) break;
                                    }

                                    if (submitBtn) {
                                        try {
                                            submitBtn.click();
                                            if (window.addQuickReplyLog) {
                                                window.addQuickReplyLog('✅ 已自动点击发布评论按钮');
                                            }
                                        } catch (e) {
                                            if (window.addQuickReplyLog) {
                                                window.addQuickReplyLog('❌ 点击发布按钮时出错: ' + e.message);
                                            }
                                        }
                                    } else {
                                        if (window.addQuickReplyLog) {
                                            window.addQuickReplyLog('⚠️ 未找到发布评论按钮，请手动发布');
                                        }
                                    }
                                }, 300); // 稍微增加延迟确保文本插入完成
                            }

                            dialog.remove();
                        } else {
                            alert('未找到编辑器，请确保在帖子评论页面使用');
                        }
                    };

                    itemsContainer.appendChild(item);
                });

                contentContainer.appendChild(itemsContainer);
            }
        }

        // 编辑快捷回复
        function editQuickReply(category, oldText) {
            const newText = prompt('编辑快捷回复:', oldText);
            if (newText !== null && newText.trim() !== '' && newText !== oldText) {
                if (editReplyText(category, oldText, newText.trim())) {
                    updateQuickReplyContent();
                    if (window.addQuickReplyLog) {
                        window.addQuickReplyLog(`编辑快捷回复: ${oldText} -> ${newText.trim()}`);
                    }
                } else {
                    alert('编辑失败，可能已存在相同回复');
                }
            }
        }

        // 初始化内容
        updateQuickReplyContent();

        // 暴露更新函数给分类管理弹窗使用
        dialog.updateContent = updateQuickReplyContent;
    }

    // 显示分类管理弹窗
    function showCategoryManageDialog() {
        const existingDialog = document.getElementById('category-manage-dialog');
        if (existingDialog) {
            existingDialog.remove();
            return;
        }

        const dialog = document.createElement('div');
        dialog.id = 'category-manage-dialog';
        dialog.className = 'quick-reply-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '100px';
        dialog.style.right = '50px';
        dialog.style.zIndex = 10001;
        dialog.style.background = '#fff';
        dialog.style.border = '1px solid #ddd';
        dialog.style.borderRadius = '12px';
        dialog.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)';
        dialog.style.padding = '20px';
        dialog.style.minWidth = '350px';

        const categories = getCategories();

        // 更新主快捷回复弹窗的函数
        function updateMainDialog() {
            const mainDialog = document.getElementById('quick-reply-dialog');
            if (mainDialog && mainDialog.updateContent) {
                mainDialog.updateContent();
            }
        }

        // 头部
        const header = document.createElement('div');
        header.className = 'quick-reply-header';

        const title = document.createElement('h3');
        title.className = 'quick-reply-title';
        title.textContent = '管理分类';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'quick-reply-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => dialog.remove();

        header.appendChild(title);
        header.appendChild(closeBtn);
        dialog.appendChild(header);

        // 添加新分类
        const inputGroup = document.createElement('div');
        inputGroup.className = 'quick-reply-input-group';

        const input = document.createElement('input');
        input.className = 'quick-reply-input';
        input.placeholder = '输入新分类名称...';

        const addBtn = document.createElement('button');
        addBtn.className = 'quick-reply-btn quick-reply-btn-success';
        addBtn.textContent = '添加分类';
        addBtn.onclick = () => {
            const name = input.value.trim();
            if (name) {
                if (getCategories().length >= 5) {
                    alert('最多只能添加5个分类');
                    return;
                }
                if (addCategory(name)) {
                    input.value = '';
                    updateCategoryList();
                    updateMainDialog(); // 更新主弹窗
                    if (window.addQuickReplyLog) {
                        window.addQuickReplyLog(`添加分类: ${name}`);
                    }
                } else {
                    alert('添加失败，分类名称已存在');
                }
            }
        };

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addBtn.click();
            }
        });

        inputGroup.appendChild(input);
        inputGroup.appendChild(addBtn);
        dialog.appendChild(inputGroup);

        // 分类列表
        const listContainer = document.createElement('div');
        listContainer.style.maxHeight = '300px';
        listContainer.style.overflowY = 'auto';
        dialog.appendChild(listContainer);

        function updateCategoryList() {
            const currentCategories = getCategories();
            listContainer.innerHTML = '';

            currentCategories.forEach((category, index) => {
                const item = document.createElement('div');
                item.className = 'quick-reply-item category-item-draggable';
                item.style.marginBottom = '8px';
                item.style.position = 'relative';
                item.draggable = true;
                item.dataset.category = category;
                item.dataset.index = index;

                // 拖拽手柄
                const dragHandle = document.createElement('div');
                dragHandle.className = 'category-drag-handle';
                dragHandle.innerHTML = '⋮⋮';

                const text = document.createElement('div');
                text.className = 'quick-reply-text';
                text.textContent = category;

                const actions = document.createElement('div');
                actions.className = 'quick-reply-actions';
                actions.style.opacity = '1'; // 始终显示

                const editBtn = document.createElement('button');
                editBtn.className = 'quick-reply-btn-small quick-reply-btn-edit';
                editBtn.textContent = '重命名';
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    const newName = prompt('重命名分类:', category);
                    if (newName !== null && newName.trim() !== '' && newName !== category) {
                        if (getMixedLength(newName.trim()) > 8) {
                            alert('分类名限中英文混合8字符以内（中文算2，英文/数字算1）');
                            return;
                        }
                        if (renameCategory(category, newName.trim())) {
                            updateCategoryList();
                            updateMainDialog(); // 更新主弹窗
                            if (window.addQuickReplyLog) {
                                window.addQuickReplyLog(`重命名分类: ${category} -> ${newName.trim()}`);
                            }
                        } else {
                            alert('重命名失败，可能名称已存在');
                        }
                    }
                };

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'quick-reply-btn-small quick-reply-btn-delete';
                deleteBtn.textContent = '删除';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    const replies = getCategoryReplies(category);
                    const message = replies.length > 0
                        ? `确定要删除分类"${category}"吗？这将同时删除该分类下的${replies.length}条回复。`
                        : `确定要删除分类"${category}"吗？`;

                    if (confirm(message)) {
                        deleteCategory(category);
                        updateCategoryList();
                        updateMainDialog(); // 更新主弹窗
                        if (window.addQuickReplyLog) {
                            window.addQuickReplyLog(`删除分类: ${category}`);
                        }
                    }
                };

                actions.appendChild(editBtn);
                actions.appendChild(deleteBtn);

                item.appendChild(dragHandle);
                item.appendChild(text);
                item.appendChild(actions);

                // 桌面端拖拽事件
                item.addEventListener('dragstart', handleDragStart);
                item.addEventListener('dragover', handleDragOver);
                item.addEventListener('drop', handleDrop);
                item.addEventListener('dragend', handleDragEnd);

                // 移动端触摸事件
                item.addEventListener('touchstart', handleTouchStart, { passive: false });
                item.addEventListener('touchmove', handleTouchMove, { passive: false });
                item.addEventListener('touchend', handleTouchEnd);

                listContainer.appendChild(item);
            });
        }

        // 拖拽相关变量
        let draggedElement = null;
        let draggedIndex = -1;
        let touchStartY = 0;
        let touchCurrentY = 0;
        let isTouchDragging = false;

        // 桌面端拖拽处理
        function handleDragStart(e) {
            draggedElement = this;
            draggedIndex = parseInt(this.dataset.index);
            this.classList.add('category-item-dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.outerHTML);
        }

        function handleDragOver(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.dataTransfer.dropEffect = 'move';

            const targetIndex = parseInt(this.dataset.index);
            if (targetIndex !== draggedIndex) {
                this.classList.add('category-item-drag-over');
            }
            return false;
        }

        function handleDrop(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }

            const targetIndex = parseInt(this.dataset.index);
            if (draggedIndex !== targetIndex) {
                reorderCategoriesAfterDrag(draggedIndex, targetIndex);
            }

            // 清理样式
            document.querySelectorAll('.category-item-drag-over').forEach(el => {
                el.classList.remove('category-item-drag-over');
            });

            return false;
        }

        function handleDragEnd() {
            this.classList.remove('category-item-dragging');
            document.querySelectorAll('.category-item-drag-over').forEach(el => {
                el.classList.remove('category-item-drag-over');
            });
            draggedElement = null;
            draggedIndex = -1;
        }

        // 移动端触摸处理
        function handleTouchStart(e) {
            if (e.target.closest('.quick-reply-actions')) {
                return; // 如果点击的是按钮，不启动拖拽
            }

            const touch = e.touches[0];
            touchStartY = touch.clientY;
            draggedElement = this;
            draggedIndex = parseInt(this.dataset.index);
            isTouchDragging = false;

            // 延迟启动拖拽，避免与点击冲突
            setTimeout(() => {
                if (draggedElement === this) {
                    isTouchDragging = true;
                    this.classList.add('category-item-dragging');
                }
            }, 150);
        }

        function handleTouchMove(e) {
            if (!isTouchDragging || !draggedElement) return;

            e.preventDefault();
            const touch = e.touches[0];
            touchCurrentY = touch.clientY;

            // 查找触摸点下的元素
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const categoryItem = elementBelow?.closest('.category-item-draggable');

            // 清除之前的高亮
            document.querySelectorAll('.category-item-drag-over').forEach(el => {
                el.classList.remove('category-item-drag-over');
            });

            if (categoryItem && categoryItem !== draggedElement) {
                categoryItem.classList.add('category-item-drag-over');
            }
        }

        function handleTouchEnd(e) {
            if (!isTouchDragging || !draggedElement) {
                draggedElement = null;
                return;
            }

            const touch = e.changedTouches[0];
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const targetItem = elementBelow?.closest('.category-item-draggable');

            if (targetItem && targetItem !== draggedElement) {
                const targetIndex = parseInt(targetItem.dataset.index);
                if (draggedIndex !== targetIndex) {
                    reorderCategoriesAfterDrag(draggedIndex, targetIndex);
                }
            }

            // 清理状态
            document.querySelectorAll('.category-item-dragging, .category-item-drag-over').forEach(el => {
                el.classList.remove('category-item-dragging', 'category-item-drag-over');
            });

            draggedElement = null;
            draggedIndex = -1;
            isTouchDragging = false;
        }

        // 拖拽完成后重新排序
        function reorderCategoriesAfterDrag(fromIndex, toIndex) {
            const categories = getCategories();
            const movedCategory = categories[fromIndex];

            // 创建新的顺序数组
            const newOrder = [...categories];
            newOrder.splice(fromIndex, 1); // 移除原位置的元素
            newOrder.splice(toIndex, 0, movedCategory); // 插入到新位置

            // 保存新顺序
            reorderCategories(newOrder);

            // 更新界面
            updateCategoryList();
            updateMainDialog();

            if (window.addQuickReplyLog) {
                window.addQuickReplyLog(`移动分类: ${movedCategory} (${fromIndex + 1} → ${toIndex + 1})`);
            }
        }

        updateCategoryList();
        document.body.appendChild(dialog);

        // 使用全局的 makeDraggable 函数
        if (window.makeDraggable) {
            window.makeDraggable(dialog, {width: 60, height: 40});
        }
    }

    // 暴露给全局
    window.NodeSeekQuickReply = {
        getQuickReplies,
        setQuickReplies,
        getCategories,
        addCategory,
        deleteCategory,
        renameCategory,
        reorderCategories, // 新增：分类排序功能
        getCategoryReplies,
        addReplyToCategory,
        deleteReplyFromCategory,
        editReplyText,
        reorderRepliesInCategory, // 新增：回复排序功能
        insertReplyText,
        resetToDefault,
        findEditor,
        showQuickReplyDialog // 新增：暴露显示弹窗函数
    };

})();
