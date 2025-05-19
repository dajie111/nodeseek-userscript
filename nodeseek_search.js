// NodeSeek 搜索功能模块
// 提供论坛关键词搜索能力

/**
 * 在新标签页打开 NodeSeek 论坛的搜索结果页面，并在结果页自动二次过滤
 * @param {string|string[]} keywords - 搜索关键词（单个或数组）
 */
function searchNodeseek(keywords) {
    // 解析关键词
    let keywordList = [];
    if (Array.isArray(keywords)) {
        keywordList = keywords;
    } else if (typeof keywords === 'string') {
        // 支持多种分隔符：逗号、分号、空格、换行
        keywordList = keywords
            .split(/[,;\\s\\n]+/)
            .map(k => k.trim())
            .filter(k => k);
    }
    keywordList = Array.from(new Set(keywordList));
    if (keywordList.length === 0) {
        alert('请输入有效的搜索关键词！');
        return;
    }
    if (keywordList.length > 10) {
        alert('一次最多只能同时搜索10个关键词，请精简输入。');
        return;
    }

    // 只用第一个关键词发起搜索
    const mainKeyword = keywordList[0];
    const filterKeywords = keywordList.slice(1);

    // 构造过滤参数
    const filterParam = encodeURIComponent(filterKeywords.join('||'));

    // 打开新标签页，带过滤参数
    const searchUrl = `https://www.nodeseek.com/search?q=${encodeURIComponent(mainKeyword)}&filter=${filterParam}`;
    window.open(searchUrl, '_blank');
}

// 可选：导出函数供主脚本调用（兼容模块化和全局）
if (typeof window !== 'undefined') {
    window.searchNodeseek = searchNodeseek;
}

// ========== 下面是注入到搜索结果页面的过滤逻辑 ==========

// 判断是否在NodeSeek搜索结果页，并带有filter参数
(function() {
    if (location.hostname === 'www.nodeseek.com' && location.pathname === '/search') {
        const urlParams = new URLSearchParams(location.search);
        const filter = urlParams.get('filter');
        if (filter) {
            // 解析过滤关键词
            const filterKeywords = decodeURIComponent(filter).split('||').filter(Boolean);
            if (filterKeywords.length > 0) {
                // 等待页面加载完成
                window.addEventListener('DOMContentLoaded', function() {
                    // 你需要根据NodeSeek搜索结果的DOM结构调整这里的选择器
                    // 假设每个结果在 class="search-result-item" 里，内容在 .content 或 .summary
                    document.querySelectorAll('.search-result-item').forEach(item => {
                        const text = item.innerText || item.textContent || '';
                        // 只保留同时包含所有关键词的
                        const allMatch = filterKeywords.every(kw => text.includes(kw));
                        if (!allMatch) {
                            item.style.display = 'none';
                        }
                    });
                });
            }
        }
    }
})();
