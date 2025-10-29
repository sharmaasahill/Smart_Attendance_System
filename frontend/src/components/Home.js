import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Fade,
  Chip,
  Avatar,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  PersonAdd,
  CheckCircle,
  Dashboard,
  Security,
  Speed,
  Face,
  CameraAlt,
  Analytics,
  Group,
  Schedule,
  Cloud,
  Smartphone,
  Storage,
  Settings,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const Home = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const features = [
    {
      icon: <Face />,
      title: 'DeepFace Recognition',
      description: 'Advanced AI-powered face recognition using DeepFace library for accurate identification',
      highlight: 'DeepFace Technology',
    },
    {
      icon: <Speed />,
      title: 'Real-time Processing',
      description: 'Instant attendance marking with live face detection and recognition',
      highlight: 'Live Detection',
    },
    {
      icon: <Security />,
      title: 'Secure Storage',
      description: 'Encrypted user data and face embeddings stored securely',
      highlight: 'Data Protection',
    },
    {
      icon: <Dashboard />,
      title: 'Admin Dashboard',
      description: 'Comprehensive user management and attendance tracking interface',
      highlight: 'Full Control',
    },
    {
      icon: <Analytics />,
      title: 'Attendance Reports',
      description: 'View and export attendance records with detailed analytics',
      highlight: 'Export Ready',
    },
    {
      icon: <Settings />,
      title: 'Easy Setup',
      description: 'Simple registration process with automatic face data capture',
      highlight: 'Quick Setup',
    },
  ];

  const systemSpecs = [
    { 
      label: 'Recognition Technology', 
      value: 'DeepFace AI',
      icon: <Face />,
      description: 'Advanced neural networks for face recognition'
    },
    { 
      label: 'Backend Framework', 
      value: 'FastAPI + Python',
      icon: <Cloud />,
      description: 'High-performance REST API backend'
    },
    { 
      label: 'Frontend Framework', 
      value: 'React + Material-UI',
      icon: <Smartphone />,
      description: 'Modern responsive web interface'
    },
    { 
      label: 'Database', 
      value: 'SQLite',
      icon: <Storage />,
      description: 'Local data storage for privacy'
    },
  ];

  return (
    <Box sx={{ background: '#fafafa', minHeight: '100vh' }}>
      {/* Hero Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, background: '#ffffff' }}>
        <Container maxWidth="lg">
          <Fade in timeout={800}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography
                variant={isMobile ? 'h3' : 'h2'}
                fontWeight="600"
                gutterBottom
                sx={{ 
                  color: '#1f2937', 
                  mb: 3,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.2 
                }}
              >
                <Box component="span">Smart Attendance </Box>
                <Box component="span" sx={{ color: '#3b82f6' }}>System</Box>
              </Typography>
              
              <Typography
                variant="h5"
                sx={{ 
                  color: '#6b7280', 
                  mb: 6, 
                  maxWidth: 600, 
                  mx: 'auto',
                  lineHeight: 1.6,
                  fontWeight: 400
                }}
              >
                Automated attendance tracking powered by DeepFace AI technology. 
                Secure, fast, and easy to use for any organization.
              </Typography>

              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={3} 
                justifyContent="center"
                sx={{ mb: 6 }}
              >
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<CameraAlt />}
                  onClick={() => navigate(isAuthenticated ? '/mark-attendance' : '/register')}
                  sx={{
                    py: 2,
                    px: 4,
                    fontSize: '1.1rem',
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
                  }}
                >
                  {isAuthenticated ? 'Mark Attendance' : 'Get Started'}
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<Dashboard />}
                  onClick={() => navigate('/dashboard')}
                  sx={{
                    py: 2,
                    px: 4,
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb',
                    color: '#6b7280',
                    textTransform: 'none',
                    '&:hover': {
                      border: '2px solid #d1d5db',
                      background: '#f9fafb',
                    },
                  }}
                >
                  View Dashboard
                </Button>
              </Stack>

              <Stack direction="row" spacing={4} justifyContent="center" flexWrap="wrap">
                {['AI-Powered', 'Open Source', 'Local Storage', 'Real-time'].map((feature) => (
                  <Chip
                    key={feature}
                    label={feature}
                    sx={{
                      background: '#f3f4f6',
                      color: '#6b7280',
                      fontWeight: '500',
                      border: '1px solid #e5e7eb',
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Fade>
        </Container>
      </Box>

      {/* System Specifications */}
      <Box sx={{ py: 8, background: '#ffffff', borderTop: '1px solid #f3f4f6' }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            textAlign="center"
            fontWeight="600"
            gutterBottom
            sx={{ color: '#1f2937', mb: 6, letterSpacing: '-0.025em' }}
          >
            Built with Modern Technology
          </Typography>
          
          <Grid container spacing={4}>
            {systemSpecs.map((spec, index) => (
              <Grid item xs={12} md={3} key={index}>
                <Fade in timeout={1000 + index * 200}>
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      p: 3,
                      textAlign: 'center',
                      background: '#ffffff',
                    }}
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '12px',
                        background: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2,
                        color: '#6b7280',
                      }}
                    >
                      {React.cloneElement(spec.icon, { sx: { fontSize: 24 } })}
                    </Box>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                      {spec.label}
                    </Typography>
                    <Typography variant="h6" fontWeight="600" sx={{ color: '#1f2937', mb: 1 }}>
                      {spec.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                      {spec.description}
                    </Typography>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Quick Actions */}
      <Box sx={{ py: 10, background: '#fafafa' }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            textAlign="center"
            fontWeight="600"
            gutterBottom
            sx={{ color: '#1f2937', mb: 8, letterSpacing: '-0.025em' }}
          >
            How It Works
          </Typography>
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Fade in timeout={1200}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    background: '#ffffff',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 6, textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '20px',
                        background: '#dbeafe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3,
                      }}
                    >
                      <PersonAdd sx={{ fontSize: 40, color: '#3b82f6' }} />
                    </Box>
                    
                    <Typography variant="h5" fontWeight="600" gutterBottom sx={{ color: '#1f2937' }}>
                      1. Register Users
                    </Typography>
                    
                    <Typography variant="body1" sx={{ color: '#6b7280', mb: 4, lineHeight: 1.6 }}>
                      Create user accounts with email and password. The system automatically captures 
                      5 face images during registration for training the AI model.
                    </Typography>

                    <Stack spacing={2} sx={{ mb: 4 }}>
                      {[
                        'Create account with email',
                        'Capture 5 face images automatically',
                        'AI processes and stores face data',
                        'User ready for attendance'
                      ].map((step, i) => (
                        <Box key={step} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: '#3b82f6',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              flexShrink: 0,
                            }}
                          >
                            {i + 1}
                          </Box>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {step}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>

                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      startIcon={<PersonAdd />}
                      onClick={() => navigate(isAuthenticated ? '/face-capture' : '/register')}
                      sx={{
                        py: 2,
                        fontSize: '1rem',
                        fontWeight: '600',
                        borderRadius: '12px',
                        background: '#3b82f6',
                        textTransform: 'none',
                        boxShadow: 'none',
                        '&:hover': {
                          background: '#2563eb',
                          boxShadow: 'none',
                        },
                      }}
                    >
                      {isAuthenticated ? 'Add Face Data' : 'Start Registration'}
                    </Button>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>

            <Grid item xs={12} md={6}>
              <Fade in timeout={1400}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    background: '#ffffff',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 6, textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '20px',
                        background: '#dcfce7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3,
                      }}
                    >
                      <CameraAlt sx={{ fontSize: 40, color: '#16a34a' }} />
                    </Box>
                    
                    <Typography variant="h5" fontWeight="600" gutterBottom sx={{ color: '#1f2937' }}>
                      2. Mark Attendance
                    </Typography>
                    
                    <Typography variant="body1" sx={{ color: '#6b7280', mb: 4, lineHeight: 1.6 }}>
                      Simply look at the camera to mark attendance. The DeepFace AI instantly 
                      recognizes faces and records attendance with timestamp.
                    </Typography>

                    <Stack spacing={2} sx={{ mb: 4 }}>
                      {[
                        'Position face in camera view',
                        'DeepFace AI analyzes features',
                        'System verifies identity',
                        'Attendance marked automatically'
                      ].map((step, i) => (
                        <Box key={step} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: '#16a34a',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              flexShrink: 0,
                            }}
                          >
                            {i + 1}
                          </Box>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {step}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>

                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      startIcon={<CameraAlt />}
                      onClick={() => navigate('/mark-attendance')}
                      sx={{
                        py: 2,
                        fontSize: '1rem',
                        fontWeight: '600',
                        borderRadius: '12px',
                        background: '#16a34a',
                        textTransform: 'none',
                        boxShadow: 'none',
                        '&:hover': {
                          background: '#15803d',
                          boxShadow: 'none',
                        },
                      }}
                    >
                      Try Face Recognition
                    </Button>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Grid */}
      <Box sx={{ py: 10, background: '#ffffff' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 10 }}>
            <Typography
              variant="h3"
              fontWeight="600"
              gutterBottom
              sx={{ color: '#1f2937', letterSpacing: '-0.025em' }}
            >
              System Features
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: '#6b7280', maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}
            >
              Everything included in this open-source attendance system
            </Typography>
          </Box>
          
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Fade in timeout={1000 + index * 200}>
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%',
                      border: '1px solid #e5e7eb',
                      borderRadius: '16px',
                      p: 4,
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        transform: 'translateY(-4px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '16px',
                        background: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3,
                        color: '#6b7280',
                      }}
                    >
                      {React.cloneElement(feature.icon, { sx: { fontSize: 28 } })}
                    </Box>
                    
                    <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#1f2937' }}>
                      {feature.title}
                    </Typography>
                    
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 3, lineHeight: 1.6 }}>
                      {feature.description}
                    </Typography>
                    
                    <Chip
                      label={feature.highlight}
                      size="small"
                      sx={{
                        background: '#dbeafe',
                        color: '#1e40af',
                        fontWeight: '500',
                      }}
                    />
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* User Dashboard Section */}
      {isAuthenticated && (
        <Box sx={{ py: 8, background: '#f8fafc' }}>
          <Container maxWidth="lg">
            <Fade in timeout={2000}>
              <Card
                elevation={0}
                sx={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '20px',
                  background: '#ffffff',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      mx: 'auto',
                      mb: 3,
                      background: '#1f2937',
                      fontSize: '2rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {user?.full_name.charAt(0)}
                  </Avatar>
                  
                  <Typography variant="h4" fontWeight="600" gutterBottom sx={{ color: '#1f2937' }}>
                    Welcome back, {user?.full_name.split(' ')[0]}!
                  </Typography>
                  
                  <Typography variant="body1" sx={{ color: '#6b7280', mb: 4, maxWidth: 600, mx: 'auto' }}>
                    {user?.role === 'admin' 
                      ? 'Access your admin dashboard to manage users, view attendance records, and monitor system activity.'
                      : 'View your attendance history, mark daily attendance, and manage your profile settings.'
                    }
                  </Typography>

                  <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    spacing={3} 
                    justifyContent="center"
                  >
                    {user?.role === 'admin' ? (
                      <>
                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<Dashboard />}
                          onClick={() => navigate('/admin')}
                          sx={{
                            py: 2,
                            px: 4,
                            borderRadius: '12px',
                            background: '#1f2937',
                            textTransform: 'none',
                            fontWeight: '600',
                            boxShadow: 'none',
                            '&:hover': {
                              background: '#111827',
                              boxShadow: 'none',
                            },
                          }}
                        >
                          Admin Dashboard
                        </Button>
                        <Button
                          variant="outlined"
                          size="large"
                          startIcon={<Group />}
                          onClick={() => navigate('/admin')}
                          sx={{
                            py: 2,
                            px: 4,
                            borderRadius: '12px',
                            border: '2px solid #e5e7eb',
                            color: '#6b7280',
                            textTransform: 'none',
                            fontWeight: '600',
                            '&:hover': {
                              border: '2px solid #d1d5db',
                              background: '#f9fafb',
                            },
                          }}
                        >
                          Manage Users
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<CameraAlt />}
                          onClick={() => navigate('/mark-attendance')}
                          sx={{
                            py: 2,
                            px: 4,
                            borderRadius: '12px',
                            background: '#1f2937',
                            textTransform: 'none',
                            fontWeight: '600',
                            boxShadow: 'none',
                            '&:hover': {
                              background: '#111827',
                              boxShadow: 'none',
                            },
                          }}
                        >
                          Mark Attendance
                        </Button>
                        <Button
                          variant="outlined"
                          size="large"
                          startIcon={<Schedule />}
                          onClick={() => navigate('/dashboard')}
                          sx={{
                            py: 2,
                            px: 4,
                            borderRadius: '12px',
                            border: '2px solid #e5e7eb',
                            color: '#6b7280',
                            textTransform: 'none',
                            fontWeight: '600',
                            '&:hover': {
                              border: '2px solid #d1d5db',
                              background: '#f9fafb',
                            },
                          }}
                        >
                          View Dashboard
                        </Button>
                      </>
                    )}
                  </Stack>
                </Box>
              </Card>
            </Fade>
          </Container>
        </Box>
      )}

      {/* Technical Details */}
      <Box sx={{ py: 10, background: '#ffffff' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography
              variant="h3"
              fontWeight="600"
              gutterBottom
              sx={{ color: '#1f2937', letterSpacing: '-0.025em' }}
            >
              About This System
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: '#6b7280', maxWidth: 800, mx: 'auto', lineHeight: 1.6 }}
            >
              An open-source attendance system built with modern technologies
            </Typography>
          </Box>
          
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h5" fontWeight="600" gutterBottom sx={{ color: '#1f2937' }}>
                Built with Modern Tech Stack
              </Typography>
              
              <Typography variant="body1" sx={{ color: '#6b7280', mb: 4, lineHeight: 1.6 }}>
                This attendance system combines cutting-edge AI technology with a robust web infrastructure. 
                The DeepFace library provides state-of-the-art face recognition capabilities, while the 
                FastAPI backend ensures high performance and scalability.
              </Typography>

              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle1" fontWeight="600" sx={{ color: '#1f2937', mb: 1 }}>
                    AI Technology
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    DeepFace library with multiple deep learning models for accurate face recognition
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle1" fontWeight="600" sx={{ color: '#1f2937', mb: 1 }}>
                    Performance
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    FastAPI backend with real-time processing and responsive React frontend
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle1" fontWeight="600" sx={{ color: '#1f2937', mb: 1 }}>
                    Privacy
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Local SQLite database storage ensures your data stays on your servers
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle1" fontWeight="600" sx={{ color: '#1f2937', mb: 1 }}>
                    Accessibility
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Responsive design works perfectly on desktop, tablet, and mobile devices
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '16px',
                  p: 4,
                  background: '#fafafa',
                }}
              >
                <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#1f2937' }}>
                  Key Capabilities
                </Typography>
                
                <Stack spacing={3}>
                  {[
                    'Real-time face detection and recognition',
                    'Secure user registration with face capture',
                    'Attendance tracking with timestamps',
                    'Admin dashboard for user management',
                    'Export attendance reports',
                    'Responsive web interface',
                    'Local data storage for privacy',
                    'Easy deployment and setup'
                  ].map((capability, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckCircle sx={{ color: '#16a34a', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ color: '#374151' }}>
                        {capability}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: 12, background: '#1f2937' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h3"
              fontWeight="600"
              gutterBottom
              sx={{ color: '#ffffff', letterSpacing: '-0.025em' }}
            >
              Ready to Get Started?
            </Typography>
            
            <Typography
              variant="h6"
              sx={{ color: '#d1d5db', mb: 6, maxWidth: 600, mx: 'auto' }}
            >
              Set up your attendance system in minutes. No complex configuration required.
            </Typography>
            
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={3} 
              justifyContent="center"
            >
              <Button
                variant="contained"
                size="large"
                startIcon={<PersonAdd />}
                onClick={() => navigate('/register')}
                sx={{
                  py: 2,
                  px: 6,
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  borderRadius: '12px',
                  background: '#3b82f6',
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': {
                    background: '#2563eb',
                    boxShadow: 'none',
                  },
                }}
              >
                Register Now
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                startIcon={<CameraAlt />}
                onClick={() => navigate('/mark-attendance')}
                sx={{
                  py: 2,
                  px: 6,
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  borderRadius: '12px',
                  border: '2px solid #374151',
                  color: '#d1d5db',
                  textTransform: 'none',
                  '&:hover': {
                    border: '2px solid #4b5563',
                    background: 'rgba(255,255,255,0.05)',
                  },
                }}
              >
                Try Demo
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Home; 