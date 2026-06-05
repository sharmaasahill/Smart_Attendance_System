"""
Advanced Face Quality Checker - Market Standard Implementation
Ensures high-quality face images for reliable recognition
"""

import cv2
import numpy as np
from typing import Dict, Tuple, List
import face_recognition
from dataclasses import dataclass


@dataclass
class QualityMetrics:
    """Face quality metrics"""
    overall_score: float  # 0-100
    is_acceptable: bool
    face_size_score: float
    brightness_score: float
    sharpness_score: float
    pose_score: float
    eye_visibility_score: float
    issues: List[str]
    recommendations: List[str]


class FaceQualityChecker:
    """
    Market-standard face quality assessment system.
    Based on ISO/IEC 19794-5 standards for face image quality.
    """
    
    # Quality thresholds (market standard - adjusted for real-world webcam usage)
    MIN_FACE_SIZE = 50  # Minimum face width in pixels (very lenient for webcam)
    OPTIMAL_FACE_SIZE = 120  # Optimal face width
    MIN_BRIGHTNESS = 60  # Minimum average brightness (more lenient)
    MAX_BRIGHTNESS = 240  # Maximum average brightness (more lenient)
    OPTIMAL_BRIGHTNESS = 140  # Optimal brightness
    MIN_SHARPNESS = 30  # Laplacian variance threshold (very lenient for webcam)
    MAX_POSE_ANGLE = 25  # Maximum head rotation (degrees) - lenient
    MIN_EYE_ASPECT_RATIO = 0.15  # Minimum eye openness (more lenient)
    MIN_OVERALL_SCORE = 30  # Minimum acceptable quality score (very lenient for usability)
    
    def __init__(self):
        """Initialize face quality checker"""
        # Load cascade classifiers for detailed detection
        cascade_path = cv2.data.haarcascades
        self.face_cascade = cv2.CascadeClassifier(
            cascade_path + 'haarcascade_frontalface_default.xml'
        )
        self.eye_cascade = cv2.CascadeClassifier(
            cascade_path + 'haarcascade_eye.xml'
        )
    
    def check_quality(self, image: np.ndarray) -> QualityMetrics:
        """
        Comprehensive face quality check
        
        Args:
            image: Input image (BGR format)
            
        Returns:
            QualityMetrics with detailed assessment
        """
        issues = []
        recommendations = []
        
        # Convert to RGB for face_recognition library
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 1. Detect face locations
        face_locations = face_recognition.face_locations(rgb_image, model="hog")
        
        if not face_locations:
            return QualityMetrics(
                overall_score=0.0,
                is_acceptable=False,
                face_size_score=0.0,
                brightness_score=0.0,
                sharpness_score=0.0,
                pose_score=0.0,
                eye_visibility_score=0.0,
                issues=["No face detected in image"],
                recommendations=[
                    "Ensure face is clearly visible",
                    "Position face in center of frame",
                    "Improve lighting conditions"
                ]
            )
        
        # Use the first (largest) face
        top, right, bottom, left = face_locations[0]
        face_roi = image[top:bottom, left:right]
        face_gray = gray_image[top:bottom, left:right]
        
        # 2. Check face size
        face_size_score, face_size_issues = self._check_face_size(
            face_roi, (right - left, bottom - top)
        )
        issues.extend(face_size_issues)
        
        # 3. Check brightness/lighting
        brightness_score, brightness_issues = self._check_brightness(face_gray)
        issues.extend(brightness_issues)
        
        # 4. Check sharpness (blur detection)
        sharpness_score, sharpness_issues = self._check_sharpness(face_gray)
        issues.extend(sharpness_issues)
        
        # 5. Check pose/angle
        pose_score, pose_issues = self._check_pose(rgb_image, face_locations[0])
        issues.extend(pose_issues)
        
        # 6. Check eye visibility
        eye_score, eye_issues = self._check_eyes(face_roi, face_gray)
        issues.extend(eye_issues)
        
        # Calculate overall score (weighted average)
        weights = {
            'face_size': 0.20,
            'brightness': 0.20,
            'sharpness': 0.25,
            'pose': 0.20,
            'eyes': 0.15
        }
        
        overall_score = (
            face_size_score * weights['face_size'] +
            brightness_score * weights['brightness'] +
            sharpness_score * weights['sharpness'] +
            pose_score * weights['pose'] +
            eye_score * weights['eyes']
        )
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            face_size_score, brightness_score, sharpness_score, 
            pose_score, eye_score
        )
        
        # Accept if overall score meets threshold (don't require zero issues)
        # This makes the checker more practical for real-world usage
        is_acceptable = overall_score >= self.MIN_OVERALL_SCORE
        
        return QualityMetrics(
            overall_score=round(overall_score, 2),
            is_acceptable=is_acceptable,
            face_size_score=round(face_size_score, 2),
            brightness_score=round(brightness_score, 2),
            sharpness_score=round(sharpness_score, 2),
            pose_score=round(pose_score, 2),
            eye_visibility_score=round(eye_score, 2),
            issues=issues,
            recommendations=recommendations
        )
    
    def _check_face_size(self, face_roi: np.ndarray, dimensions: Tuple[int, int]) -> Tuple[float, List[str]]:
        """Check if face size is adequate"""
        width, height = dimensions
        issues = []
        
        if width < self.MIN_FACE_SIZE or height < self.MIN_FACE_SIZE:
            issues.append(f"Face too small ({width}x{height}px)")
            score = (min(width, height) / self.MIN_FACE_SIZE) * 50
        elif width > self.OPTIMAL_FACE_SIZE * 1.5:
            issues.append("Face too large - move back")
            score = 75.0
        else:
            # Score based on proximity to optimal size
            size_diff = abs(width - self.OPTIMAL_FACE_SIZE)
            score = max(50, 100 - (size_diff / self.OPTIMAL_FACE_SIZE) * 50)
        
        return min(100, score), issues
    
    def _check_brightness(self, face_gray: np.ndarray) -> Tuple[float, List[str]]:
        """Check lighting conditions"""
        avg_brightness = np.mean(face_gray)
        issues = []
        
        if avg_brightness < self.MIN_BRIGHTNESS:
            issues.append("Too dark - improve lighting")
            score = (avg_brightness / self.MIN_BRIGHTNESS) * 50
        elif avg_brightness > self.MAX_BRIGHTNESS:
            issues.append("Too bright - reduce lighting")
            score = 50.0
        else:
            # Score based on proximity to optimal brightness
            brightness_diff = abs(avg_brightness - self.OPTIMAL_BRIGHTNESS)
            score = max(50, 100 - (brightness_diff / 70) * 50)
        
        return min(100, score), issues
    
    def _check_sharpness(self, face_gray: np.ndarray) -> Tuple[float, List[str]]:
        """Check image sharpness (blur detection using Laplacian)"""
        laplacian_var = cv2.Laplacian(face_gray, cv2.CV_64F).var()
        issues = []
        
        if laplacian_var < self.MIN_SHARPNESS:
            issues.append("Image too blurry - hold still")
            score = (laplacian_var / self.MIN_SHARPNESS) * 50
        else:
            # Higher variance = sharper image
            score = min(100, 50 + (laplacian_var / 500) * 50)
        
        return min(100, score), issues
    
    def _check_pose(self, rgb_image: np.ndarray, face_location: Tuple) -> Tuple[float, List[str]]:
        """Check face pose/angle using facial landmarks"""
        issues = []
        
        try:
            # Get facial landmarks
            face_landmarks = face_recognition.face_landmarks(
                rgb_image, 
                [face_location]
            )
            
            if not face_landmarks:
                return 50.0, ["Could not detect facial features"]
            
            landmarks = face_landmarks[0]
            
            # Calculate nose-to-eyes angle to estimate head rotation
            nose_tip = np.array(landmarks['nose_tip'][2])
            left_eye = np.array(landmarks['left_eye'][0])
            right_eye = np.array(landmarks['right_eye'][3])
            
            # Calculate eye center
            eye_center = (left_eye + right_eye) / 2
            
            # Calculate angle
            dx = nose_tip[0] - eye_center[0]
            dy = nose_tip[1] - eye_center[1]
            angle = abs(np.degrees(np.arctan2(dy, dx)) - 90)
            
            if angle > self.MAX_POSE_ANGLE:
                issues.append(f"Face not frontal (angle: {angle:.1f}°)")
                score = max(0, 100 - (angle / self.MAX_POSE_ANGLE) * 100)
            else:
                score = 100 - (angle / self.MAX_POSE_ANGLE) * 30
            
            return min(100, score), issues
            
        except Exception as e:
            return 50.0, ["Could not analyze face pose"]
    
    def _check_eyes(self, face_roi: np.ndarray, face_gray: np.ndarray) -> Tuple[float, List[str]]:
        """Check if eyes are visible and open"""
        issues = []
        
        # Detect eyes using Haar Cascade
        eyes = self.eye_cascade.detectMultiScale(
            face_gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(20, 20)
        )
        
        if len(eyes) < 2:
            issues.append("Eyes not clearly visible")
            score = len(eyes) * 40
        else:
            # Both eyes detected
            score = 100.0
        
        return score, issues
    
    def _generate_recommendations(
        self, 
        face_size: float, 
        brightness: float, 
        sharpness: float, 
        pose: float, 
        eyes: float
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if face_size < 70:
            recommendations.append("Move closer to camera")
        elif face_size > 95:
            recommendations.append("Move back from camera")
        
        if brightness < 70:
            recommendations.append("Increase lighting or move to brighter area")
        elif brightness > 95:
            recommendations.append("Reduce direct lighting or move to less bright area")
        
        if sharpness < 70:
            recommendations.append("Hold camera steady and ensure focus")
        
        if pose < 70:
            recommendations.append("Look directly at camera (face forward)")
        
        if eyes < 70:
            recommendations.append("Keep eyes open and visible")
        
        if not recommendations:
            recommendations.append("Image quality is excellent!")
        
        return recommendations
    
    def visualize_quality(
        self, 
        image: np.ndarray, 
        metrics: QualityMetrics
    ) -> np.ndarray:
        """
        Draw quality metrics on image for visualization
        
        Args:
            image: Input image
            metrics: Quality metrics
            
        Returns:
            Image with quality overlay
        """
        output = image.copy()
        height, width = output.shape[:2]
        
        # Draw quality score bar
        bar_height = 40
        bar_width = width - 40
        bar_x = 20
        bar_y = height - 60
        
        # Background
        cv2.rectangle(
            output, 
            (bar_x, bar_y), 
            (bar_x + bar_width, bar_y + bar_height),
            (0, 0, 0), 
            -1
        )
        
        # Quality bar (colored based on score)
        score_width = int((metrics.overall_score / 100) * bar_width)
        if metrics.overall_score >= 80:
            color = (0, 255, 0)  # Green
        elif metrics.overall_score >= 60:
            color = (0, 255, 255)  # Yellow
        else:
            color = (0, 0, 255)  # Red
        
        cv2.rectangle(
            output,
            (bar_x, bar_y),
            (bar_x + score_width, bar_y + bar_height),
            color,
            -1
        )
        
        # Score text
        text = f"Quality: {metrics.overall_score:.1f}%"
        cv2.putText(
            output, 
            text,
            (bar_x + 10, bar_y + 25),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2
        )
        
        # Status text
        status = "ACCEPTABLE" if metrics.is_acceptable else "NEEDS IMPROVEMENT"
        status_color = (0, 255, 0) if metrics.is_acceptable else (0, 0, 255)
        cv2.putText(
            output,
            status,
            (bar_x + bar_width - 200, bar_y + 25),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            status_color,
            2
        )
        
        return output


# Helper function for easy integration
def check_face_quality(image: np.ndarray) -> Dict:
    """
    Convenience function to check face quality
    
    Args:
        image: Input image (BGR or RGB)
        
    Returns:
        Dictionary with quality metrics
    """
    checker = FaceQualityChecker()
    metrics = checker.check_quality(image)
    
    return {
        'overall_score': metrics.overall_score,
        'is_acceptable': metrics.is_acceptable,
        'scores': {
            'face_size': metrics.face_size_score,
            'brightness': metrics.brightness_score,
            'sharpness': metrics.sharpness_score,
            'pose': metrics.pose_score,
            'eye_visibility': metrics.eye_visibility_score
        },
        'issues': metrics.issues,
        'recommendations': metrics.recommendations
    }


if __name__ == "__main__":
    # Test the quality checker
    print("Face Quality Checker - Market Standard Implementation")
    print("=" * 60)
    print("Initialized successfully!")
    print("\nQuality Thresholds:")
    print(f"  - Minimum face size: {FaceQualityChecker.MIN_FACE_SIZE}px")
    print(f"  - Brightness range: {FaceQualityChecker.MIN_BRIGHTNESS}-{FaceQualityChecker.MAX_BRIGHTNESS}")
    print(f"  - Minimum sharpness: {FaceQualityChecker.MIN_SHARPNESS}")
    print(f"  - Maximum pose angle: {FaceQualityChecker.MAX_POSE_ANGLE}°")
    print(f"  - Minimum quality score: {FaceQualityChecker.MIN_OVERALL_SCORE}%")
