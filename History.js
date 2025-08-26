// ========== 历史浏览记录 ==========

(function() {
    'use strict';

    const BROWSE_HISTORY_KEY = 'nodeseek_browse_history';

    function getBrowseHistory() {
        return JSON.parse(localStorage.getItem(BROWSE_HISTORY_KEY) || '[]');
    }

    function setBrowseHistory(list) {
        localStorage.setItem(BROWSE_HISTORY_KEY, JSON.stringify(list));
    }

    function addToBrowseHistory(title, url) {
        const history = getBrowseHistory();
        const timestamp = new Date().toISOString();

        const normalizeUrl = (urlStr) => {
            try {
                const urlObj = new URL(urlStr);
                let pathname = urlObj.pathname;

                const postMatch = pathname.match(/^\/post-(\d+)-\d+$/);
                if (postMatch) {
                    pathname = `/post-${postMatch[1]}-1`;
                }

                urlObj.hash = '';
                urlObj.pathname = pathname;
                return urlObj.toString();
            } catch (e) {
                return urlStr;
            }
        };

        const normalizedUrl = normalizeUrl(url);

        const existingIndex = history.findIndex(item => {
            const existingNormalizedUrl = normalizeUrl(item.url);
            return existingNormalizedUrl === normalizedUrl;
        });

        if (existingIndex >= 0) {
            history[existingIndex].timestamp = timestamp;
            history[existingIndex].visitCount = (history[existingIndex].visitCount || 1) + 1;
            if (title && title.length > history[existingIndex].title.length) {
                history[existingIndex].title = title;
            }
            history[existingIndex].url = url;
            const item = history.splice(existingIndex, 1)[0];
            history.unshift(item);
        } else {
            history.unshift({
                title: title,
                url: url,
                timestamp: timestamp,
                visitCount: 1
            });
        }

        const uniqueHistory = [];
        const seenUrls = new Set();
        for (const item of history) {
            const itemNormalizedUrl = normalizeUrl(item.url);
            if (!seenUrls.has(itemNormalizedUrl)) {
                seenUrls.add(itemNormalizedUrl);
                uniqueHistory.push(item);
            }
        }

        if (uniqueHistory.length > 150) {
            uniqueHistory.length = 150;
        }

        setBrowseHistory(uniqueHistory);
    }

    function clearBrowseHistory() {
        localStorage.removeItem(BROWSE_HISTORY_KEY);
    }

    function cleanupDuplicateHistory() {
        const history = getBrowseHistory();
        if (history.length === 0) return false;

        const normalizeUrl = (urlStr) => {
            try {
                const urlObj = new URL(urlStr);
                let pathname = urlObj.pathname;
                const postMatch = pathname.match(/^\/post-(\d+)-\d+$/);
                if (postMatch) {
                    pathname = `/post-${postMatch[1]}-1`;
                }
                urlObj.hash = '';
                urlObj.pathname = pathname;
                return urlObj.toString();
            } catch (e) {
                return urlStr;
            }
        };

        const uniqueHistory = [];
        const seenUrls = new Map();

        for (let i = 0; i < history.length; i++) {
            const item = history[i];
            const normalizedUrl = normalizeUrl(item.url);
            if (seenUrls.has(normalizedUrl)) {
                const existingIndex = seenUrls.get(normalizedUrl);
                const existingItem = uniqueHistory[existingIndex];
                if (!existingItem.timestamp || (item.timestamp && new Date(item.timestamp) > new Date(existingItem.timestamp))) {
                    existingItem.timestamp = item.timestamp;
                }
                if (item.title && item.title.length > (existingItem.title || '').length) {
                    existingItem.title = item.title;
                }
                existingItem.visitCount = (existingItem.visitCount || 1) + (item.visitCount || 1);
            } else {
                seenUrls.set(normalizedUrl, uniqueHistory.length);
                uniqueHistory.push({
                    title: item.title,
                    url: item.url,
                    timestamp: item.timestamp,
                    visitCount: item.visitCount || 1
                });
            }
        }

        uniqueHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (uniqueHistory.length !== history.length) {
            try { console.log(`清理浏览历史重复记录：从 ${history.length} 条减少到 ${uniqueHistory.length} 条`); } catch (e) {}
            setBrowseHistory(uniqueHistory);
            return true;
        }
        return false;
    }

    function showBrowseHistoryDialog() {
        const existingDialog = document.getElementById('browse-history-dialog');
        if (existingDialog) {
            existingDialog.remove();
            return;
        }

        const history = getBrowseHistory();

        const dialog = document.createElement('div');
        dialog.id = 'browse-history-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '60px';
        dialog.style.right = '16px';
        dialog.style.zIndex = 10000;
        dialog.style.background = '#fff';
        dialog.style.border = '1px solid #ccc';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        dialog.style.padding = '18px 20px 12px 20px';
        if (window.innerWidth > 767) {
            dialog.style.width = '650px';
        }
        dialog.style.maxHeight = '80vh';
        dialog.style.overflowY = 'auto';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.marginBottom = '10px';

        const title = document.createElement('div');
        title.textContent = `历史浏览记录 (${history.length}条)`;
        title.style.fontWeight = 'bold';
        title.style.fontSize = '16px';

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.position = 'absolute';
        closeBtn.style.right = '12px';
        closeBtn.style.top = '8px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '20px';
        closeBtn.onclick = function() { dialog.remove(); };
        closeBtn.className = 'close-btn';

        header.appendChild(title);
        header.appendChild(closeBtn);
        dialog.appendChild(header);

        const searchContainer = document.createElement('div');
        searchContainer.style.marginBottom = '10px';
        searchContainer.style.display = 'flex';
        searchContainer.style.gap = '8px';
        searchContainer.style.alignItems = 'center';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '搜索帖子标题...';
        searchInput.style.flex = '1';
        searchInput.style.padding = '6px 8px';
        searchInput.style.border = '1px solid #ddd';
        searchInput.style.borderRadius = '4px';
        searchInput.style.fontSize = '13px';
        searchInput.style.outline = 'none';
        searchInput.style.boxSizing = 'border-box';

        const searchBtn = document.createElement('button');
        searchBtn.textContent = '搜索';
        searchBtn.style.padding = '6px 12px';
        searchBtn.style.background = '#1890ff';
        searchBtn.style.color = 'white';
        searchBtn.style.border = 'none';
        searchBtn.style.borderRadius = '4px';
        searchBtn.style.cursor = 'pointer';
        searchBtn.style.fontSize = '13px';
        searchBtn.style.whiteSpace = 'nowrap';

        const clearSearchBtn = document.createElement('button');
        clearSearchBtn.textContent = '清除';
        clearSearchBtn.style.padding = '6px 12px';
        clearSearchBtn.style.background = '#666';
        clearSearchBtn.style.color = 'white';
        clearSearchBtn.style.border = 'none';
        clearSearchBtn.style.borderRadius = '4px';
        clearSearchBtn.style.cursor = 'pointer';
        clearSearchBtn.style.fontSize = '13px';
        clearSearchBtn.style.whiteSpace = 'nowrap';

        searchContainer.appendChild(searchInput);
        searchContainer.appendChild(searchBtn);
        searchContainer.appendChild(clearSearchBtn);
        dialog.appendChild(searchContainer);

        const clearBtn = document.createElement('button');
        clearBtn.textContent = '清空历史';
        clearBtn.style.marginBottom = '10px';
        clearBtn.style.padding = '3px 8px';
        clearBtn.style.background = '#f44336';
        clearBtn.style.color = 'white';
        clearBtn.style.border = 'none';
        clearBtn.style.borderRadius = '3px';
        clearBtn.style.cursor = 'pointer';
        clearBtn.onclick = function() {
            if (confirm('确定要清空所有浏览历史吗？')) {
                clearBrowseHistory();
                dialog.remove();
                if (window.addLog) window.addLog('清空浏览历史记录');
            }
        };
        dialog.appendChild(clearBtn);

        const tableContainer = document.createElement('div');
        tableContainer.id = 'history-table-container';

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.tableLayout = 'fixed';
        table.innerHTML = '<thead><tr>'
            + '<th style="text-align:left;font-size:13px;width:61%;">标题</th>'
            + '<th style="text-align:left;font-size:13px;width:22%;">访问时间</th>'
            + '<th style="text-align:center;font-size:13px;width:8%;white-space:nowrap;">访问次数</th>'
            + '<th style="width:9%;text-align:right;">操作</th></tr></thead>';

        const tableWrapper = document.createElement('div');
        tableWrapper.style.overflowX = 'auto';
        tableWrapper.style.maxHeight = '60vh';
        tableWrapper.style.overflowY = 'auto';
        tableWrapper.appendChild(table);

        function renderTable(data) {
            const tbody = document.createElement('tbody');
            if (data.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = '暂无浏览记录';
                empty.style.textAlign = 'center';
                empty.style.color = '#888';
                empty.style.margin = '18px 0 8px 0';
                tableContainer.innerHTML = '';
                tableContainer.appendChild(empty);
                return;
            }

            while (table.querySelector('tbody')) {
                table.removeChild(table.querySelector('tbody'));
            }

            data.forEach((item) => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #eee';

                const tdTitle = document.createElement('td');
                tdTitle.style.width = '61%';
                tdTitle.style.maxWidth = '61%';
                tdTitle.style.overflow = 'hidden';
                tdTitle.style.paddingRight = '8px';
                const titleLink = document.createElement('a');
                titleLink.href = item.url;
                titleLink.textContent = item.title;
                titleLink.target = '_blank';
                titleLink.style.color = '#1890ff';
                titleLink.style.fontWeight = 'normal';
                titleLink.style.fontSize = '13px';
                titleLink.style.textDecoration = 'none';
                titleLink.style.display = 'block';
                titleLink.style.width = '100%';
                titleLink.style.overflow = 'hidden';
                titleLink.style.textOverflow = 'ellipsis';
                titleLink.style.whiteSpace = 'nowrap';
                titleLink.style.paddingRight = '8px';
                titleLink.style.boxSizing = 'border-box';
                titleLink.title = item.title;
                tdTitle.appendChild(titleLink);
                tr.appendChild(tdTitle);

                const tdTime = document.createElement('td');
                tdTime.style.width = '22%';
                tdTime.style.maxWidth = '22%';
                tdTime.style.overflow = 'hidden';
                if (item.timestamp) {
                    const date = new Date(item.timestamp);
                    tdTime.textContent = date.getFullYear() + '-' +
                        String(date.getMonth() + 1).padStart(2, '0') + '-' +
                        String(date.getDate()).padStart(2, '0') + ' ' +
                        String(date.getHours()).padStart(2, '0') + ':' +
                        String(date.getMinutes()).padStart(2, '0') + ':' +
                        String(date.getSeconds()).padStart(2, '0');
                } else {
                    tdTime.textContent = '';
                }
                tdTime.style.fontSize = '12px';
                tdTime.style.whiteSpace = 'nowrap';
                tdTime.style.textAlign = 'left';
                tdTime.style.cssText += 'text-align:left !important;';
                tr.appendChild(tdTime);

                const tdCount = document.createElement('td');
                tdCount.style.width = '8%';
                tdCount.style.maxWidth = '8%';
                tdCount.style.overflow = 'hidden';
                tdCount.textContent = item.visitCount || 1;
                tdCount.style.fontSize = '12px';
                tdCount.style.textAlign = 'center';
                tdCount.style.whiteSpace = 'nowrap';
                tdCount.style.cssText += 'text-align:center !important;';
                tr.appendChild(tdCount);

                const tdOp = document.createElement('td');
                tdOp.style.width = '9%';
                tdOp.style.maxWidth = '9%';
                tdOp.style.overflow = 'hidden';
                tdOp.style.textAlign = 'right';
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '删除';
                removeBtn.className = 'blacklist-btn red';
                removeBtn.style.fontSize = '11px';
                removeBtn.style.whiteSpace = 'nowrap';
                removeBtn.style.minWidth = '48px';
                removeBtn.style.maxWidth = '100%';
                removeBtn.onclick = function(e) {
                    e.stopPropagation();
                    if (confirm('确定要删除该浏览记录？')) {
                        const currentHistory = getBrowseHistory();
                        const filteredHistory = currentHistory.filter(h => h.url !== item.url);
                        setBrowseHistory(filteredHistory);

                        const index = history.findIndex(h => h.url === item.url);
                        if (index > -1) history.splice(index, 1);

                        const count = history.length;
                        title.textContent = `历史浏览记录 (${count}条)`;
                        renderTable(history);

                        if (count === 0) {
                            tableContainer.innerHTML = '';
                            const empty = document.createElement('div');
                            empty.textContent = '暂无浏览记录';
                            empty.style.textAlign = 'center';
                            empty.style.color = '#888';
                            empty.style.margin = '18px 0 8px 0';
                            tableContainer.appendChild(empty);
                        }

                        if (window.addLog) window.addLog(`删除浏览记录: ${item.title}`);
                    }
                };
                tdOp.appendChild(removeBtn);
                tr.appendChild(tdOp);

                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            tableContainer.appendChild(tableWrapper);
        }

        renderTable(history);

        function resetToInitialState() {
            const latest = getBrowseHistory();
            searchInput.value = '';
            title.textContent = `历史浏览记录 (${latest.length}条)`;
            tableContainer.innerHTML = '';
            renderTable(latest);
            try { dialog.scrollTop = 0; } catch (e) {}
        }

        function performSearch() {
            const searchTerm = searchInput.value.trim().toLowerCase();
            if (!searchTerm) {
                resetToInitialState();
                return;
            }
            const source = getBrowseHistory();
            const filteredHistory = source.filter(item => (item.title || '').toLowerCase().includes(searchTerm));
            renderTable(filteredHistory);
            title.textContent = `历史浏览记录 (${filteredHistory.length}条搜索结果)`;
        }

        searchBtn.onclick = performSearch;
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') performSearch();
        });

        clearSearchBtn.onclick = function() { resetToInitialState(); };

        dialog.appendChild(tableContainer);
        document.body.appendChild(dialog);
        if (window.makeDraggable) {
            try { window.makeDraggable(dialog, {width: 50, height: 50}); } catch (e) {}
        }
    }

    window.NodeSeekHistory = {
        getBrowseHistory,
        setBrowseHistory,
        addToBrowseHistory,
        clearBrowseHistory,
        cleanupDuplicateHistory,
        showDialog: showBrowseHistoryDialog
    };
})();


