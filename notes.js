(function() {
	'use strict';

	// NodeSeek Notes 模块：仅提供逻辑与渲染，按钮与入口由主脚本负责
	const STORAGE_KEY = 'nodeseek_notes';
	const STORAGE_STATE_KEY = 'nodeseek_notes_state';

	const CDN = {
		marked: 'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js',
		highlight: 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/common.min.js',
		hlStyle: 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css'
	};

	function loadScriptOnce(url) {
		return new Promise((resolve, reject) => {
			if ([...document.scripts].some(s => s.src === url)) {
				resolve();
				return;
			}
			const s = document.createElement('script');
			s.src = url;
			s.onload = () => resolve();
			s.onerror = () => reject(new Error('脚本加载失败: ' + url));
			document.head.appendChild(s);
		});
	}

	function loadStyleOnce(url) {
		if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.href === url)) return;
		const l = document.createElement('link');
		l.rel = 'stylesheet';
		l.href = url;
		document.head.appendChild(l);
	}

	function uid() {
		return 'n_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
	}

	function nowStr() {
		const d = new Date();
		const pad = n => String(n).padStart(2, '0');
		return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
	}

	function readNotes() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return [];
			const arr = JSON.parse(raw);
			return Array.isArray(arr) ? arr : [];
		} catch (e) {
			return [];
		}
	}

	function saveNotes(list) {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
			return true;
		} catch (e) {
			alert('笔记保存失败：可能超出浏览器存储限制');
			return false;
		}
	}

	function getState() {
		try {
			return JSON.parse(localStorage.getItem(STORAGE_STATE_KEY) || '{}') || {};
		} catch {
			return {};
		}
	}

	function setState(patch) {
		const state = Object.assign({}, getState(), patch);
		localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(state));
	}

	function ensureDeps() {
		loadStyleOnce(CDN.hlStyle);
		return loadScriptOnce(CDN.marked).then(() => loadScriptOnce(CDN.highlight)).then(() => {
			if (window.marked && window.hljs) {
				try {
					window.marked.setOptions({
						highlight: function(code, lang) {
							try {
								if (lang && window.hljs.getLanguage(lang)) {
									return window.hljs.highlight(code, {language: lang}).value;
								}
								return window.hljs.highlightAuto(code).value;
							} catch (e) {
								return code;
							}
						}
					});
				} catch (e) {}
			}
		});
	}

	function createDialog() {
		const dialog = document.createElement('div');
		dialog.id = 'ns-notes-dialog';
		dialog.style.cssText = `
			position: fixed;
			left: 50%;
			top: 50%;
			transform: translate(-50%, -50%);
			width: 90%;
			max-width: 960px;
			max-height: 90vh;
			background: #ffffff;
			border-radius: 10px;
			box-shadow: 0 4px 20px rgba(0,0,0,0.25);
			z-index: 10050;
			overflow: hidden;
			font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		`;

		const header = document.createElement('div');
		header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#f7f7f7;border-bottom:1px solid #eee;cursor:move;';
		header.innerHTML = '<div style="font-weight:700;color:#333;">笔记</div>'+
			'<div><button id="ns-notes-new" style="margin-right:8px;background:#4CAF50;border:none;color:#fff;padding:6px 12px;border-radius:4px;cursor:pointer;">新建</button>'+
			'<button id="ns-notes-close" style="background:#999;border:none;color:#fff;padding:6px 12px;border-radius:4px;cursor:pointer;">关闭</button></div>';
		dialog.appendChild(header);

		const body = document.createElement('div');
		body.style.cssText = 'display:flex;gap:12px;padding:12px;max-height:calc(90vh - 56px);overflow:hidden;';
		body.innerHTML = `
			<div style="flex:0 0 260px;display:flex;flex-direction:column;border-right:1px solid #eee;overflow:hidden;">
				<div style="padding:8px 8px 8px 0;display:flex;gap:6px;align-items:center;">
					<input id="ns-notes-search" placeholder="搜索标题/内容/标签" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;"/>
					<button id="ns-notes-clear" style="padding:8px;border:1px solid #ddd;background:#fafafa;border-radius:6px;cursor:pointer;">清</button>
				</div>
				<div id="ns-notes-list" style="overflow:auto;flex:1;">
				</div>
			</div>
			<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
				<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
					<input id="ns-notes-title" placeholder="标题" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;"/>
					<input id="ns-notes-tags" placeholder="标签(逗号分隔)" style="flex:0 0 220px;padding:8px;border:1px solid #ddd;border-radius:6px;"/>
				</div>
				<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
					<button id="ns-notes-insert-image" style="padding:6px 10px;border:1px solid #ddd;background:#fafafa;border-radius:6px;cursor:pointer;">图片</button>
					<button id="ns-notes-insert-video" style="padding:6px 10px;border:1px solid #ddd;background:#fafafa;border-radius:6px;cursor:pointer;">视频</button>
					<button id="ns-notes-insert-code" style="padding:6px 10px;border:1px solid #ddd;background:#fafafa;border-radius:6px;cursor:pointer;">代码块</button>

					<input id="ns-notes-file" type="file" accept="image/*,video/*" style="display:none;"/>
				</div>
				<div style="display:flex;gap:8px;overflow:hidden;flex:1;">
					<textarea id="ns-notes-editor" placeholder="在此输入Markdown内容，支持图片/视频/代码块..." style="flex:1;padding:10px;border:1px solid #ddd;border-radius:6px;resize:none;min-height:260px;overflow:auto;"></textarea>
					<div id="ns-notes-preview" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:6px;overflow:auto;background:#fff;"></div>
				</div>
				<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
					<button id="ns-notes-delete" style="background:#f44336;border:none;color:#fff;padding:8px 14px;border-radius:6px;cursor:pointer;">删除</button>
					<button id="ns-notes-save" style="background:#2196F3;border:none;color:#fff;padding:8px 14px;border-radius:6px;cursor:pointer;">保存</button>
				</div>
			</div>
		`;
		dialog.appendChild(body);

		document.body.appendChild(dialog);

		if (window.makeDraggable) {
			window.makeDraggable(dialog, {width: 80, height: 40});
		}

		return dialog;
	}

	function renderList(list, activeId) {
		const listEl = document.getElementById('ns-notes-list');
		if (!listEl) return;
		const q = (document.getElementById('ns-notes-search')?.value || '').trim().toLowerCase();
		const filtered = list.filter(n => {
			if (!q) return true;
			const fields = [n.title || '', n.content || '', (n.tags || []).join(',')];
			return fields.join(' ').toLowerCase().includes(q);
		});
		listEl.innerHTML = '';
		if (filtered.length === 0) {
			const empty = document.createElement('div');
			empty.style.cssText = 'color:#999;padding:16px;';
			empty.textContent = '暂无笔记';
			listEl.appendChild(empty);
			return;
		}
		filtered.sort((a,b) => (b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||''));
		for (const n of filtered) {
			const item = document.createElement('div');
			item.style.cssText = 'padding:10px 8px;border-bottom:1px solid #f0f0f0;cursor:pointer;'+(n.id===activeId?'background:#eef6ff;':'');
			item.innerHTML = `
				<div style="font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(n.title || '(未命名)')}</div>
				<div style="color:#888;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml((n.tags||[]).join(', '))}</div>
				<div style="color:#aaa;font-size:11px;">${n.updatedAt || n.createdAt || ''}</div>
			`;
			item.onclick = () => selectNote(n.id);
			listEl.appendChild(item);
		}
	}

	function escapeHtml(s) {
		return (s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
	}

	function selectNote(id) {
		const notes = readNotes();
		const note = notes.find(n => n.id === id);
		if (!note) return;
		setState({activeId: id});
		const title = document.getElementById('ns-notes-title');
		const tags = document.getElementById('ns-notes-tags');
		const editor = document.getElementById('ns-notes-editor');
		if (title) title.value = note.title || '';
		if (tags) tags.value = (note.tags||[]).join(',');
		if (editor) editor.value = note.content || '';
		renderPreview();
		renderList(notes, id);
	}

	function newNote() {
		const notes = readNotes();
		const id = uid();
		const item = { id, title: '', content: '', tags: [], attachments: [], createdAt: nowStr(), updatedAt: nowStr() };
		notes.unshift(item);
		saveNotes(notes);
		setState({activeId: id});
		renderList(notes, id);
		setTimeout(() => {
			const title = document.getElementById('ns-notes-title');
			if (title) title.focus();
		}, 0);
	}

	function deleteNote() {
		const {activeId} = getState();
		if (!activeId) return;
		if (!confirm('确定删除该笔记吗？此操作不可恢复')) return;
		let notes = readNotes();
		notes = notes.filter(n => n.id !== activeId);
		saveNotes(notes);
		setState({activeId: notes[0]?.id || ''});
		clearEditor();
		renderList(notes, getState().activeId);
	}

	function clearEditor() {
		['ns-notes-title','ns-notes-tags','ns-notes-editor'].forEach(id => {
			const el = document.getElementById(id);
			if (el) el.value = '';
		});
		const preview = document.getElementById('ns-notes-preview');
		if (preview) preview.innerHTML = '';
	}

	function saveCurrent() {
		const {activeId} = getState();
		let notes = readNotes();
		let note = notes.find(n => n.id === activeId);
		if (!note) {
			// 新建
			note = { id: activeId || uid(), createdAt: nowStr(), attachments: [] };
			notes.unshift(note);
			setState({activeId: note.id});
		}
		note.title = document.getElementById('ns-notes-title')?.value || '';
		note.tags = (document.getElementById('ns-notes-tags')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
		note.content = document.getElementById('ns-notes-editor')?.value || '';
		note.updatedAt = nowStr();
		saveNotes(notes);
		renderList(notes, note.id);
		alert('已保存');
	}

	function renderPreview() {
		const src = document.getElementById('ns-notes-editor')?.value || '';
		const el = document.getElementById('ns-notes-preview');
		if (!el) return;
		if (window.marked) {
			el.innerHTML = window.marked.parse(src);
			if (window.hljs) {
				el.querySelectorAll('pre code').forEach(block => {
					window.hljs.highlightElement(block);
				});
			}
		} else {
			el.textContent = src;
		}
	}

	function insertAtCursor(textarea, text) {
		const start = textarea.selectionStart || 0;
		const end = textarea.selectionEnd || 0;
		const value = textarea.value || '';
		textarea.value = value.slice(0, start) + text + value.slice(end);
		textarea.selectionStart = textarea.selectionEnd = start + text.length;
		textarea.focus();
		renderPreview();
	}

	function handleInsertImage() {
		const choice = prompt('输入图片URL 或 留空从本地选择');
		if (choice && choice.trim()) {
			const editor = document.getElementById('ns-notes-editor');
			if (!editor) return;
			insertAtCursor(editor, `\n![](${choice.trim()})\n`);
			return;
		}
		const file = document.getElementById('ns-notes-file');
		if (!file) return;
		file.onchange = () => {
			const f = file.files && file.files[0];
			file.value = '';
			if (!f) return;
			const reader = new FileReader();
			reader.onload = () => {
				const editor = document.getElementById('ns-notes-editor');
				if (!editor) return;
				insertAtCursor(editor, `\n![](${reader.result})\n`);
			};
			reader.readAsDataURL(f);
		};
		file.click();
	}

	function handleInsertVideo() {
		const url = prompt('输入视频URL（建议mp4/avi/webm等可直链播放）');
		if (!url) return;
		const editor = document.getElementById('ns-notes-editor');
		if (!editor) return;
		const md = `\n<video src="${url.trim()}" controls style="max-width:100%"></video>\n`;
		insertAtCursor(editor, md);
	}

	function handleInsertCode() {
		const lang = prompt('输入代码语言(如 js, python, bash)，留空自动识别');
		const editor = document.getElementById('ns-notes-editor');
		if (!editor) return;
		const tpl = `\n\n\
\`\`\`${(lang||'').trim()}\n// 在此粘贴或输入你的代码...\n\`\`\`\n`;
		insertAtCursor(editor, tpl);
	}

	function bindEvents(dialog) {
		dialog.querySelector('#ns-notes-close')?.addEventListener('click', () => dialog.remove());
		dialog.querySelector('#ns-notes-new')?.addEventListener('click', newNote);
		dialog.querySelector('#ns-notes-save')?.addEventListener('click', saveCurrent);
		dialog.querySelector('#ns-notes-delete')?.addEventListener('click', deleteNote);
		dialog.querySelector('#ns-notes-clear')?.addEventListener('click', () => {
			document.getElementById('ns-notes-search').value = '';
			renderList(readNotes(), getState().activeId);
		});
		const search = dialog.querySelector('#ns-notes-search');
		if (search) {
			search.addEventListener('input', () => renderList(readNotes(), getState().activeId));
		}
		const editor = dialog.querySelector('#ns-notes-editor');
		if (editor) {
			editor.addEventListener('input', renderPreview);
		}
		dialog.querySelector('#ns-notes-insert-image')?.addEventListener('click', handleInsertImage);
		dialog.querySelector('#ns-notes-insert-video')?.addEventListener('click', handleInsertVideo);
		dialog.querySelector('#ns-notes-insert-code')?.addEventListener('click', handleInsertCode);
	}

	const NodeSeekNotes = {
		showDialog: function() {
			// 切换行为：存在则关闭
			const existed = document.getElementById('ns-notes-dialog');
			if (existed) { existed.remove(); return; }
			ensureDeps().then(() => {
				const dialog = createDialog();
				bindEvents(dialog);
				const notes = readNotes();
				renderList(notes, getState().activeId);
				// 恢复激活笔记
				if (getState().activeId) {
					selectNote(getState().activeId);
				} else if (notes.length > 0) {
					selectNote(notes[0].id);
				}
				// 初始渲染
				renderPreview();
			}).catch(err => {
				alert('加载依赖失败：' + err.message);
			});
		}
	};

	// 导出
	window.NodeSeekNotes = NodeSeekNotes;

})();


