// NS 图床 — NodeImage API（由 nodeseek_blacklist.user.js @require 加载）
// 文档：https://api.nodeimage.com  授权与密钥：https://www.nodeimage.com/
(function () {
    var API_BASE = 'https://api.nodeimage.com';
    var SK = 'ns_nodeimage_api_key';
    var MAX_BYTES = 100 * 1024 * 1024;
    var ALLOWED_MIME = /^image\/(jpeg|png|gif|webp)$/i;

    function getK() {
        try {
            return localStorage.getItem(SK) || '';
        } catch (e) {
            return '';
        }
    }
    function setK(v) {
        try {
            var t = (v || '').trim();
            if (t) localStorage.setItem(SK, t);
            else localStorage.removeItem(SK);
        } catch (e) {}
    }
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
                    try {
                        body = r.responseText ? JSON.parse(r.responseText) : null;
                    } catch (e) {
                        body = r.responseText;
                    }
                    if (r.status >= 200 && r.status < 300) resolve({ body: body });
                    else
                        reject(
                            new Error(
                                typeof body === 'object' && body && body.message
                                    ? body.message
                                    : r.responseText || String(r.status)
                            )
                        );
                },
                onerror: function () {
                    reject(new Error('网络错误'));
                },
                ontimeout: function () {
                    reject(new Error('超时'));
                },
            });
        });
    }
    function stripTrailingImageExt(id) {
        if (!id || typeof id !== 'string') return id;
        return id.replace(/\.(jpe?g|png|gif|webp)$/i, '');
    }
    function apiImageIdCandidates(raw) {
        var s = String(raw || '').trim();
        if (!s) return [];
        var noExt = stripTrailingImageExt(s);
        if (noExt !== s) return [noExt, s];
        return [s];
    }
    function humanizeApiError(err) {
        var msg = err && err.message ? String(err.message) : String(err);
        if (!msg) return '请求失败';
        var pre = msg.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
        if (pre) {
            var inner = pre[1].replace(/<[^>]+>/g, '').trim();
            if (inner) return inner.length > 220 ? inner.slice(0, 220) + '…' : inner;
        }
        if (/<!DOCTYPE/i.test(msg) || /<html[\s>]/i.test(msg)) {
            return '删除失败：服务器未接受该请求，请稍后在 nodeimage.com 网页端重试';
        }
        return msg.length > 280 ? msg.slice(0, 280) + '…' : msg;
    }
    function deleteImageRequest(apiKey, imageIdRaw) {
        var candidates = apiImageIdCandidates(imageIdRaw);
        if (!candidates.length) return Promise.reject(new Error('无图片 ID'));
        function attempt(i) {
            if (i >= candidates.length) {
                return Promise.reject(new Error('删除失败：已尝试多种 ID 仍无法删除'));
            }
            var seg = candidates[i];
            return gm({
                method: 'DELETE',
                url: API_BASE + '/api/image/' + encodeURIComponent(seg),
                headers: { 'X-API-Key': apiKey },
            }).catch(function (e) {
                var msg = (e && e.message) || '';
                var retry =
                    i + 1 < candidates.length &&
                    (/cannot\s+delete/i.test(msg) ||
                        /\b404\b/.test(msg) ||
                        /<!DOCTYPE/i.test(msg) ||
                        /<pre[^>]*>/i.test(msg));
                if (retry) return attempt(i + 1);
                throw e;
            });
        }
        return attempt(0);
    }
    function collectUrls(o, a) {
        a = a || [];
        if (!o) return a;
        if (typeof o === 'string' && /^https?:\/\//i.test(o)) {
            a.push(o);
            return a;
        }
        if (Array.isArray(o)) {
            o.forEach(function (x) {
                collectUrls(x, a);
            });
            return a;
        }
        if (typeof o === 'object') {
            Object.keys(o).forEach(function (k) {
                collectUrls(o[k], a);
            });
        }
        return a;
    }
    function formatBytes(n) {
        if (n == null || isNaN(n)) return '—';
        if (n < 1024) return n + ' B';
        if (n < 1024 * 1024) return (n / 1024).toFixed(2) + ' KB';
        return (n / (1024 * 1024)).toFixed(2) + ' MB';
    }
    function formatSnippet(mode, url) {
        if (!url) return '';
        var esc = url.replace(/"/g, '&quot;');
        if (mode === 'html') return '<img src="' + esc + '" alt="" />';
        if (mode === 'md') return '![](' + url + ')';
        if (mode === 'bbcode') return '[img]' + url + '[/img]';
        return url;
    }
    function findForumEditor() {
        return (
            document.querySelector('.editor-textarea textarea') ||
            document.querySelector('textarea[name="content"]') ||
            document.querySelector('#content') ||
            document.querySelector('textarea')
        );
    }
    function insertIntoForumEditor(text) {
        var editor = findForumEditor();
        if (!editor) return false;
        var pos = editor.selectionStart != null ? editor.selectionStart : editor.value.length;
        var before = editor.value.substring(0, pos);
        var after = editor.value.substring(pos);
        editor.value = before + text + after;
        editor.focus();
        var np = pos + text.length;
        if (editor.selectionStart != null) editor.selectionStart = editor.selectionEnd = np;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    }
    function copyText(t, onOk, onErr) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(t).then(onOk).catch(onErr);
        } else {
            try {
                var ta = document.createElement('textarea');
                ta.value = t;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                onOk();
            } catch (e) {
                onErr();
            }
        }
    }
    function validateImageFile(file) {
        if (!file) return '请选择图片文件';
        if (file.size > MAX_BYTES) return '文件超过 100MB 限制';
        var ok = ALLOWED_MIME.test(file.type || '');
        if (!ok) {
            var n = (file.name || '').toLowerCase();
            if (/\.(jpe?g|png|gif|webp)$/i.test(n)) ok = true;
        }
        if (!ok) return '仅支持 JPG、JPEG、PNG、GIF、WebP';
        return '';
    }
    function openNi() {
        var id = 'ns-nodeimage-dialog';
        var pasteHandler = null;

        function destroyDialog() {
            if (pasteHandler) {
                document.removeEventListener('paste', pasteHandler, true);
                pasteHandler = null;
            }
            var n = document.getElementById(id);
            if (n) n.remove();
        }

        if (document.getElementById(id)) {
            destroyDialog();
            return;
        }

        var el = document.createElement('div');
        el.id = id;
        el.tabIndex = -1;
        el.style.cssText =
            'position:fixed;top:56px;right:12px;z-index:10001;width:min(400px,94vw);max-height:75vh;overflow:auto;background:#fff;border:1px solid #ccc;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);padding:12px;font:13px system-ui,sans-serif;outline:none;';
        var hdr = document.createElement('div');
        hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
        var t1 = document.createElement('b');
        t1.style.color = '#0d9488';
        t1.textContent = 'NS 图床';
        var xb = document.createElement('button');
        xb.type = 'button';
        xb.textContent = '×';
        xb.style.cssText = 'border:none;background:none;font-size:20px;cursor:pointer;line-height:1;';
        xb.onclick = function () {
            destroyDialog();
        };
        hdr.appendChild(t1);
        hdr.appendChild(xb);
        el.appendChild(hdr);
        var tip = document.createElement('div');
        tip.style.cssText = 'font-size:12px;color:#666;margin-bottom:8px;line-height:1.4;';
        tip.innerHTML =
            '初次请到 <a href="https://www.nodeimage.com/" target="_blank" rel="noopener noreferrer">nodeimage.com</a> 登录并获取 X-API-Key。';
        el.appendChild(tip);
        var keyRow = document.createElement('div');
        keyRow.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center;';
        var keyIn = document.createElement('input');
        keyIn.type = 'password';
        keyIn.placeholder = 'X-API-Key';
        keyIn.style.cssText =
            'flex:1;min-width:150px;padding:6px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;';
        keyIn.value = getK();
        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.textContent = '保存密钥';
        saveBtn.className = 'blacklist-btn';
        saveBtn.style.cssText =
            'padding:6px 10px;background:#0d9488;color:#fff;border:none;border-radius:4px;cursor:pointer;';
        var clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.textContent = '清除';
        clearBtn.style.cssText =
            'padding:6px 10px;background:#94a3b8;color:#fff;border:none;border-radius:4px;cursor:pointer;';
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
        var upLabel = document.createElement('div');
        upLabel.style.cssText =
            'display:block;border:2px dashed #cbd5e1;border-radius:6px;padding:14px 12px;text-align:center;cursor:pointer;margin-bottom:8px;background:#f8fafc;transition:border-color .15s;';
        var upTitle = document.createElement('div');
        upTitle.style.cssText = 'font-weight:600;color:#334155;margin-bottom:6px;';
        upTitle.textContent = '点击或拖拽上传图片';
        var upSub = document.createElement('div');
        upSub.style.cssText = 'font-size:12px;color:#64748b;line-height:1.45;margin-bottom:6px;';
        upSub.textContent = '支持 JPG、JPEG、PNG、GIF、WebP 等格式，最大 100MB';
        var upPaste = document.createElement('div');
        upPaste.style.cssText = 'font-size:12px;color:#475569;line-height:1.45;';
        upPaste.textContent = '💡 你也可以直接 [Ctrl+V] 粘贴剪贴板中的图片';
        upLabel.appendChild(upTitle);
        upLabel.appendChild(upSub);
        upLabel.appendChild(upPaste);
        var fileIn = document.createElement('input');
        fileIn.type = 'file';
        fileIn.accept = 'image/jpeg,image/png,image/gif,image/webp';
        fileIn.style.display = 'none';
        upLabel.appendChild(fileIn);
        el.appendChild(upLabel);
        var resultCardHost = document.createElement('div');
        resultCardHost.style.marginBottom = '10px';
        el.appendChild(resultCardHost);
        var linksBox = document.createElement('div');
        linksBox.style.marginBottom = '10px';
        el.appendChild(linksBox);
        var refBtn = document.createElement('button');
        refBtn.type = 'button';
        refBtn.textContent = '刷新图片列表';
        refBtn.style.cssText = 'width:100%;padding:8px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;';
        el.appendChild(refBtn);
        var listWrap = document.createElement('div');
        listWrap.style.cssText =
            'margin-top:10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;align-content:start;';
        el.appendChild(listWrap);

        function reqKey() {
            var k = getK();
            if (!k) throw new Error('请先保存 API Key');
            return k;
        }

        function appendImageDetailCard(host, opts) {
            var url = opts.url;
            if (!url) return;
            var imageId = (opts.imageId && String(opts.imageId)) || extractIdFromCdnUrl(url);
            var fileName = opts.fileName;
            var dateStr = opts.dateStr;
            var afterDelete = opts.afterDelete;
            if (!dateStr) {
                var d0 = new Date();
                dateStr = d0.getFullYear() + '/' + (d0.getMonth() + 1) + '/' + d0.getDate();
            }
            var modeRef = { v: 'url' };
            var TH = 52;
            var card = document.createElement('div');
            card.style.cssText =
                'border:1px solid #e2e8f0;border-radius:5px;padding:4px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.05);min-width:0;';
            var thumbWrap = document.createElement('div');
            thumbWrap.style.cssText =
                'position:relative;height:' +
                TH +
                'px;overflow:hidden;border-radius:4px;background:#f1f5f9;margin-bottom:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;';
            var im = document.createElement('img');
            im.src = url;
            im.alt = '';
            im.style.cssText = 'max-width:100%;max-height:' + TH + 'px;object-fit:contain;';
            im.referrerPolicy = 'no-referrer';
            thumbWrap.appendChild(im);
            var thumbDelBtn = document.createElement('button');
            thumbDelBtn.type = 'button';
            thumbDelBtn.innerHTML = '&#128465;';
            thumbDelBtn.title = '删除';
            thumbDelBtn.style.cssText =
                'position:absolute;top:2px;right:2px;width:20px;height:20px;border:none;border-radius:50%;background:#dc2626;color:#fff;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;z-index:2;padding:0;';
            thumbDelBtn.onclick = function (e) {
                e.stopPropagation();
                e.preventDefault();
                if (!imageId) {
                    st('无法获取图片 ID（无法从链接解析时请用网页端管理）', true);
                    return;
                }
                if (!confirm('从图床删除该图片？')) return;
                var k2 = getK();
                if (!k2) {
                    st('无 API Key', true);
                    return;
                }
                st('删除中…');
                deleteImageRequest(k2, imageId)
                    .then(function () {
                        st('已删除');
                        if (typeof afterDelete === 'function') afterDelete();
                        else {
                            resultCardHost.innerHTML = '';
                            loadL();
                        }
                    })
                    .catch(function (e2) {
                        st(humanizeApiError(e2), true);
                    });
            };
            thumbWrap.appendChild(thumbDelBtn);
            thumbWrap.onclick = function (e) {
                if (e.target === thumbDelBtn || thumbDelBtn.contains(e.target)) return;
                var ov = document.createElement('div');
                ov.style.cssText =
                    'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
                var fi = document.createElement('img');
                fi.src = url;
                fi.style.cssText = 'max-width:92vw;max-height:92vh;object-fit:contain;border-radius:4px;';
                fi.referrerPolicy = 'no-referrer';
                ov.appendChild(fi);
                ov.onclick = function () {
                    ov.remove();
                };
                document.body.appendChild(ov);
            };
            card.appendChild(thumbWrap);
            var idEl = document.createElement('div');
            idEl.style.cssText =
                'font-size:9px;color:#334155;word-break:break-all;margin-bottom:1px;max-height:2.4em;line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;';
            idEl.textContent = imageId || fileName || '(无 id)';
            card.appendChild(idEl);
            var dateEl = document.createElement('div');
            dateEl.style.cssText = 'font-size:9px;color:#94a3b8;margin-bottom:3px;line-height:1.2;';
            dateEl.textContent = dateStr;
            card.appendChild(dateEl);
            var urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.readOnly = true;
            urlInput.value = url;
            urlInput.style.cssText =
                'width:100%;box-sizing:border-box;padding:2px 4px;border:1px solid #e2e8f0;border-radius:3px;font-size:9px;margin-bottom:4px;background:#f8fafc;height:22px;';
            card.appendChild(urlInput);
            var fmtRow = document.createElement('div');
            fmtRow.style.cssText = 'display:flex;gap:2px;flex-wrap:nowrap;';
            var modes = [
                { id: 'url', label: '\uD83D\uDD17', title: '链接' },
                { id: 'html', label: '</>', title: 'HTML' },
                { id: 'md', label: 'M\u2193', title: 'Markdown' },
                { id: 'bbcode', label: '[BB]', title: 'BBCode' },
            ];
            function syncInput() {
                urlInput.value = formatSnippet(modeRef.v, url);
            }
            function paintFmt() {
                modes.forEach(function (m) {
                    var b = m.btn;
                    var on = modeRef.v === m.id;
                    b.style.background = on ? '#10b981' : '#e5e7eb';
                    b.style.color = on ? '#fff' : '#6b7280';
                    b.style.borderRadius = on ? '9999px' : '6px';
                    b.style.border = 'none';
                });
            }
            modes.forEach(function (m) {
                var b = document.createElement('button');
                b.type = 'button';
                b.textContent = m.label;
                b.title = m.title;
                b.style.cssText =
                    'flex:1;min-width:0;padding:3px 2px;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;font-size:9px;background:#e5e7eb;color:#6b7280;transition:all .15s;';
                b.onclick = function (e) {
                    e.stopPropagation();
                    modeRef.v = m.id;
                    syncInput();
                    paintFmt();
                    var snippet = formatSnippet(modeRef.v, url);
                    if (insertIntoForumEditor(snippet)) st('已插入 ' + m.title);
                    else copyText(snippet, function () { st('已复制'); }, function () {});
                };
                m.btn = b;
                fmtRow.appendChild(b);
            });
            card.appendChild(fmtRow);
            syncInput();
            paintFmt();
            host.appendChild(card);
        }
        function renderResultCard(url, imageId, fileName, fileSize, dateStr) {
            resultCardHost.innerHTML = '';
            if (!url) return;
            appendImageDetailCard(resultCardHost, {
                url: url,
                imageId: imageId,
                fileName: fileName,
                dateStr: dateStr,
                afterDelete: function () {
                    resultCardHost.innerHTML = '';
                    loadL();
                },
            });
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
            arr.forEach(function (u) {
                if (!seen[u]) {
                    seen[u] = true;
                    urls.push(u);
                }
            });
            if (urls.length === 0) {
                var pre = document.createElement('pre');
                pre.style.cssText =
                    'font-size:11px;white-space:pre-wrap;word-break:break-all;background:#f8fafc;padding:6px;max-height:140px;overflow:auto;margin:0;';
                pre.textContent = typeof data === 'object' && data ? JSON.stringify(data, null, 2) : String(data);
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
                cb.style.cssText =
                    'padding:2px 6px;font-size:11px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;cursor:pointer;';
                cb.onclick = function () {
                    copyText(
                        u,
                        function () {
                            st('已复制');
                        },
                        function () {
                            st('复制失败', true);
                        }
                    );
                };
                row.appendChild(a);
                row.appendChild(cb);
                linksBox.appendChild(row);
            });
        }

        function runUpload(file) {
            var err = validateImageFile(file);
            if (err) {
                st(err, true);
                return;
            }
            var k;
            try {
                k = reqKey();
            } catch (e) {
                st(e.message, true);
                return;
            }
            st('上传中…');
            var fd = new FormData();
            fd.append('image', file, file.name || 'image');
            gm({ method: 'POST', url: API_BASE + '/api/upload', headers: { 'X-API-Key': k }, data: fd })
                .then(function (r) {
                    st('上传成功');
                    var urls = collectUrls(r.body, []);
                    var seen = {};
                    var uniq = [];
                    urls.forEach(function (u) {
                        if (!seen[u]) { seen[u] = true; uniq.push(u); }
                    });
                    var mainUrl = uniq[0] || '';
                    // extract id from response
                    var respId = '';
                    if (r.body && typeof r.body === 'object') {
                        respId = pickId(r.body);
                        if (!respId && r.body.data && typeof r.body.data === 'object') respId = pickId(r.body.data);
                    }
                    if (mainUrl) {
                        renderResultCard(mainUrl, respId || extractIdFromCdnUrl(mainUrl), file.name, file.size);
                        linksBox.innerHTML = '';
                    } else showLinks(r.body);
                    loadL();
                })
                .catch(function (e) {
                    st(e.message || String(e), true);
                });
        }

        upLabel.onclick = function (e) {
            if (e.target !== fileIn) fileIn.click();
        };
        fileIn.onchange = function () {
            var f = fileIn.files && fileIn.files[0];
            fileIn.value = '';
            if (f) runUpload(f);
        };
        upLabel.ondragover = function (e) {
            e.preventDefault();
            e.stopPropagation();
            upLabel.style.borderColor = '#0d9488';
        };
        upLabel.ondragleave = function (e) {
            e.preventDefault();
            if (!upLabel.contains(e.relatedTarget)) upLabel.style.borderColor = '#cbd5e1';
        };
        upLabel.ondrop = function (e) {
            e.preventDefault();
            e.stopPropagation();
            upLabel.style.borderColor = '#cbd5e1';
            var dt = e.dataTransfer;
            if (!dt || !dt.files || !dt.files.length) return;
            runUpload(dt.files[0]);
        };

        pasteHandler = function (ev) {
            if (!document.getElementById(id)) return;
            var cd = ev.clipboardData;
            if (!cd || !cd.items) return;
            for (var i = 0; i < cd.items.length; i++) {
                if (cd.items[i].type.indexOf('image') === -1) continue;
                ev.preventDefault();
                ev.stopPropagation();
                var blob = cd.items[i].getAsFile();
                if (!blob) return;
                var ext = (blob.type && blob.type.split('/')[1]) || 'png';
                if (ext === 'jpeg') ext = 'jpg';
                var name = 'paste-' + Date.now() + '.' + ext;
                var file = new File([blob], name, { type: blob.type || 'image/png' });
                runUpload(file);
                return;
            }
        };
        document.addEventListener('paste', pasteHandler, true);

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
            resultCardHost.innerHTML = '';
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
        function extractIdFromCdnUrl(url) {
            if (!url || typeof url !== 'string') return '';
            var m = url.match(/cdn\.nodeimage\.com\/i\/([^/?#\s]+)/i);
            if (!m) m = url.match(/\/i\/([^/?#\s]+)/i);
            if (!m) return '';
            try {
                return decodeURIComponent(m[1]);
            } catch (e) {
                return m[1];
            }
        }
        function pickCreatedDate(it) {
            if (!it || typeof it !== 'object') return '';
            var keys = ['created_at', 'uploaded_at', 'updated_at', 'createdAt', 'uploadTime', 'time', 'date'];
            for (var i = 0; i < keys.length; i++) {
                var v = it[keys[i]];
                if (v == null) continue;
                var d = new Date(typeof v === 'number' && v < 1e12 ? v * 1000 : v);
                if (!isNaN(d.getTime())) return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
            }
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
            try {
                k = reqKey();
            } catch (e) {
                st(e.message);
                listWrap.innerHTML = '';
                return;
            }
            st('加载列表…');
            listWrap.innerHTML = '';
            gm({ method: 'GET', url: API_BASE + '/api/images', headers: { 'X-API-Key': k } })
                .then(function (r) {
                    var items = normList(r.body);
                    st(items.length ? '共 ' + items.length + ' 张' : '暂无图片');
                    items.forEach(function (it) {
                        var pid = pickId(it);
                        var u = pickUrl(it);
                        if (!u && pid) u = 'https://cdn.nodeimage.com/i/' + pid;
                        if (!u) return;
                        var idForApi = pid || extractIdFromCdnUrl(u);
                        var fname = (it && it.filename) || (it && it.name) || '';
                        var dateStr = pickCreatedDate(it);
                        appendImageDetailCard(listWrap, {
                            url: u,
                            imageId: idForApi,
                            fileName: fname,
                            dateStr: dateStr,
                            afterDelete: function () {
                                loadL();
                            },
                        });
                    });
                })
                .catch(function (e) {
                    st(e.message || String(e), true);
                });
        }
        refBtn.onclick = function () {
            loadL();
        };
        if (typeof window.makeDraggable === 'function') {
            try {
                window.makeDraggable(el, { width: 40, height: 36 });
            } catch (e) {}
        }
        document.body.appendChild(el);
        try {
            el.focus();
        } catch (e2) {}
        if (getK()) loadL();
        else st('保存 API Key 后可上传与拉取列表');
    }
    window.NodeSeekNodeImage = {
        open: openNi,
        getApiKey: getK,
        setApiKey: setK,
        API_BASE: API_BASE,
        _collectUrls: collectUrls,
        formatSnippet: formatSnippet,
        insertIntoForumEditor: insertIntoForumEditor,
        findForumEditor: findForumEditor,
        uploadImageFile: function (file) {
            var err = validateImageFile(file);
            if (err) return Promise.reject(new Error(err));
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
            return deleteImageRequest(k, imageId);
        },
    };
})();
