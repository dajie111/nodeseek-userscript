// ========== 关键词过滤功能 ==========

const SIMPLIFIED_TO_TRADITIONAL = {
    // 基础常用字 (A-Z)
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

    // 扩展基础汉字
    '万': '萬', '与': '與', '丢': '丟', '乐': '樂', '乱': '亂', '乔': '喬', '习': '習', '乡': '鄉', '书': '書', '买': '買',
    '乱': '亂', '争': '爭', '事': '事', '二': '二', '亍': '亍', '于': '於', '亏': '虧', '云': '雲', '互': '互', '亚': '亞',
    '产': '產', '亩': '畝', '亲': '親', '亵': '褻', '亶': '亶', '亸': '亸', '亹': '亹', '人': '人', '亿': '億', '什': '什',
    '仅': '僅', '仆': '僕', '仇': '仇', '仍': '仍', '仑': '侖', '仓': '倉', '仔': '仔', '仕': '仕', '他': '他', '仗': '仗',
    '付': '付', '仙': '仙', '仝': '仝', '仞': '仞', '仟': '仟', '任': '任', '份': '份', '仿': '仿', '伊': '伊', '伍': '伍',
    '伎': '伎', '伏': '伏', '伐': '伐', '休': '休', '伕': '伕', '众': '眾', '优': '優', '伙': '夥', '会': '會', '伛': '傴',
    '伞': '傘', '伟': '偉', '传': '傳', '伢': '伢', '伤': '傷', '伦': '倫', '伪': '偽', '伫': '佇', '伯': '伯', '估': '估',
    '伲': '伲', '伴': '伴', '伶': '伶', '伸': '伸', '伺': '伺', '似': '似', '伽': '伽', '佃': '佃', '但': '但', '佇': '佇',
    '佈': '佈', '位': '位', '低': '低', '住': '住', '佐': '佐', '佑': '佑', '体': '體', '佔': '佔', '何': '何', '佗': '佗',
    '佛': '佛', '作': '作', '佝': '佝', '佞': '佞', '佟': '佟', '你': '你', '佢': '佢', '佣': '佣', '佤': '佤', '佥': '僉',

    // 商业经济常用字
    '币': '幣', '财': '財', '贫': '貧', '货': '貨', '销': '銷', '银': '銀', '费': '費', '贷': '貸', '贸': '貿', '资': '資',
    '贤': '賢', '购': '購', '贮': '貯', '贯': '貫', '贰': '貳', '贱': '賤', '贲': '賁', '贳': '貰', '贴': '貼', '贵': '貴',
    '贶': '貺', '贷': '貸', '贸': '貿', '费': '費', '贺': '賀', '贻': '貽', '贼': '賊', '贽': '贄', '贾': '賈', '贿': '賄',
    '赀': '貲', '赁': '賃', '赂': '賂', '赃': '贓', '资': '資', '赅': '賅', '赆': '賆', '赇': '資', '赈': '賑', '赉': '賚',
    '赊': '賒', '赋': '賦', '赌': '賭', '赍': '齎', '赎': '贖', '赏': '賞', '赐': '賜', '赑': '贔', '赒': '賒', '赓': '賡',
    '赔': '賠', '赕': '賕', '赖': '賴', '赗': '賵', '赘': '贅', '赙': '賻', '赚': '賺', '赛': '賽', '赜': '賾', '赝': '贗',
    '赞': '讚', '赟': '贇', '赠': '贈', '赡': '贍', '赢': '贏', '赣': '贛', '赤': '赤', '赥': '赥', '赦': '赦', '赧': '赧',

    // 地理位置常用字
    '县': '縣', '区': '區', '岛': '島', '岩': '岩', '岭': '嶺', '岳': '嶽', '峡': '峽', '峰': '峰', '崇': '崇', '崎': '崎',
    '崭': '嶄', '嶂': '嶂', '巅': '巔', '巩': '鞏', '巯': '巰', '币': '幣', '市': '市', '布': '佈', '师': '師', '帅': '帥',
    '师': '師', '席': '席', '帮': '幫', '带': '帶', '帧': '幀', '帮': '幫', '帱': '幬', '帲': '幃', '帷': '帷', '常': '常',
    '帻': '幘', '帼': '幗', '帽': '帽', '幀': '幀', '幁': '幃', '幂': '冪', '幃': '幃', '幄': '幄', '幅': '幅', '幆': '幆',
    '带': '帶', '幈': '幈', '幉': '幉', '幊': '幊', '幋': '幋', '幌': '幌', '幍': '幍', '幎': '冪', '幏': '幓', '幐': '幐',

    // 日常生活用词 
    '门': '門', '间': '間', '闪': '閃', '闫': '閆', '闬': '閈', '闭': '閉', '问': '問', '闯': '闖', '闰': '閏', '闱': '闈',
    '闲': '閒', '闳': '閎', '闵': '閔', '闶': '閌', '闷': '悶', '闸': '閘', '闹': '鬧', '闺': '閨', '闻': '聞', '闼': '闥',
    '闽': '閩', '闾': '閭', '闿': '闓', '阀': '閥', '阁': '閣', '阂': '閡', '阃': '閫', '阄': '鬮', '阅': '閱', '阆': '閬',
    '阇': '闍', '阈': '閾', '阉': '閹', '阊': '閶', '阋': '鬩', '阌': '閿', '阍': '閽', '阎': '閻', '阏': '閼', '阐': '闡',
    '阑': '闌', '阒': '闃', '阓': '闠', '阔': '闊', '阕': '闋', '阖': '闔', '阗': '闐', '阘': '闒', '阙': '闕', '阚': '闞',
    '阛': '闤', '阜': '阜', '队': '隊', '阡': '阡', '阢': '阢', '阣': '阣', '阤': '阤', '阥': '阥', '阦': '阦', '阧': '阧',

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
    '式': '式', '编': '編', '码': '碼', '解': '解', '码': '碼', '转': '轉', '换': '換', '格': '格',

    // VPS/服务器/云服务相关词汇
    '云': '雲', '虚': '虛', '拟': '擬', '私': '私', '专': '專', '共': '共', '享': '享', '独': '獨',
    '立': '立', '主': '主', '客': '客', '户': '戶', '端': '端', '远': '遠', '程': '程', '连': '連',
    '接': '接', '钥': '鑰', '匙': '匙', '认': '認', '证': '證', '授': '授', '权': '權', '访': '訪',
    '问': '問', '控': '控', '制': '制', '监': '監', '管': '管', '理': '理', '配': '配', '置': '置',
    '设': '設', '定': '定', '参': '參', '数': '數', '选': '選', '项': '項', '菜': '菜', '单': '單',
    '工': '工', '具': '具', '应': '應', '用': '用', '程': '程', '序': '序', '进': '進', '线': '線',
    '资': '資', '源': '源', '占': '佔', '用': '用', '率': '率', '负': '負', '载': '載', '平': '平',
    '衡': '衡', '分': '分', '布': '佈', '式': '式', '集': '集', '群': '群', '中': '中', '化': '化',
    '自': '自', '动': '動', '脚': '腳', '本': '本', '批': '批', '处': '處', '理': '理', '定': '定',
    '时': '時', '任': '任', '务': '務', '计': '計', '划': '劃', '调': '調', '度': '度', '优': '優',
    '先': '先', '级': '級', '队': '隊', '列': '列', '缓': '緩', '冲': '衝', '区': '區', '域': '域',
    '网': '網', '段': '段', '子': '子', '掩': '掩', '码': '碼', '关': '關', '路': '路', '由': '由',
    '器': '器', '交': '交', '换': '換', '机': '機', '集': '集', '线': '線', '卡': '卡', '适': '適',
    '配': '配', '驱': '驅', '动': '動', '程': '程', '序': '序', '接': '接', '口': '口', '协': '協',
    '议': '議', '标': '標', '准': '準', '格': '格', '式': '式', '编': '編', '码': '碼', '解': '解',
    '转': '轉', '换': '換', '压': '壓', '缩': '縮', '文': '文', '档': '檔', '夹': '夾', '目': '目',
    '录': '錄', '路': '路', '径': '徑', '链': '鏈', '下': '下', '载': '載', '上': '上', '传': '傳',
    '速': '速', '站': '站', '页': '頁', '面': '面', '浏': '瀏', '览': '覽', '器': '器', '搜': '搜',
    '索': '索', '引': '引', '擎': '擎', '邮': '郵', '箱': '箱', '账': '賬', '号': '號', '密': '密',
    '码': '碼', '登': '登', '录': '錄', '注': '註', '册': '冊', '验': '驗', '证': '證', '权': '權',
    '限': '限', '用': '用', '户': '戶', '组': '組', '角': '角', '色': '色', '访': '訪', '问': '問',
    '监': '監', '控': '控', '日': '日', '志': '誌', '记': '記', '报': '報', '告': '告', '统': '統',
    '计': '計', '分': '分', '析': '析', '图': '圖', '表': '表', '像': '像', '视': '視', '频': '頻',
    '音': '音', '格': '格', '式': '式',

    // 数字/量词/时间
    '个': '個', '只': '隻', '条': '條', '件': '件', '次': '次', '遍': '遍', '趟': '趟', '回': '回', '场': '場', '轮': '輪',
    '层': '層', '级': '級', '段': '段', '节': '節', '章': '章', '页': '頁', '行': '行', '字': '字', '句': '句', '篇': '篇',
    '册': '冊', '卷': '卷', '本': '本', '套': '套', '副': '副', '幅': '幅', '张': '張', '片': '片', '块': '塊', '堆': '堆',
    '批': '批', '群': '群', '队': '隊', '组': '組', '班': '班', '支': '支', '股': '股', '路': '路', '门': '門', '户': '戶',
    '家': '家', '间': '間', '座': '座', '栋': '棟', '幢': '幢', '层': '層', '楼': '樓', '室': '室', '厅': '廳', '库': '庫',
    '年': '年', '月': '月', '日': '日', '时': '時', '分': '分', '秒': '秒', '刻': '刻', '点': '點', '钟': '鐘', '周': '周',
    '季': '季', '度': '度', '期': '期', '代': '代', '世': '世', '纪': '紀', '代': '代', '辈': '輩', '代': '代', '世': '世',

    // 动词/形容词扩展
    '买': '買', '卖': '賣', '读': '讀', '写': '寫', '听': '聽', '说': '說', '看': '看', '想': '想', '知': '知', '道': '道',
    '走': '走', '跑': '跑', '飞': '飛', '游': '遊', '爬': '爬', '跳': '跳', '站': '站', '坐': '坐', '躺': '躺', '睡': '睡',
    '吃': '吃', '喝': '喝', '穿': '穿', '戴': '戴', '用': '用', '拿': '拿', '放': '放', '给': '給', '收': '收', '送': '送',
    '笑': '笑', '哭': '哭', '叫': '叫', '喊': '喊', '唱': '唱', '跳': '跳', '画': '畫', '写': '寫', '读': '讀', '学': '學',
    '教': '教', '练': '練', '习': '習', '做': '做', '干': '幹', '干': '乾', '湿': '濕', '冷': '冷', '热': '熱', '暖': '暖',
    '凉': '涼', '快': '快', '慢': '慢', '早': '早', '晚': '晚', '新': '新', '旧': '舊', '老': '老', '少': '少', '多': '多',
    '大': '大', '小': '小', '长': '長', '短': '短', '高': '高', '低': '低', '胖': '胖', '瘦': '瘦', '厚': '厚', '薄': '薄',
    '宽': '寬', '窄': '窄', '深': '深', '浅': '淺', '远': '遠', '近': '近', '左': '左', '右': '右', '前': '前', '后': '後',

    // 颜色
    '红': '紅', '橙': '橙', '黄': '黃', '绿': '綠', '青': '青', '蓝': '藍', '紫': '紫', '黑': '黑', '白': '白', '灰': '灰',
    '粉': '粉', '棕': '棕', '金': '金', '银': '銀', '彩': '彩', '色': '色', '彩': '彩', '虹': '虹', '光': '光', '亮': '亮',

    // 家庭/人际关系
    '爸': '爸', '妈': '媽', '爷': '爺', '奶': '奶', '哥': '哥', '姐': '姐', '弟': '弟', '妹': '妹', '儿': '兒', '女': '女',
    '孙': '孫', '外': '外', '内': '內', '亲': '親', '戚': '戚', '友': '友', '朋': '朋', '同': '同', '事': '事', '老': '老',
    '师': '師', '学': '學', '生': '生', '同': '同', '学': '學', '同': '同', '桌': '桌', '室': '室', '友': '友', '邻': '鄰',
    '居': '居', '客': '客', '人': '人', '主': '主', '人': '人', '家': '家', '长': '長', '孩': '孩', '子': '子', '大': '大',

    // 职业/工作
    '工': '工', '作': '作', '职': '職', '业': '業', '员': '員', '工': '工', '人': '人', '农': '農', '民': '民', '商': '商',
    '人': '人', '学': '學', '者': '者', '专': '專', '家': '家', '教': '教', '授': '授', '老': '老', '师': '師', '学': '學',
    '生': '生', '医': '醫', '生': '生', '护': '護', '士': '士', '司': '司', '机': '機', '厨': '廚', '师': '師', '服': '服',
    '务': '務', '员': '員', '销': '銷', '售': '售', '员': '員', '会': '會', '计': '計', '律': '律', '师': '師', '警': '警',
    '察': '察', '军': '軍', '人': '人', '记': '記', '者': '者', '演': '演', '员': '員', '歌': '歌', '手': '手', '画': '畫',
    '家': '家', '作': '作', '家': '家', '诗': '詩', '人': '人', '导': '導', '演': '演', '制': '制', '片': '片', '人': '人',

    // 动物相关
    '鸡': '雞', '鸭': '鴨', '鹅': '鵝', '猪': '豬', '牛': '牛', '羊': '羊', '马': '馬', '狗': '狗', '猫': '貓', '鱼': '魚',
    '鸟': '鳥', '虫': '蟲', '蛇': '蛇', '龙': '龍', '凤': '鳳', '鹤': '鶴', '鹰': '鷹', '燕': '燕', '鸽': '鴿', '鸦': '鴉',
    '鹊': '鵲', '莺': '鶯', '鸳': '鴛', '鸯': '鴦', '鸵': '鴕', '鸟': '鳥', '鸢': '鳶', '鸣': '鳴', '啼': '啼', '叫': '叫',
    '蝶': '蝶', '蜂': '蜂', '蚂': '螞', '蚁': '蟻', '蛙': '蛙', '蝉': '蟬', '蜘': '蜘', '蛛': '蛛', '蝇': '蠅', '蚊': '蚊',
    '虾': '蝦', '蟹': '蟹', '龟': '龜', '鳄': '鱷', '鲸': '鯨', '鲨': '鯊', '鲤': '鯉', '鲫': '鯽', '鳗': '鰻', '鳅': '鰍',

    // 食物饮料
    '饭': '飯', '面': '麵', '粉': '粉', '粥': '粥', '汤': '湯', '菜': '菜', '肉': '肉', '蛋': '蛋', '奶': '奶', '糖': '糖',
    '盐': '鹽', '醋': '醋', '油': '油', '酱': '醬', '茶': '茶', '酒': '酒', '水': '水', '汽': '汽', '可': '可', '乐': '樂',
    '咖': '咖', '啡': '啡', '果': '果', '汁': '汁', '酸': '酸', '甜': '甜', '苦': '苦', '辣': '辣', '咸': '鹹', '香': '香',
    '饼': '餅', '包': '包', '馒': '饅', '头': '頭', '饺': '餃', '子': '子', '馄': '餛', '饨': '飩', '面': '麵', '条': '條',
    '米': '米', '饭': '飯', '粮': '糧', '食': '食', '料': '料', '烧': '燒', '烤': '烤', '炸': '炸', '煮': '煮', '蒸': '蒸',
    '炒': '炒', '炖': '燉', '焖': '燜', '煎': '煎', '卤': '滷', '腌': '醃', '泡': '泡', '凉': '涼', '热': '熱', '温': '溫',

    // 身体部位
    '头': '頭', '脸': '臉', '眼': '眼', '耳': '耳', '鼻': '鼻', '嘴': '嘴', '齿': '齒', '牙': '牙', '舌': '舌', '喉': '喉',
    '颈': '頸', '肩': '肩', '臂': '臂', '手': '手', '指': '指', '胸': '胸', '背': '背', '腰': '腰', '腹': '腹', '腿': '腿',
    '脚': '腳', '趾': '趾', '发': '髮', '须': '鬚', '脑': '腦', '心': '心', '肝': '肝', '肺': '肺', '肾': '腎', '胃': '胃',
    '肠': '腸', '血': '血', '骨': '骨', '肌': '肌', '肉': '肉', '皮': '皮', '肤': '膚', '毛': '毛', '汗': '汗', '泪': '淚',

    // 服装鞋帽
    '衣': '衣', '服': '服', '装': '裝', '衫': '衫', '裤': '褲', '裙': '裙', '袜': '襪', '鞋': '鞋', '帽': '帽', '巾': '巾',
    '带': '帶', '扣': '扣', '袋': '袋', '兜': '兜', '领': '領', '袖': '袖', '襟': '襟', '摆': '擺', '纽': '紐', '扣': '扣',
    '丝': '絲', '绸': '綢', '缎': '緞', '布': '布', '棉': '棉', '麻': '麻', '毛': '毛', '皮': '皮', '革': '革', '纤': '纖',
    '维': '維', '尼': '尼', '龙': '龍', '涤': '滌', '纶': '綸', '织': '織', '缝': '縫', '纫': '紉', '绣': '繡', '染': '染',

    // 交通工具
    '车': '車', '汽': '汽', '货': '貨', '客': '客', '轿': '轎', '卡': '卡', '拖': '拖', '挂': '掛', '摩': '摩', '托': '托',
    '自': '自', '行': '行', '电': '電', '动': '動', '三': '三', '轮': '輪', '四': '四', '轮': '輪', '火': '火', '高': '高',
    '铁': '鐵', '地': '地', '轻': '輕', '轨': '軌', '缆': '纜', '船': '船', '艇': '艇', '舟': '舟', '帆': '帆', '桨': '槳',
    '飞': '飛', '机': '機', '直': '直', '升': '升', '战': '戰', '斗': '鬥', '客': '客', '货': '貨', '运': '運', '输': '輸',

    // 建筑房屋
    '房': '房', '屋': '屋', '楼': '樓', '层': '層', '顶': '頂', '墙': '牆', '窗': '窗', '门': '門', '梯': '梯', '廊': '廊',
    '厅': '廳', '室': '室', '厨': '廚', '卫': '衛', '浴': '浴', '厕': '廁', '所': '所', '阳': '陽', '台': '臺', '花': '花',
    '园': '園', '院': '院', '坝': '壩', '坪': '坪', '场': '場', '馆': '館', '店': '店', '铺': '鋪', '摊': '攤', '档': '檔',
    '桥': '橋', '路': '路', '街': '街', '巷': '巷', '弄': '弄', '胡': '胡', '同': '衕', '广': '廣', '场': '場', '站': '站',

    // 自然环境
    '天': '天', '地': '地', '山': '山', '水': '水', '河': '河', '江': '江', '海': '海', '湖': '湖', '池': '池', '塘': '塘',
    '溪': '溪', '泉': '泉', '井': '井', '沟': '溝', '渠': '渠', '堤': '堤', '岸': '岸', '滩': '灘', '洲': '洲', '岛': '島',
    '林': '林', '森': '森', '树': '樹', '木': '木', '花': '花', '草': '草', '叶': '葉', '枝': '枝', '根': '根', '茎': '莖',
    '果': '果', '实': '實', '种': '種', '苗': '苗', '芽': '芽', '蕾': '蕾', '蒂': '蒂', '藤': '藤', '竹': '竹', '松': '松',
    '柏': '柏', '梅': '梅', '兰': '蘭', '菊': '菊', '荷': '荷', '莲': '蓮', '桃': '桃', '李': '李', '杏': '杏', '枣': '棗',

    // 天气气候
    '晴': '晴', '阴': '陰', '雨': '雨', '雪': '雪', '风': '風', '雷': '雷', '电': '電', '云': '雲', '雾': '霧', '霜': '霜',
    '露': '露', '冰': '冰', '雹': '雹', '虹': '虹', '霞': '霞', '雾': '霧', '霾': '霾', '烟': '煙', '尘': '塵', '沙': '沙',
    '冷': '冷', '凉': '涼', '温': '溫', '暖': '暖', '热': '熱', '燥': '燥', '湿': '濕', '潮': '潮', '干': '乾', '旱': '旱',
    '涝': '澇', '洪': '洪', '涛': '濤', '浪': '浪', '潮': '潮', '汐': '汐', '流': '流', '急': '急', '缓': '緩', '静': '靜'
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
    // 额外补充缺失的常用繁→简映射
    traditionalToSimplified['靈'] = '灵';
    return text.split('').map(char => traditionalToSimplified[char] || char).join('');
}

// 常见地区用语与同义词短语映射（统一到简体常用表达，用于搜索匹配）
const PHRASE_EQUIVALENTS = [
    // 网络/服务器相关
    { from: ['網路', '网路'], to: '网络' },
    { from: ['伺服器'], to: '服务器' },
    // 软件/硬件
    { from: ['軟體', '软体'], to: '软件' },
    { from: ['硬體', '硬体'], to: '硬件' },
    // 发布/部署
    { from: ['佈署', '布署'], to: '部署' },
    { from: ['發表', '發佈', '发布會', '發佈會'], to: '发布' },
    // 存储/数据
    { from: ['記憶體', '记忆体'], to: '内存' },
    { from: ['資料'], to: '数据' },
    // 账号/登录/注册
    { from: ['帳號', '賬號'], to: '账号' },
    { from: ['帳戶', '賬戶'], to: '账户' },
    { from: ['登入'], to: '登录' },
    { from: ['註冊', '注冊'], to: '注册' },
    // 邮件/邮箱
    { from: ['電郵'], to: '邮箱' },
    // 浏览器/下载（字符级转换已大多覆盖，但保留短语保障）
    { from: ['瀏覽器'], to: '浏览器' },
    { from: ['下載'], to: '下载' }
];

function applyPhraseEquivalents(text) {
    if (!text) return text;
    let out = text;
    // 按短语长度从长到短替换，避免子串抢先替换
    const entries = PHRASE_EQUIVALENTS
        .map(e => e.from.map(f => ({ from: f, to: e.to })))
        .flat()
        .sort((a, b) => b.from.length - a.from.length);
    entries.forEach(({ from, to }) => {
        const re = new RegExp(from, 'g');
        out = out.replace(re, to);
    });
    return out;
}

// 文本标准化函数（去空格、转小写、简繁体统一）
function normalizeText(text) {
    // 1. 去除空格
    let normalized = (text || '').replace(/\s+/g, '');
    // 2. 转为小写
    normalized = normalized.toLowerCase();
    // 3. 先进行短语同义词归一化（覆盖地区用语差异）
    normalized = applyPhraseEquivalents(normalized);
    // 4. 再进行字符级繁体→简体转换（统一标准）
    normalized = convertTraditionalToSimplified(normalized);
    // 5. 第二次短语归一（处理字符转换后仍存在的差异，如“网路”→“网络”）
    normalized = applyPhraseEquivalents(normalized);
    return normalized;
}

// 全局统计变量
let currentBlockedCount = 0;
let currentHighlightedCount = 0;
let isShowingOnlyHighlighted = false;
let isShowingOnlyBlocked = false;

// 更新统计UI
function updateStatsUI() {
    // 仅在首页或列表页显示统计
    const sorter = document.querySelector('div.sorter');
    if (!sorter) return;

    const container = sorter.parentElement;
    if (!container) return;

    const containerComputedStyle = window.getComputedStyle(container);
    if (containerComputedStyle.position === 'static') {
        container.style.position = 'relative';
    }

    // 移除可能存在的旧样式注入（如果用户之前加载过旧版本）
    const oldStyle = document.getElementById('ns-reset-sorter-bg');
    if (oldStyle) oldStyle.remove();

    let statsSpan = document.getElementById('ns-filter-stats');
    if (!statsSpan) {
        statsSpan = document.createElement('span');
        statsSpan.id = 'ns-filter-stats';
        statsSpan.style.marginLeft = '0';
        statsSpan.style.position = 'absolute';
        statsSpan.style.whiteSpace = 'nowrap';
        statsSpan.style.zIndex = '1';
        statsSpan.style.fontSize = '13px';
        statsSpan.style.color = 'inherit'; // 使用 inherit 跟随父元素颜色，避免反色问题
        statsSpan.style.background = 'transparent';
        statsSpan.style.padding = '0';
        statsSpan.style.borderRadius = '0';
        statsSpan.style.border = 'none';
        statsSpan.style.boxShadow = 'none';

        statsSpan.style.display = 'inline-flex';
        statsSpan.style.alignItems = 'center';
        statsSpan.style.gap = '0px';
        statsSpan.style.fontWeight = '500';
        statsSpan.style.verticalAlign = 'middle';
        container.appendChild(statsSpan);
    } else {
        statsSpan.style.marginLeft = '0';
        statsSpan.style.position = 'absolute';
        if (statsSpan.parentNode !== container) {
            container.appendChild(statsSpan);
        }
    }

    const containerRect = container.getBoundingClientRect();
    const sorterRect = sorter.getBoundingClientRect();
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
    if (isMobile) {
        statsSpan.style.left = 'auto';
        statsSpan.style.right = '0px';
        statsSpan.style.top = `${Math.round(sorterRect.bottom - containerRect.top + 6)}px`;
        statsSpan.style.transform = 'none';
    } else {
        statsSpan.style.right = 'auto';
        statsSpan.style.left = `${Math.round(sorterRect.right - containerRect.left + 8)}px`;
        statsSpan.style.top = `${Math.round(sorterRect.top - containerRect.top + sorterRect.height / 2)}px`;
        statsSpan.style.transform = 'translateY(-50%)';
    }

    // 动态更新容器间距，确保新样式生效
    statsSpan.style.gap = '8px';

    // 标签基础样式 - 采用圆角胶囊风格
    const tagBaseStyle = 'display:inline-flex; align-items:center; padding: 4px 10px; border-radius: 12px; font-size: 12px; line-height: 1; transition: all 0.3s;';
    
    // 屏蔽标签样式 (柔和红)
    let blockedTagStyle = tagBaseStyle + 'background: #fff2f0; border: 1px solid #ffccc7; color: #cf1322;';
    // 如果处于“仅显示屏蔽”模式
    if (isShowingOnlyBlocked) {
        blockedTagStyle = tagBaseStyle + 'background: #ffccc7; border: 1px solid #ff7875; color: #a8071a;';
    }
    blockedTagStyle += 'cursor: pointer;';

    // 高亮标签样式 (柔和黄)
    let highlightedTagStyle = tagBaseStyle + 'background: #fffbe6; border: 1px solid #ffe58f; color: #d48806;';
    
    // 如果处于“仅显示高亮”模式，加深背景色或边框以示激活
    if (isShowingOnlyHighlighted) {
        highlightedTagStyle = tagBaseStyle + 'background: #ffe58f; border: 1px solid #ffc53d; color: #d48806;';
    }
    highlightedTagStyle += 'cursor: pointer;'; // 添加手型光标

    // 数字样式
    const numberStyle = 'font-weight: 700; margin-left: 6px; min-width: 14px; text-align: center;';

    statsSpan.innerHTML = `
        <span id="ns-stats-blocked-btn" style="${blockedTagStyle}" title="点击${isShowingOnlyBlocked ? '恢复显示所有' : '只显示屏蔽帖子'}">
            屏蔽
            <span style="${numberStyle}">${currentBlockedCount}</span>
        </span>
        <span id="ns-stats-highlight-btn" style="${highlightedTagStyle}" title="点击${isShowingOnlyHighlighted ? '恢复显示所有' : '只显示高亮帖子'}">
            高亮
            <span style="${numberStyle}">${currentHighlightedCount}</span>
        </span>
    `;

    // 添加点击事件
    setTimeout(() => {
        const highlightBtn = document.getElementById('ns-stats-highlight-btn');
        if (highlightBtn) {
            highlightBtn.onclick = toggleShowOnlyHighlighted;
        }
        
        const blockedBtn = document.getElementById('ns-stats-blocked-btn');
        if (blockedBtn) {
            blockedBtn.onclick = toggleShowOnlyBlocked;
        }
    }, 0);
}

// 切换“只显示高亮”模式
function toggleShowOnlyHighlighted() {
    isShowingOnlyHighlighted = !isShowingOnlyHighlighted;
    // 互斥：如果开启高亮模式，则关闭屏蔽模式
    if (isShowingOnlyHighlighted) isShowingOnlyBlocked = false;
    
    refreshFilterAndHighlight();
}

// 切换“只显示屏蔽”模式
function toggleShowOnlyBlocked() {
    isShowingOnlyBlocked = !isShowingOnlyBlocked;
    // 互斥：如果开启屏蔽模式，则关闭高亮模式
    if (isShowingOnlyBlocked) isShowingOnlyHighlighted = false;
    
    refreshFilterAndHighlight();
}

function refreshFilterAndHighlight() {
    // 获取当前的屏蔽关键词和显示关键词
    const blacklistKeywords = getCustomKeywords();
    // 尝试从输入框获取显示关键词，如果不存在则从storage获取
    const input = document.getElementById('ns-keyword-input');
    const whitelistKeywords = input ? input.value.split(/,|，/).map(s => s.trim()).filter(Boolean) : getKeywords();

    // 重新应用过滤
    filterPosts(blacklistKeywords, whitelistKeywords);
    // 重新应用高亮
    applyKeywordHighlight();
    
    // 更新UI状态
    updateStatsUI();
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
    let blockedCount = 0;

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



        // 尝试获取作者
        let authorEl = item.querySelector('.post-author a');
        let author = authorEl ? authorEl.textContent.trim() : '';

        if (!author) {
            const authorSelectors = [
                '.post-author',
                '.author',
                '.post-meta a',
                '.meta a',
                'a[href*="/user/"]',
                'a[href*="/member/"]',
                'td:nth-child(2) a', // 表格布局中的作者列
                '.post-info a',
            ];

            for (const selector of authorSelectors) {
                authorEl = item.querySelector(selector);
                if (authorEl && authorEl.textContent.trim()) {
                    author = authorEl.textContent.trim();
                    break;
                }
            }
        }

        let shouldShow = true;

        // 检查当前网址是否包含 'post'，如果包含则不进行过滤
        if (!window.location.href.includes('post')) {
            // 检查是否为不屏蔽用户
            const whitelistUsers = getWhitelistUsers();
            let isWhitelistedUser = false;
            if (author && whitelistUsers.length > 0) {
                isWhitelistedUser = whitelistUsers.some(u => u.toLowerCase() === author.toLowerCase());
            }

            // 如果有白名单关键词，则只显示同时匹配所有白名单关键词的帖子
            if (whitelistKeywords.length > 0) {
                shouldShow = whitelistKeywords.every(kw => kw && normalizeText(title).includes(normalizeText(kw)));
            }

            // 在白名单过滤基础上，再隐藏黑名单帖子
            // 如果是白名单用户，则跳过黑名单检查
            if (shouldShow && blacklistKeywords.length > 0 && !isWhitelistedUser) {
                const containsBlacklist = blacklistKeywords.some(kw => kw && normalizeText(title).includes(normalizeText(kw)));
                if (containsBlacklist) {
                    shouldShow = false;
                }
            }
        }

        if (shouldShow) {
            // 如果开启了“只显示屏蔽”模式，正常显示的反而要隐藏
            if (isShowingOnlyBlocked) {
                item.style.display = 'none';
            } else {
                item.style.display = '';
            }
            showCount++;
        } else {
            // 如果开启了“只显示屏蔽”模式，原本被屏蔽的现在要显示
            if (isShowingOnlyBlocked) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
            blockedCount++;
        }
    });

    // 注意：高亮模式的过滤是在 applyKeywordHighlight 中处理的
    // 如果同时开启了高亮模式（虽然目前是互斥的），需要确保逻辑兼容
    // 但因为 applyKeywordHighlight 在 filterPosts 之后执行，所以那里会再次处理显示逻辑
    
    currentBlockedCount = blockedCount;
    updateStatsUI();
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

    // 检查长度限制（15个字符）
    if (normalizedKeyword.length > 15) {
        return 'too_long';
    }

    // 检查是否已存在（不区分大小写和简繁体）
    const exists = keywords.some(existing =>
        normalizeText(existing) === normalizeText(normalizedKeyword)
    );

    if (!exists) {
        keywords.unshift(normalizedKeyword);
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
    if (window.addLog) window.addLog(`删除关键词：${keyword}`);
    return filtered;
}

// ========== 不屏蔽用户功能管理 ==========

// 保存不屏蔽用户列表到 localStorage
function saveWhitelistUsers(users) {
    localStorage.setItem('ns-filter-whitelist-users', JSON.stringify(users));
}

// 从 localStorage 获取不屏蔽用户列表
function getWhitelistUsers() {
    const saved = localStorage.getItem('ns-filter-whitelist-users');
    return saved ? JSON.parse(saved) : [];
}

// 添加单个用户到不屏蔽列表
function addWhitelistUser(username) {
    if (!username || !username.trim()) return false;

    const users = getWhitelistUsers();
    const normalizedUsername = username.trim();
    if (normalizedUsername.length > 20) {
        return 'too_long';
    }

    // 检查是否已存在（不区分大小写）
    const exists = users.some(existing =>
        existing.toLowerCase() === normalizedUsername.toLowerCase()
    );

    if (!exists) {
        users.unshift(normalizedUsername);
        saveWhitelistUsers(users);
        return true;
    }
    return false;
}

// 从不屏蔽列表删除用户
function removeWhitelistUser(username) {
    const users = getWhitelistUsers();
    const filtered = users.filter(u => u !== username);
    saveWhitelistUsers(filtered);
    if (window.addLog) window.addLog(`删除不屏蔽用户：${username}`);
    return filtered;
}

// ========== 关键词高亮功能管理 ==========

// 保存高亮关键词列表到 localStorage
function saveHighlightKeywords(keywords) {
    localStorage.setItem('ns-filter-highlight-keywords', JSON.stringify(keywords));
}

// 从 localStorage 获取高亮关键词列表
function getHighlightKeywords() {
    const saved = localStorage.getItem('ns-filter-highlight-keywords');
    return saved ? JSON.parse(saved) : [];
}

// 添加单个关键词到高亮列表
function addHighlightKeyword(keyword) {
    if (!keyword || !keyword.trim()) return false;

    const keywords = getHighlightKeywords();
    const normalizedKeyword = keyword.trim();

    // 检查长度限制（15个字符）
    if (normalizedKeyword.length > 15) {
        return 'too_long';
    }

    // 检查是否已存在（不区分大小写和简繁体）
    const exists = keywords.some(existing =>
        normalizeText(existing) === normalizeText(normalizedKeyword)
    );

    if (!exists) {
        keywords.unshift(normalizedKeyword);
        saveHighlightKeywords(keywords);
        return true;
    }
    return false;
}

// 从高亮列表删除关键词
function removeHighlightKeyword(keyword) {
    const keywords = getHighlightKeywords();
    const filtered = keywords.filter(k => k !== keyword);
    saveHighlightKeywords(filtered);
    if (window.addLog) window.addLog(`删除高亮关键词：${keyword}`);
    return filtered;
}

// ========== 作者高亮功能管理 ==========

// 保存作者高亮选项状态到 localStorage
function saveHighlightAuthorOption(enabled) {
    localStorage.setItem('ns-filter-highlight-author-enabled', JSON.stringify(enabled));
}

// 从 localStorage 获取作者高亮选项状态
function getHighlightAuthorOption() {
    const saved = localStorage.getItem('ns-filter-highlight-author-enabled');
    return saved ? JSON.parse(saved) : false;
}

// ========== 高亮颜色管理 ==========

// 保存高亮颜色到 localStorage
function saveHighlightColor(color) {
    localStorage.setItem('ns-filter-highlight-color', color);
}

// 从 localStorage 获取高亮颜色
function getHighlightColor() {
    const saved = localStorage.getItem('ns-filter-highlight-color');
    return saved || '#ffeb3b'; // 默认黄色
}

// 保存显示关键词高亮颜色到 localStorage
function saveDisplayHighlightColor(color) {
    localStorage.setItem('ns-filter-display-highlight-color', color);
}

// 从 localStorage 获取显示关键词高亮颜色
function getDisplayHighlightColor() {
    const saved = localStorage.getItem('ns-filter-display-highlight-color');
    return saved || '#b3e5fc'; // 默认浅蓝色，便于与高亮关键词区分
}

// 保存弹窗位置到 localStorage
function saveDialogPosition(position) {
    localStorage.setItem('ns-filter-dialog-position', JSON.stringify(position));
}

// 从 localStorage 获取弹窗位置
function getDialogPosition() {
    try {
        const saved = localStorage.getItem('ns-filter-dialog-position');
        if (!saved) return null;

        const position = JSON.parse(saved);

        // 验证位置数据有效性（宽松验证，恢复时会自动调整边界）
        if (position &&
            typeof position.left === 'number' && typeof position.top === 'number' &&
            !isNaN(position.left) && !isNaN(position.top) &&
            position.left >= -1000 && position.top >= -1000) { // 只检查明显异常的值
            return position;
        } else {
            // 清除无效数据
            localStorage.removeItem('ns-filter-dialog-position');

            return null;
        }
    } catch (error) {
        // 解析错误时清除数据
        localStorage.removeItem('ns-filter-dialog-position');
        return null;
    }
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
    localStorage.removeItem('ns-filter-highlight-keywords'); // 清除高亮关键词
    localStorage.removeItem('ns-filter-highlight-author-enabled'); // 清除作者高亮选项
    localStorage.removeItem('ns-filter-highlight-color'); // 清除高亮颜色设置
    localStorage.removeItem('ns-filter-display-highlight-color'); // 清除显示关键词高亮颜色设置
}

// 清理损坏的位置数据
function cleanupDialogPosition() {
    try {
        const saved = localStorage.getItem('ns-filter-dialog-position');
        if (saved) {
            const position = JSON.parse(saved);
            // 只清除格式完全错误的数据，不清除超出边界的数据（恢复时会自动调整）
            if (!position ||
                typeof position.left !== 'number' || typeof position.top !== 'number' ||
                isNaN(position.left) || isNaN(position.top) ||
                position.left < -1000 || position.top < -1000) { // 只清除明显异常的值
                localStorage.removeItem('ns-filter-dialog-position');

            }
        }
    } catch (error) {
        localStorage.removeItem('ns-filter-dialog-position');

    }
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
    dialog.style.borderRadius = '16px'; // Default for desktop
    dialog.style.boxShadow = '0 12px 48px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)'; // Modern shadow
    dialog.style.fontSize = '14px';
    dialog.style.color = '#333';
    dialog.style.lineHeight = '1.6';
    dialog.style.border = '1px solid rgba(0,0,0,0.05)';
    dialog.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    dialog.style.userSelect = 'auto';

    // 检查是否为移动设备
    const isMobile = isMobileDevice();

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

        // 总是使用默认位置（右上角）
        dialog.style.top = '10px';
        dialog.style.right = '126px';
        dialog.style.left = 'auto';
    }

    dialog.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600;font-size:16px;color:#111;">关键词过滤</span>
            <span id="ns-keyword-filter-close" style="cursor:pointer;font-size:20px;color:#999;padding:4px;transition:color 0.2s;">×</span>
        </div>

        <div id="ns-whitelist-panel" style="display:none;">
            <div style="margin-bottom:12px;">
                <label style="font-weight:bold;color:#2196F3;">不屏蔽用户：</label><br>
                <div style="margin-bottom:6px;font-size:13px;color:#666;line-height:1.4;">
                    这些用户的帖子即使包含屏蔽词也会显示
                </div>
                <div style="display:flex;gap:8px;margin-top:8px;">
                    <input id="ns-add-whitelist-user-input" type="text" maxlength="20" style="flex:1;padding:8px 12px;font-size:14px;border:1px solid #e0e0e0;border-radius:8px;background:#f9f9f9;outline:none;transition:all 0.2s;" placeholder="输入用户名(≤20字符)" />
                    <button id="ns-add-whitelist-user-btn" style="padding:8px 16px;font-size:14px;background:#2196F3;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:500;box-shadow:0 2px 4px rgba(33,150,243,0.2);">添加</button>
                </div>
                <div id="ns-whitelist-user-hint" style="margin-top:2px;font-size:12px;color:#999;height:16px;line-height:16px;overflow:hidden;"></div>
            </div>
            <div id="ns-whitelist-users-section" style="margin-bottom:12px;margin-top:-5px;">
                <label style="font-weight:bold;">已设置不屏蔽的用户：</label>
                <div id="ns-whitelist-users-list" style="margin-top:6px;height:160px;min-height:160px;max-height:160px;overflow-y:auto;overflow-x:hidden;border:1px solid #eee;border-radius:4px;padding:6px;background:#fafafa;box-sizing:border-box;width:100%;"></div>
            </div>
            <div style="text-align:right;">
                <button id="ns-close-whitelist-panel" style="padding:4px 12px;font-size:14px;background:#9e9e9e;color:#fff;border:none;border-radius:4px;cursor:pointer;">返回</button>
            </div>
        </div>

        <div id="ns-highlight-post-panel" style="display:none;">
            <div style="margin-bottom:12px;">
                <label style="font-weight:bold;color:#FF9800;">🖍️ 高亮帖子内关键词：</label><br>
                <div style="margin-bottom:6px;font-size:13px;color:#666;line-height:1.4;">
                    设置帖子内容中需要高亮的关键词及颜色 (支持高亮整个网页关键词)
                </div>
                <div style="display:flex;gap:8px;margin-top:8px;align-items:center;">
                    <input id="ns-add-highlight-post-input" type="text" maxlength="12" style="flex:1;padding:8px 12px;font-size:14px;border:1px solid #e0e0e0;border-radius:8px;background:#f9f9f9;outline:none;transition:all 0.2s;" placeholder="输入关键词(≤12字符)" />
                    <input type="color" id="ns-add-highlight-post-color" value="#FFFF00" style="width:32px;height:32px;padding:0;border:none;background:none;cursor:pointer;" title="选择高亮颜色">
                    <button id="ns-add-highlight-post-btn" style="padding:8px 16px;font-size:14px;background:#FF9800;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:500;box-shadow:0 2px 4px rgba(255,152,0,0.2);">添加</button>
                </div>
                <div style="margin-top:2px;margin-left:2px;">
                    <span id="ns-highlight-post-char-count" style="font-size:12px;color:#999;">0/12 字符</span>
                </div>
                <div style="margin-top:8px;display:flex;gap:6px;align-items:center;">
                    <span style="font-size:12px;color:#666;">高亮范围：</span>
                    <button id="ns-highlight-mode-all" class="ns-highlight-mode-btn" data-mode="all" style="padding:3px 10px;font-size:12px;background:#FF9800;color:#fff;border:none;border-radius:4px;cursor:pointer;">全部</button>
                    <button id="ns-highlight-mode-username" class="ns-highlight-mode-btn" data-mode="username" style="padding:3px 10px;font-size:12px;background:#e0e0e0;color:#666;border:none;border-radius:4px;cursor:pointer;">仅用户名</button>
                    <button id="ns-highlight-mode-content" class="ns-highlight-mode-btn" data-mode="content" style="padding:3px 10px;font-size:12px;background:#e0e0e0;color:#666;border:none;border-radius:4px;cursor:pointer;">仅内容</button>
                </div>
            </div>
            <div id="ns-highlight-post-list-section" style="margin-bottom:12px;margin-top:-5px;">
                <label style="font-weight:bold;">已设置的高亮词：</label>
                <div id="ns-highlight-post-list" style="margin-top:6px;height:160px;min-height:160px;max-height:160px;overflow-y:auto;overflow-x:hidden;border:1px solid #eee;border-radius:4px;padding:6px;background:#fafafa;box-sizing:border-box;width:100%;"></div>
            </div>
            <div style="text-align:right;">
                <button id="ns-close-highlight-post-panel" style="padding:4px 12px;font-size:14px;background:#9e9e9e;color:#fff;border:none;border-radius:4px;cursor:pointer;">返回</button>
            </div>
        </div>

        <div id="ns-filter-main-content">
        
        <div style="margin-bottom:12px;">
            <label style="font-weight:bold;color:#f44336;">🚫屏蔽关键词：</label><br>
            <div style="margin-bottom:6px;font-size:13px;color:#666;line-height:1.4;">
                添加后永久隐藏包含这些关键词的帖子 • 限制15个字符以内
            </div>
            <div style="margin-bottom:6px;font-size:12px;color:#2196F3;line-height:1.3;">
                💡 提示：屏蔽用户请使用官方功能 
                <a href="https://www.nodeseek.com/setting#block" target="_blank" style="color:#2196F3;text-decoration:underline;">点击跳转</a>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;">
                <input id="ns-add-keyword-input" type="text" maxlength="15" style="flex:1;padding:8px 12px;font-size:14px;border:1px solid #e0e0e0;border-radius:8px;background:#f9f9f9;outline:none;transition:all 0.2s;" placeholder="输入要屏蔽的关键词(≤15字符)" />
                <button id="ns-add-keyword-btn" style="padding:8px 16px;font-size:14px;background:#f44336;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:500;box-shadow:0 2px 4px rgba(244,67,54,0.2);">屏蔽</button>
            </div>
            <div id="ns-keyword-length-hint" style="margin-top:2px;font-size:12px;color:#999;min-height:16px;"></div>
        </div>

        <div id="ns-custom-keywords-section" style="margin-bottom:12px;margin-top:-5px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <label style="font-weight:bold;">已屏蔽的关键词：</label>
                <button id="ns-open-whitelist-panel" style="padding:4px 10px;font-size:14px;background:#2196F3;color:#fff;border:none;border-radius:6px;cursor:pointer;">不屏蔽指定用户关键词</button>
            </div>
            <div id="ns-custom-keywords-list" style="margin-top:6px;height:110px;min-height:110px;max-height:110px;overflow-y:auto;overflow-x:hidden;border:1px solid #eee;border-radius:4px;padding:6px;background:#fafafa;box-sizing:border-box;width:100%;">
                <!-- 关键词列表将在这里动态生成 -->
            </div>
        </div>
        
        <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <label style="font-weight:bold;color:#ff9800;">🔆 高亮关键词：</label>
                <button id="ns-open-highlight-post-panel" style="padding:4px 10px;font-size:14px;background:#FF9800;color:#fff;border:none;border-radius:6px;cursor:pointer;transform: translateY(-5px);">高亮帖子内关键词</button>
            </div>
            <div style="margin-bottom:6px;font-size:13px;color:#666;line-height:1.4;">
                添加后高亮显示包含这些关键词的帖子标题 • 限制15个字符以内
            </div>
            <div style="margin-bottom:6px;display:flex;gap:6px;align-items:center;">
                <span style="font-size:13px;color:#666;">高亮范围：</span>
                <button id="ns-highlight-title-mode-all" class="ns-highlight-title-mode-btn" data-mode="all" style="padding:2px 8px;font-size:12px;background:#FF9800;color:#fff;border:none;border-radius:4px;cursor:pointer;">全部</button>
                <button id="ns-highlight-title-mode-title" class="ns-highlight-title-mode-btn" data-mode="title" style="padding:2px 8px;font-size:12px;background:#e0e0e0;color:#666;border:none;border-radius:4px;cursor:pointer;">仅标题</button>
                <button id="ns-highlight-title-mode-author" class="ns-highlight-title-mode-btn" data-mode="author" style="padding:2px 8px;font-size:12px;background:#e0e0e0;color:#666;border:none;border-radius:4px;cursor:pointer;">仅作者</button>
            </div>
            <div style="margin-bottom:6px;display:flex;align-items:center;gap:8px;">
                <label style="font-size:13px;color:#666;">高亮颜色：</label>
                <input type="color" id="ns-highlight-color-picker" style="width:40px;height:25px;border:1px solid #ccc;border-radius:4px;cursor:pointer;" />
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;">
                <input id="ns-add-highlight-input" type="text" maxlength="15" style="flex:1;padding:8px 12px;font-size:14px;border:1px solid #e0e0e0;border-radius:8px;background:#f9f9f9;outline:none;transition:all 0.2s;" placeholder="输入要高亮的关键词(≤15字符)" />
                <button id="ns-add-highlight-btn" style="padding:8px 16px;font-size:14px;background:#ff9800;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:500;box-shadow:0 2px 4px rgba(255,152,0,0.2);">高亮</button>
            </div>
            <div id="ns-highlight-length-hint" style="margin-top:2px;font-size:12px;color:#999;min-height:16px;"></div>
        </div>

        <div id="ns-highlight-keywords-section" style="margin-bottom:12px;margin-top:-5px;">
            <label style="font-weight:bold;">已高亮的关键词：</label>
            <div id="ns-highlight-keywords-list" style="margin-top:6px;height:110px;min-height:110px;max-height:110px;overflow-y:auto;overflow-x:hidden;border:1px solid #eee;border-radius:4px;padding:6px;background:#fafafa;box-sizing:border-box;width:100%;">
                <!-- 高亮关键词列表将在这里动态生成 -->
            </div>
        </div>

        <div style="margin-bottom:12px;padding-top:8px;border-top:1px solid #eee;">
            <label style="font-weight:bold;color:#4CAF50;">✅ 显示关键词（逗号分隔）：</label><br>
            <div style="margin-bottom:6px;font-size:13px;color:#666;line-height:1.4;">
                只显示<strong>同时包含所有</strong>关键词的帖子 • 支持大小写和简繁体混配。<br>可以同时输入多个关键词进行筛选，一般用于搜索使用。
            </div>
            <div style="display:flex;gap:8px;">
                <input id="ns-keyword-input" type="text" style="flex:1;padding:8px 12px;font-size:14px;border:1px solid #e0e0e0;border-radius:8px;background:#f9f9f9;outline:none;transition:all 0.2s;" placeholder="输入关键词，如VPS,測試,服务器" />
                <button id="ns-keyword-btn" style="padding:8px 16px;font-size:14px;background:#4CAF50;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:500;box-shadow:0 2px 4px rgba(76,175,80,0.2);">显示</button>
            </div>
            <div style="margin-top:8px;display:flex;align-items:center;gap:8px;">
                <label style="font-size:13px;color:#666;">显示关键词高亮颜色：</label>
                <input type="color" id="ns-display-highlight-color-picker" style="width:40px;height:25px;border:1px solid #ccc;border-radius:4px;cursor:pointer;" />
            </div>
        </div>

        </div>

        
        `;
    document.body.appendChild(dialog);

    const openWhitelistBtn = dialog.querySelector('#ns-open-whitelist-panel');
    const whitelistPanel = dialog.querySelector('#ns-whitelist-panel');
    const mainContent = dialog.querySelector('#ns-filter-main-content');
    if (openWhitelistBtn && whitelistPanel && mainContent) {
        openWhitelistBtn.addEventListener('click', function () {
            whitelistPanel.style.display = 'block';
            mainContent.style.display = 'none';
        });
    }
    const closeWhitelistBtn = dialog.querySelector('#ns-close-whitelist-panel');
    if (closeWhitelistBtn && whitelistPanel && mainContent) {
        closeWhitelistBtn.addEventListener('click', function () {
            whitelistPanel.style.display = 'none';
            mainContent.style.display = '';
        });
    }

    // 帖子内容高亮面板逻辑
    const openHighlightPostBtn = dialog.querySelector('#ns-open-highlight-post-panel');
    const highlightPostPanel = dialog.querySelector('#ns-highlight-post-panel');
    const closeHighlightPostBtn = dialog.querySelector('#ns-close-highlight-post-panel');
    const addHighlightPostBtn = dialog.querySelector('#ns-add-highlight-post-btn');
    const addHighlightPostInput = dialog.querySelector('#ns-add-highlight-post-input');
    const addHighlightPostColor = dialog.querySelector('#ns-add-highlight-post-color');

    if (openHighlightPostBtn && highlightPostPanel && mainContent) {
        openHighlightPostBtn.addEventListener('click', function () {
            highlightPostPanel.style.display = 'block';
            mainContent.style.display = 'none';
            renderHighlightPostKeywordsList();
        });
    }

    if (closeHighlightPostBtn && highlightPostPanel && mainContent) {
        closeHighlightPostBtn.addEventListener('click', function () {
            highlightPostPanel.style.display = 'none';
            mainContent.style.display = '';
        });
    }

    function renderHighlightPostKeywordsList() {
        const keywords = getHighlightPostKeywords();
        const listContainer = dialog.querySelector('#ns-highlight-post-list');

        if (!listContainer) return;

        if (keywords.length === 0) {
            listContainer.innerHTML = '<div style="color:#999;font-size:13px;text-align:center;padding:38px 8px;">暂无已设置的高亮词</div>';
            listContainer.style.height = 'auto';
            listContainer.style.minHeight = '160px';
            listContainer.style.maxHeight = '160px';
            listContainer.style.overflowY = 'hidden';
        } else {
            listContainer.innerHTML = keywords.map(item => {
                return `
                    <div style="display:inline-flex;align-items:center;margin:2px;padding:4px 8px;background:#fff;border:1px solid #ddd;border-radius:12px;font-size:13px;color:#333;max-width:100%;word-break:break-all;">
                        <span style="max-width:calc(100% - 22px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.keyword}</span>
                        <button class="ns-remove-highlight-post" data-keyword="${item.keyword}" style="margin-left:6px;background:none;border:none;color:#999;cursor:pointer;font-size:16px;line-height:1;padding:0;width:16px;height:16px;flex-shrink:0;" title="删除">×</button>
                    </div>
                `;
            }).join('');
            listContainer.style.height = '160px';
            listContainer.style.minHeight = '160px';
            listContainer.style.maxHeight = '160px';
            listContainer.style.overflowY = 'auto';
        }

        // 添加删除事件
        listContainer.querySelectorAll('.ns-remove-highlight-post').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const keyword = this.dataset.keyword;
                removeHighlightPostKeyword(keyword);
                renderHighlightPostKeywordsList();
                highlightPostContent(); // 重新应用
            });
        });
    }

    function addHighlightPostAction() {
        const keyword = addHighlightPostInput.value.trim();
        const color = addHighlightPostColor.value;

        if (!keyword) {
            addHighlightPostInput.focus();
            return;
        }

        const result = addHighlightPostKeyword(keyword, color);
        if (result === true) {
            addHighlightPostInput.value = '';
            renderHighlightPostKeywordsList();
            highlightPostContent();

            if (typeof window.addLog === 'function') {
                window.addLog(`设置帖子高亮词"${keyword}"`);
            }
        } else if (result === 'too_long') {
            alert('关键词过长');
        }
    }

    if (addHighlightPostBtn) {
        addHighlightPostBtn.addEventListener('click', addHighlightPostAction);
    }

    if (addHighlightPostColor) {
        addHighlightPostColor.addEventListener('change', function () {
            const newColor = this.value;
            const keywords = getHighlightPostKeywords();
            if (Array.isArray(keywords) && keywords.length > 0) {
                const updated = keywords.map(item => ({ keyword: item.keyword, color: newColor }));
                saveHighlightPostKeywords(updated);
                renderHighlightPostKeywordsList();
                highlightPostContent();
                if (typeof window.addLog === 'function') {
                    window.addLog(`帖子内容高亮颜色已更改为${newColor}`);
                }
            }
        });
    }

    if (addHighlightPostInput) {
        const charCountSpan = dialog.querySelector('#ns-highlight-post-char-count');

        addHighlightPostInput.addEventListener('input', function () {
            const length = this.value.length;
            if (charCountSpan) {
                charCountSpan.textContent = `${length}/12 字符`;
                // 超过限制时显示红色
                if (length > 12) {
                    charCountSpan.style.color = '#f00';
                } else {
                    charCountSpan.style.color = '#999';
                }
            }
        });

        addHighlightPostInput.addEventListener('focus', function () {
            this.dataset.placeholder = this.getAttribute('placeholder');
            this.setAttribute('placeholder', '');
        });

        addHighlightPostInput.addEventListener('blur', function () {
            this.setAttribute('placeholder', this.dataset.placeholder || '输入关键词(≤12字符)');
        });

        addHighlightPostInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                addHighlightPostAction();
            }
        });
    }

    // 高亮模式按钮事件
    const modeButtons = dialog.querySelectorAll('.ns-highlight-mode-btn');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const mode = this.dataset.mode;
            saveHighlightMode(mode);

            // 更新按钮样式
            modeButtons.forEach(b => {
                if (b.dataset.mode === mode) {
                    b.style.background = '#FF9800';
                    b.style.color = '#fff';
                } else {
                    b.style.background = '#e0e0e0';
                    b.style.color = '#666';
                }
            });

            // 重新应用高亮
            highlightPostContent();
        });
    });

    // 初始化模式按钮状态
    const currentMode = getHighlightMode();
    modeButtons.forEach(btn => {
        if (btn.dataset.mode === currentMode) {
            btn.style.background = '#FF9800';
            btn.style.color = '#fff';
        }
    });

    // 标题高亮模式按钮事件
    const titleModeButtons = dialog.querySelectorAll('.ns-highlight-title-mode-btn');
    titleModeButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const mode = this.dataset.mode;
            saveHighlightTitleMode(mode);

            // 更新按钮样式
            titleModeButtons.forEach(b => {
                if (b.dataset.mode === mode) {
                    b.style.background = '#FF9800';
                    b.style.color = '#fff';
                } else {
                    b.style.background = '#e0e0e0';
                    b.style.color = '#666';
                }
            });

            // 重新应用高亮
            applyKeywordHighlight();
        });
    });

    // 初始化标题高亮模式按钮状态
    const currentTitleMode = getHighlightTitleMode();
    titleModeButtons.forEach(btn => {
        if (btn.dataset.mode === currentTitleMode) {
            btn.style.background = '#FF9800';
            btn.style.color = '#fff';
        }
    });

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

        // 不屏蔽用户输入框和按钮
        const addWhitelistUserInput = dialog.querySelector('#ns-add-whitelist-user-input');
        const addWhitelistUserBtn = dialog.querySelector('#ns-add-whitelist-user-btn');
        if (addWhitelistUserInput) {
            addWhitelistUserInput.style.fontSize = '16px';
            addWhitelistUserInput.style.padding = '8px 10px';
        }
        if (addWhitelistUserBtn) {
            addWhitelistUserBtn.style.fontSize = '16px';
            addWhitelistUserBtn.style.padding = '8px 12px';
        }

        // 高亮关键词输入框和按钮
        const addHighlightInput = dialog.querySelector('#ns-add-highlight-input');
        const addHighlightBtn = dialog.querySelector('#ns-add-highlight-btn');
        if (addHighlightInput) {
            addHighlightInput.style.fontSize = '16px';
            addHighlightInput.style.padding = '8px 10px';
        }
        if (addHighlightBtn) {
            addHighlightBtn.style.fontSize = '16px';
            addHighlightBtn.style.padding = '8px 12px';
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
            // 没有关键词时调整样式，避免滚动条
            listContainer.style.height = 'auto';
            listContainer.style.minHeight = '110px';
            listContainer.style.maxHeight = '110px';
            listContainer.style.overflowY = 'hidden';
        } else {
            listContainer.innerHTML = customKeywords.map(keyword => {
                // 检查关键词长度,超长的用不同样式显示
                const isLong = keyword.length > 15;
                const title = isLong ? `关键词过长(${keyword.length}字符)，建议删除重新添加` : '删除关键词';

                return `
                    <div style="display:inline-flex;align-items:center;margin:2px;padding:4px 8px;background:#fff;border:1px solid #ddd;border-radius:12px;font-size:13px;color:#333;max-width:100%;word-break:break-all;">
                        <span title="${isLong ? '长度超限' : ''}" style="max-width:calc(100% - 22px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${keyword}</span>
                        <button class="ns-remove-keyword" data-keyword="${keyword}" style="margin-left:6px;background:none;border:none;color:#999;cursor:pointer;font-size:16px;line-height:1;padding:0;width:16px;height:16px;flex-shrink:0;" title="${title}">×</button>
                    </div>
                `;
            }).join('');
            // 有关键词时恢复滚动样式
            listContainer.style.height = '110px';
            listContainer.style.minHeight = '110px';
            listContainer.style.maxHeight = '110px';
            listContainer.style.overflowY = 'auto';
        }

        // 添加删除按钮事件监听器
        listContainer.querySelectorAll('.ns-remove-keyword').forEach(btn => {
            btn.addEventListener('click', function (e) {
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

    // 渲染不屏蔽用户列表
    function renderWhitelistUsersList() {
        const users = getWhitelistUsers();
        const listContainer = dialog.querySelector('#ns-whitelist-users-list');

        if (users.length === 0) {
            listContainer.innerHTML = '<div style="color:#999;font-size:13px;text-align:center;padding:25px 8px;">暂无不屏蔽的用户</div>';
            listContainer.style.height = 'auto';
            listContainer.style.minHeight = '160px';
            listContainer.style.maxHeight = '160px';
            listContainer.style.overflowY = 'hidden';
        } else {
            listContainer.innerHTML = users.map(user => {
                return `
                    <div style="display:inline-flex;align-items:center;margin:2px;padding:4px 8px;background:#fff;border:1px solid #ddd;border-radius:12px;font-size:13px;color:#333;max-width:100%;word-break:break-all;">
                        <span style="max-width:calc(100% - 22px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${user}</span>
                        <button class="ns-remove-whitelist-user" data-user="${user}" style="margin-left:6px;background:none;border:none;color:#999;cursor:pointer;font-size:16px;line-height:1;padding:0;width:16px;height:16px;flex-shrink:0;" title="删除">×</button>
                    </div>
                `;
            }).join('');
            listContainer.style.height = '160px';
            listContainer.style.minHeight = '160px';
            listContainer.style.maxHeight = '160px';
            listContainer.style.overflowY = 'auto';
        }

        // Add remove listeners
        listContainer.querySelectorAll('.ns-remove-whitelist-user').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const user = this.dataset.user;
                removeWhitelistUser(user);
                renderWhitelistUsersList();
                // Re-apply filter
                const blacklistKeywords = getCustomKeywords();
                const whitelistKeywords = input.value.split(/,|，/).map(s => s.trim()).filter(Boolean);
                filterPosts(blacklistKeywords, whitelistKeywords);
            });
        });
    }

    // 渲染高亮关键词列表
    function renderHighlightKeywordsList() {
        const highlightKeywords = getHighlightKeywords();
        const listContainer = dialog.querySelector('#ns-highlight-keywords-list');

        // 使用DocumentFragment减少DOM操作
        const fragment = document.createDocumentFragment();

        if (highlightKeywords.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.style.cssText = 'color:#999;font-size:13px;text-align:center;padding:38px 8px;';
            emptyDiv.textContent = '暂无已高亮的关键词';
            fragment.appendChild(emptyDiv);

            // 没有关键词时调整样式，避免滚动条
            listContainer.style.height = 'auto';
            listContainer.style.minHeight = '110px';
            listContainer.style.maxHeight = '110px';
            listContainer.style.overflowY = 'hidden';
        } else {
            highlightKeywords.forEach(keyword => {
                // 检查关键词长度,超长的用不同样式显示
                const isLong = keyword.length > 15;
                const title = isLong ? `关键词过长(${keyword.length}字符)，建议删除重新添加` : '删除关键词';

                const keywordDiv = document.createElement('div');
                keywordDiv.style.cssText = `display:inline-flex;align-items:center;margin:2px;padding:4px 8px;background:#fff;border:1px solid #ddd;border-radius:12px;font-size:13px;color:#333;max-width:100%;word-break:break-all;`;

                const span = document.createElement('span');
                span.title = isLong ? '长度超限' : '';
                span.style.cssText = 'max-width:calc(100% - 22px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                span.textContent = keyword;

                const removeBtn = document.createElement('button');
                removeBtn.className = 'ns-remove-highlight';
                removeBtn.dataset.keyword = keyword;
                removeBtn.style.cssText = 'margin-left:6px;background:none;border:none;color:#999;cursor:pointer;font-size:16px;line-height:1;padding:0;width:16px;height:16px;flex-shrink:0;';
                removeBtn.title = title;
                removeBtn.textContent = '×';

                // 添加删除按钮事件监听器
                removeBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const keyword = this.dataset.keyword;
                    removeHighlightKeyword(keyword);
                    renderHighlightKeywordsList();
                    // 重新应用高亮
                    applyKeywordHighlight();
                });

                keywordDiv.appendChild(span);
                keywordDiv.appendChild(removeBtn);
                fragment.appendChild(keywordDiv);
            });

            // 有关键词时恢复滚动样式
            listContainer.style.height = '110px';
            listContainer.style.minHeight = '110px';
            listContainer.style.maxHeight = '110px';
            listContainer.style.overflowY = 'auto';
        }

        // 清空容器并添加新内容
        listContainer.innerHTML = '';
        listContainer.appendChild(fragment);
    }

    // 不再需要getAllActiveKeywords函数

    // 初始渲染关键词列表
    renderCustomKeywordsList();
    renderHighlightKeywordsList();
    renderWhitelistUsersList();

    // 初始化作者高亮选项状态
    const highlightAuthorCheckbox = dialog.querySelector('#ns-highlight-author-checkbox');
    if (highlightAuthorCheckbox) {
        highlightAuthorCheckbox.checked = getHighlightAuthorOption();

        // 添加作者高亮选项变化事件监听器
        highlightAuthorCheckbox.addEventListener('change', function () {
            saveHighlightAuthorOption(this.checked);
            // 重新应用高亮
            applyKeywordHighlight();

            // 操作日志记录
            if (typeof window.addLog === 'function') {
                window.addLog(`${this.checked ? '开启' : '关闭'}作者高亮`);
            }
        });
    }

    // 初始化高亮颜色选择器
    const colorPicker = dialog.querySelector('#ns-highlight-color-picker');
    if (colorPicker) {
        const currentColor = getHighlightColor();
        colorPicker.value = currentColor;

        // 添加颜色变化事件监听器
        colorPicker.addEventListener('change', function () {
            const newColor = this.value;
            saveHighlightColor(newColor);

            // 重新应用高亮
            applyKeywordHighlight();

            // 操作日志记录
            if (typeof window.addLog === 'function') {
                window.addLog(`高亮颜色已更改为${newColor}`);
            }
        });
    }

    // 初始化显示关键词高亮颜色选择器
    const displayColorPicker = dialog.querySelector('#ns-display-highlight-color-picker');
    if (displayColorPicker) {
        const currentDisplayColor = getDisplayHighlightColor();
        displayColorPicker.value = currentDisplayColor;

        displayColorPicker.addEventListener('change', function () {
            const newColor = this.value;
            saveDisplayHighlightColor(newColor);

            // 重新应用高亮（显示与高亮关键词均更新）
            applyKeywordHighlight();

            if (typeof window.addLog === 'function') {
                window.addLog(`显示关键词高亮颜色已更改为${newColor}`);
            }
        });
    }

    // 确保在页面加载时应用已保存的屏蔽关键词过滤和高亮
    setTimeout(() => {
        const blacklistKeywords = getCustomKeywords();
        const whitelistKeywords = input.value.split(/,|，/).map(s => s.trim()).filter(Boolean);

        // 总是应用过滤逻辑（无论关键词是否为空）
        filterPosts(blacklistKeywords, whitelistKeywords);

        // 如果显示关键词为空，仅在存在屏蔽关键词时记录日志
        if (whitelistKeywords.length === 0 && typeof window.addLog === 'function') {
            const blackCount = blacklistKeywords.length;
            if (blackCount > 0) {
            }
        }

        // 应用高亮
        applyKeywordHighlight();
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
    showLengthHint('0/15 字符', '#999');

    // 实时字符计数
    addKeywordInput.addEventListener('input', function () {
        const length = this.value.length;
        if (length === 0) {
            showLengthHint('0/15 字符', '#999');
        } else if (length <= 15) {
            showLengthHint(`${length}/15 字符`, '#666');
        } else {
            showLengthHint(`${length}/15 字符 - 超出限制`, '#f44336');
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
            showLengthHint('0/15 字符', '#999');

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
            showLengthHint('关键词长度不能超过15个字符', '#f44336');
            setTimeout(() => {
                addKeywordInput.style.borderColor = '#ccc';
                showLengthHint('0/15 字符', '#999');
            }, 2000);
        } else {
            // 关键词已存在的提示
            addKeywordInput.style.borderColor = '#ff9800';
            showLengthHint('关键词已存在', '#ff9800');
            setTimeout(() => {
                addKeywordInput.style.borderColor = '#ccc';
                showLengthHint('0/15 字符', '#999');
            }, 1500);
        }
    }

    // 添加关键词按钮事件
    addKeywordBtn.addEventListener('click', addKeywordAction);

    // 添加关键词输入框回车事件
    addKeywordInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            addKeywordAction();
        }
    });

    // 输入框点击时隐藏placeholder
    addKeywordInput.addEventListener('focus', function () {
        this.placeholder = '';
    });

    // 输入框失焦时恢复placeholder（如果为空）
    addKeywordInput.addEventListener('blur', function () {
        if (!this.value.trim()) {
            this.placeholder = '输入要屏蔽的关键词(≤15字符)';
        }
    });

    // ===== 不屏蔽用户功能 =====
    const addWhitelistUserInput = dialog.querySelector('#ns-add-whitelist-user-input');
    const addWhitelistUserBtn = dialog.querySelector('#ns-add-whitelist-user-btn');
    const whitelistHintEl = dialog.querySelector('#ns-whitelist-user-hint');

    function showWhitelistUserHint(message, color = '#999') {
        if (!whitelistHintEl) return;
        whitelistHintEl.textContent = message;
        whitelistHintEl.style.color = color;
    }

    function addWhitelistUserAction() {
        const username = addWhitelistUserInput.value.trim();
        if (!username) {
            addWhitelistUserInput.focus();
            return;
        }

        const result = addWhitelistUser(username);
        if (result === true) {
            addWhitelistUserInput.value = '';
            renderWhitelistUsersList();

            // 立即应用过滤
            const blacklistKeywords = getCustomKeywords();
            const whitelistKeywords = input.value.split(/,|，/).map(s => s.trim()).filter(Boolean);
            filterPosts(blacklistKeywords, whitelistKeywords);

            if (typeof window.addLog === 'function') {
                window.addLog(`添加不屏蔽用户"${username}"`);
            }
            showWhitelistUserHint('', '#999');
        } else if (result === 'too_long') {
            addWhitelistUserInput.style.borderColor = '#f44336';
            showWhitelistUserHint('用户名长度不能超过20个字符', '#f44336');
            setTimeout(() => {
                addWhitelistUserInput.style.borderColor = '#ccc';
                showWhitelistUserHint('', '#999');
            }, 2000);
        } else {
            // 已存在提示
            addWhitelistUserInput.style.borderColor = '#ff9800';
            showWhitelistUserHint('关键词已存在', '#ff9800');
            setTimeout(() => {
                addWhitelistUserInput.style.borderColor = '#ccc';
                showWhitelistUserHint('', '#999');
            }, 1500);
        }
    }

    if (addWhitelistUserBtn) {
        addWhitelistUserBtn.addEventListener('click', addWhitelistUserAction);
    }
    if (addWhitelistUserInput) {
        addWhitelistUserInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                addWhitelistUserAction();
            }
        });

        // 输入框点击时隐藏placeholder
        addWhitelistUserInput.addEventListener('focus', function () {
            this.placeholder = '';
        });

        // 输入框失焦时恢复placeholder（如果为空）
        addWhitelistUserInput.addEventListener('blur', function () {
            if (!this.value.trim()) {
                this.placeholder = '输入用户名(≤20字符)';
            }
        });
    }

    // ===== 高亮关键词功能 =====
    const addHighlightInput = dialog.querySelector('#ns-add-highlight-input');
    const addHighlightBtn = dialog.querySelector('#ns-add-highlight-btn');
    const highlightLengthHintEl = dialog.querySelector('#ns-highlight-length-hint');

    // 显示高亮长度提示
    function showHighlightLengthHint(message, color = '#999') {
        highlightLengthHintEl.textContent = message;
        highlightLengthHintEl.style.color = color;
    }

    // 初始显示高亮字符计数
    showHighlightLengthHint('0/15 字符', '#999');

    // 实时高亮字符计数
    addHighlightInput.addEventListener('input', function () {
        const length = this.value.length;
        if (length === 0) {
            showHighlightLengthHint('0/15 字符', '#999');
        } else if (length <= 15) {
            showHighlightLengthHint(`${length}/15 字符`, '#666');
        } else {
            showHighlightLengthHint(`${length}/15 字符 - 超出限制`, '#f44336');
        }
    });

    function addHighlightKeywordAction() {
        const keyword = addHighlightInput.value.trim();
        if (!keyword) {
            addHighlightInput.focus();
            return;
        }

        const result = addHighlightKeyword(keyword);
        if (result === true) {
            // 添加成功
            addHighlightInput.value = '';
            renderHighlightKeywordsList();
            showHighlightLengthHint('0/15 字符', '#999');

            // 使用防抖机制应用高亮，避免卡顿
            applyKeywordHighlight();

            // 操作日志记录
            if (typeof window.addLog === 'function') {
                window.addLog(`高亮关键词"${keyword}"`);
            }
        } else if (result === 'too_long') {
            // 长度超限提示
            addHighlightInput.style.borderColor = '#f44336';
            showHighlightLengthHint('关键词长度不能超过15个字符', '#f44336');
            setTimeout(() => {
                addHighlightInput.style.borderColor = '#ccc';
                showHighlightLengthHint('0/15 字符', '#999');
            }, 2000);
        } else {
            // 关键词已存在的提示
            addHighlightInput.style.borderColor = '#ff9800';
            showHighlightLengthHint('关键词已存在', '#ff9800');
            setTimeout(() => {
                addHighlightInput.style.borderColor = '#ccc';
                showHighlightLengthHint('0/15 字符', '#999');
            }, 1500);
        }
    }

    // 添加高亮关键词按钮事件
    addHighlightBtn.addEventListener('click', addHighlightKeywordAction);

    // 添加高亮关键词输入框回车事件
    addHighlightInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            addHighlightKeywordAction();
        }
    });

    // 高亮输入框点击时隐藏placeholder
    addHighlightInput.addEventListener('focus', function () {
        this.placeholder = '';
    });

    // 高亮输入框失焦时恢复placeholder（如果为空）
    addHighlightInput.addEventListener('blur', function () {
        if (!this.value.trim()) {
            this.placeholder = '输入要高亮的关键词(≤15字符)';
        }
    });

    // 关闭按钮 - 关闭弹窗并清空显示关键词输入
    dialog.querySelector('#ns-keyword-filter-close').onclick = function () {
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
        // 重新应用高亮：移除显示关键词的高亮，仅保留高亮关键词与作者高亮
        applyKeywordHighlight();

        // 操作日志记录：仅在存在屏蔽关键词时记录
        if (typeof window.addLog === 'function') {
            const blackCount = blacklistKeywords.length;
            if (blackCount > 0) {
            }
        }

        dialog.remove();
    };

    // 过滤逻辑
    function doFilter() {
        const whitelistKeywords = input.value.split(/,|，/).map(s => s.trim()).filter(Boolean);
        const blacklistKeywords = getCustomKeywords();

        filterPosts(blacklistKeywords, whitelistKeywords);
        saveKeywords(whitelistKeywords); // 保存显示关键词
        // 过滤后立即应用关键词高亮（显示关键词也参与高亮）
        applyKeywordHighlight();

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
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            doFilter();
        }
    });

    // 仅在输入框变为空时，恢复默认显示并移除“显示关键词”的高亮
    // 非空编辑不触发过滤/高亮更新，需点击“显示”或按 Enter 才应用
    input.addEventListener('input', function () {
        const currentValue = this.value.trim();
        if (!currentValue) {
            const blacklistKeywords = getCustomKeywords();
            // 恢复到只应用屏蔽关键词的过滤（不再根据显示关键词过滤）
            filterPosts(blacklistKeywords, []);
            // 清空已保存的显示关键词，以防刷新后继续过滤
            saveKeywords([]);
            // 重新应用高亮：移除显示关键词高亮，保留高亮关键词与作者高亮
            applyKeywordHighlight();

            // 操作日志记录：仅在存在屏蔽关键词时记录
            if (typeof window.addLog === 'function') {
                const blackCount = blacklistKeywords.length;
                if (blackCount > 0) {
                }
            }
        }
    });

    input.onclick = function () {
        input.placeholder = '';
    };
    input.onblur = function () {
        if (!input.value) input.placeholder = '输入关键词，如VPS,測試,服务器';
    };
    // 桌面端拖动功能，移动端禁用
    setTimeout(() => {
        if (!isMobile) {
            const titleBar = dialog.querySelector('div');
            if (titleBar && window.makeDraggable) {
                window.makeDraggable(dialog, { width: 30, height: 30 });

                // 鼠标移动到左上角30x30像素时变为move
                dialog.addEventListener('mousemove', function (e) {
                    const rect = dialog.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    if (x >= 0 && x < 30 && y >= 0 && y < 30) {
                        dialog.style.cursor = 'move';
                    } else {
                        dialog.style.cursor = 'default';
                    }
                });

                dialog.addEventListener('mouseleave', function () {
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

                            // 位置变化时不再保存（总是使用默认位置）
                        }
                    };

                    // 定期检查位置变化
                    const positionObserver = setInterval(checkPosition, 100);

                    // 弹窗关闭时清除观察器
                    const originalRemove = dialog.remove;
                    dialog.remove = function () {
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
    const highlightKeywords = getHighlightKeywords(); // 高亮关键词

    // 总是应用过滤（无论是否有关键词），以确保统计数据显示
    // 延迟执行以确保页面元素(如.sorter)已加载
    setTimeout(() => {
        filterPosts(blacklistKeywords, whitelistKeywords);
    }, 100);

    // 只有显示关键词时才自动显示过滤弹窗（保持位置）
    // 仅屏蔽关键词时不显示弹窗
    if (whitelistKeywords.length > 0) {
        // 延迟创建弹窗，确保页面完全加载
        setTimeout(() => {
            createFilterUI(); // 自动打开，恢复保存的位置
        }, 100);
    }

    // 应用高亮关键词（无论是否有过滤关键词）
    if (highlightKeywords.length > 0) {
        // 延迟应用高亮，确保DOM完全加载
        setTimeout(() => {
            applyKeywordHighlight();
        }, 100);

        // 也立即尝试应用一次
        applyKeywordHighlight();
    }

    // 应用帖子内容高亮 (延迟以确保内容加载)
    setTimeout(() => {
        highlightPostContent();
    }, 500);
}

// 拖动功能实现（与主插件一致，支持 window.makeDraggable）
if (!window.makeDraggable) {
    window.makeDraggable = function (element, dragAreaSize = { width: 100, height: 32 }) {
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
        { keyword: '服务器', titles: ['VPS服务器推荐', 'VPS伺服器推薦', 'vps 服務器', 'VPS SERVER', '云服務器'] },
        { keyword: '测试', titles: ['软件测试', '軟體測試', 'TEST测試', '性能測試'] },
        { keyword: 'VPS', titles: ['vps推荐', 'VPS評測', '便宜的VPS', '免費VPS'] },
        { keyword: '网络', titles: ['网络配置', '網路設定', '网絡故障', '網絡問題'] }
    ];

    testKeywords.forEach(({ keyword, titles }) => {
        console.log(`\n  关键词: "${keyword}"`);
        titles.forEach(title => {
            const match = normalizeText(title).includes(normalizeText(keyword));
            console.log(`    ${match ? '✓' : '✗'} "${title}"`);
        });
    });

    console.log('\n3. 大小写测试：');
    const caseTests = [
        { keyword: 'VPS', titles: ['vps', 'Vps', 'VPS', 'vPs'] },
        { keyword: 'SERVER', titles: ['server', 'Server', 'SERVER', 'SeRvEr'] }
    ];

    caseTests.forEach(({ keyword, titles }) => {
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
    console.log('    添加"123456789012345"(15字符):', NodeSeekFilter.addCustomKeyword('123456789012345') === true ? '✓成功' : '✗失败');
    console.log('    添加"1234567890123456"(16字符):', NodeSeekFilter.addCustomKeyword('1234567890123456') === 'too_long' ? '✓正确拒绝' : '✗应该被拒绝');
    console.log('    添加"这是一个超级长的关键词测试"(16字符):', NodeSeekFilter.addCustomKeyword('这是一个超级长的关键词测试') === 'too_long' ? '✓正确拒绝' : '✗应该被拒绝');

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

// ========== 关键词高亮显示逻辑 ==========

// 应用关键词高亮
// 添加防抖机制
let highlightDebounceTimer = null;

function applyKeywordHighlight() {
    // 清除之前的定时器
    if (highlightDebounceTimer) {
        clearTimeout(highlightDebounceTimer);
    }

    // 设置防抖延迟
    highlightDebounceTimer = setTimeout(() => {
        applyKeywordHighlightImmediate();
    }, 100); // 100ms防抖延迟
}

function applyKeywordHighlightImmediate() {
    let highlightedCount = 0;
    // 分离两类关键词：高亮关键词 与 显示关键词（用于过滤）
    const highlightKeywords = (getHighlightKeywords() || []).map(k => k && k.trim()).filter(Boolean);
    const displayKeywords = (getKeywords() || []).map(k => k && k.trim()).filter(Boolean);
    const blacklistKeywords = (getCustomKeywords() || []).map(k => k && k.trim()).filter(Boolean);
    const highlightTitleMode = getHighlightTitleMode();

    // 当两类关键词均为空时，清除所有高亮
    if (highlightKeywords.length === 0 && displayKeywords.length === 0 && !(isShowingOnlyBlocked && blacklistKeywords.length > 0)) {
        clearKeywordHighlight();
        currentHighlightedCount = 0;
        updateStatsUI();
        return;
    }

    // 缓存选择器结果，避免重复查询
    let postItems = document.querySelectorAll('ul.post-list > li.post-list-item');

    if (postItems.length === 0) {
        const selectors = [
            'ul.post-list > li',
            '.post-list > li',
            '.post-list-item',
            '.post-item',
            '.topic-item',
            'div[class*="post"]',
            'li[class*="post"]',
            'tr[class*="post"]',
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

    // 预计算两类关键词的标准化版本，避免重复计算
    const normalizedHighlightKeywords = highlightKeywords.map(keyword => ({
        original: keyword,
        normalized: normalizeText(keyword)
    })).filter(item => item.normalized);
    const normalizedDisplayKeywords = displayKeywords.map(keyword => ({
        original: keyword,
        normalized: normalizeText(keyword)
    })).filter(item => item.normalized);
    const normalizedBlacklistKeywords = blacklistKeywords.map(keyword => ({
        original: keyword,
        normalized: normalizeText(keyword)
    })).filter(item => item.normalized);

    // 使用更高效的批量处理
    const processItem = (item) => {
        let isItemHighlighted = false;
        // 先清除该项目的现有高亮
        clearItemHighlight(item);

        // 处理标题高亮（显示关键词使用显示颜色；高亮关键词使用高亮颜色）
        // 仅在模式为 'all' 或 'title' 时执行
        if ((highlightTitleMode === 'all' || highlightTitleMode === 'title' || (isShowingOnlyBlocked && normalizedBlacklistKeywords.length > 0)) &&
            (normalizedHighlightKeywords.length > 0 || normalizedDisplayKeywords.length > 0 || (isShowingOnlyBlocked && normalizedBlacklistKeywords.length > 0))) {
            // 尝试多种方式获取帖子标题
            let titleEl = item.querySelector('.post-title a');
            let title = titleEl ? titleEl.textContent.trim() : '';

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
                    'td a',
                    'a[class*="title"]',
                    'a[class*="subject"]',
                    'a'
                ];

                for (const selector of titleSelectors) {
                    titleEl = item.querySelector(selector);
                    if (titleEl && titleEl.textContent.trim()) {
                        title = titleEl.textContent.trim();
                        break;
                    }
                }
            }

            if (title && titleEl) {
                const normalizedTitle = normalizeText(title);
                // 匹配显示关键词
                const matchedDisplay = normalizedDisplayKeywords.filter(item =>
                    normalizedTitle.includes(item.normalized)
                ).map(item => item.original);
                // 匹配高亮关键词
                const matchedHighlight = normalizedHighlightKeywords.filter(item =>
                    normalizedTitle.includes(item.normalized)
                ).map(item => item.original);
                const matchedBlocked = (isShowingOnlyBlocked && item.style.display !== 'none')
                    ? normalizedBlacklistKeywords.filter(item => normalizedTitle.includes(item.normalized)).map(item => item.original)
                    : [];

                const groups = [];
                if (matchedDisplay.length > 0) {
                    groups.push({ keywords: matchedDisplay, color: getDisplayHighlightColor() });
                }
                if (matchedHighlight.length > 0) {
                    groups.push({ keywords: matchedHighlight, color: getHighlightColor() });
                }
                if (matchedBlocked.length > 0) {
                    groups.push({ keywords: matchedBlocked, color: '#FF9800' });
                }

                if (groups.length > 0) {
                    if (matchedHighlight.length > 0) isItemHighlighted = true;
                    highlightTitleKeywordsMulti(titleEl, title, groups);
                }
            }
        }

        // 处理作者高亮（仅使用“高亮关键词”组，不使用显示关键词）
        // 仅在模式为 'all' 或 'author' 时执行
        if ((highlightTitleMode === 'all' || highlightTitleMode === 'author') && normalizedHighlightKeywords.length > 0) {
            // 尝试多种方式获取作者元素
            let authorEl = item.querySelector('.post-author a');
            let author = authorEl ? authorEl.textContent.trim() : '';

            if (!author) {
                const authorSelectors = [
                    '.post-author',
                    '.author',
                    '.post-meta a',
                    '.meta a',
                    'a[href*="/user/"]',
                    'a[href*="/member/"]',
                    'td:nth-child(2) a', // 表格布局中的作者列
                    '.post-info a',
                    '.user-link'
                ];

                for (const selector of authorSelectors) {
                    authorEl = item.querySelector(selector);
                    if (authorEl && authorEl.textContent.trim()) {
                        author = authorEl.textContent.trim();
                        break;
                    }
                }
            }

            if (author && authorEl) {
                const normalizedAuthor = normalizeText(author);
                const matchedHighlight = normalizedHighlightKeywords.filter(item =>
                    normalizedAuthor.includes(item.normalized)
                ).map(item => item.original);

                if (matchedHighlight.length > 0) {
                    isItemHighlighted = true;
                    // 仅对作者应用高亮关键词颜色
                    highlightTitleKeywordsMulti(authorEl, author, [{ keywords: matchedHighlight, color: getHighlightColor() }]);
                }
            }
        }
        if (isItemHighlighted && item.style.display !== 'none') {
            highlightedCount++;
        } else if (isShowingOnlyHighlighted && !isItemHighlighted) {
            // 如果是“仅显示高亮”模式，且该项目未高亮，则隐藏
            item.style.display = 'none';
        }
    };

    // 分批处理，避免阻塞UI
    const batchSize = 10;
    let currentIndex = 0;

    const processBatch = () => {
        const endIndex = Math.min(currentIndex + batchSize, postItems.length);

        for (let i = currentIndex; i < endIndex; i++) {
            processItem(postItems[i]);
        }

        currentIndex = endIndex;

        if (currentIndex < postItems.length) {
            // 使用requestAnimationFrame确保UI响应
            requestAnimationFrame(processBatch);
        } else {
            currentHighlightedCount = highlightedCount;
            updateStatsUI();
        }
    };

    processBatch();
}

// 清除所有关键词高亮效果
function clearKeywordHighlight() {
    // 查找所有可能包含高亮的元素
    const highlightedElements = document.querySelectorAll('.ns-keyword-highlight');
    highlightedElements.forEach(el => {
        // 恢复原始文本
        if (el.parentNode) {
            el.parentNode.replaceChild(document.createTextNode(el.textContent), el);
        }
    });

    // 标准化文本节点（合并相邻的文本节点）
    const allPostItems = document.querySelectorAll('ul.post-list > li.post-list-item, ul.post-list > li, .post-list > li, .post-list-item, .post-item, .topic-item');
    allPostItems.forEach(item => {
        const titleElements = item.querySelectorAll('a[href*="/topic/"], .post-title a, .topic-title a, .title a');
        titleElements.forEach(titleEl => {
            if (titleEl.parentNode) {
                titleEl.parentNode.normalize();
            }
        });
    });
}

// 清除单个项目的高亮效果
function clearItemHighlight(item) {
    const highlightedElements = item.querySelectorAll('.ns-keyword-highlight');
    highlightedElements.forEach(el => {
        if (el.parentNode) {
            el.parentNode.replaceChild(document.createTextNode(el.textContent), el);
        }
    });

    // 标准化文本节点
    const titleElements = item.querySelectorAll('a[href*="/topic/"], .post-title a, .topic-title a, .title a');
    titleElements.forEach(titleEl => {
        if (titleEl.parentNode) {
            titleEl.parentNode.normalize();
        }
    });
}

// 高亮标题中的关键词
function highlightTitleKeywords(titleEl, originalTitle, keywords) {
    // 保存原始HTML结构
    const originalHTML = titleEl.innerHTML;

    try {
        let processedHTML = originalTitle;

        // 按关键词长度排序，优先处理长关键词，避免短关键词覆盖长关键词
        const sortedKeywords = keywords.sort((a, b) => b.length - a.length);

        // 使用简单的字符串替换，避免复杂的算法
        const highlightColor = getHighlightColor();

        sortedKeywords.forEach(keyword => {
            if (!keyword || keyword.trim() === '') return;

            // 同时匹配简体与繁体的变体
            const variantsSet = new Set();
            const kw = keyword.trim();
            variantsSet.add(kw);
            variantsSet.add(convertTraditionalToSimplified(kw));
            variantsSet.add(convertSimplifiedToTraditional(kw));
            const variants = Array.from(variantsSet).filter(v => v && v.trim());
            // 优先长词，降低嵌套概率
            variants.sort((a, b) => b.length - a.length);
            const pattern = variants.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
            const regex = new RegExp(pattern, 'gi');

            processedHTML = processedHTML.replace(regex, (match) => {
                // 使用自定义颜色的高亮样式
                return `<span class="ns-keyword-highlight" style="background-color: ${highlightColor}; color: #333; font-weight: inherit; display: inline; margin: 0; padding: 0; line-height: inherit; vertical-align: baseline;">${match}</span>`;
            });
        });

        // 应用处理后的HTML
        titleEl.innerHTML = processedHTML;

    } catch (error) {
        console.warn('高亮关键词时出错:', error);
        // 如果出错，恢复原始HTML
        titleEl.innerHTML = originalHTML;
    }
}

// 支持多组关键词分别使用不同颜色进行一次性高亮，避免覆盖
function highlightTitleKeywordsMulti(titleEl, originalTitle, groups) {
    const originalHTML = titleEl.innerHTML;
    try {
        let processedHTML = originalTitle;
        // 将组展开为 {kw, color} 列表
        const entries = [];
        (groups || []).forEach(group => {
            const color = (group && group.color) ? group.color : getHighlightColor();
            (group && group.keywords ? group.keywords : []).forEach(kw => {
                if (kw && kw.trim()) entries.push({ kw: kw.trim(), color });
            });
        });

        // 按关键词长度降序，优先长词，降低嵌套概率
        entries.sort((a, b) => b.kw.length - a.kw.length);

        entries.forEach(({ kw, color }) => {
            // 为每个关键词生成简体与繁体的变体集合
            const variantsSet = new Set();
            variantsSet.add(kw);
            variantsSet.add(convertTraditionalToSimplified(kw));
            variantsSet.add(convertSimplifiedToTraditional(kw));
            const variants = Array.from(variantsSet).filter(v => v && v.trim());
            // 优先长词，降低嵌套概率
            variants.sort((a, b) => b.length - a.length);
            // 组合成交替匹配的正则表达式
            const pattern = variants.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
            const regex = new RegExp(pattern, 'gi');
            processedHTML = processedHTML.replace(regex, (match) => {
                return `<span class="ns-keyword-highlight" style="background-color: ${color}; color: #333; font-weight: inherit; display: inline; margin: 0; padding: 0; line-height: inherit; vertical-align: baseline;">${match}</span>`;
            });
        });

        titleEl.innerHTML = processedHTML;
    } catch (error) {
        console.warn('多颜色高亮关键词时出错:', error);
        titleEl.innerHTML = originalHTML;
    }
}

// 测试高亮匹配功能
function testHighlightMatching() {
    console.log('\n=== 高亮匹配功能测试 ===');

    // 创建测试元素
    const testEl = document.createElement('div');
    testEl.innerHTML = '<a>Test Content</a>';
    document.body.appendChild(testEl);

    const testCases = [
        { title: 'VPS rn服务器', keyword: 'rn', expected: 'rn' },
        { title: '测试 rn 内容', keyword: 'rn', expected: 'rn' },
        { title: 'VPS伺服器', keyword: '服务器', expected: '伺服器' },
        { title: 'TEST测試', keyword: '测试', expected: '測試' },
        { title: 'NodeSeek论坛', keyword: '论坛', expected: '论坛' },
        { title: 'rn rna RNA', keyword: 'rn', expected: 'rn' },
        { title: 'rm rn ra', keyword: 'rn', expected: 'rn' }
    ];

    console.log('测试用例：');
    testCases.forEach((testCase, index) => {
        console.log(`\n测试 ${index + 1}:`);
        console.log(`  标题: "${testCase.title}"`);
        console.log(`  关键词: "${testCase.keyword}"`);
        console.log(`  期望高亮: "${testCase.expected}"`);

        // 模拟高亮过程
        const titleEl = testEl.querySelector('a');
        titleEl.textContent = testCase.title;

        try {
            // 应用高亮
            highlightTitleKeywords(titleEl, testCase.title, [testCase.keyword]);

            // 检查结果
            const highlightedSpans = titleEl.querySelectorAll('.ns-keyword-highlight');
            console.log(`  实际高亮数量: ${highlightedSpans.length}`);

            highlightedSpans.forEach((span, i) => {
                const highlightedText = span.textContent;
                const normalizedHighlighted = normalizeText(highlightedText);
                const normalizedKeyword = normalizeText(testCase.keyword);
                const match = normalizedHighlighted === normalizedKeyword;

                console.log(`    高亮片段 ${i + 1}: "${highlightedText}" ${match ? '✓' : '✗'}`);
                if (!match) {
                    console.log(`      标准化: "${normalizedHighlighted}" vs "${normalizedKeyword}"`);
                }
            });

        } catch (error) {
            console.log(`  错误: ${error.message}`);
        }

        // 清理
        titleEl.innerHTML = testCase.title;
    });

    // 清理测试元素
    document.body.removeChild(testEl);

    console.log('\n=== 测试完成 ===');
    console.log('使用方法: NodeSeekFilter.testHighlightMatching()');
}

// 测试简繁转换字库扩展
function testTraditionalChineseConversion() {
    console.log('\n=== 繁体字库扩展测试 ===');

    const testPairs = [
        // 基础测试
        ['服务器', '伺服器'], ['测试', '測試'], ['网络', '網絡'], ['计算机', '計算機'],
        // 商业经济
        ['财务', '財務'], ['银行', '銀行'], ['购买', '購買'], ['销售', '銷售'], ['货币', '貨幣'],
        // 地理位置  
        ['县市', '縣市'], ['岛屿', '島嶼'], ['峡谷', '峽谷'], ['门户', '門戶'], ['间隔', '間隔'],
        // 日常生活
        ['问题', '問題'], ['闭门', '閉門'], ['开门', '開門'], ['闹钟', '鬧鐘'], ['阅读', '閱讀'],
        // 颜色相关
        ['红色', '紅色'], ['黄金', '黃金'], ['绿色', '綠色'], ['蓝天', '藍天'], ['银色', '銀色'],
        // 时间量词
        ['个人', '個人'], ['条件', '條件'], ['层次', '層次'], ['张纸', '張紙'], ['页面', '頁面'],
        // 动词形容词
        ['买卖', '買賣'], ['读写', '讀寫'], ['听说', '聽說'], ['长短', '長短'], ['新旧', '新舊'],
        // 家庭关系
        ['妈妈', '媽媽'], ['爷爷', '爺爺'], ['孙子', '孫子'], ['邻居', '鄰居'], ['亲戚', '親戚'],
        // 职业工作
        ['医生', '醫生'], ['护士', '護士'], ['厨师', '廚師'], ['警察', '警察'], ['军人', '軍人'],
        // 动物相关 ⭐重点测试
        ['鸡腿', '雞腿'], ['鸭肉', '鴨肉'], ['猪肉', '豬肉'], ['马车', '馬車'], ['猫咪', '貓咪'],
        ['鱼虾', '魚蝦'], ['鸟类', '鳥類'], ['龙虾', '龍蝦'], ['凤凰', '鳳凰'], ['蝴蝶', '蝴蝶'],
        // VPS/服务器相关 ⭐重点测试
        ['云服务器', '雲伺服器'], ['虚拟主机', '虛擬主機'], ['专用服务器', '專用伺服器'], ['共享主机', '共享主機'],
        ['独立服务器', '獨立伺服器'], ['远程连接', '遠程連接'], ['密钥认证', '鑰匙認證'], ['用户权限', '用戶權限'],
        ['系统配置', '系統配置'], ['网络设置', '網路設定'], ['资源占用', '資源佔用'], ['负载均衡', '負載均衡'],
        ['分布式', '分佈式'], ['集群管理', '集群管理'], ['自动化', '自動化'], ['脚本工具', '腳本工具'],
        ['应用程序', '應用程式'], ['进程管理', '進程管理'], ['线程控制', '線程控制'], ['内存使用', '記憶體使用'],
        ['CPU占用率', 'CPU佔用率'], ['磁盘空间', '磁碟空間'], ['网络带宽', '網路頻寬'], ['防火墙设置', '防火牆設定'],
        ['端口配置', '端口配置'], ['域名解析', '域名解析'], ['SSL证书', 'SSL證書'], ['备份恢复', '備份恢復'],
        ['日志记录', '日誌記錄'], ['监控告警', '監控告警'], ['性能优化', '效能優化'], ['安全防护', '安全防護']
        // 食物饮料
        ['米饭', '米飯'], ['面条', '麵條'], ['鸡汤', '雞湯'], ['咸菜', '鹹菜'], ['可乐', '可樂'],
        ['馒头', '饅頭'], ['饺子', '餃子'], ['馄饨', '餛飩'], ['烧烤', '燒烤'], ['炖肉', '燉肉'],
        // 身体部位
        ['头发', '頭髮'], ['脸部', '臉部'], ['脚趾', '腳趾'], ['脑袋', '腦袋'], ['眼泪', '眼淚'],
        ['肠胃', '腸胃'], ['皮肤', '皮膚'], ['颈部', '頸部'], ['肾脏', '腎臟'], ['胡须', '鬍鬚'],
        // 服装鞋帽
        ['衣装', '衣裝'], ['裤子', '褲子'], ['袜子', '襪子'], ['丝绸', '絲綢'], ['纽扣', '紐扣'],
        ['纤维', '纖維'], ['织物', '織物'], ['缝纫', '縫紉'], ['刺绣', '刺繡'], ['摆设', '擺設'],
        // 交通工具
        ['汽车', '汽車'], ['轿车', '轎車'], ['货车', '貨車'], ['铁路', '鐵路'], ['缆车', '纜車'],
        ['飞机', '飛機'], ['战斗', '戰鬥'], ['运输', '運輸'], ['摩托', '摩托'], ['挂车', '掛車'],
        // 建筑房屋
        ['楼层', '樓層'], ['墙壁', '牆壁'], ['客厅', '客廳'], ['厨房', '廚房'], ['卫生', '衛生'],
        ['阳台', '陽台'], ['花园', '花園'], ['桥梁', '橋樑'], ['广场', '廣場'], ['商铺', '商鋪'],
        // 自然环境
        ['树木', '樹木'], ['树叶', '樹葉'], ['云雾', '雲霧'], ['种子', '種子'], ['兰花', '蘭花'],
        ['莲花', '蓮花'], ['枣树', '棗樹'], ['果实', '果實'], ['茎叶', '莖葉'], ['根茎', '根莖'],
        // 天气气候
        ['阴天', '陰天'], ['风雨', '風雨'], ['云朵', '雲朵'], ['雾霾', '霧霾'], ['烟尘', '煙塵'],
        ['凉爽', '涼爽'], ['温暖', '溫暖'], ['干燥', '乾燥'], ['湿润', '濕潤'], ['波涛', '波濤']
    ];

    console.log(`测试 ${testPairs.length} 组简繁对照：\n`);

    let successCount = 0;
    let failedCases = [];

    testPairs.forEach(([simplified, expectedTraditional], index) => {
        const actualTraditional = convertSimplifiedToTraditional(simplified);
        const backToSimplified = convertTraditionalToSimplified(expectedTraditional);
        const success = actualTraditional === expectedTraditional && backToSimplified === simplified;

        if (success) {
            successCount++;
            console.log(`✓ ${index + 1}. "${simplified}" ⟺ "${expectedTraditional}"`);
        } else {
            failedCases.push({ index: index + 1, simplified, expectedTraditional, actualTraditional, backToSimplified });
            console.log(`✗ ${index + 1}. "${simplified}" → "${actualTraditional}" (期望: "${expectedTraditional}")`);
        }
    });

    console.log(`\n=== 测试统计 ===`);
    console.log(`总测试数: ${testPairs.length}`);
    console.log(`成功: ${successCount} (${(successCount / testPairs.length * 100).toFixed(1)}%)`);
    console.log(`失败: ${failedCases.length} (${(failedCases.length / testPairs.length * 100).toFixed(1)}%)`);

    if (failedCases.length > 0) {
        console.log(`\n=== 失败详情 ===`);
        failedCases.forEach(({ index, simplified, expectedTraditional, actualTraditional, backToSimplified }) => {
            console.log(`${index}. "${simplified}"`);
            console.log(`   期望繁体: "${expectedTraditional}"`);
            console.log(`   实际繁体: "${actualTraditional}"`);
            console.log(`   回转简体: "${backToSimplified}"`);

            // 分析字符级差异
            const missingChars = [];
            for (let i = 0; i < simplified.length; i++) {
                const simpleChar = simplified[i];
                const expectedTradChar = expectedTraditional[i];
                const actualTradChar = actualTraditional[i];

                if (expectedTradChar !== actualTradChar) {
                    if (!SIMPLIFIED_TO_TRADITIONAL[simpleChar]) {
                        missingChars.push(simpleChar);
                    }
                }
            }

            if (missingChars.length > 0) {
                console.log(`   缺失字典: [${missingChars.join(', ')}]`);
            }
        });
    }

    console.log(`\n字典统计:`);
    console.log(`- 字典条目总数: ${Object.keys(SIMPLIFIED_TO_TRADITIONAL).length}`);
    console.log(`- 基础常用字: ~200个`);
    console.log(`- 扩展汉字: ~400个`);
    console.log(`- 商业经济: ~70个`);
    console.log(`- 地理位置: ~50个`);
    console.log(`- 日常生活: ~60个`);
    console.log(`- 技术网络: ~150个`);
    console.log(`- VPS/服务器: ~120个 (☁️ 云→雲, 🔑 钥→鑰)`);
    console.log(`- 动物相关: ~50个 (🐔 鸡→雞)`);
    console.log(`- 食物饮料: ~50个`);
    console.log(`- 身体部位: ~30个`);
    console.log(`- 服装鞋帽: ~40个`);
    console.log(`- 交通工具: ~40个`);
    console.log(`- 建筑房屋: ~40个`);
    console.log(`- 自然环境: ~60个`);
    console.log(`- 天气气候: ~40个`);

    console.log('\n使用方法: NodeSeekFilter.testTraditionalChineseConversion()');
}

// ========== 帖子内容高亮功能 ==========

// 保存帖子高亮关键词列表到 localStorage
function saveHighlightPostKeywords(keywords) {
    localStorage.setItem('ns-filter-highlight-post-keywords', JSON.stringify(keywords));
}

// 从 localStorage 获取帖子高亮关键词列表
function getHighlightPostKeywords() {
    const saved = localStorage.getItem('ns-filter-highlight-post-keywords');
    return saved ? JSON.parse(saved) : [];
}

// 保存高亮模式
function saveHighlightMode(mode) {
    localStorage.setItem('ns-filter-highlight-mode', mode);
}

// 获取高亮模式 (all, username, content)
function getHighlightMode() {
    return localStorage.getItem('ns-filter-highlight-mode') || 'all';
}

// 保存标题高亮模式
function saveHighlightTitleMode(mode) {
    localStorage.setItem('ns-filter-highlight-title-mode', mode);
}

// 获取标题高亮模式 (all, title, author)
function getHighlightTitleMode() {
    return localStorage.getItem('ns-filter-highlight-title-mode') || 'all';
}

// 添加帖子高亮关键词
function addHighlightPostKeyword(keyword, color) {
    if (!keyword || !keyword.trim()) return false;

    const keywords = getHighlightPostKeywords();
    const normalizedKeyword = keyword.trim();

    // 检查长度限制
    if (normalizedKeyword.length > 12) {
        return 'too_long';
    }

    // 检查是否已存在
    const existsIndex = keywords.findIndex(item =>
        normalizeText(item.keyword) === normalizeText(normalizedKeyword)
    );

    if (existsIndex >= 0) {
        // 更新颜色
        keywords[existsIndex].color = color;
    } else {
        // 新增
        keywords.unshift({ keyword: normalizedKeyword, color: color });
    }

    saveHighlightPostKeywords(keywords);
    return true;
}

// 删除帖子高亮关键词
function removeHighlightPostKeyword(keyword) {
    const keywords = getHighlightPostKeywords();
    const filtered = keywords.filter(k => k.keyword !== keyword);
    saveHighlightPostKeywords(filtered);

    // 立即更新高亮和统计
    highlightPostContent();

    return filtered;
}

// 统计数据存储
let highlightStats = [];

// 清除帖子内容高亮
function clearHighlightPostContent() {
    highlightStats = []; // 清空统计数据
    const highlights = document.querySelectorAll('span.ns-post-highlight');
    highlights.forEach(span => {
        const parent = span.parentNode;
        if (parent) {
            const textNode = document.createTextNode(span.textContent);
            parent.replaceChild(textNode, span);
            parent.normalize(); // 合并相邻文本节点
        }
    });
}

// 应用帖子内容高亮
function highlightPostContent() {
    // 仅在包含 'post' 的网址（帖子详情页）生效
    if (!window.location.href.includes('post')) {
        return;
    }

    // 先清除旧的高亮，确保状态最新（特别是删除或修改颜色时）
    clearHighlightPostContent();

    const keywords = getHighlightPostKeywords();
    if (keywords.length === 0) {
        renderHighlightStatsToContainer(); // 即使没有关键词也要刷新统计显示（清空）
        return;
    }

    // 获取所有帖子内容容器
    const postContents = document.querySelectorAll('.post-content');
    const authorNames = document.querySelectorAll('.author-name');

    if (postContents.length === 0 && authorNames.length === 0) return;

    // 获取当前高亮模式
    const highlightMode = getHighlightMode();

    keywords.forEach(item => {
        const { keyword, color } = item;
        if (!keyword) return;

        // 创建正则，注意转义特殊字符
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedKeyword})`, 'gi');

        // 定义通用高亮函数
        const processHighlight = (elements, getFloorNum) => {
            elements.forEach(el => {
                let floorNum = getFloorNum(el);

                // 使用 TreeWalker 遍历文本节点
                const walker = document.createTreeWalker(
                    el,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode: function (node) {
                            if (!node.parentNode) return NodeFilter.FILTER_REJECT;
                            if (node.parentNode.classList && node.parentNode.classList.contains('ns-post-highlight')) {
                                return NodeFilter.FILTER_REJECT;
                            }
                            const parentTag = node.parentNode.tagName;
                            if (['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'BUTTON', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED'].includes(parentTag)) {
                                return NodeFilter.FILTER_REJECT;
                            }
                            if (node.parentNode.isContentEditable) {
                                return NodeFilter.FILTER_REJECT;
                            }
                            return NodeFilter.FILTER_ACCEPT;
                        }
                    },
                    false
                );

                const nodesToHighlight = [];
                while (walker.nextNode()) {
                    try { regex.lastIndex = 0; } catch (e) {}
                    if (regex.test(walker.currentNode.nodeValue)) {
                        nodesToHighlight.push(walker.currentNode);
                    }
                }

                nodesToHighlight.forEach(node => {
                    try {
                        const fragment = document.createDocumentFragment();
                        const parts = node.nodeValue.split(regex);

                        let hasMatch = false;
                        parts.forEach(part => {
                            if (part.toLowerCase() === keyword.toLowerCase()) {
                                hasMatch = true;
                                const span = document.createElement('span');
                                span.className = 'ns-post-highlight';
                                span.style.backgroundColor = color;
                                span.style.color = '#333';
                                span.style.borderRadius = '2px';
                                span.style.padding = '0';
                                span.style.margin = '0';
                                span.style.boxShadow = `0 0 0 1px ${color}`;
                                span.style.font = 'inherit';
                                span.style.verticalAlign = 'baseline';
                                span.textContent = part;
                                fragment.appendChild(span);
                            } else {
                                fragment.appendChild(document.createTextNode(part));
                            }
                        });

                        if (hasMatch && node.parentNode) {
                            node.parentNode.replaceChild(fragment, node);

                            // 记录统计
                            if (floorNum >= 0) {
                                const existing = highlightStats.find(s => s.floor === floorNum && s.keyword === keyword);
                                if (!existing) {
                                    highlightStats.push({ floor: floorNum, keyword: keyword });
                                }
                            }
                        }
                    } catch (e) {
                        console.error('高亮替换出错:', e);
                    }
                });
            });
        };

        // 根据模式处理不同的元素
        if (highlightMode === 'all' || highlightMode === 'content') {
            // 处理帖子内容
            processHighlight(postContents, (el) => {
                const metaInfo = el.previousElementSibling;
                if (metaInfo && metaInfo.classList.contains('nsk-content-meta-info')) {
                    const floorLink = metaInfo.querySelector('.floor-link');
                    if (floorLink) {
                        const floorText = floorLink.textContent.trim();
                        const num = parseInt(floorText.replace('#', ''), 10);
                        if (!isNaN(num)) return num;
                    }
                }
                return -1;
            });
        }

        if (highlightMode === 'all' || highlightMode === 'username') {
            // 处理用户名
            processHighlight(authorNames, (el) => {
                const metaInfo = el.closest('.nsk-content-meta-info');
                if (metaInfo) {
                    const floorLink = metaInfo.querySelector('.floor-link');
                    if (floorLink) {
                        const floorText = floorLink.textContent.trim();
                        const num = parseInt(floorText.replace('#', ''), 10);
                        if (!isNaN(num)) return num;
                    }
                }
                return -1;
            });
        }
    });

    // 渲染统计数据（如果容器存在）
    renderHighlightStatsToContainer();
}

// 获取统计数据
function getHighlightStats() {
    return highlightStats.sort((a, b) => a.floor - b.floor);
}

// 滚动到指定楼层
function scrollToFloor(targetFloor) {
    const floorLinks = document.querySelectorAll('.floor-link');
    let found = false;
    for (const link of floorLinks) {
        const text = link.textContent.trim();
        const floor = parseInt(text.replace('#', ''), 10);
        if (floor === targetFloor) {
            // 滚动到可视区域
            link.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // 添加临时高亮闪烁效果提示用户
            const computedStyle = window.getComputedStyle(link);
            const originalColor = computedStyle.color;
            const originalTransform = link.style.transform;
            const originalTransition = link.style.transition;
            const originalDisplay = link.style.display;

            // 确保 transform 生效 (inline 元素可能不支持 transform)
            if (computedStyle.display === 'inline') {
                link.style.display = 'inline-block';
            }

            link.style.transition = 'color 0.2s, transform 0.2s';

            let isHighlighted = true;
            // 初始高亮
            link.style.color = '#FF0000';
            link.style.transform = 'scale(1.2)';

            const intervalId = setInterval(() => {
                isHighlighted = !isHighlighted;
                if (isHighlighted) {
                    link.style.color = '#FF0000';
                    link.style.transform = 'scale(1.2)';
                } else {
                    link.style.color = originalColor;
                    link.style.transform = originalTransform || 'scale(1)';
                }
            }, 300); // 300ms 切换一次状态

            setTimeout(() => {
                clearInterval(intervalId);
                // 恢复原始状态 - 移除 inline style 让 CSS 规则生效
                link.style.removeProperty('color');
                link.style.removeProperty('transform');
                link.style.removeProperty('transition');
                if (originalDisplay) {
                    link.style.display = originalDisplay;
                } else {
                    link.style.removeProperty('display');
                }
            }, 4000);

            found = true;
            break;
        }
    }

    if (!found && window.addLog) {
        window.addLog(`未在当前页找到 #${targetFloor} 楼，可能在其他分页`);
    }
}

function scrollToHighlight(targetFloor, keyword) {
    // Initialize indices cache if not exists
    if (!scrollToHighlight.indices) {
        scrollToHighlight.indices = {};
    }

    const spans = document.querySelectorAll('span.ns-post-highlight');
    const matches = [];
    const normalize = typeof normalizeText === 'function' ? normalizeText : (x) => (x || '').toLowerCase();
    const normalizedKeyword = normalize(keyword);

    for (const span of spans) {
        if (normalize(span.textContent) !== normalizedKeyword) continue;
        let floor = -1;
        const contentEl = span.closest('.post-content');
        if (contentEl) {
            const metaInfo = contentEl.previousElementSibling;
            if (metaInfo && metaInfo.classList.contains('nsk-content-meta-info')) {
                const floorLink = metaInfo.querySelector('.floor-link');
                if (floorLink) {
                    const num = parseInt(floorLink.textContent.trim().replace('#', ''), 10);
                    if (!isNaN(num)) floor = num;
                }
            }
        } else {
            const authorEl = span.closest('.author-name');
            if (authorEl) {
                const metaInfo = authorEl.closest('.nsk-content-meta-info');
                if (metaInfo) {
                    const floorLink = metaInfo.querySelector('.floor-link');
                    if (floorLink) {
                        const num = parseInt(floorLink.textContent.trim().replace('#', ''), 10);
                        if (!isNaN(num)) floor = num;
                    }
                }
            }
        }
        if (floor === targetFloor) {
            matches.push(span);
        }
    }

    if (matches.length === 0) {
        if (window.addLog) window.addLog(`未定位到 #${targetFloor} 的“${keyword}”，可能不在当前分页`);
        return;
    }

    const key = `${targetFloor}_${keyword}`;
    let currentIndex = scrollToHighlight.indices[key];

    // Calculate next index
    if (typeof currentIndex !== 'number') {
        currentIndex = 0;
    } else {
        currentIndex = (currentIndex + 1) % matches.length;
    }

    // Update stored index
    scrollToHighlight.indices[key] = currentIndex;

    const target = matches[currentIndex];
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (matches.length > 1 && window.addLog) {
         window.addLog(`定位到 #${targetFloor} “${keyword}” (第 ${currentIndex + 1}/${matches.length} 处)`);
    }

    // 清除可能存在的旧动画状态（如果用户快速点击切换）
    if (target.dataset.animating === 'true') {
        const oldId = target.dataset.animTimer;
        if (oldId) clearInterval(parseInt(oldId));
        delete target.dataset.animating;
        delete target.dataset.animTimer;
        // 移除临时样式
        target.style.removeProperty('transform');
        target.style.removeProperty('transition');
        target.style.removeProperty('display');
        target.style.removeProperty('position');
        target.style.removeProperty('zIndex');
    }
}

// 渲染高亮统计到指定容器
function renderHighlightStatsToContainer() {
    const container = document.getElementById('ns-highlight-stats-container');
    if (!container) return;

    const stats = getHighlightStats();
    container.innerHTML = ''; // 清空容器

    if (stats.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:5px;font-size:12px;color:#999;">无高亮记录</div>';
        return;
    }

    const list = document.createElement('ul');
    list.style.cssText = 'list-style:none;padding:0;margin:0;max-height:200px;overflow-y:auto;';

    stats.forEach(item => {
        const li = document.createElement('li');
        li.style.cssText = 'padding:4px 0;border-bottom:1px dashed #eee;display:flex;justify-content:flex-start;align-items:flex-start;font-size:12px;';

        // 创建楼层链接（可点击跳转）
        const floorSpan = document.createElement('span');
        floorSpan.style.cssText = 'color:#2196F3;flex-shrink:0;margin-right:2px;cursor:pointer;text-decoration:underline;';
        floorSpan.textContent = `#${item.floor}`;
        floorSpan.title = '点击定位到该楼层的高亮词';
        floorSpan.onclick = function () {
            scrollToHighlight(item.floor, item.keyword);
        };

        const keywordSpan = document.createElement('span');
        keywordSpan.style.cssText = 'font-weight:bold;color:#2563eb;background:#eff6ff;padding:1px 4px;border-radius:4px;word-break:break-all;flex:1;white-space:normal;min-width:0;width:0;';
        keywordSpan.textContent = item.keyword;
        keywordSpan.style.cursor = 'pointer';
        keywordSpan.title = '点击定位到高亮词';
        keywordSpan.onclick = function () {
            scrollToHighlight(item.floor, item.keyword);
        };

        li.appendChild(floorSpan);
        li.appendChild(keywordSpan);

        list.appendChild(li);
    });

    container.appendChild(list);

    const countInfo = document.createElement('div');
    countInfo.style.cssText = 'margin-top:5px;text-align:right;color:#999;font-size:11px;border-top:1px solid #eee;padding-top:2px;';
    countInfo.textContent = `共 ${stats.length} 条`;
    container.appendChild(countInfo);
}

// 导出
window.NodeSeekFilter = {
    filterPosts,
    createFilterUI,
    initFilterObserver,
    clearFilter,
    clearFilterDisplay,
    cleanupDialogPosition,
    testConversion,
    normalizeText,
    debugPageStructure,

    // 帖子内容高亮
    addHighlightPostKeyword,
    removeHighlightPostKeyword,
    getHighlightPostKeywords,
    highlightPostContent,
    clearHighlightPostContent,

    testLocalStorage,
    testHighlightMatching, // 高亮匹配测试函数
    testTraditionalChineseConversion, // 繁体字库测试函数
    // 关键词管理功能
    addCustomKeyword,
    removeCustomKeyword,
    getCustomKeywords,
    saveCustomKeywords,
    // 高亮关键词功能
    addHighlightKeyword,
    removeHighlightKeyword,
    getHighlightKeywords,
    saveHighlightKeywords,
    applyKeywordHighlight,
    clearKeywordHighlight,
    // 作者高亮功能
    saveHighlightAuthorOption,
    getHighlightAuthorOption,
    // 高亮颜色功能
    saveHighlightColor,
    getHighlightColor,
    saveDisplayHighlightColor,
    getDisplayHighlightColor,
    // 位置管理功能
    saveDialogPosition,
    getDialogPosition,
    // 设备检测
    isMobileDevice,
    // 简繁转换功能
    convertSimplifiedToTraditional,
    convertTraditionalToSimplified,
    // 统计功能
    updateStatsUI,
    getHighlightStats,
    renderHighlightStatsToContainer,
    scrollToHighlight
};
