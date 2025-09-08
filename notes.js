(function () {
    if (window.NodeSeekNotes) {
        return;
    }

    const LS_KEYS = {
        categories: 'nodeseek_notes_categories',
        notes: 'nodeseek_notes_data',
        fontColors: 'nodeseek_notes_font_colors',
        bgColors: 'nodeseek_notes_bg_colors',
        trash: 'nodeseek_notes_trash' // 回收站数据
    };

    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            return JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    function writeJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                // 存储空间不足，尝试清理过期数据
                console.warn('Storage quota exceeded, attempting to clean up...');
                cleanupStorageSpace();
                // 再次尝试保存
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                } catch (e2) {
                    alert('存储空间不足，请清理浏览器数据或删除一些笔记');
                    console.error('Notes save failed after cleanup:', e2);
                }
            } else {
                console.error('Notes save failed:', e);
            }
        }
    }

    function generateId(prefix) {
        return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    }

    // 清理存储空间
    function cleanupStorageSpace() {
        try {
            // 1. 清理过期的回收站数据（超过30天）
            const trashData = readJSON(LS_KEYS.trash, []);
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            const validTrashNotes = trashData.filter(note => note.deletedAt > thirtyDaysAgo);
            
            if (validTrashNotes.length < trashData.length) {
                writeJSON(LS_KEYS.trash, validTrashNotes);
                console.log(`Cleaned ${trashData.length - validTrashNotes.length} expired trash notes`);
            }

            // 2. 清理笔记历史记录，只保留最近10个版本
            const notesMap = readJSON(LS_KEYS.notes, {});
            let cleanedHistoryCount = 0;
            
            Object.keys(notesMap).forEach(categoryId => {
                const notes = notesMap[categoryId] || [];
                notes.forEach(note => {
                    if (note.history && note.history.length > 10) {
                        const originalLength = note.history.length;
                        note.history = note.history.slice(0, 10);
                        cleanedHistoryCount += originalLength - note.history.length;
                    }
                    // 清理过大的附件（超过5MB的附件）
                    if (note.attachments && note.attachments.length > 0) {
                        const maxSize = 5 * 1024 * 1024; // 5MB
                        note.attachments = note.attachments.filter(attachment => {
                            if (attachment.size > maxSize) {
                                console.log(`Removed large attachment: ${attachment.name} (${Math.round(attachment.size / 1024 / 1024)}MB)`);
                                return false;
                            }
                            return true;
                        });
                    }
                });
            });
            
            if (cleanedHistoryCount > 0) {
                writeJSON(LS_KEYS.notes, notesMap);
                console.log(`Cleaned ${cleanedHistoryCount} old history records`);
            }

            // 3. 清理颜色历史记录，只保留最近6个
            const fontColors = readJSON(LS_KEYS.fontColors, []);
            const bgColors = readJSON(LS_KEYS.bgColors, []);
            
            if (fontColors.length > 6) {
                writeJSON(LS_KEYS.fontColors, fontColors.slice(0, 6));
            }
            if (bgColors.length > 6) {
                writeJSON(LS_KEYS.bgColors, bgColors.slice(0, 6));
            }

        } catch (e) {
            console.error('Cleanup failed:', e);
        }
    }

    function ensureInitialData() {
        let categories = readJSON(LS_KEYS.categories, null);
        let notesMap = readJSON(LS_KEYS.notes, null);
        if (!categories || categories.length === 0) {
            categories = [{ id: 'default', name: '默认分类' }];
            writeJSON(LS_KEYS.categories, categories);
        }
        if (!notesMap) {
            notesMap = { default: [] };
            writeJSON(LS_KEYS.notes, notesMap);
        }
    }

    function createElement(tag, attrs, children) {
        const el = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach((k) => {
                if (k === 'style' && typeof attrs[k] === 'object') {
                    Object.assign(el.style, attrs[k]);
                } else if (k in el) {
                    el[k] = attrs[k];
                } else {
                    el.setAttribute(k, attrs[k]);
                }
            });
        }
        if (children && children.length) {
            children.forEach((c) => el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
        }
        return el;
    }

    // 全局表格操作函数
    function attachTableOperations() {
        const editor = document.querySelector('.nsn-editor');
        if (!editor) return;
        const tableContainers = editor.querySelectorAll('.nsn-table-container:not([data-operations-attached])');
        tableContainers.forEach(container => {
            attachTableOperationsToContainer(container);
        });
    }

    function attachTableOperationsToContainer(container) {
        if (container.hasAttribute('data-operations-attached')) return;
        container.setAttribute('data-operations-attached', 'true');
        
        const table = container.querySelector('.nsn-table');
        const toolbar = container.querySelector('.nsn-table-toolbar');
        
        if (!table || !toolbar) return;
        
        let currentCell = null;
        
        // 鼠标进入显示工具栏
        container.addEventListener('mouseenter', (e) => {
            // 确保不是从工具栏内部进入
            if (!e.relatedTarget || !toolbar.contains(e.relatedTarget)) {
                toolbar.style.display = 'flex';
                container.style.border = '1px solid #409eff';
            }
        });
        
        // 鼠标离开隐藏工具栏
        container.addEventListener('mouseleave', (e) => {
            // 确保不是进入工具栏
            if (!e.relatedTarget || !toolbar.contains(e.relatedTarget)) {
                toolbar.style.display = 'none';
                container.style.border = '1px solid transparent';
            }
        });
        
        // 工具栏的鼠标事件处理
        toolbar.addEventListener('mouseenter', () => {
            toolbar.style.display = 'flex';
            container.style.border = '1px solid #409eff';
        });
        
        toolbar.addEventListener('mouseleave', () => {
            toolbar.style.display = 'none';
            container.style.border = '1px solid transparent';
        });
        
        // 点击单元格记录当前位置
        table.addEventListener('click', (e) => {
            const cell = e.target.closest('td, th');
            if (cell) {
                currentCell = cell;
                // 高亮当前行列
                highlightRowCol(table, cell);
            }
        });
        
        // 工具栏按钮事件
        toolbar.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const action = e.target.getAttribute('data-action');
            if (!action || !currentCell) return;
            
            const row = currentCell.parentElement;
            const cellIndex = Array.from(row.children).indexOf(currentCell);
            const rowIndex = Array.from(table.rows).indexOf(row);
            
            switch (action) {
                case 'add-row-above':
                    addRowAbove(table, rowIndex);
                    break;
                case 'add-row-below':
                    addRowBelow(table, rowIndex);
                    break;
                case 'add-col-left':
                    addColumnLeft(table, cellIndex);
                    break;
                case 'add-col-right':
                    addColumnRight(table, cellIndex);
                    break;
                case 'delete-row':
                    if (table.rows.length > 1) {
                        deleteRow(table, rowIndex);
                        currentCell = null;
                    } else {
                        alert('表格至少需要保留一行');
                    }
                    break;
                case 'delete-col':
                    if (table.rows[0].children.length > 1) {
                        deleteColumn(table, cellIndex);
                        currentCell = null;
                    } else {
                        alert('表格至少需要保留一列');
                    }
                    break;
            }
        });
        
        // 防止工具栏按钮的mousedown事件影响表格编辑
        toolbar.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    }
    
    // 高亮当前行列
    function highlightRowCol(table, targetCell) {
        // 清除之前的高亮
        table.querySelectorAll('td, th').forEach(cell => {
            cell.style.backgroundColor = '';
        });
        
        const row = targetCell.parentElement;
        const cellIndex = Array.from(row.children).indexOf(targetCell);
        
        // 高亮当前行
        Array.from(row.children).forEach(cell => {
            cell.style.backgroundColor = '#eff6ff';
        });
        
        // 高亮当前列
        Array.from(table.rows).forEach(r => {
            if (r.children[cellIndex]) {
                r.children[cellIndex].style.backgroundColor = '#eff6ff';
            }
        });
        
        // 高亮当前单元格
        targetCell.style.backgroundColor = '#dbeafe';
    }
    
    // 表格操作函数
    function addRowAbove(table, rowIndex) {
        const newRow = table.insertRow(rowIndex);
        const colCount = table.rows[0].children.length;
        for (let i = 0; i < colCount; i++) {
            const cell = newRow.insertCell();
            cell.style.cssText = 'padding: 12px; border: 1px solid #e5e7eb; color: #374151; min-height: 20px;';
        }
    }
    
    function addRowBelow(table, rowIndex) {
        const newRow = table.insertRow(rowIndex + 1);
        const colCount = table.rows[0].children.length;
        for (let i = 0; i < colCount; i++) {
            const cell = newRow.insertCell();
            cell.style.cssText = 'padding: 12px; border: 1px solid #e5e7eb; color: #374151; min-height: 20px;';
        }
    }
    
    function addColumnLeft(table, colIndex) {
        Array.from(table.rows).forEach((row, rowIdx) => {
            const cell = row.insertCell(colIndex);
            if (rowIdx === 0 && row.children[colIndex + 1] && row.children[colIndex + 1].tagName === 'TH') {
                const th = document.createElement('th');
                th.style.cssText = 'padding: 12px; border: 1px solid #e5e7eb; background: #f8fafc; font-weight: 600; text-align: left; color: #374151;';
                th.textContent = '新列';
                row.replaceChild(th, cell);
            } else {
                cell.style.cssText = 'padding: 12px; border: 1px solid #e5e7eb; color: #374151; min-height: 20px;';
            }
        });
    }
    
    function addColumnRight(table, colIndex) {
        Array.from(table.rows).forEach((row, rowIdx) => {
            const cell = row.insertCell(colIndex + 1);
            if (rowIdx === 0 && row.children[colIndex] && row.children[colIndex].tagName === 'TH') {
                const th = document.createElement('th');
                th.style.cssText = 'padding: 12px; border: 1px solid #e5e7eb; background: #f8fafc; font-weight: 600; text-align: left; color: #374151;';
                th.textContent = '新列';
                row.replaceChild(th, cell);
            } else {
                cell.style.cssText = 'padding: 12px; border: 1px solid #e5e7eb; color: #374151; min-height: 20px;';
            }
        });
    }
    
    function deleteRow(table, rowIndex) {
        table.deleteRow(rowIndex);
    }
    
    function deleteColumn(table, colIndex) {
        Array.from(table.rows).forEach(row => {
            if (row.children[colIndex]) {
                row.deleteCell(colIndex);
            }
        });
    }

    // 全局更新保存状态函数
    function updateSaveState() {
        const titleInput = document.querySelector('.nsn-title-input');
        const editor = document.querySelector('.nsn-editor');
        if (titleInput && editor) {
            window.lastSaveTitle = titleInput.value.trim();
            window.lastSaveContent = editor.innerHTML;
        }
    }

    // 全局更新按钮文本函数
    function updateButtonTexts() {
        // 更新回收站按钮
        const trashBtn = document.querySelector('.nsn-btn[title="回收站"]');
        if (trashBtn) {
            const trashData = readJSON(LS_KEYS.trash, []);
            const trashCount = trashData.length;
            trashBtn.textContent = trashCount > 0 ? `回收站 (${trashCount})` : '回收站';
        }
        
        const historyBtn = document.querySelector('.nsn-btn[title="历史记录"]');
        const attachmentBtn = document.querySelector('.nsn-btn[title="附件"]');
        
        if (!window.currentNoteId) {
            if (historyBtn) historyBtn.textContent = '历史记录';
            if (attachmentBtn) attachmentBtn.textContent = '附件';
            return;
        }
        
        const map = readJSON(LS_KEYS.notes, {});
        const list = map[window.currentCategoryId] || [];
        const note = list.find(n => n.id === window.currentNoteId);
        
        if (note) {
            // 更新历史记录按钮
            if (historyBtn) {
                const historyCount = (note.history && note.history.length > 0) ? note.history.length : 0;
                historyBtn.textContent = historyCount > 0 ? `历史记录 (${historyCount})` : '历史记录';
            }
            
            // 更新附件按钮
            if (attachmentBtn) {
                const attachmentCount = (note.attachments && note.attachments.length > 0) ? note.attachments.length : 0;
                attachmentBtn.textContent = attachmentCount > 0 ? `附件 (${attachmentCount})` : '附件';
            }
        } else {
            if (historyBtn) historyBtn.textContent = '历史记录';
            if (attachmentBtn) attachmentBtn.textContent = '附件';
        }
    }

    function buildToolbar(cmd) {
        const bar = createElement('div', { className: 'nsn-toolbar' });
        
        // 选区管理变量
        let savedRange = null;
        
        // 保存选区的函数
        function saveSelection() {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                savedRange = selection.getRangeAt(0).cloneRange();
            }
        }
        
        // 恢复选区的函数
        function restoreSelection() {
            if (savedRange) {
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(savedRange);
            }
        }
        
        // 为工具栏添加mousedown事件监听器
        bar.addEventListener('mousedown', (e) => {
            // 检测是否点击了颜色容器
            if (e.target.closest('.nsn-color-container')) {
                e.preventDefault();
                saveSelection();
            }
        });
        
        const addBtn = (txt, title, onclick) => {
            const b = createElement('button', { className: 'nsn-btn', title }, [txt]);
            b.addEventListener('click', onclick);
            bar.appendChild(b);
        };

        // 字号
        const sizeSel = createElement('select', { className: 'nsn-select' });
        ;['12px','14px','16px','18px','24px','32px'].forEach((s)=>{
            const opt = createElement('option', { value: s }, [s]);
            if (s === '14px') opt.selected = true;
            sizeSel.appendChild(opt);
        });
        sizeSel.addEventListener('change', () => {
            cmd('fontSizePx', sizeSel.value);
        });
        bar.appendChild(sizeSel);

        addBtn('B', '加粗', () => cmd('bold'));
        addBtn('I', '斜体', () => cmd('italic'));
        addBtn('U', '下划线', () => cmd('underline'));
        
        // 字体颜色选择器容器
        const fontColorContainer = createElement('div', { className: 'nsn-color-container' });
        const fontColorPicker = createElement('input', {
            type: 'color',
            className: 'nsn-color-picker',
            title: '字体颜色',
            value: '#000000'
        });
        fontColorPicker.addEventListener('change', () => {
            const color = fontColorPicker.value;
            restoreSelection();
            cmd('foreColor', color);
            saveColorHistory('font', color);
            updateColorHistory(fontHistoryPanel, 'font');
        });
        fontColorPicker.addEventListener('mousedown', (e) => {
            e.preventDefault();
            saveSelection();
        });
        
        const fontResetBtn = createElement('button', {
            className: 'nsn-reset-btn',
            title: '恢复字体颜色默认值（黑色）'
        }, ['↺']);
        fontResetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            restoreSelection();
            fontColorPicker.value = '#000000';
            cmd('foreColor', '#000000');
        });
        
        const fontDropdownBtn = createElement('button', {
            className: 'nsn-dropdown-btn',
            title: '显示颜色历史'
        }, ['▼']);
        const fontHistoryPanel = createElement('div', { className: 'nsn-color-history-panel' });
        
        fontDropdownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleHistoryPanel(fontHistoryPanel, fontDropdownBtn);
        });
        
        fontColorContainer.appendChild(fontColorPicker);
        fontColorContainer.appendChild(fontResetBtn);
        fontColorContainer.appendChild(fontDropdownBtn);
        fontColorContainer.appendChild(fontHistoryPanel);
        bar.appendChild(fontColorContainer);
        
        // 背景颜色选择器容器
        const bgColorContainer = createElement('div', { className: 'nsn-color-container' });
        const bgColorPicker = createElement('input', {
            type: 'color',
            className: 'nsn-color-picker',
            title: '背景颜色',
            value: '#ffffff'
        });
        bgColorPicker.addEventListener('change', () => {
            const color = bgColorPicker.value;
            restoreSelection();
            cmd('backColor', color);
            saveColorHistory('bg', color);
            updateColorHistory(bgHistoryPanel, 'bg');
        });
        bgColorPicker.addEventListener('mousedown', (e) => {
            e.preventDefault();
            saveSelection();
        });
        
        const bgResetBtn = createElement('button', {
            className: 'nsn-reset-btn',
            title: '恢复背景颜色默认值（白色）'
        }, ['↺']);
        bgResetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            restoreSelection();
            bgColorPicker.value = '#ffffff';
            cmd('backColor', '#ffffff');
        });
        
        const bgDropdownBtn = createElement('button', {
            className: 'nsn-dropdown-btn',
            title: '显示颜色历史'
        }, ['▼']);
        const bgHistoryPanel = createElement('div', { className: 'nsn-color-history-panel' });
        
        bgDropdownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleHistoryPanel(bgHistoryPanel, bgDropdownBtn);
        });
        
        bgColorContainer.appendChild(bgColorPicker);
        bgColorContainer.appendChild(bgResetBtn);
        bgColorContainer.appendChild(bgDropdownBtn);
        bgColorContainer.appendChild(bgHistoryPanel);
        bar.appendChild(bgColorContainer);
        
        
        // 初始化颜色历史面板
        updateColorHistory(fontHistoryPanel, 'font');
        updateColorHistory(bgHistoryPanel, 'bg');
        
        // 颜色历史管理函数
        function saveColorHistory(type, color) {
            const key = type === 'font' ? LS_KEYS.fontColors : LS_KEYS.bgColors;
            let history = readJSON(key, []);
            
            // 移除重复颜色
            history = history.filter(c => c !== color);
            // 添加到开头
            history.unshift(color);
            // 限制最多12个
            if (history.length > 12) {
                history = history.slice(0, 12);
            }
            
            writeJSON(key, history);
        }
        
        function updateColorHistory(panel, type) {
            const key = type === 'font' ? LS_KEYS.fontColors : LS_KEYS.bgColors;
            const history = readJSON(key, []);
            
            panel.innerHTML = '';
            
            if (history.length === 0) {
                const emptyMsg = createElement('div', { className: 'nsn-history-empty' }, ['暂无历史颜色']);
                panel.appendChild(emptyMsg);
            } else {
                const grid = createElement('div', { className: 'nsn-color-grid' });
                history.forEach(color => {
                    const colorBlock = createElement('div', {
                        className: 'nsn-color-block',
                        style: { backgroundColor: color },
                        title: color
                    });
                    colorBlock.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        saveSelection();
                    });
                    colorBlock.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        restoreSelection();
                        if (type === 'font') {
                            fontColorPicker.value = color;
                            cmd('foreColor', color);
                        } else {
                            bgColorPicker.value = color;
                            cmd('backColor', color);
                        }
                        hideAllHistoryPanels();
                    });
                    grid.appendChild(colorBlock);
                });
                panel.appendChild(grid);
            }
        }
        
        function toggleHistoryPanel(panel, btn) {
            const isVisible = panel.classList.contains('show');
            
            // 先隐藏所有面板
            hideAllHistoryPanels();
            
            if (!isVisible) {
                panel.classList.add('show');
                btn.textContent = '▲';
            }
        }
        
        function hideAllHistoryPanels() {
            [fontHistoryPanel, bgHistoryPanel].forEach(panel => {
                panel.classList.remove('show');
            });
            [fontDropdownBtn, bgDropdownBtn].forEach(btn => {
                btn.textContent = '▼';
            });
        }
        
        // 点击其他地方关闭历史面板
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nsn-color-container')) {
                hideAllHistoryPanels();
            }
        });
        
        addBtn('左', '左对齐', () => cmd('justifyLeft'));
        addBtn('中', '居中', () => cmd('justifyCenter'));
        addBtn('右', '右对齐', () => cmd('justifyRight'));
        addBtn('链接', '插入链接', () => {
            // 延迟执行prompt避免焦点问题
            setTimeout(() => {
                const linkText = prompt('输入链接文本（显示在页面上的文字）');
                if (linkText && linkText.trim()) {
                    setTimeout(() => {
                        const url = prompt('输入链接地址（URL）');
                        if (url && url.trim()) {
                            // 创建不可直接编辑的链接，防止后续文本被包含在链接内
                            const linkHtml = `<span class="nsn-editable-link" contenteditable="false" data-href="${escapeHtml(url.trim())}">${escapeHtml(linkText.trim())}</span>`;
                            cmd('insertHTML', linkHtml);
                        }
                    }, 50);
                }
            }, 50);
        });
        addBtn('图片', '插入图片', () => {
            // 延迟执行prompt避免焦点问题
            setTimeout(() => {
                const url = prompt('输入图片URL');
                if (url && url.trim()) {
                    const imgHtml = `<div class="nsn-resizable-img-container" data-origin="toolbar" contenteditable="false" style="display: inline-block; position: relative; border: 1px dashed transparent;"><img src="${url.trim()}" style="max-width: 300px; height: auto; display: block;"><div class="nsn-resize-handle" style="position: absolute; bottom: -3px; right: -3px; width: 8px; height: 8px; background: #409eff; cursor: nw-resize; border-radius: 2px; display: none;"></div><div class="nsn-delete-handle" title="删除图片" style="position: absolute; top: -8px; right: -8px; width: 18px; height: 18px; background: #ef4444; color: #fff; font-size: 12px; border-radius: 50%; display: none; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">×</div></div>`;
                    cmd('insertHTML', imgHtml);
                    // 为新插入的图片添加调整大小功能
                    setTimeout(() => {
                        attachResizeListeners();
                    }, 100);
                }
            }, 50);
        });
        addBtn('视频', '插入视频', () => {
            const url = prompt('输入视频URL');
            if (url) cmd('insertHTML', `<video src="${url}" controls style="max-width:100%"></video>`);
        });
        addBtn('表格', '插入表格', () => {
            showTableConfigDialog();
        });
        addBtn('MD', 'Markdown编辑器', () => {
            showMarkdownDialog();
        });
        addBtn('代码', '插入代码块', () => {
            // 检查是否在代码块内
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const container = range.commonAncestorContainer;
                const codeWrapper = container.nodeType === Node.TEXT_NODE 
                    ? container.parentElement.closest('.nsn-code-wrapper')
                    : container.closest('.nsn-code-wrapper');
                
                if (codeWrapper) {
                    alert('不能在代码块内插入新的代码块');
                    return;
                }
            }
            
            const codeTemplate = `<div class="nsn-code-wrapper" contenteditable="false"><div class="nsn-code-toolbar"><button class="nsn-code-copy" title="复制">复制</button><button class="nsn-code-delete" title="删除">删除</button></div><pre class="nsn-code-block" contenteditable="true"></pre></div><p></p>`;
            cmd('insertHTML', codeTemplate);
        });
        // 编辑器按钮 - 延迟绑定事件避免作用域问题
        const editorBtn = createElement('button', { className: 'nsn-btn', title: '源码编辑器' }, ['编辑器']);
        // 使用全局变量存储按钮引用，稍后绑定事件
        window.nsn_editorBtn = editorBtn;
        bar.appendChild(editorBtn);
        
        // 表格配置弹窗
        function showTableConfigDialog() {
            // 创建弹窗遮罩
            const tableModal = createElement('div', {
                className: 'nsn-table-modal',
                style: {
                    position: 'fixed',
                    inset: '0',
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: '999999999',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }
            });
            
            // 创建弹窗内容
            const modalContent = createElement('div', {
                className: 'nsn-table-modal-content',
                style: {
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '20px',
                    maxWidth: '90vw',
                    width: '400px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                }
            });
            
            // 标题
            const title = createElement('div', {
                style: {
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '16px',
                    textAlign: 'center'
                }
            }, ['插入表格']);
            
            // 行数输入
            const rowLabel = createElement('div', {
                style: { marginBottom: '8px', fontWeight: '500' }
            }, ['行数：']);
            const rowInput = createElement('input', {
                type: 'number',
                min: '1',
                max: '20',
                value: '3',
                style: {
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    marginBottom: '12px'
                }
            });
            
            // 列数输入
            const colLabel = createElement('div', {
                style: { marginBottom: '8px', fontWeight: '500' }
            }, ['列数：']);
            const colInput = createElement('input', {
                type: 'number',
                min: '1',
                max: '10',
                value: '3',
                style: {
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    marginBottom: '12px'
                }
            });
            
            // 是否包含表头
            const headerCheckbox = createElement('input', {
                type: 'checkbox',
                id: 'table-header-checkbox',
                checked: true,
                style: { marginRight: '8px' }
            });
            const headerLabel = createElement('label', {
                htmlFor: 'table-header-checkbox',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '16px',
                    cursor: 'pointer'
                }
            }, [headerCheckbox, '包含表头']);
            
            // 按钮区域
            const buttonArea = createElement('div', {
                style: {
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end'
                }
            });
            
            const cancelBtn = createElement('button', {
                style: {
                    padding: '8px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    background: '#f9fafb',
                    color: '#374151',
                    cursor: 'pointer'
                }
            }, ['取消']);
            
            const confirmBtn = createElement('button', {
                style: {
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#409eff',
                    color: '#fff',
                    cursor: 'pointer'
                }
            }, ['确定']);
            
            buttonArea.appendChild(cancelBtn);
            buttonArea.appendChild(confirmBtn);
            
            modalContent.appendChild(title);
            modalContent.appendChild(rowLabel);
            modalContent.appendChild(rowInput);
            modalContent.appendChild(colLabel);
            modalContent.appendChild(colInput);
            modalContent.appendChild(headerLabel);
            modalContent.appendChild(buttonArea);
            
            tableModal.appendChild(modalContent);
            document.body.appendChild(tableModal);
            
            // 事件处理
            cancelBtn.addEventListener('click', () => {
                tableModal.remove();
            });
            
            // 注释掉点击背景关闭弹窗的功能
            // tableModal.addEventListener('click', (e) => {
            //     if (e.target === tableModal) {
            //         tableModal.remove();
            //     }
            // });
            
            confirmBtn.addEventListener('click', () => {
                const rows = Math.max(1, Math.min(20, parseInt(rowInput.value) || 3));
                const cols = Math.max(1, Math.min(10, parseInt(colInput.value) || 3));
                const hasHeader = headerCheckbox.checked;
                
                const tableHtml = createTableHTML(rows, cols, hasHeader);
                cmd('insertHTML', tableHtml);
                
                tableModal.remove();
                
                // 延迟添加表格操作功能
                setTimeout(() => {
                    attachTableOperations();
                }, 100);
            });
            
            // 自动聚焦到行数输入
            rowInput.focus();
            rowInput.select();
        }
        
        // 创建表格HTML
        function createTableHTML(rows, cols, hasHeader) {
            let html = '<div class="nsn-table-container" contenteditable="true" style="margin: 10px 0; position: relative; border: 1px solid transparent; border-radius: 8px; overflow: hidden;"><div class="nsn-table-toolbar" style="display: none; position: absolute; top: -35px; left: 0; background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 1000;"><button class="nsn-table-btn" data-action="add-row-above" title="在上方插入行">↑+</button><button class="nsn-table-btn" data-action="add-row-below" title="在下方插入行">↓+</button><button class="nsn-table-btn" data-action="add-col-left" title="在左侧插入列">←+</button><button class="nsn-table-btn" data-action="add-col-right" title="在右侧插入列">→+</button><button class="nsn-table-btn" data-action="delete-row" title="删除当前行" style="color: #ef4444;">删行</button><button class="nsn-table-btn" data-action="delete-col" title="删除当前列" style="color: #ef4444;">删列</button></div><table class="nsn-table" style="width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;" contenteditable="true">';
            
            for (let i = 0; i < rows; i++) {
                html += '<tr>';
                for (let j = 0; j < cols; j++) {
                    if (i === 0 && hasHeader) {
                        html += `<th style="padding: 12px; border: 1px solid #e5e7eb; background: #f8fafc; font-weight: 600; text-align: left; color: #374151;">列${j + 1}</th>`;
                    } else {
                        html += '<td style="padding: 12px; border: 1px solid #e5e7eb; color: #374151; min-height: 20px;"></td>';
                    }
                }
                html += '</tr>';
            }
            
            html += '</table><br></div><p></p>';
            return html;
        }
        
        // 表格操作功能已移到全局作用域
        // 已移除：Markdown 按钮
        
        
        // Markdown功能已移除
        function showMarkdownDialog() {
            // 创建弹窗遮罩
            const markdownModal = createElement('div', {
                className: 'nsn-markdown-modal',
                style: {
                    position: 'fixed',
                    inset: '0',
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: '999999999',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }
            });
            
            // 创建弹窗内容
            const modalContent = createElement('div', {
                className: 'nsn-markdown-modal-content',
                style: {
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '20px',
                    maxWidth: '90vw',
                    width: '700px',
                    maxHeight: '80vh',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }
            });
            
            // 标题
            const title = createElement('div', {
                style: {
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '16px',
                    textAlign: 'center'
                }
            }, ['Markdown 编辑器']);
            
            // 分栏容器
            const editorContainer = createElement('div', {
                style: {
                    display: 'flex',
                    gap: '12px',
                    flex: '1',
                    minHeight: '400px',
                    marginBottom: '16px'
                }
            });
            
            // 左侧：Markdown输入
            const leftPanel = createElement('div', {
                style: {
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column'
                }
            });
            
            const inputLabel = createElement('div', {
                style: {
                    marginBottom: '8px',
                    fontWeight: '500',
                    fontSize: '14px'
                }
            }, ['Markdown 输入：']);
            
            const markdownTextarea = createElement('textarea', {
                style: {
                    flex: '1',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    resize: 'none',
                    boxSizing: 'border-box'
                },
                placeholder: `# 标题 1\n## 标题 2\n### 标题 3\n\n**粗体文本**\n*斜体文本*\n\n- 列表项 1\n- 列表项 2\n\n1. 有序列表\n2. 有序列表\n\n> 引用文本\n\n\`行内代码\`\n\n\`\`\`javascript\n// 代码块\nconsole.log('Hello World');\n\`\`\`\n\n[链接文本](https://example.com)\n\n![图片描述](https://via.placeholder.com/300x200?text=示例图片)\n\n![另一张图](https://picsum.photos/400/300)`
            });
            
            // 右侧：预览
            const rightPanel = createElement('div', {
                style: {
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column'
                }
            });
            
            const previewLabel = createElement('div', {
                style: {
                    marginBottom: '8px',
                    fontWeight: '500',
                    fontSize: '14px'
                }
            }, ['实时预览：']);
            
            const previewArea = createElement('div', {
                className: 'nsn-markdown-preview',
                style: {
                    flex: '1',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    background: '#f9fafb',
                    overflow: 'auto',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    wordWrap: 'break-word',
                    boxSizing: 'border-box'
                }
            });
            
            leftPanel.appendChild(inputLabel);
            leftPanel.appendChild(markdownTextarea);
            rightPanel.appendChild(previewLabel);
            rightPanel.appendChild(previewArea);
            
            editorContainer.appendChild(leftPanel);
            editorContainer.appendChild(rightPanel);
            
            // 实时预览功能
            function updatePreview() {
                const markdown = markdownTextarea.value;
                const html = convertMarkdownToHTML(markdown);
                previewArea.innerHTML = html;
            }
            
            markdownTextarea.addEventListener('input', updatePreview);
            
            // 按钮区域
            const buttonArea = createElement('div', {
                style: {
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end'
                }
            });
            
            const cancelBtn = createElement('button', {
                style: {
                    padding: '8px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    background: '#f9fafb',
                    color: '#374151',
                    cursor: 'pointer'
                }
            }, ['取消']);
            
            const confirmBtn = createElement('button', {
                style: {
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#409eff',
                    color: '#fff',
                    cursor: 'pointer'
                }
            }, ['插入']);
            
            buttonArea.appendChild(cancelBtn);
            buttonArea.appendChild(confirmBtn);
            
            modalContent.appendChild(title);
            modalContent.appendChild(editorContainer);
            modalContent.appendChild(buttonArea);
            
            // 添加拖动功能
            let isDragging = false;
            let dragStartX = 0;
            let dragStartY = 0;
            let initialLeft = 0;
            let initialTop = 0;

            // 创建拖动区域（左上角30px区域）
            const dragArea = createElement('div', { 
                className: 'nsn-markdown-drag-area',
                style: {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '30px',
                    height: '30px',
                    cursor: 'move',
                    zIndex: '10'
                }
            });
            modalContent.appendChild(dragArea);

            // 拖动事件处理
            dragArea.addEventListener('mousedown', (e) => {
                isDragging = true;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                
                // 获取当前弹窗位置
                const rect = modalContent.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;
                
                // 防止文本选择
                e.preventDefault();
                
                // 添加拖动样式
                modalContent.style.transition = 'none';
                document.body.style.userSelect = 'none';
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                
                const deltaX = e.clientX - dragStartX;
                const deltaY = e.clientY - dragStartY;
                
                const newLeft = initialLeft + deltaX;
                const newTop = initialTop + deltaY;
                
                // 移除拖动限制，允许拖动到屏幕外面
                modalContent.style.left = newLeft + 'px';
                modalContent.style.top = newTop + 'px';
                modalContent.style.transform = 'none';
                modalContent.style.position = 'fixed';
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    modalContent.style.transition = '';
                    document.body.style.userSelect = '';
                }
            });

            markdownModal.appendChild(modalContent);
            document.body.appendChild(markdownModal);
            
            // 事件处理
            cancelBtn.addEventListener('click', () => {
                markdownModal.remove();
            });
            
            // 注释掉点击背景关闭弹窗的功能
            // markdownModal.addEventListener('click', (e) => {
            //     if (e.target === markdownModal) {
            //         markdownModal.remove();
            //     }
            // });
            
            confirmBtn.addEventListener('click', () => {
                const markdown = markdownTextarea.value;
                const html = convertMarkdownToHTML(markdown);
                
                if (html.trim()) {
                    cmd('insertHTML', html + '<p></p>');
                    // 为新插入的图片添加调整大小功能
                    setTimeout(() => {
                        attachResizeListeners();
                        attachTableOperations();
                    }, 100);
                }
                
                markdownModal.remove();
            });
            
            // 初始预览
            updatePreview();
            
            // 自动聚焦到输入框
            markdownTextarea.focus();
        }
        
        // 插入代码块功能已删除
        
        return bar;
    }

    function escapeHtml(str){
        return String(str).replace(/[&<>"']/g, (ch)=>({
            '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\'':'&#39;'
        })[ch]);
    }

    // Markdown 转 HTML 函数
    function convertMarkdownToHTML(markdown) {
        if (!markdown) return '';
        
        let html = markdown;
        
        // 先处理代码块，避免其中的特殊字符被转义
        const codeBlocks = [];
        html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
            const index = codeBlocks.length;
            codeBlocks.push(code);
            return `__CODE_BLOCK_${index}__`;
        });
        
        const inlineCodes = [];
        html = html.replace(/`([^`]+)`/g, (match, code) => {
            const index = inlineCodes.length;
            inlineCodes.push(code);
            return `__INLINE_CODE_${index}__`;
        });
        
        // 处理图片和链接（在转义之前）
        // 在图片容器后面补一个空段落<p></p>，确保插入后换行
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<div class="nsn-resizable-img-container" contenteditable="false" style="display: inline-block; position: relative; border: 1px dashed transparent; margin: 4px;"><img src="$2" alt="$1" style="max-width: 300px; height: auto; display: block; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;"><div class="nsn-resize-handle" style="position: absolute; bottom: -3px; right: -3px; width: 8px; height: 8px; background: #409eff; cursor: nw-resize; border-radius: 2px; display: none;"></div></div><p></p>');
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #409eff; text-decoration: none;">$1</a>');
        
        // 转义 HTML 特殊字符（但保留已处理的HTML标签）
        const htmlTags = [];
        html = html.replace(/<[^>]+>/g, (match) => {
            const index = htmlTags.length;
            htmlTags.push(match);
            return `__HTML_TAG_${index}__`;
        });
        
        html = html.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
        
        // 恢复HTML标签
        htmlTags.forEach((tag, index) => {
            html = html.replace(`__HTML_TAG_${index}__`, tag);
        });
        
        // 标题
        html = html.replace(/^### (.*$)/gm, '<h3 style="font-size: 1.1em; color: #374151; margin: 16px 0 8px 0;">$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2 style="font-size: 1.3em; color: #374151; margin: 16px 0 8px 0; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px;">$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1 style="font-size: 1.5em; color: #374151; margin: 16px 0 8px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px;">$1</h1>');
        
        // 粗体
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>');
        
        // 斜体
        html = html.replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>');
        
        // 引用
        html = html.replace(/^> (.*$)/gm, '<blockquote style="border-left: 4px solid #409eff; background: #f0f9ff; margin: 12px 0; padding: 8px 12px; font-style: italic;">$1</blockquote>');
        
        // 无序列表
        html = html.replace(/^- (.*$)/gm, '<li style="margin: 4px 0;">$1</li>');
        html = html.replace(/(<li[^>]*>.*<\/li>)/gs, '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>');
        
        // 有序列表
        html = html.replace(/^\d+\. (.*$)/gm, '<li style="margin: 4px 0;">$1</li>');
        
        // 水平分割线
        html = html.replace(/^---$/gm, '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />');
        
        // 恢复代码块
        codeBlocks.forEach((code, index) => {
            html = html.replace(`__CODE_BLOCK_${index}__`, `<pre style="background: #f6f8fa; padding: 12px; border-radius: 6px; border: 1px solid #e1e4e8; overflow-x: auto; font-family: Consolas, Monaco, 'Courier New', monospace; font-size: 14px; line-height: 1.4; margin: 12px 0;"><code>${code}</code></pre>`);
        });
        
        // 恢复行内代码
        inlineCodes.forEach((code, index) => {
            html = html.replace(`__INLINE_CODE_${index}__`, `<code style="background: #f6f8fa; padding: 2px 4px; border-radius: 3px; font-family: Consolas, Monaco, 'Courier New', monospace; font-size: 0.9em; color: #d73a49;">${code}</code>`);
        });
        
        // 换行处理
        html = html.replace(/\n\n/g, '</p><p style="margin: 8px 0; line-height: 1.6;">');
        html = html.replace(/\n/g, '<br />');
        
        // 包装在段落中
        if (html && !html.startsWith('<')) {
            html = '<p style="margin: 8px 0; line-height: 1.6;">' + html + '</p>';
        }
        
        return html;
    }

    function buildDialog() {
        // 检查是否已存在弹窗，如果存在则先移除
        const existingOverlay = document.querySelector('.nsn-mask');
        if (existingOverlay) {
            document.body.removeChild(existingOverlay);
        }
        
        ensureInitialData();
        const categories = readJSON(LS_KEYS.categories, []);
        const notesMap = readJSON(LS_KEYS.notes, {});

        const overlay = createElement('div', { className: 'nsn-mask' });
        const dialog = createElement('div', { className: 'nsn-dialog' });
        overlay.appendChild(dialog);

        const header = createElement('div', { className: 'nsn-header' }, [
            createElement('div', { className: 'nsn-title' }, ['笔记']),
            createElement('button', { className: 'nsn-close' }, ['×'])
        ]);
        dialog.appendChild(header);

        // 添加拖动功能
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let initialLeft = 0;
        let initialTop = 0;

        // 创建拖动区域（左上角30px区域）
        const dragArea = createElement('div', { 
            className: 'nsn-drag-area',
            style: {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '30px',
                height: '30px',
                cursor: 'move',
                zIndex: '10'
            }
        });
        dialog.appendChild(dragArea);

        // 拖动事件处理
        dragArea.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            
            // 获取当前弹窗位置
            const rect = dialog.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            
            // 防止文本选择
            e.preventDefault();
            
            // 添加拖动样式
            dialog.style.transition = 'none';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;
            
            const newLeft = initialLeft + deltaX;
            const newTop = initialTop + deltaY;
            
            // 移除拖动限制，允许拖动到屏幕外面
            dialog.style.left = newLeft + 'px';
            dialog.style.top = newTop + 'px';
            dialog.style.transform = 'none';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                dialog.style.transition = '';
                document.body.style.userSelect = '';
            }
        });

        const main = createElement('div', { className: 'nsn-main' });
        dialog.appendChild(main);

        // 顶部：分类下拉
        const catHeader = createElement('div', { className: 'nsn-subheader' });
        const catTitle = createElement('span', null, ['分类']);
        const catSelect = createElement('select', { className: 'nsn-select' });
        const addCatBtn = createElement('button', { className: 'nsn-mini' }, ['+ 分类']);
        const editCatBtn = createElement('button', { className: 'nsn-mini nsn-edit-category' }, ['编辑分类']);
        const deleteCatBtn = createElement('button', { className: 'nsn-mini nsn-delete-category' }, ['删除分类']);
        catHeader.appendChild(catTitle);
        catHeader.appendChild(catSelect);
        catHeader.appendChild(addCatBtn);
        catHeader.appendChild(editCatBtn);
        catHeader.appendChild(deleteCatBtn);

        // 内容区容器
        const contentWrap = createElement('div', { className: 'nsn-content' });

        // 中间：笔记列表
        const mid = createElement('div', { className: 'nsn-mid' });
        const midHeader = createElement('div', { className: 'nsn-subheader' });
        const midTitle = createElement('span', null, ['笔记列表']);
        const addNoteBtn = createElement('button', { className: 'nsn-mini' }, ['+ 新建']);
        midHeader.appendChild(midTitle);
        midHeader.appendChild(addNoteBtn);
        const noteList = createElement('div', { className: 'nsn-notelist' });
        mid.appendChild(midHeader);
        mid.appendChild(noteList);

        // 右侧：编辑器
        const right = createElement('div', { className: 'nsn-right' });
        const titleInput = createElement('input', { className: 'nsn-title-input', placeholder: '笔记标题', maxLength: '59' });
        const titleCounter = createElement('div', { 
            className: 'nsn-title-counter',
            style: {
                fontSize: '12px',
                color: '#6b7280',
                textAlign: 'right',
                marginTop: '4px',
                marginBottom: '8px'
            }
        }, ['0/59']);
        
        // 添加标题输入事件监听
        titleInput.addEventListener('input', () => {
            const length = titleInput.value.length;
            titleCounter.textContent = `${length}/59`;
            // 当接近限制时改变颜色
            if (length >= 55) {
                titleCounter.style.color = '#ef4444'; // 红色警告
            } else if (length >= 45) {
                titleCounter.style.color = '#f59e0b'; // 黄色提示
            } else {
                titleCounter.style.color = '#6b7280'; // 默认灰色
            }
        });
        const toolbar = buildToolbar(execCommand);
        const editor = createElement('div', { className: 'nsn-editor' });
        editor.contentEditable = 'true';

        const bottomBar = createElement('div', { className: 'nsn-bottom' });
        const saveBtn = createElement('button', { className: 'nsn-primary' }, ['保存']);
        const historyBtn = createElement('button', { className: 'nsn-default' }, ['历史记录']);
        const attachmentBtn = createElement('button', { className: 'nsn-default' }, ['附件']);
        const exportBtn = createElement('button', { className: 'nsn-default' }, ['导出']);
        const importBtn = createElement('button', { className: 'nsn-default' }, ['导入']);
        const trashBtn = createElement('button', { className: 'nsn-default' }, ['回收站']);
        const deleteNoteBtn = createElement('button', { className: 'nsn-danger' }, ['删除笔记']);
        
        // updateButtonTexts函数已移到全局作用域
        bottomBar.appendChild(saveBtn);
        bottomBar.appendChild(historyBtn);
        bottomBar.appendChild(attachmentBtn);
        bottomBar.appendChild(exportBtn);
        bottomBar.appendChild(importBtn);
        bottomBar.appendChild(trashBtn);
        bottomBar.appendChild(deleteNoteBtn);

        right.appendChild(titleInput);
        right.appendChild(titleCounter);
        right.appendChild(toolbar);
        right.appendChild(editor);
        right.appendChild(bottomBar);

        main.appendChild(catHeader);
        contentWrap.appendChild(mid);
        contentWrap.appendChild(right);
        main.appendChild(contentWrap);

        // 状态
        let currentCategoryId = categories[0]?.id || 'default';
        let currentNoteId = null;
        
        // 将状态暴露到window对象以便外部访问
        window.currentCategoryId = currentCategoryId;
        window.currentNoteId = currentNoteId;
        
        // 自动保存相关变量
        let autoSaveTimer = null;
        let lastSaveContent = '';
        let lastSaveTitle = '';
        
        // 将自动保存变量也暴露到window对象
        window.lastSaveTitle = lastSaveTitle;
        window.lastSaveContent = lastSaveContent;
        
        // 启动自动保存
        function startAutoSave() {
            // 清除之前的定时器
            if (autoSaveTimer) {
                clearInterval(autoSaveTimer);
            }
            
            // 每30秒检查并保存
            autoSaveTimer = setInterval(() => {
                // 检查是否有内容需要保存
                const currentTitle = titleInput.value.trim();
                const currentContent = editor.innerHTML;
                
                // 如果内容有变化且不为空，则自动保存
                if ((currentTitle !== window.lastSaveTitle || currentContent !== window.lastSaveContent) && 
                    (currentTitle || currentContent.trim())) {
                    
                    const success = saveCurrent();
                    if (success) {
                        window.lastSaveTitle = currentTitle;
                        window.lastSaveContent = currentContent;
                        // 显示自动保存提示（不在控制台输出）
                        showAutoSaveNotification();
                    }
                }
            }, 30000); // 30秒
        }
        
        // 显示自动保存提示
        function showAutoSaveNotification() {
            // 移除已存在的提示框
            const existingNotification = document.querySelector('.nsn-auto-save-notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            // 创建提示框
            const notification = createElement('div', {
                className: 'nsn-auto-save-notification',
                style: {
                    position: 'absolute',
                    bottom: '60px',
                    right: '20px',
                    background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3), 0 2px 8px rgba(0, 0, 0, 0.1)',
                    zIndex: '1000000001',
                    pointerEvents: 'none',
                    opacity: '0',
                    transform: 'translateY(20px)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }
            }, ['✓ 已自动保存']);
            
            // 确保提示框显示在弹窗内部
            dialog.appendChild(notification);
            
            // 触发入场动画
            requestAnimationFrame(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateY(0)';
            });
            
            // 5秒后自动消失
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        if (notification && notification.parentNode) {
                            notification.remove();
                        }
                    }, 300);
                }
            }, 5000);
        }
        
        // 显示手动保存提示
        function showSaveNotification() {
            // 移除已存在的提示框
            const existingNotification = document.querySelector('.nsn-save-notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            // 创建提示框
            const notification = createElement('div', {
                className: 'nsn-save-notification',
                style: {
                    position: 'absolute',
                    bottom: '60px',
                    right: '20px',
                    background: 'linear-gradient(135deg, #409eff, #3785e6)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    boxShadow: '0 4px 20px rgba(64, 158, 255, 0.3), 0 2px 8px rgba(0, 0, 0, 0.1)',
                    zIndex: '1000000001',
                    pointerEvents: 'none',
                    opacity: '0',
                    transform: 'translateY(20px)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }
            }, ['✓ 已保存']);
            
            // 确保提示框显示在弹窗内部
            dialog.appendChild(notification);
            
            // 触发入场动画
            requestAnimationFrame(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateY(0)';
            });
            
            // 5秒后自动消失
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        if (notification && notification.parentNode) {
                            notification.remove();
                        }
                    }, 300);
                }
            }, 5000); // 5秒
        }
        
        // 停止自动保存
        function stopAutoSave() {
            if (autoSaveTimer) {
                clearInterval(autoSaveTimer);
                autoSaveTimer = null;
            }
            // 清理可能存在的提示框
            const existingAutoSaveNotification = document.querySelector('.nsn-auto-save-notification');
            if (existingAutoSaveNotification) {
                existingAutoSaveNotification.remove();
            }
            const existingSaveNotification = document.querySelector('.nsn-save-notification');
            if (existingSaveNotification) {
                existingSaveNotification.remove();
            }
        }
        
        // updateSaveState函数已移到全局作用域

        function renderCategories() {
            catSelect.innerHTML = '';
            const cats = readJSON(LS_KEYS.categories, []);
            cats.forEach((c) => {
                const opt = createElement('option', { value: c.id }, [c.name]);
                if (c.id === currentCategoryId) opt.selected = true;
                catSelect.appendChild(opt);
            });
        }

        function renderNotes() {
            noteList.innerHTML = '';
            const map = readJSON(LS_KEYS.notes, {});
            const list = map[currentCategoryId] || [];
            list.forEach((n) => {
                const item = createElement('div', { className: 'nsn-note-item' });
                
                // 处理标题显示：超过31个字符时截取并显示省略号
                const originalTitle = n.title || '未命名';
                const displayTitle = originalTitle.length > 31 ? originalTitle.substring(0, 31) + '...' : originalTitle;
                
                const t = createElement('div', { className: 'nsn-note-title' }, [displayTitle]);
                
                // 如果标题被截取，添加鼠标悬停显示完整标题
                if (originalTitle.length > 31) {
                    t.title = originalTitle;
                }
                
                // 如果有历史记录，添加历史记录标识
                // if (n.history && n.history.length > 0) {
                //     const historyBadge = createElement('div', {
                //         style: {
                //             position: 'absolute',
                //             top: '4px',
                //             right: '4px',
                //             background: '#10b981',
                //             color: '#fff',
                //             fontSize: '10px',
                //             padding: '2px 6px',
                //             borderRadius: '10px',
                //             fontWeight: '500'
                //         }
                //     }, [`${n.history.length}`]);
                //     item.appendChild(historyBadge);
                // }
                
                // 如果有附件，添加附件标识
                // if (n.attachments && n.attachments.length > 0) {
                //     const attachmentBadge = createElement('div', {
                //         style: {
                //             position: 'absolute',
                //             top: '4px',
                //             left: '4px',
                //             background: '#f59e0b',
                //             color: '#fff',
                //             fontSize: '10px',
                //             padding: '2px 6px',
                //             borderRadius: '10px',
                //             fontWeight: '500'
                //         }
                //     }, [`📎${n.attachments.length}`]);
                //     item.appendChild(attachmentBadge);
                // }
                
                item.appendChild(t);
                // 为笔记项添加数据属性，用于恢复时查找
                item.noteData = n;
                item.addEventListener('click', () => {
                    currentNoteId = n.id;
                window.currentNoteId = currentNoteId;
                    titleInput.value = n.title || '';
                    editor.innerHTML = n.content || '';
                    highlightActive(item);
                    // 更新保存状态
                    updateSaveState();
                    // 更新按钮文本
                    updateButtonTexts();
                    // 为编辑器中的图片和表格重新绑定功能
                    setTimeout(() => {
                        attachResizeListeners();
                        attachTableOperations();
                    }, 100);
                });
                noteList.appendChild(item);
            });
        }

        function highlightActive(activeEl){
            Array.from(noteList.children).forEach((c)=>c.classList.remove('active'));
            if (activeEl) activeEl.classList.add('active');
        }

        function clearEditor(){
            titleInput.value = '';
            editor.innerHTML = '';
            // 重置标题计数器
            titleCounter.textContent = '0/59';
            titleCounter.style.color = '#6b7280';
            // 更新保存状态
            updateSaveState();
            // 更新按钮文本
            updateButtonTexts();
        }

        function saveCurrent(){
            const map = readJSON(LS_KEYS.notes, {});
            const list = map[currentCategoryId] || [];
            if (!currentNoteId) {
                currentNoteId = generateId('note');
            window.currentNoteId = currentNoteId;
                list.unshift({ 
                    id: currentNoteId, 
                    title: titleInput.value.trim(), 
                    content: editor.innerHTML, 
                    createdAt: Date.now(), 
                    updatedAt: Date.now(),
                    history: [], // 初始化历史记录数组
                    attachments: [] // 初始化附件数组
                });
            } else {
                const idx = list.findIndex(n => n.id === currentNoteId);
                if (idx >= 0) {
                    const note = list[idx];
                    const currentTitle = titleInput.value.trim();
                    const currentContent = editor.innerHTML;
                    
                    // 检查内容是否有变化
                    if (note.title !== currentTitle || note.content !== currentContent) {
                        // 保存当前版本到历史记录
                        if (!note.history) note.history = [];
                        note.history.unshift({
                            title: note.title,
                            content: note.content,
                            timestamp: note.updatedAt || Date.now()
                        });
                        
                        // 限制历史记录数量为30个
                        if (note.history.length > 30) {
                            note.history = note.history.slice(0, 30);
                        }
                        
                        // 更新笔记内容
                        note.title = currentTitle;
                        note.content = currentContent;
                        note.updatedAt = Date.now();
                    }
                }
            }
            map[currentCategoryId] = list;
            writeJSON(LS_KEYS.notes, map);
            renderNotes();
            // 更新保存状态
            updateSaveState();
            // 更新按钮文本
            updateButtonTexts();
            return true;
        }

        function createNewNote(){
            currentNoteId = null;
            clearEditor();
            titleInput.focus();
            // 更新保存状态
            updateSaveState();
        }

        function addCategory(){
            const cats = readJSON(LS_KEYS.categories, []);
            if (cats.length >= 10) {
                alert('分类数量已达上限（10个）');
                return;
            }
            const name = prompt('输入分类名称（最多4个字符）');
            if (!name) return;
            const trimmedName = name.trim();
            if (trimmedName.length === 0 || trimmedName.length > 4) {
                alert('分类名称长度必须在1-4字符之间');
                return;
            }
            const id = generateId('cat');
            cats.push({ id, name: trimmedName });
            writeJSON(LS_KEYS.categories, cats);
            const map = readJSON(LS_KEYS.notes, {});
            map[id] = [];
            writeJSON(LS_KEYS.notes, map);
            currentCategoryId = id;
            currentNoteId = null;
            renderCategories();
            renderNotes();
            clearEditor();
        }
        
        function editCategory(){
            const cats = readJSON(LS_KEYS.categories, []);
            const current = cats.find(c => c.id === currentCategoryId);
            if (!current) {
                alert('请先选择一个分类');
                return;
            }
            
            // 检查是否为默认分类
            if (current.id === 'default') {
                alert('默认分类不能被编辑');
                return;
            }
            
            // 直接编辑分类名称
            const newName = prompt('编辑分类名称（最多4个字符）', current.name);
            if (!newName) return;
            const trimmedName = newName.trim();
            if (trimmedName.length === 0 || trimmedName.length > 4) {
                alert('分类名称长度必须在1-4字符之间');
                return;
            }
            
            // 更新分类名称
            current.name = trimmedName;
            writeJSON(LS_KEYS.categories, cats);
            renderCategories();
        }
        
        function deleteCategory(){
            const cats = readJSON(LS_KEYS.categories, []);
            const current = cats.find(c => c.id === currentCategoryId);
            if (!current) {
                alert('请先选择一个分类');
                return;
            }
            
            // 检查是否为默认分类
            if (current.id === 'default') {
                alert('默认分类不能被删除');
                return;
            }
            
            // 删除分类
            const map = readJSON(LS_KEYS.notes, {});
            const hasNotes = (map[currentCategoryId] || []).length > 0;
            const confirmMsg = `确定删除分类"${current.name}"${hasNotes ? '（包含笔记将一并删除）' : ''}？`;
            
            if (confirm(confirmMsg)) {
                // 删除分类
                const newCats = cats.filter(c => c.id !== currentCategoryId);
                delete map[currentCategoryId];
                
                // 确保至少有一个默认分类
                if (newCats.length === 0) {
                    newCats.push({ id: 'default', name: '默认分类' });
                    map['default'] = map['default'] || [];
                    currentCategoryId = 'default';
                } else {
                    currentCategoryId = newCats[0].id;
                }
                
                writeJSON(LS_KEYS.categories, newCats);
                writeJSON(LS_KEYS.notes, map);
                currentNoteId = null;
                window.currentCategoryId = currentCategoryId;
                window.currentNoteId = currentNoteId;
                renderCategories();
                renderNotes();
                clearEditor();
            }
        }

        
        function deleteCurrentNote(){
            if (!currentNoteId) {
                alert('请先选择一篇笔记');
                return;
            }
            
            const map = readJSON(LS_KEYS.notes, {});
            const list = map[currentCategoryId] || [];
            const noteIndex = list.findIndex(n => n.id === currentNoteId);
            
            if (noteIndex === -1) {
                alert('找不到要删除的笔记');
                return;
            }
            
            const note = list[noteIndex];
            const ok = confirm(`确定删除笔记"${note.title || '未命名'}"？\n\n删除的笔记将移入回收站，可在30天内恢复。`);
            if (!ok) return;
            
            // 将笔记移到回收站
            const trashData = readJSON(LS_KEYS.trash, []);
            const trashNote = {
                ...note,
                deletedAt: Date.now(),
                originalCategoryId: currentCategoryId,
                originalCategoryName: readJSON(LS_KEYS.categories, []).find(c => c.id === currentCategoryId)?.name || '未知分类'
            };
            trashData.unshift(trashNote);
            writeJSON(LS_KEYS.trash, trashData);
            
            // 从原列表中移除笔记
            list.splice(noteIndex, 1);
            map[currentCategoryId] = list;
            writeJSON(LS_KEYS.notes, map);
            
            // 清空编辑器并重新渲染列表
            currentNoteId = null;
            window.currentNoteId = currentNoteId;
            clearEditor();
            renderNotes();
            
            // 更新按钮文本
            updateButtonTexts();
        }

        // 显示历史记录弹窗
        function showHistoryDialog() {
            if (!currentNoteId) {
                alert('请先选择一篇笔记');
                return;
            }
            
            const map = readJSON(LS_KEYS.notes, {});
            const list = map[currentCategoryId] || [];
            const note = list.find(n => n.id === currentNoteId);
            
            if (!note) {
                alert('找不到当前笔记');
                return;
            }
            
            // 创建历史记录弹窗
            const historyModal = createElement('div', {
                className: 'nsn-history-modal',
                style: {
                    position: 'fixed',
                    inset: '0',
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: '999999999',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }
            });
            
            const modalContent = createElement('div', {
                className: 'nsn-history-modal-content',
                style: {
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '20px',
                    maxWidth: '90vw',
                    width: '800px',
                    maxHeight: '80vh',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column'
                }
            });
            
            // 标题
            const title = createElement('div', {
                style: {
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '16px',
                    textAlign: 'center',
                    borderBottom: '1px solid #e5e7eb',
                    paddingBottom: '12px'
                }
            }, [`笔记历史记录 - ${note.title || '未命名'}`]);
            
            // 历史记录列表容器
            const historyList = createElement('div', {
                style: {
                    flex: '1',
                    overflow: 'auto',
                    maxHeight: '400px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '16px'
                }
            });
            
            // 当前版本
            const currentVersion = createElement('div', {
                style: {
                    padding: '12px',
                    background: '#f0f9ff',
                    borderBottom: '1px solid #e5e7eb',
                    fontWeight: '500',
                    color: '#0369a1'
                }
            }, [`当前版本 (${new Date(note.updatedAt || note.createdAt).toLocaleString()})`]);
            historyList.appendChild(currentVersion);
            
            // 历史记录
            if (note.history && note.history.length > 0) {
                note.history.forEach((historyItem, index) => {
                    const historyItemEl = createElement('div', {
                        style: {
                            padding: '12px',
                            borderBottom: '1px solid #f3f4f6',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                        }
                    });
                    
                    historyItemEl.addEventListener('mouseenter', () => {
                        historyItemEl.style.backgroundColor = '#f9fafb';
                    });
                    
                    historyItemEl.addEventListener('mouseleave', () => {
                        historyItemEl.style.backgroundColor = '';
                    });
                    
                    const historyTitle = createElement('div', {
                        style: {
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '4px'
                        }
                    }, [historyItem.title || '未命名']);
                    
                    const historyTime = createElement('div', {
                        style: {
                            fontSize: '12px',
                            color: '#6b7280'
                        }
                    }, [new Date(historyItem.timestamp).toLocaleString()]);
                    
                    const restoreBtn = createElement('button', {
                        style: {
                            float: 'right',
                            padding: '4px 8px',
                            background: '#409eff',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            marginTop: '-20px'
                        }
                    }, ['恢复此版本']);
                    
                    restoreBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (confirm('确定要恢复到此版本吗？当前版本将被保存到历史记录中。')) {
                            restoreToVersion(historyItem);
                            historyModal.remove();
                        }
                    });
                    
                    historyItemEl.appendChild(historyTitle);
                    historyItemEl.appendChild(historyTime);
                    historyItemEl.appendChild(restoreBtn);
                    historyList.appendChild(historyItemEl);
                });
            } else {
                const emptyMsg = createElement('div', {
                    style: {
                        padding: '20px',
                        textAlign: 'center',
                        color: '#6b7280',
                        fontSize: '14px'
                    }
                }, ['暂无历史记录']);
                historyList.appendChild(emptyMsg);
            }
            
            // 按钮区域
            const buttonArea = createElement('div', {
                style: {
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end'
                }
            });
            
            const closeBtn = createElement('button', {
                style: {
                    padding: '8px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    background: '#f9fafb',
                    color: '#374151',
                    cursor: 'pointer'
                }
            }, ['关闭']);
            
            closeBtn.addEventListener('click', () => {
                historyModal.remove();
            });
            
            buttonArea.appendChild(closeBtn);
            
            modalContent.appendChild(title);
            modalContent.appendChild(historyList);
            modalContent.appendChild(buttonArea);
            historyModal.appendChild(modalContent);
            
            // 注释掉点击背景关闭弹窗的功能
            // historyModal.addEventListener('click', (e) => {
            //     if (e.target === historyModal) {
            //         historyModal.remove();
            //     }
            // });
            
            document.body.appendChild(historyModal);
        }
        
        // 恢复到指定版本
        function restoreToVersion(historyItem) {
            if (!currentNoteId) return;
            
            const map = readJSON(LS_KEYS.notes, {});
            const list = map[currentCategoryId] || [];
            const noteIndex = list.findIndex(n => n.id === currentNoteId);
            
            if (noteIndex === -1) return;
            
            const note = list[noteIndex];
            
            // 保存当前版本到历史记录
            if (!note.history) note.history = [];
            note.history.unshift({
                title: note.title,
                content: note.content,
                timestamp: note.updatedAt || Date.now()
            });
            
            // 限制历史记录数量为30个
            if (note.history.length > 30) {
                note.history = note.history.slice(0, 30);
            }
            
            // 恢复到历史版本
            note.title = historyItem.title;
            note.content = historyItem.content;
            note.updatedAt = Date.now();
            
            // 更新编辑器显示
            titleInput.value = note.title || '';
            editor.innerHTML = note.content || '';
            
            // 保存到localStorage
            map[currentCategoryId] = list;
            writeJSON(LS_KEYS.notes, map);
            
            // 重新渲染笔记列表
            renderNotes();
            
            // 更新保存状态
            updateSaveState();
            
            // 更新按钮文本
            updateButtonTexts();
            
            // 显示恢复成功提示
            showRestoreNotification();
        }
        
        // 显示恢复成功提示
        function showRestoreNotification() {
            // 移除已存在的提示框
            const existingNotification = document.querySelector('.nsn-restore-notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            // 创建提示框
            const notification = createElement('div', {
                className: 'nsn-restore-notification',
                style: {
                    position: 'absolute',
                    bottom: '60px',
                    right: '20px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3), 0 2px 8px rgba(0, 0, 0, 0.1)',
                    zIndex: '1000000001',
                    pointerEvents: 'none',
                    opacity: '0',
                    transform: 'translateY(20px)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }
            }, ['✓ 已恢复到历史版本']);
            
            // 确保提示框显示在弹窗内部
            dialog.appendChild(notification);
            
            // 触发入场动画
            requestAnimationFrame(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateY(0)';
            });
            
            // 5秒后自动消失
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        if (notification && notification.parentNode) {
                            notification.remove();
                        }
                    }, 300);
                }
            }, 5000);
        }
        
        // 显示附件管理弹窗
        function showAttachmentDialog() {
            if (!currentNoteId) {
                alert('请先选择一篇笔记');
                return;
            }
            
            const map = readJSON(LS_KEYS.notes, {});
            const list = map[currentCategoryId] || [];
            const note = list.find(n => n.id === currentNoteId);
            
            if (!note) {
                alert('找不到当前笔记');
                return;
            }
            
            // 创建附件管理弹窗
            const attachmentModal = createElement('div', {
                className: 'nsn-attachment-modal',
                style: {
                    position: 'fixed',
                    inset: '0',
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: '999999999',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }
            });
            
            const modalContent = createElement('div', {
                className: 'nsn-attachment-modal-content',
                style: {
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '20px',
                    maxWidth: '90vw',
                    width: '600px',
                    maxHeight: '80vh',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column'
                }
            });
            
            // 标题
            const title = createElement('div', {
                style: {
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '16px',
                    textAlign: 'center',
                    borderBottom: '1px solid #e5e7eb',
                    paddingBottom: '12px'
                }
            }, [`附件管理 - ${note.title || '未命名'}`]);
            
            // 上传区域
            const uploadArea = createElement('div', {
                style: {
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    marginBottom: '16px',
                    background: '#f9fafb',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }
            });
            
            uploadArea.addEventListener('mouseenter', () => {
                uploadArea.style.borderColor = '#409eff';
                uploadArea.style.background = '#f0f9ff';
            });
            
            uploadArea.addEventListener('mouseleave', () => {
                uploadArea.style.borderColor = '#d1d5db';
                uploadArea.style.background = '#f9fafb';
            });
            
            const uploadIcon = createElement('div', {
                style: {
                    fontSize: '24px',
                    color: '#6b7280',
                    marginBottom: '8px'
                }
            }, ['📎']);
            
            const uploadText = createElement('div', {
                style: {
                    color: '#6b7280',
                    fontSize: '14px'
                }
            }, ['点击或拖拽文件到此处上传（最大10MB）']);
            
            uploadArea.appendChild(uploadIcon);
            uploadArea.appendChild(uploadText);
            
            // 隐藏的文件输入
            const fileInput = createElement('input', {
                type: 'file',
                multiple: true,
                style: { display: 'none' }
            });
            
            // 点击上传
            uploadArea.addEventListener('click', () => {
                fileInput.click();
            });
            
            // 拖拽上传
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = '#409eff';
                uploadArea.style.background = '#f0f9ff';
            });
            
            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = '#d1d5db';
                uploadArea.style.background = '#f9fafb';
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = '#d1d5db';
                uploadArea.style.background = '#f9fafb';
                
                const files = Array.from(e.dataTransfer.files);
                handleFileUpload(files, note, list, map);
            });
            
            // 文件选择处理
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                handleFileUpload(files, note, list, map);
                e.target.value = ''; // 清空选择
            });
            
            // 附件列表容器
            const attachmentList = createElement('div', {
                className: 'nsn-attachment-list',
                style: {
                    flex: '1',
                    overflow: 'auto',
                    maxHeight: '300px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '16px'
                }
            });
            
            // 渲染附件列表
            function renderAttachmentList() {
                attachmentList.innerHTML = '';
                
                if (!note.attachments || note.attachments.length === 0) {
                    const emptyMsg = createElement('div', {
                        style: {
                            padding: '20px',
                            textAlign: 'center',
                            color: '#6b7280',
                            fontSize: '14px'
                        }
                    }, ['暂无附件']);
                    attachmentList.appendChild(emptyMsg);
                    return;
                }
                
                note.attachments.forEach((attachment, index) => {
                    const attachmentItem = createElement('div', {
                        style: {
                            padding: '12px',
                            borderBottom: '1px solid #f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }
                    });
                    
                    const fileInfo = createElement('div', {
                        style: { flex: '1' }
                    });
                    
                    const fileName = createElement('div', {
                        style: {
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '4px'
                        }
                    }, [attachment.name]);
                    
                    const fileSize = createElement('div', {
                        style: {
                            fontSize: '12px',
                            color: '#6b7280'
                        }
                    }, [formatFileSize(attachment.size)]);
                    
                    fileInfo.appendChild(fileName);
                    fileInfo.appendChild(fileSize);
                    
                    const actionButtons = createElement('div', {
                        style: {
                            display: 'flex',
                            gap: '8px'
                        }
                    });
                    
                    const insertBtn = createElement('button', {
                        style: {
                            padding: '4px 8px',
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }
                    }, ['插入']);
                    
                    insertBtn.addEventListener('click', () => {
                        insertAttachmentToNote(attachment);
                        attachmentModal.remove();
                    });
                    
                    const downloadBtn = createElement('button', {
                        style: {
                            padding: '4px 8px',
                            background: '#409eff',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }
                    }, ['下载']);
                    
                    downloadBtn.addEventListener('click', () => {
                        downloadAttachment(attachment);
                    });
                    
                    const deleteBtn = createElement('button', {
                        style: {
                            padding: '4px 8px',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }
                    }, ['删除']);
                    
                    deleteBtn.addEventListener('click', () => {
                        if (confirm(`确定要删除附件"${attachment.name}"吗？`)) {
                            deleteAttachment(index, note, list, map);
                            renderAttachmentList();
                        }
                    });
                    
                    actionButtons.appendChild(insertBtn);
                    actionButtons.appendChild(downloadBtn);
                    actionButtons.appendChild(deleteBtn);
                    
                    attachmentItem.appendChild(fileInfo);
                    attachmentItem.appendChild(actionButtons);
                    attachmentList.appendChild(attachmentItem);
                });
            }
            
            // 按钮区域
            const buttonArea = createElement('div', {
                style: {
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end'
                }
            });
            
            const closeBtn = createElement('button', {
                style: {
                    padding: '8px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    background: '#f9fafb',
                    color: '#374151',
                    cursor: 'pointer'
                }
            }, ['关闭']);
            
            closeBtn.addEventListener('click', () => {
                attachmentModal.remove();
            });
            
            buttonArea.appendChild(closeBtn);
            
            modalContent.appendChild(title);
            modalContent.appendChild(uploadArea);
            modalContent.appendChild(fileInput);
            modalContent.appendChild(attachmentList);
            modalContent.appendChild(buttonArea);
            attachmentModal.appendChild(modalContent);
            
            // 注释掉点击背景关闭弹窗的功能
            // attachmentModal.addEventListener('click', (e) => {
            //     if (e.target === attachmentModal) {
            //         attachmentModal.remove();
            //     }
            // });
            
            // 初始渲染附件列表
            renderAttachmentList();
            
            document.body.appendChild(attachmentModal);
        }
        
        // 处理文件上传
        function handleFileUpload(files, note, list, map) {
            const maxSize = 10 * 1024 * 1024; // 10MB
            const validFiles = [];
            const invalidFiles = [];
            
            files.forEach(file => {
                if (file.size > maxSize) {
                    invalidFiles.push(file.name);
                } else {
                    validFiles.push(file);
                }
            });
            
            if (invalidFiles.length > 0) {
                alert(`以下文件超过10MB限制，无法上传：\n${invalidFiles.join('\n')}`);
            }
            
            if (validFiles.length === 0) return;
            
            // 初始化附件数组
            if (!note.attachments) {
                note.attachments = [];
            }
            
            // 处理有效文件
            validFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const attachment = {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        data: e.target.result,
                        uploadedAt: Date.now()
                    };
                    
                    note.attachments.push(attachment);
                    
                    // 保存到localStorage
                    map[currentCategoryId] = list;
                    writeJSON(LS_KEYS.notes, map);
                    
                    // 重新渲染附件列表
                    const attachmentList = document.querySelector('.nsn-attachment-list');
                    if (attachmentList) {
                        // 重新渲染附件列表
                        attachmentList.innerHTML = '';
                        
                        if (!note.attachments || note.attachments.length === 0) {
                            const emptyMsg = createElement('div', {
                                style: {
                                    padding: '20px',
                                    textAlign: 'center',
                                    color: '#6b7280',
                                    fontSize: '14px'
                                }
                            }, ['暂无附件']);
                            attachmentList.appendChild(emptyMsg);
                        } else {
                            note.attachments.forEach((attachment, index) => {
                                const attachmentItem = createElement('div', {
                                    style: {
                                        padding: '12px',
                                        borderBottom: '1px solid #f3f4f6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }
                                });
                                
                                const fileInfo = createElement('div', {
                                    style: { flex: '1' }
                                });
                                
                                const fileName = createElement('div', {
                                    style: {
                                        fontWeight: '500',
                                        color: '#374151',
                                        marginBottom: '4px'
                                    }
                                }, [attachment.name]);
                                
                                const fileSize = createElement('div', {
                                    style: {
                                        fontSize: '12px',
                                        color: '#6b7280'
                                    }
                                }, [formatFileSize(attachment.size)]);
                                
                                fileInfo.appendChild(fileName);
                                fileInfo.appendChild(fileSize);
                                
                                const actionButtons = createElement('div', {
                                    style: {
                                        display: 'flex',
                                        gap: '8px'
                                    }
                                });
                                
                                const insertBtn = createElement('button', {
                                    style: {
                                        padding: '4px 8px',
                                        background: '#10b981',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }
                                }, ['插入']);
                                
                                insertBtn.addEventListener('click', () => {
                                    insertAttachmentToNote(attachment);
                                    const modal = document.querySelector('.nsn-attachment-modal');
                                    if (modal) {
                                        modal.remove();
                                    }
                                });
                                
                                const downloadBtn = createElement('button', {
                                    style: {
                                        padding: '4px 8px',
                                        background: '#409eff',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }
                                }, ['下载']);
                                
                                downloadBtn.addEventListener('click', () => {
                                    downloadAttachment(attachment);
                                });
                                
                                const deleteBtn = createElement('button', {
                                    style: {
                                        padding: '4px 8px',
                                        background: '#ef4444',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }
                                }, ['删除']);
                                
                                deleteBtn.addEventListener('click', () => {
                                    if (confirm(`确定要删除附件"${attachment.name}"吗？`)) {
                                        deleteAttachment(index, note, list, map);
                                        // 重新渲染整个列表
                                        const modal = document.querySelector('.nsn-attachment-modal');
                                        if (modal) {
                                            modal.remove();
                                            showAttachmentDialog();
                                        }
                                    }
                                });
                                
                                actionButtons.appendChild(insertBtn);
                                actionButtons.appendChild(downloadBtn);
                                actionButtons.appendChild(deleteBtn);
                                
                                attachmentItem.appendChild(fileInfo);
                                attachmentItem.appendChild(actionButtons);
                                attachmentList.appendChild(attachmentItem);
                            });
                        }
                    }
                    
                    // 显示上传成功提示
                    showUploadNotification(file.name);
                };
                reader.readAsDataURL(file);
            });
        }
        
        // 下载附件
        function downloadAttachment(attachment) {
            const link = document.createElement('a');
            link.href = attachment.data;
            link.download = attachment.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        // 删除附件
        function deleteAttachment(index, note, list, map) {
            note.attachments.splice(index, 1);
            map[currentCategoryId] = list;
            writeJSON(LS_KEYS.notes, map);
        }
        
        // 格式化文件大小
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        // 插入附件到笔记
        function insertAttachmentToNote(attachment) {
            // 根据文件类型生成不同的插入内容
            let insertHtml = '';
            
            if (attachment.type.startsWith('image/')) {
                // 图片文件：插入图片
                insertHtml = `<div class="nsn-attachment-image" contenteditable="false" style="margin: 10px 0; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; position: relative;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span>📎 附件：${attachment.name}</span>
                        <button class="nsn-attachment-delete" onclick="this.parentElement.parentElement.remove()" style="padding: 2px 6px; background: #ef4444; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;" title="删除附件">×</button>
                    </div>
                    <img src="${attachment.data}" style="max-width: 100%; height: auto; border-radius: 4px;" alt="${attachment.name}">
                </div>`;
            } else if (attachment.type.startsWith('video/')) {
                // 视频文件：插入视频
                insertHtml = `<div class="nsn-attachment-video" contenteditable="false" style="margin: 10px 0; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; position: relative;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span>📎 附件：${attachment.name}</span>
                        <button class="nsn-attachment-delete" onclick="this.parentElement.parentElement.remove()" style="padding: 2px 6px; background: #ef4444; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;" title="删除附件">×</button>
                    </div>
                    <video src="${attachment.data}" controls style="max-width: 100%; border-radius: 4px;"></video>
                </div>`;
            } else if (attachment.type.startsWith('audio/')) {
                // 音频文件：插入音频
                insertHtml = `<div class="nsn-attachment-audio" contenteditable="false" style="margin: 10px 0; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; position: relative;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span>📎 附件：${attachment.name}</span>
                        <button class="nsn-attachment-delete" onclick="this.parentElement.parentElement.remove()" style="padding: 2px 6px; background: #ef4444; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;" title="删除附件">×</button>
                    </div>
                    <audio src="${attachment.data}" controls style="width: 100%;"></audio>
                </div>`;
            } else {
                // 其他文件：插入下载链接
                insertHtml = `<div class="nsn-attachment-file" contenteditable="false" style="margin: 10px 0; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; display: flex; align-items: center; gap: 12px; position: relative;">
                    <div style="font-size: 20px; color: #6b7280;">📎</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 500; color: #374151; margin-bottom: 4px;">${attachment.name}</div>
                        <div style="font-size: 12px; color: #6b7280;">${formatFileSize(attachment.size)}</div>
                    </div>
                    <button onclick="downloadAttachmentFromNote('${attachment.name}', '${attachment.data}')" style="padding: 6px 12px; background: #409eff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 8px;">下载</button>
                    <button class="nsn-attachment-delete" onclick="this.parentElement.remove()" style="padding: 6px 12px; background: #ef4444; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;" title="删除附件">删除</button>
                </div>`;
            }
            
            // 插入到编辑器
            insertHTMLAtCursor(insertHtml);
            
            // 显示插入成功提示
            showInsertNotification(attachment.name);
        }
        
        // 从笔记中下载附件
        function downloadAttachmentFromNote(fileName, fileData) {
            const link = document.createElement('a');
            link.href = fileData;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        // 显示插入成功提示
        function showInsertNotification(fileName) {
            // 移除已存在的提示框
            const existingNotification = document.querySelector('.nsn-insert-notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            // 创建提示框
            const notification = createElement('div', {
                className: 'nsn-insert-notification',
                style: {
                    position: 'absolute',
                    bottom: '60px',
                    right: '20px',
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3), 0 2px 8px rgba(0, 0, 0, 0.1)',
                    zIndex: '1000000001',
                    pointerEvents: 'none',
                    opacity: '0',
                    transform: 'translateY(20px)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }
            }, [`✓ 附件"${fileName}"已插入到笔记`]);
            
            // 确保提示框显示在弹窗内部
            dialog.appendChild(notification);
            
            // 触发入场动画
            requestAnimationFrame(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateY(0)';
            });
            
            // 5秒后自动消失
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        if (notification && notification.parentNode) {
                            notification.remove();
                        }
                    }, 300);
                }
            }, 5000);
        }

        // 代码复制的回退方案
        function fallbackCopyText(text) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.zIndex = '-1';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(ta);
        }

        // 代码复制成功提示
        function showCodeCopyNotification() {
            const existing = document.querySelector('.nsn-code-copy-notification');
            if (existing) existing.remove();
            const n = createElement('div', {
                className: 'nsn-code-copy-notification',
                style: {
                    position: 'absolute',
                    bottom: '60px',
                    right: '20px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3), 0 2px 8px rgba(0, 0, 0, 0.1)',
                    zIndex: '1000000001',
                    pointerEvents: 'none',
                    opacity: '0',
                    transform: 'translateY(20px)',
                    transition: 'all 0.3s'
                }
            }, ['✓ 已复制到剪贴板']);
            dialog.appendChild(n);
            requestAnimationFrame(() => {
                n.style.opacity = '1';
                n.style.transform = 'translateY(0)';
            });
            setTimeout(() => {
                if (n && n.parentNode) {
                    n.style.opacity = '0';
                    n.style.transform = 'translateY(20px)';
                    setTimeout(() => n.parentNode && n.parentNode.removeChild(n), 300);
                }
            }, 2000);
        }

        // 代码删除提示
        function showCodeDeleteNotification() { }

        // 显示上传成功提示
        function showUploadNotification(fileName) {
            // 移除已存在的提示框
            const existingNotification = document.querySelector('.nsn-upload-notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            // 创建提示框
            const notification = createElement('div', {
                className: 'nsn-upload-notification',
                style: {
                    position: 'absolute',
                    bottom: '60px',
                    right: '20px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3), 0 2px 8px rgba(0, 0, 0, 0.1)',
                    zIndex: '1000000001',
                    pointerEvents: 'none',
                    opacity: '0',
                    transform: 'translateY(20px)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }
            }, [`✓ 附件"${fileName}"上传成功`]);
            
            // 确保提示框显示在弹窗内部
            dialog.appendChild(notification);
            
            // 触发入场动画
            requestAnimationFrame(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateY(0)';
            });
            
            // 5秒后自动消失
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        if (notification && notification.parentNode) {
                            notification.remove();
                        }
                    }, 300);
                }
            }, 5000);
        }

        function exportAll(){
            const data = {
                categories: readJSON(LS_KEYS.categories, []),
                notes: readJSON(LS_KEYS.notes, {})
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'nodeseek_notes_backup.json';
            a.click();
            URL.revokeObjectURL(a.href);
        }

        function importAll(){
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = () => {
                const f = input.files && input.files[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const obj = JSON.parse(String(reader.result || '{}'));
                        if (obj && obj.categories && obj.notes) {
                            writeJSON(LS_KEYS.categories, obj.categories);
                            writeJSON(LS_KEYS.notes, obj.notes);
                            currentCategoryId = obj.categories[0]?.id || 'default';
                            currentNoteId = null;
                            renderCategories();
                            renderNotes();
                            clearEditor();
                            alert('导入完成');
                        } else {
                            alert('文件格式不正确');
                        }
                    } catch (e) {
                        alert('导入失败：' + e.message);
                    }
                };
                reader.readAsText(f);
            };
            input.click();
        }

        // 智能将HTML转换为可编辑格式（HTML或Markdown）
        function convertHTMLToEditableFormat(html) {
            // 优先：若包含颜色/背景/字号等样式（包括font标签的color属性或style），一律进入简化流程
            const hasColorLikeStyles = /color\s*:|background(?:-color)?\s*:|font-size\s*:/i.test(html);
            const hasInlineColorTags = /<(font|span)\b[^>]*(\bcolor\s*=|\bstyle\s*=)/i.test(html);
            if (hasColorLikeStyles || hasInlineColorTags) {
                return simplifyHTMLForEditing(html);
            }

            // 若包含基础容器标签（div/p 等），也进行简化，去除这些标签仅保留文本与颜色
            const hasBasicContainers = /<\/?(?:div|p)\b/i.test(html);
            if (hasBasicContainers) {
                return simplifyHTMLForEditing(html);
            }

            // 其次：纯文本很短且无图片容器，直接返回原HTML
            const textContent = html.replace(/<[^>]*>/g, '').trim();
            if (textContent.length < 50 && !html.includes('nsn-resizable-img-container')) {
                return html;
            }
            
            // 检测是否主要包含Markdown转换的特征元素
            const hasMarkdownImages = html.includes('nsn-resizable-img-container');
            const hasMarkdownHeaders = html.match(/<h[1-3][^>]*style[^>]*>/g);
            const hasMarkdownBlockquotes = html.includes('border-left: 4px solid #409eff');
            const hasMarkdownCodeBlocks = html.includes('nsn-code-wrapper') || html.includes('font-family: Consolas');
            
            // 只有当内容明确包含Markdown特征时才转换
            const markdownFeatureCount = [hasMarkdownImages, hasMarkdownHeaders, hasMarkdownBlockquotes, hasMarkdownCodeBlocks].filter(Boolean).length;
            
            if (markdownFeatureCount >= 2 || hasMarkdownImages) {
                const converted = convertHTMLToMarkdown(html);
                // 如果转换结果仍然包含大量HTML标签，则返回原HTML
                const htmlTagCount = (converted.match(/<[^>]*>/g) || []).length;
                const totalLength = converted.length;
                
                // 如果HTML标签占比超过20%，说明转换失败，返回原HTML
                if (htmlTagCount > 0 && (htmlTagCount * 10) / totalLength > 0.2) {
                    return html;
                }
                
                return converted;
            }
            
            return html;
        }
        
        // 将颜色值转换为十六进制格式
        function convertColorToHex(color) {
            if (!color) return color;
            
            // 清理颜色值，移除前后空白
            color = color.toString().trim();
            
            // 如果已经是十六进制格式，直接返回
            if (color.startsWith('#')) {
                return color;
            }
            
            // 处理rgb()格式 - 增强匹配
            if (color.includes('rgb(')) {
                const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
                if (rgbMatch) {
                    const r = parseInt(rgbMatch[1]);
                    const g = parseInt(rgbMatch[2]);
                    const b = parseInt(rgbMatch[3]);
                    
                    // 转换为十六进制
                    const hex = '#' + 
                        r.toString(16).padStart(2, '0') + 
                        g.toString(16).padStart(2, '0') + 
                        b.toString(16).padStart(2, '0');
                    
                    return hex;
                }
            }
            
            // 处理rgba()格式
            if (color.includes('rgba(')) {
                const rgbaMatch = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)/);
                if (rgbaMatch) {
                    const r = parseInt(rgbaMatch[1]);
                    const g = parseInt(rgbaMatch[2]);
                    const b = parseInt(rgbaMatch[3]);
                    
                    // 转换为十六进制（忽略透明度）
                    const hex = '#' + 
                        r.toString(16).padStart(2, '0') + 
                        g.toString(16).padStart(2, '0') + 
                        b.toString(16).padStart(2, '0');
                    return hex;
                }
            }
            
            // 处理常见颜色名称
            const colorNames = {
                'yellow': '#ffff00',
                'red': '#ff0000',
                'blue': '#0000ff',
                'green': '#008000',
                'black': '#000000',
                'white': '#ffffff',
                'orange': '#ffa500',
                'purple': '#800080',
                'pink': '#ffc0cb',
                'gray': '#808080',
                'grey': '#808080'
            };
            
            if (colorNames[color.toLowerCase()]) {
                return colorNames[color.toLowerCase()];
            }
            
            // 如果无法识别，返回原值
            return color;
        }
        
        // 简化HTML，只保留颜色相关的代码
        function simplifyHTMLForEditing(html) {
            // 使用临时div来解析HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            let result = '';
            
            // 递归处理节点，只保留文本和颜色
            function processNode(node) {
                if (node.nodeType === Node.TEXT_NODE) {
                    // 文本节点直接返回内容
                    return node.textContent;
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const tagName = node.tagName.toLowerCase();
                    // 处理图片容器：在源码中显示为Markdown图片链接；
                    // 忽略操作手柄等元素
                    if (node.classList) {
                        if (node.classList.contains('nsn-resizable-img-container')) {
                            const imgEl = node.querySelector('img');
                            const src = imgEl ? (imgEl.getAttribute('src') || '') : '';
                            const alt = imgEl ? (imgEl.getAttribute('alt') || 'image') : 'image';
                            if (src) {
                                const origin = node.getAttribute('data-origin');
                                // 工具栏插入：输出为纯链接；Markdown插入：输出为MD图片
                                if (origin === 'toolbar') {
                                    return src + '\n';
                                }
                                return `![${alt}](${src})\n`;
                            }
                            return '';
                        }
                        if (node.classList.contains('nsn-resize-handle') || node.classList.contains('nsn-delete-handle')) {
                            return '';
                        }
                    }
                    
                    // 处理换行相关的标签
                    if (tagName === 'br') {
                        return '\n';
                    }
                    if (tagName === 'div' || tagName === 'p') {
                        // 处理子节点
                        let childContent = '';
                        for (let child of node.childNodes) {
                            childContent += processNode(child);
                        }
                        // 块级元素后面添加换行符（除非是最后一个元素）
                        return childContent + '\n';
                    }
                    
                    let hasColor = false;
                    let colorInfo = '';
                    
                    // 检查font标签，需要合并color属性和style属性
                    if (tagName === 'font') {
                        const stylesToApply = new Map();
                        
                        // 处理color属性
                        if (node.hasAttribute('color')) {
                            const colorValue = node.getAttribute('color');
                            const hexColor = convertColorToHex(colorValue);
                            stylesToApply.set('color', hexColor);
                            hasColor = true;
                        }
                        
                        // 处理style属性中的颜色和字体大小
                        if (node.style) {
                            if (node.style.color) {
                                const hexColor = convertColorToHex(node.style.color);
                                stylesToApply.set('color', hexColor); // 覆盖color属性
                                hasColor = true;
                            }
                            if (node.style.backgroundColor) {
                                const hexBgColor = convertColorToHex(node.style.backgroundColor);
                                stylesToApply.set('background-color', hexBgColor);
                                hasColor = true;
                            }
                            if (node.style.fontSize) {
                                const fontSize = node.style.fontSize;
                                const sizeValue = parseInt(fontSize);
                                if (sizeValue > 32) {
                                    stylesToApply.set('font-size', '32px');
                                } else {
                                    stylesToApply.set('font-size', fontSize);
                                }
                                hasColor = true;
                            }
                        }
                        
                        // 额外处理：如果有style属性字符串，也要解析其中的颜色
                        if (node.hasAttribute('style')) {
                            const styleAttr = node.getAttribute('style');
                            // 解析background-color - 使用更强健的正则表达式
                            const bgColorMatch = styleAttr.match(/background-color\s*:\s*([^;]+?)(?:;|$)/i);
                            if (bgColorMatch) {
                                const originalColor = bgColorMatch[1].trim();
                                
                                
                                // 特别处理rgb格式
                                if (originalColor.includes('rgb(')) {
                                    const rgbMatch = originalColor.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
                                    if (rgbMatch) {
                                        const r = parseInt(rgbMatch[1]);
                                        const g = parseInt(rgbMatch[2]);
                                        const b = parseInt(rgbMatch[3]);
                                        const hex = '#' + 
                                            r.toString(16).padStart(2, '0') + 
                                            g.toString(16).padStart(2, '0') + 
                                            b.toString(16).padStart(2, '0');
                                        stylesToApply.set('background-color', hex);
                                        hasColor = true;
                                    }
                                } else {
                                    const hexBgColor = convertColorToHex(originalColor);
                                    stylesToApply.set('background-color', hexBgColor);
                                    hasColor = true;
                                }
                            }
                            // 解析color
                            const colorMatch = styleAttr.match(/(?:^|;)\s*color:\s*([^;]+)/i);
                            if (colorMatch) {
                                const hexColor = convertColorToHex(colorMatch[1].trim());
                                stylesToApply.set('color', hexColor);
                                hasColor = true;
                            }
                            // 解析font-size
                            const fontSizeMatch = styleAttr.match(/font-size:\s*([^;]+)/i);
                            if (fontSizeMatch) {
                                const fontSize = fontSizeMatch[1].trim();
                                const sizeValue = parseInt(fontSize);
                                if (sizeValue > 32) {
                                    stylesToApply.set('font-size', '32px');
                                } else {
                                    stylesToApply.set('font-size', fontSize);
                                }
                                hasColor = true;
                            }
                        }
                        
                        // 生成style属性
                        if (stylesToApply.size > 0) {
                            const styleArray = [];
                            for (const [property, value] of stylesToApply) {
                                styleArray.push(`${property}: ${value}`);
                            }
                            colorInfo = ` style="${styleArray.join('; ')}"`;
                        }
                    }
                    // 检查其他标签的style中的颜色和字体大小
                    else if (node.style && (node.style.color || node.style.backgroundColor || node.style.fontSize)) {
                        hasColor = true;
                        const styles = [];
                        if (node.style.color) {
                            const color = convertColorToHex(node.style.color);
                            styles.push(`color: ${color}`);
                        }
                        if (node.style.backgroundColor) {
                            const bgColor = convertColorToHex(node.style.backgroundColor);
                            styles.push(`background-color: ${bgColor}`);
                        }
                        if (node.style.fontSize) {
                            // 限制字体大小最大为32px
                            const fontSize = node.style.fontSize;
                            const sizeValue = parseInt(fontSize);
                            if (sizeValue > 32) {
                                styles.push(`font-size: 32px`);
                            } else {
                                styles.push(`font-size: ${fontSize}`);
                            }
                        }
                        if (styles.length > 0) {
                            colorInfo = ` style="${styles.join('; ')}"`;
                        }
                    }
                    
                    // 处理子节点
                    let childContent = '';
                    for (let child of node.childNodes) {
                        childContent += processNode(child);
                    }
                    
                    // 只保留有颜色或字体大小的font标签
                    if (hasColor && tagName === 'font') {
                        // 如果内容为空（仅空格/换行），则不输出空font标签
                        if (!/[\S]/.test(childContent)) {
                            return '';
                        }
                        return `<font${colorInfo}>${childContent}</font>`;
                    }
                    // 其他情况只返回内容，不要标签
                    else {
                        return childContent;
                    }
                }
                return '';
            }
            
            // 处理所有子节点（保留顶层文本后的换行）
            const topChildren = Array.from(tempDiv.childNodes);
            for (let i = 0; i < topChildren.length; i++) {
                const child = topChildren[i];
                const part = processNode(child);
                result += part;
                // 若顶层是纯文本节点，且后面还有内容，则补一个换行，避免与下一块级内容合并
                if (child.nodeType === Node.TEXT_NODE && /\S/.test(part) && i < topChildren.length - 1) {
                    if (!result.endsWith('\n')) {
                        result += '\n';
                    }
                }
            }
            
            // 保持换行符，只清理多余的空格和多余的连续换行符，并清理空的font标签
            result = result.replace(/[ \t]+/g, ' ') // 清理多余空格和制表符
                          .replace(/\r\n/g, '\n') // 统一换行
                          .replace(/\n{3,}/g, '\n\n') // 最多保留两个连续换行符
                          // 清理空的font标签（包含空格/换行的情形）
                          .replace(/<font[^>]*>\s*<\/font>/gi, '')
                          .trim();
            
            return result;
        }
        
        // 将HTML转换为Markdown格式
        function convertHTMLToMarkdown(html) {
            let markdown = html;
            
            // 转换可调整大小的图片容器为Markdown语法
            markdown = markdown.replace(
                /<div class="nsn-resizable-img-container"[^>]*><img src="([^"]*)"[^>]*alt="([^"]*)"[^>]*><div class="nsn-resize-handle"[^>]*><\/div><\/div>/g,
                '![$2]($1)'
            );
            
            // 处理没有alt属性的图片
            markdown = markdown.replace(
                /<div class="nsn-resizable-img-container"[^>]*><img src="([^"]*)"[^>]*><div class="nsn-resize-handle"[^>]*><\/div><\/div>/g,
                '![image]($1)'
            );
            
            // 转换标题
            markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gs, '# $1');
            markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gs, '## $1');
            markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gs, '### $1');
            
            // 转换粗体和斜体
            markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gs, '**$1**');
            markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gs, '**$1**');
            markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gs, '*$1*');
            markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gs, '*$1*');
            
            // 转换引用
            markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gs, '> $1');
            
            // 转换代码块
            markdown = markdown.replace(/<div class="nsn-code-wrapper"[^>]*>.*?<pre class="nsn-code-block"[^>]*>(.*?)<\/pre><\/div>/gs, '```\n$1\n```');
            
            // 转换行内代码
            markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gs, '`$1`');
            
            // 转换链接
            markdown = markdown.replace(/<span class="nsn-editable-link"[^>]*data-href="([^"]*)"[^>]*>(.*?)<\/span>/gs, '[$2]($1)');
            markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gs, '[$2]($1)');
            
            // 转换列表
            markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gs, '$1');
            markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gs, '$1');
            markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gs, '- $1');
            
            // 清理常见的HTML标签
            markdown = markdown.replace(/<div[^>]*>/g, '');
            markdown = markdown.replace(/<\/div>/g, '');
            markdown = markdown.replace(/<span[^>]*>/g, '');
            markdown = markdown.replace(/<\/span>/g, '');
            
            // 清理段落标签
            markdown = markdown.replace(/<p[^>]*>/g, '');
            markdown = markdown.replace(/<\/p>/g, '\n\n');
            
            // 清理换行标签
            markdown = markdown.replace(/<br\s*\/?>/g, '\n');
            
            // 清理其他常见标签
            markdown = markdown.replace(/<\/?[^>]+(>|$)/g, '');
            
            // 清理多余的空行
            markdown = markdown.replace(/\n{3,}/g, '\n\n');
            
            // 清理首尾空白
            return markdown.trim();
        }
        
        // 智能将编辑后的内容转换为HTML
        function convertEditableFormatToHTML(content) {
            // 检测内容格式
            const isMarkdown = detectMarkdownFormat(content);
            
            let result;
            if (isMarkdown) {
                // 如果是Markdown格式，转换为HTML
                result = convertMarkdownToHTML(content);
            } else {
                // 如果是HTML格式，直接使用
                result = content;
            }
            
            // 限制字体大小最大为32px
            result = result.replace(/font-size:\s*(\d+)px/g, (match, size) => {
                const sizeValue = parseInt(size);
                if (sizeValue > 32) {
                    return 'font-size: 32px';
                }
                return match;
            });
            
            // 转换颜色格式为十六进制
            result = result.replace(/color:\s*([^;]+)/g, (match, color) => {
                const hexColor = convertColorToHex(color.trim());
                return `color: ${hexColor}`;
            });
            
            result = result.replace(/background-color:\s*([^;]+)/g, (match, color) => {
                const hexColor = convertColorToHex(color.trim());
                return `background-color: ${hexColor}`;
            });
            
            // 额外处理直接的RGB格式
            result = result.replace(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g, (match, r, g, b) => {
                const hex = '#' + 
                    parseInt(r).toString(16).padStart(2, '0') + 
                    parseInt(g).toString(16).padStart(2, '0') + 
                    parseInt(b).toString(16).padStart(2, '0');
                return hex;
            });
            
            return result;
        }
        
        // 检测内容是否为Markdown格式
        function detectMarkdownFormat(content) {
            const markdownPatterns = [
                /^#{1,6}\s+/m,           // 标题
                /!\[.*?\]\(.*?\)/,       // 图片
                /\[.*?\]\(.*?\)/,        // 链接
                /^\*\*.*?\*\*/m,         // 粗体
                /^\*.*?\*/m,             // 斜体
                /^>\s+/m,                // 引用
                /^```/m,                 // 代码块
                /`.*?`/,                 // 行内代码
            ];
            
            // 如果包含HTML标签但不包含Markdown语法，判断为HTML
            const hasHTMLTags = /<[^>]+>/.test(content);
            const hasMarkdownSyntax = markdownPatterns.some(pattern => pattern.test(content));
            
            // 如果有Markdown语法或者没有HTML标签，判断为Markdown
            return hasMarkdownSyntax || !hasHTMLTags;
        }

        function showSourceDialog() {
            // 检查是否有选中的笔记
            if (!currentNoteId) {
                alert('请先选择一个笔记');
                return;
            }

            // 创建源码编辑弹窗
            const sourceModal = createElement('div', {
                style: {
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: '1000000002',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }
            });

            const modalContent = createElement('div', {
                style: {
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '20px',
                    maxWidth: '90vw',
                    width: '800px',
                    maxHeight: '80vh',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }
            });

            // 标题
            const title = createElement('div', {
                style: {
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '16px',
                    textAlign: 'center'
                }
            }, ['编辑器']);

            // 源码输入区域
            const sourceTextarea = createElement('textarea', {
                style: {
                    flex: '1',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    resize: 'none',
                    boxSizing: 'border-box',
                    minHeight: '400px',
                    marginBottom: '16px'
                },
                placeholder: '支持HTML和Markdown格式编辑...\n\n示例Markdown语法：\n# 标题\n**粗体** *斜体*\n![图片](URL)\n[链接](URL)\n> 引用\n```代码块```'
            });

            // 智能转换HTML内容为可编辑格式
            sourceTextarea.value = convertHTMLToEditableFormat(editor.innerHTML);

            // 按钮区域
            const buttonArea = createElement('div', {
                style: {
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end'
                }
            });

            const cancelBtn = createElement('button', {
                style: {
                    padding: '8px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    background: '#f9fafb',
                    color: '#374151',
                    cursor: 'pointer'
                }
            }, ['取消']);

            const applyBtn = createElement('button', {
                style: {
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#409eff',
                    color: '#fff',
                    cursor: 'pointer'
                }
            }, ['应用']);

            buttonArea.appendChild(cancelBtn);
            buttonArea.appendChild(applyBtn);

            modalContent.appendChild(title);
            modalContent.appendChild(sourceTextarea);
            modalContent.appendChild(buttonArea);
            sourceModal.appendChild(modalContent);
            document.body.appendChild(sourceModal);

            // 自动聚焦到文本框
            sourceTextarea.focus();

            // 事件处理
            cancelBtn.addEventListener('click', () => {
                sourceModal.remove();
            });

            applyBtn.addEventListener('click', () => {
                // 智能转换编辑后的内容并应用到编辑器
                const processedHtml = convertEditableFormatToHTML(sourceTextarea.value);
                editor.innerHTML = processedHtml;
                
                // 重新初始化图片和表格功能
                setTimeout(() => {
                    attachResizeListeners();
                    attachTableOperations();
                }, 100);
                
                sourceModal.remove();
            });

            // 点击背景关闭弹窗
            sourceModal.addEventListener('click', (e) => {
                if (e.target === sourceModal) {
                    sourceModal.remove();
                }
            });
        }

        // 绑定编辑器按钮事件（在函数定义后）
        if (window.nsn_editorBtn) {
            window.nsn_editorBtn.addEventListener('click', () => {
                showSourceDialog();
            });
        }

        function attachResizeListeners() {
            const containers = editor.querySelectorAll('.nsn-resizable-img-container:not([data-listeners-attached])');
            containers.forEach(container => {
                attachResizeListenersToContainer(container);
            });
        }

        function attachResizeListenersToContainer(container) {
            // 防止重复绑定 - 但如果事件监听器已经丢失，则重新绑定
            if (container.hasAttribute('data-listeners-attached')) {
                // 检查监听器是否还存在（通过检查是否有resize handle的mousedown事件）
                const handle = container.querySelector('.nsn-resize-handle');
                if (handle && handle._resizeHandlerAttached) {
                    return; // 已经正确绑定，无需重复
                }
                // 如果监听器丢失，移除标记以便重新绑定
                container.removeAttribute('data-listeners-attached');
            }
            container.setAttribute('data-listeners-attached', 'true');
            
            const img = container.querySelector('img');
            const handle = container.querySelector('.nsn-resize-handle');
            let del = container.querySelector('.nsn-delete-handle');
            if (!del) {
                del = document.createElement('div');
                del.className = 'nsn-delete-handle';
                del.title = '删除图片';
                del.textContent = '×';
                del.style.cssText = 'position: absolute; top: -8px; right: -8px; width: 18px; height: 18px; background: #ef4444; color: #fff; font-size: 12px; border-radius: 50%; display: none; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.3);';
                container.appendChild(del);
            }
            
            if (!img || !handle) return;
            
            // 鼠标进入显示拖拽手柄
            const mouseEnterHandler = () => {
                handle.style.display = 'block';
                del.style.display = 'flex';
                container.style.border = '1px dashed #409eff';
            };
            container.addEventListener('mouseenter', mouseEnterHandler);
            
            // 鼠标离开隐藏拖拽手柄
            const mouseLeaveHandler = () => {
                if (!handle._isDragging) {
                    handle.style.display = 'none';
                    del.style.display = 'none';
                    container.style.border = '1px dashed transparent';
                }
            };
            container.addEventListener('mouseleave', mouseLeaveHandler);

            // 点击删除按钮，直接删除容器
            const onDelete = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (container && container.parentNode) {
                    container.parentNode.removeChild(container);
                }
            };
            del.addEventListener('mousedown', (e) => e.preventDefault());
            del.addEventListener('click', onDelete);
            
            // 拖拽调整大小
            const resizeHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                handle._isDragging = true;
                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = img.offsetWidth;
                const startHeight = img.offsetHeight;
                const aspectRatio = startWidth / startHeight;
                
                const onMouseMove = (moveEvent) => {
                    const deltaX = moveEvent.clientX - startX;
                    const deltaY = moveEvent.clientY - startY;
                    
                    // 根据x方向的变化计算新尺寸，保持宽高比
                    let newWidth = Math.max(50, startWidth + deltaX);
                    let newHeight = newWidth / aspectRatio;
                    
                    // 计算可用的最大尺寸，避免遮挡底部按钮
                    const maxWidth = editor.offsetWidth - 40;
                    const bottomBar = editor.parentElement.querySelector('.nsn-bottom');
                    const bottomBarHeight = bottomBar ? bottomBar.offsetHeight + 20 : 60;
                    const maxHeight = editor.offsetHeight - bottomBarHeight;
                    
                    // 限制最大宽度
                    if (newWidth > maxWidth) {
                        newWidth = maxWidth;
                        newHeight = newWidth / aspectRatio;
                    }
                    
                    // 限制最大高度，避免遮挡底部按钮
                    if (newHeight > maxHeight) {
                        newHeight = maxHeight;
                        newWidth = newHeight * aspectRatio;
                        if (newWidth > maxWidth) {
                            newWidth = maxWidth;
                            newHeight = newWidth / aspectRatio;
                        }
                    }
                    
                    img.style.width = newWidth + 'px';
                    img.style.height = newHeight + 'px';
                    img.style.maxWidth = 'none';
                };
                
                const onMouseUp = (upEvent) => {
                    handle._isDragging = false;
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    
                    // 检查是否仍在容器内，如果不在则隐藏手柄
                    const rect = container.getBoundingClientRect();
                    const mouseX = upEvent.clientX;
                    const mouseY = upEvent.clientY;
                    if (mouseX < rect.left || mouseX > rect.right || mouseY < rect.top || mouseY > rect.bottom) {
                        handle.style.display = 'none';
                        container.style.border = '1px dashed transparent';
                    }
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
            
            handle.addEventListener('mousedown', resizeHandler);
            
            // 标记监听器已正确绑定
            handle._resizeHandlerAttached = true;
        }

        // 将图片调整相关函数暴露到全局，避免作用域导致的未定义错误
        if (typeof window !== 'undefined') {
            window.attachResizeListeners = attachResizeListeners;
            window.attachResizeListenersToContainer = attachResizeListenersToContainer;
        }

        function execCommand(action, value){
            if (action === 'fontSizePx') {
                // 限制字体大小最大为32px
                const sizeValue = parseInt(value);
                if (sizeValue > 32) {
                    value = '32px';
                }
                
                document.execCommand('fontSize', false, '7');
                const fontElements = document.getElementsByTagName('font');
                for (let i = 0; i < fontElements.length; i++) {
                    if (fontElements[i].size === '7') {
                        fontElements[i].removeAttribute('size');
                        fontElements[i].style.fontSize = value;
                    }
                }
                return;
            }
            if (action === 'insertHTML') {
                // 智能插入HTML内容，无论焦点是否在编辑器内都能正确插入
                insertHTMLAtCursor(value);
                // 如果插入的是图片容器，添加调整大小功能
                if (value.includes('nsn-resizable-img-container')) {
                    requestAnimationFrame(() => {
                        attachResizeListeners();
                    });
                }
                return;
            }
            if (action === 'foreColor' || action === 'backColor') {
                // 确保编辑器获得焦点
                editor.focus();
                document.execCommand(action, false, value);
                return;
            }
            if (action === 'createLink' || action === 'insertImage') {
                document.execCommand(action, false, value);
                return;
            }
            document.execCommand(action, false, null);
        }

        // 智能插入HTML内容的函数
        function insertHTMLAtCursor(html) {
            // 先尝试获取当前选区
            const selection = window.getSelection();
            let range = null;
            
            // 检查是否有选区且选区在编辑器内
            if (selection && selection.rangeCount > 0) {
                const currentRange = selection.getRangeAt(0);
                const container = currentRange.commonAncestorContainer;
                
                // 检查选区是否在编辑器内部或编辑器元素本身
                if (editor.contains(container) || container === editor) {
                    range = currentRange;
                }
            }
            
            // 如果没有有效选区或选区不在编辑器内，在编辑器末尾插入
            if (!range) {
                // 然后在编辑器末尾创建一个新的选区
                range = document.createRange();
                
                if (editor.childNodes.length === 0) {
                    // 空编辑器，创建一个文本节点作为插入点
                    const textNode = document.createTextNode('');
                    editor.appendChild(textNode);
                    range.setStart(textNode, 0);
                    range.setEnd(textNode, 0);
                } else {
                    // 在最后一个子节点后面设置选区
                    const lastChild = editor.lastChild;
                    if (lastChild.nodeType === Node.TEXT_NODE) {
                        range.setStart(lastChild, lastChild.textContent.length);
                        range.setEnd(lastChild, lastChild.textContent.length);
                    } else {
                        range.setStartAfter(lastChild);
                        range.setEndAfter(lastChild);
                    }
                }
            }
            
            // 使用DOM操作插入HTML内容
            try {
                // 创建HTML元素
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                
                // 使用Range.insertNode精确插入
                const fragment = document.createDocumentFragment();
                while (tempDiv.firstChild) {
                    fragment.appendChild(tempDiv.firstChild);
                }
                
                // 清除选区内容（如果有选中内容）
                range.deleteContents();
                
                // 插入新内容
                range.insertNode(fragment);
                
                // 设置新的光标位置在插入内容后面
                range.collapse(false);
                
                // 更新选区
                selection.removeAllRanges();
                selection.addRange(range);
                
                // 确保编辑器获得焦点
                editor.focus();
                
                // 代码块插入后的段落补偿：
                // - 若代码块位于编辑器第一行，则在其后保证有2个段落
                // - 否则在其后保证有1个段落
                if (typeof html === 'string' && html.indexOf('nsn-code-wrapper') !== -1) {
                    setTimeout(() => {
                        // 仅处理刚插入到末尾或当前插入点后的代码块
                        let codeWrapper = null;
                        // 优先尝试使用末尾的代码块（大多数情况下插入点在末尾或当前位置）
                        const wrappers = editor.querySelectorAll('.nsn-code-wrapper');
                        if (wrappers.length > 0) {
                            codeWrapper = wrappers[wrappers.length - 1];
                        }
                        if (!codeWrapper || !editor.contains(codeWrapper)) return;
                        
                        // 判断是否在编辑器第一行（忽略文本节点）
                        let firstElementChild = editor.firstElementChild;
                        const isAtTop = firstElementChild === codeWrapper;
                        const requiredParagraphs = isAtTop ? 2 : 1;

                        // 第一排插入时不再在前面加入空段落
                        
                        // 统计代码块后连续<P>的数量
                        let count = 0;
                        let node = codeWrapper.nextSibling;
                        while (node && node.nodeType === Node.ELEMENT_NODE && node.tagName === 'P') {
                            count++;
                            node = node.nextSibling;
                        }
                        
                        // 需要补齐的段落数量
                        const needToAdd = requiredParagraphs - count;
                        for (let i = 0; i < needToAdd; i++) {
                            const p = document.createElement('p');
                            p.innerHTML = '<br>';
                            const after = codeWrapper.nextSibling;
                            if (after) {
                                editor.insertBefore(p, after);
                            } else {
                                editor.appendChild(p);
                            }
                        }

                        // 将光标移动到代码块后第一个段落的末尾，确保能立即在外部输入
                        const firstAfter = codeWrapper.nextSibling;
                        if (firstAfter && firstAfter.nodeType === Node.ELEMENT_NODE && firstAfter.tagName === 'P') {
                            const r = document.createRange();
                            // 放在<P>内部文本末尾
                            const lastChild = firstAfter.lastChild;
                            if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
                                r.setStart(lastChild, lastChild.textContent.length);
                                r.setEnd(lastChild, lastChild.textContent.length);
                            } else {
                                r.selectNodeContents(firstAfter);
                                r.collapse(false);
                            }
                            const sel = window.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(r);
                            editor.focus();
                        }
                    }, 0);
                }
                
            } catch (error) {
                console.warn('使用Range API插入失败，尝试传统方法:', error);
                
                // 如果Range API失败，尝试传统方法（需要焦点）
                editor.focus();
                if (document.execCommand && document.queryCommandSupported('insertHTML')) {
                    document.execCommand('insertHTML', false, html);
                } else {
                    // 最后的备选方案：直接添加到末尾
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    while (tempDiv.firstChild) {
                        editor.appendChild(tempDiv.firstChild);
                    }
                }
            }
        }

        // 事件绑定
        header.querySelector('.nsn-close').addEventListener('click', () => {
            stopAutoSave(); // 停止自动保存
            overlay.remove();
        });
        addCatBtn.addEventListener('click', addCategory);
        editCatBtn.addEventListener('click', editCategory);
        deleteCatBtn.addEventListener('click', deleteCategory);
        catSelect && catSelect.addEventListener('change', () => {
            currentCategoryId = catSelect.value;
            window.currentCategoryId = currentCategoryId;
            currentNoteId = null;
            window.currentNoteId = currentNoteId;
            renderNotes();
            clearEditor();
            // clearEditor 已经包含了 updateSaveState()
        });
        addNoteBtn.addEventListener('click', createNewNote);
        saveBtn.addEventListener('click', () => {
            const success = saveCurrent();
            if (success) {
                showSaveNotification();
            }
        });
        historyBtn.addEventListener('click', showHistoryDialog);
        attachmentBtn.addEventListener('click', showAttachmentDialog);
        trashBtn.addEventListener('click', showTrashDialog);
        deleteNoteBtn.addEventListener('click', deleteCurrentNote);
        exportBtn.addEventListener('click', exportAll);
        importBtn.addEventListener('click', importAll);

        // 首次渲染
        renderCategories();
        renderNotes();
        
        // 初始化按钮文本
        updateButtonTexts();
        
        // 启动自动保存
        startAutoSave();
        
        // 初始化保存状态
        updateSaveState();
        
        // 为编辑器中已存在的图片添加调整大小功能
        setTimeout(() => {
            attachResizeListeners();
        }, 100);
        
        // 监听编辑器内容变化，为新加载的图片添加调整大小功能，为表格添加操作功能
        const observer = new MutationObserver((mutations) => {
            let hasNewImageContainer = false;
            let hasNewTableContainer = false;
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    // 检查新增节点是否为图片容器或包含图片容器
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList && node.classList.contains('nsn-resizable-img-container')) {
                            attachResizeListenersToContainer(node);
                            hasNewImageContainer = true;
                        } else if (node.classList && node.classList.contains('nsn-table-container')) {
                            attachTableOperationsToContainer(node);
                            hasNewTableContainer = true;
                        } else if (node.querySelectorAll) {
                            const containers = node.querySelectorAll('.nsn-resizable-img-container');
                            if (containers.length > 0) {
                                containers.forEach(container => {
                                    attachResizeListenersToContainer(container);
                                });
                                hasNewImageContainer = true;
                            }
                            
                            const tableContainers = node.querySelectorAll('.nsn-table-container');
                            if (tableContainers.length > 0) {
                                tableContainers.forEach(container => {
                                    attachTableOperationsToContainer(container);
                                });
                                hasNewTableContainer = true;
                            }
                        }
                    }
                });
            });
            
            // 如果没有新的容器，但可能有其他变化，也做一次检查
            if (!hasNewImageContainer) {
                attachResizeListeners();
            }
            if (!hasNewTableContainer) {
                attachTableOperations();
            }
        });
        observer.observe(editor, { childList: true, subtree: true });
        // 代码块相关的初始化与编辑/复制/删除功能已移除
        let linkModal = null;
        
        // 创建或获取弹窗
        function getModal() {
            if (!linkModal) {
                linkModal = document.createElement('div');
                linkModal.className = 'nsn-link-modal';
                linkModal.innerHTML = `
                    <div class="nsn-link-modal-content">
                        <div class="nsn-link-modal-header">链接操作</div>
                        <div class="nsn-link-modal-url"></div>
                        <div class="nsn-link-modal-buttons">
                            <button class="nsn-link-modal-btn primary" data-action="open">跳转</button>
                            <button class="nsn-link-modal-btn secondary" data-action="edit">编辑</button>
                            <button class="nsn-link-modal-btn danger" data-action="close">取消</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(linkModal);
                
                // 绑定弹窗事件
                linkModal.addEventListener('click', (e) => {
                    const action = e.target.getAttribute('data-action');
                    if (action) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const currentLink = linkModal._currentLink;
                        if (!currentLink) return;
                        
                        hideModal();
                        
                        if (action === 'open') {
                            // 跳转链接
                            const url = currentLink.getAttribute('data-href');
                            if (url) {
                                window.open(url, '_blank');
                            }
                        } else if (action === 'edit') {
                            // 编辑链接
                            const currentText = currentLink.textContent;
                            const currentUrl = currentLink.getAttribute('data-href');
                            
                            setTimeout(() => {
                                const newText = prompt('编辑链接文本：', currentText);
                                if (newText !== null && newText.trim()) {
                                    setTimeout(() => {
                                        const newUrl = prompt('编辑链接地址：', currentUrl);
                                        if (newUrl !== null && newUrl.trim()) {
                                            currentLink.textContent = newText.trim();
                                            currentLink.setAttribute('data-href', newUrl.trim());
                                        }
                                    }, 50);
                                }
                            }, 50);
                        }
                    }
                });
                
                // 注释掉点击背景关闭弹窗的功能
                // linkModal.addEventListener('click', (e) => {
                //     if (e.target === linkModal) {
                //         hideModal();
                //     }
                // });
            }
            return linkModal;
        }
        
        // 显示弹窗
        function showModal(linkElement) {
            const modal = getModal();
            const url = linkElement.getAttribute('data-href');
            
            modal.querySelector('.nsn-link-modal-url').textContent = url;
            modal._currentLink = linkElement;
            modal.classList.add('show');
        }
        
        // 隐藏弹窗
        function hideModal() {
            if (linkModal) {
                linkModal.classList.remove('show');
                linkModal._currentLink = null;
            }
        }
        
        editor.addEventListener('click', (e) => {
            const linkElement = e.target.closest('.nsn-editable-link');
            if (linkElement) {
                e.preventDefault();
                e.stopPropagation();
                
                // 显示操作弹窗
                showModal(linkElement);
                return;
            }
            // 代码块：复制/删除
            const copyBtn = e.target.closest('.nsn-code-copy');
            if (copyBtn) {
                e.preventDefault();
                e.stopPropagation();
                const wrapper = copyBtn.closest('.nsn-code-wrapper');
                const pre = wrapper && wrapper.querySelector('.nsn-code-block');
                if (pre) {
                    const text = pre.textContent || '';
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text).then(() => {
                            // 复制成功后按钮状态反馈
                            const originalText = copyBtn.textContent;
                            copyBtn.textContent = '已复制';
                            copyBtn.setAttribute('disabled', 'true');
                            setTimeout(() => {
                                copyBtn.textContent = originalText;
                                copyBtn.removeAttribute('disabled');
                            }, 1500);
                            showCodeCopyNotification();
                        }).catch(() => {
                            fallbackCopyText(text);
                            const originalText = copyBtn.textContent;
                            copyBtn.textContent = '已复制';
                            copyBtn.setAttribute('disabled', 'true');
                            setTimeout(() => {
                                copyBtn.textContent = originalText;
                                copyBtn.removeAttribute('disabled');
                            }, 1500);
                            showCodeCopyNotification();
                        });
                    } else {
                        fallbackCopyText(text);
                        const originalText = copyBtn.textContent;
                        copyBtn.textContent = '已复制';
                        copyBtn.setAttribute('disabled', 'true');
                        setTimeout(() => {
                            copyBtn.textContent = originalText;
                            copyBtn.removeAttribute('disabled');
                        }, 1500);
                        showCodeCopyNotification();
                    }
                }
                return;
            }
            const delBtn = e.target.closest('.nsn-code-delete');
            if (delBtn) {
                e.preventDefault();
                e.stopPropagation();
                const wrapper = delBtn.closest('.nsn-code-wrapper');
                if (wrapper) {
                    wrapper.remove();
                    showCodeDeleteNotification();
                }
                return;
            }
        });
        
        // 处理退格键删除表格
        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const container = range.commonAncestorContainer;
                    
                    // 检查是否在表格容器内但不在表格单元格内
                    const tableContainer = container.nodeType === Node.TEXT_NODE 
                        ? container.parentElement.closest('.nsn-table-container')
                        : container.closest('.nsn-table-container');
                    
                    if (tableContainer) {
                        const table = tableContainer.querySelector('.nsn-table');
                        const isInTableCell = container.nodeType === Node.TEXT_NODE
                            ? container.parentElement.closest('td, th')
                            : container.closest('td, th');
                        
                        // 如果不在表格单元格内，删除整个表格容器
                        if (!isInTableCell) {
                            e.preventDefault();
                            tableContainer.remove();
                            return;
                        }
                    }
                }
            }
        });

        // 样式
        injectStyles();

        document.body.appendChild(overlay);
    }

    function injectStyles(){
        if (document.getElementById('nsn-styles')) return;
        const css = `
        .nsn-mask{position:fixed;inset:0;background:rgba(17,24,39,.45);z-index:999999}
        .nsn-dialog{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(1320px,96vw);height:min(840px,92vh);background:#fff;border-radius:12px;box-shadow:0 20px 45px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden}
        .nsn-drag-area{position:absolute;top:0;left:0;width:30px;height:30px;cursor:move;z-index:10}
        .nsn-dialog, .nsn-dialog *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,"PingFang SC","Microsoft YaHei",sans-serif}
        .nsn-header{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #eef2f7;background:#f9fafb}
        .nsn-title{font-weight:700;font-size:16px;color:#111827}
        .nsn-close{background:#ef4444;border:none;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer}
        .nsn-close:hover{filter:brightness(.95)}

        .nsn-main{flex:1;display:flex;flex-direction:column;gap:12px;padding:12px 14px;background:#f6f8fb;min-height:0;overflow:hidden}

        /* 顶部分类栏 */
        .nsn-subheader{display:flex;justify-content:flex-start;align-items:center;gap:10px}
        .nsn-select{height:32px;padding:0 10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;color:#111827}
        .nsn-mini{height:32px;line-height:30px;background:#22c55e;color:#fff;border:none;border-radius:8px;padding:0 10px;cursor:pointer}
        .nsn-mini:hover{filter:brightness(.95)}
        .nsn-edit-category{background:#f59e0b !important;color:#fff}
        .nsn-edit-category:hover{background:#d97706 !important}
        .nsn-delete-category{background:#ef4444 !important;color:#fff}
        .nsn-delete-category:hover{background:#dc2626 !important}

        /* 内容两列 */
        .nsn-content{display:flex;gap:12px;flex:1;min-height:0;overflow:hidden}
        .nsn-mid{width:260px;display:flex;flex-direction:column;min-width:220px}
        .nsn-notelist{flex:1;background:#fff;border:1px solid #eef2f7;border-radius:10px;padding:8px;overflow:auto;max-height:500px;margin-top:30px}
        .nsn-notelist::-webkit-scrollbar{width:16px}
        .nsn-notelist::-webkit-scrollbar-track{background:#f1f1f1;border-radius:8px}
        .nsn-notelist::-webkit-scrollbar-thumb{background:#c1c1c1;border-radius:8px;border:2px solid #f1f1f1}
        .nsn-notelist::-webkit-scrollbar-thumb:hover{background:#a8a8a8}
        .nsn-notelist::-webkit-scrollbar-button{display:block;height:16px;background-color:#e0e0e0;border-radius:8px;background-repeat:no-repeat;background-position:center;background-size:10px 10px}
        .nsn-notelist::-webkit-scrollbar-button:hover{background-color:#d0d0d0}
        .nsn-notelist::-webkit-scrollbar-button:vertical:start:increment{background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M8 12l4-4H4z" fill="%23666"/></svg>')}
        .nsn-notelist::-webkit-scrollbar-button:vertical:end:decrement{background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M8 4l-4 4h8z" fill="%23666"/></svg>')}
        .nsn-notelist::-webkit-scrollbar-button:vertical:increment{background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M8 12l4-4H4z" fill="%23666"/></svg>')}
        .nsn-notelist::-webkit-scrollbar-button:vertical:decrement{background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M8 4l-4 4h8z" fill="%23666"/></svg>')}
        .nsn-notelist::-webkit-scrollbar-button:vertical:start:decrement{background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M8 4l-4 4h8z" fill="%23666"/></svg>');background-repeat:no-repeat;background-position:center}
        .nsn-notelist::-webkit-scrollbar-button:vertical:end:increment{background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M8 12l4-4H4z" fill="%23666"/></svg>');background-repeat:no-repeat;background-position:center}
        /* 统一为单按钮模式，保证上下箭头都显示 */
        .nsn-notelist::-webkit-scrollbar-button:single-button:vertical:decrement{background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M8 4l-4 4h8z" fill="%23666"/></svg>');background-repeat:no-repeat;background-position:center}
        .nsn-notelist::-webkit-scrollbar-button:single-button:vertical:increment{background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M8 12l4-4H4z" fill="%23666"/></svg>');background-repeat:no-repeat;background-position:center}
        /* 隐藏双按钮占位，避免出现无图标的圆点 */
        .nsn-notelist::-webkit-scrollbar-button:vertical:start:increment,
        .nsn-notelist::-webkit-scrollbar-button:vertical:end:decrement{display:none}
        .nsn-note-item{padding:10px 12px;margin:6px 0;background:#fff;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;transition:all .15s;position:relative}
        .nsn-note-item:hover{box-shadow:0 4px 10px rgba(0,0,0,.06);transform:translateY(-1px)}
        .nsn-note-item.active{border-color:#60a5fa;background:#eff6ff}

        .nsn-right{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
        .nsn-title-input{height:36px;padding:6px 10px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:8px;background:#fff}
        .nsn-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}
        .nsn-btn{height:30px;padding:0 10px;border:1px solid #e5e7eb;background:#fff;border-radius:8px;cursor:pointer}
        .nsn-btn:hover{background:#f3f4f6}
        .nsn-color-container{display:flex;align-items:center;gap:2px;position:relative}
        .nsn-color-picker{width:30px;height:30px;border:1px solid #e5e7eb;border-radius:8px 0 0 8px;cursor:pointer;padding:2px;background:#fff;transition:all 0.2s ease}
        .nsn-color-picker::-webkit-color-swatch-wrapper{padding:0;border:none}
        .nsn-color-picker::-webkit-color-swatch{border:none;border-radius:4px}
        .nsn-color-picker::-moz-color-swatch{border:none;border-radius:4px}
        .nsn-color-picker:hover{transform:none;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
        .nsn-reset-btn{width:18px;height:30px;border:1px solid #e5e7eb;border-left:none;border-right:none;background:#f9fafb;color:#6b7280;cursor:pointer;font-size:12px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease}
        .nsn-reset-btn:hover{background:#f3f4f6;color:#374151;transform:scale(1.1)}
        .nsn-dropdown-btn{width:18px;height:30px;border:1px solid #e5e7eb;border-left:none;border-radius:0 8px 8px 0;background:#f9fafb;color:#6b7280;cursor:pointer;font-size:10px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease}
        .nsn-dropdown-btn:hover{background:#f3f4f6;color:#374151;transform:scale(1.1)}
        .nsn-color-container:hover .nsn-color-picker{box-shadow:0 2px 8px rgba(0,0,0,0.1)}
        .nsn-color-container:hover .nsn-reset-btn{box-shadow:0 2px 8px rgba(0,0,0,0.1)}
        .nsn-color-container:hover .nsn-dropdown-btn{box-shadow:0 2px 8px rgba(0,0,0,0.1)}
        .nsn-color-history-panel{position:absolute;top:100%;left:0;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:8px;min-width:160px;z-index:1000;opacity:0;visibility:hidden;transform:translateY(-10px);transition:all 0.3s cubic-bezier(0.4,0,0.2,1)}
        .nsn-color-history-panel.show{opacity:1;visibility:visible;transform:translateY(0)}
        .nsn-color-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
        .nsn-color-block{width:20px;height:20px;border-radius:4px;cursor:pointer;border:1px solid #e5e7eb;transition:all 0.2s ease;position:relative}
        .nsn-color-block:hover{transform:scale(1.1);box-shadow:0 2px 8px rgba(0,0,0,0.2)}
        .nsn-history-empty{color:#9ca3af;font-size:12px;text-align:center;padding:8px}
        .nsn-editor{flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:10px;background:#fff;overflow:auto;min-height:200px;word-wrap:break-word;overflow-wrap:break-word}
        /* 防止内容撑破编辑器布局 */
        .nsn-editor *{max-width:100% !important;box-sizing:border-box !important}
        .nsn-editor p,.nsn-editor div,.nsn-editor span{word-break:break-word !important;overflow-wrap:break-word !important}
        .nsn-editor pre,.nsn-editor code,.nsn-editor .nsn-code-block{white-space:pre-wrap !important;word-break:break-all !important;overflow-wrap:break-word !important;overflow-x:hidden !important}
        .nsn-editor table,.nsn-editor .nsn-table-container{max-width:100% !important;table-layout:fixed !important;overflow-x:auto !important}
        .nsn-editor td,.nsn-editor th{word-break:break-all !important;overflow-wrap:break-word !important}
        .nsn-editor a{color:#409eff;text-decoration:none;border-bottom:1px solid transparent;transition:all 0.2s ease}
        .nsn-editor a:hover{color:#66b3ff;border-bottom-color:#66b3ff;text-decoration:none}
        .nsn-editor .nsn-editable-link{color:#409eff;border-bottom:1px solid transparent;cursor:pointer;transition:all 0.2s ease;padding:0;border-radius:0;position:relative;background:transparent;border:none}
        .nsn-editor .nsn-editable-link:hover{color:#66b3ff;border-bottom:1px solid #66b3ff;background:transparent}
        /* 已移除：Markdown代码块样式 */
        /* .nsn-editor .nsn-markdown-code{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:12px 0;overflow:hidden}
        .nsn-editor .nsn-markdown-code pre{margin:0;padding:16px;font-family:Consolas,Monaco,"Courier New",monospace;font-size:14px;line-height:1.5;overflow-x:auto} */
        .nsn-editor .nsn-inline-code{background:#f1f5f9;color:#dc2626;padding:2px 6px;border-radius:4px;font-family:Consolas,Monaco,"Courier New",monospace;font-size:0.9em}
        .nsn-editor .nsn-code-wrapper{position:relative !important;margin:12px 0 !important;border-radius:8px !important;background:#f5f5f5 !important;border:1px solid #d1d5db !important;display:block !important}
        .nsn-editor .nsn-code-toolbar{position:absolute !important;top:6px !important;right:6px !important;display:flex !important;gap:6px !important;z-index:1 !important}
        .nsn-editor .nsn-code-toolbar button{padding:2px 8px !important;border:none !important;border-radius:4px !important;font-size:12px !important;cursor:pointer !important}
        .nsn-editor .nsn-code-toolbar .nsn-code-copy{background:#f59e0b !important;color:#fff !important}
        .nsn-editor .nsn-code-toolbar .nsn-code-copy:hover{background:#d97706 !important}
        .nsn-editor .nsn-code-toolbar .nsn-code-copy[disabled]{opacity:.7 !important;cursor:default !important}
        .nsn-editor .nsn-code-toolbar .nsn-code-delete{background:#ef4444 !important;color:#fff !important}
        .nsn-editor .nsn-code-toolbar .nsn-code-delete:hover{background:#dc2626 !important}
        .nsn-editor .nsn-code-block{background:transparent !important;color:#1f2937 !important;border-radius:8px !important;margin:0 !important;padding:30px 12px 12px 12px !important;overflow:visible !important;font-family:Consolas,Monaco,"Courier New",monospace !important;font-size:13px !important;line-height:1.5 !important;white-space:pre-wrap !important;word-wrap:break-word !important;min-height:40px !important;position:relative !important}
        .nsn-editor .nsn-code-block:focus{outline:2px solid #9ca3af !important;outline-offset:2px !important}
        .nsn-editor .nsn-code-block:empty::before{content:"在此粘贴或输入代码..." !important;color:#9ca3af !important;font-style:italic !important;pointer-events:none !important;position:absolute !important;top:30px !important;left:12px !important}
        .nsn-editor .nsn-code-block:focus:empty::before{display:none !important}
        .nsn-editor h1{font-size:1.8em;font-weight:700;color:#111827;margin:20px 0 12px 0;border-bottom:2px solid #e5e7eb;padding-bottom:8px}
        .nsn-editor h2{font-size:1.5em;font-weight:600;color:#111827;margin:18px 0 10px 0;border-bottom:1px solid #f3f4f6;padding-bottom:6px}
        .nsn-editor h3{font-size:1.3em;font-weight:600;color:#111827;margin:16px 0 8px 0}
        .nsn-editor blockquote{border-left:4px solid #409eff;background:#f0f9ff;margin:16px 0;padding:12px 16px;font-style:italic;color:#374151}
        .nsn-editor ul,ol{margin:12px 0;padding-left:24px}
        .nsn-editor li{margin:4px 0;line-height:1.6}
        
        /* Markdown预览区域样式 */
        .nsn-markdown-modal-content .nsn-markdown-preview img {
            max-width: 100%;
            height: auto;
            border-radius: 6px;
            margin: 8px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border: 1px solid #e5e7eb;
        }
        .nsn-markdown-modal-content .nsn-markdown-preview h1,
        .nsn-markdown-modal-content .nsn-markdown-preview h2,
        .nsn-markdown-modal-content .nsn-markdown-preview h3 {
            color: #374151;
            margin: 16px 0 8px 0;
        }
        .nsn-markdown-modal-content .nsn-markdown-preview h1 {
            font-size: 1.5em;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 6px;
        }
        .nsn-markdown-modal-content .nsn-markdown-preview h2 {
            font-size: 1.3em;
            border-bottom: 1px solid #f3f4f6;
            padding-bottom: 4px;
        }
        .nsn-markdown-modal-content .nsn-markdown-preview h3 {
            font-size: 1.1em;
        }
        .nsn-markdown-modal-content .nsn-markdown-preview blockquote {
            border-left: 4px solid #409eff;
            background: #f0f9ff;
            margin: 12px 0;
            padding: 8px 12px;
            font-style: italic;
        }
        .nsn-markdown-modal-content .nsn-markdown-preview ul,
        .nsn-markdown-modal-content .nsn-markdown-preview ol {
            margin: 8px 0;
            padding-left: 20px;
        }
        .nsn-markdown-modal-content .nsn-markdown-preview li {
            margin: 4px 0;
        }
        .nsn-markdown-modal-content .nsn-markdown-preview code.nsn-inline-code {
            background: #f1f5f9;
            color: #dc2626;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: Consolas, Monaco, 'Courier New', monospace;
            font-size: 0.9em;
        }
        .nsn-markdown-modal-content .nsn-markdown-preview .nsn-markdown-code {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin: 8px 0;
            overflow: hidden;
        }
        .nsn-markdown-modal-content .nsn-markdown-preview .nsn-markdown-code pre {
            margin: 0;
            padding: 12px;
            font-family: Consolas, Monaco, 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.4;
            overflow-x: auto;
        }
        .nsn-resizable-img-container{display:inline-block;position:relative;margin:4px}
        .nsn-resizable-img-container img{display:block;max-width:100%;height:auto}
        .nsn-resize-handle{position:absolute;bottom:-3px;right:-3px;width:8px;height:8px;background:#409eff;cursor:nw-resize;border-radius:2px;display:none;box-shadow:0 1px 3px rgba(0,0,0,0.3)}
        .nsn-resize-handle:hover{background:#66b3ff;transform:scale(1.2)}
        .nsn-bottom{padding-top:10px;display:flex;gap:10px;justify-content:flex-end;position:sticky;bottom:0;background:#fff;padding-bottom:6px;border-top:1px solid #eef2f7;z-index:5}
        .nsn-primary{background:#409eff;color:#fff;border:none;border-radius:8px;padding:8px 14px;cursor:pointer}
        .nsn-default{background:#f3f4f6;color:#374151;border:none;border-radius:8px;padding:8px 14px;cursor:pointer}
        .nsn-danger{background:#ef4444;color:#fff;border:none;border-radius:8px;padding:8px 14px;cursor:pointer}
        .nsn-primary:hover,.nsn-default:hover,.nsn-danger:hover{filter:brightness(.97)}
        
        /* 链接操作弹窗 */
        .nsn-link-modal{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999999999;display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:all 0.3s ease}
        .nsn-link-modal.show{opacity:1;visibility:visible}
        .nsn-link-modal-content{background:#fff;border-radius:12px;padding:20px;max-width:90vw;width:400px;box-shadow:0 8px 32px rgba(0,0,0,0.3);transform:scale(0.8);transition:transform 0.3s ease}
        .nsn-link-modal.show .nsn-link-modal-content{transform:scale(1)}
        .nsn-link-modal-header{font-size:16px;font-weight:600;color:#333;margin-bottom:16px;text-align:center}
        .nsn-link-modal-url{background:#f5f5f5;padding:12px;border-radius:8px;font-size:14px;color:#666;margin-bottom:20px;word-break:break-all;line-height:1.4}
        .nsn-link-modal-buttons{display:flex;gap:12px}
        .nsn-link-modal-btn{flex:1;padding:12px 16px;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.2s ease}
        .nsn-link-modal-btn.primary{background:#409eff;color:#fff}
        .nsn-link-modal-btn.primary:hover{background:#66b3ff}
        .nsn-link-modal-btn.secondary{background:#f0f0f0;color:#333}
        .nsn-link-modal-btn.secondary:hover{background:#e0e0e0}
        .nsn-link-modal-btn.danger{background:#f56565;color:#fff}
        .nsn-link-modal-btn.danger:hover{background:#fc8181}

        /* 表格相关样式 */
        .nsn-table-container{margin:10px 0;position:relative;border-radius:8px;overflow:hidden;border:1px solid transparent}
        .nsn-table-container:hover{border:1px solid #409eff !important}
        .nsn-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
        .nsn-table th{padding:12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:600;text-align:left;color:#374151}
        .nsn-table td{padding:12px;border:1px solid #e5e7eb;color:#374151;min-height:20px}
        .nsn-table td:empty::after{content:'\u00a0';color:transparent}
        .nsn-table-toolbar{position:absolute;top:-35px;left:0;background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:4px;box-shadow:0 2px 8px rgba(0,0,0,0.1);z-index:1000;display:none;gap:2px}
        .nsn-table-btn{padding:4px 8px;border:none;background:#f9fafb;color:#374151;border-radius:4px;cursor:pointer;font-size:12px;transition:all 0.2s ease;min-width:auto;height:auto;line-height:1}
        .nsn-table-btn:hover{background:#f3f4f6;color:#111827;transform:translateY(-1px)}
        .nsn-table-btn[style*="color: #ef4444"]:hover{background:#fef2f2;color:#dc2626}
        .nsn-table-container:hover .nsn-table-toolbar{display:flex}
        
        /* 附件样式 */
        .nsn-editor .nsn-attachment-image,
        .nsn-editor .nsn-attachment-video,
        .nsn-editor .nsn-attachment-audio,
        .nsn-editor .nsn-attachment-file {
            margin: 10px 0;
            padding: 10px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #f9fafb;
            transition: all 0.2s ease;
        }
        .nsn-editor .nsn-attachment-image:hover,
        .nsn-editor .nsn-attachment-video:hover,
        .nsn-editor .nsn-attachment-audio:hover,
        .nsn-editor .nsn-attachment-file:hover {
            border-color: #409eff;
            box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
        }
        .nsn-editor .nsn-attachment-file {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .nsn-editor .nsn-attachment-file button {
            padding: 6px 12px;
            background: #409eff;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s ease;
        }
        .nsn-editor .nsn-attachment-file button:hover {
            background: #66b3ff;
        }
        /* 附件删除按钮样式 */
        .nsn-editor .nsn-attachment-delete {
            background: #ef4444 !important;
            color: #fff !important;
            border: none !important;
            border-radius: 3px !important;
            cursor: pointer !important;
            font-size: 11px !important;
            padding: 2px 6px !important;
            transition: background-color 0.2s ease !important;
        }
        .nsn-editor .nsn-attachment-delete:hover {
            background: #dc2626 !important;
        }
        .nsn-editor .nsn-attachment-file .nsn-attachment-delete {
            font-size: 12px !important;
            padding: 6px 12px !important;
        }
        
        /* Markdown弹窗样式 */
        .nsn-markdown-modal {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 999999999;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .nsn-markdown-modal-content {
            background: #fff;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            max-width: 90vw;
            max-height: 80vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
        }
        .nsn-markdown-modal-content {
            width: 700px;
        }
        /* Markdown编辑器拖动区域样式 */
        .nsn-markdown-drag-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 30px;
            height: 30px;
            cursor: move;
            z-index: 10;
        }
        
        @media (max-width: 720px){
          .nsn-content{flex-direction:column}
          .nsn-mid{width:auto}
          /* .nsn-markdown-modal-content {
              width: 95vw;
              height: 90vh;
              padding: 16px;
          } */
        }
        `;
        const style = document.createElement('style');
        style.id = 'nsn-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // 回收站相关功能函数
    function showTrashDialog() {
        // 清理过期笔记（30天）
        cleanExpiredTrashNotes();
        
        const trashData = readJSON(LS_KEYS.trash, []);
        
        // 创建回收站弹窗
        const trashModal = createElement('div', {
            className: 'nsn-trash-modal',
            style: {
                position: 'fixed',
                inset: '0',
                background: 'rgba(0,0,0,0.5)',
                zIndex: '999999999',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }
        });
        
        const modalContent = createElement('div', {
            className: 'nsn-trash-modal-content',
            style: {
                background: '#fff',
                borderRadius: '12px',
                padding: '20px',
                maxWidth: '90vw',
                width: '800px',
                maxHeight: '80vh',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column'
            }
        });
        
        // 标题栏
        const header = createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid #e5e7eb'
            }
        });
        
        const title = createElement('div', {
            style: {
                fontSize: '18px',
                fontWeight: '600',
                color: '#333'
            }
        }, [`回收站 (${trashData.length}条)`]);
        
        const closeBtn = createElement('button', {
            style: {
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '0',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }
        }, ['×']);
        
        closeBtn.addEventListener('click', () => {
            trashModal.remove();
        });
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // 内容区域
        const content = createElement('div', {
            style: {
                flex: '1',
                overflow: 'auto',
                marginBottom: '16px'
            }
        });
        
        if (trashData.length === 0) {
            const emptyMsg = createElement('div', {
                style: {
                    textAlign: 'center',
                    color: '#888',
                    padding: '40px 20px',
                    fontSize: '16px'
                }
            }, ['回收站为空']);
            content.appendChild(emptyMsg);
        } else {
            // 创建笔记列表
            trashData.forEach((note, index) => {
                const noteItem = createElement('div', {
                    style: {
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '12px',
                        background: '#f9fafb'
                    }
                });
                
                const noteHeader = createElement('div', {
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                    }
                });
                
                const noteInfo = createElement('div', { style: { flex: '1' } });
                
                const noteTitle = createElement('div', {
                    style: {
                        fontSize: '16px',
                        fontWeight: '500',
                        color: '#333',
                        marginBottom: '4px'
                    }
                }, [note.title || '未命名']);
                
                const noteDetails = createElement('div', {
                    style: {
                        fontSize: '12px',
                        color: '#666',
                        lineHeight: '1.4'
                    }
                });
                
                const deletedDate = new Date(note.deletedAt).toLocaleString('zh-CN');
                const daysLeft = Math.max(0, 30 - Math.floor((Date.now() - note.deletedAt) / (1000 * 60 * 60 * 24)));
                
                noteDetails.innerHTML = `
                    分类：${note.originalCategoryName}<br>
                    删除时间：${deletedDate}<br>
                    剩余天数：${daysLeft}天
                `;
                
                noteInfo.appendChild(noteTitle);
                noteInfo.appendChild(noteDetails);
                
                // 操作按钮
                const actions = createElement('div', {
                    style: {
                        display: 'flex',
                        gap: '8px',
                        flexShrink: '0'
                    }
                });
                
                const restoreBtn = createElement('button', {
                    style: {
                        padding: '6px 12px',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                    }
                }, ['恢复']);
                
                const deleteBtn = createElement('button', {
                    style: {
                        padding: '6px 12px',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                    }
                }, ['永久删除']);
                
                restoreBtn.addEventListener('click', () => {
                    if (confirm(`确定要恢复笔记"${note.title || '未命名'}"吗？`)) {
                        // 保存恢复的笔记信息
                        const restoredNote = note;
                        const restoredNoteId = note.id;
                        
                        restoreNoteFromTrash(index);
                        // 关闭后自动重新打开回收站以刷新列表
                        trashModal.remove();
                        // 更新按钮文本
                        updateButtonTexts();
                        
                        // 检查是否有笔记弹窗打开，如果有则刷新它
                        const existingNotesDialog = document.querySelector('.nsn-mask');
                        if (existingNotesDialog) {
                            // 保存当前选中的笔记ID和分类ID
                            const currentSelectedNoteId = window.currentNoteId;
                            const currentSelectedCategoryId = window.currentCategoryId;
                            
                            // 确定恢复笔记的目标分类
                            const categories = readJSON(LS_KEYS.categories, []);
                            const originalCategoryExists = categories.some(c => c.id === restoredNote.originalCategoryId);
                            const targetCategoryId = originalCategoryExists ? restoredNote.originalCategoryId : 'default';
                            
                            // 重新构建笔记弹窗以显示恢复的笔记
                            buildDialog();
                            
                            // 选中恢复笔记的辅助函数
                            function selectRestoredNote(restoredId, previousNoteId, previousCategoryId) {
                                // 首先尝试恢复之前选中的笔记
                                if (previousNoteId && previousCategoryId) {
                                    const map = readJSON(LS_KEYS.notes, {});
                                    const list = map[previousCategoryId] || [];
                                    const noteExists = list.some(n => n.id === previousNoteId);
                                    
                                    if (noteExists && previousCategoryId === targetCategoryId) {
                                        // 如果之前选中的笔记存在且在当前分类中，恢复选中它
                                        const noteItems = document.querySelectorAll('.nsn-note-item');
                                        for (let item of noteItems) {
                                            const noteData = item.noteData;
                                            if (noteData && noteData.id === previousNoteId) {
                                                item.click();
                                                return;
                                            }
                                        }
                                    }
                                }
                                
                                // 否则选中刚恢复的笔记
                                const noteItems = document.querySelectorAll('.nsn-note-item');
                                for (let item of noteItems) {
                                    const noteData = item.noteData;
                                    if (noteData && noteData.id === restoredId) {
                                        item.click();
                                        return;
                                    }
                                }
                            }
                            
                            // 使用更长的延迟确保DOM完全渲染
                            setTimeout(() => {
                                // 切换到目标分类（如果需要）
                                const categorySelect = document.querySelector('.nsn-category-select');
                                if (categorySelect && categorySelect.value !== targetCategoryId) {
                                    categorySelect.value = targetCategoryId;
                                    categorySelect.dispatchEvent(new Event('change'));
                                    
                                    // 等待分类切换和笔记列表重新渲染
                                    setTimeout(() => {
                                        selectRestoredNote(restoredNoteId, currentSelectedNoteId, currentSelectedCategoryId);
                                    }, 300);
                                } else {
                                    // 如果已经在正确的分类中，直接选中笔记
                                    selectRestoredNote(restoredNoteId, currentSelectedNoteId, currentSelectedCategoryId);
                                }
                            }, 300);
                        }
                        
                        // 自动刷新回收站弹窗
                        setTimeout(() => showTrashDialog(), 100);
                    }
                });
                
                deleteBtn.addEventListener('click', () => {
                    if (confirm(`确定要永久删除笔记"${note.title || '未命名'}"吗？\n\n此操作不可恢复！`)) {
                        permanentDeleteNote(index);
                        trashModal.remove();
                        // 重新打开回收站弹窗以刷新列表
                        setTimeout(() => showTrashDialog(), 100);
                    }
                });
                
                actions.appendChild(restoreBtn);
                actions.appendChild(deleteBtn);
                
                noteHeader.appendChild(noteInfo);
                noteHeader.appendChild(actions);
                
                // 笔记内容预览
                if (note.content && note.content.trim()) {
                    const contentPreview = createElement('div', {
                        style: {
                            fontSize: '14px',
                            color: '#555',
                            maxHeight: '60px',
                            overflow: 'hidden',
                            lineHeight: '1.4',
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: '1px solid #e5e7eb'
                        }
                    });
                    
                    // 提取纯文本内容作为预览
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = note.content;
                    const textContent = tempDiv.textContent || tempDiv.innerText || '';
                    const preview = textContent.length > 100 ? textContent.substring(0, 100) + '...' : textContent;
                    contentPreview.textContent = preview;
                    
                    noteItem.appendChild(noteHeader);
                    noteItem.appendChild(contentPreview);
                } else {
                    noteItem.appendChild(noteHeader);
                }
                
                content.appendChild(noteItem);
            });
        }
        
        // 底部按钮
        const footer = createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb'
            }
        });
        
        const clearAllBtn = createElement('button', {
            style: {
                padding: '8px 16px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
            }
        }, ['清空回收站']);
        
        clearAllBtn.addEventListener('click', () => {
            if (trashData.length === 0) {
                alert('回收站已经是空的');
                return;
            }
            if (confirm(`确定要清空回收站吗？\n\n这将永久删除所有${trashData.length}条笔记，此操作不可恢复！`)) {
                writeJSON(LS_KEYS.trash, []);
                trashModal.remove();
                updateButtonTexts();
            }
        });
        
        const infoText = createElement('div', {
            style: {
                fontSize: '12px',
                color: '#666',
                alignSelf: 'center'
            }
        }, ['笔记在回收站中保留30天后自动删除']);
        
        footer.appendChild(clearAllBtn);
        footer.appendChild(infoText);
        
        modalContent.appendChild(header);
        modalContent.appendChild(content);
        modalContent.appendChild(footer);
        
        trashModal.appendChild(modalContent);
        document.body.appendChild(trashModal);
        
        // 点击背景关闭弹窗
        trashModal.addEventListener('click', (e) => {
            if (e.target === trashModal) {
                trashModal.remove();
            }
        });
    }
    
    // 从回收站恢复笔记
    function restoreNoteFromTrash(trashIndex) {
        const trashData = readJSON(LS_KEYS.trash, []);
        if (trashIndex < 0 || trashIndex >= trashData.length) {
            alert('找不到要恢复的笔记');
            return;
        }
        
        const trashNote = trashData[trashIndex];
        const { deletedAt, originalCategoryId, originalCategoryName, ...noteData } = trashNote;
        
        // 检查原分类是否还存在
        const categories = readJSON(LS_KEYS.categories, []);
        const categoryExists = categories.some(c => c.id === originalCategoryId);
        
        let targetCategoryId = originalCategoryId;
        if (!categoryExists) {
            // 原分类不存在，恢复到默认分类
            targetCategoryId = 'default';
            alert(`原分类"${originalCategoryName}"已不存在，笔记将恢复到默认分类`);
        }
        
        // 恢复笔记到目标分类
        const map = readJSON(LS_KEYS.notes, {});
        if (!map[targetCategoryId]) {
            map[targetCategoryId] = [];
        }
        map[targetCategoryId].unshift(noteData);
        writeJSON(LS_KEYS.notes, map);
        
        // 从回收站移除
        trashData.splice(trashIndex, 1);
        writeJSON(LS_KEYS.trash, trashData);
        
        // 已成功恢复，不再弹窗打断用户
        // alert(`笔记"${noteData.title || '未命名'}"已成功恢复`);
    }
    
    // 永久删除笔记
    function permanentDeleteNote(trashIndex) {
        const trashData = readJSON(LS_KEYS.trash, []);
        if (trashIndex < 0 || trashIndex >= trashData.length) {
            alert('找不到要删除的笔记');
            return;
        }
        
        trashData.splice(trashIndex, 1);
        writeJSON(LS_KEYS.trash, trashData);
        
        // 更新按钮文本
        updateButtonTexts();
    }
    
    // 清理过期的回收站笔记（30天）
    function cleanExpiredTrashNotes() {
        const trashData = readJSON(LS_KEYS.trash, []);
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        const validNotes = trashData.filter(note => note.deletedAt > thirtyDaysAgo);
        
        if (validNotes.length !== trashData.length) {
            writeJSON(LS_KEYS.trash, validNotes);
            console.log(`已自动清理 ${trashData.length - validNotes.length} 条过期笔记`);
        }
    }

    window.NodeSeekNotes = {
        showNotesDialog: buildDialog
    };
    
    // 暴露下载函数到全局作用域，供笔记中的下载按钮使用
    window.downloadAttachmentFromNote = function(fileName, fileData) {
        const link = document.createElement('a');
        link.href = fileData;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
})();
