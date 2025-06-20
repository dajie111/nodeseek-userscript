// ========== NodeSeek 背景选择功能 ==========
(function() {
    'use strict';

    // NodeSeek 背景管理系统
    class NodeSeekBackgroundManager {
        constructor() {
            this.storageKey = 'nodeseek_custom_background';
            this.currentBackground = localStorage.getItem(this.storageKey) || '';
            
            // 预设背景图片
            this.presetBackgrounds = [
                {
                    name: '默认背景',
                    url: '',
                    description: '恢复网站原始背景'
                },
                {
                    name: '星空夜景',
                    url: 'https://tc.396663.xyz/i/2024/12/21/67664363aece6.png',
                    description: '深邃星空，适合夜间浏览'
                },
                {
                    name: '简约几何',
                    url: 'https://source.unsplash.com/1920x1080/?geometric,minimal',
                    description: '简约几何图案'
                },
                {
                    name: '自然风光',
                    url: 'https://source.unsplash.com/1920x1080/?landscape,nature',
                    description: '自然风光景色'
                },
                {
                    name: '科技风格',
                    url: 'https://source.unsplash.com/1920x1080/?technology,digital',
                    description: '科技数码风格'
                }
            ];

            this.init();
        }

        // 初始化
        init() {
            // 应用当前背景
            this.applyBackground(this.currentBackground);
            
            // 创建背景选择弹窗
            this.createBackgroundDialog();
        }

        // 创建背景选择弹窗
        createBackgroundDialog() {
            const dialogHTML = `
                <div id="background-selector-dialog" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10001; font-family: Arial, sans-serif;">
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 12px; padding: 25px; max-width: 600px; width: 90%; max-height: 80%; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                        
                        <!-- 标题栏 -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0;">
                            <h3 style="margin: 0; color: #333; font-size: 20px;">🎨 NodeSeek 背景选择</h3>
                            <button id="background-dialog-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 5px;">×</button>
                        </div>

                        <!-- 使用说明 -->
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
                            <h4 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">📝 使用说明</h4>
                            <p style="margin: 5px 0; color: #666; font-size: 14px;">• <strong>推荐尺寸：</strong>1920x1080 或更高分辨率</p>
                            <p style="margin: 5px 0; color: #666; font-size: 14px;">• <strong>支持格式：</strong>JPG, PNG, GIF, WebP</p>
                            <p style="margin: 5px 0; color: #666; font-size: 14px;">• <strong>建议大小：</strong>小于2MB，加载更快</p>
                            <p style="margin: 5px 0; color: #666; font-size: 14px;">• <strong>显示效果：</strong>背景将覆盖整个页面，请选择适合的图片</p>
                        </div>

                        <!-- 自定义背景链接 -->
                        <div style="margin-bottom: 25px;">
                            <h4 style="margin: 0 0 12px 0; color: #333; font-size: 16px;">🔗 自定义背景链接</h4>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <input type="text" id="custom-background-url" placeholder="请输入图片链接 (https://...)" 
                                    style="flex: 1; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;"
                                    value="${this.currentBackground}">
                                <button id="preview-custom-bg" style="padding: 10px 15px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">预览</button>
                                <button id="apply-custom-bg" style="padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">应用</button>
                            </div>
                        </div>

                        <!-- 预设背景选择 -->
                        <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">🖼️ 预设背景选择</h4>
                            <div id="preset-backgrounds-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">
                                ${this.generatePresetBackgroundsHTML()}
                            </div>
                        </div>

                        <!-- 当前背景预览 -->
                        <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 12px 0; color: #333; font-size: 16px;">👁️ 当前背景预览</h4>
                            <div id="current-bg-preview" style="width: 100%; height: 120px; border: 2px solid #ddd; border-radius: 8px; background-size: cover; background-position: center; background-repeat: no-repeat; position: relative; overflow: hidden;">
                                <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;" id="bg-preview-text">
                                    ${this.currentBackground ? '自定义背景' : '默认背景'}
                                </div>
                            </div>
                        </div>

                        <!-- 操作按钮 -->
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid #eee;">
                            <button id="reset-background" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                                🔄 恢复默认
                            </button>
                            <div style="display: flex; gap: 10px;">
                                <button id="background-dialog-cancel" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                                    取消
                                </button>
                                <button id="background-dialog-confirm" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                                    ✅ 确认应用
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', dialogHTML);
            this.bindBackgroundDialogEvents();
            this.updateCurrentPreview();
        }

        // 生成预设背景HTML
        generatePresetBackgroundsHTML() {
            return this.presetBackgrounds.map((bg, index) => `
                <div class="preset-bg-item" data-url="${bg.url}" style="border: 2px solid ${this.currentBackground === bg.url ? '#007bff' : '#ddd'}; border-radius: 8px; overflow: hidden; cursor: pointer; transition: all 0.3s ease; background: #f8f9fa;">
                    <div style="width: 100%; height: 80px; background: ${bg.url ? `url('${bg.url}')` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}; background-size: cover; background-position: center; position: relative;">
                        <div style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">
                            ${index === 0 ? '默认' : '预设'}
                        </div>
                    </div>
                    <div style="padding: 8px;">
                        <div style="font-weight: bold; font-size: 12px; color: #333; margin-bottom: 2px;">${bg.name}</div>
                        <div style="font-size: 10px; color: #666; line-height: 1.2;">${bg.description}</div>
                    </div>
                </div>
            `).join('');
        }

        // 绑定背景选择弹窗事件
        bindBackgroundDialogEvents() {
            const dialog = document.getElementById('background-selector-dialog');
            const closeBtn = document.getElementById('background-dialog-close');
            const cancelBtn = document.getElementById('background-dialog-cancel');
            const confirmBtn = document.getElementById('background-dialog-confirm');
            const resetBtn = document.getElementById('reset-background');
            const previewBtn = document.getElementById('preview-custom-bg');
            const applyBtn = document.getElementById('apply-custom-bg');
            const urlInput = document.getElementById('custom-background-url');

            // 关闭弹窗
            [closeBtn, cancelBtn].forEach(btn => {
                btn.addEventListener('click', () => {
                    dialog.style.display = 'none';
                });
            });

            // 点击背景关闭
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) {
                    dialog.style.display = 'none';
                }
            });

            // 预设背景选择
            document.addEventListener('click', (e) => {
                if (e.target.closest('.preset-bg-item')) {
                    const item = e.target.closest('.preset-bg-item');
                    const url = item.dataset.url;
                    
                    // 更新选中状态
                    document.querySelectorAll('.preset-bg-item').forEach(item => {
                        item.style.border = '2px solid #ddd';
                    });
                    item.style.border = '2px solid #007bff';
                    
                    // 更新输入框和预览
                    urlInput.value = url;
                    this.updatePreview(url);
                }
            });

            // 预览自定义背景
            previewBtn.addEventListener('click', () => {
                const url = urlInput.value.trim();
                this.updatePreview(url);
            });

            // 应用自定义背景
            applyBtn.addEventListener('click', () => {
                const url = urlInput.value.trim();
                this.applyBackground(url);
                this.updatePreview(url);
                this.addLog(`🎨 背景已应用: ${url || '默认背景'}`);
            });

            // 重置背景
            resetBtn.addEventListener('click', () => {
                urlInput.value = '';
                this.applyBackground('');
                this.updatePreview('');
                this.updatePresetSelection('');
                this.addLog('🔄 背景已重置为默认');
            });

            // 确认应用
            confirmBtn.addEventListener('click', () => {
                const url = urlInput.value.trim();
                this.applyBackground(url);
                this.addLog(`✅ 背景设置已保存: ${url || '默认背景'}`);
                dialog.style.display = 'none';
            });
        }

        // 更新预设背景选中状态
        updatePresetSelection(url) {
            document.querySelectorAll('.preset-bg-item').forEach(item => {
                if (item.dataset.url === url) {
                    item.style.border = '2px solid #007bff';
                } else {
                    item.style.border = '2px solid #ddd';
                }
            });
        }

        // 更新当前背景预览
        updateCurrentPreview() {
            const preview = document.getElementById('current-bg-preview');
            const text = document.getElementById('bg-preview-text');
            
            if (preview) {
                if (this.currentBackground) {
                    preview.style.backgroundImage = `url('${this.currentBackground}')`;
                    text.textContent = '自定义背景';
                } else {
                    preview.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    text.textContent = '默认背景';
                }
            }
        }

        // 更新预览
        updatePreview(url) {
            this.updateCurrentPreview();
            const preview = document.getElementById('current-bg-preview');
            const text = document.getElementById('bg-preview-text');
            
            if (preview) {
                if (url) {
                    preview.style.backgroundImage = `url('${url}')`;
                    text.textContent = '预览中...';
                } else {
                    preview.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    text.textContent = '默认背景';
                }
            }
        }

        // 应用背景
        applyBackground(url) {
            this.currentBackground = url;
            localStorage.setItem(this.storageKey, url);

            // 移除现有的背景样式
            const existingStyle = document.getElementById('nodeseek-custom-background');
            if (existingStyle) {
                existingStyle.remove();
            }

            if (url) {
                // 创建新的背景样式
                const style = document.createElement('style');
                style.id = 'nodeseek-custom-background';
                style.textContent = `
                    body {
                        background-image: url('${url}') !important;
                        background-size: cover !important;
                        background-position: center !important;
                        background-repeat: no-repeat !important;
                        background-attachment: fixed !important;
                    }
                    
                    /* 增强内容可读性 */
                    .main-content,
                    .content-wrapper,
                    .card,
                    .post-content {
                        background: rgba(255, 255, 255, 0.95) !important;
                        backdrop-filter: blur(5px) !important;
                        -webkit-backdrop-filter: blur(5px) !important;
                    }
                    
                    /* 导航栏透明度调整 */
                    .navbar,
                    .header {
                        background: rgba(255, 255, 255, 0.9) !important;
                        backdrop-filter: blur(10px) !important;
                        -webkit-backdrop-filter: blur(10px) !important;
                    }
                `;
                document.head.appendChild(style);
            }
        }

        // 显示背景选择弹窗
        showBackgroundDialog() {
            const dialog = document.getElementById('background-selector-dialog');
            if (dialog) {
                dialog.style.display = 'block';
                this.updateCurrentPreview();
                this.updatePresetSelection(this.currentBackground);
            }
        }

        // 添加日志（如果存在addLog函数）
        addLog(message) {
            if (typeof window.addLog === 'function') {
                window.addLog(message);
            } else {
                console.log('[背景管理]', message);
            }
        }
    }

    // 全局背景管理实例
    window.nodeseekBackgroundManager = null;

    // 初始化背景管理器
    function initBackgroundManager() {
        if (!window.nodeseekBackgroundManager) {
            window.nodeseekBackgroundManager = new NodeSeekBackgroundManager();
        }
    }

    // 显示背景选择器
    window.showBackgroundSelector = function() {
        if (!window.nodeseekBackgroundManager) {
            initBackgroundManager();
        }
        window.nodeseekBackgroundManager.showBackgroundDialog();
    };

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackgroundManager);
    } else {
        initBackgroundManager();
    }

})(); 