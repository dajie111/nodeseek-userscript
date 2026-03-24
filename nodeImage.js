// NS 图床 — NodeImage API（由 nodeseek_blacklist.user.js @require 加载）
// 文档：https://api.nodeimage.com  授权与密钥：https://www.nodeimage.com/
(function () {
    var API_BASE = 'https://api.nodeimage.com';
    var SK = 'ns_nodeimage_api_key';
    function getK() { try { return localStorage.getItem(SK) || ''; } catch (e) { return ''; } }
    function setK(v) { try { var t = (v || '').trim(); if (t) localStorage.setItem(SK, t); else localStorage.removeItem(SK); } catch (e) {} }
    function gm(opts) {
        return new Promise(function (resolve, reject) {
            GM_xmlhttpRequest({
                method: opts.method || 'GET',
                url: opts.url,
                headers: opts.headers || {},
                data: opts.data,
                timeout: 120000,
                onload: function (r) {
                    var body;
                    try { body = r.responseText ? JSON.parse(r.responseText) : null; } catch (e) { body = r.responseText; }
                    if (r.status >= 200 && r.status < 300) resolve({ body: body });
                    else reject(new Error(typeof body === 'object' && body && body.message ? body.message : (r.responseText || String(r.status))));
                },
                onerror: function () { reject(new Error('网络错误')); },
                ontimeout: function () { reject(new Error('超时')); }
            });
        });
    }
    function collectUrls(o, a) {
        a = a || [];
        if (!o) return a;
        if (typeof o === 'string' && /^https?:\/\//i.test(o)) { a.push(o); return a; }
        if (Array.isArray(o)) { o.forEach(function (x) { collectUrls(x, a); }); return a; }
        if (typeof o === 'object') {
            Object.keys(o).forEach(function (k) { collectUrls(o[k], a); });
        }
        return a;
    }
    function openNi() {
        var id = 'ns-nodeimage-dialog';
        var el = document.getElementById(id);
        if (el) { el.remove(); return; }
        el = document.createElement('div');
        el.id = id;
        el.style.cssText = 'position:fixed;top:56px;right:12px;z-index:10001;width:min(400px,94vw);max-height:75vh;overflow:auto;background:#fff;border:1px solid #ccc;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);padding:12px;font:13px system-ui,sans-serif;';
        var hdr = document.createElement('div');
        hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
        var t1 = document.createElement('b');
        t1.style.color = '#0d9488';
        t1.textContent = 'NS 图床';
        var xb = document.createElement('button');
        xb.type = 'button';
        xb.textContent = '×';
        xb.style.cssText = 'border:none;background:none;font-size:20px;cursor:pointer;line-height:1;';
        xb.onclick = function () { el.remove(); };
        hdr.appendChild(t1);
        hdr.appendChild(xb);
        el.appendChild(hdr);
        var tip = document.createElement('div');
        tip.style.cssText = 'font-size:12px;color:#666;margin-bottom:8px;line-height:1.4;';
        tip.innerHTML = '初次请到 <a href="https://www.nodeimage.com/" target="_blank" rel="noopener noreferrer">nodeimage.com</a> 登录并获取 X-API-Key。';
        el.appendChild(tip);
        var keyRow = document.createElement('div');
        keyRow.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center;';
        var keyIn = document.createElement('input');
        keyIn.type = 'password';
        keyIn.placeholder = 'X-API-Key';
        keyIn.style.cssText = 'flex:1;min-width:150px;padding:6px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;';
        keyIn.value = getK();
        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.textContent = '保存密钥';
        saveBtn.className = 'blacklist-btn';
        saveBtn.style.cssText = 'padding:6px 10px;background:#0d9488;color:#fff;border:none;border-radius:4px;cursor:pointer;';
        var clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.textContent = '清除';
        clearBtn.style.cssText = 'padding:6px 10px;background:#94a3b8;color:#fff;border:none;border-radius:4px;cursor:pointer;';
        keyRow.appendChild(keyIn);
        keyRow.appendChild(saveBtn);
        keyRow.appendChild(clearBtn);
        el.appendChild(keyRow);
        var stEl = document.createElement('div');
        stEl.style.cssText = 'font-size:12px;color:#64748b;min-height:18px;margin-bottom:6px;';
        el.appendChild(stEl);
        function st(m, isErr) {
            stEl.textContent = m || '';
            stEl.style.color = isErr ? '#dc2626' : '#64748b';
        }
        var upLabel = document.createElement('label');
        upLabel.style.cssText = 'display:block;border:2px dashed #cbd5e1;border-radius:6px;padding:12px;text-align:center;cursor:pointer;margin-bottom:8px;background:#f8fafc;';
        upLabel.appendChild(document.createTextNode('点击选择图片上传'));
        var fileIn = document.createElement('input');
        fileIn.type = 'file';
        fileIn.accept = 'image/*';
        fileIn.style.display = 'none';
        upLabel.appendChild(fileIn);
        el.appendChild(upLabel);
        var linksBox = document.createElement('div');
        linksBox.style.marginBottom = '10px';
        el.appendChild(linksBox);
        var refBtn = document.createElement('button');
        refBtn.type = 'button';
        refBtn.textContent = '刷新图片列表';
        refBtn.style.cssText = 'width:100%;padding:8px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;';
        el.appendChild(refBtn);
        var listWrap = document.createElement('div');
        listWrap.style.cssText = 'margin-top:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:6px;';
        el.appendChild(listWrap);
        function reqKey() {
            var k = getK();
            if (!k) throw new Error('请先保存 API Key');
            return k;
        }
        function showLinks(data) {
            linksBox.innerHTML = '';
            var h = document.createElement('div');
            h.style.cssText = 'font-weight:600;margin-bottom:4px;color:#334155;';
            h.textContent = '链接 / 结果';
            linksBox.appendChild(h);
            var arr = collectUrls(data, []);
            var seen = {};
            var urls = [];
            arr.forEach(function (u) { if (!seen[u]) { seen[u] = true; urls.push(u); } });
            if (urls.length === 0) {
                var pre = document.createElement('pre');
                pre.style.cssText = 'font-size:11px;white-space:pre-wrap;word-break:break-all;background:#f8fafc;padding:6px;max-height:140px;overflow:auto;margin:0;';
                pre.textContent = (typeof data === 'object' && data) ? JSON.stringify(data, null, 2) : String(data);
                linksBox.appendChild(pre);
                return;
            }
            urls.forEach(function (u) {
                var row = document.createElement('div');
                row.style.cssText = 'display:flex;gap:6px;align-items:center;font-size:11px;margin:3px 0;';
                var a = document.createElement('a');
                a.href = u;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.textContent = '打开';
                a.style.color = '#0d9488';
                var cb = document.createElement('button');
                cb.type = 'button';
                cb.textContent = '复制';
                cb.style.cssText = 'padding:2px 6px;font-size:11px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;cursor:pointer;';
                cb.onclick = function () {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(u).then(function () { st('已复制'); }).catch(function () { st('复制失败', true); });
                    } else {
                        try {
                            var ta = document.createElement('textarea');
                            ta.value = u;
                            ta.style.position = 'fixed';
                            ta.style.left = '-9999px';
                            document.body.appendChild(ta);
                            ta.select();
                            document.execCommand('copy');
                            ta.remove();
                            st('已复制');
                        } catch (e) { st('复制失败', true); }
                    }
                };
                row.appendChild(a);
                row.appendChild(cb);
                linksBox.appendChild(row);
            });
        }
        upLabel.onclick = function (e) {
            if (e.target !== fileIn) fileIn.click();
        };
        fileIn.onchange = function () {
            var f = fileIn.files && fileIn.files[0];
            fileIn.value = '';
            if (!f || !/^image\//i.test(f.type)) { st('请选择图片文件', true); return; }
            var k;
            try { k = reqKey(); } catch (e) { st(e.message, true); return; }
            st('上传中…');
            var fd = new FormData();
            fd.append('image', f, f.name || 'image');
            gm({ method: 'POST', url: API_BASE + '/api/upload', headers: { 'X-API-Key': k }, data: fd })
                .then(function (r) { st('上传成功'); showLinks(r.body); loadL(); })
                .catch(function (e) { st(e.message || String(e), true); });
        };
        saveBtn.onclick = function () {
            setK(keyIn.value);
            st(getK() ? 'API Key 已保存（仅本机）' : '已清除密钥');
            loadL();
        };
        clearBtn.onclick = function () {
            keyIn.value = '';
            setK('');
            st('已清除密钥');
            listWrap.innerHTML = '';
            linksBox.innerHTML = '';
        };
        function normList(b) {
            if (Array.isArray(b)) return b;
            if (b && typeof b === 'object') {
                if (Array.isArray(b.data)) return b.data;
                if (Array.isArray(b.images)) return b.images;
                if (Array.isArray(b.list)) return b.list;
            }
            return [];
        }
        function pickId(it) {
            if (!it || typeof it !== 'object') return '';
            if (it.id != null) return String(it.id);
            if (it.image_id != null) return String(it.image_id);
            if (it.uuid != null) return String(it.uuid);
            if (it.file_id != null) return String(it.file_id);
            return '';
        }
        function pickUrl(it) {
            if (!it || typeof it !== 'object') return '';
            var keys = ['thumbnail_url', 'thumb_url', 'url', 'direct_url', 'link', 'src'];
            for (var i = 0; i < keys.length; i++) {
                var v = it[keys[i]];
                if (typeof v === 'string' && /^https?:\/\//i.test(v)) return v;
            }
            var uu = collectUrls(it, []);
            return uu[0] || '';
        }
        function loadL() {
            var k;
            try { k = reqKey(); } catch (e) { st(e.message); listWrap.innerHTML = ''; return; }
            st('加载列表…');
            listWrap.innerHTML = '';
            gm({ method: 'GET', url: API_BASE + '/api/images', headers: { 'X-API-Key': k } })
                .then(function (r) {
                    var items = normList(r.body);
                    st(items.length ? ('共 ' + items.length + ' 张') : '暂无图片');
                    items.forEach(function (it) {
                        var pid = pickId(it);
                        var u = pickUrl(it);
                        var card = document.createElement('div');
                        card.style.cssText = 'border:1px solid #e2e8f0;border-radius:6px;padding:4px;font-size:10px;background:#fff;';
                        var th = document.createElement('div');
                        th.style.cssText = 'aspect-ratio:1;background:#f1f5f9;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:4px;border-radius:4px;';
                        if (u) {
                            var im = document.createElement('img');
                            im.src = u;
                            im.alt = '';
                            im.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
                            im.referrerPolicy = 'no-referrer';
                            th.appendChild(im);
                        } else {
                            th.textContent = pid ? (pid.slice(0, 8) + '…') : '?';
                            th.style.fontSize = '10px';
                            th.style.color = '#94a3b8';
                        }
                        var idDiv = document.createElement('div');
                        idDiv.style.cssText = 'word-break:break-all;max-height:26px;overflow:hidden;margin-bottom:4px;color:#64748b;';
                        idDiv.textContent = pid || '(无 id)';
                        var br = document.createElement('div');
                        br.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px;';
                        function mkBtn(txt, fn) {
                            var b = document.createElement('button');
                            b.type = 'button';
                            b.textContent = txt;
                            b.style.cssText = 'flex:1;min-width:36px;font-size:9px;padding:2px;border:1px solid #cbd5e1;background:#f8fafc;border-radius:3px;cursor:pointer;';
                            b.onclick = fn;
                            return b;
                        }
                        br.appendChild(mkBtn('详情', function () {
                            if (!pid) return;
                            st('加载详情…');
                            gm({ method: 'GET', url: API_BASE + '/api/image/' + encodeURIComponent(pid), headers: { 'X-API-Key': k } })
                                .then(function (r) { showLinks(r.body); st('已加载详情'); })
                                .catch(function (e) { st(e.message || String(e), true); });
                        }));
                        br.appendChild(mkBtn('删除', function () {
                            if (!pid || !confirm('从图床删除该图片？')) return;
                            st('删除中…');
                            gm({ method: 'DELETE', url: API_BASE + '/api/image/' + encodeURIComponent(pid), headers: { 'X-API-Key': k } })
                                .then(function () { st('已删除'); loadL(); })
                                .catch(function (e) { st(e.message || String(e), true); });
                        }));
                        card.appendChild(th);
                        card.appendChild(idDiv);
                        card.appendChild(br);
                        listWrap.appendChild(card);
                    });
                })
                .catch(function (e) { st(e.message || String(e), true); });
        }
        refBtn.onclick = function () { loadL(); };
        if (typeof window.makeDraggable === 'function') {
            try { window.makeDraggable(el, { width: 40, height: 36 }); } catch (e) {}
        }
        document.body.appendChild(el);
        if (getK()) loadL();
        else st('保存 API Key 后可上传与拉取列表');
    }
    window.NodeSeekNodeImage = {
        open: openNi,
        getApiKey: getK,
        setApiKey: setK,
        API_BASE: API_BASE,
        uploadImageFile: function (file) {
            var k = getK();
            if (!k) return Promise.reject(new Error('无 API Key'));
            var fd = new FormData();
            fd.append('image', file, file.name || 'image');
            return gm({ method: 'POST', url: API_BASE + '/api/upload', headers: { 'X-API-Key': k }, data: fd });
        },
        listImages: function () {
            var k = getK();
            if (!k) return Promise.reject(new Error('无 API Key'));
            return gm({ method: 'GET', url: API_BASE + '/api/images', headers: { 'X-API-Key': k } });
        },
        getImage: function (imageId) {
            var k = getK();
            if (!k) return Promise.reject(new Error('无 API Key'));
            return gm({ method: 'GET', url: API_BASE + '/api/image/' + encodeURIComponent(imageId), headers: { 'X-API-Key': k } });
        },
        deleteImage: function (imageId) {
            var k = getK();
            if (!k) return Promise.reject(new Error('无 API Key'));
            return gm({ method: 'DELETE', url: API_BASE + '/api/image/' + encodeURIComponent(imageId), headers: { 'X-API-Key': k } });
        }
    };
})();
