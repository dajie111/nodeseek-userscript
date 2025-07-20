// ========== VPS剩余价值计算器 ==========
(function() {
    'use strict';

    // 定义一个引用 addLog 的函数，以便在主插件中调用
    let _addLog = console.log; // 默认使用 console.log

    // 用于从外部设置 addLog 函数的引用
    function setAddLogFunction(func) {
        _addLog = func;
    }

    // 计算剩余价值
    function calculateRemainingValue(renewMoney, currencyCode, paymentCycle, expiryDate, tradeDate, exchangeRate) {
        // 验证输入
        if (!renewMoney || !expiryDate || !tradeDate) {
            throw new Error('请填写所有必填字段');
        }

        // 解析日期
        const expiry = new Date(expiryDate);
        const trade = new Date(tradeDate);
        
        if (isNaN(expiry.getTime()) || isNaN(trade.getTime())) {
            throw new Error('日期格式错误');
        }

        // 计算剩余天数
        const remainingDays = Math.max(0, Math.ceil((expiry - trade) / (1000 * 60 * 60 * 24)));
        
        // 根据付款周期计算年化价格
        let annualPrice = 0;
        switch (paymentCycle) {
            case 'monthly':
                annualPrice = renewMoney * 12;
                break;
            case 'quarterly':
                annualPrice = renewMoney * 4;
                break;
            case 'semiannually':
                annualPrice = renewMoney * 2;
                break;
            case 'annually':
                annualPrice = renewMoney;
                break;
            case 'biennially':
                annualPrice = renewMoney / 2;
                break;
            case 'triennially':
                annualPrice = renewMoney / 3;
                break;
            case 'quinquennially':
                annualPrice = renewMoney / 5;
                break;
            default:
                throw new Error('无效的付款周期');
        }

        // 计算剩余价值（按比例计算）
        const totalDays = 365; // 假设一年365天
        const remainingValue = (annualPrice * remainingDays) / totalDays;
        
        // 转换为人民币
        const remainingValueCNY = remainingValue * exchangeRate;

        return {
            tradeDate: tradeDate,
            exchangeRate: exchangeRate,
            renewalPrice: annualPrice,
            remainingDays: remainingDays,
            remainingValue: remainingValue,
            remainingValueCNY: remainingValueCNY,
            expiryDate: expiryDate,
            currencyCode: currencyCode,
            paymentCycle: paymentCycle
        };
    }

    // 显示VPS计算器对话框
    function showVPSCalculatorDialog() {
        const dialogId = 'vps-calculator-dialog';
        const existingDialog = document.getElementById(dialogId);
        if (existingDialog) {
            existingDialog.remove();
            return;
        }

        const dialog = document.createElement('div');
        dialog.id = dialogId;
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 500px;
            max-width: 90vw;
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.15);
            padding: 20px;
            z-index: 10000;
            max-height: 90vh;
            overflow-y: auto;
        `;

        // 标题栏
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
            margin-bottom: 20px;
        `;

        const title = document.createElement('h2');
        title.textContent = 'VPS剩余价值计算器';
        title.style.cssText = `
            margin: 0;
            font-size: 18px;
            color: #333;
        `;

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            cursor: pointer;
            font-size: 24px;
            color: #666;
            line-height: 1;
        `;
        closeBtn.onclick = () => dialog.remove();

        header.appendChild(title);
        header.appendChild(closeBtn);
        dialog.appendChild(header);

        // 表单区域
        const form = document.createElement('form');
        form.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 15px;
        `;

        // 外币汇率
        const exchangeRateGroup = document.createElement('div');
        exchangeRateGroup.innerHTML = `
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">外币汇率 (CNY)</label>
            <input type="number" id="exchange_rate" step="0.001" min="0" value="7.2" 
                   style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
        `;

        // 续费金额和货币
        const renewGroup = document.createElement('div');
        renewGroup.innerHTML = `
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">续费金额</label>
            <div style="display: flex; gap: 10px;">
                <input type="number" id="renew_money" step="0.01" min="0" value="10.00" 
                       style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                <select id="currency_code" style="padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                    <option value="USD" selected>美元 (USD)</option>
                    <option value="CNY">人民币 (CNY)</option>
                    <option value="GBP">英镑 (GBP)</option>
                    <option value="EUR">欧元 (EUR)</option>
                    <option value="JPY">日元 (JPY)</option>
                    <option value="KRW">韩元 (KRW)</option>
                    <option value="HKD">港元 (HKD)</option>
                    <option value="TWD">新台币 (TWD)</option>
                    <option value="CAD">加拿大元 (CAD)</option>
                    <option value="SGD">新加坡元 (SGD)</option>
                    <option value="AUD">澳大利亚元 (AUD)</option>
                </select>
            </div>
        `;

        // 付款周期
        const cycleGroup = document.createElement('div');
        cycleGroup.innerHTML = `
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">付款周期</label>
            <select id="payment_cycle" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                <option value="monthly">月付</option>
                <option value="quarterly">季付</option>
                <option value="semiannually">半年付</option>
                <option value="annually" selected>年付</option>
                <option value="biennially">两年付</option>
                <option value="triennially">三年付</option>
                <option value="quinquennially">五年付</option>
            </select>
        `;

        // 到期时间
        const expiryGroup = document.createElement('div');
        expiryGroup.innerHTML = `
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">到期时间</label>
            <input type="date" id="expiry_date" 
                   style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
        `;

        // 交易日期
        const tradeGroup = document.createElement('div');
        tradeGroup.innerHTML = `
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">交易日期</label>
            <input type="date" id="trade_date" 
                   style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
        `;

        // 设置默认日期
        const today = new Date();
        const nextYear = new Date(today);
        nextYear.setFullYear(today.getFullYear() + 1);
        
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        document.addEventListener('DOMContentLoaded', () => {
            const expiryInput = document.getElementById('expiry_date');
            const tradeInput = document.getElementById('trade_date');
            if (expiryInput) expiryInput.value = formatDate(nextYear);
            if (tradeInput) tradeInput.value = formatDate(today);
        });

        // 计算按钮
        const calculateBtn = document.createElement('button');
        calculateBtn.textContent = '计算剩余价值';
        calculateBtn.style.cssText = `
            padding: 12px;
            background: #1890ff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
        `;
        calculateBtn.onmouseover = () => {
            calculateBtn.style.background = '#40a9ff';
        };
        calculateBtn.onmouseout = () => {
            calculateBtn.style.background = '#1890ff';
        };

        // 结果区域
        const resultArea = document.createElement('div');
        resultArea.id = 'vps_result_area';
        resultArea.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 4px;
            display: none;
        `;

        // 组装表单
        form.appendChild(exchangeRateGroup);
        form.appendChild(renewGroup);
        form.appendChild(cycleGroup);
        form.appendChild(expiryGroup);
        form.appendChild(tradeGroup);
        form.appendChild(calculateBtn);
        form.appendChild(resultArea);

        dialog.appendChild(form);

        // 计算按钮事件
        calculateBtn.onclick = (e) => {
            e.preventDefault();
            
            try {
                // 获取表单数据
                const exchangeRate = parseFloat(document.getElementById('exchange_rate').value);
                const renewMoney = parseFloat(document.getElementById('renew_money').value);
                const currencyCode = document.getElementById('currency_code').value;
                const paymentCycle = document.getElementById('payment_cycle').value;
                const expiryDate = document.getElementById('expiry_date').value;
                const tradeDate = document.getElementById('trade_date').value;

                // 计算
                const result = calculateRemainingValue(
                    renewMoney, currencyCode, paymentCycle, expiryDate, tradeDate, exchangeRate
                );

                // 显示结果
                displayResult(result, resultArea);
                
                _addLog('VPS剩余价值计算完成');
                
            } catch (error) {
                alert('计算失败: ' + error.message);
                _addLog('VPS计算器错误: ' + error.message);
            }
        };

        document.body.appendChild(dialog);

        // 设置默认日期
        setTimeout(() => {
            const expiryInput = document.getElementById('expiry_date');
            const tradeInput = document.getElementById('trade_date');
            if (expiryInput) expiryInput.value = formatDate(nextYear);
            if (tradeInput) tradeInput.value = formatDate(today);
        }, 100);
    }

    // 显示计算结果
    function displayResult(result, container) {
        const cycleNames = {
            'monthly': '月付',
            'quarterly': '季付',
            'semiannually': '半年付',
            'annually': '年付',
            'biennially': '两年付',
            'triennially': '三年付',
            'quinquennially': '五年付'
        };

        container.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333;">计算结果</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold; width: 120px;">交易日期：</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${result.tradeDate}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">外币汇率：</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${result.exchangeRate.toFixed(3)} CNY</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">续费价格：</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${result.renewalPrice.toFixed(2)} ${result.currencyCode}/年 (${cycleNames[result.paymentCycle]})</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">剩余天数：</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #52c41a; font-weight: bold;">${result.remainingDays} 天</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">剩余价值：</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #f5222d; font-weight: bold;">${result.remainingValueCNY.toFixed(2)} 元</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">到期时间：</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${result.expiryDate}</td>
                </tr>
            </table>
        `;
        
        container.style.display = 'block';
    }

    // 暴露给全局
    window.NodeSeekVPSCalculator = {
        setAddLogFunction: setAddLogFunction,
        showVPSCalculatorDialog: showVPSCalculatorDialog,
        calculateRemainingValue: calculateRemainingValue
    };

})(); 
