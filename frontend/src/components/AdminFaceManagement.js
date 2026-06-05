import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  TextField,
  Grid,
  Paper,
  LinearProgress,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Delete,
  CameraAlt,
  Refresh,
  CheckCircle,
  Cancel,
  Info,
  Search,
  FilterList,
} from '@mui/icons-material';
import { adminAPI, faceAPI, webcamCaptureToFile } from '../services/api';
import SimpleSmartWebcam from './SimpleSmartWebcam';
import FaceQualityIndicator from './FaceQualityIndicator';
import LivenessIndicator from './LivenessIndicator';

const AdminFaceManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, registered, not-registered

  // Re-registration dialog
  const [registerDialog, setRegisterDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploadingFace, setUploadingFace] = useState(false);
  const [qualityData, setQualityData] = useState(null);
  const [livenessData, setLivenessData] = useState(null);
  
  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  
  // Details dialog
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const webcamRef = useRef(null);
  const [intervalId, setIntervalId] = useState(null);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    withFaces: 0,
    withoutFaces: 0
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.getUsersFaceStatus();
      setUsers(response.data.users);
      setStats({
        total: response.data.total_users,
        withFaces: response.data.users_with_faces,
        withoutFaces: response.data.users_without_faces
      });
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFaceData = async (user) => {
    try {
      await adminAPI.deleteUserFaceData(user.user.unique_id);
      setSuccess(`Face data deleted for ${user.user.full_name}`);
      setDeleteDialog(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete face data');
    }
  };

  const handleViewDetails = async (user) => {
    setDetailsDialog(true);
    setLoadingDetails(true);
    setUserDetails(null);
    try {
      const response = await adminAPI.getUserFaceDetails(user.user.unique_id);
      setUserDetails(response.data);
    } catch (err) {
      setError('Failed to load user details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const openRegisterDialog = (user) => {
    setSelectedUser(user);
    setCapturedImages([]);
    setRegisterDialog(true);
    setQualityData(null);
    setLivenessData(null);
  };

  const closeRegisterDialog = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setRegisterDialog(false);
    setSelectedUser(null);
    setCapturedImages([]);
    setIsCapturing(false);
    setQualityData(null);
    setLivenessData(null);
  };

  const startCapturing = () => {
    setIsCapturing(true);
    setCapturedImages([]);
    
    const interval = setInterval(() => {
      if (webcamRef.current && webcamRef.current.captureImage) {
        const imageSrc = webcamRef.current.captureImage();
        if (imageSrc) {
          setCapturedImages(prev => {
            const newImages = [...prev, imageSrc];
            if (newImages.length >= 6) {
              clearInterval(interval);
              setIntervalId(null);
              setIsCapturing(false);
            }
            return newImages;
          });
        }
      }
    }, 1500);
    
    setIntervalId(interval);
  };

  const uploadFaceImages = async () => {
    if (capturedImages.length < 5) {
      setError('At least 5 images required');
      return;
    }

    setUploadingFace(true);
    setError('');

    try {
      const files = await Promise.all(
        capturedImages.map(async (imageSrc, index) => {
          return await webcamCaptureToFile(imageSrc, `face_${index + 1}.jpg`);
        })
      );

      const response = await adminAPI.registerUserFace(selectedUser.user.unique_id, files);
      
      setSuccess(`Face registered successfully for ${selectedUser.user.full_name}`);
      closeRegisterDialog();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Face registration failed');
    } finally {
      setUploadingFace(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.user.unique_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' ||
                          (filterStatus === 'registered' && user.face_registered) ||
                          (filterStatus === 'not-registered' && !user.face_registered);
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} sx={{ color: '#212E46' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ background: 'linear-gradient(135deg, #f5f3f0 0%, #fafaf9 50%, #ffffff 100%)', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="800" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif', mb: 1 }}>
            Face Management
          </Typography>
          <Typography variant="body1" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
            Manage user face registrations, view status, and re-register faces
          </Typography>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h3" fontWeight="800" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif' }}>
                  {stats.total}
                </Typography>
                <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                  Total Users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ borderRadius: '20px', border: '2px solid #86efac', background: '#f0fdf4' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h3" fontWeight="800" sx={{ color: '#16a34a', fontFamily: '"Inter", sans-serif' }}>
                  {stats.withFaces}
                </Typography>
                <Typography variant="body2" sx={{ color: '#166534', fontFamily: '"Inter", sans-serif' }}>
                  Faces Registered
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ borderRadius: '20px', border: '2px solid #fca5a5', background: '#fef2f2' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h3" fontWeight="800" sx={{ color: '#dc2626', fontFamily: '"Inter", sans-serif' }}>
                  {stats.withoutFaces}
                </Typography>
                <Typography variant="body2" sx={{ color: '#991b1b', fontFamily: '"Inter", sans-serif' }}>
                  Pending Registration
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Filter */}
        <Card elevation={0} sx={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.08)', mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Search by name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ color: '#9ca3af', mr: 1 }} />,
                    sx: { borderRadius: '12px', fontFamily: '"Inter", sans-serif' }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant={filterStatus === 'all' ? 'contained' : 'outlined'}
                  onClick={() => setFilterStatus('all')}
                  sx={{ borderRadius: '12px', textTransform: 'none', fontFamily: '"Inter", sans-serif' }}
                >
                  All ({users.length})
                </Button>
              </Grid>
              <Grid item xs={6} md={1.5}>
                <Button
                  fullWidth
                  variant={filterStatus === 'registered' ? 'contained' : 'outlined'}
                  onClick={() => setFilterStatus('registered')}
                  sx={{ borderRadius: '12px', textTransform: 'none', fontFamily: '"Inter", sans-serif', fontSize: '0.8rem' }}
                >
                  Registered
                </Button>
              </Grid>
              <Grid item xs={6} md={1.5}>
                <Button
                  fullWidth
                  variant={filterStatus === 'not-registered' ? 'contained' : 'outlined'}
                  onClick={() => setFilterStatus('not-registered')}
                  sx={{ borderRadius: '12px', textTransform: 'none', fontFamily: '"Inter", sans-serif', fontSize: '0.8rem' }}
                >
                  Pending
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card elevation={0} sx={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.08)' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ background: '#fafaf9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: '700', fontFamily: '"Inter", sans-serif' }}>User</TableCell>
                  <TableCell sx={{ fontWeight: '700', fontFamily: '"Inter", sans-serif' }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: '700', fontFamily: '"Inter", sans-serif' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: '700', fontFamily: '"Inter", sans-serif' }}>Images</TableCell>
                  <TableCell sx={{ fontWeight: '700', fontFamily: '"Inter", sans-serif' }}>Details</TableCell>
                  <TableCell align="right" sx={{ fontWeight: '700', fontFamily: '"Inter", sans-serif' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="600" sx={{ fontFamily: '"Inter", sans-serif' }}>
                          {user.user.full_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontFamily: '"Inter", sans-serif' }}>
                          {user.user.email}
                        </Typography>
                        <br />
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontFamily: '"Inter", sans-serif' }}>
                          ID: {user.user.unique_id}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: '"Inter", sans-serif' }}>
                        {user.user.department || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {user.face_registered ? (
                        <Chip 
                          icon={<CheckCircle />}
                          label="Registered" 
                          size="small"
                          sx={{ 
                            background: '#dcfce7', 
                            color: '#16a34a', 
                            fontWeight: '700',
                            fontFamily: '"Inter", sans-serif'
                          }} 
                        />
                      ) : (
                        <Chip 
                          icon={<Cancel />}
                          label="Not Registered" 
                          size="small"
                          sx={{ 
                            background: '#fef2f2', 
                            color: '#dc2626', 
                            fontWeight: '700',
                            fontFamily: '"Inter", sans-serif'
                          }} 
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="600" sx={{ fontFamily: '"Inter", sans-serif' }}>
                        {user.face_images_count || 0} images
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {user.registration_details && (
                        <Stack spacing={0.5}>
                          <Typography variant="caption" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                            Model: {user.registration_details.model}
                          </Typography>
                          {user.registration_details.quality_checked && (
                            <Chip label="Quality ✓" size="small" sx={{ height: '20px', fontSize: '0.65rem' }} />
                          )}
                          {user.registration_details.liveness_checked && (
                            <Chip label="Liveness ✓" size="small" sx={{ height: '20px', fontSize: '0.65rem' }} />
                          )}
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {user.face_registered && (
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(user)}
                              sx={{ color: '#212E46' }}
                            >
                              <Info />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title={user.face_registered ? "Re-register Face" : "Register Face"}>
                          <IconButton
                            size="small"
                            onClick={() => openRegisterDialog(user)}
                            sx={{ color: '#f97316' }}
                          >
                            <CameraAlt />
                          </IconButton>
                        </Tooltip>
                        {user.face_registered && (
                          <Tooltip title="Delete Face Data">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setUserToDelete(user);
                                setDeleteDialog(true);
                              }}
                              sx={{ color: '#dc2626' }}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Registration Dialog */}
        <Dialog 
          open={registerDialog} 
          onClose={closeRegisterDialog} 
          maxWidth="lg" 
          fullWidth
        >
          <DialogTitle sx={{ background: '#212E46', color: '#ffffff', fontFamily: '"Inter", sans-serif' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="700">
                {selectedUser?.face_registered ? 'Re-register' : 'Register'} Face - {selectedUser?.user.full_name}
              </Typography>
              <Chip 
                label={`${capturedImages.length}/6 captured`} 
                sx={{ background: '#f97316', color: '#ffffff', fontWeight: '700' }}
              />
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '2px solid #e7e5e4' }}>
                  <SimpleSmartWebcam
                    ref={webcamRef}
                    height={300}
                    width="100%"
                    showDetection={true}
                    mode="capture"
                  />
                  {qualityData && <FaceQualityIndicator qualityData={qualityData} compact={true} />}
                  {livenessData && <LivenessIndicator livenessData={livenessData} compact={true} />}
                </Box>
                
                <Box sx={{ mt: 2 }}>
                  {!isCapturing && capturedImages.length < 6 && (
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<CameraAlt />}
                      onClick={startCapturing}
                      sx={{
                        py: 2,
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                        textTransform: 'none',
                        fontFamily: '"Inter", sans-serif',
                        fontWeight: '700'
                      }}
                    >
                      Start Capturing
                    </Button>
                  )}
                  {isCapturing && (
                    <Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={(capturedImages.length / 6) * 100}
                        sx={{ 
                          mb: 2, 
                          height: 8, 
                          borderRadius: 4,
                          '& .MuiLinearProgress-bar': { background: '#16a34a' }
                        }}
                      />
                      <Typography variant="body2" align="center" sx={{ color: '#16a34a', fontWeight: '700' }}>
                        Capturing... {capturedImages.length}/6
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight="700" sx={{ mb: 2, fontFamily: '"Inter", sans-serif' }}>
                  Captured Images ({capturedImages.length}/6)
                </Typography>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: 2,
                  minHeight: 200,
                  border: '2px dashed #e7e5e4',
                  borderRadius: '12px',
                  p: 2
                }}>
                  {capturedImages.map((img, index) => (
                    <Box key={index} sx={{ 
                      position: 'relative',
                      border: '2px solid #16a34a',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      aspectRatio: '1'
                    }}>
                      <img src={img} alt={`Capture ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <Box sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        background: '#16a34a',
                        color: '#ffffff',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: '700'
                      }}>
                        {index + 1}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={closeRegisterDialog} sx={{ textTransform: 'none', fontFamily: '"Inter", sans-serif' }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setCapturedImages([]);
                if (intervalId) {
                  clearInterval(intervalId);
                  setIntervalId(null);
                }
                setIsCapturing(false);
              }}
              disabled={capturedImages.length === 0}
              sx={{ textTransform: 'none', fontFamily: '"Inter", sans-serif' }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              onClick={uploadFaceImages}
              disabled={capturedImages.length < 5 || uploadingFace}
              startIcon={uploadingFace ? <CircularProgress size={20} sx={{ color: '#ffffff' }} /> : null}
              sx={{
                background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                textTransform: 'none',
                fontFamily: '"Inter", sans-serif',
                fontWeight: '700'
              }}
            >
              {uploadingFace ? 'Registering...' : 'Complete Registration'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontFamily: '"Inter", sans-serif', fontWeight: '700' }}>
            Confirm Delete
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This will permanently delete all face data for {userToDelete?.user.full_name}. The user will need to re-register their face.
            </Alert>
            <Typography>Are you sure you want to continue?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => handleDeleteFaceData(userToDelete)}
              sx={{ textTransform: 'none', fontWeight: '700' }}
            >
              Delete Face Data
            </Button>
          </DialogActions>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={detailsDialog} onClose={() => setDetailsDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ background: '#212E46', color: '#ffffff', fontFamily: '"Inter", sans-serif', fontWeight: '700' }}>
            Face Registration Details
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            {loadingDetails ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : userDetails ? (
              <Box>
                <Typography variant="h6" fontWeight="700" sx={{ mb: 2, fontFamily: '"Inter", sans-serif' }}>
                  {userDetails.user.full_name}
                </Typography>
                
                {userDetails.face_registered ? (
                  <Box>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 2, borderRadius: '12px', background: '#f0fdf4' }}>
                          <Typography variant="caption" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                            Registered Date
                          </Typography>
                          <Typography variant="body2" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif' }}>
                            {new Date(userDetails.registration_info.registered_date).toLocaleDateString()}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 2, borderRadius: '12px', background: '#f0fdf4' }}>
                          <Typography variant="caption" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                            Total Images
                          </Typography>
                          <Typography variant="body2" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif' }}>
                            {userDetails.total_images}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 2, borderRadius: '12px', background: '#fff7ed' }}>
                          <Typography variant="caption" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                            Model
                          </Typography>
                          <Typography variant="body2" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif' }}>
                            {userDetails.registration_info.model.toUpperCase()}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 2, borderRadius: '12px', background: '#fff7ed' }}>
                          <Typography variant="caption" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                            Valid Images
                          </Typography>
                          <Typography variant="body2" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif' }}>
                            {userDetails.registration_info.valid_images}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" fontWeight="700" sx={{ mb: 1, fontFamily: '"Inter", sans-serif' }}>
                        Quality Checks
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        {userDetails.registration_info.quality_checked && (
                          <Chip label="Quality Verified" color="success" size="small" />
                        )}
                        {userDetails.registration_info.liveness_checked && (
                          <Chip label="Liveness Verified" color="success" size="small" />
                        )}
                      </Stack>
                    </Box>
                  </Box>
                ) : (
                  <Alert severity="info">No face data registered for this user</Alert>
                )}
              </Box>
            ) : (
              <Alert severity="error">Failed to load details</Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialog(false)} sx={{ textTransform: 'none' }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
};

export default AdminFaceManagement;
