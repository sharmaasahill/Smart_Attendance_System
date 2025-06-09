# 🎯 Smart Face Recognition Attendance System

A modern, AI-powered attendance tracking system built with React frontend and FastAPI backend, featuring advanced face recognition using DeepFace technology.

## ✨ Features

### 🚀 Core Features
- **Advanced Face Recognition**: Uses face_recognition library with dlib for accurate face detection and recognition
- **Real-time Attendance**: Instant attendance marking through webcam face recognition
- **User Registration**: Email-based registration with automatic face data capture
- **Admin Dashboard**: Comprehensive user management and attendance analytics
- **Auto-Absent Marking**: Automatically marks users as absent at end of day
- **Modern UI**: Beautiful, responsive React interface with Material-UI components

### 🛡️ Security & Privacy
- **Local Storage**: All data stored locally using SQLite database
- **JWT Authentication**: Secure token-based authentication
- **Password Encryption**: Bcrypt password hashing
- **Face Data Privacy**: Face encodings stored locally, not in cloud

### 📊 Analytics & Reports
- **Daily Attendance Tracking**: View present/absent status for any date
- **User Management**: Add, view, and delete users
- **Attendance Statistics**: Real-time dashboard with attendance metrics
- **Search & Filter**: Find users and attendance records quickly

## 🏗️ Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **face_recognition**: Advanced face recognition library with dlib
- **SQLAlchemy**: Database ORM
- **SQLite**: Local database storage
- **OpenCV**: Computer vision processing
- **JWT**: Authentication tokens

### Frontend
- **React 18**: Modern frontend framework
- **Material-UI**: Professional UI components
- **React Webcam**: Camera integration
- **Axios**: HTTP client
- **React Router**: Navigation
- **React Toastify**: Notifications

## 📋 Prerequisites

Before running the system, ensure you have:

1. **Python 3.8+** installed
2. **Node.js 16+** and **npm** installed
3. **Webcam** connected to your computer
4. **Good lighting** for face recognition

## 🚀 Quick Start

### Option 1: Automatic Setup (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd Attendance_System

# Run the startup script (installs dependencies and starts both servers)
python start_system.py
```

**For Windows users**, you can also double-click: `start_windows.bat`

### Option 2: If Automatic Setup Fails

```bash
# Run the manual setup script first
python setup_manual.py

# Then start the system
python start_system.py
```

### Option 3: Manual Setup

#### Step 1: Install Python Dependencies
```bash
pip install -r requirements.txt
```

#### Step 2: Install Node.js
- Download from https://nodejs.org/
- Install the LTS version
- Restart your terminal

#### Step 3: Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

#### Step 4: Start Backend
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Step 5: Start Frontend (in new terminal)
```bash
cd frontend
npm start
```

## 🌐 Access Points

After starting the system:

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📱 Usage Guide

### 1. User Registration Flow

1. **Navigate to Homepage**: Visit http://localhost:3000
2. **Click "Get Started"**: Select user registration option
3. **Fill Registration Form**:
   - Full Name (required)
   - Email Address (required)
   - Password (required, min 6 characters)
   - Phone Number (optional)
   - Department (optional)
4. **Face Capture Process**:
   - System redirects to face capture page
   - Position face in camera frame
   - Click "Start Face Capture"
   - System automatically captures 20 face images
   - Click "Complete Registration"
5. **Registration Complete**: User is now registered and can mark attendance

### 2. Mark Attendance Flow

1. **Go to Attendance Page**: Click "Mark Attendance" from homepage
2. **Position Face**: Ensure your face is clearly visible in camera
3. **Click "Mark My Attendance"**: System will recognize your face
4. **Confirmation**: Receive success message with attendance details

**Note**: Each user can only mark attendance once per day.

### 3. Admin Dashboard

1. **Login**: Use your registered credentials
2. **Access Dashboard**: Click "Dashboard" in navigation
3. **View Analytics**:
   - Total registered users
   - Today's present/absent count
   - Face registration status
4. **Manage Users**:
   - View all registered users
   - Delete users if needed
   - Search users by name/email/ID
5. **Attendance Records**:
   - View daily attendance
   - Filter by date
   - Mark absent users

### 4. Auto-Absent Feature

The system includes automatic absent marking:
- Runs at end of day or first run of next day
- Marks all users who didn't attend as "absent"
- Can be triggered manually from admin dashboard

## 🔧 Configuration

### Camera Settings
- Default resolution: 1280x720
- Format: JPEG
- Facing mode: User (front camera)

### Face Recognition Settings
- Model: HOG (fast) or CNN (accurate)
- Backend: dlib with face_recognition library
- Distance metric: Euclidean distance
- Recognition tolerance: 0.6
- Required training images: 5 (reduced for easier setup)

### Database
- Type: SQLite
- File: `attendance_system.db`
- Location: Backend root directory

## 🎯 Key Features Explained

### Advanced Face Recognition
- Uses dlib's state-of-the-art face recognition algorithms
- Requires only 5 training images per user for high accuracy
- Calculates face encodings and stores averaged representation
- Real-time face detection and recognition with HOG or CNN models

### Automated Attendance
- One-click attendance marking
- Prevents duplicate entries (one per day per user)
- Instant face recognition with feedback
- Automatic timestamp recording

### Security Features
- JWT token authentication
- Password hashing with bcrypt
- Local data storage (no cloud dependencies)
- Secure API endpoints

### Modern UI/UX
- Responsive design works on desktop and mobile
- Material Design components
- Real-time webcam preview
- Progress indicators and animations
- Toast notifications for user feedback

## 🐛 Troubleshooting

### Common Issues

**"sqlite3" package error**:
- This is fixed in the latest version (sqlite3 is built into Python)
- Run: `python setup_manual.py` for step-by-step installation

**"No module named 'face_recognition'" error**:
- Run: `pip install face-recognition dlib opencv-python`
- Or use: `python setup_manual.py` for automatic installation

**dlib installation issues**:
- On Windows: `pip install cmake` first, then `pip install dlib`
- On Linux: `sudo apt-get install cmake libboost-python-dev`
- On macOS: `brew install cmake boost-python3`


**Node.js/npm not found**:
- Install Node.js from: https://nodejs.org/
- Download the LTS (Long Term Support) version
- Restart your terminal after installation
- Verify with: `node --version` and `npm --version`

**Camera Not Working**:
- Ensure webcam is connected and permissions granted
- Check if other applications are using the camera
- Try refreshing the page

**Face Recognition Fails**:
- Ensure good lighting conditions
- Remove sunglasses or face coverings
- Position face clearly in camera frame
- Check if user has completed face registration

**Backend Connection Error**:
- Verify backend is running on port 8000
- Check if Python dependencies are installed
- Ensure no firewall blocking the connection

**Frontend Not Loading**:
- Verify Node.js and npm are installed
- Check if frontend dependencies are installed (`npm install`)
- Ensure port 3000 is not occupied by another service

**Pydantic/FastAPI version conflicts**:
- Run: `pip install --upgrade pydantic fastapi`
- Or use the manual setup script for clean installation

### Performance Tips

- **Face Recognition**: Ensure good lighting for better accuracy
- **Training Data**: Capture face images from different angles during registration
- **Camera Quality**: Use higher resolution webcam for better results
- **System Resources**: Close unnecessary applications for smoother performance

## 📁 Project Structure

```
Attendance_System/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── models.py            # Database models
│   ├── schemas.py           # Pydantic schemas
│   ├── database.py          # Database configuration
│   ├── auth.py              # Authentication utilities
│   └── face_recognition_service.py  # Face recognition logic
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API services
│   │   ├── App.js          # Main application
│   │   └── index.js        # Entry point
│   ├── public/             # Static files
│   └── package.json        # Dependencies
├── dataset/                # Face training data (created automatically)
├── uploads/                # Temporary image uploads (created automatically)
├── requirements.txt        # Python dependencies
├── start_system.py        # Startup script
└── README.md              # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **face_recognition & dlib**: For reliable face recognition capabilities
- **Material-UI**: For beautiful React components
- **FastAPI**: For modern Python web framework
- **OpenCV**: For computer vision processing

---

## 🔮 Future Enhancements

- **Mobile App**: React Native mobile application
- **Cloud Integration**: Optional cloud storage and backup
- **Advanced Analytics**: Detailed reporting and insights
- **Multi-location Support**: Support for multiple office locations
- **Integration APIs**: Connect with existing HR systems
- **Facial Mask Detection**: Recognize faces even with masks
- **Temperature Screening**: Optional integration with thermal cameras

---

**Happy Attendance Tracking! 🎉** 