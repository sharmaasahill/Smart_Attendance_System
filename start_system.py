#!/usr/bin/env python3
"""
Smart Face Recognition Attendance System Startup Script
This script starts both the backend API server and frontend React application
"""

import subprocess
import sys
import os
import time
import platform
from pathlib import Path

def check_python_dependencies():
    """Check if required Python dependencies are installed"""
    print("[INFO] Checking Python dependencies...")
    
    try:
        import fastapi
        import uvicorn
        print("[SUCCESS] Core Python dependencies found")
    except ImportError as e:
        print(f"[ERROR] Missing Python dependency: {e}")
        print("[INFO] Installing Python dependencies...")
        
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
            print("[SUCCESS] Python dependencies installed successfully")
        except subprocess.CalledProcessError as e:
            print(f"[ERROR] Failed to install Python dependencies: {e}")
            print("[INFO] Try running: pip install -r requirements.txt")
            return False
    
    # Check optional AI dependencies
    try:
        import deepface
        import cv2
        print("[SUCCESS] AI dependencies (DeepFace, OpenCV) found")
    except ImportError as e:
        print(f"[WARNING] Installing AI dependencies...")
        try:
            # For conda environments, use conda-forge for better compatibility
            if 'conda' in sys.executable.lower() or 'anaconda' in sys.executable.lower():
                print("   Detected conda environment, using conda-forge...")
                subprocess.run(["conda", "install", "-c", "conda-forge", "opencv", "numpy", "-y"], check=True)
                subprocess.run([sys.executable, "-m", "pip", "install", "deepface"], check=True)
            else:
                subprocess.run([sys.executable, "-m", "pip", "install", "deepface", "opencv-python"], check=True)
            print("[SUCCESS] AI dependencies installed")
        except subprocess.CalledProcessError:
            print("[ERROR] Failed to install AI dependencies.")
            print("[INFO] Try manually: conda install -c conda-forge opencv numpy")
            print("[INFO] Then: pip install deepface")
            return False
    
    return True

def check_nodejs():
    """Check if Node.js and npm are installed"""
    print("[INFO] Checking Node.js and npm...")
    
    node_found = False
    npm_found = False
    
    try:
        # Check Node.js
        node_result = subprocess.run(["node", "--version"], check=True, capture_output=True, text=True)
        node_version = node_result.stdout.strip()
        print(f"[SUCCESS] Node.js found: {node_version}")
        node_found = True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("[ERROR] Node.js not found!")
    
    try:
        # Check npm
        npm_result = subprocess.run(["npm", "--version"], check=True, capture_output=True, text=True)
        npm_version = npm_result.stdout.strip()
        print(f"[SUCCESS] npm found: {npm_version}")
        npm_found = True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("[ERROR] npm not found!")
    
    if not node_found or not npm_found:
        print("\n[INFO] Please install Node.js from: https://nodejs.org/")
        print("   - Download the LTS version")
        print("   - Run the installer")
        print("   - Restart your terminal/command prompt")
        print("   - Run this script again")
        
        # Try to open Node.js website
        try:
            import webbrowser
            print("\n[INFO] Opening Node.js download page...")
            webbrowser.open("https://nodejs.org/")
        except:
            pass
        
        return False
    
    return True

def install_frontend_dependencies():
    """Install frontend dependencies"""
    frontend_path = Path("frontend")
    if not frontend_path.exists():
        print("[ERROR] Frontend directory not found")
        return False
    
    original_dir = os.getcwd()
    
    try:
        os.chdir(frontend_path)
        
        if not Path("node_modules").exists():
            print("[INFO] Installing frontend dependencies (this may take a few minutes)...")
            try:
                subprocess.run(["npm", "install"], check=True)
                print("[SUCCESS] Frontend dependencies installed")
            except subprocess.CalledProcessError as e:
                print(f"[ERROR] Failed to install frontend dependencies: {e}")
                return False
        else:
            print("[SUCCESS] Frontend dependencies already installed")
        
        return True
        
    finally:
        os.chdir(original_dir)

def start_backend():
    """Start the FastAPI backend server"""
    print("[INFO] Starting backend server...")
    
    # Change to backend directory
    backend_path = Path("backend")
    original_dir = os.getcwd()
    
    try:
        if backend_path.exists():
            os.chdir(backend_path)
        
        # Start the backend server
        if platform.system() == "Windows":
            # Windows
            process = subprocess.Popen([
                sys.executable, "-m", "uvicorn", "main:app", 
                "--host", "0.0.0.0", "--port", "8000", "--reload"
            ], shell=True)
        else:
            # Unix/Linux/Mac
            process = subprocess.Popen([
                sys.executable, "-m", "uvicorn", "main:app", 
                "--host", "0.0.0.0", "--port", "8000", "--reload"
            ])
        
        print("[SUCCESS] Backend server starting on http://localhost:8000")
        return process
        
    except Exception as e:
        print(f"[ERROR] Failed to start backend: {e}")
        return None
    finally:
        os.chdir(original_dir)

def start_frontend():
    """Start the React frontend development server"""
    print("[INFO] Starting frontend server...")
    
    frontend_path = Path("frontend")
    if not frontend_path.exists():
        print("[ERROR] Frontend directory not found")
        return None
    
    original_dir = os.getcwd()
    
    try:
        os.chdir(frontend_path)
        
        if platform.system() == "Windows":
            # Windows
            process = subprocess.Popen(["npm", "start"], shell=True)
        else:
            # Unix/Linux/Mac
            process = subprocess.Popen(["npm", "start"])
        
        print("[SUCCESS] Frontend server starting on http://localhost:3000")
        return process
        
    except Exception as e:
        print(f"[ERROR] Failed to start frontend: {e}")
        return None
    finally:
        os.chdir(original_dir)

def main():
    """Main function to start the entire system"""
    print("Smart Face Recognition Attendance System")
    print("=" * 50)
    
    # Check Python dependencies
    if not check_python_dependencies():
        print("\n[ERROR] Python dependency check failed. Please fix the issues above.")
        input("Press Enter to exit...")
        sys.exit(1)
    
    # Check Node.js
    if not check_nodejs():
        print("\n[ERROR] Node.js check failed. Please install Node.js and try again.")
        input("Press Enter to exit...")
        sys.exit(1)
    
    # Install frontend dependencies
    if not install_frontend_dependencies():
        print("\n[ERROR] Frontend setup failed. Please check the errors above.")
        input("Press Enter to exit...")
        sys.exit(1)
    
    # Start backend
    backend_process = start_backend()
    if not backend_process:
        print("[ERROR] Failed to start backend server")
        input("Press Enter to exit...")
        sys.exit(1)
    
    # Wait a moment for backend to start
    print("[INFO] Waiting for backend to initialize...")
    time.sleep(5)
    
    # Start frontend
    frontend_process = start_frontend()
    if not frontend_process:
        print("[ERROR] Failed to start frontend server")
        backend_process.terminate()
        input("Press Enter to exit...")
        sys.exit(1)
    
    # Wait for frontend to start
    print("[INFO] Waiting for frontend to initialize...")
    time.sleep(8)
    
    print("\n[SUCCESS] System started successfully!")
    print("=" * 50)
    print("Frontend: http://localhost:3000")
    print("Backend API: http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("\n[INFO] Watch the console for any errors...")
    print("[INFO] Press Ctrl+C to stop the system")
    
    # Try to open browser
    try:
        import webbrowser
        time.sleep(2)
        print("\n[INFO] Opening browser...")
        webbrowser.open("http://localhost:3000")
    except:
        pass
    
    try:
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n[INFO] Stopping system...")
        try:
            backend_process.terminate()
            frontend_process.terminate()
        except:
            pass
        print("[SUCCESS] System stopped")

if __name__ == "__main__":
    main()
