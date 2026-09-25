/**
 * Navigation Bar — AssureX Claim Engine
 */

import { Navbar, Nav, Container, Button, Badge } from 'react-bootstrap';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaShieldAlt, FaPlusCircle, FaListAlt, FaTasks, FaCogs, FaSignOutAlt, FaBox } from 'react-icons/fa';

export default function AppNavbar() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Navbar expand="lg" sticky="top" className="navbar-custom py-2">
      <Container fluid className="px-4">
        <Navbar.Brand as={NavLink} to="/" className="text-white">
          <span className="p-1 px-2 rounded bg-primary text-white me-2" style={{ fontSize: '1rem' }}>
            <FaShieldAlt className="mb-1" />
          </span>
          <span>Assure<span className="text-primary">X</span></span>
          <span className="badge bg-secondary ms-2 text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
            Dual-Brain AI
          </span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-nav" className="border-0 text-white" />

        <Navbar.Collapse id="main-nav">
          {isAuthenticated ? (
            <>
              <Nav className="me-auto ms-lg-3 gap-1">
                <Nav.Link as={NavLink} to="/dashboard">
                  Dashboard
                </Nav.Link>
                <Nav.Link as={NavLink} to="/claims">
                  <FaListAlt className="me-1 mb-1" /> Claims
                </Nav.Link>
                <Nav.Link as={NavLink} to="/claims/submit" className="text-primary fw-bold">
                  <FaPlusCircle className="me-1 mb-1" /> Submit Claim
                </Nav.Link>
                <Nav.Link as={NavLink} to="/products">
                  <FaBox className="me-1 mb-1" /> Products
                </Nav.Link>

                {/* Reviewer / Admin Queue */}
                {(role === 'reviewer' || role === 'admin') && (
                  <Nav.Link as={NavLink} to="/review-queue">
                    <FaTasks className="me-1 mb-1 text-warning" /> Review Queue
                  </Nav.Link>
                )}

                {/* Admin Management */}
                {role === 'admin' && (
                  <Nav.Link as={NavLink} to="/admin">
                    <FaCogs className="me-1 mb-1 text-info" /> Admin
                  </Nav.Link>
                )}
              </Nav>

              <Nav className="align-items-center gap-3 mt-3 mt-lg-0">
                <div className="d-flex align-items-center gap-2">
                  <div className="text-end">
                    <div className="fw-semibold text-white" style={{ fontSize: '0.875rem' }}>
                      {user?.full_name || user?.username}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {user?.email}
                    </div>
                  </div>
                  <Badge 
                    bg={role === 'admin' ? 'danger' : role === 'reviewer' ? 'warning' : 'primary'}
                    className="text-capitalize text-dark fw-bold px-2 py-1"
                  >
                    {role}
                  </Badge>
                </div>

                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={handleLogout}
                  className="d-flex align-items-center gap-1"
                >
                  <FaSignOutAlt /> Logout
                </Button>
              </Nav>
            </>
          ) : (
            <Nav className="ms-auto gap-2">
              <Nav.Link as={NavLink} to="/login">
                Login
              </Nav.Link>
              <Button as={NavLink} to="/register" variant="primary" size="sm" className="px-3">
                Register
              </Button>
            </Nav>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
