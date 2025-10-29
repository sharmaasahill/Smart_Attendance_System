#!/usr/bin/env python3
"""
Face Recognition Accuracy Testing Script
Run this to get actual accuracy statistics for your system
"""

import os
import json
import time
from datetime import datetime
from backend.face_recognition_service import FaceRecognitionService
import cv2
import numpy as np

class AccuracyTester:
    def __init__(self):
        self.face_service = FaceRecognitionService()
        self.results = {
            'total_tests': 0,
            'successful_recognitions': 0,
            'false_positives': 0,
            'false_negatives': 0,
            'lighting_conditions': {},
            'confidence_scores': [],
            'processing_times': []
        }
    
    def test_registered_users(self):
        """Test recognition accuracy with registered users"""
        print("[TESTING] Testing Registered User Recognition...")
        
        dataset_dir = "dataset"
        if not os.path.exists(dataset_dir):
            print("[ERROR] No dataset directory found")
            return
        
        for user_dir in os.listdir(dataset_dir):
            user_path = os.path.join(dataset_dir, user_dir)
            if not os.path.isdir(user_path):
                continue
            
            print(f"Testing user: {user_dir}")
            
            # Test with their own images
            for i in range(1, 6):  # Test first 5 images
                image_path = os.path.join(user_path, f"face_{i}.jpg")
                if os.path.exists(image_path):
                    start_time = time.time()
                    result = self.face_service.recognize_face(image_path)
                    processing_time = time.time() - start_time
                    
                    self.results['total_tests'] += 1
                    self.results['processing_times'].append(processing_time)
                    
                    if result == user_dir:
                        self.results['successful_recognitions'] += 1
                        print(f"  [SUCCESS] {image_path}: RECOGNIZED ({processing_time:.2f}s)")
                    else:
                        self.results['false_negatives'] += 1
                        print(f"  [FAILED] {image_path}: NOT RECOGNIZED ({processing_time:.2f}s)")
    
    def test_different_lighting(self):
        """Test with different lighting conditions (simulated)"""
        print("[TESTING] Testing Different Lighting Conditions...")
        
        # This would require actual test images with different lighting
        # For now, we'll simulate by adjusting image brightness
        dataset_dir = "dataset"
        if not os.path.exists(dataset_dir):
            return
        
        lighting_conditions = {
            'bright': 1.3,    # Increase brightness
            'normal': 1.0,    # Original
            'dim': 0.7,       # Decrease brightness
            'dark': 0.4       # Very dim
        }
        
        # Take first user's first image for testing
        for user_dir in os.listdir(dataset_dir):
            user_path = os.path.join(dataset_dir, user_dir)
            if os.path.isdir(user_path):
                test_image_path = os.path.join(user_path, "face_1.jpg")
                if os.path.exists(test_image_path):
                    
                    for condition, multiplier in lighting_conditions.items():
                        # Adjust image brightness
                        adjusted_path = self.adjust_image_brightness(test_image_path, multiplier, condition)
                        
                        start_time = time.time()
                        result = self.face_service.recognize_face(adjusted_path)
                        processing_time = time.time() - start_time
                        
                        success = result == user_dir
                        
                        if condition not in self.results['lighting_conditions']:
                            self.results['lighting_conditions'][condition] = {'total': 0, 'success': 0}
                        
                        self.results['lighting_conditions'][condition]['total'] += 1
                        if success:
                            self.results['lighting_conditions'][condition]['success'] += 1
                        
                        status = "[SUCCESS]" if success else "[FAILED]"
                        print(f"  {condition.upper()}: {status} ({processing_time:.2f}s)")
                        
                        # Clean up test image
                        if os.path.exists(adjusted_path):
                            os.remove(adjusted_path)
                    
                    break  # Only test with first user
                break
    
    def adjust_image_brightness(self, image_path, multiplier, condition):
        """Adjust image brightness to simulate different lighting"""
        img = cv2.imread(image_path)
        if img is None:
            return image_path
        
        # Adjust brightness
        bright_img = cv2.convertScaleAbs(img, alpha=multiplier, beta=0)
        
        # Save adjusted image
        adjusted_path = f"temp_{condition}_{os.path.basename(image_path)}"
        cv2.imwrite(adjusted_path, bright_img)
        
        return adjusted_path
    
    def test_unknown_faces(self):
        """Test rejection of unknown faces (if test images available)"""
        print("[TESTING] Testing Unknown Face Rejection...")
        
        # This would require test images of people not in the system
        # For demonstration, we'll create a synthetic test
        print("  [INFO] Would need unknown face images for real testing")
        print("  [INFO] Current system should reject unknown faces")
    
    def calculate_statistics(self):
        """Calculate final accuracy statistics"""
        if self.results['total_tests'] == 0:
            return
        
        overall_accuracy = (self.results['successful_recognitions'] / self.results['total_tests']) * 100
        avg_processing_time = np.mean(self.results['processing_times'])
        
        print("\n" + "="*50)
        print("ACCURACY TEST RESULTS")
        print("="*50)
        print(f"[RESULT] Overall Recognition Accuracy: {overall_accuracy:.1f}%")
        print(f"[RESULT] Average Processing Time: {avg_processing_time:.2f} seconds")
        print(f"[RESULT] Total Tests Performed: {self.results['total_tests']}")
        print(f"[RESULT] Successful Recognitions: {self.results['successful_recognitions']}")
        print(f"[RESULT] Failed Recognitions: {self.results['false_negatives']}")
        
        # Lighting condition results
        if self.results['lighting_conditions']:
            print("\n[LIGHTING CONDITIONS]")
            for condition, data in self.results['lighting_conditions'].items():
                if data['total'] > 0:
                    accuracy = (data['success'] / data['total']) * 100
                    print(f"  {condition.upper()}: {accuracy:.1f}% ({data['success']}/{data['total']})")
        
        # Save results to JSON
        results_file = f"accuracy_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(results_file, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'overall_accuracy': overall_accuracy,
                'avg_processing_time': avg_processing_time,
                'detailed_results': self.results
            }, f, indent=2)
        
        print(f"\n[SAVED] Detailed results saved to: {results_file}")
        
        return overall_accuracy

def main():
    print("Face Recognition Accuracy Testing")
    print("="*50)
    
    tester = AccuracyTester()
    
    # Run tests
    tester.test_registered_users()
    tester.test_different_lighting()
    tester.test_unknown_faces()
    
    # Calculate and display results
    accuracy = tester.calculate_statistics()
    
    print("\n[SUCCESS] Testing Complete!")
    print(f"[RESULT] Your system's measured accuracy: {accuracy:.1f}%")

if __name__ == "__main__":
    main()
