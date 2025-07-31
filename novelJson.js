// ==UserScript==
// @name        BookLoader
// @namespace   Violentmonkey Scripts
// @match       https://tuishujun.com/books/*
// @grant       none
// @version     1.0
// @author      xhg
// @description 2025/6/17 20:50:04
// ==/UserScript==

// 添加书籍到书单
function addToBooklist() {
    try {
        // 获取书籍信息
        const bookTitle = document.querySelector('.title-box h3')?.textContent?.trim() || '未知书名';
        const author = document.querySelector('.row a')?.textContent?.trim() || '未知作者';
        const summary = document.querySelector('.book-summary')?.textContent?.trim() || '暂无简介';
        
        // 创建书籍对象
        const bookInfo = {
            title: bookTitle,
            author: author,
            summary: summary,
            addedAt: new Date().toISOString(),
            url: window.location.href
        };
        
        // 从本地存储获取现有书单或创建新书单
        let booklist = JSON.parse(localStorage.getItem('booklist') || '[]');
        
        // 检查是否已存在相同书籍
        const exists = booklist.some(book => 
            book.title === bookInfo.title && book.author === bookInfo.author
        );
        
        if (exists) {
            alert('该书籍已存在于书单中！');
            return;
        }
        
        // 添加新书到书单
        booklist.push(bookInfo);
        
        // 保存回本地存储
        localStorage.setItem('booklist', JSON.stringify(booklist));
        
        alert('已成功添加到书单！');
    } catch (error) {
        console.error('添加到书单时出错:', error);
        alert('添加到书单失败，请稍后重试');
    }
}

// 创建并添加"添加到书单"按钮
function createAddToBooklistButton() {
    // 检查是否在书籍详情页
    if (document.querySelector('.title-box h3')) {
        const button = document.createElement('button');
        button.textContent = '添加到书单';
        button.style.margin = '10px 0';
        button.style.padding = '8px 16px';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';
        button.style.fontSize = '14px';
        button.onclick = addToBooklist;
        
        // 将按钮添加到标题框附近
        const titleBox = document.querySelector('.title-box');
        if (titleBox) {
            titleBox.appendChild(document.createElement('br'));
            titleBox.appendChild(button);
        }
    }
}

// 页面加载完成后添加按钮
document.addEventListener('DOMContentLoaded', createAddToBooklistButton);

// 如果页面内容是通过AJAX加载的，可以使用MutationObserver监听DOM变化
const observer = new MutationObserver((mutations) => {
    if (document.querySelector('.title-box h3') && !document.querySelector('#addToBooklistBtn')) {
        createAddToBooklistButton();
    }
});

// 开始观察document.body，当子节点变化时触发
observer.observe(document.body, { childList: true, subtree: true });
