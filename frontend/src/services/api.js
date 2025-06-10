import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
};

// Face APIs
export const faceAPI = {
  registerFace: (files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    return api.post('/face/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Attendance APIs
export const attendanceAPI = {
  markAttendance: (imageFile) => {
    const formData = new FormData();
    formData.append('file', imageFile);
    return api.post('/attendance/mark', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getAttendanceRecords: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.date) queryParams.append('date', params.date);
    if (params.user_id) queryParams.append('user_id', params.user_id);
    
    return api.get(`/admin/attendance?${queryParams}`);
  },
  getUserAttendance: (userId) => {
    return api.get('/user/attendance');
  },
};

// User APIs
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (profileData) => api.put('/user/profile', profileData),
  changePassword: (passwordData) => api.post('/user/change-password', passwordData),
  getAttendance: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    
    return api.get(`/user/attendance?${queryParams}`);
  },
  getAttendanceStats: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.month) queryParams.append('month', params.month);
    if (params.year) queryParams.append('year', params.year);
    
    return api.get(`/user/attendance/stats?${queryParams}`);
  },
  getTodayAttendance: () => {
    const today = new Date().toISOString().split('T')[0];
    return api.get(`/user/attendance?start_date=${today}&end_date=${today}`);
  },
};

// Admin APIs
export const adminAPI = {
  getAllUsers: () => api.get('/admin/users'),
  deleteUser: (userId) => api.delete(`/admin/user/${userId}`),
  markAbsentUsers: () => api.post('/admin/mark-absent'),
  updateAttendanceRecord: (record) => {
    const formData = new FormData();
    formData.append('status', record.status);
    if (record.time_in) {
      formData.append('time_in', record.time_in);
    }
    return api.put(`/admin/attendance/${record.id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  bulkUpdateAttendance: (data) => {
    const formData = new FormData();
    data.record_ids.forEach(id => formData.append('record_ids', id));
    formData.append('status', data.status);
    if (data.time_in) {
      formData.append('time_in', data.time_in);
    }
    return api.post('/admin/attendance/bulk-update', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  markUserPresent: (userId, timeIn = null) => {
    const formData = new FormData();
    if (timeIn) {
      formData.append('time_in', timeIn);
    }
    return api.post(`/admin/attendance/mark-present/${userId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  exportAttendance: (params) => api.get('/admin/attendance/export', { params }),
};

// Utility function to convert webcam capture to file
export const webcamCaptureToFile = (imageSrc, filename = 'webcam-capture.jpg') => {
  return fetch(imageSrc)
    .then(res => res.blob())
    .then(blob => new File([blob], filename, { type: 'image/jpeg' }));
};

export default api; 