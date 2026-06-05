import os
import json
import pickle
import numpy as np
import face_recognition
import cv2
from typing import List, Optional, Dict
import logging
from face_quality_checker import FaceQualityChecker, check_face_quality
from liveness_detector import LivenessDetector, check_liveness

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FaceRecognitionService:
    def __init__(self):
        self.model = "hog"  # HOG model (faster) or 'cnn' for better accuracy
        self.tolerance = 0.6  # Lower is more strict
        self.num_jitters = 1  # Number of times to re-sample face when calculating encoding
        self.quality_checker = FaceQualityChecker()  # Initialize quality checker
        self.liveness_detector = LivenessDetector()  # Initialize liveness detector
        self.min_quality_score = 30  # Minimum acceptable quality score (very lenient)
        self.min_liveness_confidence = 20  # Minimum liveness confidence (very lenient for webcam)
        self.enable_liveness_check = True  # Feature flag for liveness detection
    
    def check_image_quality(self, image_path: str) -> Dict:
        """
        Check quality of a single image before processing
        
        Returns:
            Dictionary with quality metrics and acceptance status
        """
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                return {
                    'is_acceptable': False,
                    'overall_score': 0,
                    'issues': ['Could not load image'],
                    'recommendations': ['Ensure image file is valid']
                }
            
            # Check quality
            quality_result = check_face_quality(image)
            
            logger.info(f"Image quality check for {os.path.basename(image_path)}: "
                       f"Score={quality_result['overall_score']:.1f}%, "
                       f"Acceptable={quality_result['is_acceptable']}")
            
            return quality_result
            
        except Exception as e:
            logger.error(f"Quality check failed for {image_path}: {str(e)}")
            return {
                'is_acceptable': False,
                'overall_score': 0,
                'issues': [f'Quality check error: {str(e)}'],
                'recommendations': ['Try capturing image again']
            }
    
    def check_image_liveness(self, image_path: str) -> Dict:
        """
        Check if image contains a live person (anti-spoofing)
        
        Returns:
            Dictionary with liveness detection results
        """
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                return {
                    'is_live': False,
                    'confidence': 0,
                    'spoof_probability': 100,
                    'checks_passed': {},
                    'recommendations': ['Could not load image']
                }
            
            # Check liveness
            liveness_result = check_liveness(image, mode='comprehensive')
            
            logger.info(f"Liveness check for {os.path.basename(image_path)}: "
                       f"Live={liveness_result['is_live']}, "
                       f"Confidence={liveness_result['confidence']:.1f}%, "
                       f"SpoofProb={liveness_result['spoof_probability']:.1f}%")
            
            return liveness_result
            
        except Exception as e:
            logger.error(f"Liveness check failed for {image_path}: {str(e)}")
            return {
                'is_live': False,
                'confidence': 0,
                'spoof_probability': 100,
                'checks_passed': {},
                'details': {'error': str(e)},
                'recommendations': ['Liveness check error - try again']
            }
    
    def train_user_face(self, user_id: str, image_paths: List[str], check_liveness: bool = True) -> Dict:
        """
        Train face recognition model for a specific user with quality and liveness checks
        
        Args:
            user_id: Unique identifier for the user
            image_paths: List of paths to face images
            check_liveness: Whether to perform liveness detection (default: True)
        
        Returns:
            Dictionary with success status, quality reports, liveness reports, and statistics
        """
        try:
            logger.info(f"Training face recognition for user: {user_id} with quality and liveness checks")
            
            # First pass: Check quality of all images
            quality_reports = []
            acceptable_images = []
            
            for image_path in image_paths:
                quality_result = self.check_image_quality(image_path)
                quality_reports.append({
                    'image': os.path.basename(image_path),
                    'path': image_path,
                    **quality_result
                })
                
                if quality_result['is_acceptable']:
                    acceptable_images.append(image_path)
                else:
                    logger.warning(f"Image rejected due to low quality: {os.path.basename(image_path)}")
                    logger.warning(f"  Issues: {', '.join(quality_result['issues'])}")
            
            # Check if we have enough high-quality images (reduced to 1 for easier registration)
            if len(acceptable_images) < 1:  # Minimum 1 high-quality image
                raise Exception(
                    f"No high-quality images found. "
                    f"Need at least 1 image with quality score > {self.min_quality_score}%. "
                    f"Please retake images with better quality."
                )
            
            # Second pass: Check liveness (anti-spoofing) if enabled
            liveness_reports = []
            live_images = []
            
            if check_liveness and self.enable_liveness_check:
                logger.info(f"Performing liveness detection on {len(acceptable_images)} acceptable images")
                
                for image_path in acceptable_images:
                    liveness_result = self.check_image_liveness(image_path)
                    liveness_reports.append({
                        'image': os.path.basename(image_path),
                        'path': image_path,
                        **liveness_result
                    })
                    
                    if liveness_result['is_live'] and liveness_result['confidence'] >= self.min_liveness_confidence:
                        live_images.append(image_path)
                    else:
                        logger.warning(f"Image rejected due to liveness check: {os.path.basename(image_path)}")
                        logger.warning(f"  Confidence: {liveness_result['confidence']:.1f}%, "
                                     f"Spoof Probability: {liveness_result['spoof_probability']:.1f}%")
                
                # Check if we have enough live images (reduced to 1 for easier registration)
                if len(live_images) < 1:  # Minimum 1 live image
                    raise Exception(
                        f"No images passed liveness detection. "
                        f"Need at least 1 live image with confidence > {self.min_liveness_confidence}%. "
                        f"Please ensure you're using a live camera feed, not photos or screens."
                    )
                
                # Use live images for training
                images_for_training = live_images
            else:
                # Skip liveness check if disabled
                images_for_training = acceptable_images
                logger.info("Liveness check skipped (disabled or not required)")
            
            # Third pass: Extract face encodings from verified images
            face_encodings = []
            processed_count = 0
            
            for image_path in images_for_training:
                try:
                    # Load image
                    image = face_recognition.load_image_file(image_path)
                    
                    # Find face locations
                    face_locations = face_recognition.face_locations(image, model=self.model)
                    
                    if len(face_locations) == 0:
                        logger.warning(f"No face found in {os.path.basename(image_path)}")
                        continue
                    
                    if len(face_locations) > 1:
                        logger.warning(f"Multiple faces found in {os.path.basename(image_path)}, using the first one")
                    
                    # Get face encoding for the first face found
                    face_encodings_in_image = face_recognition.face_encodings(
                        image, 
                        face_locations, 
                        num_jitters=self.num_jitters
                    )
                    
                    if face_encodings_in_image:
                        face_encodings.append(face_encodings_in_image[0])
                        processed_count += 1
                        logger.info(f"Successfully encoded image {processed_count}: {os.path.basename(image_path)}")
                
                except Exception as e:
                    logger.warning(f"Failed to process image {image_path}: {str(e)}")
                    continue
            
            if processed_count < 3:
                raise Exception(f"Only {processed_count} images successfully encoded. Need at least 3.")
            
            # Calculate average encoding
            if face_encodings:
                avg_encoding = np.mean(face_encodings, axis=0)
                
                # Save the averaged encoding
                encoding_path = f"dataset/{user_id}/encoding.pkl"
                os.makedirs(f"dataset/{user_id}", exist_ok=True)
                
                with open(encoding_path, 'wb') as f:
                    pickle.dump({
                        'user_id': user_id,
                        'encoding': avg_encoding,
                        'model': self.model,
                        'valid_images': processed_count,
                        'tolerance': self.tolerance,
                        'quality_checked': True,
                        'min_quality_score': self.min_quality_score,
                        'liveness_checked': check_liveness and self.enable_liveness_check,
                        'min_liveness_confidence': self.min_liveness_confidence
                    }, f)
                
                # Also save as JSON for debugging
                json_path = f"dataset/{user_id}/encoding.json"
                with open(json_path, 'w') as f:
                    json.dump({
                        'user_id': user_id,
                        'encoding': avg_encoding.tolist(),
                        'model': self.model,
                        'valid_images': processed_count,
                        'tolerance': self.tolerance,
                        'quality_checked': True,
                        'min_quality_score': self.min_quality_score,
                        'liveness_checked': check_liveness and self.enable_liveness_check,
                        'min_liveness_confidence': self.min_liveness_confidence
                    }, f)
                
                logger.info(f"Face training completed for user {user_id} with {processed_count} high-quality images")
                
                # Calculate statistics
                liveness_checked = check_liveness and self.enable_liveness_check
                
                # Return detailed results
                return {
                    'success': True,
                    'message': f'Successfully trained with {processed_count} verified images',
                    'statistics': {
                        'total_images': len(image_paths),
                        'acceptable_images': len(acceptable_images),
                        'live_images': len(live_images) if liveness_checked else len(acceptable_images),
                        'rejected_images': len(image_paths) - processed_count,
                        'successfully_encoded': processed_count,
                        'average_quality_score': np.mean([r['overall_score'] for r in quality_reports]),
                        'average_liveness_confidence': np.mean([r['confidence'] for r in liveness_reports]) if liveness_reports else None,
                        'liveness_checked': liveness_checked
                    },
                    'quality_reports': quality_reports,
                    'liveness_reports': liveness_reports if liveness_checked else None
                }
            
            return {
                'success': False,
                'message': 'Failed to generate face encoding',
                'quality_reports': quality_reports,
                'liveness_reports': liveness_reports if check_liveness and self.enable_liveness_check else None
            }
            
        except Exception as e:
            logger.error(f"Face training failed for user {user_id}: {str(e)}")
            raise Exception(f"Face training failed: {str(e)}")
    
    def recognize_face(self, image_path: str) -> Optional[str]:
        """
        Recognize face from input image against all trained users
        """
        try:
            logger.info(f"Recognizing face from: {image_path}")
            
            # Load the input image
            image = face_recognition.load_image_file(image_path)
            
            # Find face locations in the input image
            face_locations = face_recognition.face_locations(image, model=self.model)
            
            if len(face_locations) == 0:
                logger.warning("No face detected in input image")
                return None
            
            # Get face encoding for the first face found
            face_encodings = face_recognition.face_encodings(
                image, 
                face_locations, 
                num_jitters=self.num_jitters
            )
            
            if not face_encodings:
                logger.warning("Could not encode face in input image")
                return None
            
            input_encoding = face_encodings[0]
            
            # Compare against all trained users
            best_match = None
            best_distance = float('inf')
            
            dataset_dir = "dataset"
            if not os.path.exists(dataset_dir):
                logger.warning("No dataset directory found")
                return None
            
            for user_dir in os.listdir(dataset_dir):
                user_path = os.path.join(dataset_dir, user_dir)
                if not os.path.isdir(user_path):
                    continue
                
                encoding_file = os.path.join(user_path, "encoding.pkl")
                if not os.path.exists(encoding_file):
                    continue
                
                try:
                    with open(encoding_file, 'rb') as f:
                        user_data = pickle.load(f)
                    
                    stored_encoding = user_data['encoding']
                    
                    # Calculate face distance
                    distance = face_recognition.face_distance([stored_encoding], input_encoding)[0]
                    
                    logger.info(f"Distance to user {user_data['user_id']}: {distance}")
                    
                    if distance < best_distance:
                        best_distance = distance
                        best_match = user_data['user_id']
                
                except Exception as e:
                    logger.error(f"Error comparing with user {user_dir}: {str(e)}")
                    continue
            
            # Check if best match is within tolerance
            if best_match and best_distance <= self.tolerance:
                confidence = (1 - best_distance) * 100
                logger.info(f"Face recognized: {best_match} (confidence: {confidence:.1f}%)")
                return best_match
            else:
                confidence = (1 - best_distance) * 100 if best_distance != float('inf') else 0
                logger.info(f"No matching face found. Best confidence: {confidence:.1f}%")
                return None
        
        except Exception as e:
            logger.error(f"Face recognition failed: {str(e)}")
            return None
    
    def find_duplicate_face(self, image_path: str, db, current_user_id: str) -> Optional[Dict]:
        """
        Check if the face in the image already exists in the database
        
        Args:
            image_path: Path to the face image to check
            db: Database session
            current_user_id: ID of the current user (to exclude from search)
            
        Returns:
            Dictionary with user info if duplicate found, None otherwise
        """
        try:
            # Load and process the input image
            image = face_recognition.load_image_file(image_path)
            face_locations = face_recognition.face_locations(image, model=self.model)
            
            if len(face_locations) == 0:
                logger.warning("No face detected in duplicate check image")
                return None
            
            # Get face encoding
            face_encodings = face_recognition.face_encodings(
                image, 
                face_locations,
                num_jitters=self.num_jitters
            )
            
            if not face_encodings:
                logger.warning("Could not encode face for duplicate check")
                return None
            
            input_encoding = face_encodings[0]
            
            # Compare against all registered users (except current user)
            dataset_dir = "dataset"
            if not os.path.exists(dataset_dir):
                return None
            
            from models import User
            
            for user_dir in os.listdir(dataset_dir):
                # Skip current user's directory
                if user_dir == current_user_id:
                    continue
                    
                user_path = os.path.join(dataset_dir, user_dir)
                if not os.path.isdir(user_path):
                    continue
                
                encoding_file = os.path.join(user_path, "encoding.pkl")
                if not os.path.exists(encoding_file):
                    continue
                
                try:
                    with open(encoding_file, 'rb') as f:
                        user_data = pickle.load(f)
                    
                    stored_encoding = user_data['encoding']
                    
                    # Calculate face distance
                    distance = face_recognition.face_distance([stored_encoding], input_encoding)[0]
                    
                    logger.info(f"Duplicate check - Distance to user {user_data['user_id']}: {distance:.3f}")
                    
                    # If face matches (distance < tolerance), it's a duplicate
                    if distance < self.tolerance:
                        # Get user details from database
                        user = db.query(User).filter(User.unique_id == user_data['user_id']).first()
                        if user:
                            logger.warning(f"Duplicate face detected! Already registered to: {user.full_name} ({user.unique_id})")
                            return {
                                'unique_id': user.unique_id,
                                'full_name': user.full_name,
                                'email': user.email,
                                'distance': float(distance)
                            }
                
                except Exception as e:
                    logger.error(f"Error checking user {user_dir} for duplicates: {str(e)}")
                    continue
            
            # No duplicate found
            logger.info("No duplicate face found - registration can proceed")
            return None
            
        except Exception as e:
            logger.error(f"Duplicate face detection failed: {str(e)}")
            return None
    
    def validate_face_image(self, image_path: str) -> bool:
        """
        Validate if image contains a detectable face
        """
        try:
            # Load image and check for faces
            image = face_recognition.load_image_file(image_path)
            face_locations = face_recognition.face_locations(image, model=self.model)
            return len(face_locations) > 0
        except Exception as e:
            logger.warning(f"Face validation failed: {str(e)}")
            return False
    
    def preprocess_image(self, image_path: str) -> str:
        """
        Preprocess image for better face detection
        """
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                raise Exception("Could not read image")
            
            # Convert BGR to RGB (face_recognition uses RGB)
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Resize if too large (face_recognition works better with smaller images)
            height, width = img_rgb.shape[:2]
            if width > 1000 or height > 1000:
                scale = min(1000/width, 1000/height)
                new_width = int(width * scale)
                new_height = int(height * scale)
                img_rgb = cv2.resize(img_rgb, (new_width, new_height))
            
            # Convert back to BGR for saving
            img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
            
            # Save preprocessed image
            processed_path = image_path.replace('.jpg', '_processed.jpg')
            cv2.imwrite(processed_path, img_bgr)
            
            return processed_path
        
        except Exception as e:
            logger.error(f"Image preprocessing failed: {str(e)}")
            return image_path
    
    def get_face_locations(self, image_path: str) -> List[tuple]:
        """
        Get face locations in an image (useful for debugging)
        """
        try:
            image = face_recognition.load_image_file(image_path)
            face_locations = face_recognition.face_locations(image, model=self.model)
            return face_locations
        except Exception as e:
            logger.error(f"Failed to get face locations: {str(e)}")
            return []
    
    def set_accuracy_mode(self, high_accuracy: bool = False):
        """
        Switch between HOG (fast) and CNN (accurate) models
        """
        if high_accuracy:
            self.model = "cnn"
            self.num_jitters = 2
            logger.info("Switched to high accuracy mode (CNN)")
        else:
            self.model = "hog"
            self.num_jitters = 1
            logger.info("Switched to fast mode (HOG)") 