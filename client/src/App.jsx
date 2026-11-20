import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import { Loading } from './components/ui.jsx';
import {
  AdminPage, ClaimsPage, DashboardPage, LandingPage, LeaderboardPage, LoginPage, MatchesPage,
  MyReportsPage, NotFoundPage, NotificationsPage, ProfilePage, RecoveryAssistantPage, RegisterPage,
  ReportDetailPage, ReportFormPage, ReportsPage
} from './pages.jsx';

const MapPage = lazy(() => import('./pages/MapPage.jsx'));

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function ProtectedLayout() {
  return <ProtectedRoute><Layout /></ProtectedRoute>;
}

export default function App() {
  return <Suspense fallback={<Loading />}><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route element={<ProtectedLayout />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/my-reports" element={<MyReportsPage />} />
      <Route path="/reports/:id" element={<ReportDetailPage />} />
      <Route path="/report/:type" element={<ReportFormPage />} />
      <Route path="/matches" element={<MatchesPage />} />
      <Route path="/claims" element={<ClaimsPage />} />
      <Route path="/assistant" element={<RecoveryAssistantPage />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/admin" element={<ProtectedRoute roles={['ADMIN', 'MODERATOR']}><AdminPage /></ProtectedRoute>} />
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense>;
}
