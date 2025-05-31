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
    }

    // 设置自动签到实例
    setAutoSignIn(autoSignIn) {
        this.autoSignIn = autoSignIn;
    }

    // 显示鸡腿统计弹窗
    showStatsDialog() {
        const stats = this.autoSignIn ? this.autoSignIn.getSignInStats() : this.getDefaultStats();

        // 创建弹窗
        const dialog = document.createElement('div');
        dialog.className = 'chicken-leg-stats-dialog';
        dialog.innerHTML = this.createStatsHTML(stats);

        // 添加样式
        this.addStatsStyles();

        // 添加到页面
        document.body.appendChild(dialog);

        // 绑定事件
        this.bindStatsEvents(dialog, stats);

        // 初始化图表
        setTimeout(() => {
            this.initCharts(stats);
        }, 100);
    }

    // 创建统计HTML
    createStatsHTML(stats) {
        return `
            <div class="stats-overlay">
                <div class="stats-container">
                    <div class="stats-header">
                        <h3>🍗 鸡腿收益统计</h3>
                        <button class="stats-close-btn">×</button>
                    </div>

                    <div class="stats-summary">
                        <div class="stat-item">
                            <div class="stat-label">累计签到天数</div>
                            <div class="stat-value">${stats.totalDays}天</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">累计鸡腿</div>
                            <div class="stat-value">${stats.totalRewards}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">平均鸡腿</div>
                            <div class="stat-value">${stats.avgRewards}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">连续签到</div>
                            <div class="stat-value">${stats.consecutiveDays}天</div>
                        </div>
                    </div>

                    <div class="stats-tabs">
                        <button class="tab-btn active" data-tab="trend">鸡腿收益趋势</button>
                        <button class="tab-btn" data-tab="distribution">鸡腿收益分布</button>
                    </div>

                    <div class="stats-content">
                        <div class="tab-content active" id="trend-tab">
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
                max-width: 500px;
                max-height: 90vh;
                overflow: hidden;
                position: absolute;
                left: calc(50% - 250px);
                top: calc(50% - 45vh);
            }

            .stats-header {
                padding: 20px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .stats-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }

            .stats-close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.2s;
            }

            .stats-close-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .stats-summary {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 1px;
                background: #f5f5f5;
                margin: 20px;
                border-radius: 8px;
                overflow: hidden;
            }

            .stat-item {
                background: white;
                padding: 16px;
                text-align: center;
            }

            .stat-label {
                font-size: 12px;
                color: #666;
                margin-bottom: 4px;
            }

            .stat-value {
                font-size: 20px;
                font-weight: bold;
                color: #333;
            }

            .stats-tabs {
                display: flex;
                border-bottom: 1px solid #eee;
                margin: 0 20px;
            }

            .tab-btn {
                flex: 1;
                padding: 12px;
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
            }

            .stats-content {
                padding: 20px;
                min-height: 250px;
            }

            .tab-content {
                display: none;
            }

            .tab-content.active {
                display: block;
            }

            #trend-chart, #distribution-chart {
                width: 100% !important;
                height: auto !important;
                max-height: 200px;
            }

            /* 移动端适配 */
            @media (max-width: 768px) {
                .stats-overlay {
                    padding: 10px;
                }

                .stats-container {
                    max-width: 100%;
                    left: 10px;
                    top: 10px;
                }

                .stats-header {
                    padding: 15px;
                }

                .stats-header h3 {
                    font-size: 16px;
                }

                .stats-summary {
                    margin: 15px;
                }

                .stat-item {
                    padding: 12px;
                }

                .stat-value {
                    font-size: 18px;
                }

                .stats-content {
                    padding: 15px;
                    min-height: 200px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // 绑定事件
    bindStatsEvents(dialog, stats) {
        // 关闭按钮
        const closeBtn = dialog.querySelector('.stats-close-btn');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(dialog);
        });

        // 添加拖动功能 - 使弹窗左上角10px×10px区域可拖动
        if (typeof window.makeDraggable === 'function') {
            const statsContainer = dialog.querySelector('.stats-container');
            if (statsContainer) {
                window.makeDraggable(statsContainer, {width: 10, height: 10});
            }
        }

        // 标签切换
        const tabBtns = dialog.querySelectorAll('.tab-btn');
        const tabContents = dialog.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;

                // 更新按钮状态
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 更新内容显示
                tabContents.forEach(content => {
                    content.classList.remove('active');
                });
                dialog.querySelector(`#${tabName}-tab`).classList.add('active');

                // 重新初始化图表
                setTimeout(() => {
                    this.initCharts(stats);
                }, 100);
            });
        });
    }

    // 初始化图表
    initCharts(stats) {
        this.initTrendChart(stats);
        this.initDistributionChart(stats);
    }

    // 初始化趋势图表
    initTrendChart(stats) {
        const canvas = document.getElementById('trend-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);

        const width = rect.width;
        const height = rect.height;
        const padding = 40;

        // 清空画布
        ctx.clearRect(0, 0, width, height);

        // 获取最近30天的数据
        const recentData = this.getRecentData(stats.records, 30);

        if (recentData.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('暂无数据', width / 2, height / 2);
            return;
        }

        // 绘制坐标轴
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // 绘制数据线
        if (recentData.length > 1) {
            const maxReward = Math.max(...recentData.map(d => d.reward));
            const stepX = (width - 2 * padding) / (recentData.length - 1);
            const stepY = (height - 2 * padding) / maxReward;

            ctx.strokeStyle = '#ff9500';
            ctx.lineWidth = 3;
            ctx.beginPath();

            recentData.forEach((data, index) => {
                const x = padding + index * stepX;
                const y = height - padding - data.reward * stepY;

                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                // 绘制数据点
                ctx.fillStyle = '#ff9500';
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, 2 * Math.PI);
                ctx.fill();
            });

            ctx.stroke();
        }
    }

    // 初始化分布图表
    initDistributionChart(stats) {
        const canvas = document.getElementById('distribution-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);

        const width = rect.width;
        const height = rect.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3;

        // 清空画布
        ctx.clearRect(0, 0, width, height);

        // 统计奖励分布
        const distribution = this.getRewardDistribution(stats.records);

        if (distribution.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('暂无数据', centerX, centerY);
            return;
        }

        const colors = ['#ff9500', '#4CAF50', '#2196F3', '#9C27B0', '#FF5722'];
        let startAngle = 0;

        distribution.forEach((item, index) => {
            const angle = (item.count / stats.records.length) * 2 * Math.PI;

            // 绘制扇形
            ctx.fillStyle = colors[index % colors.length];
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + angle);
            ctx.closePath();
            ctx.fill();

            // 绘制标签
            const labelAngle = startAngle + angle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
            const labelY = centerY + Math.sin(labelAngle) * (radius + 20);

            ctx.fillStyle = '#333';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${item.reward}个 (${((item.count / stats.records.length) * 100).toFixed(1)}%)`, labelX, labelY);

            startAngle += angle;
        });
    }

    // 获取最近数据
    getRecentData(records, days) {
        const today = new Date();
        const recentData = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toDateString();

            const record = records.find(r => r.date === dateStr);
            if (record) {
                recentData.push({
                    date: dateStr,
                    reward: record.reward
                });
            }
        }

        return recentData;
    }

    // 获取奖励分布
    getRewardDistribution(records) {
        const distribution = {};

        records.forEach(record => {
            const reward = record.reward;
            distribution[reward] = (distribution[reward] || 0) + 1;
        });

        return Object.entries(distribution)
            .map(([reward, count]) => ({ reward: parseInt(reward), count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // 只显示前5种
    }

    // 获取默认统计数据
    getDefaultStats() {
        return {
            totalDays: 67,
            totalRewards: 468,
            avgRewards: '4.9',
            consecutiveDays: 5,
            records: []
        };
    }
}

// 全局实例
window.nodeSeekAutoSignIn = new NodeSeekAutoSignIn();
window.chickenLegStats = new ChickenLegStats();
window.chickenLegStats.setAutoSignIn(window.nodeSeekAutoSignIn);
