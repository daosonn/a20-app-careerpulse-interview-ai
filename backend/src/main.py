import subprocess
import time
import sys
import os
from dotenv import load_dotenv

load_dotenv()

def run_services():
    # Cập nhật đường dẫn đến các file service mới
    services = [
        ("Profiler", "src.services.profiler.profiler_service"),
        ("Interviewer", "src.services.interviewer.interviewer_service"),
        ("Evaluator", "src.services.evaluator.evaluator_service"),
        ("Reporter", "src.services.reporter.reporter_service"),
        ("Gateway", "src.services.gateway.gateway_service"),
    ]

    processes = []
    
    print("[INFO] Starting AI Interviewer Modular Microservices...")
    
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    for name, module in services:
        print(f"[*] Starting {name} service as {module}...")
        process = subprocess.Popen([sys.executable, "-m", module], cwd=root_dir)
        processes.append(process)
        time.sleep(1.5) 

    print("\n" + "="*40)
    print("SYSTEM READY")
    print("Gateway: http://127.0.0.1:8000")
    print("="*40)
    print("\nPress Ctrl+C to stop all services.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[STOP] Shutting down services...")
        for p in processes:
            p.terminate()
        print("Goodbye!")

if __name__ == "__main__":
    run_services()
