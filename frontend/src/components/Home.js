import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Fade,
  Chip,
} from '@mui/material';
import {
  PersonAdd,
  CheckCircle,
  Dashboard,
  Security,
  Speed,
  Face,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: <Face sx={{ fontSize: 40 }} />,
      title: 'Advanced Face Recognition',
      description: 'Uses DeepFace AI model for accurate and secure face recognition',
      color: '#1976d2',
    },
    {
      icon: <Speed sx={{ fontSize: 40 }} />,
      title: 'Real-time Processing',
      description: 'Instant attendance marking with live face detection',
      color: '#2e7d32',
    },
    {
      icon: <Security sx={{ fontSize: 40 }} />,
      title: 'Secure & Private',
      description: 'Local data storage with encrypted user information',
      color: '#ed6c02',
    },
    {
      icon: <Dashboard sx={{ fontSize: 40 }} />,
      title: 'Admin Dashboard',
      description: 'Comprehensive analytics and user management',
      color: '#9c27b0',
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box className="hero-section">
        <Container maxWidth="lg" className="hero-content">
          <Fade in timeout={1000}>
            <Box>
              <Typography
                variant="h2"
                component="h1"
                gutterBottom
                fontWeight="bold"
                sx={{ mb: 3 }}
              >
                Smart Face Recognition
                <br />
                Attendance System
              </Typography>
              <Typography
                variant="h5"
                sx={{ mb: 4, opacity: 0.9, maxWidth: 600, mx: 'auto' }}
              >
                Automated attendance tracking with advanced AI-powered face recognition technology
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Chip label="🤖 AI-Powered" color="secondary" size="large" />
                <Chip label="⚡ Real-time" color="secondary" size="large" />
                <Chip label="🔒 Secure" color="secondary" size="large" />
              </Box>
            </Box>
          </Fade>
        </Container>
      </Box>

      {/* Main Action Cards */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} md={5}>
            <Fade in timeout={1200}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                  <PersonAdd sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h4" gutterBottom fontWeight="600">
                    User Registration
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Register new users and capture face data for recognition. 
                    The system will automatically capture 5 face images for training.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Chip label="Email Registration" size="small" />
                    <Chip label="Face Capture" size="small" />
                    <Chip label="Instant Setup" size="small" />
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<PersonAdd />}
                    onClick={() => navigate(isAuthenticated ? '/face-capture' : '/register')}
                    sx={{ px: 4, py: 1.5 }}
                  >
                    {isAuthenticated ? 'Capture Face' : 'Get Started'}
                  </Button>
                </CardActions>
              </Card>
            </Fade>
          </Grid>

          <Grid item xs={12} md={5}>
            <Fade in timeout={1400}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                  <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                  <Typography variant="h4" gutterBottom fontWeight="600">
                    Mark Attendance
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Quickly mark attendance using face recognition. 
                    Simply look at the camera and get instant attendance confirmation.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Chip label="Instant Recognition" size="small" />
                    <Chip label="One Click" size="small" />
                    <Chip label="No Contact" size="small" />
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<CheckCircle />}
                    onClick={() => navigate('/mark-attendance')}
                    sx={{ px: 4, py: 1.5 }}
                  >
                    Mark Attendance
                  </Button>
                </CardActions>
              </Card>
            </Fade>
          </Grid>
        </Grid>
      </Container>

      {/* Features Section */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            textAlign="center"
            gutterBottom
            fontWeight="600"
            sx={{ mb: 6 }}
          >
            Why Choose Our System?
          </Typography>
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Fade in timeout={1000 + index * 200}>
                  <Card
                    sx={{
                      height: '100%',
                      textAlign: 'center',
                      p: 3,
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                      },
                    }}
                  >
                    <Box sx={{ color: feature.color, mb: 2 }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" gutterBottom fontWeight="600">
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Admin Section */}
      {isAuthenticated && (
        <Container maxWidth="lg" sx={{ py: 6 }}>
          <Fade in timeout={2000}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                textAlign: 'center',
                p: 4,
              }}
            >
              <Dashboard sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h4" gutterBottom fontWeight="600">
                Admin Dashboard
              </Typography>
              <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
                Access comprehensive analytics, manage users, and view attendance reports
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                startIcon={<Dashboard />}
                onClick={() => navigate('/dashboard')}
                sx={{ px: 4, py: 1.5 }}
              >
                Open Dashboard
              </Button>
            </Card>
          </Fade>
        </Container>
      )}
    </Box>
  );
};

export default Home; 