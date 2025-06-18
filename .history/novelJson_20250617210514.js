/**
 * @Author: xhg
 * @Date:   2025-06-17 20:49:16
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-06-17 21:05:14
 */
// ==UserScript==
// @name        New script tuishujun.com
// @namespace   Violentmonkey Scripts
// @match       https://tuishujun.com/books/*
// @grant       none
// @version     1.0
// @author      xhg
// @description 2025/6/17 20:50:04
// ==/UserScript==

(function() {
    'use strict';

    // 等待页面加载完成
    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkElement = () => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error(`等待元素 ${selector} 超时`));
                    return;
                }
                
                setTimeout(checkElement, 100);
            };
            
            checkElement();
        });
    }

    // 提取书籍信息
    function extractBookInfo() {
        try {
            // 获取书名
            const titleElement = document.querySelector('.title-box > h3');
            const title = titleElement ? titleElement.textContent.trim() : '未知书名';
            
            // 获取作者
            const authorElement = document.querySelector('.row > a');
            const author = authorElement ? authorElement.textContent.trim() : '未知作者';
            
            // 获取简介
            const summaryElement = document.querySelector('.book-summary');
            const summary = summaryElement ? summaryElement.textContent.trim() : '暂无简介';
            
            return {
                title: title,
                author: author,
                summary: summary,
                url: window.location.href,
                addTime: new Date().toISOString()
            };
        } catch (error) {
            console.error('提取书籍信息失败:', error);
            return null;
        }
    }

    // 保存到本地存储
    function saveToBookList(bookInfo) {
        try {
            const bookList = JSON.parse(localStorage.getItem('tuishujun_booklist') || '[]');
            
            // 检查是否已经存在相同的书籍
            const existingIndex = bookList.findIndex(book => book.url === bookInfo.url);
            
            if (existingIndex !== -1) {
                // 如果已存在，更新信息
                bookList[existingIndex] = bookInfo;
                alert('书籍信息已更新到书单！');
            } else {
                // 如果不存在，添加新书籍
                bookList.push(bookInfo);
                alert('书籍已添加到书单！');
            }
            
            localStorage.setItem('tuishujun_booklist', JSON.stringify(bookList));
            return true;
        } catch (error) {
            console.error('保存到本地存储失败:', error);
            alert('保存失败，请重试！');
            return false;
        }
    }

    // 创建添加到书单按钮
    function createAddToBookListButton() {
        const button = document.createElement('button');
        button.textContent = '添加到书单';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: background 0.3s;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.background = '#0056b3';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.background = '#007bff';
        });
        
        button.addEventListener('click', async () => {
            button.disabled = true;
            button.textContent = '处理中...';
            
            try {
                // 等待页面元素加载完成
                await waitForElement('.title-box > h3');
                await waitForElement('.row > a');
                await waitForElement('.book-summary');
                
                // 提取书籍信息
                const bookInfo = extractBookInfo();
                
                if (bookInfo) {
                    // 保存到本地存储
                    const success = saveToBookList(bookInfo);
                    if (success) {
                        button.textContent = '已添加';
                        setTimeout(() => {
                            button.textContent = '添加到书单';
                            button.disabled = false;
                        }, 2000);
                    } else {
                        button.textContent = '添加失败';
                        setTimeout(() => {
                            button.textContent = '添加到书单';
                            button.disabled = false;
                        }, 2000);
                    }
                } else {
                    button.textContent = '获取信息失败';
                    setTimeout(() => {
                        button.textContent = '添加到书单';
                        button.disabled = false;
                    }, 2000);
                }
            } catch (error) {
                console.error('添加到书单失败:', error);
                button.textContent = '页面未加载完成';
                setTimeout(() => {
                    button.textContent = '添加到书单';
                    button.disabled = false;
                }, 2000);
            }
        });
        
        return button;
    }

    // 主函数
    function init() {
        // 等待页面基本结构加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    const button = createAddToBookListButton();
                    document.body.appendChild(button);
                }, 1000);
            });
        } else {
            setTimeout(() => {
                const button = createAddToBookListButton();
                document.body.appendChild(button);
            }, 1000);
        }
    }

    // 启动脚本
    init();
})();

