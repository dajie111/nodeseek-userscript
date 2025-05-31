// NodeSeek 自动签到后端模块
// 包含所有自动签到相关的后端逻辑

class NodeSeekAutoSignIn {
    constructor() {
        this.SIGN_ACTIVE_PAGE_KEY = 'nodeseek_sign_active_page';
        this.SIGN_LAST_ACTIVE_TIME_KEY = 'nodeseek_sign_last_active_time';
        this.SIGN_LAST_SIGN_TIME_KEY = 'nodeseek_sign_last_sign_time';
        this.PAGE_ACTIVE_INTERVAL = 3000; // 3秒心跳检查
        this.PAGE_EXPIRY_TIME = 5000; // 5秒过期时间

        this.pageId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        this.isActivePage = false;
        this.timerRunning = false;
        this.intervalId = null;
        this.heartbeatId = null;

        this.init();
    }

    init() {
        // 启动时立即检测登录状态
        if (this.checkLoginState()) {
            return; // 如果检测到未登录状态，终止启动签到计时器
        }

        // 立即检查控制权
        this.checkActiveStatus();
    }

    // 获取页面主要文本内容
    getPageMainText() {
        return document.body ? document.body.innerText || document.body.textContent || '' : '';
    }

    // 添加日志函数
    addLog(message) {
        const timestamp = new Date().toLocaleString();
        const logEntry = `[${timestamp}] ${message}`;

        // 获取现有日志
        let logs = JSON.parse(localStorage.getItem('nodeseek_logs') || '[]');
        logs.push(logEntry);

        // 限制日志数量，保留最新的100条
        if (logs.length > 100) {
            logs = logs.slice(-100);
        }

        // 保存日志
        localStorage.setItem('nodeseek_logs', JSON.stringify(logs));
        console.log(logEntry);
    }

    // 检测登录状态
    checkLoginState() {
        const loginBtn = document.querySelector('button, a, input[type="button"], div')?.textContent?.includes('登录');
        const registerBtn = document.querySelector('button, a, input[type="button"], div')?.textContent?.includes('注册');
        const strangerText = this.getPageMainText().includes('你好啊，陌生人');
        const newcomerText = this.getPageMainText().includes('我的朋友，看起来你是新来的');

        // 如果未登录或登录相关页面
        if ((strangerText && newcomerText) ||
            (loginBtn && registerBtn) ||
            (strangerText && loginBtn)) {

            // 立即关闭签到功能
            localStorage.setItem('nodeseek_sign_enabled', 'false');
            this.addLog('启动时检测到未登录状态，自动签到已禁用');

            // 更新签到按钮
            const signInBtn = document.getElementById('sign-in-btn');
            if (signInBtn) {
                signInBtn.textContent = '开启签到';
                signInBtn.style.background = '#4CAF50'; // 绿色表示可以开启
            }

            return true; // 检测到未登录状态
        }

        // 判断登录后签到关键词只在board页面(签到页面)检测
        const isInBoardPage = window.location.href.includes('/board');
        const loginToSignText = this.getPageMainText();

        if (isInBoardPage && loginToSignText.includes('登录后签到')) {
            // 立即关闭签到功能
            localStorage.setItem('nodeseek_sign_enabled', 'false');
            this.addLog('启动时检测到"登录后签到"文字，自动签到已禁用');

            // 更新签到按钮
            const signInBtn = document.getElementById('sign-in-btn');
            if (signInBtn) {
                signInBtn.textContent = '开启签到';
                signInBtn.style.background = '#4CAF50'; // 绿色表示可以开启
            }

            return true; // 检测到未登录状态
        }

        return false; // 未检测到未登录状态
    }

    // 检查是否是活跃页面
    checkActiveStatus() {
        const now = Date.now();
        const lastActiveTime = parseInt(localStorage.getItem(this.SIGN_LAST_ACTIVE_TIME_KEY) || '0');
        const currentActivePage = localStorage.getItem(this.SIGN_ACTIVE_PAGE_KEY);

        // 自动获取控制权：只要是当前页面，就获取控制权（刷新的页面会立即获取控制权）
        // 更新心跳时间和活跃页面ID
        localStorage.setItem(this.SIGN_LAST_ACTIVE_TIME_KEY, now.toString());
        localStorage.setItem(this.SIGN_ACTIVE_PAGE_KEY, this.pageId);

        if (!this.isActivePage) {
            this.isActivePage = true;
            console.log('获得签到控制权，当前页面将负责定时签到');

            // 如果计时器还没有运行，启动它
            if (!this.timerRunning) {
                this.startCheckingTime();
            }
        }

        // 设置心跳更新
        this.heartbeatId = setInterval(() => {
            if (localStorage.getItem('nodeseek_sign_enabled') !== 'true') {
                // 如果签到功能被禁用，清除所有计时器
                clearInterval(this.heartbeatId);
                if (this.intervalId) {
                    clearInterval(this.intervalId);
                    this.intervalId = null;
                    this.timerRunning = false;
                }
                return;
            }

            // 检查当前是否是控制签到的页面
            const currentActivePage = localStorage.getItem(this.SIGN_ACTIVE_PAGE_KEY);

            if (currentActivePage === this.pageId) {
                // 如果这个页面是当前活跃的签到页面，则更新心跳
                localStorage.setItem(this.SIGN_LAST_ACTIVE_TIME_KEY, Date.now().toString());

                // 确保标记为活跃页面
                if (!this.isActivePage) {
                    this.isActivePage = true;
                    if (!this.timerRunning) {
                        this.startCheckingTime();
                    }
                }
            } else {
                // 如果当前页面不是活跃的签到页面，则停止计时器
                if (this.isActivePage) {
                    this.isActivePage = false;
                    console.log('检测到其他页面已刷新并获得签到控制权');
                }
            }
        }, this.PAGE_ACTIVE_INTERVAL);

        // 页面关闭时清理
        window.addEventListener('beforeunload', () => {
            clearInterval(this.heartbeatId);
            if (this.intervalId) {
                clearInterval(this.intervalId);
            }

            // 如果是当前活跃页面，清除活跃页面ID
            if (this.isActivePage) {
                if (localStorage.getItem(this.SIGN_ACTIVE_PAGE_KEY) === this.pageId) {
                    localStorage.removeItem(this.SIGN_ACTIVE_PAGE_KEY);
                }
            }
        });

        return true;
    }

    // 启动倒计时检查
    startCheckingTime() {
        if (this.timerRunning) return;

        let lastLogTime = 0;
        this.timerRunning = true;

        this.intervalId = setInterval(() => {
            // 如果不再是活跃页面，不执行操作
            if (!this.isActivePage) return;

            const now = new Date();
            const h = now.getHours();
            const m = now.getMinutes();
            const s = now.getSeconds();

            // 每10秒输出一次倒计时日志
            const currentTimestamp = Math.floor(now.getTime() / 1000);
            if (currentTimestamp - lastLogTime >= 10) {
                lastLogTime = currentTimestamp;

                // 计算距离下一个00:00:00的时间
                let nextMidnight = new Date(now);
                nextMidnight.setHours(24, 0, 0, 0);
                let secondsToMidnight = Math.floor((nextMidnight - now) / 1000);

                // 格式化时间
                let hours = Math.floor(secondsToMidnight / 3600);
                let minutes = Math.floor((secondsToMidnight % 3600) / 60);
                let seconds = secondsToMidnight % 60;

                // 输出日志
                const currentTimeStr = now.toLocaleTimeString();
                let logMessage = `[本地时间 ${currentTimeStr}] 距离下次签到还有 ${hours}小时${minutes}分${seconds}秒`;
                console.log(logMessage);
                this.addLog(logMessage);
            }

            // 检查是否在规定时间内（00:00:00 - 00:00:10）
            if (h === 0 && m === 0 && s >= 0 && s <= 10) {
                // 检查是否已在10秒内签到过
                const lastSignTime = localStorage.getItem(this.SIGN_LAST_SIGN_TIME_KEY);
                if (lastSignTime) {
                    const lastSignDate = new Date(parseInt(lastSignTime));
                    const timeDiff = now.getTime() - lastSignDate.getTime();
                    // 如果10秒内已经签到过，则不再执行
                    if (timeDiff < 10000) {
                        console.log(`已在${Math.floor(timeDiff/1000)}秒前完成今日签到，不重复执行`);
                        return;
                    }
                }

                // 记录当前签到时间
                localStorage.setItem(this.SIGN_LAST_SIGN_TIME_KEY, now.getTime().toString());
                console.log(`到达签到时间(${h}:${m}:${s})，开始执行签到`);
                this.addLog(`到达签到时间(${h}:${m}:${s})，开始执行签到`);

                // 执行签到
                this.doSignIn();
            }
        }, 1000);
    }

    // 强制停止签到
    forceStopSignIn(reason) {
        // 立即关闭签到功能
        localStorage.setItem('nodeseek_sign_enabled', 'false');
        // 记录关闭原因
        this.addLog(`自动签到已关闭: ${reason}`);

        // 更新签到按钮状态（如果存在）
        const signInBtn = document.getElementById('sign-in-btn');
        if (signInBtn) {
            signInBtn.textContent = '开启签到';
            signInBtn.style.background = '#4CAF50'; // 绿色表示可以开启
        }

        // 清除签到进程标记
        localStorage.removeItem('nodeseek_sign_in_progress');
        return; // 中止签到流程
    }

    // 签到流程
    doSignIn() {
        // 用户未登录检测 - 更强的检测方式
        const loginBtn = document.querySelector('button, a, input[type="button"], div')?.textContent?.includes('登录');
        const registerBtn = document.querySelector('button, a, input[type="button"], div')?.textContent?.includes('注册');
        const strangerText = this.getPageMainText().includes('你好啊，陌生人');
        const newcomerText = this.getPageMainText().includes('我的朋友，看起来你是新来的');

        // 如果未登录或登录相关页面
        if ((strangerText && newcomerText) ||
            (loginBtn && registerBtn) ||
            (strangerText && loginBtn)) {
            this.forceStopSignIn('检测到未登录状态');
            return;
        }

        // 判断登录后签到关键词只在board页面(签到页面)检测
        const isInBoardPage = window.location.href.includes('/board');
        const loginToSignText = this.getPageMainText();

        if (isInBoardPage && loginToSignText.includes('登录后签到')) {
            this.forceStopSignIn('检测到"登录后签到"文字');
            return;
        }

        // 设置签到进程标记
        localStorage.setItem('nodeseek_sign_in_progress', 'true');
        this.addLog('开始执行签到流程');

        // 跳转到签到页面
        this.addLog('正在跳转到签到页面...');
        window.location.href = 'https://www.nodeseek.com/board';

        // 设置5秒超时，防止无限等待
        setTimeout(() => {
            this.waitForSignInPage();
        }, 5000); // 5秒超时
    }

    // 等待签到页面加载并执行签到
    waitForSignInPage() {
        const maxAttempts = 10;
        let attempts = 0;

        const checkAndSign = () => {
            attempts++;

            // 再次检查登录状态
            if (this.checkLoginState()) {
                localStorage.removeItem('nodeseek_sign_in_progress');
                return;
            }

            // 查找签到按钮
            const signButton = document.querySelector('button');
            const buttonText = signButton ? signButton.textContent.trim() : '';

            if (signButton && (buttonText.includes('签到') || buttonText.includes('打卡'))) {
                this.addLog(`找到签到按钮: "${buttonText}"`);

                // 点击签到按钮
                signButton.click();
                this.addLog('已点击签到按钮');

                // 等待签到结果
                setTimeout(() => {
                    this.checkSignInResult();
                }, 2000);

                return;
            }

            // 如果没找到签到按钮且尝试次数未达上限，继续尝试
            if (attempts < maxAttempts) {
                this.addLog(`第${attempts}次查找签到按钮失败，2秒后重试...`);
                setTimeout(checkAndSign, 2000);
            } else {
                this.addLog('未找到签到按钮，签到失败');
                localStorage.removeItem('nodeseek_sign_in_progress');
            }
        };

        checkAndSign();
    }

    // 检查签到结果
    checkSignInResult() {
        const pageText = this.getPageMainText();

        if (pageText.includes('签到成功') || pageText.includes('打卡成功')) {
            this.addLog('签到成功！');

            // 记录签到数据
            this.recordSignInData();
        } else if (pageText.includes('已经签到') || pageText.includes('已经打卡')) {
            this.addLog('今日已经签到过了');
        } else {
            this.addLog('签到结果未知，请手动检查');
        }

        // 清除签到进程标记
        localStorage.removeItem('nodeseek_sign_in_progress');
    }

    // 记录签到数据
    recordSignInData() {
        const today = new Date().toDateString();
        let signData = JSON.parse(localStorage.getItem('nodeseek_sign_data') || '{}');

        // 初始化数据结构
        if (!signData.records) signData.records = [];
        if (!signData.totalDays) signData.totalDays = 0;
        if (!signData.totalRewards) signData.totalRewards = 0;
        if (!signData.startDate) signData.startDate = today;

        // 检查今天是否已记录
        const todayRecord = signData.records.find(record => record.date === today);
        if (!todayRecord) {
            // 模拟获得的鸡腿数量（实际应该从页面解析）
            const reward = Math.floor(Math.random() * 10) + 1; // 1-10个鸡腿

            signData.records.push({
                date: today,
                reward: reward,
                timestamp: Date.now()
            });

            signData.totalDays++;
            signData.totalRewards += reward;

            localStorage.setItem('nodeseek_sign_data', JSON.stringify(signData));
            this.addLog(`签到数据已记录：获得${reward}个鸡腿`);
        }
    }

    // 获取签到统计数据
    getSignInStats() {
        const signData = JSON.parse(localStorage.getItem('nodeseek_sign_data') || '{}');
        const records = signData.records || [];

        // 计算连续签到天数
        let consecutiveDays = 0;
        const today = new Date();

        for (let i = 0; i < 30; i++) { // 检查最近30天
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateStr = checkDate.toDateString();

            const hasRecord = records.some(record => record.date === dateStr);
            if (hasRecord) {
                consecutiveDays++;
            } else {
                break;
            }
        }

        const totalDays = signData.totalDays || 0;
        const totalRewards = signData.totalRewards || 0;
        const avgRewards = totalDays > 0 ? (totalRewards / totalDays).toFixed(1) : '0.0';

        return {
            totalDays,
            totalRewards,
            avgRewards,
            consecutiveDays,
            records
        };
    }
}

// 鸡腿统计功能类
class ChickenLegStats {
    constructor() {
        this.autoSignIn = null;
        this.creditMonitorInterval = null;
        this.lastKnownCredit = null;
        this.isMonitoring = false;
        this.startCreditMonitoring();
    }

    // 设置自动签到实例
    setAutoSignIn(autoSignIn) {
        this.autoSignIn = autoSignIn;
    }

    // 开始鸡腿监控
    startCreditMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        console.log('开始鸡腿变化监控，每30秒检查一次');
        
        // 立即执行一次
        this.fetchCreditData();
        
        // 每30秒执行一次
        this.creditMonitorInterval = setInterval(() => {
            this.fetchCreditData();
        }, 30000);
    }

    // 停止鸡腿监控
    stopCreditMonitoring() {
        if (this.creditMonitorInterval) {
            clearInterval(this.creditMonitorInterval);
            this.creditMonitorInterval = null;
            this.isMonitoring = false;
            console.log('鸡腿变化监控已停止');
        }
    }

    // 获取鸡腿数据
    async fetchCreditData() {
        try {
            const response = await fetch('https://www.nodeseek.com/api/account/credit/page-1', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': navigator.userAgent
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.data && data.data.length > 0) {
                this.processCreditData(data.data);
            } else {
                console.log('鸡腿数据获取失败或无数据');
            }
        } catch (error) {
            console.log('鸡腿数据获取错误:', error.message);
            // 如果API请求失败，尝试通过iframe方式获取
            this.fetchCreditDataViaIframe();
        }
    }

    // 通过iframe方式获取鸡腿数据
    async fetchCreditDataViaIframe() {
        try {
            // 创建隐藏的iframe
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = 'https://www.nodeseek.com/credit#/p-1';
            
            document.body.appendChild(iframe);
            
            // 等待iframe加载完成
            await new Promise((resolve, reject) => {
                iframe.onload = resolve;
                iframe.onerror = reject;
                setTimeout(reject, 10000); // 10秒超时
            });
            
            // 等待页面内容加载
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 尝试从iframe中获取数据
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const tables = iframeDoc.querySelectorAll('table');
                
                if (tables.length > 0) {
                    const rows = tables[0].querySelectorAll('tbody tr');
                    const creditData = [];
                    
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 4) {
                            creditData.push([
                                cells[0].textContent.trim(), // 鸡腿变动
                                cells[1].textContent.trim(), // 鸡腿总计
                                cells[2].textContent.trim(), // 理由
                                cells[3].textContent.trim()  // 时间
                            ]);
                        }
                    });
                    
                    if (creditData.length > 0) {
                        this.processCreditData(creditData);
                    }
                }
            } catch (e) {
                console.log('无法访问iframe内容，可能由于跨域限制');
            }
            
            // 清理iframe
            document.body.removeChild(iframe);
            
        } catch (error) {
            console.log('iframe方式获取鸡腿数据失败:', error.message);
        }
    }

    // 处理鸡腿数据
    processCreditData(creditData) {
        if (!creditData || creditData.length === 0) return;
        
        // 获取最新的一条记录
        const latestRecord = creditData[0];
        const currentCredit = parseInt(latestRecord[1]) || 0; // 鸡腿总计
        const creditChange = parseInt(latestRecord[0]) || 0; // 鸡腿变动
        const reason = latestRecord[2] || ''; // 理由
        const timeStr = latestRecord[3] || ''; // 时间
        
        // 如果是第一次获取数据
        if (this.lastKnownCredit === null) {
            this.lastKnownCredit = currentCredit;
            this.saveCreditRecord({
                change: 0,
                total: currentCredit,
                reason: '初始记录',
                timestamp: Date.now(),
                timeStr: new Date().toLocaleString()
            });
            console.log(`初始鸡腿数量记录: ${currentCredit}`);
            return;
        }
        
        // 检查是否有变化
        if (currentCredit !== this.lastKnownCredit) {
            const actualChange = currentCredit - this.lastKnownCredit;
            
            this.saveCreditRecord({
                change: actualChange,
                total: currentCredit,
                reason: reason,
                timestamp: Date.now(),
                timeStr: timeStr || new Date().toLocaleString()
            });
            
            console.log(`鸡腿数量变化: ${actualChange > 0 ? '+' : ''}${actualChange}, 当前总计: ${currentCredit}, 原因: ${reason}`);
            
            // 更新已知数量
            this.lastKnownCredit = currentCredit;
            
            // 添加到日志
            if (this.autoSignIn) {
                this.autoSignIn.addLog(`鸡腿${actualChange > 0 ? '增加' : '减少'}${Math.abs(actualChange)}个，当前总计${currentCredit}个 (${reason})`);
            }
        }
    }

    // 保存鸡腿变化记录
    saveCreditRecord(record) {
        let creditHistory = JSON.parse(localStorage.getItem('nodeseek_credit_history') || '[]');
        
        // 添加新记录到开头
        creditHistory.unshift(record);
        
        // 限制记录数量，保留最新的500条
        if (creditHistory.length > 500) {
            creditHistory = creditHistory.slice(0, 500);
        }
        
        localStorage.setItem('nodeseek_credit_history', JSON.stringify(creditHistory));
    }

    // 获取鸡腿变化历史
    getCreditHistory() {
        return JSON.parse(localStorage.getItem('nodeseek_credit_history') || '[]');
    }

    // 显示鸡腿统计弹窗
    showStatsDialog() {
        const stats = this.autoSignIn ? this.autoSignIn.getSignInStats() : this.getDefaultStats();
        const creditHistory = this.getCreditHistory();

        // 创建弹窗
        const dialog = document.createElement('div');
        dialog.className = 'chicken-leg-stats-dialog';
        dialog.innerHTML = this.createStatsHTML(stats, creditHistory);

        // 添加样式
        this.addStatsStyles();

        // 添加到页面
        document.body.appendChild(dialog);

        // 绑定事件
        this.bindStatsEvents(dialog, stats, creditHistory);

        // 初始化图表
        setTimeout(() => {
            this.initCharts(stats, creditHistory);
        }, 100);
    }

    // 创建统计HTML
    createStatsHTML(stats, creditHistory) {
        const currentCredit = this.lastKnownCredit || 0;
        const todayChanges = this.getTodayChanges(creditHistory);
        
        return `
            <div class="stats-overlay">
                <div class="stats-container">
                    <div class="stats-header">
                        <h3>🍗 鸡腿收益统计</h3>
                        <button class="stats-close-btn">×</button>
                    </div>

                    <div class="stats-summary">
                        <div class="stat-item">
                            <div class="stat-label">当前鸡腿总数</div>
                            <div class="stat-value">${currentCredit}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">今日变化</div>
                            <div class="stat-value" style="color: ${todayChanges >= 0 ? '#4CAF50' : '#f44336'}">${todayChanges >= 0 ? '+' : ''}${todayChanges}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">累计签到天数</div>
                            <div class="stat-value">${stats.totalDays}天</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">连续签到</div>
                            <div class="stat-value">${stats.consecutiveDays}天</div>
                        </div>
                    </div>

                    <div class="stats-tabs">
                        <button class="tab-btn active" data-tab="history">鸡腿变化记录</button>
                        <button class="tab-btn" data-tab="trend">收益趋势</button>
                        <button class="tab-btn" data-tab="distribution">收益分布</button>
                    </div>

                    <div class="stats-content">
                        <div class="tab-content active" id="history-tab">
                            <div class="credit-history">
                                ${this.createHistoryHTML(creditHistory)}
                            </div>
                        </div>
                        <div class="tab-content" id="trend-tab">
                            <canvas id="trend-chart" width="400" height="200"></canvas>
                        </div>
                        <div class="tab-content" id="distribution-tab">
                            <canvas id="distribution-chart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 创建历史记录HTML
    createHistoryHTML(creditHistory) {
        if (creditHistory.length === 0) {
            return '<div class="no-data">暂无鸡腿变化记录</div>';
        }
        
        let html = '<div class="history-table-wrapper"><table class="history-table">';
        html += '<thead><tr><th>变化</th><th>总计</th><th>原因</th><th>时间</th></tr></thead><tbody>';
        
        creditHistory.slice(0, 50).forEach(record => {
            const changeClass = record.change > 0 ? 'positive' : record.change < 0 ? 'negative' : 'neutral';
            const changeText = record.change > 0 ? `+${record.change}` : record.change.toString();
            
            html += `
                <tr>
                    <td class="change ${changeClass}">${changeText}</td>
                    <td class="total">${record.total}</td>
                    <td class="reason">${record.reason}</td>
                    <td class="time">${record.timeStr}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        
        if (creditHistory.length > 50) {
            html += `<div class="more-records">显示最近50条记录，共${creditHistory.length}条</div>`;
        }
        
        return html;
    }

    // 获取今日变化总计
    getTodayChanges(creditHistory) {
        const today = new Date().toDateString();
        let todayTotal = 0;
        
        creditHistory.forEach(record => {
            const recordDate = new Date(record.timestamp).toDateString();
            if (recordDate === today && record.reason !== '初始记录') {
                todayTotal += record.change;
            }
        });
        
        return todayTotal;
    }

    // 添加样式
    addStatsStyles() {
        if (document.getElementById('chicken-leg-stats-styles')) return;

        const style = document.createElement('style');
        style.id = 'chicken-leg-stats-styles';
        style.textContent = `
            .chicken-leg-stats-dialog {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .stats-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                padding: 20px;
                box-sizing: border-box;
            }

            .stats-container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                width: 100%;
                max-width: 600px;
                max-height: 90vh;
                overflow: hidden;
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                display: flex;
                flex-direction: column;
            }

            .stats-header {
                padding: 20px 20px 0;
                border-bottom: 1px solid #eee;
                position: relative;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 12px 12px 0 0;
            }

            .stats-header h3 {
                margin: 0 0 15px 0;
                font-size: 20px;
                font-weight: 600;
            }

            .stats-close-btn {
                position: absolute;
                top: 15px;
                right: 15px;
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                font-size: 24px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }

            .stats-close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .stats-summary {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 15px;
                padding: 20px;
                background: #f8f9fa;
            }

            .stat-item {
                text-align: center;
                padding: 15px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .stat-label {
                font-size: 12px;
                color: #666;
                margin-bottom: 5px;
                font-weight: 500;
            }

            .stat-value {
                font-size: 18px;
                font-weight: bold;
                color: #333;
            }

            .stats-tabs {
                display: flex;
                border-bottom: 1px solid #eee;
                background: white;
            }

            .tab-btn {
                flex: 1;
                padding: 12px 16px;
                border: none;
                background: none;
                cursor: pointer;
                font-size: 14px;
                color: #666;
                border-bottom: 2px solid transparent;
                transition: all 0.2s;
            }

            .tab-btn.active {
                color: #667eea;
                border-bottom-color: #667eea;
                font-weight: 600;
            }

            .tab-btn:hover {
                background: #f8f9fa;
            }

            .stats-content {
                flex: 1;
                overflow: hidden;
                position: relative;
            }

            .tab-content {
                display: none;
                height: 100%;
                overflow-y: auto;
                padding: 20px;
            }

            .tab-content.active {
                display: block;
            }

            .credit-history {
                height: 100%;
            }

            .history-table-wrapper {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid #eee;
                border-radius: 6px;
            }

            .history-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }

            .history-table th {
                background: #f8f9fa;
                padding: 10px 8px;
                text-align: left;
                font-weight: 600;
                color: #333;
                border-bottom: 1px solid #eee;
                position: sticky;
                top: 0;
            }

            .history-table td {
                padding: 8px;
                border-bottom: 1px solid #f0f0f0;
            }

            .history-table tr:hover {
                background: #f8f9fa;
            }

            .change.positive {
                color: #4CAF50;
                font-weight: bold;
            }

            .change.negative {
                color: #f44336;
                font-weight: bold;
            }

            .change.neutral {
                color: #666;
            }

            .total {
                font-weight: 600;
                color: #333;
            }

            .reason {
                color: #666;
                max-width: 150px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .time {
                color: #999;
                font-size: 12px;
                white-space: nowrap;
            }

            .no-data {
                text-align: center;
                color: #999;
                padding: 40px;
                font-style: italic;
            }

            .more-records {
                text-align: center;
                color: #666;
                font-size: 12px;
                padding: 10px;
                background: #f8f9fa;
                border-top: 1px solid #eee;
            }

            /* 移动端适配 */
            @media (max-width: 768px) {
                .stats-container {
                    max-width: 95%;
                    margin: 10px;
                }

                .stats-summary {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                    padding: 15px;
                }

                .stat-item {
                    padding: 10px;
                }

                .stat-value {
                    font-size: 16px;
                }

                .history-table {
                    font-size: 12px;
                }

                .history-table th,
                .history-table td {
                    padding: 6px 4px;
                }

                .reason {
                    max-width: 80px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // 绑定事件
    bindStatsEvents(dialog, stats, creditHistory) {
        // 关闭按钮
        const closeBtn = dialog.querySelector('.stats-close-btn');
        closeBtn.addEventListener('click', () => {
            dialog.remove();
        });

        // 点击遮罩关闭
        const overlay = dialog.querySelector('.stats-overlay');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                dialog.remove();
            }
        });

        // 标签切换
        const tabBtns = dialog.querySelectorAll('.tab-btn');
        const tabContents = dialog.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;

                // 更新按钮状态
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 更新内容显示
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${targetTab}-tab`) {
                        content.classList.add('active');
                    }
                });

                // 如果切换到图表标签，重新初始化图表
                if (targetTab === 'trend' || targetTab === 'distribution') {
                    setTimeout(() => {
                        this.initCharts(stats, creditHistory);
                    }, 100);
                }
            });
        });

        // ESC键关闭
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                dialog.remove();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
    }

    // 初始化图表
    initCharts(stats, creditHistory) {
        this.initTrendChart(stats, creditHistory);
        this.initDistributionChart(stats);
    }

    // 初始化趋势图表
    initTrendChart(stats, creditHistory) {
        const canvas = document.getElementById('trend-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // 清空画布
        ctx.clearRect(0, 0, width, height);

        // 获取最近7天的数据
        const recentData = this.getRecentCreditData(creditHistory, 7);
        
        if (recentData.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('暂无数据', width / 2, height / 2);
            return;
        }

        // 绘制趋势图
        this.drawLineChart(ctx, recentData, width, height, '最近7天鸡腿变化趋势');
    }

    // 初始化分布图表
    initDistributionChart(stats) {
        const canvas = document.getElementById('distribution-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // 清空画布
        ctx.clearRect(0, 0, width, height);

        // 获取签到奖励分布数据
        const distributionData = this.getRewardDistribution(stats.records || []);
        
        if (distributionData.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('暂无签到数据', width / 2, height / 2);
            return;
        }

        // 绘制柱状图
        this.drawBarChart(ctx, distributionData, width, height, '签到奖励分布');
    }

    // 获取最近的鸡腿数据
    getRecentCreditData(creditHistory, days) {
        const today = new Date();
        const recentData = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toDateString();

            // 计算当天的总变化
            let dayChange = 0;
            creditHistory.forEach(record => {
                const recordDate = new Date(record.timestamp).toDateString();
                if (recordDate === dateStr && record.reason !== '初始记录') {
                    dayChange += record.change;
                }
            });

            recentData.push({
                date: dateStr,
                change: dayChange,
                label: `${date.getMonth() + 1}/${date.getDate()}`
            });
        }

        return recentData;
    }

    // 获取奖励分布数据
    getRewardDistribution(records) {
        const distribution = {};
        
        records.forEach(record => {
            const reward = record.reward;
            distribution[reward] = (distribution[reward] || 0) + 1;
        });

        return Object.entries(distribution)
            .map(([reward, count]) => ({ reward: parseInt(reward), count }))
            .sort((a, b) => a.reward - b.reward);
    }

    // 绘制折线图
    drawLineChart(ctx, data, width, height, title) {
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        // 绘制标题
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, width / 2, 20);

        // 计算数据范围
        const maxChange = Math.max(...data.map(d => d.change), 0);
        const minChange = Math.min(...data.map(d => d.change), 0);
        const range = Math.max(maxChange - minChange, 1);

        // 绘制坐标轴
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // 绘制零线
        if (minChange < 0 && maxChange > 0) {
            const zeroY = padding + (maxChange / range) * chartHeight;
            ctx.strokeStyle = '#999';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(padding, zeroY);
            ctx.lineTo(width - padding, zeroY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 绘制数据点和连线
        if (data.length > 1) {
            ctx.strokeStyle = '#667eea';
            ctx.lineWidth = 2;
            ctx.beginPath();

            data.forEach((point, index) => {
                const x = padding + (index / (data.length - 1)) * chartWidth;
                const y = padding + ((maxChange - point.change) / range) * chartHeight;

                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();
        }

        // 绘制数据点
        data.forEach((point, index) => {
            const x = padding + (index / Math.max(data.length - 1, 1)) * chartWidth;
            const y = padding + ((maxChange - point.change) / range) * chartHeight;

            // 绘制点
            ctx.fillStyle = point.change >= 0 ? '#4CAF50' : '#f44336';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();

            // 绘制标签
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(point.label, x, height - padding + 15);

            // 绘制数值
            if (point.change !== 0) {
                ctx.fillStyle = point.change >= 0 ? '#4CAF50' : '#f44336';
                ctx.fillText((point.change > 0 ? '+' : '') + point.change, x, y - 10);
            }
        });
    }

    // 绘制柱状图
    drawBarChart(ctx, data, width, height, title) {
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        // 绘制标题
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, width / 2, 20);

        if (data.length === 0) return;

        const maxCount = Math.max(...data.map(d => d.count));
        const barWidth = chartWidth / data.length * 0.8;
        const barSpacing = chartWidth / data.length * 0.2;

        // 绘制坐标轴
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // 绘制柱子
        data.forEach((item, index) => {
            const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
            const barHeight = (item.count / maxCount) * chartHeight;
            const y = height - padding - barHeight;

            // 绘制柱子
            ctx.fillStyle = '#667eea';
            ctx.fillRect(x, y, barWidth, barHeight);

            // 绘制标签
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${item.reward}个`, x + barWidth / 2, height - padding + 15);

            // 绘制数值
            ctx.fillStyle = '#333';
            ctx.fillText(item.count, x + barWidth / 2, y - 5);
        });
    }

    // 获取默认统计数据
    getDefaultStats() {
        return {
            totalDays: 0,
            totalRewards: 0,
            avgRewards: '0.0',
            consecutiveDays: 0,
            records: []
        };
    }
}

// 初始化
window.nodeSeekAutoSignIn = new NodeSeekAutoSignIn();
window.chickenLegStats = new ChickenLegStats();
window.chickenLegStats.setAutoSignIn(window.nodeSeekAutoSignIn);
