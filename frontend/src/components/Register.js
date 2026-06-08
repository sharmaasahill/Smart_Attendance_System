import React, { useState, useEffect } from 'react';
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
  Stack,
  Grid,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Email,
  Phone,
  Business,
  Visibility,
  VisibilityOff,
  Lock,
  Person,
  CheckCircle,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { authAPI } from '../services/api';

const Register = () => {
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Image slider state
  const images = [
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1531498860502-7c67cf02f657?w=800&auto=format&fit=crop&q=80',
  ];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Auto-change images every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000);

    return () => clearInterval(timer);
  }, [images.length]);

  const validateField = (name, value) => {
    const errors = { ...fieldErrors };
    switch (name) {
      case 'full_name':
        if (!value.trim()) {
          errors.full_name = 'Full name is required';
        } else if (value.trim().length < 2) {
          errors.full_name = 'Full name must be at least 2 characters';
        } else {
          delete errors.full_name;
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) {
          errors.email = 'Email is required';
        } else if (!emailRegex.test(value)) {
          errors.email = 'Please enter a valid email address';
        } else {
          delete errors.email;
        }
        break;
      case 'password':
        if (!value) {
          errors.password = 'Password is required';
        } else if (value.length < 6) {
          errors.password = 'Password must be at least 6 characters';
        } else {
          delete errors.password;
        }
        // Re-validate confirm password if it exists
        if (formData.confirmPassword) {
          if (value !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
          } else {
            delete errors.confirmPassword;
          }
        }
        break;
      case 'confirmPassword':
        if (!value) {
          errors.confirmPassword = 'Please confirm your password';
        } else if (value !== formData.password) {
          errors.confirmPassword = 'Passwords do not match';
        } else {
          delete errors.confirmPassword;
        }
        break;
      default:
        break;
    }
    setFieldErrors(errors);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError('');
    // Real-time validation
    if (name === 'full_name' || name === 'email' || name === 'password' || name === 'confirmPassword') {
      validateField(name, value);
    }
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
      navigate('/face-capture');
    } catch (error) {
      let errorMessage = 'Registration failed. Please try again.';
      if (error.response?.status === 400) {
        if (error.response?.data?.detail?.includes('already')) {
          errorMessage = 'This email is already registered. Please use a different email or try logging in.';
        } else {
          errorMessage = error.response?.data?.detail || 'Invalid input. Please check all fields and try again.';
        }
      } else if (error.response?.status === 422) {
        errorMessage = 'Invalid email format. Please enter a valid email address.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later or contact support.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = `Connection error: ${error.message}. Please check your internet connection.`;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fieldStyles = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      background: '#fafaf9',
      border: '1px solid #e7e5e4',
      fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
      fontSize: '0.8rem',
      '& fieldset': {
        border: 'none',
      },
      '& input': {
        py: 1,
        fontSize: '0.8rem',
      },
      '&:hover': {
        background: '#f5f5f4',
        border: '1px solid #d6d3d1',
      },
      '&.Mui-focused': {
        background: '#ffffff',
        boxShadow: '0 0 0 3px rgba(33, 46, 70, 0.1)',
        border: '1px solid #212E46',
      },
    },
    '& .MuiInputLabel-root': {
      color: '#78716c',
      fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
      fontSize: '0.8rem',
      '&.Mui-focused': {
        color: '#212E46',
      },
    },
    '& .MuiInputAdornment-root': {
      '& svg': {
        fontSize: '1rem',
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f3f0 0%, #fafaf9 50%, #ffffff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="md">
        <Fade in timeout={800}>
          <Grid 
            container 
            sx={{
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
              maxWidth: '900px',
              mx: 'auto',
            }}
          >
            {/* Left side: Registration Form */}
            <Grid 
              item 
              xs={12} 
              md={6}
              sx={{
                background: '#ffffff',
                order: { xs: 1, md: 1 },
                height: '550px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  border: 'none',
                  borderRadius: 0,
                }}
              >
            {/* Header */}
            <Box sx={{ px: 3.5, pt: 5, pb: 2, textAlign: 'center' }}>
              <Typography 
                variant="h5" 
                fontWeight="700" 
                sx={{ 
                  color: '#212E46', 
                  letterSpacing: '-0.02em',
                  fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
                  fontSize: '1.15rem',
                  mb: 0.3,
                  lineHeight: 1.2,
                }}
              >
                Create your account
              </Typography>
              
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#78716c', 
                  lineHeight: 1.3,
                  fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
                  fontSize: '0.75rem'
                }}
              >
                Join the smart attendance system
              </Typography>
            </Box>

            {/* Registration Form */}
            <CardContent sx={{ px: 3.5, pb: 2.5, pt: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {error && (
                <Fade in timeout={500}>
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 1.5,
                      borderRadius: '10px',
                      border: '1px solid #fecaca',
                      background: '#fef2f2',
                      py: 0.5,
                      '& .MuiAlert-icon': { color: '#dc2626', fontSize: '1rem' },
                      '& .MuiAlert-message': { py: 0 }
                    }}
                  >
                    <Typography variant="body2" fontWeight="500" sx={{ fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif', fontSize: '0.7rem' }}>
                      {error}
                    </Typography>
                  </Alert>
                </Fade>
              )}

              <Box component="form" onSubmit={handleSubmit} autoComplete="off">
                <Stack spacing={1.2}>
                  {/* Full Name */}
                  <TextField
                    fullWidth
                    name="full_name"
                    placeholder="Full name *"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    autoFocus
                    autoComplete="new-name"
                    inputProps={{
                      autoComplete: 'new-name',
                    }}
                    error={!!fieldErrors.full_name}
                    helperText={fieldErrors.full_name || ''}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: '#9ca3af', fontSize: 18 }} />
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
                    placeholder="Email address *"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    autoComplete="new-email"
                    inputProps={{
                      autoComplete: 'new-email',
                    }}
                    error={!!fieldErrors.email}
                    helperText={fieldErrors.email || ''}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: '#9ca3af', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={fieldStyles}
                  />

                  {/* Phone and Department */}
                  <TextField
                    fullWidth
                    name="phone_number"
                    placeholder="Phone number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    disabled={loading}
                    autoComplete="new-phone"
                    inputProps={{
                      autoComplete: 'new-phone',
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone sx={{ color: '#9ca3af', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={fieldStyles}
                  />
                  
                  <TextField
                    fullWidth
                    name="department"
                    placeholder="Department"
                    value={formData.department}
                    onChange={handleChange}
                    disabled={loading}
                    autoComplete="new-department"
                    inputProps={{
                      autoComplete: 'new-department',
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Business sx={{ color: '#9ca3af', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={fieldStyles}
                  />

                  {/* Password */}
                  <Box>
                    <TextField
                      fullWidth
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password *"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      autoComplete="new-password"
                      inputProps={{
                        autoComplete: 'new-password',
                      }}
                      error={!!fieldErrors.password}
                      helperText={fieldErrors.password || ''}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock sx={{ color: '#9ca3af', fontSize: 18 }} />
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
                              {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={fieldStyles}
                    />
                    
                    {/* Password Strength Indicator */}
                    {formData.password && (
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ flex: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={passwordStrength.strength} 
                              sx={{
                                height: 3,
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
                              fontSize: '0.65rem',
                              height: 16,
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
                      placeholder="Confirm password *"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      autoComplete="new-password"
                      inputProps={{
                        autoComplete: 'new-password',
                      }}
                      error={!!fieldErrors.confirmPassword}
                      helperText={fieldErrors.confirmPassword || ''}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock sx={{ color: '#9ca3af', fontSize: 18 }} />
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
                              {showConfirmPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={fieldStyles}
                    />
                    
                    {/* Password Match Indicator */}
                    {formData.confirmPassword && formData.password && (
                      <Box sx={{ mt: 1 }}>
                        {formData.password === formData.confirmPassword ? (
                          <Chip 
                            icon={<CheckCircle sx={{ fontSize: 12 }} />}
                            label="Passwords match" 
                            size="small"
                            sx={{
                              fontSize: '0.65rem',
                              height: 18,
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
                              fontSize: '0.65rem',
                              height: 18,
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
                    size="medium"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                    sx={{
                      py: 1.3,
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      borderRadius: '10px',
                      background: '#212E46',
                      color: '#ffffff',
                      textTransform: 'none',
                      boxShadow: '0 6px 20px rgba(33, 46, 70, 0.12)',
                      fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
                      '&:hover': {
                        background: '#1a2333',
                        boxShadow: '0 8px 24px rgba(33, 46, 70, 0.18)',
                        transform: 'translateY(-1px)',
                      },
                      '&:disabled': {
                        background: '#d1d5db',
                        color: '#9ca3af',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {loading ? 'Creating account...' : 'Create account'}
                  </Button>
                </Stack>
              </Box>

              <Box sx={{ textAlign: 'center', mt: 1.8 }}>
                <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif', fontSize: '0.75rem' }}>
                  Already have an account?{' '}
                  <Link 
                    to="/login" 
                    style={{ 
                      color: '#f97316', 
                      textDecoration: 'none', 
                      fontWeight: '600',
                    }}
                  >
                    Sign in
                  </Link>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right side: Image Slider */}
        <Grid 
          item 
          xs={12} 
          md={6}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            display: { xs: 'none', md: 'block' },
            background: '#212E46',
            order: { xs: 2, md: 2 },
            height: '550px',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            <AnimatePresence initial={false}>
              <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                }}
              >
                <Box
                  component="img"
                  src={images[currentImageIndex]}
                  alt={`Slide ${currentImageIndex + 1}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </motion.div>
            </AnimatePresence>

            {/* Slider indicators */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 1,
                zIndex: 10,
              }}
            >
              {images.map((_, index) => (
                <Box
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: currentImageIndex === index ? '#ffffff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: '#ffffff',
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Fade>
  </Container>
</Box>
);
};

export default Register; 