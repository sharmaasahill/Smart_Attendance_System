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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from '@mui/material';
import {
  Dashboard,
  People,
  CheckCircle,
  Cancel,
  Delete,
  Refresh,
  Search,
  Download,
} from '@mui/icons-material';
import { adminAPI, attendanceAPI } from '../services/api';
import { useAuth } from '../App';
import { toast } from 'react-toastify';
import { format, parseISO } from 'date-fns';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
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
      
      setUsers(usersResponse.data);
      setAttendance(attendanceResponse.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  const markAbsentUsers = async () => {
    try {
      const response = await adminAPI.markAbsentUsers();
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error('Failed to mark absent users');
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
    user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
    user.unique_id.toLowerCase().includes(filters.search.toLowerCase())
  );

  const stats = {
    totalUsers: users.length,
    presentToday: attendance.filter(a => a.status === 'present').length,
    absentToday: attendance.filter(a => a.status === 'absent').length,
    registeredFaces: users.filter(u => u.face_registered).length,
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight="600" gutterBottom>
          <Dashboard sx={{ mr: 2, verticalAlign: 'middle' }} />
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.full_name}! Here's your attendance overview.
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Users
                  </Typography>
                  <Typography variant="h4" fontWeight="600">
                    {stats.totalUsers}
                  </Typography>
                </Box>
                <People sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Present Today
                  </Typography>
                  <Typography variant="h4" fontWeight="600" color="success.main">
                    {stats.presentToday}
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Absent Today
                  </Typography>
                  <Typography variant="h4" fontWeight="600" color="error.main">
                    {stats.absentToday}
                  </Typography>
                </Box>
                <Cancel sx={{ fontSize: 40, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Faces Registered
                  </Typography>
                  <Typography variant="h4" fontWeight="600">
                    {stats.registeredFaces}
                  </Typography>
                </Box>
                <Dashboard sx={{ fontSize: 40, color: 'secondary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Users Management */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" fontWeight="600">
                Registered Users
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchData}
                size="small"
              >
                Refresh
              </Button>
            </Box>

            <TextField
              fullWidth
              size="small"
              placeholder="Search users..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ mb: 3 }}
            />

            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="500">
                            {user.full_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.unique_id}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={user.face_registered ? 'Registered' : 'Pending'}
                          color={user.face_registered ? 'success' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteDialog({ open: true, user })}
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Attendance Records */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" fontWeight="600">
                Today's Attendance
              </Typography>
              <Button
                variant="contained"
                startIcon={<Cancel />}
                onClick={markAbsentUsers}
                size="small"
                color="warning"
              >
                Mark Absent
              </Button>
            </Box>

            <TextField
              type="date"
              size="small"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              sx={{ mb: 3 }}
            />

            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {record.user.full_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {record.time_in ? format(parseISO(`2000-01-01T${record.time_in}`), 'hh:mm a') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={record.status}
                          color={record.status === 'present' ? 'success' : 'error'}
                          className={`status-badge status-${record.status}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, user: null })}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{deleteDialog.user?.full_name}"? 
            This action cannot be undone and will remove all their attendance records.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, user: null })}>
            Cancel
          </Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard; 