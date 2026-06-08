import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Card,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  IconButton,
  Fade,
  CircularProgress,
  CardMedia,
  Stack,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { userAPI } from '../services/api';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [viewFacesDialogOpen, setViewFacesDialogOpen] = useState(false);
  const [registeredFaces, setRegisteredFaces] = useState(null);
  const [loadingFaces, setLoadingFaces] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone_number: '',
    department: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getProfile();
      setUser(response.data);
      setProfileForm({
        full_name: response.data.full_name || '',
        phone_number: response.data.phone_number || '',
        department: response.data.department || '',
      });
    } catch (error) {
      setError('Failed to load profile');
      console.error('Profile fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const [updateLoading, setUpdateLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleProfileUpdate = async () => {
    setUpdateLoading(true);
    try {
      setError('');
      setSuccess('');
      
      const response = await userAPI.updateProfile(profileForm);
      setUser(response.data.user);
      setSuccess('Profile updated successfully!');
      setEditMode(false);
    } catch (error) {
      let errorMsg = 'Failed to update profile';
      if (error.response?.status === 400) {
        errorMsg = error.response?.data?.detail || 'Invalid data. Please check your inputs.';
      } else if (error.response?.status === 401) {
        errorMsg = 'Authentication expired. Please log in again.';
      } else if (error.response?.status === 409) {
        errorMsg = 'Email already in use by another account.';
      } else if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      }
      setError(errorMsg);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordLoading(true);
    try {
      setError('');
      setSuccess('');

      if (passwordForm.new_password !== passwordForm.confirm_password) {
        setError('New passwords do not match. Please re-enter your password.');
        setPasswordLoading(false);
        return;
      }

      if (passwordForm.new_password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setPasswordLoading(false);
        return;
      }

      await userAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });

      setSuccess('Password changed successfully!');
      setPasswordDialogOpen(false);
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error) {
      let errorMsg = 'Failed to change password';
      if (error.response?.status === 400) {
        errorMsg = error.response?.data?.detail || 'Invalid password. Please check your current password.';
      } else if (error.response?.status === 401) {
        errorMsg = 'Current password is incorrect. Please try again.';
      } else if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      }
      setError(errorMsg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileForm({
      full_name: user.full_name || '',
      phone_number: user.phone_number || '',
      department: user.department || '',
    });
    setEditMode(false);
    setError('');
  };

  const handleViewRegisteredFaces = async () => {
    setViewFacesDialogOpen(true);
    setLoadingFaces(true);
    setError('');
    
    try {
      const response = await userAPI.getRegisteredFaces();
      console.log('Face API Response:', response); // Debug log
      
      // Check if response has data
      if (response && response.data) {
        // Ensure faces array exists
        if (!response.data.faces) {
          response.data.faces = [];
        }
        setRegisteredFaces(response.data);
      } else {
        setError('Invalid response from server');
      }
    } catch (error) {
      console.error('Error loading faces:', error); // Debug log
      let errorMsg = 'Failed to load registered faces';
      if (error.response?.status === 404) {
        errorMsg = 'No face data found. Please register your face first.';
      } else if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      }
      setError(errorMsg);
    } finally {
      setLoadingFaces(false);
    }
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="60vh"
        sx={{ background: '#fafafa' }}
      >
        <CircularProgress size={40} sx={{ color: '#6b7280' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ background: 'linear-gradient(135deg, #f5f3f0 0%, #fafaf9 50%, #ffffff 100%)', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Fade in timeout={800}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '20px',
              background: '#ffffff',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            }}
          >
            {/* Header */}
            <Box sx={{ p: 4, borderBottom: '1px solid #f3f4f6' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Avatar 
                    sx={{ 
                      width: 64, 
                      height: 64, 
                      background: 'linear-gradient(135deg, #212E46, #2c3e5a)',
                      fontSize: '1.75rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {user?.full_name?.charAt(0) || 'U'}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight="700" sx={{ color: '#212E46', letterSpacing: '-0.025em', mb: 1, fontFamily: '"Inter", sans-serif' }}>
                      My Profile
                    </Typography>
                    <Chip 
                      label={user?.role === 'admin' ? 'Admin' : 'User'}
                      sx={{
                        background: user?.role === 'admin' ? '#ffedd5' : '#dbeafe',
                        color: user?.role === 'admin' ? '#f97316' : '#212E46',
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        fontFamily: '"Inter", sans-serif',
                      }}
                    />
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {!editMode ? (
                    <Button
                      variant="outlined"
                      onClick={() => setEditMode(true)}
                      sx={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        color: '#6b7280',
                        textTransform: 'none',
                        fontWeight: '500',
                        '&:hover': {
                          border: '1px solid #d1d5db',
                          background: '#f9fafb',
                        },
                      }}
                    >
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="contained"
                        disabled={updateLoading}
                        startIcon={updateLoading ? <CircularProgress size={16} sx={{ color: '#ffffff' }} /> : null}
                        onClick={handleProfileUpdate}
                        sx={{
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #212E46 0%, #2c3e5a 100%)',
                          textTransform: 'none',
                          fontWeight: '600',
                          fontFamily: '"Inter", sans-serif',
                          boxShadow: '0 4px 12px rgba(33,46,70,0.2)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #1a2333 0%, #212E46 100%)',
                            boxShadow: '0 6px 16px rgba(33,46,70,0.25)',
                          },
                          '&:disabled': {
                            background: 'linear-gradient(135deg, #212E46 0%, #2c3e5a 100%)',
                            opacity: 0.6,
                          },
                        }}
                      >
                        {updateLoading ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={handleCancelEdit}
                        sx={{
                          borderRadius: '12px',
                          border: '2px solid #e7e5e4',
                          color: '#78716c',
                          textTransform: 'none',
                          fontWeight: '600',
                          fontFamily: '"Inter", sans-serif',
                          '&:hover': {
                            border: '2px solid #d6d3d1',
                            background: '#fafaf9',
                          },
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outlined"
                    onClick={() => setPasswordDialogOpen(true)}
                    sx={{
                      borderRadius: '12px',
                      border: '2px solid #e7e5e4',
                      color: '#78716c',
                      textTransform: 'none',
                      fontWeight: '600',
                      fontFamily: '"Inter", sans-serif',
                      '&:hover': {
                        border: '2px solid #d6d3d1',
                        background: '#fafaf9',
                      },
                    }}
                  >
                    Change Password
                  </Button>
                </Box>
              </Box>

              {/* Alerts */}
              {error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mt: 3,
                    borderRadius: '8px',
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#dc2626',
                  }}
                  action={
                    <IconButton
                      color="inherit"
                      size="small"
                      onClick={() => setError('')}
                    >
                      <CloseIcon fontSize="inherit" />
                    </IconButton>
                  }
                >
                  {error}
                </Alert>
              )}
              {success && (
                <Alert 
                  severity="success" 
                  sx={{ 
                    mt: 3,
                    borderRadius: '8px',
                    border: '1px solid #dcfce7',
                    background: '#f0fdf4',
                    color: '#16a34a',
                  }}
                  action={
                    <IconButton
                      color="inherit"
                      size="small"
                      onClick={() => setSuccess('')}
                    >
                      <CloseIcon fontSize="inherit" />
                    </IconButton>
                  }
                >
                  {success}
                </Alert>
              )}
            </Box>

            {/* Profile Information */}
            <Box sx={{ p: 4 }}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" fontWeight="700" sx={{ color: '#212E46', mb: 3, fontFamily: '"Inter", sans-serif' }}>
                      Personal Information
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {editMode ? (
                          <TextField
                            fullWidth
                            label="Full Name"
                            value={profileForm.full_name}
                            onChange={(e) => setProfileForm({
                              ...profileForm,
                              full_name: e.target.value
                            })}
                            size="small"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '8px',
                                background: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                '& fieldset': {
                                  border: 'none',
                                },
                                '&:hover': {
                                  background: '#f3f4f6',
                                },
                                '&.Mui-focused': {
                                  background: '#ffffff',
                                  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                                  border: '1px solid #3b82f6',
                                },
                              },
                            }}
                          />
                        ) : (
                          <Typography variant="body1" sx={{ color: '#1f2937' }}>
                            {user?.full_name}
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body1" sx={{ color: '#1f2937' }}>
                          {user?.email}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {editMode ? (
                          <TextField
                            fullWidth
                            label="Phone Number"
                            value={profileForm.phone_number}
                            onChange={(e) => setProfileForm({
                              ...profileForm,
                              phone_number: e.target.value
                            })}
                            size="small"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '8px',
                                background: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                '& fieldset': {
                                  border: 'none',
                                },
                                '&:hover': {
                                  background: '#f3f4f6',
                                },
                                '&.Mui-focused': {
                                  background: '#ffffff',
                                  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                                  border: '1px solid #3b82f6',
                                },
                              },
                            }}
                          />
                        ) : (
                          <Typography variant="body1" sx={{ color: '#1f2937' }}>
                            {user?.phone_number || 'Not provided'}
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {editMode ? (
                          <TextField
                            fullWidth
                            label="Department"
                            value={profileForm.department}
                            onChange={(e) => setProfileForm({
                              ...profileForm,
                              department: e.target.value
                            })}
                            size="small"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '8px',
                                background: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                '& fieldset': {
                                  border: 'none',
                                },
                                '&:hover': {
                                  background: '#f3f4f6',
                                },
                                '&.Mui-focused': {
                                  background: '#ffffff',
                                  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                                  border: '1px solid #3b82f6',
                                },
                              },
                            }}
                          />
                        ) : (
                          <Typography variant="body1" sx={{ color: '#1f2937' }}>
                            {user?.department || 'CSE'}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" fontWeight="700" sx={{ color: '#212E46', mb: 3, fontFamily: '"Inter", sans-serif' }}>
                      Account Information
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                            User ID
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ color: '#1f2937', fontFamily: 'monospace', ml: 3 }}>
                          {user?.unique_id}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500, mb: 1 }}>
                          Face Registration Status
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Chip 
                            label={user?.face_registered ? 'Registered' : 'Pending'} 
                            sx={{
                              background: user?.face_registered ? '#dcfce7' : '#fef3c7',
                              color: user?.face_registered ? '#16a34a' : '#d97706',
                              fontWeight: '500',
                              fontSize: '0.75rem',
                              ml: 0,
                            }}
                          />
                          {user?.face_registered ? (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={handleViewRegisteredFaces}
                              sx={{
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                color: '#6b7280',
                                textTransform: 'none',
                                fontWeight: '600',
                                fontSize: '0.75rem',
                                fontFamily: '"Inter", sans-serif',
                                '&:hover': {
                                  border: '1px solid #d1d5db',
                                  background: '#f9fafb',
                                },
                              }}
                            >
                              View Faces
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => window.location.href = '/face-capture'}
                              sx={{
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                                color: '#ffffff',
                                textTransform: 'none',
                                fontWeight: '600',
                                fontSize: '0.75rem',
                                fontFamily: '"Inter", sans-serif',
                                boxShadow: '0 2px 8px rgba(249,115,22,0.3)',
                                '&:hover': {
                                  background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                                  boxShadow: '0 4px 12px rgba(249,115,22,0.4)',
                                },
                              }}
                            >
                              Register Face
                            </Button>
                          )}
                        </Stack>
                      </Box>

                      <Box>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500, mb: 1 }}>
                          Account Status
                        </Typography>
                        <Chip 
                          label={user?.is_active ? 'Active' : 'Inactive'} 
                          sx={{
                            background: user?.is_active ? '#dcfce7' : '#fecaca',
                            color: user?.is_active ? '#16a34a' : '#dc2626',
                            fontWeight: '500',
                            fontSize: '0.75rem',
                            ml: 0,
                          }}
                        />
                      </Box>

                      <Box>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500, mb: 1 }}>
                          Member Since
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#1f2937' }}>
                          {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '09/06/2025'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Card>
        </Fade>

        {/* Password Change Dialog */}
        <Dialog 
          open={passwordDialogOpen} 
          onClose={() => setPasswordDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '20px',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            },
          }}
        >
          <DialogTitle sx={{ color: '#212E46', fontWeight: '700', pb: 2, fontFamily: '"Inter", sans-serif' }}>
            Change Password
          </DialogTitle>
          <DialogContent sx={{ px: 3 }}>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                fullWidth
                type="password"
                label="Current Password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({
                  ...passwordForm,
                  current_password: e.target.value
                })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    '& fieldset': {
                      border: 'none',
                    },
                    '&:hover': {
                      background: '#f3f4f6',
                    },
                    '&.Mui-focused': {
                      background: '#ffffff',
                      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                      border: '1px solid #3b82f6',
                    },
                  },
                }}
              />
              <TextField
                fullWidth
                type="password"
                label="New Password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({
                  ...passwordForm,
                  new_password: e.target.value
                })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    '& fieldset': {
                      border: 'none',
                    },
                    '&:hover': {
                      background: '#f3f4f6',
                    },
                    '&.Mui-focused': {
                      background: '#ffffff',
                      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                      border: '1px solid #3b82f6',
                    },
                  },
                }}
              />
              <TextField
                fullWidth
                type="password"
                label="Confirm New Password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({
                  ...passwordForm,
                  confirm_password: e.target.value
                })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    '& fieldset': {
                      border: 'none',
                    },
                    '&:hover': {
                      background: '#f3f4f6',
                    },
                    '&.Mui-focused': {
                      background: '#ffffff',
                      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                      border: '1px solid #3b82f6',
                    },
                  },
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <Button 
              onClick={() => setPasswordDialogOpen(false)}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: '500',
                color: '#6b7280',
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordChange} 
              variant="contained"
              disabled={passwordLoading}
              startIcon={passwordLoading ? <CircularProgress size={16} sx={{ color: '#ffffff' }} /> : null}
              sx={{
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #212E46 0%, #2c3e5a 100%)',
                textTransform: 'none',
                fontWeight: '600',
                fontFamily: '"Inter", sans-serif',
                boxShadow: '0 4px 12px rgba(33,46,70,0.2)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1a2333 0%, #212E46 100%)',
                  boxShadow: '0 6px 16px rgba(33,46,70,0.25)',
                },
                '&:disabled': {
                  background: 'linear-gradient(135deg, #212E46 0%, #2c3e5a 100%)',
                  opacity: 0.6,
                },
              }}
            >
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Registered Faces Dialog */}
        <Dialog 
          open={viewFacesDialogOpen} 
          onClose={() => setViewFacesDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '20px',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            },
          }}
        >
          <DialogTitle sx={{ 
            color: '#212E46', 
            fontWeight: '700', 
            pb: 2, 
            fontFamily: '"Inter", sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              Registered Face Images
            </Box>
            <IconButton
              onClick={() => setViewFacesDialogOpen(false)}
              sx={{ color: '#6b7280' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ px: 3, pb: 3 }}>
            {loadingFaces ? (
              <Box 
                display="flex" 
                flexDirection="column"
                justifyContent="center" 
                alignItems="center" 
                minHeight="300px"
                gap={2}
              >
                <CircularProgress size={40} sx={{ color: '#f97316' }} />
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Loading your registered faces...
                </Typography>
              </Box>
            ) : error ? (
              <Box 
                display="flex" 
                flexDirection="column"
                justifyContent="center" 
                alignItems="center" 
                minHeight="200px"
                gap={2}
              >
                <Typography variant="body1" sx={{ color: '#dc2626', textAlign: 'center' }}>
                  {error}
                </Typography>
              </Box>
            ) : registeredFaces ? (
              <Box>
                {/* Summary */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 3,
                    background: '#f0fdf4',
                    border: '1px solid #dcfce7',
                    borderRadius: '12px',
                  }}
                >
                  <Stack direction="row" spacing={3} alignItems="center">
                    <Box>
                      <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                        Total Faces
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#16a34a', fontWeight: '700' }}>
                        {registeredFaces.total_faces}
                      </Typography>
                    </Box>
                    <Box sx={{ width: '1px', height: '40px', background: '#dcfce7' }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                        User ID
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#212E46', fontWeight: '600', fontFamily: 'monospace' }}>
                        {registeredFaces.user_id}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                {/* Face Images Grid */}
                <Grid container spacing={2}>
                  {registeredFaces?.faces && Array.isArray(registeredFaces.faces) && registeredFaces.faces.map((face, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card
                        elevation={0}
                        sx={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                            transform: 'translateY(-2px)',
                          },
                        }}
                      >
                        {/* Image */}
                        <CardMedia
                          component="img"
                          image={face.image_data}
                          alt={face.filename}
                          sx={{
                            width: '100%',
                            height: 200,
                            objectFit: 'cover',
                            background: '#f9fafb',
                          }}
                        />
                        
                        {/* Info */}
                        <Box sx={{ p: 2 }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: '#6b7280', 
                              fontWeight: '600',
                              display: 'block',
                              mb: 1,
                            }}
                          >
                            {face.filename}
                          </Typography>
                          
                          {/* Quality Score */}
                          {face.quality_score !== null && face.quality_score !== undefined && (
                            <Box sx={{ mb: 1 }}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
                                  Quality Score:
                                </Typography>
                                <Chip
                                  label={`${Math.round(face.quality_score)}%`}
                                  size="small"
                                  sx={{
                                    height: '20px',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    background: face.quality_score >= 70 ? '#dcfce7' : face.quality_score >= 50 ? '#fef3c7' : '#fecaca',
                                    color: face.quality_score >= 70 ? '#16a34a' : face.quality_score >= 50 ? '#d97706' : '#dc2626',
                                  }}
                                />
                              </Stack>
                              
                              {/* Quality Details */}
                              {face.quality_details && (
                                <Box sx={{ mt: 1 }}>
                                  {Object.entries(face.quality_details)
                                    .filter(([key, value]) => key !== 'accepted' && value !== null && value !== undefined)
                                    .map(([key, value]) => {
                                      const labelMap = {
                                        'face_size_score': 'Size',
                                        'brightness_score': 'Brightness',
                                        'sharpness_score': 'Sharpness',
                                        'pose_score': 'Pose',
                                        'eye_visibility_score': 'Eyes',
                                      };
                                      return (
                                        <Box 
                                          key={key} 
                                          sx={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            py: 0.3,
                                          }}
                                        >
                                          <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.65rem' }}>
                                            {labelMap[key] || key}
                                          </Typography>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Box
                                              sx={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                background: value >= 70 ? '#16a34a' : value >= 50 ? '#d97706' : '#dc2626',
                                              }}
                                            />
                                            <Typography variant="caption" sx={{ color: '#1f2937', fontSize: '0.65rem', fontWeight: '500' }}>
                                              {Math.round(value)}%
                                            </Typography>
                                          </Box>
                                        </Box>
                                      );
                                    })}
                                </Box>
                              )}
                            </Box>
                          )}
                          
                          {/* Registered Date */}
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: '#9ca3af',
                              fontSize: '0.65rem',
                              display: 'block',
                              mt: 1,
                            }}
                          >
                            {new Date(face.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {/* No faces message */}
                {registeredFaces?.faces && registeredFaces.faces.length === 0 && (
                  <Box 
                    display="flex" 
                    flexDirection="column"
                    justifyContent="center" 
                    alignItems="center" 
                    minHeight="200px"
                    gap={2}
                  >
                    <Typography variant="body1" sx={{ color: '#6b7280', textAlign: 'center' }}>
                      No face images found
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : null}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button 
              onClick={() => setViewFacesDialogOpen(false)}
              variant="outlined"
              sx={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                color: '#6b7280',
                textTransform: 'none',
                fontWeight: '600',
                '&:hover': {
                  border: '1px solid #d1d5db',
                  background: '#f9fafb',
                },
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default UserProfile;