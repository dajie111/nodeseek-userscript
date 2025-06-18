// ========== 论坛热点统计 ==========

(function() {
    'use strict';

    // 热点统计模块
    const NodeSeekFocus = {
        // 调试模式控制
        isDebug: false,
        
        // 内部日志方法
        log(...args) {
            // 已禁用所有日志输出
        },
        // RSS数据缓存
        rssCache: null,
        rssCacheTime: 0,
        cacheExpireTime: 10 * 60 * 1000, // 10分钟缓存
        dataCleared: false, // 标记数据是否被手动清理

        // 历史数据存储
        historyData: null,
        historyStorageKey: 'nodeseek_rss_history',

        // 热词历史存储
        hotWordsHistory: null,
        hotWordsStorageKey: 'nodeseek_hot_words_history',

        // 发帖时间分布统计存储
        timeDistributionHistory: null,
        timeDistributionStorageKey: 'nodeseek_time_distribution_history',

        // 发帖用户统计存储
        userStatsHistory: null,
        userStatsStorageKey: 'nodeseek_user_stats_history',

        // 自动采集定时器
        autoCollectTimer: null,
        autoCollectInterval: 30 * 60 * 1000, // 30分钟

                // 采集时间记录
        lastCollectTime: 0,
        nextCollectTime: 0,
        
        // 数据保留期限
        dataRetentionDays: 7,
        
        // 多窗口协调相关
        globalStateKey: 'nodeseek_focus_global_state',
        windowId: null,
        isMainWindow: false,
        heartbeatInterval: null,
        heartbeatFrequency: 3000, // 3秒心跳

        // 常用停止词列表（中文）
        stopWords: new Set([
            '的', '话说这个有人收吗', '在', '可以不转发落地直', '帖在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '这IP', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '但是', '那', '只', '下', '把', '还', '多', '没', '为', '又', '可', '家', '学', '只是', '过', '时间', '很多', '来', '两', '用', '她', '国', '动', '进', '成', '回', '什', '边', '作', '对', '开', '而', '已', '些', '现', '山', '民', '候', '经', '发', '工', '向', '事', '命', '给', '长', '水', '几', '义', '三', '声', '于', '高', '手', '知', '理', '眼', '志', '点', '心', '战', '二', '问', '但', '体', '方', '实', '吃', '做', '叫', '当', '住', '听', '革', '打', '呢', '真', '全', '才', '四', '已经', '从', '达', '听到', '头', '风', '今', '如果', '总', '合', '技', '化', '报', '叫', '教', '记', '或', '特', '数', '各', '结', '此', '白', '深', '近', '论', '美', '计', '等', '集', '任', '认', '千', '万', '关', '信', '听', '决', '选', '约', '话', '意', '情', '究', '入', '整', '联', '才能', '导', '争', '运', '世', '被', '加', '脑', '保', '则', '哪', '觉', '元', '请', '切', '由', '钱', '那么', '定', '每', '希', '术', '领', '位', '所', '它', '此外', '将', '感', '期', '神', '导致', '除', '年', '最', '后', '能', '主', '立', '机', '分', '门', '如何', '因为', '可以', '这个', '那个', '他', '她', '它们', '他们', '我们', '时候', '地方', '可能', '应该', '能够', '以及', '因此', '所以', '然后', '不过', '如此', '其实', '当然', '确实', '虽然', '尽管', '无论', '不管', '只要', '即使', '哪怕', '既然', '由于', '除了', '根据', '按照', '为了', '通过', '利用', '关于', '针对', '依据', '基于'
        ]),

        // 数字和符号正则
        numberSymbolRegex: /^[\d\[\]()【】（）\-\+\*\/=<>≤≥！!？?。，、：；"'""''…\s]+$/,

                // 初始化模块
        init() {
            // console.log('热点统计模块初始化完成'); // 已删除此日志输出
            
            // 生成唯一窗口ID
            this.windowId = 'window_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            // console.log('窗口ID:', this.windowId); // 已删除此日志输出
            
            this.loadHistoryData();
            this.loadHotWordsHistory();
            this.loadTimeDistributionHistory();
            this.loadUserStatsHistory();
            this.initMultiWindowCoordination();
            this.cleanOldData();
            this.cleanOldHotWords();
            this.cleanOldTimeDistribution();
            this.cleanOldUserStats();
        },

        // 加载历史数据
        loadHistoryData() {
            try {
                const stored = localStorage.getItem(this.historyStorageKey);
                if (stored) {
                    this.historyData = JSON.parse(stored);
                    // console.log(`加载历史数据成功，共 ${this.historyData.length} 条记录`); // 已删除此日志输出
                } else {
                    this.historyData = [];
                    // console.log('初始化历史数据存储'); // 已删除此日志输出
                }
            } catch (error) {
                console.error('加载历史数据失败:', error);
                this.historyData = [];
            }
        },

        // 保存历史数据
        saveHistoryData() {
            try {
                localStorage.setItem(this.historyStorageKey, JSON.stringify(this.historyData));
                // console.log(`保存历史数据成功，共 ${this.historyData.length} 条记录`); // 已删除此日志输出
            } catch (error) {
                console.error('保存历史数据失败:', error);
            }
        },

        // 加载热词历史数据
        loadHotWordsHistory() {
            try {
                const stored = localStorage.getItem(this.hotWordsStorageKey);
                if (stored) {
                    this.hotWordsHistory = JSON.parse(stored);
                    // console.log(`加载热词历史成功，共 ${this.hotWordsHistory.length} 天记录`); // 已删除此日志输出
                } else {
                    this.hotWordsHistory = [];
                    // console.log('初始化热词历史存储'); // 已删除此日志输出
                }
            } catch (error) {
                console.error('加载热词历史失败:', error);
                this.hotWordsHistory = [];
            }
        },

        // 保存热词历史数据
        saveHotWordsHistory() {
            try {
                localStorage.setItem(this.hotWordsStorageKey, JSON.stringify(this.hotWordsHistory));
                // console.log(`保存热词历史成功，共 ${this.hotWordsHistory.length} 天记录`); // 已删除此日志输出
            } catch (error) {
                console.error('保存热词历史失败:', error);
            }
        },

        // 清理7天前的热词历史
        cleanOldHotWords() {
            if (!this.hotWordsHistory || this.hotWordsHistory.length === 0) return;

            const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const originalLength = this.hotWordsHistory.length;

            this.hotWordsHistory = this.hotWordsHistory.filter(record => record.date >= cutoffTime);

            if (this.hotWordsHistory.length !== originalLength) {
                this.saveHotWordsHistory();
                // console.log(`清理旧热词：删除 ${originalLength - this.hotWordsHistory.length} 条超过7天的记录`); // 已删除此日志输出
            }
        },

        // 计算两个文章列表之间的重复数量（基于发帖时间+发帖人+标题相似度）
        countDuplicateArticles(recordArticles, currentArticles) {
            let duplicateCount = 0;

            currentArticles.forEach(currentArticle => {
                const isDuplicate = recordArticles.some(recordArticle => {
                    return this.isArticleDuplicate(recordArticle, currentArticle);
                });

                if (isDuplicate) {
                    duplicateCount++;
                }
            });

            return duplicateCount;
        },

        // 判断两篇文章是否为重复（基于发帖时间+发帖人+标题相似度）
        isArticleDuplicate(article1, article2) {
            // 如果两篇文章都有发帖时间和发帖人，优先使用这个组合判断
            if (article1.pubDate && article2.pubDate && article1.author && article2.author) {
                // 时间相同（误差在5分钟内）且发帖人相同
                const timeDiff = Math.abs(article1.pubDate - article2.pubDate);
                const isSameTime = timeDiff < (5 * 60 * 1000); // 5分钟误差
                const isSameAuthor = this.normalizeAuthor(article1.author) === this.normalizeAuthor(article2.author);

                if (isSameTime && isSameAuthor) {
                    // 时间和作者都匹配，检查标题相似度
                    const titleSimilarity = this.calculateTitleSimilarity(article1.title, article2.title);
                    // 标题相似度大于60%就认为是同一篇文章（可能标题有小修改）
                    return titleSimilarity > 0.6;
                }
            }

            // 如果没有完整的时间和作者信息，使用GUID或链接判断
            if (article1.guid && article2.guid && article1.guid === article2.guid) {
                return true;
            }

            if (article1.link && article2.link && article1.link === article2.link) {
                return true;
            }

            // 最后使用标题完全匹配判断
            const title1 = this.normalizeTitle(article1.title);
            const title2 = this.normalizeTitle(article2.title);
            return title1 === title2;
        },

        // 标准化作者名称（去除空格、统一大小写）
        normalizeAuthor(author) {
            if (!author) return '';
            return author.trim().toLowerCase().replace(/\s+/g, ' ');
        },

        // 标准化标题（去除特殊字符、统一大小写）
        normalizeTitle(title) {
            if (!title) return '';
            return title.trim().toLowerCase()
                .replace(/[【】\[\]()（）]/g, '') // 去除括号
                .replace(/[^\u4e00-\u9fff\w\s]/g, ' ') // 去除特殊符号，保留中文、字母、数字
                .replace(/\s+/g, ' ') // 统一空格
                .trim();
        },

        // 计算两个标题的相似度（使用简单的词汇重叠度）
        calculateTitleSimilarity(title1, title2) {
            if (!title1 || !title2) return 0;

            const normalized1 = this.normalizeTitle(title1);
            const normalized2 = this.normalizeTitle(title2);

            // 如果标准化后完全相同，返回100%相似度
            if (normalized1 === normalized2) return 1.0;

            // 分词并计算词汇重叠度
            const words1 = this.segmentChinese(normalized1);
            const words2 = this.segmentChinese(normalized2);

            if (words1.length === 0 && words2.length === 0) return 1.0;
            if (words1.length === 0 || words2.length === 0) return 0;

            // 计算词汇交集
            const set1 = new Set(words1.map(w => w.toLowerCase()));
            const set2 = new Set(words2.map(w => w.toLowerCase()));
            const intersection = new Set([...set1].filter(x => set2.has(x)));

            // 使用Jaccard相似度: |交集| / |并集|
            const union = new Set([...set1, ...set2]);
            const similarity = intersection.size / union.size;

            return similarity;
        },

        // 清理7天前的旧数据
        cleanOldData() {
            if (!this.historyData || this.historyData.length === 0) return;

            const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const originalLength = this.historyData.length;

            this.historyData = this.historyData.filter(record => record.timestamp >= cutoffTime);

            if (this.historyData.length !== originalLength) {
                this.saveHistoryData();
                // console.log(`清理旧数据：删除 ${originalLength - this.historyData.length} 条超过7天的记录`); // 已删除此日志输出
            }
        },

        // 获取所有已保存的文章（用于去重）
        getAllSavedArticles() {
            const allArticles = [];

            if (this.historyData && this.historyData.length > 0) {
                this.historyData.forEach(record => {
                    if (record.articles && Array.isArray(record.articles)) {
                        // 新格式：包含完整文章信息
                        allArticles.push(...record.articles);
                    } else if (record.titles && Array.isArray(record.titles)) {
                        // 旧格式：只有标题，转换为文章对象
                        const articlesFromTitles = record.titles.map(title => ({
                            title: title,
                            pubDate: null,
                            author: '',
                            link: '',
                            guid: '',
                            timestamp: record.timestamp // 使用采集时间作为参考
                        }));
                        allArticles.push(...articlesFromTitles);
                    }
                });
            }

            return allArticles;
        },

        // 过滤出新文章（未保存过的文章）
        filterNewArticles(currentArticles) {
            const savedArticles = this.getAllSavedArticles();

            if (savedArticles.length === 0) {
                if (this.isDebug) console.log('本地无历史数据，所有文章都是新的');
                return currentArticles;
            }

            const newArticles = [];
            let duplicateCount = 0;

            currentArticles.forEach(currentArticle => {
                let isNew = true;

                // 检查是否与已保存的文章重复
                for (const savedArticle of savedArticles) {
                    if (this.isArticleDuplicate(currentArticle, savedArticle)) {
                        isNew = false;
                        duplicateCount++;
                        break;
                    }
                }

                if (isNew) {
                    newArticles.push(currentArticle);
                }
            });

            if (this.isDebug) console.log(`文章去重结果：总计 ${currentArticles.length} 篇，新文章 ${newArticles.length} 篇，重复 ${duplicateCount} 篇`);

                            // 输出新文章的标题（用于调试）
                if (newArticles.length > 0 && newArticles.length <= 10) {
                    this.log('新文章标题：');
                    newArticles.forEach((article, index) => {
                        this.log(`  ${index + 1}. ${article.title}`);
                    });
                } else if (newArticles.length > 10) {
                    this.log(`新文章标题（前10篇）：`);
                    newArticles.slice(0, 10).forEach((article, index) => {
                        this.log(`  ${index + 1}. ${article.title}`);
                    });
                    this.log(`  ... 还有 ${newArticles.length - 10} 篇新文章`);
                }

            return newArticles;
        },

        // 初始化多窗口协调
        initMultiWindowCoordination() {
            // 加载全局状态
            this.loadGlobalState();
            
            // 尝试成为主窗口
            this.tryBecomeMainWindow();
            
            // 监听storage变化（窗口间通信）
            window.addEventListener('storage', (e) => {
                if (e.key === this.globalStateKey) {
                    this.handleGlobalStateChange();
                }
            });
            
            // 监听页面卸载
            window.addEventListener('beforeunload', () => {
                this.onWindowUnload();
            });
            
            // console.log(`窗口 ${this.windowId} 初始化完成，主窗口状态: ${this.isMainWindow}`); // 已删除此日志输出
        },

        // 加载全局状态
        loadGlobalState(silent = false) {
            try {
                const stored = localStorage.getItem(this.globalStateKey);
                if (stored) {
                    const globalState = JSON.parse(stored);
                    
                    // 恢复采集时间信息
                    this.lastCollectTime = globalState.lastCollectTime || Date.now();
                    this.nextCollectTime = globalState.nextCollectTime || (Date.now() + this.autoCollectInterval);
                    
                    if (!silent) {
                        // console.log('加载全局状态成功'); // 已删除此日志输出
                        // console.log('上次采集时间:', new Date(this.lastCollectTime).toLocaleString()); // 已删除此日志输出
                        // console.log('下次采集时间:', new Date(this.nextCollectTime).toLocaleString()); // 已删除此日志输出
                    }
                } else {
                    // 初始化全局状态
                    this.lastCollectTime = Date.now();
                    this.nextCollectTime = Date.now() + this.autoCollectInterval;
                    this.saveGlobalState();
                    if (!silent) {
                        if (this.isDebug) console.log('初始化全局状态');
                    }
                }
            } catch (error) {
                if (!silent) {
                    console.error('加载全局状态失败:', error);
                }
                this.lastCollectTime = Date.now();
                this.nextCollectTime = Date.now() + this.autoCollectInterval;
            }
        },

        // 保存全局状态
        saveGlobalState() {
            try {
                const globalState = {
                    lastCollectTime: this.lastCollectTime,
                    nextCollectTime: this.nextCollectTime,
                    mainWindowId: this.isMainWindow ? this.windowId : null,
                    mainWindowHeartbeat: this.isMainWindow ? Date.now() : null,
                    version: Date.now()
                };
                localStorage.setItem(this.globalStateKey, JSON.stringify(globalState));
            } catch (error) {
                console.error('保存全局状态失败:', error);
            }
        },

        // 尝试成为主窗口
        tryBecomeMainWindow() {
            try {
                const stored = localStorage.getItem(this.globalStateKey);
                let shouldBecomeMain = false;
                
                if (!stored) {
                    // 没有全局状态，成为主窗口
                    shouldBecomeMain = true;
                } else {
                    const globalState = JSON.parse(stored);
                    const now = Date.now();
                    
                    // 检查主窗口心跳是否超时（10秒无心跳认为主窗口已关闭）
                    if (!globalState.mainWindowHeartbeat || 
                        (now - globalState.mainWindowHeartbeat) > 10000) {
                        shouldBecomeMain = true;
                        // console.log('检测到主窗口心跳超时，接管主窗口角色'); // 已删除此日志输出
                    }
                }
                
                if (shouldBecomeMain) {
                    this.becomeMainWindow();
                } else {
                    this.becomeSlaveWindow();
                }
            } catch (error) {
                console.error('尝试成为主窗口失败:', error);
                this.becomeMainWindow(); // 异常情况下成为主窗口
            }
        },

        // 成为主窗口
        becomeMainWindow() {
            this.isMainWindow = true;
            this.saveGlobalState();
            this.startAutoCollect();
            this.startHeartbeat();
            // console.log(`窗口 ${this.windowId} 成为主窗口`); // 已删除此日志输出
        },

        // 成为从窗口
        becomeSlaveWindow() {
            this.isMainWindow = false;
            this.stopAutoCollect();
            this.stopHeartbeat();
                            if (this.isDebug) console.log(`窗口 ${this.windowId} 成为从窗口`);
        },

        // 开始心跳
        startHeartbeat() {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
            
            this.heartbeatInterval = setInterval(() => {
                if (this.isMainWindow) {
                    this.saveGlobalState(); // 更新心跳时间
                }
            }, this.heartbeatFrequency);
        },

        // 停止心跳
        stopHeartbeat() {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
        },

        // 处理全局状态变化
        handleGlobalStateChange() {
            try {
                const stored = localStorage.getItem(this.globalStateKey);
                if (!stored) return;
                
                const globalState = JSON.parse(stored);
                
                // 更新采集时间
                if (globalState.lastCollectTime) {
                    this.lastCollectTime = globalState.lastCollectTime;
                }
                if (globalState.nextCollectTime) {
                    this.nextCollectTime = globalState.nextCollectTime;
                }
                
                // 检查主窗口变化
                const now = Date.now();
                const isMainWindowActive = globalState.mainWindowId && 
                    globalState.mainWindowHeartbeat && 
                    (now - globalState.mainWindowHeartbeat) < 10000;
                
                if (!isMainWindowActive && !this.isMainWindow) {
                    // 主窗口失效且当前不是主窗口，尝试接管
                    this.log('检测到主窗口失效，尝试接管');
                    this.tryBecomeMainWindow();
                } else if (isMainWindowActive && this.isMainWindow && 
                          globalState.mainWindowId !== this.windowId) {
                    // 有其他主窗口，退为从窗口
                    this.log('检测到其他主窗口，退为从窗口');
                    this.becomeSlaveWindow();
                }
            } catch (error) {
                console.error('处理全局状态变化失败:', error);
            }
        },

        // 窗口卸载处理
        onWindowUnload() {
            if (this.isMainWindow) {
                // 清除主窗口标记，让其他窗口接管
                try {
                    const stored = localStorage.getItem(this.globalStateKey);
                    if (stored) {
                        const globalState = JSON.parse(stored);
                        globalState.mainWindowId = null;
                        globalState.mainWindowHeartbeat = null;
                        localStorage.setItem(this.globalStateKey, JSON.stringify(globalState));
                    }
                } catch (error) {
                    console.error('窗口卸载处理失败:', error);
                }
            }
            this.stopHeartbeat();
        },

                // 开始自动采集
        startAutoCollect() {
            // 只有主窗口才能开始采集
            if (!this.isMainWindow) {
                                    if (this.isDebug) console.log('非主窗口，跳过自动采集启动');
                return;
            }

            // 清除可能存在的旧定时器
            if (this.autoCollectTimer) {
                clearInterval(this.autoCollectTimer);
            }

            // 计算首次采集的延迟时间
            const now = Date.now();
            let firstCollectDelay = 0;
            
            // 如果下次采集时间还没到，等待到指定时间
            if (this.nextCollectTime > now) {
                firstCollectDelay = this.nextCollectTime - now;
                // console.log(`距离下次采集还有 ${Math.round(firstCollectDelay / 1000)} 秒`); // 已删除此日志输出
            } else {
                // 下次采集时间已过，立即执行
                this.log('下次采集时间已过，立即执行采集');
            }

            // 设置首次采集
            setTimeout(() => {
                this.performAutoCollect(false);
                
                // 设置定期采集定时器
                this.autoCollectTimer = setInterval(() => {
                    this.performAutoCollect(false);
                }, this.autoCollectInterval);
            }, firstCollectDelay);

            // console.log(`主窗口开始自动采集RSS数据，间隔：3分钟`); // 已删除此日志输出
            

        },

        // 停止自动采集
        stopAutoCollect() {
            if (this.autoCollectTimer) {
                clearInterval(this.autoCollectTimer);
                this.autoCollectTimer = null;
                this.log('停止自动采集RSS数据');


            }
        },

                // 执行自动采集
        async performAutoCollect(isManualTrigger = false) {
            try {
                // 如果不是手动触发且不是主窗口，跳过采集
                if (!isManualTrigger && !this.isMainWindow) {
                    this.log('非主窗口，跳过自动采集');
                    return;
                }
                
                this.log(`${this.isMainWindow ? '主窗口' : ''}执行${isManualTrigger ? '手动' : '自动'}采集RSS数据...`);
                
                // 重置清理标记（无论手动还是自动采集）
                this.dataCleared = false;
                
                // 强制重新获取数据（绕过缓存）
                const currentTime = Date.now();
                this.rssCache = null; // 清除缓存
                
                // 更新采集时间记录
                this.lastCollectTime = currentTime;

                // 无论自动采集还是手动采集，都重置下次采集时间
                this.nextCollectTime = currentTime + this.autoCollectInterval;
                this.log(`${isManualTrigger ? '手动' : '自动'}采集：更新下次采集时间为`, new Date(this.nextCollectTime).toLocaleString());
                
                // 保存全局状态（同步到其他窗口）
                this.saveGlobalState();

                const articles = await this.fetchRSSData();

                // 过滤出新文章（未保存过的文章）
                const newArticles = this.filterNewArticles(articles);

                // 只有当有新文章时才保存
                if (newArticles.length > 0) {
                    // 保存到历史数据
                    const historyRecord = {
                        timestamp: currentTime,
                        articles: newArticles, // 只保存新文章
                        titles: newArticles.map(a => a.title), // 向后兼容，保留titles字段
                        count: newArticles.length,
                        source: isManualTrigger ? 'manual' : 'auto',
                        totalFetched: articles.length, // 记录本次总共抓取的文章数
                        duplicateCount: articles.length - newArticles.length // 记录重复文章数
                    };

                    this.historyData.push(historyRecord);
                    this.saveHistoryData();

                    this.log(`${isManualTrigger ? '手动' : '自动'}采集完成：抓取 ${articles.length} 篇，保存 ${newArticles.length} 篇新文章，跳过 ${articles.length - newArticles.length} 篇重复文章`);
                    this.log(`历史总计：${this.historyData.length} 次采集，${this.getAllSavedArticles().length} 篇文章`);
                } else {
                    this.log(`${isManualTrigger ? '手动' : '自动'}采集完成：抓取 ${articles.length} 篇文章，全部为重复内容，未保存新数据`);
                }

                // 清理旧数据
                this.cleanOldData();

                // 自动保存每日热词和统计（无论是否有新文章，都基于最新RSS数据进行统计）
                    this.saveDailyHotWords();
                this.saveDailyTimeDistribution();
                this.saveDailyUserStats();

                // 通知弹窗更新（无论是否重复，弹窗都需要显示最新RSS数据）
                this.notifyDialogUpdate();

                // 记录到日志（仅在控制台输出，不保存到操作日志）
                const newCount = newArticles ? newArticles.length : 0;
                const duplicateCount = articles.length - newCount;
                this.log(`[${new Date(currentTime).toLocaleString()}] 热点统计${isManualTrigger ? '手动' : '自动'}采集：抓取${articles.length}篇，新增${newCount}篇${duplicateCount > 0 ? `，重复${duplicateCount}篇` : ''}`);

            } catch (error) {
                console.error(`${isManualTrigger ? '手动' : '自动'}采集失败:`, error);

                // 错误才记录到操作日志
                if (window.addLog) {
                    window.addLog(`热点统计${isManualTrigger ? '手动' : '自动'}采集失败: ` + error.message);
                }
            }
        },

        // 获取历史数据统计信息
        getHistoryStats() {
            if (!this.historyData || this.historyData.length === 0) {
                return {
                    totalCollections: 0,
                    totalTitles: 0,
                    totalArticles: 0,
                    totalFetched: 0,
                    totalDuplicates: 0,
                    dateRange: null,
                    avgTitlesPerCollection: 0
                };
            }

            // 统计保存的新文章数量
            const totalTitles = this.historyData.reduce((sum, record) => sum + record.count, 0);
            const totalArticles = this.historyData.reduce((sum, record) => {
                return sum + (record.articles ? record.articles.length : record.count);
            }, 0);

            // 统计总抓取数量和重复数量
            const totalFetched = this.historyData.reduce((sum, record) => {
                return sum + (record.totalFetched || record.count);
            }, 0);
            const totalDuplicates = this.historyData.reduce((sum, record) => {
                return sum + (record.duplicateCount || 0);
            }, 0);

            const oldestTime = Math.min(...this.historyData.map(r => r.timestamp));
            const newestTime = Math.max(...this.historyData.map(r => r.timestamp));

            return {
                totalCollections: this.historyData.length,
                totalTitles: totalTitles, // 保存的新文章总数
                totalArticles: totalArticles, // 实际文章总数（与totalTitles相同）
                totalFetched: totalFetched, // 总抓取数量
                totalDuplicates: totalDuplicates, // 总重复数量
                dateRange: {
                    oldest: new Date(oldestTime),
                    newest: new Date(newestTime)
                },
                avgTitlesPerCollection: Math.round(totalTitles / this.historyData.length)
            };
        },

        // 抓取RSS数据（带重试机制）
        async fetchRSSData() {
            const now = Date.now();

            // 检查缓存
            if (this.rssCache && (now - this.rssCacheTime) < this.cacheExpireTime) {
                this.log('使用缓存的RSS数据');
                return this.rssCache;
            }

            // 新版：直接从服务器API拉取JSON
            const apiUrl = 'https://cka.396663.xyz/api/articles?days=7';
            try {
                this.log('开始从服务器API拉取热点数据...');
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`API HTTP错误! 状态码: ${response.status}`);
                }
                const articles = await response.json();
                this.log('API数据拉取成功，数量:', articles.length);
                // 缓存数据
                this.rssCache = articles;
                this.rssCacheTime = now;
                return articles;
            } catch (error) {
                console.error('API采集失败:', error);
                // 如果有缓存数据，即使过期也返回
                if (this.rssCache) {
                    this.log('使用过期的缓存数据作为备用');
                    return this.rssCache;
                }
                if (window.addLog) {
                    window.addLog(`热点统计API采集失败：${error.message}`);
                }
                throw error;
            }
        },

        // 中文分词（简单实现）
        segmentChinese(text) {
            const words = [];
            let currentWord = '';

            // 常见词汇后缀模式（不应该被拆分）
            const commonSuffixes = ['了', '过', '着', '的', '在', '上', '下', '中', '里', '外'];

            for (let i = 0; i < text.length; i++) {
                const char = text[i];

                // 中文字符范围
                if (/[\u4e00-\u9fff]/.test(char)) {
                    currentWord += char;

                    // 检查是否可以形成更长的有效词汇
                    let foundLongerWord = false;
                    for (let len = Math.min(8, text.length - i); len >= 2; len--) {
                        const candidate = text.substr(i, len);

                        // 检查是否是有效的完整词汇
                        if (this.isCompleteValidWord(candidate)) {
                            words.push(candidate);
                            i += len - 1;
                            currentWord = '';
                            foundLongerWord = true;
                            break;
                        }
                    }

                    if (!foundLongerWord && currentWord.length >= 1) {
                        // 检查当前字符是否为常见后缀
                        if (currentWord.length === 1) {
                            // 单个中文字符，但不是停止词的话可以作为词
                            if (!this.stopWords.has(currentWord)) {
                            words.push(currentWord);
                            }
                            currentWord = '';
                        }
                        // 如果是多字符但未找到更长词汇，继续累积
                    }
                } else {
                    // 非中文字符，结束当前词
                    if (currentWord && currentWord.length >= 2) {
                        // 添加累积的中文词汇
                        words.push(currentWord);
                    } else if (currentWord.length === 1 && !this.stopWords.has(currentWord)) {
                        // 单个中文字符，如果不是停止词则保留
                        words.push(currentWord);
                    }
                    currentWord = '';

                    // 处理英文单词和数字
                    if (/[a-zA-Z0-9]/.test(char)) {
                        let word = char;
                        while (i + 1 < text.length && /[a-zA-Z0-9]/.test(text[i + 1])) {
                            i++;
                            word += text[i];
                        }
                        if (word.length >= 1) {
                            words.push(word);
                        }
                    }
                }
            }

            // 添加剩余的词
            if (currentWord) {
                if (currentWord.length >= 2) {
                    words.push(currentWord);
                } else if (currentWord.length === 1 && !this.stopWords.has(currentWord)) {
                words.push(currentWord);
                }
            }

            return words;
        },

        // 判断是否为完整的有效词汇（用于分词时的词汇识别）
        isCompleteValidWord(word) {
            if (!word || word.length < 2) return false;

            // 检查是否是停止词
            if (this.stopWords.has(this.getWordKey(word))) return false;

            // 检查是否为纯数字或符号
            if (this.numberSymbolRegex.test(word)) return false;

            // 常见的有效词汇模式
            const validPatterns = [
                /^[\u4e00-\u9fff]{2,}$/, // 纯中文词汇（2个字符及以上）
                /^[a-zA-Z]{3,}$/, // 英文词汇
                /^[\u4e00-\u9fff]+[a-zA-Z0-9]+$/, // 中文+英文数字
                /^[a-zA-Z0-9]+[\u4e00-\u9fff]+$/, // 英文数字+中文
                /^\d{2,}$/ // 纯数字（年份等）
            ];

            const isValidPattern = validPatterns.some(pattern => pattern.test(word));

            // 额外检查：常见的动词+了、过、着等后缀组合
            if (!isValidPattern && word.length >= 3) {
                const base = word.slice(0, -1);
                const suffix = word.slice(-1);
                if (['了', '过', '着'].includes(suffix) && /^[\u4e00-\u9fff]{2,}$/.test(base)) {
                    // 如果基础词汇是2个字符以上的中文，且后缀是常见的，则认为是有效词汇
                    return true;
                }
            }

            return isValidPattern;
        },

        // 判断哪种大小写形式更优先
        isPreferredCase(newWord, existingWord) {
            // 优先级规则：
            // 1. 首字母大写的形式 (如 GitHub > github)
            // 2. 全大写的形式 (如 API > api)
            // 3. 有更多大写字母的形式
            // 4. 字母顺序较前的形式
            
            const newUpperCount = (newWord.match(/[A-Z]/g) || []).length;
            const existingUpperCount = (existingWord.match(/[A-Z]/g) || []).length;
            
            // 首字母大写优先
            const newFirstUpper = /^[A-Z]/.test(newWord);
            const existingFirstUpper = /^[A-Z]/.test(existingWord);
            
            if (newFirstUpper && !existingFirstUpper) return true;
            if (!newFirstUpper && existingFirstUpper) return false;
            
            // 大写字母多的优先
            if (newUpperCount > existingUpperCount) return true;
            if (newUpperCount < existingUpperCount) return false;
            
            // 字母顺序优先
            return newWord < existingWord;
        },

        // 标准化数字（将中文数字转换为阿拉伯数字）
        normalizeNumbers(word) {
            const chineseToArabic = {
                '一': '1', '二': '2', '三': '3', '四': '4', '五': '5',
                '六': '6', '七': '7', '八': '8', '九': '9', '十': '10',
                '零': '0', '○': '0'
            };
            
            let normalized = word;
            
            // 替换单个中文数字
            for (const [chinese, arabic] of Object.entries(chineseToArabic)) {
                normalized = normalized.replace(new RegExp(chinese, 'g'), arabic);
            }
            
            // 处理特殊组合（如：十一 -> 11, 二十 -> 20）
            normalized = normalized
                .replace(/10([1-9])/g, '1$1')  // 十一 -> 11
                .replace(/([2-9])10/g, '$10')  // 二十 -> 20
                .replace(/([2-9])10([1-9])/g, '$1$2'); // 二十一 -> 21
            
            return normalized;
        },

        // 获取词汇的标准化键值（用于统计）
        getWordKey(word) {
            // 先转小写，再标准化数字
            return this.normalizeNumbers(word.toLowerCase());
        },

        // 词频统计（基于本地保存的7天标题数据）
        analyzeWordFrequency(useLocalData = true) {
            const wordCount = new Map();
            let allTitles = [];

            this.log('开始分析词频...');

            if (useLocalData && this.historyData && this.historyData.length > 0) {
                // 使用本地保存的7天历史数据进行分析
                const seenArticles = new Map(); // 使用Map存储去重的文章，key为标准化的标识符

                this.historyData.forEach(record => {
                    // 支持新旧数据格式
                    const articles = record.articles || (record.titles ? record.titles.map(title => ({title: title})) : []);

                    articles.forEach(article => {
                        // 基于发帖时间+发帖人+标题创建唯一标识符
                        let articleKey = '';
                        if (article.pubDate && article.author) {
                            // 如果有发帖时间和作者，使用它们作为主要标识
                            const dateStr = new Date(article.pubDate).toDateString(); // 只取日期部分
                            const authorKey = this.normalizeAuthor(article.author);
                            const titleKey = this.normalizeTitle(article.title);
                            articleKey = `${dateStr}_${authorKey}_${titleKey}`;
                        } else {
                            // 降级方案：使用标准化标题作为标识
                            articleKey = this.normalizeTitle(article.title);
                        }

                        if (articleKey && articleKey.length > 2) {
                            if (!seenArticles.has(articleKey)) {
                                seenArticles.set(articleKey, article);
                                allTitles.push(article.title); // 保留原始标题用于分析
                            }
                        }
                    });
                });

                this.log(`📚 使用本地7天数据进行分析，基于发帖时间+作者+标题去重后共 ${allTitles.length} 条标题`);
                this.log(`原始历史记录：${this.historyData.length} 次采集，${this.historyData.reduce((sum, r) => sum + (r.articles ? r.articles.length : r.titles?.length || 0), 0)} 条原始标题`);

                // 调试信息：显示去重效果
                const totalOriginal = this.historyData.reduce((sum, r) => sum + (r.articles ? r.articles.length : r.titles?.length || 0), 0);
                const duplicatesRemoved = totalOriginal - allTitles.length;
                this.log(`📊 去重效果：原始 ${totalOriginal} 条 → 去重后 ${allTitles.length} 条（移除 ${duplicatesRemoved} 条重复）`);
            } else {
                this.log('⚠️ 没有本地历史数据，无法进行分析');
                return [];
            }

            // 如果没有任何数据，直接返回空数组
            if (allTitles.length === 0) {
                this.log('没有数据可供分析，返回空结果');
                return [];
            }

            // 用于记录每个词的原始大小写形式（完全匹配模式）
            const exactWordCount = new Map(); // key为小写形式，value为{word: 原始形式, count: 计数}

            // 用于调试：记录每个词汇的来源标题
            const wordSourceMap = new Map();

            allTitles.forEach(title => {
                // 预处理：移除特殊字符，但保留中文、英文、数字
                const cleanTitle = title.replace(/[^\u4e00-\u9fff\w\s]/g, ' ');

                // 分词
                const words = this.segmentChinese(cleanTitle);

                words.forEach(word => {
                    // 特别追踪"alist"和英文词汇的处理过程
                    const isTargetWord = word.toLowerCase().includes('alist');
                    const isEnglishWord = /^[a-zA-Z]+$/.test(word);
                    // 新增：追踪"放货"相关词汇
                    const isCargoWord = word.includes('放货');
                    // 新增：追踪"hgc"相关词汇
                    const isHgcWord = word.toLowerCase().includes('hgc');
                    // 新增：追踪"包push"相关词汇
                    const isPushWord = word.includes('包push') || word.includes('push');

                    if (isTargetWord || (isEnglishWord && word.length >= 4) || isCargoWord || isHgcWord || isPushWord) {
                        this.log(`🔍 追踪词汇 "${word}" (${isTargetWord ? 'alist目标' : isEnglishWord ? '英文词汇' : isCargoWord ? '放货相关' : isHgcWord ? 'hgc相关' : 'push相关'}):`);
                        this.log(`  - 来源标题: "${title}"`);
                        this.log(`  - 长度: ${word.length}`);
                        this.log(`  - 停止词检查: ${this.stopWords.has(word.toLowerCase())}`);
                        this.log(`  - 数字符号检查: ${this.numberSymbolRegex.test(word)}`);
                        this.log(`  - 有效性检查: ${this.isValidWord(word)}`);
                        this.log(`  - 完全匹配键值: "${word.toLowerCase()}"`);
                    }
                    
                    if (this.isValidWord(word)) {
                        // 使用完全匹配模式：只按小写进行分组，不进行其他标准化
                        const exactKey = word.toLowerCase();

                        if (!exactWordCount.has(exactKey)) {
                            exactWordCount.set(exactKey, {word: word, count: 0});
                            wordSourceMap.set(exactKey, []);
                        }

                        // 增加计数
                        exactWordCount.get(exactKey).count++;

                        // 记录来源
                        wordSourceMap.get(exactKey).push(title);

                        // 更新显示形式（优先保存更"标准"的形式）
                        const current = exactWordCount.get(exactKey);
                        if (this.isPreferredCase(word, current.word)) {
                            current.word = word;
                        }

                        if (isTargetWord || (isEnglishWord && word.length >= 4) || isCargoWord || isHgcWord || isPushWord) {
                            this.log(`  ✅ "${word}" 被统计，当前计数: ${current.count}`);
                            this.log(`  - 完全匹配键值: "${exactKey}"`);
                            this.log(`  - 累计来源: ${wordSourceMap.get(exactKey).length} 个标题`);
                        }
                    } else if (isTargetWord || (isEnglishWord && word.length >= 4) || isCargoWord || isHgcWord || isPushWord) {
                        this.log(`  ❌ "${word}" 被过滤掉`);
                    }
                });
            });

            // 转换为数组并排序
            const sortedWords = Array.from(exactWordCount.entries())
                .map(([exactKey, data]) => [data.word, data.count])
                .sort((a, b) => b[1] - a[1])
                .slice(0, 50); // 取前50个

            this.log(`词频分析完成，共找到 ${exactWordCount.size} 个不同词汇（完全匹配模式）`);
            
            // 调试：输出高频词汇的详细信息
            if (sortedWords.length > 0) {
                this.log('=== 热词统计调试信息（完全匹配模式）===');
                sortedWords.slice(0, 10).forEach(([word, count], index) => {
                    const exactKey = word.toLowerCase();
                    this.log(`#${index + 1}: "${word}" (完全匹配键值: "${exactKey}") = ${count}次`);

                    // 特别显示hgc、alist、放货等关键词的来源
                    if (word.toLowerCase().includes('hgc') || word.toLowerCase().includes('alist') || word.includes('放货') || word.includes('包push') || word.includes('push')) {
                        const sources = wordSourceMap.get(exactKey) || [];
                        this.log(`  🎯 关键词 "${word}" 的所有来源标题:`);
                        sources.forEach((source, idx) => {
                            this.log(`    ${idx + 1}. "${source}"`);
                        });
                        this.log(`  📊 总计: ${sources.length} 个来源标题，完全匹配统计为 ${count} 次`);
                    }
                });
                this.log('========================');
                
                // 特别检查alist是否在结果中
                const alistResult = sortedWords.find(([word, count]) => 
                    word.toLowerCase().includes('alist'));
                if (alistResult) {
                    this.log(`🎯 找到alist相关词汇: "${alistResult[0]}" = ${alistResult[1]}次`);
                } else {
                    this.log(`⚠️ 未在最终结果中找到alist相关词汇`);
                    // 检查是否在wordCount中但被过滤了
                    const allWords = Array.from(exactWordCount.entries());
                    const alistInCount = allWords.find(([key, data]) =>
                        key.includes('alist') || data.word.toLowerCase().includes('alist'));
                    if (alistInCount) {
                        this.log(`  但在统计中找到: "${alistInCount[1].word}" = ${alistInCount[1].count}次`);
                        if (alistInCount[1].count < 2) {
                            this.log(`  ↳ 因为出现次数 < 2 被过滤`);
                        }
                    } else {
                        this.log(`  在统计中也未找到alist相关词汇`);
                    }
                }

                // 特别检查hgc是否在结果中
                const hgcResult = sortedWords.find(([word, count]) =>
                    word.toLowerCase().includes('hgc'));
                if (hgcResult) {
                    this.log(`🎯 找到hgc相关词汇: "${hgcResult[0]}" = ${hgcResult[1]}次`);
                    const exactKey = hgcResult[0].toLowerCase();
                    const sources = wordSourceMap.get(exactKey) || [];
                    this.log(`  📝 hgc的所有来源标题:`);
                    sources.forEach((source, idx) => {
                        this.log(`    ${idx + 1}. "${source}"`);
                    });
                } else {
                    this.log(`⚠️ 未在最终结果中找到hgc相关词汇`);
                    // 检查是否在wordCount中但被过滤了
                    const allWords = Array.from(exactWordCount.entries());
                    const hgcInCount = allWords.find(([key, data]) =>
                        key.includes('hgc') || data.word.toLowerCase().includes('hgc'));
                    if (hgcInCount) {
                        this.log(`  但在统计中找到: "${hgcInCount[1].word}" = ${hgcInCount[1].count}次`);
                        const exactKey = hgcInCount[0];
                        const sources = wordSourceMap.get(exactKey) || [];
                        this.log(`  📝 hgc在统计中的所有来源标题:`);
                        sources.forEach((source, idx) => {
                            this.log(`    ${idx + 1}. "${source}"`);
                        });
                        if (hgcInCount[1].count < 2) {
                            this.log(`  ↳ 因为出现次数 < 2 被过滤`);
                        }
                    } else {
                        this.log(`  在统计中也未找到hgc相关词汇`);
                    }
                }

                // 特别检查push相关词汇是否在结果中
                const pushResult = sortedWords.find(([word, count]) =>
                    word.includes('包push') || word.includes('push'));
                if (pushResult) {
                    this.log(`🎯 找到push相关词汇: "${pushResult[0]}" = ${pushResult[1]}次`);
                    const exactKey = pushResult[0].toLowerCase();
                    const sources = wordSourceMap.get(exactKey) || [];
                    this.log(`  📝 push相关词汇的所有来源标题:`);
                    sources.forEach((source, idx) => {
                        this.log(`    ${idx + 1}. "${source}"`);
                    });
                } else {
                    this.log(`⚠️ 未在最终结果中找到push相关词汇`);
                    // 检查是否在wordCount中但被过滤了
                    const allWords = Array.from(exactWordCount.entries());
                    const pushInCount = allWords.find(([key, data]) =>
                        key.includes('push') || data.word.includes('push'));
                    if (pushInCount) {
                        this.log(`  但在统计中找到: "${pushInCount[1].word}" = ${pushInCount[1].count}次`);
                        const exactKey = pushInCount[0];
                        const sources = wordSourceMap.get(exactKey) || [];
                        this.log(`  📝 push在统计中的所有来源标题:`);
                        sources.forEach((source, idx) => {
                            this.log(`    ${idx + 1}. "${source}"`);
                        });
                        if (pushInCount[1].count < 2) {
                            this.log(`  ↳ 因为出现次数 < 2 被过滤`);
                        }
                    } else {
                        this.log(`  在统计中也未找到push相关词汇`);
                    }
                }
            }

            return sortedWords;
        },

        // 分析指定日期的词频统计
        analyzeWordFrequencyByDate(targetDateStr) {
            const wordCount = new Map();
            let allTitles = [];

            this.log(`开始分析 ${targetDateStr} 的词频...`);

            if (!this.historyData || this.historyData.length === 0) {
                this.log('没有历史数据可供分析');
                return [];
            }

            // 转换目标日期为Date对象，用于比较
            const targetDate = new Date(targetDateStr);
            const targetDateStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
            const targetDateEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

            // 使用本地保存的历史数据进行分析，但只分析指定日期的文章
            const seenArticles = new Map(); // 使用Map存储去重的文章，key为标准化的标识符

            this.historyData.forEach(record => {
                // 支持新旧数据格式
                const articles = record.articles || (record.titles ? record.titles.map(title => ({title: title})) : []);

                articles.forEach(article => {
                    // 检查文章的发帖日期是否匹配目标日期
                    let isTargetDate = false;
                    if (article.pubDate) {
                        const articleDate = new Date(article.pubDate);
                        isTargetDate = articleDate >= targetDateStart && articleDate < targetDateEnd;
                    } else {
                        // 如果没有发帖时间，跳过此文章
                        return;
                    }

                    if (!isTargetDate) {
                        return; // 不是目标日期的文章，跳过
                    }

                    // 基于发帖时间+发帖人+标题创建唯一标识符
                    let articleKey = '';
                    if (article.pubDate && article.author) {
                        // 如果有发帖时间和作者，使用它们作为主要标识
                        const dateStr = new Date(article.pubDate).toDateString(); // 只取日期部分
                        const authorKey = this.normalizeAuthor(article.author);
                        const titleKey = this.normalizeTitle(article.title);
                        articleKey = `${dateStr}_${authorKey}_${titleKey}`;
                    } else {
                        // 降级方案：使用标准化标题作为标识
                        articleKey = this.normalizeTitle(article.title);
                    }

                    if (articleKey && articleKey.length > 2) {
                        if (!seenArticles.has(articleKey)) {
                            seenArticles.set(articleKey, article);
                            allTitles.push(article.title); // 保留原始标题用于分析
                        }
                    }
                });
            });

            this.log(`📚 ${targetDateStr} 数据分析，基于发帖时间+作者+标题去重后共 ${allTitles.length} 条标题`);

            // 如果没有任何数据，直接返回空数组
            if (allTitles.length === 0) {
                this.log(`${targetDateStr} 没有数据可供分析，返回空结果`);
                return [];
            }

            // 用于记录每个词的原始大小写形式（完全匹配模式）
            const exactWordCount = new Map(); // key为小写形式，value为{word: 原始形式, count: 计数}

            allTitles.forEach(title => {
                // 预处理：移除特殊字符，但保留中文、英文、数字
                const cleanTitle = title.replace(/[^\u4e00-\u9fff\w\s]/g, ' ');

                // 分词
                const words = this.segmentChinese(cleanTitle);

                words.forEach(word => {
                    if (this.isValidWord(word)) {
                        // 使用完全匹配模式：只按小写进行分组，不进行其他标准化
                        const exactKey = word.toLowerCase();

                        if (!exactWordCount.has(exactKey)) {
                            exactWordCount.set(exactKey, {word: word, count: 0});
                        }

                        // 增加计数
                        exactWordCount.get(exactKey).count++;

                        // 更新显示形式（优先保存更"标准"的形式）
                        const current = exactWordCount.get(exactKey);
                        if (this.isPreferredCase(word, current.word)) {
                            current.word = word;
                        }
                    }
                });
            });

            // 转换为数组并排序
            const sortedWords = Array.from(exactWordCount.entries())
                .map(([exactKey, data]) => [data.word, data.count])
                .sort((a, b) => b[1] - a[1])
                .slice(0, 50); // 取前50个

            this.log(`${targetDateStr} 词频分析完成，共找到 ${exactWordCount.size} 个不同词汇（完全匹配模式）`);

            return sortedWords;
        },

        // 保存每日热词
        saveDailyHotWords() {
            // 获取最近7天的日期列表
            const recentDates = this.getRecentDates(7);
            let hasUpdatedData = false;

            // 为每个日期分别保存热词数据
            recentDates.forEach(dateInfo => {
                const dateStr = dateInfo.dateStr;
                
                // 分析该日期的热词（≥2次的才记录）
                const wordFrequency = this.analyzeWordFrequencyByDate(dateStr);
                const filteredWords = wordFrequency.filter(([word, count]) => count >= 2);

                // 检查该日期是否已有记录
                const existingIndex = this.hotWordsHistory.findIndex(record => record.dateStr === dateStr);

                if (filteredWords.length > 0) {
                    if (existingIndex >= 0) {
                        // 更新该日期记录
                        this.hotWordsHistory[existingIndex] = {
                            date: dateInfo.date.getTime(),
                            dateStr: dateStr,
                            words: filteredWords,
                            totalTitles: filteredWords.reduce((sum, [word, count]) => sum + count, 0)
                        };
                        this.log(`更新 ${dateStr} 热词记录，共 ${filteredWords.length} 个热词`);
                        hasUpdatedData = true;
                    } else {
                        // 新增该日期记录
                        this.hotWordsHistory.push({
                            date: dateInfo.date.getTime(),
                            dateStr: dateStr,
                            words: filteredWords,
                            totalTitles: filteredWords.reduce((sum, [word, count]) => sum + count, 0)
                        });
                        this.log(`新增 ${dateStr} 热词记录，共 ${filteredWords.length} 个热词`);
                        hasUpdatedData = true;
                    }
                } else {
                    // 如果该日期没有热词，删除可能存在的记录
                    if (existingIndex >= 0) {
                        this.hotWordsHistory.splice(existingIndex, 1);
                        this.log(`删除 ${dateStr} 的空热词记录`);
                        hasUpdatedData = true;
                    }
                }
            });

            if (hasUpdatedData) {
                // 按日期降序排序（最新的在前面）
                this.hotWordsHistory.sort((a, b) => b.date - a.date);

                // 保存到本地存储
                this.saveHotWordsHistory();
            }

            // 同时保存时间分布和用户统计
            this.saveDailyTimeDistribution();
            this.saveDailyUserStats();
        },

        // 获取指定日期的热词统计
        getHotWordsByDate(dateStr) {
            // 优先从原始数据直接计算，确保数据准确性
            return this.analyzeWordFrequencyByDate(dateStr).filter(([word, count]) => count >= 2);
        },

        // 获取指定天数的热词统计
        getHotWordsByDays(days = 7) {
            if (!this.hotWordsHistory || this.hotWordsHistory.length === 0) {
                return [];
            }

            const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
            const recentRecords = this.hotWordsHistory.filter(record => record.date >= cutoffTime);

            // 合并所有词汇（使用标准化键值）
            const allWords = new Map();
            const originalFormMap = new Map();
            
            recentRecords.forEach(record => {
                record.words.forEach(([word, count]) => {
                    const wordKey = this.getWordKey(word);
                    const currentCount = allWords.get(wordKey) || 0;
                    allWords.set(wordKey, currentCount + count);
                    
                    // 记录更优的显示形式
                    if (!originalFormMap.has(wordKey) || this.isPreferredCase(word, originalFormMap.get(wordKey))) {
                        originalFormMap.set(wordKey, word);
                    }
                });
            });

            // 转换为数组并排序，只保留大于2次的，恢复原始形式
            const sortedWords = Array.from(allWords.entries())
                .map(([wordKey, count]) => [originalFormMap.get(wordKey), count])
                .filter(([word, count]) => count >= 2)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 50);

            return sortedWords;
        },

        // 通知弹窗更新（自动采集完成后调用）
        notifyDialogUpdate() {
            // 检查热点统计弹窗是否打开
            const hotTopicsDialog = document.getElementById('hot-topics-dialog');
            if (hotTopicsDialog) {
                this.log('检测到热点统计弹窗打开，自动更新内容');
                this.refreshHotTopicsDialog();
            }

            // 检查历史热词弹窗是否打开
            const historyDialog = document.getElementById('hot-words-history-dialog');
            if (historyDialog) {
                this.log('检测到历史热词弹窗打开，自动更新内容');
                this.refreshHistoryDialog();
            }
        },

        // 刷新热点统计弹窗内容
        async refreshHotTopicsDialog() {
            const dialog = document.getElementById('hot-topics-dialog');
            if (!dialog) return;

            try {
                this.log('刷新热点统计弹窗，使用本地7天数据分析');

                // 分析词频（基于本地7天数据）
                let wordFrequency = this.analyzeWordFrequency(true);
                this.log('refreshHotTopicsDialog - 分析结果（过滤前）:', wordFrequency.length, '个词汇');
                // 过滤出现次数≥2的热词
                wordFrequency = wordFrequency.filter(([word, count]) => count >= 2);
                this.log('refreshHotTopicsDialog - 过滤后（≥2次）:', wordFrequency.length, '个热词');

                // 找到需要更新的元素
                const titleElement = dialog.querySelector('div[style*="font-weight: bold"][style*="color: #FF5722"]');
                const listContainer = dialog.querySelector('div[style*="max-height: 50vh"][style*="overflow-y: auto"]');
                // 查找包含"暂无热点数据"文本的空状态div
                const emptyDiv = Array.from(dialog.querySelectorAll('div')).find(div => 
                    div.innerHTML.includes('📊 暂无热点数据'));

                // 更新标题
                if (titleElement) {
                    const historyStats = this.getHistoryStats();
                    titleElement.textContent = `NodeSeek热点统计 (7天${historyStats.totalTitles}篇新增)`;
                }

                // 更新词频列表
                if (wordFrequency.length > 0) {
                    this.log('发现热词数据，数量:', wordFrequency.length);
                    // 如果有空状态div，移除它
                    if (emptyDiv) {
                        this.log('找到空状态div，正在移除...');
                        emptyDiv.remove();
                    } else {
                        this.log('未找到空状态div');
                    }

                    // 创建新的列表容器或更新现有的
                    let newListContainer;
                    if (!listContainer) {
                        newListContainer = document.createElement('div');
                        newListContainer.style.cssText = `
                            max-height: 50vh;
                            overflow-y: auto;
                            border: 1px solid #eee;
                            border-radius: 5px;
                        `;
                        // 插入到按钮组前面
                        const buttonGroup = dialog.querySelector('div[style*="margin-top: 15px"][style*="display: flex"]');
                        if (buttonGroup) {
                            dialog.insertBefore(newListContainer, buttonGroup);
                        }
                    } else {
                        newListContainer = listContainer;
                        newListContainer.innerHTML = ''; // 清空现有内容
                    }

                    // 重新生成词频列表
                    wordFrequency.forEach((item, index) => {
                        const [word, count] = item;
                        const itemDiv = document.createElement('div');
                        itemDiv.style.cssText = `
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 8px 12px;
                            border-bottom: 1px solid #f0f0f0;
                            background: ${index < 3 ? '#fff3e0' : '#fff'};
                        `;

                        // 排名标记
                        let rankMark = '';
                        if (index === 0) rankMark = '🥇';
                        else if (index === 1) rankMark = '🥈';
                        else if (index === 2) rankMark = '🥉';
                        else rankMark = `#${index + 1}`;

                        // 热度条
                        const maxCount = wordFrequency[0][1];
                        const percentage = (count / maxCount) * 100;

                        itemDiv.innerHTML = `
                            <div style="display: flex; align-items: center; flex: 1;">
                                <span style="margin-right: 8px; font-size: 14px; min-width: 30px;">${rankMark}</span>
                                <span style="font-weight: ${index < 5 ? 'bold' : 'normal'}; color: ${index < 3 ? '#FF5722' : '#333'};">${word}</span>
                            </div>
                            <div style="display: flex; align-items: center;">
                                <div style="width: 60px; height: 8px; background: #f0f0f0; border-radius: 4px; margin-right: 8px; overflow: hidden;">
                                    <div style="width: ${percentage}%; height: 100%; background: ${index < 3 ? '#FF5722' : '#2196F3'}; border-radius: 4px;"></div>
                                </div>
                                <span style="font-size: 12px; color: #666; min-width: 25px; text-align: right;">${count}</span>
                            </div>
                        `;

                        newListContainer.appendChild(itemDiv);
                    });
                } else {
                    // 没有热词，显示空状态
                    if (listContainer) {
                        listContainer.remove();
                    }

                    if (!emptyDiv) {
                        const newEmptyDiv = document.createElement('div');
                        newEmptyDiv.style.cssText = `
                            text-align: center;
                            color: #888;
                            margin: 20px 0;
                            padding: 40px 20px;
                            background: #f9f9f9;
                            border: 1px solid #eee;
                            border-radius: 5px;
                        `;
                        newEmptyDiv.innerHTML = `
                            <div style="font-size: 14px; margin-bottom: 8px;">📊 暂无热点数据</div>
                            <div style="font-size: 12px; color: #999;">
                                ${this.getHistoryStats().totalTitles > 0 ?
                                    '当前7天数据中无出现≥2次的热词' :
                                    '点击"立即采集"开始收集RSS数据'}
                            </div>
                        `;
                        
                        // 插入到按钮组前面
                        const buttonGroup = dialog.querySelector('div[style*="margin-top: 15px"][style*="display: flex"]');
                        if (buttonGroup) {
                            dialog.insertBefore(newEmptyDiv, buttonGroup);
                        }
                    }
                }

                this.log('热点统计弹窗内容已自动更新');

            } catch (error) {
                console.error('刷新热点统计弹窗失败:', error);
            }
        },

        // 刷新历史热词弹窗内容
        refreshHistoryDialog() {
            const dialog = document.getElementById('hot-words-history-dialog');
            if (!dialog) return;

            // 触发当前选中天数的更新
            const activeButton = dialog.querySelector('button[style*="background: #6f42c1"]');
            if (activeButton) {
                activeButton.click();
                this.log('历史热词弹窗内容已自动更新');
            }
        },

        // 显示热点统计弹窗
        async showHotTopicsDialog() {
            // 检查弹窗是否已存在
            const existingDialog = document.getElementById('hot-topics-dialog');
            if (existingDialog) {
                existingDialog.remove();
                return;
            }

            // 创建加载提示
            const loadingDialog = this.createLoadingDialog();
            document.body.appendChild(loadingDialog);

            try {
                let wordFrequency = [];
                
                // 检查是否已手动清理数据
                if (this.dataCleared) {
                    this.log('数据已被手动清理，显示空状态');
                    wordFrequency = [];
                } else {
                    // 直接基于本地数据分析，不重新采集（避免重置采集时间）
                    this.log('🔄 基于本地7天数据分析热词...');

                    // 分析词频（基于本地7天数据）
                    wordFrequency = this.analyzeWordFrequency(true);
                    this.log('showHotTopicsDialog - 分析结果（过滤前）:', wordFrequency.length, '个词汇');
                    // 过滤出现次数≥2的热词
                    wordFrequency = wordFrequency.filter(([word, count]) => count >= 2);
                    this.log('showHotTopicsDialog - 过滤后（≥2次）:', wordFrequency.length, '个热词');
                }

                // 移除加载提示
                loadingDialog.remove();

                // 显示结果弹窗（传递RSS数据统计）
                this.createResultDialog(wordFrequency);

            } catch (error) {
                loadingDialog.remove();

                // 显示错误信息
                this.createErrorDialog(error.message);

                // 记录到日志
                if (window.addLog) {
                    window.addLog('热点统计失败: ' + error.message);
                }
            }
        },

        // 创建加载对话框
        createLoadingDialog() {
            const dialog = document.createElement('div');
            dialog.id = 'hot-topics-loading';
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10000;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                padding: 30px;
                text-align: center;
                min-width: 200px;
            `;

            dialog.innerHTML = `
                <div style="font-size: 16px; margin-bottom: 15px;">正在分析热点数据...</div>
                <div style="font-size: 12px; color: #666;">基于本地7天RSS标题数据</div>
            `;

            return dialog;
        },

        // 创建错误对话框
        createErrorDialog(errorMessage) {
            const dialog = document.createElement('div');
            dialog.id = 'hot-topics-error';
            dialog.style.cssText = `
                position: fixed;
                top: 60px;
                right: 16px;
                z-index: 10000;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                padding: 20px;
                max-width: 400px;
            `;

            dialog.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <div style="font-weight: bold; font-size: 16px; color: #f44336;">热点统计失败</div>
                    <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; font-size: 20px; color: #999;">&times;</span>
                </div>
                <div style="color: #666; font-size: 14px;">${errorMessage}</div>
                <div style="margin-top: 10px;">
                    <button onclick="this.parentElement.parentElement.remove()" style="padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer;">关闭</button>
                </div>
            `;

            document.body.appendChild(dialog);

            // 5秒后自动关闭
            setTimeout(() => {
                if (dialog.parentElement) {
                    dialog.remove();
                }
            }, 5000);
        },

        // 创建结果对话框
        createResultDialog(wordFrequency) {
            const dialog = document.createElement('div');
            dialog.id = 'hot-topics-dialog';
            dialog.style.cssText = `
                position: fixed;
                top: 60px;
                right: 16px;
                z-index: 10000;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                padding: 18px 20px 12px 20px;
                max-height: 80vh;
                overflow-y: auto;
                user-select: text;
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
            `;

            // 移动端适配
            if (window.innerWidth <= 767) {
                dialog.style.cssText += `
                    position: fixed !important;
                    width: 96% !important;
                    left: 2% !important;
                    right: 2% !important;
                    top: 10px !important;
                    max-height: 88vh !important;
                `;
            } else {
                dialog.style.width = '500px';
            }

            // 标题和关闭按钮
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                margin-bottom: 15px;
                position: relative;
            `;

            const title = document.createElement('div');
            const historyStats = this.getHistoryStats();
            title.textContent = `NodeSeek热点统计 (7天${historyStats.totalTitles}篇新增)`;
            title.style.cssText = `
                font-weight: bold;
                font-size: 16px;
                color: #FF5722;
            `;

            const closeBtn = document.createElement('span');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                position: absolute;
                right: 0;
                top: -5px;
                cursor: pointer;
                font-size: 20px;
                color: #999;
            `;
            closeBtn.onclick = () => dialog.remove();

            header.appendChild(title);
            header.appendChild(closeBtn);
            dialog.appendChild(header);

            // 统计信息
            const statsDiv = document.createElement('div');
            statsDiv.style.cssText = `
                background: #f5f5f5;
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 15px;
                font-size: 12px;
                color: #666;
            `;



            // 格式化时间函数
            const formatTime = (timestamp) => {
                if (!timestamp) return '未知';
                const date = new Date(timestamp);
                return date.getFullYear() + '/' +
                       String(date.getMonth() + 1).padStart(2, '0') + '/' +
                       String(date.getDate()).padStart(2, '0') + ' ' +
                       String(date.getHours()).padStart(2, '0') + ':' +
                       String(date.getMinutes()).padStart(2, '0') + ':' +
                       String(date.getSeconds()).padStart(2, '0');
            };

            // 计算下次采集倒计时
            const getCountdown = () => {
                if (!this.nextCollectTime) return '未知';
                const now = Date.now();
                const remaining = Math.max(0, this.nextCollectTime - now);
                const minutes = Math.floor(remaining / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                return `${minutes}分${seconds}秒`;
            };

            const updateStatsContent = () => {
                const collectStatus = this.isMainWindow ? '⭕ 主窗口采集中' : '⚪ 从窗口同步中';
                const historyStats = this.getHistoryStats();
                
                statsDiv.innerHTML = `
                    数据来源：本地保存的7天RSS数据<br>
                    保存文章：${historyStats.totalTitles} 篇（新增）<br>
                    ${historyStats.totalFetched > historyStats.totalTitles ? `抓取总数：${historyStats.totalFetched} 篇，重复：${historyStats.totalDuplicates} 篇<br>` : ''}
                    采集次数：${historyStats.totalCollections} 次<br>
                    热门词汇：${wordFrequency.length} 个（≥2次）<br>
                    <span style="color: #28a745;">${collectStatus} (30分钟间隔)</span><br>
                    上次采集：${formatTime(this.lastCollectTime)}<br>
                    <span id="countdown-display" style="color: #007bff;">下次采集：${getCountdown()}</span>
                `;
            };

            // 初始化显示
            updateStatsContent();

            // 设置实时更新倒计时（每秒更新）
            const countdownTimer = setInterval(() => {
                const countdownElement = dialog.querySelector('#countdown-display');
                if (countdownElement && dialog.parentElement) {
                    // 从窗口需要更新全局状态
                    if (!this.isMainWindow) {
                        this.loadGlobalState(true); // 静默更新
                    }
                    countdownElement.innerHTML = `下次采集：${getCountdown()}`;
                    
                    // 实时更新窗口状态显示
                    updateStatsContent();
                } else {
                    // 弹窗已关闭，清除定时器
                    clearInterval(countdownTimer);
                }
            }, 1000);

            dialog.appendChild(statsDiv);

            // 词频列表
            this.log('createResultDialog: 热词数量:', wordFrequency.length);
            if (wordFrequency.length > 0) {
                const listContainer = document.createElement('div');
                listContainer.style.cssText = `
                    max-height: 50vh;
                    overflow-y: auto;
                    border: 1px solid #eee;
                    border-radius: 5px;
                `;

                wordFrequency.forEach((item, index) => {
                    const [word, count] = item;
                    const itemDiv = document.createElement('div');
                    itemDiv.style.cssText = `
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 12px;
                        border-bottom: 1px solid #f0f0f0;
                        background: ${index < 3 ? '#fff3e0' : '#fff'};
                    `;

                    // 排名标记
                    let rankMark = '';
                    if (index === 0) rankMark = '🥇';
                    else if (index === 1) rankMark = '🥈';
                    else if (index === 2) rankMark = '🥉';
                    else rankMark = `#${index + 1}`;

                    // 热度条
                    const maxCount = wordFrequency[0][1];
                    const percentage = (count / maxCount) * 100;

                    itemDiv.innerHTML = `
                        <div style="display: flex; align-items: center; flex: 1;">
                            <span style="margin-right: 8px; font-size: 14px; min-width: 30px;">${rankMark}</span>
                            <span style="font-weight: ${index < 5 ? 'bold' : 'normal'}; color: ${index < 3 ? '#FF5722' : '#333'};">${word}</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <div style="width: 60px; height: 8px; background: #f0f0f0; border-radius: 4px; margin-right: 8px; overflow: hidden;">
                                <div style="width: ${percentage}%; height: 100%; background: ${index < 3 ? '#FF5722' : '#2196F3'}; border-radius: 4px;"></div>
                            </div>
                            <span style="font-size: 12px; color: #666; min-width: 25px; text-align: right;">${count}</span>
                        </div>
                    `;

                    listContainer.appendChild(itemDiv);
                });

                dialog.appendChild(listContainer);
            } else {
                const emptyDiv = document.createElement('div');
                emptyDiv.style.cssText = `
                    text-align: center;
                    color: #888;
                    margin: 20px 0;
                    padding: 40px 20px;
                    background: #f9f9f9;
                    border: 1px solid #eee;
                    border-radius: 5px;
                `;
                const historyStats = this.getHistoryStats();
                emptyDiv.innerHTML = `
                    <div style="font-size: 14px; margin-bottom: 8px;">📊 暂无热点数据</div>
                    <div style="font-size: 12px; color: #999;">
                        ${historyStats.totalTitles === 0 ?
                            '点击"立即采集"开始收集RSS数据' :
                            '当前7天数据中无出现≥2次的热词'}
                    </div>
                `;
                dialog.appendChild(emptyDiv);
            }

            // 按钮组
            const buttonGroup = document.createElement('div');
            buttonGroup.style.cssText = `
                margin-top: 15px;
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            `;

            // 立即采集按钮
            const collectBtn = document.createElement('button');
            collectBtn.textContent = '立即采集';
            collectBtn.style.cssText = `
                padding: 5px 15px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                min-width: 90px;
                width: 90px;
                white-space: nowrap;
            `;
            collectBtn.onclick = async () => {
                collectBtn.disabled = true;
                collectBtn.textContent = '采集中...';
                try {
                    // 重置清理标记，允许重新获取数据
                    this.dataCleared = false;
                    await this.performAutoCollect(true); // 标记为手动触发
                    // 直接刷新当前弹窗内容，而不是关闭重开
                    await this.refreshHotTopicsDialog();
                    // 进入9秒冷却
                    let cooldown = 9;
                    collectBtn.textContent = `冷却中(${cooldown}s)`;
                    const timer = setInterval(() => {
                        cooldown--;
                        if (cooldown > 0) {
                            collectBtn.textContent = `冷却中(${cooldown}s)`;
                        } else {
                            clearInterval(timer);
                            collectBtn.disabled = false;
                            collectBtn.textContent = '立即采集';
                        }
                    }, 1000);
                } catch (error) {
                    collectBtn.textContent = '采集失败';
                    setTimeout(() => {
                        collectBtn.disabled = false;
                        collectBtn.textContent = '立即采集';
                    }, 2000);
                }
            };
            buttonGroup.appendChild(collectBtn);

            // 历史热词按钮
            const historyBtn = document.createElement('button');
            historyBtn.textContent = '历史热词';
            historyBtn.style.cssText = `
                padding: 5px 15px;
                background: #6f42c1;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            `;
            historyBtn.onclick = () => {
                this.showHotWordsHistoryDialog();
            };
            buttonGroup.appendChild(historyBtn);

            // 时间分布按钮
            const timeDistBtn = document.createElement('button');
            timeDistBtn.textContent = '时间分布';
            timeDistBtn.style.cssText = `
                padding: 5px 15px;
                background: #17a2b8;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            `;
            timeDistBtn.onclick = () => {
                this.showTimeDistributionDialog();
            };
            buttonGroup.appendChild(timeDistBtn);

            // 用户统计按钮
            const userStatsBtn = document.createElement('button');
            userStatsBtn.textContent = '用户统计';
            userStatsBtn.style.cssText = `
                padding: 5px 15px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            `;
            userStatsBtn.onclick = () => {
                this.showUserStatsDialog();
            };
            buttonGroup.appendChild(userStatsBtn);

            // 清理数据按钮
            const clearBtn = document.createElement('button');
            clearBtn.textContent = '清理数据';
            clearBtn.style.cssText = `
                padding: 5px 15px;
                background: #FF5722;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            `;
            clearBtn.onclick = () => {
                if (confirm('确定要清理所有数据吗？\n这将清除：\n- 7天历史采集数据\n- 7天热词历史\n- 7天时间分布统计\n- 7天用户统计数据\n- 当前缓存数据\n此操作不可撤销。')) {
                    // 清理历史数据
                    this.historyData = [];
                    this.saveHistoryData();

                    // 清理热词历史
                    this.hotWordsHistory = [];
                    this.saveHotWordsHistory();

                    // 清理时间分布历史
                    this.timeDistributionHistory = [];
                    this.saveTimeDistributionHistory();

                    // 清理用户统计历史
                    this.userStatsHistory = [];
                    this.saveUserStatsHistory();

                    // 清理当前缓存
                    this.rssCache = null;
                    this.rssCacheTime = 0;
                    this.dataCleared = true; // 设置清理标记

                    // 清理完毕后立即显示空状态，不重新抓取数据
                    dialog.remove();

                    // 直接显示空结果
                    this.createResultDialog([]);
                }
            };
            buttonGroup.appendChild(clearBtn);

            dialog.appendChild(buttonGroup);

            document.body.appendChild(dialog);

            // 添加拖拽功能
            if (window.makeDraggable) {
                window.makeDraggable(dialog, {width: 50, height: 50});
            }


        },

        // 生成最近7天的日期列表
        getRecentDates(days = 7) {
            const dates = [];
            const today = new Date();
            
            for (let i = 0; i < days; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                
                const dateStr = date.getFullYear() + '-' +
                              String(date.getMonth() + 1).padStart(2, '0') + '-' +
                              String(date.getDate()).padStart(2, '0');
                
                const displayStr = String(date.getMonth() + 1).padStart(2, '0') + '-' +
                                 String(date.getDate()).padStart(2, '0');
                
                dates.push({
                    date: date,
                    dateStr: dateStr,
                    displayStr: displayStr,
                    timestamp: date.getTime()
                });
            }
            
            return dates;
        },

        // 显示历史热词弹窗
        showHotWordsHistoryDialog() {
            // 检查弹窗是否已存在
            const existingDialog = document.getElementById('hot-words-history-dialog');
            if (existingDialog) {
                existingDialog.remove();
                return;
            }

            const dialog = document.createElement('div');
            dialog.id = 'hot-words-history-dialog';
            dialog.style.cssText = `
                position: fixed;
                top: 60px;
                right: 16px;
                z-index: 10000;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                padding: 18px 20px 12px 20px;
                max-height: 80vh;
                overflow-y: auto;
                user-select: text;
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
            `;

            // 移动端适配
            if (window.innerWidth <= 767) {
                dialog.style.cssText += `
                    position: fixed !important;
                    width: 96% !important;
                    left: 2% !important;
                    right: 2% !important;
                    top: 10px !important;
                    max-height: 88vh !important;
                `;
            } else {
                dialog.style.width = '600px';
            }

            // 标题和关闭按钮
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                margin-bottom: 15px;
                position: relative;
            `;

            const title = document.createElement('div');
            title.textContent = `热词历史趋势`;
            title.style.cssText = `
                font-weight: bold;
                font-size: 16px;
                color: #6f42c1;
            `;

            const closeBtn = document.createElement('span');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                position: absolute;
                right: 0;
                top: -5px;
                cursor: pointer;
                font-size: 20px;
                color: #999;
            `;
            closeBtn.onclick = () => dialog.remove();

            header.appendChild(title);
            header.appendChild(closeBtn);
            dialog.appendChild(header);

            // 日期选择按钮组
            const daySelector = document.createElement('div');
            daySelector.style.cssText = `
                margin-bottom: 15px;
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
            `;

            const dateOptions = this.getRecentDates(7);
            
            let selectedDates = new Set([dateOptions[0].dateStr]); // 默认选择今天
            let contentContainer = null;

            // 渲染选择按钮
            const renderSelectionButtons = () => {
                daySelector.innerHTML = '';
                
                // 显示日期按钮，支持多选
                dateOptions.forEach(dateOption => {
                    const btn = document.createElement('button');
                    btn.textContent = dateOption.displayStr;
                    const isSelected = selectedDates.has(dateOption.dateStr);
                    btn.style.cssText = `
                        padding: 4px 8px;
                        border: 1px solid #ddd;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 12px;
                        background: ${isSelected ? '#6f42c1' : '#f8f9fa'};
                        color: ${isSelected ? 'white' : '#333'};
                    `;
                    btn.onclick = () => {
                        if (selectedDates.has(dateOption.dateStr)) {
                            selectedDates.delete(dateOption.dateStr);
                        } else {
                            selectedDates.add(dateOption.dateStr);
                        }
                        renderSelectionButtons();
                        updateContentMulti();
                    };
                    daySelector.appendChild(btn);
                });
            };

            // 多选模式更新内容
            const updateContentMulti = () => {
                if (selectedDates.size === 0) {
                    renderContent([], [], '多选', '未选择日期');
                    return;
                }
                
                // 获取选中日期的热词数据
                const allWords = new Map();
                const selectedRecords = [];
                
                selectedDates.forEach(dateStr => {
                    // 使用新的按日期查询方法，确保数据准确性
                    const hotWords = this.getHotWordsByDate(dateStr);
                    if (hotWords.length > 0) {
                        // 创建虚拟记录用于显示统计信息
                        selectedRecords.push({
                            dateStr: dateStr,
                            words: hotWords,
                            totalTitles: hotWords.reduce((sum, [word, count]) => sum + count, 0)
                        });
                        
                        hotWords.forEach(([word, count]) => {
                            const currentCount = allWords.get(word) || 0;
                            allWords.set(word, currentCount + count);
                        });
                    }
                });
                
                // 转换为排序数组
                const hotWords = Array.from(allWords.entries())
                    .filter(([word, count]) => count >= 2)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 50);
                
                const selectedDateLabels = Array.from(selectedDates).sort().map(dateStr => {
                    const date = dateOptions.find(d => d.dateStr === dateStr);
                    return date ? date.displayStr : dateStr;
                }).join(', ');
                
                renderContent(hotWords, selectedRecords, '多选', selectedDateLabels);
            };

            // 渲染内容
            const renderContent = (hotWords, historyRecords, modeLabel, periodLabel) => {

                contentContainer.innerHTML = '';

                // 统计信息
                const statsDiv = document.createElement('div');
                statsDiv.style.cssText = `
                    background: #f5f5f5;
                    padding: 10px;
                    border-radius: 5px;
                    margin-bottom: 15px;
                    font-size: 12px;
                    color: #666;
                `;

                                 // 格式化时间函数
                 const formatTime = (timestamp) => {
                     if (!timestamp) return '未知';
                     const date = new Date(timestamp);
                     return date.getFullYear() + '/' +
                            String(date.getMonth() + 1).padStart(2, '0') + '/' +
                            String(date.getDate()).padStart(2, '0') + ' ' +
                            String(date.getHours()).padStart(2, '0') + ':' +
                            String(date.getMinutes()).padStart(2, '0') + ':' +
                            String(date.getSeconds()).padStart(2, '0');
                 };

                 // 计算下次采集倒计时
                 const getCountdown = () => {
                     if (!this.nextCollectTime) return '未知';
                     const now = Date.now();
                     const remaining = Math.max(0, this.nextCollectTime - now);
                     const minutes = Math.floor(remaining / (1000 * 60));
                     const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                     return `${minutes}分${seconds}秒`;
                 };

                 const updateHistoryStats = () => {
                     const windowStatus = this.isMainWindow ? '主窗口' : '从窗口';
                     const collectStatus = this.isMainWindow ? '⭕ 主窗口采集中' : '⚪ 从窗口同步中';
                     
                     statsDiv.innerHTML = `
                         查看模式：${modeLabel}（${periodLabel}）<br>
                         数据记录：${historyRecords.length > 0 ? '有' : '无'}<br>
                         热门词汇：${hotWords.length} 个（≥2次）<br>
                         数据更新：${historyRecords.length > 0 ? (historyRecords[0].dateStr || '未知') : '无数据'}<br>
                         ${collectStatus}<br>
                         上次采集：${formatTime(this.lastCollectTime)}<br>
                         <span id="history-countdown-display" style="color: #007bff;">下次采集：${getCountdown()}</span>
                     `;
                 };

                 // 初始化显示
                 updateHistoryStats();

                 // 设置实时更新倒计时（每秒更新）
                 const historyCountdownTimer = setInterval(() => {
                     const countdownElement = dialog.querySelector('#history-countdown-display');
                     if (countdownElement && dialog.parentElement) {
                         // 从窗口需要更新全局状态
                         if (!this.isMainWindow) {
                             this.loadGlobalState(true); // 静默更新
                         }
                         countdownElement.innerHTML = `下次采集：${getCountdown()}`;
                         
                         // 实时更新窗口状态显示
                         updateHistoryStats();
                     } else {
                         // 弹窗已关闭，清除定时器
                         clearInterval(historyCountdownTimer);
                     }
                 }, 1000);
                contentContainer.appendChild(statsDiv);

                // 热词列表
                if (hotWords.length > 0) {
                    const listContainer = document.createElement('div');
                    listContainer.style.cssText = `
                        max-height: 50vh;
                        overflow-y: auto;
                        border: 1px solid #eee;
                        border-radius: 5px;
                    `;

                    hotWords.forEach((item, index) => {
                        const [word, count] = item;
                        const itemDiv = document.createElement('div');
                        itemDiv.style.cssText = `
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 8px 12px;
                            border-bottom: 1px solid #f0f0f0;
                            background: ${index < 3 ? '#f8f5ff' : '#fff'};
                        `;

                        // 排名标记
                        let rankMark = '';
                        if (index === 0) rankMark = '🥇';
                        else if (index === 1) rankMark = '🥈';
                        else if (index === 2) rankMark = '🥉';
                        else rankMark = `#${index + 1}`;

                        // 热度条
                        const maxCount = hotWords[0][1];
                        const percentage = (count / maxCount) * 100;

                        itemDiv.innerHTML = `
                            <div style="display: flex; align-items: center; flex: 1;">
                                <span style="margin-right: 8px; font-size: 14px; min-width: 30px;">${rankMark}</span>
                                <span style="font-weight: ${index < 5 ? 'bold' : 'normal'}; color: ${index < 3 ? '#6f42c1' : '#333'};">${word}</span>
                            </div>
                            <div style="display: flex; align-items: center;">
                                <div style="width: 60px; height: 8px; background: #f0f0f0; border-radius: 4px; margin-right: 8px; overflow: hidden;">
                                    <div style="width: ${percentage}%; height: 100%; background: ${index < 3 ? '#6f42c1' : '#17a2b8'}; border-radius: 4px;"></div>
                                </div>
                                <span style="font-size: 12px; color: #666; min-width: 25px; text-align: right;">${count}</span>
                            </div>
                        `;

                        listContainer.appendChild(itemDiv);
                    });

                    contentContainer.appendChild(listContainer);
                } else {
                    const emptyDiv = document.createElement('div');
                    emptyDiv.style.cssText = `
                        text-align: center;
                        color: #888;
                        margin: 20px 0;
                        padding: 40px 20px;
                        background: #f9f9f9;
                        border: 1px solid #eee;
                        border-radius: 5px;
                    `;
                    emptyDiv.innerHTML = `
                        <div style="font-size: 14px; margin-bottom: 8px;">📊 ${periodLabel}暂无热词数据</div>
                        <div style="font-size: 12px; color: #999;">
                            热词需要出现≥2次才会被记录
                        </div>
                    `;
                    contentContainer.appendChild(emptyDiv);
                }
            };

            dialog.appendChild(daySelector);

            // 内容容器
            contentContainer = document.createElement('div');
            dialog.appendChild(contentContainer);

            // 初始化显示
            renderSelectionButtons();
            updateContentMulti();

            document.body.appendChild(dialog);

            // 添加拖拽功能
            if (window.makeDraggable) {
                window.makeDraggable(dialog, {width: 50, height: 50});
            }


        },

        // 判断是否为有效词汇（用于最终词频统计）
        isValidWord(word) {
            if (!word || word.length < 2) return false;
            if (this.stopWords.has(word.toLowerCase())) return false; // 停止词检查使用小写比较
            if (this.numberSymbolRegex.test(word)) return false;

            // 一些常见的有效词汇模式
            const validPatterns = [
                /^[\u4e00-\u9fff]{2,}$/, // 纯中文词汇
                /^[a-zA-Z]{3,}$/, // 英文词汇
                /^[\u4e00-\u9fff]+[a-zA-Z0-9]+$/, // 中文+英文数字
                /^[a-zA-Z0-9]+[\u4e00-\u9fff]+$/, // 英文数字+中文
                /^\d{2,}$/ // 纯数字（年份等）
            ];

            return validPatterns.some(pattern => pattern.test(word));
        },

        // 加载发帖时间分布历史数据
        loadTimeDistributionHistory() {
            try {
                const stored = localStorage.getItem(this.timeDistributionStorageKey);
                if (stored) {
                    this.timeDistributionHistory = JSON.parse(stored);
                    // console.log(`加载时间分布历史成功，共 ${this.timeDistributionHistory.length} 天记录`); // 已删除此日志输出
                } else {
                    this.timeDistributionHistory = [];
                    this.log('初始化时间分布历史存储');
                }
            } catch (error) {
                console.error('加载时间分布历史失败:', error);
                this.timeDistributionHistory = [];
            }
        },

        // 保存发帖时间分布历史数据
        saveTimeDistributionHistory() {
            try {
                localStorage.setItem(this.timeDistributionStorageKey, JSON.stringify(this.timeDistributionHistory));
                this.log(`保存时间分布历史成功，共 ${this.timeDistributionHistory.length} 天记录`);
            } catch (error) {
                console.error('保存时间分布历史失败:', error);
            }
        },

        // 清理7天前的时间分布历史
        cleanOldTimeDistribution() {
            if (!this.timeDistributionHistory || this.timeDistributionHistory.length === 0) return;

            const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const originalLength = this.timeDistributionHistory.length;

            this.timeDistributionHistory = this.timeDistributionHistory.filter(record => record.date >= cutoffTime);

            if (this.timeDistributionHistory.length !== originalLength) {
                this.saveTimeDistributionHistory();
                this.log(`清理旧时间分布：删除 ${originalLength - this.timeDistributionHistory.length} 条超过7天的记录`);
            }
        },

        // 加载发帖用户统计历史数据
        loadUserStatsHistory() {
            try {
                const stored = localStorage.getItem(this.userStatsStorageKey);
                if (stored) {
                    this.userStatsHistory = JSON.parse(stored);
                    // console.log(`加载用户统计历史成功，共 ${this.userStatsHistory.length} 天记录`); // 已删除此日志输出
                } else {
                    this.userStatsHistory = [];
                    this.log('初始化用户统计历史存储');
                }
            } catch (error) {
                console.error('加载用户统计历史失败:', error);
                this.userStatsHistory = [];
            }
        },

        // 保存发帖用户统计历史数据
        saveUserStatsHistory() {
            try {
                localStorage.setItem(this.userStatsStorageKey, JSON.stringify(this.userStatsHistory));
                this.log(`保存用户统计历史成功，共 ${this.userStatsHistory.length} 天记录`);
            } catch (error) {
                console.error('保存用户统计历史失败:', error);
            }
        },

        // 清理7天前的用户统计历史
        cleanOldUserStats() {
            if (!this.userStatsHistory || this.userStatsHistory.length === 0) return;

            const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const originalLength = this.userStatsHistory.length;

            this.userStatsHistory = this.userStatsHistory.filter(record => record.date >= cutoffTime);

            if (this.userStatsHistory.length !== originalLength) {
                this.saveUserStatsHistory();
                this.log(`清理旧用户统计：删除 ${originalLength - this.userStatsHistory.length} 条超过7天的记录`);
            }
        },

        // 分析发帖时间分布（基于本地7天数据）
        analyzeTimeDistribution() {
            const hourlyStats = new Array(24).fill(0); // 24小时统计
            const weekdayStats = new Array(7).fill(0); // 一周7天统计
            let totalPosts = 0;
            let validTimePosts = 0;

            this.log('开始分析发帖时间分布...');

            if (!this.historyData || this.historyData.length === 0) {
                this.log('没有历史数据可供分析');
                return { hourlyStats, weekdayStats, totalPosts, validTimePosts };
            }

            // 去重处理，避免重复统计
            const seenArticles = new Map();

            this.historyData.forEach(record => {
                const articles = record.articles || (record.titles ? record.titles.map(title => ({title: title})) : []);

                articles.forEach(article => {
                    // 基于发帖时间+发帖人+标题创建唯一标识符
                    let articleKey = '';
                    if (article.pubDate && article.author) {
                        const dateStr = new Date(article.pubDate).toDateString();
                        const authorKey = this.normalizeAuthor(article.author);
                        const titleKey = this.normalizeTitle(article.title);
                        articleKey = `${dateStr}_${authorKey}_${titleKey}`;
                    } else {
                        articleKey = this.normalizeTitle(article.title);
                    }

                    if (articleKey && articleKey.length > 2) {
                        if (!seenArticles.has(articleKey)) {
                            seenArticles.set(articleKey, article);
                            totalPosts++;

                            // 分析时间分布（只有有效时间的文章）
                            if (article.pubDate) {
                                const postDate = new Date(article.pubDate);
                                const hour = postDate.getHours();
                                const weekday = postDate.getDay(); // 0=周日, 1=周一, ..., 6=周六

                                hourlyStats[hour]++;
                                weekdayStats[weekday]++;
                                validTimePosts++;
                            }
                        }
                    }
                });
            });

            this.log(`时间分布分析完成：总文章 ${totalPosts} 篇，有效时间 ${validTimePosts} 篇`);
            this.log('小时分布:', hourlyStats);
            this.log('星期分布:', weekdayStats);

            return { hourlyStats, weekdayStats, totalPosts, validTimePosts };
        },

        // 分析指定日期的发帖时间分布
        analyzeTimeDistributionByDate(targetDateStr) {
            const hourlyStats = new Array(24).fill(0); // 24小时统计
            const weekdayStats = new Array(7).fill(0); // 一周7天统计
            let totalPosts = 0;
            let validTimePosts = 0;

            this.log(`开始分析 ${targetDateStr} 的发帖时间分布...`);

            if (!this.historyData || this.historyData.length === 0) {
                this.log('没有历史数据可供分析');
                return { hourlyStats, weekdayStats, totalPosts, validTimePosts };
            }

            // 转换目标日期为Date对象，用于比较
            const targetDate = new Date(targetDateStr);
            const targetDateStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
            const targetDateEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

            // 去重处理，避免重复统计
            const seenArticles = new Map();

            this.historyData.forEach(record => {
                const articles = record.articles || (record.titles ? record.titles.map(title => ({title: title})) : []);

                articles.forEach(article => {
                    // 检查文章的发帖日期是否匹配目标日期
                    let isTargetDate = false;
                    if (article.pubDate) {
                        const articleDate = new Date(article.pubDate);
                        isTargetDate = articleDate >= targetDateStart && articleDate < targetDateEnd;
                    } else {
                        // 如果没有发帖时间，跳过此文章
                        return;
                    }

                    if (!isTargetDate) {
                        return; // 不是目标日期的文章，跳过
                    }

                    // 基于发帖时间+发帖人+标题创建唯一标识符
                    let articleKey = '';
                    if (article.pubDate && article.author) {
                        const dateStr = new Date(article.pubDate).toDateString();
                        const authorKey = this.normalizeAuthor(article.author);
                        const titleKey = this.normalizeTitle(article.title);
                        articleKey = `${dateStr}_${authorKey}_${titleKey}`;
                    } else {
                        articleKey = this.normalizeTitle(article.title);
                    }

                    if (articleKey && articleKey.length > 2) {
                        if (!seenArticles.has(articleKey)) {
                            seenArticles.set(articleKey, article);
                            totalPosts++;

                            // 分析时间分布（只有有效时间的文章）
                            if (article.pubDate) {
                                const postDate = new Date(article.pubDate);
                                const hour = postDate.getHours();
                                const weekday = postDate.getDay(); // 0=周日, 1=周一, ..., 6=周六

                                hourlyStats[hour]++;
                                weekdayStats[weekday]++;
                                validTimePosts++;
                            }
                        }
                    }
                });
            });

            this.log(`${targetDateStr} 时间分布分析完成：总文章 ${totalPosts} 篇，有效时间 ${validTimePosts} 篇`);

            return { hourlyStats, weekdayStats, totalPosts, validTimePosts };
        },

        // 分析发帖用户统计（基于本地7天数据，≥2次发帖的用户）
        analyzeUserStats() {
            const userPostCount = new Map();
            let totalPosts = 0;

            this.log('开始分析发帖用户统计...');

            if (!this.historyData || this.historyData.length === 0) {
                this.log('没有历史数据可供分析');
                return [];
            }

            // 去重处理，避免重复统计
            const seenArticles = new Map();

            this.historyData.forEach(record => {
                const articles = record.articles || (record.titles ? record.titles.map(title => ({title: title})) : []);

                articles.forEach(article => {
                    // 基于发帖时间+发帖人+标题创建唯一标识符
                    let articleKey = '';
                    if (article.pubDate && article.author) {
                        const dateStr = new Date(article.pubDate).toDateString();
                        const authorKey = this.normalizeAuthor(article.author);
                        const titleKey = this.normalizeTitle(article.title);
                        articleKey = `${dateStr}_${authorKey}_${titleKey}`;
                    } else {
                        articleKey = this.normalizeTitle(article.title);
                    }

                    if (articleKey && articleKey.length > 2) {
                        if (!seenArticles.has(articleKey)) {
                            seenArticles.set(articleKey, article);
                            totalPosts++;

                            // 统计用户发帖数（只统计有作者信息的）
                            if (article.author && article.author.trim()) {
                                const normalizedAuthor = this.normalizeAuthor(article.author);
                                const currentCount = userPostCount.get(normalizedAuthor) || 0;
                                userPostCount.set(normalizedAuthor, currentCount + 1);
                            }
                        }
                    }
                });
            });

            // 转换为数组并排序，只保留≥2次发帖的用户
            const sortedUsers = Array.from(userPostCount.entries())
                .filter(([user, count]) => count >= 2)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 50); // 取前50个活跃用户

            this.log(`用户统计分析完成：总文章 ${totalPosts} 篇，活跃用户（≥2次发帖）${sortedUsers.length} 个`);

            // 调试：输出前几个活跃用户
            if (sortedUsers.length > 0) {
                this.log('=== 活跃用户统计 ===');
                sortedUsers.slice(0, 10).forEach(([user, count], index) => {
                    this.log(`#${index + 1}: "${user}" = ${count}次发帖`);
                });
                this.log('==================');
            }

            return sortedUsers;
        },

        // 分析指定日期的发帖用户统计
        analyzeUserStatsByDate(targetDateStr) {
            const userPostCount = new Map();
            let totalPosts = 0;

            this.log(`开始分析 ${targetDateStr} 的发帖用户统计...`);

            if (!this.historyData || this.historyData.length === 0) {
                this.log('没有历史数据可供分析');
                return [];
            }

            // 转换目标日期为Date对象，用于比较
            const targetDate = new Date(targetDateStr);
            const targetDateStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
            const targetDateEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

            // 去重处理，避免重复统计
            const seenArticles = new Map();

            this.historyData.forEach(record => {
                const articles = record.articles || (record.titles ? record.titles.map(title => ({title: title})) : []);

                articles.forEach(article => {
                    // 检查文章的发帖日期是否匹配目标日期
                    let isTargetDate = false;
                    if (article.pubDate) {
                        const articleDate = new Date(article.pubDate);
                        isTargetDate = articleDate >= targetDateStart && articleDate < targetDateEnd;
                    } else {
                        // 如果没有发帖时间，跳过此文章
                        return;
                    }

                    if (!isTargetDate) {
                        return; // 不是目标日期的文章，跳过
                    }

                    // 基于发帖时间+发帖人+标题创建唯一标识符
                    let articleKey = '';
                    if (article.pubDate && article.author) {
                        const dateStr = new Date(article.pubDate).toDateString();
                        const authorKey = this.normalizeAuthor(article.author);
                        const titleKey = this.normalizeTitle(article.title);
                        articleKey = `${dateStr}_${authorKey}_${titleKey}`;
                    } else {
                        articleKey = this.normalizeTitle(article.title);
                    }

                    if (articleKey && articleKey.length > 2) {
                        if (!seenArticles.has(articleKey)) {
                            seenArticles.set(articleKey, article);
                            totalPosts++;

                            // 统计用户发帖数（只统计有作者信息的）
                            if (article.author && article.author.trim()) {
                                const normalizedAuthor = this.normalizeAuthor(article.author);
                                const currentCount = userPostCount.get(normalizedAuthor) || 0;
                                userPostCount.set(normalizedAuthor, currentCount + 1);
                            }
                        }
                    }
                });
            });

            // 转换为数组并排序，只保留≥2次发帖的用户
            const sortedUsers = Array.from(userPostCount.entries())
                .filter(([user, count]) => count >= 2)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 50); // 取前50个活跃用户

            this.log(`${targetDateStr} 用户统计分析完成：总文章 ${totalPosts} 篇，活跃用户（≥2次发帖）${sortedUsers.length} 个`);

            return sortedUsers;
        },

        // 保存每日时间分布统计
        saveDailyTimeDistribution() {
            // 获取最近7天的日期列表
            const recentDates = this.getRecentDates(7);
            let hasUpdatedData = false;

            // 为每个日期分别保存时间分布数据
            recentDates.forEach(dateInfo => {
                const dateStr = dateInfo.dateStr;
                
                // 分析该日期的时间分布
                const timeDistribution = this.analyzeTimeDistributionByDate(dateStr);

                // 检查该日期是否已有记录
                const existingIndex = this.timeDistributionHistory.findIndex(record => record.dateStr === dateStr);

                if (timeDistribution.validTimePosts > 0) {
                    if (existingIndex >= 0) {
                        // 更新该日期记录
                        this.timeDistributionHistory[existingIndex] = {
                            date: dateInfo.date.getTime(),
                            dateStr: dateStr,
                            hourlyStats: timeDistribution.hourlyStats,
                            weekdayStats: timeDistribution.weekdayStats,
                            totalPosts: timeDistribution.totalPosts,
                            validTimePosts: timeDistribution.validTimePosts
                        };
                        this.log(`更新 ${dateStr} 时间分布记录，有效时间文章 ${timeDistribution.validTimePosts} 篇`);
                        hasUpdatedData = true;
                    } else {
                        // 新增该日期记录
                        this.timeDistributionHistory.push({
                            date: dateInfo.date.getTime(),
                            dateStr: dateStr,
                            hourlyStats: timeDistribution.hourlyStats,
                            weekdayStats: timeDistribution.weekdayStats,
                            totalPosts: timeDistribution.totalPosts,
                            validTimePosts: timeDistribution.validTimePosts
                        });
                        this.log(`新增 ${dateStr} 时间分布记录，有效时间文章 ${timeDistribution.validTimePosts} 篇`);
                        hasUpdatedData = true;
                    }
                } else {
                    // 如果该日期没有有效数据，删除可能存在的记录
                    if (existingIndex >= 0) {
                        this.timeDistributionHistory.splice(existingIndex, 1);
                        this.log(`删除 ${dateStr} 的空时间分布记录`);
                        hasUpdatedData = true;
                    }
                }
            });

            if (hasUpdatedData) {
                // 按日期降序排序
                this.timeDistributionHistory.sort((a, b) => b.date - a.date);
                
                // 保存到本地存储
                this.saveTimeDistributionHistory();
            }
        },

        // 保存每日用户统计
        saveDailyUserStats() {
            // 获取最近7天的日期列表
            const recentDates = this.getRecentDates(7);
            let hasUpdatedData = false;

            // 为每个日期分别保存用户统计数据
            recentDates.forEach(dateInfo => {
                const dateStr = dateInfo.dateStr;
                
                // 分析该日期的用户统计（≥2次发帖的用户）
                const userStats = this.analyzeUserStatsByDate(dateStr);

                // 检查该日期是否已有记录
                const existingIndex = this.userStatsHistory.findIndex(record => record.dateStr === dateStr);

                if (userStats.length > 0) {
                    if (existingIndex >= 0) {
                        // 更新该日期记录
                        this.userStatsHistory[existingIndex] = {
                            date: dateInfo.date.getTime(),
                            dateStr: dateStr,
                            users: userStats,
                            totalActiveUsers: userStats.length
                        };
                        this.log(`更新 ${dateStr} 用户统计记录，活跃用户 ${userStats.length} 个`);
                        hasUpdatedData = true;
                    } else {
                        // 新增该日期记录
                        this.userStatsHistory.push({
                            date: dateInfo.date.getTime(),
                            dateStr: dateStr,
                            users: userStats,
                            totalActiveUsers: userStats.length
                        });
                        this.log(`新增 ${dateStr} 用户统计记录，活跃用户 ${userStats.length} 个`);
                        hasUpdatedData = true;
                    }
                } else {
                    // 如果该日期没有活跃用户，删除可能存在的记录
                    if (existingIndex >= 0) {
                        this.userStatsHistory.splice(existingIndex, 1);
                        this.log(`删除 ${dateStr} 的空用户统计记录`);
                        hasUpdatedData = true;
                    }
                }
            });

            if (hasUpdatedData) {
                // 按日期降序排序
                this.userStatsHistory.sort((a, b) => b.date - a.date);
                
                // 保存到本地存储
                this.saveUserStatsHistory();
            }
        },

        // 获取指定日期的时间分布统计
        getTimeDistributionByDate(dateStr) {
            // 优先从原始数据直接计算，确保数据准确性
            return this.analyzeTimeDistributionByDate(dateStr);
        },

        // 获取指定天数的时间分布统计
        getTimeDistributionByDays(days = 7) {
            if (!this.timeDistributionHistory || this.timeDistributionHistory.length === 0) {
                return { hourlyStats: new Array(24).fill(0), weekdayStats: new Array(7).fill(0), totalPosts: 0, validTimePosts: 0 };
            }

            const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
            const recentRecords = this.timeDistributionHistory.filter(record => record.date >= cutoffTime);

            // 合并所有时间分布数据
            const mergedHourlyStats = new Array(24).fill(0);
            const mergedWeekdayStats = new Array(7).fill(0);
            let totalPosts = 0;
            let validTimePosts = 0;

            recentRecords.forEach(record => {
                record.hourlyStats.forEach((count, hour) => {
                    mergedHourlyStats[hour] += count;
                });
                record.weekdayStats.forEach((count, weekday) => {
                    mergedWeekdayStats[weekday] += count;
                });
                totalPosts += record.totalPosts;
                validTimePosts += record.validTimePosts;
            });

            return { hourlyStats: mergedHourlyStats, weekdayStats: mergedWeekdayStats, totalPosts, validTimePosts };
        },

        // 获取指定日期的用户统计
        getUserStatsByDate(dateStr) {
            // 优先从原始数据直接计算，确保数据准确性
            return this.analyzeUserStatsByDate(dateStr);
        },

        // 获取指定天数的用户统计
        getUserStatsByDays(days = 7) {
            if (!this.userStatsHistory || this.userStatsHistory.length === 0) {
                return [];
            }

            const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
            const recentRecords = this.userStatsHistory.filter(record => record.date >= cutoffTime);

            // 合并所有用户数据
            const allUsers = new Map();

            recentRecords.forEach(record => {
                record.users.forEach(([user, count]) => {
                    const currentCount = allUsers.get(user) || 0;
                    allUsers.set(user, currentCount + count);
                });
            });

            // 转换为数组并排序，只保留≥2次发帖的用户
            const sortedUsers = Array.from(allUsers.entries())
                .filter(([user, count]) => count >= 2)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 50);

            return sortedUsers;
        },

        // 显示时间分布统计弹窗
        showTimeDistributionDialog() {
            // 检查弹窗是否已存在
            const existingDialog = document.getElementById('time-distribution-dialog');
            if (existingDialog) {
                existingDialog.remove();
                return;
            }

            const dialog = document.createElement('div');
            dialog.id = 'time-distribution-dialog';
            dialog.style.cssText = `
                position: fixed;
                top: 60px;
                right: 16px;
                z-index: 10000;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                user-select: text;
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
            `;

            // 移动端适配
            if (window.innerWidth <= 767) {
                dialog.style.cssText += `
                    position: fixed !important;
                    width: 96% !important;
                    left: 2% !important;
                    right: 2% !important;
                    top: 10px !important;
                    max-height: 88vh !important;
                `;
            } else {
                dialog.style.width = '700px';
            }

            // 创建固定区域（不滚动）
            const fixedArea = document.createElement('div');
            fixedArea.style.cssText = `
                padding: 18px 20px 0 20px;
                flex-shrink: 0;
            `;

            // 标题和关闭按钮
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                margin-bottom: 15px;
                position: relative;
            `;

            const title = document.createElement('div');
            title.textContent = `发帖时间分布统计`;
            title.style.cssText = `
                font-weight: bold;
                font-size: 16px;
                color: #17a2b8;
            `;

            const closeBtn = document.createElement('span');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                position: absolute;
                right: 0;
                top: -5px;
                cursor: pointer;
                font-size: 20px;
                color: #999;
            `;
            closeBtn.onclick = () => dialog.remove();

            header.appendChild(title);
            header.appendChild(closeBtn);
            fixedArea.appendChild(header);

            // 日期选择按钮组
            const daySelector = document.createElement('div');
            daySelector.style.cssText = `
                margin-bottom: 15px;
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
            `;

            const dateOptions = this.getRecentDates(7);
            
            let selectedDates = new Set([dateOptions[0].dateStr]); // 默认选择今天
            let contentContainer = null;

            // 渲染选择按钮
            const renderSelectionButtons = () => {
                daySelector.innerHTML = '';
                
                // 显示日期按钮，支持多选
                dateOptions.forEach(dateOption => {
                    const btn = document.createElement('button');
                    btn.textContent = dateOption.displayStr;
                    const isSelected = selectedDates.has(dateOption.dateStr);
                    btn.style.cssText = `
                        padding: 4px 8px;
                        border: 1px solid #ddd;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 12px;
                        background: ${isSelected ? '#17a2b8' : '#f8f9fa'};
                        color: ${isSelected ? 'white' : '#333'};
                    `;
                    btn.onclick = () => {
                        if (selectedDates.has(dateOption.dateStr)) {
                            selectedDates.delete(dateOption.dateStr);
                        } else {
                            selectedDates.add(dateOption.dateStr);
                        }
                        renderSelectionButtons();
                        updateContentMulti();
                    };
                    daySelector.appendChild(btn);
                });
            };

            // 多选模式更新内容
            const updateContentMulti = () => {
                if (selectedDates.size === 0) {
                    renderTimeDistributionContent({ hourlyStats: new Array(24).fill(0), weekdayStats: new Array(7).fill(0), totalPosts: 0, validTimePosts: 0 }, '多选', '未选择日期');
                    return;
                }
                
                // 获取选中日期的时间分布数据
                const mergedHourlyStats = new Array(24).fill(0);
                const mergedWeekdayStats = new Array(7).fill(0);
                let totalPosts = 0;
                let validTimePosts = 0;
                
                selectedDates.forEach(dateStr => {
                    const timeDistribution = this.getTimeDistributionByDate(dateStr);
                    timeDistribution.hourlyStats.forEach((count, hour) => {
                        mergedHourlyStats[hour] += count;
                    });
                    timeDistribution.weekdayStats.forEach((count, weekday) => {
                        mergedWeekdayStats[weekday] += count;
                    });
                    totalPosts += timeDistribution.totalPosts;
                    validTimePosts += timeDistribution.validTimePosts;
                });
                
                const selectedDateLabels = Array.from(selectedDates).sort().map(dateStr => {
                    const date = dateOptions.find(d => d.dateStr === dateStr);
                    return date ? date.displayStr : dateStr;
                }).join(', ');
                
                renderTimeDistributionContent({ hourlyStats: mergedHourlyStats, weekdayStats: mergedWeekdayStats, totalPosts, validTimePosts }, '多选', selectedDateLabels);
            };

            // 渲染时间分布内容
            const renderTimeDistributionContent = (timeDistribution, modeLabel, periodLabel) => {
                // 清空固定区域中的统计信息（如果存在）
                const existingStats = fixedArea.querySelector('.stats-info');
                if (existingStats) {
                    existingStats.remove();
                }

                // 在固定区域添加统计信息
                const statsDiv = document.createElement('div');
                statsDiv.className = 'stats-info';
                statsDiv.style.cssText = `
                    background: #f5f5f5;
                    padding: 10px;
                    border-radius: 5px;
                    margin-bottom: 15px;
                    font-size: 12px;
                    color: #666;
                `;

                statsDiv.innerHTML = `
                    查看模式：${modeLabel}（${periodLabel}）<br>
                    统计文章：${timeDistribution.totalPosts} 篇<br>
                    有效时间：${timeDistribution.validTimePosts} 篇（含时间信息）<br>
                    时间覆盖率：${timeDistribution.totalPosts > 0 ? Math.round((timeDistribution.validTimePosts / timeDistribution.totalPosts) * 100) : 0}%
                `;
                fixedArea.appendChild(statsDiv);

                // 清空滚动内容区域
                contentContainer.innerHTML = '';

                if (timeDistribution.validTimePosts > 0) {
                    // 24小时分布图表
                    const hourlyContainer = document.createElement('div');
                    hourlyContainer.style.cssText = `
                        margin-bottom: 20px;
                        border: 1px solid #eee;
                        border-radius: 5px;
                        padding: 15px;
                    `;

                    const hourlyTitle = document.createElement('div');
                    hourlyTitle.textContent = '📊 24小时发帖分布';
                    hourlyTitle.style.cssText = `
                        font-weight: bold;
                        margin-bottom: 10px;
                        color: #17a2b8;
                    `;
                    hourlyContainer.appendChild(hourlyTitle);

                    const maxHourlyCount = Math.max(...timeDistribution.hourlyStats);
                    timeDistribution.hourlyStats.forEach((count, hour) => {
                        const hourDiv = document.createElement('div');
                        hourDiv.style.cssText = `
                            display: flex;
                            align-items: center;
                            margin-bottom: 3px;
                            font-size: 12px;
                        `;

                        const percentage = maxHourlyCount > 0 ? (count / maxHourlyCount) * 100 : 0;
                        const hourLabel = String(hour).padStart(2, '0') + ':00';

                        hourDiv.innerHTML = `
                            <span style="min-width: 45px; color: #666;">${hourLabel}</span>
                            <div style="flex: 1; margin: 0 10px; height: 12px; background: #f0f0f0; border-radius: 6px; overflow: hidden;">
                                <div style="width: ${percentage}%; height: 100%; background: #17a2b8; border-radius: 6px;"></div>
                            </div>
                            <span style="min-width: 30px; text-align: right; color: #333;">${count}</span>
                        `;

                        hourlyContainer.appendChild(hourDiv);
                    });

                    contentContainer.appendChild(hourlyContainer);

                    // 星期分布图表
                    const weekdayContainer = document.createElement('div');
                    weekdayContainer.style.cssText = `
                        border: 1px solid #eee;
                        border-radius: 5px;
                        padding: 15px;
                    `;

                    const weekdayTitle = document.createElement('div');
                    weekdayTitle.textContent = '📅 星期发帖分布';
                    weekdayTitle.style.cssText = `
                        font-weight: bold;
                        margin-bottom: 10px;
                        color: #17a2b8;
                    `;
                    weekdayContainer.appendChild(weekdayTitle);

                    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                    const maxWeekdayCount = Math.max(...timeDistribution.weekdayStats);

                    timeDistribution.weekdayStats.forEach((count, weekday) => {
                        const weekdayDiv = document.createElement('div');
                        weekdayDiv.style.cssText = `
                            display: flex;
                            align-items: center;
                            margin-bottom: 5px;
                            font-size: 12px;
                        `;

                        const percentage = maxWeekdayCount > 0 ? (count / maxWeekdayCount) * 100 : 0;

                        weekdayDiv.innerHTML = `
                            <span style="min-width: 35px; color: #666;">${weekdayNames[weekday]}</span>
                            <div style="flex: 1; margin: 0 10px; height: 16px; background: #f0f0f0; border-radius: 8px; overflow: hidden;">
                                <div style="width: ${percentage}%; height: 100%; background: #28a745; border-radius: 8px;"></div>
                            </div>
                            <span style="min-width: 30px; text-align: right; color: #333;">${count}</span>
                        `;

                        weekdayContainer.appendChild(weekdayDiv);
                    });

                    contentContainer.appendChild(weekdayContainer);
                } else {
                    const emptyDiv = document.createElement('div');
                    emptyDiv.style.cssText = `
                        text-align: center;
                        color: #888;
                        margin: 20px 0;
                        padding: 40px 20px;
                        background: #f9f9f9;
                        border: 1px solid #eee;
                        border-radius: 5px;
                    `;
                    emptyDiv.innerHTML = `
                        <div style="font-size: 14px; margin-bottom: 8px;">📊 ${periodLabel}暂无时间分布数据</div>
                        <div style="font-size: 12px; color: #999;">
                            需要RSS数据中包含发帖时间信息
                        </div>
                    `;
                    contentContainer.appendChild(emptyDiv);
                }
            };

            fixedArea.appendChild(daySelector);

            // 添加固定区域到弹窗
            dialog.appendChild(fixedArea);

            // 创建可滚动内容容器
            contentContainer = document.createElement('div');
            contentContainer.style.cssText = `
                flex: 1;
                overflow-y: auto;
                padding: 0 20px 12px 20px;
            `;
            dialog.appendChild(contentContainer);

            // 初始化显示
            renderSelectionButtons();
            updateContentMulti();

            document.body.appendChild(dialog);

            // 添加拖拽功能
            if (window.makeDraggable) {
                window.makeDraggable(dialog, {width: 50, height: 50});
            }
        },

        // 显示用户统计弹窗
        showUserStatsDialog() {
            // 检查弹窗是否已存在
            const existingDialog = document.getElementById('user-stats-dialog');
            if (existingDialog) {
                existingDialog.remove();
                return;
            }

            const dialog = document.createElement('div');
            dialog.id = 'user-stats-dialog';
            dialog.style.cssText = `
                position: fixed;
                top: 60px;
                right: 16px;
                z-index: 10000;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                padding: 18px 20px 12px 20px;
                max-height: 80vh;
                overflow-y: auto;
                user-select: text;
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
            `;

            // 移动端适配
            if (window.innerWidth <= 767) {
                dialog.style.cssText += `
                    position: fixed !important;
                    width: 96% !important;
                    left: 2% !important;
                    right: 2% !important;
                    top: 10px !important;
                    max-height: 88vh !important;
                `;
            } else {
                dialog.style.width = '600px';
            }

            // 标题和关闭按钮
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                margin-bottom: 15px;
                position: relative;
            `;

            const title = document.createElement('div');
            title.textContent = `活跃用户统计`;
            title.style.cssText = `
                font-weight: bold;
                font-size: 16px;
                color: #28a745;
            `;

            const closeBtn = document.createElement('span');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                position: absolute;
                right: 0;
                top: -5px;
                cursor: pointer;
                font-size: 20px;
                color: #999;
            `;
            closeBtn.onclick = () => dialog.remove();

            header.appendChild(title);
            header.appendChild(closeBtn);
            dialog.appendChild(header);

            // 日期选择按钮组
            const daySelector = document.createElement('div');
            daySelector.style.cssText = `
                margin-bottom: 15px;
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
            `;

            const dateOptions = this.getRecentDates(7);
            
            let selectedDates = new Set([dateOptions[0].dateStr]); // 默认选择今天
            let contentContainer = null;

            // 渲染选择按钮
            const renderSelectionButtons = () => {
                daySelector.innerHTML = '';
                
                // 显示日期按钮，支持多选
                dateOptions.forEach(dateOption => {
                    const btn = document.createElement('button');
                    btn.textContent = dateOption.displayStr;
                    const isSelected = selectedDates.has(dateOption.dateStr);
                    btn.style.cssText = `
                        padding: 4px 8px;
                        border: 1px solid #ddd;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 12px;
                        background: ${isSelected ? '#28a745' : '#f8f9fa'};
                        color: ${isSelected ? 'white' : '#333'};
                    `;
                    btn.onclick = () => {
                        if (selectedDates.has(dateOption.dateStr)) {
                            selectedDates.delete(dateOption.dateStr);
                        } else {
                            selectedDates.add(dateOption.dateStr);
                        }
                        renderSelectionButtons();
                        updateContentMulti();
                    };
                    daySelector.appendChild(btn);
                });
            };

            // 多选模式更新内容
            const updateContentMulti = () => {
                if (selectedDates.size === 0) {
                    renderUserStatsContent([], '多选', '未选择日期');
                    return;
                }
                
                // 获取选中日期的用户统计数据
                const allUsers = new Map();
                
                selectedDates.forEach(dateStr => {
                    const userStats = this.getUserStatsByDate(dateStr);
                    userStats.forEach(([user, count]) => {
                        const currentCount = allUsers.get(user) || 0;
                        allUsers.set(user, currentCount + count);
                    });
                });
                
                // 转换为排序数组
                const mergedUserStats = Array.from(allUsers.entries())
                    .filter(([user, count]) => count >= 2)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 50);
                
                const selectedDateLabels = Array.from(selectedDates).sort().map(dateStr => {
                    const date = dateOptions.find(d => d.dateStr === dateStr);
                    return date ? date.displayStr : dateStr;
                }).join(', ');
                
                renderUserStatsContent(mergedUserStats, '多选', selectedDateLabels);
            };

            // 渲染用户统计内容
            const renderUserStatsContent = (userStats, modeLabel, periodLabel) => {
                contentContainer.innerHTML = '';

                // 统计信息
                const statsDiv = document.createElement('div');
                statsDiv.style.cssText = `
                    background: #f5f5f5;
                    padding: 10px;
                    border-radius: 5px;
                    margin-bottom: 15px;
                    font-size: 12px;
                    color: #666;
                `;

                // 获取主弹窗的统计数据作为参考
                const mainStats = this.getHistoryStats();
                const totalPosts = userStats.reduce((sum, [user, count]) => sum + count, 0);

                statsDiv.innerHTML = `
                    查看模式：${modeLabel}（${periodLabel}）<br>
                    统计数据：${userStats.length > 0 ? '有' : '无'}<br>
                    活跃用户：${userStats.length} 个（≥2次发帖）<br>
                    活跃发帖：${totalPosts} 篇<br>
                    平均发帖：${userStats.length > 0 ? Math.round(totalPosts / userStats.length) : 0} 篇/用户
                `;
                contentContainer.appendChild(statsDiv);

                if (userStats.length > 0) {
                    const listContainer = document.createElement('div');
                    listContainer.style.cssText = `
                        max-height: 50vh;
                        overflow-y: auto;
                        border: 1px solid #eee;
                        border-radius: 5px;
                    `;

                    userStats.forEach((item, index) => {
                        const [user, count] = item;
                        const itemDiv = document.createElement('div');
                        itemDiv.style.cssText = `
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 8px 12px;
                            border-bottom: 1px solid #f0f0f0;
                            background: ${index < 3 ? '#e8f5e8' : '#fff'};
                        `;

                        // 排名标记
                        let rankMark = '';
                        if (index === 0) rankMark = '🥇';
                        else if (index === 1) rankMark = '🥈';
                        else if (index === 2) rankMark = '🥉';
                        else rankMark = `#${index + 1}`;

                        // 活跃度条
                        const maxCount = userStats[0][1];
                        const percentage = (count / maxCount) * 100;

                        itemDiv.innerHTML = `
                            <div style="display: flex; align-items: center; flex: 1;">
                                <span style="margin-right: 8px; font-size: 14px; min-width: 30px;">${rankMark}</span>
                                <span style="font-weight: ${index < 5 ? 'bold' : 'normal'}; color: ${index < 3 ? '#28a745' : '#333'}; word-break: break-all;">${user}</span>
                            </div>
                            <div style="display: flex; align-items: center;">
                                <div style="width: 60px; height: 8px; background: #f0f0f0; border-radius: 4px; margin-right: 8px; overflow: hidden;">
                                    <div style="width: ${percentage}%; height: 100%; background: ${index < 3 ? '#28a745' : '#17a2b8'}; border-radius: 4px;"></div>
                                </div>
                                <span style="font-size: 12px; color: #666; min-width: 25px; text-align: right;">${count}</span>
                            </div>
                        `;

                        listContainer.appendChild(itemDiv);
                    });

                    contentContainer.appendChild(listContainer);
                } else {
                    const emptyDiv = document.createElement('div');
                    emptyDiv.style.cssText = `
                        text-align: center;
                        color: #888;
                        margin: 20px 0;
                        padding: 40px 20px;
                        background: #f9f9f9;
                        border: 1px solid #eee;
                        border-radius: 5px;
                    `;
                    emptyDiv.innerHTML = `
                        <div style="font-size: 14px; margin-bottom: 8px;">👥 ${periodLabel}暂无活跃用户数据</div>
                        <div style="font-size: 12px; color: #999;">
                            活跃用户需要发帖≥2次才会被统计
                        </div>
                    `;
                    contentContainer.appendChild(emptyDiv);
                }
            };

            dialog.appendChild(daySelector);

            // 内容容器
            contentContainer = document.createElement('div');
            dialog.appendChild(contentContainer);

            // 初始化显示
            renderSelectionButtons();
            updateContentMulti();

            document.body.appendChild(dialog);

            // 添加拖拽功能
            if (window.makeDraggable) {
                window.makeDraggable(dialog, {width: 50, height: 50});
            }
        }
    };

    // 暴露到全局
    window.NodeSeekFocus = NodeSeekFocus;

    // 初始化
    NodeSeekFocus.init();

})();
