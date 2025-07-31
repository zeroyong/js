/**
 * @Author: xhg
 * @Date:   2025-07-22 19:34:05
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-07-24 07:36:29
 */
// ==UserScript==
// @namespace   Violentmonkey Scripts
// @grant       none
// @version     1.7
// @author      xhg
// ==/UserScript==

(function() {
    'use strict';

    // 保存原始的 window.open 方法
    const originalWindowOpen = window.open;

    // 重写 window.open 方法，拦截特定类型的窗口
    window.open = function(url, target, features) {
        if (url && (
            url.includes('ad') || 
            url.includes('popup') || 
            url.includes('banner') || 
            url.startsWith('/pop') || 
            url.includes('/pop?')
        )) {
            console.log('拦截可疑窗口:', url);
            return null;
        }
        
        // 对于其他窗口，保留原始行为
        return originalWindowOpen.apply(this, arguments);
    };

    // 移除特定的广告触发事件处理函数
    const removeAdEventHandlers = () => {
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
            if (el.closest('.plyr') || el.closest('video')) {
                return;
            }

            // 如果元素有点击事件处理函数
            if (el.onclick) {
                // 检查函数体是否包含可疑的函数调用
                const funcStr = el.onclick.toString();
                if (funcStr.includes('pop(') && 
                    !funcStr.includes('player') && 
                    !funcStr.includes('video')) {
                    // 移除点击事件处理函数
                    el.onclick = null;
                }
            }

            // 移除 Vue 风格的点击事件属性
            ['@click', 'v-on:click'].forEach(eventAttr => {
                const attrValue = el.getAttribute(eventAttr);
                if (attrValue && 
                    attrValue.includes('pop(') && 
                    !attrValue.includes('player') && 
                    !attrValue.includes('video')) {
                    el.removeAttribute(eventAttr);
                }
            });
        });
    };

    // 使用 MutationObserver 持续监控页面变化
    const observer = new MutationObserver(() => {
        removeAdEventHandlers();
    });

    // 配置观察器：监视整个文档
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 初始执行一次
    removeAdEventHandlers();
})();
