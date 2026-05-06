import logging
import sys
from datetime import datetime

def log_func(func_name: str, level: int = 1):
    """
    In ra log chuẩn uvicorn cho mỗi lần gọi hàm.
    Level 1: Log bình thường.
    Level 2: Thụt lề 4 spaces.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    indent = "    " * (level - 1)
    # Giả lập format của uvicorn
    print(f"INFO:     {now} - {indent}[CALL] {func_name}")
