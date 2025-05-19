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

// 可选：导出函数供主脚本调用（兼容模块化和全局）
if (typeof window !== 'undefined') {
    window.searchNodeseek = searchNodeseek;
}
