// ========== 收藏 / 查看 ==========
(function () {
    'use strict';

    function nsCollectGetCollapsedState() {
        try {
            return localStorage.getItem('nodeseek_buttons_collapsed') === 'true';
        } catch (e) {
            return false;
        }
    }

    function nsCollectLog(message) {
        if (typeof window.addLog === 'function') {
            window.addLog(message);
        }
    }

    // 收藏数据结构：[{title, url, remark, timestamp, category}]
    const FAVORITES_KEY = 'nodeseek_favorites';
    // 收藏分类列表存储键
    const FAVORITES_CATEGORIES_KEY = 'nodeseek_favorites_categories';
    /** NS list-collection 中 rank===255 表示私有帖；导入时可勾选过滤 */
    const FAVORITES_IMPORT_FILTER_PRIVATE_KEY = 'nodeseek_fav_import_skip_private';
    const NS_COLLECTION_PRIVATE_RANK = 255;

    /** list-collection 条目中 rank 为 255 表示私有帖（接口可能给数字或字符串） */
    function isNsListCollectionPrivateRank(rank) {
        if (rank === NS_COLLECTION_PRIVATE_RANK) return true;
        if (rank === String(NS_COLLECTION_PRIVATE_RANK)) return true;
        const n = parseInt(rank, 10);
        return n === NS_COLLECTION_PRIVATE_RANK && !Number.isNaN(n);
    }
    const FAVORITE_CATEGORY_NAME_MAX_LEN = 4;
    const FAVORITE_CATEGORY_MAX_COUNT = 6;

    // 读取收藏
    function getFavorites() {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    }

    // 保存收藏
    function setFavorites(list) {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
    }

    function normalizeFavoriteCategoryName(rawName) {
        if (rawName === null || rawName === undefined) return '';
        const name = String(rawName).trim();
        if (!name) return '';
        if (name === '未分类') return '未分类';
        return name.slice(0, FAVORITE_CATEGORY_NAME_MAX_LEN);
    }

    // 获取收藏分类列表
    function getFavoriteCategories() {
        const rawCategories = JSON.parse(localStorage.getItem(FAVORITES_CATEGORIES_KEY) || '[]');
        const keptCustom = [];
        const seen = new Set();

        if (Array.isArray(rawCategories)) {
            for (const raw of rawCategories) {
                const normalized = normalizeFavoriteCategoryName(raw);
                if (!normalized || normalized === '未分类') continue;
                if (seen.has(normalized)) continue;
                if (keptCustom.length >= FAVORITE_CATEGORY_MAX_COUNT) continue;
                seen.add(normalized);
                keptCustom.push(normalized);
            }
        }

        const sanitized = ['未分类', ...keptCustom];
        let categoriesChanged = !Array.isArray(rawCategories) || rawCategories.length !== sanitized.length;
        if (!categoriesChanged) {
            for (let i = 0; i < sanitized.length; i++) {
                if (rawCategories[i] !== sanitized[i]) {
                    categoriesChanged = true;
                    break;
                }
            }
        }
        if (categoriesChanged) {
            setFavoriteCategories(sanitized);
        }

        const favorites = getFavorites();
        let favoritesChanged = false;
        if (Array.isArray(favorites) && favorites.length > 0) {
            for (const fav of favorites) {
                const rawCat = fav && fav.category ? fav.category : '未分类';
                const normalized = normalizeFavoriteCategoryName(rawCat) || '未分类';
                const nextCategory = (normalized !== '未分类' && seen.has(normalized)) ? normalized : '未分类';
                if (fav && fav.category !== nextCategory) {
                    fav.category = nextCategory;
                    favoritesChanged = true;
                }
            }
        }
        if (favoritesChanged) {
            setFavorites(favorites);
        }

        return sanitized;
    }

    // 保存收藏分类列表
    function setFavoriteCategories(categories) {
        localStorage.setItem(FAVORITES_CATEGORIES_KEY, JSON.stringify(categories));
    }

    // 添加收藏分类
    function addFavoriteCategory(category) {
        const normalized = normalizeFavoriteCategoryName(category);
        if (!normalized || normalized === '未分类') return false;
        const categories = getFavoriteCategories();
        const customCount = categories.filter(c => c !== '未分类').length;
        if (customCount >= FAVORITE_CATEGORY_MAX_COUNT) return false;
        if (categories.includes(normalized)) return false;
        categories.push(normalized);
        setFavoriteCategories(categories);
        return true;
    }

    // 删除收藏分类
    function removeFavoriteCategory(category) {
        if (category === '未分类') return false; // 不能删除默认分类
        const categories = getFavoriteCategories();
        const index = categories.indexOf(category);
        if (index === -1) return false;
        categories.splice(index, 1);
        setFavoriteCategories(categories);
        // 将该分类下的收藏移动到"未分类"
        const favorites = getFavorites();
        favorites.forEach(fav => {
            if (fav.category === category) {
                fav.category = '未分类';
            }
        });
        setFavorites(favorites);
        return true;
    }

    // 重命名收藏分类
    function renameFavoriteCategory(oldName, newName) {
        if (oldName === '未分类') return false; // 不能重命名默认分类
        const normalized = normalizeFavoriteCategoryName(newName);
        if (!normalized || normalized === '未分类') return false;
        const categories = getFavoriteCategories();
        if (categories.includes(normalized)) return false; // 新名称已存在
        const index = categories.indexOf(oldName);
        if (index === -1) return false;
        categories[index] = normalized;
        setFavoriteCategories(categories);
        // 更新该分类下的收藏
        const favorites = getFavorites();
        favorites.forEach(fav => {
            if (fav.category === oldName) {
                fav.category = normalized;
            }
        });
        setFavorites(favorites);
        return true;
    }

    // 添加收藏
    function addToFavorites(remark, category) {
        const list = getFavorites();

        // 获取当前页面标题和URL
        const title = document.title.replace(' - NodeSeek', '').trim();
        const url = window.location.href;

        // 如果没有指定分类，使用"未分类"
        if (!category) {
            category = '未分类';
        }

        // 检查是否已经收藏过
        const existingIndex = list.findIndex(item => item.url === url);
        if (existingIndex >= 0) {
            // 已收藏，则更新备注、分类和时间
            list[existingIndex].remark = remark || '';
            list[existingIndex].category = category;
            list[existingIndex].timestamp = new Date().toISOString();
            nsCollectLog(`更新收藏: ${title}`);
        } else {
            // 新收藏
            const newItem = {
                title: title,
                url: url,
                remark: remark || '',
                category: category,
                timestamp: new Date().toISOString(),
                pinned: false // 默认不置顶
            };

            // 插入到第一个非置顶的位置，确保新收藏在非置顶区的顶部
            const firstUnpinnedIndex = list.findIndex(item => !item.pinned);
            if (firstUnpinnedIndex === -1) {
                // 如果没有非置顶项（列表为空或全置顶），则添加到末尾
                list.push(newItem);
            } else {
                list.splice(firstUnpinnedIndex, 0, newItem);
            }
            nsCollectLog(`添加收藏: ${title}`);
        }

        setFavorites(list);
        return existingIndex >= 0; // 返回是否为更新操作
    }

    // 移除收藏
    function removeFromFavorites(url) {
        let list = getFavorites();
        const index = list.findIndex(item => item.url === url);
        if (index >= 0) {
            const title = list[index].title;
            list.splice(index, 1);
            setFavorites(list);
            nsCollectLog(`移除收藏: ${title}`);
            return true;
        }
        return false;
    }

    /** 从收藏项 URL 解析帖子数字 ID（与 /post-123-1 一致） */
    function getPostIdFromFavoriteUrl(url) {
        if (!url) return null;
        const m = String(url).match(/\/post-(\d+)/i);
        return m ? m[1] : null;
    }

    /**
     * 分页请求 NodeSeek 站内收藏 API，合并到插件本地收藏（需已登录；同 post_id 已存在则跳过）。
     * @param {{ filterPrivate?: boolean }} [opts] filterPrivate 为 true 时跳过 rank===255 的私有帖
     */
    async function importOfficialNsCollectionsIntoFavorites(opts) {
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
                throw new Error(`网络错误：${e.message}`);
            }
            if (!resp.ok) {
                if (resp.status === 401 || resp.status === 403) {
                    throw new Error('未登录或无权限，请先登录 NodeSeek 后再试。');
                }
                throw new Error(`拉取失败：HTTP ${resp.status}`);
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
            const pid = getPostIdFromFavoriteUrl(fav.url);
            if (pid) existingIds.add(pid);
        }
        let added = 0;
        let skipped = 0;
        let skippedPrivate = 0;
        const nowIso = new Date().toISOString();
        // 先按接口顺序收集，再一次插入；若逐条 splice(firstUnpinned,0) 会把后处理的顶到前面，顺序与 NS 列表相反
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
            const title = (col.title && String(col.title).trim()) || `帖子 ${pid}`;
            // NS 接口的 rank 表示站内排序等含义，与插件「置顶」不是同一概念，导入一律不设置顶
            toAdd.push({
                title,
                url: `https://www.nodeseek.com/post-${pid}-1`,
                remark: '',
                category: '未分类',
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
        let logMsg = `NS站内收藏导入：新增 ${added} 条，跳过已存在 ${skipped} 条（接口共 ${allRows.length} 条）`;
        if (skippedPrivate > 0) logMsg += `，未导入私有 ${skippedPrivate} 条`;
        nsCollectLog(logMsg);
        return { added, skipped, skippedPrivate, totalApi: allRows.length };
    }

    // 检查当前页面是否已收藏
    function isCurrentPageFavorited() {
        const list = getFavorites();
        const url = window.location.href;
        return list.some(item => item.url === url);
    }

    // 获取当前页面的收藏备注
    function getCurrentPageFavoriteRemark() {
        const list = getFavorites();
        const url = window.location.href;
        const item = list.find(item => item.url === url);
        return item ? item.remark : '';
    }

    // 显示收藏列表对话框
    function showFavoritesDialog() {
        // 检查弹窗是否已存在
        const existingDialog = document.getElementById('favorites-dialog');
        if (existingDialog) {
            // 如果已存在，则关闭弹窗
            existingDialog.remove();
            return;
        }

        // 获取收藏列表并按时间戳降序排序（最新的在最前面）
        let list = getFavorites();
        // 兼容旧数据：为没有category字段的收藏添加"未分类"
        let hasOldData = false;
        list.forEach(item => {
            if (!item.category) {
                item.category = '未分类';
                hasOldData = true;
            }
        });
        if (hasOldData) {
            setFavorites(list);
        }
        list.sort((a, b) => {
            // 如果没有时间戳，则排在后面
            if (!a.timestamp) return 1;
            if (!b.timestamp) return -1;
            // 比较时间戳，降序排列
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        const dialog = document.createElement('div');
        dialog.id = 'favorites-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '60px';
        dialog.style.right = '16px';
        dialog.style.zIndex = 10000;
        dialog.style.background = '#fff';
        dialog.style.border = '1px solid #ccc';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        dialog.style.padding = '18px 20px 12px 20px';
        // 移除固定宽度设置，让媒体查询CSS接管
        // 只在桌面设备上设置最小宽度
        const isMobile = (window.NodeSeekFilter && typeof window.NodeSeekFilter.isMobileDevice === 'function')
            ? window.NodeSeekFilter.isMobileDevice()
            : (window.innerWidth <= 767);
        if (!isMobile) {
            // 桌面端固定宽度，缩小100px
            dialog.style.width = '732px';
            dialog.style.minWidth = '732px';
            dialog.style.maxWidth = '732px';
            // 改为“最大高度600px，未满自动伸缩”，并采用纵向flex布局
            dialog.style.maxHeight = '600px';
            dialog.style.display = 'flex';
            dialog.style.flexDirection = 'column';
        } else {
            // 移动端自适应与居中显示
            dialog.style.width = '95%';
            dialog.style.minWidth = 'unset';
            dialog.style.maxWidth = '95%';
            dialog.style.left = '50%';
            dialog.style.top = '50%';
            dialog.style.transform = 'translate(-50%, -50%)';
            dialog.style.right = 'auto';
            dialog.style.maxHeight = '85vh';
            dialog.style.padding = '12px 8px 8px 8px';
            dialog.style.overflowY = 'auto';
            dialog.style.overflowX = 'hidden';
            dialog.style.borderRadius = '12px';
            dialog.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)';
        }
        // 让标题区域不随内容滚动：滚动交由内容容器处理
        dialog.style.overflow = 'visible';

        // 标题和关闭按钮
        const titleBar = document.createElement('div');
        titleBar.style.display = 'flex';
        titleBar.style.justifyContent = 'space-between';
        titleBar.style.alignItems = 'center';
        titleBar.style.marginBottom = '10px';

        const title = document.createElement('div');
        title.textContent = `收藏列表 (${list.length}条)`;
        title.style.fontWeight = 'bold';
        title.style.fontSize = '16px';
        titleBar.appendChild(title);

        // 从 NS 站内收藏 API 合并到插件收藏（需登录，逻辑参考 statistics.js 鸡腿拉取）
        const importNsWrap = document.createElement('div');
        importNsWrap.style.display = 'flex';
        importNsWrap.style.alignItems = 'center';
        importNsWrap.style.flexWrap = 'wrap';
        importNsWrap.style.gap = '6px';

        const importNsCollectionsBtn = document.createElement('button');
        importNsCollectionsBtn.textContent = '导入NS收藏';
        importNsCollectionsBtn.className = 'blacklist-btn';
        importNsCollectionsBtn.style.fontSize = '12px';
        importNsCollectionsBtn.style.padding = '4px 8px';

        importNsWrap.appendChild(importNsCollectionsBtn);

        importNsCollectionsBtn.onclick = function () {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
            const box = document.createElement('div');
            box.style.cssText = 'background:#fff;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.2);max-width:420px;width:100%;padding:18px 20px;font-size:14px;color:#333;';
            const titleImp = document.createElement('div');
            titleImp.textContent = '导入 NS 收藏';
            titleImp.style.cssText = 'font-weight:bold;font-size:16px;margin-bottom:10px;';
            const p = document.createElement('p');
            p.style.cssText = 'margin:0 0 12px;line-height:1.55;font-size:13px;color:#444;';
            p.textContent = '将从当前已登录账号拉取 NodeSeek 站内「我的收藏」并合并到本列表。相同帖子（按帖子 ID）已存在时会自动跳过。';
            const filterPrivateLabel = document.createElement('label');
            filterPrivateLabel.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;margin-bottom:16px;font-size:13px;color:#555;';
            const filterPrivateCb = document.createElement('input');
            filterPrivateCb.type = 'checkbox';
            try {
                filterPrivateCb.checked = localStorage.getItem(FAVORITES_IMPORT_FILTER_PRIVATE_KEY) === '1';
            } catch (e) {
                filterPrivateCb.checked = false;
            }
            filterPrivateCb.onchange = function () {
                try {
                    localStorage.setItem(FAVORITES_IMPORT_FILTER_PRIVATE_KEY, this.checked ? '1' : '0');
                } catch (e2) {}
            };
            const filterPrivateText = document.createElement('span');
            filterPrivateText.textContent = '过滤私有';
            filterPrivateText.title = '勾选后跳过私有帖子，不导入到本列表';
            filterPrivateLabel.appendChild(filterPrivateCb);
            filterPrivateLabel.appendChild(filterPrivateText);
            const hint = document.createElement('div');
            hint.style.cssText = 'font-size:12px;color:#888;margin:-8px 0 14px;padding-left:24px;line-height:1.4;';
            hint.textContent = '勾选「过滤私有」时，跳过本次导入中的私有帖子。';
            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;';
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.textContent = '取消';
            cancelBtn.className = 'blacklist-btn';
            cancelBtn.style.fontSize = '13px';
            cancelBtn.style.padding = '6px 14px';
            const okBtn = document.createElement('button');
            okBtn.type = 'button';
            okBtn.textContent = '开始导入';
            okBtn.className = 'blacklist-btn';
            okBtn.style.cssText = 'font-size:13px;padding:6px 14px;background:#000;color:#fff;border-color:#000;';
            function closeModal() {
                try {
                    overlay.remove();
                } catch (e) {}
            }
            cancelBtn.onclick = closeModal;
            overlay.addEventListener('click', function (ev) {
                if (ev.target === overlay) closeModal();
            });
            okBtn.onclick = async function () {
                const filterPrivate = filterPrivateCb.checked;
                filterPrivateCb.disabled = true;
                cancelBtn.disabled = true;
                okBtn.disabled = true;
                okBtn.textContent = '拉取中…';
                importNsCollectionsBtn.disabled = true;
                const origImport = importNsCollectionsBtn.textContent;
                importNsCollectionsBtn.textContent = '拉取中…';
                closeModal();
                try {
                    const r = await importOfficialNsCollectionsIntoFavorites({ filterPrivate });
                    if (r.totalApi === 0) {
                        alert('未从接口获取到任何收藏，请确认已登录且账号在站点内有收藏。');
                    } else {
                        let msg = `导入完成：新增 ${r.added} 条，跳过（本地已有）${r.skipped} 条。`;
                        if (r.skippedPrivate > 0) msg += `\n未导入的私有帖 ${r.skippedPrivate} 条。`;
                        alert(msg);
                    }
                    dialog.remove();
                    showFavoritesDialog();
                } catch (e) {
                    alert(e.message || String(e));
                    importNsCollectionsBtn.textContent = origImport;
                    importNsCollectionsBtn.disabled = false;
                }
            };
            btnRow.appendChild(cancelBtn);
            btnRow.appendChild(okBtn);
            box.appendChild(titleImp);
            box.appendChild(p);
            box.appendChild(filterPrivateLabel);
            box.appendChild(hint);
            box.appendChild(btnRow);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
            box.addEventListener('click', function (ev) {
                ev.stopPropagation();
            });
        };

        // 分类管理按钮
        const categoryManageBtn = document.createElement('button');
        categoryManageBtn.textContent = '分类管理';
        categoryManageBtn.className = 'blacklist-btn';
        categoryManageBtn.style.fontSize = '12px';
        categoryManageBtn.style.padding = '4px 8px';
        // 与关闭按钮留出间距（原单独放置时的 marginRight）
        categoryManageBtn.style.marginRight = '38px';
        categoryManageBtn.onclick = function () {
            showCategoryManageDialog();
        };

        const titleRightBtns = document.createElement('div');
        titleRightBtns.style.display = 'flex';
        titleRightBtns.style.alignItems = 'center';
        titleRightBtns.style.gap = '8px';
        titleRightBtns.appendChild(importNsWrap);
        titleRightBtns.appendChild(categoryManageBtn);
        titleBar.appendChild(titleRightBtns);

        dialog.appendChild(titleBar);

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.position = 'absolute';
        closeBtn.style.right = '12px';
        closeBtn.style.top = '8px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '20px';
        closeBtn.className = 'close-btn'; // 添加类名便于CSS选择器选中
        closeBtn.onclick = function () { dialog.remove(); };
        dialog.appendChild(closeBtn);

        // 简繁体与大小写标准化函数（优先使用 NodeSeekFilter.normalizeText）
        const normalizeForSearch = function (text) {
            const s = (text || '').toString();
            if (window.NodeSeekFilter && typeof window.NodeSeekFilter.normalizeText === 'function') {
                return window.NodeSeekFilter.normalizeText(s);
            }
            let t = s.replace(/\s+/g, '').toLowerCase();
            if (window.NodeSeekFilter && typeof window.NodeSeekFilter.convertTraditionalToSimplified === 'function') {
                t = window.NodeSeekFilter.convertTraditionalToSimplified(t);
            }
            return t;
        };

        // 搜索区和分类筛选
        const searchContainer = document.createElement('div');
        searchContainer.style.marginBottom = '10px';
        searchContainer.style.display = 'flex';
        searchContainer.style.gap = '8px';
        searchContainer.style.alignItems = 'center';

        // 分类筛选下拉框
        const categoryFilter = document.createElement('select');
        categoryFilter.id = 'favorites-category-filter';
        categoryFilter.style.padding = isMobile ? '10px 8px' : '6px 8px';
        categoryFilter.style.border = '1px solid #ddd';
        categoryFilter.style.borderRadius = '4px';
        categoryFilter.style.fontSize = isMobile ? '16px' : '13px';
        categoryFilter.style.outline = 'none';
        categoryFilter.style.boxSizing = 'border-box';
        categoryFilter.style.minWidth = isMobile ? '120px' : '100px';
        categoryFilter.style.background = '#fff';
        categoryFilter.style.cursor = 'pointer';

        // 初始化分类选项（移除“未分类”在弹窗下拉中的显示）
        function updateCategoryFilter() {
            const categories = getFavoriteCategories().filter(cat => cat !== '未分类');
            categoryFilter.innerHTML = '<option value="">全部分类</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                categoryFilter.appendChild(option);
            });
        }
        updateCategoryFilter();

        searchContainer.appendChild(categoryFilter);

        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.placeholder = '搜索标题或备注';
        searchInput.style.flex = '1';
        searchInput.style.padding = isMobile ? '10px 12px' : '6px 8px';
        searchInput.style.border = '1px solid #ddd';
        searchInput.style.borderRadius = '4px';
        searchInput.style.fontSize = isMobile ? '16px' : '13px';
        searchInput.style.outline = 'none';
        searchInput.style.boxSizing = 'border-box';

        searchContainer.appendChild(searchInput);
        dialog.appendChild(searchContainer);

        const contentRoot = document.createElement('div');
        dialog.appendChild(contentRoot);

        // 标题横向展开浮层（单例）
        function ensureTitlePopover() {
            if (dialog._titlePopover) return dialog._titlePopover;
            const pop = document.createElement('div');
            pop.id = 'favorites-title-popover';
            pop.style.position = 'absolute';
            pop.style.left = '20px';
            pop.style.right = '20px';
            pop.style.top = '0px';
            pop.style.zIndex = '10001';
            pop.style.background = 'rgba(255,255,255,0.98)';
            pop.style.border = '1px solid #1890ff';
            pop.style.borderRadius = '6px';
            pop.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
            pop.style.padding = '8px 12px';
            pop.style.display = 'none';
            pop.style.whiteSpace = 'nowrap';
            pop.style.overflowX = 'auto';
            pop.style.maxHeight = '32px';

            const close = document.createElement('span');
            close.textContent = '收起';
            close.style.float = 'right';
            close.style.cursor = 'pointer';
            close.style.color = '#1890ff';
            close.onclick = () => { pop.style.display = 'none'; };
            pop.appendChild(close);

            const content = document.createElement('div');
            content.style.marginRight = '52px';
            content.style.whiteSpace = 'nowrap';
            content.style.overflowX = 'auto';
            content.style.color = '#333';
            pop.appendChild(content);
            pop._content = content;
            dialog.appendChild(pop);

            // 点击弹窗空白处收起
            dialog.addEventListener('click', (e) => {
                if (pop.style.display === 'none') return;
                if (!pop.contains(e.target)) pop.style.display = 'none';
            });
            // Esc 收起
            dialog.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') pop.style.display = 'none';
            });

            dialog._titlePopover = pop;
            return pop;
        }

        // 切换置顶状态
        function togglePin(url) {
            const list = getFavorites();
            const index = list.findIndex(item => item.url === url);
            if (index === -1) return;

            const item = list[index];
            item.pinned = !item.pinned;

            // 从当前位置移除
            list.splice(index, 1);

            if (item.pinned) {
                // 置顶：移动到列表最顶部
                list.unshift(item);
            } else {
                // 取消置顶：移动到第一个非置顶项之后（即非置顶区的顶部）
                const firstUnpinned = list.findIndex(i => !i.pinned);
                if (firstUnpinned === -1) {
                    // 如果全是置顶项（不应该发生，因为刚移除了一个），或者列表为空，放到末尾
                    list.push(item);
                } else {
                    list.splice(firstUnpinned, 0, item);
                }
            }

            setFavorites(list);
            performSearch();
        }

        // 移动非置顶项
        function moveUnpinnedItem(srcUrl, targetUrl) {
            const list = getFavorites();
            const srcIndex = list.findIndex(item => item.url === srcUrl);
            const targetIndex = list.findIndex(item => item.url === targetUrl); // Original target index

            if (srcIndex === -1 || targetIndex === -1) return;
            // 只有非置顶项可以拖拽和接收放置
            if (list[srcIndex].pinned || list[targetIndex].pinned) return;

            const [item] = list.splice(srcIndex, 1);
            // 重新获取目标索引，因为列表已变化
            let newTargetIndex = list.findIndex(item => item.url === targetUrl);

            // 如果是向下拖拽（原索引 < 原目标索引），则插入到目标项之后
            if (srcIndex < targetIndex) {
                newTargetIndex++;
            }

            list.splice(newTargetIndex, 0, item);

            setFavorites(list);
            performSearch();
        }

        // 移动置顶项（仅在置顶区内排序）
        function movePinnedItem(srcUrl, targetUrl) {
            const list = getFavorites();
            const srcIndex = list.findIndex(item => item.url === srcUrl);
            const targetIndex = list.findIndex(item => item.url === targetUrl); // Original target index

            if (srcIndex === -1 || targetIndex === -1) return;
            // 只有置顶项可以拖拽和接收放置
            if (!list[srcIndex].pinned || !list[targetIndex].pinned) return;

            const [item] = list.splice(srcIndex, 1);
            let newTargetIndex = list.findIndex(item => item.url === targetUrl);

            if (srcIndex < targetIndex) {
                newTargetIndex++;
            }

            list.splice(newTargetIndex, 0, item);

            setFavorites(list);
            performSearch();
        }

        function renderTable(data, isDragEnabled = false) {
            contentRoot.innerHTML = '';

            // 注入样式
            if (!document.getElementById('ns-blacklist-custom-style')) {
                const style = document.createElement('style');
                style.id = 'ns-blacklist-custom-style';
                style.textContent = `
                    .ns-row-pinned { background: transparent; }
                    .ns-row-pinned td { color: #555; }
                    .ns-row-dragging { opacity: 0.5; background: #e6f7ff; }
                    .ns-row-draggable { cursor: default; }
                    .ns-row-draggable td { background-color: transparent; }
                `;
                document.head.appendChild(style);
            }

            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            // 固定表格布局，按列宽分配，减少空白
            table.style.tableLayout = 'fixed';
            table.innerHTML = '<thead><tr>'
                + '<th style="text-align:left;font-size:13px;width:35%;">标题</th>'
                + '<th style="text-align:left;font-size:13px;width:16%;padding-left:18px;position:relative;left:110px;">备注</th>'
                + '<th style="text-align:left;font-size:13px;width:16%;padding-left:42px;white-space:nowrap;position:relative;left:78px;">分类</th>'
                 + '<th style="text-align:left;font-size:13px;width:18%;padding-left:0px;position:relative;left:33px;">收藏时间</th>'
                + '<th style="width:100px;text-align:right;"></th></tr></thead>'; // 增加操作列宽度以容纳两个按钮

            try {
                const thead = table.tHead;
                if (thead && thead.style) {
                    thead.style.position = 'sticky';
                    thead.style.top = '0';
                    thead.style.background = '#fff';
                    thead.style.zIndex = '1';
                }
            } catch (e) { }

            const tableWrapper = document.createElement('div');
            // 将滚动容器上移到内容根（contentRoot），避免百分比高度在某些环境下不生效
            // 表包裹层保持自动高度，仅用于承载表格与粘性表头
            tableWrapper.style.height = 'auto';
            tableWrapper.style.maxHeight = 'unset';
            tableWrapper.style.overflowY = 'visible';
            tableWrapper.style.overflowX = 'auto';
            tableWrapper.appendChild(table);

            const tbody = document.createElement('tbody');

            if (!data || data.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = '暂无收藏';
                empty.style.textAlign = 'center';
                empty.style.color = '#888';
                empty.style.margin = '18px 0 8px 0';
                contentRoot.appendChild(empty);
                return;
            }

            // 维持自动高度，由内容根容器负责滚动
            tableWrapper.style.height = 'auto';
            tableWrapper.style.maxHeight = 'unset';
            tableWrapper.style.overflowY = 'visible';

            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #eee';
                if (item.pinned) {
                    tr.classList.add('ns-row-pinned');
                }

                // 拖拽支持
                if (isDragEnabled) {
                    tr.draggable = false;
                    tr.classList.add('ns-row-draggable');
                    tr.dataset.url = item.url;

                    tr.addEventListener('dragstart', (e) => {
                        if (!tr.draggable) return;
                        e.dataTransfer.setData('text/plain', item.url);
                        e.dataTransfer.effectAllowed = 'move';
                        tr.classList.add('ns-row-dragging');
                    });

                    tr.addEventListener('dragend', (e) => {
                        tr.classList.remove('ns-row-dragging');
                        tr.draggable = false;
                    });

                    tr.addEventListener('dragover', (e) => {
                        e.preventDefault(); // 允许放置
                        e.dataTransfer.dropEffect = 'move';
                    });

                    tr.addEventListener('drop', (e) => {
                        e.preventDefault();
                        const srcUrl = e.dataTransfer.getData('text/plain');
                        const targetUrl = tr.dataset.url;
                        if (srcUrl && targetUrl && srcUrl !== targetUrl) {
                            const list = getFavorites();
                            const srcItem = list.find(i => i.url === srcUrl);
                            const targetItem = list.find(i => i.url === targetUrl);
                            if (!srcItem || !targetItem) return;
                            if (srcItem.pinned && targetItem.pinned) {
                                movePinnedItem(srcUrl, targetUrl);
                            } else if (!srcItem.pinned && !targetItem.pinned) {
                                moveUnpinnedItem(srcUrl, targetUrl);
                            }
                        }
                    });
                }

                const tdTitle = document.createElement('td');
                const rowPaddingY = '0px';
                tdTitle.style.paddingTop = rowPaddingY;
                tdTitle.style.paddingBottom = rowPaddingY;
                tdTitle.style.verticalAlign = 'bottom';
                const titleLink = document.createElement('a');
                titleLink.href = item.url;
                titleLink.textContent = item.title;
                titleLink.target = '_blank';
                titleLink.style.color = '#1890ff';
                titleLink.style.fontWeight = 'normal';
                // 保持站点默认字号，不进行修改
                titleLink.style.textDecoration = 'none';
                titleLink.style.display = 'inline-block';
                titleLink.style.lineHeight = '1.1';
                titleLink.style.verticalAlign = 'bottom';
                // 修复标题末尾无法点击的问题（被备注列padding遮挡）
                titleLink.style.position = 'relative';
                titleLink.style.zIndex = '5';
                // 单行省略，保持横向布局不换行
                // 桌面端让标题向右延伸到备注列左移产生的空白区
                if (window.innerWidth > 767) {
                    const extraTitleWidth = nsCollectGetCollapsedState() ? 5 : 0;
                    titleLink.style.maxWidth = `calc(100% + ${121 + extraTitleWidth}px)`;
                } else {
                    titleLink.style.maxWidth = '100%';
                }
                titleLink.style.overflow = 'hidden';
                titleLink.style.textOverflow = 'ellipsis';
                titleLink.style.whiteSpace = 'nowrap';
                // 保持默认行高与间距，不做压缩；点击标题直接跳转链接
                titleLink.title = item.title;
                tdTitle.appendChild(titleLink);
                tr.appendChild(tdTitle);

                const tdRemark = document.createElement('td');
                const isMobile = window.innerWidth <= 767;
                tdRemark.style.paddingTop = rowPaddingY;
                tdRemark.style.paddingBottom = rowPaddingY;
                tdRemark.style.verticalAlign = 'bottom';
                tdRemark.style.color = '#888';
                tdRemark.style.fontSize = '12px';
                tdRemark.style.textAlign = 'left';
                tdRemark.style.cssText += 'text-align:left !important;';
                // 备注列整体右移（不改变列宽）
                tdRemark.style.paddingLeft = '18px';
                tdRemark.style.position = 'relative';
                tdRemark.style.left = '110px';
                tdRemark.style.zIndex = '2';
                if (!isMobile) {
                    // 备注列使用固定布局下的列宽，移除硬编码maxWidth，减少空白
                    tdRemark.style.overflow = 'hidden';
                    tdRemark.style.textOverflow = 'ellipsis';
                    tdRemark.style.whiteSpace = 'nowrap';
                } else {
                    tdRemark.style.wordBreak = 'break-word';
                }

                const renderRemark = () => {
                    tdRemark.textContent = '';
                    tdRemark.style.cursor = 'pointer';
                    tdRemark.style.fontSize = '12px';
                    tdRemark.style.lineHeight = '1.1';
                    tdRemark.title = item.remark || '点击编辑备注';

                    const span = document.createElement('span');
                    const hasRemark = !!(item.remark && item.remark.trim());
                    span.textContent = hasRemark ? item.remark : '\u00A0';
                    span.style.fontSize = '12px';
                    span.style.lineHeight = '1.1';
                    if (!isMobile) {
                        /* 块级 + 100% 宽，省略号作用在文本节点上（inline-block 无 max-width 会撑破单元格导致只裁剪无 …） */
                        span.style.display = 'block';
                        span.style.maxWidth = '100%';
                        span.style.overflow = 'hidden';
                        span.style.textOverflow = 'ellipsis';
                        span.style.whiteSpace = 'nowrap';
                    } else {
                        span.style.display = 'block';
                        span.style.maxWidth = '100%';
                        span.style.wordBreak = 'break-word';
                    }

                    tdRemark.appendChild(span);

                    tdRemark.onclick = function (e) {
                        e.stopPropagation();

                        if (tdRemark.querySelector('input')) return;

                        const currentText = item.remark || '';
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.value = currentText;
                        input.style.width = '100%';
                        input.style.maxWidth = '100%';
                        input.style.boxSizing = 'border-box';
                        input.style.padding = '2px';
                        input.style.border = '1px solid #1890ff';
                        input.style.borderRadius = '3px';
                        input.style.fontSize = '12px';
                        if (isMobile) { input.style.padding = '5px'; input.style.fontSize = '14px'; }
                        input.style.height = isMobile ? '28px' : '18px';

                        tdRemark.textContent = '';
                        tdRemark.style.cursor = 'default';
                        tdRemark.style.fontSize = '12px';
                        tdRemark.style.lineHeight = '1.1';
                        tdRemark.onclick = null;
                        tdRemark.appendChild(input);
                        input.focus();

                        const finishEdit = () => {
                            const newRemark = input.value;
                            input.remove();
                            item.remark = newRemark;

                            let favorites = getFavorites();
                            const index = favorites.findIndex(fav => fav.url === item.url);
                            if (index !== -1) {
                                favorites[index].remark = newRemark;
                                setFavorites(favorites);
                                nsCollectLog(`更新收藏备注: ${item.title}`);
                            }
                            renderRemark();
                        };

                        input.onblur = finishEdit;

                        input.onkeydown = function (e) {
                            if (e.key === 'Enter') input.blur();
                            else if (e.key === 'Escape') {
                                input.remove();
                                renderRemark();
                            }
                        };
                        input.onclick = function(e) { e.stopPropagation(); };
                    };
                };

                renderRemark();
                tr.appendChild(tdRemark);

                // 分类列
                const tdCategory = document.createElement('td');
                // 兼容旧数据，没有category字段的默认为"未分类"；展示时不显示"未分类"
                let category = item.category || '未分类';
                tdCategory.style.paddingTop = rowPaddingY;
                tdCategory.style.paddingBottom = rowPaddingY;
                tdCategory.style.color = '#666';
                tdCategory.style.fontSize = '12px';
                tdCategory.style.textAlign = 'left';
                tdCategory.style.paddingLeft = '42px';
                tdCategory.style.whiteSpace = 'nowrap';
                tdCategory.style.position = 'relative';
                tdCategory.style.verticalAlign = 'bottom';
                tdCategory.style.left = '78px';
                tdCategory.style.zIndex = '1';
                tdCategory.style.cursor = 'default';
                tdCategory.style.lineHeight = isMobile ? '1.4' : '1.2';

                const renderCategoryText = (categoryValue) => {
                    const displayText = (categoryValue === '未分类') ? '全部分类' : categoryValue;
                    tdCategory.textContent = '';
                    const categoryText = document.createElement('span');
                    categoryText.textContent = displayText;
                    // 固定点击区域宽度为 4 个中文字符
                    categoryText.style.display = 'inline-block';
                    categoryText.style.width = '4.5em';
                    categoryText.style.overflow = 'hidden';
                    categoryText.style.textOverflow = 'ellipsis';
                    categoryText.style.whiteSpace = 'nowrap';
                    categoryText.style.cursor = 'pointer';
                    categoryText.style.verticalAlign = 'bottom';
                    categoryText.title = '点击修改分类: ' + displayText;

                    categoryText.onclick = function (e) {
                        e.stopPropagation();
                        e.preventDefault();
                        if (tdCategory.querySelector('select')) return;
                        showCategorySelect();
                    };

                    tdCategory.appendChild(categoryText);
                };

                const showCategorySelect = () => {
                    const prevOverflow = tdCategory.style.overflow;
                    const prevZIndex = tdCategory.style.zIndex;
                    const prevPointerEvents = tdCategory.style.pointerEvents;
                    const restoreCategoryCellStyle = () => {
                        tdCategory.style.overflow = prevOverflow;
                        tdCategory.style.zIndex = prevZIndex;
                        tdCategory.style.pointerEvents = prevPointerEvents;
                    };

                    tdCategory.style.overflow = 'visible';
                    tdCategory.style.zIndex = '3';
                    tdCategory.style.pointerEvents = 'none';

                    const select = document.createElement('select');
                    select.style.pointerEvents = 'auto';
                    const categories = getFavoriteCategories();
                    select.style.boxSizing = 'border-box';
                    select.style.position = 'relative';
                    select.style.zIndex = '2';
                    if (isMobile) {
                        select.style.width = '100%';
                        select.style.maxWidth = '100%';
                        select.style.minWidth = '100%';
                        select.style.padding = '5px';
                    } else {
                        select.style.width = '4.5em';
                        select.style.maxWidth = '4.5em';
                        select.style.minWidth = '4.5em';
                        select.style.padding = '0px 2px';
                    }
                    const computedCategoryStyle = window.getComputedStyle(tdCategory);
                    select.style.fontSize = computedCategoryStyle.fontSize || tdCategory.style.fontSize || '12px';
                    select.style.fontFamily = computedCategoryStyle.fontFamily;
                    select.style.fontWeight = computedCategoryStyle.fontWeight;
                    select.style.height = isMobile ? '28px' : '18px';
                    select.style.lineHeight = isMobile ? '1.4' : '1.2';
                    select.style.margin = '0';
                    select.style.border = '0.5px solid rgba(0,0,0,0.5)';
                    select.style.borderRadius = '3px';
                    select.style.outline = 'none';
                    select.style.boxShadow = 'none';
                    select.style.appearance = 'none';
                    select.style.webkitAppearance = 'none';
                    select.style.mozAppearance = 'none';
                    select.style.textAlign = 'left';
                    categories.forEach(cat => {
                        const option = document.createElement('option');
                        option.value = cat;
                        option.textContent = (cat === '未分类') ? '全部分类' : cat;
                        if (cat === category) option.selected = true;
                        select.appendChild(option);
                    });
                    tdCategory.textContent = '';
                    tdCategory.appendChild(select);
                    select.focus();
                    try {
                        if (typeof select.showPicker === 'function') {
                            select.showPicker();
                        } else {
                            select.click();
                            const mouseEventInit = { bubbles: true, cancelable: true, view: window };
                            select.dispatchEvent(new MouseEvent('mousedown', mouseEventInit));
                            select.dispatchEvent(new MouseEvent('mouseup', mouseEventInit));
                            select.dispatchEvent(new MouseEvent('click', mouseEventInit));
                        }
                    } catch (err) { }
                    select.onblur = function () {
                        const newCategory = select.value;
                        select.remove();
                        restoreCategoryCellStyle();
                        category = newCategory;
                        renderCategoryText(newCategory);
                        let favorites = getFavorites();
                        const index = favorites.findIndex(fav => fav.url === item.url);
                        if (index !== -1) {
                            favorites[index].category = newCategory;
                            setFavorites(favorites);
                            nsCollectLog(`更新收藏分类: ${item.title} -> ${newCategory}`);
                            item.category = newCategory;
                        }
                    };
                    select.onkeydown = function (e) {
                        if (e.key === 'Enter') select.blur();
                        else if (e.key === 'Escape') {
                            const oldCategory = category;
                            select.remove();
                            restoreCategoryCellStyle();
                            renderCategoryText(oldCategory);
                        }
                    };
                };

                renderCategoryText(category);
                tr.appendChild(tdCategory);

                const tdTime = document.createElement('td');
                if (item.timestamp) {
                    const date = new Date(item.timestamp);
                    tdTime.textContent = date.getFullYear() + '-' +
                        String(date.getMonth() + 1).padStart(2, '0') + '-' +
                        String(date.getDate()).padStart(2, '0') + ' ' +
                        String(date.getHours()).padStart(2, '0') + ':' +
                        String(date.getMinutes()).padStart(2, '0');
                } else { tdTime.textContent = ''; }
                tdTime.style.paddingTop = rowPaddingY;
                tdTime.style.paddingBottom = rowPaddingY;
                tdTime.style.verticalAlign = 'bottom';
                tdTime.style.fontSize = '12px';
                tdTime.style.whiteSpace = 'nowrap';
                tdTime.style.paddingLeft = '0px';
                tdTime.style.position = 'relative';
                tdTime.style.left = '33px';
                // 提高层级，防止被分类列遮挡导致点击误触分类修改
                tdTime.style.zIndex = '5';
                tr.appendChild(tdTime);

                const tdOp = document.createElement('td');
                tdOp.style.paddingTop = rowPaddingY;
                tdOp.style.paddingBottom = rowPaddingY;
                tdOp.style.verticalAlign = 'bottom';
                tdOp.style.textAlign = 'right';
                tdOp.style.whiteSpace = 'nowrap';

                // 置顶/取消置顶按钮
                const pinBtn = document.createElement('button');
                pinBtn.textContent = item.pinned ? '取消' : '置顶';
                pinBtn.className = 'blacklist-btn';
                pinBtn.style.fontSize = '11px';
                pinBtn.style.marginRight = '4px';
                pinBtn.style.padding = '2px 4px';
                // 稍微区分颜色
                pinBtn.style.color = item.pinned ? '#faad14' : '#1890ff';
                pinBtn.style.border = `1px solid ${item.pinned ? '#faad14' : '#1890ff'}`;
                pinBtn.style.background = '#fff';

                pinBtn.onclick = function(e) {
                    e.stopPropagation();
                    togglePin(item.url);
                };
                tdOp.appendChild(pinBtn);

                const removeBtn = document.createElement('button');
                removeBtn.textContent = '移除';
                removeBtn.className = 'blacklist-btn red';
                removeBtn.style.fontSize = '11px';
                removeBtn.onclick = function (e) {
                    e.stopPropagation();
                    if (confirm(`确定要移除该收藏？\n${item.title}`)) {
                        if (removeFromFavorites(item.url)) {
                            // 移除后重新搜索以刷新列表
                            performSearch();
                        }
                    }
                };
                tdOp.appendChild(removeBtn);
                tr.appendChild(tdOp);

                // 仅在非“收藏时间/操作”区域按下鼠标时允许拖拽
                if (isDragEnabled) {
                    const enableDrag = (e) => {
                        // 如果点击的是输入框或下拉框，不要启用拖拽
                        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) {
                            tr.draggable = false;
                            return;
                        }
                        tr.draggable = true;
                    };
                    const disableDrag = () => { tr.draggable = false; };

                    const bindEnable = (el) => {
                        if (!el) return;
                        el.addEventListener('mousedown', enableDrag, true);
                        el.addEventListener('pointerdown', enableDrag, true);
                    };
                    const bindDisable = (el) => {
                        if (!el) return;
                        el.addEventListener('mouseenter', disableDrag, true);
                        el.addEventListener('mouseover', disableDrag, true);
                        el.addEventListener('mousedown', disableDrag, true);
                        el.addEventListener('pointerdown', disableDrag, true);
                    };

                    bindEnable(tdTitle);

                    bindDisable(tdTime);
                    bindDisable(tdOp);

                    tr.addEventListener('mouseleave', disableDrag, true);
                }

                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            contentRoot.appendChild(tableWrapper);
        }

        function performSearch() {
            const kw = normalizeForSearch(searchInput.value.trim());
            const selectedCategory = categoryFilter.value;
            let base = getFavorites();
            // 兼容旧数据
            base.forEach(item => {
                if (!item.category) {
                    item.category = '未分类';
                }
                if (typeof item.pinned === 'undefined') {
                    item.pinned = false;
                }
            });
            // 移除默认的时间排序，改用列表本身的顺序（支持拖拽排序）
            // base = base.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

            // 先按分类筛选
            let filtered = base;
            if (selectedCategory) {
                filtered = filtered.filter(item => (item.category || '未分类') === selectedCategory);
            }

            // 再按关键词搜索
            if (kw) {
                filtered = filtered.filter(item =>
                    (item.title && normalizeForSearch(item.title).includes(kw)) ||
                    (item.remark && normalizeForSearch(item.remark).includes(kw))
                );
                title.textContent = `收藏列表 (${filtered.length}条搜索结果)`;
            } else {
                if (selectedCategory) {
                    title.textContent = `收藏列表 (${filtered.length}条 - ${selectedCategory})`;
                } else {
                    title.textContent = `收藏列表 (${filtered.length}条)`;
                }
            }

            // 只有在无搜索词且无分类筛选（显示全部）时，才允许拖拽排序
            const isDragEnabled = !kw && !selectedCategory;
            renderTable(filtered, isDragEnabled);
        }

        // 添加实时搜索事件监听
        searchInput.addEventListener('input', performSearch);
        categoryFilter.addEventListener('change', performSearch);

        // 初次渲染（通过 performSearch 触发，确保逻辑一致）
        performSearch();

        document.body.appendChild(dialog);
        // 内容根节点占据剩余空间，未满600px时自然高度；超过时由内容根自身滚动
        try {
            contentRoot.style.flex = '1 1 auto';
            contentRoot.style.minHeight = '0'; // 使flex子项可在父容器内滚动
            contentRoot.style.overflowY = 'auto';
            contentRoot.style.overflowX = 'hidden';
        } catch (e) { }
        if (!isMobile && typeof window.makeDraggable === 'function') {
            try { window.makeDraggable(dialog, { width: 30, height: 30 }); } catch (e) { }
        }
    }

    // 显示分类管理弹窗
    function showCategoryManageDialog() {
        const existingDialog = document.getElementById('category-manage-dialog');
        if (existingDialog) {
            existingDialog.remove();
            return;
        }

        const dialog = document.createElement('div');
        dialog.id = 'category-manage-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.zIndex = 10001;
        dialog.style.background = '#fff';
        dialog.style.border = '1px solid #ccc';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        dialog.style.padding = '20px';
        dialog.style.minWidth = '400px';
        dialog.style.maxWidth = '90%';
        dialog.style.maxHeight = '80vh';
        dialog.style.overflowY = 'auto';

        const isMobile = (window.NodeSeekFilter && typeof window.NodeSeekFilter.isMobileDevice === 'function')
            ? window.NodeSeekFilter.isMobileDevice()
            : (window.innerWidth <= 767);
        if (isMobile) {
            dialog.style.width = '90%';
            dialog.style.minWidth = 'unset';
        }

        // 标题
        const titleBar = document.createElement('div');
        titleBar.style.display = 'flex';
        titleBar.style.justifyContent = 'space-between';
        titleBar.style.alignItems = 'center';
        titleBar.style.marginBottom = '15px';

        const title = document.createElement('div');
        title.textContent = '分类管理';
        title.style.fontWeight = 'bold';
        title.style.fontSize = '16px';
        titleBar.appendChild(title);

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.color = '#999';
        closeBtn.onclick = function () { dialog.remove(); };
        titleBar.appendChild(closeBtn);

        dialog.appendChild(titleBar);

        // 分类列表
        const categoryList = document.createElement('div');
        categoryList.id = 'category-list';
        dialog.appendChild(categoryList);

        function renderCategoryList() {
            categoryList.innerHTML = '';
            const categories = getFavoriteCategories();
            const favorites = getFavorites();
            // 在分类管理列表中隐藏默认分类“未分类”
            const displayCategories = categories.filter(cat => cat !== '未分类');

            if (displayCategories.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = '暂无分类';
                empty.style.textAlign = 'center';
                empty.style.color = '#888';
                empty.style.padding = '20px';
                categoryList.appendChild(empty);
                return;
            }

            displayCategories.forEach(category => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.padding = '5px';
                item.style.borderBottom = '1px solid #eee';
                item.style.marginBottom = '2px';

                const leftDiv = document.createElement('div');
                leftDiv.style.flex = '1';

                const nameDiv = document.createElement('div');
                nameDiv.textContent = category;
                nameDiv.style.fontSize = '14px';
                nameDiv.style.fontWeight = '500';
                leftDiv.appendChild(nameDiv);

                // 移除每个分类下的“X条收藏”计数文案

                item.appendChild(leftDiv);

                const btnDiv = document.createElement('div');
                btnDiv.style.display = 'flex';
                btnDiv.style.gap = '5px';

                if (category !== '未分类') {
                    // 重命名按钮
                    const renameBtn = document.createElement('button');
                    renameBtn.textContent = '重命名';
                    renameBtn.className = 'blacklist-btn';
                    renameBtn.style.fontSize = '11px';
                    renameBtn.style.padding = '4px 8px';
                    renameBtn.onclick = function () {
                        const newName = prompt('请输入新分类名称（最多4个字符）：', category);
                        const normalized = normalizeFavoriteCategoryName(newName);
                        if (normalized && normalized !== category) {
                            if (renameFavoriteCategory(category, normalized)) {
                                renderCategoryList();
                                // 刷新收藏列表弹窗
                                const favoritesDialog = document.getElementById('favorites-dialog');
                                if (favoritesDialog) {
                                    favoritesDialog.remove();
                                    showFavoritesDialog();
                                }
                                nsCollectLog(`重命名分类: ${category} -> ${normalized}`);
                            } else {
                                alert('重命名失败：分类名称已存在或超过字符限制');
                            }
                        }
                    };
                    btnDiv.appendChild(renameBtn);

                    // 删除按钮
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = '删除';
                    deleteBtn.className = 'blacklist-btn red';
                    deleteBtn.style.fontSize = '11px';
                    deleteBtn.style.padding = '4px 8px';
                    deleteBtn.onclick = function () {
                        if (confirm(`确定要删除分类"${category}"吗？该分类下的收藏将移动到"全部分类"。`)) {
                            if (removeFavoriteCategory(category)) {
                                renderCategoryList();
                                // 刷新收藏列表弹窗
                                const favoritesDialog = document.getElementById('favorites-dialog');
                                if (favoritesDialog) {
                                    favoritesDialog.remove();
                                    showFavoritesDialog();
                                }
                                nsCollectLog(`删除分类: ${category}`);
                            } else {
                                alert('删除失败');
                            }
                        }
                    };
                    btnDiv.appendChild(deleteBtn);
                } else {
                    // 原标注“默认分类”移除：不再在未分类项右侧显示说明文字
                }

                item.appendChild(btnDiv);
                categoryList.appendChild(item);
            });
        }

        renderCategoryList();

        // 添加分类区域
        const addCategoryDiv = document.createElement('div');
        addCategoryDiv.style.marginTop = '20px';
        addCategoryDiv.style.paddingTop = '20px';
        addCategoryDiv.style.borderTop = '1px solid #eee';

        const addLabel = document.createElement('div');
        addLabel.textContent = '添加新分类（最多6个）';
        addLabel.style.fontSize = '14px';
        addLabel.style.fontWeight = '500';
        addLabel.style.marginBottom = '10px';
        addCategoryDiv.appendChild(addLabel);

        const addInputDiv = document.createElement('div');
        addInputDiv.style.display = 'flex';
        addInputDiv.style.gap = '8px';

        const addInput = document.createElement('input');
        addInput.type = 'text';
        addInput.placeholder = '请输入分类名称（最多4个字符）';
        addInput.style.flex = '1';
        addInput.style.padding = isMobile ? '10px' : '6px 8px';
        addInput.style.border = '1px solid #ddd';
        addInput.style.borderRadius = '4px';
        addInput.style.fontSize = isMobile ? '16px' : '13px';
        addInput.style.outline = 'none';
        // 添加字符长度提示
        const lengthHint = document.createElement('div');
        lengthHint.style.fontSize = '12px';
        lengthHint.style.color = '#999';
        lengthHint.style.marginLeft = '8px';
        lengthHint.style.whiteSpace = 'nowrap';
        lengthHint.textContent = '0/4';
        addInputDiv.appendChild(addInput);

        // 实时显示字符长度
        let isComposingCategoryName = false;
        addInput.addEventListener('compositionstart', function () { isComposingCategoryName = true; });
        addInput.addEventListener('compositionend', function () {
            isComposingCategoryName = false;
            if (this.value.length > FAVORITE_CATEGORY_NAME_MAX_LEN) {
                this.value = this.value.slice(0, FAVORITE_CATEGORY_NAME_MAX_LEN);
            }
            lengthHint.textContent = `${this.value.length}/${FAVORITE_CATEGORY_NAME_MAX_LEN}`;
            lengthHint.style.color = '#999';
        });
        addInput.addEventListener('input', function () {
            if (isComposingCategoryName) {
                lengthHint.textContent = `${this.value.length}/${FAVORITE_CATEGORY_NAME_MAX_LEN}`;
                return;
            }
            if (this.value.length > FAVORITE_CATEGORY_NAME_MAX_LEN) {
                this.value = this.value.slice(0, FAVORITE_CATEGORY_NAME_MAX_LEN);
            }
            lengthHint.textContent = `${this.value.length}/${FAVORITE_CATEGORY_NAME_MAX_LEN}`;
            lengthHint.style.color = '#999';
        });

        const addBtn = document.createElement('button');
        addBtn.textContent = '添加';
        addBtn.className = 'blacklist-btn';
        addBtn.style.padding = isMobile ? '10px 16px' : '6px 12px';
        addBtn.onclick = function () {
            const categories = getFavoriteCategories();
            const customCount = categories.filter(c => c !== '未分类').length;
            if (customCount >= FAVORITE_CATEGORY_MAX_COUNT) {
                alert(`分类数量已达上限（${FAVORITE_CATEGORY_MAX_COUNT}个）`);
                return;
            }

            const categoryName = normalizeFavoriteCategoryName(addInput.value);
            if (!categoryName) {
                alert('请输入分类名称');
                return;
            }
            if (addFavoriteCategory(categoryName)) {
                addInput.value = '';
                lengthHint.textContent = '0/4';
                lengthHint.style.color = '#999';
                renderCategoryList();
                // 刷新收藏列表弹窗
                const favoritesDialog = document.getElementById('favorites-dialog');
                if (favoritesDialog) {
                    favoritesDialog.remove();
                    showFavoritesDialog();
                }
                nsCollectLog(`添加分类: ${categoryName}`);
            } else {
                alert('添加失败：分类名称已存在或超过数量/字符限制');
            }
        };
        addInput.onkeydown = function (e) {
            if (e.key === 'Enter') {
                addBtn.onclick();
            }
        };
        addInputDiv.appendChild(addBtn);

        addCategoryDiv.appendChild(addInputDiv);
        dialog.appendChild(addCategoryDiv);

        document.body.appendChild(dialog);
        // 修正拖拽“乱飘”：在桌面端取消居中 transform，使用像素化 left/top 作为拖拽基准
        if (!isMobile && typeof window.makeDraggable === 'function') {
            try {
                const rect = dialog.getBoundingClientRect();
                dialog.style.transform = 'none';
                dialog.style.right = 'auto';
                dialog.style.left = rect.left + 'px';
                dialog.style.top = Math.max(0, rect.top) + 'px';
                window.makeDraggable(dialog, { width: 30, height: 30 });
            } catch (e) { }
        }
        if (addInput) addInput.focus();
    }

    // 显示添加收藏弹窗
    function showAddFavoriteDialog() {
        const existingDialog = document.getElementById('add-favorite-dialog');
        if (existingDialog) {
            existingDialog.remove();
            return;
        }

        // 检查当前页面是否已收藏
        const isFavorited = isCurrentPageFavorited();
        const currentFavorite = isFavorited ? getFavorites().find(f => f.url === window.location.href) : null;

        const dialog = document.createElement('div');
        dialog.id = 'add-favorite-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.zIndex = 10001;
        dialog.style.background = '#fff';
        dialog.style.border = '1px solid #ccc';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        dialog.style.padding = '20px';
        dialog.style.minWidth = '350px';
        dialog.style.maxWidth = '90%';

        const isMobile = (window.NodeSeekFilter && typeof window.NodeSeekFilter.isMobileDevice === 'function')
            ? window.NodeSeekFilter.isMobileDevice()
            : (window.innerWidth <= 767);
        if (isMobile) {
            dialog.style.width = '90%';
            dialog.style.minWidth = 'unset';
        }

        // 标题
        const titleBar = document.createElement('div');
        titleBar.style.display = 'flex';
        titleBar.style.justifyContent = 'space-between';
        titleBar.style.alignItems = 'center';
        titleBar.style.marginBottom = '15px';

        const title = document.createElement('div');
        title.textContent = isFavorited ? '编辑收藏' : '添加收藏';
        title.style.fontWeight = 'bold';
        title.style.fontSize = '16px';
        titleBar.appendChild(title);

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.color = '#999';
        closeBtn.onclick = function () { dialog.remove(); };
        titleBar.appendChild(closeBtn);

        dialog.appendChild(titleBar);

        // 备注输入
        const remarkLabel = document.createElement('div');
        remarkLabel.textContent = '备注（可选）：';
        remarkLabel.style.fontSize = '14px';
        remarkLabel.style.marginBottom = '8px';
        dialog.appendChild(remarkLabel);

        const remarkInput = document.createElement('input');
        remarkInput.type = 'text';
        remarkInput.placeholder = '请输入备注';
        remarkInput.value = currentFavorite ? (currentFavorite.remark || '') : '';
        remarkInput.style.width = '100%';
        remarkInput.style.padding = isMobile ? '10px' : '6px 8px';
        remarkInput.style.border = '1px solid #ddd';
        remarkInput.style.borderRadius = '4px';
        remarkInput.style.fontSize = isMobile ? '16px' : '13px';
        remarkInput.style.outline = 'none';
        remarkInput.style.boxSizing = 'border-box';
        remarkInput.style.marginBottom = '15px';
        dialog.appendChild(remarkInput);

        // 分类选择
        const categoryLabel = document.createElement('div');
        categoryLabel.textContent = '分类：';
        categoryLabel.style.fontSize = '14px';
        categoryLabel.style.marginBottom = '8px';
        dialog.appendChild(categoryLabel);

        const categorySelect = document.createElement('select');
        categorySelect.style.width = '100%';
        categorySelect.style.padding = isMobile ? '10px 8px' : '6px 8px';
        categorySelect.style.border = '1px solid #ddd';
        categorySelect.style.borderRadius = '4px';
        categorySelect.style.fontSize = isMobile ? '16px' : '13px';
        categorySelect.style.outline = 'none';
        categorySelect.style.boxSizing = 'border-box';
        categorySelect.style.background = '#fff';
        categorySelect.style.cursor = 'pointer';
        categorySelect.style.marginBottom = '20px';

        const categories = getFavoriteCategories();
        const currentCategory = currentFavorite ? (currentFavorite.category || '未分类') : '未分类';
        categories.forEach(cat => {
            const option = document.createElement('option');
            // 值保持真实分类名，展示将“未分类”映射为“全部分类”
            option.value = cat;
            option.textContent = (cat === '未分类') ? '全部分类' : cat;
            if (cat === currentCategory) option.selected = true;
            categorySelect.appendChild(option);
        });

        dialog.appendChild(categorySelect);

        // 按钮区域
        const btnDiv = document.createElement('div');
        btnDiv.style.display = 'flex';
        btnDiv.style.justifyContent = 'flex-end';
        btnDiv.style.gap = '10px';

        // 取消按钮移除：仅保留确定按钮；可用右上角“×”关闭弹窗

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确定';
        confirmBtn.className = 'blacklist-btn';
        confirmBtn.style.background = '#1890ff';
        confirmBtn.style.padding = isMobile ? '10px 16px' : '6px 12px';
        confirmBtn.onclick = function () {
            const remark = remarkInput.value.trim();
            const category = categorySelect.value;
            addToFavorites(remark, category);
            dialog.remove();
        };
        btnDiv.appendChild(confirmBtn);

        dialog.appendChild(btnDiv);

        document.body.appendChild(dialog);
        remarkInput.focus();

        // 回车键确认
        remarkInput.onkeydown = function (e) {
            if (e.key === 'Enter') {
                confirmBtn.onclick();
            }
        };
        categorySelect.onkeydown = function (e) {
            if (e.key === 'Enter') {
                confirmBtn.onclick();
            }
        };
    }

    // 显示收藏或取消收藏按钮
    function addFavoriteButton() {
        // 只在帖子页面添加收藏按钮
        if (!window.location.pathname.includes('/topic/') &&
            !window.location.pathname.includes('/article/')) {
            return;
        }

        // 如果已经存在，则不重复添加
        if (document.getElementById('favorite-btn')) {
            return;
        }

        // 尝试找到页面中合适的位置添加按钮
        // 通常在帖子标题旁边或帖子操作区域
        const headerArea = document.querySelector('.topic-header .topic-title') ||
            document.querySelector('.thread-header h1') ||
            document.querySelector('.article-header h1') ||
            document.querySelector('.topic-detail-header h1');

        if (!headerArea) return;

        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'inline-block';
        buttonContainer.style.marginLeft = '8px';
        buttonContainer.style.verticalAlign = 'middle';

        // 创建收藏按钮
        const favoriteBtn = document.createElement('button');
        favoriteBtn.id = 'favorite-btn';
        favoriteBtn.className = 'favorite-btn';

        // 检查当前页面是否已收藏
        const isFavorited = isCurrentPageFavorited();
        if (isFavorited) {
            favoriteBtn.textContent = '取消收藏';
            favoriteBtn.classList.add('favorited');
        } else {
            favoriteBtn.textContent = '收藏';
        }

        // 添加点击事件
        favoriteBtn.onclick = function () {
            if (isFavorited) {
                // 取消收藏
                if (confirm('确定要取消收藏吗？')) {
                    if (removeFromFavorites(window.location.href)) {
                        favoriteBtn.textContent = '收藏';
                        favoriteBtn.classList.remove('favorited');
                    }
                }
            } else {
                // 添加收藏 - 使用自定义弹窗选择分类
                showAddFavoriteDialog();
                // 延迟更新按钮状态，等待弹窗关闭
                setTimeout(function () {
                    if (isCurrentPageFavorited()) {
                        favoriteBtn.textContent = '取消收藏';
                        favoriteBtn.classList.add('favorited');
                    }
                }, 100);
            }
        };

        buttonContainer.appendChild(favoriteBtn);
        headerArea.appendChild(buttonContainer);
    }
    window.NodeSeekCollect = {
        getFavorites,
        setFavorites,
        getFavoriteCategories,
        setFavoriteCategories,
        addFavoriteCategory,
        removeFavoriteCategory,
        renameFavoriteCategory,
        addToFavorites,
        removeFromFavorites,
        isCurrentPageFavorited,
        getCurrentPageFavoriteRemark,
        importOfficialNsCollectionsIntoFavorites,
        showFavoritesDialog,
        showAddFavoriteDialog,
        addFavoriteButton,
    };
})();
