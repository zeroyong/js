/**
 * @Author: xhg
 * @Date:   2025-06-22 15:24:27
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-07-06 16:43:52
 */
// ==UserScript==
// @name        自动点击小工具
// @namespace   Violentmonkey Scripts
// @match       https://book.qidian.com/info/*
// @match       https://captain.czhtrqri.com/en/videos*

// @match       https://www.zhihu.com/question/*
// @match       https://www.ypshuo.com/novel/*
// @grant       none
// @version     1.0
// @author      xhg
// @description 2025/6/22 15:23:54
// ==/UserScript==

// 等待页面加载完成后自动点击 #bookImg 元素
(function() {
    'use strict';
    
    // 等待DOM加载完成
    function waitForElement(selector, callback, maxTries = 50) {
        if (maxTries <= 0) {
            console.log('元素未找到:', selector);
            return;
        }
        
        const element = document.querySelector(selector);
        if (element) {
            callback(element);
        } else {
            setTimeout(() => waitForElement(selector, callback, maxTries - 1), 100);
        }
    }
    
    // 处理知乎链接卡片
    function processZhihuLinks() {
        const linkContainers = document.querySelectorAll('.RichText-LinkCardContainer');
        
        linkContainers.forEach(container => {
            const linkElement = container.querySelector('a');
            if (linkElement) {
                const href = linkElement.getAttribute('href');
                if (href && href.includes('https://link.zhihu.com/?target=')) {
                    try {
                        // 解码URL参数
                        const targetParam = href.split('target=')[1];
                        const decodedUrl = decodeURIComponent(targetParam);
                        
                        // 更新链接为直接网址
                        linkElement.href = decodedUrl;
                        linkElement.setAttribute('target', '_blank');
                        
                        console.log('已转换知乎链接:', href, '->', decodedUrl);
                    } catch (error) {
                        console.error('解析知乎链接失败:', error);
                    }
                }
            }
        });
    }
    
    // 广告过滤功能
    function filterAds() {
        // 查找所有 .absolute-bottom-right 下的 span
        const adSpans = document.querySelectorAll('.absolute-bottom-right span');
        adSpans.forEach(span => {
            if (span.textContent.includes('广告')) {
                // 向上查找父节点（如 section 或 div）
                let parent = span;
                // 最多向上查找5层，防止误删
                for (let i = 0; i < 5; i++) {
                    if (!parent) break;
                    if (parent.tagName === 'SECTION' || parent.classList.contains('ad-container') || parent.parentElement?.id === 'list_videos_common_videos_list') {
                        break;
                    }
                    parent = parent.parentElement;
                }
                // 屏蔽父节点
                if (parent && parent !== span) {
                    parent.style.display = 'none';
                    console.log('已屏蔽广告节点:', parent);
                }
            }
        });
    }
    
    // 监听页面变化，处理动态加载的内容
    function observePageChanges() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // 检查新添加的节点中是否有链接卡片
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // 元素节点
                            if (node.classList && node.classList.contains('RichText-LinkCardContainer')) {
                                setTimeout(processZhihuLinks, 100);
                            } else if (node.querySelector && node.querySelector('.RichText-LinkCardContainer')) {
                                setTimeout(processZhihuLinks, 100);
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
    
    // 监听页面变化，动态过滤广告
    function observeAdChanges() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    setTimeout(filterAds, 100);
                }
            });
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // 处理ypshuo.com小说页面
    function processYpshuoNovel() {
        console.log('开始处理ypshuo小说页面...');

        // 查找所有立即阅读按钮
        const readButtons = document.querySelectorAll('button.bookinfo-button');
        console.log('找到的立即阅读按钮数量:', readButtons.length);

        readButtons.forEach((button, buttonIndex) => {
            console.log(`按钮 ${buttonIndex} 详情:`, {
                text: button.textContent.trim(),
                id: button.id,
                ariaControls: button.getAttribute('aria-controls')
            });

            // 获取对应的下拉菜单ID
            const dropdownMenuId = button.getAttribute('aria-controls');
            console.log('对应的下拉菜单ID:', dropdownMenuId);

            if (dropdownMenuId) {
                // 查找对应的下拉菜单
                const dropdownMenu = document.getElementById(dropdownMenuId);
                
                if (dropdownMenu) {
                    console.log('找到下拉菜单:', dropdownMenu);
                    
                    // 查找下拉菜单中的链接
                    const links = dropdownMenu.querySelectorAll('a');
                    console.log('下拉菜单中的链接数量:', links.length);

                    if (links.length > 0) {
                        // 获取第一个链接
                        const firstLink = links[0];
                        console.log('第一个链接详情:', {
                            href: firstLink.href,
                            text: firstLink.textContent.trim()
                        });

                        // 完全隐藏链接和其父元素
                        links.forEach(link => {
                            const listItem = link.closest('li.el-dropdown-menu__item');
                            if (listItem) {
                                // 使用更彻底的隐藏方法
                                listItem.style.display = 'none';
                                listItem.style.visibility = 'hidden';
                                listItem.style.position = 'absolute';
                                listItem.style.width = '0';
                                listItem.style.height = '0';
                                listItem.style.overflow = 'hidden';
                            }
                            console.log('已完全隐藏链接及其容器:', link.href);
                        });

                        // 为按钮绑定点击事件
                        button.addEventListener('click', function(e) {
                            e.preventDefault(); // 阻止默认点击事件
                            console.log('点击了立即阅读按钮');
                            
                            try {
                                // 在新窗口打开链接
                                window.open(firstLink.href, '_blank');
                                console.log('成功在新窗口打开:', firstLink.href);
                            } catch (error) {
                                console.error('打开新窗口失败:', error);
                            }
                        });

                        console.log('已为按钮绑定跳转事件');
                    } else {
                        console.warn('下拉菜单中未找到链接');
                    }
                } else {
                    console.warn('未找到对应的下拉菜单:', dropdownMenuId);
                }
            } else {
                console.warn('按钮未指定下拉菜单');
            }
        });

        console.log('ypshuo小说页面处理完成');
    }
    
    // 根据当前页面URL执行不同的功能
    const currentUrl = window.location.href;
    
    if (currentUrl.includes('book.qidian.com/info/')) {
        // 起点中文网：自动点击 #bookImg 元素
        waitForElement('#bookImg', function(element) {
            console.log('找到 #bookImg 元素，准备点击');
            element.click();
            console.log('已点击 #bookImg 元素');
        });
    } else if (currentUrl.includes('www.zhihu.com/question/')) {
        // 知乎：处理链接卡片
        console.log('检测到知乎页面，开始处理链接卡片');
        
        // 初始处理
        setTimeout(processZhihuLinks, 1000);
        
        // 监听页面变化
        observePageChanges();
    } else if (currentUrl.includes('www.ypshuo.com/novel/')) {
        // ypshuo小说页面处理
        console.log('检测到ypshuo小说页面，开始处理');
        
        // 多次尝试执行，确保页面元素加载
        [500, 1000, 2000].forEach(delay => {
            setTimeout(processYpshuoNovel, delay);
        });
    }
    
    // 在所有页面都执行广告过滤
    setTimeout(filterAds, 1000);
    observeAdChanges();
    
})();
