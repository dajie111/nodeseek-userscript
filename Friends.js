// ========== 查看好友功能 ==========

(function() {
    'use strict';

    // ====== 好友功能数据结构 ======
    const FRIENDS_KEY = 'nodeseek_friends';
    
    // 好友数据结构：[{username, pmUrl, remark, timestamp}]
    function getFriends() {
        return JSON.parse(localStorage.getItem(FRIENDS_KEY) || '[]');
    }
    
    function setFriends(list) {
        localStorage.setItem(FRIENDS_KEY, JSON.stringify(list));
    }
    
    function addFriend(username, remarkInput) {
        let list = getFriends();
        if (!list.some(f => f.username === username)) {
            // 查找ID
            let userId = null;
            const userLink = Array.from(document.querySelectorAll('a.author-name'))
                .find(a => a.textContent.trim() === username);
            if (userLink && userLink.href) {
                const match = userLink.href.match(/\/space\/(\d+)/);
                if (match) userId = match[1];
            }
            let pmUrl = '';
            if (userId) {
                pmUrl = 'https://www.nodeseek.com/notification#/message?mode=talk&to=' + userId;
            } else {
                pmUrl = 'https://www.nodeseek.com/message/new?to=' + encodeURIComponent(username);
            }
            let remark = typeof remarkInput === 'string' ? remarkInput : '';
            list.push({
                username,
                pmUrl,
                remark,
                timestamp: new Date().toISOString() // 添加时间戳记录添加好友的时间
            });
            setFriends(list);
            // 记录操作日志
            if (typeof addLog === 'function') {
                addLog(`添加用户 ${username} 为好友${remark ? ` (备注: ${remark})` : ''}`);
            }
        }
    }
    
    function removeFriend(username, silent = false) {
        let list = getFriends();
        list = list.filter(f => f.username !== username);
        setFriends(list);
        // 记录操作日志
        if (!silent && typeof addLog === 'function') {
            addLog(`删除好友 ${username}`);
        }
    }
    
    function isFriend(username) {
        return getFriends().some(f => f.username === username);
    }

    function getFriendPmUrl(username) {
        const f = getFriends().find(f => f.username === username);
        return f ? f.pmUrl : '';
    }

    // 更新好友备注
    function updateFriendRemark(username, newRemark) {
        let list = getFriends();
        const index = list.findIndex(f => f.username === username);
        if (index !== -1) {
            list[index].remark = newRemark;
            setFriends(list);
            // 记录操作日志
            if (typeof addLog === 'function') {
                addLog(`更新好友 ${username} 的备注为: ${newRemark}`);
            }
        }
    }

    // 高亮好友用户名
    function highlightFriends(targetUsername) {
        const friends = getFriends();
        const friendMap = new Map();
        if (Array.isArray(friends)) {
            friends.forEach(f => {
                if (f && f.username) friendMap.set(String(f.username).trim(), f);
            });
        }

        const normalizedTarget = (typeof targetUsername === 'string' && targetUsername.trim())
            ? targetUsername.trim()
            : '';

        document.querySelectorAll('a.author-name').forEach(function(a) {
            const username = a.textContent.trim();
            if (normalizedTarget && username !== normalizedTarget) return;

            a.classList.remove('friend-user');
            const oldRemark = a.parentNode.querySelector('.friend-remark');
            if (oldRemark) oldRemark.remove();

            const metaInfo = a.closest('.nsk-content-meta-info');
            if (metaInfo) {
                const oldContainer = metaInfo.querySelector('.friend-info-container');
                if (oldContainer) oldContainer.remove();
                const oldFriendTime = metaInfo.querySelector('.friend-time');
                if (oldFriendTime) oldFriendTime.remove();
            }

            const friend = friendMap.get(username);
            const blocked = (typeof isBlacklisted === 'function') ? !!isBlacklisted(username) : false;
            if (!friend || blocked) return;

            a.classList.add('friend-user');

            const remarkText = friend.remark ? String(friend.remark) : '';
            if (remarkText) {
                const span = document.createElement('span');
                span.className = 'friend-remark';
                span.textContent = remarkText;
                span.title = remarkText;
                a.parentNode.appendChild(span);
            }

            if (metaInfo && friend.timestamp) {
                const isMobile = window.innerWidth <= 767;
                metaInfo.style.position = 'relative';

                const container = document.createElement('div');
                container.className = 'friend-info-container';
                container.style.position = isMobile ? 'static' : 'absolute';
                container.style.right = isMobile ? '' : '-6px';
                container.style.top = isMobile ? '' : '23px';
                container.style.display = 'flex';
                container.style.alignItems = 'center';
                container.style.zIndex = isMobile ? '' : '10';
                container.style.background = 'transparent';
                container.style.padding = '0';
                container.style.flexWrap = isMobile ? 'wrap' : 'nowrap';
                container.style.gap = isMobile ? '6px' : '';
                container.style.marginTop = isMobile ? '4px' : '';

                const timeSpan = document.createElement('span');
                timeSpan.className = 'friend-time';

                const date = new Date(friend.timestamp);
                const timeStr = date.getFullYear() + '-' +
                    String(date.getMonth() + 1).padStart(2, '0') + '-' +
                    String(date.getDate()).padStart(2, '0') + ' ' +
                    String(date.getHours()).padStart(2, '0') + ':' +
                    String(date.getMinutes()).padStart(2, '0') + ':' +
                    String(date.getSeconds()).padStart(2, '0');

                timeSpan.textContent = '添加时间：' + timeStr;
                timeSpan.style.color = '#2ea44f';
                timeSpan.style.fontSize = '10px';
                timeSpan.style.whiteSpace = 'nowrap';

                container.appendChild(timeSpan);
                metaInfo.appendChild(container);
            }
        });
    }

    // 显示好友列表弹窗
    function showFriendsDialog() {
        // 检查弹窗是否已存在
        const existingDialog = document.getElementById('friends-dialog');
        if (existingDialog) {
            // 如果已存在，则关闭弹窗
            existingDialog.remove();
            return;
        }

        const list = getFriends();

        // 按添加时间倒序排序，最新添加的排在最前面
        list.sort((a, b) => {
            // 如果没有timestamp属性，则排在最后面
            if (!a.timestamp) return 1;
            if (!b.timestamp) return -1;
            // 倒序排序，最新的在最前面
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        // 不再记录查看好友列表的操作
        const dialog = document.createElement('div');
        dialog.id = 'friends-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '60px';
        dialog.style.right = '16px';
        dialog.style.zIndex = 10000;
        dialog.style.background = '#fff';
        dialog.style.border = '1px solid #ccc';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        dialog.style.padding = '18px 20px 12px 20px';
        // 移除固定minWidth设置，在PC设备上保留
        if (window.innerWidth > 767) {
            dialog.style.minWidth = '380px';  // 只在PC设备上设置
        }
        dialog.style.maxHeight = '60vh';
        dialog.style.overflowY = 'auto';
        dialog.style.overflowX = 'auto';

        // 设备检测与移动端适配
        const isMobile = (window.NodeSeekFilter && typeof window.NodeSeekFilter.isMobileDevice === 'function')
            ? window.NodeSeekFilter.isMobileDevice()
            : (window.innerWidth <= 767);
        if (isMobile) {
            dialog.style.width = '95%';
            dialog.style.minWidth = 'unset';
            dialog.style.maxWidth = '95%';
            dialog.style.left = '50%';
            dialog.style.top = '50%';
            dialog.style.transform = 'translate(-50%, -50%)';
            dialog.style.right = 'auto';
            dialog.style.maxHeight = '85vh';
            dialog.style.padding = '12px 8px 8px 8px';
            dialog.style.overflowY = 'auto';
            dialog.style.overflowX = 'hidden';
            dialog.style.borderRadius = '12px';
            dialog.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)';
        }

        // 标题和关闭按钮
        const title = document.createElement('div');
        title.textContent = '好友列表';
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
        closeBtn.className = 'close-btn'; // 添加类名便于CSS选择器选中
        closeBtn.onclick = function() { dialog.remove(); };
        dialog.appendChild(closeBtn);

        // 搜索框容器与输入（总是显示，便于快速定位）
        const searchWrap = document.createElement('div');
        searchWrap.style.margin = '8px 0 10px 0';
        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.placeholder = '搜索用户名或备注';
        searchInput.style.width = '100%';
        searchInput.style.boxSizing = 'border-box';
        searchInput.style.padding = isMobile ? '10px 12px' : '6px 8px';
        searchInput.style.border = '1px solid #ccc';
        searchInput.style.borderRadius = '4px';
        searchInput.style.fontSize = isMobile ? '16px' : '14px';
        searchWrap.appendChild(searchInput);
        dialog.appendChild(searchWrap);

        // 简繁体与大小写标准化函数（优先使用 NodeSeekFilter.normalizeText）
        const normalizeForSearch = function(text) {
            const s = (text || '').toString();
            if (window.NodeSeekFilter && typeof window.NodeSeekFilter.normalizeText === 'function') {
                return window.NodeSeekFilter.normalizeText(s);
            }
            let t = s.replace(/\s+/g, '').toLowerCase();
            if (window.NodeSeekFilter && typeof window.NodeSeekFilter.convertTraditionalToSimplified === 'function') {
                t = window.NodeSeekFilter.convertTraditionalToSimplified(t);
            }
            return t;
        };

        // 列表内容
        if (list.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = '暂无好友';
            empty.style.textAlign = 'center';
            empty.style.color = '#888';
            empty.style.margin = '18px 0 8px 0';
            dialog.appendChild(empty);
        } else {
            // 使用表格展示，增加备注列
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = '<thead><tr>'
                + '<th style="text-align:left;font-size:13px;width:70px;">用户名</th>'
                + '<th style="text-align:left;font-size:13px;width:110px;">备注</th>'
                + '<th style="text-align:left;font-size:13px;width:100px;padding-left:8px;">添加时间</th>'
                + '<th style="width:48px;text-align:right;"></th></tr></thead>';

            const tableWrapper = document.createElement('div');
            tableWrapper.style.overflowX = 'auto'; // 支持水平滚动
            tableWrapper.appendChild(table);

            const tbody = document.createElement('tbody');
            list.forEach(friend => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #eee';
                // 便于后续搜索过滤
                tr.dataset.username = normalizeForSearch(String(friend.username));
                tr.dataset.remark = normalizeForSearch(String(friend.remark || ''));
                // 用户名
                const tdUser = document.createElement('td');
                const nameLink = document.createElement('a');

                // 修改：从pmUrl中提取用户ID，构建主页链接
                let userId = null;
                if (friend.pmUrl) {
                    // 尝试从notification#/message链接中提取用户ID
                    const match = friend.pmUrl.match(/\/notification#\/message\?mode=talk&to=(\d+)/);
                    if (match) {
                        userId = match[1];
                    }
                }

                // 设置链接地址为用户主页
                if (userId) {
                    nameLink.href = 'https://www.nodeseek.com/space/' + userId + '#/general';
                } else {
                    // 如果无法提取到ID，保留原来的pmUrl
                    nameLink.href = friend.pmUrl;
                }

                nameLink.textContent = friend.username + '　';
                nameLink.target = '_blank';
                nameLink.style.color = '#2ea44f';
                nameLink.style.fontWeight = 'bold';
                nameLink.style.fontSize = '13px';
                nameLink.style.whiteSpace = 'nowrap'; // 确保用户名不换行
                nameLink.title = '点击访问主页';

                tdUser.appendChild(nameLink);

                tr.appendChild(tdUser);
                // 备注
                const tdRemark = document.createElement('td');
                tdRemark.textContent = friend.remark || '';
                tdRemark.style.color = '#888';
                tdRemark.style.fontSize = '12px';
                tdRemark.style.textAlign = 'left';
                tdRemark.style.cssText += 'text-align:left !important;';

                // 根据设备类型调整最大宽度和换行行为
                const isMobile = window.innerWidth <= 767;
                if (!isMobile) {
                    tdRemark.style.maxWidth = '110px';
                    tdRemark.style.overflow = 'hidden';
                    tdRemark.style.textOverflow = 'ellipsis';
                    tdRemark.style.whiteSpace = 'nowrap'; // PC端强制不换行
                }

                // 设置title为备注的完整内容
                tdRemark.title = friend.remark ? friend.remark : '点击编辑备注';

                // 添加点击编辑功能
                tdRemark.style.cursor = 'pointer';
                tdRemark.onclick = function(e) {
                    e.stopPropagation();
                    if (tdRemark.querySelector('input')) return;
                    // 保存当前文本
                    const currentText = tdRemark.textContent;

                    // 创建输入框
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = currentText;
                    input.style.width = '95%';
                    input.style.padding = '2px';
                    input.style.border = '1px solid #2ea44f';
                    input.style.borderRadius = '3px';
                    input.style.fontSize = '12px';

                    // 替换当前内容为输入框
                    const isWithPrefix = isMobile && tdRemark.firstChild.nodeValue === tdRemark.textContent;
                    tdRemark.textContent = '';
                    tdRemark.appendChild(input);
                    input.focus();

                    // 处理输入框失焦事件（保存）
                    input.onblur = function() {
                        const newRemark = input.value;

                        // 先移除输入框
                        input.remove();

                        // 重新设置文本内容
                        tdRemark.textContent = newRemark;

                        // 更新title属性
                        tdRemark.title = newRemark || '点击编辑备注';

                        // 更新好友备注
                        updateFriendRemark(friend.username, newRemark);
                        
                        // 实时更新页面上该用户的备注显示
                        highlightFriends();
                    };

                    // 处理回车键（保存并失焦）
                    input.onkeydown = function(e) {
                        if (e.key === 'Enter') {
                            input.blur(); // 这会触发onblur事件，已经在那里更新了title
                        } else if (e.key === 'Escape') {
                            tdRemark.textContent = currentText; // 取消编辑
                            tdRemark.title = currentText || '点击编辑备注'; // 同时恢复title属性
                        }
                    };
                };
                tr.appendChild(tdRemark);

                // 添加时间列
                const tdTime = document.createElement('td');
                if (friend.timestamp) {
                    const date = new Date(friend.timestamp);
                    tdTime.textContent = date.getFullYear() + '-' +
                        String(date.getMonth() + 1).padStart(2, '0') + '-' +
                        String(date.getDate()).padStart(2, '0') + ' ' +
                        String(date.getHours()).padStart(2, '0') + ':' +
                        String(date.getMinutes()).padStart(2, '0');
                } else {
                    tdTime.textContent = '';
                }
                tdTime.style.fontSize = '12px';
                tdTime.style.whiteSpace = 'nowrap';
                tdTime.style.paddingLeft = '8px'; // 向右移动8px
                tr.appendChild(tdTime);

                // 操作
                const tdOp = document.createElement('td');
                tdOp.style.textAlign = 'right';
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '移除';
                removeBtn.className = 'blacklist-btn red';
                removeBtn.style.fontSize = '11px';
                removeBtn.onclick = function() {
                    if (confirm('确定要移除该好友？')) {
                        removeFriend(friend.username);
                        
                        // 不刷新页面，直接更新行显示
                        tr.style.opacity = '0.5';
                        tr.style.transition = 'opacity 0.2s';
                        
                        setTimeout(function() {
                            tr.remove();
                            
                            // 检查是否还有其他好友，如果没有则显示空提示
                            const currentTbody = tr.closest('tbody');
                            if (currentTbody && currentTbody.children.length === 0) {
                                const empty = document.createElement('div');
                                empty.textContent = '暂无好友';
                                empty.style.textAlign = 'center';
                                empty.style.color = '#888';
                                empty.style.margin = '18px 0 8px 0';
                                const tableWrapper = currentTbody.closest('div');
                                if (tableWrapper) {
                                    tableWrapper.remove();
                                    dialog.appendChild(empty);
                                }
                            }
                            
                            // 更新页面上该用户的所有显示
                            document.querySelectorAll('a.author-name').forEach(function(link) {
                                if (link.textContent.trim() === friend.username) {
                                    // 移除好友样式
                                    link.classList.remove('friend-user');
                                    // 移除备注
                                    const oldRemark = link.parentNode.querySelector('.friend-remark');
                                    if (oldRemark) oldRemark.remove();
                                    // 移除右侧“添加时间”显示
                                    const metaInfo = link.closest('.nsk-content-meta-info');
                                    if (metaInfo) {
                                        const oldFriendTime = metaInfo.querySelector('.friend-time');
                                        if (oldFriendTime) oldFriendTime.remove();
                                    }
                                    
                                    // 更新页面上该用户的好友按钮状态
                                    const userButtons = link.parentNode.querySelectorAll('.userscript-nodeseek-interaction-btn');
                                    userButtons.forEach(btn => {
                                        if (btn.textContent === '删除好友') {
                                            btn.textContent = '添加好友';
                                            btn.style.background = '#2ea44f';
                                        }
                                    });
                                }
                            });
                        }, 200);
                    }
                };
                tdOp.appendChild(removeBtn);
                tr.appendChild(tdOp);
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            dialog.appendChild(tableWrapper);

            // 搜索空结果提示
            const searchEmpty = document.createElement('div');
            searchEmpty.id = 'friends-search-empty';
            searchEmpty.textContent = '未找到匹配项';
            searchEmpty.style.textAlign = 'center';
            searchEmpty.style.color = '#888';
            searchEmpty.style.margin = '10px 0 4px 0';
            searchEmpty.style.display = 'none';
            dialog.appendChild(searchEmpty);

            // 绑定搜索输入事件（支持繁体）
            searchInput.addEventListener('input', function() {
                const kw = normalizeForSearch(searchInput.value.trim());
                let visibleCount = 0;
                tbody.querySelectorAll('tr').forEach(tr => {
                    const match = !kw || tr.dataset.username.includes(kw) || tr.dataset.remark.includes(kw);
                    tr.style.display = match ? '' : 'none';
                    if (match) visibleCount++;
                });
                searchEmpty.style.display = visibleCount === 0 ? '' : 'none';
            });
        }

        document.body.appendChild(dialog);
        
        // 移动端禁用拖拽；桌面端可拖拽
        if (!isMobile && typeof makeDraggable === 'function') {
            makeDraggable(dialog, {width: 50, height: 50});
        }
    }

    // 新增：从好友弹窗中移除指定用户
    function removeFriendFromDialog(username) {
        const friendsDialog = document.getElementById('friends-dialog');
        if (!friendsDialog) return;
        
        const table = friendsDialog.querySelector('table');
        if (!table) return;
        
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        
        // 查找要移除的用户行
        Array.from(tbody.children).forEach(function(row) {
            const userNameCell = row.querySelector('td:first-child a');
            if (userNameCell && userNameCell.textContent.trim().replace('　', '') === username) {
                // 添加淡出动画
                row.style.opacity = '0.5';
                row.style.transition = 'opacity 0.2s';
                
                setTimeout(function() {
                    row.remove();
                    
                    // 检查是否还有其他好友，如果没有则显示空提示
                    if (tbody.children.length === 0) {
                        const empty = document.createElement('div');
                        empty.textContent = '暂无好友';
                        empty.style.textAlign = 'center';
                        empty.style.color = '#888';
                        empty.style.margin = '18px 0 8px 0';
                        const tableWrapper = table.parentElement;
                        if (tableWrapper) {
                            tableWrapper.remove();
                            friendsDialog.appendChild(empty);
                        }
                    }
                }, 200);
            }
        });
    }

    // 新增：实时更新好友弹窗中的内容
    function updateFriendsDialogWithNewUser(username, remark) {
        const friendsDialog = document.getElementById('friends-dialog');
        if (!friendsDialog) return;
        
        // 移除可能存在的空提示
        const emptyDiv = friendsDialog.querySelector('div:last-child');
        if (emptyDiv && emptyDiv.textContent === '暂无好友') {
            emptyDiv.remove();
        }
        
        // 获取最新的好友信息
        const friends = getFriends();
        const friend = friends.find(f => f.username === username);
        if (!friend) return;
        
        // 查找或创建表格
        let table = friendsDialog.querySelector('table');
        if (!table) {
            // 如果没有表格，创建一个
            table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = '<thead><tr>'
                + '<th style="text-align:left;font-size:13px;width:70px;">用户名</th>'
                + '<th style="text-align:left;font-size:13px;width:110px;">备注</th>'
                + '<th style="text-align:left;font-size:13px;width:100px;padding-left:8px;">添加时间</th>'
                + '<th style="width:48px;text-align:right;"></th></tr></thead>';
            
            const tableWrapper = document.createElement('div');
            tableWrapper.style.overflowX = 'auto';
            tableWrapper.appendChild(table);
            
            const tbody = document.createElement('tbody');
            table.appendChild(tbody);
            friendsDialog.appendChild(tableWrapper);
        }
        
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        
        // 创建新行
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #eee';
        tr.style.opacity = '0'; // 初始透明
        tr.style.transition = 'opacity 0.3s ease-in';
        
        // 用户名列
        const tdUser = document.createElement('td');
        const nameLink = document.createElement('a');

        // 从pmUrl中提取用户ID，构建主页链接
        let userId = null;
        if (friend.pmUrl) {
            const match = friend.pmUrl.match(/\/notification#\/message\?mode=talk&to=(\d+)/);
            if (match) {
                userId = match[1];
            }
        }

        // 设置链接地址为用户主页
        if (userId) {
            nameLink.href = 'https://www.nodeseek.com/space/' + userId + '#/general';
        } else {
            nameLink.href = friend.pmUrl;
        }

        nameLink.textContent = friend.username + '　';
        nameLink.target = '_blank';
        nameLink.style.color = '#2ea44f';
        nameLink.style.fontWeight = 'bold';
        nameLink.style.fontSize = '13px';
        nameLink.style.whiteSpace = 'nowrap';
        nameLink.title = '点击访问主页';

        tdUser.appendChild(nameLink);
        tr.appendChild(tdUser);

        // 备注列
        const tdRemark = document.createElement('td');
        tdRemark.textContent = friend.remark || '';
        tdRemark.style.color = '#888';
        tdRemark.style.fontSize = '12px';
        tdRemark.style.textAlign = 'left';
        tdRemark.style.cssText += 'text-align:left !important;';

        const isMobile = window.innerWidth <= 767;
        if (!isMobile) {
            tdRemark.style.maxWidth = '110px';
            tdRemark.style.overflow = 'hidden';
            tdRemark.style.textOverflow = 'ellipsis';
            tdRemark.style.whiteSpace = 'nowrap';
        }

        tdRemark.title = friend.remark ? friend.remark : '点击编辑备注';
        tdRemark.style.cursor = 'pointer';
        
        // 添加点击编辑功能
        tdRemark.onclick = function(e) {
            e.stopPropagation();
            if (tdRemark.querySelector('input')) return;
            const currentText = tdRemark.textContent;

            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentText;
            input.style.width = '95%';
            input.style.padding = '2px';
            input.style.border = '1px solid #2ea44f';
            input.style.borderRadius = '3px';
            input.style.fontSize = '12px';

            tdRemark.textContent = '';
            tdRemark.appendChild(input);
            input.focus();

            input.onblur = function() {
                const newRemark = input.value;
                input.remove();
                tdRemark.textContent = newRemark;
                tdRemark.title = newRemark || '点击编辑备注';
                updateFriendRemark(friend.username, newRemark);
                
                // 实时更新页面上该用户的备注显示
                highlightFriends();
            };

            input.onkeydown = function(e) {
                if (e.key === 'Enter') {
                    input.blur();
                } else if (e.key === 'Escape') {
                    tdRemark.textContent = currentText;
                    tdRemark.title = currentText || '点击编辑备注';
                }
            };
        };
        tr.appendChild(tdRemark);

        // 添加时间列
        const tdTime = document.createElement('td');
        if (friend.timestamp) {
            const date = new Date(friend.timestamp);
            tdTime.textContent = date.getFullYear() + '-' +
                String(date.getMonth() + 1).padStart(2, '0') + '-' +
                String(date.getDate()).padStart(2, '0') + ' ' +
                String(date.getHours()).padStart(2, '0') + ':' +
                String(date.getMinutes()).padStart(2, '0');
        } else {
            tdTime.textContent = '';
        }
        tdTime.style.fontSize = '12px';
        tdTime.style.whiteSpace = 'nowrap';
        tdTime.style.paddingLeft = '8px';
        tr.appendChild(tdTime);

        // 操作列
        const tdOp = document.createElement('td');
        tdOp.style.textAlign = 'right';
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '移除';
        removeBtn.className = 'blacklist-btn red';
        removeBtn.style.fontSize = '11px';
        removeBtn.onclick = function() {
            if (confirm('确定要移除该好友？')) {
                removeFriend(friend.username);
                
                tr.style.opacity = '0.5';
                tr.style.transition = 'opacity 0.2s';
                
                setTimeout(function() {
                    tr.remove();
                    
                    if (tbody && tbody.children.length === 0) {
                        const empty = document.createElement('div');
                        empty.textContent = '暂无好友';
                        empty.style.textAlign = 'center';
                        empty.style.color = '#888';
                        empty.style.margin = '18px 0 8px 0';
                        table.parentElement.remove();
                        friendsDialog.appendChild(empty);
                    }
                    
                    // 更新页面上该用户的所有显示
                    document.querySelectorAll('a.author-name').forEach(function(link) {
                        if (link.textContent.trim() === friend.username) {
                            // 移除好友样式
                            link.classList.remove('friend-user');
                            // 移除备注
                            const oldRemark = link.parentNode.querySelector('.friend-remark');
                            if (oldRemark) oldRemark.remove();
                            // 移除右侧“添加时间”显示
                            const metaInfo = link.closest('.nsk-content-meta-info');
                            if (metaInfo) {
                                const oldFriendTime = metaInfo.querySelector('.friend-time');
                                if (oldFriendTime) oldFriendTime.remove();
                            }
                            
                            // 更新页面上该用户的好友按钮状态
                            const userButtons = link.parentNode.querySelectorAll('.userscript-nodeseek-interaction-btn');
                            userButtons.forEach(btn => {
                                if (btn.textContent === '删除好友') {
                                    btn.textContent = '添加好友';
                                    btn.style.background = '#2ea44f';
                                }
                            });
                        }
                    });
                }, 200);
            }
        };
        tdOp.appendChild(removeBtn);
        tr.appendChild(tdOp);

        // 将新行添加到表格顶部（最新的在最前面）
        if (tbody.firstChild) {
            tbody.insertBefore(tr, tbody.firstChild);
        } else {
            tbody.appendChild(tr);
        }
        
        // 添加淡入动画效果
        setTimeout(function() {
            tr.style.opacity = '1';
        }, 50);
    }

    // 将函数暴露到全局作用域，供主脚本调用
    window.NodeSeekFriends = {
        getFriends,
        setFriends,
        addFriend,
        removeFriend,
        isFriend,
        getFriendPmUrl,
        updateFriendRemark,
        highlightFriends,
        showFriendsDialog,
        updateFriendsDialogWithNewUser,
        removeFriendFromDialog
    };

})();
