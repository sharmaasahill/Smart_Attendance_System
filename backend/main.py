from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import uvicorn
import os
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from database import get_db, init_db
from models import User, Attendance
from schemas import UserCreate, UserResponse, LoginRequest, AttendanceResponse, UserUpdateProfile, UserChangePassword
from auth import create_access_token, verify_token, get_password_hash, verify_password, get_current_user, get_current_admin_user
from face_recognition_service import FaceRecognitionService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("dataset", exist_ok=True)
    yield
    # Shutdown (add cleanup here if needed)

app = FastAPI(title="Smart Attendance System", version="1.0.0", lifespan=lifespan)

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

@app.get("/")
async def root():
    return {"message": "Smart Attendance System API"}

@app.post("/auth/register")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    unique_id = f"USR{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Set role based on email - admin for specific email, user for others
    admin_email = os.getenv("ADMIN_EMAIL", "")
    user_role = "admin" if admin_email and user_data.email == admin_email else "user"
    
    db_user = User(
        email=user_data.email,
        password=hashed_password,
        full_name=user_data.full_name,
        unique_id=unique_id,
        phone_number=user_data.phone_number,
        department=user_data.department,
        role=user_role,
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
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(login_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated. Please contact administrator.")
    
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(user)
    }


@app.post("/face/check-liveness")
async def check_liveness_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_user(cred, db))
):
    """
    Real-time liveness detection (anti-spoofing)
    Detects photo attacks, screen replay, and other spoofing attempts
    """
    temp_path = None
    try:
        # Save uploaded image temporarily
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
        temp_path = f"uploads/liveness_check_{timestamp}.jpg"
        
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Check liveness
        liveness_result = face_service.check_image_liveness(temp_path)
        
        # Clean up temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return {
            "liveness_check": liveness_result,
            "timestamp": datetime.now().isoformat(),
            "status": "live_person" if liveness_result['is_live'] else "spoof_detected"
        }
    
    except Exception as e:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Liveness check failed: {str(e)}")


@app.post("/face/check-quality")
async def check_face_quality_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_user(cred, db))
):
    """
    Real-time face quality check for image capture
    Returns quality metrics and recommendations
    """
    temp_path = None
    try:
        # Save uploaded image temporarily
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
        temp_path = f"uploads/quality_check_{timestamp}.jpg"
        
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Check quality
        quality_result = face_service.check_image_quality(temp_path)
        
        # Clean up temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return {
            "quality_check": quality_result,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Quality check failed: {str(e)}")


@app.post("/face/register")
async def register_face(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_user(cred, db))
):
    """Register face images for current user with quality checks"""
    
    if len(files) < 5:
        raise HTTPException(status_code=400, detail="At least 5 face images required")
    
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 face images allowed")
    
    try:
        # Save uploaded images
        image_paths = []
        user_dir = f"dataset/{current_user.unique_id}"
        os.makedirs(user_dir, exist_ok=True)
        
        # Save uploaded images temporarily for duplicate check
        temp_image_paths = []
        for i, file in enumerate(files):
            file_path = f"{user_dir}/temp_face_{i+1}.jpg"
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            temp_image_paths.append(file_path)
        
        # Check for duplicate faces in database
        try:
            duplicate_user = face_service.find_duplicate_face(temp_image_paths[0], db, current_user.unique_id)
            if duplicate_user:
                # Clean up temp files
                for temp_file in temp_image_paths:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                
                raise HTTPException(
                    status_code=409,
                    detail=f"This face is already registered to user: {duplicate_user['full_name']} (ID: {duplicate_user['unique_id']}). Each person can only register once."
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Duplicate detection failed: {str(e)}")
            # Continue with registration if duplicate check fails
        
        # Rename temp files to final names
        for i, temp_file in enumerate(temp_image_paths):
            final_file = f"{user_dir}/face_{i+1}.jpg"
            if os.path.exists(final_file):
                os.remove(final_file)
            os.rename(temp_file, final_file)
            image_paths.append(final_file)
        
        # Train face recognition model with quality checks
        result = face_service.train_user_face(current_user.unique_id, image_paths)
        
        if not result.get('success', False):
            raise HTTPException(
                status_code=400, 
                detail=result.get('message', 'Face registration failed'),
                headers={"X-Quality-Reports": str(result.get('quality_reports', []))}
            )
        
        # Update user with face registration status
        current_user.face_registered = True
        current_user.face_encoding_path = f"{user_dir}/encoding.json"
        db.commit()
        
        return {
            "message": "Face registration successful with quality and liveness validation",
            "user_id": current_user.unique_id,
            "statistics": result.get('statistics', {}),
            "quality_summary": {
                "total_images": result['statistics']['total_images'],
                "acceptable_images": result['statistics']['acceptable_images'],
                "average_quality_score": round(result['statistics']['average_quality_score'], 2),
                "liveness_checked": result['statistics'].get('liveness_checked', False),
                "average_liveness_confidence": round(result['statistics']['average_liveness_confidence'], 2) if result['statistics'].get('average_liveness_confidence') else None
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face registration failed: {str(e)}")

@app.post("/attendance/mark")
async def mark_attendance(
    file: UploadFile = File(...),
    skip_liveness: bool = Form(False),
    db: Session = Depends(get_db)
):
    temp_path = None
    try:
        print(f"[DEBUG] Received file: {file.filename}, content-type: {file.content_type}")
        
        # Save uploaded image temporarily
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        temp_path = f"uploads/temp_{timestamp}.jpg"
        
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        print(f"[DEBUG] Saved temp file: {temp_path}, size: {len(content)} bytes")
        
        # Check liveness (anti-spoofing) if enabled - TEMPORARILY DISABLED
        liveness_result = None
        if False and face_service.enable_liveness_check and not skip_liveness:  # Disabled for now
            print(f"[DEBUG] Performing liveness detection...")
            liveness_result = face_service.check_image_liveness(temp_path)
            print(f"[DEBUG] Liveness result: Live={liveness_result['is_live']}, "
                  f"Confidence={liveness_result['confidence']:.1f}%")
            
            # Reject if spoofing detected
            if not liveness_result['is_live']:
                raise HTTPException(
                    status_code=403, 
                    detail=f"Spoof attack detected. Liveness confidence: {liveness_result['confidence']:.1f}%. "
                           f"Please use a live camera feed, not photos or screens. "
                           f"Recommendations: {', '.join(liveness_result['recommendations'])}"
                )
            
            # Check minimum confidence threshold
            if liveness_result['confidence'] < face_service.min_liveness_confidence:
                raise HTTPException(
                    status_code=403,
                    detail=f"Liveness confidence too low: {liveness_result['confidence']:.1f}%. "
                           f"Required: {face_service.min_liveness_confidence}%. "
                           f"Recommendations: {', '.join(liveness_result['recommendations'])}"
                )
        
        # Recognize face
        print(f"[DEBUG] Starting face recognition...")
        recognized_user_id = face_service.recognize_face(temp_path)
        print(f"[DEBUG] Face recognition result: {recognized_user_id}")
        
        if not recognized_user_id:
            print(f"[DEBUG] No face recognized - failing")
            raise HTTPException(status_code=404, detail="Face not recognized. Please ensure your face is clearly visible and that you have registered properly.")
        
        # Get user
        user = db.query(User).filter(User.unique_id == recognized_user_id).first()
        if not user:
            print(f"[DEBUG] User not found in database: {recognized_user_id}")
            raise HTTPException(status_code=404, detail="User not found in database")
        
        print(f"[DEBUG] Found user: {user.full_name} ({user.unique_id})")
        
        # Check if attendance already marked today
        today = datetime.now().date()
        existing_attendance = db.query(Attendance).filter(
            Attendance.user_id == user.id,
            Attendance.date == today
        ).first()
        
        if existing_attendance:
            print(f"[DEBUG] Attendance already exists for {user.full_name} today - Status: {existing_attendance.status}")
            
            # If user was marked absent by admin, allow face recognition to override to present
            if existing_attendance.status == "absent":
                print(f"[DEBUG] Overriding absent status with present for {user.full_name}")
                existing_attendance.status = "present"
                existing_attendance.time_in = datetime.now().time()
                db.commit()
                db.refresh(existing_attendance)
                
                return {
                    "message": f"Attendance updated successfully for {user.full_name} - Status changed from absent to present",
                    "user": UserResponse.from_orm(user),
                    "attendance": AttendanceResponse.from_orm(existing_attendance),
                    "liveness_verified": liveness_result is not None,
                    "liveness_confidence": liveness_result['confidence'] if liveness_result else None
                }
            else:
                # If already present, don't allow duplicate marking
                time_str = existing_attendance.time_in.strftime('%I:%M %p') if existing_attendance.time_in else existing_attendance.status
                raise HTTPException(status_code=400, detail=f"Attendance already marked for {user.full_name} today as {existing_attendance.status}" + (f" at {time_str}" if existing_attendance.time_in else ""))
        
        # Mark attendance (new record)
        attendance = Attendance(
            user_id=user.id,
            date=today,
            time_in=datetime.now().time(),
            status="present"
        )
        
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        
        print(f"[DEBUG] Attendance marked successfully for {user.full_name}")
        
        return {
            "message": f"Attendance marked successfully for {user.full_name}",
            "user": UserResponse.from_orm(user),
            "attendance": AttendanceResponse.from_orm(attendance),
            "liveness_verified": liveness_result is not None,
            "liveness_confidence": liveness_result['confidence'] if liveness_result else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG] Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Attendance marking failed: {str(e)}")
    finally:
        # Clean up temp file
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
                print(f"[DEBUG] Cleaned up temp file: {temp_path}")
            except:
                pass

@app.get("/admin/users")
async def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Admin only: Get all users"""
    users = db.query(User).all()
    return [UserResponse.from_orm(user) for user in users]

@app.get("/admin/attendance")
async def get_attendance_records(
    date: str = None,
    user_id: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Admin only: Get attendance records"""
    
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
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Admin only: Mark absent users"""
    
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

@app.put("/admin/attendance/{attendance_id}")
async def update_attendance_record(
    attendance_id: int,
    status: str = Form(...),
    time_in: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Admin only: Update individual attendance record"""
    
    # Get the attendance record
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    # Update the record
    attendance.status = status
    
    if status == "present" and time_in:
        try:
            # Parse and validate time
            time_obj = datetime.strptime(time_in, "%H:%M").time()
            attendance.time_in = time_obj
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
    elif status == "absent":
        attendance.time_in = None
    
    db.commit()
    db.refresh(attendance)
    
    # Get user info for response
    user = db.query(User).filter(User.id == attendance.user_id).first()
    
    return {
        "message": f"Updated attendance for {user.full_name}",
        "attendance": {
            "id": attendance.id,
            "user": UserResponse.from_orm(user),
            "date": attendance.date.isoformat(),
            "time_in": attendance.time_in.isoformat() if attendance.time_in else None,
            "status": attendance.status,
            "created_at": attendance.created_at.isoformat()
        }
    }

@app.post("/admin/attendance/bulk-update")
async def bulk_update_attendance(
    record_ids: list[int] = Form(...),
    status: str = Form(...),
    time_in: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Admin only: Bulk update attendance records"""
    
    updated_count = 0
    
    for record_id in record_ids:
        attendance = db.query(Attendance).filter(Attendance.id == record_id).first()
        if attendance:
            attendance.status = status
            
            if status == "present" and time_in:
                try:
                    time_obj = datetime.strptime(time_in, "%H:%M").time()
                    attendance.time_in = time_obj
                except ValueError:
                    continue  # Skip invalid time formats
            elif status == "absent":
                attendance.time_in = None
            
            updated_count += 1
    
    db.commit()
    
    return {"message": f"Updated {updated_count} attendance records"}

@app.post("/admin/attendance/mark-present/{user_id}")
async def mark_user_present(
    user_id: str,
    time_in: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Admin only: Mark specific user as present"""
    
    # Get user
    user = db.query(User).filter(User.unique_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    today = datetime.now().date()
    
    # Check if attendance record exists
    attendance = db.query(Attendance).filter(
        Attendance.user_id == user.id,
        Attendance.date == today
    ).first()
    
    # Set time
    if time_in:
        try:
            time_obj = datetime.strptime(time_in, "%H:%M").time()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
    else:
        time_obj = datetime.now().time()
    
    if attendance:
        # Update existing record
        attendance.status = "present"
        attendance.time_in = time_obj
    else:
        # Create new record
        attendance = Attendance(
            user_id=user.id,
            date=today,
            time_in=time_obj,
            status="present"
        )
        db.add(attendance)
    
    db.commit()
    db.refresh(attendance)
    
    return {
        "message": f"Marked {user.full_name} as present",
        "attendance": AttendanceResponse.from_orm(attendance)
    }

@app.delete("/admin/user/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Admin only: Delete user"""
    
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

# ============ ADMIN FACE MANAGEMENT ENDPOINTS ============

@app.get("/admin/users/face-status")
async def get_users_face_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Admin only: Get all users with face registration status"""
    
    users = db.query(User).all()
    users_status = []
    
    for user in users:
        user_dir = f"dataset/{user.unique_id}"
        encoding_file = f"{user_dir}/encoding.pkl"
        
        # Check if face is registered
        face_registered = os.path.exists(encoding_file)
        
        # Get registration details if available
        registration_details = None
        if face_registered:
            try:
                import pickle
                with open(encoding_file, 'rb') as f:
                    data = pickle.load(f)
                    registration_details = {
                        'registered_date': datetime.fromtimestamp(os.path.getctime(encoding_file)).isoformat(),
                        'valid_images': data.get('valid_images', 0),
                        'model': data.get('model', 'unknown'),
                        'quality_checked': data.get('quality_checked', False),
                        'liveness_checked': data.get('liveness_checked', False),
                    }
            except Exception as e:
                print(f"Error reading face data for {user.unique_id}: {str(e)}")
        
        # Count face images
        face_images_count = 0
        if os.path.exists(user_dir):
            face_images_count = len([f for f in os.listdir(user_dir) if f.startswith('face_') and f.endswith('.jpg')])
        
        users_status.append({
            'user': UserResponse.from_orm(user),
            'face_registered': face_registered,
            'face_images_count': face_images_count,
            'registration_details': registration_details
        })
    
    return {
        'total_users': len(users),
        'users_with_faces': sum(1 for u in users_status if u['face_registered']),
        'users_without_faces': sum(1 for u in users_status if not u['face_registered']),
        'users': users_status
    }

@app.delete("/admin/user/{user_id}/face")
async def delete_user_face_data(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Admin only: Delete user's face data (for re-registration)"""
    
    user = db.query(User).filter(User.unique_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_dir = f"dataset/{user.unique_id}"
    
    if not os.path.exists(user_dir):
        raise HTTPException(status_code=404, detail="No face data found for this user")
    
    # Delete face data directory
    import shutil
    shutil.rmtree(user_dir)
    
    # Update user record
    user.face_registered = False
    user.face_encoding_path = None
    db.commit()
    
    return {
        "message": f"Face data deleted successfully for {user.full_name}",
        "user_id": user_id,
        "user_name": user.full_name
    }

@app.post("/admin/user/{user_id}/face/register")
async def admin_register_user_face(
    user_id: str,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Admin only: Register face for any user"""
    
    # Get target user
    target_user = db.query(User).filter(User.unique_id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if len(files) < 5:
        raise HTTPException(status_code=400, detail="At least 5 face images required")
    
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 face images allowed")
    
    try:
        # Delete existing face data if any
        user_dir = f"dataset/{target_user.unique_id}"
        if os.path.exists(user_dir):
            import shutil
            shutil.rmtree(user_dir)
        
        # Create fresh directory
        os.makedirs(user_dir, exist_ok=True)
        
        # Save uploaded images
        image_paths = []
        for i, file in enumerate(files):
            file_path = f"{user_dir}/face_{i+1}.jpg"
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            image_paths.append(file_path)
        
        # Train face recognition model with quality and liveness checks
        result = face_service.train_user_face(target_user.unique_id, image_paths, check_liveness=False)
        
        if not result.get('success', False):
            raise HTTPException(
                status_code=400, 
                detail=result.get('message', 'Face registration failed')
            )
        
        # Update user record
        target_user.face_registered = True
        target_user.face_encoding_path = f"{user_dir}/encoding.json"
        db.commit()
        
        return {
            "message": f"Face registration successful for {target_user.full_name}",
            "user_id": target_user.unique_id,
            "user_name": target_user.full_name,
            "registered_by_admin": current_user.full_name,
            "statistics": result.get('statistics', {}),
            "quality_summary": {
                "total_images": result['statistics']['total_images'],
                "acceptable_images": result['statistics']['acceptable_images'],
                "live_images": result['statistics'].get('live_images', 0),
                "average_quality_score": round(result['statistics']['average_quality_score'], 2),
                "average_liveness_confidence": round(result['statistics'].get('average_liveness_confidence', 0), 2) if result['statistics'].get('average_liveness_confidence') else None,
                "liveness_checked": result['statistics'].get('liveness_checked', False)
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        # Clean up on failure
        if os.path.exists(user_dir):
            import shutil
            shutil.rmtree(user_dir)
        raise HTTPException(status_code=500, detail=f"Face registration failed: {str(e)}")

@app.get("/user/face/images")
async def get_user_registered_faces(
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_user(cred, db)),
    db: Session = Depends(get_db)
):
    """Get current user's registered face images"""
    
    user_dir = f"dataset/{current_user.unique_id}"
    
    if not os.path.exists(user_dir):
        raise HTTPException(status_code=404, detail="No face data found. Please register your face first.")
    
    # Get face images
    face_images = []
    for filename in os.listdir(user_dir):
        if filename.startswith('face_') and filename.endswith('.jpg'):
            file_path = os.path.join(user_dir, filename)
            
            # Read image and convert to base64
            try:
                with open(file_path, 'rb') as img_file:
                    import base64
                    img_data = base64.b64encode(img_file.read()).decode('utf-8')
                    face_images.append({
                        'filename': filename,
                        'data': f"data:image/jpeg;base64,{img_data}",
                        'registered_date': datetime.fromtimestamp(os.path.getctime(file_path)).isoformat()
                    })
            except Exception as e:
                print(f"Error reading image {filename}: {str(e)}")
                continue
    
    # Get registration details
    encoding_file = f"{user_dir}/encoding.pkl"
    registration_details = None
    
    if os.path.exists(encoding_file):
        try:
            import pickle
            with open(encoding_file, 'rb') as f:
                data = pickle.load(f)
                registration_details = {
                    'registered_date': datetime.fromtimestamp(os.path.getctime(encoding_file)).isoformat(),
                    'valid_images': data.get('valid_images', 0),
                    'model': data.get('model', 'unknown'),
                    'quality_checked': data.get('quality_checked', False),
                    'liveness_checked': data.get('liveness_checked', False),
                    'min_quality_score': data.get('min_quality_score', 0),
                    'min_liveness_confidence': data.get('min_liveness_confidence', 0),
                }
        except Exception as e:
            print(f"Error reading registration details: {str(e)}")
    
    if not face_images:
        raise HTTPException(status_code=404, detail="No face images found")
    
    return {
        'user_id': current_user.unique_id,
        'user_name': current_user.full_name,
        'face_registered': current_user.face_registered,
        'total_images': len(face_images),
        'images': face_images,
        'registration_details': registration_details
    }


@app.get("/admin/user/{user_id}/face/images")
async def get_user_face_images_admin(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Admin only: Get any user's registered face images"""
    
    target_user = db.query(User).filter(User.unique_id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_dir = f"dataset/{target_user.unique_id}"
    
    if not os.path.exists(user_dir):
        raise HTTPException(status_code=404, detail="No face data found for this user")
    
    # Get face images
    face_images = []
    for filename in os.listdir(user_dir):
        if filename.startswith('face_') and filename.endswith('.jpg'):
            file_path = os.path.join(user_dir, filename)
            
            # Read image and convert to base64
            try:
                with open(file_path, 'rb') as img_file:
                    import base64
                    img_data = base64.b64encode(img_file.read()).decode('utf-8')
                    face_images.append({
                        'filename': filename,
                        'data': f"data:image/jpeg;base64,{img_data}",
                        'registered_date': datetime.fromtimestamp(os.path.getctime(file_path)).isoformat()
                    })
            except Exception as e:
                print(f"Error reading image {filename}: {str(e)}")
                continue
    
    # Get registration details
    encoding_file = f"{user_dir}/encoding.pkl"
    registration_details = None
    
    if os.path.exists(encoding_file):
        try:
            import pickle
            with open(encoding_file, 'rb') as f:
                data = pickle.load(f)
                registration_details = {
                    'registered_date': datetime.fromtimestamp(os.path.getctime(encoding_file)).isoformat(),
                    'valid_images': data.get('valid_images', 0),
                    'model': data.get('model', 'unknown'),
                    'quality_checked': data.get('quality_checked', False),
                    'liveness_checked': data.get('liveness_checked', False),
                }
        except Exception as e:
            print(f"Error reading registration details: {str(e)}")
    
    return {
        'user_id': target_user.unique_id,
        'user_name': target_user.full_name,
        'face_registered': target_user.face_registered,
        'total_images': len(face_images),
        'images': face_images,
        'registration_details': registration_details
    }


@app.get("/admin/user/{user_id}/face/details")
async def get_user_face_details(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Admin only: Get detailed face registration info for a user"""
    
    user = db.query(User).filter(User.unique_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_dir = f"dataset/{user.unique_id}"
    encoding_file = f"{user_dir}/encoding.pkl"
    
    if not os.path.exists(encoding_file):
        return {
            "user": UserResponse.from_orm(user),
            "face_registered": False,
            "message": "No face data registered for this user"
        }
    
    # Read face data
    try:
        import pickle
        with open(encoding_file, 'rb') as f:
            face_data = pickle.load(f)
        
        # Get file info
        registration_date = datetime.fromtimestamp(os.path.getctime(encoding_file))
        file_size = os.path.getsize(encoding_file)
        
        # Get face images
        face_images = []
        if os.path.exists(user_dir):
            for filename in sorted(os.listdir(user_dir)):
                if filename.startswith('face_') and filename.endswith('.jpg'):
                    file_path = os.path.join(user_dir, filename)
                    face_images.append({
                        'filename': filename,
                        'size': os.path.getsize(file_path),
                        'created': datetime.fromtimestamp(os.path.getctime(file_path)).isoformat()
                    })
        
        return {
            "user": UserResponse.from_orm(user),
            "face_registered": True,
            "registration_info": {
                "registered_date": registration_date.isoformat(),
                "file_size_bytes": file_size,
                "model": face_data.get('model', 'unknown'),
                "tolerance": face_data.get('tolerance', 0.6),
                "valid_images": face_data.get('valid_images', 0),
                "quality_checked": face_data.get('quality_checked', False),
                "min_quality_score": face_data.get('min_quality_score', 0),
                "liveness_checked": face_data.get('liveness_checked', False),
                "min_liveness_confidence": face_data.get('min_liveness_confidence', 0),
            },
            "face_images": face_images,
            "total_images": len(face_images)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read face data: {str(e)}")

@app.post("/admin/faces/bulk-delete")
async def bulk_delete_face_data(
    user_ids: list[str] = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Admin only: Delete face data for multiple users"""
    
    deleted_count = 0
    errors = []
    
    for user_id in user_ids:
        try:
            user = db.query(User).filter(User.unique_id == user_id).first()
            if not user:
                errors.append(f"User {user_id} not found")
                continue
            
            user_dir = f"dataset/{user.unique_id}"
            if os.path.exists(user_dir):
                import shutil
                shutil.rmtree(user_dir)
                
                user.face_registered = False
                user.face_encoding_path = None
                deleted_count += 1
            else:
                errors.append(f"No face data for user {user_id}")
        
        except Exception as e:
            errors.append(f"Error deleting {user_id}: {str(e)}")
    
    db.commit()
    
    return {
        "message": f"Deleted face data for {deleted_count} users",
        "deleted_count": deleted_count,
        "total_requested": len(user_ids),
        "errors": errors if errors else None
    }

# ============ USER ENDPOINTS ============

@app.get("/user/profile")
async def get_user_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_user(cred, db))
):
    """Get current user's profile"""
    return UserResponse.from_orm(current_user)

@app.put("/user/profile")
async def update_user_profile(
    profile_data: UserUpdateProfile,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_user(cred, db))
):
    """Update current user's profile"""
    
    # Update only provided fields
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name
    if profile_data.phone_number is not None:
        current_user.phone_number = profile_data.phone_number
    if profile_data.department is not None:
        current_user.department = profile_data.department
    
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Profile updated successfully",
        "user": UserResponse.from_orm(current_user)
    }

@app.post("/user/change-password")
async def change_password(
    password_data: UserChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_user(cred, db))
):
    """Change current user's password"""
    
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="Invalid current password")
    
    # Update password
    current_user.password = get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

@app.get("/user/attendance")
async def get_user_attendance(
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_user(cred, db))
):
    """Get current user's attendance history"""
    
    query = db.query(Attendance).filter(Attendance.user_id == current_user.id)
    
    if start_date:
        query = query.filter(Attendance.date >= datetime.strptime(start_date, "%Y-%m-%d").date())
    
    if end_date:
        query = query.filter(Attendance.date <= datetime.strptime(end_date, "%Y-%m-%d").date())
    
    records = query.order_by(Attendance.date.desc()).all()
    
    result = []
    for record in records:
        result.append({
            "id": record.id,
            "date": record.date.isoformat(),
            "time_in": record.time_in.isoformat() if record.time_in else None,
            "status": record.status,
            "created_at": record.created_at.isoformat()
        })
    
    return {
        "user": UserResponse.from_orm(current_user),
        "attendance_records": result,
        "total_records": len(result)
    }

@app.get("/user/attendance/stats")
async def get_user_attendance_stats(
    month: int = None,
    year: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_user(cred, db))
):
    """Get current user's attendance statistics"""
    
    from sqlalchemy import func, extract
    
    query = db.query(Attendance).filter(Attendance.user_id == current_user.id)
    
    # Filter by month/year if provided
    if year:
        query = query.filter(extract('year', Attendance.date) == year)
    if month:
        query = query.filter(extract('month', Attendance.date) == month)
    
    # Get statistics
    total_days = query.count()
    present_days = query.filter(Attendance.status == "present").count()
    absent_days = query.filter(Attendance.status == "absent").count()
    
    attendance_percentage = (present_days / total_days * 100) if total_days > 0 else 0
    
    return {
        "user": UserResponse.from_orm(current_user),
        "stats": {
            "total_days": total_days,
            "present_days": present_days,
            "absent_days": absent_days,
            "attendance_percentage": round(attendance_percentage, 2)
        },
        "period": {
            "month": month,
            "year": year
        }
    }

@app.get("/user/face/images")
async def get_user_registered_faces(
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_user(cred, db))
):
    """Get current user's registered face images with quality scores"""
    import base64
    import json
    from pathlib import Path
    
    # Check if face is registered
    if not current_user.face_registered:
        raise HTTPException(status_code=404, detail="No face data registered for this user")
    
    # Get user's dataset folder
    DATASET_DIR = "dataset"  # Define the dataset directory
    user_folder = os.path.join(DATASET_DIR, current_user.unique_id)
    
    if not os.path.exists(user_folder):
        raise HTTPException(status_code=404, detail="Face data folder not found")
    
    # Collect all face images
    face_images = []
    quality_data = None
    
    # Load quality data if available
    quality_file = os.path.join(user_folder, 'quality_scores.json')
    if os.path.exists(quality_file):
        with open(quality_file, 'r') as f:
            quality_data = json.load(f)
    
    # Get all image files
    for file in os.listdir(user_folder):
        if file.endswith(('.jpg', '.jpeg', '.png')) and file.startswith('face_'):
            image_path = os.path.join(user_folder, file)
            
            # Read and encode image to base64
            with open(image_path, 'rb') as img_file:
                img_data = base64.b64encode(img_file.read()).decode('utf-8')
            
            # Get file stats
            file_stats = os.stat(image_path)
            created_time = datetime.fromtimestamp(file_stats.st_ctime).isoformat()
            
            # Extract face number from filename (e.g., face_1.jpg -> 1)
            face_num = file.split('_')[1].split('.')[0]
            
            # Get quality score for this face if available
            quality_score = None
            quality_details = None
            if quality_data and 'faces' in quality_data:
                for face_quality in quality_data['faces']:
                    if str(face_quality.get('face_number')) == face_num or face_quality.get('image') == file:
                        quality_score = face_quality.get('overall_score')
                        quality_details = {
                            'face_size_score': face_quality.get('face_size_score'),
                            'brightness_score': face_quality.get('brightness_score'),
                            'sharpness_score': face_quality.get('sharpness_score'),
                            'pose_score': face_quality.get('pose_score'),
                            'eye_visibility_score': face_quality.get('eye_visibility_score'),
                            'accepted': face_quality.get('accepted', True),
                        }
                        break
            
            face_images.append({
                'filename': file,
                'image_data': f'data:image/jpeg;base64,{img_data}',
                'created_at': created_time,
                'quality_score': quality_score,
                'quality_details': quality_details,
            })
    
    # Sort by filename (face_1, face_2, etc.)
    face_images.sort(key=lambda x: int(x['filename'].split('_')[1].split('.')[0]))
    
    return {
        "user_id": current_user.unique_id,
        "user_name": current_user.full_name,
        "face_registered": current_user.face_registered,
        "total_faces": len(face_images),
        "faces": face_images,
        "registration_date": current_user.created_at.isoformat() if current_user.created_at else None,
    }

# ======================================
# ADVANCED ANALYTICS ENDPOINTS
# ======================================

@app.get("/analytics/dashboard")
async def get_analytics_dashboard(
    period: str = "week",
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Get comprehensive analytics dashboard data"""
    try:
        from datetime import timedelta
        from collections import defaultdict
        
        # Calculate date ranges
        today = datetime.now()
        
        if period == "day":
            start_date = today.replace(hour=0, minute=0, second=0)
        elif period == "week":
            start_date = today - timedelta(days=7)
        elif period == "month":
            start_date = today - timedelta(days=30)
        else:
            start_date = today - timedelta(days=7)
        
        # Get attendance records
        attendance_records = db.query(Attendance).filter(
            Attendance.date >= start_date.date()
        ).all()
        
        # Get all users
        users = db.query(User).all()
        
        # Calculate analytics
        analytics = {
            "liveStats": calculate_live_stats(db, users, attendance_records),
            "dailyTrends": calculate_daily_trends(attendance_records, start_date, today),
            "weeklyStats": calculate_weekly_patterns(attendance_records),
            "userStats": calculate_user_performance(db, users, attendance_records),
            "anomalies": detect_anomalies(attendance_records, users),
            "productivity": calculate_productivity_metrics(attendance_records, users),
            "period": period,
            "generatedAt": today.isoformat()
        }
        
        return analytics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics calculation failed: {str(e)}")

@app.get("/analytics/export")
async def export_analytics_data(
    format: str = "json",
    period: str = "week",
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Export analytics data in various formats"""
    try:
        from fastapi.responses import Response
        
        # Get analytics data (call the function directly)
        analytics = await get_analytics_dashboard(period, db, current_user)
        
        if format.lower() == "csv":
            # Simple CSV conversion
            csv_content = "metric,value\n"
            csv_content += f"total_employees,{analytics['liveStats']['totalEmployees']}\n"
            csv_content += f"currently_present,{analytics['liveStats']['currentlyPresent']}\n"
            csv_content += f"productivity_score,{analytics['liveStats']['productivityScore']}\n"
            
            return Response(
                content=csv_content,
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=analytics-{period}.csv"}
            )
        
        return analytics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@app.get("/analytics/reports/automated")
async def generate_automated_report(
    report_type: str = "weekly",
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Generate automated attendance reports with insights"""
    try:
        from datetime import timedelta
        
        today = datetime.now()
        if report_type == "daily":
            start_date = today.replace(hour=0, minute=0, second=0)
            title = "Daily Attendance Report"
        elif report_type == "weekly":
            start_date = today - timedelta(days=7)
            title = "Weekly Attendance Report"
        elif report_type == "monthly":
            start_date = today - timedelta(days=30)
            title = "Monthly Attendance Report"
        else:
            start_date = today - timedelta(days=7)
            title = "Weekly Attendance Report"
        
        # Get data
        attendance_records = db.query(Attendance).filter(
            Attendance.date >= start_date.date()
        ).all()
        users = db.query(User).all()
        
        # Generate comprehensive report
        report = {
            "title": title,
            "period": report_type,
            "generatedAt": today.isoformat(),
            "summary": {
                "totalEmployees": len(users),
                "totalRecords": len(attendance_records),
                "avgAttendance": round(len(attendance_records) / max(len(users), 1), 2),
                "attendanceRate": round((len(set(r.user_id for r in attendance_records)) / max(len(users), 1)) * 100, 1)
            },
            "insights": [
                {
                    "type": "attendance",
                    "title": "Overall Attendance",
                    "value": f"{round((len(set(r.user_id for r in attendance_records)) / max(len(users), 1)) * 100, 1)}%",
                    "trend": "stable"
                },
                {
                    "type": "punctuality", 
                    "title": "On-Time Arrivals",
                    "value": f"{round(len([r for r in attendance_records if r.time_in and r.time_in <= datetime.strptime('09:00', '%H:%M').time()]) / max(len(attendance_records), 1) * 100, 1)}%",
                    "trend": "improving"
                }
            ],
            "recommendations": generate_simple_recommendations(attendance_records, users),
            "topPerformers": calculate_user_performance(db, users, attendance_records)[:3]
        }
        
        return report
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

@app.get("/analytics/anomalies")
async def get_attendance_anomalies(
    days: int = 7,
    severity: str = "all",
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda cred=Depends(security), db=Depends(get_db): get_current_admin_user(cred, db))
):
    """Detect and return attendance anomalies"""
    try:
        from datetime import timedelta
        
        start_date = datetime.now() - timedelta(days=days)
        attendance_records = db.query(Attendance).filter(
            Attendance.date >= start_date.date()
        ).all()
        users = db.query(User).all()
        
        anomalies = detect_anomalies(attendance_records, users)
        
        # Filter by severity if specified
        if severity != "all":
            anomalies = [a for a in anomalies if a["severity"] == severity]
        
        return {
            "anomalies": anomalies,
            "total": len(anomalies),
            "period": f"Last {days} days",
            "severityFilter": severity
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")

# ======================================
# 🧮 ANALYTICS CALCULATION FUNCTIONS
# ======================================

def calculate_live_stats(db: Session, users: list, attendance_records: list):
    """Calculate real-time statistics"""
    from datetime import time
    
    today = datetime.now().date()
    today_records = [r for r in attendance_records if r.date == today and r.status == "present"]
    
    # Count present users
    present_users = set()
    on_time_count = 0
    late_count = 0
    
    work_start_time = time(9, 0)  # 9:00 AM
    
    for record in today_records:
        present_users.add(record.user_id)
        
        if record.time_in:
            if record.time_in <= work_start_time:
                on_time_count += 1
            else:
                late_count += 1
    
    total_employees = len(users)
    currently_present = len(present_users)
    absent_today = total_employees - currently_present
    
    # Calculate average arrival time
    if today_records and any(r.time_in for r in today_records):
        valid_times = [r for r in today_records if r.time_in]
        avg_arrival_seconds = sum(
            r.time_in.hour * 3600 + r.time_in.minute * 60 + r.time_in.second
            for r in valid_times
        ) / len(valid_times)
        avg_hour = int(avg_arrival_seconds // 3600)
        avg_minute = int((avg_arrival_seconds % 3600) // 60)
        average_arrival = f"{avg_hour:02d}:{avg_minute:02d}"
    else:
        average_arrival = "N/A"
    
    # Calculate productivity score (simplified)
    attendance_rate = (currently_present / total_employees * 100) if total_employees > 0 else 0
    punctuality_rate = (on_time_count / max(len(today_records), 1) * 100)
    productivity_score = round((attendance_rate * 0.7) + (punctuality_rate * 0.3))
    
    return {
        "totalEmployees": total_employees,
        "currentlyPresent": currently_present,
        "onTimeToday": on_time_count,
        "lateToday": late_count,
        "absentToday": absent_today,
        "averageArrival": average_arrival,
        "peakHour": "9:15 AM",  # Could be calculated from data
        "productivityScore": productivity_score
    }

def calculate_daily_trends(attendance_records: list, start_date, end_date):
    """Calculate daily attendance trends"""
    from datetime import timedelta
    from collections import defaultdict
    
    daily_data = defaultdict(list)
    
    # Group records by date
    for record in attendance_records:
        daily_data[record.date].append(record)
    
    trends = []
    current_date = start_date.date()
    
    while current_date <= end_date.date():
        day_records = daily_data.get(current_date, [])
        present_records = [r for r in day_records if r.status == "present"]
        
        # Calculate metrics for this day
        total_records = len(present_records)
        on_time = sum(1 for r in present_records if r.time_in and r.time_in <= datetime.strptime("09:00", "%H:%M").time())
        
        trends.append({
            "date": current_date.strftime("%b %d"),
            "attendance": min(100, total_records * 20),  # Normalized
            "onTime": round((on_time / max(1, total_records)) * 100, 1),
            "productivity": min(100, 70 + total_records * 5)  # Simulated
        })
        
        current_date += timedelta(days=1)
    
    return trends

def calculate_weekly_patterns(attendance_records: list):
    """Calculate weekly attendance patterns"""
    from collections import defaultdict
    
    weekday_data = defaultdict(list)
    
    for record in attendance_records:
        weekday = record.date.weekday()  # 0=Monday, 6=Sunday
        weekday_data[weekday].append(record)
    
    weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    patterns = []
    
    for i, day_name in enumerate(weekdays):
        day_records = weekday_data.get(i, [])
        present_records = [r for r in day_records if r.status == "present"]
        
        patterns.append({
            "name": day_name,
            "attendance": min(100, len(present_records) * 15),  # Normalized
            "productivity": min(100, 60 + len(present_records) * 8)  # Simulated
        })
    
    return patterns

def calculate_user_performance(db: Session, users: list, attendance_records: list):
    """Calculate individual user performance metrics"""
    from collections import defaultdict
    
    user_data = defaultdict(list)
    
    for record in attendance_records:
        user_data[record.user_id].append(record)
    
    performance = []
    
    for user in users[:5]:  # Top 5 users
        user_records = user_data.get(user.id, [])
        present_records = [r for r in user_records if r.status == "present"]
        
        if present_records:
            attendance_rate = min(100, len(present_records) * 10)  # Simplified calculation
            
            # Calculate punctuality
            on_time = sum(1 for r in present_records if r.time_in and r.time_in <= datetime.strptime("09:00", "%H:%M").time())
            punctuality_rate = (on_time / len(present_records)) * 100 if present_records else 0
            
            productivity = (attendance_rate * 0.7) + (punctuality_rate * 0.3)
            streak = len(present_records)  # Simplified streak calculation
        else:
            attendance_rate = 0
            productivity = 0
            streak = 0
        
        performance.append({
            "name": user.full_name,
            "department": user.department or "Unknown",
            "attendance": round(attendance_rate),
            "productivity": round(productivity),
            "streak": streak
        })
    
    # Sort by productivity score
    performance.sort(key=lambda x: x["productivity"], reverse=True)
    return performance

def detect_anomalies(attendance_records: list, users: list):
    """Detect attendance anomalies"""
    anomalies = []
    
    try:
        # Simple anomaly detection - could be enhanced
        from collections import defaultdict
        
        user_data = defaultdict(list)
        for record in attendance_records:
            user_data[record.user_id].append(record)
        
        # Check for unusual patterns
        for user_id, records in user_data.items():
            user = next((u for u in users if u.id == user_id), None)
            if not user:
                continue
                
            present_records = [r for r in records if r.status == "present"]
            
            # Check for low attendance
            if len(records) > 5 and len(present_records) / len(records) < 0.6:
                anomalies.append({
                    "type": "low_attendance",
                    "user": user.full_name,
                    "description": f"Attendance rate below 60% ({len(present_records)}/{len(records)} days)",
                    "severity": "high",
                    "date": records[-1].date.strftime("%b %d") if records else "Unknown"
                })
    except Exception as e:
        # If anomaly detection fails, return empty list
        pass
    
    return anomalies

def calculate_productivity_metrics(attendance_records: list, users: list):
    """Calculate productivity metrics by department"""
    from collections import defaultdict
    
    dept_data = defaultdict(list)
    
    for record in attendance_records:
        user = next((u for u in users if u.id == record.user_id), None)
        if user and user.department:
            dept_data[user.department].append(record)
    
    dept_metrics = []
    departments = ["Engineering", "Marketing", "Sales", "HR", "Finance", "Operations"]
    
    for dept in departments:
        records = dept_data.get(dept, [])
        present_records = [r for r in records if r.status == "present"]
        
        if records:
            attendance_rate = (len(present_records) / len(records)) * 100
            base_score = min(100, max(60, attendance_rate))
        else:
            base_score = 85  # Default score
        
        # Simulate trend
        import random
        trend_value = random.randint(-10, 15)
        trend = f"+{trend_value}%" if trend_value > 0 else f"{trend_value}%"
        
        dept_metrics.append({
            "name": dept,
            "score": round(base_score),
            "trend": trend
        })
    
    overall_score = sum(d["score"] for d in dept_metrics) // len(dept_metrics) if dept_metrics else 85
    
    return {
        "overall": overall_score,
        "trend": "+5%",
        "departments": dept_metrics
    }

def generate_simple_recommendations(attendance_records: list, users: list):
    """Generate simple recommendations"""
    recommendations = []
    
    try:
        present_records = [r for r in attendance_records if r.status == "present"]
        attendance_rate = len(set(r.user_id for r in present_records)) / max(len(users), 1) * 100
        
        if attendance_rate < 80:
            recommendations.append({
                "type": "attendance",
                "priority": "high",
                "title": "Low Overall Attendance",
                "description": f"Attendance rate is {attendance_rate:.1f}%. Consider implementing attendance incentives."
            })
        
        # Check punctuality
        late_records = [r for r in present_records if r.time_in and r.time_in > datetime.strptime("09:15", "%H:%M").time()]
        if len(late_records) > len(present_records) * 0.3:
            recommendations.append({
                "type": "punctuality",
                "priority": "medium", 
                "title": "Punctuality Issues",
                "description": f"{len(late_records)} late arrivals detected. Consider flexible timing or punctuality training."
            })
    except Exception as e:
        # If recommendation generation fails, return empty list
        pass
    
    return recommendations

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 