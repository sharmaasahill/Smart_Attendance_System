import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Chip,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  People,
  Schedule,
  Assessment,
  Warning,
  Download,
  Today,
  CalendarToday,
  AccessTime,
  CheckCircle,
  Cancel,
  Analytics,
  Speed,
  Timeline,
  Refresh,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { attendanceAPI } from '../services/api';
import { toast } from 'react-toastify';

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

  // Color schemes for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  const GRADIENT_COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c'];

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Simulate comprehensive analytics data
      const mockData = generateMockAnalytics();
      setAnalytics(mockData);
      setLastUpdated(new Date());
      toast.success('📊 Analytics data updated successfully');
    } catch (error) {
      toast.error('❌ Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Generate comprehensive mock analytics data
  const generateMockAnalytics = () => {
    const today = new Date();
    const dates = Array.from({ length: 30 }, (_, i) => subDays(today, 29 - i));
    
    const dailyTrends = dates.map(date => ({
      date: format(date, 'MMM dd'),
      attendance: Math.floor(Math.random() * 20) + 80,
      onTime: Math.floor(Math.random() * 15) + 75,
      late: Math.floor(Math.random() * 10) + 5,
      absent: Math.floor(Math.random() * 5) + 2,
      productivity: Math.floor(Math.random() * 20) + 70,
    }));

    const weeklyStats = [
      { name: 'Mon', attendance: 95, productivity: 88, avgHours: 8.2 },
      { name: 'Tue', attendance: 92, productivity: 85, avgHours: 8.1 },
      { name: 'Wed', attendance: 89, productivity: 90, avgHours: 8.3 },
      { name: 'Thu', attendance: 94, productivity: 87, avgHours: 8.0 },
      { name: 'Fri', attendance: 88, productivity: 82, avgHours: 7.8 },
      { name: 'Sat', attendance: 76, productivity: 75, avgHours: 6.2 },
      { name: 'Sun', attendance: 45, productivity: 70, avgHours: 4.1 },
    ];

    const monthlyPatterns = [
      { month: 'Jan', attendance: 92, productivity: 85 },
      { month: 'Feb', attendance: 88, productivity: 82 },
      { month: 'Mar', attendance: 94, productivity: 89 },
      { month: 'Apr', attendance: 90, productivity: 86 },
      { month: 'May', attendance: 87, productivity: 84 },
      { month: 'Jun', attendance: 93, productivity: 91 },
    ];

    const userStats = [
      { name: 'John Doe', attendance: 98, productivity: 95, streak: 25, department: 'Engineering' },
      { name: 'Jane Smith', attendance: 94, productivity: 89, streak: 18, department: 'Marketing' },
      { name: 'Mike Johnson', attendance: 87, productivity: 82, streak: 7, department: 'Sales' },
      { name: 'Sarah Wilson', attendance: 96, productivity: 93, streak: 22, department: 'HR' },
      { name: 'Tom Brown', attendance: 91, productivity: 86, streak: 12, department: 'Finance' },
    ];

    const anomalies = [
      { 
        type: 'unusual_hours', 
        user: 'Mike Johnson', 
        description: 'Working unusually late hours (11 PM - 2 AM)', 
        severity: 'medium',
        date: format(subDays(today, 2), 'MMM dd')
      },
      { 
        type: 'attendance_drop', 
        user: 'Engineering Team', 
        description: '15% attendance drop in last 3 days', 
        severity: 'high',
        date: format(subDays(today, 1), 'MMM dd')
      },
      { 
        type: 'late_pattern', 
        user: 'Sarah Wilson', 
        description: 'Consistently late by 30+ minutes for 5 days', 
        severity: 'low',
        date: format(today, 'MMM dd')
      },
    ];

    const productivity = {
      overall: 87,
      trend: '+5%',
      departments: [
        { name: 'Engineering', score: 92, trend: '+8%' },
        { name: 'Marketing', score: 85, trend: '+3%' },
        { name: 'Sales', score: 89, trend: '+12%' },
        { name: 'HR', score: 91, trend: '+2%' },
        { name: 'Finance', score: 84, trend: '-1%' },
      ],
      factors: [
        { name: 'On-time Arrival', impact: 25, score: 89 },
        { name: 'Consistent Schedule', impact: 20, score: 84 },
        { name: 'Break Patterns', impact: 15, score: 91 },
        { name: 'Overtime Balance', impact: 40, score: 86 },
      ]
    };

    const liveStats = {
      currentlyPresent: 47,
      totalEmployees: 52,
      onTimeToday: 41,
      lateToday: 6,
      absentToday: 5,
      averageArrival: '8:47 AM',
      peakHour: '9:15 AM',
      productivityScore: 89
    };

    return {
      dailyTrends,
      weeklyStats,
      monthlyPatterns,
      userStats,
      anomalies,
      productivity,
      liveStats
    };
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const exportData = async (format) => {
    try {
      const { exportToPDF, exportToExcel, exportToCSV, exportAllFormats } = await import('./ExportUtils');
      
      switch (format) {
        case 'pdf':
          await exportToPDF(analytics);
          toast.success('📄 PDF report generated successfully!');
          break;
        case 'excel':
          exportToExcel(analytics);
          toast.success('📊 Excel report generated successfully!');
          break;
        case 'csv':
          exportToCSV(analytics, 'summary');
          toast.success('📋 CSV report generated successfully!');
          break;
        case 'all':
          await exportAllFormats(analytics);
          toast.success('📦 All formats exported successfully!');
          break;
        default:
          await exportToPDF(analytics);
      }
    } catch (error) {
      toast.error('❌ Export failed: ' + error.message);
    }
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
            📊 Analytics Dashboard
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
            <IconButton onClick={fetchAnalytics} disabled={loading}>
              <Refresh />
            </IconButton>
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
            onClick={() => exportData('all')}
            color="success"
          >
            All Formats
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

      <Grid container spacing={3}>
        {/* Attendance Trends */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📈 Attendance Trends (Last 30 Days)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.dailyTrends || []}>
                  <defs>
                    <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProductivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <RechartsTooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="#8884d8" 
                    fillOpacity={1} 
                    fill="url(#colorAttendance)" 
                    name="Attendance %" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="productivity" 
                    stroke="#82ca9d" 
                    fillOpacity={1} 
                    fill="url(#colorProductivity)" 
                    name="Productivity %" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Weekly Pattern */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📅 Weekly Patterns
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="90%" data={analytics.weeklyStats || []}>
                  <RadialBar dataKey="attendance" cornerRadius={10} fill="#8884d8" />
                  <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                  <RechartsTooltip />
                </RadialBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Department Productivity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🏢 Department Productivity
              </Typography>
              <Box sx={{ mt: 2 }}>
                {analytics.productivity?.departments?.length > 0 ? (
                  analytics.productivity.departments.map((dept, index) => (
                    <Box key={dept.name} sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{dept.name}</Typography>
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
                          mt: 0.5,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getProductivityColor(dept.score)
                          }
                        }} 
                      />
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

        {/* Anomaly Detection */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔍 Anomaly Detection
              </Typography>
              <Box sx={{ mt: 2 }}>
                {analytics.anomalies?.length > 0 ? (
                  analytics.anomalies.map((anomaly, index) => (
                    <Alert 
                      key={index} 
                      severity={getSeverityColor(anomaly.severity)} 
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="subtitle2" fontWeight="bold">
                        {anomaly.user} - {anomaly.date}
                      </Typography>
                      <Typography variant="body2">
                        {anomaly.description}
                      </Typography>
                    </Alert>
                  ))
                ) : (
                  <Alert severity="success">
                    <Typography variant="body2">
                      No anomalies detected - All systems running smoothly! 🎉
                    </Typography>
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Performers */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🏆 Employee Performance Rankings
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {analytics.userStats?.length > 0 ? (
                    analytics.userStats.map((user, index) => (
                      <Grid item xs={12} sm={6} md={4} lg={2.4} key={user.name}>
                        <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                          <Avatar sx={{ mx: 'auto', mb: 1, bgcolor: 'primary.main' }}>
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </Avatar>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {user.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.department}
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2">
                              Attendance: <strong>{user.attendance}%</strong>
                            </Typography>
                            <Typography variant="body2">
                              Productivity: <strong>{user.productivity}%</strong>
                            </Typography>
                            <Typography variant="body2" color="success.main">
                              Streak: <strong>{user.streak} days</strong>
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