/**
 * @Author: xhg
 * @Date:   2025-06-22 15:24:27
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-06-22 15:27:30
 */
// ==UserScript==
// @name        New script qidian.com
// @namespace   Violentmonkey Scripts
// @match       https://book.qidian.com/info/*
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
    
    // 自动点击 #bookImg 元素
    waitForElement('#bookImg', function(element) {
        console.log('找到 #bookImg 元素，准备点击');
        element.click();
        console.log('已点击 #bookImg 元素');
    });
    
})();
