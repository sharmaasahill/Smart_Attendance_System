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
  Security,
  Notifications,
  Storage,
  Edit,
  Save,
  Close,
  Download,
} from '@mui/icons-material';
import { useAuth } from '../App';
import { toast } from 'react-toastify';

const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    // Profile Settings
    emailNotifications: true,
    faceRecognitionEnabled: true,
    autoLogout: false,
    
    // Security Settings
    twoFactorAuth: false,
    sessionTimeout: '30',
    loginAlerts: true,
    
    // System Settings
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    dataRetention: '90',
    
    // Notification Settings
    attendanceReminders: true,
    weeklyReports: false,
    systemMaintenance: true,
  });

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
    
    // Auto-save for switches
    if (typeof value === 'boolean') {
      toast.success(`${setting.replace(/([A-Z])/g, ' $1').toLowerCase()} ${value ? 'enabled' : 'disabled'}`);
    }
  };

  const handleSaveSettings = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to save settings. Please try again.');
    }
  };

  const settingsCategories = [
    {
      id: 'profile',
      title: 'Profile & Account',
      icon: <Person />,
      description: 'Manage your personal information and account preferences',
      settings: [
        {
          key: 'emailNotifications',
          label: 'Email Notifications',
          description: 'Receive email updates about your attendance',
          type: 'switch',
          value: settings.emailNotifications,
        },
        {
          key: 'faceRecognitionEnabled',
          label: 'Face Recognition',
          description: 'Allow face recognition for attendance marking',
          type: 'switch',
          value: settings.faceRecognitionEnabled,
        },
        {
          key: 'autoLogout',
          label: 'Auto Logout',
          description: 'Automatically log out after inactivity',
          type: 'switch',
          value: settings.autoLogout,
        },
      ],
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      icon: <Security />,
      description: 'Configure security settings and privacy preferences',
      settings: [
        {
          key: 'twoFactorAuth',
          label: 'Two-Factor Authentication',
          description: 'Add extra security to your account',
          type: 'switch',
          value: settings.twoFactorAuth,
        },
        {
          key: 'sessionTimeout',
          label: 'Session Timeout',
          description: 'Automatically log out after specified minutes',
          type: 'select',
          value: settings.sessionTimeout,
          options: [
            { value: '15', label: '15 minutes' },
            { value: '30', label: '30 minutes' },
            { value: '60', label: '1 hour' },
            { value: '120', label: '2 hours' },
          ],
        },
        {
          key: 'loginAlerts',
          label: 'Login Alerts',
          description: 'Get notified about new login attempts',
          type: 'switch',
          value: settings.loginAlerts,
        },
      ],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <Notifications />,
      description: 'Choose what notifications you want to receive',
      settings: [
        {
          key: 'attendanceReminders',
          label: 'Attendance Reminders',
          description: 'Daily reminders to mark attendance',
          type: 'switch',
          value: settings.attendanceReminders,
        },
        {
          key: 'weeklyReports',
          label: 'Weekly Reports',
          description: 'Receive weekly attendance summary reports',
          type: 'switch',
          value: settings.weeklyReports,
        },
        {
          key: 'systemMaintenance',
          label: 'System Maintenance',
          description: 'Notifications about system updates and maintenance',
          type: 'switch',
          value: settings.systemMaintenance,
        },
      ],
    },
    {
      id: 'system',
      title: 'System Preferences',
      icon: <Storage />,
      description: 'Configure system-wide settings and preferences',
      settings: [
        {
          key: 'theme',
          label: 'Theme',
          description: 'Choose your preferred interface theme',
          type: 'select',
          value: settings.theme,
          options: [
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System Default' },
          ],
        },
        {
          key: 'language',
          label: 'Language',
          description: 'Select your preferred language',
          type: 'select',
          value: settings.language,
          options: [
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' },
            { value: 'de', label: 'German' },
          ],
        },
        {
          key: 'dataRetention',
          label: 'Data Retention',
          description: 'How long to keep attendance records',
          type: 'select',
          value: settings.dataRetention,
          options: [
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
            { value: '180', label: '6 months' },
            { value: '365', label: '1 year' },
          ],
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
                              {setting.type === 'switch' && (
                                <Switch
                                  checked={setting.value}
                                  onChange={(e) => handleSettingChange(category.id, setting.key, e.target.checked)}
                                  sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                      color: '#3b82f6',
                                    },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                      backgroundColor: '#3b82f6',
                                    },
                                  }}
                                />
                              )}

                              {setting.type === 'select' && (
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                  <Select
                                    value={setting.value}
                                    onChange={(e) => handleSettingChange(category.id, setting.key, e.target.value)}
                                    sx={{
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
                                    }}
                                  >
                                    {setting.options.map((option) => (
                                      <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
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
              startIcon={<Save />}
              onClick={handleSaveSettings}
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
              Save All Settings
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<Download />}
              sx={{
                py: 2,
                px: 4,
                fontSize: '1rem',
                fontWeight: '600',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                color: '#6b7280',
                textTransform: 'none',
                '&:hover': {
                  border: '1px solid #d1d5db',
                  background: '#f9fafb',
                },
              }}
            >
              Export Settings
            </Button>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default Settings; 