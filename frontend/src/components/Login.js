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
  Divider,
  Stack,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  Security,
} from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

const Login = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
      toast.success(`Welcome back, ${user.full_name}!`);
      navigate('/dashboard');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      toast.error(errorMessage);
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
                <Security sx={{ fontSize: 32 }} />
              </Avatar>
              
              <Typography 
                variant="h4" 
                fontWeight="600" 
                gutterBottom
                sx={{ color: '#1f2937', letterSpacing: '-0.025em' }}
              >
                Welcome back
              </Typography>
              
              <Typography 
                variant="body1" 
                sx={{ color: '#6b7280', lineHeight: 1.5 }}
              >
                Sign in to your account to continue
              </Typography>
            </Box>

            {/* Login Form */}
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
                    sx={{
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
                    }}
                  />

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
                            onClick={handleTogglePassword}
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
                    sx={{
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
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
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
                    {loading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </Stack>
              </Box>

              <Divider sx={{ my: 4 }} />

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Don't have an account?{' '}
                  <Link 
                    to="/register" 
                    style={{ 
                      color: '#3b82f6', 
                      textDecoration: 'none', 
                      fontWeight: '500',
                    }}
                  >
                    Create account
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

export default Login; 