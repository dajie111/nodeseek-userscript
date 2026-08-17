// ========== 表情包模块 ==========

(function(){
	'use strict';

    const CONFIG = {
        SERVER_URL_CACHED: null,
        API_LIST: '/api/emojis',
        STATIC_PREFIX: '/api/emoji_file/',
        // 分类名称映射：英文路径 -> 中文显示名称
        CATEGORY_NAMES: {
			'xiaohuangji': '小黄鸡',
			'dabiaoqing': 'Q图',
            'funny': '滑稽',
            'panda': '熊猫',
            'vtb': '万恶',            
        }
    };

	// 允许在本地保存服务器地址，便于快速切换
    const STORAGE = { SERVER_KEY: 'ns_emoji_server_url' };
	try{
		const saved = localStorage.getItem(STORAGE.SERVER_KEY);
		if(saved && typeof saved === 'string'){
			CONFIG.SERVER_URL = saved.replace(/\/$/, '');
		}
	}catch(_e){}

    function getServerUrl(){
        if (CONFIG.SERVER_URL_CACHED) return CONFIG.SERVER_URL_CACHED;
        try{
            const saved = localStorage.getItem(STORAGE.SERVER_KEY);
            if (saved && typeof saved === 'string'){
                CONFIG.SERVER_URL_CACHED = saved.replace(/\/$/, '');
                return CONFIG.SERVER_URL_CACHED;
            }
        }catch(_e){}

        const parts = [
            [104,98],              
            [46],                  
            [51,57,54,54,54,51],  
            [46],                  
            [120,121,122]         
        ];
        const domain = parts.map(a=>String.fromCharCode.apply(null, a)).join('');
        CONFIG.SERVER_URL_CACHED = 'https://' + domain;
        return CONFIG.SERVER_URL_CACHED;
    }

    // 将任意 URL 归一化为以"/"开头的路径（去掉域名和协议）
    // 同时将旧版 /emojis/ 路径迁移到 /api/emoji_file/，避免 Nginx 静态规则拦截
    function toRelativePath(url){
        if(!url) return '';
        try{
            if(url.startsWith('http://') || url.startsWith('https://')){
                const u = new URL(url);
                url = u.pathname + (u.search || '');
            }
        }catch(_e){}
        // 已经是相对路径，确保有前导斜杠
        if(!url.startsWith('/')) url = '/' + url;
        // 迁移旧路径：/emojis/xxx -> /api/emoji_file/xxx
        if(url.startsWith('/emojis/')){
            url = '/api/emoji_file/' + url.slice('/emojis/'.length);
        }
        return url;
    }

    // 将相对路径转换为完整 URL
    function toFullUrl(pathOrUrl){
        if(!pathOrUrl) return '';
        if(/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
        return getServerUrl() + (pathOrUrl.startsWith('/') ? pathOrUrl : ('/' + pathOrUrl));
    }

    const EmojiUI = {
		panelId: 'ns-emoji-panel',
		stylesId: 'ns-emoji-styles',
		items: [],
		filteredItems: [],
		isLoading: false,
		favKey: 'ns_emoji_favorites',
		favorites: [],
		currentCategory: '',

		ensureStyles(){
			if(document.getElementById(this.stylesId)) return;
			const style = document.createElement('style');
			style.id = this.stylesId;
			style.textContent = `
				/* 容器 */
				.ns-emoji-panel{position:fixed;right:24px;bottom:320px;width:780px;max-width:96vw;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18),0 2px 8px rgba(0,0,0,.06);z-index:10002;display:flex;flex-direction:column;animation:ns-emoji-fade-in .2s ease-out;overflow:hidden}
				.ns-emoji-panel{height:480px;max-height:75vh}
				@keyframes ns-emoji-fade-in{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}

				/* 头部 */
				.ns-emoji-header{display:flex;align-items:center;gap:6px;padding:10px 14px 8px;border-bottom:1px solid #f0f0f0;background:#fff;flex-shrink:0}
				.ns-emoji-title{display:none}

				/* 关闭按钮 */
				.ns-emoji-btn{appearance:none;border:0;background:transparent;border-radius:8px;width:32px;height:32px;font-size:18px;color:#999;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:0;line-height:1}
				.ns-emoji-btn:hover{background:#f5f5f5;color:#333}

				/* 内容区域 */
				.ns-emoji-body{padding:8px;overflow-y:auto;overflow-x:hidden;flex:1;scrollbar-width:thin;scrollbar-color:#ddd transparent}
				.ns-emoji-body::-webkit-scrollbar{width:6px}
				.ns-emoji-body::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px}
				.ns-emoji-body::-webkit-scrollbar-thumb:hover{background:#bbb}
				.ns-emoji-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;padding:12px}

				/* 卡片 - 纯emoji网格，图片hover放大溢出 */
				.ns-emoji-item{position:relative;border-radius:10px;aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .12s;overflow:visible}
				.ns-emoji-item:hover{background:#f0f4ff}
				.ns-emoji-item:active .ns-emoji-thumb{transform:scale(.9)}
				.ns-emoji-thumb{width:80%;height:80%;object-fit:contain;display:block;pointer-events:none;user-select:none;-webkit-user-drag:none;transition:transform .15s ease-out;transform-origin:center center;will-change:transform}
				.ns-emoji-item:hover .ns-emoji-thumb{transform:scale(1.7);z-index:10;position:relative}
				.ns-emoji-name{display:none}
				.ns-emoji-actions{display:none}
				.ns-emoji-mini-btn{display:none}
				.ns-emoji-empty{grid-column:1/-1;padding:60px 28px;color:#bbb;font-size:14px;text-align:center;line-height:1.6}
				.ns-emoji-loading{grid-column:1/-1;padding:60px 28px;color:#bbb;font-size:14px;text-align:center;line-height:1.6}
				.ns-emoji-server{font-size:12px;color:#64748b;white-space:nowrap}

				/* 分类标签 - 扁平下划线风格 */
				.ns-emoji-cats{flex:1;display:flex;gap:0;overflow:auto;padding:0;scrollbar-width:none}
				.ns-emoji-cats::-webkit-scrollbar{display:none}
				.ns-emoji-cat{white-space:nowrap;border:0;background:transparent;border-radius:0;padding:8px 14px;font-size:13px;color:#888;cursor:pointer;transition:all .15s;position:relative;font-weight:500;flex-shrink:0}
				.ns-emoji-cat:hover{color:#333;background:#f7f7f7;border-radius:8px}
				.ns-emoji-cat.active{color:#2563eb;font-weight:600}
				.ns-emoji-cat.active::after{content:'';position:absolute;bottom:-1px;left:14px;right:14px;height:2px;background:#2563eb;border-radius:1px}

				/* 拖动把手：左上角20px区域 */
				.ns-emoji-drag{position:absolute;left:0;top:0;width:20px;height:20px;cursor:move;z-index:2}

				/* 右键菜单 */
				#ns-emoji-menu{position:fixed;z-index:10003;min-width:160px;background:#fff;border:0;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.12),0 0 0 1px rgba(0,0,0,.04);overflow:hidden;padding:4px}
				#ns-emoji-menu button{display:block;width:100%;text-align:left;background:#fff;border:0;border-radius:6px;padding:8px 12px;font-size:13px;color:#333;cursor:pointer;transition:background .1s}
				#ns-emoji-menu button:hover{background:#f0f4ff;color:#2563eb}

				/* 移动端适配 */
				@media (max-width:480px){
					.ns-emoji-panel{width:96vw;right:2vw;left:2vw!important;bottom:20px!important;height:50vh;max-height:50vh;border-radius:16px 16px 0 0}
					.ns-emoji-grid{grid-template-columns:repeat(6,1fr)}
					.ns-emoji-cat{padding:8px 12px;font-size:14px}
					.ns-emoji-header{padding:10px 12px 8px}
				}

				/* 深色模式 */
				body.dark-layout .ns-emoji-panel,
				html[data-ns-theme='dark'] .ns-emoji-panel,
				html[data-theme='dark'] .ns-emoji-panel,
				html.dark .ns-emoji-panel,
				body.dark .ns-emoji-panel,
				body.theme-dark .ns-emoji-panel{background:#1e1e2e;border-color:#333}
				body.dark-layout .ns-emoji-header,
				html[data-ns-theme='dark'] .ns-emoji-header,
				html[data-theme='dark'] .ns-emoji-header,
				html.dark .ns-emoji-header,
				body.dark .ns-emoji-header,
				body.theme-dark .ns-emoji-header{background:#1e1e2e;border-bottom-color:#333}
				body.dark-layout .ns-emoji-btn:hover,
				html[data-ns-theme='dark'] .ns-emoji-btn:hover,
				html[data-theme='dark'] .ns-emoji-btn:hover,
				html.dark .ns-emoji-btn:hover,
				body.dark .ns-emoji-btn:hover,
				body.theme-dark .ns-emoji-btn:hover{background:#2d2d3f;color:#eee}
				body.dark-layout .ns-emoji-btn,
				html[data-ns-theme='dark'] .ns-emoji-btn,
				html[data-theme='dark'] .ns-emoji-btn,
				html.dark .ns-emoji-btn,
				body.dark .ns-emoji-btn,
				body.theme-dark .ns-emoji-btn{color:#888}
				body.dark-layout .ns-emoji-item:hover,
				html[data-ns-theme='dark'] .ns-emoji-item:hover,
				html[data-theme='dark'] .ns-emoji-item:hover,
				html.dark .ns-emoji-item:hover,
				body.dark .ns-emoji-item:hover,
				body.theme-dark .ns-emoji-item:hover{background:#2d2d4a}
				body.dark-layout .ns-emoji-cat,
				html[data-ns-theme='dark'] .ns-emoji-cat,
				html[data-theme='dark'] .ns-emoji-cat,
				html.dark .ns-emoji-cat,
				body.dark .ns-emoji-cat,
				body.theme-dark .ns-emoji-cat{color:#888}
				body.dark-layout .ns-emoji-cat:hover,
				html[data-ns-theme='dark'] .ns-emoji-cat:hover,
				html[data-theme='dark'] .ns-emoji-cat:hover,
				html.dark .ns-emoji-cat:hover,
				body.dark .ns-emoji-cat:hover,
				body.theme-dark .ns-emoji-cat:hover{color:#ccc;background:#2d2d3f}
				body.dark-layout .ns-emoji-cat.active,
				html[data-ns-theme='dark'] .ns-emoji-cat.active,
				html[data-theme='dark'] .ns-emoji-cat.active,
				html.dark .ns-emoji-cat.active,
				body.dark .ns-emoji-cat.active,
				body.theme-dark .ns-emoji-cat.active{color:#60a5fa}
				body.dark-layout .ns-emoji-cat.active::after,
				html[data-ns-theme='dark'] .ns-emoji-cat.active::after,
				html[data-theme='dark'] .ns-emoji-cat.active::after,
				html.dark .ns-emoji-cat.active::after,
				body.dark .ns-emoji-cat.active::after,
				body.theme-dark .ns-emoji-cat.active::after{background:#60a5fa}
				body.dark-layout #ns-emoji-menu,
				html[data-ns-theme='dark'] #ns-emoji-menu,
				html[data-theme='dark'] #ns-emoji-menu,
				html.dark #ns-emoji-menu,
				body.dark #ns-emoji-menu,
				body.theme-dark #ns-emoji-menu{background:#252535;box-shadow:0 6px 24px rgba(0,0,0,.4),0 0 0 1px rgba(255,255,255,.06)}
				body.dark-layout #ns-emoji-menu button,
				html[data-ns-theme='dark'] #ns-emoji-menu button,
				html[data-theme='dark'] #ns-emoji-menu button,
				html.dark #ns-emoji-menu button,
				body.dark #ns-emoji-menu button,
				body.theme-dark #ns-emoji-menu button{background:#252535;color:#ccc}
				body.dark-layout #ns-emoji-menu button:hover,
				html[data-ns-theme='dark'] #ns-emoji-menu button:hover,
				html[data-theme='dark'] #ns-emoji-menu button:hover,
				html.dark #ns-emoji-menu button:hover,
				body.dark #ns-emoji-menu button:hover,
				body.theme-dark #ns-emoji-menu button:hover{background:#2d2d4a;color:#60a5fa}
				body.dark-layout .ns-emoji-empty,
				html[data-ns-theme='dark'] .ns-emoji-empty,
				html[data-theme='dark'] .ns-emoji-empty,
				html.dark .ns-emoji-empty,
				body.dark .ns-emoji-empty,
				body.theme-dark .ns-emoji-empty{color:#555}
				body.dark-layout .ns-emoji-body::-webkit-scrollbar-thumb,
				html[data-ns-theme='dark'] .ns-emoji-body::-webkit-scrollbar-thumb,
				html[data-theme='dark'] .ns-emoji-body::-webkit-scrollbar-thumb,
				html.dark .ns-emoji-body::-webkit-scrollbar-thumb,
				body.dark .ns-emoji-body::-webkit-scrollbar-thumb,
				body.theme-dark .ns-emoji-body::-webkit-scrollbar-thumb{background:#444}
			`;
			document.head.appendChild(style);
		},

		loadFavorites(){
			try{
				const raw = localStorage.getItem(this.favKey);
				this.favorites = raw ? JSON.parse(raw) : [];
				if(!Array.isArray(this.favorites)) this.favorites = [];
			}catch(_e){ this.favorites = []; }
		},

		saveFavorites(){
			try{ localStorage.setItem(this.favKey, JSON.stringify(this.favorites.slice(0,200))); }catch(_e){}
		},

        addToFavorites(item){
			if(!item || !item.url) return;
			this.loadFavorites();
            const url = item.url.startsWith('http') ? item.url : (getServerUrl() + item.url);
			const name = item.name || '';
			// 去重：按归一化路径比较，兼容旧版 /emojis/ 路径
			const relUrl = toRelativePath(url);
			const idx = this.favorites.findIndex(x => x && (toRelativePath(x.url) === relUrl));
			if(idx >= 0){
				this.favorites.splice(idx, 1);
			}
			this.favorites.unshift({url, name, ts: Date.now()});
			// 限制数量
			if(this.favorites.length > 200){ this.favorites.length = 200; }
			this.saveFavorites();
		},

		findEditor(){
			// 兼容 CodeMirror 与普通 textarea
			const cm = document.querySelector('.CodeMirror');
			if(cm && cm.CodeMirror){
				return {
					type:'codemirror',
					setValue:(text)=>cm.CodeMirror.setValue(text),
					getValue:()=>cm.CodeMirror.getValue(),
					focus:()=>cm.CodeMirror.focus()
				};
			}
			const textarea = document.querySelector('textarea[placeholder*="鼓励友善发言"]')||document.querySelector('#code-mirror-editor textarea')||document.querySelector('.content-area textarea');
			if(textarea){
				return {
					type:'textarea',
					setValue:(text)=>{ textarea.value=text; textarea.dispatchEvent(new Event('input',{bubbles:true})); },
					getValue:()=>textarea.value,
					focus:()=>textarea.focus()
				};
			}
			return null;
		},

		insertMarkdown(url){
			const ed = this.findEditor();
			if(!ed){ alert('未找到评论编辑器'); return; }
			const cur = ed.getValue();
			const md = `![emoji](${url})`;
			ed.setValue(cur && cur.trim()!=='' ? (cur+"\n\n"+md) : md);
			ed.focus();
		},

		copyToClipboard(text){
			if(navigator.clipboard && navigator.clipboard.writeText){
				return navigator.clipboard.writeText(text).catch(()=>{});
			}
			const ta = document.createElement('textarea');
			ta.value=text; document.body.appendChild(ta); ta.select();
			try{ document.execCommand('copy'); }catch(_e){}
			finally{ ta.remove(); }
		},

        buildItem(item){
			const card = document.createElement('div');
			card.className = 'ns-emoji-item';
			const img = document.createElement('img');
			img.className='ns-emoji-thumb';
            // 统一归一化路径：/emojis/ -> /api/emoji_file/，绕过 Nginx 静态规则拦截，直达 Flask 后端
            const fullUrl = toFullUrl(toRelativePath(item.url));
            img.src = fullUrl;
			img.alt = item.name;
			img.loading = 'lazy';
            // 显式发送 origin 作为 Referer，确保服务端防盗链校验通过
            img.referrerPolicy = 'origin';
            img.draggable = false;
			// 点击卡片即插入（图片设了 pointer-events:none，事件冒泡到卡片）
            card.onclick = ()=> { this.addToFavorites({ ...item, url: fullUrl }); this.insertMarkdown(fullUrl); };
			// 右键/长按菜单：常用 -> 移除；其他分类 -> 加入常用
			const openContextMenu = (ev)=>{
				if(ev){ try{ ev.preventDefault(); ev.stopPropagation(); }catch(_e){} }
				const old = document.getElementById('ns-emoji-menu');
				if(old) old.remove();
				const menu = document.createElement('div');
				menu.id = 'ns-emoji-menu';
				const isFav = (this.currentCategory === '__fav__');
				const btn = document.createElement('button');
				btn.textContent = isFav ? '从常用表情中移除' : '加入常用表情';
				btn.onclick = ()=>{
					if(isFav){
						this.loadFavorites();
                        // 归一化路径后比较，兼容旧版 /emojis/ 路径存储的收藏
                        const targetRel = toRelativePath(item.url);
						this.favorites = this.favorites.filter(x => x && toRelativePath(x.url) !== targetRel);
						this.saveFavorites();
						this.loadList();
					}else{
						this.addToFavorites(item);
					}
					menu.remove();
				};
				menu.appendChild(btn);
            const x = (ev && (ev.clientX||0)) || 0;
				const y = (ev && (ev.clientY||0)) || 0;
				menu.style.left = x + 'px';
				menu.style.top = y + 'px';
				document.body.appendChild(menu);
				const close = (e2)=>{ if(menu && !menu.contains(e2.target)){ menu.remove(); document.removeEventListener('click', close, true); } };
				document.addEventListener('click', close, true);
			};
			card.addEventListener('contextmenu', openContextMenu);
			// 移动端长按
			let pressTimer; let moved=false;
            card.addEventListener('touchstart', (e)=>{ moved=false; pressTimer = setTimeout(()=> openContextMenu(e.touches && e.touches[0] ? {clientX:e.touches[0].clientX, clientY:e.touches[0].clientY, preventDefault:()=>{}, stopPropagation:()=>{}} : null), 600); }, {passive:true});
			card.addEventListener('touchmove', ()=>{ moved=true; clearTimeout(pressTimer); }, {passive:true});
			card.addEventListener('touchend', ()=>{ if(!moved) clearTimeout(pressTimer); }, {passive:true});
			card.appendChild(img);
			return card;
		},

		renderGrid(){
			const grid = document.getElementById('ns-emoji-grid');
			if(!grid) return;
			grid.innerHTML='';
			const arr = this.filteredItems.length ? this.filteredItems : this.items;
			if(arr.length===0){
				grid.innerHTML = '<div class="ns-emoji-empty">暂无表情文件</div>';
				return;
			}
			const frag = document.createDocumentFragment();
			arr.forEach(it=> frag.appendChild(this.buildItem(it)));
			grid.appendChild(frag);
		},

		filterByKeyword(kw){
			kw = (kw||'').trim().toLowerCase();
			if(!kw){ this.filteredItems = []; this.renderGrid(); return; }
			this.filteredItems = this.items.filter(it=> (it.name||'').toLowerCase().includes(kw));
			this.renderGrid();
		},

		async loadCategories(){
			const catsWrap = document.getElementById('ns-emoji-cats');
			if(!catsWrap) return;
			catsWrap.innerHTML = '';
			this.loadFavorites();
            try{
                const url = getServerUrl() + '/api/emoji_categories';
				let data = null;
				try{
					const res = await fetchWithTimeout(url, { credentials:'omit' }, 10000);
					data = await res.json();
					if(!res.ok || !data.success){ throw new Error(data && data.message ? data.message : ('HTTP '+res.status)); }
				}catch(err){
					data = await gmGetJSON(url, 10000);
					if(!data || data.success !== true){ throw err || new Error('请求失败'); }
				}
				const cats = Array.isArray(data.categories) ? data.categories : [];
				// 添加“常用表情”按钮（默认选中）
				const favBtn = document.createElement('button');
				favBtn.className = 'ns-emoji-cat';
				favBtn.dataset.cat = '__fav__';
				favBtn.textContent = '常用表情';
				favBtn.onclick = () => {
					[...catsWrap.querySelectorAll('.ns-emoji-cat')].forEach(b=>b.classList.remove('active'));
					favBtn.classList.add('active');
					this.currentCategory = '__fav__';
					this.loadList();
				};
				catsWrap.appendChild(favBtn);

				// 手动添加"小黄鸡"分类按钮到常用表情右边
				if (cats.includes('xiaohuangji')) {
					const xiaohuangjiBtn = document.createElement('button');
					xiaohuangjiBtn.className = 'ns-emoji-cat';
					xiaohuangjiBtn.dataset.cat = 'xiaohuangji';
					xiaohuangjiBtn.textContent = '小黄鸡';
					xiaohuangjiBtn.onclick = () => {
						[...catsWrap.querySelectorAll('.ns-emoji-cat')].forEach(b=>b.classList.remove('active'));
						xiaohuangjiBtn.classList.add('active');
						this.currentCategory = 'xiaohuangji';
						this.loadList();
					};
					catsWrap.appendChild(xiaohuangjiBtn);
				}

				cats.filter(c => c !== 'xiaohuangji').forEach(c => {
					const btn = document.createElement('button');
					btn.className = 'ns-emoji-cat';
					btn.dataset.cat = c;
					btn.textContent = CONFIG.CATEGORY_NAMES[c] || c; // 使用映射显示中文
					btn.onclick = () => {
						[...catsWrap.querySelectorAll('.ns-emoji-cat')].forEach(b=>b.classList.remove('active'));
						btn.classList.add('active');
						this.currentCategory = btn.dataset.cat || '';
						this.loadList();
					};
					catsWrap.appendChild(btn);
				});

				// 默认选中常用
				favBtn.classList.add('active');
				this.currentCategory = '__fav__';
				this.loadList();

                // 成功获取到分类后，尝试与服务端同步清理常用表情
                // 仅在全部分类及其列表都成功获取时才会执行清理
                this.syncFavoritesWithServerSafely(cats).catch(()=>{});
			}catch(e){
				console.warn('[NS Emoji] 类目加载失败:', e);
			}
		},

		async loadList(){
			if(this.isLoading) return;
			this.isLoading = true;
			const grid = document.getElementById('ns-emoji-grid');
			if(grid) grid.innerHTML = '<div class="ns-emoji-loading">加载中...</div>';
			try{
				const catsWrap = document.getElementById('ns-emoji-cats');
				let category = '';
				if(catsWrap){
					const active = catsWrap.querySelector('.ns-emoji-cat.active');
					category = active ? (active.dataset.cat || '') : '';
				}
				if(category === '__fav__'){
					this.loadFavorites();
                    this.items = (this.favorites || []).map(f => ({ name: f.name || '', url: toRelativePath(f.url) }));
					this.filteredItems = [];
					this.renderGrid();
					return;
				}
                const url = getServerUrl() + CONFIG.API_LIST + (category ? ('?category=' + encodeURIComponent(category)) : '');
				let data = null;
				// 先尝试 fetch（若被 CORS/CSP 拦截则回退到 GM_xmlhttpRequest）
				try{
					const res = await fetchWithTimeout(url, { credentials:'omit' }, 10000);
					data = await res.json();
					if(!res.ok || !data.success){ throw new Error(data && data.message ? data.message : ('HTTP '+res.status)); }
				}catch(fetchErr){
					// 回退 GM_xmlhttpRequest：不受页面 CSP 与 CORS 影响
					data = await gmGetJSON(url, 10000);
					if(!data || data.success !== true){ throw fetchErr || new Error('请求失败'); }
				}
				this.items = Array.isArray(data.items)? data.items: [];
				this.filteredItems = [];
				this.renderGrid();
			}catch(e){
                console.error('[NS Emoji] 加载失败:', e);
                if(grid) grid.innerHTML = `<div class="ns-emoji-empty">${(e && (e.name==='AbortError')) ? '网络超时（10秒）' : '加载失败，请稍后重试'}</div>`;
			}
			finally{
				this.isLoading = false;
			}
		},

        // 同步清理常用表情：只有在分类及每个分类的表情列表全部成功获取时才执行
        async syncFavoritesWithServerSafely(categories){
            try{
                if(!Array.isArray(categories)){
                    return; // 非法数据，放弃清理
                }

                // 分类为空时不进行任何清理，避免误删用户常用表情（可能是临时网络/服务异常）
                if(categories.length === 0){
                    return;
                }

                // 并发获取每个分类的表情列表
                const requests = categories.map(async (cat)=>{
                    const listUrl = getServerUrl() + CONFIG.API_LIST + '?category=' + encodeURIComponent(cat);
                    try{
                        let data = null;
                        try{
                            const res = await fetchWithTimeout(listUrl, { credentials:'omit' }, 10000);
                            data = await res.json();
                            if(!res.ok || !data.success){ throw new Error(data && data.message ? data.message : ('HTTP '+res.status)); }
                        }catch(err){
                            data = await gmGetJSON(listUrl, 10000);
                            if(!data || data.success !== true){ throw err || new Error('请求失败'); }
                        }
                        const items = Array.isArray(data.items) ? data.items : [];
                        return { ok: true, items };
                    }catch(_e){
                        return { ok: false, items: [] };
                    }
                });

                const results = await Promise.all(requests);
                // 若有任何分类获取失败，判定为网络/服务不稳定，放弃清理
                if(results.some(r => !r.ok)){
                    return;
                }

                // 汇总服务端有效路径集合（相对路径）
                const validPathSet = new Set();
                results.forEach(r => {
                    r.items.forEach(it => {
                        const p = toRelativePath(it && it.url);
                        if(p) validPathSet.add(p);
                    });
                });

                // 加载本地常用，剔除服务端已删除的
                this.loadFavorites();
                if(!Array.isArray(this.favorites) || this.favorites.length === 0){
                    return;
                }
                const beforeLen = this.favorites.length;
                this.favorites = this.favorites.filter(fav => {
                    const p = toRelativePath(fav && fav.url);
                    return p && validPathSet.has(p);
                });
                if(this.favorites.length !== beforeLen){
                    this.saveFavorites();
                    // 若当前在“常用表情”页，刷新列表
                    const catsWrap = document.getElementById('ns-emoji-cats');
                    const active = catsWrap ? catsWrap.querySelector('.ns-emoji-cat.active') : null;
                    const curCat = active ? (active.dataset.cat || '') : '';
                    if(curCat === '__fav__'){
                        this.loadList();
                    }
                }
            }catch(_e){
                // 忽略任何异常，不进行清理，避免误删
            }
        },

		open(){
			this.ensureStyles();
			let panel = document.getElementById(this.panelId);
			// 如果弹窗已存在且显示，则关闭它
			if(panel && panel.style.display !== 'none'){
				panel.style.display = 'none';
				return;
			}
			// 如果弹窗存在但隐藏，则显示它并重置位置
			if(panel){ 
				panel.style.display = 'flex';
				// 重置弹窗位置到默认位置
				panel.style.left = 'auto';
				panel.style.top = 'auto';
				panel.style.right = '24px';
				panel.style.bottom = '320px';
				return; 
			}
			// 创建新弹窗
			panel = document.createElement('div');
			panel.id = this.panelId;
			panel.className = 'ns-emoji-panel';
			panel.innerHTML = `
				<div class="ns-emoji-header">
					<div class="ns-emoji-title">表情包</div>
					<div id="ns-emoji-cats" class="ns-emoji-cats"></div>
					<button id="ns-emoji-close" class="ns-emoji-btn" title="关闭">✕</button>
					<div id="ns-emoji-drag" class="ns-emoji-drag" title="拖动"></div>
				</div>
				<div id="ns-emoji-body" class="ns-emoji-body">
					<div id="ns-emoji-grid" class="ns-emoji-grid"></div>
				</div>
			`;
			document.body.appendChild(panel);
			panel.querySelector('#ns-emoji-close').onclick = ()=>{ panel.style.display='none'; };
			// 载入类目后自动加载列表
			this.loadCategories().then(()=> this.loadList());

			// 拖动逻辑
			const dragHandle = panel.querySelector('#ns-emoji-drag');
			let isDragging=false, startX=0, startY=0, startLeft=0, startTop=0;
			const onMove = (e)=>{
				if(!isDragging) return;
				e.preventDefault();
				const cx = (e.clientX!==undefined?e.clientX:e.touches[0].clientX);
				const cy = (e.clientY!==undefined?e.clientY:e.touches[0].clientY);
				const dx = cx - startX;
				const dy = cy - startY;
				panel.style.left = (startLeft + dx) + 'px';
				panel.style.top = (startTop + dy) + 'px';
				panel.style.right = 'auto';
				panel.style.bottom = 'auto';
			};
			const onUp = ()=>{
				isDragging=false;
				document.removeEventListener('mousemove', onMove, true);
				document.removeEventListener('mouseup', onUp, true);
				document.removeEventListener('touchmove', onMove, true);
				document.removeEventListener('touchend', onUp, true);
			};
			const onDown = (e)=>{
				isDragging=true;
				e.preventDefault();
				const cx = (e.clientX!==undefined?e.clientX:e.touches[0].clientX);
				const cy = (e.clientY!==undefined?e.clientY:e.touches[0].clientY);
				startX = cx; startY = cy;
				const rect = panel.getBoundingClientRect();
				startLeft = rect.left; startTop = rect.top;
				document.addEventListener('mousemove', onMove, true);
				document.addEventListener('mouseup', onUp, true);
				document.addEventListener('touchmove', onMove, true);
				document.addEventListener('touchend', onUp, true);
			};
			dragHandle.addEventListener('mousedown', onDown, {passive:false});
			dragHandle.addEventListener('touchstart', onDown, {passive:false});
		}
	};

	// 暴露全局 API
	window.NodeSeekEmoji = {
		open: ()=> EmojiUI.open(),
		setServer(url){ if(url){ CONFIG.SERVER_URL = url.replace(/\/$/,''); try{ localStorage.setItem(STORAGE.SERVER_KEY, CONFIG.SERVER_URL); }catch(_e){} } }
	};

	// 悬浮按钮与热键
	function ensureLauncherStyles(){
		if(document.getElementById('ns-emoji-styles-launcher')) return;
		const style = document.createElement('style');
		style.id = 'ns-emoji-styles-launcher';
		style.textContent = `
			#ns-emoji-launcher{position:fixed;right:20px;bottom:100px;padding:10px 12px;border-radius:9999px;background:#2563eb;color:#fff;border:0;box-shadow:0 6px 20px rgba(0,0,0,.18);cursor:pointer;font-size:14px;z-index:10002}
			#ns-emoji-launcher:hover{background:#1d4ed8}
			@media (max-width: 480px){#ns-emoji-launcher{right:12px;bottom:80px;padding:8px 10px;font-size:13px}}
		`;
		document.head.appendChild(style);
	}

	function ensureLauncher(){
		if(document.getElementById('ns-emoji-launcher')) return;
		const btn = document.createElement('button');
		btn.id = 'ns-emoji-launcher';
		btn.type = 'button';
		btn.textContent = '表情';
		btn.addEventListener('click', ()=> {
			const p = document.getElementById('ns-emoji-panel');
			if(!p || getComputedStyle(p).display === 'none'){
				EmojiUI.open();
			}else{
				p.style.display = 'none';
			}
		});
		document.body.appendChild(btn);
	}

	function initAuto(){
		const mount = ()=>{ ensureLauncherStyles(); ensureLauncher(); };
		if(document.readyState === 'loading'){
			document.addEventListener('DOMContentLoaded', mount);
		}else{
			mount();
		}
		// Alt+E 打开面板
		window.addEventListener('keydown', (e)=>{
			if(e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && (e.key==='e' || e.key==='E')){
				EmojiUI.open();
			}
		});
		// SPA/异步渲染场景，定期确保按钮存在
		setInterval(()=>{
			if(!document.getElementById('ns-emoji-launcher')){
				ensureLauncherStyles();
				ensureLauncher();
			}
		}, 5000);
	}

    // 已移除自动悬浮按钮与定时保活，按钮UI由主脚本注入
    // initAuto();

	// fetch 超时封装
	function fetchWithTimeout(url, options = {}, timeoutMs = 10000){
		const ctl = new AbortController();
		const id = setTimeout(()=> ctl.abort(), timeoutMs);
		return fetch(url, { ...options, signal: ctl.signal }).finally(()=> clearTimeout(id));
	}

	// 使用 GM_xmlhttpRequest 获取 JSON，绕过 CSP/CORS
	function gmGetJSON(url, timeoutMs = 10000){
		return new Promise((resolve, reject)=>{
			if(typeof GM_xmlhttpRequest !== 'function'){
				reject(new Error('GM_xmlhttpRequest unavailable'));
				return;
			}
			let done = false;
			const timer = setTimeout(()=>{ if(!done){ done = true; reject(new Error('timeout')); } }, timeoutMs);
			GM_xmlhttpRequest({
				method: 'GET', url,
				headers: { 'Accept': 'application/json' },
				onload: (resp)=>{
					if(done) return; done = true; clearTimeout(timer);
					try{
						const data = JSON.parse(resp.responseText || 'null');
						resolve(data);
					}catch(e){ reject(e); }
				},
				onerror: ()=>{ if(done) return; done = true; clearTimeout(timer); reject(new Error('network error')); },
				ontimeout: ()=>{ if(done) return; done = true; clearTimeout(timer); reject(new Error('timeout')); }
			});
		});
	}
})();
