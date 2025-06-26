/**
 * @Author: xhg
 * @Date:   2025-06-26 10:41:09
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-06-26 10:50:13
 */
// ==UserScript==
// @name         v2ob哔哩哔哩自动解析下载
// @namespace    Violentmonkey Scripts
// @version      1.2
// @description  自动监听剪贴板，填充视频链接并解析，自动捕获视频并下载，支持b23.tv短链转标准URL，含重试与异常处理
// @author       xhg
// @match        https://www.v2ob.com/*
// @grant        clipboard-read
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 平台正则
    const urlPattern = /(https?:\/\/(?:b23\.tv|bilibili\.com|douyin|xiaohongshu|ixigua|pipix\.com|acfun|toutiao)[^\s]*)/i;
    const b23Pattern = /https?:\/\/b23\.tv\/[\w\d]+/i;
    let lastClipboardText = '';
    let debounceTimer = null;
    let retryCount = 0;
    const maxRetry = 3;
    const retryInterval = 2000;

    // 防抖函数
    function debounce(fn, delay) {
        return function (...args) {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // DOM加载完成检测
    function domReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    // 读取剪贴板内容
    async function readClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            return text;
        } catch (e) {
            console.warn('读取剪贴板失败:', e);
            return '';
        }
    }

    // b23.tv短链转标准URL
    async function expandB23Url(shortUrl) {
        try {
            const resp = await fetch(shortUrl, { method: 'HEAD', redirect: 'follow' });
            return resp.url;
        } catch (e) {
            console.warn('b23.tv短链解析失败:', e);
            return shortUrl;
        }
    }

    // 自动填表与解析
    async function autoParse(url) {
        // 处理b23.tv短链
        if (b23Pattern.test(url)) {
            url = await expandB23Url(url);
        }
        const input = document.getElementById('video-url');
        const btn = document.getElementById('parse-btn');
        if (!input || !btn) {
            return;
        }
        input.value = url;
        btn.click();
    }

    // 剪贴板监听主逻辑
    const handleClipboard = debounce(async function () {
        const text = await readClipboard();
        if (!text || text === lastClipboardText) return;
        // 只提取目标平台的URL
        const match = text.match(urlPattern);
        if (match) {
            lastClipboardText = text;
            let url = match[1];
            await autoParse(url);
        }
    }, 1000);

    // 只在用户点击页面时监听剪贴板
    function listenPageActive() {
        document.addEventListener('click', handleClipboard);
    }

    // 视频捕获与下载
    function tryDownloadVideo() {
        retryCount = 0;
        function attempt() {
            try {
                // 优先video[src]，否则video>source[src]
                let videoUrl = '';
                const video = document.querySelector('.video-wrapper video');
                if (video && video.src && video.src.includes('.mp4')) {
                    videoUrl = video.src;
                } else {
                    const source = document.querySelector('.video-wrapper video source');
                    if (source && source.src && source.src.includes('.mp4')) {
                        videoUrl = source.src;
                    }
                }
                if (videoUrl) {
                    const a = document.createElement('a');
                    a.href = videoUrl;
                    a.download = 'bilibili_video.mp4';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    console.log('视频已自动下载:', videoUrl);
                } else if (retryCount < maxRetry) {
                    retryCount++;
                    setTimeout(attempt, retryInterval);
                }
            } catch (e) {
                if (retryCount < maxRetry) {
                    retryCount++;
                    setTimeout(attempt, retryInterval);
                }
            }
        }
        attempt();
    }

    // 监听video标签生成
    function observeVideo() {
        const wrapper = document.querySelector('.video-wrapper');
        if (!wrapper) return;
        const observer = new MutationObserver(() => {
            const video = wrapper.querySelector('video');
            if (video) {
                observer.disconnect();
                tryDownloadVideo();
            }
        });
        observer.observe(wrapper, { childList: true, subtree: true });
    }

    // 初始化
    domReady(() => {
        listenPageActive();
        observeVideo();
        console.log('v2ob哔哩哔哩自动解析下载脚本已加载');
    });

})(); 