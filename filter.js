// 关键词过滤主函数
function filterPosts(keywords) {
    console.log('[NodeSeek过滤]', '开始过滤，关键词：' + keywords.join(','));
    const postItems = document.querySelectorAll('ul.post-list > li.post-list-item');
    let showCount = 0;
    // 新增：去除空格后再匹配
    const norm = s => s.replace(/\s+/g, '').toLowerCase();
    postItems.forEach(item => {
        const titleEl = item.querySelector('.post-title a');
        const title = titleEl ? titleEl.textContent.trim() : '';
        const matched = keywords.length === 0 || keywords.every(kw => kw && norm(title).includes(norm(kw)));
        if (matched) {
            item.style.display = '';
            showCount++;
        } else {
            item.style.display = 'none';
        }
    });
    console.log(`[NodeSeek过滤] 过滤完成，显示${showCount}条，隐藏${postItems.length - showCount}条。`);
}

// 保存关键词到 localStorage
function saveKeywords(keywords) {
    if (keywords && keywords.length > 0) {
        localStorage.setItem('ns-filter-keywords', JSON.stringify(keywords));
    } else {
        localStorage.removeItem('ns-filter-keywords');
    }
}

// 从 localStorage 获取关键词
function getKeywords() {
    const saved = localStorage.getItem('ns-filter-keywords');
    return saved ? JSON.parse(saved) : [];
}

// 清除过滤效果，恢复所有帖子显示
function clearFilter() {
    const postItems = document.querySelectorAll('ul.post-list > li.post-list-item');
    postItems.forEach(item => {
        item.style.display = '';
    });
    localStorage.removeItem('ns-filter-keywords');
    console.log('[NodeSeek过滤]', '已清除过滤');
}

// 创建关键词输入界面（弹窗）
function createFilterUI(onFilter) {
    const existing = document.getElementById('ns-keyword-filter-dialog');
    if (existing) {
        existing.remove();
        clearFilter();
        return;
    }
    const dialog = document.createElement('div');
    dialog.id = 'ns-keyword-filter-dialog';
    dialog.style.position = 'fixed';
    dialog.style.zIndex = 10001;
    dialog.style.background = '#fff';
    dialog.style.borderRadius = '12px'; // Default for desktop
    dialog.style.boxShadow = '0 4px 18px rgba(0,0,0,0.18)'; // Default for desktop
    dialog.style.fontSize = '16px';
    dialog.style.color = '#222';
    dialog.style.lineHeight = '2';
    dialog.style.border = '2px solid #4CAF50';
    dialog.style.userSelect = 'auto';

    // Default positioning and size for desktop
    dialog.style.top = '60px';
    dialog.style.right = '16px';
    dialog.style.left = 'auto'; // Ensure left is auto for right positioning
    dialog.style.minWidth = '380px';
    dialog.style.maxWidth = '600px';
    dialog.style.width = 'auto'; // Default auto width for desktop
    dialog.style.padding = '18px 24px 16px 24px'; // Default padding for desktop
    dialog.style.maxHeight = 'unset'; // Desktop doesn't have a forced max height
    dialog.style.overflowY = 'unset'; // Desktop doesn't force scroll
    dialog.style.overflowX = 'unset'; // Desktop doesn't force scroll
    dialog.style.transform = 'none'; // No transform for desktop

    // Mobile specific styles (width <= 767px)
    if (window.innerWidth <= 767) {
        dialog.style.width = '96%';
        dialog.style.minWidth = 'unset';
        dialog.style.maxWidth = '96%';
        dialog.style.left = '50%';
        dialog.style.top = '50%';
        dialog.style.transform = 'translate(-50%, -50%)'; // Center the dialog
        dialog.style.right = 'auto'; // Ensure right is auto for left positioning
        dialog.style.maxHeight = '88vh'; // Match other mobile dialogs
        dialog.style.padding = '12px 8px 8px 8px'; // Match other mobile dialogs
        dialog.style.overflowY = 'auto'; // Ensure scrollable
        dialog.style.overflowX = 'hidden'; // Hide horizontal scroll
        dialog.style.borderRadius = '10px'; // Match other mobile dialogs
        dialog.style.boxShadow = '0 2px 20px rgba(0,0,0,0.2)'; // Match other mobile dialogs
    }

    dialog.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-weight:bold;font-size:17px;">关键词过滤</span>
            <span id="ns-keyword-filter-close" style="cursor:pointer;font-size:22px;line-height:1;">×</span>
        </div>
        <label style="font-weight:bold;">关键词（逗号分隔）：</label><br>
        <input id="ns-keyword-input" type="text" style="width:280px;padding:4px 8px;font-size:15px;border:1px solid #ccc;border-radius:4px;" placeholder="输入关键词，如A,B,C" />
        <button id="ns-keyword-btn" style="margin-left:8px;padding:4px 12px;font-size:15px;background:#4CAF50;color:#fff;border:none;border-radius:4px;cursor:pointer;">过滤</button>
        <span id="ns-keyword-log" style="margin-left:10px;color:#888;font-size:13px;"></span>
    `;
    document.body.appendChild(dialog);

    // Apply mobile styles to input and button after they are in the DOM
    if (window.innerWidth <= 767) {
        const input = dialog.querySelector('#ns-keyword-input');
        const button = dialog.querySelector('#ns-keyword-btn');
        if (input) {
            input.style.width = '100%'; // Full width on mobile
            input.style.padding = '8px 10px'; // Larger padding
            input.style.fontSize = '16px'; // Larger font size
            input.style.boxSizing = 'border-box'; // Include padding in width calculation
        }
        if (button) {
            button.style.width = '100%'; // Full width on mobile
            button.style.marginLeft = '0'; // No margin left
            button.style.marginTop = '10px'; // Margin top
            button.style.padding = '8px 16px'; // Larger padding
            button.style.fontSize = '16px'; // Larger font size
            button.style.boxSizing = 'border-box'; // Include padding in width calculation
        }
    }

    // 填充已保存的关键词
    const savedKeywords = getKeywords();
    const input = dialog.querySelector('#ns-keyword-input');
    if (savedKeywords.length > 0) {
        input.value = savedKeywords.join(',');
    }

    // 关闭按钮 - 清除过滤效果
    dialog.querySelector('#ns-keyword-filter-close').onclick = function() {
        dialog.remove();
        clearFilter();
    };

    // 过滤逻辑
    function doFilter() {
        const val = input.value;
        const keywords = val.split(/,|，/).map(s => s.trim()).filter(Boolean);
        filterPosts(keywords);
        saveKeywords(keywords); // 保存关键词到 localStorage
        // 新增：操作日志记录
        if (typeof window.addLog === 'function') {
            window.addLog('关键词过滤：' + (keywords.length > 0 ? keywords.join(',') : '无'));
        }
        if (typeof onFilter === 'function') onFilter(keywords);
    }

    dialog.querySelector('#ns-keyword-btn').onclick = doFilter;
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            doFilter();
        }
    });
    input.onclick = function() {
        input.placeholder = '';
    };
    input.onblur = function() {
        if (!input.value) input.placeholder = '输入关键词，如A,B,C';
    };
    // 弹窗可拖动，拖动区域为左上角30x30像素，与鸡腿统计弹窗一致
    setTimeout(() => {
        const titleBar = dialog.querySelector('div');
        if (titleBar && window.makeDraggable) {
            window.makeDraggable(dialog, {width: 30, height: 30});
            // 鼠标移动到左上角30x30像素时变为move
            dialog.addEventListener('mousemove', function(e) {
                const rect = dialog.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                if (x >= 0 && x < 30 && y >= 0 && y < 30) {
                    dialog.style.cursor = 'move';
                } else {
                    dialog.style.cursor = 'default';
                }
            });
            dialog.addEventListener('mouseleave', function() {
                dialog.style.cursor = 'default';
            });
        }
    }, 0);
}

// 关键词过滤的 observer 初始化（用于主插件调用）
function initFilterObserver() {
    // 检查是否有保存的关键词，如果有则自动应用过滤
    const savedKeywords = getKeywords();
    if (savedKeywords.length > 0) {
        // 自动应用过滤
        filterPosts(savedKeywords);
        // 自动显示过滤弹窗
        createFilterUI();
    }
}

// 拖动功能实现（与主插件一致，支持 window.makeDraggable）
if (!window.makeDraggable) {
    window.makeDraggable = function(element, dragAreaSize = {width: 100, height: 32}) {
        let isDragging = false;
        let initialMouseX, initialMouseY;
        let initialElementX, initialElementY;
        const onMouseDown = (e) => {
            const elementRect = element.getBoundingClientRect();
            const clickXInElement = e.clientX - elementRect.left;
            const clickYInElement = e.clientY - elementRect.top;
            if (clickXInElement < 0 || clickXInElement >= dragAreaSize.width || clickYInElement < 0 || clickYInElement >= dragAreaSize.height) {
                return;
            }
            isDragging = true;
            initialMouseX = e.clientX;
            initialMouseY = e.clientY;
            element.style.left = elementRect.left + 'px';
            element.style.top = elementRect.top + 'px';
            element.style.right = 'auto';
            initialElementX = parseFloat(element.style.left);
            initialElementY = parseFloat(element.style.top);
            element.style.cursor = 'move';
            document.body.classList.add('dragging-active');
            document.addEventListener('mousemove', onMouseMoveWhileDragging);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        };
        const onMouseMoveWhileDragging = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - initialMouseX;
            const dy = e.clientY - initialMouseY;
            let newLeft = initialElementX + dx;
            let newTop = initialElementY + dy;
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
        };
        const onMouseUp = (e) => {
            if (!isDragging) return;
            isDragging = false;
            document.body.classList.remove('dragging-active');
            document.removeEventListener('mousemove', onMouseMoveWhileDragging);
            document.removeEventListener('mouseup', onMouseUp);
            element.style.cursor = 'default';
        };
        element.addEventListener('mousedown', onMouseDown);
    };
}

// 导出
window.NodeSeekFilter = {
    filterPosts,
    createFilterUI,
    initFilterObserver,
    clearFilter
};
