from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import uvicorn
import os
from datetime import datetime, timedelta
import json

from database import get_db, init_db
from models import User, Attendance
from schemas import UserCreate, UserResponse, LoginRequest, AttendanceResponse
from auth import create_access_token, verify_token, get_password_hash, verify_password
from face_recognition_service import FaceRecognitionService

app = FastAPI(title="Smart Face Recognition Attendance System", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
face_service = FaceRecognitionService()

@app.on_event("startup")
async def startup_event():
    init_db()
    # Create uploads and dataset directories
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("dataset", exist_ok=True)

@app.get("/")
async def root():
    return {"message": "Smart Face Recognition Attendance System API"}

@app.post("/auth/register")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    unique_id = f"USR{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    db_user = User(
        email=user_data.email,
        password=hashed_password,
        full_name=user_data.full_name,
        unique_id=unique_id,
        phone_number=user_data.phone_number,
        department=user_data.department,
        is_active=True
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Generate access token
    access_token = create_access_token(data={"sub": db_user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(db_user)
    }

@app.post("/auth/login")
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(user)
    }

@app.post("/face/register")
async def register_face(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    # Verify token and get user
    email = verify_token(credentials.credentials)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if len(files) < 5:
        raise HTTPException(status_code=400, detail="At least 5 face images required")
    
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 face images allowed")
    
    try:
        # Save uploaded images and train face recognition
        image_paths = []
        user_dir = f"dataset/{user.unique_id}"
        os.makedirs(user_dir, exist_ok=True)
        
        for i, file in enumerate(files):
            file_path = f"{user_dir}/face_{i+1}.jpg"
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            image_paths.append(file_path)
        
        # Train face recognition model
        face_encoding = face_service.train_user_face(user.unique_id, image_paths)
        
        # Update user with face registration status
        user.face_registered = True
        user.face_encoding_path = f"{user_dir}/encoding.json"
        db.commit()
        
        return {"message": "Face registration successful", "user_id": user.unique_id}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face registration failed: {str(e)}")

@app.post("/attendance/mark")
async def mark_attendance(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        # Save uploaded image temporarily
        temp_path = f"uploads/temp_{datetime.now().strftime('%Y%m%d%H%M%S')}.jpg"
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Recognize face
        recognized_user_id = face_service.recognize_face(temp_path)
        
        # Clean up temp file
        os.remove(temp_path)
        
        if not recognized_user_id:
            raise HTTPException(status_code=404, detail="Face not recognized. Please register first.")
        
        # Get user
        user = db.query(User).filter(User.unique_id == recognized_user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if attendance already marked today
        today = datetime.now().date()
        existing_attendance = db.query(Attendance).filter(
            Attendance.user_id == user.id,
            Attendance.date == today
        ).first()
        
        if existing_attendance:
            raise HTTPException(status_code=400, detail="Attendance already marked for today")
        
        # Mark attendance
        attendance = Attendance(
            user_id=user.id,
            date=today,
            time_in=datetime.now().time(),
            status="present"
        )
        
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        
        return {
            "message": f"Attendance marked successfully for {user.full_name}",
            "user": UserResponse.from_orm(user),
            "attendance": AttendanceResponse.from_orm(attendance)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Attendance marking failed: {str(e)}")

@app.get("/admin/users")
async def get_all_users(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    # For now, any authenticated user can access admin features
    # In production, you'd check for admin role
    verify_token(credentials.credentials)
    
    users = db.query(User).all()
    return [UserResponse.from_orm(user) for user in users]

@app.get("/admin/attendance")
async def get_attendance_records(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    date: str = None,
    user_id: str = None,
    db: Session = Depends(get_db)
):
    verify_token(credentials.credentials)
    
    query = db.query(Attendance).join(User)
    
    if date:
        query = query.filter(Attendance.date == datetime.strptime(date, "%Y-%m-%d").date())
    
    if user_id:
        user = db.query(User).filter(User.unique_id == user_id).first()
        if user:
            query = query.filter(Attendance.user_id == user.id)
    
    records = query.all()
    
    result = []
    for record in records:
        user = db.query(User).filter(User.id == record.user_id).first()
        result.append({
            "id": record.id,
            "user": UserResponse.from_orm(user),
            "date": record.date.isoformat(),
            "time_in": record.time_in.isoformat() if record.time_in else None,
            "status": record.status,
            "created_at": record.created_at.isoformat()
        })
    
    return result

@app.post("/admin/mark-absent")
async def mark_absent_users(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    verify_token(credentials.credentials)
    
    today = datetime.now().date()
    
    # Get all users
    all_users = db.query(User).filter(User.is_active == True).all()
    
    # Get users who already have attendance today
    attended_user_ids = db.query(Attendance.user_id).filter(Attendance.date == today).all()
    attended_user_ids = [uid[0] for uid in attended_user_ids]
    
    # Mark absent users
    absent_count = 0
    for user in all_users:
        if user.id not in attended_user_ids:
            attendance = Attendance(
                user_id=user.id,
                date=today,
                status="absent"
            )
            db.add(attendance)
            absent_count += 1
    
    db.commit()
    
    return {"message": f"Marked {absent_count} users as absent for {today}"}

@app.delete("/admin/user/{user_id}")
async def delete_user(
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    verify_token(credentials.credentials)
    
    user = db.query(User).filter(User.unique_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete user's face data
    user_dir = f"dataset/{user.unique_id}"
    if os.path.exists(user_dir):
        import shutil
        shutil.rmtree(user_dir)
    
    # Delete user and related attendance records
    db.query(Attendance).filter(Attendance.user_id == user.id).delete()
    db.delete(user)
    db.commit()
    
    return {"message": f"User {user.full_name} deleted successfully"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 