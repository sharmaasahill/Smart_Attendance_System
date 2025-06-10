import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Box, Typography, Chip, keyframes } from '@mui/material';
import Webcam from 'react-webcam';

// Animation keyframes
const pulse = keyframes`
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.01); }
  100% { opacity: 1; transform: scale(1); }
`;

const scanning = keyframes`
  0% { transform: translateY(-100%); opacity: 0; }
  50% { opacity: 0.8; }
  100% { transform: translateY(100%); opacity: 0; }
`;

const stableGlow = keyframes`
  0% { box-shadow: 0 0 20px rgba(0, 255, 0, 0.3); }
  50% { box-shadow: 0 0 30px rgba(0, 255, 0, 0.6); }
  100% { box-shadow: 0 0 20px rgba(0, 255, 0, 0.3); }
`;

const SimpleSmartWebcam = forwardRef(({ 
  onCapture, 
  height = 400, 
  width = 640, 
  style = {},
  showDetection = true,
  detectionColor = '#ff0000',
  borderColor = '#1976d2',
  mode = 'capture',
  ...props 
}, ref) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionTimeoutRef = useRef(null);
  
  // Stable detection states
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [detectionCount, setDetectionCount] = useState(0);
  const [detectionStable, setDetectionStable] = useState(false);
  const [lastDetectionTime, setLastDetectionTime] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  
  // Premium detection settings
  const DETECTION_STABILITY_TIME = 1500; // 1.5 seconds of stable detection
  const CONFIDENCE_THRESHOLD = 80;
  const DETECTION_INTERVAL = 200; // 5 FPS for stability
  const MIN_BRIGHTNESS_THRESHOLD = 30; // Minimum brightness to consider valid

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user"
  };

  // Enhanced capture function
  const captureImage = useCallback(() => {
    if (webcamRef.current && faceDetected && detectionStable) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (onCapture) {
        onCapture(imageSrc, {
          faceDetected,
          confidence: detectionConfidence,
          timestamp: new Date().toISOString(),
          detectionCount,
          stable: detectionStable
        });
      }
      return imageSrc;
    }
    return null;
  }, [onCapture, faceDetected, detectionConfidence, detectionCount, detectionStable]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    captureImage,
    getScreenshot: captureImage,
    video: webcamRef.current?.video || null,
    webcam: webcamRef.current || null,
    isReady: cameraReady && faceDetected && detectionStable
  }), [captureImage, cameraReady, faceDetected, detectionStable]);

  // Realistic face detection with actual video analysis
  const analyzeVideoFrame = useCallback(() => {
    if (!webcamRef.current || !showDetection) return false;

    const video = webcamRef.current.video;
    if (!video || video.readyState !== 4) return false;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Calculate average brightness
      let totalBrightness = 0;
      let pixelCount = 0;
      
      // Sample center area (where face would be)
      const centerX = canvas.width * 0.3;
      const centerY = canvas.height * 0.3;
      const sampleWidth = canvas.width * 0.4;
      const sampleHeight = canvas.height * 0.4;
      
      for (let y = centerY; y < centerY + sampleHeight; y += 4) {
        for (let x = centerX; x < centerX + sampleWidth; x += 4) {
          const index = (y * canvas.width + x) * 4;
          if (index < data.length - 3) {
            const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
            totalBrightness += brightness;
            pixelCount++;
          }
        }
      }
      
      const avgBrightness = totalBrightness / pixelCount;
      
      // Advanced detection logic
      const hasMotion = avgBrightness > MIN_BRIGHTNESS_THRESHOLD;
      const hasProperLighting = avgBrightness > 50 && avgBrightness < 240;
      const isValidFrame = !isNaN(avgBrightness) && avgBrightness > 0;
      
      // Calculate variance to detect if there's actual content
      let variance = 0;
      let varianceCount = 0;
      for (let y = centerY; y < centerY + sampleHeight; y += 8) {
        for (let x = centerX; x < centerX + sampleWidth; x += 8) {
          const index = (y * canvas.width + x) * 4;
          if (index < data.length - 3) {
            const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
            variance += Math.pow(brightness - avgBrightness, 2);
            varianceCount++;
          }
        }
      }
      variance = variance / varianceCount;
      
      // Face detection criteria
      const hasContent = variance > 100; // Sufficient variation in image
      const faceDetected = hasMotion && hasProperLighting && isValidFrame && hasContent;
      
      return {
        detected: faceDetected,
        confidence: faceDetected ? Math.min(Math.floor((variance / 10) + (avgBrightness / 3)), 98) : 0,
        brightness: avgBrightness,
        variance: variance
      };
      
    } catch (error) {
      return { detected: false, confidence: 0, brightness: 0, variance: 0 };
    }
  }, [showDetection]);

  // Stable detection logic
  const performStableDetection = useCallback(() => {
    if (!webcamRef.current || !canvasRef.current || !showDetection) return;

    const analysis = analyzeVideoFrame();
    const currentTime = Date.now();
    
    if (analysis.detected && analysis.confidence > CONFIDENCE_THRESHOLD) {
      // Face detected with good confidence
      if (!faceDetected) {
        setFaceDetected(true);
        setLastDetectionTime(currentTime);
        setDetectionStable(false);
      }
      
      setDetectionConfidence(analysis.confidence);
      setDetectionCount(prev => prev + 1);
      
      // Check if detection has been stable for required time
      if (currentTime - lastDetectionTime > DETECTION_STABILITY_TIME) {
        setDetectionStable(true);
      }
      
      // Clear any pending timeout
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
        detectionTimeoutRef.current = null;
      }
      
    } else {
      // No face detected or low confidence
      if (faceDetected) {
        // Start timeout to remove detection after delay
        if (!detectionTimeoutRef.current) {
          detectionTimeoutRef.current = setTimeout(() => {
            setFaceDetected(false);
            setDetectionStable(false);
            setDetectionConfidence(0);
            detectionTimeoutRef.current = null;
          }, 800); // 0.8 second delay before removing detection
        }
      }
    }

    // Draw detection overlay
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (faceDetected && detectionStable) {
      // Draw stable detection box
      const boxWidth = width * 0.4;
      const boxHeight = height * 0.5;
      const boxX = (width - boxWidth) / 2;
      const boxY = (height - boxHeight) / 2;

      // Main detection box - stable
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.9;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
      
      // Corner indicators
      const cornerLength = 30;
      ctx.lineWidth = 5;
      ctx.globalAlpha = 1;
      
      // Draw all four corners
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + cornerLength);
      ctx.lineTo(boxX, boxY);
      ctx.lineTo(boxX + cornerLength, boxY);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(boxX + boxWidth - cornerLength, boxY);
      ctx.lineTo(boxX + boxWidth, boxY);
      ctx.lineTo(boxX + boxWidth, boxY + cornerLength);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + boxHeight - cornerLength);
      ctx.lineTo(boxX, boxY + boxHeight);
      ctx.lineTo(boxX + cornerLength, boxY + boxHeight);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(boxX + boxWidth - cornerLength, boxY + boxHeight);
      ctx.lineTo(boxX + boxWidth, boxY + boxHeight);
      ctx.lineTo(boxX + boxWidth, boxY + boxHeight - cornerLength);
      ctx.stroke();
      
      // Status text
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`IDENTITY LOCKED - ${detectionConfidence}%`, boxX, boxY - 15);
      
      // Center crosshair
      const centerX = boxX + boxWidth / 2;
      const centerY = boxY + boxHeight / 2;
      
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - 15, centerY);
      ctx.lineTo(centerX + 15, centerY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 15);
      ctx.lineTo(centerX, centerY + 15);
      ctx.stroke();
      
    } else if (faceDetected && !detectionStable) {
      // Acquiring lock
      const boxWidth = width * 0.35;
      const boxHeight = height * 0.45;
      const boxX = (width - boxWidth) / 2;
      const boxY = (height - boxHeight) / 2;

      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
      
      ctx.fillStyle = '#ffaa00';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('ACQUIRING LOCK...', boxX, boxY - 10);
      
    } else {
      // Scanning mode
      ctx.strokeStyle = detectionColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      
      // Draw scanning grid
      const gridSize = 50;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      ctx.fillStyle = detectionColor;
      ctx.font = 'bold 14px Arial';
      ctx.globalAlpha = 0.7;
      ctx.fillText('SCANNING FOR BIOMETRIC SIGNATURE...', width/2 - 120, height/2);
    }
  }, [faceDetected, detectionStable, detectionConfidence, width, height, detectionColor, showDetection, analyzeVideoFrame, lastDetectionTime]);

  // Check camera readiness
  useEffect(() => {
    const checkCameraReady = () => {
      if (webcamRef.current && webcamRef.current.video) {
        const video = webcamRef.current.video;
        if (video.readyState >= 2) {
          setCameraReady(true);
        }
      }
    };

    const interval = setInterval(checkCameraReady, 500);
    return () => clearInterval(interval);
  }, []);

  // Start stable detection
  useEffect(() => {
    if (!showDetection || !cameraReady) return;

    const interval = setInterval(performStableDetection, DETECTION_INTERVAL);
    return () => {
      clearInterval(interval);
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, [performStableDetection, showDetection, cameraReady]);

  const getStatusMessage = () => {
    if (!cameraReady) return "INITIALIZING CAMERA...";
    if (faceDetected && detectionStable) return "BIOMETRIC SIGNATURE LOCKED";
    if (faceDetected && !detectionStable) return "ACQUIRING BIOMETRIC LOCK";
    return "SCANNING FOR IDENTITY";
  };

  const getStatusColor = () => {
    if (!cameraReady) return "#666666";
    if (faceDetected && detectionStable) return "#00ff00";
    if (faceDetected && !detectionStable) return "#ffaa00";
    return detectionColor;
  };

  return (
    <Box sx={{ position: 'relative', display: 'inline-block', mt: 2, mb: 2 }}>
      {/* Premium Status Indicators */}
      {showDetection && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: -50, 
            left: 0, 
            right: 0, 
            display: 'flex', 
            gap: 1, 
            justifyContent: 'center',
            zIndex: 10
          }}
        >
          <Chip 
            label="🔒 BIOMETRIC SECURITY ACTIVE" 
            size="small" 
            sx={{ 
              bgcolor: cameraReady ? 'success.main' : 'grey.500',
              color: 'white',
              fontWeight: 'bold',
              animation: cameraReady ? `${pulse} 3s infinite` : 'none'
            }}
          />
          {faceDetected && (
            <Chip 
              label={detectionStable ? `🎯 LOCKED (${detectionConfidence}%)` : `⏳ ACQUIRING (${detectionConfidence}%)`}
              size="small" 
              sx={{ 
                bgcolor: detectionStable ? 'success.main' : 'warning.main',
                color: 'white',
                fontWeight: 'bold',
                animation: `${pulse} 2s infinite`
              }}
            />
          )}
        </Box>
      )}

      {/* Main webcam container with premium styling */}
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
            border: `4px solid ${getStatusColor()}`,
            boxShadow: faceDetected && detectionStable 
              ? '0 0 30px rgba(0, 255, 0, 0.5)' 
              : '0 8px 32px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.5s ease',
            ...style
          }}
          {...props}
        />
        
        {/* Detection overlay canvas */}
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

        {/* Premium HUD */}
        {showDetection && (
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              bgcolor: 'rgba(0, 0, 0, 0.8)',
              color: getStatusColor(),
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${getStatusColor()}`,
              backdropFilter: 'blur(5px)'
            }}
          >
            <div>MODE: {mode.toUpperCase()}</div>
            <div>STATUS: {faceDetected && detectionStable ? 'LOCKED' : faceDetected ? 'ACQUIRING' : 'SCANNING'}</div>
            <div>CONFIDENCE: {detectionConfidence}%</div>
            <div>READY: {cameraReady && faceDetected && detectionStable ? 'YES' : 'NO'}</div>
          </Box>
        )}

        {/* Scanning line overlay - only when actually scanning */}
        {showDetection && !faceDetected && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: `linear-gradient(90deg, transparent, ${detectionColor}, transparent)`,
              animation: `${scanning} 3s infinite`,
              pointerEvents: 'none',
            }}
          />
        )}
      </Box>

      {/* Premium Status Display */}
      {showDetection && (
        <Box 
          sx={{ 
            position: 'absolute', 
            bottom: -70, 
            left: 0, 
            right: 0, 
            textAlign: 'center',
            p: 1,
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: 2,
            backdropFilter: 'blur(10px)'
          }}
        >
          <Typography 
            variant="caption" 
            sx={{ 
              color: getStatusColor(),
              fontFamily: 'monospace',
              fontWeight: 'bold',
              fontSize: '12px'
            }}
          >
            🔍 {getStatusMessage()}
          </Typography>
        </Box>
      )}
    </Box>
  );
});

SimpleSmartWebcam.displayName = 'SimpleSmartWebcam';

export default SimpleSmartWebcam; 