import React, { useState, useRef } from 'react';
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
} from '@mui/material';
import { CameraAlt, CheckCircle, Person, Schedule } from '@mui/icons-material';
import Webcam from 'react-webcam';
import { attendanceAPI, webcamCaptureToFile } from '../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const MarkAttendance = () => {
  const webcamRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user"
  };

  const markAttendance = async () => {
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Could not capture image from camera');
      }

      const imageFile = await webcamCaptureToFile(imageSrc, 'attendance.jpg');
      const response = await attendanceAPI.markAttendance(imageFile);
      
      setSuccess(response.data);
      toast.success(response.data.message);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Attendance marking failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3 }}>
        <Box textAlign="center" mb={4}>
          <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" fontWeight="600" gutterBottom>
            Mark Attendance
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Look at the camera and click the button to mark your attendance
          </Typography>
          <Chip 
            label={format(new Date(), 'EEEE, MMMM do, yyyy')} 
            color="primary" 
            sx={{ mt: 2 }}
            icon={<Schedule />}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight="600">
                ✅ Attendance Marked Successfully!
              </Typography>
              <Typography variant="body2">
                Welcome, {success.user.full_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Time: {format(new Date(), 'hh:mm:ss a')}
              </Typography>
            </Box>
          </Alert>
        )}

        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Camera View
            </Typography>
            
            <Box className="webcam-container" sx={{ display: 'inline-block', mb: 3 }}>
              <Webcam
                audio={false}
                height={300}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                width={400}
                videoConstraints={videoConstraints}
                style={{ 
                  border: '3px solid #2e7d32', 
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                }}
              />
            </Box>

            <Button
              variant="contained"
              color="success"
              size="large"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CameraAlt />}
              onClick={markAttendance}
              disabled={loading}
              sx={{ px: 4, py: 1.5 }}
            >
              {loading ? 'Recognizing Face...' : 'Mark My Attendance'}
            </Button>
          </CardContent>
        </Card>

        <Box p={3} bgcolor="grey.50" borderRadius={2}>
          <Typography variant="h6" gutterBottom>
            📋 Instructions:
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li>Position your face clearly in the camera frame</li>
              <li>Ensure good lighting for better recognition</li>
              <li>Remove sunglasses or masks if wearing any</li>
              <li>Click "Mark My Attendance" when ready</li>
              <li>You can only mark attendance once per day</li>
            </ul>
          </Typography>
        </Box>

        {success && (
          <Card sx={{ mt: 3, bgcolor: 'success.50', borderColor: 'success.main' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Person color="success" />
                <Box>
                  <Typography variant="h6" color="success.main">
                    {success.user.full_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ID: {success.user.unique_id}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Department: {success.user.department || 'Not specified'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Paper>
    </Container>
  );
};

export default MarkAttendance; 