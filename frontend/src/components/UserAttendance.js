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
  Chip,
  Button,
  TextField,
  Alert,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  FilterList as FilterIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { userAPI } from '../services/api';

const UserAttendance = () => {
  const [user, setUser] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAttendanceData();
    fetchAttendanceStats();
  }, []);

  const fetchAttendanceData = async (filters = {}) => {
    try {
      setLoading(true);
      const response = await userAPI.getAttendance(filters);
      setUser(response.data.user);
      setAttendanceRecords(response.data.attendance_records);
    } catch (error) {
      setError('Failed to load attendance data');
      console.error('Attendance fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStats = async (month = selectedMonth, year = selectedYear) => {
    try {
      const response = await userAPI.getAttendanceStats({ month, year });
      setStats(response.data.stats);
    } catch (error) {
      console.error('Stats fetch error:', error);
    }
  };

  const handleFilterApply = () => {
    const filters = {};
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;
    
    fetchAttendanceData(filters);
  };

  const handleStatsFilter = () => {
    fetchAttendanceStats(selectedMonth, selectedYear);
  };

  const getStatusColor = (status) => {
    return status === 'present' ? 'success' : 'error';
  };

  const getStatusIcon = (status) => {
    return status === 'present' ? <CheckCircleIcon /> : <CancelIcon />;
  };

  if (loading && !attendanceRecords.length) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <AssessmentIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" gutterBottom>
            My Attendance
          </Typography>
        </Box>
        
        {user && (
          <Typography variant="subtitle1" color="text.secondary">
            Welcome back, {user.full_name}! Here's your attendance overview.
          </Typography>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CalendarIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h4" color="primary">
                      {stats.total_days}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Days
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CheckCircleIcon sx={{ mr: 2, color: 'success.main' }} />
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {stats.present_days}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Present Days
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CancelIcon sx={{ mr: 2, color: 'error.main' }} />
                  <Box>
                    <Typography variant="h4" color="error.main">
                      {stats.absent_days}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Absent Days
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TrendingUpIcon sx={{ mr: 2, color: 'info.main' }} />
                  <Box>
                    <Typography variant="h4" color="info.main">
                      {stats.attendance_percentage}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Attendance Rate
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={stats.attendance_percentage} 
                    color="info"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Filters
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="contained"
              onClick={handleFilterApply}
              fullWidth
            >
              Apply Filter
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Box display="flex" gap={1} alignItems="center">
              <TextField
                select
                label="Month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                SelectProps={{ native: true }}
                size="small"
                sx={{ minWidth: 100 }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </TextField>
              
              <TextField
                select
                label="Year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                SelectProps={{ native: true }}
                size="small"
                sx={{ minWidth: 100 }}
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </TextField>
              
              <Button
                variant="outlined"
                onClick={handleStatsFilter}
                size="small"
              >
                Update Stats
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Attendance Records Table */}
      <Paper elevation={2}>
        <Box p={3}>
          <Typography variant="h6" gutterBottom>
            Attendance Records ({attendanceRecords.length} records)
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : attendanceRecords.length === 0 ? (
            <Box textAlign="center" p={4}>
              <Typography variant="body1" color="text.secondary">
                No attendance records found for the selected period.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Time In</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Recorded At</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceRecords.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        {new Date(record.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        {record.time_in ? 
                          new Date(`2000-01-01T${record.time_in}`).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 
                          '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(record.status)}
                          label={record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          color={getStatusColor(record.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(record.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default UserAttendance; 