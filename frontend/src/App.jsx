/**
 * App.jsx — Root Application Component
 *
 * This component:
 * 1. Wraps the entire app in AuthProvider for global auth state
 * 2. Sets up React Router with public and protected routes
 * 3. Renders the Navbar on every page
 * 4. Uses ProtectedRoute wrapper to guard authenticated/role-based pages
 * 5. Defines the route structure matching our page components
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppNavbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppNavbar />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes — any authenticated user */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Future: products, warranties, claims pages */}
          </Route>

          {/* Protected routes — reviewer + admin only */}
          <Route element={<ProtectedRoute allowedRoles={['reviewer', 'admin']} />}>
            {/* Future: review queue page */}
          </Route>

          {/* Protected routes — admin only */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            {/* Future: admin dashboard, data export */}
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
