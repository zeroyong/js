// 支持的网站列表配置
const SUPPORTED_SITES = {
    'qidiantu': {
        textSelector: ['.panel-heading h4', '.panel-heading'],
        urlPatterns: ['https://www.qidiantu.com/booklist']
    },
    'youshu_pc': {
        textSelector: ['.title a', '.title'],
        urlPatterns: ['https://www.youshu.me/booklist']
    },
    'youshu_mobile': {
        textSelector: ['.book-list .book-item .title', '.book-list .book-item'],
        urlPatterns: ['https://m.youshu.me/book-list']
    },
    'tuishujun': {
        textSelector: ['.book-list-box .title', '.book-list-box'],
        urlPatterns: ['https://tuishujun.com/book-lists']
    }
};

// 创建复制按钮
function createCopyButton(onClickCallback) {
    const copyButton = document.createElement('button');
    copyButton.innerHTML = '📋';
    copyButton.style.cssText = `
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        margin-left: 2px;
        margin-top: -4px;
        vertical-align: middle;
        transition: transform 0.2s;
    `;

    // 悬hover效果
    copyButton.addEventListener('mouseenter', () => {
        copyButton.style.transform = 'scale(1.2)';
    });
    copyButton.addEventListener('mouseleave', () => {
        copyButton.style.transform = 'scale(1)';
    });

    // 点击事件
    copyButton.addEventListener('click', onClickCallback);

    return copyButton;
}

// 添加复制按钮的通用函数
function addCopyButtonToBookTitle() {
    // 检查是否匹配站点
    const matchedSite = Object.values(SUPPORTED_SITES).find(site => 
        site.urlPatterns.some(url => window.location.href.includes(url))
    );

    if (!matchedSite) {
        console.log('没有匹配的站点，跳过');
        return;
    }

    // 定期检查书名是否存在
    function checkAndAddCopyButtons() {
        let foundElements = false;

        // 尝试多个选择器
        for (const selector of matchedSite.textSelector) {
            const bookTitles = document.querySelectorAll(selector);
            
            bookTitles.forEach(titleElement => {
                // 跳过已经添加复制按钮的元素
                if (titleElement.querySelector('button[data-copy-button="true"]')) {
                    return;
                }

                // 确保有文本内容
                const titleText = titleElement.textContent.trim();
                if (!titleText) return;

                // 创建复制按钮
                const copyButton = createCopyButton((event) => {
                    event.preventDefault();
                    
                    // 获取书名（去掉《》）
                    const bookName = titleText.replace(/^《|》$/g, '');

                    console.log('尝试复制书名:', bookName);

                    // 复制到剪贴板
                    navigator.clipboard.writeText(bookName).then(() => {
                        // 显示全局通知
                        showGlobalNotification('复制成功!', 'success');
                    }).catch(err => {
                        console.error('复制失败', err);
                        showGlobalNotification('复制失败', 'error');
                    });
                });

                // 添加标记
                copyButton.setAttribute('data-copy-button', 'true');

                // 将复制按钮插入到标题旁边
                try {
                    titleElement.parentNode.insertBefore(copyButton, titleElement.nextSibling);
                    foundElements = true;
                    console.log('成功插入复制按钮');
                } catch (error) {
                    console.error('插入复制按钮时发生错误:', error);
                }
            });
        }

        return foundElements;
    }

    // 使用轮询方式检查
    let attempts = 0;
    const checkInterval = setInterval(() => {
        const found = checkAndAddCopyButtons();
        attempts++;

        // 找到元素或尝试次数过多就停止
        if (found || attempts >= 20) {
            clearInterval(checkInterval);
        }
    }, 500); // 每500ms检查一次
}

// 注册油猴菜单命令
function bindGM() {
    // 检查是否存在 GM_registerMenuCommand
    if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('复制按钮设置', function() {
            // 打开设置页面或弹出设置对话框
            alert('复制按钮设置 - 功能开发中');
        });

        GM_registerMenuCommand('重置复制按钮配置', function() {
            // 重置配置
            GM.setValue('copyButtonConfig', '{}');
            showGlobalNotification('配置已重置', 'success');
        });
    }
}

// 页面加载完成后执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        addTargetBlank();
        observeDOM();
        addRightClickCloseTab();
        initInfiniteScrollForQidiantu(); // 添加无限滚动功能
        
        // 添加复制按钮到不同网站
        addCopyButtonToBookTitle();
        
        // 注册油猴菜单
        bindGM();
    });
} else {
    addTargetBlank();
    observeDOM();
    addRightClickCloseTab();
    initInfiniteScrollForQidiantu(); // 添加无限滚动功能
    
    // 添加复制按钮到不同网站
    addCopyButtonToBookTitle();
    
    // 注册油猴菜单
    bindGM();
}

console.log('自动新标签页打开脚本已加载（已优化，不会干扰内部功能）');
console.log('按Ctrl+右键可关闭当前标签页');
})(); 