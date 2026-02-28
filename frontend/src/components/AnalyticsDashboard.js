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
  People,
  Assessment,
  Warning,
  Download,
  CheckCircle,
  Analytics,
  Speed,
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
import { format, subDays } from 'date-fns';
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
        type: 'warning',
        title: 'Attendance Declining',
        description: `Attendance has decreased by ${Math.abs(trend)}% this week. Consider investigating causes.`,
        icon: <Warning />,
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
        icon: <Warning />,
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
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {format(lastUpdated, 'HH:mm:ss')}
          </Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Timeframe</InputLabel>
            <Select
              value={timeframe}
              label="Timeframe"
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <MenuItem value="day">Today</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="quarter">Quarter</MenuItem>
            </Select>
          </FormControl>
          
          <Tooltip title="Refresh Data">
            <span>
              <IconButton onClick={fetchAnalytics} disabled={loading}>
                <Refresh />
              </IconButton>
            </span>
          </Tooltip>
          
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => exportData('pdf')}
            sx={{ mr: 1 }}
          >
            PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => exportData('excel')}
            sx={{ mr: 1 }}
          >
            Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => exportData('csv')}
            sx={{ mr: 1 }}
          >
            CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => exportData('json')}
            color="success"
          >
            JSON
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Live Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Currently Present
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" sx={{ color: '#1f2937' }}>
                    {analytics.liveStats?.currentlyPresent || 0}/{analytics.liveStats?.totalEmployees || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Math.round(((analytics.liveStats?.currentlyPresent || 0) / (analytics.liveStats?.totalEmployees || 1)) * 100)}% attendance rate
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <People />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    On Time Today
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {analytics.liveStats?.onTimeToday || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg arrival: {analytics.liveStats?.averageArrival || 'N/A'}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Productivity Score
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {analytics.liveStats?.productivityScore || 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {analytics.productivity?.trend || '+0%'} from last week
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <Speed />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Anomalies Detected
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {analytics.anomalies?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Requires attention
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <Warning />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Business Insights Section */}
      {getBusinessInsights().length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              Business Insights
              <Chip label="AI Powered" size="small" color="info" />
            </Typography>
          </Grid>
          {getBusinessInsights().map((insight, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Alert 
                severity={insight.color} 
                icon={insight.icon}
                sx={{ height: '100%' }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  {insight.title}
                </Typography>
                <Typography variant="body2">
                  {insight.description}
                </Typography>
              </Alert>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Real-time Department Status */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Department Status - Live
                <Chip label="Real-time" size="small" color="success" />
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {analytics.liveStats?.departmentStats && Object.entries(analytics.liveStats.departmentStats).map(([dept, stats]) => (
                  <Grid item xs={12} sm={6} md={4} lg={2} key={dept}>
                    <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ textTransform: 'capitalize', mb: 1 }}>
                        {dept}
                      </Typography>
                      <Typography variant="h6" color="primary.main">
                        {stats.present}/{stats.total}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {Math.round((stats.present / stats.total) * 100)}% present
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={stats.productivity} 
                        sx={{ 
                          mt: 1, 
                          height: 6, 
                          borderRadius: 3,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getProductivityColor(stats.productivity)
                          }
                        }} 
                      />
                      <Typography variant="caption" color="text.secondary">
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
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Comprehensive Attendance Analysis
              </Typography>
              <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip 
                  label={`Trend: ${calculateAttendanceTrend() > 0 ? '+' : ''}${calculateAttendanceTrend()}%`}
                  color={calculateAttendanceTrend() > 0 ? 'success' : calculateAttendanceTrend() < 0 ? 'error' : 'default'}
                  size="small"
                />
                <Chip 
                  label={`Avg Working Hours: ${analytics.liveStats?.avgWorkingHoursToday || 'N/A'}`}
                  color="info"
                  size="small"
                />
                <Chip 
                  label={`Remote Workers: ${analytics.liveStats?.workingRemotely || 0}`}
                  color="secondary"
                  size="small"
                />
              </Box>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={analytics.dailyTrends || []}>
                  <defs>
                    <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3f51b5" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3f51b5" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorProductivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4caf50" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4caf50" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff9800" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ff9800" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '8px'
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                    formatter={(value, name) => [`${value}%`, name]}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="#3f51b5" 
                    fillOpacity={1} 
                    fill="url(#colorAttendance)" 
                    name="Overall Attendance %" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="onTime" 
                    stroke="#ff9800" 
                    fillOpacity={1} 
                    fill="url(#colorOnTime)" 
                    name="On-Time Arrivals %" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="productivity" 
                    stroke="#4caf50" 
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
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
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
                      border: '1px solid #ccc',
                      borderRadius: '8px'
                    }}
                    formatter={(value, name) => [
                      name.includes('Arrivals') || name.includes('Departures') ? value : `${value}%`, 
                      name
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="attendance" fill="#3f51b5" name="Attendance %" />
                  <Bar dataKey="productivity" fill="#4caf50" name="Productivity %" />
                  <Bar dataKey="lateArrivals" fill="#ff9800" name="Late Arrivals" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Enhanced Department Productivity with Business KPIs */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Department Performance Analytics
              </Typography>
              <Box sx={{ mt: 2 }}>
                {analytics.productivity?.departments?.length > 0 ? (
                  analytics.productivity.departments.map((dept, index) => (
                    <Box key={dept.name} sx={{ mb: 3 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body2" fontWeight="bold">{dept.name}</Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight="bold">
                            {dept.score}%
                          </Typography>
                          <Chip 
                            label={dept.trend} 
                            size="small" 
                            color={dept.trend.startsWith('+') ? 'success' : 'error'}
                          />
                        </Box>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={dept.score} 
                        sx={{ 
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getProductivityColor(dept.score),
                            borderRadius: 5,
                          }
                        }} 
                      />
                      <Box display="flex" justifyContent="space-between" sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {dept.employeeCount || 'N/A'} employees
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dept.avgWorkingHours?.toFixed(1) || 'N/A'}h avg
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dept.projectsCompleted || 'N/A'} projects
                        </Typography>
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No department data available
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Enhanced Anomaly Detection with Action Items */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Intelligent Anomaly Detection
                <Chip label="ML Powered" size="small" color="secondary" />
              </Typography>
              <Box sx={{ mt: 2, maxHeight: 400, overflowY: 'auto' }}>
                {analytics.anomalies?.length > 0 ? (
                  analytics.anomalies.map((anomaly, index) => (
                    <Alert 
                      key={index} 
                      severity={getSeverityColor(anomaly.severity)} 
                      sx={{ mb: 2 }}
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
                        <Typography variant="subtitle2" fontWeight="bold">
                          {anomaly.user} - {anomaly.date}
                          {anomaly.affectedCount && (
                            <Chip 
                              label={`${anomaly.affectedCount} affected`} 
                              size="small" 
                              sx={{ ml: 1 }} 
                            />
                          )}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {anomaly.description}
                        </Typography>
                        {anomaly.suggestedAction && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Suggested: {anomaly.suggestedAction}
                          </Typography>
                        )}
                      </Box>
                    </Alert>
                  ))
                ) : (
                  <Alert severity="success">
                    <Typography variant="body2">
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
                              label="🥇 Top Performer" 
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
  );
};

export default AnalyticsDashboard; 