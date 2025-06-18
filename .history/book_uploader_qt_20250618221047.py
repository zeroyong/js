#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
书单上传工具 - PyQt6版本
功能：读取本地JSON文件并上传到直链服务
支持拖拽文件、自动识别书籍信息
"""

import sys
import os
import json
import requests
import threading
import pyperclip
from datetime import datetime
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QLabel, QPushButton, QProgressBar, QTextEdit, QFileDialog,
    QFrame, QGridLayout, QScrollArea, QMessageBox, QListWidget,
    QListWidgetItem, QSplitter, QGroupBox, QLineEdit
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QMimeData, QUrl
from PyQt6.QtGui import QDragEnterEvent, QDropEvent, QFont, QIcon, QPixmap

class UploadThread(QThread):
    """上传线程"""
    progress_updated = pyqtSignal(str)
    upload_completed = pyqtSignal(str, str)  # success, result
    upload_failed = pyqtSignal(str)  # error message
    
    def __init__(self, file_path):
        super().__init__()
        self.file_path = file_path
    
    def run(self):
        try:
            self.progress_updated.emit("正在准备文件...")
            
            # 准备文件
            with open(self.file_path, 'rb') as f:
                files = {'file': (os.path.basename(self.file_path), f, 'application/json')}
                
                self.progress_updated.emit("正在上传到服务器...")
                
                # 上传到服务器
                response = requests.post(
                    'http://static.sy.yesui.me:7747/shuyuan',
                    files=files,
                    timeout=30
                )
            
            if response.status_code == 200:
                result = response.text.strip()
                if result:
                    download_url = f"http://static.sy.yesui.me:7747/shuyuan/{result}"
                    self.progress_updated.emit("上传完成！")
                    self.upload_completed.emit("success", download_url)
                else:
                    raise Exception("服务器返回空响应")
            else:
                raise Exception(f"服务器返回错误状态码: {response.status_code}")
                
        except Exception as e:
            self.upload_failed.emit(str(e))

class DragDropWidget(QFrame):
    """拖拽文件区域"""
    file_dropped = pyqtSignal(str)
    
    def __init__(self):
        super().__init__()
        self.setAcceptDrops(True)
        self.setup_ui()
        
    def setup_ui(self):
        self.setFrameStyle(QFrame.Shape.Box)
        self.setMinimumHeight(120)
        self.setStyleSheet("""
            QFrame {
                border: 2px dashed #cccccc;
                border-radius: 8px;
                background-color: #f8f9fa;
            }
            QFrame:hover {
                border-color: #007bff;
                background-color: #e3f2fd;
            }
        """)
        
        layout = QVBoxLayout(self)
        
        # 拖拽提示图标
        icon_label = QLabel("📁")
        icon_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        icon_label.setStyleSheet("font-size: 48px; color: #6c757d;")
        layout.addWidget(icon_label)
        
        # 拖拽提示文字
        text_label = QLabel("拖拽JSON文件到这里\n或点击选择文件")
        text_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        text_label.setStyleSheet("font-size: 14px; color: #6c757d;")
        layout.addWidget(text_label)
        
        # 选择文件按钮
        self.select_btn = QPushButton("选择文件")
        self.select_btn.setStyleSheet("""
            QPushButton {
                background-color: #007bff;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 12px;
            }
            QPushButton:hover {
                background-color: #0056b3;
            }
        """)
        layout.addWidget(self.select_btn, alignment=Qt.AlignmentFlag.AlignCenter)
        
    def dragEnterEvent(self, event: QDragEnterEvent):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
            self.setStyleSheet("""
                QFrame {
                    border: 2px dashed #28a745;
                    border-radius: 8px;
                    background-color: #d4edda;
                }
            """)
    
    def dragLeaveEvent(self, event):
        self.setStyleSheet("""
            QFrame {
                border: 2px dashed #cccccc;
                border-radius: 8px;
                background-color: #f8f9fa;
            }
            QFrame:hover {
                border-color: #007bff;
                background-color: #e3f2fd;
            }
        """)
    
    def dropEvent(self, event: QDropEvent):
        urls = event.mimeData().urls()
        if urls:
            file_path = urls[0].toLocalFile()
            if file_path.lower().endswith('.json'):
                self.file_dropped.emit(file_path)
            else:
                QMessageBox.warning(self, "文件格式错误", "请选择JSON文件！")
        
        self.setStyleSheet("""
            QFrame {
                border: 2px dashed #cccccc;
                border-radius: 8px;
                background-color: #f8f9fa;
            }
            QFrame:hover {
                border-color: #007bff;
                background-color: #e3f2fd;
            }
        """)

class BookInfoWidget(QWidget):
    """书籍信息显示组件"""
    def __init__(self, book_data):
        super().__init__()
        self.book_data = book_data
        self.setup_ui()
        
    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(10, 10, 10, 10)
        
        # 书籍标题
        title_label = QLabel(self.book_data.get('name', '未知书名'))
        title_label.setStyleSheet("font-weight: bold; font-size: 14px; color: #333;")
        layout.addWidget(title_label)
        
        # 作者信息
        author_label = QLabel(f"作者：{self.book_data.get('author', '未知作者')}")
        author_label.setStyleSheet("font-size: 12px; color: #666; margin-top: 4px;")
        layout.addWidget(author_label)
        
        # 简介（截取前100字符）
        intro = self.book_data.get('intro', '暂无简介')
        if len(intro) > 100:
            intro = intro[:100] + "..."
        intro_label = QLabel(intro)
        intro_label.setStyleSheet("font-size: 11px; color: #999; margin-top: 4px;")
        intro_label.setWordWrap(True)
        layout.addWidget(intro_label)
        
        self.setStyleSheet("""
            QWidget {
                background-color: white;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                margin: 2px;
            }
            QWidget:hover {
                border-color: #007bff;
                background-color: #f8f9fa;
            }
        """)

class BookUploaderQt(QMainWindow):
    def __init__(self):
        super().__init__()
        self.upload_thread = None
        self.current_file_path = None
        self.upload_result = None
        self.setup_ui()
        
    def setup_ui(self):
        self.setWindowTitle("📚 书单上传工具 - PyQt6版本")
        self.setGeometry(800, 600)
        self.setMinimumSize(700, 500)
        
        # 设置窗口图标
        self.setWindowIcon(self.style().standardIcon(self.style().StandardPixmap.SP_ComputerIcon))
        
        # 主窗口部件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QVBoxLayout(central_widget)
        main_layout.setSpacing(15)
        main_layout.setContentsMargins(20, 20, 20, 20)
        
        # 标题
        title_label = QLabel("📚 书单上传工具")
        title_label.setStyleSheet("font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px;")
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        main_layout.addWidget(title_label)
        
        # 创建分割器
        splitter = QSplitter(Qt.Orientation.Horizontal)
        main_layout.addWidget(splitter)
        
        # 左侧面板
        left_panel = self.create_left_panel()
        splitter.addWidget(left_panel)
        
        # 右侧面板
        right_panel = self.create_right_panel()
        splitter.addWidget(right_panel)
        
        # 设置分割器比例
        splitter.setSizes([400, 400])
        
        # 底部按钮区域
        bottom_layout = QHBoxLayout()
        
        self.upload_btn = QPushButton("🚀 开始上传")
        self.upload_btn.setStyleSheet("""
            QPushButton {
                background-color: #28a745;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #218838;
            }
            QPushButton:disabled {
                background-color: #6c757d;
            }
        """)
        self.upload_btn.clicked.connect(self.start_upload)
        self.upload_btn.setEnabled(False)
        
        self.copy_btn = QPushButton("📋 复制直链")
        self.copy_btn.setStyleSheet("""
            QPushButton {
                background-color: #007bff;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #0056b3;
            }
            QPushButton:disabled {
                background-color: #6c757d;
            }
        """)
        self.copy_btn.clicked.connect(self.copy_link)
        self.copy_btn.setEnabled(False)
        
        bottom_layout.addWidget(self.upload_btn)
        bottom_layout.addWidget(self.copy_btn)
        bottom_layout.addStretch()
        
        main_layout.addLayout(bottom_layout)
        
    def create_left_panel(self):
        """创建左侧面板"""
        panel = QWidget()
        layout = QVBoxLayout(panel)
        
        # 文件选择区域
        file_group = QGroupBox("📁 文件选择")
        file_layout = QVBoxLayout(file_group)
        
        self.drag_drop_widget = DragDropWidget()
        self.drag_drop_widget.file_dropped.connect(self.on_file_selected)
        self.drag_drop_widget.select_btn.clicked.connect(self.select_file)
        file_layout.addWidget(self.drag_drop_widget)
        
        # 文件信息显示
        self.file_info_label = QLabel("未选择文件")
        self.file_info_label.setStyleSheet("font-size: 12px; color: #666; margin-top: 10px;")
        file_layout.addWidget(self.file_info_label)
        
        layout.addWidget(file_group)
        
        # 进度显示区域
        progress_group = QGroupBox("📊 上传进度")
        progress_layout = QVBoxLayout(progress_group)
        
        self.progress_label = QLabel("准备就绪")
        self.progress_label.setStyleSheet("font-size: 12px; color: #666;")
        progress_layout.addWidget(self.progress_label)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        progress_layout.addWidget(self.progress_bar)
        
        layout.addWidget(progress_group)
        
        # 结果显示区域
        result_group = QGroupBox("🔗 上传结果")
        result_layout = QVBoxLayout(result_group)
        
        self.result_text = QTextEdit()
        self.result_text.setMaximumHeight(120)
        self.result_text.setPlaceholderText("上传结果将在这里显示...")
        result_layout.addWidget(self.result_text)
        
        layout.addWidget(result_group)
        
        return panel
    
    def create_right_panel(self):
        """创建右侧面板"""
        panel = QWidget()
        layout = QVBoxLayout(panel)
        
        # 书籍信息显示
        books_group = QGroupBox("📖 书籍信息")
        books_layout = QVBoxLayout(books_group)
        
        self.books_count_label = QLabel("未加载书籍信息")
        self.books_count_label.setStyleSheet("font-size: 12px; color: #666; margin-bottom: 10px;")
        books_layout.addWidget(self.books_count_label)
        
        # 书籍列表
        self.books_list = QListWidget()
        self.books_list.setStyleSheet("""
            QListWidget {
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                background-color: white;
            }
            QListWidget::item {
                padding: 8px;
                border-bottom: 1px solid #f0f0f0;
            }
            QListWidget::item:selected {
                background-color: #e3f2fd;
                color: #333;
            }
        """)
        books_layout.addWidget(self.books_list)
        
        layout.addWidget(books_group)
        
        # 历史记录
        history_group = QGroupBox("📋 历史记录")
        history_layout = QVBoxLayout(history_group)
        
        self.history_list = QListWidget()
        self.history_list.setMaximumHeight(120)
        self.history_list.setStyleSheet("""
            QListWidget {
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                background-color: white;
                font-size: 11px;
            }
        """)
        history_layout.addWidget(self.history_list)
        
        layout.addWidget(history_group)
        
        return panel
    
    def select_file(self):
        """选择文件"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "选择JSON文件", "", "JSON文件 (*.json);;所有文件 (*.*)"
        )
        if file_path:
            self.on_file_selected(file_path)
    
    def on_file_selected(self, file_path):
        """文件被选择时的处理"""
        self.current_file_path = file_path
        self.load_file_info(file_path)
        self.upload_btn.setEnabled(True)
        
        # 更新文件信息显示
        file_name = os.path.basename(file_path)
        file_size = os.path.getsize(file_path)
        self.file_info_label.setText(f"已选择: {file_name} ({file_size:,} 字节)")
    
    def load_file_info(self, file_path):
        """加载文件信息"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 清空书籍列表
            self.books_list.clear()
            
            if isinstance(data, list):
                books = data
                self.books_count_label.setText(f"共 {len(books)} 本书籍")
                
                # 添加书籍到列表
                for book in books:
                    book_widget = BookInfoWidget(book)
                    item = QListWidgetItem()
                    item.setSizeHint(book_widget.sizeHint())
                    self.books_list.addItem(item)
                    self.books_list.setItemWidget(item, book_widget)
            else:
                # 单个书籍
                book_widget = BookInfoWidget(data)
                item = QListWidgetItem()
                item.setSizeHint(book_widget.sizeHint())
                self.books_list.addItem(item)
                self.books_list.setItemWidget(item, book_widget)
                self.books_count_label.setText("1 本书籍")
                
        except Exception as e:
            self.books_count_label.setText(f"加载失败: {str(e)}")
            self.books_list.clear()
    
    def start_upload(self):
        """开始上传"""
        if not self.current_file_path:
            QMessageBox.warning(self, "警告", "请先选择要上传的文件！")
            return
        
        # 禁用上传按钮
        self.upload_btn.setEnabled(False)
        self.upload_btn.setText("上传中...")
        
        # 显示进度条
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0)  # 不确定进度
        
        # 清空结果显示
        self.result_text.clear()
        
        # 创建上传线程
        self.upload_thread = UploadThread(self.current_file_path)
        self.upload_thread.progress_updated.connect(self.update_progress)
        self.upload_thread.upload_completed.connect(self.upload_success)
        self.upload_thread.upload_failed.connect(self.upload_failed)
        self.upload_thread.start()
    
    def update_progress(self, message):
        """更新进度"""
        self.progress_label.setText(message)
        self.result_text.append(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
    
    def upload_success(self, status, result):
        """上传成功"""
        self.upload_result = result
        
        # 恢复按钮状态
        self.upload_btn.setEnabled(True)
        self.upload_btn.setText("🚀 开始上传")
        
        # 隐藏进度条
        self.progress_bar.setVisible(False)
        
        # 显示结果
        result_text = f"✅ 上传成功！\n\n"
        result_text += f"📁 文件: {os.path.basename(self.current_file_path)}\n"
        result_text += f"🔗 直链: {result}\n\n"
        result_text += f"📋 直链已复制到剪贴板！"
        
        self.result_text.append(f"\n{result_text}")
        
        # 复制到剪贴板
        pyperclip.copy(result)
        
        # 添加到历史记录
        self.add_to_history(result)
        
        # 启用复制按钮
        self.copy_btn.setEnabled(True)
        
        QMessageBox.information(self, "上传成功", f"文件上传成功！\n\n直链已复制到剪贴板：\n{result}")
    
    def upload_failed(self, error_msg):
        """上传失败"""
        # 恢复按钮状态
        self.upload_btn.setEnabled(True)
        self.upload_btn.setText("🚀 开始上传")
        
        # 隐藏进度条
        self.progress_bar.setVisible(False)
        
        # 显示错误
        self.result_text.append(f"\n❌ 上传失败: {error_msg}")
        
        QMessageBox.critical(self, "上传失败", f"上传失败：{error_msg}")
    
    def copy_link(self):
        """复制直链"""
        if self.upload_result:
            pyperclip.copy(self.upload_result)
            QMessageBox.information(self, "复制成功", "直链已复制到剪贴板！")
        else:
            QMessageBox.warning(self, "警告", "没有可复制的直链，请先上传文件！")
    
    def add_to_history(self, link):
        """添加到历史记录"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        item_text = f"[{timestamp}] {os.path.basename(self.current_file_path)}"
        
        item = QListWidgetItem(item_text)
        item.setData(Qt.ItemDataRole.UserRole, link)
        self.history_list.insertItem(0, item)
        
        # 限制历史记录数量
        while self.history_list.count() > 10:
            self.history_list.takeItem(self.history_list.count() - 1)

def main():
    app = QApplication(sys.argv)
    
    # 设置应用样式
    app.setStyle('Fusion')
    
    # 创建主窗口
    window = BookUploaderQt()
    window.show()
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main() 