import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Grid,
  Fade,
  LinearProgress,
  Avatar,
  useTheme,
  useMediaQuery,
  Stack,
  Paper,
} from '@mui/material';
import {
  CameraAlt,
  Refresh,
} from '@mui/icons-material';
import { attendanceAPI, webcamCaptureToFile } from '../services/api';
import { format } from 'date-fns';
import SimpleWebcamWithFaceDetection from './SimpleWebcamWithFaceDetection';

// Add pulse animation
const pulseAnimation = `
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}
`;

const MarkAttendance = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const webcamRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [alreadyMarked, setAlreadyMarked] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceStatus, setAttendanceStatus] = useState('ready');
  const [faceDetected, setFaceDetected] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFaceDetectionChange = (detected) => {
    setFaceDetected(detected);
  };

  const markAttendance = async () => {
    if (!webcamRef.current) {
      setError('Camera not ready. Please refresh the page.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(null);
    setAlreadyMarked(null);
    setAttendanceStatus('scanning');

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setAttendanceStatus('processing');
      await new Promise(resolve => setTimeout(resolve, 1200));

      let imageSrc;
      if (webcamRef.current && webcamRef.current.getScreenshot) {
        imageSrc = webcamRef.current.getScreenshot();
      }

      if (!imageSrc) {
        throw new Error('Failed to capture image.');
      }

      const imageFile = await webcamCaptureToFile(imageSrc, 'attendance.jpg');
      const response = await attendanceAPI.markAttendance(imageFile);

      setSuccess(response.data);
      setAttendanceStatus('success');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed';
      
      // Check if attendance already marked
      if (errorMessage.toLowerCase().includes('already marked')) {
        setAlreadyMarked({
          message: errorMessage,
          user: error.response?.data?.user || null,
        });
        setAttendanceStatus('already-marked');
      } else {
        setError(errorMessage);
        setAttendanceStatus('error');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetAttendance = () => {
    setSuccess(null);
    setError('');
    setAlreadyMarked(null);
    setAttendanceStatus('ready');
    setFaceDetected(false);
  };

  return (
    <>
      <style>{pulseAnimation}</style>
      <Box 
        sx={{ 
          background: 'linear-gradient(135deg, #f5f3f0 0%, #fafaf9 50%, #ffffff 100%)', 
          minHeight: '100vh', 
          py: 4,
        }}
      >
      <Container maxWidth="lg">
        {/* Compact Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight="800" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif', mb: 0.5 }}>
              Mark Attendance
            </Typography>
            <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
              {format(currentTime, 'EEEE, MMMM dd, yyyy')}
            </Typography>
          </Box>
          <Box sx={{ px: 3, py: 2, borderRadius: '14px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Typography variant="h6" fontWeight="700" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif' }}>
              {format(currentTime, 'hh:mm:ss a')}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Camera Section - Larger */}
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.08)' }}>
              {/* Status Bar */}
              <Box sx={{ background: '#ffffff', borderBottom: '1px solid #f3f4f6', p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: faceDetected ? '#16a34a' : '#9ca3af', boxShadow: faceDetected ? '0 0 0 3px rgba(22,163,74,0.2)' : 'none', transition: 'all 0.3s ease' }} />
                  <Typography variant="body2" fontWeight="700" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif' }}>
                    {attendanceStatus === 'success' ? 'Attendance Verified' : attendanceStatus === 'already-marked' ? 'Already Marked Today' : attendanceStatus === 'error' ? 'Recognition Failed' : loading ? 'Processing...' : faceDetected ? 'Face Detected - Ready' : 'Waiting for Face'}
                  </Typography>
                </Box>
                <Chip 
                  label={loading ? 'SCANNING' : faceDetected ? 'READY' : 'STANDBY'}
                  size="small"
                  sx={{ 
                    background: loading ? '#ffedd5' : faceDetected ? '#dcfce7' : '#fafaf9', 
                    color: loading ? '#f97316' : faceDetected ? '#16a34a' : '#78716c', 
                    fontWeight: '800', 
                    fontSize: '0.7rem',
                    fontFamily: '"Inter", sans-serif',
                    height: '24px'
                  }} 
                />
              </Box>

              {/* Camera Feed */}
              <Box sx={{ position: 'relative', background: '#000000', minHeight: isMobile ? 400 : 480 }}>
                <SimpleWebcamWithFaceDetection 
                  ref={webcamRef} 
                  height={isMobile ? 400 : 480} 
                  width="100%" 
                  onFaceDetectionChange={handleFaceDetectionChange} 
                  style={{ width: '100%', objectFit: 'cover' }} 
                />
                
                {/* Success Overlay */}
                {success && (
                  <Fade in timeout={500}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(16,185,129,0.97) 0%, rgba(5,150,105,0.97) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                      <Box sx={{ width: 120, height: 120, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <Box sx={{ width: 60, height: 60, borderRadius: '50%', background: '#16a34a' }} />
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight="800" sx={{ color: '#ffffff', fontFamily: '"Inter", sans-serif', mb: 1 }}>Success</Typography>
                        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.95)', fontFamily: '"Inter", sans-serif' }}>Welcome, {success.user?.full_name}</Typography>
                      </Box>
                      <Box sx={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', px: 4, py: 2 }}>
                        <Typography variant="body2" sx={{ color: '#ffffff', fontFamily: '"Inter", sans-serif', fontWeight: '600' }}>
                          Time: {format(new Date(), 'hh:mm a')}
                        </Typography>
                      </Box>
                    </Box>
                  </Fade>
                )}

                {/* Already Marked Overlay */}
                {alreadyMarked && (
                  <Fade in timeout={500}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(249,115,22,0.97) 0%, rgba(234,88,12,0.97) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, p: 4 }}>
                      <Box sx={{ width: 120, height: 120, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <Typography variant="h1" fontWeight="900" sx={{ color: '#f97316', fontFamily: '"Inter", sans-serif' }}>i</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight="800" sx={{ color: '#ffffff', fontFamily: '"Inter", sans-serif', mb: 1 }}>Already Marked</Typography>
                        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.95)', fontFamily: '"Inter", sans-serif', maxWidth: 400 }}>
                          {alreadyMarked.message}
                        </Typography>
                      </Box>
                    </Box>
                  </Fade>
                )}
                
                {/* Error Overlay */}
                {error && attendanceStatus === 'error' && (
                  <Fade in timeout={500}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(239,68,68,0.97) 0%, rgba(220,38,38,0.97) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, p: 4 }}>
                      <Box sx={{ width: 120, height: 120, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <Typography variant="h1" fontWeight="900" sx={{ color: '#dc2626', fontFamily: '"Inter", sans-serif' }}>✕</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight="800" sx={{ color: '#ffffff', fontFamily: '"Inter", sans-serif', mb: 1 }}>Not Recognized</Typography>
                        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.95)', fontFamily: '"Inter", sans-serif', maxWidth: 400 }}>{error}</Typography>
                      </Box>
                    </Box>
                  </Fade>
                )}
              </Box>

              {/* Action Buttons */}
              <Box sx={{ p: 3, background: '#ffffff' }}>
                {loading && <LinearProgress sx={{ mb: 2, height: 6, borderRadius: 3, background: '#e7e5e4', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)', borderRadius: 3 } }} />}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={(success || error || alreadyMarked) ? 6 : 12}>
                    <Button 
                      variant="contained" 
                      size="large" 
                      fullWidth 
                      startIcon={loading ? <CircularProgress size={20} sx={{ color: '#ffffff' }} /> : <CameraAlt />} 
                      onClick={markAttendance} 
                      disabled={loading || success || alreadyMarked || !faceDetected}
                      sx={{ 
                        py: 2.5, 
                        fontSize: '1rem', 
                        fontWeight: '700', 
                        borderRadius: '12px', 
                        background: faceDetected && !success && !alreadyMarked ? 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)' : 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)', 
                        textTransform: 'none', 
                        fontFamily: '"Inter", sans-serif', 
                        boxShadow: faceDetected ? '0 8px 24px rgba(249,115,22,0.3)' : 'none',
                        '&:disabled': {
                          background: 'linear-gradient(135deg, #e7e5e4 0%, #d6d3d1 100%)',
                          color: '#9ca3af'
                        }
                      }}
                    >
                      {loading ? 'Verifying...' : success ? 'Marked' : alreadyMarked ? 'Already Done' : faceDetected ? 'Mark Attendance' : 'Waiting'}
                    </Button>
                  </Grid>
                  {(success || error || alreadyMarked) && (
                    <Grid item xs={12} sm={6}>
                      <Button 
                        variant="outlined" 
                        size="large" 
                        fullWidth 
                        startIcon={<Refresh />} 
                        onClick={resetAttendance} 
                        sx={{ 
                          py: 2.5, 
                          fontSize: '1rem', 
                          fontWeight: '700', 
                          borderRadius: '12px', 
                          border: '2px solid #e7e5e4', 
                          color: '#78716c', 
                          textTransform: 'none', 
                          fontFamily: '"Inter", sans-serif',
                          '&:hover': {
                            border: '2px solid #d6d3d1',
                            background: '#fafaf9'
                          }
                        }}
                      >
                        Try Again
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Card>
          </Grid>

          {/* Info Sidebar */}
          <Grid item xs={12} md={4}>
            <Stack spacing={3}>
              {/* Instructions */}
              <Card elevation={0} sx={{ borderRadius: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight="800" sx={{ color: '#212E46', mb: 3, fontFamily: '"Inter", sans-serif' }}>
                    Instructions
                  </Typography>
                  <Stack spacing={2.5}>
                    {[
                      'Position your face in the camera frame',
                      'Ensure adequate lighting',
                      'Remove sunglasses and face coverings',
                      'Look directly at the camera',
                      'Wait for face detection confirmation'
                    ].map((item, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box sx={{ minWidth: 24, height: 24, borderRadius: '6px', background: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.25 }}>
                          <Typography variant="caption" fontWeight="800" sx={{ color: '#f97316', fontFamily: '"Inter", sans-serif' }}>{i + 1}</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif', lineHeight: 1.6 }}>{item}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>


              {/* System Status */}
              <Card elevation={0} sx={{ borderRadius: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight="800" sx={{ color: '#212E46', mb: 3, fontFamily: '"Inter", sans-serif' }}>
                    System Status
                  </Typography>
                  <Stack spacing={2}>
                    <Box sx={{ p: 3, borderRadius: '12px', background: faceDetected ? '#dcfce7' : '#fafaf9', border: `2px solid ${faceDetected ? '#86efac' : '#e7e5e4'}`, transition: 'all 0.3s ease' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: faceDetected ? '#16a34a' : '#9ca3af', boxShadow: faceDetected ? '0 0 0 3px rgba(22,163,74,0.2)' : 'none' }} />
                        <Typography variant="body2" fontWeight="700" sx={{ color: faceDetected ? '#16a34a' : '#78716c', fontFamily: '"Inter", sans-serif' }}>
                          Face Detection
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: faceDetected ? '#059669' : '#9ca3af', fontFamily: '"Inter", sans-serif', fontWeight: '600' }}>
                        {faceDetected ? 'Active and tracking' : 'Waiting for face'}
                      </Typography>
                    </Box>

                    <Box sx={{ p: 3, borderRadius: '12px', background: '#dbeafe', border: '2px solid #93c5fd' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: '#212E46', boxShadow: '0 0 0 3px rgba(33,46,70,0.2)' }} />
                        <Typography variant="body2" fontWeight="700" sx={{ color: '#1e40af', fontFamily: '"Inter", sans-serif' }}>
                          AI Recognition
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#2563eb', fontFamily: '"Inter", sans-serif', fontWeight: '600' }}>
                        Model loaded and ready
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Container>
      </Box>
    </>
  );
};

export default MarkAttendance;
