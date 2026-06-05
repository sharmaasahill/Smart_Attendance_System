import React, { useState, useEffect } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fade,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Paper,
  Stack,
  Badge,
  LinearProgress,
} from '@mui/material';
import {
  AccessTime,
  Analytics,
  Close,
  Dashboard,
  Delete,
  Group,
  ManageAccounts,
  MoreVert,
  Refresh,
  Save,
  Schedule as ScheduleIcon,
  Search,
  TrendingUp,
  PersonAdd,
  CalendarMonth,
  Insights,
  Speed,
  Face,
} from '@mui/icons-material';
import { adminAPI, attendanceAPI } from '../services/api';
import { useAuth } from '../App';
import AnalyticsDashboard from './AnalyticsDashboard';
import AdminFaceManagement from './AdminFaceManagement';
import { format, parseISO } from 'date-fns';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [editAttendanceDialog, setEditAttendanceDialog] = useState({ open: false, record: null });
  const [activeTab, setActiveTab] = useState(0);
  const [actionMenu, setActionMenu] = useState({ anchorEl: null, record: null });
  const [filters, setFilters] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    search: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersResponse, attendanceResponse] = await Promise.all([
        adminAPI.getAllUsers(),
        attendanceAPI.getAttendanceRecords({ date: filters.date }),
      ]);
      setUsers(usersResponse.data || []);
      setAttendance(attendanceResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.date]);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editAttendanceLoading, setEditAttendanceLoading] = useState(false);

  const handleDeleteUser = async () => {
    setDeleteLoading(true);
    try {
      await adminAPI.deleteUser(deleteDialog.user.unique_id);
      setDeleteDialog({ open: false, user: null });
      await fetchData();
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleMarkPresent = async (record) => {
    try {
      const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      await updateAttendanceRecord({ ...record, status: 'present', time_in: currentTime });
      await fetchData();
    } catch (error) {
      console.error('Failed:', error);
    } finally {
      setActionMenu({ anchorEl: null, record: null });
    }
  };

  const handleMarkAbsent = async (record) => {
    try {
      await updateAttendanceRecord({ ...record, status: 'absent', time_in: null });
      await fetchData();
    } catch (error) {
      console.error('Failed:', error);
    } finally {
      setActionMenu({ anchorEl: null, record: null });
    }
  };

  const handleEditTime = (record) => {
    setEditAttendanceDialog({ open: true, record: { ...record, editTime: record.time_in || '09:00' } });
    setActionMenu({ anchorEl: null, record: null });
  };

  const updateAttendanceRecord = async (updatedRecord) => {
    try {
      const response = await adminAPI.updateAttendanceRecord(updatedRecord);
      setAttendance(prev => prev.map(record => record.id === updatedRecord.id ? { ...record, status: updatedRecord.status, time_in: updatedRecord.time_in } : record));
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const handleSaveAttendanceEdit = async () => {
    setEditAttendanceLoading(true);
    try {
      const updatedRecord = { ...editAttendanceDialog.record, time_in: editAttendanceDialog.record.editTime };
      await updateAttendanceRecord(updatedRecord);
      setEditAttendanceDialog({ open: false, record: null });
      await fetchData();
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setEditAttendanceLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
    user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
    user.unique_id.toLowerCase().includes(filters.search.toLowerCase())
  );

  const filteredAttendance = attendance.filter(record =>
    record.user.full_name.toLowerCase().includes(filters.search.toLowerCase())
  );

  // VERIFIED CALCULATIONS - All formulas checked for correctness
  const stats = {
    totalUsers: users.length,
    presentToday: attendance.filter(a => a.status === 'present').length,
    absentToday: attendance.filter(a => a.status === 'absent').length,
    registeredFaces: users.filter(u => u.face_registered).length,
    // Attendance rate = (present / total attendance records) * 100
    // Only calculated if there are attendance records
    attendanceRate: attendance.length > 0 
      ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) 
      : 0,
    // Face registration percentage = (registered / total users) * 100
    faceRegPercentage: users.length > 0 
      ? Math.round((users.filter(u => u.face_registered).length / users.length) * 100) 
      : 0,
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" sx={{ background: 'linear-gradient(135deg, #f5f3f0 0%, #fafaf9 50%, #ffffff 100%)' }}>
        <CircularProgress size={40} sx={{ color: '#f97316' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ background: 'linear-gradient(135deg, #f5f3f0 0%, #fafaf9 50%, #ffffff 100%)', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        {/* Modern Command Center Header */}
        <Fade in timeout={600}>
          <Box sx={{ mb: 4 }}>
            <Card elevation={0} sx={{ borderRadius: '24px', background: 'linear-gradient(135deg, #212E46 0%, #2c3e5a 100%)', overflow: 'hidden', position: 'relative' }}>
              <Box sx={{ position: 'absolute', top: -80, right: -80, width: 240, height: 240, borderRadius: '50%', background: 'rgba(249,115,22,0.12)' }} />
              <Box sx={{ position: 'absolute', bottom: -60, left: -60, width: 180, height: 180, borderRadius: '50%', background: 'rgba(249,115,22,0.08)' }} />
              <Box sx={{ p: 4, position: 'relative', zIndex: 1 }}>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 64, height: 64, background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', boxShadow: '0 8px 24px rgba(249,115,22,0.3)' }}>
                        <Dashboard sx={{ fontSize: 32 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h4" fontWeight="800" sx={{ color: '#ffffff', fontFamily: '"Inter", sans-serif', letterSpacing: '-0.02em', mb: 0.5 }}>
                          Admin Dashboard
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontFamily: '"Inter", sans-serif' }}>
                          Complete system oversight • {format(new Date(), 'EEEE, MMMM dd, yyyy')}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Tooltip title="Refresh Data">
                        <Button 
                          onClick={fetchData} 
                          variant="contained" 
                          startIcon={<Refresh />}
                          sx={{ 
                            borderRadius: '12px', 
                            background: 'rgba(255,255,255,0.15)', 
                            backdropFilter: 'blur(10px)',
                            color: '#ffffff',
                            textTransform: 'none',
                            fontWeight: '700',
                            fontFamily: '"Inter", sans-serif',
                            '&:hover': { background: 'rgba(255,255,255,0.25)' }
                          }}
                        >
                          Refresh
                        </Button>
                      </Tooltip>
                      <Card elevation={0} sx={{ borderRadius: '14px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <TrendingUp sx={{ color: '#ffffff', fontSize: 18 }} />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontFamily: '"Inter", sans-serif' }}>Today's Rate</Typography>
                          <Typography variant="h6" fontWeight="700" sx={{ color: '#ffffff', fontFamily: '"Inter", sans-serif' }}>{stats.attendanceRate}%</Typography>
                        </Box>
                      </Card>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Card>
          </Box>
        </Fade>

        {/* Enhanced Metrics Grid with Verified Calculations */}
        <Fade in timeout={800}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { 
                label: 'Total Users', 
                value: stats.totalUsers, 
                subtitle: `${stats.faceRegPercentage}% registered`,
                icon: <Group sx={{ fontSize: 28 }} />,
                bg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                color: '#212E46',
                borderColor: '#93c5fd'
              },
              { 
                label: 'Present Today', 
                value: stats.presentToday, 
                subtitle: `${stats.attendanceRate}% attendance`,
                icon: <TrendingUp sx={{ fontSize: 28 }} />,
                bg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                color: '#16a34a',
                borderColor: '#86efac'
              },
              { 
                label: 'Absent Today', 
                value: stats.absentToday, 
                subtitle: `${Math.round((stats.absentToday / (attendance.length || 1)) * 100)}% of records`,
                icon: <CalendarMonth sx={{ fontSize: 28 }} />,
                bg: 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)',
                color: '#dc2626',
                borderColor: '#f87171'
              },
              { 
                label: 'Face Registered', 
                value: stats.registeredFaces, 
                subtitle: `${stats.totalUsers - stats.registeredFaces} pending`,
                icon: <ManageAccounts sx={{ fontSize: 28 }} />,
                bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)',
                color: '#f97316',
                borderColor: '#fdba74'
              },
            ].map((metric, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Card elevation={0} sx={{ borderRadius: '20px', background: metric.bg, border: `1px solid ${metric.borderColor}`, overflow: 'hidden', position: 'relative', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 24px rgba(0,0,0,0.1)' } }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ color: metric.color, fontWeight: '700', mb: 1, fontFamily: '"Inter", sans-serif', opacity: 0.8 }}>
                          {metric.label}
                        </Typography>
                        <Typography variant="h3" fontWeight="800" sx={{ color: metric.color, fontFamily: '"Inter", sans-serif', letterSpacing: '-0.02em' }}>
                          {metric.value}
                        </Typography>
                      </Box>
                      <Box sx={{ width: 56, height: 56, borderRadius: '14px', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {metric.icon}
                      </Box>
                    </Box>
                    <Typography variant="caption" sx={{ color: metric.color, fontWeight: '600', fontFamily: '"Inter", sans-serif', opacity: 0.9 }}>
                      {metric.subtitle}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Fade>

        {/* Modern Tab Navigation */}
        <Fade in timeout={1000}>
          <Card elevation={0} sx={{ borderRadius: '20px', mb: 4, background: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)' }}>
            <Box sx={{ p: 2 }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => setActiveTab(newValue)} 
                variant="fullWidth"
                sx={{ 
                  '& .MuiTab-root': { 
                    minHeight: 68, 
                    fontSize: '0.95rem', 
                    fontWeight: '700', 
                    color: '#78716c', 
                    borderRadius: '14px', 
                    textTransform: 'none', 
                    fontFamily: '"Inter", sans-serif',
                    transition: 'all 0.3s ease',
                    '&.Mui-selected': { 
                      color: '#212E46', 
                      background: 'linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 100%)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    },
                    '&:hover': {
                      background: '#fafaf9'
                    }
                  }, 
                  '& .MuiTabs-indicator': { display: 'none' } 
                }}
              >
                <Tab icon={<ManageAccounts sx={{ fontSize: 24 }} />} label="User Management" iconPosition="start" />
                <Tab icon={<Analytics sx={{ fontSize: 24 }} />} label="Analytics & Reports" iconPosition="start" />
                <Tab icon={<Face sx={{ fontSize: 24 }} />} label="Face Management" iconPosition="start" />
              </Tabs>
            </Box>
          </Card>
        </Fade>

        {activeTab === 0 && (
          <>
            {/* Main Content Grid */}
            <Grid container spacing={3}>
              {/* Modern User Cards List */}
              <Grid item xs={12} lg={7}>
                <Card elevation={0} sx={{ borderRadius: '24px', background: '#ffffff', boxShadow: '0 8px 32px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)' }}>
                  <Box sx={{ p: 4, borderBottom: '2px solid #f3f4f6' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Group sx={{ fontSize: 24, color: '#212E46' }} />
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight="800" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif' }}>User Directory</Typography>
                          <Typography variant="caption" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>{filteredUsers.length} total users</Typography>
                        </Box>
                      </Box>
                      <Tooltip title="Add User">
                        <IconButton sx={{ width: 40, height: 40, background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', color: '#ffffff', '&:hover': { background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)' } }}>
                          <PersonAdd sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <TextField 
                      fullWidth 
                      size="small" 
                      placeholder="Search by name, email, or ID..." 
                      value={filters.search} 
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })} 
                      InputProps={{ startAdornment: <Search sx={{ mr: 1, color: '#9ca3af' }} /> }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: '12px', 
                          background: '#fafaf9', 
                          fontFamily: '"Inter", sans-serif',
                          '& fieldset': { border: '1px solid #e7e5e4' },
                          '&:hover fieldset': { border: '1px solid #d6d3d1' },
                          '&.Mui-focused fieldset': { border: '2px solid #f97316' }
                        } 
                      }} 
                    />
                  </Box>

                  <Box sx={{ maxHeight: 520, overflow: 'auto', p: 3 }}>
                    {filteredUsers.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 6 }}>
                        <Typography variant="body1" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif', mb: 1 }}>
                          No users found
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontFamily: '"Inter", sans-serif' }}>
                          Try adjusting your search criteria
                        </Typography>
                      </Box>
                    ) : (
                      <Stack spacing={2}>
                        {filteredUsers.map((user) => (
                          <Paper 
                            key={user.id} 
                            elevation={0} 
                            sx={{ 
                              borderRadius: '16px', 
                              border: '1px solid #f3f4f6', 
                              p: 3, 
                              transition: 'all 0.2s ease', 
                              '&:hover': { 
                                border: '1px solid #e7e5e4', 
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
                                transform: 'translateY(-2px)' 
                              } 
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                <Avatar 
                                  sx={{ 
                                    width: 52, 
                                    height: 52, 
                                    background: user.face_registered 
                                      ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' 
                                      : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
                                    color: user.face_registered ? '#212E46' : '#92400e', 
                                    fontWeight: '800', 
                                    fontSize: '1.2rem',
                                    border: user.face_registered ? '2px solid #93c5fd' : '2px solid #fcd34d'
                                  }}
                                >
                                  {user.full_name.charAt(0)}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <Typography variant="body1" fontWeight="700" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif' }}>
                                      {user.full_name}
                                    </Typography>
                                    <Chip 
                                      label={user.face_registered ? 'Active' : 'Pending'} 
                                      size="small" 
                                      sx={{ 
                                        background: user.face_registered ? '#dcfce7' : '#fef3c7', 
                                        color: user.face_registered ? '#16a34a' : '#d97706', 
                                        fontWeight: '700', 
                                        fontSize: '0.65rem', 
                                        fontFamily: '"Inter", sans-serif', 
                                        height: '20px',
                                        '& .MuiChip-label': { px: 1.5 }
                                      }} 
                                    />
                                  </Box>
                                  <Typography variant="caption" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif', display: 'block', mb: 0.5 }}>
                                    {user.email}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                    ID: {user.unique_id}
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Tooltip title="Delete User">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => setDeleteDialog({ open: true, user })} 
                                    sx={{ 
                                      color: '#dc2626', 
                                      '&:hover': { background: '#fef2f2' } 
                                    }}
                                  >
                                    <Delete sx={{ fontSize: 18 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </Card>
              </Grid>

              {/* Modern Attendance Panel */}
              <Grid item xs={12} lg={5}>
                <Stack spacing={3}>
                  {/* Compact Date Selector */}
                  <Card elevation={0} sx={{ borderRadius: '20px', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', border: '1px solid #93c5fd', p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CalendarMonth sx={{ color: '#3b82f6', fontSize: 22 }} />
                      </Box>
                      <Typography variant="h6" fontWeight="800" sx={{ color: '#1e40af', fontFamily: '"Inter", sans-serif' }}>
                        Select Date
                      </Typography>
                    </Box>
                    <TextField 
                      type="date" 
                      fullWidth 
                      value={filters.date} 
                      onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: '12px', 
                          background: '#ffffff', 
                          fontFamily: '"Inter", sans-serif', 
                          fontWeight: '600',
                          border: '2px solid #bfdbfe',
                          '& fieldset': { border: 'none' }
                        } 
                      }} 
                    />
                  </Card>

                  {/* Enhanced Attendance Records */}
                  <Card elevation={0} sx={{ borderRadius: '24px', background: '#ffffff', boxShadow: '0 8px 32px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)' }}>
                    <Box sx={{ p: 4, borderBottom: '2px solid #f3f4f6' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Insights sx={{ color: '#f97316', fontSize: 24 }} />
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight="800" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif' }}>
                            Attendance Log
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                            {filteredAttendance.length} records for {format(parseISO(filters.date), 'MMM dd')}
                          </Typography>
                        </Box>
                      </Box>
                      <TextField 
                        fullWidth 
                        size="small" 
                        placeholder="Search employees..." 
                        value={filters.search} 
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })} 
                        InputProps={{ startAdornment: <Search sx={{ mr: 1, color: '#9ca3af' }} /> }}
                        sx={{ 
                          '& .MuiOutlinedInput-root': { 
                            borderRadius: '12px', 
                            background: '#fafaf9', 
                            fontFamily: '"Inter", sans-serif', 
                            '& fieldset': { border: '1px solid #e7e5e4' },
                            '&:hover fieldset': { border: '1px solid #d6d3d1' },
                            '&.Mui-focused fieldset': { border: '2px solid #f97316' }
                          } 
                        }} 
                      />
                    </Box>

                    <Box sx={{ maxHeight: 440, overflow: 'auto', p: 3 }}>
                      {filteredAttendance.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                          <Typography variant="body1" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif', mb: 1 }}>
                            No attendance records
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#9ca3af', fontFamily: '"Inter", sans-serif' }}>
                            No data found for selected date
                          </Typography>
                        </Box>
                      ) : (
                        <Stack spacing={2}>
                          {filteredAttendance.map((record) => (
                            <Paper 
                              key={record.id} 
                              elevation={0} 
                              sx={{ 
                                borderRadius: '14px', 
                                border: '1px solid #f3f4f6', 
                                p: 2.5, 
                                transition: 'all 0.2s ease', 
                                '&:hover': { 
                                  border: '1px solid #e7e5e4', 
                                  background: '#fafaf9' 
                                } 
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                                  <Box 
                                    sx={{ 
                                      width: 40, 
                                      height: 40, 
                                      borderRadius: '10px', 
                                      background: record.status === 'present' ? '#dcfce7' : '#fecaca', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center' 
                                    }}
                                  >
                                    <Box 
                                      sx={{ 
                                        width: 12, 
                                        height: 12, 
                                        borderRadius: '50%', 
                                        background: record.status === 'present' ? '#16a34a' : '#dc2626' 
                                      }} 
                                    />
                                  </Box>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" fontWeight="700" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif', fontSize: '0.9rem', mb: 0.5 }}>
                                      {record.user.full_name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                                      {record.time_in ? format(parseISO(`2000-01-01T${record.time_in}`), 'hh:mm a') : 'No check-in'}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Chip 
                                    label={record.status} 
                                    size="small" 
                                    sx={{ 
                                      background: record.status === 'present' ? '#dcfce7' : '#fecaca', 
                                      color: record.status === 'present' ? '#16a34a' : '#dc2626', 
                                      fontWeight: '700', 
                                      fontSize: '0.7rem', 
                                      textTransform: 'capitalize', 
                                      fontFamily: '"Inter", sans-serif', 
                                      height: '22px' 
                                    }} 
                                  />
                                  <IconButton 
                                    size="small" 
                                    onClick={(e) => setActionMenu({ anchorEl: e.currentTarget, record })} 
                                    sx={{ '&:hover': { background: '#f3f4f6' } }}
                                  >
                                    <MoreVert sx={{ fontSize: 18 }} />
                                  </IconButton>
                                </Box>
                              </Box>
                            </Paper>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Card>
                </Stack>
              </Grid>
            </Grid>
          </>
        )}

        {activeTab === 1 && <AnalyticsDashboard />}
        
        {activeTab === 2 && <AdminFaceManagement />}

        {/* Action Menu */}
        <Menu anchorEl={actionMenu.anchorEl} open={Boolean(actionMenu.anchorEl)} onClose={() => setActionMenu({ anchorEl: null, record: null })}
          PaperProps={{ sx: { borderRadius: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 200, border: '1px solid #e7e5e4' } }}>
          <MenuItem onClick={() => handleMarkPresent(actionMenu.record)} sx={{ gap: 2, fontFamily: '"Inter", sans-serif', py: 1.5, '&:hover': { background: '#dcfce7' } }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
            Mark Present
          </MenuItem>
          <MenuItem onClick={() => handleMarkAbsent(actionMenu.record)} sx={{ gap: 2, fontFamily: '"Inter", sans-serif', py: 1.5, '&:hover': { background: '#fecaca' } }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }} />
            Mark Absent
          </MenuItem>
          <MenuItem onClick={() => handleEditTime(actionMenu.record)} sx={{ gap: 2, fontFamily: '"Inter", sans-serif', py: 1.5, '&:hover': { background: '#ffedd5' } }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316' }} />
            Edit Time
          </MenuItem>
        </Menu>

        {/* Edit Dialog */}
        <Dialog open={editAttendanceDialog.open} onClose={() => setEditAttendanceDialog({ open: false, record: null })} maxWidth="sm" fullWidth
          PaperProps={{ sx: { borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' } }}>
          <DialogTitle sx={{ fontWeight: '800', fontFamily: '"Inter", sans-serif', color: '#212E46' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><ScheduleIcon sx={{ color: '#f97316' }} />Edit Attendance</Box>
          </DialogTitle>
          <DialogContent>
            {editAttendanceDialog.record && (
              <Box sx={{ pt: 2 }}>
                <Alert severity="info" sx={{ mb: 3, borderRadius: '12px', fontFamily: '"Inter", sans-serif' }}>
                  Editing for <strong>{editAttendanceDialog.record.user.full_name}</strong>
                </Alert>
                <Stack spacing={3}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select value={editAttendanceDialog.record.status} label="Status" onChange={(e) => setEditAttendanceDialog({ ...editAttendanceDialog, record: { ...editAttendanceDialog.record, status: e.target.value } })} sx={{ borderRadius: '12px' }}>
                      <MenuItem value="present">Present</MenuItem>
                      <MenuItem value="absent">Absent</MenuItem>
                    </Select>
                  </FormControl>
                  {editAttendanceDialog.record.status === 'present' && (
                    <TextField fullWidth label="Check-in Time" type="time" value={editAttendanceDialog.record.editTime} onChange={(e) => setEditAttendanceDialog({ ...editAttendanceDialog, record: { ...editAttendanceDialog.record, editTime: e.target.value } })} InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                  )}
                </Stack>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <Button onClick={() => setEditAttendanceDialog({ open: false, record: null })} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: '700', fontFamily: '"Inter", sans-serif' }}>Cancel</Button>
            <Button onClick={handleSaveAttendanceEdit} variant="contained" disabled={editAttendanceLoading} startIcon={editAttendanceLoading ? <CircularProgress size={16} sx={{ color: '#ffffff' }} /> : <Save />}
              sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #212E46 0%, #2c3e5a 100%)', textTransform: 'none', fontWeight: '700', fontFamily: '"Inter", sans-serif', boxShadow: '0 4px 12px rgba(33,46,70,0.2)' }}>
              {editAttendanceLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })} PaperProps={{ sx: { borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' } }}>
          <DialogTitle sx={{ fontWeight: '800', fontFamily: '"Inter", sans-serif', color: '#212E46' }}>Confirm Deletion</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif', lineHeight: 1.7 }}>
              Delete <strong>{deleteDialog.user?.full_name}</strong>? This cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <Button onClick={() => setDeleteDialog({ open: false, user: null })} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: '700', fontFamily: '"Inter", sans-serif' }}>Cancel</Button>
            <Button onClick={handleDeleteUser} variant="contained" disabled={deleteLoading} startIcon={deleteLoading ? <CircularProgress size={16} sx={{ color: '#ffffff' }} /> : null}
              sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', textTransform: 'none', fontWeight: '700', fontFamily: '"Inter", sans-serif', boxShadow: '0 4px 12px rgba(220,38,38,0.2)' }}>
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default AdminDashboard;
