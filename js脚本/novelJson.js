/**
 * @Author: xhg
 * @Date:   2025-06-17 20:49:16
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-07-06 13:29:19
 */
// ==UserScript==
// @name        📚书单添加小工具
// @namespace   Violentmonkey Scripts
// @match       https://tuishujun.com/books/*
// @match       https://www.ypshuo.com/novel/*
// @match       https://www.youshu.me/book/*
// @match       https://www.qidiantu.com/info*
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

    // 导出当前书单为JSON文件（简化导出逻辑）
    function exportCurrentBookList() {
        try {
            const bookList = getCurrentBookList();
            
            console.log('导出书单信息:', {
                listName: currentBookListName,
                bookCount: bookList.length
            });
            
            if (bookList.length === 0) {
                createNotification('当前书单为空，没有可导出的内容！', 'warning');
                return;
            }
            
            // 直接导出书籍数组，不再包裹在 books 对象中
            const exportData = bookList.map(book => ({
                name: book.title,
                author: book.author,
                intro: book.summary
            }));
            
            // 创建JSON字符串
            const jsonString = JSON.stringify(exportData, null, 2);
            
            console.log('导出的JSON内容:', jsonString);
            
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
            
            // 修复作者名称重复问题
            const cleanAuthor = book.author.replace(/^作者：/, '');
            
            const bookItemDiv = document.createElement('div');
            bookItemDiv.style.cssText = `display: flex; padding: 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer; ${isCurrentBook ? 'background: #e3f2fd;' : ''}`;
            bookItemDiv.innerHTML = `
                <div style="margin-right: 12px;">
                    ${coverHtml}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: bold; font-size: 14px; color: #333; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${book.title}">
                        ${isCurrentBook ? '' : ''}${book.title}
                    </div>
                    <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                        👤 作者：${cleanAuthor}
                    </div>
                    <div style="font-size: 11px; color: #999;">
                        📅 添加时间：${addDate}
                    </div>
                </div>
                <div style="margin-left: 8px;">
                    <button class="remove-book-btn" data-url="${book.url}" style="background: #f8f9fa; color: #6c757d; border: 1px solid #dee2e6; padding: 4px 8px; border-radius: 3px; font-size: 11px; cursor: pointer; transition: all 0.2s;"
                            onmouseover="this.style.background='#e9ecef'; this.style.color='#495057';"
                            onmouseout="this.style.background='#f8f9fa'; this.style.color='#6c757d';">
                        🗑️
                    </button>
                </div>
            `;

            // 为删除按钮添加事件监听器
            const removeButton = bookItemDiv.querySelector('.remove-book-btn');
            removeButton.addEventListener('click', (event) => {
                event.stopPropagation();
                const bookUrl = event.currentTarget.getAttribute('data-url');
                window.removeFromCurrentBookList(bookUrl);
            });

            // 为书籍项目添加点击打开链接事件
            bookItemDiv.addEventListener('click', () => {
                window.open(book.url, '_blank');
            });

            return bookItemDiv;
        });

        // 清空内容并添加书籍项目
        content.innerHTML = '';
        bookItems.forEach(item => content.appendChild(item));
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
        
        // 导出按钮
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
            margin-right: 8px;
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

        // 删除所有书籍按钮
        const deleteAllButton = document.createElement('button');
        deleteAllButton.innerHTML = '🗑️ 清空';
        deleteAllButton.style.cssText = `
            background: rgba(220,53,69,0.2);
            color: white;
            border: 1px solid rgba(220,53,69,0.3);
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        `;
        
        deleteAllButton.addEventListener('mouseenter', () => {
            deleteAllButton.style.background = 'rgba(220,53,69,0.3)';
        });
        
        deleteAllButton.addEventListener('mouseleave', () => {
            deleteAllButton.style.background = 'rgba(220,53,69,0.2)';
        });
        
        deleteAllButton.addEventListener('click', (e) => {
            e.stopPropagation();
            window.deleteAllBooksInCurrentList();
        });
        
        header.appendChild(title);
        header.appendChild(exportButton);
        header.appendChild(deleteAllButton);

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

    // 创建自定义确认对话框
    function customConfirm(options) {
        return new Promise((resolve, reject) => {
            // 创建模态框容器
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 10003;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;

            // 弹窗内容容器
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: white;
                border-radius: 12px;
                box-shadow: 0 15px 50px rgba(0,0,0,0.2);
                width: 90%;
                max-width: 400px;
                padding: 25px;
                text-align: center;
                position: relative;
                transform: scale(0.7);
                transition: all 0.3s ease;
                opacity: 0;
            `;

            // 图标
            const iconMap = {
                warning: '⚠️',
                danger: '❌',
                info: 'ℹ️'
            };
            const icon = document.createElement('div');
            icon.textContent = options.icon || iconMap[options.type] || 'ℹ️';
            icon.style.cssText = `
                font-size: 48px;
                margin-bottom: 15px;
            `;

            // 标题
            const title = document.createElement('h3');
            title.textContent = options.title || '确认操作';
            title.style.cssText = `
                margin-top: 0;
                margin-bottom: 10px;
                color: #333;
                font-size: 18px;
            `;

            // 消息
            const message = document.createElement('p');
            message.textContent = options.message || '您确定要执行此操作吗？';
            message.style.cssText = `
                color: #666;
                margin-bottom: 20px;
                line-height: 1.5;
            `;

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: space-between;
                gap: 15px;
            `;

            // 取消按钮
            const cancelButton = document.createElement('button');
            cancelButton.textContent = options.cancelText || '取消';
            cancelButton.style.cssText = `
                flex: 1;
                padding: 12px;
                background: #6c757d;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.3s ease, transform 0.1s ease;
                font-weight: 500;
            `;
            cancelButton.addEventListener('mouseenter', () => {
                cancelButton.style.background = '#555';
            });
            cancelButton.addEventListener('mouseleave', () => {
                cancelButton.style.background = '#6c757d';
            });
            cancelButton.addEventListener('click', () => closeModal(false));

            // 确认按钮
            const confirmButton = document.createElement('button');
            confirmButton.textContent = options.confirmText || '确认';
            confirmButton.style.cssText = `
                flex: 1;
                padding: 12px;
                background: ${options.type === 'danger' ? '#dc3545' : '#007bff'};
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.3s ease, transform 0.1s ease;
                font-weight: 500;
            `;
            confirmButton.addEventListener('mouseenter', () => {
                confirmButton.style.background = options.type === 'danger' ? '#c82333' : '#0056b3';
            });
            confirmButton.addEventListener('mouseleave', () => {
                confirmButton.style.background = options.type === 'danger' ? '#dc3545' : '#007bff';
            });
            confirmButton.addEventListener('click', () => closeModal(true));

            // 关闭模态框
            function closeModal(confirmed) {
                modal.style.opacity = '0';
                modalContent.style.transform = 'scale(0.7)';
                setTimeout(() => {
                    document.body.removeChild(modal);
                    resolve(confirmed);
                }, 300);
            }

            // 组装模态框
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(confirmButton);

            modalContent.appendChild(icon);
            modalContent.appendChild(title);
            modalContent.appendChild(message);
            modalContent.appendChild(buttonContainer);

            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            // 显示动画
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
                modalContent.style.transform = 'scale(1)';
                modalContent.style.opacity = '1';
            });

            // 点击遮罩层关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(false);
                }
            });

            // 阻止内容区域点击事件冒泡
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
    }

    // 删除所有书籍
    window.deleteAllBooksInCurrentList = function() {
        customConfirm({
            title: '清空书单',
            message: `确定要删除当前书单"${currentBookListName}"中的所有书籍吗？\n\n此操作不可撤销！`,
            type: 'danger',
            confirmText: '删除',
            cancelText: '取消'
        }).then(confirmed => {
            if (confirmed) {
                try {
                    const allBookLists = getAllBookLists();
                    const currentList = allBookLists[currentBookListName];
                    
                    if (currentList) {
                        const bookCount = currentList.书籍.length;
                        currentList.书籍 = [];
                        
                        saveAllBookLists(allBookLists);
                        
                        // 更新显示
                        const popup = document.getElementById('booklist-popup');
                        if (popup) {
                            const content = popup.querySelector('div:last-child');
                            const titleElement = popup.querySelector('div:first-child span');
                            updateBookListDisplay(content, titleElement);
                        }
                        
                        // 更新添加按钮状态
                        updateAddButtonState();
                        
                        createNotification(`已删除 ${bookCount} 本书籍！`, 'success');
                    }
                } catch (error) {
                    console.error('删除所有书籍失败:', error);
                    createNotification('删除失败，请重试！', 'error');
                }
            }
        });
    };

    // 删除书籍（跨网站兼容）
    window.removeFromCurrentBookList = function(url) {
        console.log('尝试删除书籍:', url);
        console.log('当前书单:', currentBookListName);
        
        customConfirm({
            title: '删除书籍',
            message: '确定要删除这本书吗？\n\n此操作不可撤销！',
            type: 'danger',
            confirmText: '删除',
            cancelText: '取消'
        }).then(confirmed => {
            if (confirmed) {
                try {
                    const allBookLists = getAllBookLists();
                    const currentList = allBookLists[currentBookListName];
                    
                    console.log('删除前书单内容:', currentList);
                    
                    if (currentList) {
                        const initialLength = currentList.书籍.length;
                        currentList.书籍 = currentList.书籍.filter(book => book.url !== url);
                        
                        console.log('删除后书单内容:', currentList);
                        console.log(`删除书籍数量: ${initialLength - currentList.书籍.length}`);
                        
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
                    } else {
                        console.warn('未找到当前书单');
                        createNotification('删除失败：未找到书单', 'error');
                    }
                } catch (error) {
                    console.error('删除失败:', error);
                    createNotification('删除失败，请重试！', 'error');
                }
            }
        });
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
                // 等待页面元素加载完成，支持多选择器
                const siteConfig = await loadSiteConfig();
                
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
                        
                        // 使用优美提示，显示当前书单名称
                        createNotification(`已添加到书单：${currentBookListName}`, 'success');
                        
                        // 调试信息
                        console.log('书籍添加成功:', bookInfo.title);
                        console.log('当前书单:', currentBookListName);
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
        console.log(`切换书单: 从 ${currentBookListName} 到 ${name}`);
        
        // 获取所有书单
        const allBookLists = getAllBookLists();
        
        // 确保新书单存在
        if (!allBookLists[name]) {
            createNotification('书单不存在！', 'error');
            return;
        }
        
        // 更新当前书单名称并持久化
        currentBookListName = name;
        
        // 更新所有书单的默认状态
        Object.keys(allBookLists).forEach(listName => {
            allBookLists[listName].默认状态 = (listName === name);
        });
        
        // 保存更新后的书单配置
        saveAllBookLists(allBookLists);
        
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
        console.log('当前书单:', currentBookListName);
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
        console.log('打开书单管理面板');
        
        const allBookLists = getAllBookLists();
        const bookListNames = Object.keys(allBookLists);
        
        // 创建模态框容器
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
            opacity: 1;
            transition: opacity 0.3s ease;
        `;

        // 创建模态框内容
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 500px;
            width: 90%;
            max-height: 80%;
            overflow: auto;
            padding: 20px;
            position: relative;
        `;

        // 关闭按钮
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✖️';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #666;
        `;
        closeButton.addEventListener('click', () => {
            console.log('点击关闭按钮');
            window.closeBookListManager();
        });

        // 标题
        const title = document.createElement('h3');
        title.textContent = '📚 书单管理';
        title.style.marginTop = '0';
        title.style.color = '#333';

        // 书单列表容器
        const listContainer = document.createElement('div');
        listContainer.style.maxHeight = '300px';
        listContainer.style.overflowY = 'auto';
        listContainer.style.marginBottom = '20px';

        // 生成书单列表
        bookListNames.forEach(name => {
            const bookCount = allBookLists[name].书籍.length;
            const isDefault = allBookLists[name].默认状态;
            const isCurrent = name === currentBookListName;

            const listItem = document.createElement('div');
            listItem.style.cssText = `
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                padding: 10px; 
                border-bottom: 1px solid #f0f0f0;
                ${isCurrent ? 'background: #e3f2fd;' : ''}
            `;

            // 书单信息
            const bookListInfo = document.createElement('div');
            bookListInfo.innerHTML = `
                <strong>${name}</strong> 
                <span style="color: #666; font-size: 12px;">书籍: ${bookCount}</span>
                ${isDefault ? '<span style="color: #28a745; font-size: 12px;">(默认)</span>' : ''}
                ${isCurrent ? '<span style="color: #007bff; font-size: 12px;">(当前)</span>' : ''}
            `;

            // 操作按钮容器
            const actionContainer = document.createElement('div');

            // 切换按钮
            const switchButton = document.createElement('button');
            switchButton.textContent = '切换';
            switchButton.style.cssText = `
                background: #007bff; 
                color: white; 
                border: none; 
                padding: 4px 8px; 
                border-radius: 3px; 
                margin-right: 5px; 
                cursor: pointer; 
                font-size: 12px;
            `;
            switchButton.addEventListener('click', () => {
                console.log(`切换到书单: ${name}`);
                window.switchToBookList(name);
            });

            // 重命名按钮
            const renameButton = document.createElement('button');
            renameButton.textContent = '重命名';
            renameButton.style.cssText = `
                background: #ffc107; 
                color: white; 
                border: none; 
                padding: 4px 8px; 
                border-radius: 3px; 
                margin-right: 5px; 
                cursor: pointer; 
                font-size: 12px;
            `;
            renameButton.addEventListener('click', () => {
                console.log(`重命名书单: ${name}`);
                window.renameBookList(name);
            });

            // 删除按钮
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '删除';
            deleteButton.style.cssText = `
                background: #dc3545; 
                color: white; 
                border: none; 
                padding: 4px 8px; 
                border-radius: 3px; 
                cursor: pointer; 
                font-size: 12px;
            `;
            deleteButton.addEventListener('click', () => {
                console.log(`删除书单: ${name}`);
                window.deleteBookList(name);
            });

            actionContainer.appendChild(switchButton);
            actionContainer.appendChild(renameButton);
            actionContainer.appendChild(deleteButton);

            listItem.appendChild(bookListInfo);
            listItem.appendChild(actionContainer);
            listContainer.appendChild(listItem);
        });

        // 底部按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.textAlign = 'center';

        // 新建书单按钮
        const newListButton = document.createElement('button');
        newListButton.textContent = '新建书单';
        newListButton.style.cssText = `
            background: #28a745; 
            color: white; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 5px; 
            margin-right: 10px; 
            cursor: pointer;
        `;
        newListButton.addEventListener('click', () => {
            console.log('点击新建书单');
            window.createNewBookListFromManager();
        });

        buttonContainer.appendChild(newListButton);

        // 组装模态框
        modalContent.appendChild(closeButton);
        modalContent.appendChild(title);
        modalContent.appendChild(listContainer);
        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);

        // 点击遮罩层关闭
        modal.addEventListener('click', (e) => {
            console.log('点击模态框背景');
            if (e.target === modal) {
                window.closeBookListManager();
            }
        });

        // 阻止内容区域的点击事件冒泡
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 添加到文档
        document.body.appendChild(modal);

        console.log('书单管理面板已创建');
    };

    // 关闭书单管理面板
    window.closeBookListManager = function() {
        console.log('尝试关闭书单管理面板');
        const modal = document.getElementById('booklist-manager-modal');
        if (modal) {
            console.log('找到模态框，准备移除');
            modal.style.opacity = '0';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                    console.log('模态框已移除');
                }
            }, 300);
        } else {
            console.warn('未找到书单管理面板');
        }
    };

    // 切换到指定书单
    window.switchToBookList = function(name) {
        switchBookList(name);
        window.closeBookListManager();
    };

    // 重命名书单
    window.renameBookList = function(oldName) {
        customPrompt({
            title: `重命名书单：${oldName}`,
            placeholder: '请输入新的书单名称',
            required: true,
            maxLength: 10,
            minLength: 1,
            validate: (value) => {
                const allBookLists = getAllBookLists();
                if (allBookLists[value]) {
                    return '书单名称已存在，请使用其他名称';
                }
                return true;
            }
        }).then(newName => {
            if (newName) {
                const allBookLists = getAllBookLists();
                
                allBookLists[newName] = allBookLists[oldName];
                delete allBookLists[oldName];
                saveAllBookLists(allBookLists);
                
                if (currentBookListName === oldName) {
                    currentBookListName = newName;
                }
                
                window.closeBookListManager();
                createNotification('重命名成功！', 'success');
            }
        });
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
            
            window.closeBookListManager();
            createNotification('删除成功！', 'success');
        }
    };

    // 从管理面板新建书单
    window.createNewBookListFromManager = function() {
        customPrompt({
            title: '新建书单',
            placeholder: '请输入书单名称',
            required: true,
            maxLength: 10,
            minLength: 1,
            validate: (value) => {
                const allBookLists = getAllBookLists();
                if (allBookLists[value]) {
                    return '书单名称已存在，请使用其他名称';
                }
                return true;
            }
        }).then(bookListName => {
            if (bookListName) {
                createNewBookList(bookListName);
                window.closeBookListManager();
            }
        });
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
            const sourceListUrl = 'https://raw.kkgithub.com/zeroyong/js/main/sourceBooks/source.json';
            
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
            const bookInfo = await extractBookInfoByConfig(siteConfig);
            
            // 修复作者名称重复问题
            if (bookInfo && bookInfo.author) {
                bookInfo.author = bookInfo.author.replace(/^作者：作者：/, '作者：');
            }
            
            return bookInfo;
        }

        // 如果没有配置文件，使用原有的硬编码提取方法
        try {
            console.warn('使用默认提取方法');
            
            const titleElement = document.querySelector('.title-box > h3, h1.book-name');
            const title = titleElement ? titleElement.textContent.trim() : '未知书名';
            
            const authorElement = document.querySelector('.row > a, span.text-red-500');
            let author = authorElement ? authorElement.textContent.trim() : '未知作者';
            
            // 修复作者名称重复问题
            author = author.replace(/^作者：作者：/, '作者：');
            
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

    // 创建自定义输入弹窗
    function customPrompt(options) {
        return new Promise((resolve, reject) => {
            // 创建模态框容器
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 10003;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;

            // 弹窗内容容器
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: white;
                border-radius: 12px;
                box-shadow: 0 15px 50px rgba(0,0,0,0.2);
                width: 90%;
                max-width: 400px;
                padding: 20px;
                text-align: center;
                position: relative;
                transform: scale(0.7);
                transition: all 0.3s ease;
                opacity: 0;
            `;

            // 标题
            const title = document.createElement('h3');
            title.textContent = options.title || '输入';
            title.style.cssText = `
                margin-top: 0;
                margin-bottom: 15px;
                color: #333;
                font-size: 18px;
            `;

            // 输入框
            const input = document.createElement('input');
            input.type = options.type || 'text';
            input.placeholder = options.placeholder || '请输入';
            input.style.cssText = `
                width: 100%;
                padding: 10px;
                margin-bottom: 15px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 16px;
                box-sizing: border-box;
            `;

            // 错误提示
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = `
                color: #dc3545;
                font-size: 14px;
                margin-bottom: 10px;
                height: 20px;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: space-between;
            `;

            // 取消按钮
            const cancelButton = document.createElement('button');
            cancelButton.textContent = '取消';
            cancelButton.style.cssText = `
                flex: 1;
                margin-right: 10px;
                padding: 10px;
                background: #6c757d;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.3s ease;
            `;
            cancelButton.addEventListener('mouseenter', () => {
                cancelButton.style.background = '#555';
            });
            cancelButton.addEventListener('mouseleave', () => {
                cancelButton.style.background = '#6c757d';
            });

            // 确认按钮
            const confirmButton = document.createElement('button');
            confirmButton.textContent = '确认';
            confirmButton.style.cssText = `
                flex: 1;
                padding: 10px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.3s ease;
            `;
            confirmButton.addEventListener('mouseenter', () => {
                confirmButton.style.background = '#0056b3';
            });
            confirmButton.addEventListener('mouseleave', () => {
                confirmButton.style.background = '#007bff';
            });

            // 输入验证
            function validateInput() {
                const value = input.value.trim();
                
                // 清空之前的错误
                errorMsg.textContent = '';
                errorMsg.style.opacity = '0';

                // 非空验证
                if (options.required && !value) {
                    errorMsg.textContent = '输入不能为空';
                    errorMsg.style.opacity = '1';
                    return false;
                }

                // 最大长度验证
                if (options.maxLength && value.length > options.maxLength) {
                    errorMsg.textContent = `长度不能超过 ${options.maxLength} 个字符`;
                    errorMsg.style.opacity = '1';
                    return false;
                }

                // 最小长度验证
                if (options.minLength && value.length < options.minLength) {
                    errorMsg.textContent = `长度不能少于 ${options.minLength} 个字符`;
                    errorMsg.style.opacity = '1';
                    return false;
                }

                // 自定义验证函数
                if (options.validate && typeof options.validate === 'function') {
                    const customValidation = options.validate(value);
                    if (customValidation !== true) {
                        errorMsg.textContent = customValidation || '输入不符合要求';
                        errorMsg.style.opacity = '1';
                        return false;
                    }
                }

                return true;
            }

            // 确认按钮事件
            confirmButton.addEventListener('click', () => {
                if (validateInput()) {
                    closeModal(true);
                }
            });

            // 取消按钮事件
            cancelButton.addEventListener('click', () => {
                closeModal(false);
            });

            // 关闭模态框
            function closeModal(confirmed) {
                modal.style.opacity = '0';
                modalContent.style.transform = 'scale(0.7)';
                setTimeout(() => {
                    document.body.removeChild(modal);
                    if (confirmed) {
                        resolve(input.value.trim());
                    } else {
                        resolve(null);
                    }
                }, 300);
            }

            // 回车确认
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (validateInput()) {
                        closeModal(true);
                    }
                }
            });

            // 组装模态框
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(confirmButton);

            modalContent.appendChild(title);
            modalContent.appendChild(input);
            modalContent.appendChild(errorMsg);
            modalContent.appendChild(buttonContainer);

            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            // 显示动画
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
                modalContent.style.transform = 'scale(1)';
                modalContent.style.opacity = '1';
                input.focus();
            });

            // 点击遮罩层关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(false);
                }
            });

            // 阻止内容区域点击事件冒泡
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
    }

    // 初始化函数：确保加载正确的默认书单
    function initializeBookList() {
        const allBookLists = getAllBookLists();
        const defaultBookList = Object.keys(allBookLists).find(name => allBookLists[name].默认状态);
        
        if (defaultBookList) {
            currentBookListName = defaultBookList;
            console.log('初始化默认书单:', currentBookListName);
        } else {
            // 如果没有默认书单，创建一个
            createNewBookList('我的书单');
        }
    }

    // 主函数
    function init() {
        // 初始化书单
        initializeBookList();
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

