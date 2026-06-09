import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  CircularProgress,
  Fade,
  Paper,
  Divider,
  Stack,
} from '@mui/material';
import {
  ArrowForward,
} from '@mui/icons-material';
import { userAPI } from '../services/api';
import { useAuth } from '../App';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthlyCalendar, setMonthlyCalendar] = useState([]);
  const [stats, setStats] = useState({
    todayStatus: null,
    thisWeekPresent: 0,
    thisMonthPresent: 0,
    attendanceRate: 0,
    streak: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await userAPI.getAttendance();
      const attendanceRecords = response.data.attendance_records || [];
      setAttendance(attendanceRecords);
      
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const weekStart = startOfWeek(today);
      const weekEnd = endOfWeek(today);
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      
      const todayRecord = attendanceRecords.find(record => record.date === todayStr);
      const thisWeekRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return isWithinInterval(recordDate, { start: weekStart, end: weekEnd });
      });
      const thisMonthRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === today.getMonth() && recordDate.getFullYear() === today.getFullYear();
      });
      
      // Calculate streak
      let streak = 0;
      const sortedRecords = [...attendanceRecords].sort((a, b) => new Date(b.date) - new Date(a.date));
      for (const record of sortedRecords) {
        if (record.status === 'present') streak++;
        else break;
      }
      
      // Create monthly calendar
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const calendarData = daysInMonth.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const record = attendanceRecords.find(r => r.date === dayStr);
        return { date: day, status: record?.status || null };
      });
      
      setMonthlyCalendar(calendarData);

      const presentThisWeek = thisWeekRecords.filter(r => r.status === 'present').length;
      const presentThisMonth = thisMonthRecords.filter(r => r.status === 'present').length;
      const attendanceRate = thisMonthRecords.length > 0 ? (presentThisMonth / thisMonthRecords.length) * 100 : 0;
      
      setStats({
        todayStatus: todayRecord?.status || null,
        thisWeekPresent: presentThisWeek,
        thisMonthPresent: presentThisMonth,
        attendanceRate: Math.round(attendanceRate),
        streak,
      });
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.unique_id]);

  const downloadReport = () => {
    const rows = [
      ['Date', 'Status', 'Time In'],
      ...attendance.map((r) => [
        r.date,
        r.status,
        r.time_in || '',
      ]),
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${user?.unique_id || 'report'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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
        {/* Hero Section with Split Layout */}
        <Fade in timeout={600}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* LEFT: Large Stats Card */}
            <Grid item xs={12} md={5}>
              <Card elevation={0} sx={{ borderRadius: '28px', background: 'linear-gradient(135deg, #212E46 0%, #2c3e5a 100%)', color: '#ffffff', height: '100%', minHeight: 380, position: 'relative', overflow: 'hidden', boxShadow: '0 20px 60px rgba(33,46,70,0.3)' }}>
                {/* Decorative circles */}
                <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(249,115,22,0.1)' }} />
                <Box sx={{ position: 'absolute', bottom: -30, left: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                
                <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Avatar sx={{ width: 64, height: 64, background: stats.todayStatus === 'present' ? '#10b981' : '#f97316', fontSize: '1.75rem', fontWeight: 'bold', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
                      {user?.full_name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif', mb: 0.5 }}>
                        {user?.full_name.split(' ')[0]}
                      </Typography>
                      <Chip label={user?.role || 'Employee'} size="small" sx={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff', fontWeight: '600', fontSize: '0.7rem', height: '22px' }} />
                    </Box>
                  </Box>

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 3 }} />

                  {/* Circular Progress - Attendance Rate */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, position: 'relative' }}>
                    <Box sx={{ position: 'relative' }}>
                      <CircularProgress variant="determinate" value={100} size={160} thickness={4} sx={{ color: 'rgba(255,255,255,0.1)', position: 'absolute' }} />
                      <CircularProgress variant="determinate" value={stats.attendanceRate} size={160} thickness={4} sx={{ color: '#f97316' }} />
                      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="h3" fontWeight="800" sx={{ fontFamily: '"Inter", sans-serif', lineHeight: 1 }}>
                          {stats.attendanceRate}%
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600', mt: 0.5 }}>
                          This Month
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Quick Stats Row */}
                  <Grid container spacing={2} sx={{ mt: 'auto' }}>
                    <Grid item xs={4}>
                      <Box textAlign="center">
                        <Typography variant="h5" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif' }}>{stats.streak}</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Streak</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box textAlign="center">
                        <Typography variant="h5" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif' }}>{stats.thisWeekPresent}/7</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>This Week</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box textAlign="center">
                        <Typography variant="h5" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif' }}>{stats.thisMonthPresent}</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Days</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* RIGHT: Welcome & Actions */}
            <Grid item xs={12} md={7}>
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Welcome Message */}
                <Card elevation={0} sx={{ borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h5" fontWeight="700" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif', mb: 0.5 }}>
                        Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                        {format(new Date(), 'EEEE, MMMM dd, yyyy')}
                      </Typography>
                    </Box>
                    <Chip
                      label={stats.todayStatus === 'present' ? 'Present Today' : stats.todayStatus === 'absent' ? 'Absent' : 'Not Marked'}
                      sx={{ background: stats.todayStatus === 'present' ? '#dcfce7' : stats.todayStatus === 'absent' ? '#fecaca' : '#fef3c7', color: stats.todayStatus === 'present' ? '#16a34a' : stats.todayStatus === 'absent' ? '#dc2626' : '#d97706', fontWeight: '700', px: 2, height: '40px', fontSize: '0.9rem' }}
                    />
                  </Box>
                </Card>

                {/* Action Buttons */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Button fullWidth variant="contained" size="large" onClick={() => window.location.href = '/mark-attendance'}
                      sx={{ py: 3, borderRadius: '16px', background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', textTransform: 'none', fontWeight: '700', fontSize: '1rem', fontFamily: '"Inter", sans-serif', boxShadow: '0 8px 24px rgba(249,115,22,0.3)', '&:hover': { background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', transform: 'translateY(-2px)', boxShadow: '0 12px 32px rgba(249,115,22,0.4)' }, transition: 'all 0.3s ease' }}>
                      Mark Attendance
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button fullWidth variant="outlined" size="large" onClick={downloadReport}
                      sx={{ py: 3, borderRadius: '16px', border: '2px solid #e7e5e4', color: '#78716c', textTransform: 'none', fontWeight: '700', fontSize: '1rem', fontFamily: '"Inter", sans-serif', '&:hover': { border: '2px solid #d6d3d1', background: '#fafaf9', transform: 'translateY(-2px)' }, transition: 'all 0.3s ease' }}>
                      Download Report
                    </Button>
                  </Grid>
                </Grid>

                {/* Mini Stats Cards */}
                <Grid container spacing={2}>
                  {[
                    { label: 'Streak Days', value: stats.streak, color: '#f59e0b', bg: '#fef3c7' },
                    { label: 'Attendance Rate', value: `${stats.attendanceRate}%`, color: '#10b981', bg: '#dcfce7' },
                    { label: 'This Month', value: stats.thisMonthPresent, color: '#3b82f6', bg: '#dbeafe' },
                  ].map((stat, i) => (
                    <Grid item xs={12} sm={4} key={i}>
                      <Card elevation={0} sx={{ borderRadius: '16px', background: stat.bg, border: 'none', p: 2.5 }}>
                        <Typography variant="h5" fontWeight="700" sx={{ color: stat.color, fontFamily: '"Inter", sans-serif', lineHeight: 1.2 }}>{stat.value}</Typography>
                        <Typography variant="caption" sx={{ color: stat.color, fontWeight: '600', opacity: 0.8, fontFamily: '"Inter", sans-serif' }}>{stat.label}</Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </Fade>

        {/* Monthly Calendar & Activity Feed */}
        <Grid container spacing={3}>
          {/* Calendar View */}
          <Grid item xs={12} lg={7}>
            <Card elevation={0} sx={{ borderRadius: '24px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <Box sx={{ p: 4, borderBottom: '1px solid #f3f4f6' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h5" fontWeight="800" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif', mb: 0.5 }}>
                      Monthly Calendar
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                      {format(new Date(), 'MMMM yyyy')}
                    </Typography>
                  </Box>
                  <Chip label={`${stats.thisMonthPresent} Present Days`} sx={{ background: '#dcfce7', color: '#16a34a', fontWeight: '700', fontFamily: '"Inter", sans-serif' }} />
                </Box>
              </Box>

              <Box sx={{ p: 4 }}>
                <Grid container spacing={1.5}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <Grid item xs={12/7} key={day}>
                      <Typography variant="caption" fontWeight="700" textAlign="center" display="block" sx={{ color: '#78716c', mb: 1, fontFamily: '"Inter", sans-serif' }}>{day}</Typography>
                    </Grid>
                  ))}
                  {monthlyCalendar.map((day, idx) => (
                    <Grid item xs={12/7} key={idx}>
                      <Paper elevation={0} sx={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', background: day.status === 'present' ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' : day.status === 'absent' ? 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)' : '#fafaf9', border: format(day.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? '2px solid #f97316' : '1px solid #e7e5e4', position: 'relative' }}>
                        <Typography variant="body2" fontWeight="600" sx={{ color: day.status === 'present' ? '#16a34a' : day.status === 'absent' ? '#dc2626' : '#78716c', fontFamily: '"Inter", sans-serif' }}>
                          {format(day.date, 'd')}
                        </Typography>
                        {day.status && (
                          <Box sx={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: day.status === 'present' ? '#16a34a' : '#dc2626' }} />
                        )}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Card>
          </Grid>

          {/* Activity Timeline */}
          <Grid item xs={12} lg={5}>
            <Stack spacing={3}>
              {/* Recent Activity Card */}
              <Card elevation={0} sx={{ borderRadius: '24px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 4, borderBottom: '1px solid #f3f4f6' }}>
                  <Typography variant="h6" fontWeight="800" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif' }}>
                    Recent Activity
                  </Typography>
                </Box>
                <Box sx={{ p: 4, maxHeight: 400, overflow: 'auto' }}>
                  <Stack spacing={3}>
                    {attendance.slice(0, 8).map((record, idx) => (
                      <Box key={idx} sx={{ display: 'flex', gap: 2, position: 'relative' }}>
                        {idx !== attendance.slice(0, 8).length - 1 && (
                          <Box sx={{ position: 'absolute', left: 15, top: 36, bottom: -12, width: 2, background: '#f3f4f6' }} />
                        )}
                        <Avatar sx={{ width: 32, height: 32, background: record.status === 'present' ? '#dcfce7' : '#fecaca', color: record.status === 'present' ? '#16a34a' : '#dc2626', fontSize: '0.85rem' }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: record.status === 'present' ? '#16a34a' : '#dc2626' }} />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="body2" fontWeight="700" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif' }}>
                              {format(parseISO(record.date), 'EEEE')}
                            </Typography>
                            <Chip label={record.status} size="small" sx={{ background: record.status === 'present' ? '#dcfce7' : '#fecaca', color: record.status === 'present' ? '#16a34a' : '#dc2626', fontWeight: '600', fontSize: '0.7rem', height: '20px', textTransform: 'capitalize' }} />
                          </Box>
                          <Typography variant="caption" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif', display: 'block' }}>
                            {format(parseISO(record.date), 'MMM dd, yyyy')} • {record.time_in || 'No time'}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
                <Box sx={{ p: 3, borderTop: '1px solid #f3f4f6' }}>
                  <Button fullWidth variant="text" endIcon={<ArrowForward />} sx={{ color: '#f97316', fontWeight: '700', textTransform: 'none', fontFamily: '"Inter", sans-serif' }}>
                    View Full History
                  </Button>
                </Box>
              </Card>

              {/* Notifications */}
              <Card elevation={0} sx={{ borderRadius: '20px', background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '1px solid #fed7aa' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="800" sx={{ color: '#ea580c', fontFamily: '"Inter", sans-serif', mb: 2 }}>
                    Quick Tip
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#9a3412', fontFamily: '"Inter", sans-serif', lineHeight: 1.6 }}>
                    Maintain a streak of 7 days to unlock achievement badges! You're currently at {stats.streak} {stats.streak === 1 ? 'day' : 'days'}.
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default EmployeeDashboard;
