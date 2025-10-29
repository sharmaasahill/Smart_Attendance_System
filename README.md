# Smart Attendance System

A web-based attendance management system using face recognition technology built with FastAPI and React.

[![Python](https://img.shields.io/badge/Python-3.8+-3776ab?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![React](https://img.shields.io/badge/React-18.0+-61dafb?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3.0+-003b57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org/)

## Features

### Authentication & User Management
- JWT-based authentication
- User registration and login
- Role-based access control (Admin and User roles)
- Password hashing with bcrypt
- User profile management

### Face Recognition
- Face registration with multiple image captures
- Face recognition for attendance marking
- Uses face_recognition library (dlib-based)
- Stores face encodings locally using pickle format

### Attendance Management
- Face recognition-based attendance marking
- Manual attendance management (Admin)
- Attendance history tracking
- Daily attendance status (Present/Absent)
- Time-in recording

### Dashboards
- **Admin Dashboard**: User management, attendance overview, manual attendance updates
- **Employee Dashboard**: Personal attendance history and statistics
- **Analytics Dashboard**: Attendance trends, department performance, export functionality

### Reporting
- Export attendance data to PDF, Excel, CSV, JSON formats
- Attendance statistics and analytics
- Department-wise analytics

## Technology Stack

### Backend
- **FastAPI** - Python web framework
- **SQLite** - Database with SQLAlchemy ORM
- **face_recognition** - Face recognition library (dlib-based)
- **OpenCV** - Image processing
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing

### Frontend
- **React 18** - UI framework
- **Material-UI (MUI)** - Component library
- **React Router** - Routing
- **Recharts** - Data visualization
- **React Webcam** - Camera access

## Installation

### Prerequisites
- Python 3.8 or higher
- Node.js 16 or higher
- Webcam for face recognition

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`
API documentation available at `http://localhost:8000/docs`

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will be available at `http://localhost:3000`

## Usage

### Initial Setup
1. Start both backend and frontend servers
2. Register a new user account
3. For the first user, run the migration script to assign admin role:
   ```bash
   cd backend
   python migrate_add_role.py
   ```

### User Registration
1. Register with email and password
2. Login to your account
3. Navigate to Face Registration
4. Capture 5-6 face images for enrollment
5. Once registered, you can mark attendance using face recognition

### Marking Attendance
1. Navigate to "Mark Attendance" page
2. Click "Mark Attendance" button
3. Position your face in front of the camera
4. System will recognize your face and mark attendance

### Admin Functions
- View all users and their attendance records
- Manually mark attendance for users
- View analytics and export reports
- Update user information

## Project Structure

```
Smart_Attendance_System/
├── backend/
│   ├── main.py                      # FastAPI application
│   ├── models.py                   # Database models
│   ├── schemas.py                  # Pydantic schemas
│   ├── database.py                 # Database configuration
│   ├── auth.py                     # Authentication utilities
│   ├── face_recognition_service.py # Face recognition logic
│   ├── migrate_add_role.py         # Role migration script
│   ├── requirements.txt            # Python dependencies
│   ├── dataset/                    # Face encoding storage (gitignored)
│   └── uploads/                    # Temporary uploads (gitignored)
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/             # React components
│   │   ├── services/               # API services
│   │   ├── App.js                  # Main app component
│   │   └── index.js                # Entry point
│   └── package.json
│
├── requirements.txt                # Root requirements (for scripts)
├── README.md
└── .gitignore
```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login

### Face Recognition
- `POST /face/register` - Register face data
- `POST /attendance/mark` - Mark attendance via face recognition

### User
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile
- `PUT /user/password` - Change password
- `GET /user/attendance` - Get attendance history
- `GET /user/attendance/stats` - Get attendance statistics

### Admin
- `GET /admin/users` - Get all users
- `GET /admin/attendance` - Get all attendance records
- `PUT /admin/attendance/{id}` - Update attendance record
- `POST /admin/mark-absent` - Mark users as absent
- `POST /admin/attendance/bulk-update` - Bulk update attendance

### Analytics
- `GET /analytics/dashboard` - Get dashboard analytics
- `GET /analytics/anomalies` - Get anomaly detection data
- `GET /analytics/report` - Get report data

Full API documentation available at `/docs` when backend is running.

## Configuration

### Backend Environment Variables
Create a `.env` file in the backend directory (optional):

```env
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend Environment Variables
Create a `.env` file in the frontend directory (optional):

```env
REACT_APP_API_URL=http://localhost:8000
```

## Database

The system uses SQLite database which is automatically created on first run. Database file: `backend/attendance_system.db`

To reset the database, delete the `.db` file and restart the backend server.

## Troubleshooting

### Face Recognition Issues
- Ensure good lighting conditions
- Clear camera lens
- Register with 5-6 clear face images
- Face should be clearly visible in frame

### Camera Access
- Allow camera permissions in browser
- Use HTTPS in production (required for camera access)
- Ensure no other application is using the camera

### Installation Issues
- Ensure Python 3.8+ and Node.js 16+ are installed
- Use virtual environment for Python dependencies
- If face_recognition installation fails, install cmake and dlib dependencies first

## License

This project is licensed under the MIT License.
