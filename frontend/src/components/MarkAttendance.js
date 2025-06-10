import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Grid,
  Divider,
  Fade,
  Slide,
  LinearProgress,
  Avatar,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Stack,
} from '@mui/material';
import { 
  CameraAlt, 
  CheckCircle, 
  Person, 
  Schedule, 
  Security,
  Refresh,
  LocationOn,
  AccessTime,
  Fingerprint,
  VerifiedUser,
  Warning,
  Info,
  RadioButtonUnchecked,
  RadioButtonChecked,
  Visibility,
  Speed,
  Close,
} from '@mui/icons-material';
import { attendanceAPI, webcamCaptureToFile } from '../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import SimpleWebcamWithFaceDetection from './SimpleWebcamWithFaceDetection';

const MarkAttendance = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const webcamRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceStatus, setAttendanceStatus] = useState('ready'); // ready, scanning, processing, success, error
  const [faceDetected, setFaceDetected] = useState(false);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle face detection changes
  const handleFaceDetectionChange = (detected, confidence) => {
    setFaceDetected(detected);
  };

  const markAttendance = async () => {
    if (!webcamRef.current) {
      setError('Camera not initialized. Please refresh the page and try again.');
      toast.error('Camera not ready. Please refresh the page.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(null);
    setAttendanceStatus('scanning');
    setFaceDetected(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setAttendanceStatus('processing');
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      let imageSrc;
      if (webcamRef.current && webcamRef.current.getScreenshot) {
        imageSrc = webcamRef.current.getScreenshot();
      }
      
      if (!imageSrc) {
        throw new Error('Failed to capture image. Please ensure your camera is working and try again.');
      }

      const imageFile = await webcamCaptureToFile(imageSrc, 'attendance.jpg');
      const response = await attendanceAPI.markAttendance(imageFile);
      
      setSuccess(response.data);
      setAttendanceStatus('success');
      toast.success('Attendance marked successfully!');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Authentication failed. Please try again.';
      setError(errorMessage);
      setAttendanceStatus('error');
      toast.error('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetAttendance = () => {
    setSuccess(null);
    setError('');
    setAttendanceStatus('ready');
    setFaceDetected(false);
  };

  const getStatusIcon = () => {
    switch (attendanceStatus) {
      case 'scanning': return <Speed sx={{ fontSize: 20 }} />;
      case 'processing': return <CircularProgress size={20} />;
      case 'success': return <CheckCircle sx={{ fontSize: 20 }} />;
      case 'error': return <Warning sx={{ fontSize: 20 }} />;
      default: return faceDetected ? <VerifiedUser sx={{ fontSize: 20 }} /> : <Security sx={{ fontSize: 20 }} />;
    }
  };

  const getStatusColor = () => {
    switch (attendanceStatus) {
      case 'scanning': return '#f59e0b';
      case 'processing': return '#3b82f6';
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      default: return faceDetected ? '#10b981' : '#6b7280';
    }
  };

  return (
    <Box sx={{ background: '#fafafa', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Clean Header */}
        <Fade in timeout={800}>
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <Typography 
              variant="h3" 
              fontWeight="600" 
              sx={{ 
                color: '#1f2937',
                mb: 2,
                letterSpacing: '-0.025em'
              }}
            >
              Mark Attendance
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#6b7280',
                fontSize: '1.1rem',
                maxWidth: '600px',
                mx: 'auto',
                lineHeight: 1.6,
                mb: 4
              }}
            >
              Use face recognition technology to quickly and securely mark your attendance
            </Typography>
            
            {/* Time Display */}
            <Card 
              elevation={0}
              sx={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                px: 4,
                py: 2,
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                background: '#ffffff'
              }}
            >
              <AccessTime sx={{ color: '#6b7280', fontSize: 20 }} />
              <Typography variant="h6" fontWeight="500" sx={{ color: '#1f2937' }}>
                {format(currentTime, 'EEEE, MMMM do, yyyy • hh:mm:ss a')}
              </Typography>
            </Card>
          </Box>
        </Fade>

        <Grid container spacing={6} justifyContent="center">
          {/* Main Camera Section */}
          <Grid item xs={12} lg={8}>
            <Slide direction="up" in timeout={1000}>
              <Card 
                elevation={0}
                sx={{ 
                  border: '1px solid #e5e7eb',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#ffffff'
                }}
              >
                {/* Status Header */}
                <Box 
                  sx={{ 
                    p: 4,
                    borderBottom: '1px solid #f3f4f6',
                    background: success ? '#f0fdf4' : error ? '#fef2f2' : '#ffffff'
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={3}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        background: `${getStatusColor()}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: getStatusColor()
                      }}
                    >
                      {getStatusIcon()}
                    </Box>
                    
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" fontWeight="600" sx={{ color: '#1f2937', mb: 0.5 }}>
                        {attendanceStatus === 'ready' && faceDetected && 'Face Detected - Ready to Capture'}
                        {attendanceStatus === 'ready' && !faceDetected && 'Position Your Face in Camera'}
                        {attendanceStatus === 'scanning' && 'Capturing Image...'}
                        {attendanceStatus === 'processing' && 'Processing Recognition...'}
                        {attendanceStatus === 'success' && 'Attendance Marked Successfully'}
                        {attendanceStatus === 'error' && 'Recognition Failed'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        {attendanceStatus === 'ready' && 'Ensure good lighting and look directly at the camera'}
                        {attendanceStatus === 'scanning' && 'Please hold still while we capture your image'}
                        {attendanceStatus === 'processing' && 'Verifying your identity using AI recognition'}
                        {attendanceStatus === 'success' && 'Welcome! Your attendance has been recorded'}
                        {attendanceStatus === 'error' && 'Please try again with better positioning'}
                      </Typography>
                    </Box>

                    {(success || error) && (
                      <IconButton 
                        onClick={resetAttendance}
                        sx={{ 
                          background: '#f3f4f6',
                          '&:hover': { background: '#e5e7eb' }
                        }}
                      >
                        <Close sx={{ fontSize: 20 }} />
                      </IconButton>
                    )}
                  </Stack>

                  {loading && (
                    <LinearProgress 
                      sx={{ 
                        mt: 3,
                        height: 8,
                        borderRadius: 4,
                        background: '#f3f4f6',
                        '& .MuiLinearProgress-bar': {
                          background: getStatusColor(),
                          borderRadius: 4
                        }
                      }}
                    />
                  )}
                </Box>

                {/* Camera Area */}
                <Box sx={{ p: 6 }}>
                  <Box
                    sx={{
                      position: 'relative',
                      display: 'flex',
                      justifyContent: 'center',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: `3px solid ${faceDetected ? '#10b981' : '#e5e7eb'}`,
                      transition: 'all 0.3s ease',
                      background: '#f9fafb',
                      mb: 4
                    }}
                  >
                    <SimpleWebcamWithFaceDetection
                      ref={webcamRef}
                      height={isMobile ? 300 : 400}
                      width={isMobile ? 400 : 600}
                      onFaceDetectionChange={handleFaceDetectionChange}
                      style={{
                        borderRadius: '13px',
                      }}
                    />
                  </Box>

                  {/* Action Button */}
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CameraAlt />}
                    onClick={markAttendance}
                    disabled={loading || success}
                    sx={{ 
                      py: 3,
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      borderRadius: '12px',
                      background: loading 
                        ? '#9ca3af' 
                        : success 
                          ? '#10b981'
                          : faceDetected
                            ? '#3b82f6'
                            : '#6b7280',
                      color: '#ffffff',
                      textTransform: 'none',
                      boxShadow: 'none',
                      '&:hover': {
                        background: loading 
                          ? '#9ca3af'
                          : success 
                            ? '#059669'
                            : faceDetected
                              ? '#2563eb'
                              : '#4b5563',
                        boxShadow: 'none'
                      },
                      '&:disabled': {
                        background: '#d1d5db',
                        color: '#9ca3af',
                      },
                    }}
                  >
                    {loading && attendanceStatus === 'scanning' && 'Capturing Image...'}
                    {loading && attendanceStatus === 'processing' && 'Processing...'}
                    {success && 'Attendance Recorded'}
                    {!loading && !success && faceDetected && 'Mark Attendance'}
                    {!loading && !success && !faceDetected && 'Position Face to Continue'}
                  </Button>
                  
                  {!success && !loading && (
                    <Typography 
                      variant="body2" 
                      textAlign="center" 
                      sx={{ 
                        mt: 3, 
                        color: faceDetected ? '#10b981' : '#6b7280',
                        fontWeight: 500
                      }}
                    >
                      {faceDetected 
                        ? '✓ Face detected and ready for capture' 
                        : 'Position your face within the camera frame'
                      }
                    </Typography>
                  )}
                </Box>
              </Card>
            </Slide>
          </Grid>

          {/* Side Panel */}
          <Grid item xs={12} lg={4}>
            <Stack spacing={4}>
              
              {/* Status Alerts */}
              {error && (
                <Fade in timeout={500}>
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
                    <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                      Authentication Failed
                    </Typography>
                    <Typography variant="body2">
                      {error}
                    </Typography>
                  </Alert>
                </Fade>
              )}

              {success && (
                <Fade in timeout={500}>
                  <Alert 
                    severity="success" 
                    sx={{ 
                      borderRadius: '12px',
                      border: '1px solid #bbf7d0',
                      background: '#f0fdf4',
                      '& .MuiAlert-icon': { color: '#059669' }
                    }}
                    action={
                      <IconButton
                        color="inherit"
                        size="small"
                        onClick={() => setSuccess(null)}
                      >
                        <Close fontSize="inherit" />
                      </IconButton>
                    }
                  >
                    <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                      Welcome Back!
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Your attendance has been successfully recorded.
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      Recorded at: {format(new Date(), 'hh:mm:ss a')}
                    </Typography>
                  </Alert>
                </Fade>
              )}

              {/* User Information */}
              {success && (
                <Slide direction="left" in timeout={1200}>
                  <Card 
                    elevation={0}
                    sx={{ 
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      background: '#ffffff'
                    }}
                  >
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#1f2937' }}>
                        Employee Information
                      </Typography>
                      
                      <Stack direction="row" spacing={3} sx={{ mb: 3 }}>
                        <Avatar 
                          sx={{ 
                            width: 48, 
                            height: 48,
                            background: '#3b82f6',
                            color: '#ffffff',
                            fontSize: '1.25rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {success.user.full_name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="600" sx={{ color: '#1f2937' }}>
                            {success.user.full_name}
                          </Typography>
                          <Chip
                            label={success.user.role === 'admin' ? 'Administrator' : 'Employee'}
                            size="small"
                            sx={{
                              background: success.user.role === 'admin' ? '#fee2e2' : '#dbeafe',
                              color: success.user.role === 'admin' ? '#dc2626' : '#3b82f6',
                              fontWeight: '500',
                              fontSize: '0.75rem'
                            }}
                          />
                        </Box>
                      </Stack>
                      
                      <Stack spacing={2}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>Employee ID</Typography>
                          <Typography variant="body2" fontWeight="500" sx={{ color: '#1f2937', fontFamily: 'monospace' }}>
                            {success.user.unique_id}
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>Department</Typography>
                          <Typography variant="body2" fontWeight="500" sx={{ color: '#1f2937' }}>
                            {success.user.department || 'General'}
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>Email</Typography>
                          <Typography variant="body2" fontWeight="500" sx={{ color: '#1f2937', fontSize: '0.875rem' }}>
                            {success.user.email}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Slide>
              )}

              {/* Guidelines Card */}
              <Card 
                elevation={0}
                sx={{ 
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  background: '#ffffff'
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#1f2937' }}>
                    Recognition Guidelines
                  </Typography>
                  
                  <Stack spacing={2}>
                    {[
                      'Position your face clearly within the camera frame',
                      'Ensure adequate lighting on your face',
                      'Remove sunglasses or face coverings',
                      'Look directly at the camera',
                      'Keep your face steady during capture'
                    ].map((guideline, index) => (
                      <Box key={index} display="flex" alignItems="flex-start" gap={2}>
                        <CheckCircle sx={{ fontSize: 16, color: '#10b981', mt: 0.25 }} />
                        <Typography variant="body2" sx={{ color: '#6b7280', lineHeight: 1.5 }}>
                          {guideline}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card 
                elevation={0}
                sx={{ 
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  background: '#ffffff'
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#1f2937' }}>
                    System Status
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box 
                        textAlign="center" 
                        sx={{ 
                          p: 3, 
                          background: faceDetected ? '#f0fdf4' : '#f9fafb',
                          borderRadius: '8px',
                          border: `1px solid ${faceDetected ? '#bbf7d0' : '#e5e7eb'}`
                        }}
                      >
                        <Box 
                          sx={{ 
                            fontSize: '1.5rem',
                            color: faceDetected ? '#10b981' : '#6b7280',
                            mb: 1
                          }}
                        >
                          {faceDetected ? '✓' : '○'}
                        </Box>
                        <Typography variant="caption" fontWeight="500" sx={{ color: '#6b7280' }}>
                          Face Detection
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box 
                        textAlign="center" 
                        sx={{ 
                          p: 3, 
                          background: '#f0f9ff',
                          borderRadius: '8px',
                          border: '1px solid #bae6fd'
                        }}
                      >
                        <Box sx={{ fontSize: '1.5rem', color: '#0369a1', mb: 1 }}>
                          AI
                        </Box>
                        <Typography variant="caption" fontWeight="500" sx={{ color: '#6b7280' }}>
                          Recognition
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default MarkAttendance; 