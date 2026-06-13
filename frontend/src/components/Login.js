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
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { authAPI } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Image slider state
  const images = [
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80',
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(formData);
      const { access_token, user } = response.data;
      
        login(user, access_token);
        navigate('/dashboard');
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';
      if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.detail || 'Invalid input. Please check your email and password format.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
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

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
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
            {/* Left side: Image Slider */}
            <Grid 
              item 
              xs={12} 
              md={6}
              sx={{
                position: 'relative',
                overflow: 'hidden',
                display: { xs: 'none', md: 'block' },
                background: '#212E46',
                height: '500px',
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

            {/* Right side: Login Form */}
            <Grid 
              item 
              xs={12} 
              md={6}
              sx={{
                background: '#ffffff',
                height: { xs: 'auto', md: '500px' },
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
            <Box sx={{ px: 3.5, pt: 6, pb: 2, textAlign: 'center' }}>
              <Typography 
                variant="h5" 
                fontWeight="700" 
                gutterBottom
                sx={{ 
                  color: '#212E46', 
                  letterSpacing: '-0.02em',
                  fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
                  fontSize: '1.15rem',
                  mb: 0.3,
                  lineHeight: 1.2,
                }}
              >
                Welcome back
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
                Enter your credentials to access your account
              </Typography>
            </Box>

            {/* Login Form */}
            <CardContent sx={{ px: 3.5, pb: 3, pt: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
                <Stack spacing={1.5}>
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
                      form: {
                        autoComplete: 'off',
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: '#9ca3af', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
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
                    }}
                  />

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
                      form: {
                        autoComplete: 'off',
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: '#9ca3af', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleTogglePassword}
                            edge="end"
                            sx={{ 
                              color: '#9ca3af',
                              '&:hover': { color: '#212E46' }
                            }}
                          >
                            {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
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
                    }}
                  />

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
                    {loading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </Stack>
              </Box>

              <Box sx={{ textAlign: 'center', mt: 1.8 }}>
                <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif', fontSize: '0.75rem' }}>
                  Don't have an account?{' '}
                  <Link 
                    to="/register" 
                    style={{ 
                      color: '#f97316', 
                      textDecoration: 'none', 
                      fontWeight: '600',
                    }}
                  >
                    Create account
                  </Link>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Fade>
  </Container>
</Box>
);
};

export default Login; 