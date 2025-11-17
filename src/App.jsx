import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from 'react-router-dom';
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
import CaseloadPage from './components/Therapist/CaseloadPage';
import CrisisAlertsPage from './components/Therapist/CrisisAlertsPage';
import ManageResourcesPage from './components/Therapist/ManageResourcesPage';
import AppointmentsPage from './components/Therapist/AppointmentsPage';
import TherapistProfilePageTherapist from './components/Therapist/TherapistProfilePage';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminDashboardHome from './components/Admin/AdminDashboardHome';
import ManageTherapistsPage from './components/Admin/ManageTherapistsPage';
import SignUpPage from './components/SignUp/SignUpPage';
import InitialAssessment from './components/Assessment_Form/InitialAssessment';
import VerifyEmailPage from './VerifyEmailPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import UpdatePasswordPage from './components/UpdatePasswordPage';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/update-password" element={<UpdatePasswordPage />} />
      <Route path="/please-verify" element={<VerifyEmailPage />} />
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
      <Route
        path="/student"
        element={<Navigate to="/student-dashboard" replace />}
      />

      {/* Therapist Dashboard Nested Routes */}
      <Route path="/therapist-dashboard" element={<TherapistDashboard />}>
        <Route index element={<TherapistDashboardHome />} />
        <Route path="caseload" element={<CaseloadPage />} />
        <Route
          path="student/:studentId"
          element={<Placeholder title="Student Progress & Details Page" />}
        />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="chat" element={<Placeholder title="Live Chat Page" />} />
        <Route path="resources" element={<ManageResourcesPage />} />
        <Route path="alerts" element={<CrisisAlertsPage />} />
        <Route path="profile" element={<TherapistProfilePageTherapist />} />
      </Route>

      {/* Admin Dashboard Nested Routes */}
      <Route path="/admin-dashboard" element={<AdminDashboard />}>
        <Route index element={<AdminDashboardHome />} />
        <Route
          path="users"
          element={<Placeholder title="Manage Students Page" />}
        />
        <Route path="therapists" element={<ManageTherapistsPage />} />
        <Route
          path="content"
          element={<Placeholder title="Manage Content Page" />}
        />
        <Route
          path="health"
          element={<Placeholder title="System Health Page" />}
        />
      </Route>

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
