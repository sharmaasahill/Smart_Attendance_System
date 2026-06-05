# Smart Attendance System

A production-grade web-based attendance management system using advanced face recognition technology.

[![Python](https://img.shields.io/badge/Python-3.8+-3776ab?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![React](https://img.shields.io/badge/React-18.0+-61dafb?style=flat-square&logo=react&logoColor=white)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

## Features

### Core Functionality
- JWT-based authentication with role-based access control
- Advanced face recognition using dlib and OpenCV
- Real-time attendance marking via facial recognition
- User and admin dashboards with analytics
- Attendance history tracking and reporting
- Data export in PDF, Excel, CSV, and JSON formats

### Advanced Face Recognition
- **Face Quality Assessment** - ISO/IEC 19794-5 compliant quality checks (size, brightness, sharpness, pose, eye visibility)
- **Liveness Detection** - Anti-spoofing protection against photo and screen attacks using texture, color, and frequency analysis
- **Duplicate Prevention** - Prevents same person from registering multiple accounts
- **Quality Scoring** - Real-time feedback with detailed quality metrics
- **Face Gallery** - View registered face images with quality scores

## Technology Stack

**Backend:** FastAPI, SQLite, SQLAlchemy, face_recognition, OpenCV, NumPy, SciPy  
**Frontend:** React 18, Material-UI, Axios, Recharts, React Webcam  
**Authentication:** JWT tokens with bcrypt password hashing

## Prerequisites

- Python 3.8+
- Node.js 16+
- Webcam
- CMake (for dlib installation)

## Installation

### Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --reload --host localhost --port 8000
```

Backend runs at `http://localhost:8000`  
API docs available at `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`

## Quick Start

1. Start backend and frontend servers
2. Register a new account at `http://localhost:3000`
3. Set admin role: `python backend/migrate_add_role.py`
4. Login and navigate to face registration
5. Capture 5-6 face images for enrollment
6. Mark attendance using face recognition

## Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
ADMIN_EMAIL=admin@example.com
```

### Frontend Environment Variables

Create `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:8000
```

### Face Recognition Settings

Edit `backend/face_recognition_service.py`:

```python
MIN_FACE_SIZE = 50              # Minimum face width (pixels)
MIN_OVERALL_SCORE = 30          # Minimum quality score (%)
MIN_LIVENESS_CONFIDENCE = 20    # Minimum liveness confidence (%)
tolerance = 0.6                  # Face matching tolerance
```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login

### Face Recognition
- `POST /face/register` - Register face with quality and liveness checks
- `POST /face/check-quality` - Check face image quality
- `POST /face/check-liveness` - Check image liveness

### Attendance
- `POST /attendance/mark` - Mark attendance via face recognition
- `GET /user/attendance` - Get attendance history
- `GET /user/attendance/stats` - Get attendance statistics

### User Management
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile
- `POST /user/change-password` - Change password
- `GET /user/face/images` - Get registered face images with quality scores

### Admin Operations
- `GET /admin/users` - Get all users
- `GET /admin/attendance` - Get all attendance records
- `PUT /admin/attendance/{id}` - Update attendance record
- `POST /admin/mark-absent` - Mark users as absent
- `DELETE /admin/user/{user_id}/face` - Delete user face data

Full API documentation: Visit `/docs` when backend is running

## Project Structure

```
Smart_Attendance_System/
├── backend/
│   ├── main.py                       # FastAPI application
│   ├── models.py                     # Database models
│   ├── auth.py                       # Authentication
│   ├── face_recognition_service.py   # Face recognition
│   ├── face_quality_checker.py       # Quality assessment
│   ├── liveness_detector.py          # Anti-spoofing
│   ├── requirements.txt              # Dependencies
│   └── dataset/                      # Face encodings (gitignored)
│
├── frontend/
│   ├── src/
│   │   ├── components/               # React components
│   │   └── services/api.js           # API integration
│   └── package.json
│
└── README.md
```

## Database Schema

**Users Table**
- id, email, password (hashed), full_name, unique_id
- phone_number, department, role, is_active
- face_registered, face_encoding_path, created_at

**Attendance Table**
- id, user_id (FK), date, time_in, status, created_at

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- SQL injection protection via SQLAlchemy ORM
- Face data isolation in user-specific folders
- Liveness detection for anti-spoofing
- Duplicate face prevention

**Installation Issues:**
```bash
# dlib installation on Windows
pip install cmake
pip install dlib

# face_recognition installation
pip install face-recognition --no-cache-dir
```

**Camera Access:**
- Allow camera permissions in browser
- HTTPS required for production
- Ensure no other app is using camera

**Database Reset:**
```bash
cd backend
rm attendance_system.db
# Restart backend - will create new DB
```

## Production Deployment

### Backend
```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

### Frontend
```bash
npm run build
# Serve build/ folder with nginx or any static server
```

## License

MIT License

## Authors

Sahil Kumar Sharma

---
