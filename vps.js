// ========== VPS剩余价值计算器==========

(function () {
    'use strict';

    // VPS计算器模块
    const NodeSeekVPS = {
        // 上传结果
        uploadResult: null,

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
            // 获取北京时间
            getBeijingDate: () => {
                const now = new Date();
                const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
                return new Date(utc + (8 * 60 * 60 * 1000));
            },

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
                const beijingNow = NodeSeekVPS.utils.getBeijingDate();
                const beijingTomorrow = new Date(beijingNow);
                beijingTomorrow.setDate(beijingNow.getDate() + 1);

                // 格式化为 YYYY-MM-DD 格式
                const todayStr = beijingNow.getFullYear() + '-' +
                    String(beijingNow.getMonth() + 1).padStart(2, '0') + '-' +
                    String(beijingNow.getDate()).padStart(2, '0');
                const tomorrowStr = beijingTomorrow.getFullYear() + '-' +
                    String(beijingTomorrow.getMonth() + 1).padStart(2, '0') + '-' +
                    String(beijingTomorrow.getDate()).padStart(2, '0');

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

                        // 格式化当前北京时间
                        const beijingNow = NodeSeekVPS.utils.getBeijingDate();
                        const lastUpdateDate = beijingNow.getFullYear() + '/' +
                            String(beijingNow.getMonth() + 1).padStart(2, '0') + '/' +
                            String(beijingNow.getDate()).padStart(2, '0');

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

            const beijingNow = NodeSeekVPS.utils.getBeijingDate();
            const lastUpdateDate = beijingNow.getFullYear() + '/' +
                String(beijingNow.getMonth() + 1).padStart(2, '0') + '/' +
                String(beijingNow.getDate()).padStart(2, '0');

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

            // 重置复制按钮状态
            const mdText = document.getElementById('vps-copy-md-text');
            const mdCopied = document.getElementById('vps-copy-md-copied');
            if (mdText && mdCopied) {
                mdText.style.opacity = '1';
                mdCopied.style.opacity = '0';
            }

            const textText = document.getElementById('vps-markdown-text');
            const textCopied = document.getElementById('vps-markdown-copied');
            if (textText && textCopied) {
                textText.style.opacity = '1';
                textCopied.style.opacity = '0';
            }

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

                // 注入续费周期文字 (用于SVG)
                const cycleMap = {
                    'monthly': '月付',
                    'quarterly': '季付',
                    'semiannually': '半年付',
                    'annually': '年付',
                    'biennially': '两年付',
                    'triennially': '三年付',
                    'quinquennially': '五年付'
                };
                result.renew_period = cycleMap[paymentCycle] || paymentCycle;
                result.reference_rate = NodeSeekVPS.utils.formatNumber(referenceRate, 3);

                await NodeSeekVPS.utils.delay(500);

                // 更新结果显示
                NodeSeekVPS.updateResultDisplay(result);

                // 生成并上传SVG
                NodeSeekVPS.uploadResult = null; // 重置
                const updatedDateEl = document.getElementById('vps-updated-date');
                const currencySelect = document.getElementById('vps-currency-code');
                const cycleSelect = document.getElementById('vps-payment-cycle');
                const tradeCurrencySelect = document.getElementById('vps-trade-currency-code');
                const svgData = {
                    inputs: {
                        reference_rate: result.reference_rate || '',
                        updated_date: updatedDateEl ? (updatedDateEl.textContent || '') : '',
                        exchange_rate: NodeSeekVPS.utils.formatNumber(exchangeRate, 3),
                        renew_money: NodeSeekVPS.utils.formatNumber(renewMoney, 2),
                        currency_text: currencySelect && currencySelect.selectedIndex >= 0 ? currencySelect.options[currencySelect.selectedIndex].text : currencyCode,
                        payment_cycle_text: cycleSelect && cycleSelect.selectedIndex >= 0 ? cycleSelect.options[cycleSelect.selectedIndex].text : paymentCycle,
                        expiry_date: expiryDate,
                        trade_date: tradeDate,
                        trade_money: tradeMoney !== null && !isNaN(tradeMoney) ? NodeSeekVPS.utils.formatNumber(tradeMoney, 2) : '',
                        trade_currency_text: tradeCurrencySelect && tradeCurrencySelect.selectedIndex >= 0 ? tradeCurrencySelect.options[tradeCurrencySelect.selectedIndex].text : tradeCurrencyCode
                    },
                    outputs: {
                        remain_days: result.remain_days,
                        expiry_date: result.expiry_date,
                        currency_code: result.currency_code,
                        remain_value: result.remain_value,
                        remain_value_cny: result.remain_value_cny,
                        trade_money: result.trade_money,
                        trade_money_cny: result.trade_money_cny,
                        trade_currency_code: result.trade_currency_code,
                        premium_type: result.premium_type,
                        premium_abs: result.premium_abs,
                        premium_foreign: result.premium_foreign
                    }
                };
                const svgContent = NodeSeekVPS.generateSVG(svgData);
                // 保存SVG内容供稍后上传
                NodeSeekVPS.currentSVGContent = svgContent;
                
                // 移除自动上传逻辑
                // if (localStorage.getItem('nodeseek_login_token')) {
                //    NodeSeekVPS.uploadResult = await NodeSeekVPS.uploadSVG(svgContent);
                // }

                NodeSeekVPS.utils.toggleLoading(false);

                // 滚动到结果区域
                const resultElement = document.getElementById('vps-result');
                if (resultElement) {
                    resultElement.scrollIntoView({ behavior: 'smooth' });
                }

                // 设置分享数据
                document.getElementById('vps-is-calculated').value = '1';
                NodeSeekVPS.updateShareButtonsState();

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

        // 复制Markdown文本（实际上现在这个函数恢复为复制详细文本信息的 Markdown 格式）
        copyMarkdownText: async () => {
            const isCalculated = document.getElementById('vps-is-calculated').value;
            if (isCalculated !== '1') {
                return false;
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
            
            // 复制文本不包含图片链接
            
            markdownText += `\n\n*导出时间: ${(new Date().toLocaleString('zh-CN'))}*\n`;
            await NodeSeekVPS.utils.copyToClipboard(markdownText);
            return true;
        },

        copyImageMarkdown: async () => {
            const isCalculated = document.getElementById('vps-is-calculated').value;
            if (isCalculated !== '1') {
                return false;
            }
            
            // 检查登录状态
            const token = localStorage.getItem('nodeseek_login_token');
            if (!token) {
                NodeSeekVPS.utils.showToast('需要登录才能使用', 'error');
                return false;
            }

            // 如果尚未上传，则执行上传
            if (!NodeSeekVPS.uploadResult) {
                if (NodeSeekVPS.currentSVGContent) {
                    // 使用静默上传
                    NodeSeekVPS.uploadResult = await NodeSeekVPS.uploadSVG(NodeSeekVPS.currentSVGContent, true);
                }
            }

            if (!NodeSeekVPS.uploadResult || !NodeSeekVPS.uploadResult.url) {
                NodeSeekVPS.utils.showToast('上传失败或未找到可分享的图片链接', 'error');
                return false;
            }

            const url = NodeSeekVPS.uploadResult.url;
            const md = `![VPS计算结果](${url})`;
            await NodeSeekVPS.utils.copyToClipboard(md);
            return true;
        },

        copyPlainText: async () => {
            const isCalculated = document.getElementById('vps-is-calculated').value;
            if (isCalculated !== '1') {
                return;
            }

            const referenceRate = document.getElementById('vps-reference-rate').value;
            const exchangeRate = document.getElementById('vps-exchange-rate').value;
            const renewMoney = document.getElementById('vps-renew-money').value;
            const currencyCode = document.getElementById('vps-currency-code').options[document.getElementById('vps-currency-code').selectedIndex].text;
            const paymentCycle = document.getElementById('vps-payment-cycle').options[document.getElementById('vps-payment-cycle').selectedIndex].text;
            const expiryDate = document.getElementById('vps-expiry-date').value;
            const tradeDate = document.getElementById('vps-trade-date').value;
            const tradeMoney = document.getElementById('vps-trade-money').value;
            const tradeCurrencyCode = document.getElementById('vps-trade-currency-code').options[document.getElementById('vps-trade-currency-code').selectedIndex].text;

            const remainDaysElement = document.querySelector('.vps-output-remain-days');
            const expiryDateElement = document.querySelector('.vps-output-expiry-date');
            const remainValueElement = document.querySelector('.vps-output-remain-value');

            const remainDays = remainDaysElement ? remainDaysElement.textContent : '';
            const expiryDateResult = expiryDateElement ? expiryDateElement.textContent : '';
            const remainValue = remainValueElement ? remainValueElement.textContent : '';

            const customRow = document.getElementById('vps-tr-custom-exchange-show');
            let customValue = '';
            if (customRow && customRow.style.display !== 'none' && customRow.innerText) {
                customValue = customRow.innerText;
            }

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
                    premiumLabel = spans[0].textContent.trim();
                    premiumText = spans[1].textContent.trim().replace(/-([\d.]+)/g, '$1');
                }
            }

            let text = `VPS 剩余价值计算器\n\n输入参数\n参考汇率: ${referenceRate}\n外币汇率: ${exchangeRate}\n续费金额: ${renewMoney} ${currencyCode}\n付款周期: ${paymentCycle}\n到期时间: ${expiryDate}\n交易日期: ${tradeDate}\n交易金额: ${tradeMoney && tradeMoney.trim() ? tradeMoney + ' ' + tradeCurrencyCode : ''}\n\n计算结果\n剩余天数: ${remainDays} ${expiryDateResult}\n剩余价值: ${remainValue}`;
            if (customValue) {
                text += `\n${customValue}`;
            }
            text += `\n交易金额: ${tradeMoneyText || ''}`;
            if (premiumLabel && premiumText) {
                text += `\n${premiumLabel} ${premiumText}`;
            }
            text += `\n\n导出时间: ${(new Date().toLocaleString('zh-CN'))}\n`;

            await NodeSeekVPS.utils.copyToClipboard(text);
        },

        updateShareButtonsState: () => {
            const isCalculated = document.getElementById('vps-is-calculated')?.value;
            const token = localStorage.getItem('nodeseek_login_token');

            const copyBtn = document.getElementById('vps-copy-btn');
            if (copyBtn) {
                const enabled = isCalculated === '1';
                copyBtn.disabled = !enabled;
                copyBtn.style.opacity = enabled ? '1' : '0.5';
                copyBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
                copyBtn.title = enabled ? '点击下载' : '请先点击“计算剩余价值”';
            }

            const markdownBtn = document.getElementById('vps-markdown-btn');
            if (markdownBtn) {
                const enabled = isCalculated === '1';
                markdownBtn.disabled = !enabled;
                markdownBtn.style.opacity = enabled ? '1' : '0.5';
                markdownBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
                markdownBtn.title = enabled ? '点击复制文本' : '请先点击“计算剩余价值”';
            }

            const copyMdBtn = document.getElementById('vps-copy-md-btn');
            if (copyMdBtn) {
                const enabled = isCalculated === '1' && !!token;
                copyMdBtn.disabled = !enabled;
                copyMdBtn.style.opacity = enabled ? '1' : '0.5';
                copyMdBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
                if (isCalculated !== '1') {
                    copyMdBtn.title = '请先点击“计算剩余价值”';
                } else if (!token) {
                    copyMdBtn.title = '需要登录才能使用';
                } else {
                    copyMdBtn.title = '点击复制 SVG';
                }
            }
        },

        // 生成SVG内容
        generateSVG: (data) => {
            const escapeXml = (input) => {
                return String(input ?? '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&apos;');
            };

            const inputs = (data && data.inputs) ? data.inputs : {};
            const outputs = (data && data.outputs) ? data.outputs : {};

            const width = 1100;
            const outerPadding = 20;
            const headerH = 0;
            const bodyGap = 20;
            const footerH = 50;
            const gap = 24;

            const now = new Date();
            const dateStr = now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate() + ' ' + now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');

            const inputRows = [
                { label: '参考汇率', sub: inputs.updated_date ? ('(更新时间' + inputs.updated_date + ' (ExchangeRate-API))') : '', value: inputs.reference_rate || '' },
                { label: '外币汇率', sub: '', value: inputs.exchange_rate || '' },
                { label: '续费金额', sub: '', value: (inputs.renew_money || '') + (inputs.currency_text ? (' ' + inputs.currency_text) : '') },
                { label: '付款周期', sub: '', value: inputs.payment_cycle_text || '' },
                { label: '到期时间', sub: '', value: inputs.expiry_date || '' },
                { label: '交易日期', sub: '', value: inputs.trade_date || '' },
                { label: '交易金额（可选）', sub: '', value: (inputs.trade_money ? inputs.trade_money : '') + (inputs.trade_money && inputs.trade_currency_text ? (' ' + inputs.trade_currency_text) : '') }
            ];

            const fieldH = 46;
            const fieldGap = 18;
            let sumRowHeight = 0;
            for (let i = 0; i < inputRows.length; i++) {
                sumRowHeight += (inputRows[i].sub ? 48 : 28) + fieldH + fieldGap;
            }

            const btnH = 0;
            const leftNeededH = 20 + sumRowHeight + 10;
            // rightNeededH 估算: H2(60) + Card1(200) + gap(24) + Card2(160) + pad(20)
            const rightNeededH = 60 + 200 + 24 + 160 + 20;
            const bodyH = Math.max(leftNeededH, rightNeededH);
            const height = outerPadding * 2 + headerH + bodyGap + bodyH + footerH - 50;

            const outer = { x: outerPadding, y: outerPadding, w: width - outerPadding * 2, h: height - outerPadding * 2 };
            const bodyY = outer.y + headerH + bodyGap;
            const panelW = Math.floor((outer.w - gap) / 2);
            // 修正：同步减小面板高度，避免超出 SVG 底部
            const panelH = bodyH - 50; 
            const left = { x: outer.x, y: bodyY, w: panelW, h: panelH };
            const right = { x: outer.x + panelW + gap, y: bodyY, w: panelW, h: panelH };

            const remainDaysLine = (outputs.remain_days !== undefined && outputs.remain_days !== null && outputs.remain_days !== '') ? (String(outputs.remain_days) + ' 天') : '';
            const expiryHint = outputs.expiry_date ? ('(于 ' + outputs.expiry_date + ' 过期)') : '';
            const remainValueLine = (outputs.remain_value ? outputs.remain_value : '') + (outputs.currency_code ? (' ' + outputs.currency_code) : '') + (outputs.remain_value_cny ? (' / ' + outputs.remain_value_cny + ' CNY') : '');

            let tradeMoneyLine = '';
            if (outputs.trade_money && outputs.trade_money !== '') {
                tradeMoneyLine = outputs.trade_money + (outputs.trade_currency_code ? (' ' + outputs.trade_currency_code) : '') + (outputs.trade_money_cny ? (' / ' + outputs.trade_money_cny + ' CNY') : '');
            }

            let premiumLineLabel = '';
            let premiumLineValue = '';
            if (outputs.premium_type && outputs.premium_abs) {
                let premiumForeignAbs = outputs.premium_foreign;
                if (typeof premiumForeignAbs === 'string' && premiumForeignAbs.startsWith('-')) premiumForeignAbs = premiumForeignAbs.replace('-', '');
                premiumLineLabel = outputs.premium_type + ':';
                premiumLineValue = (premiumForeignAbs ? premiumForeignAbs : '') + (outputs.currency_code ? (' ' + outputs.currency_code) : '') + ' / ' + outputs.premium_abs + ' CNY';
            }

            const shareButtons = [
                { label: '下载', w: 84 },
                { label: '复制文本', w: 104 },
                { label: '复制 SVG', w: 100 }
            ];

            const footerText = '导出时间: ' + dateStr;

            const displayScale = 0.7;
            const displayW = Math.round(width * displayScale);
            const displayH = Math.round(height * displayScale);

            let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${displayW}" height="${displayH}" viewBox="0 0 ${width} ${height}">
<defs>
  <linearGradient id="gradBtn" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#4f46e5"/>
    <stop offset="100%" stop-color="#7c3aed"/>
  </linearGradient>
</defs>
<style>
  .font { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .outer { fill: #ffffff; stroke: #eeeeee; stroke-width: 1; }
  .panel { fill: #ffffff; stroke: #eeeeee; stroke-width: 1; }
  .soft { fill: #f8fafc; stroke: #eef2f7; stroke-width: 1; }
  .h2 { font-size: 26px; font-weight: 700; fill: #111827; text-anchor: middle; dominant-baseline: middle; }
  .label { font-size: 18px; font-weight: 700; fill: #111827; dominant-baseline: middle; }
  .sub { font-size: 15px; fill: #6b7280; dominant-baseline: middle; }
  .input { fill: #fafafa; stroke: none; }
  .inputText { font-size: 18px; fill: #111827; dominant-baseline: middle; }
  .resultLabel { font-size: 18px; font-weight: 700; fill: #111827; dominant-baseline: middle; }
  .resultValue { font-size: 18px; fill: #111827; dominant-baseline: middle; }
  .em { fill: #ff0000; font-weight: 700; }
  .pillText { font-size: 14px; font-weight: 700; fill: #ffffff; dominant-baseline: middle; text-anchor: middle; }
  .btn { fill: #ededed; stroke: none; }
  .btnText { font-size: 16px; fill: #111827; dominant-baseline: middle; text-anchor: middle; }
  .footer { font-size: 18px; font-weight: 700; fill: #111827; dominant-baseline: middle; }
</style>
<rect class="outer" x="${outer.x}" y="${outer.y}" width="${outer.w}" height="${outer.h}" rx="16" ry="16"/>
<rect class="panel" x="${left.x}" y="${left.y}" width="${left.w}" height="${left.h}" rx="12" ry="12"/>
<rect class="panel" x="${right.x}" y="${right.y}" width="${right.w}" height="${right.h}" rx="12" ry="12"/>
`;

            const leftInnerX = left.x + 24;
            let cy = left.y + 24;
            const inputW = left.w - 48;

            for (let i = 0; i < inputRows.length; i++) {
                const row = inputRows[i];
                svg += `<text class="font label" x="${leftInnerX}" y="${cy + 14}">${escapeXml(row.label)}</text>`;
                if (row.sub) {
                    svg += `<text class="font sub" x="${leftInnerX}" y="${cy + 37}">${escapeXml(row.sub)}</text>`;
                    cy += 48;
                } else {
                    cy += 28;
                }
                svg += `<rect class="input" x="${leftInnerX}" y="${cy}" width="${inputW}" height="${fieldH}" rx="10" ry="10"/>`;
                svg += `<text class="font inputText" x="${leftInnerX + 16}" y="${cy + fieldH / 2}">${escapeXml(row.value)}</text>`;
                cy += fieldH + fieldGap;
            }

            const btnW = inputW;
            const btnY = cy + 10;
            // svg += `<rect fill="url(#gradBtn)" x="${leftInnerX}" y="${btnY}" width="${btnW}" height="${btnH}" rx="14" ry="14"/>`;
            // svg += `<text class="font pillText" x="${leftInnerX + btnW / 2}" y="${btnY + btnH / 2}">计算剩余价值</text>`;

            const rightInnerX = right.x + 24;
            svg += `<text class="font h2" x="${right.x + right.w / 2}" y="${right.y + 50}">计算结果</text>`;

            const card1 = { x: rightInnerX, y: right.y + 90, w: right.w - 48, h: 200 };
            svg += `<rect class="soft" x="${card1.x}" y="${card1.y}" width="${card1.w}" height="${card1.h}" rx="12" ry="12"/>`;

            const rLabelX = card1.x + 24;
            const rValueX = card1.x + 120;
            let ry = card1.y + 40;

            svg += `<text class="font resultLabel" x="${rLabelX}" y="${ry}">剩余天数:</text>`;
            svg += `<text x="${rValueX}" y="${ry}" class="font resultValue">
                      <tspan class="em">${escapeXml(remainDaysLine)}</tspan>
                      <tspan class="sub" dx="10">${escapeXml(expiryHint)}</tspan>
                    </text>`;
            ry += 42;

            svg += `<text class="font resultLabel" x="${rLabelX}" y="${ry}">剩余价值:</text>`;
            svg += `<text class="font resultValue em" x="${rValueX}" y="${ry}">${escapeXml(remainValueLine)}</text>`;
            ry += 42;

            svg += `<text class="font resultLabel" x="${rLabelX}" y="${ry}">交易金额:</text>`;
            svg += `<text class="font resultValue" x="${rValueX}" y="${ry}">${escapeXml(tradeMoneyLine)}</text>`;
            ry += 42;

            svg += `<text class="font resultLabel" x="${rLabelX}" y="${ry}">${escapeXml(premiumLineLabel || '溢价:')}</text>`;
            svg += `<text class="font resultValue" x="${rValueX}" y="${ry}">${escapeXml(premiumLineValue)}</text>`;

            const card2 = { x: rightInnerX, y: card1.y + card1.h + 24, w: right.w - 48, h: 160 };
            svg += `<rect class="soft" x="${card2.x}" y="${card2.y}" width="${card2.w}" height="${card2.h}" rx="12" ry="12"/>`;
            svg += `<text class="font label" x="${card2.x + card2.w / 2}" y="${card2.y + 40}" text-anchor="middle">分享功能</text>`;

            const btnY2 = card2.y + 80;
            const totalBtnW = shareButtons.reduce((sum, b) => sum + (b.w + 20), 0) + (shareButtons.length - 1) * 10; 
            // Note: I need to update shareButtons widths in the definition if I want them wider, 
            // but here I just added +20 to each for calculation, which is wrong if I don't update the object.
            // Let's rely on updated shareButtons definition which I should do.
            
            // Re-calculating center based on new widths (I will update shareButtons array in next tool call or this one if possible, but search/replace is tricky for that).
            // Let's assume I update shareButtons widths: 84->100, 104->120, 96->110.
            const updatedShareButtons = [
                { label: '下载', w: 100 },
                { label: '复制文本', w: 120 },
                { label: '复制 SVG', w: 115 }
            ];
            const realTotalBtnW = updatedShareButtons.reduce((sum, b) => sum + b.w, 0) + (updatedShareButtons.length - 1) * 10;
            let bx = card2.x + (card2.w - realTotalBtnW) / 2;
            
            for (let i = 0; i < updatedShareButtons.length; i++) {
                const b = updatedShareButtons[i];
                svg += `<rect class="btn" x="${bx}" y="${btnY2}" width="${b.w}" height="36" rx="8" ry="8"/>`;
                svg += `<text class="font btnText" x="${bx + b.w / 2}" y="${btnY2 + 18}">${escapeXml(b.label)}</text>`;
                bx += b.w + 10;
            }

            const footerX = outer.x + outer.w - 30;
            const footerY = outer.y + outer.h - 41;
            svg += `<text class="font footer" x="${footerX}" y="${footerY}" text-anchor="end">${escapeXml(footerText)}</text>`;
            svg += `</svg>`;
            return svg;
        },

        // 上传SVG
        uploadSVG: async (svgContent, silent = false) => {
            const token = localStorage.getItem('nodeseek_login_token');
            if (!token) return null;

            const serverUrl = 'https://hb.396663.xyz'; 
            
            try {
                // 显示上传中...
                if (!silent) {
                    NodeSeekVPS.utils.showToast('正在上传计算结果...', 'tips');
                }
                
                const response = await fetch(`${serverUrl}/api/vps/upload_svg`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ svg: svgContent })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        if (!silent) {
                            NodeSeekVPS.utils.showToast('上传成功', 'success');
                        }
                        try { window.dispatchEvent(new CustomEvent('ns-storage-changed')); } catch (e) { }
                        return {
                            url: `${serverUrl}${data.url}`,
                            filename: data.filename,
                            id: data.id
                        };
                    } else {
                        NodeSeekVPS.utils.showToast('上传失败: ' + data.message, 'error');
                    }
                } else {
                    if (response.status === 401) {
                        // Token 失效处理
                        localStorage.removeItem('nodeseek_login_token');
                        const copyMdBtn = document.getElementById('vps-copy-md-btn');
                        if (copyMdBtn) {
                            copyMdBtn.style.opacity = '0.5';
                            copyMdBtn.style.cursor = 'not-allowed';
                            copyMdBtn.title = '登录已失效，请重新登录';
                        }
                        NodeSeekVPS.utils.showToast('登录已失效，请重新登录', 'error');
                        return null;
                    }

                    let errorMessage = 'HTTP ' + response.status;
                    try {
                        const errorData = await response.json();
                        if (errorData && errorData.message) {
                            errorMessage = errorData.message;
                        }
                    } catch (e) {
                        // Ignore json parse error
                    }
                    
                    if (response.status === 413) {
                         NodeSeekVPS.utils.showToast('上传失败: 存储空间不足', 'error');
                    } else {
                         NodeSeekVPS.utils.showToast('上传失败: ' + errorMessage, 'error');
                    }
                }
            } catch (error) {
                NodeSeekVPS.utils.showToast('SVG上传出错', 'error');
            }
            return null;
        },

        // 绑定事件监听器
        bindEventListeners: () => {
            // 表单字段变化监听
            ['vps-exchange-rate', 'vps-renew-money', 'vps-payment-cycle', 'vps-expiry-date', 'vps-trade-date', 'vps-trade-money'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('change', function () {
                        document.getElementById('vps-is-calculated').value = '0';
                    });
                }
            });

            // 交易金额货币单位变化监听 - 特殊处理
            const tradeCurrencySelect = document.getElementById('vps-trade-currency-code');
            if (tradeCurrencySelect) {
                tradeCurrencySelect.addEventListener('change', function () {
                    // 仅当已计算且“交易金额”有值时才自动重新计算
                    const isCalculated = document.getElementById('vps-is-calculated').value;
                    const tradeMoneyInput = document.getElementById('vps-trade-money');
                    const hasTradeMoney = tradeMoneyInput && typeof tradeMoneyInput.value === 'string' && tradeMoneyInput.value.trim() !== '';
                    if (isCalculated === '1' && hasTradeMoney) {
                        NodeSeekVPS.calculateVPSValue();
                    } else if (!isCalculated || isCalculated === '') {
                        // 如果还没计算过，标记为未计算状态
                        document.getElementById('vps-is-calculated').value = '0';
                    }
                    // 若“交易金额”为空则不触发任何计算
                });
            }

            // 币种变化监听 - 特殊处理
            const currencySelect = document.getElementById('vps-currency-code');
            if (currencySelect) {
                currencySelect.addEventListener('change', function () {
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
                copyBtn.addEventListener('mouseenter', NodeSeekVPS.updateShareButtonsState);
            }

            // Markdown复制按钮
            const markdownBtn = document.getElementById('vps-markdown-btn');
            if (markdownBtn) {
                markdownBtn.addEventListener('click', async () => {
                    if (markdownBtn.disabled) return;
                    const ok = await NodeSeekVPS.copyMarkdownText(); // 恢复调用 copyMarkdownText 而不是 copyPlainText
                    if (!ok) return;
                    const text = document.getElementById('vps-markdown-text');
                    const copied = document.getElementById('vps-markdown-copied');
                    if (text && copied) {
                        text.style.opacity = '0';
                        copied.style.opacity = '1';
                    }
                });
                markdownBtn.addEventListener('mouseenter', NodeSeekVPS.updateShareButtonsState);
            }

            // 复制 MD 按钮 (新)
            const copyMdBtn = document.getElementById('vps-copy-md-btn');
            if (copyMdBtn) {
                // 初始化检查
                NodeSeekVPS.updateShareButtonsState();

                // 鼠标移入时再次检查（处理多标签页登录状态变化）
                copyMdBtn.addEventListener('mouseenter', NodeSeekVPS.updateShareButtonsState);

                copyMdBtn.addEventListener('click', async () => {
                    // 如果被禁用则不执行
                    if (copyMdBtn.disabled || copyMdBtn.style.cursor === 'not-allowed') return;

                    const success = await NodeSeekVPS.copyImageMarkdown();
                    if (success) {
                        const text = document.getElementById('vps-copy-md-text');
                        const copied = document.getElementById('vps-copy-md-copied');
                        if (text && copied) {
                            text.style.opacity = '0';
                            copied.style.opacity = '1';
                        }
                    }
                });
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

            // 货币转换器按钮
            const converterBtn = document.getElementById('vps-converter-btn');
            if (converterBtn) {
                converterBtn.addEventListener('click', NodeSeekVPS.openCurrencyConverter);
            }

            // 计算器按钮
            const calculatorToolBtn = document.getElementById('vps-calculator-tool-btn');
            if (calculatorToolBtn) {
                calculatorToolBtn.addEventListener('click', NodeSeekVPS.openCalculatorTool);
            }

            // 输入框焦点事件
            ['vps-exchange-rate', 'vps-renew-money', 'vps-trade-date', 'vps-expiry-date', 'vps-trade-money', 'vps-trade-currency-code'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('focus', function () {
                        this.classList.remove('error');
                        NodeSeekVPS.utils.hideError();
                    });
                }
            });

            NodeSeekVPS.updateShareButtonsState();
        },

        bindAuthHintLiveUpdates: (dialog) => {
            try {
                if (!dialog) return;
                let lastLoggedIn = null;
                let timerId = null;
                let observer = null;
                const update = () => {
                    let loggedIn = false;
                    try {
                        loggedIn = !!localStorage.getItem('nodeseek_login_token');
                    } catch (e) {
                        loggedIn = false;
                    }
                    if (lastLoggedIn === loggedIn) return;
                    lastLoggedIn = loggedIn;
                    const hint = dialog.querySelector('#vps-svg-login-hint');
                    if (hint) hint.style.display = loggedIn ? 'none' : 'inline';
                    try { NodeSeekVPS.updateShareButtonsState(); } catch (e) { }
                };

                update();

                const onAuthChanged = () => update();
                const onStorage = (e) => {
                    try {
                        if (!e || !e.key) return;
                        if (e.key === 'nodeseek_login_token' || e.key === 'nodeseek_login_user') update();
                    } catch (err) { }
                };

                window.addEventListener('ns-auth-changed', onAuthChanged);
                window.addEventListener('storage', onStorage);

                const cleanup = () => {
                    try { window.removeEventListener('ns-auth-changed', onAuthChanged); } catch (e) { }
                    try { window.removeEventListener('storage', onStorage); } catch (e) { }
                    try { if (timerId) clearInterval(timerId); } catch (e) { }
                    try { if (observer) observer.disconnect(); } catch (e) { }
                };

                const closeBtn = dialog.querySelector('.close-btn');
                if (closeBtn) {
                    closeBtn.onclick = (ev) => {
                        try { if (ev && typeof ev.preventDefault === 'function') ev.preventDefault(); } catch (e) { }
                        cleanup();
                        try { dialog.remove(); } catch (e) { }
                    };
                }

                observer = new MutationObserver(() => {
                    try {
                        if (!document.body.contains(dialog)) cleanup();
                    } catch (e) { }
                });
                try { observer.observe(document.body, { childList: true, subtree: true }); } catch (e) { }

                timerId = setInterval(() => {
                    try {
                        if (!document.body.contains(dialog)) {
                            cleanup();
                            return;
                        }
                        update();
                    } catch (e) { }
                }, 200);
            } catch (e) { }
        },

        // 打开货币转换器
        openCurrencyConverter: () => {
            const dialogId = 'vps-converter-dialog';
            const existingDialog = document.getElementById(dialogId);
            if (existingDialog) {
                // 如果已存在，则关闭
                existingDialog.remove();
                return;
            }

            const dialog = document.createElement('div');
            dialog.id = dialogId;
            const isMobile = window.innerWidth <= 768;
            const dialogWidth = isMobile ? Math.min(400, window.innerWidth * 0.95) : 400;
            const dialogHeight = 370;
            const left = Math.max(0, (window.innerWidth - dialogWidth) / 2);
            const top = Math.max(0, (window.innerHeight - dialogHeight) / 2);

            dialog.style.cssText = `
                position: fixed;
                left: ${left}px;
                top: ${top}px;
                width: ${dialogWidth}px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10003;
                padding: 20px;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                max-height: 90vh;
                overflow-y: auto;
            `;

            // 拖动句柄
            const dragHandle = document.createElement('div');
            dragHandle.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 40px;
                z-index: 0;
                cursor: move;
            `;

            const currencies = [
                { code: 'CNY', name: '人民币 (CNY)' },
                { code: 'USD', name: '美元 (USD)' },
                { code: 'EUR', name: '欧元 (EUR)' },
                { code: 'GBP', name: '英镑 (GBP)' },
                { code: 'JPY', name: '日元 (JPY)' },
                { code: 'KRW', name: '韩元 (KRW)' },
                { code: 'HKD', name: '港元 (HKD)' },
                { code: 'TWD', name: '新台币 (TWD)' },
                { code: 'CAD', name: '加拿大元 (CAD)' },
                { code: 'SGD', name: '新加坡元 (SGD)' },
                { code: 'AUD', name: '澳大利亚元 (AUD)' }
            ];

            const optionsHtml = currencies.map(c => `<option value="${c.code}">${c.name}</option>`).join('');

            dialog.innerHTML = `
                <div style="position: relative; z-index: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0; color: #333;">货币转换器</h3>
                        <span style="cursor: pointer; font-size: 24px; color: #666;" onclick="this.closest('#${dialogId}').remove()">×</span>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">金额</label>
                        <input type="number" id="vps-conv-amount" value="" style="width: 100%; height: 36px; padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; font-size: 14px; line-height: 1.2;">
                    </div>

                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">从</label>
                            <select id="vps-conv-from" style="width: 100%; height: 36px; padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                                ${optionsHtml}
                            </select>
                        </div>
                        <div style="display: flex; align-items: flex-end; padding-bottom: 10px;">
                            <span id="vps-conv-swap" title="互换" style="font-size: 18px; cursor: pointer; user-select: none; width: 36px; height: 36px; border-radius: 50%; border: 1px solid #ddd; background: #f5f5f5; display: flex; align-items: center; justify-content: center; color: #333; transition: transform 0.2s ease;">⇄</span>
                        </div>
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">到</label>
                            <select id="vps-conv-to" style="width: 100%; height: 36px; padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                                ${optionsHtml}
                            </select>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                         <button id="vps-conv-btn" style="width: 100%; background: #2196F3; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; height: 40px;">转换</button>
                    </div>

                    <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; text-align: center; min-height: 100px;">
                        <div style="font-size: 14px; color: #666; margin-bottom: 5px;">结果</div>
                        <div id="vps-conv-result" style="font-size: 24px; font-weight: bold; color: #333; min-height: 36px; display: flex; align-items: center; justify-content: center;">-</div>
                        <div id="vps-conv-rate" style="font-size: 12px; color: #999; margin-top: 5px; min-height: 18px;"></div>
                    </div>
                </div>
            `;

            // 插入拖动句柄到最前
            dialog.insertBefore(dragHandle, dialog.firstChild);

            document.body.appendChild(dialog);
            const style = document.createElement('style');
            style.textContent = `
                @media (max-width: 768px) {
                    #${dialogId} {
                        width: 95% !important;
                        left: 2.5% !important;
                        top: 5% !important;
                        max-height: 90vh !important;
                        overflow-y: auto !important;
                    }
                    #${dialogId} input,
                    #${dialogId} select,
                    #${dialogId} button {
                        font-size: 16px !important;
                    }
                }
            `;
            document.head.appendChild(style);

            const swapStyle = document.createElement('style');
            swapStyle.textContent = `
                #${dialogId} #vps-conv-swap { transform: scale(0.8) translateY(13px); }
                #${dialogId} #vps-conv-swap:hover { background: #e9ecef; }
                #${dialogId} #vps-conv-swap:active { transform: scale(0.8) translateY(13px) rotate(180deg); }
            `;
            document.head.appendChild(swapStyle);

            // 设置默认值
            document.getElementById('vps-conv-from').value = 'USD';
            document.getElementById('vps-conv-to').value = 'CNY';

            // 绑定事件
            const calculate = () => {
                const amount = parseFloat(document.getElementById('vps-conv-amount').value);
                const from = document.getElementById('vps-conv-from').value;
                const to = document.getElementById('vps-conv-to').value;

                if (isNaN(amount)) {
                    document.getElementById('vps-conv-result').textContent = '';
                    document.getElementById('vps-conv-rate').textContent = '';
                    return;
                }

                const rateFrom = NodeSeekVPS.rates[from] || 1;
                const rateTo = NodeSeekVPS.rates[to] || 1;

                const rate = rateTo / rateFrom;
                const result = amount * rate;

                document.getElementById('vps-conv-result').textContent = NodeSeekVPS.utils.formatNumber(result, 2) + ' ' + to;
                document.getElementById('vps-conv-rate').textContent = `1 ${from} ≈ ${NodeSeekVPS.utils.formatNumber(rate, 4)} ${to}`;
            };

            document.getElementById('vps-conv-btn').onclick = calculate;

            // 回车触发转换
            dialog.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    calculate();
                }
            });
            calculate();

            // 互换左右货币
            const swapEl = document.getElementById('vps-conv-swap');
            if (swapEl) {
                swapEl.onclick = () => {
                    const fromEl = document.getElementById('vps-conv-from');
                    const toEl = document.getElementById('vps-conv-to');
                    const tmp = fromEl.value;
                    fromEl.value = toEl.value;
                    toEl.value = tmp;
                    calculate();
                };
            }

            // 拖动逻辑
            let isDragging = false;
            let startX, startY, initialLeft, initialTop;

            const handleMouseMove = (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                dialog.style.left = `${initialLeft + dx}px`;
                dialog.style.top = `${initialTop + dy}px`;
            };

            const handleMouseUp = () => {
                isDragging = false;
                dialog.style.cursor = 'default';
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };

            if (window.innerWidth > 768) {
                dragHandle.onmousedown = (e) => {
                    isDragging = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    initialLeft = dialog.offsetLeft;
                    initialTop = dialog.offsetTop;
                    dialog.style.cursor = 'grabbing';
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                };
            }
        },

        // 打开计算器工具
        openCalculatorTool: () => {
            // 使用时间戳生成唯一ID，允许多个计算器实例
            const dialogId = 'vps-calculator-tool-dialog-' + Date.now();

            // 计算已存在的计算器数量，用于位置偏移
            const existingCalculators = document.querySelectorAll('[id^="vps-calculator-tool-dialog-"]');
            const offset = existingCalculators.length * 30; // 每个新实例偏移30px

            const dialog = document.createElement('div');
            dialog.id = dialogId;
            const isMobile = window.innerWidth <= 768;
            const dialogWidth = isMobile ? Math.min(400, window.innerWidth * 0.95) : 400;
            const dialogHeight = 580;
            // 仅在PC端（宽度大于768px）偏移500px，移动端保持居中
            const left = Math.max(0, (window.innerWidth - dialogWidth) / 2 + offset + (!isMobile ? 500 : 0));
            const top = Math.max(0, (window.innerHeight - dialogHeight) / 2 + offset);

            dialog.style.cssText = `
                position: fixed;
                left: ${left}px;
                top: ${top}px;
                width: ${dialogWidth}px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                z-index: 10003;
                padding: 20px;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                max-height: 90vh;
                overflow-y: auto;
            `;

            // 拖动句柄
            const dragHandle = document.createElement('div');
            dragHandle.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 40px;
                z-index: 0;
                cursor: move;
            `;

            // Make dialog focusable to receive keyboard events
            dialog.tabIndex = -1;
            dialog.style.outline = 'none'; // Remove focus outline

            // Focus dialog when clicked
            dialog.addEventListener('mousedown', () => {
                dialog.focus();
                // Bring to front
                const maxZ = Math.max(...Array.from(document.querySelectorAll('[id^="vps-calculator-tool-dialog-"]')).map(el => parseInt(el.style.zIndex || 10003)));
                dialog.style.zIndex = maxZ + 1;
            });

            dialog.innerHTML = `
                <div style="position: relative; z-index: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: #333;">计算器</h3>
                        <span style="cursor: pointer; font-size: 24px; color: #666;" onclick="this.closest('#${dialogId}').remove()">×</span>
                    </div>

                    <!-- 计算步骤显示区域 -->
                    <div class="calc-steps" style="height: 100px; overflow-y: auto; background: #f8f9fa; padding: 10px; border-radius: 8px; margin-bottom: 10px; font-size: 13px; color: #666; line-height: 1.6;">
                        <div style="color: #999; font-style: italic;">计算步骤将显示在这里...</div>
                    </div>

                    <!-- 显示屏 -->
                    <div class="calc-display" style="background: #2c3e50; color: #ecf0f1; padding: 20px; border-radius: 8px; margin-bottom: 15px; text-align: right; font-size: 32px; font-weight: bold; min-height: 60px; word-wrap: break-word; overflow-x: auto;">0</div>

                    <!-- 按钮区域 -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
                        <!-- 第一行 -->
                        <button class="calc-btn calc-clear" style="background: #e74c3c; color: white;">C</button>
                        <button class="calc-btn calc-delete" style="background: #95a5a6; color: white;">⌫</button>
                        <button class="calc-btn calc-operator" data-op="/">÷</button>
                        <button class="calc-btn calc-operator" data-op="*">×</button>

                        <!-- 第二行 -->
                        <button class="calc-btn calc-number" data-num="7">7</button>
                        <button class="calc-btn calc-number" data-num="8">8</button>
                        <button class="calc-btn calc-number" data-num="9">9</button>
                        <button class="calc-btn calc-operator" data-op="-">−</button>

                        <!-- 第三行 -->
                        <button class="calc-btn calc-number" data-num="4">4</button>
                        <button class="calc-btn calc-number" data-num="5">5</button>
                        <button class="calc-btn calc-number" data-num="6">6</button>
                        <button class="calc-btn calc-operator" data-op="+">+</button>

                        <!-- 第四行 -->
                        <button class="calc-btn calc-number" data-num="1">1</button>
                        <button class="calc-btn calc-number" data-num="2">2</button>
                        <button class="calc-btn calc-number" data-num="3">3</button>
                        <button class="calc-btn calc-equals" style="background: #27ae60; color: white; grid-row: span 2;">=</button>

                        <!-- 第五行 -->
                        <button class="calc-btn calc-number" data-num="0" style="grid-column: span 2;">0</button>
                        <button class="calc-btn calc-number" data-num=".">.</button>
                    </div>
                </div>

                <style>
                    .calc-btn {
                        padding: 18px;
                        font-size: 20px;
                        font-weight: bold;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                        background: #ecf0f1;
                        color: #2c3e50;
                    }
                    .calc-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                    }
                    .calc-btn:active {
                        transform: translateY(0);
                    }
                    .calc-operator {
                        background: #3498db !important;
                        color: white !important;
                    }
                    .calc-steps::-webkit-scrollbar {
                        width: 6px;
                    }
                    .calc-steps::-webkit-scrollbar-thumb {
                        background: #bbb;
                        border-radius: 3px;
                    }
                </style>
            `;

            // 插入拖动句柄到最前
            dialog.insertBefore(dragHandle, dialog.firstChild);
            document.body.appendChild(dialog);

            // Auto-focus the new dialog
            dialog.focus();

            // 计算器逻辑
            let currentValue = '0';
            let previousValue = '';
            let operator = '';
            let steps = [];
            let hasInput = false; // 标记是否有新输入
            let resultDisplayed = false; // 标记是否刚显示结果

            const display = dialog.querySelector('.calc-display');
            const stepsDiv = dialog.querySelector('.calc-steps');

            const updateDisplay = () => {
                display.textContent = currentValue;
            };

            // 捕获当前状态
            const captureState = () => ({
                currentValue,
                previousValue,
                operator,
                hasInput,
                resultDisplayed
            });

            // 恢复状态
            const restoreState = (index) => {
                const step = steps[index];
                const state = step.state;

                currentValue = state.currentValue;
                previousValue = state.previousValue;
                operator = state.operator;
                hasInput = state.hasInput;
                resultDisplayed = state.resultDisplayed;

                // 截断历史记录到当前步
                steps = steps.slice(0, index + 1);
                renderSteps();
                updateDisplay();
            };

            const addStep = (text, state) => {
                steps.push({ text, state: state || captureState() });
                renderSteps();
            };

            const updateLastStep = (text, state) => {
                if (steps.length > 0) {
                    steps[steps.length - 1] = { text, state: state || captureState() };
                    renderSteps();
                } else {
                    addStep(text, state);
                }
            };

            const renderSteps = () => {
                stepsDiv.innerHTML = '';
                steps.forEach((step, index) => {
                    const div = document.createElement('div');
                    div.textContent = step.text;
                    div.style.cursor = 'pointer';
                    div.style.padding = '4px 8px';
                    div.style.borderRadius = '4px';
                    div.style.marginBottom = '2px';
                    div.style.transition = 'background 0.2s';
                    div.title = '点击恢复到此步';

                    div.onmouseover = () => div.style.background = '#e9ecef';
                    div.onmouseout = () => div.style.background = 'transparent';
                    div.onclick = () => restoreState(index);

                    stepsDiv.appendChild(div);
                });
                stepsDiv.scrollTop = stepsDiv.scrollHeight;
            };

            const clearSteps = () => {
                steps = [];
                stepsDiv.innerHTML = '<div style="color: #999; font-style: italic; padding: 4px 8px;">计算步骤将显示在这里...</div>';
            };

            // 计算函数
            const calculate = () => {
                if (!operator || !previousValue) return;

                const prev = parseFloat(previousValue);
                const current = parseFloat(currentValue);
                let result;

                const opSymbol = { '+': '+', '-': '−', '*': '×', '/': '÷' }[operator];

                // 准备结果状态
                let resultState = {
                    previousValue: '',
                    operator: '',
                    hasInput: true,
                    resultDisplayed: true
                };

                switch (operator) {
                    case '+':
                        result = prev + current;
                        break;
                    case '-':
                        result = prev - current;
                        break;
                    case '*':
                        result = prev * current;
                        break;
                    case '/':
                        if (current === 0) {
                            result = 'Error';
                            resultState.currentValue = 'Error';
                            updateLastStep(`${previousValue} ${opSymbol} ${currentValue} = Error`, resultState);
                        } else {
                            result = prev / current;
                        }
                        break;
                }

                if (result !== 'Error') {
                    // 格式化结果，避免精度问题
                    result = parseFloat(result.toPrecision(12));
                    // 移除末尾多余的0
                    if (result.toString().includes('.')) {
                        result = parseFloat(result);
                    }

                    resultState.currentValue = result.toString();
                    updateLastStep(`${previousValue} ${opSymbol} ${currentValue} = ${result}`, resultState);
                }

                // 应用状态
                currentValue = resultState.currentValue;
                operator = resultState.operator;
                previousValue = resultState.previousValue;
                hasInput = resultState.hasInput;
                resultDisplayed = resultState.resultDisplayed;

                updateDisplay();
            };

            // 数字按钮
            dialog.querySelectorAll('.calc-number').forEach(btn => {
                btn.onclick = () => {
                    const num = btn.dataset.num;

                    // 如果刚显示结果，重新开始输入
                    if (resultDisplayed) {
                        currentValue = '0';
                        resultDisplayed = false;
                        // 开始新的一步
                    }

                    if (currentValue === '0' || currentValue === 'Error') {
                        currentValue = num === '.' ? '0.' : num;
                    } else {
                        if (num === '.' && currentValue.includes('.')) return;
                        currentValue += num;
                    }
                    hasInput = true;
                    updateDisplay();

                    // 如果正在进行运算（有运算符），更新步骤显示当前输入的第二个数
                    if (operator && previousValue) {
                        const opSymbol = { '+': '+', '-': '−', '*': '×', '/': '÷' }[operator];
                        updateLastStep(`${previousValue} ${opSymbol} ${currentValue}`, captureState());
                    }
                };
            });

            // 运算符按钮
            dialog.querySelectorAll('.calc-operator').forEach(btn => {
                btn.onclick = () => {
                    // 如果已经有前一个值和运算符，且当前有新输入，则进行连续计算
                    if (previousValue && operator && hasInput) {
                        calculate();
                    }

                    // 如果是连续点击运算符（没有新输入），只更新运算符
                    if (previousValue && !hasInput) {
                        operator = btn.dataset.op;
                        const opSymbol = { '+': '+', '-': '−', '*': '×', '/': '÷' }[operator];
                        // 更新最后一步的运算符
                        updateLastStep(`${previousValue} ${opSymbol}`, captureState());
                        return;
                    }

                    operator = btn.dataset.op;
                    previousValue = currentValue;

                    const opSymbol = { '+': '+', '-': '−', '*': '×', '/': '÷' }[operator];

                    // 先更新状态变量，以便 captureState 捕获正确的状态
                    currentValue = '0';
                    hasInput = false;
                    resultDisplayed = false;

                    // 添加新步骤，使用当前状态（此时 previousValue 已设置，operator 已设置）
                    addStep(`${previousValue} ${opSymbol}`, captureState());
                };
            });

            // 等号按钮
            dialog.querySelector('.calc-equals').onclick = () => {
                calculate();
            };

            // 清除按钮
            dialog.querySelector('.calc-clear').onclick = () => {
                currentValue = '0';
                previousValue = '';
                operator = '';
                hasInput = false;
                resultDisplayed = false;
                clearSteps();
                updateDisplay();
            };

            // 删除按钮
            dialog.querySelector('.calc-delete').onclick = () => {
                if (resultDisplayed) {
                    currentValue = '0';
                    resultDisplayed = false;
                } else if (currentValue.length > 1) {
                    currentValue = currentValue.slice(0, -1);
                } else {
                    currentValue = '0';
                }
                updateDisplay();

                // 如果正在输入第二个数，也更新步骤显示
                if (operator && previousValue) {
                    const opSymbol = { '+': '+', '-': '−', '*': '×', '/': '÷' }[operator];
                    updateLastStep(`${previousValue} ${opSymbol} ${currentValue}`, captureState());
                }
            };

            // 拖动逻辑
            let isDragging = false;
            let startX, startY, initialLeft, initialTop;

            const handleMouseMove = (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                dialog.style.left = `${initialLeft + dx}px`;
                dialog.style.top = `${initialTop + dy}px`;
            };

            const handleMouseUp = () => {
                isDragging = false;
                dialog.style.cursor = 'default';
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };

            if (window.innerWidth > 768) {
                dragHandle.onmousedown = (e) => {
                    isDragging = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    initialLeft = dialog.offsetLeft;
                    initialTop = dialog.offsetTop;
                    dialog.style.cursor = 'grabbing';
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                    // Also focus on drag start
                    dialog.focus();
                    const maxZ = Math.max(...Array.from(document.querySelectorAll('[id^="vps-calculator-tool-dialog-"]')).map(el => parseInt(el.style.zIndex || 10003)));
                    dialog.style.zIndex = maxZ + 1;
                };
            }

            // 键盘事件监听
            const handleKeyboard = (e) => {
                // Stop propagation to prevent other listeners from firing if we handled it
                // But we only want to handle it if THIS dialog is focused
                if (document.activeElement !== dialog && !dialog.contains(document.activeElement)) {
                    return;
                }

                const key = e.key;

                // 数字键 0-9
                if (/^[0-9]$/.test(key)) {
                    e.preventDefault();
                    const btn = dialog.querySelector(`.calc-number[data-num="${key}"]`);
                    if (btn) btn.click();
                }
                // 小数点
                else if (key === '.') {
                    e.preventDefault();
                    const btn = dialog.querySelector(`.calc-number[data-num="."]`);
                    if (btn) btn.click();
                }
                // 运算符
                else if (['+', '-', '*', '/'].includes(key)) {
                    e.preventDefault();
                    const btn = dialog.querySelector(`.calc-operator[data-op="${key}"]`);
                    if (btn) btn.click();
                }
                // 等号 (Enter 或 =)
                else if (key === 'Enter' || key === '=') {
                    e.preventDefault();
                    dialog.querySelector('.calc-equals').click();
                }
                // 清除 (Escape 或 c/C)
                else if (key === 'Escape' || key.toLowerCase() === 'c') {
                    e.preventDefault();
                    dialog.querySelector('.calc-clear').click();
                }
                // 删除 (Backspace 或 Delete)
                else if (key === 'Backspace' || key === 'Delete') {
                    e.preventDefault();
                    dialog.querySelector('.calc-delete').click();
                }
            };

            // 添加键盘事件监听
            // Attach to dialog instead of document
            dialog.addEventListener('keydown', handleKeyboard);
        },


        // 创建计算器弹窗
        createCalculatorDialog: () => {
            const dialog = document.createElement('div');
            dialog.id = 'vps-calculator-dialog';
            // 计算屏幕中心点
            const dialogWidth = 800;
            const dialogHeight = 600;
            const left = Math.max(0, (window.innerWidth - dialogWidth) / 2);
            const top = Math.max(0, (window.innerHeight - dialogHeight) / 2 - 50);
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
                    <div class="header-container" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: #ffffff; border-radius: 12px; padding: 12px 16px; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
                        <div class="title-error-container" style="display: flex; align-items: center; gap: 15px;">
                            <h2 style="margin: 0; color: #333;">VPS 剩余价值计算器</h2>
                            <button id="vps-converter-btn" type="button" style="margin-left: 10px; padding: 4px 8px; cursor: pointer; background: #673AB7; color: white; border: none; border-radius: 4px; font-size: 13px;">货币转换</button>
                            <button id="vps-calculator-tool-btn" type="button" style="margin-left: 10px; padding: 4px 8px; cursor: pointer; background: #FF9800; color: white; border: none; border-radius: 4px; font-size: 13px;">计算器</button>
                            <span id="vps-error-message" style="color: #dc3545; font-size: 15px; font-weight: bold; display: none; margin-left: 150px;"></span>
                        </div>
                        <span class="close-btn" style="cursor: pointer; font-size: 24px; color: #666;" onclick="this.closest('#vps-calculator-dialog').remove()">×</span>
                    </div>

                        <div style="display: flex; gap: 20px; min-height: 500px;">
                        <!-- 左侧输入面板 -->
                        <div style="flex: 1; background: #ffffff; border: 1px solid #eee; box-shadow: 0 8px 24px rgba(0,0,0,0.04); padding: 20px; border-radius: 12px; color: #333;">

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
                                        <input type="number" id="vps-trade-money" placeholder="实际成交金额" min="0" step="0.01" oninput="if(value.length>7)value=value.slice(0,7)" style="flex: 1; padding: 8px; border: none; border-radius: 6px; background: #fafafa; color: #333;">
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

                                <button type="submit" id="vps-calculate-btn" style="width: 100%; background: linear-gradient(90deg, #4f46e5, #7c3aed); color: #fff; border: none; padding: 12px; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: bold; transition: all 0.3s; display: flex; align-items: center; justify-content: center;">
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
                        <div style="flex: 1; background: #ffffff; border: 1px solid #eee; box-shadow: 0 8px 24px rgba(0,0,0,0.04); padding: 20px; border-radius: 12px; color: #333;">
                            <h3 style="margin: 0 0 20px 0; text-align: center; font-size: 20px;">计算结果</h3>

                            <div id="vps-result" style="background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #eef2f7;">
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
                            <div id="vps-share" style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #eef2f7;">
                                 <h4 style="margin: 0 0 15px 0; text-align: center;">分享功能<span id="vps-svg-login-hint" style="font-size: 12px; font-weight: normal; color: #666; margin-left: 5px;">（SVG需要登录使用）</span></h4>
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
                                    <button id="vps-copy-md-btn" style="background: #ededed; color: #333; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; min-width: 70px; position: relative; overflow: hidden;">
                                        <span id="vps-copy-md-text" style="transition: opacity 0.2s; opacity: 1; position: absolute; left: 0; right: 0; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center;">复制 SVG</span>
                                        <span id="vps-copy-md-copied" style="transition: opacity 0.2s; opacity: 0; position: absolute; left: 0; right: 0; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center;">已复制</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <style>
                    .header-container h2 { font-weight: 700; }
                    #vps-calculate-btn { box-shadow: 0 6px 16px rgba(79,70,229,0.25); }
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

                    #vps-calculate-btn:hover { transform: translateY(-2px); opacity: 0.95; }

                    #vps-view-btn:hover,
                    #vps-copy-btn:not(:disabled):hover,
                    #vps-markdown-btn:not(:disabled):hover,
                    #vps-copy-md-btn:not(:disabled):hover {
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
                            border-radius: 12px !important;
                        }

                        /* 移动端分享按钮优化 */
                        #vps-share .button-container {
                            flex-direction: column !important;
                            gap: 10px !important;
                        }

                        #vps-copy-btn,
                        #vps-markdown-btn,
                        #vps-copy-md-btn {
                            width: 100% !important;
                            padding: 10px !important;
                        }
                    }
                </style>
            `;

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
                window.makeDraggable(dialog, { width: 30, height: 30 });
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

            NodeSeekVPS.bindAuthHintLiveUpdates(dialog);

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
