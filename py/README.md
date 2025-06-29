# 书单上传工具 - 应用程序打包指南

## 环境准备

1. 确保已安装 Python 3.8 或更高版本
2. 推荐使用虚拟环境

## 依赖安装

```bash
# 创建虚拟环境（可选但推荐）
python -m venv venv
source venv/bin/activate  # Windows 使用 venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

## 打包应用程序

### 使用打包脚本

```bash
python build_app.py
```

脚本提供以下选项：
- `1`: 安装依赖
- `2`: 打包应用程序
- `3`: 安装依赖并打包
- `0`: 退出

### 手动打包（可选）

```bash
# 安装 PyInstaller
pip install pyinstaller

# 打包
pyinstaller --onefile --windowed --name "书单上传工具" book_uploader_qt.py
```

## 注意事项

1. 确保 `icon.png` 存在于同一目录
2. Windows 系统需要额外安装 Pillow 库以转换图标
3. 打包后的可执行文件将位于 `dist` 目录

## 常见问题

- 如遇到依赖问题，请检查 Python 版本和虚拟环境
- Windows 用户可能需要手动准备 `.ico` 图标文件

## 许可

本工具遵循 MIT 开源许可协议。 