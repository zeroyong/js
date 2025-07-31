/**
 * @Author: xhg
 * @Date:   2025-06-17 21:19:10
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-07-24 22:01:12
 */
// ==UserScript==
// @name        自动新跳转到新的标签页-复制到剪贴板
// @namespace   Violentmonkey Scripts
// @match       https://tuishujun.com/books/2*
// @match       https://tuishujun.com/book-list*
// @match       https://tuishujun.com/search/*
// @match       https://www.ypshuo.com/booklist*
// @match       https://www.youshu.me/book*
// @match       https://m.youshu.me/*
// @match       https://www.qidiantu.com/booklist*
// @match       https://www.qidiantu.com/badge*
// @match       https://www.qidiantu.com/author/*
// @match       https://www.qidiantu.com/info/*
// @grant       none
// @version     1.0
// @author      xhg
// @description 2025/6/17 21:19:17
// ==/UserScript==

(function() {
    'use strict';

    // 调试信息
    console.log('=== 脚本已加载 ===');
    console.log('当前URL:', window.location.href);
    console.log('脚本版本: 1.0');
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

    // 为 qidiantu 书籍列表页添加无限滚动加载功能
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
                'td > h1.h1-table',  // 修改选择器，确保只匹配td下的h1
                '.book-title',
                '.book-name'
            ],
            url: ['https://www.qidiantu.com/booklist', 'https://www.qidiantu.com/info/','https://www.qidiantu.com/author/']
        },
        'qidiantu_badge': {
            selectors: [
                'tbody a',  // 直接匹配 tbody 中的 a 标签
                '.book-title',
                '.book-name'
            ],
            url: ['https://www.qidiantu.com/badge/']
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
        },
        'wenku8': {
            selectors: [
                'h1.h1-table'
            ],
            url: ['https://www.wenku8.net/book/']
        }
    };

    // 添加复制按钮的通用函数
    function addCopyButtonToBookTitle() {
        // 调试日志函数（仅在开发模式时使用）
        function debugLog(...args) {
            // 注释掉调试日志
            // console.log('[复制按钮调试]', ...args);
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
                font-size: ${titleElement.tagName.toLowerCase() === 'h1' ? '16px' : '14px'};
                margin-left: 8px;
                margin-right: 5px;
                margin-top: -3px;
                padding: 0;
                transition: transform 0.2s;
                position: static; /* 使按钮随内容正常流动 */
                display: inline-block; /* 确保按钮在文本流中 */
                line-height: 1;
                vertical-align: baseline; /* 与文本基线对齐 */
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

                // 特殊处理 tbody a 标签的情况
                let fullTitle = '';
                if (titleElement.tagName.toLowerCase() === 'a') {
                    fullTitle = titleElement.textContent.trim();
                } else {
                    // 创建一个临时的元素来获取纯文本
                    const tempElement = document.createElement(titleElement.tagName);
                    tempElement.innerHTML = titleElement.innerHTML;
                    // 移除所有子元素，只保留文本节点
                    Array.from(tempElement.childNodes)
                        .filter(node => node.nodeType === 3) // 只保留文本节点
                        .forEach(node => {
                            fullTitle += node.textContent.trim();
                        });
                }

                const bookName = fullTitle.replace(/^《|》$/g, '');

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

    // 处理 act.crxtlg.com 视频页面的特殊逻辑
    function handleCrxtlgVideos() {
        // 仅在 act.crxtlg.com 的视频页面生效
        if (!window.location.href.includes('https://act.crxtlg.com')) return;

        try {
            // 删除 .adaptation 的第二个元素
            const adaptationElements = document.querySelectorAll('.adaptation');
            if (adaptationElements.length >= 2) {
                const elementToRemove = adaptationElements[1];
                console.log('[CRXTLG视频页面处理] 删除第二个 .adaptation 元素:', elementToRemove);
                elementToRemove.remove();
            }

            // 删除广告元素
            const adLabels = Array.from(document.querySelectorAll('span.label')).filter(
                label => label.textContent.trim() === '广告'
            );
            adLabels.forEach(adLabel => {
                const adContainer = adLabel.closest('.video-img-box, .col-6');
                if (adContainer) {
                    console.log('[CRXTLG视频页面处理] 删除广告元素:', adContainer);
                    adContainer.remove();
                }
            });
        } catch (error) {
            console.error('[CRXTLG视频页面处理] 发生错误:', error);
        }
    }

    // 屏蔽广告函数
    function blockAds(observer = false) {
        if (!observer) {
            console.log('执行初始广告屏蔽');
        }

        let removedCount = 0;

        // 获取所有可能的广告标签
        const potentialLabels = document.querySelectorAll('.label, span');
        const adLabels = [];

        // 手动筛选包含"广告"文本的元素
        potentialLabels.forEach(label => {
            if (label.textContent && label.textContent.includes('广告')) {
                adLabels.push(label);
            }
        });

        // 处理找到的广告标签
        adLabels.forEach(label => {
            // 找到包含广告的容器
            const adContainer = label.closest('.video-img-box, .ad-container, [class*="ad"], [id*="ad"]') ||
                              label.parentElement.closest('.video-img-box, .ad-container, [class*="ad"], [id*="ad"]');

            if (adContainer && document.body.contains(adContainer)) {
                adContainer.remove();
                removedCount++;
            }
        });

        // 处理黑色遮罩和其容器
        const videoBoxes = document.querySelectorAll('.video-img-box');
        videoBoxes.forEach(box => {
            const labels = box.querySelectorAll('.label, span');
            const hasAdLabel = Array.from(labels).some(label =>
                label.textContent && label.textContent.includes('广告')
            );

            if (hasAdLabel && document.body.contains(box)) {
                // 先找到所有可能的父容器
                const containers = [];
                let parent = box.parentElement;

                // 向上查找所有可能的容器
                while (parent && parent !== document.body) {
                    if (parent.classList &&
                        (parent.classList.contains('col-') ||
                         parent.classList.contains('col-sm-') ||
                         parent.classList.contains('col-lg-') ||
                         parent.classList.contains('row') ||
                         parent.classList.contains('container') ||
                         parent.classList.contains('container-fluid') ||
                         parent.querySelector(':scope > .row'))) {
                        containers.unshift(parent); // 从最外层到最内层排序
                    }
                    parent = parent.parentElement;
                }

                // 从内到外移除元素
                box.remove();

                // 检查并移除空的父容器
                for (const container of containers) {
                    if (container && document.body.contains(container) &&
                        (container.children.length === 0 ||
                         Array.from(container.children).every(child => !document.body.contains(child)))) {
                        container.remove();
                    }
                }

                removedCount++;
            }
        });

        // 处理所有层级的空容器
        const removeEmptyContainers = () => {
            const selectors = [
                '.col-6', '.col-sm-4', '.col-lg-3',
                '.col-4', '.col-sm-6', '.col-md-4',
                '.col', '.col-auto', '.row',
                '.d-flex', '.justify-content-center', '.text-center'
            ];

            let foundEmpty = true;
            let iterations = 0;
            const maxIterations = 10; // 防止无限循环

            while (foundEmpty && iterations < maxIterations) {
                foundEmpty = false;
                iterations++;

                selectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(container => {
                        if (document.body.contains(container) &&
                            (container.children.length === 0 ||
                             (container.textContent || '').trim() === '' ||
                             Array.from(container.children).every(child => !document.body.contains(child)))) {
                            container.remove();
                            foundEmpty = true;
                            removedCount++;
                        }
                    });
                });
            }
        };

        // 执行容器清理
        removeEmptyContainers();

        if (removedCount > 0) {
            console.log(`[${observer ? '动态' : '初始'}检测] 移除了 ${removedCount} 个广告元素`);
        } else if (!observer) {
            console.log('未找到匹配的广告元素');
        }
    }

    // 检查元素是否可能是广告容器
    function isLikelyAdContainer(element) {
        if (!element) return false;

        // 检查元素是否可见
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false;
        }

        // 检查元素尺寸
        const rect = element.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        const isLargeEnough = (rect.width > 300 || rect.height > 250) && (rect.width > 50 && rect.height > 50);

        return isVisible && isLargeEnough;
    }

    // 监听DOM变化以捕获动态加载的广告
    function observeAdChanges() {
        console.log('初始化广告动态监听');

        // 记录已经处理过的广告元素
        const processedAds = new WeakSet();

        // 检查并移除广告的函数
        const checkAndRemoveAds = () => {
            let removedCount = 0;

            // 获取所有可能的广告标签
            const potentialLabels = document.querySelectorAll('.label, span');
            const adLabels = [];

            // 手动筛选包含"广告"文本的元素
            potentialLabels.forEach(label => {
                if (label.textContent && label.textContent.includes('广告') && !processedAds.has(label)) {
                    adLabels.push(label);
                }
            });

            // 处理找到的广告标签
            adLabels.forEach(label => {
                // 找到包含广告的容器
                const adContainer = label.closest('.video-img-box, .ad-container, [class*="ad"], [id*="ad"]') ||
                                  label.parentElement.closest('.video-img-box, .ad-container, [class*="ad"], [id*="ad"]');

                if (adContainer && document.body.contains(adContainer)) {
                    adContainer.remove();
                    processedAds.add(label);
                    removedCount++;
                    console.log('已移除广告容器:', adContainer);
                }
            });

            // 处理黑色遮罩和其容器
            const videoBoxes = document.querySelectorAll('.video-img-box');
            videoBoxes.forEach(box => {
                if (processedAds.has(box)) return;

                const labels = box.querySelectorAll('.label, span');
                const hasAdLabel = Array.from(labels).some(label =>
                    label.textContent && label.textContent.includes('广告')
                );

                if (hasAdLabel && document.body.contains(box)) {
                    // 先找到所有可能的父容器
                    const containers = [];
                    let parent = box.parentElement;

                    // 向上查找所有可能的容器
                    while (parent && parent !== document.body) {
                        if (parent.classList &&
                            (parent.classList.contains('col-') ||
                             parent.classList.contains('col-sm-') ||
                             parent.classList.contains('col-lg-') ||
                             parent.classList.contains('row') ||
                             parent.classList.contains('container') ||
                             parent.classList.contains('container-fluid') ||
                             parent.querySelector(':scope > .row'))) {
                            containers.unshift(parent); // 从最外层到最内层排序
                        }
                        parent = parent.parentElement;
                    }

                    // 从内到外移除元素
                    box.remove();
                    processedAds.add(box);
                    console.log('已移除广告遮罩:', box);

                    // 检查并移除空的父容器
                    for (const container of containers) {
                        if (container && document.body.contains(container) && !processedAds.has(container) &&
                            (container.children.length === 0 ||
                             Array.from(container.children).every(child => !document.body.contains(child)))) {
                            container.remove();
                            processedAds.add(container);
                            console.log('已移除空的广告容器:', container);
                        }
                    }

                    removedCount++;
                }
            });

            // 处理所有层级的空容器
            const removeEmptyContainers = () => {
                const selectors = [
                    '.col-6', '.col-sm-4', '.col-lg-3',
                    '.col-4', '.col-sm-6', '.col-md-4',
                    '.col', '.col-auto', '.row',
                    '.d-flex', '.justify-content-center', '.text-center'
                ];

                let foundEmpty = true;
                let iterations = 0;
                const maxIterations = 10; // 防止无限循环

                while (foundEmpty && iterations < maxIterations) {
                    foundEmpty = false;
                    iterations++;

                    selectors.forEach(selector => {
                        document.querySelectorAll(selector).forEach(container => {
                            if (document.body.contains(container) && !processedAds.has(container) &&
                                (container.children.length === 0 ||
                                 (container.textContent || '').trim() === '' ||
                                 Array.from(container.children).every(child => !document.body.contains(child)))) {
                                container.remove();
                                processedAds.add(container);
                                foundEmpty = true;
                                removedCount++;
                            }
                        });
                    });
                }
            };

            // 执行容器清理
            removeEmptyContainers();

            if (removedCount > 0) {
                console.log(`[动态检测] 移除了 ${removedCount} 个广告元素`);
            }

            return removedCount;
        };

        // 初始检查
        checkAndRemoveAds();

        // 创建MutationObserver来监听DOM变化
        const observer = new MutationObserver(() => {
            // 使用防抖避免频繁触发
            if (!window.adCheckTimeout) {
                window.adCheckTimeout = setTimeout(() => {
                    checkAndRemoveAds();
                    window.adCheckTimeout = null;
                }, 100);
            }
        });

        // 开始观察document.body的子元素变化
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('已启动广告动态监听');

        // 页面卸载时清理
        window.addEventListener('unload', () => {
            observer.disconnect();
            if (window.adCheckTimeout) {
                clearTimeout(window.adCheckTimeout);
            }
        });
    }

    // 页面加载完成后执行的函数
    function initializeScript() {
        console.log('开始初始化脚本...');

        // 初始执行广告屏蔽
        console.log('准备执行 blockAds()');
        blockAds();

        // 监听动态加载的广告
        console.log('准备执行 observeAdChanges()');
        observeAdChanges();

        // 执行其他通用功能
        addTargetBlank();
        observeDOM();
        addRightClickCloseTab();
        initInfiniteScrollForQidiantu(); // 添加无限滚动功能

        // 添加复制按钮到不同网站
        addCopyButtonToBookTitle();

        // 注册油猴菜单
        bindGM();
        handleCrxtlgVideos(); // 添加这一行
    }

    // 页面加载状态检查
    console.log('检查页面加载状态:', document.readyState);

    if (document.readyState === 'loading') {
        // 如果页面还在加载，等待DOMContentLoaded
        console.log('页面正在加载，添加DOMContentLoaded监听器...');
        document.addEventListener('DOMContentLoaded', function documentReady() {
            console.log('DOMContentLoaded 事件触发');
            initializeScript();
        });
    } else {
        // 如果页面已经加载完成，直接执行
        console.log('页面已经加载完成，直接执行初始化');
        // 使用setTimeout确保DOM完全加载
        setTimeout(initializeScript, 100);
    }

    console.log('自动新标签页打开脚本已加载（已优化，不会干扰内部功能）');
    console.log('按Ctrl+右键可关闭当前标签页');
})();
