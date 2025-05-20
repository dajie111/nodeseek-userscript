// NodeSeek 搜索功能模块
// 提供论坛关键词搜索能力

/**
 * 在新标签页打开 NodeSeek 论坛的搜索结果页面
 * @param {string} keyword - 搜索关键词
 */
function searchNodeseek(keyword) {
    if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
        alert('请输入有效的搜索关键词！');
        return;
    }
    // 编码关键词，防止特殊字符导致URL错误
    const searchUrl = 'https://www.nodeseek.com/search?q=' + encodeURIComponent(keyword.trim());
    // 在新标签页打开搜索结果
    window.open(searchUrl, '_blank');
}

/**
 * 过滤NodeSeek帖子列表，只显示同时包含所有关键词的帖子
 * @param {string[]} keywords - 关键词数组
 */
function filterPostsByKeywords(keywords) {
    const postItems = document.querySelectorAll('ul.post-list > li.post-list-item');
    const norm = s => s.replace(/\s+/g, '').toLowerCase();
    postItems.forEach(item => {
        const titleEl = item.querySelector('.post-title a');
        const title = titleEl ? titleEl.textContent.trim() : '';
        const matched = keywords.length === 0 || keywords.every(kw => kw && norm(title).includes(norm(kw)));
        item.style.display = matched ? '' : 'none';
    });
}

/**
 * 初始化关键词过滤UI，自动插入右上角，支持逗号分隔，按回车或按钮过滤
 */
function initKeywordFilterUI() {
    if (document.getElementById('ns-keyword-filter')) return;
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
    const input = document.getElementById('ns-keyword-input');
    input.onclick = function() { input.placeholder = ''; };
    input.onblur = function() { if (!input.value) input.placeholder = '输入关键词，如A,B,C'; };
    function doFilter() {
        const val = input.value;
        const keywords = val.split(/,|，/).map(s => s.trim()).filter(Boolean);
        filterPostsByKeywords(keywords);
        document.getElementById('ns-keyword-log').textContent = `已过滤：${keywords.join(',')}`;
    }
    document.getElementById('ns-keyword-btn').onclick = doFilter;
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { doFilter(); }
    });
    // 页面加载后自动过滤一次
    setTimeout(doFilter, 1000);
    // 监听帖子列表变化，自动过滤
    const observer = new MutationObserver(doFilter);
    const postList = document.querySelector('ul.post-list');
    if (postList) {
        observer.observe(postList, {childList: true, subtree: true});
    }
}

// 可选：导出函数供主脚本调用（兼容模块化和全局）
if (typeof window !== 'undefined') {
    window.searchNodeseek = searchNodeseek;
    window.filterPostsByKeywords = filterPostsByKeywords;
    window.initKeywordFilterUI = initKeywordFilterUI;
}
