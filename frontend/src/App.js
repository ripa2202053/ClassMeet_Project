import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherSettings from './pages/TeacherSettings';
import JoinClass from './pages/JoinClass';
import ClassroomWorkspace from './pages/ClassroomWorkspace';
import StudentClassroomWorkspace from './pages/StudentClassroomWorkspace';
import StudentDashboard from './pages/StudentDashboard';
import Room from './pages/Room';
import AttendanceReport from './pages/AttendanceReport';
// Home page removed


// Home page removed

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
          <Route path="/" element={<Navigate to="/login" />} />
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
          <Route
            path="/join/:code"
            element={
              <PrivateRoute>
                <JoinClass />
              </PrivateRoute>
            }
          />
          <Route
            path="/classrooms/:classroomId"
            element={
              <PrivateRoute role="teacher">
                <ClassroomWorkspace />
              </PrivateRoute>
            }
          />
          <Route
            path="/student-classroom/:classroomId"
            element={
              <PrivateRoute role="student">
                <StudentClassroomWorkspace />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;