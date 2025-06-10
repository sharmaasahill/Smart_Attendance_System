import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

const SmartWebcam = ({ 
  onCapture, 
  height = 400, 
  width = 640, 
  style = {},
  showDetection = true,
  detectionColor = '#ff0000',
  borderColor = '#1976d2',
  ...props 
}) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0);
  const [confidence, setConfidence] = useState(0);

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user"
  };

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        setModelsLoaded(true);
      } catch (error) {
        console.warn('Face detection models not available, using basic mode');
        setModelsLoaded(false);
      }
    };

    loadModels();
  }, []);

  // Face detection function
  const detectFaces = useCallback(async () => {
    if (!modelsLoaded || !webcamRef.current || !canvasRef.current) return;

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    
    if (video.readyState !== 4) return;

    const displaySize = { width: width, height: height };
    faceapi.matchDimensions(canvas, displaySize);

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      // Clear canvas
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (resizedDetections.length > 0) {
        setFaceDetected(true);
        setDetectionCount(prev => prev + 1);
        
        // Calculate average confidence
        const avgConfidence = resizedDetections.reduce((sum, det) => sum + det.detection.score, 0) / resizedDetections.length;
        setConfidence(Math.round(avgConfidence * 100));

        // Draw detection boxes with animation
        resizedDetections.forEach((detection, index) => {
          const box = detection.detection.box;
          
          // Animated pulsing effect
          const pulseIntensity = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
          
          // Draw main detection box
          ctx.strokeStyle = detectionColor;
          ctx.lineWidth = 3;
          ctx.globalAlpha = pulseIntensity;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          
          // Draw corner brackets for advanced look
          const cornerLength = 20;
          ctx.lineWidth = 4;
          ctx.globalAlpha = 1;
          
          // Top-left corner
          ctx.beginPath();
          ctx.moveTo(box.x, box.y + cornerLength);
          ctx.lineTo(box.x, box.y);
          ctx.lineTo(box.x + cornerLength, box.y);
          ctx.stroke();
          
          // Top-right corner
          ctx.beginPath();
          ctx.moveTo(box.x + box.width - cornerLength, box.y);
          ctx.lineTo(box.x + box.width, box.y);
          ctx.lineTo(box.x + box.width, box.y + cornerLength);
          ctx.stroke();
          
          // Bottom-left corner
          ctx.beginPath();
          ctx.moveTo(box.x, box.y + box.height - cornerLength);
          ctx.lineTo(box.x, box.y + box.height);
          ctx.lineTo(box.x + cornerLength, box.y + box.height);
          ctx.stroke();
          
          // Bottom-right corner
          ctx.beginPath();
          ctx.moveTo(box.x + box.width - cornerLength, box.y + box.height);
          ctx.lineTo(box.x + box.width, box.y + box.height);
          ctx.lineTo(box.x + box.width, box.y + box.height - cornerLength);
          ctx.stroke();
          
          // Draw confidence text
          ctx.fillStyle = detectionColor;
          ctx.font = 'bold 14px Arial';
          ctx.fillText(
            `Face ${index + 1} - ${Math.round(detection.detection.score * 100)}%`,
            box.x,
            box.y - 10
          );
          
          // Draw scanning line effect
          const scanLineY = box.y + (Date.now() * 0.1) % box.height;
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.moveTo(box.x, scanLineY);
          ctx.lineTo(box.x + box.width, scanLineY);
          ctx.stroke();
        });
      } else {
        setFaceDetected(false);
        setConfidence(0);
      }
    } catch (error) {
      console.error('Face detection error:', error);
    }
  }, [modelsLoaded, width, height, detectionColor]);

  // Start face detection loop
  useEffect(() => {
    if (!showDetection || !modelsLoaded) return;

    const interval = setInterval(detectFaces, 100); // 10 FPS detection
    return () => clearInterval(interval);
  }, [detectFaces, showDetection, modelsLoaded]);

  // Enhanced capture function
  const captureImage = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (onCapture) {
        onCapture(imageSrc, {
          faceDetected,
          confidence,
          timestamp: new Date().toISOString()
        });
      }
      return imageSrc;
    }
  }, [onCapture, faceDetected, confidence]);

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      {/* Status indicators */}
      {showDetection && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: -40, 
            left: 0, 
            right: 0, 
            display: 'flex', 
            gap: 1, 
            justifyContent: 'center',
            zIndex: 10
          }}
        >
          <Chip 
            label={modelsLoaded ? "AI Detection: ON" : "Basic Mode"} 
            size="small" 
            color={modelsLoaded ? "success" : "warning"} 
          />
          {faceDetected && (
            <Chip 
              label={`Face Detected (${confidence}%)`} 
              size="small" 
              color="error"
              sx={{ 
                animation: 'pulse 1s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.7 },
                  '100%': { opacity: 1 }
                }
              }}
            />
          )}
        </Box>
      )}

      {/* Webcam container */}
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          height={height}
          width={width}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          style={{
            borderRadius: '12px',
            border: `3px solid ${borderColor}`,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            ...style
          }}
          {...props}
        />
        
        {/* Face detection overlay canvas */}
        {showDetection && (
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              borderRadius: '12px',
              pointerEvents: 'none'
            }}
          />
        )}

        {/* Corner scanning effect */}
        {showDetection && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: '12px',
              background: `
                linear-gradient(90deg, ${detectionColor}40 0%, transparent 20%),
                linear-gradient(180deg, ${detectionColor}40 0%, transparent 20%),
                linear-gradient(-90deg, ${detectionColor}40 0%, transparent 20%),
                linear-gradient(0deg, ${detectionColor}40 0%, transparent 20%)
              `,
              backgroundSize: '100% 2px, 2px 100%, 100% 2px, 2px 100%',
              backgroundPosition: 'top, right, bottom, left',
              backgroundRepeat: 'no-repeat',
              opacity: faceDetected ? 0.8 : 0.3,
              transition: 'opacity 0.3s ease',
              pointerEvents: 'none',
              animation: faceDetected ? 'scanning 2s infinite' : 'none',
              '@keyframes scanning': {
                '0%': { 
                  backgroundSize: '0% 2px, 2px 0%, 0% 2px, 2px 0%'
                },
                '25%': { 
                  backgroundSize: '100% 2px, 2px 0%, 0% 2px, 2px 0%'
                },
                '50%': { 
                  backgroundSize: '100% 2px, 2px 100%, 0% 2px, 2px 0%'
                },
                '75%': { 
                  backgroundSize: '100% 2px, 2px 100%, 100% 2px, 2px 0%'
                },
                '100%': { 
                  backgroundSize: '100% 2px, 2px 100%, 100% 2px, 2px 100%'
                }
              }
            }}
          />
        )}
      </Box>

      {/* Detection statistics */}
      {showDetection && modelsLoaded && (
        <Box 
          sx={{ 
            position: 'absolute', 
            bottom: -50, 
            left: 0, 
            right: 0, 
            textAlign: 'center' 
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Detections: {detectionCount} | Status: {faceDetected ? 'LOCKED' : 'SCANNING...'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SmartWebcam; 