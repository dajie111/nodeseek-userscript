// ==UserScript==
// @name         NodeSeek楼层截图模块
// @namespace    http://tampermonkey.net/
// @version      2026.06.16
// @description  NS楼层截图：使用 SVG foreignObject + Canvas 将当前楼层（含图片）渲染为 PNG，并上传到 hb.396663.xyz 用户的存储空间。支持查看/删除已存截图。
// @author       You
// @match        https://www.nodeseek.com/*
// @grant        GM_xmlhttpRequest
// @connect      hb.396663.xyz
// @run-at       document-end
// ==/UserScript==

/*
 * 暴露一个全局对象 window.NodeSeekSnapshot
 * 用法：
 *   NodeSeekSnapshot.captureFloor(postEl, ctx) -> Promise<{blob, dataUrl, width, height}>
 *   NodeSeekSnapshot.uploadSnapshot({...}) -> Promise<{success,id,url}|null>
 *   NodeSeekSnapshot.showManager({memberId?, postId?}) // 打开管理面板
 *   NodeSeekSnapshot.injectButton(targetEl, ctx)      // 在指定元素后注入「截图」按钮
 */

(function () {
    'use strict';

    var SERVER_URL = 'https://hb.396663.xyz';
    var TOKEN_KEY = 'nodeseek_login_token';
    var USER_KEY = 'nodeseek_login_user';
    var LOG_PREFIX = '[NS-Snapshot]';

    // ---------------- 工具 ----------------
    function getToken() {
        try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
    }
    function getUser() {
        try {
            var raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }
    function log() {
        try { console.log.apply(console, [LOG_PREFIX].concat([].slice.call(arguments))); } catch (e) {}
    }
    function warn() {
        try { console.warn.apply(console, [LOG_PREFIX].concat([].slice.call(arguments))); } catch (e) {}
    }

    function isMobile() {
        try {
            return /Mobi|Android|iPhone|iPad|iPod|Touch/i.test(navigator.userAgent) || window.innerWidth < 640;
        } catch (e) { return false; }
    }

    function toast(message, type) {
        type = type || 'info';
        try {
            var id = 'ns-snap-toast-' + Date.now();
            var t = document.createElement('div');
            t.id = id;
            t.textContent = message;
            var bg = '#2196F3';
            if (type === 'error') bg = '#f44336';
            else if (type === 'success') bg = '#4CAF50';
            else if (type === 'warning') bg = '#ff9800';
            t.style.cssText =
                'position:fixed;top:20px;right:20px;background:' + bg + ';color:#fff;' +
                'padding:10px 16px;border-radius:6px;font-size:14px;font-weight:500;' +
                'box-shadow:0 4px 12px rgba(0,0,0,0.18);z-index:2147483600;' +
                'max-width:min(90vw,360px);word-wrap:break-word;opacity:0;' +
                'transform:translateX(100%);transition:all .3s ease;';
            document.body.appendChild(t);
            setTimeout(function () { t.style.opacity = '1'; t.style.transform = 'translateX(0)'; }, 10);
            setTimeout(function () {
                t.style.opacity = '0';
                t.style.transform = 'translateX(100%)';
                setTimeout(function () { try { t.remove(); } catch (e) {} }, 320);
            }, 3000);
            t.addEventListener('click', function () { try { t.remove(); } catch (e) {} });
        } catch (e) {}
    }

    function escapeHtml(s) {
        if (s === null || s === undefined) return '';
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ---------------- HTML 节点 -> 内联 SVG 字符串（用于截图）----------------
    // 思路：把目标节点 HTML 序列化、嵌入 <svg><foreignObject>，再用 Image 加载，
    //      绘制到 canvas 得到 PNG。这一步关键是把 <img> 转为 base64 dataURL 以绕过 CORS 污染。
    function inlineImages(root) {
        var imgs = root.querySelectorAll('img');
        var tasks = [];
        for (var i = 0; i < imgs.length; i++) {
            (function (img) {
                if (!img || img.__nsSnapInlined) return;
                var src = img.currentSrc || img.src || '';
                if (!src || src.startsWith('data:')) {
                    img.__nsSnapInlined = true;
                    return;
                }
                // 同源或允许 crossOrigin 的图片才转 base64；外站无 CORS 头则保留原 src（最后会 fallback）
                tasks.push(new Promise(function (resolve) {
                    var done = false;
                    function finish(val) {
                        if (done) return; done = true; resolve(val);
                    }
                    try {
                        var fetchImg = new Image();
                        fetchImg.crossOrigin = 'anonymous';
                        fetchImg.onload = function () {
                            try {
                                var c = document.createElement('canvas');
                                c.width = fetchImg.naturalWidth || fetchImg.width;
                                c.height = fetchImg.naturalHeight || fetchImg.height;
                                if (!c.width || !c.height) { finish(null); return; }
                                var ctx = c.getContext('2d');
                                ctx.drawImage(fetchImg, 0, 0);
                                var dataUrl;
                                try { dataUrl = c.toDataURL('image/png'); } catch (e) { dataUrl = null; }
                                finish(dataUrl);
                            } catch (e) { finish(null); }
                        };
                        fetchImg.onerror = function () { finish(null); };
                        fetchImg.src = src;
                        // 超时保险
                        setTimeout(function () { finish(null); }, 4000);
                    } catch (e) { finish(null); }
                }).then(function (dataUrl) {
                    if (dataUrl) {
                        try {
                            img.setAttribute('src', dataUrl);
                            img.removeAttribute('srcset');
                            img.__nsSnapInlined = true;
                        } catch (e) {}
                    } else {
                        img.__nsSnapInlined = true;
                    }
                }));
            })(imgs[i]);
        }
        return Promise.all(tasks);
    }

    function buildInlineHtml(el, bgColor) {
        // 克隆元素，避免污染原页面；剥离脚本与事件属性
        var clone = el.cloneNode(true);
        // 去除脚本
        var scripts = clone.querySelectorAll('script');
        for (var i = 0; i < scripts.length; i++) scripts[i].parentNode.removeChild(scripts[i]);
        // 去除可能引起问题的元素
        var noscripts = clone.querySelectorAll('noscript');
        for (var j = 0; j < noscripts.length; j++) noscripts[j].parentNode.removeChild(noscripts[j]);

        // 强制把 width/height 计算到 style，避免外层 width:max-content 等撑不开
        try {
            var rect = el.getBoundingClientRect();
            clone.style.width = Math.ceil(rect.width) + 'px';
            clone.style.maxWidth = Math.ceil(rect.width) + 'px';
        } catch (e) {}

        var bg = bgColor || '#ffffff';
        var html = clone.outerHTML;
        // XHTML 必须自闭合一些标签。这里 toDataURL 走的是 SVG 渲染，对 HTML 容错较强，主要保证实体转义
        html = html.replace(/<br\s*>/gi, '<br/>')
                   .replace(/<hr\s*>/gi, '<hr/>')
                   .replace(/<input([^>]*)>/gi, '<input$1/>')
                   .replace(/<img([^>]*)>/gi, function (m) {
                       // img 必须是自闭合
                       if (m.endsWith('/>')) return m;
                       return m.replace(/(\s*)>$/, '$1/>');
                   });

        return html;
    }

    // 把 inline HTML 包装成 SVG foreignObject，再转 PNG dataURL
    function htmlToPngDataUrl(html, width, height, bgColor) {
        return new Promise(function (resolve, reject) {
            // 计算宽高
            var w = Math.max(100, Math.ceil(width || 800));
            var h = Math.max(100, Math.ceil(height || 600));
            var bg = bgColor || '#ffffff';

            var xml =
                '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
                '<foreignObject x="0" y="0" width="100%" height="100%">' +
                '<div xmlns="http://www.w3.org/1999/xhtml" style="width:' + w + 'px;background:' + bg + ';color:#000;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.6;box-sizing:border-box;">' +
                html +
                '</div>' +
                '</foreignObject>' +
                '</svg>';

            var svg64 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
            var img = new Image();
            img.onload = function () {
                try {
                    var canvas = document.createElement('canvas');
                    // 高分屏提升清晰度
                    var dpr = Math.min(window.devicePixelRatio || 1, 2);
                    canvas.width = w * dpr;
                    canvas.height = h * dpr;
                    var ctx = canvas.getContext('2d');
                    ctx.fillStyle = bg;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    ctx.drawImage(img, 0, 0, w, h);
                    try {
                        var dataUrl = canvas.toDataURL('image/png');
                        resolve({ dataUrl: dataUrl, width: w, height: h, canvas: canvas });
                    } catch (e) {
                        reject(new Error('canvas toDataURL 失败: ' + e.message));
                    }
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = function (e) {
                reject(new Error('SVG 加载失败，可能包含 foreignObject 不支持的特性'));
            };
            img.src = svg64;
        });
    }

    function dataUrlToBlob(dataUrl) {
        var m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
        if (!m) return null;
        var mime = m[1];
        var bin = atob(m[2]);
        var len = bin.length;
        var u8 = new Uint8Array(len);
        for (var i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
        return new Blob([u8], { type: mime });
    }

    // ---------------- 核心：截取楼层 ----------------
    /**
     * 截取单个楼层。
     * @param {HTMLElement} postEl 楼层根元素（必须）
     * @param {Object} ctx 上下文 { postId, postUrl, floorIndex, memberId, memberName, remark, silent }
     * @returns Promise<{dataUrl, blob, width, height}>
     */
    async function captureFloor(postEl, ctx) {
        if (!postEl) throw new Error('楼层元素不存在');
        ctx = ctx || {};

        // 1) 把 img 转 base64
        await inlineImages(postEl);

        // 2) 测量尺寸
        var rect = postEl.getBoundingClientRect();
        var width = Math.ceil(rect.width);
        var height = Math.ceil(postEl.scrollHeight || rect.height);

        // 3) 拿 inline HTML
        var html = buildInlineHtml(postEl, '#ffffff');

        // 4) 转 PNG
        var ret = await htmlToPngDataUrl(html, width, height, '#ffffff');
        var blob = dataUrlToBlob(ret.dataUrl);
        return {
            dataUrl: ret.dataUrl,
            blob: blob,
            width: ret.width,
            height: ret.height,
            ctx: ctx
        };
    }

    // ---------------- 截图按钮注入 ----------------
    /**
     * 在目标元素后注入「截图」按钮。
     * @param {HTMLElement} anchor 锚点元素，按钮插在它后面
     * @param {Object} ctx 上下文（楼层 / 帖子）
     */
    function injectButton(anchor, ctx) {
        if (!anchor || !anchor.parentNode) return null;
        // 已注入过
        if (anchor.parentNode.querySelector('.ns-snap-btn[data-snap-bound="1"]')) {
            return anchor.parentNode.querySelector('.ns-snap-btn[data-snap-bound="1"]');
        }
        var btn = document.createElement('button');
        btn.className = 'ns-snap-btn';
        btn.textContent = '截图';
        btn.setAttribute('data-snap-bound', '1');
        btn.style.cssText =
            'margin-left:6px;padding:1px 6px;border-radius:4px;' +
            'border:1px solid rgba(34,139,230,0.5);background:rgba(34,139,230,0.1);' +
            'color:#228be6;font-size:10px;cursor:pointer;vertical-align:middle;line-height:1;';
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            handleCaptureClick(btn, ctx);
        });
        anchor.parentNode.insertBefore(btn, anchor.nextSibling);
        return btn;
    }

    // ---------------- 截图点击处理（弹预览 -> 上传）----------------
    async function handleCaptureClick(btn, ctx) {
        // 需要登录
        if (!getToken()) {
            toast('请先在右上角登录账号后再使用截图功能', 'warning');
            return;
        }

        // 找到楼层根节点：btn 所在楼层
        var postEl = findPostRoot(btn);
        if (!postEl) {
            toast('未找到楼层节点', 'error');
            return;
        }

        // 自动从 postEl 提取上下文（如果 ctx 没传）
        ctx = ctx || {};
        if (!ctx.postId || !ctx.floorIndex) {
            var autoCtx = extractContextFromPostEl(postEl);
            ctx = Object.assign({}, autoCtx, ctx);
        }

        var oldText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '截取中...';

        try {
            var cap = await captureFloor(postEl, ctx);
            // 弹预览
            openPreviewModal(cap, function (extraCtx) {
                doUpload(cap, Object.assign({}, ctx, extraCtx || {}), btn, oldText);
            });
        } catch (err) {
            warn('截图失败', err);
            toast('截图失败: ' + (err && err.message ? err.message : err), 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = oldText;
        }
    }

    function findPostRoot(btn) {
        // 优先匹配 .nsk-content（NS 帖子楼层的根），回退到 .post-body / .comment / .nsk-card
        var n = btn;
        while (n && n !== document.body) {
            if (n.classList) {
                if (n.classList.contains('nsk-content')) return n;
                if (n.classList.contains('post-body')) return n;
            }
            // 也尝试找带 [id^="post-"] 或 [id^="floor-"] 的祖先
            if (n.id) {
                if (/^(post|floor|comment)-/i.test(n.id)) return n;
            }
            n = n.parentElement;
        }
        // 兜底：往上找最近的 article/section
        n = btn;
        while (n && n !== document.body) {
            if (n.tagName === 'ARTICLE' || n.tagName === 'SECTION') return n;
            n = n.parentElement;
        }
        return null;
    }

    function extractContextFromPostEl(postEl) {
        var ctx = {};
        try {
            // 楼层号
            var floorEl = postEl.querySelector('.nsk-floor, .floor, [class*="floor"]');
            if (floorEl) {
                var m = floorEl.textContent.match(/#\s*(\d+)/);
                if (m) ctx.floorIndex = m[1];
            }
            // 用户名 + member_id
            var userLink = postEl.querySelector('a[href*="/space/"]');
            if (userLink) {
                var href = userLink.getAttribute('href') || '';
                var mm = href.match(/\/space\/(\d+)/);
                if (mm) ctx.memberId = mm[1];
                ctx.memberName = (userLink.textContent || '').trim();
            }
            // post_id: 从 URL 中提取 /post-123-1 或 /post/123
            var path = location.pathname;
            var pm = path.match(/post-?(\d+)/i) || path.match(/\/post\/(\d+)/i);
            if (pm) ctx.postId = pm[1];
            ctx.postUrl = location.href;
        } catch (e) {}
        return ctx;
    }

    // ---------------- 预览弹窗 ----------------
    function openPreviewModal(cap, onConfirm) {
        var overlay = document.createElement('div');
        overlay.style.cssText =
            'position:fixed;inset:0;background:rgba(0,0,0,0.5);' +
            'display:flex;align-items:flex-start;justify-content:center;' +
            'padding:40px 0;z-index:2147483600;overflow-y:auto;';

        var box = document.createElement('div');
        box.style.cssText =
            'background:#fff;border-radius:12px;padding:20px;max-width:880px;width:92%;' +
            'box-shadow:0 10px 30px rgba(0,0,0,0.2);display:flex;flex-direction:column;' +
            'position:relative;';

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        var closed = false;
        function close() {
            if (closed) return; closed = true;
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        }
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });

        var html =
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
            '<h3 style="margin:0;font-size:16px">截图预览</h3>' +
            '<button data-act="close" style="background:none;border:none;font-size:20px;cursor:pointer">&times;</button>' +
            '</div>' +
            '<div style="max-height:55vh;overflow:auto;border:1px solid #e5e7eb;border-radius:6px;background:#f8fafc;padding:8px;text-align:center">' +
            '<img src="' + cap.dataUrl + '" style="max-width:100%;height:auto;display:inline-block;box-shadow:0 1px 4px rgba(0,0,0,0.1)"/>' +
            '</div>' +
            '<div style="margin-top:12px;display:grid;grid-template-columns:1fr;gap:8px">' +
            '<label style="font-size:12px;color:#475569">备注（可选，最多 200 字）</label>' +
            '<textarea data-act="remark" maxlength="200" placeholder="给这张截图加点备注吧~" ' +
            'style="width:100%;min-height:60px;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;resize:vertical;box-sizing:border-box"></textarea>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
            '<button data-act="copy" style="padding:6px 12px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer">复制图片到剪贴板</button>' +
            '<button data-act="download" style="padding:6px 12px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer">下载到本地</button>' +
            '<div style="flex:1"></div>' +
            '<button data-act="cancel" style="padding:6px 12px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer">取消</button>' +
            '<button data-act="upload" style="padding:6px 16px;border-radius:6px;border:none;background:#228be6;color:#fff;cursor:pointer;font-weight:500">上传到云端</button>' +
            '</div></div>';

        box.innerHTML = html;

        box.querySelector('[data-act="close"]').addEventListener('click', close);
        box.querySelector('[data-act="cancel"]').addEventListener('click', close);
        box.querySelector('[data-act="download"]').addEventListener('click', function () {
            var a = document.createElement('a');
            a.href = cap.dataUrl;
            a.download = 'snap_' + Date.now() + '.png';
            document.body.appendChild(a);
            a.click();
            a.remove();
        });
        box.querySelector('[data-act="copy"]').addEventListener('click', function () {
            copyBlobToClipboard(cap.blob).then(function (ok) {
                toast(ok ? '已复制到剪贴板' : '复制失败（浏览器不支持）', ok ? 'success' : 'warning');
            });
        });
        box.querySelector('[data-act="upload"]').addEventListener('click', function () {
            var remarkEl = box.querySelector('[data-act="remark"]');
            var remark = (remarkEl && remarkEl.value || '').trim();
            close();
            onConfirm && onConfirm({ remark: remark });
        });
    }

    async function copyBlobToClipboard(blob) {
        try {
            if (!navigator.clipboard || !window.ClipboardItem) return false;
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            return true;
        } catch (e) { return false; }
    }

    // ---------------- 上传 ----------------
    async function doUpload(cap, ctx, btn, oldText) {
        var token = getToken();
        if (!token) { toast('登录已失效', 'error'); return; }

        if (btn) { btn.disabled = true; btn.textContent = '上传中...'; }
        toast('正在上传截图...');

        try {
            var body = {
                image: cap.dataUrl,
                post_id: ctx.postId || '',
                post_url: ctx.postUrl || '',
                floor_index: ctx.floorIndex || '',
                member_id: ctx.memberId || '',
                member_name: ctx.memberName || '',
                remark: ctx.remark || ''
            };
            var resp = await fetch(SERVER_URL + '/api/snapshots/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(body)
            });
            var data = null;
            try { data = await resp.json(); } catch (e) {}
            if (resp.status === 401) {
                toast('登录已失效，请重新登录', 'error');
                return;
            }
            if (resp.status === 413) {
                toast('上传失败: ' + ((data && data.message) || '存储空间不足'), 'error');
                return;
            }
            if (data && data.success) {
                toast('上传成功', 'success');
                // 触发一次同步事件让 storage UI 更新
                try { window.dispatchEvent(new CustomEvent('ns-storage-changed')); } catch (e) {}
            } else {
                toast('上传失败: ' + ((data && data.message) || ('HTTP ' + resp.status)), 'error');
            }
        } catch (err) {
            warn('上传失败', err);
            toast('上传出错: ' + (err && err.message ? err.message : err), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = oldText || '截图'; }
        }
    }

    // ---------------- 管理面板（查看/删除）----------------
    /**
     * 打开截图管理面板
     * @param {Object} opts { memberId, postId }
     */
    async function showManager(opts) {
        opts = opts || {};
        var token = getToken();
        if (!token) { toast('请先登录', 'warning'); return; }

        var state = {
            page: 1,
            pageSize: 12,
            memberId: opts.memberId || '',
            postId: opts.postId || '',
            items: [],
            total: 0,
            selected: {} // id -> true
        };

        var overlay = document.createElement('div');
        overlay.style.cssText =
            'position:fixed;inset:0;background:rgba(0,0,0,0.5);' +
            'display:flex;align-items:flex-start;justify-content:center;' +
            'padding:30px 0;z-index:2147483600;overflow-y:auto;';

        var box = document.createElement('div');
        box.style.cssText =
            'background:#fff;border-radius:12px;padding:20px;max-width:960px;width:94%;' +
            'box-shadow:0 10px 30px rgba(0,0,0,0.2);display:flex;flex-direction:column;' +
            'min-height:60vh;';
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        var closed = false;
        function close() {
            if (closed) return; closed = true;
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        }
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });

        // 顶部
        function renderHeader() {
            return ''
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">'
                + '<h3 style="margin:0;font-size:16px">我的截图</h3>'
                + '<div style="display:flex;gap:6px;flex-wrap:wrap">'
                + (state.memberId ? '<span style="font-size:12px;color:#475569;background:#eef2ff;padding:2px 8px;border-radius:10px">用户:' + escapeHtml(state.memberNameLabel || state.memberId) + '</span>' : '')
                + (state.postId ? '<span style="font-size:12px;color:#475569;background:#eef2ff;padding:2px 8px;border-radius:10px">帖:' + escapeHtml(state.postId) + '</span>' : '')
                + '<button data-act="refresh" style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer">刷新</button>'
                + '<button data-act="del-selected" style="padding:4px 10px;border-radius:6px;border:1px solid #fecaca;background:#fef2f2;color:#dc2626;cursor:pointer">删除选中</button>'
                + '<button data-act="del-all" style="padding:4px 10px;border-radius:6px;border:1px solid #fecaca;background:#fef2f2;color:#dc2626;cursor:pointer">清空全部</button>'
                + '<button data-act="close" style="background:none;border:none;font-size:20px;cursor:pointer;line-height:1">&times;</button>'
                + '</div></div>';
        }

        function renderGrid() {
            if (!state.items.length) {
                return '<div style="text-align:center;padding:60px 20px;color:#94a3b8;flex:1;display:flex;align-items:center;justify-content:center">暂无截图</div>';
            }
            var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;overflow:auto;flex:1;padding:4px">';
            state.items.forEach(function (it) {
                var checked = state.selected[it.id] ? 'checked' : '';
                var urlAbs = (it.url && it.url.indexOf('http') === 0) ? it.url : (SERVER_URL + it.url);
                var sub = [];
                if (it.member_name) sub.push(escapeHtml(it.member_name));
                if (it.floor_index) sub.push('#' + escapeHtml(it.floor_index));
                sub.push(it.size > 0 ? Math.round(it.size / 1024) + 'KB' : '');
                sub.push(escapeHtml(it.created_at || ''));
                html += ''
                    + '<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#f8fafc;display:flex;flex-direction:column">'
                    + '<div style="position:relative;aspect-ratio:1/1;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer" data-act="open" data-id="' + escapeHtml(it.id) + '">'
                    + '<img src="' + escapeHtml(urlAbs) + '" loading="lazy" style="max-width:100%;max-height:100%;display:block" onerror="this.style.display=\'none\'"/>'
                    + '<label style="position:absolute;top:4px;left:4px;background:rgba(255,255,255,0.85);padding:2px 6px;border-radius:4px;font-size:11px;cursor:pointer" onclick="event.stopPropagation()">'
                    + '<input type="checkbox" data-act="pick" data-id="' + escapeHtml(it.id) + '" ' + checked + '/> 选</label>'
                    + '</div>'
                    + '<div style="padding:6px 8px;font-size:11px;color:#475569;line-height:1.4">'
                    + sub.filter(Boolean).join(' · ')
                    + (it.remark ? '<div style="color:#64748b;margin-top:2px;word-break:break-all">注: ' + escapeHtml(it.remark) + '</div>' : '')
                    + '</div>'
                    + '<div style="display:flex;border-top:1px solid #e2e8f0">'
                    + '<button data-act="open" data-id="' + escapeHtml(it.id) + '" style="flex:1;padding:6px;border:none;background:#fff;cursor:pointer;font-size:12px;color:#2563eb">查看</button>'
                    + '<button data-act="del-one" data-id="' + escapeHtml(it.id) + '" style="flex:1;padding:6px;border:none;background:#fff;cursor:pointer;font-size:12px;color:#dc2626;border-left:1px solid #e2e8f0">删除</button>'
                    + '</div></div>';
            });
            html += '</div>';
            return html;
        }

        function renderFooter() {
            var totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
            return ''
                + '<div style="display:flex;gap:8px;align-items:center;margin-top:12px;justify-content:center;flex-wrap:wrap">'
                + '<button data-act="prev" style="padding:4px 10px;border-radius:4px;border:1px solid #d1d5db;background:#fff;cursor:' + (state.page <= 1 ? 'not-allowed' : 'pointer') + ';opacity:' + (state.page <= 1 ? '0.4' : '1') + '">上一页</button>'
                + '<span style="font-size:13px;color:#6b7280">第 ' + state.page + ' / ' + totalPages + ' 页 · 共 ' + state.total + ' 张</span>'
                + '<button data-act="next" style="padding:4px 10px;border-radius:4px;border:1px solid #d1d5db;background:#fff;cursor:' + (state.page >= totalPages ? 'not-allowed' : 'pointer') + ';opacity:' + (state.page >= totalPages ? '0.4' : '1') + '">下一页</button>'
                + '</div>';
        }

        function render() {
            box.innerHTML = renderHeader() + renderGrid() + renderFooter();
            bind();
        }

        function bind() {
            box.querySelector('[data-act="close"]').addEventListener('click', close);
            box.querySelector('[data-act="refresh"]').addEventListener('click', function () { load(); });
            box.querySelector('[data-act="prev"]').addEventListener('click', function () {
                if (state.page > 1) { state.page--; load(); }
            });
            box.querySelector('[data-act="next"]').addEventListener('click', function () {
                var totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
                if (state.page < totalPages) { state.page++; load(); }
            });
            box.querySelectorAll('[data-act="pick"]').forEach(function (cb) {
                cb.addEventListener('change', function () {
                    var id = cb.getAttribute('data-id');
                    if (cb.checked) state.selected[id] = true;
                    else delete state.selected[id];
                });
            });
            box.querySelectorAll('[data-act="open"]').forEach(function (el) {
                el.addEventListener('click', function () {
                    var id = el.getAttribute('data-id');
                    var url = SERVER_URL + '/api/snapshots/' + id;
                    window.open(url, '_blank');
                });
            });
            box.querySelectorAll('[data-act="del-one"]').forEach(function (el) {
                el.addEventListener('click', function () {
                    var id = el.getAttribute('data-id');
                    if (confirm('确认删除这张截图？')) deleteOne(id);
                });
            });
            box.querySelector('[data-act="del-selected"]').addEventListener('click', function () {
                var ids = Object.keys(state.selected);
                if (!ids.length) { toast('请先勾选要删除的截图', 'warning'); return; }
                if (confirm('确认删除选中的 ' + ids.length + ' 张截图？')) deleteBatch(ids);
            });
            box.querySelector('[data-act="del-all"]').addEventListener('click', function () {
                if (!state.total) { toast('没有截图可删', 'warning'); return; }
                if (confirm('确认清空你的全部 ' + state.total + ' 张截图？此操作不可恢复！')) deleteBatch(null, true);
            });
        }

        async function load() {
            try {
                box.innerHTML = renderHeader() + '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#94a3b8">加载中...</div>' + renderFooter();
                bind();
                var qs = '?page=' + state.page + '&pageSize=' + state.pageSize;
                if (state.memberId) qs += '&member_id=' + encodeURIComponent(state.memberId);
                if (state.postId) qs += '&post_id=' + encodeURIComponent(state.postId);
                var resp = await fetch(SERVER_URL + '/api/snapshots/list' + qs, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (resp.status === 401) { toast('登录已失效', 'error'); return; }
                var data = await resp.json();
                if (data && data.success) {
                    state.items = data.items || [];
                    state.total = data.total || 0;
                    state.page = data.page || state.page;
                    state.pageSize = data.pageSize || state.pageSize;
                    render();
                } else {
                    box.innerHTML = renderHeader() + '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#ef4444">加载失败</div>' + renderFooter();
                    bind();
                }
            } catch (err) {
                warn(err);
                box.innerHTML = renderHeader() + '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#ef4444">网络错误</div>' + renderFooter();
                bind();
            }
        }

        async function deleteOne(id) {
            try {
                var resp = await fetch(SERVER_URL + '/api/snapshots/' + id, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                var data = await resp.json();
                if (data && data.success) {
                    toast('已删除', 'success');
                    delete state.selected[id];
                    if (state.items.length === 1 && state.page > 1) state.page--;
                    load();
                } else {
                    toast('删除失败: ' + ((data && data.message) || ''), 'error');
                }
            } catch (err) { toast('删除出错', 'error'); }
        }

        async function deleteBatch(ids, all) {
            try {
                var body = all ? { all: true } : { ids: ids };
                var resp = await fetch(SERVER_URL + '/api/snapshots/batch_delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify(body)
                });
                var data = await resp.json();
                if (data && data.success) {
                    toast('已删除 ' + (data.deleted || 0) + ' 张', 'success');
                    state.selected = {};
                    load();
                } else {
                    toast('删除失败: ' + ((data && data.message) || ''), 'error');
                }
            } catch (err) { toast('删除出错', 'error'); }
        }

        load();
    }

    // ---------------- 暴露 ----------------
    window.NodeSeekSnapshot = {
        captureFloor: captureFloor,
        injectButton: injectButton,
        uploadSnapshot: doUpload,
        showManager: showManager,
        toast: toast,
        serverUrl: SERVER_URL
    };

    // ---------------- 顶部工具栏快捷入口（注入到登录面板附近）----------------
    function tryInjectToolbar() {
        try {
            // 监听登录面板注入
            var observer = new MutationObserver(function () {
                var host = document.querySelector('.ns-login-panel, [class*="ns-sync"]');
                if (host && !document.getElementById('ns-snap-toolbar-btn')) {
                    injectToolbarButton(host);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            // 兜底：立即尝试一次
            var host2 = document.querySelector('.ns-login-panel, [class*="ns-sync"]');
            if (host2) injectToolbarButton(host2);
        } catch (e) {}
    }

    function injectToolbarButton(host) {
        try {
            if (document.getElementById('ns-snap-toolbar-btn')) return;
            var btn = document.createElement('button');
            btn.id = 'ns-snap-toolbar-btn';
            btn.textContent = '我的截图';
            btn.title = '查看/管理已保存的楼层截图';
            btn.style.cssText =
                'margin-left:6px;padding:4px 10px;border-radius:6px;border:1px solid #228be6;' +
                'background:rgba(34,139,230,0.1);color:#228be6;font-size:12px;cursor:pointer;';
            btn.addEventListener('click', function () { showManager({}); });
            host.appendChild(btn);
        } catch (e) {}
    }

    // 等待 DOM 就绪后尝试注入工具栏
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInjectToolbar);
    } else {
        tryInjectToolbar();
    }

    // ---------------- 自动监听：违规记录按钮旁插入「截图」按钮 ----------------
    // 监听 user-violation-btn（nodeseek_blacklist.user.js 注入的违规记录按钮）的出现，
    // 在它后面插入「截图」按钮，并把它的 click 上下文（member_id / member_name）继承过来。
    function tryAutoBindSnapButtons() {
        if (!document.body) return;
        var recordBtns = document.querySelectorAll('.user-violation-btn:not([data-snap-auto-bound])');
        recordBtns.forEach(function (rb) {
            rb.setAttribute('data-snap-auto-bound', '1');
            // 找所在楼层根（沿 DOM 向上找 .nsk-content 或带 id 的 post-xxx）
            var postRoot = findPostRoot(rb);
            var ctx = {};
            if (postRoot) ctx = extractContextFromPostEl(postRoot);

            // member_id / member_name 也尝试从 recordBtn 的父元素上取
            try {
                var infoDiv = rb.parentElement;
                if (infoDiv && !ctx.memberId) {
                    // 父元素是 user-info-display，里面可能带有 .user-uid-xxx 之类
                    var uidEl = infoDiv.querySelector('[data-uid], [data-member-id]');
                    if (uidEl) {
                        ctx.memberId = uidEl.getAttribute('data-uid') || uidEl.getAttribute('data-member-id') || ctx.memberId;
                    }
                }
            } catch (e) {}

            injectButton(rb, ctx);
        });
    }

    // 启动观察者
    function startAutoBindObserver() {
        try {
            var obs = new MutationObserver(function (mutations) {
                // 节流：使用微任务
                if (startAutoBindObserver._pending) return;
                startAutoBindObserver._pending = true;
                Promise.resolve().then(function () {
                    startAutoBindObserver._pending = false;
                    tryAutoBindSnapButtons();
                });
            });
            obs.observe(document.body, { childList: true, subtree: true });
        } catch (e) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            tryAutoBindSnapButtons();
            startAutoBindObserver();
        });
    } else {
        tryAutoBindSnapButtons();
        startAutoBindObserver();
    }
})();
