// NodeSeek 论坛关键词搜索功能模块
// 提供 openNodeSeekSearch(keyword) 方法，在新窗口打开搜索结果页面
// 用法：openNodeSeekSearch('关键词')

/**
 * 打开 NodeSeek 论坛的搜索页面，自动带上关键词
 * @param {string} keyword - 要搜索的关键词
 */
function openNodeSeekSearch(keyword) {
    if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
        alert('请输入有效的搜索关键词');
        return;
    }
    // 构造搜索URL
    const searchUrl = 'https://www.nodeseek.com/search?q=' + encodeURIComponent(keyword.trim());
    // 新窗口打开
    window.open(searchUrl, '_blank');
}

// 导出函数（兼容直接引入和模块化）
if (typeof window !== 'undefined') {
    window.openNodeSeekSearch = openNodeSeekSearch;
}

// 支持ES模块导出
export { openNodeSeekSearch }; 