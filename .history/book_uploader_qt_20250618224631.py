# -*- coding: utf-8 -*-
# @Author: xhg
# @Date:   2025-06-18 22:06:42
# @Last Modified by:   xhg
# @Last Modified time: 2025-06-18 22:46:31
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
书单上传工具 - PyQt6版本
功能：读取本地JSON文件并上传到直链服务
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
    QListWidgetItem, QSplitter, QGroupBox, QLineEdit, QTableWidget,
    QTableWidgetItem, QHeaderView, QAbstractItemView
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QMimeData, QUrl, QTimer
from PyQt6.QtGui import QDragEnterEvent, QDropEvent, QFont, QIcon, QPixmap, QPalette, QColor

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
            
            # 检查文件是否存在
            if not os.path.exists(self.file_path):
                raise Exception("文件不存在")
            
            # 验证JSON格式
            try:
                with open(self.file_path, 'r', encoding='utf-8') as f:
                    json.load(f)
            except json.JSONDecodeError:
                raise Exception("JSON文件格式错误")
            
            with open(self.file_path, 'rb') as f:
                # 准备文件数据
                file_name = os.path.basename(self.file_path)
                files = {
                    'file': (file_name, f, 'application/json; charset=utf-8')
                }
                
                # 准备请求头
                headers = {
                    'User-Agent': 'BookUploader/1.0',
                    'Accept': 'multipart/form-data',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                }
                
                self.progress_updated.emit("正在上传到服务器...")
                
                # 发送请求
                response = requests.post(
                    'http://static.sy.yesui.me:7747/shuyuan',
                    files=files,
                    headers=headers,
                    timeout=60,
                    allow_redirects=True
                )
            
            # 检查响应状态
            if response.status_code == 200:
                result = response.text.strip()
                if result:
                    try:
                        # 尝试解析JSON响应
                        response_data = json.loads(result)
                        if 'data' in response_data:
                            # 从JSON响应中获取文件名
                            file_name = response_data['data']
                            download_url = f"http://static.sy.yesui.me:7747/shuyuan/{file_name}"
                        else:
                            # 如果不是JSON格式，按原来的方式处理
                            download_url = f"http://static.sy.yesui.me:7747/shuyuan/{result}"
                    except json.JSONDecodeError:
                        # 如果不是JSON格式，按原来的方式处理
                        download_url = f"http://static.sy.yesui.me:7747/shuyuan/{result}"
                    
                    self.progress_updated.emit("上传完成！")
                    self.upload_completed.emit("success", download_url)
                else:
                    raise Exception("服务器返回空响应")
            elif response.status_code == 400:
                # 尝试解析错误信息
                try:
                    error_info = response.json()
                    error_msg = error_info.get('error', '请求格式错误')
                except:
                    error_msg = f"服务器返回400错误: {response.text[:200]}"
                raise Exception(error_msg)
            else:
                raise Exception(f"服务器返回错误状态码: {response.status_code}, 响应: {response.text[:200]}")
                
        except requests.exceptions.Timeout:
            self.upload_failed.emit("上传超时，请检查网络连接")
        except requests.exceptions.ConnectionError:
            self.upload_failed.emit("连接服务器失败，请检查网络连接")
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
        self.setMinimumHeight(150)
        self.setStyleSheet("""
            QFrame {
                border: 3px dashed #007bff;
                border-radius: 12px;
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #f8f9fa, stop:1 #e9ecef);
                margin: 5px;
            }
            QFrame:hover {
                border-color: #28a745;
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #d4edda, stop:1 #c3e6cb);
            }
        """)
        
        layout = QVBoxLayout(self)
        layout.setSpacing(15)
        
        # 拖拽提示图标
        icon_label = QLabel("📁")
        icon_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        icon_label.setStyleSheet("font-size: 64px; color: #6c757d; margin: 10px;")
        layout.addWidget(icon_label)
        
        # 拖拽提示文字
        text_label = QLabel("拖拽JSON文件到这里\n或点击下方按钮选择文件")
        text_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        text_label.setStyleSheet("""
            font-size: 16px; 
            color: #495057; 
            font-weight: bold;
            margin: 10px;
        """)
        layout.addWidget(text_label)
        
        # 选择文件按钮
        self.select_btn = QPushButton("选择文件")
        self.select_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #007bff, stop:1 #0056b3);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: bold;
                margin: 10px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #0056b3, stop:1 #004085);
            }
            QPushButton:pressed {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #004085, stop:1 #002752);
            }
        """)
        layout.addWidget(self.select_btn, alignment=Qt.AlignmentFlag.AlignCenter)
        
    def dragEnterEvent(self, event: QDragEnterEvent):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
            self.setStyleSheet("""
                QFrame {
                    border: 3px dashed #28a745;
                    border-radius: 12px;
                    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                        stop:0 #d4edda, stop:1 #c3e6cb);
                    margin: 5px;
                }
            """)
    
    def dragLeaveEvent(self, event):
        self.setStyleSheet("""
            QFrame {
                border: 3px dashed #007bff;
                border-radius: 12px;
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #f8f9fa, stop:1 #e9ecef);
                margin: 5px;
            }
            QFrame:hover {
                border-color: #28a745;
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #d4edda, stop:1 #c3e6cb);
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
                border: 3px dashed #007bff;
                border-radius: 12px;
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #f8f9fa, stop:1 #e9ecef);
                margin: 5px;
            }
            QFrame:hover {
                border-color: #28a745;
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #d4edda, stop:1 #c3e6cb);
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
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(8)
        
        # 书籍标题
        title_label = QLabel(self.book_data.get('name', '未知书名'))
        title_label.setStyleSheet("""
            font-weight: bold; 
            font-size: 16px; 
            color: #212529;
            padding: 5px 0;
        """)
        layout.addWidget(title_label)
        
        # 作者信息
        author_label = QLabel(f"👤 作者：{self.book_data.get('author', '未知作者')}")
        author_label.setStyleSheet("""
            font-size: 13px; 
            color: #6c757d; 
            margin-top: 5px;
        """)
        layout.addWidget(author_label)
        
        # 简介（截取前120字符）
        intro = self.book_data.get('intro', '暂无简介')
        if len(intro) > 120:
            intro = intro[:120] + "..."
        intro_label = QLabel(intro)
        intro_label.setStyleSheet("""
            font-size: 12px; 
            color: #868e96; 
            margin-top: 8px;
            line-height: 1.4;
        """)
        intro_label.setWordWrap(True)
        layout.addWidget(intro_label)
        
        self.setStyleSheet("""
            QWidget {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #ffffff, stop:1 #f8f9fa);
                border: 2px solid #e9ecef;
                border-radius: 10px;
                margin: 3px;
            }
            QWidget:hover {
                border-color: #007bff;
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #f8f9fa, stop:1 #e3f2fd);
            }
        """)

class BookUploaderQt(QMainWindow):
    def __init__(self):
        super().__init__()
        self.upload_thread = None
        self.current_file_path = None
        self.upload_result = None
        self.setup_ui()
        self.setup_styles()
        
    def setup_ui(self):
        self.setWindowTitle("📚 书单上传工具 - PyQt6版本")
        self.setGeometry(100, 100, 1000, 700)
        self.setMinimumSize(900, 600)
        
        # 设置窗口图标
        self.setWindowIcon(self.style().standardIcon(self.style().StandardPixmap.SP_ComputerIcon))
        
        # 主窗口部件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QVBoxLayout(central_widget)
        main_layout.setSpacing(20)
        main_layout.setContentsMargins(25, 25, 25, 25)
        
        # 标题
        title_label = QLabel("📚 书单上传工具")
        title_label.setStyleSheet("""
            font-size: 28px; 
            font-weight: bold; 
            color: #212529; 
            margin-bottom: 10px;
            padding: 10px;
        """)
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
        splitter.setSizes([500, 500])
        
        # 底部按钮区域
        bottom_layout = QHBoxLayout()
        bottom_layout.setSpacing(15)
        
        self.upload_btn = QPushButton("🚀 开始上传")
        self.upload_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #28a745, stop:1 #218838);
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 10px;
                font-size: 16px;
                font-weight: bold;
                min-width: 120px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #218838, stop:1 #1e7e34);
            }
            QPushButton:pressed {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #1e7e34, stop:1 #1c7430);
            }
            QPushButton:disabled {
                background: #6c757d;
            }
        """)
        self.upload_btn.clicked.connect(self.start_upload)
        self.upload_btn.setEnabled(False)
        
        self.copy_btn = QPushButton("📋 复制直链")
        self.copy_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #007bff, stop:1 #0056b3);
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 10px;
                font-size: 16px;
                font-weight: bold;
                min-width: 120px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #0056b3, stop:1 #004085);
            }
            QPushButton:pressed {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #004085, stop:1 #002752);
            }
            QPushButton:disabled {
                background: #6c757d;
            }
        """)
        self.copy_btn.clicked.connect(self.copy_link)
        self.copy_btn.setEnabled(False)
        
        bottom_layout.addWidget(self.upload_btn)
        bottom_layout.addWidget(self.copy_btn)
        bottom_layout.addStretch()
        
        main_layout.addLayout(bottom_layout)
        
    def setup_styles(self):
        """设置全局样式"""
        self.setStyleSheet("""
            QMainWindow {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #f8f9fa, stop:1 #e9ecef);
            }
            QGroupBox {
                font-weight: bold;
                font-size: 14px;
                color: #495057;
                border: 2px solid #dee2e6;
                border-radius: 8px;
                margin-top: 10px;
                padding-top: 10px;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 5px 0 5px;
            }
            QTableWidget {
                border: 1px solid #dee2e6;
                border-radius: 6px;
                background-color: white;
                gridline-color: #f8f9fa;
            }
            QTableWidget::item {
                padding: 8px;
                border-bottom: 1px solid #f8f9fa;
            }
            QTableWidget::item:selected {
                background-color: #e3f2fd;
                color: #212529;
            }
            QHeaderView::section {
                background-color: #f8f9fa;
                padding: 8px;
                border: none;
                border-bottom: 2px solid #dee2e6;
                font-weight: bold;
                color: #495057;
            }
            QTextEdit {
                border: 1px solid #dee2e6;
                border-radius: 6px;
                background-color: white;
                padding: 10px;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 12px;
            }
            QProgressBar {
                border: 2px solid #dee2e6;
                border-radius: 8px;
                text-align: center;
                background-color: #f8f9fa;
            }
            QProgressBar::chunk {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #007bff, stop:1 #0056b3);
                border-radius: 6px;
            }
        """)
        
    def create_left_panel(self):
        """创建左侧面板"""
        panel = QWidget()
        layout = QVBoxLayout(panel)
        layout.setSpacing(15)
        
        # 文件选择区域
        file_group = QGroupBox("📁 文件选择")
        file_layout = QVBoxLayout(file_group)
        
        self.drag_drop_widget = DragDropWidget()
        self.drag_drop_widget.file_dropped.connect(self.on_file_selected)
        self.drag_drop_widget.select_btn.clicked.connect(self.select_file)
        file_layout.addWidget(self.drag_drop_widget)
        
        # 文件信息显示
        self.file_info_label = QLabel("未选择文件")
        self.file_info_label.setStyleSheet("""
            font-size: 13px; 
            color: #6c757d; 
            margin-top: 10px;
            padding: 10px;
            background-color: white;
            border-radius: 6px;
            border: 1px solid #dee2e6;
        """)
        file_layout.addWidget(self.file_info_label)
        
        layout.addWidget(file_group)
        
        # 进度显示区域
        progress_group = QGroupBox("📊 上传进度")
        progress_layout = QVBoxLayout(progress_group)
        
        self.progress_label = QLabel("准备就绪")
        self.progress_label.setStyleSheet("""
            font-size: 13px; 
            color: #6c757d;
            padding: 5px 0;
        """)
        progress_layout.addWidget(self.progress_label)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setMinimumHeight(25)
        progress_layout.addWidget(self.progress_bar)
        
        layout.addWidget(progress_group)
        
        # 结果显示区域
        result_group = QGroupBox("🔗 上传结果")
        result_layout = QVBoxLayout(result_group)
        
        self.result_text = QTextEdit()
        self.result_text.setMaximumHeight(150)
        self.result_text.setPlaceholderText("上传结果将在这里显示...")
        result_layout.addWidget(self.result_text)
        
        layout.addWidget(result_group)
        
        return panel
    
    def create_right_panel(self):
        """创建右侧面板"""
        panel = QWidget()
        layout = QVBoxLayout(panel)
        layout.setSpacing(15)
        
        # 书籍信息显示
        books_group = QGroupBox("📖 书籍信息")
        books_layout = QVBoxLayout(books_group)
        
        self.books_count_label = QLabel("未加载书籍信息")
        self.books_count_label.setStyleSheet("""
            font-size: 13px; 
            color: #6c757d; 
            margin-bottom: 10px;
            padding: 8px;
            background-color: #f8f9fa;
            border-radius: 6px;
        """)
        books_layout.addWidget(self.books_count_label)
        
        # 书籍列表
        self.books_list = QListWidget()
        self.books_list.setStyleSheet("""
            QListWidget {
                border: 1px solid #dee2e6;
                border-radius: 6px;
                background-color: white;
                padding: 5px;
            }
            QListWidget::item {
                padding: 5px;
                border-bottom: 1px solid #f8f9fa;
            }
            QListWidget::item:selected {
                background-color: #e3f2fd;
                color: #212529;
                border-radius: 6px;
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
                border: 1px solid #dee2e6;
                border-radius: 6px;
                background-color: white;
                font-size: 11px;
                padding: 5px;
            }
            QListWidget::item {
                padding: 5px;
                border-bottom: 1px solid #f8f9fa;
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
        self.file_info_label.setText(f"📄 已选择: {file_name}\n📊 文件大小: {file_size:,} 字节")
    
    def load_file_info(self, file_path):
        """加载文件信息"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 清空书籍列表
            self.books_list.clear()
            
            if isinstance(data, list):
                books = data
                self.books_count_label.setText(f"📚 共 {len(books)} 本书籍")
                
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
                self.books_count_label.setText("📚 1 本书籍")
                
        except Exception as e:
            self.books_count_label.setText(f"❌ 加载失败: {str(e)}")
            self.books_list.clear()
    
    def start_upload(self):
        """开始上传"""
        if not self.current_file_path:
            QMessageBox.warning(self, "警告", "请先选择要上传的文件！")
            return
        
        # 验证JSON文件格式
        try:
            with open(self.current_file_path, 'r', encoding='utf-8') as f:
                json.load(f)
        except json.JSONDecodeError:
            QMessageBox.critical(self, "错误", "JSON文件格式错误！")
            return
        except Exception as e:
            QMessageBox.critical(self, "错误", f"读取文件失败：{str(e)}")
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
        result_text += f"📋 直链已复制到剪贴板！\n"
        result_text += f"💡 提示: 可以直接在阅读器中使用此直链"
        
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