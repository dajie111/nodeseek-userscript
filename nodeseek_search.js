// NodeSeek 搜索功能模块
// 提供论坛关键词搜索能力

/**
 * 在新标签页打开 NodeSeek 论坛的搜索结果页面
 * @param {string|string[]} keywords - 搜索关键词（单个或数组）
 */
function searchNodeseek(keywords) {
    // 支持字符串或数组
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
    // 去重
    keywordList = Array.from(new Set(keywordList));

    if (keywordList.length === 0) {
        alert('请输入有效的搜索关键词！');
        return;
    }
    if (keywordList.length > 10) {
        alert('一次最多只能同时搜索10个关键词，请精简输入。');
        return;
    }
    if (keywordList.length === 1) {
        // 单关键词，原有逻辑
        const searchUrl = 'https://www.nodeseek.com/search?q=' + encodeURIComponent(keywordList[0]);
        window.open(searchUrl, '_blank');
        return;
    }
    // 多关键词，批量打开
    if (!confirm(`将为${keywordList.length}个关键词分别打开搜索结果，是否继续？`)) {
        return;
    }
    keywordList.forEach(keyword => {
        const searchUrl = 'https://www.nodeseek.com/search?q=' + encodeURIComponent(keyword);
        window.open(searchUrl, '_blank');
    });
}

// 可选：导出函数供主脚本调用（兼容模块化和全局）
if (typeof window !== 'undefined') {
    window.searchNodeseek = searchNodeseek;
}
