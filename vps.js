// ========== VPS剩余价值计算器==========

(function() {
    'use strict';

    // VPS计算器模块
    const NodeSeekVPS = {
        // 配置交易金额: -
        config: {
            // 多个免费汇率API，按优先级排序
            RATE_APIS: [
                {
                    name: 'ExchangeRate-API',
                    url: 'https://api.exchangerate-api.com/v4/latest/USD',
                    parser: (data) => data.rates
                },
                {
                    name: 'ExchangeRate-Host',
                    url: 'https://api.exchangerate.host/latest?base=USD',
                    parser: (data) => data.rates
                },
                {
                    name: 'Fixer.io',
                    url: 'https://api.fixer.io/latest?base=USD',
                    parser: (data) => data.rates
                }
            ]
        },

        // 工具函数
        utils: {
            // 延迟函数
            delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

            // 格式化数字
            formatNumber: (num, decimals = 3) => {
                const rounded = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
                let str = rounded.toString();
                const dotIndex = str.indexOf('.');
                if (dotIndex < 0) {
                    str += '.';
                }
                for (let i = str.length - str.indexOf('.'); i <= decimals; i++) {
                    str += '0';
                }
                return str;
            },

            // 复制到剪贴板
            copyToClipboard: async (text) => {
                if (navigator.clipboard && window.isSecureContext) {
                    return navigator.clipboard.writeText(text);
                } else {
                    const textArea = document.createElement('textarea');
                    textArea.value = text;
                    textArea.style.position = 'absolute';
                    textArea.style.opacity = '0';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.select();
                    return new Promise((resolve, reject) => {
                        document.execCommand('copy') ? resolve() : reject();
                        textArea.remove();
                    });
                }
            },

            // 显示提示消息
            showToast: (message, type = 'tips') => {
                const toast = document.getElementById('vps-toast') || createToastContainer();
                const toastItem = document.createElement('div');
                toastItem.className = `vps-toast ${type}`;
                toastItem.style.marginBottom = '5px';
                toastItem.innerHTML = message;
                toast.appendChild(toastItem);
                setTimeout(() => {
                    if (toast.contains(toastItem)) {
                        toast.removeChild(toastItem);
                    }
                }, 6000);
            },

            // 创建提示容器
            createToastContainer: () => {
                const toast = document.createElement('div');
                toast.id = 'vps-toast';
                toast.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 300px;
                `;
                document.body.appendChild(toast);
                return toast;
            },

            // 显示/隐藏加载状态
            toggleLoading: (show) => {
                const calculateText = document.getElementById('vps-calculate-text');
                const calculateLoading = document.getElementById('vps-calculate-loading');
                if (calculateText && calculateLoading) {
                    if (show) {
                        calculateText.style.display = 'none';
                        calculateLoading.style.display = 'flex';
                    } else {
                        calculateText.style.display = 'flex';
                        calculateLoading.style.display = 'none';
                    }
                }
            },

            // 显示/隐藏错误信息
            showError: (message) => {
                const errorElement = document.getElementById('vps-error-message');
                if (errorElement) {
                    errorElement.textContent = message;
                    errorElement.style.display = 'inline';
                }
            },

            // 隐藏错误信息
            hideError: () => {
                const errorElement = document.getElementById('vps-error-message');
                if (errorElement) {
                    errorElement.style.display = 'none';
                    errorElement.textContent = '';
                }
            },

            // 设置默认日期
            setDefaultDates: () => {
                // 获取中国北京时间（UTC+8）
                function getBeijingDate() {
                    const now = new Date();
                    // 当前本地时间的UTC时间戳
                    const utcTimestamp = now.getTime() + now.getTimezoneOffset() * 60000;
                    // 北京时间 = UTC+8
                    return new Date(utcTimestamp + 8 * 60 * 60 * 1000);
                }
                const today = getBeijingDate();
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);

                const todayStr = today.toISOString().split('T')[0];
                const tomorrowStr = tomorrow.toISOString().split('T')[0];

                const tradeDateInput = document.getElementById('vps-trade-date');
                const expiryDateInput = document.getElementById('vps-expiry-date');

                if (tradeDateInput) {
                    tradeDateInput.value = todayStr;
                }
                if (expiryDateInput) {
                    expiryDateInput.value = tomorrowStr;
                }
            },

                        // 更新汇率显示
            updateExchangeRate: (currencyCode, rates) => {
                const referenceRateInput = document.getElementById('vps-reference-rate');
                const exchangeRateInput = document.getElementById('vps-exchange-rate');

                if (referenceRateInput && exchangeRateInput) {
                    let rate;
                    if (currencyCode === 'CNY') {
                        rate = 1; // 人民币对人民币汇率为1
                    } else {
                        // 其他币种：USD兑CNY / USD兑币种 = 币种兑CNY
                        const usdToCny = rates['CNY'] || 7.2;
                        const usdToCurrency = rates[currencyCode] || 1;
                        rate = usdToCny / usdToCurrency;
                    }
                    const formattedRate = NodeSeekVPS.utils.formatNumber(rate, 3);
                    referenceRateInput.value = formattedRate;
                    exchangeRateInput.value = formattedRate;
                }
            }
        },

        // 初始化日期选择器
        initDatePickers: () => {
            // 这里可以集成flatpickr或其他日期选择器
            // 暂时使用原生HTML5日期选择器
            NodeSeekVPS.utils.setDefaultDates();
        },

        // 获取汇率数据
        fetchExchangeRates: async () => {
            // 备用汇率数据（当所有API不可用时使用）- 基于USD的汇率
            const fallbackRates = {
                'CNY': 7.2,    // USD兑CNY
                'USD': 1,      // USD兑USD
                'GBP': 0.78,   // USD兑GBP
                'EUR': 0.92,   // USD兑EUR
                'JPY': 150,    // USD兑JPY
                'KRW': 1300,   // USD兑KRW
                'HKD': 7.8,    // USD兑HKD
                'TWD': 31,     // USD兑TWD
                'CAD': 1.35,   // USD兑CAD
                'SGD': 1.35,   // USD兑SGD
                'AUD': 1.5     // USD兑AUD
            };

            // 尝试多个API
            for (const api of NodeSeekVPS.config.RATE_APIS) {
                try {

                    const response = await fetch(api.url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'NodeSeek-VPS-Calculator/1.0'
                        },
                        timeout: 5000 // 5秒超时
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();

                    if (data && data.rates) {
                        const rates = api.parser(data);

                        // 格式化当前时间
                        const now = new Date();
                        const lastUpdateDate = now.getFullYear() + '/' +
                                             String(now.getMonth() + 1).padStart(2, '0') + '/' +
                                             String(now.getDate()).padStart(2, '0');

                        // 更新汇率显示
                        document.getElementById('vps-updated-date').textContent = lastUpdateDate + ` (${api.name})`;

                        // 设置汇率数据（基于USD的汇率）
                        NodeSeekVPS.rates = {
                            'CNY': rates.CNY || fallbackRates.CNY,
                            'USD': 1, // USD对USD为1
                            'GBP': rates.GBP || fallbackRates.GBP,
                            'EUR': rates.EUR || fallbackRates.EUR,
                            'JPY': rates.JPY || fallbackRates.JPY,
                            'KRW': rates.KRW || fallbackRates.KRW,
                            'HKD': rates.HKD || fallbackRates.HKD,
                            'TWD': rates.TWD || fallbackRates.TWD,
                            'CAD': rates.CAD || fallbackRates.CAD,
                            'SGD': rates.SGD || fallbackRates.SGD,
                            'AUD': rates.AUD || fallbackRates.AUD
                        };

                        // 初始化汇率显示
                        const currencySelect = document.getElementById('vps-currency-code');
                        if (currencySelect) {
                            NodeSeekVPS.utils.updateExchangeRate(currencySelect.value, NodeSeekVPS.rates);

                            // 交易货币选择框默认选择CNY，不跟随续费货币
                            const tradeCurrencySelect = document.getElementById('vps-trade-currency-code');
                            if (tradeCurrencySelect) {
                                tradeCurrencySelect.value = 'CNY';
                            }
                        }
                        return true;
                    } else {
                        throw new Error('汇率数据格式错误');
                    }
                } catch (error) {
                    continue; // 尝试下一个API
                }
            }

            // 所有API都失败，使用备用汇率数据

            const now = new Date();
            const lastUpdateDate = now.getFullYear() + '/' +
                                 String(now.getMonth() + 1).padStart(2, '0') + '/' +
                                 String(now.getDate()).padStart(2, '0');

            document.getElementById('vps-updated-date').textContent = lastUpdateDate + ' (备用)';
            NodeSeekVPS.rates = fallbackRates;

            // 初始化汇率显示
            const currencySelect = document.getElementById('vps-currency-code');
            if (currencySelect) {
                NodeSeekVPS.utils.updateExchangeRate(currencySelect.value, NodeSeekVPS.rates);

                // 交易货币选择框默认选择CNY，不跟随续费货币
                const tradeCurrencySelect = document.getElementById('vps-trade-currency-code');
                if (tradeCurrencySelect) {
                    tradeCurrencySelect.value = 'CNY';
                }
            }

            return true;
        },

        // 计算VPS剩余价值
        calculateVPSValue: async () => {
            NodeSeekVPS.utils.toggleLoading(true);

            // 获取表单数据
            const currencyCode = document.getElementById('vps-currency-code').value;
            // 获取当前币种兑人民币汇率
            const exchangeRate = parseFloat(document.getElementById('vps-exchange-rate').value);
            const renewMoney = parseFloat(document.getElementById('vps-renew-money').value);
            const paymentCycle = document.getElementById('vps-payment-cycle').value;
            const expiryDate = document.getElementById('vps-expiry-date').value;
            const tradeDate = document.getElementById('vps-trade-date').value;
            const referenceRate = parseFloat(document.getElementById('vps-reference-rate').value);
            // 新增：获取交易金额
            const tradeMoneyInput = document.getElementById('vps-trade-money');
            const tradeMoney = tradeMoneyInput && tradeMoneyInput.value ? parseFloat(tradeMoneyInput.value) : null;
            // 新增：获取交易金额货币单位
            const tradeCurrencyCode = document.getElementById('vps-trade-currency-code').value;

            // 清除错误状态
            ['vps-exchange-rate', 'vps-renew-money', 'vps-expiry-date', 'vps-trade-date', 'vps-trade-money', 'vps-trade-currency-code'].forEach(id => {
                const element = document.getElementById(id);
                if (element) element.classList.remove('error');
            });
            // 隐藏错误信息
            NodeSeekVPS.utils.hideError();

            // 验证输入
            if (!exchangeRate || isNaN(exchangeRate)) {
                NodeSeekVPS.utils.toggleLoading(false);
                document.getElementById('vps-exchange-rate').classList.add('error');
                NodeSeekVPS.utils.showToast('外币汇率不能为空', 'error');
                return false;
            }

            if (!renewMoney || isNaN(renewMoney)) {
                NodeSeekVPS.utils.toggleLoading(false);
                document.getElementById('vps-renew-money').classList.add('error');
                NodeSeekVPS.utils.showToast('续费金额不能为空', 'error');
                return false;
            }

            if (!expiryDate.trim()) {
                NodeSeekVPS.utils.toggleLoading(false);
                document.getElementById('vps-expiry-date').classList.add('error');
                NodeSeekVPS.utils.showToast('请选择到期时间', 'error');
                return false;
            }

            if (!tradeDate.trim()) {
                NodeSeekVPS.utils.toggleLoading(false);
                document.getElementById('vps-trade-date').classList.add('error');
                NodeSeekVPS.utils.showToast('请选择交易日期', 'error');
                return false;
            }

            // 验证日期逻辑
            const expiryDateObj = new Date(expiryDate);
            const tradeDateObj = new Date(tradeDate);
            if (tradeDateObj > expiryDateObj) {
                NodeSeekVPS.utils.toggleLoading(false);
                document.getElementById('vps-trade-date').classList.add('error');
                NodeSeekVPS.utils.showError('交易日期不能在到期时间之后');
                return false;
            }

            // 新增：交易金额校验
            if (tradeMoneyInput && tradeMoneyInput.value && (isNaN(tradeMoney) || tradeMoney < 0)) {
                NodeSeekVPS.utils.toggleLoading(false);
                tradeMoneyInput.classList.add('error');
                NodeSeekVPS.utils.showToast('交易金额格式错误', 'error');
                return false;
            }

            try {
                // 本地计算逻辑
                const result = NodeSeekVPS.calculateVPSValueLocal({
                    exchange_rate: exchangeRate,
                    custom_exchange_rate: exchangeRate,
                    renew_money: renewMoney,
                    currency_code: currencyCode,
                    cycle: paymentCycle,
                    expiry_date: expiryDate,
                    trade_date: tradeDate,
                    trade_money: tradeMoney,
                    trade_currency_code: tradeCurrencyCode
                });

                await NodeSeekVPS.utils.delay(500);

                // 更新结果显示
                NodeSeekVPS.updateResultDisplay(result);

                NodeSeekVPS.utils.toggleLoading(false);

                // 滚动到结果区域
                const resultElement = document.getElementById('vps-result');
                if (resultElement) {
                    resultElement.scrollIntoView({ behavior: 'smooth' });
                }

                // 设置分享数据
                document.getElementById('vps-is-calculated').value = '1';

            } catch (error) {
                NodeSeekVPS.utils.toggleLoading(false);
                NodeSeekVPS.utils.showToast('计算失败: ' + error.message, 'error');
            }
        },

        // 本地VPS价值计算逻辑
        calculateVPSValueLocal: (data) => {
            // 计算周期天数
            const cycleDays = {
                'monthly': 30,
                'quarterly': 90,
                'semiannually': 180,
                'annually': 365,
                'biennially': 730,
                'triennially': 1095,
                'quinquennially': 1825
            };
            // 周期中文映射
            const cycleMap = {
                'monthly': '月',
                'quarterly': '季',
                'semiannually': '半年',
                'annually': '年',
                'biennially': '两年',
                'triennially': '三年',
                'quinquennially': '五年'
            };
            const cycleDay = cycleDays[data.cycle] || 365;
            // 计算剩余天数（用到期日-交易日）
            const expiryDate = new Date(data.expiry_date);
            const tradeDate = new Date(data.trade_date);
            const remainDays = Math.max(0, Math.ceil((expiryDate - tradeDate) / (1000 * 60 * 60 * 24)));
            // 剩余价值（外币）
            const remainValueForeign = data.renew_money * remainDays / cycleDay;
            // 剩余价值（人民币）
            const remainValueCNY = remainValueForeign * data.exchange_rate;
            // 总价值（人民币）
            const totalValueCNY = data.renew_money * data.exchange_rate;
            // 新增：交易金额相关
            let tradeMoney = data.trade_money;
            let tradeMoneyCNY = null, premium = null, premiumType = '', premiumAbs = null, premiumForeign = null;
            if (tradeMoney !== null && !isNaN(tradeMoney)) {
                // 获取交易金额的汇率（交易货币兑CNY）
                let tradeExchangeRate;
                if (data.trade_currency_code === 'CNY') {
                    tradeExchangeRate = 1; // 人民币对人民币汇率为1
                } else {
                    // 其他币种：USD兑CNY / USD兑交易币种 = 交易币种兑CNY
                    const usdToCny = NodeSeekVPS.rates['CNY'] || 7.2;
                    const usdToTradeCurrency = NodeSeekVPS.rates[data.trade_currency_code] || 1;
                    tradeExchangeRate = usdToCny / usdToTradeCurrency;
                }

                tradeMoneyCNY = tradeMoney * tradeExchangeRate;
                premium = tradeMoneyCNY - remainValueCNY;
                premiumAbs = Math.abs(premium);
                premiumForeign = premium / data.exchange_rate; // 溢价在续费货币中的数值
                if (premium > 0) premiumType = '溢价';
                else if (premium < 0) premiumType = '折价';
                else premiumType = '平价';
            }
            // 格式化日期
            const formatDate = (date) => {
                return date.getFullYear() + '-' +
                       String(date.getMonth() + 1).padStart(2, '0') + '-' +
                       String(date.getDate()).padStart(2, '0');
            };
            // 格式化货币
            const formatCurrency = (amount) => {
                return NodeSeekVPS.utils.formatNumber(amount, 3);
            };
            return {
                trade_date: formatDate(tradeDate),
                exchange_rate: formatCurrency(data.exchange_rate),
                renewal: formatCurrency(data.renew_money) + ' ' + data.currency_code + '/' + (cycleMap[data.cycle] || data.cycle),
                remain_days: remainDays,
                expiry_date: formatDate(expiryDate),
                remain_value: formatCurrency(remainValueForeign), // 剩余价值（外币）
                remain_value_cny: formatCurrency(remainValueCNY), // 剩余价值（CNY）
                total_value: formatCurrency(totalValueCNY), // 总价值（CNY）
                custom_remain_value: formatCurrency(remainValueForeign),
                custom_exchange_rate: formatCurrency(data.custom_exchange_rate),
                currency_code: data.currency_code,
                trade_money: tradeMoney !== null && !isNaN(tradeMoney) ? formatCurrency(tradeMoney) : '',
                trade_money_cny: tradeMoneyCNY !== null ? formatCurrency(tradeMoneyCNY) : '',
                trade_currency_code: data.trade_currency_code || '',
                premium: premium !== null ? formatCurrency(premium) : '',
                premium_type: premiumType,
                premium_abs: premiumAbs !== null ? formatCurrency(premiumAbs) : '',
                premium_foreign: premiumForeign !== null ? formatCurrency(premiumForeign) : ''
            };
        },

        // 更新结果显示
        updateResultDisplay: (data) => {
            // 检查是否有有效数据，如果没有则清空所有显示
            const hasValidData = data && data.remain_days !== undefined && data.remain_days !== '' && data.remain_days !== '0';

            if (!hasValidData) {
                // 清空所有结果显示
                const selectors = [
                    '.vps-output-remain-days',
                    '.vps-output-expiry-date',
                    '.vps-output-remain-value',
                    '.vps-output-custom-future-value',
                    '.vps-output-custom-exchange-rate'
                ];
                selectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(element => {
                        element.textContent = '';
                    });
                });

                // 清空交易金额和折溢价显示
                const tradeMoneyRow = document.getElementById('vps-trade-money-row');
                const premiumRow = document.getElementById('vps-premium-row');
                if (tradeMoneyRow) tradeMoneyRow.innerHTML = '<span style="font-weight:bold;">交易金额:</span> <span></span>';
                if (premiumRow) premiumRow.innerHTML = '<span style="font-weight:bold;">溢价:</span> <span></span>';

                return;
            }

            // 计算剩余价值对应的人民币金额
            let remainValueCNY = (data.remain_value_cny !== undefined && data.remain_value_cny !== '' ? data.remain_value_cny : '0.000');
            const currency = data.currency_code || 'CNY';
            const selectors = {
                '.vps-output-trade-date': data.trade_date || '0000-00-00',
                '.vps-output-exchange-rate': data.exchange_rate || '0.00',
                '.vps-output-renewal': data.renewal || ('0.00 ' + currency + '/年'),
                '.vps-output-remain-days': ((data.remain_days !== undefined && data.remain_days !== '' ? data.remain_days : '0') + ' 天'),
                '.vps-output-expiry-date': '(于 ' + (data.expiry_date || '0000-00-00') + ' 过期)',
                '.vps-output-remain-value': ((data.remain_value !== undefined && data.remain_value !== '' ? data.remain_value : '0.000') + ' ' + currency + ' / ' + remainValueCNY + ' CNY'),
                // '.vps-output-total-value': '(总 ' + remainValueCNY + ' CNY)', // 已注释
                '.vps-output-custom-future-value': (data.custom_remain_value !== undefined && data.custom_remain_value !== '' ? data.custom_remain_value : '0.000') + ' ' + currency,
                '.vps-output-custom-exchange-rate': '(汇率 ' + (data.custom_exchange_rate || '0.00') + ')'
            };
            Object.entries(selectors).forEach(([selector, value]) => {
                document.querySelectorAll(selector).forEach(element => {
                    element.textContent = value;
                });
            });
            // 新增：交易金额和折溢价显示
            let tradeMoneyRow = document.getElementById('vps-trade-money-row');
            if (!tradeMoneyRow) {
                const resultDiv = document.getElementById('vps-result');
                tradeMoneyRow = document.createElement('div');
                tradeMoneyRow.id = 'vps-trade-money-row';
                tradeMoneyRow.style.marginBottom = '10px';
                // 保证插入在剩余天数和剩余价值之间
                const remainValueDiv = resultDiv.querySelector('.vps-output-remain-value')?.parentElement;
                if (remainValueDiv) {
                    resultDiv.insertBefore(tradeMoneyRow, remainValueDiv);
                } else {
                    resultDiv.appendChild(tradeMoneyRow);
                }
            }
            if (data.trade_money && data.trade_money_cny) {
                const tradeCurrency = data.trade_currency_code || currency;
                tradeMoneyRow.innerHTML = `<span style="font-weight:bold;">交易金额:</span> <span>${data.trade_money} ${tradeCurrency} / ${data.trade_money_cny} CNY</span>`;
            } else {
                tradeMoneyRow.innerHTML = '<span style="font-weight:bold;">交易金额:</span> <span></span>';
            }
            let premiumRow = document.getElementById('vps-premium-row');
            if (!premiumRow) {
                const resultDiv = document.getElementById('vps-result');
                premiumRow = document.createElement('div');
                premiumRow.id = 'vps-premium-row';
                premiumRow.style.marginBottom = '10px';
                // 保证插入在交易金额行之后
                const tradeMoneyRow = document.getElementById('vps-trade-money-row');
                if (tradeMoneyRow && tradeMoneyRow.nextSibling) {
                    resultDiv.insertBefore(premiumRow, tradeMoneyRow.nextSibling);
                } else {
                    resultDiv.appendChild(premiumRow);
                }
            }
            if (data.premium_type && data.premium_abs && data.premium_foreign) {
                // premium_foreign 取绝对值
                let premiumForeignAbs = data.premium_foreign;
                if (typeof premiumForeignAbs === 'string' && premiumForeignAbs.startsWith('-')) {
                    premiumForeignAbs = premiumForeignAbs.replace('-', '');
                }
                premiumRow.innerHTML = `<span style="font-weight:bold;">${data.premium_type}:</span> <span>${premiumForeignAbs} ${currency} / ${data.premium_abs} CNY</span>`;
            } else {
                premiumRow.innerHTML = '<span style="font-weight:bold;">溢价:</span> <span></span>';
            }
            // 处理自定义汇率显示
            const exchangeRate = data.exchange_rate || '0.000';
            const customExchangeRate = data.custom_exchange_rate || '0.000';
            const customRow = document.getElementById('vps-tr-custom-exchange-show');
            if (customRow) {
                if (customExchangeRate !== '0.000' && exchangeRate !== customExchangeRate) {
                    customRow.style.display = '';
                } else {
                    customRow.style.display = 'none';
                }
            }
            // 删除所有.vps-output-total-value相关元素内容
            document.querySelectorAll('.vps-output-total-value').forEach(element => { element.textContent = ''; });
        },

        // 新增：重置结果显示为初始状态
        resetResultDisplay: () => {
            const currencySelect = document.getElementById('vps-currency-code');
            const currencyText = currencySelect ? currencySelect.options[currencySelect.selectedIndex].text.split(' ')[0] : '人民币';
            const currencyCode = currencySelect ? currencySelect.value : 'CNY';
            NodeSeekVPS.updateResultDisplay({
                trade_date: '0000-00-00',
                exchange_rate: '0.00',
                renewal: '0.00 ' + currencyText + '/年',
                remain_days: '0',
                expiry_date: '0000-00-00',
                remain_value: '0.000',
                remain_value_cny: '0.000',
                total_value: '0.000',
                custom_remain_value: '0.000',
                custom_exchange_rate: '0.00',
                currency_code: currencyCode
            });
        },

        // 生成自定义分享图片
        generateShareImage: () => {
            // 获取整个VPS计算器弹窗
            const calculatorDialog = document.getElementById('vps-calculator-dialog');
            if (!calculatorDialog) {
                throw new Error('VPS计算器弹窗未找到');
            }

            // 使用html2canvas截取整个弹窗
            return new Promise((resolve, reject) => {
                // 动态加载html2canvas库
                if (typeof html2canvas === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                    script.onload = () => {
                        captureDialog();
                    };
                    script.onerror = () => {
                        reject(new Error('无法加载html2canvas库'));
                    };
                    document.head.appendChild(script);
                } else {
                    captureDialog();
                }

                function captureDialog() {
                    html2canvas(calculatorDialog, {
                        backgroundColor: '#f5f5f5',
                        scale: 2, // 提高图片质量
                        useCORS: true,
                        allowTaint: true,
                        width: calculatorDialog.offsetWidth,
                        height: calculatorDialog.offsetHeight
                    }).then(canvas => {
                        resolve(canvas.toDataURL('image/png'));
                    }).catch(error => {
                        reject(error);
                    });
                }
            });
        },

        // 复制分享链接
        copyShareLink: async () => {
            const isCalculated = document.getElementById('vps-is-calculated').value;

            if (isCalculated !== '1') {
                return;
            }

            try {
                // 生成自定义分享图片
                const imageDataUrl = await NodeSeekVPS.generateShareImage();

                // 创建临时下载链接
                const link = document.createElement('a');
                link.download = 'vps-calculator-result.png';
                link.href = imageDataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // 下载按钮不再切换为已下载
                // document.getElementById('vps-copy-text').style.display = 'none';
                // document.getElementById('vps-copied-text').style.display = 'block';

                // await NodeSeekVPS.utils.delay(600);

                // document.getElementById('vps-copy-text').style.display = 'flex';
                // document.getElementById('vps-copied-text').style.display = 'none';

            } catch (error) {
                NodeSeekVPS.utils.showToast('生成分享图片失败<br>' + error, 'error');
            }
        },

        // 查看分享图片
        viewShareImage: async () => {
            const isCalculated = document.getElementById('vps-is-calculated').value;

            if (isCalculated !== '1') {
                const message = isCalculated === '' ?
                    '请先计算剩余价值，再获取分享链接' :
                    '数据已更改，请先计算剩余价值，再获取分享链接';
                NodeSeekVPS.utils.showToast(message, 'error');
                return;
            }

            try {
                // 生成自定义分享图片
                const imageDataUrl = await NodeSeekVPS.generateShareImage();

                const modal = document.getElementById('vps-modal');
                const modalImg = document.getElementById('vps-modal-img');

                if (modal && modalImg) {
                    modalImg.src = imageDataUrl;
                    modal.style.display = 'flex';
                }
            } catch (error) {
                NodeSeekVPS.utils.showToast('生成分享图片失败<br>' + error, 'error');
            }
        },

        // 复制Markdown文本
        copyMarkdownText: async () => {
            const isCalculated = document.getElementById('vps-is-calculated').value;
            if (isCalculated !== '1') {
                return;
            }
            // 读取所有输入参数
            const referenceRate = document.getElementById('vps-reference-rate').value;
            const exchangeRate = document.getElementById('vps-exchange-rate').value;
            const renewMoney = document.getElementById('vps-renew-money').value;
            const currencyCode = document.getElementById('vps-currency-code').options[document.getElementById('vps-currency-code').selectedIndex].text;
            const paymentCycle = document.getElementById('vps-payment-cycle').options[document.getElementById('vps-payment-cycle').selectedIndex].text;
            const expiryDate = document.getElementById('vps-expiry-date').value;
            const tradeDate = document.getElementById('vps-trade-date').value;
            const tradeMoney = document.getElementById('vps-trade-money').value;
            const tradeCurrencyCode = document.getElementById('vps-trade-currency-code').options[document.getElementById('vps-trade-currency-code').selectedIndex].text;
            // 读取所有计算结果
            const tradeDateElement = document.querySelector('.vps-output-trade-date');
            const exchangeRateElement = document.querySelector('.vps-output-exchange-rate');
            const renewalElement = document.querySelector('.vps-output-renewal');
            const remainDaysElement = document.querySelector('.vps-output-remain-days');
            const expiryDateElement = document.querySelector('.vps-output-expiry-date');
            const remainValueElement = document.querySelector('.vps-output-remain-value');

            const tradeDateResult = tradeDateElement ? tradeDateElement.textContent : '';
            const exchangeRateResult = exchangeRateElement ? exchangeRateElement.textContent : '';
            const renewalResult = renewalElement ? renewalElement.textContent : '';
            const remainDays = remainDaysElement ? remainDaysElement.textContent : '';
            const expiryDateResult = expiryDateElement ? expiryDateElement.textContent : '';
            const remainValue = remainValueElement ? remainValueElement.textContent : '';
            // 移除totalValue读取，因为该元素内容已被清空
            const customRow = document.getElementById('vps-tr-custom-exchange-show');
            let customValue = '';
            if (customRow && customRow.style.display !== 'none' && customRow.innerText) {
                customValue = customRow.innerText;
            }
            // 读取交易金额和折溢价信息
            const tradeMoneyRow = document.getElementById('vps-trade-money-row');
            const premiumRow = document.getElementById('vps-premium-row');
            let tradeMoneyText = '';
            let premiumText = '';
            let premiumLabel = '';
            if (tradeMoneyRow) {
                const tradeMoneySpan = tradeMoneyRow.querySelector('span:last-child');
                if (tradeMoneySpan && tradeMoneySpan.textContent && tradeMoneySpan.textContent.trim()) {
                    tradeMoneyText = tradeMoneySpan.textContent.trim();
                }
            }
            if (premiumRow) {
                const spans = premiumRow.querySelectorAll('span');
                if (spans.length >= 2) {
                    premiumLabel = spans[0].textContent.trim(); // 取“溢价:”/“折价:”/“平价:”
                    // premiumText 里的数值全部去负号
                    premiumText = spans[1].textContent.trim().replace(/-([\d.]+)/g, '$1');
                }
            }
            // 生成Markdown格式文本
            let markdownText = `## VPS 剩余价值计算器\n\n### 输入参数\n- 参考汇率: ${referenceRate}\n- 外币汇率: ${exchangeRate}\n- 续费金额: ${renewMoney} ${currencyCode}\n- 付款周期: ${paymentCycle}\n- 到期时间: ${expiryDate}\n- 交易日期: ${tradeDate}\n- 交易金额: ${tradeMoney && tradeMoney.trim() ? tradeMoney + ' ' + tradeCurrencyCode : ''}`;

            markdownText += `\n\n### 计算结果\n- 剩余天数: ${remainDays} ${expiryDateResult}\n- 剩余价值: ${remainValue}${customValue ? `\n- ${customValue}` : ''}\n- 交易金额: ${tradeMoneyText || ''}`;
            if (premiumLabel && premiumText) {
                markdownText += `\n- ${premiumLabel} ${premiumText}`;
            }
            markdownText += `\n\n*导出时间: ${(new Date().toLocaleString('zh-CN'))}*\n`;
            await NodeSeekVPS.utils.copyToClipboard(markdownText);
            document.getElementById('vps-markdown-text').style.opacity = '0';
            document.getElementById('vps-markdown-copied').style.opacity = '1';
            // 不再自动恢复
        },

        // 绑定事件监听器
        bindEventListeners: () => {
            // 表单字段变化监听
            ['vps-exchange-rate', 'vps-renew-money', 'vps-payment-cycle', 'vps-expiry-date', 'vps-trade-date', 'vps-trade-money', 'vps-trade-currency-code'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('change', function() {
                        document.getElementById('vps-is-calculated').value = '0';
                    });
                }
            });

            // 币种变化监听 - 特殊处理
            const currencySelect = document.getElementById('vps-currency-code');
            if (currencySelect) {
                currencySelect.addEventListener('change', function() {
                    NodeSeekVPS.utils.updateExchangeRate(this.value, NodeSeekVPS.rates);

                    // 交易货币选择框保持独立，不自动同步

                    // 币种切换时，自动重新计算并显示结果
                    const isCalculated = document.getElementById('vps-is-calculated').value;
                    if (isCalculated === '1') {
                        // 如果之前已经计算过，自动重新计算
                        NodeSeekVPS.calculateVPSValue();
                    } else {
                        // 如果还没计算过，清空结果显示
                        NodeSeekVPS.updateResultDisplay({
                            trade_date: '',
                            exchange_rate: '',
                            renewal: '',
                            remain_days: '',
                            expiry_date: '',
                            remain_value: '',
                            remain_value_cny: '',
                            total_value: '',
                            custom_remain_value: '',
                            custom_exchange_rate: '',
                            currency_code: this.value
                        });
                    }
                });
            }

            // 计算按钮
            const calculateBtn = document.getElementById('vps-calculate-btn');
            if (calculateBtn) {
                calculateBtn.addEventListener('click', NodeSeekVPS.calculateVPSValue);
            }

            // 表单提交
            const form = document.getElementById('vps-form');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    NodeSeekVPS.calculateVPSValue();
                    return false;
                });
            }

            // 复制按钮
            const copyBtn = document.getElementById('vps-copy-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', NodeSeekVPS.copyShareLink);
            }

            // Markdown复制按钮
            const markdownBtn = document.getElementById('vps-markdown-btn');
            if (markdownBtn) {
                markdownBtn.addEventListener('click', NodeSeekVPS.copyMarkdownText);
            }

            // 关闭模态框
            const closeBtn = document.querySelector('#vps-modal .close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    document.getElementById('vps-modal').style.display = 'none';
                });
            }

            // 点击模态框外部关闭
            window.addEventListener('click', (e) => {
                const modal = document.getElementById('vps-modal');
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });

            // 输入框焦点事件
            ['vps-exchange-rate', 'vps-renew-money', 'vps-trade-date', 'vps-expiry-date', 'vps-trade-money', 'vps-trade-currency-code'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('focus', function() {
                        this.classList.remove('error');
                        NodeSeekVPS.utils.hideError();
                    });
                }
            });
        },

        // 创建计算器弹窗
        createCalculatorDialog: () => {
            const dialog = document.createElement('div');
            dialog.id = 'vps-calculator-dialog';
            // 计算屏幕中心点
            const dialogWidth = 800;
            const dialogHeight = 600;
            const left = Math.max(0, (window.innerWidth - dialogWidth) / 2);
            const top = Math.max(0, (window.innerHeight - dialogHeight) / 2);
            dialog.style.cssText = `
                position: fixed;
                left: ${left}px;
                top: ${top}px;
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10001;
                overflow-y: auto;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;

            // 添加左上角30x30px可拖动区域
            const dragHandle = document.createElement('div');
            dragHandle.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                width: 30px;
                height: 30px;
                z-index: 10;
                cursor: move;
                user-select: none;
                background: transparent;
            `;
            dialog.appendChild(dragHandle);

            dialog.innerHTML = `
                <div style="padding: 20px;">
                    <div class="header-container" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div class="title-error-container" style="display: flex; align-items: center; gap: 15px;">
                            <h2 style="margin: 0; color: #333;">VPS 剩余价值计算器</h2>
                            <span id="vps-error-message" style="color: #dc3545; font-size: 15px; font-weight: bold; display: none; margin-left: 150px;"></span>
                        </div>
                        <span class="close-btn" style="cursor: pointer; font-size: 24px; color: #666;" onclick="this.closest('#vps-calculator-dialog').remove()">×</span>
                    </div>

                    <div style="display: flex; gap: 20px; min-height: 500px;">
                        <!-- 左侧输入面板 -->
                        <div style="flex: 1; background: #ededed; padding: 20px; border-radius: 12px; color: #333;">

                            <form id="vps-form">
                                <div style="margin-bottom: 15px;">
                                    <div style="margin-bottom: 5px;">
                                        <label style="font-weight: bold;">参考汇率</label>
                                        <div style="font-size: 12px; opacity: 0.8; margin-top: 2px;">
                                            (更新时间<span id="vps-updated-date">0000/00/00</span>)
                                        </div>
                                    </div>
                                    <input type="number" id="vps-reference-rate" value="0.000" disabled style="width: 100%; padding: 8px; border: none; border-radius: 6px; background: #fafafa; color: #333;">
                                </div>

                                <div style="margin-bottom: 15px;">
                                    <label style="font-weight: bold; display: block; margin-bottom: 5px;">外币汇率</label>
                                    <input type="number" id="vps-exchange-rate" required value="0.000" min="0.000" step="0.001" style="width: 100%; padding: 8px; border: none; border-radius: 6px; background: #fafafa; color: #333;">
                                </div>

                                <div style="margin-bottom: 15px;">
                                    <label style="font-weight: bold; display: block; margin-bottom: 5px;">续费金额</label>
                                    <div style="display: flex; gap: 10px;">
                                        <input type="number" id="vps-renew-money" required value="1.00" min="0.000" step="0.01" style="flex: 1; padding: 8px; border: none; border-radius: 6px; background: #fafafa; color: #333;">
                                        <select id="vps-currency-code" required style="width: 150px; padding: 8px; border: none; border-radius: 6px; background: #fafafa; color: #333;">
                                            <option value="CNY">人民币 (CNY)</option>
                                            <option value="USD" selected>美元 (USD)</option>
                                            <option value="GBP">英镑 (GBP)</option>
                                            <option value="EUR">欧元 (EUR)</option>
                                            <option value="JPY">日元 (JPY)</option>
                                            <option value="KRW">韩元 (KRW)</option>
                                            <option value="HKD">港元 (HKD)</option>
                                            <option value="TWD">新台币(TWD)</option>
                                            <option value="CAD">加拿大元(CAD)</option>
                                            <option value="SGD">新加坡元(SGD)</option>
                                            <option value="AUD">澳大利亚元(AUD)</option>
                                        </select>
                                    </div>
                                </div>

                                <div style="margin-bottom: 15px;">
                                    <label style="font-weight: bold; display: block; margin-bottom: 5px;">付款周期</label>
                                    <select id="vps-payment-cycle" required style="width: 100%; padding: 8px; border: none; border-radius: 6px; background: #fafafa; color: #333;">
                                        <option value="monthly">月付</option>
                                        <option value="quarterly">季付</option>
                                        <option value="semiannually">半年付</option>
                                        <option value="annually" selected>年付</option>
                                        <option value="biennially">两年付</option>
                                        <option value="triennially">三年付</option>
                                        <option value="quinquennially">五年付</option>
                                    </select>
                                </div>

                                <div style="margin-bottom: 15px;">
                                    <label style="font-weight: bold; display: block; margin-bottom: 5px;">到期时间</label>
                                    <input type="date" id="vps-expiry-date" required style="width: 100%; padding: 8px; border: none; border-radius: 6px; background: #fafafa; color: #333;">
                                </div>

                                <div style="margin-bottom: 20px;">
                                    <label style="font-weight: bold; display: block; margin-bottom: 5px;">交易日期</label>
                                    <input type="date" id="vps-trade-date" required style="width: 100%; padding: 8px; border: none; border-radius: 6px; background: #fafafa; color: #333;">
                                </div>
                                <!-- 新增交易金额输入框 -->
                                <div style="margin-bottom: 20px;">
                                    <label style="font-weight: bold; display: block; margin-bottom: 5px;">交易金额（可选）</label>
                                    <div style="display: flex; gap: 10px;">
                                        <input type="number" id="vps-trade-money" placeholder="实际成交金额" min="0" step="0.01" style="flex: 1; padding: 8px; border: none; border-radius: 6px; background: #fafafa; color: #333;">
                                        <select id="vps-trade-currency-code" style="width: 150px; padding: 8px; border: none; border-radius: 6px; background: #fafafa; color: #333;">
                                            <option value="CNY" selected>人民币 (CNY)</option>
                                            <option value="USD">美元 (USD)</option>
                                            <option value="GBP">英镑 (GBP)</option>
                                            <option value="EUR">欧元 (EUR)</option>
                                            <option value="JPY">日元 (JPY)</option>
                                            <option value="KRW">韩元 (KRW)</option>
                                            <option value="HKD">港元 (HKD)</option>
                                            <option value="TWD">新台币(TWD)</option>
                                            <option value="CAD">加拿大元(CAD)</option>
                                            <option value="SGD">新加坡元(SGD)</option>
                                            <option value="AUD">澳大利亚元(AUD)</option>
                                        </select>
                                    </div>
                                </div>

                                <button type="submit" id="vps-calculate-btn" style="width: 100%; background: #e0e0e0; color: #333; border: 2px solid #e0e0e0; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; transition: all 0.3s; display: flex; align-items: center; justify-content: center;">
                                    <div id="vps-calculate-text" style="display: flex; align-items: center; justify-content: center;">
                                        <svg width="18" height="18" viewBox="0 0 24 24" style="margin-right: 8px; vertical-align: middle;">
                                            <path fill="currentColor" d="M9,7V9A1,1 0 0,1 8,10A1,1 0 0,1 7,9V7A1,1 0 0,1 8,6A1,1 0 0,1 9,7M13,15A1,1 0 0,0 12,16A1,1 0 0,0 13,17A1,1 0 0,0 14,16A1,1 0 0,0 13,15M8,2C4.5,2 2,4.5 2,8V16C2,19.5 4.5,22 8,22H16C19.5,22 22,19.5 22,16V8C22,4.5 19.5,2 16,2H8M8,4H16C18.5,4 20,5.5 20,8V16C20,18.5 18.5,20 16,20H8C5.5,20 4,18.5 4,16V8C4,5.5 5.5,4 8,4M12,10A1,1 0 0,0 11,11A1,1 0 0,0 12,12A1,1 0 0,0 13,11A1,1 0 0,0 12,10M12,14A1,1 0 0,0 11,15A1,1 0 0,0 12,16A1,1 0 0,0 13,15A1,1 0 0,0 12,14Z"/>
                                        </svg>
                                        计算剩余价值
                                    </div>
                                    <div id="vps-calculate-loading" style="display: none; align-items: center; justify-content: center;">
                                        <svg width="18" height="18" viewBox="0 0 24 24" style="margin-right: 8px; vertical-align: middle; animation: spin 1s linear infinite;">
                                            <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
                                        </svg>
                                        正在计算...
                                    </div>
                                </button>
                            </form>
                        </div>

                        <!-- 右侧结果面板 -->
                        <div style="flex: 1; background: #f0f0f0; padding: 20px; border-radius: 12px; color: #333;">
                            <h3 style="margin: 0 0 20px 0; text-align: center;">计算结果</h3>

                            <div id="vps-result" style="background: #fafafa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                <div style="margin-bottom: 10px;">
                                    <span style="font-weight: bold;">剩余天数:</span>
                                    <span class="vps-output-remain-days" style="margin-left: 10px; color:rgb(255, 0, 0);"></span>
                                    <span class="vps-output-expiry-date" style="margin-left: 5px; font-size: 12px; opacity: 0.8;"></span>
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <span style="font-weight: bold;">剩余价值:</span>
                                    <span class="vps-output-remain-value" style="margin-left: 10px; color:rgb(255, 0, 0);"></span>
                                    <span class="vps-output-total-value" style="margin-left: 5px; font-size: 12px; opacity: 0.8;"></span>
                                </div>
                                <div id="vps-tr-custom-exchange-show" style="margin-bottom: 10px; display: none;">
                                    <span style="font-weight: bold;">自定义:</span>
                                    <span class="vps-output-custom-future-value" style="margin-left: 10px;"></span>
                                    <span class="vps-output-custom-exchange-rate" style="margin-left: 5px; font-size: 12px; opacity: 0.8;"></span>
                                </div>
                                <!-- 新增交易金额和折溢价显示 -->
                                <div id="vps-trade-money-row" style="margin-bottom: 10px;"><span style="font-weight:bold;">交易金额:</span> <span></span></div>
                                <div id="vps-premium-row" style="margin-bottom: 10px;"><span style="font-weight:bold;">溢价:</span> <span></span></div>
                            </div>

                            <!-- 分享功能 -->
                            <div id="vps-share" style="background: #f0f0f0; padding: 15px; border-radius: 8px;">
                                <h4 style="margin: 0 0 15px 0; text-align: center;">分享功能</h4>
                                <input id="vps-is-calculated" type="hidden" value="">

                                <div class="button-container" style="display: flex; gap: 8px; justify-content: center;">
                                    <button id="vps-copy-btn" style="background: #ededed; color: #333; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                        <div id="vps-copy-text">
                                            <svg width="12" height="12" viewBox="0 0 24 24" style="margin-right: 4px; vertical-align: middle;">
                                                <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
                                            </svg>
                                            下载
                                        </div>
                                        <span id="vps-copied-text" style="display: none;">已下载</span>
                                    </button>
                                    <button id="vps-markdown-btn" style="background: #ededed; color: #333; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; min-width: 70px; position: relative; overflow: hidden;">
                                        <span id="vps-markdown-text" style="transition: opacity 0.2s; opacity: 1; position: absolute; left: 0; right: 0; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center;">复制文本</span>
                                        <span id="vps-markdown-copied" style="transition: opacity 0.2s; opacity: 0; position: absolute; left: 0; right: 0; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center;">已复制</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }

                    .vps-toast {
                        padding: 10px 15px;
                        margin-bottom: 5px;
                        border-radius: 4px;
                        color: white;
                        font-size: 14px;
                    }

                    .vps-toast.tips {
                        background-color: #17a2b8;
                    }

                    .vps-toast.success {
                        background-color: #28a745;
                    }

                    .vps-toast.error {
                        background-color: #dc3545;
                    }

                    .error {
                        border-color: #dc3545 !important;
                        box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
                    }

                    /* 新增样式 */
                    #vps-calculator-dialog {
                        background: #f5f5f5;
                        border: none;
                        box-shadow: 0 20px 40px rgba(0,0,0,0.06);
                    }

                    #vps-calculator-dialog input,
                    #vps-calculator-dialog select {
                        transition: all 0.3s ease;
                    }

                    #vps-calculator-dialog input:focus,
                    #vps-calculator-dialog select:focus {
                        outline: none;
                        box-shadow: 0 0 0 3px rgba(255,255,255,0.3);
                        transform: translateY(-1px);
                    }

                    #vps-calculate-btn:hover {
                        background: rgba(255,255,255,0.3) !important;
                        transform: translateY(-2px);
                        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                    }

                    #vps-view-btn:hover,
                    #vps-copy-btn:hover,
                    #vps-markdown-btn:hover {
                        background: rgba(255,255,255,0.3) !important;
                        transform: translateY(-1px);
                    }

                    /* 移动端适配 */
                    @media (max-width: 768px) {
                        #vps-calculator-dialog {
                            width: 95% !important;
                            max-width: none !important;
                            left: 2.5% !important;
                            top: 2.5% !important;
                        }

                        #vps-calculator-dialog > div > div {
                            flex-direction: column !important;
                        }

                        #vps-calculator-dialog > div > div > div {
                            margin-bottom: 15px;
                        }

                        /* 移动端标题和错误信息布局 */
                        #vps-calculator-dialog .header-container {
                            flex-direction: column !important;
                            align-items: flex-start !important;
                            gap: 10px !important;
                        }

                        #vps-calculator-dialog .title-error-container {
                            flex-direction: column !important;
                            align-items: flex-start !important;
                            gap: 8px !important;
                            width: 100% !important;
                        }

                        #vps-error-message {
                            margin-left: 0 !important;
                            font-size: 14px !important;
                        }

                        /* 移动端输入框优化 */
                        #vps-calculator-dialog input,
                        #vps-calculator-dialog select {
                            font-size: 16px !important; /* 防止iOS缩放 */
                        }

                        /* 移动端按钮优化 */
                        #vps-calculate-btn {
                            padding: 15px 12px !important;
                            font-size: 16px !important;
                        }

                        /* 移动端分享按钮优化 */
                        #vps-share .button-container {
                            flex-direction: column !important;
                            gap: 10px !important;
                        }

                        #vps-copy-btn,
                        #vps-markdown-btn {
                            width: 100% !important;
                            padding: 10px !important;
                        }
                    }
                </style>
            `;

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

            // 模态框
            const modal = document.createElement('div');
            modal.id = 'vps-modal';
            modal.style.cssText = `
                display: none;
                position: fixed;
                z-index: 10002;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.8);
                justify-content: center;
                align-items: center;
            `;
            modal.innerHTML = `
                <span class="close" style="position: absolute; top: 20px; right: 35px; color: white; font-size: 40px; font-weight: bold; cursor: pointer;">&times;</span>
                <img class="modal-img" id="vps-modal-img" style="max-width: 90%; max-height: 80%; margin: auto; display: block;">
            `;

            document.body.appendChild(dialog);
            document.body.appendChild(modal);

            // 调用全局拖动函数，限制为左上角30x30
            if (window.makeDraggable) {
                window.makeDraggable(dialog, {width: 30, height: 30});
            }

            return dialog;
        },

        // 显示计算器弹窗
        showCalculatorDialog: () => {
            // 移除已存在的弹窗
            const existingDialog = document.getElementById('vps-calculator-dialog');
            if (existingDialog) {
                // 若已存在则作为“切换”行为：直接关闭并返回
                existingDialog.remove();
                return;
            }

            const dialog = NodeSeekVPS.createCalculatorDialog();

            // 初始化
            NodeSeekVPS.initDatePickers();
            NodeSeekVPS.fetchExchangeRates();
            NodeSeekVPS.bindEventListeners();

            // 使弹窗可拖动
            if (window.UI && typeof window.UI.makeDraggable === 'function') {
                window.UI.makeDraggable(dialog);
            }
        },

        // 初始化模块
        init: () => {
            // 创建提示容器
            NodeSeekVPS.utils.createToastContainer();

            // 初始化汇率数据
            NodeSeekVPS.rates = {};

        }
    };

    // 初始化模块
    NodeSeekVPS.init();

    // 导出到全局
    window.NodeSeekVPS = NodeSeekVPS;

})();
