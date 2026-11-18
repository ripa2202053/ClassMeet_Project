import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherSettings from './pages/TeacherSettings';
import StudentDashboard from './pages/StudentDashboard';
import Room from './pages/Room';
import AttendanceReport from './pages/AttendanceReport';
import HomePage from './pages/HomePage';
import { useNavigate } from 'react-router-dom';

const HomePageWrapper = () => {
  const navigate = useNavigate();
  return (
    <HomePage
      onGetStarted={() => navigate('/register')}
      onLogin={() => navigate('/login')}
    />
  );
};

const PrivateRoute = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/login" />;
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePageWrapper />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forgot-password" element={<ResetPassword />} />
          <Route
            path="/teacher-dashboard"
            element={
              <PrivateRoute role="teacher">
                <TeacherDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/student-dashboard"
            element={
              <PrivateRoute role="student">
                <StudentDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/room/:id"
            element={
              <PrivateRoute>
                <Room />
              </PrivateRoute>
            }
          />
          <Route
            path="/attendance/:roomId"
            element={
              <PrivateRoute role="teacher">
                <AttendanceReport />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher-settings"
            element={
              <PrivateRoute role="teacher">
                <TeacherSettings />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;