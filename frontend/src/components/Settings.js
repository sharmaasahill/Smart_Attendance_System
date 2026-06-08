import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Divider,
  Alert,
  Fade,
  Avatar,
  IconButton,
  Stack,
  Chip,
} from '@mui/material';
import {
  Close,
} from '@mui/icons-material';
import { useAuth } from '../App';

const Settings = () => {
  const { user } = useAuth();
  const [settings] = useState({
    // Face Recognition - this is always enabled (no toggle functionality implemented)
    faceRecognitionEnabled: true,
  });

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const settingsCategories = [
    {
      id: 'system',
      title: 'System Information',
      description: 'View system information and preferences',
      settings: [
        {
          key: 'faceRecognitionEnabled',
          label: 'Face Recognition',
          description: 'Face recognition is enabled for attendance marking (always active)',
          type: 'display',
          value: settings.faceRecognitionEnabled,
        },
      ],
    },
  ];

  return (
    <Box sx={{ background: 'linear-gradient(135deg, #f5f3f0 0%, #fafaf9 50%, #ffffff 100%)', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Fade in timeout={800}>
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
              <Box>
                <Typography variant="h5" fontWeight="700" sx={{ color: '#212E46', letterSpacing: '-0.025em', mb: 1, fontFamily: '"Inter", sans-serif' }}>
                  Settings
                </Typography>
                <Typography variant="body1" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                  Manage your account preferences and system settings
                </Typography>
              </Box>
            </Box>

            {/* User Info Card */}
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '20px',
                background: '#ffffff',
                mb: 4,
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        background: 'linear-gradient(135deg, #212E46 0%, #2c3e5a 100%)',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {user?.full_name?.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="700" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif' }}>
                        {user?.full_name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#78716c', mb: 1, fontFamily: '"Inter", sans-serif' }}>
                        {user?.email}
                      </Typography>
                      <Chip
                        label={user?.role === 'admin' ? 'Administrator' : 'Employee'}
                        size="small"
                        sx={{
                          background: user?.role === 'admin' ? '#ffedd5' : '#dbeafe',
                          color: user?.role === 'admin' ? '#f97316' : '#212E46',
                          fontWeight: '700',
                          fontSize: '0.75rem',
                          fontFamily: '"Inter", sans-serif',
                        }}
                      />
                    </Box>
                  </Box>
                  <Button
                    variant="outlined"
                    onClick={() => window.location.href = '/profile'}
                    sx={{
                      borderRadius: '12px',
                      border: '2px solid #e7e5e4',
                      color: '#78716c',
                      textTransform: 'none',
                      fontWeight: '700',
                      fontFamily: '"Inter", sans-serif',
                      '&:hover': {
                        border: '2px solid #d6d3d1',
                        background: '#fafaf9',
                      },
                    }}
                  >
                    Edit Profile
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Fade>

        {/* Success/Error Alerts */}
        {success && (
          <Fade in timeout={500}>
            <Alert 
              severity="success" 
              sx={{ 
                mb: 4,
                borderRadius: '16px',
                border: '1px solid #86efac',
                background: '#dcfce7',
                '& .MuiAlert-icon': { color: '#16a34a' },
                fontFamily: '"Inter", sans-serif',
              }}
              action={
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={() => setSuccess('')}
                >
                  <Close fontSize="inherit" />
                </IconButton>
              }
            >
              {success}
            </Alert>
          </Fade>
        )}

        {error && (
          <Fade in timeout={500}>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 4,
                borderRadius: '16px',
                border: '1px solid #fca5a5',
                background: '#fecaca',
                '& .MuiAlert-icon': { color: '#dc2626' },
                fontFamily: '"Inter", sans-serif',
              }}
              action={
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={() => setError('')}
                >
                  <Close fontSize="inherit" />
                </IconButton>
              }
            >
              {error}
            </Alert>
          </Fade>
        )}

        {/* Settings Categories */}
        <Grid container spacing={4}>
          {settingsCategories.map((category, index) => (
            <Grid item xs={12} key={category.id}>
              <Fade in timeout={1000 + index * 200}>
                <Card
                  elevation={0}
                  sx={{
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '20px',
                    background: '#ffffff',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    {/* Category Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      <Box>
                        <Typography variant="h6" fontWeight="700" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif' }}>
                          {category.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                          {category.description}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Settings List */}
                    <Stack spacing={3}>
                      {category.settings.map((setting, settingIndex) => (
                        <Box key={setting.key}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body1" fontWeight="700" sx={{ color: '#212E46', mb: 0.5, fontFamily: '"Inter", sans-serif' }}>
                                {setting.label}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                                {setting.description}
                              </Typography>
                            </Box>

                            {/* Setting Control */}
                            <Box sx={{ ml: 3 }}>
                              {setting.type === 'display' && (
                                <Chip
                                  label={setting.value ? 'Enabled' : 'Disabled'}
                                  sx={{
                                    background: setting.value ? '#dcfce7' : '#fecaca',
                                    color: setting.value ? '#16a34a' : '#dc2626',
                                    fontWeight: '700',
                                    fontFamily: '"Inter", sans-serif',
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                          {settingIndex < category.settings.length - 1 && (
                            <Divider sx={{ mt: 3, borderColor: '#f3f4f6' }} />
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>

        {/* Action Buttons */}
        <Fade in timeout={1800}>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 6 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => window.location.href = '/profile'}
              sx={{
                py: 2.5,
                px: 5,
                fontSize: '1rem',
                fontWeight: '700',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #212E46 0%, #2c3e5a 100%)',
                textTransform: 'none',
                fontFamily: '"Inter", sans-serif',
                boxShadow: 'none',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1a2333 0%, #212E46 100%)',
                  boxShadow: 'none',
                },
              }}
            >
              Profile Management
            </Button>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default Settings; 