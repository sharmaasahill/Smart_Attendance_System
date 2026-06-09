import React, { useState, useEffect } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart,
} from 'recharts';
import { format } from 'date-fns';
import { analyticsAPI } from '../services/api';

const EMPTY = {
  liveStats: {},
  departments: [],
  dailyTrends: [],
  weeklyStats: [],
  userStats: [],
  anomalies: [],
};

const rateColor = (score) => {
  if (score >= 90) return '#16a34a';
  if (score >= 75) return '#f59e0b';
  if (score >= 50) return '#f97316';
  return '#dc2626';
};

const AnalyticsDashboard = () => {
  const [timeframe, setTimeframe] = useState('week');
  const [analytics, setAnalytics] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : timeframe === 'quarter' ? 90 : 1;
      const [dashboardResponse, anomaliesResponse] = await Promise.all([
        analyticsAPI.getDashboard(timeframe),
        analyticsAPI.getAnomalies(days),
      ]);
      setAnalytics({
        ...EMPTY,
        ...dashboardResponse.data,
        anomalies: anomaliesResponse.data.anomalies || [],
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Analytics fetch error:', error);
      setAnalytics(EMPTY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  const exportData = async (fileFormat) => {
    try {
      if (fileFormat === 'json') {
        const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `analytics-${timeframe}.json`);
        return;
      }
      const response = await analyticsAPI.exportData('csv', timeframe);
      downloadBlob(new Blob([response.data], { type: 'text/csv' }), `analytics-${timeframe}.csv`);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const { liveStats, departments, dailyTrends, weeklyStats, userStats, anomalies } = analytics;

  const statCards = [
    { label: 'Currently Present', value: `${liveStats.currentlyPresent || 0}/${liveStats.totalEmployees || 0}`, sub: `${liveStats.attendanceRate || 0}% attendance rate`, color: '#212E46' },
    { label: 'On Time Today', value: liveStats.onTimeToday || 0, sub: `Avg arrival: ${liveStats.averageArrival || 'N/A'}`, color: '#16a34a' },
    { label: 'Late Today', value: liveStats.lateToday || 0, sub: `Peak arrival: ${liveStats.peakHour || 'N/A'}`, color: '#f97316' },
    { label: 'Anomalies', value: anomalies.length || 0, sub: 'Low-attendance users', color: '#dc2626' },
  ];

  return (
    <Box sx={{ background: 'linear-gradient(135deg, #f5f3f0 0%, #fafaf9 50%, #ffffff 100%)', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight="700" gutterBottom sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif' }}>
              Analytics Dashboard
            </Typography>
            <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
              Last updated: {format(lastUpdated, 'HH:mm:ss')}
            </Typography>
          </Box>

          <Box display="flex" gap={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel sx={{ '&.Mui-focused': { color: '#f97316' } }}>Timeframe</InputLabel>
              <Select
                value={timeframe}
                label="Timeframe"
                onChange={(e) => setTimeframe(e.target.value)}
                sx={{ borderRadius: '12px', fontFamily: '"Inter", sans-serif', '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#f97316' } }}
              >
                <MenuItem value="day">Today</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="quarter">Quarter</MenuItem>
              </Select>
            </FormControl>

            <Tooltip title="Refresh Data">
              <span>
                <IconButton onClick={fetchAnalytics} disabled={loading} sx={{ color: '#212E46' }}>
                  <Refresh />
                </IconButton>
              </span>
            </Tooltip>

            <Button
              variant="outlined"
              onClick={() => exportData('json')}
              sx={{ borderRadius: '12px', border: '2px solid #e7e5e4', color: '#78716c', textTransform: 'none', fontWeight: '700', fontFamily: '"Inter", sans-serif', '&:hover': { border: '2px solid #d6d3d1', background: '#fafaf9' } }}
            >
              JSON
            </Button>
            <Button
              variant="contained"
              onClick={() => exportData('csv')}
              sx={{ borderRadius: '12px', background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', textTransform: 'none', fontWeight: '700', fontFamily: '"Inter", sans-serif', boxShadow: 'none', '&:hover': { background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', boxShadow: 'none' } }}
            >
              Export CSV
            </Button>
          </Box>
        </Box>

        {loading && <LinearProgress sx={{ mb: 3, height: 6, borderRadius: 3, background: '#e7e5e4', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)', borderRadius: 3 } }} />}

        {/* Live Stat Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {statCards.map((card) => (
            <Grid item xs={12} sm={6} md={3} key={card.label}>
              <Card elevation={0} sx={{ borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="caption" sx={{ color: '#78716c', fontWeight: '600', fontFamily: '"Inter", sans-serif' }}>
                    {card.label}
                  </Typography>
                  <Typography variant="h4" fontWeight="700" sx={{ color: card.color, fontFamily: '"Inter", sans-serif' }}>
                    {card.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                    {card.sub}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          {/* Attendance Trend */}
          <Grid item xs={12} lg={8}>
            <Card elevation={0} sx={{ borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ fontFamily: '"Inter", sans-serif', fontWeight: '700', color: '#212E46' }}>
                  Attendance Trend
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={dailyTrends}>
                    <defs>
                      <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#212E46" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#212E46" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e7e5e4', borderRadius: '12px', fontFamily: '"Inter", sans-serif' }}
                      formatter={(value, name) => [`${value}%`, name]}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="attendance" stroke="#212E46" fillOpacity={1} fill="url(#colorAttendance)" name="Attendance %" />
                    <Area type="monotone" dataKey="onTime" stroke="#f97316" fillOpacity={1} fill="url(#colorOnTime)" name="On-Time %" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Weekly Pattern */}
          <Grid item xs={12} lg={4}>
            <Card elevation={0} sx={{ borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ fontFamily: '"Inter", sans-serif', fontWeight: '700', color: '#212E46' }}>
                  Weekly Pattern
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={weeklyStats}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e7e5e4', borderRadius: '12px', fontFamily: '"Inter", sans-serif' }} />
                    <Legend />
                    <Bar dataKey="attendance" fill="#212E46" name="Attendance %" />
                    <Bar dataKey="lateArrivals" fill="#f97316" name="Late Arrivals" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Department Attendance (Today) */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ fontFamily: '"Inter", sans-serif', fontWeight: '700', color: '#212E46' }}>
                  Department Attendance (Today)
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {departments.length > 0 ? (
                    departments.map((dept) => (
                      <Box key={dept.name} sx={{ mb: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="body2" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif', color: '#212E46' }}>{dept.name}</Typography>
                          <Typography variant="body2" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif', color: '#212E46' }}>
                            {dept.present}/{dept.total} ({dept.attendanceRate}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={dept.attendanceRate}
                          sx={{ height: 10, borderRadius: 5, backgroundColor: '#e7e5e4', '& .MuiLinearProgress-bar': { backgroundColor: rateColor(dept.attendanceRate), borderRadius: 5 } }}
                        />
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ color: '#78716c', textAlign: 'center', py: 2, fontFamily: '"Inter", sans-serif' }}>
                      No department data available
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Anomalies */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ fontFamily: '"Inter", sans-serif', fontWeight: '700', color: '#212E46' }}>
                  Attendance Anomalies
                </Typography>
                <Box sx={{ mt: 2, maxHeight: 400, overflowY: 'auto' }}>
                  {anomalies.length > 0 ? (
                    anomalies.map((anomaly, index) => (
                      <Alert
                        key={index}
                        severity="error"
                        sx={{ mb: 2, borderRadius: '12px', border: '1px solid #fca5a5', background: '#fecaca', '& .MuiAlert-icon': { color: '#dc2626' }, fontFamily: '"Inter", sans-serif' }}
                      >
                        <Typography variant="subtitle2" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif' }}>
                          {anomaly.user} - {anomaly.date}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, fontFamily: '"Inter", sans-serif' }}>
                          {anomaly.description}
                        </Typography>
                      </Alert>
                    ))
                  ) : (
                    <Alert severity="success" sx={{ borderRadius: '12px', border: '1px solid #86efac', background: '#dcfce7', '& .MuiAlert-icon': { color: '#16a34a' }, fontFamily: '"Inter", sans-serif' }}>
                      <Typography variant="body2" sx={{ fontFamily: '"Inter", sans-serif' }}>
                        No anomalies detected for this period.
                      </Typography>
                    </Alert>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Attendance */}
          <Grid item xs={12}>
            <Card elevation={0} sx={{ borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ fontFamily: '"Inter", sans-serif', fontWeight: '700', color: '#212E46' }}>
                  Top Attendance (Period)
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {userStats.length > 0 ? (
                    userStats.map((user) => (
                      <Grid item xs={12} sm={6} md={4} lg={2.4} key={user.name}>
                        <Paper elevation={0} sx={{ p: 3, textAlign: 'center', background: '#fafaf9', border: '1px solid #e7e5e4', borderRadius: '16px' }}>
                          <Avatar sx={{ mx: 'auto', mb: 1, bgcolor: '#212E46', width: 48, height: 48, fontFamily: '"Inter", sans-serif' }}>
                            {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </Avatar>
                          <Typography variant="subtitle2" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif', color: '#212E46' }}>
                            {user.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#78716c', display: 'block', fontFamily: '"Inter", sans-serif' }}>
                            {user.department}
                          </Typography>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2" sx={{ fontFamily: '"Inter", sans-serif', color: '#212E46' }}>
                            Attendance: <strong style={{ color: rateColor(user.attendance) }}>{user.attendance}%</strong>
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: '"Inter", sans-serif', color: '#16a34a' }}>
                            Streak: <strong>{user.streak} days</strong>
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#78716c', display: 'block', fontFamily: '"Inter", sans-serif' }}>
                            {user.presentDays} present days
                          </Typography>
                        </Paper>
                      </Grid>
                    ))
                  ) : (
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ color: '#78716c', textAlign: 'center', py: 2, fontFamily: '"Inter", sans-serif' }}>
                        No attendance data available
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AnalyticsDashboard;
