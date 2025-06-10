import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Avatar,
  CircularProgress,
  LinearProgress,
  Fade,
  useTheme,
  useMediaQuery,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Dashboard,
  CheckCircle,
  Cancel,
  Schedule,
  CalendarToday,
  TrendingUp,
  Person,
  CameraAlt,
  History,
  Analytics,
  Today,
  Refresh,
  Download,
  AssignmentTurnedIn,
  AccessTime,
  DateRange,
  Edit,
  Lock,
} from '@mui/icons-material';
import { attendanceAPI, userAPI } from '../services/api';
import { useAuth } from '../App';
import { toast } from 'react-toastify';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

const EmployeeDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState([]);
  const [stats, setStats] = useState({
    todayStatus: null,
    thisWeekPresent: 0,
    thisMonthPresent: 0,
    attendanceRate: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch user's attendance records using the correct API
      const response = await userAPI.getAttendance();
      const attendanceRecords = response.data.attendance_records || [];
      setAttendance(attendanceRecords);
      
      // Calculate stats
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const weekStart = startOfWeek(today);
      const weekEnd = endOfWeek(today);
      
      // Find today's record
      const todayRecord = attendanceRecords.find(record => 
        record.date === todayStr
      );
      
      // Filter records for this week
      const thisWeekRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return isWithinInterval(recordDate, { start: weekStart, end: weekEnd });
      });
      
      // Filter records for this month
      const thisMonthRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === today.getMonth() && 
               recordDate.getFullYear() === today.getFullYear();
      });
      
      const presentThisWeek = thisWeekRecords.filter(r => r.status === 'present').length;
      const presentThisMonth = thisMonthRecords.filter(r => r.status === 'present').length;
      const attendanceRate = thisMonthRecords.length > 0 
        ? (presentThisMonth / thisMonthRecords.length) * 100 
        : 0;
      
      setStats({
        todayStatus: todayRecord?.status || null,
        thisWeekPresent: presentThisWeek,
        thisMonthPresent: presentThisMonth,
        attendanceRate: Math.round(attendanceRate),
      });
      
      setWeeklyData(thisWeekRecords);
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.unique_id]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return { bg: '#dcfce7', color: '#16a34a' };
      case 'absent': return { bg: '#fecaca', color: '#dc2626' };
      case 'late': return { bg: '#fef3c7', color: '#d97706' };
      default: return { bg: '#f3f4f6', color: '#6b7280' };
    }
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    background: stats.todayStatus === 'present' ? '#16a34a' : 
                               stats.todayStatus === 'absent' ? '#dc2626' : '#6b7280',
                    color: '#ffffff',
                    fontSize: '1.75rem',
                    fontWeight: 'bold',
                  }}
                >
                  {user?.full_name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="600" sx={{ color: '#1f2937', letterSpacing: '-0.025em' }}>
                    Welcome back, {user?.full_name.split(' ')[0]}!
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#6b7280', mb: 2 }}>
                    Employee Dashboard - {format(new Date(), 'MMMM yyyy')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      icon={stats.todayStatus === 'present' ? <CheckCircle /> : 
                            stats.todayStatus === 'absent' ? <Cancel /> : 
                            <Cancel />}
                      label={`Today: ${stats.todayStatus === 'present' ? 'Present' : 
                                     stats.todayStatus === 'absent' ? 'Absent' : 
                                     'Not Marked'}`}
                      sx={{
                        background: stats.todayStatus === 'present' ? '#dcfce7' : 
                                   stats.todayStatus === 'absent' ? '#fecaca' : '#fef3c7',
                        color: stats.todayStatus === 'present' ? '#16a34a' : 
                               stats.todayStatus === 'absent' ? '#dc2626' : '#d97706',
                        fontWeight: '600',
                        fontSize: '0.875rem',
                      }}
                    />
                    <Chip
                      label={user?.role || 'Employee'}
                      size="small"
                      sx={{
                        background: '#dbeafe',
                        color: '#3b82f6',
                        fontWeight: '500',
                        fontSize: '0.75rem',
                      }}
                    />
                  </Box>
                </Box>
              </Box>
              
              {/* Profile Actions */}
              <Box sx={{ display: 'flex', gap: 2 }}>
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
                <Button
                  variant="outlined"
                  startIcon={<Lock />}
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
                  Change Password
                </Button>
              </Box>
            </Box>

            {/* Quick Actions */}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<CameraAlt />}
                  onClick={() => window.location.href = '/mark-attendance'}
                  sx={{
                    py: 2.5,
                    borderRadius: '12px',
                    background: '#3b82f6',
                    textTransform: 'none',
                    fontWeight: '600',
                    fontSize: '1rem',
                    boxShadow: 'none',
                    '&:hover': {
                      background: '#2563eb',
                      boxShadow: 'none',
                    },
                  }}
                >
                  Mark Attendance
                </Button>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<History />}
                  onClick={() => window.location.href = '/attendance-history'}
                  sx={{
                    py: 2.5,
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    color: '#6b7280',
                    textTransform: 'none',
                    fontWeight: '600',
                    fontSize: '1rem',
                    '&:hover': {
                      border: '1px solid #d1d5db',
                      background: '#f9fafb',
                    },
                  }}
                >
                  View History
                </Button>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Download />}
                  sx={{
                    py: 2.5,
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    color: '#6b7280',
                    textTransform: 'none',
                    fontWeight: '600',
                    fontSize: '1rem',
                    '&:hover': {
                      border: '1px solid #d1d5db',
                      background: '#f9fafb',
                    },
                  }}
                >
                  Download Report
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Fade>

        {/* Employee Profile Overview */}
        <Fade in timeout={1000}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              background: '#ffffff',
              mb: 6,
            }}
          >
            <Box sx={{ p: 4 }}>
              <Typography variant="h6" fontWeight="600" sx={{ color: '#1f2937', mb: 3 }}>
                My Profile
              </Typography>
              
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" fontWeight="600" sx={{ color: '#1f2937', mb: 2 }}>
                      Personal Information
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Person sx={{ color: '#6b7280', fontSize: 20 }} />
                        <Typography variant="body2" sx={{ color: '#1f2937' }}>
                          {user?.full_name}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>@</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#1f2937' }}>
                          {user?.email}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>📞</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#1f2937' }}>
                          {user?.phone || 'Not provided'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>🏢</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#1f2937' }}>
                          {user?.department || 'Not specified'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" fontWeight="600" sx={{ color: '#1f2937', mb: 2 }}>
                      Account Information
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                          User ID
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#1f2937', fontFamily: 'monospace' }}>
                          {user?.unique_id}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                          Face Registration Status
                        </Typography>
                        <Chip
                          size="small"
                          label={user?.face_registered ? 'Registered' : 'Pending'}
                          sx={{
                            background: user?.face_registered ? '#dcfce7' : '#fef3c7',
                            color: user?.face_registered ? '#16a34a' : '#d97706',
                            fontWeight: '500',
                            fontSize: '0.75rem',
                          }}
                        />
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                          Account Status
                        </Typography>
                        <Chip
                          size="small"
                          label="Active"
                          sx={{
                            background: '#dcfce7',
                            color: '#16a34a',
                            fontWeight: '500',
                            fontSize: '0.75rem',
                          }}
                        />
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                          Member Since
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#1f2937' }}>
                          {user?.created_at ? format(parseISO(user.created_at), 'dd/MM/yyyy') : '09/06/2025'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Card>
        </Fade>

        {/* Stats Cards */}
        <Fade in timeout={1200}>
          <Grid container spacing={4} sx={{ mb: 6 }}>
            {[
              {
                title: 'This Week',
                value: `${stats.thisWeekPresent}/7`,
                subtitle: 'Present days',
                icon: <CalendarToday />,
                color: '#3b82f6',
                background: '#dbeafe',
              },
              {
                title: 'This Month',
                value: stats.thisMonthPresent,
                subtitle: 'Present days',
                icon: <DateRange />,
                color: '#16a34a',
                background: '#dcfce7',
              },
              {
                title: 'Attendance Rate',
                value: `${stats.attendanceRate}%`,
                subtitle: 'This month',
                icon: <TrendingUp />,
                color: '#7c3aed',
                background: '#e9d5ff',
              },
              {
                title: 'Today Status',
                value: stats.todayStatus === 'present' ? 'Present' : 'Absent',
                subtitle: format(new Date(), 'MMM dd, yyyy'),
                icon: <Today />,
                color: stats.todayStatus === 'present' ? '#16a34a' : '#dc2626',
                background: stats.todayStatus === 'present' ? '#dcfce7' : '#fecaca',
              },
            ].map((stat, index) => (
              <Grid item xs={12} sm={6} lg={3} key={index}>
                <Card
                  elevation={0}
                  sx={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    background: '#ffffff',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '12px',
                          background: stat.background,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: stat.color,
                        }}
                      >
                        {React.cloneElement(stat.icon, { sx: { fontSize: 24 } })}
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 1, fontWeight: 500 }}>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" fontWeight="700" sx={{ color: '#1f2937', mb: 1 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                      {stat.subtitle}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Fade>

        {/* Main Content */}
        <Grid container spacing={4}>
          {/* Weekly Overview */}
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
                  <Typography variant="h6" fontWeight="600" sx={{ color: '#1f2937', mb: 1 }}>
                    This Week's Attendance
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    {format(startOfWeek(new Date()), 'MMM dd')} - {format(endOfWeek(new Date()), 'MMM dd')}
                  </Typography>
                </Box>

                <Box sx={{ p: 4 }}>
                  {weeklyData.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Schedule sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
                      <Typography variant="body1" sx={{ color: '#6b7280' }}>
                        No attendance records for this week
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {weeklyData.map((record, index) => {
                        const statusConfig = getStatusColor(record.status);
                        return (
                          <Box
                            key={index}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              p: 3,
                              borderRadius: '12px',
                              background: '#f9fafb',
                              border: '1px solid #f3f4f6',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: statusConfig.color,
                                }}
                              />
                              <Box>
                                <Typography variant="body2" fontWeight="500" sx={{ color: '#1f2937' }}>
                                  {format(parseISO(record.date), 'EEEE, MMM dd')}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                  {record.time_in || 'No time recorded'}
                                </Typography>
                              </Box>
                            </Box>
                            <Chip
                              label={record.status}
                              size="small"
                              sx={{
                                background: statusConfig.bg,
                                color: statusConfig.color,
                                fontWeight: '500',
                                fontSize: '0.75rem',
                                textTransform: 'capitalize',
                              }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              </Card>
            </Fade>
          </Grid>

          {/* Recent Attendance History */}
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6" fontWeight="600" sx={{ color: '#1f2937', mb: 1 }}>
                        Recent History
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        Last 10 attendance records
                      </Typography>
                    </Box>
                    <Tooltip title="Refresh Data">
                      <IconButton
                        onClick={fetchData}
                        sx={{
                          color: '#6b7280',
                          '&:hover': {
                            background: '#f3f4f6',
                          },
                        }}
                      >
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {attendance.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <History sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
                      <Typography variant="body1" sx={{ color: '#6b7280' }}>
                        No attendance history available
                      </Typography>
                    </Box>
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: '#6b7280', fontWeight: 600, fontSize: '0.875rem' }}>
                            Date
                          </TableCell>
                          <TableCell sx={{ color: '#6b7280', fontWeight: 600, fontSize: '0.875rem' }}>
                            Time
                          </TableCell>
                          <TableCell sx={{ color: '#6b7280', fontWeight: 600, fontSize: '0.875rem' }}>
                            Status
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attendance.slice(0, 10).map((record, index) => {
                          const statusConfig = getStatusColor(record.status);
                          return (
                            <TableRow key={index} sx={{ '&:hover': { background: '#f9fafb' } }}>
                              <TableCell sx={{ py: 2 }}>
                                <Typography variant="body2" fontWeight="500" sx={{ color: '#1f2937' }}>
                                  {format(parseISO(record.date), 'MMM dd, yyyy')}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                  {format(parseISO(record.date), 'EEEE')}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                  {record.time_in || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Chip
                                  size="small"
                                  label={record.status}
                                  sx={{
                                    background: statusConfig.bg,
                                    color: statusConfig.color,
                                    fontWeight: '500',
                                    fontSize: '0.75rem',
                                    textTransform: 'capitalize',
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              </Card>
            </Fade>
          </Grid>
        </Grid>

        {/* Attendance Rate Progress */}
        <Fade in timeout={1800}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              background: '#ffffff',
              mt: 4,
            }}
          >
            <Box sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" fontWeight="600" sx={{ color: '#1f2937', mb: 1 }}>
                    Monthly Attendance Progress
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Your attendance performance for {format(new Date(), 'MMMM yyyy')}
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="700" sx={{ color: '#3b82f6' }}>
                  {stats.attendanceRate}%
                </Typography>
              </Box>
              
              <LinearProgress
                variant="determinate"
                value={stats.attendanceRate}
                sx={{
                  height: 12,
                  borderRadius: '6px',
                  background: '#f3f4f6',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: '6px',
                    background: stats.attendanceRate >= 80 ? '#16a34a' : stats.attendanceRate >= 60 ? '#f59e0b' : '#dc2626',
                  },
                }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Present: {stats.thisMonthPresent} days
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Target: 80%
                </Typography>
              </Box>
            </Box>
          </Card>
        </Fade>
      </Container>
    </Box>
  );
};

export default EmployeeDashboard; 