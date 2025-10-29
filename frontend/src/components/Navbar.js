import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import {
  ExitToApp,
  Dashboard,
  Settings,
  AdminPanelSettings,
  CameraAlt,
  Logout,
  MoreVert,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { toast } from 'react-toastify';

const Navbar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuEl, setMobileMenuEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMenuEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuEl(null);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
    handleMenuClose();
  };

  const navigateToPage = (path) => {
    navigate(path);
    handleMenuClose();
    handleMobileMenuClose();
  };

  const isActivePage = (path) => location.pathname === path;

  const navigationItems = [
    { path: '/', label: 'Mark Attendance', icon: <CameraAlt /> },
    { path: '/dashboard', label: 'Dashboard', icon: <Dashboard /> },
    ...(user?.role === 'admin' ? [{ path: '/admin', label: 'Admin', icon: <AdminPanelSettings /> }] : []),
  ];

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        color: '#1f2937',
      }}
    >
      <Toolbar sx={{ px: { xs: 3, md: 4 }, py: 1.5 }}>
        {/* Logo Section */}
        <Box 
          display="flex" 
          alignItems="center" 
          sx={{ 
            flexGrow: isMobile ? 1 : 0,
            cursor: 'pointer',
          }}
          onClick={() => navigateToPage('/')}
        >
          <Typography 
            variant="h6" 
            fontWeight="600" 
            sx={{
              color: '#1f2937',
              letterSpacing: '-0.025em'
            }}
          >
            SAS
          </Typography>
        </Box>

        {/* Desktop Navigation */}
        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mx: 6, flexGrow: 1 }}>
            {navigationItems.map((item) => (
              <Button
                key={item.path}
                onClick={() => navigateToPage(item.path)}
                startIcon={item.icon}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: '8px',
                  fontWeight: '500',
                  textTransform: 'none',
                  color: isActivePage(item.path) ? '#1f2937' : '#6b7280',
                  background: isActivePage(item.path) ? '#f3f4f6' : 'transparent',
                  '&:hover': {
                    background: '#f9fafb',
                    color: '#1f2937',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        )}

        {/* User Section */}
        {user && (
          <Box display="flex" alignItems="center" gap={2}>
            {/* User Info (Desktop) */}
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" fontWeight="500" sx={{ color: '#1f2937' }}>
                    {user.full_name.split(' ')[0]}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    {user.role === 'admin' ? 'Administrator' : 'Employee'}
                  </Typography>
                </Box>
                
                <IconButton
                  onClick={handleMenuOpen}
                  sx={{
                    p: 0.5,
                    background: '#f3f4f6',
                    '&:hover': { background: '#e5e7eb' }
                  }}
                >
                  <Avatar 
                    sx={{ 
                      width: 36, 
                      height: 36,
                      background: '#1f2937',
                      fontSize: '0.9rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {user.full_name.charAt(0)}
                  </Avatar>
                </IconButton>
              </Box>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <IconButton
                onClick={handleMobileMenuOpen}
                sx={{
                  background: '#f3f4f6',
                  '&:hover': { background: '#e5e7eb' }
                }}
              >
                <MoreVert />
              </IconButton>
            )}
          </Box>
        )}

        {/* Desktop User Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            elevation: 8,
            sx: {
              mt: 1,
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              minWidth: 240,
              '& .MuiMenuItem-root': {
                px: 3,
                py: 1.5,
                borderRadius: '8px',
                mx: 1,
                my: 0.5,
                '&:hover': {
                  background: '#f3f4f6',
                }
              }
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {/* User Info Header */}
          <Box sx={{ p: 3, borderBottom: '1px solid #f3f4f6' }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  background: '#1f2937',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                {user?.full_name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" fontWeight="600" sx={{ color: '#1f2937' }}>
                  {user?.full_name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  {user?.email}
                </Typography>
              </Box>
            </Box>
          </Box>

          <MenuItem onClick={() => navigateToPage('/settings')}>
            <Settings sx={{ mr: 2, fontSize: 20, color: '#6b7280' }} />
            <Typography fontWeight="500">Settings</Typography>
          </MenuItem>

          <MenuItem 
            onClick={handleLogout}
            sx={{ color: '#dc2626' }}
          >
            <Logout sx={{ mr: 2, fontSize: 20 }} />
            <Typography fontWeight="500">Sign out</Typography>
          </MenuItem>
        </Menu>

        {/* Mobile Menu */}
        <Menu
          anchorEl={mobileMenuEl}
          open={Boolean(mobileMenuEl)}
          onClose={handleMobileMenuClose}
          PaperProps={{
            elevation: 8,
            sx: {
              mt: 1,
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              minWidth: 260,
              maxWidth: '90vw',
              '& .MuiMenuItem-root': {
                px: 3,
                py: 1.5,
                borderRadius: '8px',
                mx: 1,
                my: 0.5,
                '&:hover': {
                  background: '#f3f4f6',
                }
              }
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {/* Mobile User Info */}
          <Box sx={{ p: 3, borderBottom: '1px solid #f3f4f6' }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  background: '#1f2937',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                {user?.full_name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" fontWeight="600" sx={{ color: '#1f2937' }}>
                  {user?.full_name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  {user?.role === 'admin' ? 'Administrator' : 'Employee'}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Mobile Navigation Items */}
          {navigationItems.map((item) => (
            <MenuItem 
              key={item.path}
              onClick={() => navigateToPage(item.path)}
              sx={{
                background: isActivePage(item.path) ? '#f3f4f6' : 'transparent',
                fontWeight: isActivePage(item.path) ? '600' : '500',
              }}
            >
              {React.cloneElement(item.icon, { 
                sx: { 
                  mr: 2, 
                  fontSize: 20, 
                  color: isActivePage(item.path) ? '#1f2937' : '#6b7280' 
                } 
              })}
              <Typography>{item.label}</Typography>
            </MenuItem>
          ))}

          <Divider sx={{ mx: 1, my: 1 }} />

          <MenuItem onClick={handleLogout} sx={{ color: '#dc2626' }}>
            <ExitToApp sx={{ mr: 2, fontSize: 20 }} />
            <Typography fontWeight="500">Sign out</Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 