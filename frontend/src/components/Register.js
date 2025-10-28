import React, { useState } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Fade,
  Card,
  CardContent,
  Avatar,
  useTheme,
  useMediaQuery,
  Divider,
  Stack,
  Grid,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  PersonAdd,
  Email,
  Phone,
  Business,
  Visibility,
  VisibilityOff,
  Lock,
  Person,
  CheckCircle,
} from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

const Register = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone_number: '',
    department: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const getPasswordStrength = (password) => {
    if (password.length === 0) return { strength: 0, text: 'Enter password', color: 'default' };
    if (password.length < 6) return { strength: 25, text: 'Weak', color: 'error' };
    if (password.length < 8) return { strength: 50, text: 'Fair', color: 'warning' };
    if (password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { strength: 100, text: 'Strong', color: 'success' };
    }
    return { strength: 75, text: 'Good', color: 'info' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');

    try {
      const registrationData = {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone_number: formData.phone_number || null,
        department: formData.department || null,
      };

      const response = await authAPI.register(registrationData);
      const { access_token, user } = response.data;
      
      login(user, access_token);
      toast.success(`Welcome ${user.full_name}! Please complete face registration.`);
      navigate('/face-capture');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Registration failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fieldStyles = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
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
    '& .MuiInputLabel-root': {
      color: '#6b7280',
      '&.Mui-focused': {
        color: '#3b82f6',
      },
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Container maxWidth="sm">
        <Fade in timeout={800}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              background: '#ffffff',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <Box sx={{ p: 6, textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
              <Avatar 
                sx={{ 
                  width: 64, 
                  height: 64,
                  mx: 'auto',
                  mb: 3,
                  background: '#f3f4f6',
                  color: '#6b7280'
                }}
              >
                <PersonAdd sx={{ fontSize: 32 }} />
              </Avatar>
              
              <Typography 
                variant="h4" 
                fontWeight="600" 
                gutterBottom
                sx={{ color: '#1f2937', letterSpacing: '-0.025em' }}
              >
                Create your account
              </Typography>
              
              <Typography 
                variant="body1" 
                sx={{ color: '#6b7280', lineHeight: 1.5 }}
              >
                Join the smart attendance system
              </Typography>
            </Box>

            {/* Registration Form */}
            <CardContent sx={{ p: 6 }}>
              {error && (
                <Fade in timeout={500}>
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 4,
                      borderRadius: '12px',
                      border: '1px solid #fecaca',
                      background: '#fef2f2',
                      '& .MuiAlert-icon': { color: '#dc2626' }
                    }}
                  >
                    <Typography variant="body2" fontWeight="500">
                      {error}
                    </Typography>
                  </Alert>
                </Fade>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={4}>
                  {/* Full Name */}
                  <TextField
                    fullWidth
                    name="full_name"
                    label="Full name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    autoFocus
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: '#9ca3af', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={fieldStyles}
                  />

                  {/* Email */}
                  <TextField
                    fullWidth
                    name="email"
                    type="email"
                    label="Email address"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: '#9ca3af', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={fieldStyles}
                  />

                  {/* Phone and Department */}
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        name="phone_number"
                        label="Phone number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        disabled={loading}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Phone sx={{ color: '#9ca3af', fontSize: 20 }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={fieldStyles}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        name="department"
                        label="Department"
                        value={formData.department}
                        onChange={handleChange}
                        disabled={loading}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Business sx={{ color: '#9ca3af', fontSize: 20 }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={fieldStyles}
                      />
                    </Grid>
                  </Grid>

                  {/* Password */}
                  <Box>
                    <TextField
                      fullWidth
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      label="Password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock sx={{ color: '#9ca3af', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              sx={{ 
                                color: '#9ca3af',
                                '&:hover': { color: '#6b7280' }
                              }}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={fieldStyles}
                    />
                    
                    {/* Password Strength Indicator */}
                    {formData.password && (
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={passwordStrength.strength} 
                              sx={{
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: '#e5e7eb',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 2,
                                  backgroundColor: 
                                    passwordStrength.color === 'error' ? '#ef4444' :
                                    passwordStrength.color === 'warning' ? '#f59e0b' :
                                    passwordStrength.color === 'info' ? '#3b82f6' :
                                    passwordStrength.color === 'success' ? '#10b981' : '#d1d5db'
                                }
                              }}
                            />
                          </Box>
                          <Chip 
                            label={passwordStrength.text}
                            size="small"
                            sx={{
                              fontSize: '0.75rem',
                              height: 20,
                              backgroundColor: 
                                passwordStrength.color === 'error' ? '#fef2f2' :
                                passwordStrength.color === 'warning' ? '#fffbeb' :
                                passwordStrength.color === 'info' ? '#eff6ff' :
                                passwordStrength.color === 'success' ? '#f0fdf4' : '#f9fafb',
                              color:
                                passwordStrength.color === 'error' ? '#dc2626' :
                                passwordStrength.color === 'warning' ? '#d97706' :
                                passwordStrength.color === 'info' ? '#2563eb' :
                                passwordStrength.color === 'success' ? '#059669' : '#6b7280',
                              border: 'none'
                            }}
                          />
                        </Box>
                      </Box>
                    )}
                  </Box>

                  {/* Confirm Password */}
                  <Box>
                    <TextField
                      fullWidth
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      label="Confirm password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock sx={{ color: '#9ca3af', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                              sx={{ 
                                color: '#9ca3af',
                                '&:hover': { color: '#6b7280' }
                              }}
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={fieldStyles}
                    />
                    
                    {/* Password Match Indicator */}
                    {formData.confirmPassword && formData.password && (
                      <Box sx={{ mt: 2 }}>
                        {formData.password === formData.confirmPassword ? (
                          <Chip 
                            icon={<CheckCircle sx={{ fontSize: 16 }} />}
                            label="Passwords match" 
                            size="small"
                            sx={{
                              fontSize: '0.75rem',
                              height: 24,
                              backgroundColor: '#f0fdf4',
                              color: '#059669',
                              border: 'none',
                              '& .MuiChip-icon': { color: '#059669' }
                            }}
                          />
                        ) : (
                          <Chip 
                            label="Passwords don't match" 
                            size="small"
                            sx={{
                              fontSize: '0.75rem',
                              height: 24,
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              border: 'none'
                            }}
                          />
                        )}
                      </Box>
                    )}
                  </Box>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAdd />}
                    sx={{
                      py: 2.5,
                      fontSize: '1rem',
                      fontWeight: '600',
                      borderRadius: '12px',
                      background: '#1f2937',
                      color: '#ffffff',
                      textTransform: 'none',
                      boxShadow: 'none',
                      '&:hover': {
                        background: '#111827',
                        boxShadow: 'none',
                      },
                      '&:disabled': {
                        background: '#d1d5db',
                        color: '#9ca3af',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {loading ? 'Creating account...' : 'Create account'}
                  </Button>
                </Stack>
              </Box>

              <Divider sx={{ my: 4 }} />

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Already have an account?{' '}
                  <Link 
                    to="/login" 
                    style={{ 
                      color: '#3b82f6', 
                      textDecoration: 'none', 
                      fontWeight: '500',
                    }}
                  >
                    Sign in
                  </Link>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Fade>
      </Container>
    </Box>
  );
};

export default Register; 