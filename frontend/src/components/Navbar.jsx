/**
 * Navigation Bar — AssureX Claim Engine
 *
 * This component:
 * 1. Shows the brand name and navigation links based on authentication state
 * 2. Displays role-specific nav items (admin gets Admin Dashboard, reviewer gets Review Queue)
 * 3. Shows user name + role badge when logged in, with a logout button
 * 4. Collapses into a hamburger menu on mobile (Bootstrap responsive navbar)
 * 5. Highlights the currently active route
 */

import { Navbar, Nav, Container, Button, Badge } from 'react-bootstrap';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppNavbar() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top">
      <Container>
        <Navbar.Brand as={NavLink} to="/" className="fw-bold">
          🛡️ AssureX
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          {isAuthenticated ? (
            <>
              <Nav className="me-auto">
                <Nav.Link as={NavLink} to="/dashboard">Dashboard</Nav.Link>
                <Nav.Link as={NavLink} to="/products">Products</Nav.Link>
                <Nav.Link as={NavLink} to="/warranties">Warranties</Nav.Link>
                <Nav.Link as={NavLink} to="/claims">Claims</Nav.Link>

                {/* Reviewer-specific */}
                {(role === 'reviewer' || role === 'admin') && (
                  <Nav.Link as={NavLink} to="/review-queue">Review Queue</Nav.Link>
                )}

                {/* Admin-specific */}
                {role === 'admin' && (
                  <Nav.Link as={NavLink} to="/admin/dashboard">Admin</Nav.Link>
                )}
              </Nav>

              <Nav className="align-items-center">
                <Nav.Item className="me-3">
                  <span className="text-light">
                    {user?.full_name}{' '}
                    <Badge bg="info" className="text-capitalize">{role}</Badge>
                  </span>
                </Nav.Item>
                <Button variant="outline-light" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </Nav>
            </>
          ) : (
            <Nav className="ms-auto">
              <Nav.Link as={NavLink} to="/login">Login</Nav.Link>
              <Nav.Link as={NavLink} to="/register">Register</Nav.Link>
            </Nav>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
