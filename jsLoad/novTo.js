/**
 * @Author: xhg
 * @Date:   2025-06-17 21:19:10
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-07-06 20:20:35
 */
// ==UserScript==
// @name        自动新跳转到新的标签页 并打开
// @namespace   Violentmonkey Scripts
// @match       https://tuishujun.com/books/2*
// @match       https://tuishujun.com/book-list*
// @match       https://tuishujun.com/search/*
// @match       https://www.ypshuo.com/booklist*
// @match       https://www.youshu.me/book*
// @match       https://m.youshu.me/*
// @match       https://www.qidiantu.com/booklist*
// @match       https://www.qidiantu.com/badge*
// @match       https://www.qidiantu.com/info/*
// @grant       none
// @version     1.0
// @author      xhg
// @description 2025/6/17 21:19:17
// ==/UserScript==

(function() {
    'use strict';
    function addTargetBlank() {
        const links = document.querySelectorAll('a');
        links.forEach(link => {
            // 如果链接有href属性且不是锚点链接
            if (link.href && !link.href.startsWith('#')) {
                // 检查是否是内部功能链接，如果是则跳过
                if (isInternalFunctionalLink(link)) {
                    return;
                }

                link.target = '_blank';
                // 添加rel="noopener noreferrer"以提高安全性
                link.rel = 'noopener noreferrer';
            }
        });
    }

    // 检查是否是内部功能链接
    function isInternalFunctionalLink(link) {
        const href = link.href;
        const text = link.textContent.trim().toLowerCase();

        // 检查是否是网站内部的功能性链接
        const functionalPatterns = [
            /tuishujun\.com\/books\/\d+/, // 书籍详情页链接
            /javascript:/, // JavaScript链接
            /^#/, // 锚点链接
            /^mailto:/, // 邮件链接
            /^tel:/, // 电话链接
        ];

        // 检查链接文本是否包含功能性词汇
        const functionalTexts = [
            '添加到书单',
            '移动到我的书单',
            '收藏',
            '分享',
            '举报',
            '评论',
            '点赞',
            '关注',
            '登录',
            '注册',
            '设置',
            '个人中心',
            '我的书单',
            '新建书单',
            '管理书单'
        ];

        // 如果链接文本包含功能性词汇，则认为是内部功能链接
        if (functionalTexts.some(funcText => text.includes(funcText))) {
            return true;
        }

        // 如果链接匹配功能性模式，则认为是内部功能链接
        if (functionalPatterns.some(pattern => pattern.test(href))) {
            return true;
        }

        // 检查是否是相对路径或同域名链接（可能是内部功能）
        if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
            return true;
        }

        return false;
    }

    // 监听动态添加的元素
    function observeDOM() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // 元素节点
                            // 检查新添加的节点中的a标签
                            const newLinks = node.querySelectorAll ? node.querySelectorAll('a') : [];
                            newLinks.forEach(link => {
                                if (link.href && !link.href.startsWith('#')) {
                                    // 检查是否是内部功能链接
                                    if (!isInternalFunctionalLink(link)) {
                                        link.target = '_blank';
                                        link.rel = 'noopener noreferrer';
                                    }
                                }
                            });

                            // 如果新节点本身就是a标签
                            if (node.tagName === 'A' && node.href && !node.href.startsWith('#')) {
                                if (!isInternalFunctionalLink(node)) {
                                    node.target = '_blank';
                                    node.rel = 'noopener noreferrer';
                                }
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 添加右键关闭页面功能
    function addRightClickCloseTab() {
        document.addEventListener('contextmenu', function(event) {
            // 检查是否按下了Ctrl键
                event.preventDefault(); // 阻止默认右键菜单
                window.close(); // 关闭当前标签页
        });
    }

    // 为 qidiantu.com 书籍列表页添加无限滚动加载功能
    function initInfiniteScrollForQidiantu() {
        // 仅在 qidiantu.com 的书籍列表页生效
        if (!window.location.href.includes('https://www.qidiantu.com/booklist')) return;

        // 解析当前页码
        function getCurrentPage() {
            const urlParts = window.location.pathname.split('/');
            const pageIndex = urlParts.indexOf('booklist') + 2;
            return parseInt(urlParts[pageIndex] || '1');
        }

        // 检测滚动并跳转
        function checkScrollAndNavigate() {
            // 计算是否接近页面底部（距离底部100像素）
            const scrollPosition = window.innerHeight + window.scrollY;
            const bodyHeight = document.body.offsetHeight;

            if (scrollPosition >= bodyHeight - 100) {
                const currentPage = getCurrentPage();
                const nextPage = currentPage + 1;
                
                // 获取当前页面的完整URL
                const currentUrl = window.location.href;
                const urlParts = currentUrl.split('/');
                const bookListId = urlParts[urlParts.indexOf('booklist') + 1];
                
                // 构建下一页URL
                const nextPageUrl = `https://www.qidiantu.com/booklist/${bookListId}/${nextPage}`;
                
                console.log(`滚动到底部，跳转到下一页: ${nextPageUrl}`);
                window.location.href = nextPageUrl;
            }
        }

        // 监听滚动事件
        window.addEventListener('scroll', checkScrollAndNavigate);

        console.log('书籍列表页无限滚动跳转已启用');
    }

    // 创建全局通知容器
    function createGlobalNotification() {
        if (document.getElementById('global-notification')) return;

        const notification = document.createElement('div');
        notification.id = 'global-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            min-width: 100px;
            max-width: 400px;
            background-color: #dbf1e1;
            color: #064e3b;
            padding: 10px 15px;
            border-radius: 4px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 9999;
            opacity: 0;
            transition: all 0.3s ease;
        `;

        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = `
            margin-right: 8px;
            font-size: 16px;
            color: #064e3b;
        `;
        notification.appendChild(iconContainer);

        const textContainer = document.createElement('div');
        textContainer.style.cssText = `
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        notification.appendChild(textContainer);

        document.body.appendChild(notification);
        return {
            container: notification,
            icon: iconContainer,
            text: textContainer
        };
    }

    // 显示全局通知
    function showGlobalNotification(message, type = 'success') {
        const notification = document.getElementById('global-notification') 
            ? {
                container: document.getElementById('global-notification'),
                icon: document.getElementById('global-notification').querySelector('div:first-child'),
                text: document.getElementById('global-notification').querySelector('div:last-child')
            }
            : createGlobalNotification();

        // 设置颜色和图标
        const typeStyles = {
            'success': { 
                color: '#dbf1e1', 
                icon: '✓' 
            },
            'error': { 
                color: '#fde8e8', 
                icon: '✗' 
            }
        };

        const style = typeStyles[type] || typeStyles['success'];
        
        notification.container.style.backgroundColor = style.color;
        notification.icon.textContent = style.icon;
        notification.text.textContent = message;

        // 动态调整宽度
        notification.container.style.width = 'auto';
        
        // 显示通知
        notification.container.style.opacity = '1';
        notification.container.style.transform = 'translateX(-50%) translateY(0)';

        // 2秒后淡出
        setTimeout(() => {
            notification.container.style.opacity = '0';
            notification.container.style.transform = 'translateX(-50%) translateY(-20px)';
        }, 2000);
    }

    // 支持的网站列表配置
    const SUPPORTED_SITES = {
        'qidiantu': {
            selectors: [
                '.panel-heading h4', 
                '.panel-heading', 
                '.book-title', 
                '.book-name'
            ],
            url: ['https://www.qidiantu.com/booklist']
        },
        'youshu_pc': {
            selectors: [
                '.title a', 
                '.title', 
                '.book-title'
            ],
            url: ['https://www.youshu.me/booklist']
        },
        'youshu_mobile': {
            selectors: [
                '.book-list .book-item .title', 
                '.book-list .book-item',
                '.book-name'
            ],
            url: ['https://m.youshu.me/book-list']
        },
        'tuishujun': {
            selectors: [
                '.book-list-box .title', 
                '.book-list-box',
                '.book-name'
            ],
            url: ['https://tuishujun.com/book-lists']
        }
    };

    // 添加复制按钮的通用函数
    function addCopyButtonToBookTitle() {
        // 调试日志函数
        function debugLog(...args) {
            console.log('[复制按钮调试]', ...args);
        }

        // 查找匹配的站点配置
        function findMatchedSite() {
            const currentUrl = window.location.href;
            for (const [siteName, siteConfig] of Object.entries(SUPPORTED_SITES)) {
                if (siteConfig.url.some(url => currentUrl.includes(url))) {
                    return siteConfig;
                }
            }
            return null;
        }

        // 智能选择书名元素
        function findBookTitleElements(matchedSite) {
            let titleElements = [];

            // 尝试多个选择器
            for (const selector of matchedSite.selectors) {
                const elements = Array.from(document.querySelectorAll(selector))
                    .filter(el => {
                        const text = el.textContent.trim();
                        return text && 
                               text.length > 0 && 
                               el.offsetParent !== null &&
                               !el.getAttribute('data-copy-button-processed');
                    });

                if (elements.length > 0) {
                    titleElements = elements;
                    break;
                }
            }

            return titleElements;
        }

        // 创建复制按钮
        function createCopyButton(titleElement) {
            const copyButton = document.createElement('button');
            copyButton.innerHTML = '📋';
            copyButton.setAttribute('data-copy-button', 'true');
            copyButton.style.cssText = `
                background: none;
                border: none;
                cursor: pointer;
                font-size: 16px;
                margin-left: 2px;
                margin-top: -4px;
                vertical-align: middle;
                transition: transform 0.2s;
                z-index: 9999;
                position: relative;
            `;

            // 悬hover效果
            copyButton.addEventListener('mouseenter', () => {
                copyButton.style.transform = 'scale(1.2)';
            });
            copyButton.addEventListener('mouseleave', () => {
                copyButton.style.transform = 'scale(1)';
            });

            // 添加复制功能
            copyButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                // 获取书名（去掉《》）
                const fullTitle = titleElement.textContent.trim();
                const bookName = fullTitle.replace(/^《|》$/g, '');

                debugLog('尝试复制书名:', bookName);

                // 复制到剪贴板
                navigator.clipboard.writeText(bookName).then(() => {
                    // 显示全局通知
                    showGlobalNotification('复制成功!', 'success');
                }).catch(err => {
                    console.error('复制失败', err);
                    showGlobalNotification('复制失败', 'error');
                });
            });

            return copyButton;
        }

        // 主处理函数
        function processCopyButtons() {
            const matchedSite = findMatchedSite();
            
            if (!matchedSite) {
                debugLog('没有匹配的站点，跳过');
                return false;
            }

            const titleElements = findBookTitleElements(matchedSite);
            
            debugLog('当前网址:', window.location.href);
            debugLog('匹配站点:', matchedSite.url);
            debugLog('找到的书名元素数量:', titleElements.length);

            let addedButtons = 0;
            titleElements.forEach((titleElement, index) => {
                debugLog(`处理第 ${index + 1} 个书名元素:`, titleElement);

                try {
                    const copyButton = createCopyButton(titleElement);
                    titleElement.parentNode.insertBefore(copyButton, titleElement.nextSibling);
                    
                    // 标记已处理，防止重复添加
                    titleElement.setAttribute('data-copy-button-processed', 'true');
                    
                    addedButtons++;
                    debugLog('成功插入复制按钮');
                } catch (error) {
                    console.error('插入复制按钮时发生错误:', error);
                }
            });

            return addedButtons > 0;
        }

        // 使用一次性处理，避免持续监听
        function initCopyButtons() {
            // 延迟执行，确保DOM完全加载
            setTimeout(() => {
                processCopyButtons();
            }, 500);
        }

        // 页面加载完成后执行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initCopyButtons);
        } else {
            initCopyButtons();
        }
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
