/**
 * App.jsx — Root Application Component
 * Complete Route Configuration for AssureX Claim Engine
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppNavbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ClaimsList from './pages/ClaimsList';
import ClaimDetail from './pages/ClaimDetail';
import SubmitClaim from './pages/SubmitClaim';
import ReviewQueue from './pages/ReviewQueue';
import Products from './pages/Products';
import Admin from './pages/Admin';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="d-flex flex-column min-vh-100 bg-surface">
          <AppNavbar />
          <main className="flex-grow-1">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected routes — any authenticated user */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/claims" element={<ClaimsList />} />
                <Route path="/claims/submit" element={<SubmitClaim />} />
                <Route path="/claims/:id" element={<ClaimDetail />} />
                <Route path="/products" element={<Products />} />
                <Route path="/warranties" element={<Products />} />
              </Route>

              {/* Protected routes — reviewer + admin only */}
              <Route element={<ProtectedRoute allowedRoles={['reviewer', 'admin']} />}>
                <Route path="/review-queue" element={<ReviewQueue />} />
              </Route>

              {/* Protected routes — admin only */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
              </Route>

              {/* Default redirects */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
