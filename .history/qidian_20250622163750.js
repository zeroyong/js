/**
 * @Author: xhg
 * @Date:   2025-06-22 15:24:27
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-06-22 15:56:47
 */
// ==UserScript==
// @name        New script qidian.com
// @namespace   Violentmonkey Scripts
// @match       https://book.qidian.com/info/*
// @match       https://www.zhihu.com/question/*
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
    }
    
    // 在所有页面都执行广告过滤
    setTimeout(filterAds, 1000);
    observeAdChanges();
    
})();
