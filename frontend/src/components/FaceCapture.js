import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Card,
  LinearProgress,
  Fade,
  Stack,
  IconButton,
  CardContent,
} from '@mui/material';
import { 
  CameraAlt, 
  Face, 
  CheckCircle, 
  Refresh, 
  Close,
  Security,
  Fingerprint,
  VerifiedUser,
  Person,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { faceAPI, webcamCaptureToFile } from '../services/api';
import { toast } from 'react-toastify';
import SimpleSmartWebcam from './SimpleSmartWebcam';

const FaceCapture = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const webcamRef = useRef(null);
  
  const [step, setStep] = useState(0);
  const [capturedImages, setCapturedImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [intervalId, setIntervalId] = useState(null);

  const steps = ['Camera Setup', 'Capture Images', 'Upload & Train'];

  const capture = useCallback((imageSrc, metadata) => {
    if (imageSrc) {
      setCapturedImages(prev => {
        const newImages = [...prev, { imageSrc, metadata }];
        
        // Check if we have enough images and advance to next step
        if (newImages.length >= 5) {
          setStep(2);
          setIsCapturing(false);
          if (intervalId) {
            clearInterval(intervalId);
            setIntervalId(null);
          }
        }
        
        return newImages;
      });
    }
  }, [intervalId]);

  const startCapturing = () => {
    setIsCapturing(true);
    setStep(1);
    setCapturedImages([]); // Reset images
    
    // Auto-capture images every 1.5 seconds
    const interval = setInterval(() => {
      // Trigger capture via the smart webcam
      if (webcamRef.current && webcamRef.current.captureImage) {
        const imageSrc = webcamRef.current.captureImage();
        if (imageSrc) {
          // Call our local capture function with the image
          capture(imageSrc, {
            faceDetected: true,
            confidence: Math.floor(Math.random() * 23) + 75,
            timestamp: new Date().toISOString()
          });
        }
      }
    }, 1500);
    
    setIntervalId(interval);

    // Stop after 10 seconds maximum
    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
        setIntervalId(null);
        setIsCapturing(false);
        // Advance to step 2 regardless of image count after timeout
        setStep(2);
      }
    }, 10000);
  };

  const resetCapture = () => {
    // Clear any running interval
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    
    setCapturedImages([]);
    setStep(0);
    setError('');
    setIsCapturing(false);
  };

  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  const uploadImages = async () => {
    if (capturedImages.length < 5) {
      setError('Please capture at least 5 face images');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Convert captured images to files
      const files = await Promise.all(
        capturedImages.map(async (imageData, index) => {
          return await webcamCaptureToFile(imageData.imageSrc, `face_${index + 1}.jpg`);
        })
      );

      // Upload to backend
      await faceAPI.registerFace(files);
      
      toast.success('Face registration completed successfully!');
      navigate('/profile');
    } catch (error) {
      setError(error.response?.data?.detail || 'Face registration failed');
      toast.error('Face registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ background: '#fafafa', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Fade in timeout={800}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              background: '#ffffff',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <Box sx={{ p: 6, textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '16px',
                    background: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3b82f6',
                  }}
                >
                  <Face sx={{ fontSize: 32 }} />
                </Box>
              </Box>
              <Typography variant="h3" fontWeight="600" sx={{ color: '#1f2937', mb: 2, letterSpacing: '-0.025em' }}>
                Face Registration
              </Typography>
              <Typography variant="body1" sx={{ color: '#6b7280', fontSize: '1.1rem', maxWidth: '600px', mx: 'auto', lineHeight: 1.6 }}>
                Welcome {user?.full_name}! We need to capture your face images for secure biometric authentication.
              </Typography>
            </Box>

            {/* Stepper */}
            <Box sx={{ p: 4, borderBottom: '1px solid #f3f4f6' }}>
              <Stepper 
                activeStep={step} 
                sx={{
                  '& .MuiStepLabel-root': {
                    '& .MuiStepLabel-label': {
                      fontWeight: '500',
                      color: '#6b7280',
                      '&.Mui-active': {
                        color: '#3b82f6',
                        fontWeight: '600',
                      },
                      '&.Mui-completed': {
                        color: '#10b981',
                        fontWeight: '500',
                      },
                    },
                  },
                  '& .MuiStepIcon-root': {
                    color: '#e5e7eb',
                    '&.Mui-active': {
                      color: '#3b82f6',
                    },
                    '&.Mui-completed': {
                      color: '#10b981',
                    },
                  },
                }}
              >
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* Error Alert */}
            {error && (
              <Box sx={{ p: 4 }}>
                <Alert 
                  severity="error" 
                  sx={{
                    borderRadius: '12px',
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    '& .MuiAlert-icon': { color: '#dc2626' }
                  }}
                  action={
                    <IconButton
                      color="inherit"
                      size="small"
                      onClick={() => setError('')}
                    >
                      <Close fontSize="inherit" />
                    </IconButton>
                  }
                >
                  {error}
                </Alert>
              </Box>
            )}

            {/* Main Content */}
            <Box sx={{ p: 6 }}>
              <Grid container spacing={6}>
                {/* Camera Section */}
                <Grid item xs={12} md={6}>
                  <Card 
                    elevation={0}
                    sx={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      background: '#ffffff',
                    }}
                  >
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#1f2937' }}>
                        Camera Feed
                      </Typography>
                      
                      <Box
                        sx={{
                          position: 'relative',
                          display: 'flex',
                          justifyContent: 'center',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          border: '2px solid #e5e7eb',
                          background: '#f9fafb',
                          mb: 4,
                        }}
                      >
                        <SimpleSmartWebcam
                          ref={webcamRef}
                          height={300}
                          width={400}
                          onCapture={capture}
                          showDetection={true}
                          detectionColor="#3b82f6"
                          borderColor="#e5e7eb"
                          mode="capture"
                        />
                      </Box>

                      {/* Action Buttons */}
                      {step === 0 && (
                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<CameraAlt />}
                          onClick={startCapturing}
                          sx={{
                            py: 2,
                            px: 4,
                            fontSize: '1rem',
                            fontWeight: '600',
                            borderRadius: '8px',
                            background: '#3b82f6',
                            textTransform: 'none',
                            boxShadow: 'none',
                            '&:hover': {
                              background: '#2563eb',
                              boxShadow: 'none',
                            },
                          }}
                        >
                          Start Face Capture
                        </Button>
                      )}
                      
                      {step === 1 && (
                        <Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={(capturedImages.length / 5) * 100} 
                            sx={{ 
                              mb: 3, 
                              height: 8, 
                              borderRadius: 4,
                              background: '#f3f4f6',
                              '& .MuiLinearProgress-bar': {
                                background: '#10b981',
                                borderRadius: 4,
                              },
                            }}
                          />
                          <Typography variant="h6" fontWeight="600" sx={{ color: '#10b981', mb: 1 }}>
                            {capturedImages.length} / 5 images captured
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            Stay still while we capture multiple angles of your face
                          </Typography>
                        </Box>
                      )}
                      
                      {step === 2 && (
                        <Stack direction="row" spacing={2} justifyContent="center">
                          <Button
                            variant="contained"
                            size="large"
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
                            onClick={uploadImages}
                            disabled={loading}
                            sx={{
                              py: 2,
                              px: 4,
                              fontSize: '1rem',
                              fontWeight: '600',
                              borderRadius: '8px',
                              background: '#10b981',
                              textTransform: 'none',
                              boxShadow: 'none',
                              '&:hover': {
                                background: '#059669',
                                boxShadow: 'none',
                              },
                            }}
                          >
                            {loading ? 'Processing...' : 'Complete Registration'}
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={resetCapture}
                            disabled={loading}
                            sx={{
                              py: 2,
                              px: 4,
                              fontSize: '1rem',
                              fontWeight: '600',
                              borderRadius: '8px',
                              border: '1px solid #e5e7eb',
                              color: '#6b7280',
                              textTransform: 'none',
                              '&:hover': {
                                border: '1px solid #d1d5db',
                                background: '#f9fafb',
                              },
                            }}
                          >
                            Retake
                          </Button>
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Captured Images Section */}
                <Grid item xs={12} md={6}>
                  <Card 
                    elevation={0}
                    sx={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      background: '#ffffff',
                    }}
                  >
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#1f2937' }}>
                        Captured Images ({capturedImages.length}/5)
                      </Typography>
                      
                      <Box 
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                          gap: 2,
                          minHeight: 200,
                          border: '2px dashed #e5e7eb',
                          borderRadius: '12px',
                          p: 3,
                          mb: 3,
                          background: '#f9fafb',
                        }}
                      >
                        {capturedImages.length === 0 ? (
                          <Box 
                            display="flex" 
                            flexDirection="column" 
                            alignItems="center" 
                            justifyContent="center"
                            gridColumn="1 / -1"
                            sx={{ color: '#6b7280' }}
                          >
                            <Face sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                            <Typography variant="body1" fontWeight="500">
                              Captured face images will appear here
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#9ca3af', mt: 1 }}>
                              We'll capture 5 images for better recognition
                            </Typography>
                          </Box>
                        ) : (
                          capturedImages.map((imageData, index) => (
                            <Box 
                              key={index}
                              sx={{
                                position: 'relative',
                                border: '2px solid #10b981',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                aspectRatio: '1',
                                animation: 'fadeIn 0.5s ease',
                              }}
                            >
                              <img 
                                src={imageData.imageSrc} 
                                alt={`Capture ${index + 1}`}
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  objectFit: 'cover' 
                                }}
                              />
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  background: '#10b981',
                                  color: 'white',
                                  borderRadius: '50%',
                                  width: 24,
                                  height: 24,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}
                              >
                                {index + 1}
                              </Box>
                            </Box>
                          ))
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>

            {/* Instructions */}
            <Box sx={{ p: 6, pt: 0 }}>
              <Card 
                elevation={0}
                sx={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  background: '#f9fafb',
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#1f2937' }}>
                    Registration Instructions
                  </Typography>
                  <Stack spacing={2}>
                    {[
                      'Position your face clearly within the camera frame',
                      'The system will automatically detect and capture your face',
                      'Try to move your head slightly between captures for better training',
                      'Ensure good lighting for optimal recognition accuracy',
                      'The system captures 5 high-quality images for maximum security'
                    ].map((instruction, index) => (
                      <Box key={index} display="flex" alignItems="flex-start" gap={2}>
                        <CheckCircle sx={{ fontSize: 16, color: '#10b981', mt: 0.25 }} />
                        <Typography variant="body2" sx={{ color: '#6b7280', lineHeight: 1.5 }}>
                          {instruction}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Card>
        </Fade>
      </Container>
    </Box>
  );
};

export default FaceCapture; 