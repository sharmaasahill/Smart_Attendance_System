import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Switch,
  Button,
  Divider,
  Alert,
  Fade,
  Avatar,
  IconButton,
  Stack,
  Chip,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Person,
  Storage,
  Edit,
  Close,
} from '@mui/icons-material';
import { useAuth } from '../App';
import { toast } from 'react-toastify';

const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    // Face Recognition - this is always enabled (no toggle functionality implemented)
    faceRecognitionEnabled: true,
  });

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSettingChange = (category, setting, value) => {
    // Settings are read-only (no backend API implemented)
    toast.info('Settings management is not yet implemented in the backend.');
  };

  const handleSaveSettings = async () => {
    // Note: Settings API not implemented in backend
    toast.info('Settings functionality is not yet implemented. Profile management is available in Profile page.');
  };

  const settingsCategories = [
    {
      id: 'system',
      title: 'System Information',
      icon: <Storage />,
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
    <Box sx={{ background: '#fafafa', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Fade in timeout={800}>
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  background: '#3b82f6',
                  color: '#ffffff',
                  fontSize: '1.75rem',
                  fontWeight: 'bold',
                }}
              >
                <SettingsIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h3" fontWeight="600" sx={{ color: '#1f2937', letterSpacing: '-0.025em', mb: 1 }}>
                  Settings
                </Typography>
                <Typography variant="body1" sx={{ color: '#6b7280', fontSize: '1.1rem' }}>
                  Manage your account preferences and system settings
                </Typography>
              </Box>
            </Box>

            {/* User Info Card */}
            <Card
              elevation={0}
              sx={{
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                background: '#ffffff',
                mb: 4,
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        background: '#1f2937',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {user?.full_name?.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="600" sx={{ color: '#1f2937' }}>
                        {user?.full_name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                        {user?.email}
                      </Typography>
                      <Chip
                        label={user?.role === 'admin' ? 'Administrator' : 'Employee'}
                        size="small"
                        sx={{
                          background: user?.role === 'admin' ? '#fee2e2' : '#dbeafe',
                          color: user?.role === 'admin' ? '#dc2626' : '#3b82f6',
                          fontWeight: '500',
                          fontSize: '0.75rem',
                        }}
                      />
                    </Box>
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => window.location.href = '/profile'}
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
                borderRadius: '12px',
                border: '1px solid #dcfce7',
                background: '#f0fdf4',
                '& .MuiAlert-icon': { color: '#16a34a' }
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
                borderRadius: '12px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                '& .MuiAlert-icon': { color: '#dc2626' }
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
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    background: '#ffffff',
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    {/* Category Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '10px',
                          background: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#6b7280',
                        }}
                      >
                        {category.icon}
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight="600" sx={{ color: '#1f2937' }}>
                          {category.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
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
                              <Typography variant="body1" fontWeight="500" sx={{ color: '#1f2937', mb: 0.5 }}>
                                {setting.label}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                {setting.description}
                              </Typography>
                            </Box>

                            {/* Setting Control */}
                            <Box sx={{ ml: 3 }}>
                              {setting.type === 'display' && (
                                <Chip
                                  label={setting.value ? 'Enabled' : 'Disabled'}
                                  sx={{
                                    background: setting.value ? '#dcfce7' : '#fee2e2',
                                    color: setting.value ? '#16a34a' : '#dc2626',
                                    fontWeight: '500',
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
              startIcon={<Person />}
              onClick={() => window.location.href = '/profile'}
              sx={{
                py: 2,
                px: 4,
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
              Profile Management
            </Button>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default Settings; 