/**
 * Register Page — AssureX Claim Engine
 *
 * This page:
 * 1. Collects full name, email, password, and role selection
 * 2. Calls the /api/auth/register endpoint
 * 3. On success, redirects to the login page with a success message
 * 4. Validates password confirmation on the client side
 * 5. Shows error alerts for duplicate emails or server errors
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { authAPI } from '../api/auth';

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.register({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Row className="justify-content-center mt-5">
        <Col md={6} lg={5}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="fw-bold text-primary">AssureX</h2>
                <p className="text-muted">Create your account</p>
              </div>

              {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="regName">
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="full_name"
                    placeholder="Enter full name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="regEmail">
                  <Form.Label>Email address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="Enter email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="regRole">
                  <Form.Label>Role</Form.Label>
                  <Form.Select name="role" value={formData.role} onChange={handleChange}>
                    <option value="customer">Customer</option>
                    <option value="employee">Service Center Employee</option>
                    <option value="reviewer">Claim Reviewer</option>
                    <option value="admin">Administrator</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3" controlId="regPassword">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    placeholder="At least 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="regConfirmPassword">
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </Form>

              <div className="text-center">
                <small className="text-muted">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary">
                    Sign in
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
