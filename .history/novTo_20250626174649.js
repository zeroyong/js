/**
 * @Author: xhg
 * @Date:   2025-06-17 21:19:10
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-06-26 17:46:49
 */
// ==UserScript==
// @name        自动新跳转到新的标签页 并打开
// @namespace   Violentmonkey Scripts
// @match       https://tuishujun.com/books/2*
// @match       https://tuishujun.com/books/2*
// @grant       none
// @version     1.0
// @author      xhg
// @description 2025/6/17 21:19:17
// ==/UserScript==

(function() {
    'use strict';
    
    // 为所有a标签添加target="_blank"属性，但排除内部功能链接
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
    
    console.log('自动新标签页打开脚本已加载（已优化，不会干扰内部功能）');
})();
