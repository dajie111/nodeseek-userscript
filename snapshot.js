// ========== 网页快照功能 ==========
(function() {
    'use strict';

    // 检查是否在帖子详情页
    if (!location.pathname.match(/^\/post-\d+-\d+$/) && !location.search.includes('post-')) {
        return;
    }

    // 样式注入
    const style = document.createElement('style');
    style.textContent = `
        .snapshot-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 4px 8px;
            margin-left: 10px;
            font-size: 12px;
            color: #666;
            background: #f0f0f0;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none !important;
        }
        .snapshot-btn:hover {
            background: #e0e0e0;
            color: #333;
        }
        .snapshot-btn svg {
            width: 14px;
            height: 14px;
            margin-right: 4px;
        }
        /* 移动端适配 */
        @media (max-width: 768px) {
            .snapshot-btn {
                padding: 6px 10px;
                font-size: 14px;
            }
        }
    `;
    document.head.appendChild(style);

    function initSnapshot() {
        // 寻找插入点：通常在帖子标题旁边或者操作栏
        // 尝试插入到标题区域 .post-title 或 .topic-title
        const titleArea = document.querySelector('.post-title, .topic-title, h1');
        
        if (!titleArea) return;

        // 避免重复添加
        if (document.querySelector('.snapshot-btn')) return;

        const btn = document.createElement('a');
        btn.className = 'snapshot-btn';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
            </svg>
            生成快照
        `;
        btn.title = "生成当前页面的长截图（JPG格式）";

        btn.onclick = async function(e) {
            e.preventDefault();
            e.stopPropagation();

            // 检查 html2canvas 是否加载
            if (typeof html2canvas === 'undefined') {
                alert('快照插件 (html2canvas) 尚未加载，请检查网络或刷新页面。');
                return;
            }

            const originalText = btn.innerHTML;
            btn.innerHTML = '生成中...';
            btn.style.pointerEvents = 'none';

            try {
                // 选择要截图的区域：整个 body 或者 主要内容区
                // 为了保证完整性，通常截图 document.body
                const target = document.body;

                // 截图前隐藏一些不需要的元素（比如这个按钮本身，或者浮动广告等）
                btn.style.opacity = '0';
                
                // 强制页面滚动到顶部，防止截图错位
                window.scrollTo(0, 0);

                const canvas = await html2canvas(target, {
                    useCORS: true, // 允许跨域图片
                    allowTaint: true,
                    logging: false,
                    scale: 1.5, // 稍微降低一点缩放比例以减小体积（默认是window.devicePixelRatio）
                    backgroundColor: '#ffffff' // 确保背景是白色的
                });

                // 恢复按钮显示
                btn.style.opacity = '1';

                // 转换为 JPG，质量 0.6 (60%)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

                // 生成文件名
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const title = (document.title || 'nodeseek-snapshot').replace(/[\\/:*?"<>|]/g, '_');
                const filename = `NS快照_${title}_${timestamp}.jpg`;

                // 触发下载
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // 提示成功
                if (window.addLog) window.addLog(`生成网页快照: ${filename}`);

            } catch (err) {
                console.error('截图失败:', err);
                alert('生成快照失败，请查看控制台日志。');
            } finally {
                btn.innerHTML = originalText;
                btn.style.pointerEvents = 'auto';
            }
        };

        titleArea.appendChild(btn);
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSnapshot);
    } else {
        initSnapshot();
    }
    
    // 监听动态加载（SPA可能需要）
    window.addEventListener('load', initSnapshot);

})();
