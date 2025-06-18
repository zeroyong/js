/**
 * @Author: xhg
 * @Date:   2025-06-17 20:49:16
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-06-18 21:16:23
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
                // 如果已存在，先删除旧的，然后添加到队首
                bookList.splice(existingIndex, 1);
                bookList.unshift(bookInfo);
                localStorage.setItem('tuishujun_booklist', JSON.stringify(bookList));
                return { success: true, message: '书籍信息已更新到书单！', isUpdate: true };
            } else {
                // 如果不存在，添加到队首
                bookList.unshift(bookInfo);
                localStorage.setItem('tuishujun_booklist', JSON.stringify(bookList));
                return { success: true, message: '书籍已添加到书单！', isUpdate: false };
            }
            
        } catch (error) {
            console.error('保存到本地存储失败:', error);
            return { success: false, message: '保存失败，请重试！' };
        }
    }

    // 导出书单为JSON文件
    function exportBookList() {
        try {
            const bookList = getBookList();
            
            if (bookList.length === 0) {
                alert('书单为空，没有可导出的内容！');
                return;
            }
            
            // 转换为导出格式
            const exportData = bookList.map(book => ({
                name: book.title,
                author: book.author,
                intro: book.summary
            }));
            
            // 创建JSON字符串
            const jsonString = JSON.stringify(exportData, null, 2);
            
            // 创建下载链接
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `我的书单_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert(`成功导出 ${bookList.length} 本书籍！`);
        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败，请重试！');
        }
    }

    // 网络导出书单
    async function exportBookListToNetwork() {
        try {
            const bookList = getBookList();
            
            if (bookList.length === 0) {
                alert('书单为空，没有可导出的内容！');
                return;
            }
            
            // 转换为导出格式
            const exportData = bookList.map(book => ({
                name: book.title,
                author: book.author,
                intro: book.summary
            }));
            
            // 创建JSON字符串
            const jsonString = JSON.stringify(exportData, null, 2);
            
            // 创建文件对象
            const file = new File([jsonString], `我的书单_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`, {
                type: 'application/json'
            });
            
            // 创建FormData
            const formData = new FormData();
            formData.append('file', file);
            
            console.log('开始网络导出...');
            console.log('导出数据:', exportData);
            console.log('文件大小:', file.size, '字节');
            
            // 尝试HTTPS，如果失败则使用HTTP
            let response;
            try {
                // 首先尝试HTTPS
                response = await fetch('https://static.sy.yesui.me:7747/shuyuan', {
                    method: 'POST',
                    body: formData
                });
            } catch (httpsError) {
                console.log('HTTPS请求失败，尝试HTTP:', httpsError);
                // 如果HTTPS失败，尝试HTTP
                response = await fetch('http://static.sy.yesui.me:7747/shuyuan', {
                    method: 'POST',
                    body: formData
                });
            }
            
            console.log('网络响应状态:', response.status);
            console.log('网络响应头:', response.headers);
            
            if (response.ok) {
                const result = await response.text();
                console.log('网络响应内容:', result);
                
                // 解析下载URL规则
                let downloadUrl = '';
                try {
                    // 简单的规则解析，这里需要根据实际情况调整
                    if (result && result.trim() !== '') {
                        // 尝试HTTPS下载链接
                        downloadUrl = 'https://static.sy.yesui.me:7747/shuyuan/' + result;
                    }
                } catch (e) {
                    console.error('解析下载URL失败:', e);
                }
                
                if (downloadUrl) {
                    alert(`网络导出成功！\n下载链接：${downloadUrl}`);
                    // 自动打开下载链接
                    window.open(downloadUrl, '_blank');
                } else {
                    alert('网络导出成功，但无法获取下载链接！');
                }
            } else {
                console.error('网络导出失败，状态码:', response.status);
                alert(`网络导出失败，状态码：${response.status}`);
            }
            
        } catch (error) {
            console.error('网络导出失败:', error);
            if (error.message.includes('Mixed Content')) {
                alert('网络导出失败：HTTPS页面无法访问HTTP接口，请使用本地导出！');
            } else if (error.message.includes('Failed to fetch')) {
                alert('网络导出失败：无法连接到服务器，请检查网络连接或使用本地导出！');
            } else {
                alert('网络导出失败，请检查网络连接！');
            }
        }
    }

    // 测试网络接口
    async function testNetworkInterface() {
        try {
            console.log('开始测试网络接口...');
            
            // 创建测试数据
            const testData = [{
                name: "测试书籍",
                author: "测试作者",
                intro: "这是一个测试书籍的简介"
            }];
            
            const jsonString = JSON.stringify(testData, null, 2);
            const file = new File([jsonString], 'test.json', { type: 'application/json' });
            const formData = new FormData();
            formData.append('file', file);
            
            console.log('测试数据:', testData);
            console.log('测试文件大小:', file.size, '字节');
            
            let response;
            let usedHttps = false;
            
            try {
                // 首先尝试HTTPS
                console.log('尝试HTTPS连接...');
                response = await fetch('https://static.sy.yesui.me:7747/shuyuan', {
                    method: 'POST',
                    body: formData
                });
                usedHttps = true;
            } catch (httpsError) {
                console.log('HTTPS请求失败，尝试HTTP:', httpsError);
                // 如果HTTPS失败，尝试HTTP
                response = await fetch('http://static.sy.yesui.me:7747/shuyuan', {
                    method: 'POST',
                    body: formData
                });
                usedHttps = false;
            }
            
            console.log('测试响应状态:', response.status);
            console.log('测试响应头:', response.headers);
            console.log('使用的协议:', usedHttps ? 'HTTPS' : 'HTTP');
            
            const result = await response.text();
            console.log('测试响应内容:', result);
            
            alert(`接口测试完成！\n状态码：${response.status}\n协议：${usedHttps ? 'HTTPS' : 'HTTP'}\n响应内容：${result}`);
            
        } catch (error) {
            console.error('接口测试失败:', error);
            let errorMessage = '接口测试失败：';
            
            if (error.message.includes('Mixed Content')) {
                errorMessage += 'HTTPS页面无法访问HTTP接口';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage += '无法连接到服务器，请检查网络连接';
            } else {
                errorMessage += error.message;
            }
            
            alert(errorMessage);
        }
    }

    // 显示导出选项
    function showExportOptions() {
        const options = [
            { text: '📥 本地导出', action: exportBookList },
            { text: '🌐 网络导出', action: exportBookListToNetwork },
            { text: '🧪 测试接口', action: testNetworkInterface }
        ];
        
        const popup = document.createElement('div');
        popup.id = 'export-options-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10001;
            padding: 20px;
            min-width: 200px;
        `;
        
        const title = document.createElement('div');
        title.textContent = '选择导出方式';
        title.style.cssText = `
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
            color: #333;
        `;
        
        popup.appendChild(title);
        
        options.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option.text;
            button.style.cssText = `
                display: block;
                width: 100%;
                margin: 8px 0;
                padding: 10px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.3s;
            `;
            
            button.addEventListener('mouseenter', () => {
                button.style.background = '#0056b3';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.background = '#007bff';
            });
            
            button.addEventListener('click', () => {
                closeExportPopup();
                option.action();
            });
            
            popup.appendChild(button);
        });
        
        // 添加关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '取消';
        closeButton.style.cssText = `
            display: block;
            width: 100%;
            margin-top: 10px;
            padding: 8px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        `;
        
        closeButton.addEventListener('click', closeExportPopup);
        
        popup.appendChild(closeButton);
        
        // 点击背景关闭
        const overlay = document.createElement('div');
        overlay.id = 'export-options-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
        `;
        
        overlay.addEventListener('click', closeExportPopup);
        
        document.body.appendChild(overlay);
        document.body.appendChild(popup);
    }
    
    // 关闭导出弹窗
    function closeExportPopup() {
        const popup = document.getElementById('export-options-popup');
        const overlay = document.getElementById('export-options-overlay');
        
        if (popup && popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
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
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const title = document.createElement('span');
        title.textContent = '📚 我的书单';
        
        const exportButton = document.createElement('button');
        exportButton.innerHTML = '📤 导出';
        exportButton.style.cssText = `
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        `;
        
        exportButton.addEventListener('mouseenter', () => {
            exportButton.style.background = 'rgba(255,255,255,0.3)';
        });
        
        exportButton.addEventListener('mouseleave', () => {
            exportButton.style.background = 'rgba(255,255,255,0.2)';
        });
        
        exportButton.addEventListener('click', (e) => {
            e.stopPropagation();
            showExportOptions();
        });
        
        header.appendChild(title);
        header.appendChild(exportButton);

        const content = document.createElement('div');
        content.style.cssText = `
            max-height: 400px;
            overflow-y: auto;
            padding: 0;
        `;

        popup.appendChild(header);
        popup.appendChild(content);
        document.body.appendChild(popup);

        return { popup, content, title };
    }

    // 更新书单显示
    function updateBookListDisplay(content, titleElement) {
        const bookList = getBookList();
        
        // 调试信息
        console.log('更新书单显示，书籍数量:', bookList.length);
        console.log('书单内容:', bookList);
        
        // 更新标题显示书籍数量
        if (titleElement) {
            titleElement.textContent = `📚 我的书单 (${bookList.length})`;
        }
        
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
                    const titleElement = popup.querySelector('div:first-child span');
                    updateBookListDisplay(content, titleElement);
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
        const { popup, content, title } = createBookListPopup();
        
        // 鼠标悬浮显示书单
        button.addEventListener('mouseenter', () => {
            button.style.background = '#5a6268';
            popup.style.display = 'block';
            // 确保书单内容是最新的
            setTimeout(() => {
                updateBookListDisplay(content, title);
            }, 50);
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

