#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的上传测试脚本
"""

import requests
import json

def test_upload():
    """测试上传功能"""
    file_path = "test_books.json"
    
    try:
        print("开始测试上传...")
        
        with open(file_path, 'rb') as f:
            files = {'file': (file_path, f, 'application/json')}
            
            print("发送请求...")
            response = requests.post(
                'http://static.sy.yesui.me:7747/shuyuan',
                files=files,
                timeout=30
            )
        
        print(f"状态码: {response.status_code}")
        print(f"响应内容: {response.text}")
        
        if response.status_code == 200:
            result = response.text.strip()
            try:
                # 尝试解析JSON
                data = json.loads(result)
                if 'data' in data:
                    file_name = data['data']
                    download_url = f"http://sy.yesui.me:7747/shuyuan/{file_name}"
                    print(f"✅ 上传成功！")
                    print(f"🔗 直链: {download_url}")
                else:
                    print(f"✅ 上传成功！")
                    print(f"🔗 直链: http://sy.yesui.me:7747/shuyuan/{result}")
            except json.JSONDecodeError:
                print(f"✅ 上传成功！")
                print(f"🔗 直链: http://sy.yesui.me:7747/shuyuan/{result}")
        else:
            print(f"❌ 上传失败: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 错误: {e}")

if __name__ == "__main__":
    test_upload() 