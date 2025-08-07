// ========== 关键词过滤功能 ==========

const SIMPLIFIED_TO_TRADITIONAL = {
    // 基础常用字
    '中': '中', '国': '國', '人': '人', '大': '大', '不': '不', '一': '一', '是': '是', '了': '了', '我': '我', '就': '就',
    '有': '有', '他': '他', '这': '這', '个': '個', '们': '們', '来': '來', '到': '到', '时': '時', '会': '會', '可': '可',
    '说': '說', '她': '她', '也': '也', '你': '你', '对': '對', '能': '能', '好': '好', '都': '都', '两': '兩', '没': '沒',
    '为': '為', '又': '又', '从': '從', '当': '當', '关': '關', '还': '還', '因': '因', '样': '樣', '那': '那', '很': '很',
    '后': '後', '听': '聽', '让': '讓', '过': '過', '见': '見', '想': '想', '现': '現', '开': '開', '使': '使', '学': '學',
    '应': '應', '点': '點', '经': '經', '长': '長', '间': '間', '问': '問', '通': '通', '同': '同', '已': '已', '给': '給',
    '知': '知', '水': '水', '手': '手', '实': '實', '体': '體', '明': '明', '行': '行', '高': '高', '无': '無',
    '去': '去', '子': '子', '得': '得', '于': '於', '自': '自', '第': '第', '民': '民', '发': '發', '向': '向', '道': '道',
    '理': '理', '看': '看', '只': '只', '之': '之', '种': '種', '将': '將', '干': '幹', '各': '各', '其': '其', '内': '內',
    '由': '由', '被': '被', '些': '些', '如': '如', '走': '走', '相': '相', '主': '主', '产': '產', '总': '總', '条': '條',
    '部': '部', '员': '員', '公': '公', '当': '當', '与': '與', '义': '義', '话': '話', '等': '等', '所': '所', '新': '新',
    '并': '並', '外': '外', '深': '深', '表': '表', '路': '路', '电': '電', '数': '數', '正': '正', '心': '心', '反': '反',
    '面': '面', '告': '告', '最': '最', '即': '即', '结': '結', '再': '再', '念': '念', '西': '西', '风': '風',
    '快': '快', '才': '才', '权': '權', '条': '條', '儿': '兒', '原': '原', '东': '東', '声': '聲', '收': '收', '处': '處',
    '今': '今', '其': '其', '书': '書', '变': '變', '清': '清', '美': '美', '团': '團', '质': '質', '做': '做', '斯': '斯',
    '然': '然', '动': '動', '量': '量', '全': '全', '合': '合', '什': '什', '统': '統', '据': '據', '而': '而', '要': '要',
    '下': '下', '月': '月', '真': '真', '认': '認', '几': '幾', '许': '許', '象': '象', '爱': '愛', '却': '卻',
    '台': '臺', '历': '歷', '轻': '輕', '专': '專', '转': '轉', '传': '傳', '选': '選', '连': '連', '车': '車',
    '压': '壓', '适': '適', '进': '進', '社': '社', '果': '果', '标': '標', '语': '語', '司': '司', '完': '完',
    '热': '熱', '候': '候', '活': '活', '界': '界', '带': '帶', '导': '導', '争': '爭', '运': '運', '笔': '筆', '构': '構',
    '房': '房', '视': '視', '白': '白', '维': '維', '消': '消', '极': '極', '精': '精', '毛': '毛', '静': '靜', '际': '際',
    '品': '品', '土': '土', '复': '復', '需': '需', '空': '空', '决': '決', '治': '治', '展': '展',
    '图': '圖', '写': '寫', '整': '整', '确': '確', '议': '議', '利': '利', '尔': '爾', '装': '裝', '众': '眾', '概': '概',
    '比': '比', '阶': '階', '易': '易', '早': '早', '论': '論', '换': '換', '医': '醫', '校': '校', '典': '典', '破': '破',
    '老': '老', '线': '線', '农': '農', '克': '克', '达': '達', '光': '光', '放': '放', '具': '具', '住': '住',
    '价': '價', '买': '買', '南': '南', '录': '錄', '太': '太', '紧': '緊', '领': '領', '职': '職',
    
    // 技术/网络论坛常用词汇
    '网': '網', '络': '絡', '计': '計', '算': '算', '机': '機', '服': '服', '务': '務', '器': '器',
    '测': '測', '试': '試', '软': '軟', '件': '件', '硬': '硬', '盘': '盤', '内': '內', '存': '存',
    '显': '顯', '卡': '卡', '处': '處', '理': '理', '芯': '芯', '片': '片', '主': '主', '板': '板',
    '电': '電', '源': '源', '风': '風', '扇': '扇', '散': '散', '热': '熱', '温': '溫', '度': '度',
    '系': '系', '统': '統', '操': '操', '作': '作', '程': '程', '序': '序', '软': '軟', '件': '件',
    '数': '數', '据': '據', '库': '庫', '备': '備', '份': '份', '恢': '恢', '复': '復', '安': '安',
    '装': '裝', '配': '配', '置': '置', '设': '設', '定': '定', '优': '優', '化': '化', '升': '升',
    '级': '級', '更': '更', '新': '新', '版': '版', '本': '本', '补': '補', '丁': '丁', '修': '修',
    '复': '復', '漏': '漏', '洞': '洞', '安': '安', '全': '全', '防': '防', '火': '火', '墙': '牆',
    '杀': '殺', '毒': '毒', '加': '加', '密': '密', '解': '解', '压': '壓', '缩': '縮', '文': '文',
    '档': '檔', '夹': '夾', '目': '目', '录': '錄', '路': '路', '径': '徑', '链': '鏈', '接': '接',
    '下': '下', '载': '載', '上': '上', '传': '傳', '速': '速', '网': '網', '站': '站', '页': '頁',
    '面': '面', '浏': '瀏', '览': '覽', '器': '器', '搜': '搜', '索': '索', '引': '引', '擎': '擎',
    '邮': '郵', '箱': '箱', '账': '賬', '号': '號', '密': '密', '码': '碼', '登': '登', '录': '錄',
    '注': '註', '册': '冊', '验': '驗', '证': '證', '权': '權', '限': '限', '管': '管', '理': '理',
    '用': '用', '户': '戶', '组': '組', '角': '角', '色': '色', '权': '權', '限': '限', '访': '訪',
    '问': '問', '控': '控', '制': '制', '监': '監', '控': '控', '日': '日', '志': '誌', '记': '記',
    '录': '錄', '报': '報', '告': '告', '统': '統', '计': '計', '分': '分', '析': '析', '图': '圖',
    '表': '表', '图': '圖', '像': '像', '视': '視', '频': '頻', '音': '音', '频': '頻', '格': '格',
    '式': '式', '编': '編', '码': '碼', '解': '解', '码': '碼', '转': '轉', '换': '換', '格': '格'
};

// 简体转繁体函数
function convertSimplifiedToTraditional(text) {
    return text.split('').map(char => SIMPLIFIED_TO_TRADITIONAL[char] || char).join('');
}

// 繁体转简体函数
function convertTraditionalToSimplified(text) {
    const traditionalToSimplified = {};
    Object.keys(SIMPLIFIED_TO_TRADITIONAL).forEach(key => {
        traditionalToSimplified[SIMPLIFIED_TO_TRADITIONAL[key]] = key;
    });
    return text.split('').map(char => traditionalToSimplified[char] || char).join('');
}

// 文本标准化函数（去空格、转小写、简繁体统一）
function normalizeText(text) {
    // 1. 去除空格
    let normalized = text.replace(/\s+/g, '');
    // 2. 转为小写
    normalized = normalized.toLowerCase();
    // 3. 转换为简体（统一标准）
    normalized = convertTraditionalToSimplified(normalized);
    return normalized;
}

function filterPosts(blacklistKeywords = [], whitelistKeywords = []) {
    
    // 尝试多种可能的CSS选择器
    let postItems = document.querySelectorAll('ul.post-list > li.post-list-item');
    
    // 如果第一个选择器没找到，尝试其他可能的选择器
    if (postItems.length === 0) {
        const selectors = [
            'ul.post-list > li',
            '.post-list > li',
            '.post-list-item',
            '.post-item',
            '.topic-item',
            'div[class*="post"]',
            'li[class*="post"]',
            'tr[class*="post"]', // 可能是表格布局
            '.topic-list tr',
            '.topic-list > tr'
        ];
        
        for (const selector of selectors) {
            postItems = document.querySelectorAll(selector);
            if (postItems.length > 0) {
                break;
            }
        }
    }
    
    // 如果还是没找到，直接返回
    if (postItems.length === 0) {
        return;
    }
    
    let showCount = 0;
    
    postItems.forEach((item, index) => {
        // 尝试多种方式获取帖子标题
        let titleEl = item.querySelector('.post-title a');
        let title = titleEl ? titleEl.textContent.trim() : '';
        
        // 如果没找到标题，尝试其他选择器
        if (!title) {
            const titleSelectors = [
                'a[href*="/topic/"]',
                'a[href*="/post"]', 
                '.post-title',
                '.topic-title',
                '.title',
                'h3 a',
                'h4 a',
                '.subject a',
                'td a', // 表格布局可能的标题
                'a[class*="title"]',
                'a[class*="subject"]',
                'a'  // 最后尝试任何链接
            ];
            
            for (const selector of titleSelectors) {
                titleEl = item.querySelector(selector);
                if (titleEl && titleEl.textContent.trim()) {
                    title = titleEl.textContent.trim();
                    break;
                }
            }
        }
        

        
        let shouldShow = true;
        
        // 如果有白名单关键词，则只显示同时匹配所有白名单关键词的帖子
        if (whitelistKeywords.length > 0) {
            shouldShow = whitelistKeywords.every(kw => kw && normalizeText(title).includes(normalizeText(kw)));
        }
        
        // 在白名单过滤基础上，再隐藏黑名单帖子
        if (shouldShow && blacklistKeywords.length > 0) {
            const containsBlacklist = blacklistKeywords.some(kw => kw && normalizeText(title).includes(normalizeText(kw)));
            if (containsBlacklist) {
                shouldShow = false;
            }
        }
        
        if (shouldShow) {
            item.style.display = '';
            showCount++;
        } else {
            item.style.display = 'none';
        }
    });
    

}

// 保存关键词到 localStorage
function saveKeywords(keywords) {
    if (keywords && keywords.length > 0) {
        localStorage.setItem('ns-filter-keywords', JSON.stringify(keywords));
    } else {
        localStorage.removeItem('ns-filter-keywords');
    }
}

// 从 localStorage 获取关键词
function getKeywords() {
    const saved = localStorage.getItem('ns-filter-keywords');
    return saved ? JSON.parse(saved) : [];
}



// 保存自定义关键词列表到 localStorage
function saveCustomKeywords(keywords) {
    localStorage.setItem('ns-filter-custom-keywords', JSON.stringify(keywords));
}

// 从 localStorage 获取自定义关键词列表
function getCustomKeywords() {
    const saved = localStorage.getItem('ns-filter-custom-keywords');
    return saved ? JSON.parse(saved) : [];
}

// 添加单个关键词到自定义列表
function addCustomKeyword(keyword) {
    if (!keyword || !keyword.trim()) return false;
    
    const keywords = getCustomKeywords();
    const normalizedKeyword = keyword.trim();
    
    // 检查长度限制（10个字符）
    if (normalizedKeyword.length > 10) {
        return 'too_long';
    }
    
    // 检查是否已存在（不区分大小写和简繁体）
    const exists = keywords.some(existing => 
        normalizeText(existing) === normalizeText(normalizedKeyword)
    );
    
    if (!exists) {
        keywords.push(normalizedKeyword);
        saveCustomKeywords(keywords);
        return true;
    }
    return false;
}

// 从自定义列表删除关键词
function removeCustomKeyword(keyword) {
    const keywords = getCustomKeywords();
    const filtered = keywords.filter(k => k !== keyword);
    saveCustomKeywords(filtered);
    return filtered;
}

// 保存弹窗位置到 localStorage
function saveDialogPosition(position) {
    localStorage.setItem('ns-filter-dialog-position', JSON.stringify(position));
}

// 从 localStorage 获取弹窗位置
function getDialogPosition() {
    const saved = localStorage.getItem('ns-filter-dialog-position');
    return saved ? JSON.parse(saved) : null;
}

// 检查是否为移动设备
function isMobileDevice() {
    return window.innerWidth <= 767 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 清除过滤显示效果，恢复所有帖子显示（不清除已保存的关键词）
function clearFilterDisplay() {
    const postItems = document.querySelectorAll('ul.post-list > li.post-list-item');
    postItems.forEach(item => {
        item.style.display = '';
    });
}

// 完全清除过滤效果和所有保存的数据
function clearFilter() {
    clearFilterDisplay();
    localStorage.removeItem('ns-filter-keywords');
    localStorage.removeItem('ns-filter-custom-keywords'); // 清除自定义关键词
    localStorage.removeItem('ns-filter-dialog-position'); // 清除弹窗位置
}

// 创建关键词输入界面（弹窗）
function createFilterUI(onFilter) {
    const existing = document.getElementById('ns-keyword-filter-dialog');
    if (existing) {
        existing.remove();
        return;
    }
    const dialog = document.createElement('div');
    dialog.id = 'ns-keyword-filter-dialog';
    dialog.style.position = 'fixed';
    dialog.style.zIndex = 10001;
    dialog.style.background = '#fff';
    dialog.style.borderRadius = '12px'; // Default for desktop
    dialog.style.boxShadow = '0 4px 18px rgba(0,0,0,0.18)'; // Default for desktop
    dialog.style.fontSize = '16px';
    dialog.style.color = '#222';
    dialog.style.lineHeight = '2';
    dialog.style.border = '2px solid #4CAF50';
    dialog.style.userSelect = 'auto';

    // 检查是否为移动设备
    const isMobile = isMobileDevice();
    
    // 获取保存的位置
    const savedPosition = getDialogPosition();
    
    if (isMobile) {
        // 移动端样式：始终居中，不支持拖拽
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
        dialog.style.zIndex = 10002; // 确保在移动端显示在最前面
    } else {
        // 桌面端样式
        dialog.style.minWidth = '380px';
        dialog.style.maxWidth = '380px';
        dialog.style.width = '380px';
        dialog.style.padding = '18px 24px 16px 24px';
        dialog.style.maxHeight = 'unset';
        dialog.style.overflowY = 'auto';
        dialog.style.overflowX = 'hidden';
        dialog.style.transform = 'none';
        
        // 获取当前显示关键词，判断是否应该恢复位置
        const currentWhitelistKeywords = getKeywords();
        
        // 只有当前有显示关键词时，才应用保存的位置
        if (currentWhitelistKeywords.length > 0 && savedPosition && savedPosition.left !== undefined && savedPosition.top !== undefined) {
            // 验证保存的位置是否仍在屏幕内
            const maxLeft = window.innerWidth - 400; // 弹窗最小宽度
            const maxTop = window.innerHeight - 200; // 弹窗最小高度
            
            dialog.style.left = Math.max(0, Math.min(savedPosition.left, maxLeft)) + 'px';
            dialog.style.top = Math.max(0, Math.min(savedPosition.top, maxTop)) + 'px';
            dialog.style.right = 'auto';
        } else {
            // 没有显示关键词时，使用默认位置
            dialog.style.top = '60px';
            dialog.style.right = '16px';
            dialog.style.left = 'auto';
        }
    }

    dialog.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-weight:bold;font-size:17px;">关键词过滤</span>
            <span id="ns-keyword-filter-close" style="cursor:pointer;font-size:22px;line-height:1;">×</span>
        </div>
        
        <!-- 屏蔽关键词管理 -->
        <div style="margin-bottom:12px;">
            <label style="font-weight:bold;color:#f44336;">🚫 屏蔽关键词：</label><br>
            <div style="margin-bottom:6px;font-size:13px;color:#666;line-height:1.4;">
                添加后永久隐藏包含这些关键词的帖子 • 限制10个字符以内
            </div>
            <div style="margin-bottom:6px;font-size:12px;color:#2196F3;line-height:1.3;">
                💡 提示：屏蔽用户请使用官方功能 
                <a href="https://www.nodeseek.com/setting#block" target="_blank" style="color:#2196F3;text-decoration:underline;">点击跳转</a>
            </div>
            <div style="display:flex;gap:4px;margin-top:4px;">
                <input id="ns-add-keyword-input" type="text" maxlength="10" style="flex:1;padding:4px 8px;font-size:14px;border:1px solid #ccc;border-radius:4px;" placeholder="输入要屏蔽的关键词(≤10字符)" />
                <button id="ns-add-keyword-btn" style="padding:4px 12px;font-size:14px;background:#f44336;color:#fff;border:none;border-radius:4px;cursor:pointer;">屏蔽</button>
            </div>
            <div id="ns-keyword-length-hint" style="margin-top:2px;font-size:12px;color:#999;min-height:16px;"></div>
        </div>

        <!-- 已屏蔽的关键词列表 -->
        <div id="ns-custom-keywords-section" style="margin-bottom:12px;margin-top:-5px;">
            <label style="font-weight:bold;">已屏蔽的关键词：</label>
            <div id="ns-custom-keywords-list" style="margin-top:6px;height:110px;min-height:110px;max-height:110px;overflow-y:auto;overflow-x:hidden;border:1px solid #eee;border-radius:4px;padding:6px;background:#fafafa;box-sizing:border-box;width:100%;">
                <!-- 关键词列表将在这里动态生成 -->
            </div>
        </div>

        <!-- 显示关键词 -->
        <div style="margin-bottom:12px;padding-top:8px;border-top:1px solid #eee;">
            <label style="font-weight:bold;color:#4CAF50;">✅ 显示关键词（逗号分隔）：</label><br>
            <div style="margin-bottom:6px;font-size:13px;color:#666;line-height:1.4;">
                只显示<strong>同时包含所有</strong>关键词的帖子 • 支持大小写和简繁体混配。<br>可以同时输入多个关键词进行筛选，一般用于搜索使用。
            </div>
            <input id="ns-keyword-input" type="text" style="width:280px;padding:4px 8px;font-size:15px;border:1px solid #ccc;border-radius:4px;" placeholder="输入关键词，如VPS,測試,服务器" />
            <button id="ns-keyword-btn" style="margin-left:8px;padding:4px 12px;font-size:15px;background:#4CAF50;color:#fff;border:none;border-radius:4px;cursor:pointer;">显示</button>
        </div>


    `;
    document.body.appendChild(dialog);

    // 移动端特殊样式调整
    if (isMobile) {
        const input = dialog.querySelector('#ns-keyword-input');
        const button = dialog.querySelector('#ns-keyword-btn');
        const addKeywordInput = dialog.querySelector('#ns-add-keyword-input');
        const addKeywordBtn = dialog.querySelector('#ns-add-keyword-btn');
        
        // 显示关键词输入框和按钮
        if (input) {
            input.style.width = '100%';
            input.style.padding = '10px 12px';
            input.style.fontSize = '16px';
            input.style.boxSizing = 'border-box';
            input.style.marginBottom = '8px';
        }
        if (button) {
            button.style.width = '100%';
            button.style.marginLeft = '0';
            button.style.marginTop = '0';
            button.style.padding = '10px 16px';
            button.style.fontSize = '16px';
            button.style.boxSizing = 'border-box';
        }
        
        // 屏蔽关键词输入框和按钮
        if (addKeywordInput) {
            addKeywordInput.style.fontSize = '16px';
            addKeywordInput.style.padding = '8px 10px';
        }
        if (addKeywordBtn) {
            addKeywordBtn.style.fontSize = '16px';
            addKeywordBtn.style.padding = '8px 12px';
        }
        
        // 调整显示关键词区域的布局
        const showKeywordSection = dialog.querySelector('#ns-keyword-input').parentElement.parentElement;
        if (showKeywordSection) {
            const inputContainer = showKeywordSection.querySelector('input').parentElement;
            inputContainer.style.flexDirection = 'column';
            inputContainer.style.gap = '8px';
        }
    }

    // 填充已保存的关键词
    const savedKeywords = getKeywords();
    const input = dialog.querySelector('#ns-keyword-input');
    if (savedKeywords.length > 0) {
        input.value = savedKeywords.join(',');
    }

    // 渲染自定义关键词列表
    function renderCustomKeywordsList() {
        const customKeywords = getCustomKeywords();
        const listContainer = dialog.querySelector('#ns-custom-keywords-list');
        

        
        if (customKeywords.length === 0) {
            listContainer.innerHTML = '<div style="color:#999;font-size:13px;text-align:center;padding:38px 8px;">暂无已屏蔽的关键词</div>';
        } else {
            listContainer.innerHTML = customKeywords.map(keyword => {
                // 检查关键词长度，超长的用不同样式显示
                const isLong = keyword.length > 10;
                const borderColor = isLong ? '#ff9800' : '#ddd';
                const textColor = isLong ? '#ff9800' : 'inherit';
                const title = isLong ? `关键词过长(${keyword.length}字符)，建议删除重新添加` : '删除关键词';
                
                return `
                    <div style="display:inline-flex;align-items:center;margin:2px;padding:4px 8px;background:#fff;border:1px solid ${borderColor};border-radius:12px;font-size:13px;color:${textColor};max-width:100%;word-break:break-all;">
                        <span title="${isLong ? '长度超限' : ''}" style="max-width:calc(100% - 22px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${keyword}</span>
                        <button class="ns-remove-keyword" data-keyword="${keyword}" style="margin-left:6px;background:none;border:none;color:#999;cursor:pointer;font-size:16px;line-height:1;padding:0;width:16px;height:16px;flex-shrink:0;" title="${title}">×</button>
                    </div>
                `;
            }).join('');
        }

        // 添加删除按钮事件监听器
        listContainer.querySelectorAll('.ns-remove-keyword').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const keyword = this.dataset.keyword;
                removeCustomKeyword(keyword);
                renderCustomKeywordsList();
                // 重新应用过滤
                const blacklistKeywords = getCustomKeywords();
                const whitelistKeywords = input.value.split(/,|，/).map(s => s.trim()).filter(Boolean);
                filterPosts(blacklistKeywords, whitelistKeywords);
            });
        });
    }

    // 不再需要getAllActiveKeywords函数

    // 初始渲染关键词列表
    renderCustomKeywordsList();
    
    // 确保在页面加载时应用已保存的屏蔽关键词过滤
    setTimeout(() => {
        const blacklistKeywords = getCustomKeywords();
        const whitelistKeywords = input.value.split(/,|，/).map(s => s.trim()).filter(Boolean);
        if (blacklistKeywords.length > 0 || whitelistKeywords.length > 0) {
            filterPosts(blacklistKeywords, whitelistKeywords);
        }
    }, 100);

    // 添加关键词功能
    const addKeywordInput = dialog.querySelector('#ns-add-keyword-input');
    const addKeywordBtn = dialog.querySelector('#ns-add-keyword-btn');
    const lengthHintEl = dialog.querySelector('#ns-keyword-length-hint');

    // 显示长度提示
    function showLengthHint(message, color = '#999') {
        lengthHintEl.textContent = message;
        lengthHintEl.style.color = color;
    }

    // 初始显示字符计数
    showLengthHint('0/10 字符', '#999');
    
    // 实时字符计数
    addKeywordInput.addEventListener('input', function() {
        const length = this.value.length;
        if (length === 0) {
            showLengthHint('0/10 字符', '#999');
        } else if (length <= 10) {
            showLengthHint(`${length}/10 字符`, '#666');
        } else {
            showLengthHint(`${length}/10 字符 - 超出限制`, '#f44336');
        }
    });

    function addKeywordAction() {
        const keyword = addKeywordInput.value.trim();
        if (!keyword) {
            addKeywordInput.focus();
            return;
        }

        const result = addCustomKeyword(keyword);
        if (result === true) {
            // 添加成功
            addKeywordInput.value = '';
            renderCustomKeywordsList();
            showLengthHint('0/10 字符', '#999');
            
            // 立即应用过滤（黑名单逻辑）
            const blacklistKeywords = getCustomKeywords();
            const whitelistKeywords = input.value.split(/,|，/).map(s => s.trim()).filter(Boolean);
            filterPosts(blacklistKeywords, whitelistKeywords);
            
            // 操作日志记录
            if (typeof window.addLog === 'function') {
                window.addLog(`屏蔽关键词"${keyword}"`);
            }
        } else if (result === 'too_long') {
            // 长度超限提示
            addKeywordInput.style.borderColor = '#f44336';
            showLengthHint('关键词长度不能超过10个字符', '#f44336');
            setTimeout(() => {
                addKeywordInput.style.borderColor = '#ccc';
                showLengthHint('0/10 字符', '#999');
            }, 2000);
        } else {
            // 关键词已存在的提示
            addKeywordInput.style.borderColor = '#ff9800';
            showLengthHint('关键词已存在', '#ff9800');
            setTimeout(() => {
                addKeywordInput.style.borderColor = '#ccc';
                showLengthHint('0/10 字符', '#999');
            }, 1500);
        }
    }

    // 添加关键词按钮事件
    addKeywordBtn.addEventListener('click', addKeywordAction);
    
    // 添加关键词输入框回车事件
    addKeywordInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            addKeywordAction();
        }
    });
    
    // 输入框点击时隐藏placeholder
    addKeywordInput.addEventListener('focus', function() {
        this.placeholder = '';
    });
    
    // 输入框失焦时恢复placeholder（如果为空）
    addKeywordInput.addEventListener('blur', function() {
        if (!this.value.trim()) {
            this.placeholder = '输入要屏蔽的关键词(≤10字符)';
        }
    });

    // 关闭按钮 - 关闭弹窗并清空显示关键词输入
    dialog.querySelector('#ns-keyword-filter-close').onclick = function() {
        // 清空显示关键词输入框
        const keywordInput = dialog.querySelector('#ns-keyword-input');
        if (keywordInput) {
            keywordInput.value = '';
        }
        // 清除保存的显示关键词
        localStorage.removeItem('ns-filter-keywords');
        // 清除显示关键词的过滤效果，但保留屏蔽关键词的过滤效果
        const blacklistKeywords = getCustomKeywords();
        filterPosts(blacklistKeywords, []);
        dialog.remove();
    };

    // 过滤逻辑
    function doFilter() {
        const whitelistKeywords = input.value.split(/,|，/).map(s => s.trim()).filter(Boolean);
        const blacklistKeywords = getCustomKeywords(); 
        
        filterPosts(blacklistKeywords, whitelistKeywords);
        saveKeywords(whitelistKeywords); // 保存显示关键词
        
        // 操作日志记录
        if (typeof window.addLog === 'function') {
            const blackCount = blacklistKeywords.length;
            const whiteCount = whitelistKeywords.length;
            let logMessage = '过滤：';
            if (blackCount > 0) logMessage += `屏蔽${blackCount}个关键词`;
            if (whiteCount > 0) logMessage += `${blackCount > 0 ? '，' : ''}显示${whiteCount}个关键词`;
            if (blackCount === 0 && whiteCount === 0) logMessage += '无关键词';
            window.addLog(logMessage);
        }
        if (typeof onFilter === 'function') onFilter(blacklistKeywords, whitelistKeywords);
    }

    dialog.querySelector('#ns-keyword-btn').onclick = doFilter;
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            doFilter();
        }
    });
    input.onclick = function() {
        input.placeholder = '';
    };
    input.onblur = function() {
        if (!input.value) input.placeholder = '输入关键词，如VPS,測試,服务器';
    };
    // 桌面端拖动功能，移动端禁用
    setTimeout(() => {
        if (!isMobile) {
        const titleBar = dialog.querySelector('div');
        if (titleBar && window.makeDraggable) {
            window.makeDraggable(dialog, {width: 30, height: 30});
                
            // 鼠标移动到左上角30x30像素时变为move
            dialog.addEventListener('mousemove', function(e) {
                const rect = dialog.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                if (x >= 0 && x < 30 && y >= 0 && y < 30) {
                    dialog.style.cursor = 'move';
                } else {
                    dialog.style.cursor = 'default';
                }
            });
                
            dialog.addEventListener('mouseleave', function() {
                dialog.style.cursor = 'default';
            });
                
                // 拖动结束时保存位置
                let originalMouseUp = null;
                const observeMutation = () => {
                    // 监听style变化，当位置改变时保存
                    let lastLeft = dialog.style.left;
                    let lastTop = dialog.style.top;
                    
                    const checkPosition = () => {
                        if (dialog.style.left !== lastLeft || dialog.style.top !== lastTop) {
                            lastLeft = dialog.style.left;
                            lastTop = dialog.style.top;
                            
                            // 保存新位置
                            const position = {
                                left: parseInt(dialog.style.left) || 0,
                                top: parseInt(dialog.style.top) || 0
                            };
                            saveDialogPosition(position);
                        }
                    };
                    
                    // 定期检查位置变化
                    const positionObserver = setInterval(checkPosition, 100);
                    
                    // 弹窗关闭时清除观察器
                    const originalRemove = dialog.remove;
                    dialog.remove = function() {
                        clearInterval(positionObserver);
                        originalRemove.call(this);
                    };
                };
                
                observeMutation();
            }
        }
    }, 0);
}

// 关键词过滤的 observer 初始化（用于主插件调用）
function initFilterObserver() {
    // 检查是否有保存的关键词，如果有则自动应用过滤
    const whitelistKeywords = getKeywords(); // 显示关键词
    const blacklistKeywords = getCustomKeywords(); // 屏蔽关键词
    
    if (whitelistKeywords.length > 0 || blacklistKeywords.length > 0) {
        // 自动应用过滤
        filterPosts(blacklistKeywords, whitelistKeywords);
        
        // 只有显示关键词时才自动显示过滤弹窗（保持位置）
        // 仅屏蔽关键词时不显示弹窗
        if (whitelistKeywords.length > 0) {
        createFilterUI();
        }
    }
}

// 拖动功能实现（与主插件一致，支持 window.makeDraggable）
if (!window.makeDraggable) {
    window.makeDraggable = function(element, dragAreaSize = {width: 100, height: 32}) {
        let isDragging = false;
        let initialMouseX, initialMouseY;
        let initialElementX, initialElementY;
        const onMouseDown = (e) => {
            const elementRect = element.getBoundingClientRect();
            const clickXInElement = e.clientX - elementRect.left;
            const clickYInElement = e.clientY - elementRect.top;
            if (clickXInElement < 0 || clickXInElement >= dragAreaSize.width || clickYInElement < 0 || clickYInElement >= dragAreaSize.height) {
                return;
            }
            isDragging = true;
            initialMouseX = e.clientX;
            initialMouseY = e.clientY;
            element.style.left = elementRect.left + 'px';
            element.style.top = elementRect.top + 'px';
            element.style.right = 'auto';
            initialElementX = parseFloat(element.style.left);
            initialElementY = parseFloat(element.style.top);
            element.style.cursor = 'move';
            document.body.classList.add('dragging-active');
            document.addEventListener('mousemove', onMouseMoveWhileDragging);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        };
        const onMouseMoveWhileDragging = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - initialMouseX;
            const dy = e.clientY - initialMouseY;
            let newLeft = initialElementX + dx;
            let newTop = initialElementY + dy;
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
        };
        const onMouseUp = (e) => {
            if (!isDragging) return;
            isDragging = false;
            document.body.classList.remove('dragging-active');
            document.removeEventListener('mousemove', onMouseMoveWhileDragging);
            document.removeEventListener('mouseup', onMouseUp);
            element.style.cursor = 'default';
        };
        element.addEventListener('mousedown', onMouseDown);
    };
}

// 测试简体繁体转换功能
function testConversion() {
    console.log('[NodeSeek过滤] 简体繁体转换测试开始...\n');
    
    const testCases = [
        '国家', '國家', 'VPS服务器', 'VPS伺服器', '测试', '測試',
        '简体中文', '簡體中文', '传统', '傳統', '发布', '發佈',
        '网络设备', '網路設備', '计算机硬件', '電腦硬體', '软件下载', '軟體下載'
    ];
    
    console.log('1. 文本标准化测试：');
    testCases.forEach(text => {
        const normalized = normalizeText(text);
        console.log(`  "${text}" → "${normalized}"`);
    });
    
    console.log('\n2. 关键词匹配测试：');
    const testKeywords = [
        {keyword: '服务器', titles: ['VPS服务器推荐', 'VPS伺服器推薦', 'vps 服務器', 'VPS SERVER', '云服務器']},
        {keyword: '测试', titles: ['软件测试', '軟體測試', 'TEST测試', '性能測試']},
        {keyword: 'VPS', titles: ['vps推荐', 'VPS評測', '便宜的VPS', '免費VPS']},
        {keyword: '网络', titles: ['网络配置', '網路設定', '网絡故障', '網絡問題']}
    ];
    
    testKeywords.forEach(({keyword, titles}) => {
        console.log(`\n  关键词: "${keyword}"`);
        titles.forEach(title => {
            const match = normalizeText(title).includes(normalizeText(keyword));
            console.log(`    ${match ? '✓' : '✗'} "${title}"`);
        });
    });
    
    console.log('\n3. 大小写测试：');
    const caseTests = [
        {keyword: 'VPS', titles: ['vps', 'Vps', 'VPS', 'vPs']},
        {keyword: 'SERVER', titles: ['server', 'Server', 'SERVER', 'SeRvEr']}
    ];
    
    caseTests.forEach(({keyword, titles}) => {
        console.log(`\n  关键词: "${keyword}"`);
        titles.forEach(title => {
            const match = normalizeText(title).includes(normalizeText(keyword));
            console.log(`    ${match ? '✓' : '✗'} "${title}"`);
        });
    });
    
    console.log('\n4. 黑白名单过滤测试：');
    const testTitles = [
        'VPS推荐',       
        '服务器评测',    
        'VPS伺服器',     
        '域名购买',      
        '网络故障',      
        'CDN加速',
        '免费VPS试用'
    ];
    
    console.log('\n  白名单过滤（必须同时包含所有关键词）：');
    
    // 单个关键词测试
    console.log('\n    单个关键词 "VPS"：');
    testTitles.forEach(title => {
        const match = normalizeText(title).includes(normalizeText('VPS'));
        console.log(`      ${match ? '显示' : '隐藏'} "${title}"`);
    });
    
    // 多个关键词AND测试
    console.log('\n    多个关键词 "VPS,推荐" (必须同时包含)：');
    const andKeywords = ['VPS', '推荐'];
    testTitles.forEach(title => {
        const normalizedTitle = normalizeText(title);
        const match = andKeywords.every(kw => normalizedTitle.includes(normalizeText(kw)));
        console.log(`      ${match ? '显示' : '隐藏'} "${title}"`);
    });
    
    console.log('\n    多个关键词 "claw,jp" (必须同时包含)：');
    const andKeywords2 = ['claw', 'jp'];
    testTitles.forEach(title => {
        const normalizedTitle = normalizeText(title);
        const match = andKeywords2.every(kw => normalizedTitle.includes(normalizeText(kw)));
        console.log(`      ${match ? '显示' : '隐藏'} "${title}"`);
    });
    
    console.log('\n  黑名单过滤（隐藏包含关键词的帖子）：');
    const blacklistKeywords = ['广告', '出售'];
    const extendedTitles = [...testTitles, '广告推广', '出售域名', '代理服务'];
    blacklistKeywords.forEach(keyword => {
        console.log(`\n    屏蔽关键词: "${keyword}"`);
        extendedTitles.forEach(title => {
            const match = normalizeText(title).includes(normalizeText(keyword));
            console.log(`      ${match ? '隐藏' : '显示'} "${title}"`);
        });
    });
    
    console.log('\n5. 关键词管理功能测试：');
    
    // 测试添加关键词
    console.log('\n  测试添加关键词：');
    console.log('    添加"VPS":', NodeSeekFilter.addCustomKeyword('VPS') === true ? '✓成功' : '✗失败/已存在');
    console.log('    添加"服务器":', NodeSeekFilter.addCustomKeyword('服务器') === true ? '✓成功' : '✗失败/已存在');
    console.log('    重复添加"vps":', NodeSeekFilter.addCustomKeyword('vps') === true ? '✓成功' : '✗失败/已存在（应该被智能去重）');
    
    // 测试长度限制
    console.log('\n  测试长度限制：');
    console.log('    添加"1234567890"(10字符):', NodeSeekFilter.addCustomKeyword('1234567890') === true ? '✓成功' : '✗失败');
    console.log('    添加"12345678901"(11字符):', NodeSeekFilter.addCustomKeyword('12345678901') === 'too_long' ? '✓正确拒绝' : '✗应该被拒绝');
    console.log('    添加"这是一个超级长的关键词"(12字符):', NodeSeekFilter.addCustomKeyword('这是一个超级长的关键词') === 'too_long' ? '✓正确拒绝' : '✗应该被拒绝');
    
    // 显示当前关键词
    const currentKeywords = NodeSeekFilter.getCustomKeywords();
    console.log(`\n  当前自定义关键词列表: [${currentKeywords.join(', ')}]`);
    
    // 测试删除功能
    if (currentKeywords.length > 0) {
        console.log('\n  测试删除关键词：');
        NodeSeekFilter.removeCustomKeyword(currentKeywords[0]);
        console.log(`    删除"${currentKeywords[0]}"后: [${NodeSeekFilter.getCustomKeywords().join(', ')}]`);
    }
    
    console.log('\n[NodeSeek过滤] 测试完成！');
    console.log('使用方法：');
    console.log('  - 运行 NodeSeekFilter.testConversion() 测试功能');  
    console.log('  - 调用 NodeSeekFilter.createFilterUI() 显示过滤界面');
    console.log('功能特性：');
    console.log('  - 🚫 屏蔽关键词：永久隐藏包含关键词的帖子（黑名单，OR逻辑）');
    console.log('  - ✅ 显示关键词：只显示同时包含所有关键词的帖子（白名单，AND逻辑）');
    console.log('  - 智能匹配：支持简体繁体和大小写混合匹配');
    console.log('  - 永久保存：屏蔽关键词自动保存，下次访问仍生效');
    console.log('  - 智能弹窗：桌面端可拖拽且记忆位置，移动端自动居中');
    console.log('弹窗行为：');
    console.log('  - 仅屏蔽关键词：刷新网页后弹窗自动关闭');
    console.log('  - 有显示关键词：刷新网页后弹窗保持显示，位置记忆');
    console.log('逻辑示例：');
    console.log('  - 白名单输入"claw,jp"：只显示同时包含"claw"且"jp"的帖子');
    console.log('  - 黑名单添加"广告,出售"：隐藏包含"广告"或"出售"的帖子');
}

// 调试函数：检查页面结构和过滤功能
function debugPageStructure() {
    console.log('=== NodeSeek页面结构调试 ===');
    
    // 1. 检查可能的帖子容器
    console.log('1. 寻找帖子容器：');
    const containers = document.querySelectorAll('ul, ol, div[class*="list"], table, tbody');
    containers.forEach((container, index) => {
        if (container.children.length > 2) {
            console.log(`   容器${index}: ${container.tagName}.${container.className} (${container.children.length}个子元素)`);
        }
    });
    
    // 2. 检查实际的帖子选择器
    console.log('\n2. 测试不同的帖子选择器：');
    const selectors = [
        'ul.post-list > li.post-list-item',
        'ul.post-list > li',
        '.post-list > li',
        '.post-list-item',
        '.topic-list tr',
        'div[class*="post"]',
        'li[class*="post"]',
        'tr'
    ];
    
    let workingSelector = null;
    let workingElements = null;
    
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`   ${selector}: ${elements.length}个元素`);
        if (elements.length > 0 && !workingSelector) {
            workingSelector = selector;
            workingElements = elements;
        }
    });
    
    // 3. 分析工作的选择器
    if (workingSelector && workingElements.length > 0) {
        console.log(`\n3. 使用选择器 "${workingSelector}" 分析前3个元素：`);
        for (let i = 0; i < Math.min(3, workingElements.length); i++) {
            const element = workingElements[i];
            console.log(`   元素${i}:`);
            console.log(`     HTML: ${element.outerHTML.substring(0, 200)}...`);
            
            // 查找标题
            const titleSelectors = ['.post-title a', 'a[href*="/topic/"]', 'a', 'td a'];
            titleSelectors.forEach(sel => {
                const titleEl = element.querySelector(sel);
                if (titleEl) {
                    console.log(`     标题选择器 "${sel}": "${titleEl.textContent.trim()}"`);
                }
            });
        }
        
        // 4. 测试过滤功能
        console.log('\n4. 测试过滤功能：');
        filterPosts([], ['jp']);
    }
}

// 测试localStorage功能
function testLocalStorage() {
    // 清除现有数据
    localStorage.removeItem('ns-filter-custom-keywords');
    
    // 测试保存
    const testKeywords = ['测试1', '测试2', '测试3'];
    saveCustomKeywords(testKeywords);
    
    // 测试读取
    const loaded = getCustomKeywords();
    
    // 测试添加
    const addResult = addCustomKeyword('新关键词');
    
    // 再次读取
    const afterAdd = getCustomKeywords();
    
    // 检查localStorage原始数据
    const raw = localStorage.getItem('ns-filter-custom-keywords');
    
    return afterAdd;
}

// 导出
window.NodeSeekFilter = {
    filterPosts,
    createFilterUI,
    initFilterObserver,
    clearFilter,
    clearFilterDisplay,
    testConversion,
    normalizeText,
    debugPageStructure,
    testLocalStorage,
    // 关键词管理功能
    addCustomKeyword,
    removeCustomKeyword,
    getCustomKeywords,
    saveCustomKeywords,
    // 位置管理功能
    saveDialogPosition,
    getDialogPosition,
    // 设备检测
    isMobileDevice
};
