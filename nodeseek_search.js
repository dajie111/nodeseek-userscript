// nodeseek_search.js
// NodeSeek 论坛搜索功能模块

var nodeseekSearch = (function() {
    'use strict';

    let searchDialog = null; // 存储搜索对话框元素

    // 创建并显示搜索对话框
    function showSearchDialog() {
        // 如果对话框已存在，先移除
        if (searchDialog) {
            searchDialog.remove();
        }

        // 创建对话框容器
        searchDialog = document.createElement('div');
        searchDialog.id = 'nodeseek-search-dialog';
        searchDialog.style.position = 'fixed';
        searchDialog.style.top = '50%';
        searchDialog.style.left = '50%';
        searchDialog.style.transform = 'translate(-50%, -50%)';
        searchDialog.style.zIndex = 10001; // 确保在其他弹窗之上
        searchDialog.style.background = '#fff';
        searchDialog.style.border = '1px solid #ccc';
        searchDialog.style.borderRadius = '8px';
        searchDialog.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
        searchDialog.style.padding = '20px';
        searchDialog.style.minWidth = '300px';
        searchDialog.style.maxWidth = '90%';
        searchDialog.style.textAlign = 'center'; // 文本居中

        // 标题
        const title = document.createElement('div');
        title.textContent = '论坛搜索';
        title.style.fontWeight = 'bold';
        title.style.fontSize = '18px';
        title.style.marginBottom = '15px';
        searchDialog.appendChild(title);

        // 输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '请输入搜索关键词';
        input.style.width = 'calc(100% - 16px)'; // 减去padding
        input.style.padding = '8px';
        input.style.marginBottom = '15px';
        input.style.border = '1px solid #ccc';
        input.style.borderRadius = '4px';
        input.style.fontSize = '14px';
        searchDialog.appendChild(input);

        // 搜索按钮
        const searchBtn = document.createElement('button');
        searchBtn.textContent = '搜索';
        searchBtn.style.padding = '8px 20px';
        searchBtn.style.border = 'none';
        searchBtn.style.borderRadius = '4px';
        searchBtn.style.background = '#673ab7'; // 紫色背景
        searchBtn.style.color = '#fff';
        searchBtn.style.cursor = 'pointer';
        searchBtn.style.fontSize = '14px';
        searchBtn.style.marginRight = '10px'; // 与取消按钮保持间距
        searchDialog.appendChild(searchBtn);

        // 取消按钮
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.padding = '8px 20px';
        cancelBtn.style.border = '1px solid #ccc';
        cancelBtn.style.borderRadius = '4px';
        cancelBtn.style.background = '#eee';
        cancelBtn.style.color = '#333';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.style.fontSize = '14px';
        cancelBtn.onclick = function() {
            searchDialog.remove(); // 移除对话框
            searchDialog = null; // 清空引用
        };
        searchDialog.appendChild(cancelBtn);

        // 将对话框添加到页面body
        document.body.appendChild(searchDialog);

        // 确保输入框自动获取焦点
        setTimeout(() => input.focus(), 100);

        // 搜索按钮点击事件
        searchBtn.onclick = function() {
            performSearch(input.value.trim());
        };

        // 输入框回车事件
        input.onkeydown = function(e) {
            if (e.key === 'Enter') {
                performSearch(input.value.trim());
            }
        };

         // 添加点击对话框外部关闭弹窗的逻辑
        setTimeout(() => { // 延迟添加，避免刚弹出就被点击关闭
            document.addEventListener('click', handleClickOutside);
        }, 50);
    }

     // 处理点击事件，用于关闭对话框
    function handleClickOutside(event) {
        // 如果对话框存在且点击事件不在对话框内部
        if (searchDialog && !searchDialog.contains(event.target)) {
            searchDialog.remove();
            searchDialog = null; // 清空引用
            document.removeEventListener('click', handleClickOutside); // 移除事件监听器
        }
    }

    // 执行搜索操作
    function performSearch(keyword) {
        if (keyword) {
            const searchUrl = `https://www.nodeseek.com/search?q=${encodeURIComponent(keyword)}`;
            // 使用 window.open 在新标签页打开搜索结果
            window.open(searchUrl, '_blank');
            // 搜索完成后关闭弹窗
            if (searchDialog) {
                searchDialog.remove();
                searchDialog = null;
                 document.removeEventListener('click', handleClickOutside); // 移除事件监听器
            }
        } else {
            alert('请输入搜索关键词');
        }
    }

    // 暴露给外部调用的初始化函数
    function init() {
        showSearchDialog();
    }

    // 返回公共API
    return {
        init: init
    };

})();

// 注意：这个脚本需要通过 nodeseek_blacklist.user.js 动态加载和调用。
// 请将此文件上传到你的 GitHub 仓库，并在 nodeseek_blacklist.user.js 中修改对应的加载 URL。
