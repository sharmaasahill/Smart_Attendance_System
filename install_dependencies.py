#!/usr/bin/env python3
"""
Install dependencies for the Face Recognition Attendance System
"""

import subprocess
import sys
import os
import platform

def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f"\n{'='*50}")
    print(f"🔧 {description}")
    print(f"Command: {cmd}")
    print(f"{'='*50}")
    
    try:
        result = subprocess.run(cmd, shell=True, check=True, 
                              capture_output=True, text=True)
        if result.stdout:
            print(f"✅ Output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        if e.stdout:
            print(f"STDOUT: {e.stdout}")
        if e.stderr:
            print(f"STDERR: {e.stderr}")
        return False

def install_system_dependencies():
    """Install system dependencies based on platform"""
    system = platform.system().lower()
    
    if system == "linux":
        print("📦 Installing Linux dependencies...")
        run_command("sudo apt-get update", "Updating package list")
        run_command("sudo apt-get install -y cmake libboost-python-dev", "Installing cmake and boost")
    elif system == "darwin":  # macOS
        print("📦 Installing macOS dependencies...")
        run_command("brew install cmake boost-python3", "Installing cmake and boost")
    elif system == "windows":
        print("📦 Installing Windows dependencies...")
        run_command("pip install cmake", "Installing cmake")
    else:
        print(f"⚠️ Unknown system: {system}, skipping system dependencies")

def main():
    print("🚀 Installing Face Recognition Attendance System Dependencies")
    print("=" * 65)
    
    # Install system dependencies
    install_system_dependencies()
    
    # Install Python dependencies
    print("\n📦 Installing Python dependencies...")
    
    if not run_command("pip install -r requirements.txt", "Installing Python requirements"):
        print("❌ Failed to install Python requirements")
        return False
    
    # Test the installation
    print("\n🧪 Testing the installation...")
    test_script = """
import sys
print(f"Python version: {sys.version}")

try:
    import face_recognition
    print("✅ face_recognition library imported successfully!")
except Exception as e:
    print(f"❌ face_recognition import failed: {e}")
    exit(1)

try:
    import dlib
    print(f"✅ dlib version: {dlib.version}")
except Exception as e:
    print(f"❌ dlib import failed: {e}")
    exit(1)

try:
    import cv2
    print(f"✅ OpenCV version: {cv2.__version__}")
except Exception as e:
    print(f"❌ OpenCV import failed: {e}")
    exit(1)

try:
    import numpy as np
    print(f"✅ NumPy version: {np.__version__}")
except Exception as e:
    print(f"❌ NumPy import failed: {e}")
    exit(1)

try:
    import fastapi
    print(f"✅ FastAPI imported successfully!")
except Exception as e:
    print(f"❌ FastAPI import failed: {e}")
    exit(1)

# Test face recognition functionality
try:
    import numpy as np
    # Create a simple test
    test_image = np.zeros((100, 100, 3), dtype=np.uint8)
    face_locations = face_recognition.face_locations(test_image)
    print("✅ Face recognition functionality test passed!")
except Exception as e:
    print(f"⚠️ Face recognition test failed (normal for empty image): {e}")

print("\\n🎉 All critical imports successful!")
"""
    
    with open("test_installation.py", "w") as f:
        f.write(test_script)
    
    if run_command("python test_installation.py", "Testing installation"):
        print("\n🎉 SUCCESS! All dependencies installed correctly!")
        os.remove("test_installation.py")
        return True
    else:
        print("\n❌ Installation test failed. Please check the error messages above.")
        return False

if __name__ == "__main__":
    success = main()
    if success:
        print("\n" + "="*65)
        print("✅ INSTALLATION COMPLETE!")
        print("You can now start the system with:")
        print("python start_system.py")
        print("="*65)
    else:
        print("\n" + "="*65)
        print("❌ INSTALLATION FAILED!")
        print("Please check the error messages above and try again.")
        print("\nFor manual installation:")
        print("1. Install cmake: pip install cmake")
        print("2. Install dlib: pip install dlib")
        print("3. Install face_recognition: pip install face-recognition")
        print("4. Install other requirements: pip install -r requirements.txt")
        print("="*65) 