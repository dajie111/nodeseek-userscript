// ========== 收藏 / 查看 ==========
(function () {
    'use strict';

    // 注入保护样式，防止阅读记忆脚本或浏览器默认的 visited 样式修改颜色
    if (!document.getElementById('ns-fav-base-styles')) {
        const style = document.createElement('style');
        style.id = 'ns-fav-base-styles';
        style.textContent = `
            #ns-fav-dialog .ns-fav-link { color: #1890ff !important; opacity: 1 !important; font-weight: normal !important; text-decoration: none !important; }
            #ns-fav-dialog .ns-fav-link:visited { color: #1890ff !important; }
            #ns-fav-dialog .ns-fav-link:hover { color: #40a9ff !important; text-decoration: underline !important; }
            #ns-fav-dialog .ns-fav-link * { color: inherit !important; opacity: inherit !important; font-weight: inherit !important; }
        `;
        document.head.appendChild(style);
    }

    const FAVORITES_KEY = 'nodeseek_favorites';
    const CATEGORIES_KEY = 'nodeseek_favorites_categories';

    function getFavorites() {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    }

    function setFavorites(list) {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
    }

    function getCategories() {
        return JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '[]');
    }

    function setCategories(list) {
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(list));
    }

    function addToFavorites(remark, category) {
        const title = document.title || '无标题';
        const url = location.href;
        const list = getFavorites();
        const existing = list.findIndex(f => f.url === url);

        if (existing !== -1) {
            list[existing].remark = remark;
            list[existing].category = category;
            list[existing].timestamp = new Date().toISOString();
        } else {
            list.push({
                title,
                url,
                remark: remark || '',
                category: category || '',
                timestamp: new Date().toISOString(),
                pinned: false
            });
        }
        setFavorites(list);
    }

    function removeFromFavorites(url) {
        let list = getFavorites();
        list = list.filter(f => f.url !== url);
        setFavorites(list);
    }

    function isCurrentPageFavorited() {
        const url = location.href;
        return getFavorites().some(f => f.url === url);
    }

    function getCurrentPageFavoriteRemark() {
        const url = location.href;
        const fav = getFavorites().find(f => f.url === url);
        return fav ? fav.remark : '';
    }

    function getCurrentPageFavoriteCategory() {
        const url = location.href;
        const fav = getFavorites().find(f => f.url === url);
        return fav ? fav.category : '';
    }

    function getPostIdFromUrl(url) {
        if (!url) return null;
        const m = String(url).match(/\/post-(\d+)/i);
        return m ? m[1] : null;
    }

    // NS 导入收藏
    const NS_COLLECTION_PRIVATE_RANK = 255;

    function isNsListCollectionPrivateRank(rank) {
        if (rank === NS_COLLECTION_PRIVATE_RANK) return true;
        if (rank === String(NS_COLLECTION_PRIVATE_RANK)) return true;
        const n = parseInt(rank, 10);
        return n === NS_COLLECTION_PRIVATE_RANK && !Number.isNaN(n);
    }

    function nsCollectLog(message) {
        if (typeof window.addLog === 'function') {
            window.addLog(message);
        }
    }

    async function importNsCollections(opts) {
        const filterPrivate = !!(opts && opts.filterPrivate);
        const headers = {
            Accept: 'application/json, text/plain, */*',
            'User-Agent': navigator.userAgent,
        };
        const allRows = [];
        let emptyStreak = 0;
        const maxPage = 500;
        for (let page = 1; page <= maxPage; page++) {
            let resp;
            try {
                resp = await fetch(`https://www.nodeseek.com/api/statistics/list-collection?page=${page}`, {
                    method: 'GET',
                    headers,
                    credentials: 'same-origin',
                });
            } catch (e) {
                throw new Error('网络错误：' + e.message);
            }
            if (!resp.ok) {
                if (resp.status === 401 || resp.status === 403) {
                    throw new Error('未登录或无权限，请先登录 NodeSeek 后再试。');
                }
                throw new Error('拉取失败：HTTP ' + resp.status);
            }
            let json;
            try {
                json = await resp.json();
            } catch (e) {
                throw new Error('接口返回不是有效 JSON');
            }
            if (!json || json.success !== true) {
                emptyStreak++;
                if (emptyStreak >= 2) break;
                continue;
            }
            const cols = json.collections;
            if (!Array.isArray(cols) || cols.length === 0) {
                emptyStreak++;
                if (emptyStreak >= 2) break;
                continue;
            }
            emptyStreak = 0;
            allRows.push(...cols);
            await new Promise(r => setTimeout(r, 280));
        }
        if (allRows.length === 0) {
            return { added: 0, skipped: 0, skippedPrivate: 0, totalApi: 0 };
        }
        let list = getFavorites();
        const existingIds = new Set();
        for (const fav of list) {
            const pid = getPostIdFromUrl(fav.url);
            if (pid) existingIds.add(pid);
        }
        let added = 0;
        let skipped = 0;
        let skippedPrivate = 0;
        const nowIso = new Date().toISOString();
        const toAdd = [];
        for (const col of allRows) {
            const pid = col && col.post_id != null ? String(col.post_id).trim() : '';
            if (!pid || !/^\d+$/.test(pid)) continue;
            if (filterPrivate && isNsListCollectionPrivateRank(col.rank)) {
                skippedPrivate++;
                continue;
            }
            if (existingIds.has(pid)) {
                skipped++;
                continue;
            }
            existingIds.add(pid);
            const title = (col.title && String(col.title).trim()) || '帖子 ' + pid;
            toAdd.push({
                title,
                url: 'https://www.nodeseek.com/post-' + pid + '-1',
                remark: '',
                category: '',
                timestamp: nowIso,
                pinned: false,
            });
            added++;
        }
        if (toAdd.length > 0) {
            const firstUnpinned = list.findIndex(item => !item.pinned);
            if (firstUnpinned === -1) {
                list.push(...toAdd);
            } else {
                list.splice(firstUnpinned, 0, ...toAdd);
            }
        }
        setFavorites(list);
        let logMsg = 'NS站内收藏导入：新增 ' + added + ' 条，跳过已存在 ' + skipped + ' 条（接口共 ' + allRows.length + ' 条）';
        if (skippedPrivate > 0) logMsg += '，未导入私有 ' + skippedPrivate + ' 条';
        nsCollectLog(logMsg);
        return { added, skipped, skippedPrivate, totalApi: allRows.length };
    }

    // 分类管理
    function truncateCategory(name) {
        const str = String(name).trim();
        if (!str) return '';
        
        let chineseCount = 0;
        let englishCount = 0;
        
        for (let i = 0; i < str.length; i++) {
            const isChinese = /[^\x00-\x7F]/.test(str[i]);
            if (isChinese) {
                chineseCount++;
            } else {
                englishCount++;
            }
        }
        
        if (chineseCount > 0 && englishCount === 0) {
            return str.substring(0, 4);
        } else if (englishCount > 0 && chineseCount === 0) {
            return str.substring(0, 8);
        } else {
            let width = 0;
            let end = str.length;
            for (let i = 0; i < str.length; i++) {
                const isChinese = /[^\x00-\x7F]/.test(str[i]);
                width += isChinese ? 2 : 1;
                if (width > 8) {
                    end = i;
                    break;
                }
            }
            return str.substring(0, end);
        }
    }

    function addCategory(name) {
        const cats = getCategories();
        const trimmed = truncateCategory(name);
        if (!trimmed) return false;
        if (cats.length >= 6) return false;
        if (cats.includes(trimmed)) return false;
        cats.push(trimmed);
        setCategories(cats);
        return true;
    }

    function removeCategory(name) {
        let cats = getCategories();
        cats = cats.filter(c => c !== name);
        setCategories(cats);
        const list = getFavorites();
        let changed = false;
        list.forEach(f => {
            if (f.category === name) {
                f.category = '';
                changed = true;
            }
        });
        if (changed) setFavorites(list);
    }

    function renameCategory(oldName, newName) {
        const trimmed = truncateCategory(newName);
        if (!trimmed) return false;
        const cats = getCategories();
        if (cats.includes(trimmed)) return false;
        const idx = cats.indexOf(oldName);
        if (idx === -1) return false;
        cats[idx] = trimmed;
        setCategories(cats);
        const list = getFavorites();
        let changed = false;
        list.forEach(f => {
            if (f.category === oldName) {
                f.category = trimmed;
                changed = true;
            }
        });
        if (changed) setFavorites(list);
        return true;
    }

    function togglePin(url) {
        const list = getFavorites();
        const item = list.find(f => f.url === url);
        if (item) {
            item.pinned = !item.pinned;
            setFavorites(list);
        }
    }

    function updateFavoriteRemark(url, remark) {
        const list = getFavorites();
        const item = list.find(f => f.url === url);
        if (item) {
            item.remark = remark;
            setFavorites(list);
        }
    }

    function updateFavoriteCategory(url, category) {
        const list = getFavorites();
        const item = list.find(f => f.url === url);
        if (item) {
            item.category = category;
            setFavorites(list);
        }
    }

    function formatDate(isoStr) {
        if (!isoStr) return '';
        try {
            const d = new Date(isoStr);
            const y = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const h = String(d.getHours()).padStart(2, '0');
            const mi = String(d.getMinutes()).padStart(2, '0');
            return y + '-' + mo + '-' + day + ' ' + h + ':' + mi;
        } catch (e) {
            return '';
        }
    }

    function isMobile() {
        if (window.NodeSeekFilter && typeof window.NodeSeekFilter.isMobileDevice === 'function') {
            return window.NodeSeekFilter.isMobileDevice();
        }
        return window.innerWidth <= 767;
    }

    function normalizeText(text) {
        const s = (text || '').toString();
        if (window.NodeSeekFilter && typeof window.NodeSeekFilter.normalizeText === 'function') {
            return window.NodeSeekFilter.normalizeText(s);
        }
        let t = s.replace(/\s+/g, '').toLowerCase();
        if (window.NodeSeekFilter && typeof window.NodeSeekFilter.convertTraditionalToSimplified === 'function') {
            t = window.NodeSeekFilter.convertTraditionalToSimplified(t);
        }
        return t;
    }

    function addCurrentPageToFavorites() {
        if (isCurrentPageFavorited()) {
            if (confirm('当前页面已在收藏中，是否修改？')) {
                showEditFavoriteDialog();
            }
            return;
        }
        showAddFavoriteDialog();
    }

    function showAddFavoriteDialog() {
        const mobile = isMobile();
        const desktopPos = `left:${Math.floor((window.innerWidth - 360) / 2)}px;top:${Math.floor(window.innerHeight * 0.25)}px;`;
        const mobilePos = 'left:50%;top:50%;transform:translate(-50%,-50%);';
        
        const dialog = document.createElement('div');
        dialog.id = 'ns-add-fav-dialog';
        dialog.style.cssText = 'position:fixed;z-index:99999;background:#fff;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.2);padding:20px;width:' + (mobile ? '90%' : '360px') + ';max-width:95vw;' + (mobile ? mobilePos : desktopPos);
        if (mobile) {
            dialog.style.padding = '16px';
        }

        const title = document.createElement('div');
        title.textContent = '添加收藏';
        title.style.cssText = 'font-weight:bold;font-size:16px;margin-bottom:14px;';
        dialog.appendChild(title);

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '\u00d7';
        closeBtn.style.cssText = 'position:absolute;right:12px;top:8px;cursor:pointer;font-size:22px;';
        closeBtn.onclick = function() { dialog.remove(); };
        dialog.appendChild(closeBtn);

        const pageTitle = document.createElement('div');
        pageTitle.textContent = '页面：' + (document.title || '无标题');
        pageTitle.style.cssText = 'font-size:13px;color:#666;margin-bottom:10px;word-break:break-all;';
        dialog.appendChild(pageTitle);

        const catLabel = document.createElement('div');
        catLabel.textContent = '分类';
        catLabel.style.cssText = 'font-size:13px;margin-bottom:6px;';
        dialog.appendChild(catLabel);

        const cats = getCategories();
        const catSelect = document.createElement('select');
        catSelect.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-bottom:10px;font-size:14px;';
        
        const defOpt = document.createElement('option');
        defOpt.value = '';
        defOpt.textContent = '全部分类';
        catSelect.appendChild(defOpt);

        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            catSelect.appendChild(opt);
        });
        dialog.appendChild(catSelect);

        const remarkLabel = document.createElement('div');
        remarkLabel.textContent = '备注';
        remarkLabel.style.cssText = 'font-size:13px;margin-bottom:6px;';
        dialog.appendChild(remarkLabel);

        const remarkInput = document.createElement('textarea');
        remarkInput.placeholder = '可选，填写备注信息';
        remarkInput.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-bottom:14px;font-size:14px;resize:vertical;min-height:60px;box-sizing:border-box;';
        dialog.appendChild(remarkInput);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:10px;';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = 'flex:1;padding:9px;background:#f0f0f0;border:none;border-radius:4px;cursor:pointer;font-size:14px;';
        cancelBtn.onclick = function() { dialog.remove(); };
        btnRow.appendChild(cancelBtn);

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存';
        saveBtn.style.cssText = 'flex:1;padding:9px;background:#1890ff;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;';
        saveBtn.onclick = function() {
            addToFavorites(remarkInput.value, catSelect.value);
            if (typeof window.addLog === 'function') {
                window.addLog('添加收藏：' + (document.title || '无标题'));
            }
            dialog.remove();
        };
        btnRow.appendChild(saveBtn);
        dialog.appendChild(btnRow);

        document.body.appendChild(dialog);
        remarkInput.focus();

        if (!mobile && typeof makeDraggable === 'function') {
            makeDraggable(dialog, {width: 20, height: 20});
        }
    }

    function showEditFavoriteDialog() {
        const url = location.href;
        const fav = getFavorites().find(f => f.url === url);
        if (!fav) return;

        const mobile = isMobile();
        const desktopPos = `left:${Math.floor((window.innerWidth - 360) / 2)}px;top:${Math.floor(window.innerHeight * 0.25)}px;`;
        const mobilePos = 'left:50%;top:50%;transform:translate(-50%,-50%);';
        
        const dialog = document.createElement('div');
        dialog.id = 'ns-add-fav-dialog';
        dialog.style.cssText = 'position:fixed;z-index:99999;background:#fff;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.2);padding:20px;width:' + (mobile ? '90%' : '360px') + ';max-width:95vw;' + (mobile ? mobilePos : desktopPos);

        const title = document.createElement('div');
        title.textContent = '编辑收藏';
        title.style.cssText = 'font-weight:bold;font-size:16px;margin-bottom:14px;';
        dialog.appendChild(title);

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '\u00d7';
        closeBtn.style.cssText = 'position:absolute;right:12px;top:8px;cursor:pointer;font-size:22px;';
        closeBtn.onclick = function() { dialog.remove(); };
        dialog.appendChild(closeBtn);

        const pageTitle = document.createElement('div');
        pageTitle.textContent = '页面：' + (document.title || '无标题');
        pageTitle.style.cssText = 'font-size:13px;color:#666;margin-bottom:10px;word-break:break-all;';
        dialog.appendChild(pageTitle);

        const catLabel = document.createElement('div');
        catLabel.textContent = '分类';
        catLabel.style.cssText = 'font-size:13px;margin-bottom:6px;';
        dialog.appendChild(catLabel);

        const cats = getCategories();
        const catSelect = document.createElement('select');
        catSelect.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-bottom:10px;font-size:14px;';
        
        const defOpt = document.createElement('option');
        defOpt.value = '';
        defOpt.textContent = '全部分类';
        if (!fav.category) defOpt.selected = true;
        catSelect.appendChild(defOpt);

        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            if (c === fav.category) opt.selected = true;
            catSelect.appendChild(opt);
        });
        dialog.appendChild(catSelect);

        const remarkLabel = document.createElement('div');
        remarkLabel.textContent = '备注';
        remarkLabel.style.cssText = 'font-size:13px;margin-bottom:6px;';
        dialog.appendChild(remarkLabel);

        const remarkInput = document.createElement('textarea');
        remarkInput.placeholder = '可选，填写备注信息';
        remarkInput.value = fav.remark || '';
        remarkInput.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-bottom:14px;font-size:14px;resize:vertical;min-height:60px;box-sizing:border-box;';
        dialog.appendChild(remarkInput);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:10px;';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = 'flex:1;padding:9px;background:#f0f0f0;border:none;border-radius:4px;cursor:pointer;font-size:14px;';
        cancelBtn.onclick = function() { dialog.remove(); };
        btnRow.appendChild(cancelBtn);

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存';
        saveBtn.style.cssText = 'flex:1;padding:9px;background:#1890ff;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;';
        saveBtn.onclick = function() {
            addToFavorites(remarkInput.value, catSelect.value);
            dialog.remove();
        };
        btnRow.appendChild(saveBtn);
        dialog.appendChild(btnRow);

        document.body.appendChild(dialog);

        if (!mobile && typeof makeDraggable === 'function') {
            makeDraggable(dialog, {width: 20, height: 20});
        }
    }

    function updateCategoryFilterDropdown() {
        const dlg = document.getElementById('ns-fav-dialog');
        if (!dlg) return;
        const catFilter = dlg.querySelector('#ns-fav-cat-filter');
        if (!catFilter) return;

        const currentVal = catFilter.value;
        catFilter.innerHTML = '';
        const allOpt = document.createElement('option');
        allOpt.value = '全部';
        allOpt.textContent = '全部分类';
        catFilter.appendChild(allOpt);

        const cats = getCategories();
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            catFilter.appendChild(opt);
        });

        if (currentVal === '全部' || cats.includes(currentVal)) {
            catFilter.value = currentVal;
        } else {
            catFilter.value = '全部';
        }
    }

    function showCategoryManageDialog() {
        const existing = document.getElementById('ns-cat-manage-dialog');
        if (existing) { existing.remove(); return; }

        const mobile = isMobile();
        const desktopPos = `left:${Math.floor((window.innerWidth - 300) / 2)}px;top:${Math.floor(window.innerHeight * 0.25)}px;`;
        const mobilePos = 'left:50%;top:50%;transform:translate(-50%,-50%);';
        
        const dialog = document.createElement('div');
        dialog.id = 'ns-cat-manage-dialog';
        dialog.style.cssText = 'position:fixed;z-index:99998;background:#fff;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.2);padding:20px;width:' + (mobile ? '90%' : '300px') + ';max-width:95vw;' + (mobile ? mobilePos : desktopPos);

        // 顶部标题栏
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;';

        const title = document.createElement('div');
        title.textContent = '分类管理';
        title.style.cssText = 'font-weight:bold;font-size:16px;color:#333;';
        header.appendChild(title);

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '\u00d7';
        closeBtn.style.cssText = 'cursor:pointer;font-size:22px;color:#999;line-height:1;';
        closeBtn.onclick = function() { dialog.remove(); };
        header.appendChild(closeBtn);
        dialog.appendChild(header);

        // 分类列表区域
        const listArea = document.createElement('div');
        listArea.style.cssText = 'min-height:80px;display:flex;flex-direction:column;justify-content:center;margin-bottom:16px;';

        const cats = getCategories();
        
        if (cats.length === 0) {
            // 暂无分类状态
            const emptyText = document.createElement('div');
            emptyText.textContent = '暂无分类';
            emptyText.style.cssText = 'text-align:center;color:#999;font-size:14px;';
            listArea.appendChild(emptyText);
        } else {
            // 有分类时的列表
            listArea.style.justifyContent = 'flex-start';
            cats.forEach(cat => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;';

                const catSpan = document.createElement('span');
                catSpan.textContent = cat;
                catSpan.style.cssText = 'flex:1;font-size:14px;color:#333;';
                row.appendChild(catSpan);

                if (cat) {
                    const editBtn = document.createElement('button');
                    editBtn.textContent = '改名';
                    editBtn.style.cssText = 'padding:4px 10px;font-size:12px;background:#f0f0f0;color:#333;border:none;border-radius:4px;cursor:pointer;';
                    editBtn.onclick = function() {
                        const newName = prompt('输入新名称（中文4个/英文8个）：', cat);
                        if (newName && newName.trim()) {
                            renameCategory(cat, newName);
                            updateCategoryFilterDropdown(); 
                            refreshFavoritesDialog();       
                            dialog.remove();
                            showCategoryManageDialog();
                        }
                    };
                    row.appendChild(editBtn);

                    const delBtn = document.createElement('button');
                    delBtn.textContent = '删除';
                    delBtn.style.cssText = 'padding:4px 10px;font-size:12px;background:#ff4d4f;color:#fff;border:none;border-radius:4px;cursor:pointer;';
                    delBtn.onclick = function() {
                        if (confirm('删除分类「' + cat + '」？该分类下的收藏将移入全部分类。')) {
                            removeCategory(cat);
                            updateCategoryFilterDropdown(); 
                            refreshFavoritesDialog();       
                            dialog.remove();
                            showCategoryManageDialog();
                        }
                    };
                    row.appendChild(delBtn);
                }
                listArea.appendChild(row);
            });
        }
        dialog.appendChild(listArea);

        // 分割线
        const separator = document.createElement('div');
        separator.style.cssText = 'height:1px;background:#eee;margin:0 0 16px 0;';
        dialog.appendChild(separator);

        // 添加新分类区域
        const addArea = document.createElement('div');
        
        const addLabel = document.createElement('div');
        addLabel.textContent = '添加新分类（最多6个）';
        addLabel.style.cssText = 'font-size:13px;color:#666;margin-bottom:8px;';
        addArea.appendChild(addLabel);

        const addRow = document.createElement('div');
        addRow.style.cssText = 'display:flex;gap:8px;';

        const addInput = document.createElement('input');
        addInput.type = 'text';
        addInput.placeholder = '新分类名（中文4/英文8）';
        addInput.style.cssText = 'flex:1;padding:8px 10px;border:1px solid #ddd;border-radius:4px;font-size:14px;';
        
        let lastValidVal = '';
        let isComposing = false;

        addInput.addEventListener('compositionstart', function() {
            isComposing = true;
        });

        addInput.addEventListener('compositionend', function() {
            isComposing = false;
            checkLimit();
        });

        addInput.addEventListener('input', function() {
            if (isComposing) return;
            checkLimit();
        });

        function checkLimit() {
            let str = addInput.value;
            let width = 0;
            let overLimit = false;
            for (let i = 0; i < str.length; i++) {
                width += /[^\x00-\x7F]/.test(str[i]) ? 2 : 1;
                if (width > 8) {
                    overLimit = true;
                    break;
                }
            }
            
            if (overLimit) {
                addInput.value = lastValidVal;
            } else {
                lastValidVal = addInput.value;
            }
        }

        // 如果达到上限，禁用输入框
        if (cats.length >= 6) {
            addInput.disabled = true;
            addInput.placeholder = '分类已达上限';
            addInput.style.background = '#f5f5f5';
        }
        addRow.appendChild(addInput);

        const addBtn = document.createElement('button');
        addBtn.textContent = '添加';
        addBtn.style.cssText = 'padding:0 16px;background:#1890ff;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;white-space:nowrap;';
        
        // 如果达到上限，禁用按钮
        if (cats.length >= 6) {
            addBtn.disabled = true;
            addBtn.style.background = '#ccc';
            addBtn.style.cursor = 'not-allowed';
        }

        addBtn.onclick = function() {
            if (cats.length >= 6) return;
            if (addInput.value.trim()) {
                const ok = addCategory(addInput.value);
                if (ok) {
                    updateCategoryFilterDropdown(); 
                    refreshFavoritesDialog();       
                    dialog.remove();
                    showCategoryManageDialog();
                } else {
                    alert('添加失败：名称已存在或包含非法字符');
                }
            }
        };
        addRow.appendChild(addBtn);
        addArea.appendChild(addRow);
        
        dialog.appendChild(addArea);
        document.body.appendChild(dialog);

        if (!mobile && typeof makeDraggable === 'function') {
            makeDraggable(dialog, {width: 20, height: 20});
        }
    }

    function showCategorySelectDialog(favUrl, currentCat, triggerEl, onSelect) {
        const existing = document.getElementById('ns-cat-select-dialog');
        
        if (existing) {
            const isSameTrigger = existing.dataset.favUrl === favUrl;
            if (existing._closeHandler) {
                document.removeEventListener('click', existing._closeHandler);
            }
            existing.remove();
            if (isSameTrigger) {
                return null;
            }
        }

        const cats = getCategories();
        const dialog = document.createElement('div');
        dialog.id = 'ns-cat-select-dialog';
        dialog.dataset.favUrl = favUrl; 
        
        dialog.style.cssText = 'position:absolute;z-index:99999;background:#fff;border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,0.15);padding:4px 0;text-align:center;box-sizing:border-box;';
        
        if (triggerEl) {
            dialog.style.minWidth = triggerEl.offsetWidth + 'px';
        }

        const noCatItem = document.createElement('div');
        noCatItem.textContent = '全部分类';
        const isNoCat = !currentCat || currentCat === '';
        noCatItem.style.cssText = 'padding:4px 8px;cursor:pointer;font-size:11px;line-height:1.5;white-space:nowrap;box-sizing:border-box;width:100%;' + (isNoCat ? 'background:#e6f7ff;color:#1890ff;font-weight:bold;' : 'color:#333;');
        noCatItem.onclick = function(e) {
            e.stopPropagation();
            updateFavoriteCategory(favUrl, '');
            if (dialog._closeHandler) document.removeEventListener('click', dialog._closeHandler);
            dialog.remove();
            
            if (typeof onSelect === 'function') {
                onSelect('');
            } else {
                refreshFavoritesDialog();
            }
        };
        noCatItem.addEventListener('mouseenter', function() { noCatItem.style.background = '#f0f0f0'; });
        noCatItem.addEventListener('mouseleave', function() { noCatItem.style.background = isNoCat ? '#e6f7ff' : ''; });
        dialog.appendChild(noCatItem);

        cats.forEach(cat => {
            const item = document.createElement('div');
            item.textContent = cat;
            item.style.cssText = 'padding:4px 8px;cursor:pointer;font-size:11px;line-height:1.5;white-space:nowrap;box-sizing:border-box;width:100%;' + (cat === currentCat ? 'background:#e6f7ff;color:#1890ff;font-weight:bold;' : 'color:#333;');
            item.onclick = function(e) {
                e.stopPropagation();
                updateFavoriteCategory(favUrl, cat);
                if (dialog._closeHandler) document.removeEventListener('click', dialog._closeHandler);
                dialog.remove();
                
                if (typeof onSelect === 'function') {
                    onSelect(cat);
                } else {
                    refreshFavoritesDialog();
                }
            };
            item.addEventListener('mouseenter', function() { item.style.background = '#f0f0f0'; });
            item.addEventListener('mouseleave', function() { item.style.background = cat === currentCat ? '#e6f7ff' : ''; });
            dialog.appendChild(item);
        });

        if (triggerEl && triggerEl.parentElement) {
            const parent = triggerEl.parentElement;
            parent.style.position = 'relative';
            parent.appendChild(dialog);
            
            dialog.style.left = triggerEl.offsetLeft + 'px';
            dialog.style.top = (triggerEl.offsetTop + triggerEl.offsetHeight + 1) + 'px';
        } else {
            document.body.appendChild(dialog);
            if (triggerEl) {
                const rect = triggerEl.getBoundingClientRect();
                dialog.style.left = rect.left + 'px';
                dialog.style.top = (rect.bottom + 1) + 'px';
            }
        }

        function closeCatSelectDialog(e) {
            const d = document.getElementById('ns-cat-select-dialog');
            if (d && !d.contains(e.target)) {
                if (d._closeHandler) {
                    document.removeEventListener('click', d._closeHandler);
                }
                d.remove();
            }
        }
        
        dialog._closeHandler = closeCatSelectDialog;
        
        setTimeout(function() {
            document.addEventListener('click', closeCatSelectDialog);
        }, 0);

        return dialog;
    }

    function refreshFavoritesDialog() {
        const dlg = document.getElementById('ns-fav-dialog');
        if (!dlg) return;

        const searchInput = dlg.querySelector('#ns-fav-search');
        const catFilter = dlg.querySelector('#ns-fav-cat-filter');
        const kw = searchInput ? normalizeText(searchInput.value.trim()) : '';
        const filterCat = catFilter ? catFilter.value : '全部';

        const tbody = dlg.querySelector('#ns-fav-tbody');
        if (!tbody) return;

        const list = getFavorites();
        
        list.sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeB - timeA;
        });

        const pinned = list.filter(f => f.pinned);
        const unpinned = list.filter(f => !f.pinned);
        const sorted = [...pinned, ...unpinned];

        tbody.innerHTML = '';

        const filtered = sorted.filter(f => {
            const matchKw = !kw || normalizeText(f.title).includes(kw) || normalizeText(f.remark || '').includes(kw);
            const matchCat = filterCat === '全部' || f.category === filterCat;
            return matchKw && matchCat;
        });

        if (filtered.length === 0) {
            const empty = document.createElement('tr');
            empty.innerHTML = '<td colspan="6" style="text-align:center;color:#888;padding:20px;font-size:13px;">暂无收藏记录</td>';
            tbody.appendChild(empty);
            
            updateStats(); 
            return;
        }

        filtered.forEach(function(fav, idx) {
            const tr = document.createElement('tr');
            tr.style.cssText = 'border-bottom:1px solid #f0f0f0;' + (fav.pinned ? 'background:#fffbe6;' : '');
            tr.dataset.url = fav.url;
            tr.dataset.title = normalizeText(fav.title);
            tr.dataset.remark = normalizeText(fav.remark || '');
            tr.addEventListener('mouseenter', function() {
                tr.style.background = fav.pinned ? '#ffe58f' : '#f0f0f0';
            });
            tr.addEventListener('mouseleave', function() {
                tr.style.background = fav.pinned ? '#fffbe6' : '';
            });

            const tdPin = document.createElement('td');
            tdPin.style.cssText = 'width:32px;text-align:center;padding:3px 2px;';
            
            const pinIcon = document.createElement('span');
            pinIcon.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"/></svg>';
            pinIcon.title = fav.pinned ? '取消置顶' : '置顶';
            pinIcon.style.cssText = 'cursor:pointer;color:' + (fav.pinned ? '#faad14' : '#ccc') + ';line-height:1;display:inline-block;width:28px;text-align:center;transform:' + (fav.pinned ? 'rotate(45deg)' : 'rotate(0deg)') + ';transition:all 0.2s ease;';
            
            pinIcon.onclick = function(e) {
                e.stopPropagation();
                togglePin(fav.url);
                refreshFavoritesDialog();
            };
            tdPin.appendChild(pinIcon);
            tr.appendChild(tdPin);

            const tdTitle = document.createElement('td');
            tdTitle.style.cssText = 'width:300px;min-width:300px;max-width:300px;padding:3px 4px;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            const titleLink = document.createElement('a');
            titleLink.href = fav.url;
            titleLink.textContent = fav.title;
            titleLink.target = '_blank';
            
            titleLink.className = 'ns-fav-link ignore-read no-read-memory'; 
            titleLink.style.cssText = 'display:block;width:292px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            
            titleLink.title = fav.title;
            titleLink.onclick = function(e) { e.stopPropagation(); };
            tdTitle.appendChild(titleLink);
            tr.appendChild(tdTitle);

            const tdRemark = document.createElement('td');
            tdRemark.style.cssText = 'width:140px;padding:3px 4px;font-size:12px;position:relative;';
            tdRemark.dataset.url = fav.url;

            const remarkText = fav.remark || '';
            const remarkSpan = document.createElement('span');
            remarkSpan.textContent = remarkText || '　';
            remarkSpan.style.cssText = 'color:' + (remarkText ? '#333' : '#aaa') + ';cursor:pointer;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:132px;';
            remarkSpan.title = remarkText || '点击添加备注';
            tdRemark.appendChild(remarkSpan);

            tdRemark.onclick = function(e) {
                e.stopPropagation();
                if (tdRemark.querySelector('input')) return;
                
                const current = fav.remark || '';
                const input = document.createElement('input');
                input.type = 'text';
                input.value = current;
                input.style.cssText = 'width:100%;padding:2px 4px;border:1px solid #1890ff;border-radius:3px;font-size:12px;box-sizing:border-box;';
                
                remarkSpan.style.display = 'none';
                tdRemark.appendChild(input);
                input.focus();

                input.onclick = function(ev) {
                    ev.stopPropagation();
                };

                const saveAndClose = () => {
                    if (!tdRemark.contains(input)) return; 
                    const newVal = input.value;
                    updateFavoriteRemark(fav.url, newVal);
                    fav.remark = newVal; 
                    remarkSpan.textContent = newVal || '　';
                    remarkSpan.title = newVal || '点击添加备注';
                    remarkSpan.style.color = newVal ? '#333' : '#aaa';
                    remarkSpan.style.display = 'block';
                    input.remove();
                };

                input.onblur = function() {
                    saveAndClose();
                };
                
                input.onkeydown = function(ev) {
                    if (ev.key === 'Enter') { 
                        input.blur(); 
                    }
                    if (ev.key === 'Escape') { 
                        remarkSpan.style.display = 'block';
                        input.remove();
                    }
                };
            };
            tr.appendChild(tdRemark);

            const tdCat = document.createElement('td');
            tdCat.style.cssText = 'min-width:60px;padding:3px 8px 3px 0;text-align:center;white-space:nowrap;';
            const catTag = document.createElement('span');
            const catText = fav.category || '全部分类';
            catTag.textContent = catText || '全部分类';
            catTag.style.cssText = 'display:inline-block;padding:1px 6px;background:#f0f7ff;color:#1890ff;border-radius:8px;font-size:10px;cursor:pointer;white-space:nowrap;';
            catTag.title = '点击修改分类';
            
            catTag.onclick = function(e) {
                e.stopPropagation(); 
                showCategorySelectDialog(fav.url, fav.category, catTag, function(newCat) {
                    fav.category = newCat; 
                    catTag.textContent = newCat || '全部分类'; 
                });
            };
            
            tdCat.appendChild(catTag);
            tr.appendChild(tdCat);

            const tdTime = document.createElement('td');
            tdTime.style.cssText = 'width:100px;padding:3px 4px 3px 0;font-size:11px;color:#999;white-space:nowrap;';
            tdTime.textContent = formatDate(fav.timestamp);
            tr.appendChild(tdTime);

            const tdOp = document.createElement('td');
            tdOp.style.cssText = 'padding:3px 4px;text-align:center;white-space:nowrap;';
            const delBtn = document.createElement('button');
            delBtn.textContent = '移除';
            delBtn.style.cssText = 'padding:3px 8px;font-size:11px;background:#ff4d4f;color:#fff;border:none;border-radius:4px;cursor:pointer;white-space:nowrap;';
            delBtn.onclick = function(e) {
                e.stopPropagation();
                if (confirm('确定移除该收藏？')) {
                    removeFromFavorites(fav.url);
                    refreshFavoritesDialog();
                }
            };
            tdOp.appendChild(delBtn);
            tr.appendChild(tdOp);

            tbody.appendChild(tr);
        });

        updateStats(); 
    }

    function showFavoritesDialog() {
        const existing = document.getElementById('ns-fav-dialog');
        if (existing) { existing.remove(); return; }

        const isSmallScreen = window.innerWidth <= 767;
        const dialog = document.createElement('div');
        dialog.id = 'ns-fav-dialog';
        
        const initLeft = Math.floor((window.innerWidth - 720) / 2 + 250) + 'px';
        const initTop = Math.max(10, Math.floor(window.innerHeight * 0.04)) + 'px';
        
        const desktopPos = 'left:' + initLeft + ';top:' + initTop + ';'; 
        const mobilePos = 'left:50%;top:50%;transform:translate(-50%,-50%);';
        
        dialog.style.cssText = 'position:fixed;z-index:99997;background:#fff;border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,0.18);padding:16px 16px 12px;width:720px;max-width:98vw;max-height:85vh;min-height:400px;overflow:hidden;display:flex;flex-direction:column;' +
            (isSmallScreen ? mobilePos : desktopPos);

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-shrink:0;';

        const titleEl = document.createElement('div');
        titleEl.textContent = '查看收藏';
        titleEl.style.cssText = 'font-weight:bold;font-size:16px;color:#333;';
        header.appendChild(titleEl);

        const headerBtns = document.createElement('div');
        headerBtns.style.cssText = 'display:flex;gap:8px;align-items:center;';

        const importBtn = document.createElement('button');
        importBtn.textContent = 'NS导入';
        importBtn.style.cssText = 'padding:5px 12px;background:#1890ff;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;';
        importBtn.onclick = function() { showNsImportDialog(); };
        headerBtns.appendChild(importBtn);

        const catBtn = document.createElement('button');
        catBtn.textContent = '分类管理';
        catBtn.style.cssText = 'padding:5px 10px;background:#f0f0f0;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:12px;';
        catBtn.onclick = function() { showCategoryManageDialog(); };
        headerBtns.appendChild(catBtn);

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '\u00d7';
        closeBtn.style.cssText = 'cursor:pointer;font-size:22px;color:#999;margin-left:8px;line-height:1;position:relative;top:-2px;';
        closeBtn.onclick = function() { dialog.remove(); };
        headerBtns.appendChild(closeBtn);

        header.appendChild(headerBtns);
        dialog.appendChild(header);

        const toolbar = document.createElement('div');
        toolbar.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;flex-shrink:0;';

        const searchInput = document.createElement('input');
        searchInput.id = 'ns-fav-search';
        searchInput.type = 'text';
        searchInput.placeholder = '搜索标题/备注';
        searchInput.style.cssText = 'flex:1;padding:7px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px;';
        searchInput.oninput = function() { refreshFavoritesDialog(); };
        toolbar.appendChild(searchInput);

        const cats = getCategories();
        const catFilter = document.createElement('select');
        catFilter.id = 'ns-fav-cat-filter';
        catFilter.style.cssText = 'padding:7px 8px;border:1px solid #ddd;border-radius:4px;font-size:13px;min-width:80px;';
        
        const allOpt = document.createElement('option');
        allOpt.value = '全部';
        allOpt.textContent = '全部分类';
        catFilter.appendChild(allOpt);
        
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            catFilter.appendChild(opt);
        });
        catFilter.onchange = function() { refreshFavoritesDialog(); };
        toolbar.appendChild(catFilter);
        dialog.appendChild(toolbar);

        const statsRow = document.createElement('div');
        statsRow.style.cssText = 'font-size:12px;color:#888;margin-bottom:8px;flex-shrink:0;';
        statsRow.id = 'ns-fav-stats';
        dialog.appendChild(statsRow);

        const tableWrapper = document.createElement('div');
        tableWrapper.style.cssText = 'overflow-y:auto;flex:1;border:1px solid #f0f0f0;border-radius:6px;min-width:630px;';

        const table = document.createElement('table');
        table.style.cssText = 'width:auto;min-width:630px;border-collapse:collapse;table-layout:fixed;';

        const thead = document.createElement('thead');
        thead.style.cssText = 'position:sticky;top:0;z-index:1;background:#fafafa;';
        thead.innerHTML = '<tr style="background:#f5f5f5;">' +
            '<th style="width:32px;padding:4px 2px;text-align:center;font-size:12px;color:#666;">置顶</th>' +
            '<th style="width:300px;min-width:300px;max-width:300px;padding:4px 4px;text-align:left;font-size:12px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">标题</th>' +
            '<th style="width:140px;padding:4px 4px;text-align:left;font-size:12px;color:#666;">备注</th>' +
            '<th style="padding:4px 8px 4px 0;text-align:center;font-size:12px;color:#666;white-space:nowrap;">分类</th>' +
            '<th style="width:100px;padding:4px 4px 4px 0;text-align:left;font-size:12px;color:#666;">收藏时间</th>' +
            '<th style="width:52px;padding:4px 4px;text-align:center;font-size:12px;color:#666;">操作</th>' +
            '</tr>';
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        tbody.id = 'ns-fav-tbody';
        table.appendChild(tbody);
        tableWrapper.appendChild(table);
        dialog.appendChild(tableWrapper);

        document.body.appendChild(dialog);

        if (!isSmallScreen && typeof makeDraggable === 'function') {
            makeDraggable(dialog, {width: 30, height: 30});
        }

        refreshFavoritesDialog();
    }

    function updateStats() {
        const dlg = document.getElementById('ns-fav-dialog');
        if (!dlg) return;
        const list = getFavorites();
        const pinned = list.filter(f => f.pinned).length;
        const stats = dlg.querySelector('#ns-fav-stats');
        
        if (stats) stats.textContent = '共 ' + list.length + ' 条收藏' + (pinned > 0 ? '（含 ' + pinned + ' 条置顶）' : '');
    }

    function showNsImportDialog() {
        const existing = document.getElementById('ns-import-dialog');
        if (existing) { existing.remove(); return; }

        const mobile = isMobile();
        const desktopPos = `left:${Math.floor((window.innerWidth - 360) / 2)}px;top:${Math.floor(window.innerHeight * 0.25)}px;`;
        const mobilePos = 'left:50%;top:50%;transform:translate(-50%,-50%);';
        
        const dialog = document.createElement('div');
        dialog.id = 'ns-import-dialog';
        dialog.style.cssText = 'position:fixed;z-index:99999;background:#fff;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.2);padding:20px;width:' + (mobile ? '90%' : '360px') + ';max-width:95vw;' + (mobile ? mobilePos : desktopPos);

        const title = document.createElement('div');
        title.textContent = 'NS导入收藏';
        title.style.cssText = 'font-weight:bold;font-size:16px;margin-bottom:14px;';
        dialog.appendChild(title);

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '\u00d7';
        closeBtn.style.cssText = 'position:absolute;right:12px;top:8px;cursor:pointer;font-size:22px;';
        closeBtn.onclick = function() { dialog.remove(); };
        dialog.appendChild(closeBtn);

        const info = document.createElement('div');
        info.textContent = '从 NodeSeek 站内收藏导入到本地收藏列表。需登录后才能使用。';
        info.style.cssText = 'font-size:13px;color:#666;margin-bottom:12px;line-height:1.5;';
        dialog.appendChild(info);

        const filterPrivate = document.createElement('label');
        filterPrivate.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:14px;cursor:pointer;';
        const filterCheck = document.createElement('input');
        filterCheck.type = 'checkbox';
        filterCheck.checked = true;
        filterPrivate.appendChild(filterCheck);
        filterPrivate.appendChild(document.createTextNode('过滤私有帖（rank=255）'));
        dialog.appendChild(filterPrivate);

        const statusDiv = document.createElement('div');
        statusDiv.style.cssText = 'font-size:13px;color:#666;margin-bottom:12px;min-height:20px;';
        dialog.appendChild(statusDiv);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:10px;';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = 'flex:1;padding:9px;background:#f0f0f0;border:none;border-radius:4px;cursor:pointer;font-size:14px;';
        cancelBtn.onclick = function() { dialog.remove(); };
        btnRow.appendChild(cancelBtn);

        const importBtn = document.createElement('button');
        importBtn.textContent = '开始导入';
        importBtn.style.cssText = 'flex:1;padding:9px;background:#1890ff;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;';
        btnRow.appendChild(importBtn);
        dialog.appendChild(btnRow);

        document.body.appendChild(dialog);

        importBtn.onclick = function() {
            importBtn.disabled = true;
            importBtn.textContent = '导入中...';
            importBtn.style.background = '#ccc';
            statusDiv.textContent = '正在从 NS 站内收藏拉取数据，请稍候...';

            importNsCollections({ filterPrivate: filterCheck.checked })
                .then(function(result) {
                    statusDiv.textContent = '导入完成！新增 ' + result.added + ' 条，跳过 ' + result.skipped + ' 条';
                    statusDiv.style.color = '#52c41a';
                    importBtn.textContent = '完成';
                    importBtn.style.background = '#52c41a';
                    importBtn.disabled = false;
                    
                    refreshFavoritesDialog();
                    
                    importBtn.onclick = function() {
                        dialog.remove();
                    };
                })
                .catch(function(err) {
                    statusDiv.textContent = '导入失败：' + err.message;
                    statusDiv.style.color = '#ff4d4f';
                    importBtn.textContent = '重试';
                    importBtn.style.background = '#ff4d4f';
                    importBtn.disabled = false;
                });
        };

        if (!mobile && typeof makeDraggable === 'function') {
            makeDraggable(dialog, {width: 20, height: 20});
        }
    }

    // 暴露全局 API
    window.NodeSeekCollect = {
        getFavorites,
        setFavorites,
        getCategories,
        setCategories,
        addToFavorites,
        removeFromFavorites,
        isCurrentPageFavorited,
        getCurrentPageFavoriteRemark,
        getCurrentPageFavoriteCategory,
        addCurrentPageToFavorites,
        showFavoritesDialog,
        showAddFavoriteDialog,
        showEditFavoriteDialog,
        showCategoryManageDialog,
        importNsCollections,
        addCategory,
        removeCategory,
        renameCategory,
        togglePin,
        updateFavoriteRemark,
        updateFavoriteCategory,
        refreshFavoritesDialog,
    };

})();
