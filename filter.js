// 关键词过滤功能入口
window.showKeywordFilterDialog = function() {
    // 检查弹窗是否已存在
    if (document.getElementById('keyword-filter-dialog')) {
        document.getElementById('keyword-filter-dialog').remove();
        return;
    }
    // 创建弹窗
    const dialog = document.createElement('div');
    dialog.id = 'keyword-filter-dialog';
    dialog.style.position = 'fixed';
    dialog.style.top = '8vh';
    dialog.style.right = '4vw';
    dialog.style.zIndex = 10000;
    dialog.style.background = '#fff';
    dialog.style.border = '1px solid #ccc';
    dialog.style.borderRadius = '10px';
    dialog.style.boxShadow = '0 2px 16px rgba(0,0,0,0.18)';
    dialog.style.padding = '18px 20px 16px 20px';
    dialog.style.minWidth = '320px';
    dialog.style.maxWidth = '96vw';
    dialog.style.maxHeight = '80vh';
    dialog.style.overflowY = 'auto';
    dialog.style.fontFamily = 'inherit';
    dialog.style.transition = 'all 0.2s';
    // 移动端适配
    if (window.innerWidth <= 767) {
        dialog.style.width = '96vw';
        dialog.style.minWidth = 'unset';
        dialog.style.right = '2vw';
        dialog.style.left = '2vw';
        dialog.style.top = '4vh';
        dialog.style.padding = '14px 8px 12px 8px';
        dialog.style.borderRadius = '12px';
    }

    // 标题和关闭按钮
    const title = document.createElement('div');
    title.textContent = '关键词过滤';
    title.style.fontWeight = 'bold';
    title.style.fontSize = window.innerWidth <= 767 ? '18px' : '16px';
    title.style.marginBottom = '10px';
    dialog.appendChild(title);
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.right = window.innerWidth <= 767 ? '10px' : '12px';
    closeBtn.style.top = window.innerWidth <= 767 ? '6px' : '8px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = window.innerWidth <= 767 ? '28px' : '22px';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.width = window.innerWidth <= 767 ? '36px' : '28px';
    closeBtn.style.height = window.innerWidth <= 767 ? '36px' : '28px';
    closeBtn.style.textAlign = 'center';
    closeBtn.style.borderRadius = '50%';
    closeBtn.style.background = 'rgba(0,0,0,0.04)';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';
    closeBtn.onmouseover = function() { closeBtn.style.background = '#eee'; };
    closeBtn.onmouseout = function() { closeBtn.style.background = 'rgba(0,0,0,0.04)'; };
    closeBtn.onclick = function() { dialog.remove(); };
    dialog.appendChild(closeBtn);

    // 简单内容
    const info = document.createElement('div');
    info.textContent = '请输入要过滤的关键词（支持多个，逗号分隔）。后续可扩展为过滤帖子、用户等。';
    info.style.margin = window.innerWidth <= 767 ? '8px 0 16px 0' : '10px 0 20px 0';
    info.style.fontSize = window.innerWidth <= 767 ? '15px' : '13px';
    dialog.appendChild(info);

    // 输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '输入关键词，如A,B,C0000';
    input.style.width = '100%';
    input.style.padding = window.innerWidth <= 767 ? '12px' : '8px';
    input.style.fontSize = window.innerWidth <= 767 ? '18px' : '15px';
    input.style.marginBottom = window.innerWidth <= 767 ? '16px' : '10px';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '6px';
    input.style.boxSizing = 'border-box';
    dialog.appendChild(input);

    // 过滤按钮
    const btn = document.createElement('button');
    btn.textContent = '过滤';
    btn.style.marginTop = window.innerWidth <= 767 ? '10px' : '6px';
    btn.style.padding = window.innerWidth <= 767 ? '12px 0' : '8px 0';
    btn.style.width = '100%';
    btn.style.fontSize = window.innerWidth <= 767 ? '18px' : '15px';
    btn.style.background = '#4CAF50';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '6px';
    btn.style.cursor = 'pointer';
    btn.onclick = function() {
        alert('这里将实现关键词过滤逻辑，当前输入：' + input.value);
    };
    dialog.appendChild(btn);

    document.body.appendChild(dialog);
};
