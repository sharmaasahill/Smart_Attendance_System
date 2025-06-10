import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import Webcam from 'react-webcam';

const SimpleWebcamWithFaceDetection = forwardRef(({ 
  height = 400, 
  width = 640, 
  onFaceDetectionChange,
  ...props 
}, ref) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [actualFaceLocation, setActualFaceLocation] = useState(null);

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user"
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getScreenshot: () => webcamRef.current?.getScreenshot(),
    isReady: cameraReady && faceDetected,
    faceDetected: faceDetected,
    confidence: detectionConfidence
  }), [cameraReady, faceDetected, detectionConfidence]);

  // Simple face detection using brightness and edge detection
  const detectFace = () => {
    if (!webcamRef.current || !webcamRef.current.video) return;

    const video = webcamRef.current.video;
    if (video.readyState !== 4) return;

    // Create canvas for analysis
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Define target square area (same as visual green square)
      const targetSquareX = canvas.width * 0.3;
      const targetSquareY = canvas.height * 0.3;
      const targetSquareWidth = canvas.width * 0.4;
      const targetSquareHeight = canvas.height * 0.4;
      
      // Find face location in the entire frame first
      const faceLocation = findFaceLocation(imageData.data, canvas.width, canvas.height);
      
      let faceInTarget = false;
      let confidence = 0;
      
      if (faceLocation) {
        // Check if face center is within target square
        const faceCenterX = faceLocation.x + (faceLocation.width / 2);
        const faceCenterY = faceLocation.y + (faceLocation.height / 2);
        
        const withinTargetX = faceCenterX >= targetSquareX && faceCenterX <= (targetSquareX + targetSquareWidth);
        const withinTargetY = faceCenterY >= targetSquareY && faceCenterY <= (targetSquareY + targetSquareHeight);
        
        faceInTarget = withinTargetX && withinTargetY;
        
        if (faceInTarget) {
          // Calculate confidence based on face quality within target area
          confidence = calculateFaceQuality(imageData.data, canvas.width, canvas.height, faceLocation);
        }
        
        // Store actual face location for debugging (convert to percentage for responsive display)
        setActualFaceLocation({
          x: (faceLocation.x / canvas.width) * 100,
          y: (faceLocation.y / canvas.height) * 100,
          width: (faceLocation.width / canvas.width) * 100,
          height: (faceLocation.height / canvas.height) * 100,
          inTarget: faceInTarget
        });
      } else {
        setActualFaceLocation(null);
      }
      
      setFaceDetected(faceInTarget);
      setDetectionConfidence(confidence);
      
      if (onFaceDetectionChange) {
        onFaceDetectionChange(faceInTarget, confidence);
      }
      
    } catch (error) {
      console.warn('Face detection error:', error);
    }
  };

  // Find face location in the entire frame
  const findFaceLocation = (data, width, height) => {
    const faceRegions = [];
    const regionSize = 60; // Size of each analysis region
    const step = 20; // Step size for scanning
    
    // Scan the entire frame for face-like regions
    for (let y = 0; y < height - regionSize; y += step) {
      for (let x = 0; x < width - regionSize; x += step) {
        const quality = analyzeFaceRegion(data, width, height, x, y, regionSize, regionSize);
        
        if (quality.isFaceLike) {
          faceRegions.push({
            x,
            y,
            width: regionSize,
            height: regionSize,
            score: quality.score
          });
        }
      }
    }
    
    // Return the best face region
    if (faceRegions.length > 0) {
      return faceRegions.reduce((best, current) => 
        current.score > best.score ? current : best
      );
    }
    
    return null;
  };

  // Analyze a specific region for face-like features
  const analyzeFaceRegion = (data, frameWidth, frameHeight, regionX, regionY, regionWidth, regionHeight) => {
    let totalBrightness = 0;
    let edgeCount = 0;
    let pixelCount = 0;
    let skinToneCount = 0;
    
    // Sample pixels in the region
    for (let y = regionY; y < regionY + regionHeight; y += 3) {
      for (let x = regionX; x < regionX + regionWidth; x += 3) {
        if (y >= 0 && y < frameHeight && x >= 0 && x < frameWidth) {
          const idx = (y * frameWidth + x) * 4;
          if (idx < data.length - 3) {
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const brightness = (r + g + b) / 3;
            
            totalBrightness += brightness;
            pixelCount++;
            
            // Check for skin tone (rough approximation)
            if (r > 95 && g > 40 && b > 20 && r > g && r > b && r - g > 15) {
              skinToneCount++;
            }
            
            // Edge detection
            if (x < regionX + regionWidth - 3 && y < regionY + regionHeight - 3) {
              const rightIdx = (y * frameWidth + (x + 3)) * 4;
              const downIdx = ((y + 3) * frameWidth + x) * 4;
              
              if (rightIdx < data.length - 3 && downIdx < data.length - 3) {
                const rightBrightness = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
                const downBrightness = (data[downIdx] + data[downIdx + 1] + data[downIdx + 2]) / 3;
                
                const edgeStrength = Math.abs(brightness - rightBrightness) + Math.abs(brightness - downBrightness);
                if (edgeStrength > 25) {
                  edgeCount++;
                }
              }
            }
          }
        }
      }
    }
    
    if (pixelCount === 0) return { isFaceLike: false, score: 0 };
    
    const avgBrightness = totalBrightness / pixelCount;
    const edgeDensity = edgeCount / pixelCount;
    const skinToneRatio = skinToneCount / pixelCount;
    
    // More strict face detection criteria
    const hasGoodLighting = avgBrightness > 60 && avgBrightness < 180;
    const hasEnoughEdges = edgeDensity > 0.02;
    const hasSkinTone = skinToneRatio > 0.1;
    
    const isFaceLike = hasGoodLighting && hasEnoughEdges && hasSkinTone;
    const score = isFaceLike ? (edgeDensity * 100 + skinToneRatio * 50 + (avgBrightness / 2)) : 0;
    
    return { isFaceLike, score };
  };

  // Calculate face quality for confidence score
  const calculateFaceQuality = (data, width, height, faceLocation) => {
    const quality = analyzeFaceRegion(
      data, width, height, 
      faceLocation.x, faceLocation.y, 
      faceLocation.width, faceLocation.height
    );
    
    return Math.min(95, Math.max(60, quality.score));
  };

  // Start face detection when camera is ready
  useEffect(() => {
    if (cameraReady) {
      detectionIntervalRef.current = setInterval(detectFace, 200); // Check every 200ms
    } else {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [cameraReady]);

  const handleUserMedia = () => {
    setCameraReady(true);
  };

  const getBorderColor = () => {
    if (!cameraReady) return '#ffc107'; // Yellow when loading
    return faceDetected ? '#4caf50' : '#f44336'; // Green when face detected, red when not
  };

  const getStatusText = () => {
    if (!cameraReady) return 'Camera Loading...';
    if (actualFaceLocation && !faceDetected) return 'Face Found - Position in Green Square';
    if (faceDetected) return `Face in Target (${detectionConfidence}%)`;
    return 'No Face Detected';
  };

  const getStatusColor = () => {
    if (!cameraReady) return 'warning';
    return faceDetected ? 'success' : 'error';
  };

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      {/* Main Webcam */}
      <Webcam
        ref={webcamRef}
        height={height}
        width={width}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        onUserMedia={handleUserMedia}
        style={{
          borderRadius: '16px',
          border: `4px solid ${getBorderColor()}`,
          transition: 'border-color 0.3s ease',
          boxShadow: `0 0 20px ${getBorderColor()}40`,
        }}
        {...props}
      />
      
      {/* Face Detection Overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          right: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '12px',
          p: 1,
        }}
      >
        <Chip
          label={getStatusText()}
          color={getStatusColor()}
          size="small"
          sx={{
            fontWeight: 'bold',
            '& .MuiChip-label': {
              color: 'white',
            },
          }}
        />
        
        {faceDetected && (
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#4caf50',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': {
                  transform: 'scale(1)',
                  opacity: 1,
                },
                '50%': {
                  transform: 'scale(1.2)',
                  opacity: 0.7,
                },
                '100%': {
                  transform: 'scale(1)',
                  opacity: 1,
                },
              },
            }}
          />
        )}
      </Box>

      {/* Face Detection Square Border (when face detected) */}
      {faceDetected && cameraReady && (
        <Box
          sx={{
            position: 'absolute',
            top: '30%',
            left: '30%',
            width: '40%',
            height: '40%',
            border: '3px solid #4caf50',
            borderRadius: '8px',
            background: 'transparent',
            pointerEvents: 'none',
            animation: 'borderPulse 2s infinite',
            '@keyframes borderPulse': {
              '0%': {
                borderColor: '#4caf50',
                boxShadow: '0 0 10px rgba(76, 175, 80, 0.5)',
              },
              '50%': {
                borderColor: '#66bb6a',
                boxShadow: '0 0 20px rgba(76, 175, 80, 0.8)',
              },
              '100%': {
                borderColor: '#4caf50',
                boxShadow: '0 0 10px rgba(76, 175, 80, 0.5)',
              },
            },
          }}
        />
      )}

      {/* Actual Face Location Indicator (for debugging) */}
      {actualFaceLocation && cameraReady && (
        <Box
          sx={{
            position: 'absolute',
            top: `${actualFaceLocation.y}%`,
            left: `${actualFaceLocation.x}%`,
            width: `${actualFaceLocation.width}%`,
            height: `${actualFaceLocation.height}%`,
            border: actualFaceLocation.inTarget ? '2px solid #4caf50' : '2px solid #2196f3',
            borderRadius: '4px',
            background: 'transparent',
            pointerEvents: 'none',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '-20px',
              left: '0',
              background: actualFaceLocation.inTarget ? '#4caf50' : '#2196f3',
              color: 'white',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 'bold',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              top: '-18px',
              left: '0',
              background: actualFaceLocation.inTarget ? '#4caf50' : '#2196f3',
              color: 'white',
              padding: '1px 4px',
              fontSize: '9px',
              fontWeight: 'bold',
              borderRadius: '3px',
              whiteSpace: 'nowrap',
            }}
          >
            {actualFaceLocation.inTarget ? 'IN TARGET' : 'OUTSIDE'}
          </Typography>
        </Box>
      )}

      {/* No Face Detection Indicator */}
      {!faceDetected && cameraReady && (
        <Box
          sx={{
            position: 'absolute',
            top: '30%',
            left: '30%',
            width: '40%',
            height: '40%',
            border: '3px dashed #f44336',
            borderRadius: '8px',
            background: 'rgba(244, 67, 54, 0.1)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'shake 2s infinite',
            '@keyframes shake': {
              '0%, 100%': { transform: 'translateX(0)' },
              '25%': { transform: 'translateX(-2px)' },
              '75%': { transform: 'translateX(2px)' },
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: '#f44336',
              fontWeight: 'bold',
              textAlign: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              px: 1,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            Position Face Here
          </Typography>
        </Box>
      )}
    </Box>
  );
});

export default SimpleWebcamWithFaceDetection; 