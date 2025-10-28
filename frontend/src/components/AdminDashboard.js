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
  Divider,
  Fade,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  AccessTime,
  Analytics,
  Cancel,
  CheckCircle,
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
} from '@mui/icons-material';
import { adminAPI, attendanceAPI } from '../services/api';
import { useAuth } from '../App';
import { toast } from 'react-toastify';
import AnalyticsDashboard from './AnalyticsDashboard';
import { format, parseISO } from 'date-fns';

const AdminDashboard = () => {
  const theme = useTheme();
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
      console.log('Fetching admin data...');
      const [usersResponse, attendanceResponse] = await Promise.all([
        adminAPI.getAllUsers(),
        attendanceAPI.getAttendanceRecords({ date: filters.date }),
      ]);
      
      console.log('Users response:', usersResponse.data);
      console.log('Attendance response:', attendanceResponse.data);
      
      setUsers(usersResponse.data || []);
      setAttendance(attendanceResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else {
        toast.error(`Failed to fetch data: ${error.response?.data?.detail || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.date]);

  const handleDeleteUser = async () => {
    try {
      await adminAPI.deleteUser(deleteDialog.user.unique_id);
      toast.success(`User ${deleteDialog.user.full_name} deleted successfully`);
      setDeleteDialog({ open: false, user: null });
      fetchData();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  // New attendance management functions
  const handleMarkPresent = async (record) => {
    try {
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      await updateAttendanceRecord({
        ...record,
        status: 'present',
        time_in: currentTime
      });
      
      toast.success(`Marked ${record.user.full_name} as present`);
      fetchData();
    } catch (error) {
      toast.error('Failed to mark as present');
    }
    setActionMenu({ anchorEl: null, record: null });
  };

  const handleMarkAbsent = async (record) => {
    try {
      await updateAttendanceRecord({
        ...record,
        status: 'absent',
        time_in: null
      });
      
      toast.success(`Marked ${record.user.full_name} as absent`);
      fetchData();
    } catch (error) {
      toast.error('Failed to mark as absent');
    }
    setActionMenu({ anchorEl: null, record: null });
  };

  const handleEditTime = (record) => {
    setEditAttendanceDialog({ 
      open: true, 
      record: {
        ...record,
        editTime: record.time_in || '09:00'
      }
    });
    setActionMenu({ anchorEl: null, record: null });
  };

  const updateAttendanceRecord = async (updatedRecord) => {
    try {
      // Call the actual backend API
      const response = await adminAPI.updateAttendanceRecord(updatedRecord);
      
      // Update local state with the response data
      setAttendance(prev => prev.map(record => 
        record.id === updatedRecord.id ? {
          ...record,
          status: updatedRecord.status,
          time_in: updatedRecord.time_in,
        } : record
      ));
      
      return response.data;
    } catch (error) {
      console.error('Failed to update attendance record:', error);
      throw error;
    }
  };

  const handleSaveAttendanceEdit = async () => {
    try {
      const updatedRecord = {
        ...editAttendanceDialog.record,
        time_in: editAttendanceDialog.record.editTime
      };
      
      await updateAttendanceRecord(updatedRecord);
      toast.success('Attendance record updated successfully');
      setEditAttendanceDialog({ open: false, record: null });
      fetchData();
    } catch (error) {
      toast.error('Failed to update attendance record');
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

  const stats = {
    totalUsers: users.length,
    presentToday: attendance.filter(a => a.status === 'present').length,
    absentToday: attendance.filter(a => a.status === 'absent').length,
    registeredFaces: users.filter(u => u.face_registered).length,
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="60vh"
        sx={{ background: '#fafafa' }}
      >
        <CircularProgress size={40} sx={{ color: '#6b7280' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ background: '#fafafa', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Fade in timeout={800}>
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  background: '#1f2937',
                  color: '#ffffff',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                }}
              >
                {user?.full_name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="600" sx={{ color: '#1f2937', letterSpacing: '-0.025em' }}>
                  Admin Dashboard
                </Typography>
                <Typography variant="body1" sx={{ color: '#6b7280' }}>
                  Welcome back, {user?.full_name.split(' ')[0]}! Here's your system overview.
                </Typography>
              </Box>
            </Box>
          </Box>
        </Fade>

        {/* Navigation Tabs */}
        <Fade in timeout={1000}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              mb: 6,
              background: '#ffffff',
            }}
          >
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="fullWidth"
              sx={{
                p: 1,
                '& .MuiTab-root': {
                  minHeight: 64,
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  borderRadius: '8px',
                  textTransform: 'none',
                  mx: 1,
                  '&.Mui-selected': {
                    color: '#1f2937',
                    background: '#f3f4f6',
                  },
                },
                '& .MuiTabs-indicator': {
                  display: 'none',
                },
              }}
            >
              <Tab 
                icon={<ManageAccounts />} 
                label="User Management" 
                iconPosition="start"
              />
              <Tab 
                icon={<Analytics />} 
                label="Analytics & Reports" 
                iconPosition="start"
              />
            </Tabs>
          </Card>
        </Fade>

        {/* Tab Content */}
        {activeTab === 0 && (
          <>
            {/* Stats Cards */}
            <Fade in timeout={1200}>
              <Grid container spacing={4} sx={{ mb: 6 }}>
                {[
                  {
                    title: 'Total Users',
                    value: stats.totalUsers,
                    icon: <Group />,
                    color: '#3b82f6',
                    background: '#dbeafe',
                  },
                  {
                    title: 'Present Today',
                    value: stats.presentToday,
                    icon: <CheckCircle />,
                    color: '#16a34a',
                    background: '#dcfce7',
                  },
                  {
                    title: 'Absent Today',
                    value: stats.absentToday,
                    icon: <Cancel />,
                    color: '#dc2626',
                    background: '#fecaca',
                  },
                  {
                    title: 'Faces Registered',
                    value: stats.registeredFaces,
                    icon: <Dashboard />,
                    color: '#7c3aed',
                    background: '#e9d5ff',
                  },
                ].map((stat, index) => (
                  <Grid item xs={12} sm={6} lg={3} key={index}>
                    <Card
                      elevation={0}
                      sx={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        background: '#ffffff',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="body2" sx={{ color: '#6b7280', mb: 1, fontWeight: 500 }}>
                              {stat.title}
                            </Typography>
                            <Typography variant="h3" fontWeight="700" sx={{ color: '#1f2937' }}>
                              {stat.value}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              width: 64,
                              height: 64,
                              borderRadius: '16px',
                              background: stat.background,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: stat.color,
                            }}
                          >
                            {React.cloneElement(stat.icon, { sx: { fontSize: 28 } })}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Fade>

            {/* Main Content Grid */}
            <Grid container spacing={4}>
              {/* Users Management */}
              <Grid item xs={12} lg={6}>
                <Fade in timeout={1400}>
                  <Card
                    elevation={0}
                    sx={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '16px',
                      background: '#ffffff',
                      height: '100%',
                    }}
                  >
                    <Box sx={{ p: 4, borderBottom: '1px solid #f3f4f6' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6" fontWeight="600" sx={{ color: '#1f2937' }}>
                          Registered Users
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<Refresh />}
                          onClick={fetchData}
                          size="small"
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
                          Refresh
                        </Button>
                      </Box>

                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Search users by name, email, or ID..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        InputProps={{
                          startAdornment: <Search sx={{ mr: 2, color: '#9ca3af', fontSize: 20 }} />,
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
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
                          },
                        }}
                      />
                    </Box>

                    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ color: '#6b7280', fontWeight: 600, fontSize: '0.875rem' }}>
                              User
                            </TableCell>
                            <TableCell sx={{ color: '#6b7280', fontWeight: 600, fontSize: '0.875rem' }}>
                              Status
                            </TableCell>
                            <TableCell sx={{ color: '#6b7280', fontWeight: 600, fontSize: '0.875rem' }}>
                              Actions
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredUsers.map((user) => (
                            <TableRow key={user.id} sx={{ '&:hover': { background: '#f9fafb' } }}>
                              <TableCell sx={{ py: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Avatar
                                    sx={{
                                      width: 32,
                                      height: 32,
                                      background: '#f3f4f6',
                                      color: '#6b7280',
                                      fontSize: '0.875rem',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    {user.full_name.charAt(0)}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" fontWeight="500" sx={{ color: '#1f2937' }}>
                                      {user.full_name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                      {user.unique_id}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Chip
                                  size="small"
                                  label={user.face_registered ? 'Registered' : 'Pending'}
                                  sx={{
                                    background: user.face_registered ? '#dcfce7' : '#fef3c7',
                                    color: user.face_registered ? '#16a34a' : '#d97706',
                                    fontWeight: '500',
                                    fontSize: '0.75rem',
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => setDeleteDialog({ open: true, user })}
                                  sx={{
                                    color: '#dc2626',
                                    '&:hover': {
                                      background: '#fef2f2',
                                    },
                                  }}
                                >
                                  <Delete sx={{ fontSize: 18 }} />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  </Card>
                </Fade>
              </Grid>

              {/* Enhanced Attendance Records */}
              <Grid item xs={12} lg={6}>
                <Fade in timeout={1600}>
                  <Card
                    elevation={0}
                    sx={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '16px',
                      background: '#ffffff',
                      height: '100%',
                    }}
                  >
                    <Box sx={{ p: 4, borderBottom: '1px solid #f3f4f6' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6" fontWeight="600" sx={{ color: '#1f2937' }}>
                          Attendance Records
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Refresh Data">
                            <IconButton
                              size="small"
                              onClick={fetchData}
                              sx={{
                                background: '#f3f4f6',
                                '&:hover': { background: '#e5e7eb' }
                              }}
                            >
                              <Refresh sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>

                        </Box>
                      </Box>

                      <TextField
                        type="date"
                        size="small"
                        value={filters.date}
                        onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                        sx={{
                          mb: 2,
                          '& .MuiOutlinedInput-root': {
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
                          },
                        }}
                      />

                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Search employees by name..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        InputProps={{
                          startAdornment: <Search sx={{ mr: 2, color: '#9ca3af', fontSize: 20 }} />,
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
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
                          },
                        }}
                      />
                    </Box>

                    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ color: '#6b7280', fontWeight: 600, fontSize: '0.875rem' }}>
                              Employee
                            </TableCell>
                            <TableCell sx={{ color: '#6b7280', fontWeight: 600, fontSize: '0.875rem' }}>
                              Time
                            </TableCell>
                            <TableCell sx={{ color: '#6b7280', fontWeight: 600, fontSize: '0.875rem' }}>
                              Status
                            </TableCell>
                            <TableCell sx={{ color: '#6b7280', fontWeight: 600, fontSize: '0.875rem' }}>
                              Actions
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredAttendance.map((record) => (
                            <TableRow key={record.id} sx={{ '&:hover': { background: '#f9fafb' } }}>
                              <TableCell sx={{ py: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Avatar
                                    sx={{
                                      width: 32,
                                      height: 32,
                                      background: record.status === 'present' ? '#dcfce7' : '#fecaca',
                                      color: record.status === 'present' ? '#16a34a' : '#dc2626',
                                      fontSize: '0.875rem',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    {record.user.full_name.charAt(0)}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" fontWeight="500" sx={{ color: '#1f2937' }}>
                                      {record.user.full_name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                      {record.user.unique_id}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                  {record.time_in ? format(parseISO(`2000-01-01T${record.time_in}`), 'hh:mm a') : '-'}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Chip
                                  size="small"
                                  label={record.status}
                                  sx={{
                                    background: record.status === 'present' ? '#dcfce7' : '#fecaca',
                                    color: record.status === 'present' ? '#16a34a' : '#dc2626',
                                    fontWeight: '500',
                                    fontSize: '0.75rem',
                                    textTransform: 'capitalize',
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Tooltip title="More Actions">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => setActionMenu({ anchorEl: e.currentTarget, record })}
                                    sx={{
                                      color: '#6b7280',
                                      '&:hover': { background: '#f3f4f6' }
                                    }}
                                  >
                                    <MoreVert sx={{ fontSize: 18 }} />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                          {filteredAttendance.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} sx={{ py: 6, textAlign: 'center' }}>
                                <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                                  No attendance records found
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                                  {filters.search ? 'Try adjusting your search' : 'No records for this date'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </Box>
                  </Card>
                </Fade>
              </Grid>
            </Grid>
          </>
        )}

        {activeTab === 1 && (
          <AnalyticsDashboard />
        )}

        {/* Action Menu for Attendance Records */}
        <Menu
          anchorEl={actionMenu.anchorEl}
          open={Boolean(actionMenu.anchorEl)}
          onClose={() => setActionMenu({ anchorEl: null, record: null })}
          PaperProps={{
            sx: {
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              minWidth: 200,
              '& .MuiMenuItem-root': {
                py: 1.5,
                px: 2,
                gap: 2,
                '&:hover': {
                  background: '#f3f4f6',
                }
              }
            }
          }}
        >
          <MenuItem onClick={() => handleMarkPresent(actionMenu.record)}>
            <CheckCircle sx={{ color: '#16a34a', fontSize: 20 }} />
            <Typography>Mark Present</Typography>
          </MenuItem>
          
          <MenuItem onClick={() => handleMarkAbsent(actionMenu.record)}>
            <Cancel sx={{ color: '#dc2626', fontSize: 20 }} />
            <Typography>Mark Absent</Typography>
          </MenuItem>
          
          <MenuItem onClick={() => handleEditTime(actionMenu.record)}>
            <AccessTime sx={{ color: '#f59e0b', fontSize: 20 }} />
            <Typography>Edit Time</Typography>
          </MenuItem>
          
          <Divider sx={{ my: 1 }} />
          
          <MenuItem onClick={() => setActionMenu({ anchorEl: null, record: null })}>
            <Close sx={{ color: '#6b7280', fontSize: 20 }} />
            <Typography>Cancel</Typography>
          </MenuItem>
        </Menu>

        {/* Edit Attendance Dialog */}
        <Dialog
          open={editAttendanceDialog.open}
          onClose={() => setEditAttendanceDialog({ open: false, record: null })}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
            }
          }}
        >
          <DialogTitle sx={{ color: '#1f2937', fontWeight: '600', pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ScheduleIcon sx={{ color: '#3b82f6' }} />
              Edit Attendance Time
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ pb: 3 }}>
            {editAttendanceDialog.record && (
              <Box sx={{ pt: 2 }}>
                <Alert severity="info" sx={{ mb: 3, borderRadius: '8px' }}>
                  Editing attendance for <strong>{editAttendanceDialog.record.user.full_name}</strong>
                </Alert>
                
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={editAttendanceDialog.record.status}
                        label="Status"
                        onChange={(e) => setEditAttendanceDialog({
                          ...editAttendanceDialog,
                          record: { ...editAttendanceDialog.record, status: e.target.value }
                        })}
                        sx={{ borderRadius: '8px' }}
                      >
                        <MenuItem value="present">Present</MenuItem>
                        <MenuItem value="absent">Absent</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {editAttendanceDialog.record.status === 'present' && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Check-in Time"
                        type="time"
                        value={editAttendanceDialog.record.editTime}
                        onChange={(e) => setEditAttendanceDialog({
                          ...editAttendanceDialog,
                          record: { ...editAttendanceDialog.record, editTime: e.target.value }
                        })}
                        InputLabelProps={{ shrink: true }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                      />
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <Button 
              onClick={() => setEditAttendanceDialog({ open: false, record: null })}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: '500',
                color: '#6b7280',
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAttendanceEdit}
              variant="contained"
              startIcon={<Save />}
              sx={{
                borderRadius: '8px',
                background: '#3b82f6',
                textTransform: 'none',
                fontWeight: '500',
                boxShadow: 'none',
                '&:hover': {
                  background: '#2563eb',
                  boxShadow: 'none',
                },
              }}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, user: null })}
          PaperProps={{
            sx: {
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
            },
          }}
        >
          <DialogTitle sx={{ color: '#1f2937', fontWeight: '600' }}>
            Confirm User Deletion
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ color: '#6b7280', lineHeight: 1.6 }}>
              Are you sure you want to delete user "{deleteDialog.user?.full_name}"? 
              This action cannot be undone and will permanently remove all their data and attendance records.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <Button 
              onClick={() => setDeleteDialog({ open: false, user: null })}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: '500',
                color: '#6b7280',
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteUser} 
              variant="contained"
              sx={{
                borderRadius: '8px',
                background: '#dc2626',
                textTransform: 'none',
                fontWeight: '500',
                boxShadow: 'none',
                '&:hover': {
                  background: '#b91c1c',
                  boxShadow: 'none',
                },
              }}
            >
              Delete User
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default AdminDashboard; 