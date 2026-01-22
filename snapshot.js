// ========== 网页快照功能 (长截图) ==========
(function () {
    'use strict';

    const NodeSeekSnapshot = {
        init: function () {
            // 仅在帖子详情页运行
            if (!window.location.href.includes('/post-')) return;
            
            // 延迟一点加载，确保DOM已就绪
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.addSnapshotButton());
            } else {
                this.addSnapshotButton();
            }
        },

        addSnapshotButton: function () {
            // 避免重复添加
            if (document.getElementById('ns-snapshot-btn-title')) return;

            // 寻找标题区域
            // NodeSeek 帖子标题通常在 h1 或 .post-title 附近
            const titleElement = document.querySelector('h1') || document.querySelector('.post-title');
            
            if (titleElement) {
                const btn = document.createElement('span');
                btn.id = 'ns-snapshot-btn-title';
                btn.textContent = '📸';
                btn.title = '生成长截图';
                btn.style.cssText = `
                    cursor: pointer;
                    margin-left: 10px;
                    font-size: 1.2em;
                    vertical-align: middle;
                    opacity: 0.6;
                    transition: opacity 0.2s;
                `;
                btn.onmouseover = () => btn.style.opacity = '1';
                btn.onmouseout = () => btn.style.opacity = '0.6';
                
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.takeSnapshot(btn);
                };

                titleElement.appendChild(btn);
            }
        },

        takeSnapshot: async function (btnElement) {
            const originalText = btnElement.textContent;
            btnElement.textContent = '⏳'; // Loading icon
            
            try {
                // 加载 html2canvas
                if (typeof html2canvas === 'undefined') {
                    await this.loadHtml2Canvas();
                }

                // 截图前隐藏按钮和浮动面板
                btnElement.style.display = 'none';
                const panel = document.querySelector('.nodeseek-plugin-container'); // 假设的主面板类名
                const originalPanelDisplay = panel ? panel.style.display : '';
                if (panel) panel.style.display = 'none';

                // 截图
                const canvas = await html2canvas(document.body, {
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    scale: window.devicePixelRatio || 1,
                    backgroundColor: '#ffffff' // 确保背景也是白色的
                });

                // 恢复显示
                btnElement.style.display = '';
                if (panel) panel.style.display = originalPanelDisplay;

                // 生成图片并下载
                // 质量 0.6
                const imgData = canvas.toDataURL('image/jpeg', 0.6);
                this.downloadImage(imgData);
                
                // 提示成功 (可选)
                btnElement.textContent = '✅';
                setTimeout(() => btnElement.textContent = originalText, 2000);

            } catch (e) {
                console.error('截图失败:', e);
                alert('截图失败: ' + e.message);
                btnElement.textContent = '❌';
                // 恢复显示
                btnElement.style.display = '';
                const panel = document.querySelector('.nodeseek-plugin-container');
                if (panel) panel.style.display = '';
            }
        },

        loadHtml2Canvas: function () {
            return new Promise((resolve, reject) => {
                if (window.html2canvas) {
                    resolve(window.html2canvas);
                    return;
                }
                
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                script.onload = () => resolve(window.html2canvas);
                script.onerror = () => reject(new Error('无法加载 html2canvas'));
                document.head.appendChild(script);
            });
        },

        downloadImage: function (dataUrl) {
            const a = document.createElement('a');
            a.href = dataUrl;
            const title = document.title.replace(' - NodeSeek', '').trim();
            const now = new Date();
            // 格式化时间: YYYYMMDD_HHmmss
            const timeStr = now.getFullYear() +
                String(now.getMonth() + 1).padStart(2, '0') +
                String(now.getDate()).padStart(2, '0') + '_' +
                String(now.getHours()).padStart(2, '0') +
                String(now.getMinutes()).padStart(2, '0') +
                String(now.getSeconds()).padStart(2, '0');
                
            a.download = `NodeSeek_Snapshot_${title}_${timeStr}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    // 暴露给 window，也可以直接运行 init
    window.NodeSeekSnapshot = NodeSeekSnapshot;
    
    // 自动初始化
    NodeSeekSnapshot.init();

})();
