// NodeSeek 搜索模块
// 版本: 1.0.0
// 作者: YourName
// 描述: NodeSeek 论坛搜索功能模块

// 使用立即执行函数表达式(IIFE)创建一个闭包，避免全局变量污染
(function() {
    'use strict';

    // 创建全局对象，用于外部调用
    window.nodeseekSearch = {
        init: showSearchDialog,
        search: performSearch
    };

    // 显示搜索对话框
    function showSearchDialog() {
        // 检查是否已经存在搜索对话框
        let dialog = document.getElementById('search-dialog');
        if (dialog) {
            dialog.style.display = 'block';
            return;
        }

        // 创建对话框
        dialog = document.createElement('div');
        dialog.id = 'search-dialog';
        dialog.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; max-width: 90%; background: #fff; border-radius: 8px; box-shadow: 0 0 20px rgba(0,0,0,0.3); z-index: 10000; padding: 20px; font-family: Arial, sans-serif;';

        // 创建标题
        const title = document.createElement('h3');
        title.textContent = 'NodeSeek 论坛搜索';
        title.style.cssText = 'margin-top: 0; margin-bottom: 15px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;';
        dialog.appendChild(title);

        // 创建关闭按钮
        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = 'position: absolute; right: 15px; top: 10px; font-size: 24px; cursor: pointer; color: #999;';
        closeBtn.onclick = function() {
            dialog.style.display = 'none';
        };
        dialog.appendChild(closeBtn);

        // 创建搜索输入框
        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = 'margin-bottom: 15px;';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'search-keyword';
        searchInput.placeholder = '输入搜索关键词';
        searchInput.style.cssText = 'width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-size: 14px;';
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
        inputContainer.appendChild(searchInput);
        dialog.appendChild(inputContainer);

        // 创建搜索历史标题
        const historyTitle = document.createElement('h4');
        historyTitle.textContent = '搜索历史';
        historyTitle.style.cssText = 'margin-top: 15px; margin-bottom: 10px; color: #555; font-size: 14px;';
        dialog.appendChild(historyTitle);

        // 创建搜索历史容器
        const historyContainer = document.createElement('div');
        historyContainer.id = 'search-history';
        historyContainer.style.cssText = 'max-height: 150px; overflow-y: auto; margin-bottom: 15px; border: 1px solid #eee; border-radius: 4px; padding: 5px;';
        dialog.appendChild(historyContainer);

        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; justify-content: space-between;';
        
        // 创建搜索按钮
        const searchBtn = document.createElement('button');
        searchBtn.textContent = '搜索';
        searchBtn.style.cssText = 'padding: 8px 15px; background: #9c27b0; color: white; border: none; border-radius: 4px; cursor: pointer; flex: 1; margin-right: 10px;';
        searchBtn.onclick = performSearch;
        buttonContainer.appendChild(searchBtn);
        
        // 创建清除历史按钮
        const clearBtn = document.createElement('button');
        clearBtn.textContent = '清除历史';
        clearBtn.style.cssText = 'padding: 8px 15px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; flex: 1;';
        clearBtn.onclick = clearSearchHistory;
        buttonContainer.appendChild(clearBtn);
        
        dialog.appendChild(buttonContainer);

        // 添加到页面
        document.body.appendChild(dialog);

        // 加载搜索历史
        loadSearchHistory();

        // 聚焦到搜索框
        setTimeout(() => {
            searchInput.focus();
        }, 100);
    }

    // 执行搜索
    function performSearch() {
        const keyword = document.getElementById('search-keyword').value.trim();
        if (!keyword) {
            alert('请输入搜索关键词');
            return;
        }

        // 保存到搜索历史
        saveSearchHistory(keyword);
        
        // 构建搜索URL
        const searchUrl = `https://www.nodeseek.com/search?q=${encodeURIComponent(keyword)}`;
        
        // 在新标签页中打开搜索结果
        window.open(searchUrl, '_blank');
    }

    // 保存搜索历史
    function saveSearchHistory(keyword) {
        const HISTORY_KEY = 'nodeseek_search_history';
        let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        
        // 检查是否已存在相同关键词
        const index = history.indexOf(keyword);
        if (index !== -1) {
            // 如果存在，先删除旧的
            history.splice(index, 1);
        }
        
        // 添加到历史开头
        history.unshift(keyword);
        
        // 限制历史记录数量为20条
        if (history.length > 20) {
            history = history.slice(0, 20);
        }
        
        // 保存到本地存储
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        
        // 更新显示
        loadSearchHistory();
    }

    // 加载搜索历史
    function loadSearchHistory() {
        const HISTORY_KEY = 'nodeseek_search_history';
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        const container = document.getElementById('search-history');
        
        if (!container) return;
        
        // 清空容器
        container.innerHTML = '';
        
        if (history.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.textContent = '暂无搜索历史';
            emptyMsg.style.cssText = 'color: #999; text-align: center; padding: 10px;';
            container.appendChild(emptyMsg);
            return;
        }
        
        // 创建历史项
        history.forEach(keyword => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.style.cssText = 'padding: 5px 8px; cursor: pointer; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;';
            item.onmouseover = function() {
                this.style.backgroundColor = '#f5f5f5';
            };
            item.onmouseout = function() {
                this.style.backgroundColor = '';
            };
            
            const keywordSpan = document.createElement('span');
            keywordSpan.textContent = keyword;
            keywordSpan.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
            keywordSpan.onclick = function() {
                document.getElementById('search-keyword').value = keyword;
                performSearch();
            };
            item.appendChild(keywordSpan);
            
            const deleteBtn = document.createElement('span');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.style.cssText = 'color: #999; margin-left: 5px; font-size: 16px;';
            deleteBtn.onclick = function(e) {
                e.stopPropagation();
                removeSearchHistoryItem(keyword);
            };
            item.appendChild(deleteBtn);
            
            container.appendChild(item);
        });
    }

    // 删除单个搜索历史项
    function removeSearchHistoryItem(keyword) {
        const HISTORY_KEY = 'nodeseek_search_history';
        let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        
        const index = history.indexOf(keyword);
        if (index !== -1) {
            history.splice(index, 1);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
            loadSearchHistory();
        }
    }

    // 清除所有搜索历史
    function clearSearchHistory() {
        if (confirm('确定要清除所有搜索历史吗？')) {
            localStorage.removeItem('nodeseek_search_history');
            loadSearchHistory();
        }
    }

    // 添加样式
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #search-dialog {
                font-family: Arial, sans-serif;
            }
            #search-history::-webkit-scrollbar {
                width: 6px;
            }
            #search-history::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
            }
            #search-history::-webkit-scrollbar-thumb {
                background: #ccc;
                border-radius: 3px;
            }
            #search-history::-webkit-scrollbar-thumb:hover {
                background: #999;
            }
            @media (max-width: 767px) {
                #search-dialog {
                    width: 90% !important;
                    max-width: 90% !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 初始化样式
    addStyles();

})();
