#!/usr/bin/env python3
"""
Manual Setup Script for Smart Face Recognition Attendance System
Use this if the automatic startup script doesn't work
"""

import subprocess
import sys
import os
from pathlib import Path

def step1_install_python_deps():
    """Step 1: Install Python dependencies"""
    print("📦 Step 1: Installing Python dependencies...")
    
    try:
        # Install basic requirements first
        basic_deps = [
            "fastapi==0.104.1",
            "uvicorn==0.24.0", 
            "sqlalchemy==2.0.23",
            "pydantic==2.5.0",
            "python-multipart==0.0.6",
            "python-jose[cryptography]==3.3.0",
            "passlib[bcrypt]==1.7.4",
            "bcrypt==4.1.2",
            "email-validator==2.1.0"
        ]
        
        print("   Installing basic FastAPI dependencies...")
        for dep in basic_deps:
            subprocess.run([sys.executable, "-m", "pip", "install", dep], check=True)
        
        print("✅ Basic dependencies installed")
        
        # Install AI dependencies separately (these might take longer)
        ai_deps = [
            "opencv-python==4.8.1.78",
            "numpy==1.24.3", 
            "pillow==10.1.0",
            "pandas==2.1.4"
        ]
        
        print("   Installing OpenCV and image processing...")
        for dep in ai_deps:
            subprocess.run([sys.executable, "-m", "pip", "install", dep], check=True)
            
        print("✅ Image processing dependencies installed")
        
        # Install DeepFace (this might take the longest)
        print("   Installing DeepFace (this may take several minutes)...")
        subprocess.run([sys.executable, "-m", "pip", "install", "deepface==0.0.79"], check=True)
        
        print("✅ DeepFace installed")
        
        # Install remaining dependencies
        other_deps = [
            "tensorflow==2.15.0",
            "python-dateutil==2.8.2",
            "schedule==1.2.0"
        ]
        
        print("   Installing remaining dependencies...")
        for dep in other_deps:
            subprocess.run([sys.executable, "-m", "pip", "install", dep], check=True)
            
        print("✅ All Python dependencies installed successfully!")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependency: {e}")
        print("🔧 You can try installing manually with:")
        print("   pip install -r requirements.txt")
        return False

def step2_check_nodejs():
    """Step 2: Check Node.js installation"""
    print("\n📦 Step 2: Checking Node.js...")
    
    try:
        node_result = subprocess.run(["node", "--version"], check=True, capture_output=True, text=True)
        npm_result = subprocess.run(["npm", "--version"], check=True, capture_output=True, text=True)
        
        print(f"✅ Node.js: {node_result.stdout.strip()}")
        print(f"✅ npm: {npm_result.stdout.strip()}")
        return True
        
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Node.js not found!")
        print("\n📥 Please install Node.js:")
        print("   1. Go to https://nodejs.org/")
        print("   2. Download LTS version")
        print("   3. Run installer")
        print("   4. Restart terminal and run this script again")
        return False

def step3_install_frontend():
    """Step 3: Install frontend dependencies"""
    print("\n📦 Step 3: Installing frontend dependencies...")
    
    frontend_path = Path("frontend")
    if not frontend_path.exists():
        print("❌ Frontend directory not found")
        return False
    
    original_dir = os.getcwd()
    
    try:
        os.chdir(frontend_path)
        print("   Running npm install (this may take 5-10 minutes)...")
        subprocess.run(["npm", "install"], check=True)
        print("✅ Frontend dependencies installed!")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install frontend dependencies: {e}")
        return False
    finally:
        os.chdir(original_dir)

def step4_test_backend():
    """Step 4: Test backend startup"""
    print("\n🧪 Step 4: Testing backend...")
    
    backend_path = Path("backend")
    original_dir = os.getcwd()
    
    try:
        if backend_path.exists():
            os.chdir(backend_path)
        
        print("   Testing FastAPI import...")
        result = subprocess.run([
            sys.executable, "-c", 
            "import fastapi, uvicorn; print('✅ Backend dependencies OK')"
        ], check=True, capture_output=True, text=True)
        
        print(result.stdout.strip())
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Backend test failed: {e}")
        return False
    finally:
        os.chdir(original_dir)

def main():
    """Run manual setup"""
    print("🔧 Manual Setup for Smart Face Recognition Attendance System")
    print("=" * 60)
    
    # Step 1: Python dependencies
    if not step1_install_python_deps():
        print("\n❌ Step 1 failed. Please fix Python dependency issues.")
        input("Press Enter to exit...")
        return
    
    # Step 2: Node.js check
    if not step2_check_nodejs():
        print("\n❌ Step 2 failed. Please install Node.js and run again.")
        input("Press Enter to exit...")
        return
    
    # Step 3: Frontend dependencies
    if not step3_install_frontend():
        print("\n❌ Step 3 failed. Please check frontend setup.")
        input("Press Enter to exit...")
        return
    
    # Step 4: Test backend
    if not step4_test_backend():
        print("\n❌ Step 4 failed. Please check backend setup.")
        input("Press Enter to exit...")
        return
    
    print("\n🎉 Setup completed successfully!")
    print("=" * 60)
    print("Now you can start the system with:")
    print("   python start_system.py")
    print("\nOr start manually:")
    print("   Backend:  cd backend && python -m uvicorn main:app --reload")
    print("   Frontend: cd frontend && npm start")
    
    input("\nPress Enter to exit...")

if __name__ == "__main__":
    main() 