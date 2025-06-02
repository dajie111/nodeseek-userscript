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
    dialog.style.padding = '18px 24px 16px 24px';
    dialog.style.borderRadius = '12px';
    dialog.style.boxShadow = '0 4px 18px rgba(0,0,0,0.18)';
    dialog.style.fontSize = '16px';
    dialog.style.color = '#222';
    dialog.style.lineHeight = '2';
    dialog.style.border = '2px solid #4CAF50';
    // 根据设备判断弹窗位置和宽度
    if (window.innerWidth <= 767) {
        dialog.style.top = 'auto'; // 移动端从底部定位
        dialog.style.bottom = '10px';
        dialog.style.left = '50%';
        dialog.style.transform = 'translateX(-50%)';
        dialog.style.width = '96%'; // 移动端宽度
        dialog.style.maxWidth = '96%'; // 移动端最大宽度
        dialog.style.minWidth = 'unset';
        dialog.style.padding = '12px 16px 10px 16px'; // 调整内边距
    } else {
        dialog.style.top = '60px'; // PC端默认位置
        dialog.style.right = '16px';
        dialog.style.minWidth = '380px';
        dialog.style.maxWidth = '600px';
    }
    dialog.style.userSelect = 'auto';
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
    // 弹窗可拖动
    setTimeout(() => {
        if (window.makeDraggable) {
            // 在移动端，将整个弹窗作为拖动区域
            const dragArea = window.innerWidth <= 767 ? {width: dialog.offsetWidth, height: dialog.offsetHeight} : {width: 30, height: 30};
            window.makeDraggable(dialog, dragArea);
            // 鼠标移动到拖动区域时变为move
            dialog.addEventListener('mousemove', function(e) {
                const rect = dialog.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                if (x >= 0 && x < dragArea.width && y >= 0 && y < dragArea.height) {
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

        // Helper to check if the specific point in the hotspot is interactive
        const isPointInteractive = (clientX, clientY, draggableElement) => {
            let elementUnderCursor = document.elementFromPoint(clientX, clientY);
            let currentTarget = elementUnderCursor;

            while(currentTarget && currentTarget !== draggableElement.ownerDocument.body && currentTarget !== draggableElement.ownerDocument.documentElement) {
                if (currentTarget === draggableElement) break; // Reached the draggable element itself

                const tagName = currentTarget.tagName;
                if (['INPUT', 'BUTTON', 'A', 'TEXTAREA', 'SELECT'].includes(tagName) ||
                    currentTarget.isContentEditable ||
                    window.getComputedStyle(currentTarget).cursor === 'pointer' ||
                    (typeof currentTarget.onclick === 'function' && currentTarget !== draggableElement)
                   ) {
                    // Ensure this interactive element is a child of 'draggableElement'
                    // and is the one actually under the cursor at clientX, clientY
                    if (draggableElement.contains(currentTarget)) {
                        return true; // Point is obscured by an interactive child
                    }
                }
                currentTarget = currentTarget.parentElement;
            }
            return false; // Point is not obscured by an interactive child
        };

        const onMouseDown = (e) => {
            const elementRect = element.getBoundingClientRect();
            const clickXInElement = e.clientX - elementRect.left;
            const clickYInElement = e.clientY - elementRect.top;

            // 1. Check if the click is within the designated drag area
            // 只有在PC端才限制拖动区域，移动端不限制
            const isMobile = window.innerWidth <= 767;
            if (!isMobile) {
                if (clickXInElement < 0 || clickXInElement >= dragAreaSize.width ||
                    clickYInElement < 0 || clickYInElement >= dragAreaSize.height) {
                    return; // Clicked outside the draggable area
                }
            }

            // 2. Check if the point clicked in the hotspot is interactive
            // 移动端不执行此检查
            if (!isMobile && isPointInteractive(e.clientX, e.clientY, element)) {
                return; // Clicked on an interactive element within the drag area
            }

            isDragging = true;
            initialMouseX = e.clientX;
            initialMouseY = e.clientY;

            // Ensure element is positioned with left/top for dragging
            const currentStyle = window.getComputedStyle(element);
            if ((element.style.right !== '' && element.style.right !== 'auto') || (currentStyle.right !== 'auto' && (element.style.left === '' || element.style.left === 'auto'))) {
                element.style.left = elementRect.left + 'px';
                element.style.right = 'auto';
            } else if (element.style.left === '' || element.style.left === 'auto' || currentStyle.left === 'auto') {
                element.style.left = elementRect.left + 'px';
            }
            if (element.style.top === '' || element.style.top === 'auto' || currentStyle.top === 'auto') {
                 element.style.top = elementRect.top + 'px';
            }
            initialElementX = parseFloat(element.style.left);
            initialElementY = parseFloat(element.style.top);

            element.style.cursor = 'grabbing'; // 拖动时显示抓取光标
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
            // 拖动结束后，根据鼠标当前位置更新光标
            handleHoverCursor(e);
        };

        const handleHoverCursor = (e) => {
            if (isDragging) return; // 如果正在拖动，则光标已为 'grabbing'

            const elementRect = element.getBoundingClientRect();
            const mouseXInElement = e.clientX - elementRect.left;
            const mouseYInElement = e.clientY - elementRect.top;

            let showCustomCursor = false;

            // 添加调试日志
            console.log(`Mouse: (${e.clientX}, ${e.clientY}), Element Rect: Left=${elementRect.left}, Top=${elementRect.top}, Width=${elementRect.width}, Height=${elementRect.height}`);
            console.log(`Mouse In Element: (${mouseXInElement}, ${mouseYInElement}), Drag Area: Width=${dragAreaSize.width}, Height=${dragAreaSize.height}`);

            // 检查鼠标是否在元素边界内
            if (mouseXInElement >= 0 && mouseXInElement < elementRect.width &&
                mouseYInElement >= 0 && mouseYInElement < elementRect.height) {
                // 检查是否在指定的拖动热点区域内 (PC端) 或整个元素 (移动端)
                const isMobile = window.innerWidth <= 767;
                if (isMobile || (mouseXInElement >= 0 && mouseXInElement < dragAreaSize.width &&
                    mouseYInElement >= 0 && mouseYInElement < dragAreaSize.height)) {
                    // 对于悬停状态，我们不严格检查是否被"交互式子元素"遮挡
                    // 只要在拖动区域内，就显示自定义光标，但点击时依然会通过 isPointInteractive 检查
                    showCustomCursor = true;
                }
            }

            if (showCustomCursor) {
                // 用户希望"雪花样式"光标。由于"雪花"不是标准CSS光标，
                // 我们使用 'all-scroll' 作为视觉上多方向的替代。
                // 如果需要真正的雪花图标，需要提供一个自定义光标图片URL。
                element.style.cursor = 'all-scroll';
            } else {
                // 如果不在活跃热点区域，则设置默认光标，但仅当鼠标仍在元素上方时。
                // onMouseLeaveElement 处理鼠标完全离开元素的情况。
                 if (mouseXInElement >= 0 && mouseXInElement < elementRect.width &&
                    mouseYInElement >= 0 && mouseYInElement < elementRect.height) {
                    element.style.cursor = 'default';
                }
            }
        };

        const onMouseLeaveElement = (e) => {
            if (!isDragging) {
                // 检查鼠标是否确实离开了元素或移动到元素的一部分子元素。
                if (!e.relatedTarget || !element.contains(e.relatedTarget)) {
                    element.style.cursor = 'default';
                }
            }
        };

        element.addEventListener('mousedown', onMouseDown);
        element.addEventListener('mousemove', handleHoverCursor); // 处理悬停时改变光标
        element.addEventListener('mouseleave', onMouseLeaveElement); // 鼠标离开元素时重置光标

        // 添加 CSS 规则以禁用拖动时文本选择
        if (!document.getElementById('dragging-style--userscript')) { // 此脚本的唯一 ID
            const styleTag = document.createElement('style');
            styleTag.id = 'dragging-style--userscript';
            styleTag.innerHTML = '.dragging-active, .dragging-active * { user-select: none !important; -webkit-user-select: none !important; }';
            document.head.appendChild(styleTag);
        }
    };
}

// 导出
window.NodeSeekFilter = {
    filterPosts,
    createFilterUI,
    initFilterObserver,
    clearFilter
};
