# -*- coding: utf-8 -*-
# @Author: xhg
# @Date:   2025-06-26 21:41:03
# @Last Modified by:   xhg
# @Last Modified time: 2025-06-26 21:42:17
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
书单上传工具 - 应用程序打包脚本
使用 PyInstaller 打包 PyQt6 应用程序
"""

import os
import sys
import shutil
import subprocess
import platform

# 应用程序配置
APP_NAME = "书单上传工具"
MAIN_SCRIPT = "book_uploader_qt.py"
ICON_PATH = "icon.png"  # 应用程序图标
VERSION = "1.2.0"

def get_pyinstaller_args():
    """获取 PyInstaller 打包参数"""
    args = [
        'pyinstaller',
        '--name', f'{APP_NAME} v{VERSION}',
        '--onefile',  # 单文件模式
        '--windowed',  # 无控制台窗口
        '--clean',  # 清理缓存
        '--noconfirm',  # 不需要确认
    ]

    # 添加图标（根据操作系统）
    if platform.system() == 'Windows':
        args.extend(['--icon', ICON_PATH.replace('.png', '.ico')])
    elif platform.system() == 'Darwin':
        args.extend(['--icon', ICON_PATH])

    # 添加额外的数据文件
    data_files = [
        '--add-data', f'{ICON_PATH}:.',
    ]
    args.extend(data_files)

    # 隐藏导入
    hidden_imports = [
        '--hidden-import', 'PyQt6.QtCore',
        '--hidden-import', 'PyQt6.QtWidgets',
        '--hidden-import', 'PyQt6.QtGui',
    ]
    args.extend(hidden_imports)

    args.append(MAIN_SCRIPT)
    return args

def convert_icon():
    """转换图标为 .ico 格式（仅限 Windows）"""
    if platform.system() == 'Windows':
        try:
            from PIL import Image
            img = Image.open(ICON_PATH)
            ico_path = ICON_PATH.replace('.png', '.ico')
            img.save(ico_path, format='ICO', sizes=[(16,16), (32,32), (48,48), (64,64), (128,128)])
            return ico_path
        except ImportError:
            print("警告：未安装 Pillow，无法自动转换图标。请手动准备 .ico 文件。")
            return None

def create_requirements():
    """创建依赖文件"""
    requirements = [
        'PyQt6',
        'requests',
        'pyperclip',
        'pyinstaller',
    ]
    
    with open('requirements.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(requirements))

def build_app():
    """构建应用程序"""
    # 创建输出目录
    os.makedirs('dist', exist_ok=True)
    
    # 转换图标（仅 Windows）
    convert_icon()
    
    # 创建依赖文件
    create_requirements()
    
    # 准备 PyInstaller 参数
    pyinstaller_args = get_pyinstaller_args()
    
    # 执行打包
    try:
        print(f"开始打包 {APP_NAME} v{VERSION}...")
        result = subprocess.run(pyinstaller_args, capture_output=True, text=True)
        
        # 检查打包结果
        if result.returncode == 0:
            print("打包成功！")
            
            # 复制可执行文件到 dist 目录
            system = platform.system()
            if system == 'Windows':
                exe_name = f'{APP_NAME} v{VERSION}.exe'
                shutil.copy2(f'dist/{exe_name}', f'dist/{APP_NAME}.exe')
            elif system == 'Darwin':
                app_name = f'{APP_NAME} v{VERSION}.app'
                shutil.copy2(f'dist/{app_name}', f'dist/{APP_NAME}.app')
            else:
                exe_name = f'{APP_NAME} v{VERSION}'
                shutil.copy2(f'dist/{exe_name}', f'dist/{APP_NAME}')
            
            print(f"可执行文件已保存在 dist 目录")
        else:
            print("打包失败。错误信息：")
            print(result.stderr)
    
    except Exception as e:
        print(f"打包过程中发生错误：{e}")

def install_dependencies():
    """安装依赖"""
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'], check=True)
        print("依赖安装成功！")
    except subprocess.CalledProcessError:
        print("安装依赖失败，请检查网络连接和 pip 配置。")

def main():
    """主程序入口"""
    print("书单上传工具 - 应用程序打包工具")
    print("1. 安装依赖")
    print("2. 打包应用程序")
    print("3. 安装依赖并打包")
    print("0. 退出")
    
    choice = input("请选择操作（0-3）：").strip()
    
    if choice == '1':
        install_dependencies()
    elif choice == '2':
        build_app()
    elif choice == '3':
        install_dependencies()
        build_app()
    elif choice == '0':
        print("退出程序。")
        return
    else:
        print("无效的选择，请重新输入。")
        main()

if __name__ == "__main__":
    main() 