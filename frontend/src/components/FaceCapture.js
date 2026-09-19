import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Container,
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
  Close,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { faceAPI, webcamCaptureToFile } from '../services/api';
import FaceCamera from './FaceCamera';

// Number of face images required for enrollment. Keep in sync with the
// backend's FACE_MIN_ENCODINGS expectations.
const REQUIRED_IMAGES = 5;
const CAPTURE_INTERVAL_MS = 1200;
const CAPTURE_TIMEOUT_MS = 20000;

const FaceCapture = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const webcamRef = useRef(null);
  
  const [step, setStep] = useState(0);
  const [capturedImages, setCapturedImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false); // eslint-disable-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const statusRef = useRef({ ready: false, faceDetected: false, quality: 0 });
  // Mirrored into state so the live prompt ("Blink to confirm...") is actually
  // rendered; the ref alone does not trigger a re-render.
  const [detectMsg, setDetectMsg] = useState('Position your face in the frame');
  // Refs (not state) so the interval callback always sees current values and
  // can never be stopped by a stale closure.
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const captureCountRef = useRef(0);

  const steps = ['Camera Setup', 'Capture Images', 'Upload & Train'];

  const handleStatus = useCallback((status) => {
    statusRef.current = status;
    setDetectMsg(status.message);
  }, []);

  // Stops the capture loop and clears the safety timeout. Idempotent.
  const stopCaptureLoop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const startCapturing = () => {
    // Guard against double-starts leaving an orphaned interval behind.
    stopCaptureLoop();

    captureCountRef.current = 0;
    setCapturedImages([]); // Reset images
    setIsCapturing(true);
    setStep(1);

    // Capture a frame roughly every 1.2s, but only when a real, well-framed
    // face is detected (no simulated detection).
    intervalRef.current = setInterval(() => {
      // Hard cap: never collect more than REQUIRED_IMAGES frames.
      if (captureCountRef.current >= REQUIRED_IMAGES) {
        stopCaptureLoop();
        setStep(2);
        return;
      }

      const status = statusRef.current;
      if (!status || !status.ready) return;
      if (!webcamRef.current || !webcamRef.current.getScreenshot) return;

      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      const metadata = {
        faceDetected: true,
        quality: status.quality,
        timestamp: new Date().toISOString(),
      };

      // Increment synchronously so a fast interval can't race past the cap
      // while the state update is still pending.
      captureCountRef.current += 1;
      setCapturedImages(prev => [...prev, { imageSrc, metadata }]);

      if (captureCountRef.current >= REQUIRED_IMAGES) {
        stopCaptureLoop();
        setStep(2);
      }
    }, CAPTURE_INTERVAL_MS);

    // Safety net: stop after the timeout even if not enough frames were usable.
    timeoutRef.current = setTimeout(() => {
      stopCaptureLoop();
      setStep(2);
    }, CAPTURE_TIMEOUT_MS);
  };

  const resetCapture = () => {
    stopCaptureLoop();
    captureCountRef.current = 0;
    setCapturedImages([]);
    setStep(0);
    setError('');
  };

  // Cleanup timers on component unmount
  useEffect(() => stopCaptureLoop, [stopCaptureLoop]);

  const uploadImages = async () => {
    if (capturedImages.length < REQUIRED_IMAGES) {
      setError(`Please capture at least ${REQUIRED_IMAGES} face images`);
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
      
      console.log('Face registration completed successfully!');
      navigate('/profile');
    } catch (error) {
      console.error('Face registration error:', error);
      
      // Extract detailed error message from response
      let errorMessage = 'Face registration failed. Please try again.';
      
      if (error.response?.status === 409) {
        // Duplicate face detected
        errorMessage = error.response?.data?.detail || 'This face is already registered to another user.';
      } else if (error.response?.status === 400) {
        // Quality or liveness issues
        errorMessage = error.response?.data?.detail || 'Face quality is too low. Please try again with better lighting.';
      } else if (error.response?.data?.detail) {
        // Other specific errors
        errorMessage = error.response.data.detail;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ background: 'linear-gradient(135deg, #f5f3f0 0%, #fafaf9 50%, #ffffff 100%)', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Fade in timeout={800}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '24px',
              background: '#ffffff',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            }}
          >
            {/* Header */}
            <Box sx={{ p: 6, textAlign: 'center', background: 'linear-gradient(135deg, #212E46 0%, #2c3e5a 100%)', color: '#ffffff' }}>
              <Typography variant="h5" fontWeight="700" sx={{ mb: 2, fontFamily: '"Inter", sans-serif' }}>
                Face Registration
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', maxWidth: '600px', mx: 'auto', lineHeight: 1.6, fontFamily: '"Inter", sans-serif' }}>
                Welcome {user?.full_name}! We need to capture your face images for secure biometric authentication.
              </Typography>
            </Box>

            {/* Stepper */}
            <Box sx={{ p: 4, background: '#fafaf9' }}>
              <Stepper 
                activeStep={step} 
                sx={{
                  '& .MuiStepLabel-root': {
                    '& .MuiStepLabel-label': {
                      fontWeight: '600',
                      color: '#78716c',
                      fontFamily: '"Inter", sans-serif',
                      '&.Mui-active': {
                        color: '#212E46',
                        fontWeight: '700',
                      },
                      '&.Mui-completed': {
                        color: '#16a34a',
                        fontWeight: '600',
                      },
                    },
                  },
                  '& .MuiStepIcon-root': {
                    color: '#e7e5e4',
                    '&.Mui-active': {
                      color: '#212E46',
                    },
                    '&.Mui-completed': {
                      color: '#16a34a',
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
                    borderRadius: '16px',
                    border: '1px solid #fca5a5',
                    background: '#fecaca',
                    '& .MuiAlert-icon': { color: '#dc2626' },
                    fontFamily: '"Inter", sans-serif',
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
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: '20px',
                      background: '#ffffff',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    }}
                  >
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight="700" gutterBottom sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif' }}>
                        Camera Feed
                      </Typography>
                      
                      <Box
                        sx={{
                          position: 'relative',
                          display: 'flex',
                          justifyContent: 'center',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          border: '2px solid #e7e5e4',
                          background: '#fafaf9',
                          mb: 4,
                        }}
                      >
                        <FaceCamera
                          ref={webcamRef}
                          mode="capture"
                          height={300}
                          width="100%"
                          onStatus={handleStatus}
                        />
                      </Box>

                      {/* Action Buttons */}
                      {step === 0 && (
                        <Button
                          variant="contained"
                          size="large"
                          onClick={startCapturing}
                          sx={{
                            py: 2.5,
                            px: 5,
                            fontSize: '1rem',
                            fontWeight: '700',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                            textTransform: 'none',
                            fontFamily: '"Inter", sans-serif',
                            boxShadow: '0 8px 24px rgba(249,115,22,0.3)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                              boxShadow: '0 12px 32px rgba(249,115,22,0.4)',
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
                            value={Math.min(100, (capturedImages.length / REQUIRED_IMAGES) * 100)} 
                            sx={{ 
                              mb: 3, 
                              height: 8, 
                              borderRadius: 4,
                              background: '#e7e5e4',
                              '& .MuiLinearProgress-bar': {
                                background: 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)',
                                borderRadius: 4,
                              },
                            }}
                          />
                          <Typography variant="h6" fontWeight="700" sx={{ color: '#16a34a', mb: 1, fontFamily: '"Inter", sans-serif' }}>
                            {capturedImages.length} / {REQUIRED_IMAGES} images captured
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                            {detectMsg}
                          </Typography>
                        </Box>
                      )}
                      
                      {step === 2 && (
                        <Stack direction="row" spacing={2} justifyContent="center">
                          <Button
                            variant="contained"
                            size="large"
                            startIcon={loading ? <CircularProgress size={20} sx={{ color: '#ffffff' }} /> : null}
                            onClick={uploadImages}
                            disabled={loading}
                            sx={{
                              py: 2.5,
                              px: 4,
                              fontSize: '1rem',
                              fontWeight: '700',
                              borderRadius: '14px',
                              background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                              textTransform: 'none',
                              fontFamily: '"Inter", sans-serif',
                              boxShadow: 'none',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
                                boxShadow: 'none',
                              },
                            }}
                          >
                            {loading ? 'Processing...' : 'Complete Registration'}
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={resetCapture}
                            disabled={loading}
                            sx={{
                              py: 2.5,
                              px: 4,
                              fontSize: '1rem',
                              fontWeight: '700',
                              borderRadius: '14px',
                              border: '2px solid #e7e5e4',
                              color: '#78716c',
                              textTransform: 'none',
                              fontFamily: '"Inter", sans-serif',
                              '&:hover': {
                                border: '2px solid #d6d3d1',
                                background: '#fafaf9',
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
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: '20px',
                      background: '#ffffff',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    }}
                  >
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h6" fontWeight="700" gutterBottom sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif' }}>
                        Captured Images ({capturedImages.length}/{REQUIRED_IMAGES})
                      </Typography>
                      
                      <Box 
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                          gap: 2,
                          minHeight: 200,
                          border: '2px dashed #e7e5e4',
                          borderRadius: '16px',
                          p: 3,
                          mb: 3,
                          background: '#fafaf9',
                        }}
                      >
                        {capturedImages.length === 0 ? (
                          <Box 
                            display="flex" 
                            flexDirection="column" 
                            alignItems="center" 
                            justifyContent="center"
                            gridColumn="1 / -1"
                            sx={{ color: '#78716c' }}
                          >
                            <Typography variant="body1" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif' }}>
                              Captured face images will appear here
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#9ca3af', mt: 1, fontFamily: '"Inter", sans-serif' }}>
                              We'll capture {REQUIRED_IMAGES} images for better recognition
                            </Typography>
                          </Box>
                        ) : (
                          capturedImages.map((imageData, index) => (
                            <Box 
                              key={index}
                              sx={{
                                position: 'relative',
                                border: '2px solid #16a34a',
                                borderRadius: '12px',
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
                                  background: '#16a34a',
                                  color: 'white',
                                  borderRadius: '50%',
                                  width: 24,
                                  height: 24,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  fontFamily: '"Inter", sans-serif',
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
                  border: '1px solid #fed7aa',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight="700" gutterBottom sx={{ color: '#ea580c', fontFamily: '"Inter", sans-serif' }}>
                    Registration Instructions
                  </Typography>
                  <Stack spacing={2}>
                    {[
                      'Position your face clearly within the camera frame',
                      'Blink when prompted — capture only starts once a live person is confirmed',
                      'The system will automatically detect and capture your face',
                      'Try to move your head slightly between captures for better training',
                      'Ensure good lighting for optimal recognition accuracy',
                      `The system captures ${REQUIRED_IMAGES} high-quality images for maximum security`
                    ].map((instruction, index) => (
                      <Box key={index} display="flex" alignItems="flex-start" gap={2}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', flexShrink: 0, mt: 0.75 }} />
                        <Typography variant="body2" sx={{ color: '#9a3412', lineHeight: 1.5, fontFamily: '"Inter", sans-serif' }}>
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