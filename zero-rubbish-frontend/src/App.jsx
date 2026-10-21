import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AdminLayout from './components/Layouts/AdminLayout.jsx';

import HomeView from './pages/HomeView.jsx';



// Embed (public, bare — no nav/footer, iframed into WordPress)
import EmbedMap from './pages/EmbedMap.jsx';
import EmbedAdopt from './pages/EmbedAdopt.jsx';

// Admin pages
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboardView from './pages/AdminDashboardView.jsx';
import VolunteersView from './pages/VolunteersView.jsx';
import StreetsView from './pages/StreetsView.jsx';
import ChangePasswordView from './pages/ChangePasswordView.jsx';
import NotFound from './pages/NotFound.jsx';

// Auth guard
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public home page */}
      <Route path="/" element={<HomeView />} />
      {/* Bare embed routes — no layout, these get iframed into WordPress */}
      <Route path="/map" element={<EmbedMap />} />
      <Route path="/adopt" element={<EmbedAdopt />} />

      {/* Admin login — standalone, no sidebar */}
      <Route path="admin/login" element={<AdminLogin />} />

      {/* Protected admin routes — sidebar layout, JWT required */}
      {/* Wrap the admin routes with a ProtectedRoute component to ensure that only authenticated users can access them */}
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="admin/dashboard" element={<AdminDashboardView />} />
        <Route path="admin/volunteers" element={<VolunteersView />} />
        <Route path="admin/streets" element={<StreetsView />} />
        <Route path="admin/change-password" element={<ChangePasswordView />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}