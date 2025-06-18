/**
 * @Author: xhg
 * @Date:   2025-06-17 20:49:16
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-06-17 21:17:21
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
            
            // 获取封面
            const coverElement = document.querySelector('.left > img');
            const cover = coverElement ? coverElement.src : '';
            
            return {
                title: title,
                author: author,
                summary: summary,
                cover: cover,
                url: window.location.href,
                addTime: new Date().toISOString()
            };
        } catch (error) {
            console.error('提取书籍信息失败:', error);
            return null;
        }
    }

    // 获取书单数据
    function getBookList() {
        try {
            return JSON.parse(localStorage.getItem('tuishujun_booklist') || '[]');
        } catch (error) {
            console.error('获取书单失败:', error);
            return [];
        }
    }

    // 检查当前书籍是否已在书单中
    function isBookInList() {
        const bookList = getBookList();
        return bookList.some(book => book.url === window.location.href);
    }

    // 保存到本地存储
    function saveToBookList(bookInfo) {
        try {
            const bookList = getBookList();
            
            // 检查是否已经存在相同的书籍
            const existingIndex = bookList.findIndex(book => book.url === bookInfo.url);
            
            if (existingIndex !== -1) {
                // 如果已存在，更新信息
                bookList[existingIndex] = bookInfo;
                localStorage.setItem('tuishujun_booklist', JSON.stringify(bookList));
                return { success: true, message: '书籍信息已更新到书单！', isUpdate: true };
            } else {
                // 如果不存在，添加新书籍
                bookList.push(bookInfo);
                localStorage.setItem('tuishujun_booklist', JSON.stringify(bookList));
                return { success: true, message: '书籍已添加到书单！', isUpdate: false };
            }
            
        } catch (error) {
            console.error('保存到本地存储失败:', error);
            return { success: false, message: '保存失败，请重试！' };
        }
    }

    // 创建书单悬浮框
    function createBookListPopup() {
        const popup = document.createElement('div');
        popup.id = 'booklist-popup';
        popup.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            width: 350px;
            max-height: 500px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            overflow: hidden;
            display: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            background: #007bff;
            color: white;
            padding: 12px 16px;
            font-weight: bold;
            font-size: 16px;
            border-bottom: 1px solid #ddd;
        `;
        header.textContent = '📚 我的书单';

        const content = document.createElement('div');
        content.style.cssText = `
            max-height: 400px;
            overflow-y: auto;
            padding: 0;
        `;

        popup.appendChild(header);
        popup.appendChild(content);
        document.body.appendChild(popup);

        return { popup, content };
    }

    // 更新书单显示
    function updateBookListDisplay(content) {
        const bookList = getBookList();
        
        if (bookList.length === 0) {
            content.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    📖 书单为空，快去添加喜欢的书籍吧！
                </div>
            `;
            return;
        }

        const bookItems = bookList.map((book, index) => {
            const coverHtml = book.cover ? 
                `<img src="${book.cover}" alt="封面" style="width: 50px; height: 70px; object-fit: cover; border-radius: 4px;">` :
                `<div style="width: 50px; height: 70px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #999; font-size: 12px;">📄</div>`;
            
            const addDate = new Date(book.addTime).toLocaleDateString('zh-CN');
            const isCurrentBook = book.url === window.location.href;
            
            return `
                <div style="display: flex; padding: 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer; ${isCurrentBook ? 'background: #e3f2fd;' : ''}" 
                     onmouseover="this.style.background='${isCurrentBook ? '#bbdefb' : '#f8f9fa'}'" 
                     onmouseout="this.style.background='${isCurrentBook ? '#e3f2fd' : 'white'}'"
                     onclick="window.open('${book.url}', '_blank')">
                    <div style="margin-right: 12px;">
                        ${coverHtml}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: bold; font-size: 14px; color: #333; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${book.title}">
                            ${isCurrentBook ? '📍 ' : ''}${book.title}
                        </div>
                        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                            👤 作者：${book.author}
                        </div>
                        <div style="font-size: 11px; color: #999;">
                            📅 添加时间：${addDate}
                        </div>
                    </div>
                    <div style="margin-left: 8px;">
                        <button onclick="event.stopPropagation(); removeFromBookList('${book.url}')" 
                                style="background: #f8f9fa; color: #6c757d; border: 1px solid #dee2e6; padding: 4px 8px; border-radius: 3px; font-size: 11px; cursor: pointer; transition: all 0.2s;"
                                onmouseover="this.style.background='#e9ecef'; this.style.color='#495057';"
                                onmouseout="this.style.background='#f8f9fa'; this.style.color='#6c757d';">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        content.innerHTML = bookItems;
    }

    // 删除书籍
    window.removeFromBookList = function(url) {
        if (confirm('确定要删除这本书吗？')) {
            try {
                const bookList = getBookList();
                const newBookList = bookList.filter(book => book.url !== url);
                localStorage.setItem('tuishujun_booklist', JSON.stringify(newBookList));
                
                // 更新显示
                const popup = document.getElementById('booklist-popup');
                if (popup) {
                    const content = popup.querySelector('div:last-child');
                    updateBookListDisplay(content);
                }
                
                // 如果删除的是当前书籍，更新添加按钮状态
                if (url === window.location.href) {
                    updateAddButtonState();
                }
                
                alert('删除成功！');
            } catch (error) {
                console.error('删除失败:', error);
                alert('删除失败，请重试！');
            }
        }
    };

    // 更新添加按钮状态
    function updateAddButtonState() {
        const addButton = document.getElementById('add-book-button');
        if (addButton) {
            const isInList = isBookInList();
            if (isInList) {
                addButton.innerHTML = '✅ 已添加';
                addButton.style.background = '#28a745';
                addButton.disabled = true;
            } else {
                addButton.innerHTML = '📖 添加到书单';
                addButton.style.background = '#007bff';
                addButton.disabled = false;
            }
        }
    }

    // 创建添加书籍按钮
    function createAddBookButton() {
        const button = document.createElement('button');
        button.id = 'add-book-button';
        button.innerHTML = '📖 添加到书单'; // 设置初始文字
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
            transition: all 0.3s;
            min-width: 120px;
            text-align: center;
        `;
        
        // 初始化按钮状态
        setTimeout(() => {
            updateAddButtonState();
        }, 100);
        
        button.addEventListener('mouseenter', () => {
            if (!button.disabled) {
                button.style.background = '#0056b3';
            }
        });
        
        button.addEventListener('mouseleave', () => {
            if (!button.disabled) {
                button.style.background = '#007bff';
            }
        });
        
        button.addEventListener('click', async () => {
            if (button.disabled) return;
            
            button.disabled = true;
            button.innerHTML = '⏳ 处理中...';
            
            try {
                // 等待页面元素加载完成
                await waitForElement('.title-box > h3');
                await waitForElement('.row > a');
                await waitForElement('.book-summary');
                await waitForElement('.left > img');
                
                // 提取书籍信息
                const bookInfo = extractBookInfo();
                
                if (bookInfo) {
                    // 保存到本地存储
                    const result = saveToBookList(bookInfo);
                    if (result.success) {
                        button.innerHTML = result.isUpdate ? '🔄 已更新' : '✅ 已添加';
                        button.style.background = '#28a745';
                        
                        // 调试信息
                        console.log('书籍添加成功:', bookInfo.title);
                        console.log('当前书单数量:', getBookList().length);
                        
                        setTimeout(() => {
                            updateAddButtonState();
                        }, 2000);
                    } else {
                        button.innerHTML = '❌ 添加失败';
                        button.style.background = '#dc3545';
                        setTimeout(() => {
                            updateAddButtonState();
                        }, 2000);
                    }
                } else {
                    button.innerHTML = '❌ 获取信息失败';
                    button.style.background = '#dc3545';
                    setTimeout(() => {
                        updateAddButtonState();
                    }, 2000);
                }
            } catch (error) {
                console.error('添加到书单失败:', error);
                button.innerHTML = '⏰ 页面未加载完成';
                button.style.background = '#ffc107';
                setTimeout(() => {
                    updateAddButtonState();
                }, 2000);
            }
        });
        
        return button;
    }

    // 创建查看书单按钮
    function createViewBookListButton() {
        const button = document.createElement('button');
        button.innerHTML = '📚 我的书单';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 140px;
            z-index: 9999;
            background: #6c757d;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: all 0.3s;
            min-width: 120px;
            text-align: center;
        `;
        
        // 创建悬浮框
        const { popup, content } = createBookListPopup();
        
        // 鼠标悬浮显示书单
        button.addEventListener('mouseenter', () => {
            button.style.background = '#5a6268';
            popup.style.display = 'block';
            updateBookListDisplay(content);
        });
        
        // 鼠标离开隐藏书单
        button.addEventListener('mouseleave', () => {
            button.style.background = '#6c757d';
            // 延迟隐藏，给用户时间移动到悬浮框
            setTimeout(() => {
                if (!popup.matches(':hover')) {
                    popup.style.display = 'none';
                }
            }, 200);
        });
        
        // 悬浮框鼠标离开时隐藏
        popup.addEventListener('mouseleave', () => {
            popup.style.display = 'none';
        });
        
        return button;
    }

    // 主函数
    function init() {
        // 等待页面基本结构加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    const addButton = createAddBookButton();
                    const viewButton = createViewBookListButton();
                    document.body.appendChild(addButton);
                    document.body.appendChild(viewButton);
                }, 1000);
            });
        } else {
            setTimeout(() => {
                const addButton = createAddBookButton();
                const viewButton = createViewBookListButton();
                document.body.appendChild(addButton);
                document.body.appendChild(viewButton);
            }, 1000);
        }
    }

    // 启动脚本
    init();
})();

