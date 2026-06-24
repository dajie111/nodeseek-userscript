// ========== 热帖统计（按回复数排序） ==========
(function () {
    'use strict';

    const STORAGE_KEY = 'nodeseek_top_reply_data';
    const SETTINGS_KEY = 'nodeseek_top_reply_settings';
    const BASE_URL = 'https://www.nodeseek.com/page-';
    const SORT_PARAM = '?sortBy=replyTime';
    const MAX_PAGE = 10;
    const TOP_COUNT = 15;

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

    // 从帖子 URL 中提取数字 ID，如 /post-512810-1 返回 512810
    function extractPostId(url) {
        const m = url.match(/post-(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
    }

    // ---- 拉取 & 解析 ----
    function parsePostFromItem(item) {
        const titleEl = item.querySelector('.post-title a');
        if (!titleEl) return null;
        const title = titleEl.textContent.trim();
        const url = titleEl.getAttribute('href') || '';

        const authorEl = item.querySelector('.info-author a');
        const author = authorEl ? authorEl.textContent.trim() : '';

        let comments = 0;
        const commentSpan = item.querySelector('.info-comments-count span[title]');
        if (commentSpan) {
            const m = commentSpan.getAttribute('title').match(/(\d+)/);
            if (m) comments = parseInt(m[1], 10) - 1;
        } else {
            const commentText = item.querySelector('.info-comments-count');
            if (commentText) {
                const m2 = commentText.textContent.match(/(\d+)/);
                if (m2) comments = Math.max(0, parseInt(m2[1], 10) - 1);
            }
        }

        let views = 0;
        const viewSpan = item.querySelector('.info-views span[title]');
        if (viewSpan) {
            const vm = viewSpan.getAttribute('title').match(/(\d+)/);
            if (vm) views = parseInt(vm[1], 10);
        }

        const catEl = item.querySelector('.post-category');
        const category = catEl ? catEl.textContent.trim() : '';

        const timeEl = item.querySelector('.info-last-comment-time time');
        const lastCommentTime = timeEl ? (timeEl.getAttribute('title') || timeEl.textContent.trim()) : '';

        const lastReplierEl = item.querySelector('.info-last-commenter a');
        const lastReplier = lastReplierEl ? lastReplierEl.textContent.trim() : '';

        return { title, url, author, comments, views, category, lastCommentTime, lastReplier, postId: extractPostId(url) };
    }

    function fetchPage(pageNum) {
        const url = BASE_URL + pageNum + SORT_PARAM;
        return fetch(url, { credentials: 'include' })
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
                    const post = parsePostFromItem(item);
                    if (post) posts.push(post);
                });
                return posts;
            });
    }

    function fetchTopPosts() {
        const promises = [];
        for (let i = 1; i <= MAX_PAGE; i++) {
            promises.push(fetchPage(i));
        }
        Promise.all(promises)
            .then(results => {
                // 按 url 去重
                const seen = new Set();
                const allPosts = [].concat(...results).filter(p => {
                    if (seen.has(p.url)) return false;
                    seen.add(p.url);
                    return true;
                });

                // 找到当前批次中最新的帖子 ID，过滤掉老帖（ID 差距超过 10000）
                const maxId = allPosts.reduce((max, p) => Math.max(max, p.postId || 0), 0);
                const freshPosts = allPosts.filter(p => (p.postId || 0) >= maxId - 10000);

                freshPosts.sort((a, b) => b.comments - a.comments);
                const topPosts = freshPosts.slice(0, TOP_COUNT);

                if (topPosts.length > 0) {
                    savePosts(topPosts);
                }

                refreshDialogIfOpen(topPosts);
            })
            .catch(() => {});
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
            container.innerHTML = '<div style="text-align:center;color:#bbb;padding:50px 0;font-size:14px;">暂无数据，等待首次拉取…</div>';
            return;
        }

        posts.forEach((post, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;padding:8px 14px;margin:0 0 1px;border-radius:8px;gap:12px;transition:background 0.2s ease;cursor:default;';
            row.onmouseenter = function() { this.style.background = '#f7f8fa'; };
            row.onmouseleave = function() { this.style.background = 'transparent'; };

            // 排名
            const rank = document.createElement('div');
            rank.style.cssText = 'min-width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;font-size:12px;font-weight:700;flex-shrink:0;';
            if (idx === 0) {
                rank.textContent = '1';
                rank.style.cssText += 'background:linear-gradient(135deg,#ff6b6b,#ee5a24);color:#fff;box-shadow:0 2px 8px rgba(238,90,36,0.3);';
            } else if (idx === 1) {
                rank.textContent = '2';
                rank.style.cssText += 'background:linear-gradient(135deg,#ffa502,#e67e22);color:#fff;box-shadow:0 2px 8px rgba(230,126,34,0.25);';
            } else if (idx === 2) {
                rank.textContent = '3';
                rank.style.cssText += 'background:linear-gradient(135deg,#feca57,#f39c12);color:#7d5a00;box-shadow:0 2px 8px rgba(243,156,18,0.25);';
            } else {
                rank.textContent = idx + 1;
                rank.style.cssText += 'background:#f0f0f0;color:#999;';
            }

            // 内容
            const content = document.createElement('div');
            content.style.cssText = 'flex:1;min-width:0;';

            const titleLink = document.createElement('a');
            titleLink.className = 'top-reply-title';
            titleLink.textContent = post.title;
            titleLink.href = post.url.startsWith('http') ? post.url : 'https://www.nodeseek.com' + post.url;
            titleLink.target = '_blank';
            titleLink.style.cssText = 'text-decoration:none;font-size:13px;font-weight:600;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.5;';
            titleLink.onmouseenter = function() {
                this.title = this.scrollWidth > this.clientWidth ? post.title : '';
            };

            const meta = document.createElement('div');
            meta.style.cssText = 'display:flex;gap:6px;margin-top:3px;font-size:11px;align-items:center;flex-wrap:wrap;';

            // 作者
            const authorSpan = document.createElement('span');
            authorSpan.textContent = post.author;
            authorSpan.style.cssText = 'color:#5a6d80;background:#eef2f7;padding:2px 8px;border-radius:10px;font-weight:500;';

            // 回复数
            const commentSpan = document.createElement('span');
            commentSpan.style.cssText = 'color:#e74c3c;font-weight:700;display:flex;align-items:center;gap:2px;';
            commentSpan.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' + post.comments;

            // 浏览数
            const viewSpan = document.createElement('span');
            viewSpan.style.cssText = 'color:#95a5a6;display:flex;align-items:center;gap:2px;';
            viewSpan.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' + post.views;

            meta.appendChild(authorSpan);
            meta.appendChild(viewSpan);
            meta.appendChild(commentSpan);

            if (post.lastReplier) {
                const replierSpan = document.createElement('span');
                replierSpan.textContent = post.lastReplier;
                replierSpan.style.cssText = 'color:#5a6d80;';
                meta.appendChild(replierSpan);
            }

            if (post.lastCommentTime) {
                const timeSpan = document.createElement('span');
                timeSpan.textContent = post.lastCommentTime;
                timeSpan.style.cssText = 'color:#bdc3c7;font-size:10px;margin-top:2px;';
                meta.appendChild(timeSpan);
            }

            if (post.category) {
                const catSpan = document.createElement('span');
                catSpan.textContent = post.category;
                catSpan.style.cssText = 'color:#27ae60;background:#eafaf1;padding:2px 8px;border-radius:10px;font-weight:500;';
                meta.appendChild(catSpan);
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
        const dialogWidth = isMobile ? Math.floor(window.innerWidth * 0.95) : 720;
        dialog.style.cssText = [
            'position:fixed', 'z-index:10000', 'background:#fff',
            'border:1px solid rgba(0,0,0,0.08)', 'border-radius:16px',
            'box-shadow:0 20px 60px rgba(0,0,0,0.12),0 0 0 1px rgba(0,0,0,0.03)',
            'padding:0', 'width:' + dialogWidth + 'px',
            'max-height:80vh', 'display:flex', 'flex-direction:column',
            'overflow:hidden', 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
        ].join(';');

        // 用像素计算居中位置
        let topOffset = 0;
        if (document.getElementById('logs-dialog')) topOffset = 30;
        if (document.getElementById('chicken-leg-stats-dialog')) topOffset = 60;
        const dialogLeft = Math.floor((window.innerWidth - dialogWidth) / 2) + 180;
        const dialogTop = Math.floor(window.innerHeight * 0.1) + topOffset;
        dialog.style.left = Math.max(0, dialogLeft) + 'px';
        dialog.style.top = Math.max(0, dialogTop) + 'px';

        // 标题栏
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:14px 20px;background:#fff;border-bottom:1px solid #f0f0f0;flex-shrink:0;user-select:none;';

        // 左上角拖拽手柄 20x20
        const dragHandle = document.createElement('div');
        dragHandle.style.cssText = 'position:absolute;top:0;left:0;width:20px;height:20px;cursor:move;z-index:10;';
        dialog.appendChild(dragHandle);

        const titleArea = document.createElement('div');
        titleArea.style.cssText = 'display:flex;align-items:center;gap:8px;';

        const title = document.createElement('div');
        title.style.cssText = 'font-weight:700;font-size:15px;color:#333;display:flex;align-items:center;gap:6px;';
        title.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c.3 2.8 2.1 5.1 4.5 6.7C18.2 10.2 20 13 20 16a8 8 0 0 1-16 0c0-3 1.8-5.8 3.5-7.3C9.9 7.1 11.7 4.8 12 2z"></path></svg>热帖排行';

        const tsSpan = document.createElement('span');
        tsSpan.id = 'top-reply-timestamp';
        tsSpan.style.cssText = 'font-size:11px;color:#bbb;margin-left:2px;';
        tsSpan.textContent = '';

        titleArea.appendChild(title);
        titleArea.appendChild(tsSpan);

        const refreshBtn = document.createElement('span');
        refreshBtn.title = '立即刷新';
        refreshBtn.style.cssText = 'cursor:pointer;transition:all 0.2s;display:flex;align-items:center;padding:4px;border-radius:6px;';
        refreshBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>';
        refreshBtn.onmouseenter = function() { this.style.background = '#f5f5f5'; };
        refreshBtn.onmouseleave = function() { this.style.background = 'transparent'; };
        refreshBtn.onclick = () => fetchTopPosts();

        const closeBtn = document.createElement('span');
        closeBtn.style.cssText = 'cursor:pointer;display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;transition:all 0.15s;';
        closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        closeBtn.onmouseenter = function() { this.style.background = '#f5f5f5'; };
        closeBtn.onmouseleave = function() { this.style.background = 'transparent'; };
        closeBtn.onclick = () => dialog.remove();

        const rightBtns = document.createElement('div');
        rightBtns.style.cssText = 'display:flex;align-items:center;gap:4px;';
        rightBtns.appendChild(refreshBtn);
        rightBtns.appendChild(closeBtn);

        header.appendChild(titleArea);
        header.appendChild(rightBtns);
        dialog.appendChild(header);

        // 列表区域
        const listDiv = document.createElement('div');
        listDiv.id = 'top-reply-list';
        listDiv.style.cssText = 'overflow-y:auto;flex:1;padding:8px;scrollbar-width:thin;scrollbar-color:#ddd transparent;';
        listDiv.innerHTML = '<div style="text-align:center;padding:50px 0;"><div style="display:inline-block;width:28px;height:28px;border:3px solid #e8e8e8;border-top-color:#3498db;border-radius:50%;animation:topReplySpin 0.8s linear infinite;"></div><div style="margin-top:12px;color:#aaa;font-size:13px;">加载中…</div></div>';
        // 注入动画和滚动条样式
        if (!document.getElementById('top-reply-spin-style')) {
            const style = document.createElement('style');
            style.id = 'top-reply-spin-style';
            style.textContent = '@keyframes topReplySpin{to{transform:rotate(360deg)}}#top-reply-list::-webkit-scrollbar{width:6px}#top-reply-list::-webkit-scrollbar-track{background:transparent}#top-reply-list::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px}#top-reply-list::-webkit-scrollbar-thumb:hover{background:#ccc}.top-reply-title{color:#2c3e50;transition:color 0.15s}.top-reply-title:hover{color:#3498db}';
            document.head.appendChild(style);
        }
        dialog.appendChild(listDiv);

        // 阻止滚动穿透：列表滚动到边界时阻止事件传播到页面
        listDiv.addEventListener('wheel', function (e) {
            const maxScrollTop = this.scrollHeight - this.clientHeight;
            if (maxScrollTop <= 0) return;
            if (this.scrollTop <= 0 && e.deltaY < 0) e.preventDefault();
            else if (this.scrollTop >= maxScrollTop && e.deltaY > 0) e.preventDefault();
        }, { passive: false });

        // 底部
        const footer = document.createElement('div');
        footer.style.cssText = 'padding:10px 20px;border-top:1px solid #f0f0f0;font-size:11px;color:#c0c0c0;display:flex;justify-content:space-between;flex-shrink:0;background:#fafbfc;';
        footer.innerHTML = '<span style="display:flex;align-items:center;gap:4px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>点击刷新获取最新</span><span>NodeSeek 热门评论</span>';
        dialog.appendChild(footer);

        document.body.appendChild(dialog);

        // 打开弹窗时拉取最新数据
        fetchTopPosts();

        // 左上角 20x20 拖拽实现
        (function initDrag() {
            let isDragging = false, startX, startY, startLeft, startTop;
            dragHandle.addEventListener('mousedown', function (e) {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                startLeft = parseInt(dialog.style.left, 10) || 0;
                startTop = parseInt(dialog.style.top, 10) || 0;
                e.preventDefault();
            });
            document.addEventListener('mousemove', function (e) {
                if (!isDragging) return;
                dialog.style.left = (startLeft + e.clientX - startX) + 'px';
                dialog.style.top = (startTop + e.clientY - startY) + 'px';
            });
            document.addEventListener('mouseup', function () {
                isDragging = false;
            });
        })();
    }

    // ---- 公共 API ----
    window.NodeSeekTopReply = {
        showTopReplyDialog,
        fetchTopPosts,
        getTopPosts: loadPosts
    };

})();
