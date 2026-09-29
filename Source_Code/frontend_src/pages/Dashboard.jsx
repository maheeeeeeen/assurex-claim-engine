/**
 * Dashboard Page — AssureX Claim Engine
 * Executive Adjudication Metrics & Live Claim Feed
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Spinner, Badge } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { claimsAPI } from '../api';
import { 
  FaShieldAlt, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaClock, 
  FaBrain, 
  FaPlusCircle, 
  FaArrowRight, 
  FaExchangeAlt 
} from 'react-icons/fa';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [recentClaims, setRecentClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, claimsRes] = await Promise.all([
        claimsAPI.getStats(),
        claimsAPI.getClaims({ limit: 8 }),
      ]);
      setStats(statsRes.data);
      setRecentClaims(claimsRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Could not fetch real-time adjudication telemetry.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" className="my-5" />
        <h5 className="text-muted">Loading live AI adjudication telemetry...</h5>
      </Container>
    );
  }

  // Charts data preparation
  const statusPieData = stats ? [
    { name: 'Auto-Approved', value: stats.auto_approved_count, color: '#10b981' },
    { name: 'Auto-Rejected', value: stats.auto_rejected_count, color: '#f43f5e' },
    { name: 'Manual Review', value: stats.manual_review_count, color: '#f59e0b' },
  ].filter(d => d.value > 0) : [];

  const categoryBarData = stats?.category_counts
    ? Object.entries(stats.category_counts).map(([cat, count]) => ({ category: cat, claims: count }))
    : [];

  return (
    <Container fluid className="px-4 py-4">
      {/* Welcome & Action Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-extrabold text-white mb-1">
            Executive Claim Telemetry
          </h2>
          <p className="text-muted small mb-0">
            Real-time status of autonomous dual-model machine learning and deterministic business rules
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button 
            variant="primary" 
            onClick={() => navigate('/claims/submit')}
            className="d-flex align-items-center gap-2 fw-semibold"
          >
            <FaPlusCircle /> Submit New Claim
          </Button>
          {(user?.role === 'reviewer' || user?.role === 'admin') && (
            <Button 
              variant="outline-secondary" 
              onClick={() => navigate('/review-queue')}
              className="d-flex align-items-center gap-2"
            >
              <FaClock className="text-warning" /> Review Queue ({stats?.manual_review_count || 0})
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <Row className="g-3 mb-4">
        {/* Total Claims */}
        <Col sm={6} lg={3}>
          <div className="kpi-card kpi-blue p-3 h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>
                  Total Ingested Claims
                </small>
                <h3 className="fw-extrabold my-1 text-white">{stats?.total_claims || 0}</h3>
                <small className="text-info">{stats?.resolved_count || 0} Resolved Adjudications</small>
              </div>
              <div className="p-2 rounded bg-primary bg-opacity-20 text-primary">
                <FaShieldAlt size={22} />
              </div>
            </div>
          </div>
        </Col>

        {/* Auto-Approved Rate */}
        <Col sm={6} lg={3}>
          <div className="kpi-card kpi-green p-3 h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>
                  Autonomous Approval Rate
                </small>
                <h3 className="fw-extrabold my-1 text-white">{stats?.auto_approved_pct || 0}%</h3>
                <small className="text-success">{stats?.auto_approved_count || 0} claims auto-approved</small>
              </div>
              <div className="p-2 rounded bg-success bg-opacity-20 text-success">
                <FaCheckCircle size={22} />
              </div>
            </div>
          </div>
        </Col>

        {/* Auto-Rejected Rate */}
        <Col sm={6} lg={3}>
          <div className="kpi-card kpi-rose p-3 h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>
                  Autonomous Rejection Rate
                </small>
                <h3 className="fw-extrabold my-1 text-white">{stats?.auto_rejected_pct || 0}%</h3>
                <small className="text-danger">{stats?.auto_rejected_count || 0} policy violations / invalid</small>
              </div>
              <div className="p-2 rounded bg-danger bg-opacity-20 text-danger">
                <FaTimesCircle size={22} />
              </div>
            </div>
          </div>
        </Col>

        {/* Dual-Brain Agreement Rate */}
        <Col sm={6} lg={3}>
          <div className="kpi-card kpi-purple p-3 h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>
                  Dual-Brain AI Agreement
                </small>
                <h3 className="fw-extrabold my-1 text-white">{stats?.dual_model_agreement_rate || 0}%</h3>
                <small className="text-purple" style={{ color: '#a78bfa' }}>XGBoost 🤝 MobileNetV2</small>
              </div>
              <div className="p-2 rounded bg-opacity-20 text-white" style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)' }}>
                <FaBrain size={22} color="#a78bfa" />
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Visual Charts Row */}
      <Row className="g-3 mb-4">
        <Col lg={4}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Adjudication Decisions</span>
              <small className="text-muted">Status Split</small>
            </Card.Header>
            <Card.Body className="d-flex flex-column align-items-center justify-content-center">
              {statusPieData.length > 0 ? (
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="d-flex justify-content-center gap-3 mt-2">
                    {statusPieData.map((d) => (
                      <div key={d.name} className="d-flex align-items-center gap-1 small">
                        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: d.color }}></span>
                        <span className="text-muted">{d.name} ({d.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted">No claims data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Claims by Product Category</span>
              <small className="text-muted">Distribution Across Appliances, Electronics, Automotive</small>
            </Card.Header>
            <Card.Body>
              {categoryBarData.length > 0 ? (
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer>
                    <BarChart data={categoryBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                      <XAxis dataKey="category" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: 8 }}
                      />
                      <Bar dataKey="claims" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted text-center py-5">No category metrics available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Live Recent Claims Table */}
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0 fw-bold">Live Claim Stream</h5>
            <small className="text-muted">Recent adjudications processed through the dual-model engine</small>
          </div>
          <Link to="/claims" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1">
            View All Claims <FaArrowRight size={12} />
          </Link>
        </Card.Header>
        <div className="table-responsive">
          <Table className="table-dark-custom mb-0">
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Product</th>
                <th>Category</th>
                <th>Submission Date</th>
                <th>Dual AI Agreement</th>
                <th>Final Confidence</th>
                <th>Adjudication Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentClaims.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">
                    No claims found. Click "Submit New Claim" to process your first claim.
                  </td>
                </tr>
              ) : (
                recentClaims.map((c) => (
                  <tr key={c.claim_id}>
                    <td>
                      <span className="font-mono fw-bold text-primary">{c.claim_id}</span>
                    </td>
                    <td>
                      <div className="fw-semibold text-white">{c.product_name}</div>
                      <small className="text-muted">{c.brand} • SN: {c.serial_number_entered}</small>
                    </td>
                    <td>
                      <span className="badge bg-secondary bg-opacity-25 text-light">{c.product_category}</span>
                    </td>
                    <td className="text-muted small">
                      {c.claim_submission_date}
                    </td>
                    <td>
                      {c.models_agreed ? (
                        <span className="pill-agreed d-inline-flex align-items-center gap-1">
                          <FaCheckCircle size={10} /> Agreed
                        </span>
                      ) : (
                        <span className="pill-disagreed d-inline-flex align-items-center gap-1">
                          <FaExchangeAlt size={10} /> Disagreed
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className="font-mono small">{(c.final_confidence * 100).toFixed(1)}%</span>
                        <div className="progress flex-grow-1" style={{ height: 4, width: 50, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                          <div 
                            className={`progress-bar ${c.final_confidence >= 0.85 ? 'bg-success' : 'bg-warning'}`}
                            style={{ width: `${c.final_confidence * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-status ${
                        c.adjudication_status === 'Auto-Approved' || c.adjudication_status === 'Approved'
                          ? 'badge-approved'
                          : c.adjudication_status === 'Auto-Rejected' || c.adjudication_status === 'Rejected'
                          ? 'badge-rejected'
                          : 'badge-review'
                      }`}>
                        {c.adjudication_status}
                      </span>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => navigate(`/claims/${c.claim_id}`)}
                        className="py-1 px-2"
                      >
                        Dossier
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    </Container>
  );
}
