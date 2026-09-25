/**
 * ProtectedRoute — Route guard component
 *
 * This component:
 * 1. Checks if the user is authenticated via AuthContext
 * 2. Optionally checks if the user has one of the allowed roles
 * 3. Redirects to /login if not authenticated
 * 4. Shows an "Access Denied" message if authenticated but wrong role
 * 5. Renders the child route (via <Outlet />) if all checks pass
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Container, Alert, Spinner } from 'react-bootstrap';

export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, role, loading } = useAuth();

  // Still loading auth state (e.g., checking localStorage on mount)
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  // Not logged in — redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role — show access denied
  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>You do not have permission to access this page. Required role: {allowedRoles.join(' or ')}.</p>
        </Alert>
      </Container>
    );
  }

  // All checks pass — render the protected content
  return <Outlet />;
}
