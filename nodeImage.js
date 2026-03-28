// ========== NS图床 ==========
(function () {
    var API_BASE = 'https://api.nodeimage.com';
    var WWW_BASE = 'https://www.nodeimage.com';
    var SK = 'ns_nodeimage_api_key';
    var MAX_BYTES = 100 * 1024 * 1024;
    var ALLOWED_MIME = /^image\/(jpeg|png|gif|webp)$/i;
    var API_V1 = API_BASE + '/api/v1';
    var REFERRER = 'https://www.nodeseek.com/';

    function getK() {
        try {
            if (typeof GM_getValue === 'function') {
                var g = GM_getValue(SK, '');
                if (g != null && String(g).trim()) return String(g).trim();
            }
        } catch (e) {}
        try {
            return localStorage.getItem(SK) || '';
        } catch (e2) {
            return '';
        }
    }
    function setK(v) {
        try {
            var t = (v || '').trim();
            if (t) {
                try {
                    localStorage.setItem(SK, t);
                } catch (e) {}
                if (typeof GM_setValue === 'function') {
                    try {
                        GM_setValue(SK, t);
                    } catch (e2) {}
                }
            } else {
                try {
                    localStorage.removeItem(SK);
                } catch (e3) {}
                if (typeof GM_deleteValue === 'function') {
                    try {
                        GM_deleteValue(SK);
                    } catch (e4) {}
                }
            }
        } catch (e) {}
    }
    function pickApiErrorText(body, responseText) {
        if (body && typeof body === 'object') {
            if (body.message != null && String(body.message).trim()) return String(body.message).trim();
            if (typeof body.error === 'string' && body.error.trim()) return body.error.trim();
            if (body.error && typeof body.error === 'object' && body.error.message != null)
                return String(body.error.message).trim();
        }
        if (typeof responseText === 'string' && responseText.trim()) return responseText.trim();
        return '';
    }
    function gm(opts) {
        return new Promise(function (resolve, reject) {
            var headers = opts.headers || {};
            headers['Referer'] = REFERRER;
            var uas = opts.uploadAbortState;
            var settled = false;
            function markSettled() {
                if (settled) return false;
                settled = true;
                if (uas) uas._rejectInFlight = null;
                return true;
            }
            function clearHandle() {
                if (uas) uas.xhrHandle = null;
            }
            function rejectCodeForAbort() {
                return uas && uas.abortScope === 'file' ? 'ABORT_FILE' : 'ABORT';
            }
            if (uas) {
                /** 新请求开始时清理上一文件「取消」遗留状态，否则 onload 会误判为已取消且快捷面板多图队列无法继续 */
                uas.userAborted = false;
                uas.abortScope = 'batch';
                uas._rejectInFlight = function () {
                    if (!markSettled()) return;
                    clearHandle();
                    reject(Object.assign(new Error('已取消'), { code: rejectCodeForAbort() }));
                };
            }
            var xhrDetail = {
                method: opts.method || 'GET',
                url: opts.url,
                headers: headers,
                data: opts.data,
                timeout: opts.timeout != null ? opts.timeout : 300000,
                anonymous: false,
                onload: function (r) {
                    if (!markSettled()) return;
                    clearHandle();
                    if (uas && uas.userAborted) {
                        reject(Object.assign(new Error('已取消'), { code: rejectCodeForAbort() }));
                        return;
                    }
                    var body;
                    try {
                        body = r.responseText ? JSON.parse(r.responseText) : null;
                    } catch (e) {
                        body = r.responseText;
                    }
                    if (r.status >= 200 && r.status < 300) resolve({ body: body });
                    else {
                        var msg = pickApiErrorText(body, r.responseText);
                        reject(new Error(msg || (r.status + ' ' + (r.statusText || '')).trim()));
                    }
                },
                onerror: function () {
                    if (!markSettled()) return;
                    clearHandle();
                    if (uas && uas.userAborted) {
                        reject(Object.assign(new Error('已取消'), { code: rejectCodeForAbort() }));
                        return;
                    }
                    reject(new Error('网络错误'));
                },
                ontimeout: function () {
                    if (!markSettled()) return;
                    clearHandle();
                    if (uas && uas.userAborted) {
                        reject(Object.assign(new Error('已取消'), { code: rejectCodeForAbort() }));
                        return;
                    }
                    reject(new Error('超时'));
                },
            };
            if (typeof opts.onUploadProgress === 'function') {
                xhrDetail.onprogress = function (ev) {
                    if (!ev || !ev.lengthComputable || !ev.total) return;
                    opts.onUploadProgress(ev.loaded, ev.total);
                };
            }
            var handle = GM_xmlhttpRequest(xhrDetail);
            if (uas) uas.xhrHandle = handle;
        });
    }
    function extractApiKeyFromJson(body) {
        if (!body || typeof body !== 'object') return '';
        if (typeof body.api_key === 'string' && body.api_key.trim()) return body.api_key.trim();
        if (typeof body.apiKey === 'string' && body.apiKey.trim()) return body.apiKey.trim();
        if (body.data && typeof body.data === 'object') {
            if (typeof body.data.api_key === 'string' && body.data.api_key.trim()) return body.data.api_key.trim();
            if (typeof body.data.apiKey === 'string' && body.data.apiKey.trim()) return body.data.apiKey.trim();
        }
        return '';
    }
    function extractApiKeyFromHtml(html) {
        if (typeof html !== 'string' || !html) return '';
        var m = html.match(/id\s*=\s*["']apiKeyInput["'][^>]*\svalue\s*=\s*["']([^"']+)["']/i);
        if (m && m[1]) return m[1].trim();
        m = html.match(/value\s*=\s*["']([a-fA-F0-9]{48,})["'][^>]*\s*id\s*=\s*["']apiKeyInput["']/i);
        if (m && m[1]) return m[1].trim();
        return '';
    }
    function pullApiKeyWithGmXhr(onDone) {
        if (typeof GM_xmlhttpRequest !== 'function') {
            onDone('', '');
            return;
        }
        var refWww = WWW_BASE + '/';
        function parseLastMsg(text, asJson) {
            if (!asJson || !text) return '';
            try {
                var lb = JSON.parse(text);
                if (lb && lb.message) return String(lb.message);
            } catch (e) {}
            return '';
        }
        function tryFetch(url, asJson, next) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                headers: {
                    Referer: refWww,
                    Accept: asJson ? 'application/json' : 'text/html,*/*',
                },
                timeout: 20000,
                anonymous: false,
                onload: function (r) {
                    var text = r.responseText || '';
                    if (asJson) {
                        var body;
                        try {
                            body = text ? JSON.parse(text) : null;
                        } catch (e) {
                            body = null;
                        }
                        var key = extractApiKeyFromJson(body);
                        if (key) {
                            onDone(key, '');
                            return;
                        }
                    } else {
                        var keyHtml = extractApiKeyFromHtml(text);
                        if (keyHtml) {
                            onDone(keyHtml, '');
                            return;
                        }
                    }
                    if (typeof next === 'function') next();
                    else onDone('', parseLastMsg(text, asJson));
                },
                onerror: function () {
                    if (typeof next === 'function') next();
                    else onDone('', '');
                },
                ontimeout: function () {
                    if (typeof next === 'function') next();
                    else onDone('', '');
                },
            });
        }
        tryFetch(WWW_BASE + '/api/user/api-key', true, function () {
            tryFetch(API_BASE + '/api/user/api-key', true, function () {
                tryFetch(refWww, false, null);
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
        var urls = [];
        var seen = {};
        function addDeleteUrl(pathPrefix, seg) {
            var u = API_BASE + pathPrefix + encodeURIComponent(seg);
            if (!seen[u]) {
                seen[u] = true;
                urls.push(u);
            }
        }
        candidates.forEach(function (seg) {
            addDeleteUrl('/api/v1/delete/', seg);
            addDeleteUrl('/api/image/', seg);
        });
        function shouldRetryDelete(msg) {
            return (
                /cannot\s+delete/i.test(msg) ||
                /\b404\b/.test(msg) ||
                /\b405\b/.test(msg) ||
                /<!DOCTYPE/i.test(msg) ||
                /<pre[\s>]/i.test(msg)
            );
        }
        function attempt(i) {
            if (i >= urls.length) {
                return Promise.reject(
                    new Error(
                        '删除失败：已依次尝试 /api/image 与 /api/images（含去扩展名）。若仍失败，多为 NodeImage 服务端未实现该 DELETE，请用 nodeimage.com 网页删除。'
                    )
                );
            }
            return gm({
                method: 'DELETE',
                url: urls[i],
                headers: { 'X-API-Key': apiKey },
            }).catch(function (e) {
                var msg = (e && e.message) || '';
                if (i + 1 < urls.length && shouldRetryDelete(msg)) return attempt(i + 1);
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
        var cm = document.querySelector('.CodeMirror');
        if (cm && cm.CodeMirror) return cm.CodeMirror;
        var wrappers = document.querySelectorAll('#code-mirror-editor, .cm-editor, [class*="CodeMirror"]');
        for (var i = 0; i < wrappers.length; i++) {
            var inst = wrappers[i].CodeMirror || wrappers[i].cm;
            if (inst) return inst;
        }
        var ta = document.querySelector('.editor-textarea textarea') ||
            document.querySelector('textarea[name="content"]') ||
            document.querySelector('#content') ||
            document.querySelector('textarea');
        if (ta) {
            var cm2 = ta.CodeMirror;
            if (cm2) return cm2;
            var parent = ta.closest('.CodeMirror, #code-mirror-editor');
            if (parent && parent.CodeMirror) return parent.CodeMirror;
        }
        return null;
    }
    function insertIntoForumEditor(text) {
        var cm = findForumEditor();
        if (!cm) return false;
        if (typeof cm.replaceSelection === 'function') {
            cm.replaceSelection(text);
            if (typeof cm.focus === 'function') cm.focus();
            return true;
        }
        if (cm.hasFocus && typeof cm.getCursor === 'function' && typeof cm.replaceRange === 'function') {
            var from = cm.getCursor();
            var to = cm.somethingSelected() ? cm.getSelection() : from;
            cm.replaceRange(text, from, to);
            if (typeof cm.focus === 'function') cm.focus();
            return true;
        }
        return false;
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
    function fileDisplayNameForTip(file) {
        var n = (file && file.name) || '未命名';
        n = String(n).replace(/[\r\n\u0000]+/g, ' ').trim() || '未命名';
        if (n.length > 40) n = n.slice(0, 37) + '…';
        return n;
    }
    function isGenericClipboardImageName(name) {
        if (name == null) return true;
        var s = String(name).trim();
        if (!s) return true;
        s = s.replace(/^.*[/\\]/, '').toLowerCase();
        if (/^image\.(png|jpe?g|gif|webp)$/.test(s)) return true;
        if (s === 'clipboard.png' || s === 'unnamed.png' || s === 'blob') return true;
        return false;
    }
    function fileNameFromClipboardBlob(blob, baseT, index) {
        var ext = (blob.type && blob.type.split('/')[1]) || 'png';
        if (ext === 'jpeg') ext = 'jpg';
        var fallback = 'paste-' + baseT + '-' + index + '.' + ext;
        if (!(blob instanceof File)) return fallback;
        var raw = blob.name;
        if (raw == null || !String(raw).trim()) return fallback;
        var base = String(raw).trim().replace(/^.*[/\\]/, '');
        if (!base || isGenericClipboardImageName(base)) return fallback;
        return base;
    }
    function partitionUploadFiles(files) {
        var valid = [];
        var invalidRows = [];
        function pushInv(name, reason, kind) {
            invalidRows.push({ name: name, reason: reason, kind: kind || 'format' });
        }
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            if (!f) {
                pushInv('（无效项）', '空文件或无法读取', 'format');
                continue;
            }
            if (f.size > MAX_BYTES) {
                pushInv(
                    fileDisplayNameForTip(f),
                    '超过 100MB 限制（当前 ' + formatBytes(f.size) + '）',
                    'size'
                );
                continue;
            }
            var err = validateImageFile(f);
            if (err) {
                pushInv(fileDisplayNameForTip(f), err, 'format');
                continue;
            }
            valid.push(f);
        }
        var skippedSize = 0;
        var skippedFormat = 0;
        invalidRows.forEach(function (r) {
            if (r.kind === 'size') skippedSize++;
            else skippedFormat++;
        });
        return {
            valid: valid,
            invalidRows: invalidRows,
            skippedSize: skippedSize,
            skippedFormat: skippedFormat,
        };
    }
    function newNiUploadAbortState() {
        return {
            stop: false,
            userAborted: false,
            abortScope: 'batch',
            xhrHandle: null,
            _rejectInFlight: null,
            abortCurrent: function () {
                this.stop = true;
                this.userAborted = true;
                this.abortScope = 'batch';
                var rj = this._rejectInFlight;
                try {
                    if (this.xhrHandle && typeof this.xhrHandle.abort === 'function') {
                        this.xhrHandle.abort();
                    }
                } catch (e) {}
                this._rejectInFlight = null;
                this.xhrHandle = null;
                if (typeof rj === 'function') {
                    try {
                        rj();
                    } catch (e2) {}
                }
            },
            abortCurrentFile: function () {
                this.userAborted = true;
                this.abortScope = 'file';
                var rj = this._rejectInFlight;
                try {
                    if (this.xhrHandle && typeof this.xhrHandle.abort === 'function') {
                        this.xhrHandle.abort();
                    }
                } catch (e) {}
                this._rejectInFlight = null;
                this.xhrHandle = null;
                if (typeof rj === 'function') {
                    try {
                        rj();
                    } catch (e2) {}
                }
            },
            reset: function () {
                this.stop = false;
                this.userAborted = false;
                this.abortScope = 'batch';
                this.xhrHandle = null;
                this._rejectInFlight = null;
            },
        };
    }
    function isNiAbortErr(e) {
        return e && (e.code === 'ABORT' || (e.message && String(e.message).indexOf('已取消') >= 0));
    }
    function niPostImageUpload(file, apiKey, uploadAbortState, onUploadProgress) {
        var fd = new FormData();
        fd.append('image', file, file.name || 'image');
        return gm({
            method: 'POST',
            url: API_BASE + '/api/upload',
            headers: { 'X-API-Key': apiKey },
            data: fd,
            timeout: 300000,
            uploadAbortState: uploadAbortState,
            onUploadProgress: typeof onUploadProgress === 'function' ? onUploadProgress : undefined,
        });
    }
    function niNotifyUploadSuccessToEditor(body, onStatus, onNoUrl) {
        onStatus = onStatus || function () {};
        var urls = collectUrls(body, []);
        var seen = {};
        var uniq = [];
        urls.forEach(function (u) {
            if (!seen[u]) {
                seen[u] = true;
                uniq.push(u);
            }
        });
        var mainUrl = uniq[0] || '';
        if (mainUrl) {
            var mdSnippet = formatSnippet('md', mainUrl);
            if (!insertIntoForumEditor(mdSnippet + '\n')) {
                copyText(
                    mdSnippet,
                    function () {
                        onStatus('已复制 MD 格式');
                    },
                    function () {
                        onStatus('复制失败', true);
                    }
                );
            }
        } else {
            if (typeof onNoUrl === 'function') onNoUrl(body);
            else onStatus('上传成功（响应中无图片链接）', true);
        }
    }
    var NS_NI_UPLOAD_PROG_STYLE_ID = 'ns-ni-upload-prog-styles';
    function niEnsureUploadProgressStyles() {
        if (document.getElementById(NS_NI_UPLOAD_PROG_STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = NS_NI_UPLOAD_PROG_STYLE_ID;
        s.textContent =
            '@keyframes nsNiBarMove{0%{transform:translateX(-120%);}100%{transform:translateX(380%);}}' +
            '.ns-ni-pbar-ind{position:relative;}' +
            '.ns-ni-pbar-ind::after{content:"";position:absolute;left:0;top:0;height:100%;width:55%;border-radius:4px;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(13,148,136,.55),transparent);animation:nsNiBarMove 1.05s linear infinite;}';
        (document.head || document.documentElement).appendChild(s);
    }
    var NS_NI_QUICK_PANEL_ID = 'ns-ni-quick-upload-panel';
    function niCloseQuickUploadPanel() {
        var p = document.getElementById(NS_NI_QUICK_PANEL_ID);
        if (p) p.remove();
    }
    function niQuickToast(msg, isErr) {
        var id = 'ns-ni-floating-toast';
        var el = document.getElementById(id);
        if (!el) {
            el = document.createElement('div');
            el.id = id;
            el.style.cssText =
                'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10003;max-width:min(520px,92vw);padding:8px 14px;border-radius:8px;font:13px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.12);pointer-events:none;transition:opacity .2s;text-align:center;';
            document.body.appendChild(el);
        }
        el.textContent = msg || '';
        el.style.background = isErr ? '#fef2f2' : '#f0fdfa';
        el.style.color = isErr ? '#b91c1c' : '#0f766e';
        el.style.border = isErr ? '1px solid #fecaca' : '1px solid #99f6e4';
        el.style.opacity = '1';
        clearTimeout(el._nsNiT);
        el._nsNiT = setTimeout(function () {
            el.style.opacity = '0';
        }, isErr ? 4500 : 3000);
    }
    function niOpenQuickUploadPanel(uploadAbortState, batchHintText) {
        niEnsureUploadProgressStyles();
        niCloseQuickUploadPanel();
        var panel = document.createElement('div');
        panel.id = NS_NI_QUICK_PANEL_ID;
        panel.style.cssText =
            'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10002;min-width:min(420px,94vw);max-width:96vw;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.15);padding:10px 12px;font:13px system-ui,sans-serif;';
        var hdr = document.createElement('div');
        hdr.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px;';
        var titleCol = document.createElement('div');
        titleCol.style.cssText = 'flex:1;min-width:0;';
        var t = document.createElement('div');
        t.style.cssText = 'font-weight:600;color:#0f766e;font-size:13px;';
        t.textContent = 'NS 图床上传';
        var sub = document.createElement('div');
        sub.style.cssText = 'font-size:12px;color:#64748b;margin-top:4px;line-height:1.35;';
        sub.textContent = batchHintText || '';
        titleCol.appendChild(t);
        titleCol.appendChild(sub);
        var cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = '取消全部';
        cancelBtn.style.cssText =
            'flex-shrink:0;padding:4px 10px;font-size:12px;border:1px solid #fecaca;background:#fff;color:#b45309;border-radius:4px;cursor:pointer;';
        cancelBtn.onclick = function () {
            uploadAbortState.abortCurrent();
        };
        hdr.appendChild(titleCol);
        hdr.appendChild(cancelBtn);
        var body = document.createElement('div');
        body.style.cssText = 'max-height:220px;overflow-y:auto;';
        panel.appendChild(hdr);
        panel.appendChild(body);
        document.body.appendChild(panel);
        return {
            body: body,
            setBatchHint: function (s) {
                sub.textContent = s || '';
            },
        };
    }
    function niAppendQuickProgressRow(host, fileName, uploadAbortState) {
        var row = document.createElement('div');
        row.style.cssText = 'margin-bottom:10px;';
        var head = document.createElement('div');
        head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:3px;';
        var nm = document.createElement('div');
        nm.textContent = fileName;
        nm.style.cssText =
            'font-size:11px;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1;';
        var rowCancel = document.createElement('button');
        rowCancel.type = 'button';
        rowCancel.textContent = '取消';
        rowCancel.style.cssText =
            'flex-shrink:0;padding:2px 8px;font-size:10px;border:1px solid #fecaca;background:#fff;color:#dc2626;border-radius:4px;cursor:pointer;';
        rowCancel.onclick = function (e) {
            e.stopPropagation();
            e.preventDefault();
            uploadAbortState.abortCurrentFile();
        };
        head.appendChild(nm);
        head.appendChild(rowCancel);
        var barWrap = document.createElement('div');
        barWrap.className = 'ns-ni-pbar';
        barWrap.style.cssText =
            'height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;position:relative;';
        var barFill = document.createElement('div');
        barFill.style.cssText =
            'height:100%;width:0%;background:#0d9488;border-radius:4px;transition:width .12s linear;';
        barWrap.appendChild(barFill);
        var stt = document.createElement('div');
        stt.style.cssText = 'font-size:10px;color:#64748b;margin-top:3px;';
        stt.textContent = '等待中…';
        row.appendChild(head);
        row.appendChild(barWrap);
        row.appendChild(stt);
        host.prepend(row);
        var realProgress = false;
        var fakeTimer = null;
        return {
            startUpload: function () {
                barWrap.classList.add('ns-ni-pbar-ind');
                barFill.style.width = '0%';
                barFill.style.background = '#0d9488';
                stt.style.color = '#64748b';
                stt.textContent = '上传中…';
                var fake = 0.06;
                fakeTimer = setInterval(function () {
                    if (realProgress) return;
                    fake = Math.min(0.9, fake + 0.035 + Math.random() * 0.025);
                    barFill.style.width = fake * 100 + '%';
                }, 320);
            },
            setLoadedTotal: function (loaded, total) {
                if (!total || total <= 0) return;
                realProgress = true;
                if (fakeTimer) {
                    clearInterval(fakeTimer);
                    fakeTimer = null;
                }
                barWrap.classList.remove('ns-ni-pbar-ind');
                var p = Math.min(100, (loaded / total) * 100);
                barFill.style.width = p + '%';
                stt.textContent = '上传中 ' + Math.round(p) + '%';
            },
            doneOk: function () {
                rowCancel.style.display = 'none';
                if (fakeTimer) {
                    clearInterval(fakeTimer);
                    fakeTimer = null;
                }
                barWrap.classList.remove('ns-ni-pbar-ind');
                barFill.style.width = '100%';
                barFill.style.background = '#059669';
                stt.textContent = '完成';
                stt.style.color = '#059669';
            },
            doneErr: function (msg) {
                rowCancel.style.display = 'none';
                if (fakeTimer) {
                    clearInterval(fakeTimer);
                    fakeTimer = null;
                }
                barWrap.classList.remove('ns-ni-pbar-ind');
                barFill.style.width = '100%';
                barFill.style.background = '#dc2626';
                stt.textContent = msg || '失败';
                stt.style.color = '#dc2626';
            },
        };
    }
    var nsNiGlobalFileInput = null;
    function getOrCreateNiGlobalFileInput() {
        if (nsNiGlobalFileInput && document.body.contains(nsNiGlobalFileInput)) return nsNiGlobalFileInput;
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.multiple = true;
        inp.accept = 'image/jpeg,image/png,image/gif,image/webp';
        inp.id = 'ns-ni-mde-global-file';
        inp.setAttribute('aria-hidden', 'true');
        inp.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;opacity:0;';
        inp.addEventListener('change', function () {
            var fs = inp.files;
            if (!fs || !fs.length) return;
            var arr = [];
            for (var j = 0; j < fs.length; j++) arr.push(fs[j]);
            inp.value = '';
            niQuickUploadRunBatch(arr);
        });
        document.body.appendChild(inp);
        nsNiGlobalFileInput = inp;
        return inp;
    }
    function niQuickUploadRunBatch(files) {
        if (!files || !files.length) return;
        var k = getK();
        if (!k || !String(k).trim()) {
            niQuickToast('未配置 API Key，将打开设置面板', false);
            openNi();
            return;
        }
        k = String(k).trim();
        var part = partitionUploadFiles(files);
        var skipped = part.skippedSize + part.skippedFormat;
        if (skipped > 0) {
            var bits = [];
            if (part.skippedSize) bits.push('超过 100MB×' + part.skippedSize);
            if (part.skippedFormat) bits.push('格式不符×' + part.skippedFormat);
            niQuickToast('已跳过 ' + skipped + ' 个（' + bits.join('，') + '）', !part.valid.length);
        }
        if (!part.valid.length) {
            if (!skipped) niQuickToast('没有可上传的文件', true);
            return;
        }
        files = part.valid;
        var uploadAbortState = newNiUploadAbortState();
        var batchTotal = files.length;
        var skippedHint =
            skipped > 0 ? '（另有 ' + skipped + ' 个已跳过）' : '';
        var ui = niOpenQuickUploadPanel(
            uploadAbortState,
            '共 ' + batchTotal + ' 张' + skippedHint
        );
        var host = ui.body;
        if (files.length === 1) {
            var rowUi = niAppendQuickProgressRow(host, fileDisplayNameForTip(files[0]), uploadAbortState);
            rowUi.startUpload();
            niPostImageUpload(files[0], k, uploadAbortState, function (loaded, total) {
                rowUi.setLoadedTotal(loaded, total);
            })
                .then(function (r) {
                    rowUi.doneOk();
                    niNotifyUploadSuccessToEditor(r.body, niQuickToast, function () {});
                    setTimeout(niCloseQuickUploadPanel, 900);
                })
                .catch(function (e) {
                    var skipFile = e && e.code === 'ABORT_FILE';
                    if (skipFile || isNiAbortErr(e)) {
                        rowUi.doneErr('已取消');
                    } else {
                        var em = (e && e.message) || String(e);
                        rowUi.doneErr(em.length > 72 ? em.slice(0, 72) + '…' : em);
                        niQuickToast(humanizeApiError(e), true);
                    }
                    setTimeout(niCloseQuickUploadPanel, 1100);
                });
            return;
        }
        var total = files.length;
        var i = 0;
        function step() {
            if (uploadAbortState.stop) {
                niCloseQuickUploadPanel();
                return;
            }
            if (i >= total) {
                ui.setBatchHint('共 ' + total + ' 张 · 已全部完成' + skippedHint);
                setTimeout(niCloseQuickUploadPanel, 900);
                return;
            }
            ui.setBatchHint(
                '共 ' + total + ' 张 · 第 ' + (i + 1) + ' / ' + total + ' 张' + skippedHint
            );
            var rowUi = niAppendQuickProgressRow(host, fileDisplayNameForTip(files[i]), uploadAbortState);
            rowUi.startUpload();
            niPostImageUpload(files[i], k, uploadAbortState, function (loaded, total2) {
                rowUi.setLoadedTotal(loaded, total2);
            })
                .then(function (r) {
                    if (uploadAbortState.stop) {
                        niCloseQuickUploadPanel();
                        return;
                    }
                    rowUi.doneOk();
                    var urls = collectUrls(r && r.body ? r.body : null, []);
                    var seen = {};
                    var batchUniq = [];
                    urls.forEach(function (u) {
                        if (!seen[u]) {
                            seen[u] = true;
                            batchUniq.push(u);
                        }
                    });
                    if (batchUniq.length) {
                        var mdParts = batchUniq.map(function (u) {
                            return formatSnippet('md', u);
                        });
                        var mdAll = mdParts.join('\n') + '\n';
                        if (!insertIntoForumEditor(mdAll)) {
                            copyText(mdAll, function () {}, function () {});
                        }
                    }
                    i++;
                    step();
                })
                .catch(function (e) {
                    if (e && e.code === 'ABORT_FILE') {
                        rowUi.doneErr('已取消');
                        i++;
                        step();
                        return;
                    }
                    if (isNiAbortErr(e) || uploadAbortState.stop) {
                        niCloseQuickUploadPanel();
                        return;
                    }
                    var em = (e && e.message) || String(e);
                    rowUi.doneErr(em.length > 72 ? em.slice(0, 72) + '…' : em);
                    i++;
                    step();
                });
        }
        step();
    }
    function niToolbarTriggerPickFiles() {
        try {
            var kk = getK();
            if (!kk || !String(kk).trim()) {
                niQuickToast('未配置 API Key，将打开设置面板', false);
                openNi();
                return;
            }
            getOrCreateNiGlobalFileInput().click();
        } catch (e) {
            niQuickToast('无法打开文件选择', true);
        }
    }
    function openNi() {
        var id = 'ns-nodeimage-dialog';
        var pasteHandler = null;
        var uploadAbortState = newNiUploadAbortState();

        function destroyDialog() {
            uploadAbortState.abortCurrent();
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
            'position:fixed;top:56px;right:12px;z-index:10001;width:min(520px,96vw);max-height:78vh;display:flex;flex-direction:column;overflow:hidden;background:#fff;border:1px solid #ccc;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);padding:0;font:13px system-ui,sans-serif;outline:none;';
        var hdr = document.createElement('div');
        hdr.style.cssText =
            'display:flex;justify-content:space-between;align-items:center;flex-shrink:0;padding:12px;padding-bottom:8px;border-bottom:1px solid #e2e8f0;background:#fff;';
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
        var niScroll = document.createElement('div');
        niScroll.style.cssText = 'flex:1;min-height:0;overflow-y:auto;padding:12px;padding-top:10px;';
        el.appendChild(niScroll);
        var tip = document.createElement('div');
        tip.style.cssText = 'font-size:12px;color:#666;margin-bottom:8px;line-height:1.4;';
        tip.innerHTML =
            '请到 <a href="https://www.nodeimage.com/" target="_blank" rel="noopener noreferrer">nodeimage.com</a> 完成 <strong>NodeSeek 授权</strong>。<span style="color:#b45309;">须在与油猴相同的浏览器里授权</span>。密钥需<strong>手动</strong>获取：点「手动获取」从接口拉取（须已登录 nodeimage），或到网站顶部「API」页复制后粘贴，再点「保存密钥」。';
        niScroll.appendChild(tip);
        var keyRow = document.createElement('div');
        keyRow.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center;';
        var keyWrap = document.createElement('div');
        keyWrap.style.cssText =
            'display:flex;flex:1;min-width:150px;align-items:stretch;border:1px solid #ddd;border-radius:4px;overflow:hidden;box-sizing:border-box;';
        var keyIn = document.createElement('input');
        keyIn.type = 'password';
        keyIn.placeholder = 'X-API-Key';
        keyIn.style.cssText =
            'flex:1;min-width:0;width:0;padding:6px 8px;border:none;border-radius:0;box-sizing:border-box;font:inherit;';
        keyIn.value = getK();
        var keyToggleBtn = document.createElement('button');
        keyToggleBtn.type = 'button';
        keyToggleBtn.textContent = '显示';
        keyToggleBtn.title = '显示或隐藏密钥明文';
        keyToggleBtn.style.cssText =
            'flex-shrink:0;padding:0 10px;border:none;border-left:1px solid #ddd;background:#f1f5f9;cursor:pointer;font-size:12px;color:#475569;white-space:nowrap;';
        var keyPlainVisible = false;
        keyToggleBtn.onclick = function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            keyPlainVisible = !keyPlainVisible;
            keyIn.type = keyPlainVisible ? 'text' : 'password';
            keyToggleBtn.textContent = keyPlainVisible ? '隐藏' : '显示';
        };
        keyWrap.appendChild(keyIn);
        keyWrap.appendChild(keyToggleBtn);
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
        var autoBtn = document.createElement('button');
        autoBtn.type = 'button';
        autoBtn.textContent = '手动获取';
        autoBtn.title = '在已登录 nodeimage.com 的前提下，从接口拉取密钥并保存';
        autoBtn.style.cssText =
            'padding:6px 8px;background:#f59e0b;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;';
        keyRow.appendChild(keyWrap);
        keyRow.appendChild(saveBtn);
        keyRow.appendChild(clearBtn);
        keyRow.appendChild(autoBtn);
        niScroll.appendChild(keyRow);
        var stRow = document.createElement('div');
        stRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;';
        var stEl = document.createElement('div');
        stEl.style.cssText = 'font-size:12px;color:#64748b;min-height:18px;flex:1;min-width:0;';
        var cancelUploadBtn = document.createElement('button');
        cancelUploadBtn.type = 'button';
        cancelUploadBtn.textContent = '取消上传';
        cancelUploadBtn.style.cssText =
            'display:none;flex-shrink:0;padding:4px 10px;font-size:12px;border:1px solid #fecaca;background:#fff;color:#b45309;border-radius:4px;cursor:pointer;';
        cancelUploadBtn.onclick = function (e) {
            e.stopPropagation();
            e.preventDefault();
            uploadAbortState.abortCurrent();
        };
        stRow.appendChild(stEl);
        stRow.appendChild(cancelUploadBtn);
        niScroll.appendChild(stRow);
        var niProgStyle = document.createElement('style');
        niProgStyle.textContent =
            '@keyframes nsNiBarMove{0%{transform:translateX(-120%);}100%{transform:translateX(380%);}}' +
            '.ns-ni-pbar-ind{position:relative;}' +
            '.ns-ni-pbar-ind::after{content:"";position:absolute;left:0;top:0;height:100%;width:55%;border-radius:4px;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(13,148,136,.55),transparent);animation:nsNiBarMove 1.05s linear infinite;}';
        niScroll.appendChild(niProgStyle);
        var uploadQueueBox = document.createElement('div');
        uploadQueueBox.id = 'ns-ni-upload-q';
        uploadQueueBox.style.cssText =
            'display:none;margin-bottom:8px;padding:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;max-height:240px;overflow-y:auto;';
        niScroll.appendChild(uploadQueueBox);
        var uploadQueueInv = null;
        var uploadQueueProg = null;
        function st(m, isErr) {
            stEl.textContent = m || '';
            stEl.style.color = isErr ? '#dc2626' : '#64748b';
        }
        function beginUploadSession() {
            uploadAbortState.reset();
            cancelUploadBtn.style.display = 'inline-block';
        }
        function endUploadSession() {
            cancelUploadBtn.style.display = 'none';
            uploadAbortState.reset();
        }
        function openUploadQueue() {
            uploadQueueBox.style.display = 'block';
            uploadQueueBox.innerHTML = '';
            uploadQueueInv = document.createElement('div');
            uploadQueueProg = document.createElement('div');
            uploadQueueBox.appendChild(uploadQueueInv);
            uploadQueueBox.appendChild(uploadQueueProg);
        }
        function addInvalidUploadRow(displayName, reason) {
            var row = document.createElement('div');
            row.style.cssText =
                'margin-bottom:8px;padding:6px 8px;background:#fef2f2;border:1px solid #fecaca;border-radius:4px;font-size:11px;';
            var t1 = document.createElement('div');
            t1.style.cssText = 'font-weight:600;color:#b91c1c;';
            t1.textContent = '已忽略 · ' + displayName;
            var t2 = document.createElement('div');
            t2.style.cssText = 'margin-top:2px;color:#64748b;line-height:1.35;';
            t2.textContent = reason;
            row.appendChild(t1);
            row.appendChild(t2);
            (uploadQueueInv || uploadQueueBox).appendChild(row);
        }
        function addProgressUploadRow(fileName) {
            var row = document.createElement('div');
            row.style.cssText = 'margin-bottom:10px;';
            var head = document.createElement('div');
            head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:3px;';
            var nm = document.createElement('div');
            nm.textContent = fileName;
            nm.style.cssText =
                'font-size:11px;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1;';
            var rowCancel = document.createElement('button');
            rowCancel.type = 'button';
            rowCancel.textContent = '取消';
            rowCancel.style.cssText =
                'flex-shrink:0;padding:2px 8px;font-size:10px;border:1px solid #fecaca;background:#fff;color:#dc2626;border-radius:4px;cursor:pointer;';
            rowCancel.onclick = function (e) {
                e.stopPropagation();
                e.preventDefault();
                uploadAbortState.abortCurrentFile();
            };
            head.appendChild(nm);
            head.appendChild(rowCancel);
            var barWrap = document.createElement('div');
            barWrap.className = 'ns-ni-pbar';
            barWrap.style.cssText =
                'height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;position:relative;';
            var barFill = document.createElement('div');
            barFill.style.cssText =
                'height:100%;width:0%;background:#0d9488;border-radius:4px;transition:width .12s linear;';
            barWrap.appendChild(barFill);
            var stt = document.createElement('div');
            stt.style.cssText = 'font-size:10px;color:#64748b;margin-top:3px;';
            stt.textContent = '等待中…';
            row.appendChild(head);
            row.appendChild(barWrap);
            row.appendChild(stt);
            (uploadQueueProg || uploadQueueBox).prepend(row);
            var realProgress = false;
            var fakeTimer = null;
            return {
                startUpload: function () {
                    barWrap.classList.add('ns-ni-pbar-ind');
                    barFill.style.width = '0%';
                    barFill.style.background = '#0d9488';
                    stt.style.color = '#64748b';
                    stt.textContent = '上传中…';
                    var fake = 0.06;
                    fakeTimer = setInterval(function () {
                        if (realProgress) return;
                        fake = Math.min(0.9, fake + 0.035 + Math.random() * 0.025);
                        barFill.style.width = fake * 100 + '%';
                    }, 320);
                },
                setLoadedTotal: function (loaded, total) {
                    if (!total || total <= 0) return;
                    realProgress = true;
                    if (fakeTimer) {
                        clearInterval(fakeTimer);
                        fakeTimer = null;
                    }
                    barWrap.classList.remove('ns-ni-pbar-ind');
                    var p = Math.min(100, (loaded / total) * 100);
                    barFill.style.width = p + '%';
                    stt.textContent = '上传中 ' + Math.round(p) + '%';
                },
                doneOk: function () {
                    rowCancel.style.display = 'none';
                    if (fakeTimer) {
                        clearInterval(fakeTimer);
                        fakeTimer = null;
                    }
                    barWrap.classList.remove('ns-ni-pbar-ind');
                    barFill.style.width = '100%';
                    barFill.style.background = '#059669';
                    stt.textContent = '完成';
                    stt.style.color = '#059669';
                },
                doneErr: function (msg) {
                    rowCancel.style.display = 'none';
                    if (fakeTimer) {
                        clearInterval(fakeTimer);
                        fakeTimer = null;
                    }
                    barWrap.classList.remove('ns-ni-pbar-ind');
                    barFill.style.width = '100%';
                    barFill.style.background = '#dc2626';
                    stt.textContent = msg || '失败';
                    stt.style.color = '#dc2626';
                },
            };
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
        upPaste.textContent = '💡 [Ctrl+V] 可粘贴剪贴板中的图片（支持多张同时粘贴）';
        upLabel.appendChild(upTitle);
        upLabel.appendChild(upSub);
        upLabel.appendChild(upPaste);
        var fileIn = document.createElement('input');
        fileIn.type = 'file';
        fileIn.multiple = true;
        fileIn.accept = 'image/jpeg,image/png,image/gif,image/webp';
        fileIn.style.display = 'none';
        upLabel.appendChild(fileIn);
        niScroll.appendChild(upLabel);
        var linksBox = document.createElement('div');
        linksBox.style.marginBottom = '10px';
        niScroll.appendChild(linksBox);
        var refBtn = document.createElement('button');
        refBtn.type = 'button';
        refBtn.textContent = '刷新图片列表';
        refBtn.style.cssText = 'width:100%;padding:8px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;';
        niScroll.appendChild(refBtn);
        var GALLERY_PAGE_SIZE = 40;
        var galleryAllItems = [];
        var galleryPageIndex = 1;
        var listPagerBar = document.createElement('div');
        listPagerBar.style.cssText =
            'display:none;align-items:center;justify-content:center;gap:10px;margin:8px 0;flex-wrap:wrap;font-size:12px;color:#64748b;';
        var listPagerPrev = document.createElement('button');
        listPagerPrev.type = 'button';
        listPagerPrev.textContent = '上一页';
        listPagerPrev.style.cssText =
            'padding:4px 12px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;cursor:pointer;font-size:12px;';
        var listPagerInfo = document.createElement('span');
        listPagerInfo.style.cssText = 'min-width:120px;text-align:center;';
        var listPagerNext = document.createElement('button');
        listPagerNext.type = 'button';
        listPagerNext.textContent = '下一页';
        listPagerNext.style.cssText =
            'padding:4px 12px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;cursor:pointer;font-size:12px;';
        var listPagerSelectAll = document.createElement('button');
        listPagerSelectAll.type = 'button';
        listPagerSelectAll.textContent = '全选本页';
        listPagerSelectAll.style.cssText =
            'padding:4px 12px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;cursor:pointer;font-size:12px;';
        var listPagerDelSel = document.createElement('button');
        listPagerDelSel.type = 'button';
        listPagerDelSel.textContent = '删除选中';
        listPagerDelSel.style.cssText =
            'padding:4px 12px;border:1px solid #fecaca;background:#fef2f2;border-radius:4px;cursor:pointer;font-size:12px;color:#b91c1c;';
        listPagerBar.appendChild(listPagerPrev);
        listPagerBar.appendChild(listPagerInfo);
        listPagerBar.appendChild(listPagerNext);
        listPagerBar.appendChild(listPagerSelectAll);
        listPagerBar.appendChild(listPagerDelSel);
        niScroll.appendChild(listPagerBar);
        var listWrap = document.createElement('div');
        listWrap.style.cssText =
            'margin-top:10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-content:start;';
        niScroll.appendChild(listWrap);
        function syncGallerySelectAllBtn() {
            var boxes = listWrap.querySelectorAll('.ni-gal-sel:not(:disabled)');
            if (!boxes.length) {
                listPagerSelectAll.disabled = true;
                listPagerSelectAll.style.opacity = '0.45';
                listPagerSelectAll.textContent = '全选本页';
                return;
            }
            listPagerSelectAll.disabled = false;
            listPagerSelectAll.style.opacity = '1';
            var allChecked = true;
            for (var i = 0; i < boxes.length; i++) {
                if (!boxes[i].checked) {
                    allChecked = false;
                    break;
                }
            }
            listPagerSelectAll.textContent = allChecked ? '取消全选' : '全选本页';
        }
        listWrap.addEventListener('change', function (e) {
            if (e.target && e.target.classList && e.target.classList.contains('ni-gal-sel')) {
                syncGallerySelectAllBtn();
            }
        });

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
            var card = document.createElement('div');
            card.className = 'ni-gallery-card';
            if (imageId) card.dataset.niImageId = String(imageId);
            card.style.cssText =
                'border:1px solid #e2e8f0;border-radius:8px;padding:6px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.06);min-width:0;display:flex;flex-direction:column;';
            var thumbWrap = document.createElement('div');
            thumbWrap.style.cssText =
                'position:relative;width:100%;aspect-ratio:1;min-height:96px;overflow:hidden;border-radius:6px;background:#f1f5f9;margin-bottom:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;';
            var im = document.createElement('img');
            im.src = url;
            im.alt = '';
            im.loading = 'lazy';
            im.decoding = 'async';
            im.style.cssText = 'max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;';
            im.referrerPolicy = 'no-referrer';
            thumbWrap.appendChild(im);
            var selCb = document.createElement('input');
            selCb.type = 'checkbox';
            selCb.className = 'ni-gal-sel';
            selCb.title = imageId ? '勾选后可批量删除' : '无图片 ID，无法删除';
            selCb.style.cssText =
                'position:absolute;top:3px;left:3px;width:14px;height:14px;cursor:pointer;z-index:2;accent-color:#0d9488;';
            selCb.disabled = !imageId;
            selCb.onclick = function (ev) {
                ev.stopPropagation();
            };
            thumbWrap.appendChild(selCb);
            var thumbDelBtn = document.createElement('button');
            thumbDelBtn.type = 'button';
            thumbDelBtn.innerHTML = '&#128465;';
            thumbDelBtn.title = '删除';
            thumbDelBtn.style.cssText =
                'position:absolute;top:3px;right:3px;width:22px;height:22px;border:none;border-radius:50%;background:rgba(220,38,38,.92);color:#fff;font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;z-index:2;padding:0;box-shadow:0 1px 3px rgba(0,0,0,.18);';
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
                        else loadL();
                    })
                    .catch(function (e2) {
                        st(humanizeApiError(e2), true);
                    });
            };
            thumbWrap.appendChild(thumbDelBtn);
            thumbWrap.onclick = function (e) {
                if (e.target === thumbDelBtn || thumbDelBtn.contains(e.target)) return;
                if (e.target === selCb) return;
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
            var metaRow = document.createElement('div');
            metaRow.style.cssText =
                'display:flex;align-items:center;gap:6px;margin-bottom:4px;min-width:0;line-height:1.25;';
            var idEl = document.createElement('div');
            idEl.style.cssText =
                'font-size:11px;color:#334155;min-width:0;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;';
            var idLabel = imageId || fileName || '(无 id)';
            idEl.textContent = idLabel;
            if (idLabel && idLabel !== '(无 id)') idEl.title = idLabel;
            metaRow.appendChild(idEl);
            var dateEl = document.createElement('span');
            dateEl.style.cssText = 'font-size:10px;color:#94a3b8;flex-shrink:0;white-space:nowrap;';
            dateEl.textContent = dateStr;
            metaRow.appendChild(dateEl);
            card.appendChild(metaRow);
            var urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.readOnly = true;
            urlInput.value = url;
            urlInput.style.cssText =
                'width:100%;box-sizing:border-box;padding:4px 6px;border:1px solid #e2e8f0;border-radius:4px;font-size:11px;margin-bottom:5px;background:#f8fafc;height:26px;';
            card.appendChild(urlInput);
            var fmtRow = document.createElement('div');
            fmtRow.style.cssText = 'display:flex;gap:4px;flex-wrap:nowrap;margin-top:auto;';
            var modes = [
                { id: 'url', label: '\uD83D\uDD17', title: '链接' },
                { id: 'html', label: '</>', title: 'HTML' },
                { id: 'md', label: 'MD', title: 'MD' },
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
                b.title = m.title + ' · 双击插入';
                b.style.cssText =
                    'flex:1;min-width:0;padding:5px 3px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;font-size:10px;background:#e5e7eb;color:#6b7280;transition:all .15s;';
                b.onclick = function (e) {
                    e.stopPropagation();
                    modeRef.v = m.id;
                    syncInput();
                    paintFmt();
                };
                    b.ondblclick = function (e) {
                        e.stopPropagation();
                        modeRef.v = m.id;
                        syncInput();
                        paintFmt();
                        var snippet = formatSnippet(modeRef.v, url);
                        if (insertIntoForumEditor(snippet + '\n')) st('已插入 ' + m.title);
                        else copyText(snippet + '\n', function () { st('已复制'); }, function () {});
                    };
                m.btn = b;
                fmtRow.appendChild(b);
            });
            card.appendChild(fmtRow);
            syncInput();
            paintFmt();
            host.appendChild(card);
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

        function runUpload(file, batchMode, progressUi) {
            batchMode = !!batchMode;
            uploadAbortState.userAborted = false;
            uploadAbortState.abortScope = 'batch';
            if (uploadAbortState.stop) {
                return Promise.reject(Object.assign(new Error('已取消'), { code: 'ABORT' }));
            }
            var err = validateImageFile(file);
            if (err) {
                if (!batchMode) st(err, true);
                return Promise.reject(new Error(err));
            }
            var k;
            try {
                k = reqKey();
            } catch (e) {
                st(e.message, true);
                return Promise.reject(e);
            }
            if (progressUi && typeof progressUi.startUpload === 'function') {
                progressUi.startUpload();
            } else if (!batchMode) {
                st('上传中…');
            }
            var progressCb =
                progressUi && typeof progressUi.setLoadedTotal === 'function'
                    ? function (loaded, total) {
                          progressUi.setLoadedTotal(loaded, total);
                      }
                    : undefined;
            return niPostImageUpload(file, k, uploadAbortState, progressCb)
                .then(function (r) {
                    if (progressUi && typeof progressUi.doneOk === 'function') progressUi.doneOk();
                    if (!batchMode) {
                        linksBox.innerHTML = '';
                        niNotifyUploadSuccessToEditor(r.body, st, function (body) {
                            showLinks(body);
                            st('上传成功');
                        });
                        loadL();
                    }
                    return r;
                })
                .catch(function (e) {
                    var ab = isNiAbortErr(e);
                    var skipFile = e && e.code === 'ABORT_FILE';
                    var em = (e && e.message) || String(e);
                    if (progressUi && typeof progressUi.doneErr === 'function') {
                        if (skipFile || ab) progressUi.doneErr('已取消');
                        else progressUi.doneErr(em.length > 72 ? em.slice(0, 72) + '…' : em);
                    } else if (!batchMode && !ab && !skipFile) {
                        st(em, true);
                    }
                    throw e;
                });
        }
        function runUploadBatch(files) {
            if (!files || !files.length) return;
            var part = partitionUploadFiles(files);
            openUploadQueue();
            var MAX_INV_SHOW = 30;
            for (var ir = 0; ir < part.invalidRows.length; ir++) {
                if (ir >= MAX_INV_SHOW) break;
                addInvalidUploadRow(part.invalidRows[ir].name, part.invalidRows[ir].reason);
            }
            if (part.invalidRows.length > MAX_INV_SHOW) {
                var more = document.createElement('div');
                more.style.cssText = 'font-size:11px;color:#64748b;margin-bottom:6px;';
                more.textContent =
                    '… 另有 ' + (part.invalidRows.length - MAX_INV_SHOW) + ' 个不符合要求，已忽略（仅显示前 ' + MAX_INV_SHOW + ' 条）';
                (uploadQueueInv || uploadQueueBox).appendChild(more);
            }
            var skipped = part.skippedSize + part.skippedFormat;
            if (skipped > 0) {
                var bits = [];
                if (part.skippedSize) bits.push('超过 100MB：' + part.skippedSize + ' 个');
                if (part.skippedFormat) bits.push('格式/无效：' + part.skippedFormat + ' 个');
                st('已忽略 ' + skipped + ' 个（' + bits.join('；') + '），见上方红色说明', !part.valid.length);
            }
            if (!part.valid.length) {
                if (!skipped) st('没有可上传的文件', true);
                return;
            }
            files = part.valid;
            if (files.length === 1) {
                beginUploadSession();
                var ui1 = addProgressUploadRow(fileDisplayNameForTip(files[0]));
                runUpload(files[0], false, ui1).then(
                    function () {
                        endUploadSession();
                    },
                    function (e) {
                        endUploadSession();
                        if (isNiAbortErr(e)) {
                            st('已取消上传');
                        }
                    }
                );
                return;
            }
            beginUploadSession();
            var total = files.length;
            var i = 0;
            function step() {
                if (uploadAbortState.stop) {
                    endUploadSession();
                    st('已取消上传');
                    loadL();
                    return;
                }
                if (i >= total) {
                    endUploadSession();
                    st(
                        '已处理 ' +
                            total +
                            ' 张上传' +
                            (skipped > 0 ? '；另有 ' + skipped + ' 个已忽略' : '') +
                            '，见上方进度'
                    );
                    loadL();
                    return;
                }
                st('上传队列：第 ' + (i + 1) + ' / ' + total + ' 张…');
                var ui = addProgressUploadRow(fileDisplayNameForTip(files[i]));
                runUpload(files[i], true, ui)
                    .then(function (r) {
                        if (uploadAbortState.stop) {
                            endUploadSession();
                            st('已取消上传');
                            loadL();
                            return;
                        }
                        var urls = collectUrls(r && r.body ? r.body : null, []);
                        var seen = {};
                        var batchUniq = [];
                        urls.forEach(function (u) {
                            if (!seen[u]) {
                                seen[u] = true;
                                batchUniq.push(u);
                            }
                        });
                        if (batchUniq.length) {
                            var mdParts = batchUniq.map(function (u) { return formatSnippet('md', u); });
                            var mdAll = mdParts.join('\n') + '\n';
                            if (!insertIntoForumEditor(mdAll)) {
                                copyText(mdAll, function () {}, function () {});
                            }
                        }
                        i++;
                        step();
                    })
                    .catch(function (e) {
                        if (e && e.code === 'ABORT_FILE') {
                            i++;
                            step();
                            return;
                        }
                        if (isNiAbortErr(e) || uploadAbortState.stop) {
                            endUploadSession();
                            st('已取消上传');
                            loadL();
                            return;
                        }
                        i++;
                        step();
                    });
            }
            step();
        }

        upLabel.onclick = function (e) {
            if (e.target !== fileIn) fileIn.click();
        };
        fileIn.onchange = function () {
            var fs = fileIn.files;
            if (!fs || !fs.length) return;
            var arr = [];
            for (var j = 0; j < fs.length; j++) arr.push(fs[j]);
            fileIn.value = '';
            runUploadBatch(arr);
        };
        function niDataTransferHasFiles(dt) {
            if (!dt || !dt.types) return false;
            try {
                return dt.types.contains ? dt.types.contains('Files') : Array.prototype.indexOf.call(dt.types, 'Files') >= 0;
            } catch (e) {
                return false;
            }
        }
        function niHandleDialogFileDrop(e) {
            if (!niDataTransferHasFiles(e.dataTransfer)) return;
            e.preventDefault();
            e.stopPropagation();
            upLabel.style.borderColor = '#cbd5e1';
            var dt = e.dataTransfer;
            if (!dt || !dt.files || !dt.files.length) return;
            var arr = [];
            for (var d = 0; d < dt.files.length; d++) arr.push(dt.files[d]);
            runUploadBatch(arr);
        }
        el.addEventListener(
            'dragover',
            function (e) {
                if (niDataTransferHasFiles(e.dataTransfer)) {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        e.dataTransfer.dropEffect = 'copy';
                    } catch (e2) {}
                }
            },
            true
        );
        el.addEventListener('drop', niHandleDialogFileDrop, true);
        upLabel.ondragover = function (e) {
            if (!niDataTransferHasFiles(e.dataTransfer)) return;
            e.preventDefault();
            e.stopPropagation();
            upLabel.style.borderColor = '#0d9488';
        };
        upLabel.ondragleave = function (e) {
            e.preventDefault();
            if (!upLabel.contains(e.relatedTarget)) upLabel.style.borderColor = '#cbd5e1';
        };

        pasteHandler = function (ev) {
            if (!document.getElementById(id)) return;
            var cd = ev.clipboardData;
            if (!cd || !cd.items) return;
            var files = [];
            var baseT = Date.now();
            for (var i = 0; i < cd.items.length; i++) {
                var it = cd.items[i];
                if (it.type.indexOf('image') === -1) continue;
                var blob = it.getAsFile();
                if (!blob) continue;
                var name = fileNameFromClipboardBlob(blob, baseT, files.length);
                files.push(new File([blob], name, { type: blob.type || 'image/png' }));
            }
            if (!files.length) return;
            ev.preventDefault();
            ev.stopPropagation();
            runUploadBatch(files);
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
            galleryAllItems = [];
            galleryPageIndex = 1;
            listPagerBar.style.display = 'none';
        };
        function normList(b) {
            if (Array.isArray(b)) return b;
            if (b && typeof b === 'object') {
                if (Array.isArray(b.data)) return b.data;
                if (Array.isArray(b.images)) return b.images;
                if (Array.isArray(b.list)) return b.list;
                if (Array.isArray(b.results)) return b.results;
            }
            return [];
        }
        function extractPagingInfo(b) {
            if (!b || typeof b !== 'object') return null;
            var last = b.last_page;
            var cur = b.current_page;
            if (typeof last === 'number' && last >= 1) {
                return { last: last, current: typeof cur === 'number' ? cur : 1 };
            }
            if (b.meta && typeof b.meta === 'object') {
                if (typeof b.meta.last_page === 'number') {
                    return {
                        last: b.meta.last_page,
                        current: typeof b.meta.current_page === 'number' ? b.meta.current_page : 1,
                    };
                }
            }
            if (b.pagination && typeof b.pagination === 'object') {
                var lp = b.pagination.last_page;
                if (typeof lp === 'number' && lp >= 1) {
                    return {
                        last: lp,
                        current: typeof b.pagination.current_page === 'number' ? b.pagination.current_page : 1,
                    };
                }
            }
            var total = b.total;
            if (b.meta && typeof b.meta === 'object' && typeof b.meta.total === 'number') total = b.meta.total;
            var per = b.per_page || b.perPage;
            if (b.meta && typeof b.meta === 'object') {
                if (typeof b.meta.per_page === 'number') per = per || b.meta.per_page;
            }
            if (typeof total === 'number' && typeof per === 'number' && per > 0) {
                var lp2 = Math.max(1, Math.ceil(total / per));
                return {
                    last: lp2,
                    current: typeof b.current_page === 'number' ? b.current_page : typeof b.page === 'number' ? b.page : 1,
                };
            }
            return null;
        }
        function pickId(it) {
            if (!it || typeof it !== 'object') return '';
            if (it.id != null) return String(it.id);
            if (it.image_id != null) return String(it.image_id);
            if (it.uuid != null) return String(it.uuid);
            if (it.file_id != null) return String(it.file_id);
            if (it.filename != null) return String(it.filename);
            if (it.name != null) return String(it.name);
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
        function galleryDedupeKey(it) {
            if (!it || typeof it !== 'object') return '';
            var u = pickUrl(it);
            var pid = pickId(it);
            if (!u && pid) u = 'https://cdn.nodeimage.com/i/' + pid;
            if (!u) return '';
            var fromCdn = extractIdFromCdnUrl(u);
            if (fromCdn) return fromCdn;
            return u.replace(/\?.*$/, '').replace(/#.*$/, '');
        }
        function dedupeGalleryItems(items) {
            var seen = Object.create(null);
            var out = [];
            for (var di = 0; di < items.length; di++) {
                var it = items[di];
                var dk = galleryDedupeKey(it);
                if (!dk) continue;
                if (seen[dk]) continue;
                seen[dk] = true;
                out.push(it);
            }
            return out;
        }
        var CREATED_TIME_KEYS = [
            'created_at',
            'uploaded_at',
            'updated_at',
            'createdAt',
            'uploadTime',
            'created_time',
            'upload_time',
            'uploaded_time',
            'inserted_at',
            'timestamp',
            'ts',
            'time',
            'date',
        ];
        function rawToTimeMs(v) {
            if (v == null) return NaN;
            if (typeof v === 'number' && isFinite(v)) {
                return v < 1e12 ? v * 1000 : v;
            }
            if (typeof v === 'string') {
                var t = v.trim();
                if (!t) return NaN;
                if (/^\d+$/.test(t)) {
                    var n = parseInt(t, 10);
                    return n < 1e12 ? n * 1000 : n;
                }
            }
            var d = new Date(v);
            return isNaN(d.getTime()) ? NaN : d.getTime();
        }
        function pickCreatedDate(it) {
            if (!it || typeof it !== 'object') return '';
            for (var i = 0; i < CREATED_TIME_KEYS.length; i++) {
                var ms = rawToTimeMs(it[CREATED_TIME_KEYS[i]]);
                if (!isNaN(ms)) {
                    var d = new Date(ms);
                    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
                }
            }
            return '';
        }
        function pickCreatedTime(it) {
            if (!it || typeof it !== 'object') return 0;
            for (var ti = 0; ti < CREATED_TIME_KEYS.length; ti++) {
                var ms = rawToTimeMs(it[CREATED_TIME_KEYS[ti]]);
                if (!isNaN(ms) && ms > 0) return ms;
            }
            return 0;
        }
        function compareGalleryNewestFirst(a, b) {
            var tb = pickCreatedTime(b);
            var ta = pickCreatedTime(a);
            if (tb !== ta) return tb - ta;
            var idb = String(pickId(b) || '');
            var ida = String(pickId(a) || '');
            if (/^\d+$/.test(ida) && /^\d+$/.test(idb)) {
                return parseInt(idb, 10) - parseInt(ida, 10);
            }
            return idb.localeCompare(ida);
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
        function fetchAllImages(k) {
            var seen = Object.create(null);
            var all = [];
            var apiDeclaredTotal = 0;
            function noteDeclaredTotal(body) {
                if (!body || typeof body !== 'object') return;
                var t =
                    typeof body.total === 'number'
                        ? body.total
                        : body.meta && typeof body.meta.total === 'number'
                          ? body.meta.total
                          : body.pagination && typeof body.pagination.total === 'number'
                            ? body.pagination.total
                            : 0;
                if (t > 0) apiDeclaredTotal = Math.max(apiDeclaredTotal, t);
            }
            function merge(chunk) {
                (chunk || []).forEach(function (it) {
                    var pid = pickId(it);
                    var u = pickUrl(it);
                    if (!u && pid) u = 'https://cdn.nodeimage.com/i/' + pid;
                    if (!u) return;
                    var idForSeen = galleryDedupeKey(it);
                    if (!idForSeen) return;
                    if (seen[idForSeen]) return;
                    seen[idForSeen] = true;
                    all.push(it);
                });
            }
            function oneGet(url) {
                return gm({ method: 'GET', url: url, headers: { 'X-API-Key': k } }).then(function (r) {
                    return r.body;
                });
            }
            function mergeBody(body) {
                noteDeclaredTotal(body);
                merge(normList(body));
            }
            function doneEnough() {
                return apiDeclaredTotal > 0 && all.length >= apiDeclaredTotal;
            }
            function chainPages(baseNoQuery, fromP, toP) {
                if (fromP > toP) return Promise.resolve(all);
                if (doneEnough()) return Promise.resolve(all);
                var nBefore = all.length;
                return oneGet(baseNoQuery + '?page=' + fromP)
                    .then(function (body) {
                        mergeBody(body);
                        if (all.length === nBefore || doneEnough()) return all;
                        return chainPages(baseNoQuery, fromP + 1, toP);
                    })
                    .catch(function () {
                        return all;
                    });
            }
            function trySequentialUnknownPages(baseNoQuery, startP, maxExtra) {
                var p = startP;
                function step() {
                    if (p > startP + maxExtra || doneEnough()) return Promise.resolve(all);
                    return oneGet(baseNoQuery + '?page=' + p)
                        .then(function (body) {
                            var chunk = normList(body);
                            var n0 = all.length;
                            mergeBody(body);
                            if (!chunk.length || all.length === n0) return all;
                            p++;
                            return step();
                        })
                        .catch(function () {
                            return all;
                        });
                }
                return step();
            }
            function sweepOffsetForBase(baseNoQuery, maxSteps) {
                var guard = 0;
                function step() {
                    if (guard++ >= maxSteps || doneEnough()) return Promise.resolve(all);
                    var n0 = all.length;
                    return oneGet(baseNoQuery + '?offset=' + n0 + '&limit=100')
                        .then(function (body) {
                            mergeBody(body);
                            if (all.length === n0) return Promise.resolve(all);
                            return step();
                        })
                        .catch(function () {
                            return Promise.resolve(all);
                        });
                }
                return step();
            }
            function safeFirstBodies() {
                var u1 = API_V1 + '/list?limit=500';
                var u2 = API_BASE + '/api/images?limit=500';
                return Promise.all([
                    oneGet(u1)
                        .catch(function () {
                            return oneGet(API_V1 + '/list?per_page=500');
                        })
                        .catch(function () {
                            return oneGet(API_V1 + '/list');
                        })
                        .catch(function () {
                            return null;
                        }),
                    oneGet(u2)
                        .catch(function () {
                            return oneGet(API_BASE + '/api/images');
                        })
                        .catch(function () {
                            return null;
                        }),
                ]);
            }
            return safeFirstBodies()
                .then(function (bodies) {
                    var b1 = bodies[0];
                    var b2 = bodies[1];
                    if (b1) mergeBody(b1);
                    if (b2) mergeBody(b2);
                    if (all.length && (b1 || b2)) {
                        st(doneEnough() ? '已加载 ' + all.length + ' 张' : '已加载 ' + all.length + ' 张，同步剩余列表…');
                    }
                    if (doneEnough()) return Promise.resolve(all);
                    var pg1 = b1 ? extractPagingInfo(b1) : null;
                    var pg2 = b2 ? extractPagingInfo(b2) : null;
                    var cap1 = pg1 && pg1.last > 1 ? Math.min(pg1.last, 30) : 0;
                    var cap2 = pg2 && pg2.last > 1 ? Math.min(pg2.last, 30) : 0;
                    if (cap1 > 1) return chainPages(API_V1 + '/list', 2, cap1);
                    if (cap2 > 1) return chainPages(API_BASE + '/api/images', 2, cap2);
                    var len1 = b1 ? normList(b1).length : 0;
                    if (len1 >= 50 && all.length >= 50) return trySequentialUnknownPages(API_V1 + '/list', 2, 4);
                    return Promise.resolve(all);
                })
                .then(function () {
                    if (doneEnough()) return all;
                    if (all.length < 50) return all;
                    return sweepOffsetForBase(API_V1 + '/list', 25);
                })
                .then(function () {
                    if (doneEnough()) return all;
                    if (all.length < 50) return all;
                    return sweepOffsetForBase(API_BASE + '/api/images', 20);
                })
                .then(function () {
                    if (doneEnough()) return all;
                    if (all.length !== 50) return all;
                    return trySequentialUnknownPages(API_V1 + '/list', 2, 3);
                })
                .then(function () {
                    var arr = dedupeGalleryItems(all);
                    return { items: arr, declaredTotal: apiDeclaredTotal };
                });
        }
        function preloadGalleryThumbUrls(start, len) {
            var end = Math.min(start + len, galleryAllItems.length);
            for (var pi = start; pi < end; pi++) {
                var it = galleryAllItems[pi];
                var u = pickUrl(it);
                if (!u) {
                    var ppid = pickId(it);
                    if (ppid) u = 'https://cdn.nodeimage.com/i/' + ppid;
                }
                if (!u) continue;
                var pre = new Image();
                pre.referrerPolicy = 'no-referrer';
                pre.src = u;
            }
        }
        function renderGalleryPage() {
            listWrap.innerHTML = '';
            var total = galleryAllItems.length;
            var pages = Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE));
            if (galleryPageIndex > pages) galleryPageIndex = pages;
            if (galleryPageIndex < 1) galleryPageIndex = 1;
            var start = (galleryPageIndex - 1) * GALLERY_PAGE_SIZE;
            var slice = galleryAllItems.slice(start, start + GALLERY_PAGE_SIZE);
            slice.forEach(function (it) {
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
            if (total > 0) {
                listPagerBar.style.display = 'flex';
                listPagerInfo.textContent = '第 ' + galleryPageIndex + ' / ' + pages + ' 页（每页 ' + GALLERY_PAGE_SIZE + ' 张）';
                listPagerPrev.disabled = galleryPageIndex <= 1;
                listPagerNext.disabled = galleryPageIndex >= pages;
                listPagerPrev.style.opacity = galleryPageIndex <= 1 ? '0.45' : '1';
                listPagerNext.style.opacity = galleryPageIndex >= pages ? '0.45' : '1';
                var nextStart = galleryPageIndex * GALLERY_PAGE_SIZE;
                if (nextStart < total) {
                    setTimeout(function () {
                        preloadGalleryThumbUrls(nextStart, GALLERY_PAGE_SIZE);
                    }, 0);
                }
                if (galleryPageIndex > 1) {
                    var prevStart = (galleryPageIndex - 2) * GALLERY_PAGE_SIZE;
                    if (prevStart >= 0) {
                        setTimeout(function () {
                            preloadGalleryThumbUrls(prevStart, GALLERY_PAGE_SIZE);
                        }, 0);
                    }
                }
                syncGallerySelectAllBtn();
            } else {
                listPagerBar.style.display = 'none';
            }
        }
        function loadL() {
            var k;
            try {
                k = reqKey();
            } catch (e) {
                st(e.message);
                listWrap.innerHTML = '';
                galleryAllItems = [];
                galleryPageIndex = 1;
                listPagerBar.style.display = 'none';
                return;
            }
            st('加载列表…');
            listWrap.innerHTML = '';
            listPagerBar.style.display = 'none';
            fetchAllImages(k)
                .then(function (pack) {
                    var items = pack && pack.items ? pack.items : pack;
                    var declared = pack && typeof pack.declaredTotal === 'number' ? pack.declaredTotal : 0;
                    items = dedupeGalleryItems(items);
                    items.sort(compareGalleryNewestFirst);
                    galleryAllItems = items;
                    galleryPageIndex = 1;
                    var total = items.length;
                    var pages = Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE));
                    if (total) {
                        if (declared > total) {
                            st(
                                '已加载 ' +
                                    total +
                                    ' 张 · 接口声明共 ' +
                                    declared +
                                    ' 张 · 每页 ' +
                                    GALLERY_PAGE_SIZE +
                                    ' 张 · 共 ' +
                                    pages +
                                    ' 页'
                            );
                        } else {
                            st(
                                '共 ' +
                                    total +
                                    ' 张 · 每页 ' +
                                    GALLERY_PAGE_SIZE +
                                    ' 张 · 共 ' +
                                    pages +
                                    ' 页'
                            );
                        }
                    } else {
                        st('暂无图片');
                    }
                    renderGalleryPage();
                })
                .catch(function (e) {
                    st(e.message || String(e), true);
                    galleryAllItems = [];
                    listPagerBar.style.display = 'none';
                });
        }
        listPagerSelectAll.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            var boxes = listWrap.querySelectorAll('.ni-gal-sel:not(:disabled)');
            var allOn = true;
            for (var si = 0; si < boxes.length; si++) {
                if (!boxes[si].checked) {
                    allOn = false;
                    break;
                }
            }
            var want = !allOn;
            for (var sj = 0; sj < boxes.length; sj++) {
                boxes[sj].checked = want;
            }
            syncGallerySelectAllBtn();
        };
        listPagerDelSel.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            var ids = [];
            var cards = listWrap.querySelectorAll('.ni-gallery-card');
            for (var ci = 0; ci < cards.length; ci++) {
                var card = cards[ci];
                var cb = card.querySelector('.ni-gal-sel');
                if (cb && cb.checked && card.dataset.niImageId) {
                    ids.push(card.dataset.niImageId);
                }
            }
            if (!ids.length) {
                st('请先勾选要删除的图片', true);
                return;
            }
            if (!confirm('确定从图床删除选中的 ' + ids.length + ' 张图片？此操作不可恢复。')) return;
            var k2 = getK();
            if (!k2) {
                st('无 API Key', true);
                return;
            }
            st('删除中…');
            function deleteNext(idx, errors) {
                if (idx >= ids.length) {
                    if (errors.length) {
                        var parts = errors.slice(0, 3).map(function (x) {
                            return x.id + '：' + x.msg;
                        });
                        st(
                            '删完：成功 ' +
                                (ids.length - errors.length) +
                                ' 张，失败 ' +
                                errors.length +
                                ' 张（' +
                                parts.join('；') +
                                (errors.length > 3 ? '…' : '') +
                                '）',
                            true
                        );
                    } else {
                        st('已删除 ' + ids.length + ' 张');
                    }
                    loadL();
                    return;
                }
                deleteImageRequest(k2, ids[idx])
                    .then(function () {
                        deleteNext(idx + 1, errors);
                    })
                    .catch(function (err) {
                        errors.push({ id: ids[idx], msg: humanizeApiError(err) });
                        deleteNext(idx + 1, errors);
                    });
            }
            deleteNext(0, []);
        };
        listPagerPrev.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (galleryPageIndex > 1) {
                galleryPageIndex--;
                renderGalleryPage();
            }
        };
        listPagerNext.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            var pages = Math.max(1, Math.ceil(galleryAllItems.length / GALLERY_PAGE_SIZE));
            if (galleryPageIndex < pages) {
                galleryPageIndex++;
                renderGalleryPage();
            }
        };
        function runManualFetchKey() {
            st('正在从 nodeimage.com 获取密钥…');
            pullApiKeyWithGmXhr(function (key, lastMsg) {
                if (key) {
                    key = String(key).trim();
                    keyIn.value = key;
                    setK(key);
                    st('密钥已手动获取并保存');
                    loadL();
                    return;
                }
                var hint = lastMsg
                    ? '获取失败：' + lastMsg
                    : '获取失败：请确认已在同浏览器登录 nodeimage.com；或打开 nodeimage 顶部「API」页复制密钥后粘贴';
                st(hint, true);
            });
        }
        autoBtn.onclick = function () {
            runManualFetchKey();
        };
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
        if (getK().trim()) {
            loadL();
        } else {
            st('请点「手动获取」拉取密钥，或粘贴后点「保存密钥」');
        }
    }

    var NS_NI_MDE_BTN_CLASS = 'ns-ni-mde-toolbar-btn';
    function injectNsButtonIntoMdeToolbar(toolbar) {
        if (!toolbar || !toolbar.appendChild) return;
        if (toolbar.querySelector('.' + NS_NI_MDE_BTN_CLASS)) return;
        var sep = document.createElement('div');
        sep.className = 'sep';
        var span = document.createElement('span');
        span.className = 'toolbar-item ' + NS_NI_MDE_BTN_CLASS;
        span.setAttribute('role', 'button');
        span.tabIndex = 0;
        span.title = '选择图片上传到 NS 图床（Shift+点击打开管理面板）';
        span.textContent = 'NS图床';
        span.style.cssText =
            'font-size:12px;font-weight:600;color:#0d9488;padding:0 8px;white-space:nowrap;line-height:1;cursor:pointer;user-select:none;';
        function toolbarNsNiClick(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            try {
                if (e && e.shiftKey) {
                    openNi();
                    return;
                }
                niToolbarTriggerPickFiles();
            } catch (e2) {}
        }
        span.onclick = toolbarNsNiClick;
        span.onkeydown = function (e) {
            if (e.key === 'Enter' || e.key === ' ') toolbarNsNiClick(e);
        };
        toolbar.appendChild(sep);
        toolbar.appendChild(span);
    }
    function scanDocumentMdeToolbars() {
        try {
            var list = document.querySelectorAll('.mde-toolbar');
            for (var i = 0; i < list.length; i++) {
                injectNsButtonIntoMdeToolbar(list[i]);
            }
        } catch (e) {}
    }
    var nsNiMdeScanQueued = false;
    function scheduleMdeToolbarScan() {
        if (nsNiMdeScanQueued) return;
        nsNiMdeScanQueued = true;
        requestAnimationFrame(function () {
            nsNiMdeScanQueued = false;
            scanDocumentMdeToolbars();
        });
    }
    try {
        var nsNiMdeObserver = new MutationObserver(scheduleMdeToolbarScan);
        nsNiMdeObserver.observe(document.documentElement, { childList: true, subtree: true });
    } catch (eObs) {}
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleMdeToolbarScan);
    } else {
        scheduleMdeToolbarScan();
    }

    window.NodeSeekNodeImage = {
        open: openNi,
        pickAndUpload: niToolbarTriggerPickFiles,
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
            return gm({ method: 'GET', url: API_V1 + '/list', headers: { 'X-API-Key': k } });
        },
        getImage: function (imageId) {
            var k = getK();
            if (!k) return Promise.reject(new Error('无 API Key'));
            return gm({ method: 'GET', url: API_BASE + '/api/v1/list/' + encodeURIComponent(imageId), headers: { 'X-API-Key': k } });
        },
        deleteImage: function (imageId) {
            var k = getK();
            if (!k) return Promise.reject(new Error('无 API Key'));
            return deleteImageRequest(k, imageId);
        },
    };
})();
