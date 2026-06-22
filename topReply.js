// ========== 热帖统计（按回复数排序） ==========
(function () {
    'use strict';

    const STORAGE_KEY = 'nodeseek_top_reply_data';
    const SETTINGS_KEY = 'nodeseek_top_reply_settings';
    const FETCH_URL = 'https://www.nodeseek.com/page-1?sortBy=postTime';
    const MIN_INTERVAL = 30; // 秒
    const MAX_INTERVAL = 60; // 秒
    const TOP_COUNT = 10;

    let pollTimer = null;
    let _addLog = console.log;

    // ---- 存储 ----
    function loadSettings() {
        try {
            return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        } catch { return {}; }
    }
    function saveSettings(s) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    }
    function loadPosts() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch { return []; }
    }
    function savePosts(posts) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    }

    // ---- 拉取 & 解析 ----
    function fetchTopPosts() {
        fetch(FETCH_URL, { credentials: 'include' })
            .then(resp => {
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                return resp.text();
            })
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const items = doc.querySelectorAll('ul.post-list > li.post-list-item');

                const posts = [];
                items.forEach(item => {
                    // 标题 & 链接
                    const titleEl = item.querySelector('.post-title a');
                    if (!titleEl) return;
                    const title = titleEl.textContent.trim();
                    const url = titleEl.getAttribute('href') || '';

                    // 作者
                    const authorEl = item.querySelector('.info-author a');
                    const author = authorEl ? authorEl.textContent.trim() : '';

                    // 回复数：优先取 title 属性（"N comments"），回退取文本
                    let comments = 0;
                    const commentSpan = item.querySelector('.info-comments-count span[title]');
                    if (commentSpan) {
                        const m = commentSpan.getAttribute('title').match(/(\d+)/);
                        if (m) comments = parseInt(m[1], 10);
                    } else {
                        const commentText = item.querySelector('.info-comments-count');
                        if (commentText) {
                            const m2 = commentText.textContent.match(/(\d+)/);
                            if (m2) comments = parseInt(m2[1], 10);
                        }
                    }

                    // 浏览数
                    let views = 0;
                    const viewSpan = item.querySelector('.info-views span[title]');
                    if (viewSpan) {
                        const vm = viewSpan.getAttribute('title').match(/(\d+)/);
                        if (vm) views = parseInt(vm[1], 10);
                    }

                    // 分类
                    const catEl = item.querySelector('.post-category');
                    const category = catEl ? catEl.textContent.trim() : '';

                    // 最后回复时间
                    const timeEl = item.querySelector('.info-last-comment-time time');
                    const lastCommentTime = timeEl ? (timeEl.getAttribute('title') || timeEl.textContent.trim()) : '';

                    posts.push({ title, url, author, comments, views, category, lastCommentTime });
                });

                // 按回复数降序，取前 N
                posts.sort((a, b) => b.comments - a.comments);
                const topPosts = posts.slice(0, TOP_COUNT);

                if (topPosts.length > 0) {
                    savePosts(topPosts);
                    if (_addLog) _addLog(`热帖统计：已更新，top1 最多 ${topPosts[0].comments} 条回复`);
                }

                // 如果弹窗打开则实时刷新
                refreshDialogIfOpen(topPosts);
            })
            .catch(err => {
                console.error('[TopReply] fetch error:', err);
            });
    }

    // ---- 定时轮询 ----
    function randomInterval() {
        return (MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL)) * 1000;
    }

    function startPolling() {
        stopPolling();
        // 首次立即拉取
        fetchTopPosts();
        scheduleNext();
    }

    function scheduleNext() {
        pollTimer = setTimeout(() => {
            fetchTopPosts();
            scheduleNext();
        }, randomInterval());
    }

    function stopPolling() {
        if (pollTimer) {
            clearTimeout(pollTimer);
            pollTimer = null;
        }
    }

    // ---- 弹窗 ----
    function refreshDialogIfOpen(posts) {
        const dialog = document.getElementById('top-reply-dialog');
        if (!dialog) return;
        const listDiv = dialog.querySelector('#top-reply-list');
        if (listDiv) {
            listDiv.innerHTML = '';
            renderPostList(listDiv, posts || loadPosts());
        }
        const tsSpan = dialog.querySelector('#top-reply-timestamp');
        if (tsSpan) {
            tsSpan.textContent = '更新于 ' + new Date().toLocaleTimeString();
        }
    }

    function renderPostList(container, posts) {
        if (!posts || posts.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#999;padding:30px 0;font-size:13px;">暂无数据，等待首次拉取…</div>';
            return;
        }

        posts.forEach((post, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:flex-start;padding:8px 4px;border-bottom:1px solid #f0f0f0;gap:8px;';

            // 排名
            const rank = document.createElement('span');
            rank.textContent = idx + 1;
            rank.style.cssText = 'min-width:22px;height:22px;line-height:22px;text-align:center;border-radius:4px;font-size:12px;font-weight:bold;color:#fff;flex-shrink:0;margin-top:1px;';
            rank.style.background = idx < 3 ? ['#f5222d', '#fa8c16', '#fadb14'][idx] : '#bfbfbf';
            if (idx === 2) rank.style.color = '#333';

            // 内容区
            const content = document.createElement('div');
            content.style.cssText = 'flex:1;min-width:0;';

            // 标题行
            const titleLink = document.createElement('a');
            titleLink.textContent = post.title;
            titleLink.href = post.url.startsWith('http') ? post.url : 'https://www.nodeseek.com' + post.url;
            titleLink.target = '_blank';
            titleLink.style.cssText = 'color:#1a73e8;text-decoration:none;font-size:13px;font-weight:500;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            titleLink.onmouseenter = () => titleLink.style.textDecoration = 'underline';
            titleLink.onmouseleave = () => titleLink.style.textDecoration = 'none';

            // 元信息行
            const meta = document.createElement('div');
            meta.style.cssText = 'display:flex;gap:10px;margin-top:3px;font-size:11px;color:#888;flex-wrap:wrap;align-items:center;';

            const authorSpan = document.createElement('span');
            authorSpan.textContent = '👤 ' + post.author;

            const commentSpan = document.createElement('span');
            commentSpan.style.cssText = 'color:#f5222d;font-weight:bold;';
            commentSpan.textContent = '💬 ' + post.comments;

            const viewSpan = document.createElement('span');
            viewSpan.textContent = '👁 ' + post.views;

            meta.appendChild(authorSpan);
            meta.appendChild(commentSpan);
            meta.appendChild(viewSpan);

            if (post.category) {
                const catSpan = document.createElement('span');
                catSpan.textContent = '📂 ' + post.category;
                catSpan.style.color = '#52c41a';
                meta.appendChild(catSpan);
            }

            if (post.lastCommentTime) {
                const timeSpan = document.createElement('span');
                timeSpan.textContent = '🕐 ' + post.lastCommentTime;
                meta.appendChild(timeSpan);
            }

            content.appendChild(titleLink);
            content.appendChild(meta);

            row.appendChild(rank);
            row.appendChild(content);
            container.appendChild(row);
        });
    }

    function showTopReplyDialog() {
        const dialogId = 'top-reply-dialog';
        const existing = document.getElementById(dialogId);
        if (existing) {
            existing.remove();
            return;
        }

        const isMobile = window.innerWidth <= 767;
        const dialog = document.createElement('div');
        dialog.id = dialogId;
        dialog.style.cssText = [
            'position:fixed', 'z-index:10000', 'background:#fff',
            'border:1px solid #ccc', 'border-radius:8px',
            'box-shadow:0 2px 12px rgba(0,0,0,0.15)',
            'padding:0', (isMobile ? 'width:95vw' : 'width:480px'),
            'max-height:80vh', 'display:flex', 'flex-direction:column'
        ].join(';');

        // 与其他弹窗错开
        let topPercent = 50;
        if (document.getElementById('logs-dialog')) topPercent = 55;
        if (document.getElementById('chicken-leg-stats-dialog')) topPercent = 58;
        dialog.style.left = '50%';
        dialog.style.top = topPercent + '%';
        dialog.style.transform = 'translate(-50%, -50%)';

        // ---- 头部 ----
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid #eee;flex-shrink:0;';

        const titleArea = document.createElement('div');
        titleArea.style.cssText = 'display:flex;align-items:center;gap:8px;';

        const title = document.createElement('div');
        title.textContent = '🔥 热帖排行';
        title.style.cssText = 'font-weight:bold;font-size:15px;';

        const tsSpan = document.createElement('span');
        tsSpan.id = 'top-reply-timestamp';
        tsSpan.style.cssText = 'font-size:11px;color:#999;';
        tsSpan.textContent = '更新于 --';

        titleArea.appendChild(title);
        titleArea.appendChild(tsSpan);

        // 刷新按钮
        const refreshBtn = document.createElement('span');
        refreshBtn.textContent = '🔄';
        refreshBtn.title = '立即刷新';
        refreshBtn.style.cssText = 'cursor:pointer;font-size:16px;margin-right:8px;';
        refreshBtn.onclick = () => fetchTopPosts();

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = 'cursor:pointer;font-size:20px;color:#999;';
        closeBtn.onclick = () => dialog.remove();

        const rightBtns = document.createElement('div');
        rightBtns.appendChild(refreshBtn);
        rightBtns.appendChild(closeBtn);

        header.appendChild(titleArea);
        header.appendChild(rightBtns);
        dialog.appendChild(header);

        // ---- 列表区 ----
        const listDiv = document.createElement('div');
        listDiv.id = 'top-reply-list';
        listDiv.style.cssText = 'overflow-y:auto;flex:1;padding:4px 12px;';
        renderPostList(listDiv, loadPosts());
        dialog.appendChild(listDiv);

        // ---- 底部状态栏 ----
        const footer = document.createElement('div');
        footer.style.cssText = 'padding:6px 16px;border-top:1px solid #eee;font-size:11px;color:#aaa;display:flex;justify-content:space-between;flex-shrink:0;';
        footer.innerHTML = `<span>每 ${MIN_INTERVAL}-${MAX_INTERVAL}s 自动刷新</span><span>来源：NodeSeek 最新帖子</span>`;
        dialog.appendChild(footer);

        document.body.appendChild(dialog);

        // 拖拽
        if (typeof makeDraggable === 'function') {
            makeDraggable(dialog, { width: 40, height: 40 });
        }
    }

    // ---- 公共 API ----
    window.NodeSeekTopReply = {
        showTopReplyDialog,
        startPolling,
        stopPolling,
        fetchTopPosts,
        getTopPosts: loadPosts,
        setAddLogFunction(func) { _addLog = func; }
    };

    // 自动启动轮询
    startPolling();

})();
