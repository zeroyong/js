/**
 * @Author: xhg
 * @Date:   2025-06-17 21:19:10
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-06-17 21:53:09
 */
// ==UserScript==
// @name        自动新跳转到新的标签页 并打开
// @namespace   Violentmonkey Scripts
// @match       https://tuishujun.com/*
// @grant       none
// @version     1.0
// @author      xhg
// @description 2025/6/17 21:19:17
// ==/UserScript==

(function() {
    'use strict';
    
    // 为所有a标签添加target="_blank"属性
    function addTargetBlank() {
        const links = document.querySelectorAll('a');
        links.forEach(link => {
            // 如果链接有href属性且不是锚点链接
            if (link.href && !link.href.startsWith('#')) {
                link.target = '_blank';
                // 添加rel="noopener noreferrer"以提高安全性
                link.rel = 'noopener noreferrer';
            }
        });
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
                                    link.target = '_blank';
                                    link.rel = 'noopener noreferrer';
                                }
                            });
                            
                            // 如果新节点本身就是a标签
                            if (node.tagName === 'A' && node.href && !node.href.startsWith('#')) {
                                node.target = '_blank';
                                node.rel = 'noopener noreferrer';
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
    
    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            addTargetBlank();
            observeDOM();
        });
    } else {
        addTargetBlank();
        observeDOM();
    }
    
    console.log('自动新标签页打开脚本已加载');
})();
