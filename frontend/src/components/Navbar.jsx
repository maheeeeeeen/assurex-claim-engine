/**
 * Navigation Bar — AssureX Claim Engine
 */

import { useState } from 'react';
import { Navbar, Nav, Container, Button, Badge } from 'react-bootstrap';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaShieldAlt, FaPlusCircle, FaListAlt, FaTasks, FaCogs, FaSignOutAlt, FaBox, FaUser, FaFileContract } from 'react-icons/fa';
import ProfileModal from './ProfileModal';
import NotificationDropdown from './NotificationDropdown';

export default function AppNavbar() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeVariant = (r) => {
    switch (r?.toLowerCase()) {
      case 'admin':
        return 'danger';
      case 'reviewer':
        return 'warning';
      case 'employee':
        return 'info';
      case 'customer':
      default:
        return 'primary';
    }
  };

  return (
    <>
      <Navbar expand="lg" sticky="top" variant="dark" data-bs-theme="dark" className="navbar-custom py-2">
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

                  {/* CUSTOMER LINKS */}
                  {role === 'customer' && (
                    <>
                      <Nav.Link as={NavLink} to="/claims">
                        <FaListAlt className="me-1 mb-1" /> My Claims
                      </Nav.Link>
                      <Nav.Link as={NavLink} to="/claims/submit" className="text-primary fw-bold">
                        <FaPlusCircle className="me-1 mb-1" /> Submit Claim
                      </Nav.Link>
                      <Nav.Link as={NavLink} to="/products">
                        <FaBox className="me-1 mb-1" /> My Products
                      </Nav.Link>
                      <Nav.Link as={NavLink} to="/warranties">
                        <FaFileContract className="me-1 mb-1" /> My Warranties
                      </Nav.Link>
                    </>
                  )}

                  {/* EMPLOYEE LINKS */}
                  {role === 'employee' && (
                    <>
                      <Nav.Link as={NavLink} to="/claims">
                        <FaListAlt className="me-1 mb-1" /> Claims (Assisted Intake)
                      </Nav.Link>
                      <Nav.Link as={NavLink} to="/claims/submit" className="text-primary fw-bold">
                        <FaPlusCircle className="me-1 mb-1" /> Submit Claim
                      </Nav.Link>
                      <Nav.Link as={NavLink} to="/products">
                        <FaBox className="me-1 mb-1" /> Products
                      </Nav.Link>
                      <Nav.Link as={NavLink} to="/warranties">
                        <FaFileContract className="me-1 mb-1" /> Warranties
                      </Nav.Link>
                    </>
                  )}

                  {/* REVIEWER LINKS */}
                  {role === 'reviewer' && (
                    <>
                      <Nav.Link as={NavLink} to="/review-queue">
                        <FaTasks className="me-1 mb-1 text-warning" /> Review Queue
                      </Nav.Link>
                      <Nav.Link as={NavLink} to="/claims">
                        <FaListAlt className="me-1 mb-1" /> Claims (Read-Only)
                      </Nav.Link>
                    </>
                  )}

                  {/* ADMIN LINKS */}
                  {role === 'admin' && (
                    <>
                      <Nav.Link as={NavLink} to="/admin">
                        <FaCogs className="me-1 mb-1 text-info" /> Admin
                      </Nav.Link>
                      <Nav.Link as={NavLink} to="/claims">
                        <FaListAlt className="me-1 mb-1" /> Claims
                      </Nav.Link>
                      <Nav.Link as={NavLink} to="/claims/submit" className="text-primary fw-bold">
                        <FaPlusCircle className="me-1 mb-1" /> Submit Claim
                      </Nav.Link>
                      <Nav.Link as={NavLink} to="/products">
                        <FaBox className="me-1 mb-1" /> Products & Warranties
                      </Nav.Link>
                      <Nav.Link as={NavLink} to="/review-queue">
                        <FaTasks className="me-1 mb-1 text-warning" /> Review Queue
                      </Nav.Link>
                    </>
                  )}
                </Nav>

                <Nav className="align-items-center gap-3 mt-3 mt-lg-0">
                  <div 
                    className="d-flex align-items-center gap-2 cursor-pointer p-1 px-2 rounded hover-bg-dark border border-secondary"
                    onClick={() => setShowProfileModal(true)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view and edit profile"
                  >
                    <div className="bg-primary text-white rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                      <FaUser size={14} />
                    </div>
                    <div className="text-end">
                      <div className="fw-semibold text-white" style={{ fontSize: '0.875rem' }}>
                        {user?.full_name || user?.username}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {user?.user_code || user?.email}
                      </div>
                    </div>
                    <Badge 
                      bg={getRoleBadgeVariant(role)}
                      className={`text-capitalize px-2 py-1 ${role === 'reviewer' || role === 'employee' ? 'text-dark' : 'text-white'} fw-bold`}
                    >
                      {role}
                    </Badge>
                  </div>

                  <NotificationDropdown />

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

      {/* Profile Management Modal */}
      {isAuthenticated && (
        <ProfileModal 
          show={showProfileModal} 
          onHide={() => setShowProfileModal(false)} 
        />
      )}
    </>
  );
}
