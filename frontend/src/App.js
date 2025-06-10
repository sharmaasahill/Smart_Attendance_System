import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

// Components
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import FaceCapture from './components/FaceCapture';
import MarkAttendance from './components/MarkAttendance';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import UserProfile from './components/UserProfile';
import UserAttendance from './components/UserAttendance';
import Settings from './components/Settings';
import Navbar from './components/Navbar';

// Create Auth Context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const authValue = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    token: localStorage.getItem('token')
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        Loading...
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      <Box>
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/dashboard" /> : <Register />} 
          />
          
          {/* Protected Routes - Admin Only */}
          <Route 
            path="/admin" 
            element={user && user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} 
          />
          
          {/* Protected Routes - All Users */}
          <Route 
            path="/dashboard" 
            element={user ? (user.role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />) : <Navigate to="/login" />} 
          />
          <Route 
            path="/profile" 
            element={user ? <UserProfile /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/settings" 
            element={user ? <Settings /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/attendance" 
            element={user ? <UserAttendance /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/face-capture" 
            element={user ? <FaceCapture /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/mark-attendance" 
            element={<MarkAttendance />} 
          />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Box>
    </AuthContext.Provider>
  );
}

export default App; 