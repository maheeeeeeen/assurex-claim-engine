/**
 * Dashboard Page — AssureX Claim Engine (User Dashboard)
 *
 * This page:
 * 1. Displays a welcome message with the user's name and role
 * 2. Shows summary cards: products, warranties, claims, pending actions
 * 3. Provides quick-action buttons for common tasks
 * 4. Will later integrate real data from API endpoints
 * 5. Accessible to all authenticated roles (role-specific views handled by separate dashboards)
 */

import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaBox, FaShieldAlt, FaFileAlt, FaBell } from 'react-icons/fa';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const summaryCards = [
    {
      title: 'Products',
      count: 0,
      icon: <FaBox size={28} />,
      color: 'primary',
      link: '/products',
      description: 'Registered products',
    },
    {
      title: 'Warranties',
      count: 0,
      icon: <FaShieldAlt size={28} />,
      color: 'success',
      link: '/warranties',
      description: 'Active warranties',
    },
    {
      title: 'Claims',
      count: 0,
      icon: <FaFileAlt size={28} />,
      color: 'warning',
      link: '/claims',
      description: 'Submitted claims',
    },
    {
      title: 'Notifications',
      count: 0,
      icon: <FaBell size={28} />,
      color: 'info',
      link: '/notifications',
      description: 'Pending alerts',
    },
  ];

  return (
    <Container className="py-4">
      {/* Welcome Banner */}
      <Row className="mb-4">
        <Col>
          <h2 className="fw-bold">
            Welcome, {user?.full_name || 'User'}!
          </h2>
          <p className="text-muted">
            Role: <span className="badge bg-primary text-capitalize">{user?.role}</span>
          </p>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row className="mb-4">
        {summaryCards.map((card) => (
          <Col key={card.title} sm={6} lg={3} className="mb-3">
            <Card
              className="h-100 shadow-sm border-0"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(card.link)}
            >
              <Card.Body className="d-flex align-items-center">
                <div className={`text-${card.color} me-3`}>{card.icon}</div>
                <div>
                  <h3 className="mb-0 fw-bold">{card.count}</h3>
                  <small className="text-muted">{card.description}</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Quick Actions */}
      <Row>
        <Col>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <h5 className="fw-bold mb-3">Quick Actions</h5>
              <div className="d-flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => navigate('/products/new')}>
                  Register Product
                </Button>
                <Button variant="success" onClick={() => navigate('/claims/new')}>
                  File New Claim
                </Button>
                <Button variant="outline-secondary" onClick={() => navigate('/claims')}>
                  View All Claims
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
