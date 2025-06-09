@echo off
title Smart Face Recognition Attendance System
echo ========================================
echo  Smart Face Recognition Attendance System
echo ========================================

echo.
echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo.
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo.
echo Starting the attendance system...
python start_system.py

echo.
echo System stopped. Press any key to exit...
pause >nul 