import React, { useState, useEffect } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import {
  TrendingUp,
  Assessment,
  Analytics,
  Refresh,
} from '@mui/icons-material';
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

const AnalyticsDashboard = () => {
  const [timeframe, setTimeframe] = useState('week');
  const [analytics, setAnalytics] = useState({
    dailyTrends: [],
    weeklyStats: [],
    monthlyPatterns: [],
    userStats: [],
    anomalies: [],
    productivity: {},
    liveStats: {}
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [reportData, setReportData] = useState(null);

  // Fetch analytics data from backend
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Get real analytics data from backend
      const [dashboardResponse, anomaliesResponse, reportResponse] = await Promise.all([
        analyticsAPI.getDashboard(timeframe),
        analyticsAPI.getAnomalies(timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 1),
        analyticsAPI.getAutomatedReport(timeframe === 'week' ? 'weekly' : timeframe === 'month' ? 'monthly' : 'daily')
      ]);

      // Process the real data
      const realAnalytics = {
        ...dashboardResponse.data,
        anomalies: anomaliesResponse.data.anomalies || [],
      };
      
      setAnalytics(realAnalytics);
      setReportData(reportResponse.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Analytics fetch error:', error);
      // Show empty state if API fails
      setAnalytics({
        dailyTrends: [],
        weeklyStats: [],
        monthlyPatterns: [],
        userStats: [],
        anomalies: [],
        productivity: { overall: 0, trend: '0%', departments: [] },
        liveStats: {}
      });
    } finally {
      setLoading(false);
    }
  };



  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]); // Re-fetch when timeframe changes

  const exportData = async (format) => {
    try {
      let response;
      switch (format) {
        case 'pdf':
          // Generate PDF report
          const { exportToPDF } = await import('./ExportUtils');
           await exportToPDF({...analytics, reportData, timeframe});
          break;
        case 'excel':
          // Use backend export endpoint
          response = await analyticsAPI.exportData('excel', timeframe);
           downloadFile(response.data, `analytics-${timeframe}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          break;
        case 'csv':
          response = await analyticsAPI.exportData('csv', timeframe);
           downloadFile(response.data, `analytics-${timeframe}.csv`, 'text/csv');
          break;
        case 'json':
          const jsonData = JSON.stringify(analytics, null, 2);
           downloadFile(jsonData, `analytics-${timeframe}.json`, 'application/json');
          break;
         default:
           // Unsupported format
      }
    } catch (error) {
       console.error('Export error:', error);
       // Export error - user will see file download failure
    }
  };

  // Helper function to download files
  const downloadFile = (data, filename, contentType) => {
    const blob = new Blob([data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Helper functions for business insights
  const calculateAttendanceTrend = () => {
    if (!analytics.dailyTrends || analytics.dailyTrends.length < 7) return 0;
    const recentWeek = analytics.dailyTrends.slice(-7);
    const previousWeek = analytics.dailyTrends.slice(-14, -7);
    
    const recentAvg = recentWeek.reduce((sum, day) => sum + day.attendance, 0) / recentWeek.length;
    const previousAvg = previousWeek.reduce((sum, day) => sum + day.attendance, 0) / previousWeek.length;
    
    return ((recentAvg - previousAvg) / previousAvg * 100).toFixed(1);
  };

  const getBusinessInsights = () => {
    const insights = [];
    
    // Attendance insights
    const trend = calculateAttendanceTrend();
    if (trend > 5) {
      insights.push({
        type: 'positive',
        title: 'Attendance Improving',
        description: `Attendance has increased by ${trend}% this week compared to last week.`,
        icon: <TrendingUp />,
        color: 'success'
      });
    } else if (trend < -5) {
      insights.push({
        type: 'alert',
        title: 'Attendance Declining',
        description: `Attendance has decreased by ${Math.abs(trend)}% this week. Consider investigating causes.`,
        icon: <Assessment />,
        color: 'warning'
      });
    }

    // Productivity insights
    if (analytics.productivity?.overall > 90) {
      insights.push({
        type: 'positive',
        title: 'High Productivity',
        description: `Overall productivity at ${analytics.productivity.overall}% - excellent performance!`,
        icon: <Assessment />,
        color: 'success'
      });
    }

    // Anomaly insights
    const highSeverityAnomalies = analytics.anomalies?.filter(a => a.severity === 'high') || [];
    if (highSeverityAnomalies.length > 0) {
      insights.push({
        type: 'urgent',
        title: 'Urgent Attention Required',
        description: `${highSeverityAnomalies.length} high-priority anomalies detected requiring immediate action.`,
        icon: <Assessment />,
        color: 'error'
      });
    }

    return insights;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getProductivityColor = (score) => {
    if (score >= 90) return '#4caf50';
    if (score >= 80) return '#ff9800';
    if (score >= 70) return '#f44336';
    return '#9e9e9e';
  };

  return (
    <Box sx={{ background: 'linear-gradient(135deg, #f5f3f0 0%, #fafaf9 50%, #ffffff 100%)', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
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
            onClick={() => exportData('pdf')}
            sx={{ mr: 1, borderRadius: '12px', border: '2px solid #e7e5e4', color: '#78716c', textTransform: 'none', fontWeight: '700', fontFamily: '"Inter", sans-serif', '&:hover': { border: '2px solid #d6d3d1', background: '#fafaf9' } }}
          >
            PDF
          </Button>
          <Button
            variant="outlined"
            onClick={() => exportData('excel')}
            sx={{ mr: 1, borderRadius: '12px', border: '2px solid #e7e5e4', color: '#78716c', textTransform: 'none', fontWeight: '700', fontFamily: '"Inter", sans-serif', '&:hover': { border: '2px solid #d6d3d1', background: '#fafaf9' } }}
          >
            Excel
          </Button>
          <Button
            variant="contained"
            onClick={() => exportData('csv')}
            sx={{ borderRadius: '12px', background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', textTransform: 'none', fontWeight: '700', fontFamily: '"Inter", sans-serif', boxShadow: 'none', '&:hover': { background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', boxShadow: 'none' } }}
          >
            CSV
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 3, height: 6, borderRadius: 3, background: '#e7e5e4', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)', borderRadius: 3 } }} />}

      {/* Live Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" sx={{ color: '#78716c', fontWeight: '600', fontFamily: '"Inter", sans-serif' }}>
                    Currently Present
                  </Typography>
                  <Typography variant="h4" fontWeight="700" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif' }}>
                    {analytics.liveStats?.currentlyPresent || 0}/{analytics.liveStats?.totalEmployees || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                    {Math.round(((analytics.liveStats?.currentlyPresent || 0) / (analytics.liveStats?.totalEmployees || 1)) * 100)}% attendance rate
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" sx={{ color: '#78716c', fontWeight: '600', fontFamily: '"Inter", sans-serif' }}>
                    On Time Today
                  </Typography>
                  <Typography variant="h4" fontWeight="700" sx={{ color: '#16a34a', fontFamily: '"Inter", sans-serif' }}>
                    {analytics.liveStats?.onTimeToday || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                    Avg arrival: {analytics.liveStats?.averageArrival || 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" sx={{ color: '#78716c', fontWeight: '600', fontFamily: '"Inter", sans-serif' }}>
                    Productivity Score
                  </Typography>
                  <Typography variant="h4" fontWeight="700" sx={{ color: '#f97316', fontFamily: '"Inter", sans-serif' }}>
                    {analytics.liveStats?.productivityScore || 0}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                    {analytics.productivity?.trend || '+0%'} from last week
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" sx={{ color: '#78716c', fontWeight: '600', fontFamily: '"Inter", sans-serif' }}>
                    Anomalies Detected
                  </Typography>
                  <Typography variant="h4" fontWeight="700" sx={{ color: '#dc2626', fontFamily: '"Inter", sans-serif' }}>
                    {analytics.anomalies?.length || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                    Requires attention
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Business Insights Section */}
      {getBusinessInsights().length > 0 && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontFamily: '"Inter", sans-serif', fontWeight: '700', color: '#212E46' }}>
              Business Insights
              <Chip label="AI Powered" size="small" sx={{ background: '#dbeafe', color: '#212E46', fontWeight: '700', fontFamily: '"Inter", sans-serif' }} />
            </Typography>
          </Grid>
          {getBusinessInsights().map((insight, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Alert 
                severity={insight.color} 
                icon={insight.icon}
                sx={{ height: '100%', borderRadius: '16px', border: insight.color === 'success' ? '1px solid #86efac' : insight.color === 'warning' ? '1px solid #fed7aa' : '1px solid #fca5a5', background: insight.color === 'success' ? '#dcfce7' : insight.color === 'warning' ? '#ffedd5' : '#fecaca', '& .MuiAlert-icon': { color: insight.color === 'success' ? '#16a34a' : insight.color === 'warning' ? '#f97316' : '#dc2626' }, fontFamily: '"Inter", sans-serif' }}
              >
                <Typography variant="subtitle2" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif' }}>
                  {insight.title}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: '"Inter", sans-serif' }}>
                  {insight.description}
                </Typography>
              </Alert>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Real-time Department Status */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card elevation={0} sx={{ borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontFamily: '"Inter", sans-serif', fontWeight: '700', color: '#212E46' }}>
                Department Status - Live
                <Chip label="Real-time" size="small" sx={{ background: '#dcfce7', color: '#16a34a', fontWeight: '700', fontFamily: '"Inter", sans-serif' }} />
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {analytics.liveStats?.departmentStats && Object.entries(analytics.liveStats.departmentStats).map(([dept, stats]) => (
                  <Grid item xs={12} sm={6} md={4} lg={2.4} key={dept}>
                    <Paper elevation={0} sx={{ p: 3, textAlign: 'center', background: '#fafaf9', border: '1px solid #e7e5e4', borderRadius: '16px' }}>
                      <Typography variant="subtitle2" fontWeight="700" sx={{ textTransform: 'capitalize', mb: 1, fontFamily: '"Inter", sans-serif', color: '#212E46' }}>
                        {dept}
                      </Typography>
                      <Typography variant="h5" sx={{ color: '#f97316', fontWeight: '700', fontFamily: '"Inter", sans-serif' }}>
                        {stats.present}/{stats.total}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                        {Math.round((stats.present / stats.total) * 100)}% present
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={stats.productivity} 
                        sx={{ 
                          mt: 1.5, 
                          height: 6, 
                          borderRadius: 3,
                          backgroundColor: '#e7e5e4',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getProductivityColor(stats.productivity),
                            borderRadius: 3,
                          }
                        }} 
                      />
                      <Typography variant="caption" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                        {stats.productivity}% productivity
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Enhanced Attendance Trends with Multiple Metrics */}
        <Grid item xs={12} lg={8}>
          <Card elevation={0} sx={{ borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontFamily: '"Inter", sans-serif', fontWeight: '700', color: '#212E46' }}>
                Comprehensive Attendance Analysis
              </Typography>
              <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip 
                  label={`Trend: ${calculateAttendanceTrend() > 0 ? '+' : ''}${calculateAttendanceTrend()}%`}
                  sx={{ background: calculateAttendanceTrend() > 0 ? '#dcfce7' : calculateAttendanceTrend() < 0 ? '#fecaca' : '#fafaf9', color: calculateAttendanceTrend() > 0 ? '#16a34a' : calculateAttendanceTrend() < 0 ? '#dc2626' : '#78716c', fontWeight: '700', fontFamily: '"Inter", sans-serif' }}
                  size="small"
                />
                <Chip 
                  label={`Avg Working Hours: ${analytics.liveStats?.avgWorkingHoursToday || 'N/A'}`}
                  sx={{ background: '#dbeafe', color: '#212E46', fontWeight: '700', fontFamily: '"Inter", sans-serif' }}
                  size="small"
                />
                <Chip 
                  label={`Remote Workers: ${analytics.liveStats?.workingRemotely || 0}`}
                  sx={{ background: '#ffedd5', color: '#f97316', fontWeight: '700', fontFamily: '"Inter", sans-serif' }}
                  size="small"
                />
              </Box>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={analytics.dailyTrends || []}>
                  <defs>
                    <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#212E46" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#212E46" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorProductivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e7e5e4',
                      borderRadius: '12px',
                      fontFamily: '"Inter", sans-serif',
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                    formatter={(value, name) => [`${value}%`, name]}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="#212E46" 
                    fillOpacity={1} 
                    fill="url(#colorAttendance)" 
                    name="Overall Attendance %" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="onTime" 
                    stroke="#f97316" 
                    fillOpacity={1} 
                    fill="url(#colorOnTime)" 
                    name="On-Time Arrivals %" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="productivity" 
                    stroke="#16a34a" 
                    fillOpacity={1} 
                    fill="url(#colorProductivity)" 
                    name="Productivity Score %" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Enhanced Weekly Pattern with Detailed Metrics */}
        <Grid item xs={12} lg={4}>
          <Card elevation={0} sx={{ borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontFamily: '"Inter", sans-serif', fontWeight: '700', color: '#212E46' }}>
                Weekly Performance Patterns
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analytics.weeklyStats || []}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e7e5e4',
                      borderRadius: '12px',
                      fontFamily: '"Inter", sans-serif',
                    }}
                    formatter={(value, name) => [
                      name.includes('Arrivals') || name.includes('Departures') ? value : `${value}%`, 
                      name
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="attendance" fill="#212E46" name="Attendance %" />
                  <Bar dataKey="productivity" fill="#16a34a" name="Productivity %" />
                  <Bar dataKey="lateArrivals" fill="#f97316" name="Late Arrivals" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Enhanced Department Productivity with Business KPIs */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontFamily: '"Inter", sans-serif', fontWeight: '700', color: '#212E46' }}>
                Department Performance Analytics
              </Typography>
              <Box sx={{ mt: 2 }}>
                {analytics.productivity?.departments?.length > 0 ? (
                  analytics.productivity.departments.map((dept, index) => (
                    <Box key={dept.name} sx={{ mb: 3 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body2" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif', color: '#212E46' }}>{dept.name}</Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif', color: '#212E46' }}>
                            {dept.score}%
                          </Typography>
                          <Chip 
                            label={dept.trend} 
                            size="small" 
                            sx={{ background: dept.trend.startsWith('+') ? '#dcfce7' : '#fecaca', color: dept.trend.startsWith('+') ? '#16a34a' : '#dc2626', fontWeight: '700', fontFamily: '"Inter", sans-serif' }}
                          />
                        </Box>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={dept.score} 
                        sx={{ 
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: '#e7e5e4',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getProductivityColor(dept.score),
                            borderRadius: 5,
                          }
                        }} 
                      />
                      <Box display="flex" justifyContent="space-between" sx={{ mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                          {dept.employeeCount || 'N/A'} employees
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                          {dept.avgWorkingHours?.toFixed(1) || 'N/A'}h avg
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
                          {dept.projectsCompleted || 'N/A'} projects
                        </Typography>
                      </Box>
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

        {/* Enhanced Anomaly Detection with Action Items */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontFamily: '"Inter", sans-serif', fontWeight: '700', color: '#212E46' }}>
                Intelligent Anomaly Detection
                <Chip label="ML Powered" size="small" sx={{ background: '#ffedd5', color: '#f97316', fontWeight: '700', fontFamily: '"Inter", sans-serif' }} />
              </Typography>
              <Box sx={{ mt: 2, maxHeight: 400, overflowY: 'auto' }}>
                {analytics.anomalies?.length > 0 ? (
                  analytics.anomalies.map((anomaly, index) => (
                    <Alert 
                      key={index} 
                      severity={getSeverityColor(anomaly.severity)} 
                      sx={{ mb: 2, borderRadius: '12px', border: getSeverityColor(anomaly.severity) === 'error' ? '1px solid #fca5a5' : getSeverityColor(anomaly.severity) === 'warning' ? '1px solid #fed7aa' : '1px solid #bfdbfe', background: getSeverityColor(anomaly.severity) === 'error' ? '#fecaca' : getSeverityColor(anomaly.severity) === 'warning' ? '#ffedd5' : '#dbeafe', '& .MuiAlert-icon': { color: getSeverityColor(anomaly.severity) === 'error' ? '#dc2626' : getSeverityColor(anomaly.severity) === 'warning' ? '#f97316' : '#212E46' }, fontFamily: '"Inter", sans-serif' }}
                      action={
                        anomaly.suggestedAction && (
                          <Tooltip title={anomaly.suggestedAction}>
                            <span>
                              <IconButton size="small" color="inherit">
                                <Analytics />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )
                      }
                    >
                      <Box>
                        <Typography variant="subtitle2" fontWeight="700" sx={{ fontFamily: '"Inter", sans-serif' }}>
                          {anomaly.user} - {anomaly.date}
                          {anomaly.affectedCount && (
                            <Chip 
                              label={`${anomaly.affectedCount} affected`} 
                              size="small" 
                              sx={{ ml: 1, background: 'rgba(255,255,255,0.5)', fontFamily: '"Inter", sans-serif' }} 
                            />
                          )}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, fontFamily: '"Inter", sans-serif' }}>
                          {anomaly.description}
                        </Typography>
                        {anomaly.suggestedAction && (
                          <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.8, fontFamily: '"Inter", sans-serif' }}>
                            Suggested: {anomaly.suggestedAction}
                          </Typography>
                        )}
                      </Box>
                    </Alert>
                  ))
                ) : (
                  <Alert severity="success" sx={{ borderRadius: '12px', border: '1px solid #86efac', background: '#dcfce7', '& .MuiAlert-icon': { color: '#16a34a' }, fontFamily: '"Inter", sans-serif' }}>
                    <Typography variant="body2" sx={{ fontFamily: '"Inter", sans-serif' }}>
                      No anomalies detected - All systems running smoothly!
                    </Typography>
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Enhanced Top Performers with Detailed Metrics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Employee Performance Rankings
                <Chip label="Top 5" size="small" color="primary" />
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {analytics.userStats?.length > 0 ? (
                    analytics.userStats.map((user, index) => (
                      <Grid item xs={12} sm={6} md={4} lg={2.4} key={user.name}>
                        <Paper 
                          elevation={index === 0 ? 4 : 2} 
                          sx={{ 
                            p: 2, 
                            textAlign: 'center',
                            position: 'relative',
                            ...(index === 0 && {
                              border: '2px solid gold',
                              bgcolor: 'rgba(255, 215, 0, 0.05)'
                            })
                          }}
                        >
                          {index === 0 && (
                            <Chip 
                              label="Top Performer" 
                              size="small" 
                              color="warning"
                              sx={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)' }}
                            />
                          )}
                          <Avatar sx={{ 
                            mx: 'auto', 
                            mb: 1, 
                            bgcolor: index === 0 ? 'warning.main' : 'primary.main',
                            width: 48,
                            height: 48
                          }}>
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </Avatar>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {user.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {user.role || user.department}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            {user.department}
                          </Typography>
                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ textAlign: 'left' }}>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              Attendance: <strong style={{ color: user.attendance > 95 ? '#4caf50' : '#ff9800' }}>{user.attendance}%</strong>
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              Productivity: <strong style={{ color: user.productivity > 90 ? '#4caf50' : '#ff9800' }}>{user.productivity}%</strong>
                            </Typography>
                            <Typography variant="body2" color="success.main" sx={{ mb: 0.5 }}>
                              Streak: <strong>{user.streak} days</strong>
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Avg Arrival: {user.avgArrival || 'N/A'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Projects: {user.projects || 0} | OT: {user.overtimeHours || 0}h
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    ))
                  ) : (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        No user performance data available
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
    </Box>
  );
};

export default AnalyticsDashboard; 