# -*- coding: utf-8 -*-
# @Author: xhg
# @Date:   2025-06-26 16:33:06
# @Last Modified by:   xhg
# @Last Modified time: 2025-06-26 16:37:09

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from time import sleep
from bs4 import BeautifulSoup
import requests
from rich.progress import (
    Progress,
    SpinnerColumn,
    BarColumn,
    TransferSpeedColumn,
    DownloadColumn,
)
from rich.console import Console
import os
from pathlib import Path
import pyperclip
import time
import re
import threading
from concurrent.futures import ThreadPoolExecutor
import math
import zipfile
import uuid
import shutil
import mimetypes
import base64


def init_chrome_driver(headless=True):
    """初始化Chrome浏览器"""
    option = Options()
    option.add_experimental_option(
        'excludeSwitches', ['enable-automation', 'enable-logging'])
    option.add_argument('--log-level=3')
    if headless:
        option.add_argument('--headless')  # 无头模式
    return webdriver.Chrome(options=option)


def init_download_dir():
    """初始化下载目录"""
    downloads_dir = Path("downloads")
    downloads_dir.mkdir(exist_ok=True)
    return downloads_dir


def init_audio_dir():
    """初始化音频目录"""
    audio_dir = Path("audios")
    audio_dir.mkdir(exist_ok=True)
    return audio_dir


def wait_for_title_change(browser, timeout=10, check_interval=0.5):
    """等待标题内容变化"""
    console = Console()
    start_time = time.time()

    # 获取初始标题内容
    soup = BeautifulSoup(browser.page_source, 'html.parser')
    initial_title = soup.find('div', class_='title-alert')
    initial_content = initial_title.text.strip() if initial_title else ""

    while True:
        # 检查是否超时
        if time.time() - start_time > timeout:
            console.print("[red]解析超时，请重试[/red]")
            return False

        # 获取当前标题
        soup = BeautifulSoup(browser.page_source, 'html.parser')
        current_title = soup.find('div', class_='title-alert')
        current_content = current_title.text.strip() if current_title else ""

        # 如果标题内容发生变化且不为空
        if current_content and current_content != initial_content:
            return True

        time.sleep(check_interval)


def parse_video_url_v2ob(browser, video_url):
    """用v2ob.com自动解析视频下载链接和标题"""
    console = Console()
    browser.get("https://www.v2ob.com/bilibili")
    WebDriverWait(browser, 10).until(
        EC.presence_of_element_located((By.ID, "video-url"))
    )
    input_box = browser.find_element(By.ID, "video-url")
    input_box.clear()
    input_box.send_keys(video_url)
    parse_btn = browser.find_element(By.ID, "parse-btn")
    parse_btn.click()

    # 等待.result-card .btn-success出现
    try:
        WebDriverWait(browser, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".result-card .btn-success[href]"))
        )
        page_source = browser.page_source
        soup = BeautifulSoup(page_source, "html.parser")
        btn = soup.select_one(".result-card .btn-success[href]")
        title_elem = soup.select_one(".result-card h4")
        video_url = btn["href"] if btn else None
        title = title_elem.text.strip() if title_elem else "未找到标题"
        return title, video_url
    except Exception as e:
        console.print(f"[red]解析失败: {e}[/red]")
        return None, None


def extract_video_info(page_source):
    """从页面源码中提取视频信息"""
    console = Console()
    console.print("[yellow]正在提取视频信息...[/yellow]")

    soup = BeautifulSoup(page_source, 'html.parser')

    # 获取标题
    title_div = soup.find('div', class_='title-alert')
    title = title_div.text.strip() if title_div else "未找到标题"

    # 获取视频链接
    video_link = soup.select_one('.video-box a')
    link = video_link.get('href') if video_link else "未找到链接"

    if link != "未找到链接":
        console.print("[green]成功获取视频链接！[/green]")

    return title, link


def download_file_part(url, start, end, file_path, progress, task_id, headers):
    """下载文件的一部分"""
    if start >= end:
        return

    headers = headers.copy()
    headers['Range'] = f'bytes={start}-{end}'

    response = requests.get(url, headers=headers, stream=True)

    with open(file_path, 'rb+') as f:
        f.seek(start)
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)
                progress.update(task_id, advance=len(chunk))


def sanitize_filename(filename):
    """清理文件名，移除非法字符"""
    # 替换Windows下的非法字符
    illegal_chars = r'<>:"/\|?*'
    for char in illegal_chars:
        filename = filename.replace(char, '_')
    # 移除控制字符
    filename = "".join(char for char in filename if ord(char) >= 32)
    return filename.strip()


def download_with_threads(url, file_path, total_size, display_title, num_threads=5, headers=None):
    """多线程下载文件"""
    console = Console()

    try:
        # 创建空文件
        with open(file_path, 'wb') as f:
            f.seek(total_size - 1)
            f.write(b'\0')

        # 计算每个线程下载的大小
        part_size = math.ceil(total_size / num_threads)

        with Progress(
            SpinnerColumn(),
            "[progress.description]{task.description}",
            BarColumn(complete_style="green"),
            "[progress.percentage]{task.percentage:>3.0f}%",
            DownloadColumn(),
            TransferSpeedColumn(),
            console=console,
        ) as progress:
            download_task = progress.add_task(
                f"[cyan]下载中: {display_title}", total=total_size)

            # 使用线程池
            with ThreadPoolExecutor(max_workers=num_threads) as pool:
                tasks = []
                for i in range(num_threads):
                    start = i * part_size
                    end = min(start + part_size - 1, total_size - 1)
                    task = pool.submit(
                        download_file_part,
                        url=url,
                        start=start,
                        end=end,
                        file_path=file_path,
                        progress=progress,
                        task_id=download_task,
                        headers=headers
                    )
                    tasks.append(task)

                # 等待所有任务完成
                for task in tasks:
                    task.result()  # 这里会抛出任何下载过程中的异常

        console.print(f"[green]下载完成！保存至: {file_path}[/green]")
    except Exception as e:
        console.print(f"[red]下载过程出错: {str(e)}[/red]")
        # 如果下载失败，删除不完整的文件
        try:
            if file_path.exists():
                file_path.unlink()
        except:
            pass
        raise


def monitor_clipboard():
    """监控剪贴板"""
    console = Console()
    video_dir = init_download_dir()
    audio_dir = init_audio_dir()
    last_content = pyperclip.paste()

    console.print("[green]初始化完成！[/green]")
    console.print("[yellow]正在监听剪贴板，支持以下内容：[/yellow]")
    console.print("1. 视频链接（抖音/快手/B站）")
    console.print("2. 音频数据URI（data:application/octet-stream;base64）")

    while True:
        try:
            current_content = pyperclip.paste().strip()
            if current_content != last_content:
                # 处理音频数据URI
                if current_content.startswith('data:application/octet-stream;base64,'):
                    console.print("\n[cyan]检测到音频数据URI[/cyan]")
                    try:
                        filepath = download_audio(current_content, audio_dir)
                        console.print(f"[green]音频已保存至: {filepath}[/green]")
                    except Exception as e:
                        console.print(f"[red]下载失败: {str(e)}[/red]")
                
                # 原有视频链接处理
                elif any(domain in current_content for domain in ["douyin.com", "kuaishou.com", "bilibili.com"]):
                    handle_video_link(current_content)
                
                last_content = current_content
            time.sleep(0.5)
        except Exception as e:
            console.print(f"[red]发生错误: {str(e)}[/red]")
            time.sleep(5)


def download_video(url, title, downloads_dir):
    """下载视频并显示进度"""
    safe_title = sanitize_filename(title)
    file_path = downloads_dir / f"{safe_title}.mp4"

    # 截取标题用于显示（最多10个字）
    display_title = safe_title[:10] + \
        "..." if len(safe_title) > 10 else safe_title

    console = Console()
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    }

    try:
        response = requests.get(url, headers=headers, stream=True)
        total_size = int(response.headers.get('content-length', 0))

        # 使用多线程下载
        download_with_threads(url, file_path, total_size,
                              display_title, num_threads=5, headers=headers)
    except Exception as e:
        console.print(f"[red]下载失败: {str(e)}[/red]")


def handle_video_link(url):
    """处理视频链接"""
    console = Console()
    downloads_dir = Path("downloads")
    downloads_dir.mkdir(exist_ok=True)

    try:
        browser = init_chrome_driver(headless=True)
        try:
            title, link = parse_video_url_v2ob(browser, url)

            if link and link != "未找到链接":
                console.print(f"[cyan]视频标题: {title}[/cyan]")
                console.print("[yellow]准备开始下载...[yellow]")
                download_video(link, title, downloads_dir)
                console.print("\n[green]处理完成，等待下一个链接...[green]")
            else:
                console.print("[red]未找到可下载的视频链接[red]")
        finally:
            browser.quit()

    except Exception as e:
        console.print(f"[red]处理视频时出错: {str(e)}[red]")


def download_audio(data_uri, save_dir):
    """下载音频文件"""
    console = Console()
    
    try:
        # 解析数据URI
        header, data = data_uri.split(",", 1)
        mime_part = header.split(":")[1].split(";")[0]  # 获取主要MIME类型
    except Exception as e:
        raise ValueError("无效的数据URI格式") from e

    # 强制指定扩展名为.mp3（无论原始MIME类型）
    ext = ".mp3"
    
    # 生成递增文件名（只匹配.mp3文件）
    existing_files = list(save_dir.glob("audio[0-9][0-9].mp3"))
    max_num = max([int(f.stem[5:]) for f in existing_files if f.stem[5:].isdigit()], default=0)
    new_num = max_num + 1
    filename = f"audio{new_num:02d}{ext}"
    filepath = save_dir / filename

    # 解码并保存文件
    with Progress(
        SpinnerColumn(),
        "[progress.description]{task.description}",
        BarColumn(complete_style="cyan"),
        "[progress.percentage]{task.percentage:>3.0f}%",
        console=console,
    ) as progress:
        task = progress.add_task("[cyan]下载音频...", total=len(data))
        
        # 分块解码
        chunk_size = 4096
        audio_data = b""
        for i in range(0, len(data), chunk_size):
            chunk = data[i:i+chunk_size]
            audio_data += base64.b64decode(chunk)
            progress.update(task, advance=len(chunk))
        
        # 写入文件
        with open(filepath, "wb") as f:
            f.write(audio_data)
    
    return filepath


if __name__ == "__main__":
    console = Console()
    try:
        console.print("[cyan]视频下载工具启动中...[/cyan]")
        # 启动剪贴板监听
        monitor_clipboard()
    except KeyboardInterrupt:
        console.print("\n[yellow]正在退出程序...[/yellow]")
    except Exception as e:
        console.print(f"\n[red]程序异常退出: {str(e)}[/red]")
