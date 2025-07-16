/**
 * @Author: xhg
 * @Date:   2025-07-13 11:31:51
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-07-13 11:33:55
 */
// ==UserScript==
// @name        知乎直接跳转 
// @namespace   Violentmonkey Scripts
// @match       https://zhuanlan.zhihu.com/p/*
// @grant       none
// @version     1.0
// @author      xhg
// @description 2025/7/13 11:31:09
// ==/UserScript==

// 添加直接跳转的代码
(function() {
    'use strict';

    // 处理知乎外部链接直接跳转
    function directLinkRedirect() {
        const links = document.querySelectorAll('a.external[href^="https://link.zhihu.com/?target="]');
        links.forEach(link => {
            try {
                const targetUrl = decodeURIComponent(link.href.split('target=')[1]);
                link.href = targetUrl;
                link.setAttribute('target', '_blank');
            } catch (error) {
                console.error('链接处理失败:', link.href);
            }
        });
    }

    // 页面加载后立即执行
    directLinkRedirect();

    // 对于动态加载的内容，使用MutationObserver监听变化
    const observer = new MutationObserver(directLinkRedirect);
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
})();
