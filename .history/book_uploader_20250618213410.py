# -*- coding: utf-8 -*-
# @Author: xhg
# @Date:   2025-06-18 21:33:45
# @Last Modified by:   xhg
# @Last Modified time: 2025-06-18 21:34:10
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
书单上传工具
功能：读取本地JSON文件并上传到直链服务
"""

import os
import json
import glob
import requests
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import threading
import pyperclip
from datetime import datetime

class BookUploader:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("书单上传工具")
        self.root.geometry("600x400")
        self.root.resizable(True, True)
        
        # 设置样式
        style = ttk.Style()
        style.theme_use('clam')
        
        self.setup_ui()
        self.scan_json_files()
        
    def setup_ui(self):
        """设置用户界面"""
        # 主框架
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # 配置网格权重
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        
        # 标题
        title_label = ttk.Label(main_frame, text="📚 书单上传工具", font=("Arial", 16, "bold"))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # 文件选择区域
        file_frame = ttk.LabelFrame(main_frame, text="文件选择", padding="10")
        file_frame.grid(row=1, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        file_frame.columnconfigure(1, weight=1)
        
        ttk.Label(file_frame, text="JSON文件:").grid(row=0, column=0, sticky=tk.W, padx=(0, 10))
        
        self.file_var = tk.StringVar()
        self.file_entry = ttk.Entry(file_frame, textvariable=self.file_var, state="readonly")
        self.file_entry.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=(0, 10))
        
        ttk.Button(file_frame, text="浏览", command=self.browse_file).grid(row=0, column=2)
        
        # 文件列表
        list_frame = ttk.LabelFrame(main_frame, text="当前目录的JSON文件", padding="10")
        list_frame.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 10))
        list_frame.columnconfigure(0, weight=1)
        list_frame.rowconfigure(0, weight=1)
        
        # 创建Treeview
        columns = ("文件名", "大小", "修改时间", "书籍数量")
        self.tree = ttk.Treeview(list_frame, columns=columns, show="headings", height=8)
        
        # 设置列标题
        for col in columns:
            self.tree.heading(col, text=col)
            self.tree.column(col, width=120)
        
        # 添加滚动条
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        self.tree.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        
        # 绑定双击事件
        self.tree.bind("<Double-1>", self.on_file_double_click)
        
        # 进度条
        progress_frame = ttk.Frame(main_frame)
        progress_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        progress_frame.columnconfigure(0, weight=1)
        
        self.progress_var = tk.StringVar(value="准备就绪")
        ttk.Label(progress_frame, textvariable=self.progress_var).grid(row=0, column=0, sticky=tk.W)
        
        self.progress = ttk.Progressbar(progress_frame, mode='indeterminate')
        self.progress.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=(5, 0))
        
        # 按钮区域
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=4, column=0, columnspan=3, pady=(10, 0))
        
        ttk.Button(button_frame, text="🔄 刷新文件列表", command=self.scan_json_files).pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(button_frame, text="📤 上传选中文件", command=self.upload_selected).pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(button_frame, text="📋 复制直链", command=self.copy_link).pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(button_frame, text="❌ 退出", command=self.root.quit).pack(side=tk.RIGHT)
        
        # 结果显示
        result_frame = ttk.LabelFrame(main_frame, text="上传结果", padding="10")
        result_frame.grid(row=5, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(10, 0))
        result_frame.columnconfigure(0, weight=1)
        result_frame.rowconfigure(0, weight=1)
        
        self.result_text = tk.Text(result_frame, height=6, wrap=tk.WORD)
        result_scrollbar = ttk.Scrollbar(result_frame, orient=tk.VERTICAL, command=self.result_text.yview)
        self.result_text.configure(yscrollcommand=result_scrollbar.set)
        
        self.result_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        result_scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        
        # 存储上传结果
        self.upload_result = None
        
    def scan_json_files(self):
        """扫描当前目录的JSON文件"""
        self.tree.delete(*self.tree.get_children())
        
        # 获取当前目录
        current_dir = os.getcwd()
        json_files = glob.glob(os.path.join(current_dir, "*.json"))
        
        for file_path in json_files:
            try:
                # 获取文件信息
                file_name = os.path.basename(file_path)
                file_size = os.path.getsize(file_path)
                file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                
                # 读取JSON文件获取书籍数量
                book_count = 0
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        if isinstance(data, list):
                            book_count = len(data)
                        else:
                            book_count = 1
                except:
                    book_count = 0
                
                # 插入到树形视图
                self.tree.insert("", "end", values=(
                    file_name,
                    f"{file_size:,} 字节",
                    file_mtime.strftime("%Y-%m-%d %H:%M:%S"),
                    f"{book_count} 本"
                ))
                
            except Exception as e:
                print(f"处理文件 {file_path} 时出错: {e}")
    
    def browse_file(self):
        """浏览文件"""
        file_path = filedialog.askopenfilename(
            title="选择JSON文件",
            filetypes=[("JSON文件", "*.json"), ("所有文件", "*.*")]
        )
        if file_path:
            self.file_var.set(file_path)
    
    def on_file_double_click(self, event):
        """双击文件选择"""
        selection = self.tree.selection()
        if selection:
            item = self.tree.item(selection[0])
            file_name = item['values'][0]
            file_path = os.path.join(os.getcwd(), file_name)
            self.file_var.set(file_path)
    
    def upload_selected(self):
        """上传选中的文件"""
        file_path = self.file_var.get()
        if not file_path:
            messagebox.showwarning("警告", "请先选择要上传的JSON文件！")
            return
        
        if not os.path.exists(file_path):
            messagebox.showerror("错误", "文件不存在！")
            return
        
        # 在新线程中执行上传
        thread = threading.Thread(target=self.upload_file, args=(file_path,))
        thread.daemon = True
        thread.start()
    
    def upload_file(self, file_path):
        """上传文件到服务器"""
        try:
            self.progress_var.set("正在上传文件...")
            self.progress.start()
            self.root.update()
            
            # 准备文件
            with open(file_path, 'rb') as f:
                files = {'file': (os.path.basename(file_path), f, 'application/json')}
                
                # 上传到服务器
                response = requests.post(
                    'http://static.sy.yesui.me:7747/shuyuan',
                    files=files,
                    timeout=30
                )
            
            self.progress.stop()
            
            if response.status_code == 200:
                # 解析响应
                result = response.text.strip()
                if result:
                    download_url = f"http://static.sy.yesui.me:7747/shuyuan/{result}"
                    self.upload_result = download_url
                    
                    # 显示结果
                    result_text = f"✅ 上传成功！\n\n"
                    result_text += f"📁 文件: {os.path.basename(file_path)}\n"
                    result_text += f"🔗 直链: {download_url}\n\n"
                    result_text += f"📋 直链已复制到剪贴板！"
                    
                    self.result_text.delete(1.0, tk.END)
                    self.result_text.insert(1.0, result_text)
                    
                    # 复制到剪贴板
                    pyperclip.copy(download_url)
                    
                    self.progress_var.set("上传完成！")
                    messagebox.showinfo("成功", f"文件上传成功！\n\n直链已复制到剪贴板：\n{download_url}")
                else:
                    raise Exception("服务器返回空响应")
            else:
                raise Exception(f"服务器返回错误状态码: {response.status_code}")
                
        except Exception as e:
            self.progress.stop()
            error_msg = f"上传失败：{str(e)}"
            self.progress_var.set("上传失败")
            
            self.result_text.delete(1.0, tk.END)
            self.result_text.insert(1.0, f"❌ {error_msg}")
            
            messagebox.showerror("错误", error_msg)
    
    def copy_link(self):
        """复制直链到剪贴板"""
        if self.upload_result:
            pyperclip.copy(self.upload_result)
            messagebox.showinfo("成功", "直链已复制到剪贴板！")
        else:
            messagebox.showwarning("警告", "没有可复制的直链，请先上传文件！")
    
    def run(self):
        """运行应用"""
        self.root.mainloop()

if __name__ == "__main__":
    app = BookUploader()
    app.run() 