/**
 * @Author: xhg
 * @Date:   2025-06-17 20:49:16
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-06-26 19:36:04
 */
// ==UserScript==
// @name        📚书单添加小工具
// @namespace   Violentmonkey Scripts
// @match       https://tuishujun.com/books/*
// @match       https://www.ypshuo.com/novel/*
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @version     1.2
// @author      xhg
// @description 跨域书单管理工具
// ==/UserScript==

(function() {
    'use strict';

    // 当前选中的书单名称
    let currentBookListName = '我的书单';

    // 统一的存储键名
    const BOOK_LIST_STORAGE_KEY = 'cross_site_book_lists_v2';
    const SITE_CONFIG_CACHE_KEY = 'site_config_cache_v1';

    // 创建优美的消息提示系统
    function createNotification(message, type = 'info', duration = 3000) {
        // 移除现有的通知
        const existingNotifications = document.querySelectorAll('.custom-notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = 'custom-notification';
        
        // 根据类型设置样式
        const typeStyles = {
            success: {
                background: 'linear-gradient(135deg, #28a745, #20c997)',
                icon: '✅',
                borderColor: '#28a745'
            },
            error: {
                background: 'linear-gradient(135deg, #dc3545, #e74c3c)',
                icon: '❌',
                borderColor: '#dc3545'
            },
            warning: {
                background: 'linear-gradient(135deg, #ffc107, #fd7e14)',
                icon: '⚠️',
                borderColor: '#ffc107'
            },
            info: {
                background: 'linear-gradient(135deg, #007bff, #6f42c1)',
                icon: 'ℹ️',
                borderColor: '#007bff'
            }
        };

        const style = typeStyles[type] || typeStyles.info;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${style.background};
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            z-index: 10003;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            border: 2px solid ${style.borderColor};
            backdrop-filter: blur(10px);
            animation: slideInDown 0.3s ease-out;
            max-width: 400px;
            text-align: center;
            line-height: 1.4;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <span style="font-size: 18px;">${style.icon}</span>
                <span>${message}</span>
            </div>
        `;

        // 添加动画样式
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @keyframes slideInDown {
                from {
                    transform: translateX(-50%) translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutUp {
                from {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(-50%) translateY(-100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(styleSheet);

        document.body.appendChild(notification);

        // 自动移除
        setTimeout(() => {
            notification.style.animation = 'slideOutUp 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, duration);

        return notification;
    }

    // 获取所有书单数据（使用 GM_setValue/GM_getValue）
    function getAllBookLists() {
        try {
            // 尝试获取 GM 存储的数据
            const bookLists = GM_getValue(BOOK_LIST_STORAGE_KEY, {
                "我的书单": {
                    "书籍": [],
                    "默认状态": true
                }
            });

            return bookLists;
        } catch (error) {
            console.error('获取书单失败:', error);
            return {
                "我的书单": {
                    "书籍": [],
                    "默认状态": true
                }
            };
        }
    }

    // 获取当前书单的书籍列表
    function getCurrentBookList() {
        const allBookLists = getAllBookLists();
        return allBookLists[currentBookListName] ? allBookLists[currentBookListName].书籍 : [];
    }

    // 保存所有书单数据
    function saveAllBookLists(bookLists) {
        try {
            GM_setValue(BOOK_LIST_STORAGE_KEY, bookLists);
        } catch (error) {
            console.error('保存书单失败:', error);
        }
    }

    // 检查当前书籍是否在当前书单中
    function isBookInCurrentList() {
        const bookList = getCurrentBookList();
        return bookList.some(book => book.url === window.location.href);
    }

    // 检查书籍是否已存在（根据URL）
    function isBookAlreadyExists(bookList, bookUrl) {
        return bookList.some(book => book.url === bookUrl);
    }

    // 保存到当前书单（优化去重逻辑）
    function saveToCurrentBookList(bookInfo) {
        try {
            const allBookLists = getAllBookLists();
            const currentList = allBookLists[currentBookListName] || { "书籍": [], "默认状态": false };
            
            // 检查是否已经存在相同的书籍
            const existingIndex = currentList.书籍.findIndex(book => book.url === bookInfo.url);
            
            if (existingIndex !== -1) {
                // 如果已存在，先删除旧的，然后添加到队首
                currentList.书籍.splice(existingIndex, 1);
                currentList.书籍.unshift(bookInfo);
                allBookLists[currentBookListName] = currentList;
                saveAllBookLists(allBookLists);
                return { success: true, message: '书籍信息已更新到书单！', isUpdate: true };
            } else {
                // 如果不存在，添加到队首
                currentList.书籍.unshift(bookInfo);
                allBookLists[currentBookListName] = currentList;
                saveAllBookLists(allBookLists);
                return { success: true, message: '书籍已添加到书单！', isUpdate: false };
            }
            
        } catch (error) {
            console.error('保存到书单失败:', error);
            return { success: false, message: '保存失败，请重试！' };
        }
    }

    // 导出当前书单为JSON文件（增加更多导出信息）
    function exportCurrentBookList() {
        try {
            const bookList = getCurrentBookList();
            
            if (bookList.length === 0) {
                createNotification('当前书单为空，没有可导出的内容！', 'warning');
                return;
            }
            
            // 转换为导出格式，增加更多元数据
            const exportData = {
                listName: currentBookListName,
                exportTime: new Date().toISOString(),
                books: bookList.map(book => ({
                    name: book.title,
                    author: book.author,
                    intro: book.summary,
                    url: book.url,
                    addTime: book.addTime
                }))
            };
            
            // 创建JSON字符串
            const jsonString = JSON.stringify(exportData, null, 2);
            
            // 创建下载链接
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentBookListName}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            createNotification(`成功导出 ${bookList.length} 本书籍到本地！\n\n接下来请运行Python上传工具来获取直链。`, 'success', 5000);
        } catch (error) {
            console.error('导出失败:', error);
            createNotification('导出失败，请重试！', 'error');
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
        title.textContent = `📚 ${currentBookListName}`;
        
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
            exportCurrentBookList();
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
        const bookList = getCurrentBookList();
        
        // 调试信息
        console.log('更新书单显示，书籍数量:', bookList.length);
        console.log('书单内容:', bookList);
        
        // 更新标题显示书籍数量
        if (titleElement) {
            titleElement.textContent = `📚 ${currentBookListName} (${bookList.length})`;
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
                        <button onclick="event.stopPropagation(); removeFromCurrentBookList('${book.url}')" 
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

    // 删除书籍（增加跨网站兼容性）
    window.removeFromCurrentBookList = function(url) {
        if (confirm('确定要删除这本书吗？')) {
            try {
                const allBookLists = getAllBookLists();
                const currentList = allBookLists[currentBookListName];
                if (currentList) {
                    currentList.书籍 = currentList.书籍.filter(book => book.url !== url);
                    saveAllBookLists(allBookLists);
                    
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
                    
                    createNotification('删除成功！', 'success');
                }
            } catch (error) {
                console.error('删除失败:', error);
                createNotification('删除失败，请重试！', 'error');
            }
        }
    };

    // 更新添加按钮状态
    function updateAddButtonState() {
        const addButton = document.getElementById('add-book-button');
        if (addButton) {
            const isInList = isBookInCurrentList();
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
                // 动态获取当前网站的选择器
                const siteConfig = await loadSiteConfig();
                
                // 等待页面元素加载完成，支持多选择器
                const selectorsToWait = siteConfig ? Object.values(siteConfig.selectors) : [
                    '.title-box > h3', 
                    'h1.book-name',
                    '.row > a', 
                    'span.text-red-500',
                    '.book-summary', 
                    'div.el-collapse-item__content > div',
                    '.left > img', 
                    'header > img'
                ];
                
                await waitForElement(selectorsToWait);
                
                // 提取书籍信息
                const bookInfo = await extractBookInfo();
                
                if (bookInfo) {
                    // 保存到当前书单
                    const result = saveToCurrentBookList(bookInfo);
                    if (result.success) {
                        button.innerHTML = result.isUpdate ? '🔄 已更新' : '✅ 已添加';
                        button.style.background = '#28a745';
                        
                        // 使用优美提示
                        createNotification(result.message, 'success');
                        
                        // 调试信息
                        console.log('书籍添加成功:', bookInfo.title);
                        console.log('当前书单数量:', getCurrentBookList().length);
                        
                        setTimeout(() => {
                            updateAddButtonState();
                        }, 2000);
                    } else {
                        button.innerHTML = '❌ 添加失败';
                        button.style.background = '#dc3545';
                        createNotification(result.message, 'error');
                        setTimeout(() => {
                            updateAddButtonState();
                        }, 2000);
                    }
                } else {
                    button.innerHTML = '❌ 获取信息失败';
                    button.style.background = '#dc3545';
                    createNotification('获取书籍信息失败，请重试！', 'error');
                    setTimeout(() => {
                        updateAddButtonState();
                    }, 2000);
                }
            } catch (error) {
                console.error('添加到书单失败:', error);
                button.innerHTML = '⏰ 页面未加载完成';
                button.style.background = '#ffc107';
                createNotification('页面未加载完成，请稍后重试！', 'warning');
                setTimeout(() => {
                    updateAddButtonState();
                }, 2000);
            }
        });
        
        return button;
    }

    // 创建书单设置按钮（整合所有书单功能）
    function createBookListSettingsButton() {
        const button = document.createElement('button');
        button.innerHTML = '⚙️ 书单设置';
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
        
        // 点击按钮打开书单管理面板
        button.addEventListener('click', () => {
            openBookListManager();
        });
        
        return button;
    }

    // 切换书单
    function switchBookList(name) {
        currentBookListName = name;
        
        // 更新添加按钮状态
        updateAddButtonState();
        
        // 更新书单显示
        const popup = document.getElementById('booklist-popup');
        if (popup) {
            const content = popup.querySelector('div:last-child');
            const titleElement = popup.querySelector('div:first-child span');
            updateBookListDisplay(content, titleElement);
        }
        
        createNotification(`已切换到书单：${currentBookListName}`, 'info');
        console.log('切换到书单:', currentBookListName);
    }

    // 创建新书单
    function createNewBookList(name) {
        const allBookLists = getAllBookLists();
        
        if (allBookLists[name]) {
            createNotification('书单名称已存在，请使用其他名称！', 'warning');
            return;
        }
        
        allBookLists[name] = {
            "书籍": [],
            "默认状态": false
        };
        
        saveAllBookLists(allBookLists);
        switchBookList(name);
        
        createNotification(`书单"${name}"创建成功！`, 'success');
    }

    // 打开书单管理面板
    window.openBookListManager = function() {
        const allBookLists = getAllBookLists();
        const bookListNames = Object.keys(allBookLists);
        
        let managerHtml = `
            <div style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 500px; margin: 50px auto;">
                <h3 style="margin-top: 0; color: #333;">📚 书单管理</h3>
                <div style="max-height: 300px; overflow-y: auto; margin-bottom: 20px;">
        `;
        
        bookListNames.forEach(name => {
            const bookCount = allBookLists[name].书籍.length;
            const isDefault = allBookLists[name].默认状态;
            const isCurrent = name === currentBookListName;
            
            managerHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #f0f0f0; ${isCurrent ? 'background: #e3f2fd;' : ''}">
                    <div>
                        <strong>${name}</strong> 
                        <span style="color: #666; font-size: 12px;">书籍: ${bookCount}</span>
                        ${isDefault ? '<span style="color: #28a745; font-size: 12px;">(默认)</span>' : ''}
                        ${isCurrent ? '<span style="color: #007bff; font-size: 12px;">(当前)</span>' : ''}
                    </div>
                    <div>
                        <button onclick="switchToBookList('${name}')" style="background: #007bff; color: white; border: none; padding: 4px 8px; border-radius: 3px; margin-right: 5px; cursor: pointer; font-size: 12px;">切换</button>
                        <button onclick="renameBookList('${name}')" style="background: #ffc107; color: white; border: none; padding: 4px 8px; border-radius: 3px; margin-right: 5px; cursor: pointer; font-size: 12px;">重命名</button>
                        <button onclick="deleteBookList('${name}')" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">删除</button>
                    </div>
                </div>
            `;
        });
        
        managerHtml += `
                </div>
                <div style="text-align: center;">
                    <button onclick="createNewBookListFromManager()" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 5px; margin-right: 10px; cursor: pointer;">新建书单</button>
                    <button onclick="closeBookListManager()" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">关闭</button>
                </div>
            </div>
        `;
        
        // 创建模态框
        const modal = document.createElement('div');
        modal.id = 'booklist-manager-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 10002;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        modal.innerHTML = managerHtml;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeBookListManager();
            }
        });
        
        document.body.appendChild(modal);
    };

    // 关闭书单管理面板
    window.closeBookListManager = function() {
        const modal = document.getElementById('booklist-manager-modal');
        if (modal) {
            modal.remove();
        }
    };

    // 切换到指定书单
    window.switchToBookList = function(name) {
        switchBookList(name);
        closeBookListManager();
    };

    // 重命名书单
    window.renameBookList = function(oldName) {
        const newName = prompt(`请输入"${oldName}"的新名称：`);
        if (newName && newName.trim() && newName.trim() !== oldName) {
            const allBookLists = getAllBookLists();
            
            if (allBookLists[newName.trim()]) {
                createNotification('书单名称已存在，请使用其他名称！', 'warning');
                return;
            }
            
            allBookLists[newName.trim()] = allBookLists[oldName];
            delete allBookLists[oldName];
            saveAllBookLists(allBookLists);
            
            if (currentBookListName === oldName) {
                currentBookListName = newName.trim();
            }
            
            closeBookListManager();
            createNotification('重命名成功！', 'success');
        }
    };

    // 删除书单
    window.deleteBookList = function(name) {
        const allBookLists = getAllBookLists();
        const bookCount = allBookLists[name].书籍.length;
        
        let confirmMessage = `确定要删除书单"${name}"吗？`;
        if (bookCount > 0) {
            confirmMessage = `确定要删除书单"${name}"吗？\n\n该书单包含 ${bookCount} 本书籍，删除后将无法恢复！`;
        }
        
        if (confirm(confirmMessage)) {
            delete allBookLists[name];
            saveAllBookLists(allBookLists);
            
            if (currentBookListName === name) {
                // 如果删除的是当前书单，切换到第一个可用书单
                const remainingNames = Object.keys(allBookLists);
                if (remainingNames.length > 0) {
                    switchBookList(remainingNames[0]);
                } else {
                    // 如果没有书单了，创建默认书单
                    createNewBookList('我的书单');
                }
            }
            
            closeBookListManager();
            createNotification('删除成功！', 'success');
        }
    };

    // 从管理面板新建书单
    window.createNewBookListFromManager = function() {
        closeBookListManager();
        const bookListName = prompt('请输入新书单名称：');
        if (bookListName && bookListName.trim()) {
            createNewBookList(bookListName.trim());
        }
    };

    // 等待页面加载完成，支持多选择器
    function waitForElement(selectors, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkElements = () => {
                // 支持多选择器
                const selectorsArray = Array.isArray(selectors) ? selectors : [selectors];
                
                for (const selector of selectorsArray) {
                    const element = document.querySelector(selector);
                    if (element) {
                        resolve(element);
                        return;
                    }
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error(`等待元素 ${selectors} 超时`));
                    return;
                }
                
                setTimeout(checkElements, 100);
            };
            
            checkElements();
        });
    }

    // 缓存网站配置
    async function loadSiteConfig() {
        try {
            const host = window.location.host;
            const sourceListUrl = 'https://raw.githubusercontent.com/zeroyong/js/main/sourceBooks/source.json';
            
            // 尝试获取缓存的配置
            const cachedConfigs = GM_getValue(SITE_CONFIG_CACHE_KEY, {});
            
            // 获取源站点列表
            const sourceList = await fetch(sourceListUrl).then(res => res.json());
            const matchedSource = sourceList.find(source => host.includes(source.match));
            
            if (!matchedSource) {
                console.warn('未找到匹配的网站配置');
                return null;
            }

            // 检查是否需要更新缓存
            const cachedConfig = cachedConfigs[matchedSource.match];
            if (cachedConfig && cachedConfig.version === matchedSource.version) {
                console.log('使用缓存的网站配置');
                return cachedConfig.config;
            }

            // 加载最新配置
            const configUrl = `https://raw.githubusercontent.com/zeroyong/js/main/sourceBooks/${matchedSource.config}`;
            const config = await fetch(configUrl).then(res => res.json());

            // 更新缓存
            cachedConfigs[matchedSource.match] = {
                version: matchedSource.version,
                config: config,
                timestamp: Date.now()
            };
            GM_setValue(SITE_CONFIG_CACHE_KEY, cachedConfigs);

            console.log('加载并缓存新的网站配置');
            return config;
        } catch (error) {
            console.error('加载网站配置失败:', error);
            return null;
        }
    }

    // 使用配置文件提取书籍信息
    async function extractBookInfoByConfig(config) {
        if (!config || !config.selectors) {
            console.error('无效的配置文件');
            return null;
        }

        try {
            const extractedInfo = {};
            const extractors = config.extractors || {};

            console.log('当前网站配置:', config);

            for (const [key, selector] of Object.entries(config.selectors)) {
                const element = document.querySelector(selector);
                
                console.log(`查找 ${key} 元素:`, {
                    selector: selector,
                    element: element
                });

                if (!element) {
                    console.warn(`未找到 ${key} 选择器: ${selector}`);
                    extractedInfo[key] = '';
                    continue;
                }

                const extractMethod = extractors[key] || 'textContent';
                extractedInfo[key] = element[extractMethod]?.trim() || '';
                
                console.log(`提取 ${key}:`, extractedInfo[key]);
            }

            return {
                title: extractedInfo.title,
                author: extractedInfo.author,
                summary: extractedInfo.summary,
                cover: extractedInfo.cover,
                url: window.location.href,
                addTime: new Date().toISOString()
            };
        } catch (error) {
            console.error('提取书籍信息失败:', error);
            return null;
        }
    }

    // 修改原有的 extractBookInfo 函数
    async function extractBookInfo() {
        const siteConfig = await loadSiteConfig();
        
        console.log('获取到的站点配置:', siteConfig);
        
        if (siteConfig) {
            return await extractBookInfoByConfig(siteConfig);
        }

        // 如果没有配置文件，使用原有的硬编码提取方法
        try {
            console.warn('使用默认提取方法');
            
            const titleElement = document.querySelector('.title-box > h3, h1.book-name');
            const title = titleElement ? titleElement.textContent.trim() : '未知书名';
            
            const authorElement = document.querySelector('.row > a, span.text-red-500');
            const author = authorElement ? authorElement.textContent.trim() : '未知作者';
            
            const summaryElement = document.querySelector('.book-summary, div.el-collapse-item__content > div');
            const summary = summaryElement ? summaryElement.textContent.trim() : '暂无简介';
            
            const coverElement = document.querySelector('.left > img, header > img');
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

    // 清理过期的配置缓存（可选）
    function cleanConfigCache() {
        try {
            const cachedConfigs = GM_getValue(SITE_CONFIG_CACHE_KEY, {});
            const currentTime = Date.now();
            
            // 删除超过30天的缓存
            Object.keys(cachedConfigs).forEach(key => {
                if (currentTime - (cachedConfigs[key].timestamp || 0) > 30 * 24 * 60 * 60 * 1000) {
                    delete cachedConfigs[key];
                }
            });

            GM_setValue(SITE_CONFIG_CACHE_KEY, cachedConfigs);
        } catch (error) {
            console.error('清理配置缓存失败:', error);
        }
    }

    // 在脚本初始化时清理缓存
    cleanConfigCache();

    // 主函数
    function init() {
        // 等待页面基本结构加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    const addButton = createAddBookButton();
                    const settingsButton = createBookListSettingsButton();
                    
                    document.body.appendChild(addButton);
                    document.body.appendChild(settingsButton);
                }, 1000);
            });
        } else {
            setTimeout(() => {
                const addButton = createAddBookButton();
                const settingsButton = createBookListSettingsButton();
                
                document.body.appendChild(addButton);
                document.body.appendChild(settingsButton);
            }, 1000);
        }
    }

    // 启动脚本
    init();
})();

