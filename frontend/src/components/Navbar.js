import React, { useState, useEffect } from 'react';
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
  Stack,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import {
  MoreVert,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';

const Navbar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuEl, setMobileMenuEl] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleMobileMenuOpen = (event) => setMobileMenuEl(event.currentTarget);
  const handleMobileMenuClose = () => setMobileMenuEl(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  const navigateToPage = (path) => {
    navigate(path);
    handleMenuClose();
    handleMobileMenuClose();
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const navbarHeight = 80; // Approximate navbar height
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    handleMobileMenuClose();
  };

  const isActivePage = (path) => location.pathname === path;
  
  // Check if we're on a page that needs a solid navbar
  // Only the home page (/) should have transparent navbar
  const needsSolidNavbar = location.pathname !== '/';
  const shouldShowSolid = scrolled || needsSolidNavbar;

  const navigationItems = [
    { path: '/mark-attendance', label: 'Mark Attendance' },
    { path: '/dashboard', label: 'Dashboard' },
    ...(user?.role === 'admin' ? [{ path: '/admin', label: 'Admin' }] : []),
  ];

  const publicNavigationItems = [
    { label: 'Features', sectionId: 'features' },
    { label: 'How It Works', sectionId: 'how-it-works' },
    { label: 'Industries', sectionId: 'industries' },
  ];

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        background: shouldShowSolid ? 'rgba(255,255,255,0.85)' : 'transparent',
        backdropFilter: shouldShowSolid ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: shouldShowSolid ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent',
        color: shouldShowSolid ? '#1a1a1a' : '#ffffff',
        transition: 'all 0.3s ease',
        zIndex: 1100,
      }}
    >
      <Toolbar sx={{ px: { xs: 3, md: 4 }, py: 1.5 }}>
        {/* Logo */}
        <Box
          display="flex"
          alignItems="center"
          sx={{ flexGrow: isMobile ? 1 : 0, cursor: 'pointer' }}
          onClick={() => navigateToPage('/')}
        >
          <Typography variant="h6" fontWeight="700" sx={{ color: shouldShowSolid ? '#212E46' : '#ffffff', letterSpacing: '-0.02em', fontSize: '1.1rem', transition: 'color 0.3s ease', fontFamily: '"Inter", sans-serif' }}>
            SAS
          </Typography>
        </Box>

        {/* Desktop Navigation */}
        {!isMobile && !user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mx: 6, flexGrow: 1 }}>
            {publicNavigationItems.map((item) => (
              <Button
                key={item.label}
                onClick={() => scrollToSection(item.sectionId)}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: '10px',
                  fontWeight: 500,
                  textTransform: 'none',
                  color: shouldShowSolid ? '#64748b' : 'rgba(255,255,255,0.8)',
                  '&:hover': { background: shouldShowSolid ? '#f8fafc' : 'rgba(255,255,255,0.1)', color: shouldShowSolid ? '#0f172a' : '#ffffff' },
                  transition: 'all 0.2s ease',
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        )}

        {!isMobile && user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mx: 6, flexGrow: 1 }}>
            {navigationItems.map((item) => (
              <Button
                key={item.path}
                onClick={() => navigateToPage(item.path)}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: '10px',
                  fontWeight: 500,
                  textTransform: 'none',
                  color: isActivePage(item.path) ? '#0f172a' : '#64748b',
                  background: isActivePage(item.path) ? '#f1f5f9' : 'transparent',
                  '&:hover': { background: '#f8fafc', color: '#0f172a' },
                  transition: 'all 0.2s ease',
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        )}

        {/* User Section */}
        {user ? (
          <Box display="flex" alignItems="center" gap={2}>
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" fontWeight="600" sx={{ color: shouldShowSolid ? '#0f172a' : '#ffffff', transition: 'color 0.3s ease' }}>
                    {user.full_name.split(' ')[0]}
                  </Typography>
                  <Typography variant="caption" sx={{ color: shouldShowSolid ? '#94a3b8' : 'rgba(255,255,255,0.7)', transition: 'color 0.3s ease' }}>
                    {user.role === 'admin' ? 'Administrator' : 'Employee'}
                  </Typography>
                </Box>
                <IconButton
                  onClick={handleMenuOpen}
                  sx={{ p: 0.5, background: shouldShowSolid ? '#f1f5f9' : 'rgba(255,255,255,0.15)', '&:hover': { background: shouldShowSolid ? '#e2e8f0' : 'rgba(255,255,255,0.25)' }, transition: 'background 0.3s ease' }}
                >
                  <Avatar
                    sx={{
                      width: 36, height: 36,
                      background: 'linear-gradient(135deg, #212E46, #2c3e5a)',
                      fontSize: '0.9rem', fontWeight: 'bold',
                    }}
                  >
                    {user.full_name.charAt(0)}
                  </Avatar>
                </IconButton>
              </Box>
            )}
            {isMobile && (
              <IconButton
                onClick={handleMobileMenuOpen}
                sx={{ background: shouldShowSolid ? '#f1f5f9' : 'rgba(255,255,255,0.15)', color: shouldShowSolid ? '#475569' : '#ffffff', '&:hover': { background: shouldShowSolid ? '#e2e8f0' : 'rgba(255,255,255,0.25)' }, transition: 'all 0.3s ease' }}
              >
                <MoreVert />
              </IconButton>
            )}
          </Box>
        ) : (
          <Stack direction="row" spacing={1}>
            {isMobile && (
              <IconButton
                onClick={handleMobileMenuOpen}
                sx={{ color: shouldShowSolid ? '#475569' : '#ffffff', '&:hover': { background: shouldShowSolid ? '#f1f5f9' : 'rgba(255,255,255,0.1)' }, transition: 'all 0.3s ease' }}
              >
                <MoreVert />
              </IconButton>
            )}
            {!isMobile && (
              <>
                <Button
                  onClick={() => navigateToPage('/login')}
                  sx={{ color: shouldShowSolid ? '#64748b' : 'rgba(255,255,255,0.8)', textTransform: 'none', fontWeight: 500, '&:hover': { color: shouldShowSolid ? '#0f172a' : '#ffffff' }, transition: 'color 0.3s ease' }}
                >
                  Sign in
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigateToPage('/register')}
                  sx={{
                    borderRadius: '10px', textTransform: 'none', fontWeight: 600, px: 3,
                    background: shouldShowSolid ? '#212E46' : '#ffffff', 
                    color: shouldShowSolid ? '#ffffff' : '#212E46', 
                    boxShadow: 'none',
                    fontFamily: '"Inter", sans-serif',
                    '&:hover': { background: shouldShowSolid ? '#2c3e5a' : '#f8fafc', boxShadow: 'none' },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Get Started
                </Button>
              </>
            )}
          </Stack>
        )}

        {/* Desktop User Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 1, borderRadius: '14px', border: '1px solid #f1f5f9',
              boxShadow: '0 20px 60px rgba(0,0,0,0.08)', minWidth: 240,
              '& .MuiMenuItem-root': {
                px: 3, py: 1.5, borderRadius: '8px', mx: 1, my: 0.5,
                '&:hover': { background: '#f8fafc' },
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9' }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ width: 40, height: 40, background: 'linear-gradient(135deg, #212E46, #2c3e5a)', fontSize: '1rem', fontWeight: 'bold' }}>
                {user?.full_name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" fontWeight="600" sx={{ color: '#0f172a' }}>
                  {user?.full_name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  {user?.email}
                </Typography>
              </Box>
            </Box>
          </Box>
          <MenuItem onClick={() => navigateToPage('/profile')}>
            <Typography fontWeight="500">My Profile</Typography>
          </MenuItem>
          <Divider sx={{ mx: 1, my: 0.5 }} />
          <MenuItem onClick={handleLogout} sx={{ color: '#ef4444' }}>
            <Typography fontWeight="500">Sign out</Typography>
          </MenuItem>
        </Menu>

        {/* Mobile Menu */}
        <Menu
          anchorEl={mobileMenuEl}
          open={Boolean(mobileMenuEl)}
          onClose={handleMobileMenuClose}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 1, borderRadius: '14px', border: '1px solid #f1f5f9',
              boxShadow: '0 20px 60px rgba(0,0,0,0.08)', minWidth: 260, maxWidth: '90vw',
              '& .MuiMenuItem-root': {
                px: 3, py: 1.5, borderRadius: '8px', mx: 1, my: 0.5,
                '&:hover': { background: '#f8fafc' },
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {user ? (
            <>
              <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9' }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ width: 40, height: 40, background: 'linear-gradient(135deg, #212E46, #2c3e5a)', fontSize: '1rem', fontWeight: 'bold' }}>
                    {user?.full_name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="600">{user?.full_name}</Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      {user?.role === 'admin' ? 'Administrator' : 'Employee'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              {navigationItems.map((item) => (
                <MenuItem key={item.path} onClick={() => navigateToPage(item.path)}
                  sx={{ background: isActivePage(item.path) ? '#f8fafc' : 'transparent' }}
                >
                  <Typography fontWeight={isActivePage(item.path) ? 600 : 500}>{item.label}</Typography>
                </MenuItem>
              ))}
              <MenuItem onClick={() => navigateToPage('/profile')}
                sx={{ background: isActivePage('/profile') ? '#f8fafc' : 'transparent' }}
              >
                <Typography fontWeight={isActivePage('/profile') ? 600 : 500}>My Profile</Typography>
              </MenuItem>
              <Divider sx={{ mx: 1, my: 1 }} />
              <MenuItem onClick={handleLogout} sx={{ color: '#ef4444' }}>
                <Typography fontWeight="500">Sign out</Typography>
              </MenuItem>
            </>
          ) : (
            <>
              {publicNavigationItems.map((item) => (
                <MenuItem key={item.label} onClick={() => scrollToSection(item.sectionId)}>
                  <Typography fontWeight="500">{item.label}</Typography>
                </MenuItem>
              ))}
              <Divider sx={{ mx: 1, my: 1 }} />
              <MenuItem onClick={() => navigateToPage('/login')}>
                <Typography fontWeight="500">Sign in</Typography>
              </MenuItem>
              <MenuItem onClick={() => navigateToPage('/register')}>
                <Typography fontWeight="600" sx={{ color: '#0f172a' }}>Get Started</Typography>
              </MenuItem>
            </>
          )}
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
