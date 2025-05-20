// 这是关键词过滤功能的单独文件

// 日志输出函数
function log(msg) {
    console.log('[NodeSeek过滤]', msg);
}

// 关键词过滤主函数
function filterPosts(keywords) {
    log('开始过滤，关键词：' + keywords.join(','));
    const postItems = document.querySelectorAll('ul.post-list > li.post-list-item'); // 根据实际选择器调整
    let showCount = 0;
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
    log(`过滤完成，显示${showCount}条，隐藏${postItems.length - showCount}条。`);
}

// 创建关键词输入界面
function createFilterUI() {
    if (document.getElementById('ns-keyword-filter')) {
        log('过滤输入框已存在');
        return;
    }
    const container = document.createElement('div');
    container.id = 'ns-keyword-filter';
    container.style.position = 'fixed';
    container.style.top = '80px';
    container.style.right = '30px';
    container.style.zIndex = 99999;
    container.style.background = '#fff';
    container.style.padding = '14px 20px';
    container.style.borderRadius = '10px';
    container.style.boxShadow = '0 4px 18px rgba(0,0,0,0.18)';
    container.style.fontSize = '16px';
    container.style.color = '#222';
    container.style.lineHeight = '2';
    container.style.border = '2px solid #4CAF50';
    container.style.minWidth = '260px';
    container.style.maxWidth = '350px';
    container.style.userSelect = 'auto';
    container.innerHTML = `
        <label style="font-weight:bold;">关键词过滤（逗号分隔）：</label><br>
        <input id="ns-keyword-input" type="text" style="width:180px;padding:4px 8px;font-size:15px;border:1px solid #ccc;border-radius:4px;" placeholder="输入关键词，如A,B,C" />
        <button id="ns-keyword-btn" style="margin-left:8px;padding:4px 12px;font-size:15px;background:#4CAF50;color:#fff;border:none;border-radius:4px;cursor:pointer;">过滤</button>
        <span id="ns-keyword-log" style="margin-left:10px;color:#888;font-size:13px;"></span>
    `;
    document.body.appendChild(container);
    log('已插入关键词过滤输入框');
    
    const input = document.getElementById('ns-keyword-input');
    input.onclick = function() {
        input.placeholder = '';
    };
    input.onblur = function() {
        if (!input.value) input.placeholder = '输入关键词，如A,B,C';
    };
    
    function doFilter() {
        const val = input.value;
        const keywords = val.split(/,|，/).map(s => s.trim()).filter(Boolean);
        filterPosts(keywords);
        document.getElementById('ns-keyword-log').textContent = `已过滤：${keywords.join(',')}`;
    }
    
    document.getElementById('ns-keyword-btn').onclick = doFilter;
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            doFilter();
        }
    });
}

// 应用关键词过滤
function applyKeywordFilter() {
    console.log('applyKeywordFilter function called from filter.js');

    // 检查弹窗是否已存在
    const existingDialog = document.getElementById('ns-keyword-filter');
    if (existingDialog) {
        existingDialog.remove();
        return;
    }

    createFilterUI();

    // 使弹窗可拖动
    if (typeof makeDraggable === 'function') {
        makeDraggable(document.getElementById('ns-keyword-filter'), {width: 300, height: 200});
    }
}
