// ========== 鸡腿统计 ==========
(function() {
    'use strict';

    // 定义一个引用 addLog 的函数，以便在 Register.js 中调用
    let _addLog = console.log; // 默认使用 console.log

    // 用于从外部设置 addLog 函数的引用
    function setAddLogFunction(func) {
        _addLog = func;
    }

    // 获取页面主内容文本，排除日志和弹窗区域
    function getPageMainText() {
        // 克隆 body
        const bodyClone = document.body.cloneNode(true);
        // 移除弹窗
        const dialogs = bodyClone.querySelectorAll('#logs-dialog, #blacklist-dialog, #friends-dialog, #favorites-dialog, #chicken-leg-stats-dialog');
        dialogs.forEach(d => d.remove());
        return bodyClone.textContent || '';
    }



    // ========== 鸡腿统计功能 ==========
    let chickenLegTimeoutId = null;
    const CHICKEN_LEG_MIN_INTERVAL = 30; // 秒
    const CHICKEN_LEG_MAX_INTERVAL = 50; // 秒
    const CHICKEN_LEG_LAST_FETCH_KEY = 'nodeseek_chicken_leg_last_fetch';
    const CHICKEN_LEG_NEXT_ALLOW_KEY = 'nodeseek_chicken_leg_next_allow';
    const CHICKEN_LEG_LAST_HTML_KEY = 'nodeseek_chicken_leg_last_html';
    const CHICKEN_LEG_HISTORY_KEY = 'nodeseek_chicken_leg_history';

    function showChickenLegStatsDialog() {
        const dialogId = 'chicken-leg-stats-dialog';
        const existingDialog = document.getElementById(dialogId);
        if (existingDialog) {
            existingDialog.remove();
            if (chickenLegTimeoutId) {
                clearTimeout(chickenLegTimeoutId);
                chickenLegTimeoutId = null;
            }
            return;
        }

        const dialog = document.createElement('div');
        dialog.id = dialogId;
        dialog.style.position = 'fixed';
        dialog.style.zIndex = 10000;
        dialog.style.background = '#fff';
        dialog.style.border = '1px solid #ccc';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        dialog.style.padding = '0 20px 12px 20px';
        if (window.innerWidth > 767) {
            dialog.style.width = '600px';
        }
        dialog.style.maxHeight = '80vh';
        dialog.style.overflowY = 'auto';

        // 居中显示弹窗，且避免与其他弹窗重叠
        let initialTopPercent = 50;
        if (document.getElementById('logs-dialog')) {
            initialTopPercent = 55;
        }
        dialog.style.left = '50%';
        dialog.style.top = initialTopPercent + '%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.right = 'auto';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.paddingBottom = '10px';
        header.style.alignItems = 'center';
        header.style.height = '32px';
        header.style.fontWeight = 'bold';
        header.style.fontSize = '16px';
        header.style.paddingLeft = '2px';
        header.style.background = '#fff';
        header.style.borderBottom = '1px solid #eee';
        header.style.position = 'sticky';
        header.style.top = '0';
        header.style.zIndex = '10';

        const title = document.createElement('div');
        title.textContent = '鸡腿统计';
        title.style.marginTop = '4px';

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.position = 'absolute';
        closeBtn.style.right = '12px';
        closeBtn.style.top = '8px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '20px';
        closeBtn.className = 'close-btn';
        closeBtn.onclick = function() {
            dialog.remove();
            if (chickenLegTimeoutId) {
                clearTimeout(chickenLegTimeoutId);
                chickenLegTimeoutId = null;
            }
        };

        header.appendChild(title);
        header.appendChild(closeBtn);
        dialog.appendChild(header);

        // 左上角拖动区域
        const dragCorner = document.createElement('div');
        dragCorner.style.position = 'fixed';
        dragCorner.style.width = '30px';
        dragCorner.style.height = '30px';
        dragCorner.style.cursor = 'move';
        dragCorner.title = '拖动';
        dragCorner.style.zIndex = '10002';
        document.body.appendChild(dragCorner);

        // 动态定位dragCorner到dialog左上角
        function updateDragCornerPosition() {
            const rect = dialog.getBoundingClientRect();
            dragCorner.style.left = rect.left + 'px';
            dragCorner.style.top = rect.top + 'px';
        }
        setTimeout(updateDragCornerPosition, 0);
        window.addEventListener('resize', updateDragCornerPosition);
        window.addEventListener('scroll', updateDragCornerPosition, true);
        dialog.addEventListener('scroll', updateDragCornerPosition);

        // 在弹窗移动后也要更新dragCorner位置
        function makeDraggableByCorner(dialog, dragArea) {
            let isDragging = false;
            let initialMouseX, initialMouseY;
            let initialDialogX, initialDialogY;

            dragArea.addEventListener('mousedown', function(e) {
                isDragging = true;
                initialMouseX = e.clientX;
                initialMouseY = e.clientY;
                const rect = dialog.getBoundingClientRect();
                dialog.style.transform = '';
                dialog.style.left = rect.left + 'px';
                dialog.style.top = rect.top + 'px';
                dialog.style.right = 'auto';
                initialDialogX = rect.left;
                initialDialogY = rect.top;
                document.body.classList.add('dragging-active');
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                e.preventDefault();
            });

            function onMouseMove(e) {
                if (!isDragging) return;
                const dx = e.clientX - initialMouseX;
                const dy = e.clientY - initialMouseY;
                dialog.style.left = (initialDialogX + dx) + 'px';
                dialog.style.top = (initialDialogY + dy) + 'px';
                dialog.style.right = 'auto';
                updateDragCornerPosition();
            }

            function onMouseUp() {
                isDragging = false;
                document.body.classList.remove('dragging-active');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            dragArea.addEventListener('mouseenter', function() {
                dragArea.style.cursor = 'move';
            });
            dragArea.addEventListener('mouseleave', function() {
                dragArea.style.cursor = 'default';
            });
        }
        makeDraggableByCorner(dialog, dragCorner);
        setTimeout(updateDragCornerPosition, 100);

        const contentArea = document.createElement('div');
        contentArea.style.background = '#fff';
        contentArea.style.padding = '0';
        contentArea.style.borderRadius = '4px';
        contentArea.style.maxHeight = '60vh';
        contentArea.style.overflowY = 'auto';
        dialog.appendChild(contentArea);

        // 区间筛选UI
        const filterBar = document.createElement('div');
        filterBar.style.display = 'flex';
        filterBar.style.alignItems = 'center';
        filterBar.style.margin = '10px 0 10px 0';

        // 拉取区间数据按钮和进度
        const fetchRangeBtn = document.createElement('button');
        fetchRangeBtn.innerHTML = '拉取<br>数据'; // 上下两行显示
        fetchRangeBtn.style.padding = '8px 12px'; // Adjusted padding for buttons
        fetchRangeBtn.style.fontSize = '14px';
        fetchRangeBtn.style.background = '#28a745';
        fetchRangeBtn.style.color = 'white';
        fetchRangeBtn.style.border = 'none';
        fetchRangeBtn.style.borderRadius = '3px';
        fetchRangeBtn.style.cursor = 'pointer';
        fetchRangeBtn.style.textAlign = 'center';
        fetchRangeBtn.style.lineHeight = '1.1';
        const fetchRangeStatus = document.createElement('span');
        fetchRangeStatus.style.marginLeft = '10px'; // Keep this style for now
        fetchRangeStatus.style.color = '#d00';

        // Function to update the fetch button's state and countdown
        function updateFetchButtonState() {
            const nextAllowTime = parseInt(localStorage.getItem(CHICKEN_LEG_NEXT_ALLOW_KEY) || '0');
            const now = Date.now();

            if (now < nextAllowTime) {
                fetchRangeBtn.disabled = true;
                let remainingSeconds = Math.ceil((nextAllowTime - now) / 1000);
                fetchRangeStatus.textContent = `请等待 ${remainingSeconds} 秒后再次拉取`;
                // Set a timeout to update the countdown
                if (chickenLegTimeoutId) clearTimeout(chickenLegTimeoutId); // Clear previous timeout
                chickenLegTimeoutId = setTimeout(updateFetchButtonState, 1000); // Update every second
            } else {
                fetchRangeBtn.disabled = false;
                fetchRangeStatus.textContent = '';
                if (chickenLegTimeoutId) {
                    clearTimeout(chickenLegTimeoutId);
                    chickenLegTimeoutId = null;
                }
            }
        }

        // Initial update when the dialog opens
        updateFetchButtonState();

        // 清除本地数据按钮
        const clearBtn = document.createElement('button');
        clearBtn.innerHTML = '清除<br>数据'; // 上下两行显示
        clearBtn.style.padding = '8px 12px'; // Adjusted padding for buttons
        clearBtn.style.fontSize = '14px';
        clearBtn.style.background = '#f44336';
        clearBtn.style.color = 'white';
        clearBtn.style.border = 'none';
        clearBtn.style.borderRadius = '3px';
        clearBtn.style.cursor = 'pointer';
        clearBtn.style.textAlign = 'center';
        clearBtn.style.lineHeight = '1.1';

        const startInput = document.createElement('input');
        startInput.type = 'date';
        startInput.style.padding = '6px 6px'; // Adjusted padding for inputs
        startInput.style.fontSize = '14px';
        startInput.style.border = '1px solid #ccc';
        startInput.style.borderRadius = '3px';
        startInput.title = '起始日期';

        const endInput = document.createElement('input');
        endInput.type = 'date';
        endInput.style.padding = '6px 6px'; // Adjusted padding for inputs
        endInput.style.fontSize = '14px';
        endInput.style.border = '1px solid #ccc';
        endInput.style.borderRadius = '3px';
        endInput.title = '结束日期';
        // 默认填写当前日期
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        endInput.value = `${year}-${month}-${day}`;

        // 默认填写起始日期为结束日期减去一年
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        const startYear = oneYearAgo.getFullYear();
        const startMonth = String(oneYearAgo.getMonth() + 1).padStart(2, '0');
        const startDay = String(oneYearAgo.getDate()).padStart(2, '0');
        startInput.value = `${startYear}-${startMonth}-${startDay}`;

        // Create a wrapper for fetch and clear buttons
        const buttonsWrapper = document.createElement('div');
        buttonsWrapper.style.display = 'flex';
        buttonsWrapper.style.gap = '8px';
        buttonsWrapper.style.marginRight = '20px'; // Add margin to separate from date inputs
        buttonsWrapper.appendChild(fetchRangeBtn);
        buttonsWrapper.appendChild(clearBtn);

        // Create a wrapper for '起始日期' and startInput
        const startDateWrapper = document.createElement('div');
        startDateWrapper.style.display = 'flex';
        startDateWrapper.style.alignItems = 'center';
        startDateWrapper.style.gap = '4px';
        startDateWrapper.style.marginRight = '12px'; // Smaller margin to separate from end date
        startDateWrapper.style.marginLeft = '-7px'; // 向左移动7px
        const startDateLabel = document.createElement('span'); // Use span for text node
        startDateLabel.textContent = '起始日期:';
        startDateLabel.style.whiteSpace = 'nowrap'; // Prevent wrapping
        startDateWrapper.appendChild(startDateLabel);
        startDateWrapper.appendChild(startInput);

        // Create a wrapper for '结束日期' and endInput
        const endDateWrapper = document.createElement('div');
        endDateWrapper.style.display = 'flex';
        endDateWrapper.style.alignItems = 'center';
        endDateWrapper.style.gap = '4px';
        endDateWrapper.style.marginLeft = '-7px'; // 向左移动7px
        const endDateLabel = document.createElement('span'); // Use span for text node
        endDateLabel.textContent = '结束日期:';
        endDateLabel.style.whiteSpace = 'nowrap'; // Prevent wrapping
        endDateWrapper.appendChild(endDateLabel);
        endDateWrapper.appendChild(endInput);

        filterBar.appendChild(buttonsWrapper);
        filterBar.appendChild(startDateWrapper);
        filterBar.appendChild(endDateWrapper);
        // 重新引入筛选按钮
        const filterBtn = document.createElement('button');
        filterBtn.textContent = '筛选';
        filterBtn.style.padding = '8px 12px'; // Adjusted padding for buttons
        filterBtn.style.fontSize = '14px';
        filterBtn.style.background = '#007bff'; // 蓝色
        filterBtn.style.color = 'white';
        filterBtn.style.border = 'none';
        filterBtn.style.borderRadius = '3px';
        filterBtn.style.cursor = 'pointer';
        filterBtn.style.marginLeft = 'auto'; // Push to the right
        filterBar.appendChild(filterBtn);

        dialog.appendChild(filterBar);

        // New: Status message container, placed below filterBar
        const fetchStatusContainer = document.createElement('div');
        fetchStatusContainer.style.margin = '8px 0';
        fetchStatusContainer.style.fontSize = '13px';
        fetchStatusContainer.style.textAlign = 'center';
        fetchStatusContainer.appendChild(fetchRangeStatus); // Move status span here
        dialog.appendChild(fetchStatusContainer);

        // ========== 统计信息区 ==========
        const statsDiv = document.createElement('div');
        statsDiv.style.margin = '8px 0 8px 0';
        statsDiv.style.fontSize = '14px';
        statsDiv.style.fontWeight = 'bold';
        dialog.appendChild(statsDiv);

        // ========== 渲染表格和统计 ==========
        function renderTableAndStats(dataArr) {
            // 分类统计
            let beTouw = 0, beTouwCount = 0;
            let touw = 0, touwCount = 0;
            const reasonMap = new Map();
            // 签到天数统计
            const signDaysSet = new Set();
            dataArr.forEach(item => {
                let reason = item[2] || '未知';
                const change = Number(item[0]);
                // 签到天数统计
                if (reason.includes('签到收益')) {
                    // 取日期部分
                    let dateStr = String(item[3]).trim();
                    let d = null;
                    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                        dateStr = dateStr.replace(' ', 'T') + 'Z';
                        d = new Date(dateStr);
                    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                        dateStr = dateStr + 'Z';
                        d = new Date(dateStr);
                    } else {
                        d = new Date(dateStr);
                    }
                    if (!isNaN(d.getTime())) {
                        const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        signDaysSet.add(dayStr);
                    }
                }
                // 分开统计投喂鸡腿
                if (reason.includes('投喂鸡腿')) {
                    if (reason.includes('被') && change > 0) {
                        beTouw += change;
                        beTouwCount += 1;
                        return;
                    } else if (!reason.includes('被') && change < 0) {
                        touw += change;
                        touwCount += 1;
                        return;
                    }
                }
                // 其他理由正常统计
                if (!reasonMap.has(reason)) {
                    reasonMap.set(reason, { total: 0, count: 0 });
                }
                reasonMap.get(reason).total += change;
                reasonMap.get(reason).count += 1;
            });
            // 提取签到收益N个鸡腿，排序
            const signInReasons = [];
            const otherReasons = [];
            reasonMap.forEach((v, k) => {
                const match = k.match(/^签到收益(\d+)个鸡腿$/);
                if (match) {
                    signInReasons.push({ reason: k, n: parseInt(match[1]), ...v });
                } else {
                    otherReasons.push({ reason: k, ...v });
                }
            });
            signInReasons.sort((a, b) => a.n - b.n);
            // 美化输出为表格
            let reasonStats = '<div style="margin-bottom:8px;font-weight:bold;">分类统计：</div>';
            // 签到天数统计展示
            let currentStreak = 0, maxStreak = 0;
            if (signDaysSet.size > 0) {
                // 转为排序数组
                const daysArr = Array.from(signDaysSet).sort(); // yyyy-MM-dd 升序
                let streak = 1;
                maxStreak = 1;
                let lastDate = new Date(daysArr[0]);
                for (let i = 1; i < daysArr.length; i++) {
                    const curDate = new Date(daysArr[i]);
                    const diff = (curDate - lastDate) / (24 * 3600 * 1000);
                    if (diff === 1) {
                        streak++;
                    } else {
                        streak = 1;
                    }
                    if (streak > maxStreak) maxStreak = streak;
                    lastDate = curDate;
                }
                // 当前连续签到天数
                // 从最后一天往前推
                currentStreak = 1;
                for (let i = daysArr.length - 1; i > 0; i--) {
                    const curDate = new Date(daysArr[i]);
                    const prevDate = new Date(daysArr[i - 1]);
                    const diff = (curDate - prevDate) / (24 * 3600 * 1000);
                    if (diff === 1) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }
            }
            // 计算签到收益平均鸡腿数
            let totalSignInChickenLegs = 0;
            let totalSignInCount = 0;
            signInReasons.forEach(v => {
                totalSignInChickenLegs += v.total;
                totalSignInCount += v.count;
            });
            const averageChickenLegs = totalSignInCount > 0 ? (totalSignInChickenLegs / totalSignInCount).toFixed(2) : '0.00';
            
            reasonStats += `<div style=\"margin-bottom:8px;font-weight:normal;color:#2ea44f;font-size:12px;white-space:nowrap;\">累计签到天数：<b>${signDaysSet.size}</b> 天`;
            reasonStats += `，当前连续签到：<b>${currentStreak}</b> 天，历史最长连续签到：<b>${maxStreak}</b> 天`;
            reasonStats += `，签到收益平均：<b>${averageChickenLegs}</b> 个鸡腿/次</div>`;
            reasonStats += '<table style="width:100%;border-collapse:collapse;font-size:14px;">';
            reasonStats += '<thead><tr style="background:#f5f5f5;"><th style="padding:6px 8px;border:1px solid #eee;">分类</th><th style="padding:6px 8px;border:1px solid #eee;">总变动</th><th style="padding:6px 8px;border:1px solid #eee;">次数</th></tr></thead><tbody>';
            const addRow = (name, total, count) => {
              reasonStats += `<tr>
                <td style="padding:6px 8px;border:1px solid #eee;font-weight:bold;">${name}</td>
                <td style="padding:6px 8px;border:1px solid #eee;color:${total>0?'#2ea44f':(total<0?'#d00':'#333')};font-weight:bold;">${total}</td>
                <td style="padding:6px 8px;border:1px solid #eee;">${count}</td>
              </tr>`;
            };
            if (beTouwCount > 0) addRow('被投喂鸡腿', beTouw, beTouwCount);
            if (touwCount > 0) addRow('主动投喂鸡腿', touw, touwCount);
            otherReasons.forEach(v => addRow(v.reason, v.total, v.count));
            signInReasons.forEach(v => addRow(v.reason, v.total, v.count));
            reasonStats += '</tbody></table>';
            statsDiv.innerHTML = reasonStats;

            // 渲染表格
            contentArea.innerHTML = '';
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.border = '1px solid #ccc';
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            const headers = ['鸡腿变动', '鸡腿总计', '理由', '时间'];
            headers.forEach(text => {
                const th = document.createElement('th');
                th.textContent = text;
                th.style.padding = '8px';
                th.style.border = '1px solid #eee';
                th.style.textAlign = 'left';
                th.style.backgroundColor = '#f0f0f0';
                th.style.position = 'sticky';
                th.style.top = '0';
                th.style.zIndex = '1';
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);
            const tbody = document.createElement('tbody');
            dataArr.forEach(item => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #eee';
                const change = item[0] !== undefined ? String(item[0]) : '';
                const total = item[1] !== undefined ? String(item[1]) : '';
                const reason = item[2] !== undefined ? String(item[2]) : '';
                // 时间格式化为中国时间
                let cnTime = '';
                if (item[3]) {
                    let dateStr = String(item[3]).trim();
                    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                        dateStr = dateStr.replace(' ', 'T') + 'Z';
                    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                        dateStr = dateStr + 'Z';
                    }
                    const utcDate = new Date(dateStr);
                    if (!isNaN(utcDate.getTime())) {
                        cnTime = utcDate.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' })
                            .replace(/\//g, '-')
                            .replace(/\b(\d)\b/g, '0$1');
                        cnTime = cnTime.replace(/(\d{4})-(\d{1,2})-(\d{1,2})[\sT]+(\d{1,2}):(\d{1,2}):(\d{1,2})/, function(_, y, m, d, h, min, s) {
                            return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0') + ' ' + String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0') + ':' + String(s).padStart(2, '0');
                        });
                    } else {
                        cnTime = '';
                    }
                }
                [change, total, reason, cnTime].forEach((cellText, index) => {
                    const td = document.createElement('td');
                    td.textContent = cellText;
                    td.style.padding = '8px';
                    td.style.border = '1px solid #eee';
                    td.style.verticalAlign = 'top';
                    if (index === 0 || index === 1) {
                        td.style.textAlign = 'right';
                    } else {
                        td.style.textAlign = 'left';
                    }
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            contentArea.appendChild(table);
        }

        // 加载历史数据并初始化
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem(CHICKEN_LEG_HISTORY_KEY) || '[]');
        } catch (e) { history = []; }
        // 按时间降序
        history.sort((a, b) => new Date(b[3]) - new Date(a[3]));
        renderTableAndStats(history);
        // 自动设置起止日期为本地数据最早和最晚时间
        if (history.length > 0) {
            let minDate = null, maxDate = null, minDateStr = '', maxDateStr = '';
            history.forEach(item => {
                let dateStr = String(item[3]).trim();
                if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                    dateStr = dateStr.replace(' ', 'T') + 'Z';
                } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                    dateStr = dateStr + 'Z';
                }
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return;
                if (!minDate || d < minDate) { minDate = d; minDateStr = item[3]; }
                if (!maxDate || d > maxDate) { maxDate = d; maxDateStr = item[3]; }
            });
            function toDateInputStr(dateStr) {
                if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                    dateStr = dateStr.replace(' ', 'T') + 'Z';
                } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                    dateStr = dateStr + 'Z';
                }
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return '';
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
            startInput.value = toDateInputStr(minDateStr);
            endInput.value = toDateInputStr(maxDateStr);
        }

        // ========== 筛选按钮事件 ==========
        filterBtn.onclick = function() {
            // 每次筛选时都重新从 localStorage 获取最新的历史数据
            let currentHistory = [];
            try {
                currentHistory = JSON.parse(localStorage.getItem(CHICKEN_LEG_HISTORY_KEY) || '[]');
            } catch (e) { currentHistory = []; }
            
            const start = startInput.value ? new Date(startInput.value + 'T00:00:00') : null;
            const end = endInput.value ? new Date(endInput.value + 'T23:59:59') : null;
            const filtered = currentHistory.filter(item => {
                if (!item[3]) return false;
                let dateStr = String(item[3]).trim();
                if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                    dateStr = dateStr.replace(' ', 'T') + 'Z';
                } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                    dateStr = dateStr + 'Z';
                }
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return false;
                if (start && d < start) return false;
                if (end && d > end) return false;
                return true;
            });
            // 按时间降序排列
            filtered.sort((a, b) => new Date(b[3]) - new Date(a[3]));
            renderTableAndStats(filtered);
        };

        document.body.appendChild(dialog);

        // ========== 拉取区间数据 ==========
        fetchRangeBtn.onclick = async function() {
            const nextAllowTime = parseInt(localStorage.getItem(CHICKEN_LEG_NEXT_ALLOW_KEY) || '0');
            const now = Date.now();

            if (now < nextAllowTime) {
                // Should already be disabled, but double check
                updateFetchButtonState();
                return;
            }

            // Set cooldown
            const ONE_MINUTE = 60 * 1000;
            localStorage.setItem(CHICKEN_LEG_LAST_FETCH_KEY, now.toString());
            localStorage.setItem(CHICKEN_LEG_NEXT_ALLOW_KEY, (now + ONE_MINUTE).toString());

            fetchRangeBtn.disabled = true;
            fetchRangeStatus.textContent = '正在拉取...';
            // Stop existing countdown if any
            if (chickenLegTimeoutId) {
                clearTimeout(chickenLegTimeoutId);
                chickenLegTimeoutId = null;
            }

            // 1. 先读取本地数据，找出本地已有的唯一key集合
            let history = [];
            try {
                history = JSON.parse(localStorage.getItem(CHICKEN_LEG_HISTORY_KEY) || '[]');
            } catch (e) { history = []; }
            const localKeySet = new Set();
            history.forEach(item => {
                if (item && item.length === 4) {
                    const key = item[3] + '|' + item[2] + '|' + item[0];
                    localKeySet.add(key);
                }
            });
            let allData = [];
            let emptyCount = 0;
            let shouldStop = false;
            let finalStatusMessage = ''; // To store the final message

            for (let page = 1; page <= 100 && !shouldStop; page++) {
                fetchRangeStatus.textContent = `正在拉取第${page}页...`;
                try {
                    const resp = await fetch(`https://www.nodeseek.com/api/account/credit/page-${page}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json, text/plain, */*',
                            'User-Agent': navigator.userAgent,
                        },
                        credentials: 'same-origin',
                    });
                    if (!resp.ok) {
                         // If API returns non-ok status, stop fetching and report error
                         finalStatusMessage = `拉取失败：HTTP 错误 ${resp.status}`;
                         shouldStop = true; // Stop loop and go to final message display
                         break;
                    }
                    const json = await resp.json();
                    if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
                        emptyCount++;
                        if (emptyCount >= 2) break;
                        continue;
                    }
                    emptyCount = 0;
                    for (const item of json.data) {
                        if (item && item.length === 4) {
                            const key = item[3] + '|' + item[2] + '|' + item[0];
                            if (localKeySet.has(key)) {
                                shouldStop = true;
                                break;
                            }
                            allData.push(item);
                        }
                    }
                } catch (e) {
                    finalStatusMessage = `拉取失败：第${page}页拉取失败：${e.message}`;
                    shouldStop = true; // Stop loop and go to final message display
                    break;
                }
                await new Promise(r => setTimeout(r, 300));
            }

            // After the loop, determine final message and display for 3 seconds
            if (finalStatusMessage === '') { // No error occurred during fetching
                if (allData.length > 0) {
                    saveChickenLegHistory(allData);
                    finalStatusMessage = `拉取完成，共${allData.length}条，已保存。`;
                    // 刷新历史和表格
                    try {
                        history = JSON.parse(localStorage.getItem(CHICKEN_LEG_HISTORY_KEY) || '[]');
                    } catch (e) { history = []; }
                    history.sort((a, b) => new Date(b[3]) - new Date(a[3]));
                    renderTableAndStats(history);
                    // 自动设置起止日期为本地数据最早和最晚时间
                    if (history.length > 0) {
                        // 遍历找最早和最晚的日期
                        let minDate = null, maxDate = null, minDateStr = '', maxDateStr = '';
                        history.forEach(item => {
                            let dateStr = String(item[3]).trim();
                            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                                dateStr = dateStr.replace(' ', 'T') + 'Z';
                            } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                                dateStr = dateStr + 'Z';
                            }
                            const d = new Date(dateStr);
                            if (isNaN(d.getTime())) return;
                            if (!minDate || d < minDate) { minDate = d; minDateStr = item[3]; }
                            if (!maxDate || d > maxDate) { maxDate = d; maxDateStr = item[3]; }
                        });
                        function toDateInputStr(dateStr) {
                            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                                dateStr = dateStr.replace(' ', 'T') + 'Z';
                            } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                                dateStr = dateStr + 'Z';
                            }
                            const d = new Date(dateStr);
                            if (isNaN(d.getTime())) return '';
                            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        }
                        startInput.value = toDateInputStr(minDateStr);
                        endInput.value = toDateInputStr(maxDateStr);
                    }
                } else {
                    finalStatusMessage = '未获取到任何数据。';
                }
            }

            fetchRangeStatus.textContent = finalStatusMessage;
            setTimeout(() => {
                updateFetchButtonState(); // This will show the cooldown or re-enable the button
            }, 3000);
        };

        // ========== 清除本地数据 ==========
        clearBtn.onclick = function() {
            if (confirm('确定要清除所有本地鸡腿历史数据吗？此操作不可恢复！')) {
                localStorage.removeItem(CHICKEN_LEG_HISTORY_KEY);
                fetchRangeStatus.textContent = '本地数据已清除';
                // 刷新历史和表格
                history = [];
                renderTableAndStats(history);
            }
        };

        if (window.innerWidth <= 767) {
            dialog.style.position = 'fixed';
            dialog.style.width = '96%';
            dialog.style.minWidth = 'unset';
            dialog.style.maxWidth = '96%';
            dialog.style.left = '2%';
            dialog.style.right = '2%';
            dialog.style.top = '10px';
            dialog.style.transform = 'none';
            dialog.style.borderRadius = '10px';
            dialog.style.maxHeight = '88vh';
            dialog.style.padding = '12px 8px 8px 8px';
            dialog.style.overflowY = 'auto';
            // 关闭按钮
            closeBtn.style.right = '8px';
            closeBtn.style.top = '5px';
            closeBtn.style.fontSize = '24px';
            closeBtn.style.width = '30px';
            closeBtn.style.height = '30px';
            closeBtn.style.lineHeight = '30px';
            closeBtn.style.textAlign = 'center';
            // 按钮
            fetchRangeBtn.style.fontSize = '16px';
            fetchRangeBtn.style.padding = '8px 16px';
            clearBtn.style.fontSize = '16px';
            clearBtn.style.padding = '8px 16px';
            filterBtn.style.fontSize = '16px';
            filterBtn.style.padding = '8px 16px';
            // 输入框
            startInput.style.fontSize = '16px';
            startInput.style.padding = '6px 8px';
            endInput.style.fontSize = '16px';
            endInput.style.padding = '6px 8px';
            // 筛选栏竖排
            filterBar.style.flexDirection = 'column';
            filterBar.style.alignItems = 'stretch';
            filterBar.style.gap = '6px';
            // 表格卡片化
            contentArea.style.padding = '0';
            contentArea.style.overflowX = 'auto';
            // statsDiv字体
            statsDiv.style.fontSize = '15px';
        }
    }

    // 鸡腿数据获取和保存辅助函数
    async function fetchChickenLegData(contentArea) {
        _addLog(`正在获取鸡腿统计页面内容...`);
        contentArea.innerHTML = `正在加载...`;
        try {
            const response = await fetch('https://www.nodeseek.com/api/account/credit/page-1', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'User-Agent': navigator.userAgent,
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`HTTP 错误！状态码: ${response.status}`);
            }

            const jsonData = await response.json();

            if (jsonData.success && Array.isArray(jsonData.data)) {
                contentArea.innerHTML = '';
                // 保存历史数据
                saveChickenLegHistory(jsonData.data);
                const table = document.createElement('table');
                table.style.width = '100%';
                table.style.borderCollapse = 'collapse';
                table.style.border = '1px solid #ccc';
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                const headers = ['鸡腿变动', '鸡腿总计', '理由', '时间'];
                headers.forEach(text => {
                    const th = document.createElement('th');
                    th.textContent = text;
                    th.style.padding = '8px';
                    th.style.border = '1px solid #eee';
                    th.style.textAlign = 'left';
                    th.style.backgroundColor = '#f0f0f0';
                    th.style.position = 'sticky';
                    th.style.top = '0';
                    th.style.zIndex = '1';
                    headerRow.appendChild(th);
                });
                thead.appendChild(headerRow);
                table.appendChild(thead);
                const tbody = document.createElement('tbody');
                jsonData.data.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid #eee';
                    const change = item[0] !== undefined ? String(item[0]) : '';
                    const total = item[1] !== undefined ? String(item[1]) : '';
                    const reason = item[2] !== undefined ? String(item[2]) : '';
                    const timestamp = item[3] !== undefined ? String(item[3]).replace('T', ' ').slice(0, 19) : '';
                    // 转换为中国时间（东八区）
                    let cnTime = '';
                    if (item[3]) {
                        let dateStr = String(item[3]).trim();
                        // "2025-06-01 03:07:41" => "2025-06-01T03:07:41Z"
                        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                            dateStr = dateStr.replace(' ', 'T') + 'Z';
                        } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                            dateStr = dateStr + 'Z';
                        }
                        const utcDate = new Date(dateStr);
                        if (!isNaN(utcDate.getTime())) {
                            cnTime = utcDate.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' })
                                .replace(/\//g, '-')
                                .replace(/\b(\d)\b/g, '0$1');
                            cnTime = cnTime.replace(/(\d{4})-(\d{1,2})-(\d{1,2})[\sT]+(\d{1,2}):(\d{1,2}):(\d{1,2})/, function(_, y, m, d, h, min, s) {
                                return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0') + ' ' + String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0') + ':' + String(s).padStart(2, '0');
                            });
                        } else {
                            cnTime = '';
                        }
                    }
                    [change, total, reason, cnTime].forEach((cellText, index) => {
                        const td = document.createElement('td');
                        td.textContent = cellText;
                        td.style.padding = '8px';
                        td.style.border = '1px solid #eee';
                        td.style.verticalAlign = 'top';
                        if (index === 0 || index === 1) {
                            td.style.textAlign = 'right';
                        } else {
                            td.style.textAlign = 'left';
                        }
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                contentArea.appendChild(table);
                localStorage.setItem(CHICKEN_LEG_LAST_HTML_KEY, contentArea.innerHTML);
                _addLog('鸡腿统计数据已成功获取并展示。');
            } else {
                contentArea.textContent = 'API响应数据格式不正确或无数据。';
                _addLog('获取鸡腿统计页面成功，但API响应数据格式不正确或无数据。');
                console.log('API响应数据：', jsonData);
            }
        } catch (error) {
            _addLog(`获取鸡腿统计页面失败: ${error.message}`);
            contentArea.textContent = `加载失败: ${error.message}. 请检查网络或Cloudflare阻拦。`;
        }
    }

    // 保存历史鸡腿数据
    function saveChickenLegHistory(newDataArr) {
        const MAX_HISTORY_COUNT = 2000; // 最大保留2000条数据
        
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem(CHICKEN_LEG_HISTORY_KEY) || '[]');
        } catch (e) { history = []; }
        
        const map = new Map();
        history.forEach(item => {
            if (item && item.length === 4) {
                const key = item[3] + '|' + item[2] + '|' + item[0];
                map.set(key, item);
            }
        });
        
        newDataArr.forEach(item => {
            if (item && item.length === 4) {
                const key = item[3] + '|' + item[2] + '|' + item[0];
                map.set(key, item);
            }
        });
        
        let merged = Array.from(map.values());
        
        // 如果数据超过2000条，按时间排序并删除最老的数据
        if (merged.length > MAX_HISTORY_COUNT) {
            // 按时间排序（item[3]是时间字段），最新的在前
            merged.sort((a, b) => {
                const timeA = new Date(a[3]).getTime();
                const timeB = new Date(b[3]).getTime();
                return timeB - timeA; // 降序排列，最新的在前
            });
            
            // 只保留最新的2000条数据
            merged = merged.slice(0, MAX_HISTORY_COUNT);
            
            // 记录删除的数据条数
            const deletedCount = map.size - MAX_HISTORY_COUNT;
            if (deletedCount > 0) {
                _addLog(`鸡腿统计数据已达到${MAX_HISTORY_COUNT}条上限，自动删除了${deletedCount}条最老的数据`);
            }
        }
        
        localStorage.setItem(CHICKEN_LEG_HISTORY_KEY, JSON.stringify(merged));
    }



    // 暴露给全局，供 nodeseek_blacklist.user.js 调用
    window.NodeSeekRegister = {
        setAddLogFunction: setAddLogFunction,
        showChickenLegStatsDialog: showChickenLegStatsDialog,
        getPageMainText: getPageMainText,
        
        // 导出鸡腿统计数据
        getChickenLegStats: function() {
            const lastFetch = localStorage.getItem(CHICKEN_LEG_LAST_FETCH_KEY);
            const nextAllow = localStorage.getItem(CHICKEN_LEG_NEXT_ALLOW_KEY);
            const lastHtml = localStorage.getItem(CHICKEN_LEG_LAST_HTML_KEY);
            const history = localStorage.getItem(CHICKEN_LEG_HISTORY_KEY);
            
            return {
                lastFetch: lastFetch,
                nextAllow: nextAllow,
                lastHtml: lastHtml,
                history: history ? JSON.parse(history) : []
            };
        },
        
        // 导入鸡腿统计数据
        setChickenLegStats: function(data) {
            if (!data || typeof data !== 'object') {
                return;
            }
            
            if (data.lastFetch) {
                localStorage.setItem(CHICKEN_LEG_LAST_FETCH_KEY, data.lastFetch);
            }
            
            if (data.nextAllow) {
                localStorage.setItem(CHICKEN_LEG_NEXT_ALLOW_KEY, data.nextAllow);
            }
            
            if (data.lastHtml) {
                localStorage.setItem(CHICKEN_LEG_LAST_HTML_KEY, data.lastHtml);
            }
            
            if (data.history && Array.isArray(data.history)) {
                localStorage.setItem(CHICKEN_LEG_HISTORY_KEY, JSON.stringify(data.history));
            }
        }
    };



})();
