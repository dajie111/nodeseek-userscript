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
    dialog.style.top = '80px';
    dialog.style.right = '16px';
    dialog.style.zIndex = 10000;
    dialog.style.background = '#fff';
    dialog.style.border = '1px solid #ccc';
    dialog.style.borderRadius = '8px';
    dialog.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
    dialog.style.padding = '18px 20px 12px 20px';
    dialog.style.minWidth = '320px';
    dialog.style.maxWidth = '90vw';
    dialog.style.maxHeight = '70vh';
    dialog.style.overflowY = 'auto';

    // 标题和关闭按钮
    const title = document.createElement('div');
    title.textContent = '关键词过滤（演示版）';
    title.style.fontWeight = 'bold';
    title.style.fontSize = '16px';
    title.style.marginBottom = '10px';
    dialog.appendChild(title);
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.right = '12px';
    closeBtn.style.top = '8px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '20px';
    closeBtn.onclick = function() { dialog.remove(); };
    dialog.appendChild(closeBtn);

    // 简单内容
    const info = document.createElement('div');
    info.textContent = '这里将实现关键词过滤功能。可在此输入关键词，后续可扩展为过滤帖子、用户等。';
    info.style.margin = '10px 0 20px 0';
    dialog.appendChild(info);

    // 输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '输入关键词（暂未实现过滤逻辑）';
    input.style.width = '90%';
    input.style.padding = '6px';
    input.style.fontSize = '14px';
    input.style.marginBottom = '10px';
    dialog.appendChild(input);

    // 关闭按钮
    const btn = document.createElement('button');
    btn.textContent = '关闭';
    btn.style.marginTop = '10px';
    btn.style.padding = '4px 16px';
    btn.style.background = '#888';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '3px';
    btn.style.cursor = 'pointer';
    btn.onclick = function() { dialog.remove(); };
    dialog.appendChild(btn);

    document.body.appendChild(dialog);
};
