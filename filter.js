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

// 创建关键词输入界面（弹窗）
function createFilterUI(onFilter) {
    const existing = document.getElementById('ns-keyword-filter-dialog');
    if (existing) {
        existing.remove();
        return;
    }
    const dialog = document.createElement('div');
    dialog.id = 'ns-keyword-filter-dialog';
    dialog.style.position = 'fixed';
    dialog.style.top = '60px';
    dialog.style.right = '16px';
    dialog.style.zIndex = 10001;
    dialog.style.background = '#fff';
    dialog.style.padding = '18px 24px 16px 24px';
    dialog.style.borderRadius = '12px';
    dialog.style.boxShadow = '0 4px 18px rgba(0,0,0,0.18)';
    dialog.style.fontSize = '16px';
    dialog.style.color = '#222';
    dialog.style.lineHeight = '2';
    dialog.style.border = '2px solid #4CAF50';
    // 设置宽度与查看好友弹窗一致
    if (window.innerWidth > 767) {
        dialog.style.minWidth = '380px';
        dialog.style.maxWidth = '600px';
    } else {
        dialog.style.minWidth = '';
        dialog.style.maxWidth = '';
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
    // 关闭按钮
    dialog.querySelector('#ns-keyword-filter-close').onclick = function() {
        dialog.remove();
    };
    // 过滤逻辑
    const input = dialog.querySelector('#ns-keyword-input');
    function doFilter() {
        const val = input.value;
        const keywords = val.split(/,|，/).map(s => s.trim()).filter(Boolean);
        filterPosts(keywords);
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
    // 弹窗可拖动，拖动区域为左上角10x10像素，与查看好友弹窗一致
    setTimeout(() => {
        const titleBar = dialog.querySelector('div');
        if (titleBar && window.makeDraggable) {
            window.makeDraggable(dialog, {width: 10, height: 10});
            // 鼠标移动到左上角10x10像素时变为move
            dialog.addEventListener('mousemove', function(e) {
                const rect = dialog.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                if (x >= 0 && x < 10 && y >= 0 && y < 10) {
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
    // 只保留 observer 监听分页、异步加载、SPA路由时，重新过滤当前输入框的关键词
    // 但不再自动根据输入内容过滤，只在按钮或回车时过滤
    // 可以直接注释掉 observer 的 filterPosts 调用，或者移除 observer
    // 这里选择移除 observer，保持纯手动过滤
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
    initFilterObserver
};
