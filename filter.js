// 这是关键词过滤功能的单独文件

function applyKeywordFilter() {
    // TODO: 在这里实现关键词过滤的逻辑
    // alert('关键词过滤功能待实现');
    console.log('applyKeywordFilter function called from filter.js');

    // 检查弹窗是否已存在
    const existingDialog = document.getElementById('keyword-filter-dialog');
    if (existingDialog) {
        // 如果已存在，则关闭弹窗
        existingDialog.remove();
        return;
    }

    // 创建弹窗
    const dialog = document.createElement('div');
    dialog.id = 'keyword-filter-dialog';
    dialog.style.position = 'fixed';
    dialog.style.top = '60px';
    dialog.style.right = '160px'; // 调整位置避免与主按钮重叠
    dialog.style.zIndex = 10000;
    dialog.style.background = '#fff';
    dialog.style.border = '1px solid #ccc';
    dialog.style.borderRadius = '8px';
    dialog.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
    dialog.style.padding = '18px 20px 12px 20px';
    dialog.style.width = '300px'; // 设置固定宽度
    dialog.style.fontFamily = 'inherit'; // 继承页面字体

    // 标题和关闭按钮容器
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '10px';

    // 标题
    const title = document.createElement('div');
    title.textContent = '关键词过滤 (逗号分隔):';
    title.style.fontWeight = 'bold';
    title.style.fontSize = '16px';
    header.appendChild(title);

    // 关闭按钮
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.fontWeight = 'normal'; // 确保关闭按钮不是粗体
    closeBtn.onclick = function() { dialog.remove(); };
    header.appendChild(closeBtn);

    dialog.appendChild(header);

    // 输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '输入关键词,如A,B,C';
    input.style.width = 'calc(100% - 80px)'; // 调整宽度给按钮留空间
    input.style.padding = '6px 10px';
    input.style.marginRight = '8px';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';
    input.style.fontSize = '14px';
    input.style.boxSizing = 'border-box'; // 包含padding和border在宽度内

    // 过滤按钮
    const filterBtn = document.createElement('button');
    filterBtn.textContent = '过滤';
    filterBtn.className = 'blacklist-btn'; // 使用现有按钮样式
    filterBtn.style.background = '#4CAF50'; // 绿色背景
    filterBtn.style.width = '70px';
    filterBtn.style.padding = '6px 0'; // 垂直居中文字
    filterBtn.style.textAlign = 'center';

    // 输入和按钮容器
    const inputButtonContainer = document.createElement('div');
    inputButtonContainer.style.display = 'flex';
    inputButtonContainer.style.alignItems = 'center';
    inputButtonContainer.style.marginTop = '10px';

    inputButtonContainer.appendChild(input);
    inputButtonContainer.appendChild(filterBtn);

    dialog.appendChild(inputButtonContainer);

    document.body.appendChild(dialog);

    // 使弹窗可拖动
    // 假设 makeDraggable 函数在全局范围内可用 (在 nodeseek_blacklist.user.js 中定义)
    if (typeof makeDraggable === 'function') {
        makeDraggable(dialog, {width: dialog.offsetWidth, height: header.offsetHeight + inputButtonContainer.offsetHeight + 20}); // 根据内容调整可拖动区域大小
    }

    // 为过滤按钮添加点击事件
    filterBtn.onclick = function() {
        console.log('过滤按钮点击');
        const keywordsInput = input.value;
        const keywords = keywordsInput.split(',').map(kw => kw.trim()).filter(kw => kw.length > 0);
        console.log('输入的关键词:', keywords);

        // 获取所有帖子元素
        // TODO: 请根据实际页面结构修改这里的选择器
        const postElements = document.querySelectorAll('.thread, .topic-item'); 
        console.log('找到的帖子元素数量:', postElements.length);

        postElements.forEach(post => {
            const postText = post.textContent.toLowerCase();
            let showPost = false;

            if (keywords.length === 0) {
                // 如果没有输入关键词，则显示所有帖子
                showPost = true;
            } else {
                // 检查帖子内容是否包含任意关键词
                for (const keyword of keywords) {
                    if (postText.includes(keyword.toLowerCase())) {
                        showPost = true;
                        break;
                    }
                }
            }

            // 显示或隐藏帖子
            if (showPost) {
                post.style.display = ''; // 使用空字符串恢复默认显示
                console.log('显示帖子:', post);
            } else {
                post.style.display = 'none';
                console.log('隐藏帖子:', post);
            }
        });
    };
}
