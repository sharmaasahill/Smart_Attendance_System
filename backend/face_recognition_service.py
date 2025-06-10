import os
import json
import pickle
import numpy as np
import face_recognition
import cv2
from typing import List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FaceRecognitionService:
    def __init__(self):
        self.model = "hog"  # Use HOG model (faster) or 'cnn' for better accuracy
        self.tolerance = 0.6  # Lower is more strict
        self.num_jitters = 1  # Number of times to re-sample face when calculating encoding
    
    def train_user_face(self, user_id: str, image_paths: List[str]) -> bool:
        """
        Train face recognition model for a specific user using face_recognition library
        """
        try:
            logger.info(f"Training face recognition for user: {user_id}")
            
            # Extract face encodings from all images
            face_encodings = []
            valid_images = 0
            
            for image_path in image_paths:
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
                        valid_images += 1
                        logger.info(f"Processed image {valid_images}: {os.path.basename(image_path)}")
                
                except Exception as e:
                    logger.warning(f"Failed to process image {image_path}: {str(e)}")
                    continue
            
            if valid_images < 5:  # Minimum required images (reduced from 10)
                raise Exception(f"Only {valid_images} valid face images found. Need at least 5.")
            
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
                        'valid_images': valid_images,
                        'tolerance': self.tolerance
                    }, f)
                
                # Also save as JSON for debugging
                json_path = f"dataset/{user_id}/encoding.json"
                with open(json_path, 'w') as f:
                    json.dump({
                        'user_id': user_id,
                        'encoding': avg_encoding.tolist(),
                        'model': self.model,
                        'valid_images': valid_images,
                        'tolerance': self.tolerance
                    }, f)
                
                logger.info(f"Face training completed for user {user_id} with {valid_images} images")
                return True
            
            return False
            
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