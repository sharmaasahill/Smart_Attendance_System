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
} from '@mui/material';
import { CameraAlt, Face, CheckCircle, Refresh } from '@mui/icons-material';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { faceAPI, webcamCaptureToFile } from '../services/api';
import { toast } from 'react-toastify';

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

  const steps = ['Prepare Camera', 'Capture Face Images', 'Upload & Train'];

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user"
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCapturedImages(prev => {
        const newImages = [...prev, imageSrc];
        
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
      capture();
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
        capturedImages.map(async (imageSrc, index) => {
          return await webcamCaptureToFile(imageSrc, `face_${index + 1}.jpg`);
        })
      );

      // Upload to backend
      await faceAPI.registerFace(files);
      
      toast.success('Face registration completed successfully!');
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.detail || 'Face registration failed');
      toast.error('Face registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3 }}>
        <Box textAlign="center" mb={4}>
          <Face sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" fontWeight="600" gutterBottom>
            Face Registration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome {user?.full_name}! We need to capture your face images for recognition.
          </Typography>
        </Box>

        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={4}>
          {/* Webcam Section */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <Box p={2} textAlign="center">
                <Typography variant="h6" gutterBottom>
                  Camera Preview
                </Typography>
                
                <Box className="webcam-container" sx={{ display: 'inline-block', mb: 2 }}>
                  <Webcam
                    audio={false}
                    height={300}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    width={400}
                    videoConstraints={videoConstraints}
                    style={{ border: '3px solid #1976d2', borderRadius: '12px' }}
                  />
                </Box>

                <Box>
                  {step === 0 && (
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<CameraAlt />}
                      onClick={startCapturing}
                      sx={{ px: 4 }}
                    >
                      Start Face Capture
                    </Button>
                  )}

                  {step === 1 && (
                    <Box>
                      <Typography variant="body1" gutterBottom>
                        Capturing face images... Please look at the camera
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={(capturedImages.length / 5) * 100} 
                        sx={{ mt: 2 }}
                      />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {capturedImages.length} / 5 images captured
                      </Typography>
                    </Box>
                  )}

                  {step === 2 && (
                    <Box>
                      <Button
                        variant="contained"
                        color="success"
                        size="large"
                        startIcon={<CheckCircle />}
                        onClick={uploadImages}
                        disabled={loading}
                        sx={{ mb: 2, px: 4 }}
                      >
                        {loading ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          'Complete Registration'
                        )}
                      </Button>
                      <br />
                      <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={resetCapture}
                        disabled={loading}
                      >
                        Retake Photos
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Captured Images Section */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <Box p={2}>
                <Typography variant="h6" gutterBottom>
                  Captured Images ({capturedImages.length}/5)
                </Typography>
                
                <Box 
                  className="face-capture-grid"
                  sx={{ 
                    maxHeight: 400, 
                    overflowY: 'auto',
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    p: 2
                  }}
                >
                  {capturedImages.length === 0 ? (
                    <Box 
                      textAlign="center" 
                      py={4} 
                      color="text.secondary"
                    >
                      <Typography variant="body2">
                        Captured face images will appear here
                      </Typography>
                    </Box>
                  ) : (
                    capturedImages.map((imageSrc, index) => (
                      <img
                        key={index}
                        src={imageSrc}
                        alt={`Face ${index + 1}`}
                        className="face-preview"
                      />
                    ))
                  )}
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Instructions */}
        <Box mt={4} p={3} bgcolor="grey.50" borderRadius={2}>
          <Typography variant="h6" gutterBottom>
            📋 Instructions:
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li>Ensure good lighting and face the camera directly</li>
              <li>Remove glasses or hats if possible for better recognition</li>
                              <li>The system will automatically capture 5 images of your face</li>
              <li>Try to move your head slightly between captures for better training</li>
              <li>Stay within the camera frame during the entire process</li>
            </ul>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default FaceCapture; 