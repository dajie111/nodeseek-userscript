// ========== 快捷回复功能模块 ==========
(function() {
    'use strict';

    // 存储键
    const QUICK_REPLY_KEY = 'nodeseek_quick_replies';
    
    // 默认的预设回复文本
    const DEFAULT_REPLIES = [
        '感谢分享！',
        '支持楼主！',
        '学到了，谢谢！',
        '同求！',
        '已收藏，感谢！',
        '期待更多分享！',
        '赞同楼主观点',
        '很实用的内容',
        '楼主辛苦了！',
        '有用的信息，mark一下'
    ];

    // 获取快捷回复列表
    function getQuickReplies() {
        const stored = localStorage.getItem(QUICK_REPLY_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // 确保数据格式正确，包含默认回复和自定义回复
                return {
                    preset: parsed.preset || DEFAULT_REPLIES,
                    custom: parsed.custom || []
                };
            } catch (e) {
                console.log('快捷回复数据格式错误，使用默认数据');
            }
        }
        return {
            preset: DEFAULT_REPLIES,
            custom: []
        };
    }

    // 保存快捷回复列表
    function saveQuickReplies(replies) {
        localStorage.setItem(QUICK_REPLY_KEY, JSON.stringify(replies));
    }

    // 添加自定义回复
    function addCustomReply(text) {
        if (!text || !text.trim()) return false;
        
        const replies = getQuickReplies();
        const trimmedText = text.trim();
        
        // 检查是否已存在
        const allReplies = [...replies.preset, ...replies.custom];
        if (allReplies.includes(trimmedText)) {
            return false; // 已存在
        }
        
        replies.custom.push(trimmedText);
        saveQuickReplies(replies);
        return true;
    }

    // 删除自定义回复
    function removeCustomReply(text) {
        const replies = getQuickReplies();
        const index = replies.custom.indexOf(text);
        if (index > -1) {
            replies.custom.splice(index, 1);
            saveQuickReplies(replies);
            return true;
        }
        return false;
    }

    // 重置预设回复为默认值
    function resetPresetReplies() {
        const replies = getQuickReplies();
        replies.preset = [...DEFAULT_REPLIES];
        saveQuickReplies(replies);
    }

    // 获取CodeMirror实例
    function getCodeMirrorInstance() {
        const editorWrapper = document.querySelector('#cm-editor-wrapper');
        if (editorWrapper && editorWrapper.__codemirror) {
            return editorWrapper.__codemirror;
        }
        
        // 尝试从CodeMirror元素获取
        const codeMirrorElement = document.querySelector('.CodeMirror');
        if (codeMirrorElement && codeMirrorElement.CodeMirror) {
            return codeMirrorElement.CodeMirror;
        }
        
        return null;
    }

    // 插入文本到编辑器
    function insertTextToEditor(text) {
        const cm = getCodeMirrorInstance();
        
        if (cm) {
            // 使用CodeMirror API插入文本
            const cursor = cm.getCursor();
            cm.replaceRange(text, cursor);
            cm.focus();
            // 将光标移动到插入文本的末尾
            const newCursor = {
                line: cursor.line,
                ch: cursor.ch + text.length
            };
            cm.setCursor(newCursor);
        } else {
            // 备用方案：尝试找到textarea
            const textarea = document.querySelector('#cm-editor-wrapper textarea');
            if (textarea) {
                const startPos = textarea.selectionStart;
                const endPos = textarea.selectionEnd;
                const textBefore = textarea.value.substring(0, startPos);
                const textAfter = textarea.value.substring(endPos);
                
                textarea.value = textBefore + text + textAfter;
                textarea.setSelectionRange(startPos + text.length, startPos + text.length);
                textarea.focus();
                
                // 触发input事件，让编辑器感知到变化
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                console.log('无法找到编辑器，直接复制到剪贴板');
                // 最后的备用方案：复制到剪贴板
                navigator.clipboard.writeText(text).then(() => {
                    alert('文本已复制到剪贴板，请手动粘贴');
                }).catch(() => {
                    prompt('请复制以下文本：', text);
                });
            }
        }
    }

    // 添加文本到编辑器（在现有内容后追加）
    function appendTextToEditor(text) {
        const cm = getCodeMirrorInstance();
        
        if (cm) {
            const content = cm.getValue();
            const newContent = content + (content ? '\n' : '') + text;
            cm.setValue(newContent);
            cm.focus();
            // 将光标移动到末尾
            const lines = cm.lineCount();
            cm.setCursor({ line: lines - 1, ch: cm.getLine(lines - 1).length });
        } else {
            // 备用方案
            const textarea = document.querySelector('#cm-editor-wrapper textarea');
            if (textarea) {
                const currentValue = textarea.value;
                textarea.value = currentValue + (currentValue ? '\n' : '') + text;
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }

    // 替换编辑器内容
    function replaceEditorContent(text) {
        const cm = getCodeMirrorInstance();
        
        if (cm) {
            cm.setValue(text);
            cm.focus();
            // 将光标移动到末尾
            const lines = cm.lineCount();
            cm.setCursor({ line: lines - 1, ch: cm.getLine(lines - 1).length });
        } else {
            // 备用方案
            const textarea = document.querySelector('#cm-editor-wrapper textarea');
            if (textarea) {
                textarea.value = text;
                textarea.focus();
                textarea.setSelectionRange(text.length, text.length);
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }

    // 获取编辑器当前内容
    function getEditorContent() {
        const cm = getCodeMirrorInstance();
        
        if (cm) {
            return cm.getValue();
        } else {
            const textarea = document.querySelector('#cm-editor-wrapper textarea');
            if (textarea) {
                return textarea.value;
            }
        }
        return '';
    }

    // 检查是否在评论页面
    function isCommentPage() {
        return document.querySelector('#cm-editor-wrapper') !== null ||
               document.querySelector('.CodeMirror') !== null ||
               document.querySelector('button.submit.btn') !== null;
    }

    // 创建快捷回复按钮容器
    function createQuickReplyContainer() {
        // 检查是否已存在
        let container = document.getElementById('quick-reply-container');
        if (container) {
            return container;
        }

        container = document.createElement('div');
        container.id = 'quick-reply-container';
        container.style.cssText = `
            position: relative;
            margin: 10px 0;
            padding: 8px;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            font-size: 12px;
        `;

        // 标题栏
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e9ecef;
        `;

        const title = document.createElement('span');
        title.textContent = '快捷回复';
        title.style.cssText = `
            font-weight: bold;
            color: #495057;
        `;

        const actions = document.createElement('span');
        actions.style.cssText = `
            display: flex;
            gap: 8px;
        `;

        // 管理按钮
        const manageBtn = document.createElement('button');
        manageBtn.textContent = '管理';
        manageBtn.style.cssText = `
            padding: 2px 8px;
            font-size: 11px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        `;
        manageBtn.onclick = () => showQuickReplyManager();

        // 折叠按钮
        const collapseBtn = document.createElement('button');
        collapseBtn.textContent = '−';
        collapseBtn.style.cssText = `
            padding: 2px 6px;
            font-size: 11px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        actions.appendChild(manageBtn);
        actions.appendChild(collapseBtn);
        header.appendChild(title);
        header.appendChild(actions);

        // 回复按钮区域
        const buttonsArea = document.createElement('div');
        buttonsArea.id = 'quick-reply-buttons';
        buttonsArea.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        `;

        // 折叠功能
        let isCollapsed = localStorage.getItem('quick_reply_collapsed') === 'true';
        
        const toggleCollapse = () => {
            isCollapsed = !isCollapsed;
            localStorage.setItem('quick_reply_collapsed', isCollapsed);
            buttonsArea.style.display = isCollapsed ? 'none' : 'flex';
            collapseBtn.textContent = isCollapsed ? '+' : '−';
        };

        collapseBtn.onclick = toggleCollapse;
        
        // 初始状态
        if (isCollapsed) {
            buttonsArea.style.display = 'none';
            collapseBtn.textContent = '+';
        }

        container.appendChild(header);
        container.appendChild(buttonsArea);

        return container;
    }

    // 更新快捷回复按钮
    function updateQuickReplyButtons() {
        const buttonsArea = document.getElementById('quick-reply-buttons');
        if (!buttonsArea) return;

        // 清空现有按钮
        buttonsArea.innerHTML = '';

        const replies = getQuickReplies();
        const allReplies = [...replies.preset, ...replies.custom];

        allReplies.forEach((text, index) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.title = `点击插入："${text}"`;
            button.style.cssText = `
                padding: 4px 8px;
                font-size: 11px;
                background: ${index < replies.preset.length ? '#007bff' : '#28a745'};
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                max-width: 120px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            `;

            button.onclick = () => {
                appendTextToEditor(text);
                
                // 记录使用日志
                if (window.addLog) {
                    window.addLog(`使用快捷回复：${text}`);
                }
            };

            // 悬停效果
            button.onmouseover = () => {
                button.style.opacity = '0.8';
            };
            button.onmouseout = () => {
                button.style.opacity = '1';
            };

            buttonsArea.appendChild(button);
        });
    }

    // 显示快捷回复管理界面
    function showQuickReplyManager() {
        // 检查是否已存在
        let dialog = document.getElementById('quick-reply-manager');
        if (dialog) {
            dialog.remove();
            return;
        }

        dialog = document.createElement('div');
        dialog.id = 'quick-reply-manager';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            background: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            padding: 20px;
            width: 500px;
            max-width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
        `;

        const title = document.createElement('h3');
        title.textContent = '快捷回复管理';
        title.style.marginTop = '0';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #666;
        `;
        closeBtn.onclick = () => dialog.remove();

        // 添加自定义回复区域
        const addSection = document.createElement('div');
        addSection.style.marginBottom = '20px';

        const addTitle = document.createElement('h4');
        addTitle.textContent = '添加自定义回复';
        addTitle.style.marginBottom = '10px';

        const addInput = document.createElement('input');
        addInput.type = 'text';
        addInput.placeholder = '输入自定义回复文本...';
        addInput.style.cssText = `
            width: calc(100% - 70px);
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

        const doAdd = () => {
            const text = addInput.value.trim();
            if (!text) {
                alert('请输入回复内容');
                return;
            }
            
            if (addCustomReply(text)) {
                addInput.value = '';
                refreshLists();
                updateQuickReplyButtons();
                alert('添加成功');
            } else {
                alert('该回复已存在');
            }
        };

        addBtn.onclick = doAdd;
        addInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                doAdd();
            }
        });

        addSection.appendChild(addTitle);
        addSection.appendChild(addInput);
        addSection.appendChild(addBtn);

        // 预设回复列表
        const presetSection = document.createElement('div');
        presetSection.style.marginBottom = '20px';

        const presetTitle = document.createElement('div');
        presetTitle.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        `;

        const presetTitleText = document.createElement('h4');
        presetTitleText.textContent = '预设回复';
        presetTitleText.style.margin = '0';

        const resetBtn = document.createElement('button');
        resetBtn.textContent = '重置默认';
        resetBtn.style.cssText = `
            padding: 4px 8px;
            font-size: 12px;
            background: #ffc107;
            color: #212529;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        `;
        resetBtn.onclick = () => {
            if (confirm('确定要重置为默认预设回复吗？')) {
                resetPresetReplies();
                refreshLists();
                updateQuickReplyButtons();
                alert('已重置为默认预设');
            }
        };

        presetTitle.appendChild(presetTitleText);
        presetTitle.appendChild(resetBtn);

        const presetList = document.createElement('div');
        presetList.id = 'preset-list';
        presetList.style.cssText = `
            max-height: 150px;
            overflow-y: auto;
            border: 1px solid #eee;
            border-radius: 4px;
            padding: 8px;
        `;

        presetSection.appendChild(presetTitle);
        presetSection.appendChild(presetList);

        // 自定义回复列表
        const customSection = document.createElement('div');

        const customTitle = document.createElement('h4');
        customTitle.textContent = '自定义回复';
        customTitle.style.marginBottom = '10px';

        const customList = document.createElement('div');
        customList.id = 'custom-list';
        customList.style.cssText = `
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #eee;
            border-radius: 4px;
            padding: 8px;
        `;

        customSection.appendChild(customTitle);
        customSection.appendChild(customList);

        // 刷新列表的函数
        function refreshLists() {
            const replies = getQuickReplies();
            
            // 更新预设列表
            presetList.innerHTML = '';
            replies.preset.forEach(text => {
                const item = document.createElement('div');
                item.style.cssText = `
                    padding: 4px 8px;
                    margin: 2px 0;
                    background: #e3f2fd;
                    border-radius: 3px;
                    font-size: 12px;
                `;
                item.textContent = text;
                presetList.appendChild(item);
            });

            // 更新自定义列表
            customList.innerHTML = '';
            if (replies.custom.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = '暂无自定义回复';
                empty.style.cssText = `
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                    padding: 20px;
                `;
                customList.appendChild(empty);
            } else {
                replies.custom.forEach(text => {
                    const item = document.createElement('div');
                    item.style.cssText = `
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 4px 8px;
                        margin: 2px 0;
                        background: #e8f5e8;
                        border-radius: 3px;
                        font-size: 12px;
                    `;

                    const textSpan = document.createElement('span');
                    textSpan.textContent = text;
                    textSpan.style.flex = '1';

                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = '删除';
                    deleteBtn.style.cssText = `
                        padding: 2px 6px;
                        font-size: 10px;
                        background: #dc3545;
                        color: white;
                        border: none;
                        border-radius: 2px;
                        cursor: pointer;
                    `;
                    deleteBtn.onclick = () => {
                        if (confirm(`确定要删除"${text}"吗？`)) {
                            removeCustomReply(text);
                            refreshLists();
                            updateQuickReplyButtons();
                        }
                    };

                    item.appendChild(textSpan);
                    item.appendChild(deleteBtn);
                    customList.appendChild(item);
                });
            }
        }

        dialog.appendChild(title);
        dialog.appendChild(closeBtn);
        dialog.appendChild(addSection);
        dialog.appendChild(presetSection);
        dialog.appendChild(customSection);

        document.body.appendChild(dialog);

        // 初始加载列表
        refreshLists();

        // 使对话框可拖拽（如果makeDraggable函数可用）
        if (window.makeDraggable) {
            window.makeDraggable(dialog, {width: 100, height: 40});
        }
    }

    // 初始化快捷回复功能
    function initQuickReply() {
        if (!isCommentPage()) {
            return;
        }

        // 等待编辑器加载完成
        const checkEditor = () => {
            const editorWrapper = document.querySelector('#cm-editor-wrapper');
            const submitBtn = document.querySelector('button.submit.btn');
            
            if (editorWrapper && submitBtn) {
                // 创建快捷回复容器
                const container = createQuickReplyContainer();
                
                // 插入到提交按钮之前
                submitBtn.parentNode.insertBefore(container, submitBtn);
                
                // 更新按钮
                updateQuickReplyButtons();
                
                console.log('快捷回复功能已初始化');
            } else {
                // 如果编辑器还没有加载，等待一段时间后重试
                setTimeout(checkEditor, 500);
            }
        };

        checkEditor();
    }

    // 暴露API到全局
    window.NodeSeekQuickReply = {
        initQuickReply,
        getQuickReplies,
        addCustomReply,
        removeCustomReply,
        insertTextToEditor,
        appendTextToEditor,
        replaceEditorContent,
        getEditorContent,
        showQuickReplyManager,
        updateQuickReplyButtons
    };

    // 页面加载完成后自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initQuickReply);
    } else {
        setTimeout(initQuickReply, 1000); // 延迟1秒确保页面元素加载完成
    }

})(); 
