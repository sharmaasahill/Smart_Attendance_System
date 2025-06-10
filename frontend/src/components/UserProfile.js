import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  Divider,
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
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon,
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

  const handleProfileUpdate = async () => {
    try {
      setError('');
      setSuccess('');
      
      const response = await userAPI.updateProfile(profileForm);
      setUser(response.data.user);
      setSuccess('Profile updated successfully!');
      setEditMode(false);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to update profile');
    }
  };

  const handlePasswordChange = async () => {
    try {
      setError('');
      setSuccess('');

      if (passwordForm.new_password !== passwordForm.confirm_password) {
        setError('New passwords do not match');
        return;
      }

      if (passwordForm.new_password.length < 6) {
        setError('New password must be at least 6 characters long');
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
      setError(error.response?.data?.detail || 'Failed to change password');
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
            <Box sx={{ p: 4, borderBottom: '1px solid #f3f4f6' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Avatar 
                    sx={{ 
                      width: 64, 
                      height: 64, 
                      background: '#3b82f6',
                      fontSize: '1.75rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {user?.full_name?.charAt(0) || 'U'}
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight="600" sx={{ color: '#1f2937', letterSpacing: '-0.025em', mb: 1 }}>
                      My Profile
                    </Typography>
                    <Chip 
                      label={user?.role === 'admin' ? 'Admin' : 'User'}
                      sx={{
                        background: user?.role === 'admin' ? '#fee2e2' : '#dbeafe',
                        color: user?.role === 'admin' ? '#dc2626' : '#3b82f6',
                        fontWeight: '500',
                        fontSize: '0.875rem',
                      }}
                    />
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {!editMode ? (
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
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
                        startIcon={<SaveIcon />}
                        onClick={handleProfileUpdate}
                        sx={{
                          borderRadius: '8px',
                          background: '#3b82f6',
                          textTransform: 'none',
                          fontWeight: '500',
                          boxShadow: 'none',
                          '&:hover': {
                            background: '#2563eb',
                            boxShadow: 'none',
                          },
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        onClick={handleCancelEdit}
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
                        Cancel
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outlined"
                    startIcon={<LockIcon />}
                    onClick={() => setPasswordDialogOpen(true)}
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
                    <Typography variant="h6" fontWeight="600" sx={{ color: '#1f2937', mb: 3 }}>
                      Personal Information
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <PersonIcon sx={{ color: '#6b7280', fontSize: 20 }} />
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
                        <EmailIcon sx={{ color: '#6b7280', fontSize: 20 }} />
                        <Typography variant="body1" sx={{ color: '#1f2937' }}>
                          {user?.email}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <PhoneIcon sx={{ color: '#6b7280', fontSize: 20 }} />
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
                        <BusinessIcon sx={{ color: '#6b7280', fontSize: 20 }} />
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
                    <Typography variant="h6" fontWeight="600" sx={{ color: '#1f2937', mb: 3 }}>
                      Account Information
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <BadgeIcon sx={{ color: '#6b7280', fontSize: 20 }} />
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
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
            },
          }}
        >
          <DialogTitle sx={{ color: '#1f2937', fontWeight: '600', pb: 2 }}>
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
              sx={{
                borderRadius: '8px',
                background: '#3b82f6',
                textTransform: 'none',
                fontWeight: '500',
                boxShadow: 'none',
                '&:hover': {
                  background: '#2563eb',
                  boxShadow: 'none',
                },
              }}
            >
              Change Password
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default UserProfile;