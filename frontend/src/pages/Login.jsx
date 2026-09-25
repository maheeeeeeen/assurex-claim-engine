/**
 * Login Page — AssureX Claim Engine
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { FaShieldAlt, FaUserCheck, FaUserTie, FaUser } from 'react-icons/fa';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e, customUser = null, customPass = null) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    const u = customUser || identifier;
    const p = customPass || password;

    try {
      const userData = await login(u, p);
      if (userData.role === 'admin') {
        navigate('/admin');
      } else if (userData.role === 'reviewer') {
        navigate('/review-queue');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid username/email or password.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Login failed. Please check network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (uname, pwd) => {
    setIdentifier(uname);
    setPassword(pwd);
    handleLoginSubmit(null, uname, pwd);
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={5}>
          <div className="text-center mb-4">
            <div className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle bg-primary bg-opacity-10 text-primary mb-3">
              <FaShieldAlt size={36} />
            </div>
            <h2 className="fw-extrabold text-white">Assure<span className="text-primary">X</span></h2>
            <p className="text-muted small">Autonomous Dual-Brain Warranty Adjudication Platform</p>
          </div>

          <Card className="border-0 shadow-lg">
            <Card.Body className="p-4 p-md-5">
              <h4 className="fw-bold mb-1">Sign In</h4>
              <p className="text-muted small mb-4">Enter your credentials or use a quick demo profile</p>

              {error && <Alert variant="danger" dismissible onClose={() => setError('')} className="py-2 small">{error}</Alert>}

              <Form onSubmit={handleLoginSubmit}>
                <Form.Group className="mb-3" controlId="loginIdentifier">
                  <Form.Label>Username or Email</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. admin or admin@assurex.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    autoFocus
                  />
                </Form.Group>

                <Form.Group className="mb-4" controlId="loginPassword">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 py-2 fw-bold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Authenticating...
                    </>
                  ) : (
                    'Sign In to Console'
                  )}
                </Button>
              </Form>

              <hr className="my-4 border-secondary opacity-25" />

              {/* Demo Profiles */}
              <div>
                <small className="text-muted d-block mb-2 text-uppercase fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                  ⚡ Quick Demo Login Profiles
                </small>
                <div className="d-grid gap-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="text-start d-flex align-items-center justify-content-between p-2"
                    onClick={() => handleQuickLogin('admin', 'Admin@12345')}
                  >
                    <span><FaUserTie className="me-2 text-danger" /> <strong>Chief Admin</strong></span>
                    <Badge bg="danger" className="text-uppercase" style={{ fontSize: '0.65rem' }}>Full Access</Badge>
                  </Button>

                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="text-start d-flex align-items-center justify-content-between p-2"
                    onClick={() => handleQuickLogin('adjuster_sarah', 'Adjuster@12345')}
                  >
                    <span><FaUserCheck className="me-2 text-warning" /> <strong>Lead Adjuster</strong></span>
                    <Badge bg="warning" className="text-dark text-uppercase" style={{ fontSize: '0.65rem' }}>Review Queue</Badge>
                  </Button>

                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="text-start d-flex align-items-center justify-content-between p-2"
                    onClick={() => handleQuickLogin('customer_mike', 'Customer@12345')}
                  >
                    <span><FaUser className="me-2 text-primary" /> <strong>Customer Portal</strong></span>
                    <Badge bg="primary" className="text-uppercase" style={{ fontSize: '0.65rem' }}>Claim Intake</Badge>
                  </Button>
                </div>
              </div>

              <div className="text-center mt-4 pt-2">
                <small className="text-muted">
                  Need a new account?{' '}
                  <Link to="/register" className="text-primary text-decoration-none fw-semibold">
                    Create Account
                  </Link>
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
