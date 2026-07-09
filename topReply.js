// ========== 热帖统计（按回复数排序） ==========
(function () {
    'use strict';

    const STORAGE_KEY = 'nodeseek_top_reply_data';
    const SETTINGS_KEY = 'nodeseek_top_reply_settings';
    const BASE_URL = 'https://www.nodeseek.com/page-';
    const MAX_PAGE = 10;
    const TOP_COUNT = 20;
    /** 刷新冷却时间（毫秒），避免频繁请求 */
    const REFRESH_COOLDOWN_MS = 30000;
    /** 自动刷新/缓存间隔（毫秒） */
    const FETCH_CACHE_MS = 300000;
    const AUTO_REFRESH_INTERVAL = 300000;
    const COOLDOWN_KEY = STORAGE_KEY + '_cooldown';
    const FETCH_LOCK_KEY = STORAGE_KEY + '_fetching';
    const FETCH_LOCK_TIMEOUT_MS = 30000; // 锁超时（防 tab 崩溃遗留锁）
    /** 上次刷新时间戳，从 localStorage 初始化，跨页面保持冷却状态 */
    let _lastRefreshTime = 0;
    try { _lastRefreshTime = parseInt(localStorage.getItem(COOLDOWN_KEY), 10) || 0; } catch (e) {}
    // 若已过冷却期，重置为 0
    if (_lastRefreshTime > 0 && Date.now() - _lastRefreshTime >= REFRESH_COOLDOWN_MS) {
        _lastRefreshTime = 0;
        try { localStorage.removeItem(COOLDOWN_KEY); } catch (e) {}
    }
    /** 全局冷却计时器 */
    let _globalCooldownTimer = null;

    // ---- 全局冷却管理 ----
    function clearGlobalCooldown() {
        if (_globalCooldownTimer) { clearInterval(_globalCooldownTimer); _globalCooldownTimer = null; }
    }

    /** 将冷却状态同步到指定的刷新按钮 UI */
    function applyCooldownToBtn(btn) {
        if (!btn) return;
        var elapsed = Date.now() - _lastRefreshTime;
        var remaining = Math.ceil((REFRESH_COOLDOWN_MS - elapsed) / 1000);
        if (remaining <= 0 || _lastRefreshTime === 0) {
            btn.removeAttribute('data-cooldown');
            btn.style.cursor = 'pointer';
            btn.style.opacity = '';
            btn.title = '立即刷新';
            btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>';
            return;
        }
        btn.dataset.cooldown = '1';
        btn.style.cursor = 'not-allowed';
        btn.style.opacity = '0.5';
        btn.title = '冷却中…';
        btn.innerHTML = '<span style="font-size:11px;color:#999;font-weight:600;min-width:15px;text-align:center;">' + remaining + '</span>';
    }

    function _cooldownTick() {
        var elapsed = Date.now() - _lastRefreshTime;
        if (elapsed >= REFRESH_COOLDOWN_MS) {
            _lastRefreshTime = 0;
            try { localStorage.removeItem(COOLDOWN_KEY); } catch (e) {}
            clearGlobalCooldown();
            var dialogBtn = document.getElementById('top-reply-dialog') && document.getElementById('top-reply-dialog').querySelector('.top-reply-refresh-btn');
            applyCooldownToBtn(dialogBtn);
            return;
        }
        var remaining = Math.ceil((REFRESH_COOLDOWN_MS - elapsed) / 1000);
        var dialogBtn = document.getElementById('top-reply-dialog') && document.getElementById('top-reply-dialog').querySelector('.top-reply-refresh-btn');
        if (dialogBtn && dialogBtn.dataset.cooldown) {
            dialogBtn.innerHTML = '<span style="font-size:11px;color:#999;font-weight:600;min-width:15px;text-align:center;">' + remaining + '</span>';
        }
    }

    function startGlobalCooldown() {
        _lastRefreshTime = Date.now();
        try { localStorage.setItem(COOLDOWN_KEY, String(_lastRefreshTime)); } catch (e) {}
        clearGlobalCooldown();
        _globalCooldownTimer = setInterval(_cooldownTick, 1000);
    }

    /** 恢复跨页面后的冷却计时器（不重置时间戳） */
    function resumeGlobalCooldown() {
        clearGlobalCooldown();
        _globalCooldownTimer = setInterval(_cooldownTick, 1000);
    }

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
        const url = BASE_URL + pageNum;
        return fetch(url, { credentials: 'include' })
            .then(resp => {
                if (!resp.ok) {
                    const err = new Error('HTTP ' + resp.status);
                    err.status = resp.status;
                    throw err;
                }
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
                // console.log('[热帖排行] 第' + pageNum + '页: 解析到 ' + posts.length + ' 条帖子');
                return posts;
            });
    }

    // ---- 跨 tab 拉取锁 ----
    function tryAcquireFetchLock() {
        try {
            var now = Date.now();
            var lockData = localStorage.getItem(FETCH_LOCK_KEY);
            if (lockData) {
                var parsed = JSON.parse(lockData);
                // 锁未超时：其他 tab 正在拉取，跳过
                if (parsed && now - parsed.time < FETCH_LOCK_TIMEOUT_MS) {
                    return false;
                }
                // 锁已超时：接管锁
            }
            localStorage.setItem(FETCH_LOCK_KEY, JSON.stringify({ time: now }));
            return true;
        } catch (e) { return true; } // localStorage 不可用时放行
    }

    function releaseFetchLock() {
        try { localStorage.removeItem(FETCH_LOCK_KEY); } catch (e) {}
    }

    // ---- 核心拉取逻辑 ----

    function fetchTopPosts(forceRefresh) {
        // 缓存新鲜且非强制刷新 → 跳过
        if (!forceRefresh) {
            var cacheTime = 0;
            try { cacheTime = parseInt(localStorage.getItem(STORAGE_KEY + '_time'), 10) || 0; } catch (e) {}
            var posts = loadPosts();
            if (posts.length > 0 && Date.now() - cacheTime < FETCH_CACHE_MS) {
                return;
            }
        }

        /* 跨 tab 取锁：已有其他 tab 在拉取则跳过（缓存检查仍会更新弹窗） */
        if (!tryAcquireFetchLock()) {
            return;
        }

        /* 强制刷新：先清空当前数据并显示加载态 */
        if (forceRefresh) {
            const dialog = document.getElementById('top-reply-dialog');
            if (dialog) {
                const listDiv = dialog.querySelector('#top-reply-list');
                if (listDiv) {
                    listDiv.innerHTML = '<div style="text-align:center;padding:50px 0;"><div style="display:inline-block;width:28px;height:28px;border:3px solid #e8e8e8;border-top-color:#3498db;border-radius:50%;animation:topReplySpin 0.8s linear infinite;"></div><div style="margin-top:12px;color:#aaa;font-size:13px;">刷新中…</div></div>';
                }
            }
        }

        /* 串行拉取 10 页：任何时刻只有 1 个请求在飞，避免并发触发 CF；
           遇 429 立即停止后续页面，用已获取数据渲染（智能降级） */
        const allPosts = [];
        let rateLimitHit = false;
        let fetchedPageCount = 0;
        /* 串行模式下每页间隔（毫秒）：300~600ms，单请求不会触发并发限流 */
        const PAGE_INTERVAL_MIN = 300;
        const PAGE_INTERVAL_MAX = 600;
        /* 非限流错误的重试间隔（毫秒） */
        const RETRY_BACKOFF_MIN = 2000;
        const RETRY_BACKOFF_MAX = 4000;
        const MAX_RETRIES = 1;

        function randomBetween(min, max) {
            return min + Math.random() * (max - min);
        }

        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        function fetchPageWithRetry(pageNum, retries) {
            return fetchPage(pageNum)
                .catch(err => {
                    const status = err && err.status;
                    if (status === 429) {
                        // 429：不重试，向上抛出由串行循环决定是否停止
                        throw err;
                    }
                    console.warn('[热帖排行] 第' + pageNum + '页拉取失败:', err.message);
                    if (retries > 0) {
                        return sleep(randomBetween(RETRY_BACKOFF_MIN, RETRY_BACKOFF_MAX))
                            .then(() => fetchPageWithRetry(pageNum, retries - 1));
                    }
                    return []; // 重试耗尽，返回空跳过该页继续下一页
                });
        }

        function fetchSequential(currentPage) {
            if (currentPage > MAX_PAGE || rateLimitHit) {
                return Promise.resolve();
            }
            return fetchPageWithRetry(currentPage, MAX_RETRIES)
                .then(posts => {
                    if (posts && posts.length > 0) {
                        allPosts.push(...posts);
                        fetchedPageCount++;
                    }
                    // 下一页前等待短间隔
                    if (currentPage < MAX_PAGE && !rateLimitHit) {
                        return sleep(randomBetween(PAGE_INTERVAL_MIN, PAGE_INTERVAL_MAX))
                            .then(() => fetchSequential(currentPage + 1));
                    }
                })
                .catch(err => {
                    const status = err && err.status;
                    if (status === 429) {
                        console.warn('[热帖排行] 第' + currentPage + '页触发 CF 限流，停止拉取后续页面（已获取 ' + fetchedPageCount + ' 页数据）');
                        rateLimitHit = true;
                    } else {
                        console.warn('[热帖排行] 第' + currentPage + '页异常:', err.message);
                    }
                });
        }

        /* 串行拉取 1-10 页，遇 429 智能降级 */
        fetchSequential(1)
            .then(() => {
                if (allPosts.length === 0) {
                    throw new Error('所有页面拉取均失败');
                }

                if (rateLimitHit) {
                    console.warn('[热帖排行] 因 CF 限流，仅获取到 ' + fetchedPageCount + ' 页数据，使用部分数据渲染');
                }

                // 按 url 去重
                const seen = new Set();
                const uniquePosts = allPosts.filter(p => {
                    if (seen.has(p.url)) return false;
                    seen.add(p.url);
                    return true;
                });

                // 找到当前批次中最新的帖子 ID，过滤掉老帖（ID 差距超过 5000）
                const maxId = uniquePosts.reduce((max, p) => Math.max(max, p.postId || 0), 0);
                const freshPosts = uniquePosts.filter(p => (p.postId || 0) >= maxId - 5000);

                freshPosts.sort((a, b) => b.comments - a.comments);
                const topPosts = freshPosts.slice(0, TOP_COUNT);

                if (topPosts.length > 0) {
                    savePosts(topPosts);
                    _lastRefreshTime = Date.now();
                    try { localStorage.setItem(STORAGE_KEY + '_time', _lastRefreshTime.toString()); } catch (e) {}
                }

                refreshDialogIfOpen(topPosts);
                // 同步刷新侧边栏面板
                refreshSidebarContent();
                // 释放跨 tab 拉取锁
                releaseFetchLock();
            })
            .catch(err => {
                /* 刷新失败时恢复显示已有数据，避免卡在加载态 */
                console.error('[热帖排行] 拉取失败:', err);
                const dialog = document.getElementById('top-reply-dialog');
                if (dialog) {
                    const listDiv = dialog.querySelector('#top-reply-list');
                    if (listDiv) {
                        const cached = loadPosts();
                        if (cached && cached.length > 0) {
                            listDiv.innerHTML = '<div style="text-align:center;color:#e74c3c;padding:12px;font-size:12px;">拉取失败，显示缓存数据</div>';
                            renderPostList(listDiv, cached);
                        } else {
                            listDiv.innerHTML = '<div style="text-align:center;color:#e74c3c;padding:50px 0;font-size:13px;">拉取失败，请稍后重试</div>';
                        }
                    }
                }
                // 同步刷新侧边栏面板（显示缓存）
                refreshSidebarContent();
                // 释放跨 tab 拉取锁
                releaseFetchLock();
            });
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
            var fetchTime = 0;
            try { fetchTime = parseInt(localStorage.getItem(STORAGE_KEY + '_time'), 10) || 0; } catch (e) {}
            tsSpan.textContent = '更新于 ' + (fetchTime ? new Date(fetchTime).toLocaleTimeString() : new Date().toLocaleTimeString());
        }
    }

    function renderPostList(container, posts) {
        if (!posts || posts.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#bbb;padding:50px 0;font-size:14px;">暂无数据，等待首次拉取…</div>';
            return;
        }

        const listIsMobile = isMobile();
        posts.forEach((post, idx) => {
            const row = document.createElement('div');
            // 移动端：缩小 padding 和 gap，增大触摸区域
            const rowPad = listIsMobile ? '10px 10px' : '8px 14px';
            const rowGap = listIsMobile ? '8px' : '12px';
            row.style.cssText = 'display:flex;align-items:center;padding:' + rowPad + ';margin:0 0 1px;border-radius:8px;gap:' + rowGap + ';transition:background 0.2s ease;cursor:default;' + (listIsMobile ? 'min-height:44px;' : '');
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
            titleLink.textContent = post.title;
            titleLink.href = post.url.startsWith('http') ? post.url : 'https://www.nodeseek.com' + post.url;
            titleLink.target = '_blank';
            titleLink.className = 'top-reply-title-link';
            // 移动端：标题字号略大，行高更紧凑
            const titleFontSize = listIsMobile ? '14px' : '13px';
            titleLink.style.cssText = 'color:#2c3e50;text-decoration:none;font-size:' + titleFontSize + ';font-weight:600;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.5;transition:color 0.15s;';
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

        const dialogIsMobile = isMobile();
        const dialog = document.createElement('div');
        dialog.id = dialogId;
        const dialogWidth = dialogIsMobile ? Math.floor(window.innerWidth * 0.95) : 720;
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
        // PC 端向右偏移 180 避开左侧面板；移动端居中
        const dialogLeft = dialogIsMobile
            ? Math.floor((window.innerWidth - dialogWidth) / 2)
            : Math.floor((window.innerWidth - dialogWidth) / 2) + 180;
        const dialogTop = Math.floor(window.innerHeight * 0.1) + topOffset;
        dialog.style.left = Math.max(0, dialogLeft) + 'px';
        dialog.style.top = Math.max(0, dialogTop) + 'px';

        // 标题栏（移动端缩小 padding）
        const header = document.createElement('div');
        const headerPad = dialogIsMobile ? '12px 12px' : '14px 20px';
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:' + headerPad + ';background:#fff;border-bottom:1px solid #f0f0f0;flex-shrink:0;user-select:none;';

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
        refreshBtn.className = 'top-reply-refresh-btn';
        refreshBtn.title = '立即刷新';
        refreshBtn.style.cssText = 'cursor:pointer;transition:all 0.2s;display:flex;align-items:center;padding:4px;border-radius:6px;user-select:none;';
        refreshBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>';
        refreshBtn.onmouseenter = function() { if (!this.dataset.cooldown) this.style.background = '#f5f5f5'; };
        refreshBtn.onmouseleave = function() { if (!this.dataset.cooldown) this.style.background = 'transparent'; };

        // 打开弹窗时，恢复冷却状态
        applyCooldownToBtn(refreshBtn);

        refreshBtn.onclick = function () {
            if (this.dataset.cooldown) return;
            startGlobalCooldown();
            applyCooldownToBtn(refreshBtn);
            fetchTopPosts(true);
        };

        const closeBtn = document.createElement('span');
        closeBtn.style.cssText = 'cursor:pointer;display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;transition:all 0.15s;';
        closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        closeBtn.onmouseenter = function() { this.style.background = '#f5f5f5'; };
        closeBtn.onmouseleave = function() { this.style.background = 'transparent'; };
        closeBtn.onclick = () => dialog.remove();

        const hintLabel = document.createElement('span');
        hintLabel.style.cssText = 'font-size:11px;color:#aaa;margin-right:4px;white-space:nowrap;';
        hintLabel.textContent = '点击刷新约10秒加载完整数据';

        const rightBtns = document.createElement('div');
        rightBtns.style.cssText = 'display:flex;align-items:center;gap:4px;';
        rightBtns.appendChild(hintLabel);
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
            style.textContent = '@keyframes topReplySpin{to{transform:rotate(360deg)}}@keyframes hotPostsSpin{to{transform:rotate(360deg)}}#top-reply-list::-webkit-scrollbar{width:6px}#top-reply-list::-webkit-scrollbar-track{background:transparent}#top-reply-list::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px}#top-reply-list::-webkit-scrollbar-thumb:hover{background:#ccc}.top-reply-title-link:hover{color:#3498db !important;}';
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

        // 底部（移动端缩小 padding）
        const footer = document.createElement('div');
        const footerPad = dialogIsMobile ? '8px 12px' : '10px 20px';
        footer.style.cssText = 'padding:' + footerPad + ';border-top:1px solid #f0f0f0;font-size:11px;color:#c0c0c0;display:flex;justify-content:space-between;flex-shrink:0;background:#fafbfc;';
        footer.innerHTML = '<span style="display:flex;align-items:center;gap:4px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>点击刷新获取最新</span><span>NodeSeek 热门评论</span>';
        dialog.appendChild(footer);

        document.body.appendChild(dialog);

        // 检查缓存是否新鲜（5分钟内），是则直接显示缓存，否则拉取新数据
        var cachedPosts = loadPosts();
        var cacheTime = 0;
        try { cacheTime = parseInt(localStorage.getItem(STORAGE_KEY + '_time'), 10) || 0; } catch (e) {}
        if (cachedPosts.length > 0 && Date.now() - cacheTime < FETCH_CACHE_MS) {
            // 缓存新鲜，直接显示
            refreshDialogIfOpen(cachedPosts);
        } else {
            // 缓存过期，拉取新数据
            fetchTopPosts();
        }

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

    // ---- 侧边栏面板 ----

    // 设备检测：与项目其他模块（collect.js）保持一致
    function isMobile() {
        if (window.NodeSeekFilter && typeof window.NodeSeekFilter.isMobileDevice === 'function') {
            return window.NodeSeekFilter.isMobileDevice();
        }
        return window.innerWidth <= 767;
    }

    function setPanelWidth(panel) {
        // 移动端不强制固定宽度，跟随父容器自适应
        if (isMobile()) {
            panel.style.width = '100%';
            panel.style.maxWidth = '100%';
            panel.style.boxSizing = 'border-box';
            panel.style.overflow = 'hidden';
            return;
        }
        const quickAccess = document.querySelector('.nsk-panel.quick-access');
        if (!quickAccess) return;
        const width = quickAccess.offsetWidth;
        if (width > 0) {
            panel.style.width = width + 'px';
            panel.style.maxWidth = width + 'px';
            panel.style.boxSizing = 'border-box';
            panel.style.overflow = 'hidden';
        }
    }

    function createSidebarPanel() {
        // 注入侧边栏面板专属样式，覆盖 .nsk-panel 默认 padding
        if (!document.getElementById('hot-posts-sidebar-style')) {
            const sbStyle = document.createElement('style');
            sbStyle.id = 'hot-posts-sidebar-style';
            sbStyle.textContent = [
                '#hot-posts-sidebar-panel{padding:0 5px !important;}',
                '#hot-posts-sidebar-panel *{box-sizing:border-box;}',
                '#hot-posts-sidebar-panel h4{padding:0 !important;margin:0 !important;text-indent:0 !important;}',
                '#hot-posts-sidebar-panel h4 .iconpark-icon{margin:0 !important;margin-right:2px !important;}',
                '#hot-posts-sidebar-panel h4 span{margin:0 !important;padding:0 !important;}',
                '#hot-posts-sidebar-panel > div[id]{padding:0 !important;margin:0 !important;}',
                '#hot-posts-sidebar-panel > div[id] > div{padding-left:0 !important;padding-right:0 !important;}',
                '#hot-posts-sidebar-list a:hover span{color:#3498db !important;text-decoration:none;}',
                '#hot-posts-sidebar-list > div:hover{background:#f5f5f5 !important;}'
            ].join('');
            document.head.appendChild(sbStyle);
        }

        const panel = document.createElement('div');
        panel.id = 'hot-posts-sidebar-panel';
        panel.className = 'nsk-panel';
        panel.style.cssText = 'margin-top:12px;padding:0;';

        // 标题行（与原生 nsk-panel h4 结构一致：svg + span）
        const header = document.createElement('h4');
        header.setAttribute('aria-level', '2');
        // 移动端：增大 padding 便于触摸
        const headerTouchPad = isMobile() ? '8px 4px' : '0';
        header.style.cssText = 'display:flex;align-items:center;gap:4px;cursor:pointer;padding:' + headerTouchPad + ';margin:0;';
        header.innerHTML = [
            '<svg class="iconpark-icon"><use href="#ranking"></use></svg>',
            '<span>热帖排行</span>',
            '<span id="hot-posts-sidebar-time" style="font-size:11px;color:#999;font-weight:normal;margin-left:2px;"></span>'
        ].join('');

        // 点击标题打开弹窗
        header.addEventListener('click', function () {
            showTopReplyDialog();
        });

        panel.appendChild(header);

        // 列表区域
        const listDiv = document.createElement('div');
        listDiv.id = 'hot-posts-sidebar-list';
        listDiv.style.cssText = 'padding:0;width:100%;box-sizing:border-box;overflow:hidden;';
        listDiv.innerHTML = '<div style="text-align:center;color:#bbb;padding:20px 0;font-size:12px;">加载中…</div>';
        panel.appendChild(listDiv);

        return panel;
    }

    // ---- 阅读记忆辅助 ----
    function getViewedColor() {
        try { return localStorage.getItem('nodeseek_viewed_color') || '#9aa0a6'; } catch (e) { return '#9aa0a6'; }
    }

    function normalizePostUrl(urlStr) {
        try {
            var urlObj = new URL(urlStr, window.location.origin);
            var pathname = urlObj.pathname;
            var m = pathname.match(/^\/post-(\d+)-\d+$/);
            if (m) pathname = '/post-' + m[1] + '-1';
            return urlObj.origin + pathname + urlObj.search;
        } catch (e) {
            return (urlStr || '').split('#')[0];
        }
    }

    function getViewedUrlSet() {
        try {
            var raw = localStorage.getItem('nodeseek_viewed_titles_data');
            if (raw) return new Set(JSON.parse(raw));
        } catch (e) {}
        return new Set();
    }

    function markUrlAsViewed(normalizedUrl) {
        try {
            var raw = localStorage.getItem('nodeseek_viewed_titles_data');
            var list = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(list)) list = [];
            if (!list.includes(normalizedUrl)) {
                list.push(normalizedUrl);
                localStorage.setItem('nodeseek_viewed_titles_data', JSON.stringify(list));
            }
            if (window.NodeSeekViewedTitles && typeof window.NodeSeekViewedTitles.add === 'function') {
                window.NodeSeekViewedTitles.add(normalizedUrl);
            }
        } catch (e) {}
    }

    function renderSidebarList(container, posts) {
        if (!posts || posts.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#bbb;padding:20px 0;font-size:12px;">暂无数据</div>';
            return;
        }

        var viewedEnabled = localStorage.getItem('nodeseek_viewed_history_enabled') !== 'false';
        var viewedSet = viewedEnabled ? getViewedUrlSet() : new Set();
        var viewedColor = getViewedColor();

        container.innerHTML = '';

        var sbIsMobile = isMobile();
        posts.forEach(function (post) {
            var fullUrl = post.url.startsWith('http') ? post.url : 'https://www.nodeseek.com' + post.url;
            var normalized = normalizePostUrl(fullUrl);
            var isViewed = viewedEnabled && viewedSet.has(normalized);
            var color = isViewed ? viewedColor : '#333';
            var title = (post.title || '').replace(/"/g, '&quot;');

            var row = document.createElement('div');
            // 移动端：增大 padding 和字号，便于触摸
            var rowPad = sbIsMobile ? '10px 8px' : '6px 12px';
            row.style.cssText = 'padding:' + rowPad + ';border-bottom:1px solid #eee;' + (sbIsMobile ? 'min-height:44px;display:flex;align-items:center;' : '');

            var link = document.createElement('a');
            link.href = fullUrl;
            link.target = '_blank';
            link.style.cssText = 'display:flex;align-items:center;text-decoration:none;color:inherit;min-width:0;' + (sbIsMobile ? 'width:100%;' : '');

            var span = document.createElement('span');
            var spanFontSize = sbIsMobile ? '14px' : '13px';
            span.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:' + color + ';font-size:' + spanFontSize + ';min-width:0;';
            span.textContent = post.title;
            // 仅截断时鼠标悬停显示完整内容
            span.onmouseenter = function() {
                this.title = this.scrollWidth > this.clientWidth ? post.title : '';
            };
            span.onmouseleave = function() { this.title = ''; };

            link.appendChild(span);
            row.appendChild(link);
            container.appendChild(row);

            link.addEventListener('click', function () {
                markUrlAsViewed(normalized);
                span.style.color = viewedColor;
            });
        });
    }

    function refreshSidebarContent() {
        var listDiv = document.getElementById('hot-posts-sidebar-list');
        var timeSpan = document.getElementById('hot-posts-sidebar-time');
        if (!listDiv) return;

        var posts = loadPosts();
        if (posts && posts.length > 0) {
            renderSidebarList(listDiv, posts);
            if (timeSpan) {
                var fetchTime = 0;
                try { fetchTime = parseInt(localStorage.getItem(STORAGE_KEY + '_time'), 10) || 0; } catch (e) {}
                timeSpan.textContent = '更新于 ' + (fetchTime ? new Date(fetchTime).toLocaleTimeString() : new Date().toLocaleTimeString());
            }
        }
    }

    function injectSidebarPanel() {
        if (document.getElementById('hot-posts-sidebar-panel')) return;

        var quickAccess = document.querySelector('.nsk-panel.quick-access');
        if (!quickAccess) {
            // 如果快捷功能区还没加载，延迟重试
            setTimeout(injectSidebarPanel, 1000);
            return;
        }

        var panel = createSidebarPanel();
        quickAccess.after(panel);
        setPanelWidth(panel);

        // 窗口变化时调整宽度
        var resizeTimer = null;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                var p = document.getElementById('hot-posts-sidebar-panel');
                if (p) setPanelWidth(p);
            }, 200);
        });

        // 先显示缓存，再拉取最新数据
        refreshSidebarContent();
        fetchTopPosts(false);
    }

    // ---- 自动刷新 ----
    let _autoRefreshTimer = null;

    function startAutoRefresh() {
        if (_autoRefreshTimer) clearInterval(_autoRefreshTimer);
        _autoRefreshTimer = setInterval(function () {
            fetchTopPosts(false);
        }, AUTO_REFRESH_INTERVAL);
    }

    function resumeCooldownIfNeeded() {
        if (_lastRefreshTime <= 0) return;
        var elapsed = Date.now() - _lastRefreshTime;
        if (elapsed >= REFRESH_COOLDOWN_MS) {
            _lastRefreshTime = 0;
            try { localStorage.removeItem(COOLDOWN_KEY); } catch (e) {}
            return;
        }
        // 仍在冷却期，重启全局计时器（跨页面后计时器已销毁，不重置时间戳）
        resumeGlobalCooldown();
    }

    // ---- 初始化 ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            injectSidebarPanel();
            resumeCooldownIfNeeded();
            startAutoRefresh();
        });
    } else {
        injectSidebarPanel();
        resumeCooldownIfNeeded();
        startAutoRefresh();
    }

    // ---- 公共 API ----
    window.NodeSeekTopReply = {
        showTopReplyDialog,
        fetchTopPosts,
        getTopPosts: loadPosts,
        injectSidebarPanel,
        refreshSidebarContent
    };

})();
