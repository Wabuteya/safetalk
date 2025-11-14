import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import LandingPage from './components/Landing/LandingPage';
import Login from './components/Auth/Login';
import Dashboard from './components/Student/Dashboard';
import DashboardHome from './components/Student/DashboardHome';
import Placeholder from './components/Student/Placeholder';
import JournalPage from './components/Student/JournalPage';
import MoodHistoryPage from './components/Student/MoodHistoryPage';
import FindTherapistPage from './components/Student/FindTherapistPage';
import ResourcesPage from './components/Student/ResourcesPage';
import ProfilePage from './components/Student/ProfilePage';
import TherapistProfilePage from './components/Student/TherapistProfilePage';
import TherapistDashboard from './components/Therapist/TherapistDashboard';
import TherapistDashboardHome from './components/Therapist/TherapistDashboardHome';
import CrisisAlertsPage from './components/Therapist/CrisisAlertsPage';
import CaseloadPage from './components/Therapist/CaseloadPage';
import SignUpPage from './components/SignUp/SignUpPage';
import InitialAssessment from './components/Assessment_Form/InitialAssessment';

const AppRoutes = () => {
  const navigate = useNavigate();

  const handleLogin = (payload) => {
    console.table(payload);
    // Navigate to student dashboard based on userType
    if (payload?.userType === 'student') {
      navigate('/student-dashboard', { replace: true });
    } else if (payload?.userType === 'therapist') {
      navigate('/therapist-dashboard', { replace: true });
    } else if (payload?.userType === 'admin') {
      navigate('/admin-dashboard', { replace: true });
    } else {
      navigate('/student-dashboard', { replace: true });
    }
  };

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/assessment" element={<InitialAssessment />} />

      {/* Student Dashboard Nested Routes */}
      <Route path="/student-dashboard" element={<Dashboard />}>
        <Route index element={<DashboardHome />} />
        <Route path="journal" element={<JournalPage />} />
        <Route path="mood-history" element={<MoodHistoryPage />} />
        <Route path="therapists" element={<FindTherapistPage />} />
        <Route path="therapists/:therapistId" element={<TherapistProfilePage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Legacy route for backward compatibility */}
      <Route path="/student" element={<Navigate to="/student-dashboard" replace />} />

      {/* Therapist Dashboard Nested Routes */}
      <Route path="/therapist-dashboard" element={<TherapistDashboard />}>
        <Route index element={<TherapistDashboardHome />} />
        <Route path="caseload" element={<CaseloadPage />} />
        <Route path="student/:studentId" element={<Placeholder title="Student Progress & Details Page" />} />
        <Route path="appointments" element={<Placeholder title="Appointments Page" />} />
        <Route path="chat" element={<Placeholder title="Live Chat Page" />} />
        <Route path="resources" element={<Placeholder title="Manage Resources Page" />} />
        <Route path="alerts" element={<CrisisAlertsPage />} />
        <Route path="profile" element={<Placeholder title="Therapist Profile Page" />} />
      </Route>
      <Route path="/admin-dashboard" element={<Placeholder title="Admin Dashboard" />} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;
