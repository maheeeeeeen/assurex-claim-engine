/**
 * Admin Console Page — AssureX Claim Engine
 * Diagnostics, Dual-Brain AI Model Thresholds, and Database Controls
 */

import { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button, 
  Form, 
  Spinner, 
  Alert, 
  Badge 
} from 'react-bootstrap';
import { adminAPI, policiesAPI } from '../api';
import { 
  FaCogs, 
  FaDatabase, 
  FaBrain, 
  FaSlidersH, 
  FaCheckCircle, 
  FaRedoAlt 
} from 'react-icons/fa';

export default function Admin() {
  const [status, setStatus] = useState(null);
  const [thresholds, setThresholds] = useState({
    auto_approve_confidence: 0.85,
    auto_reject_confidence: 0.85,
    disagreement_delta_threshold: 0.25,
  });

  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statusRes, threshRes] = await Promise.all([
        adminAPI.getStatus(),
        policiesAPI.getThresholds(),
      ]);
      setStatus(statusRes.data);
      if (threshRes.data) {
        setThresholds(threshRes.data);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setError('Could not load administrative telemetry.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveThresholds = async (e) => {
    e.preventDefault();
    setSavingThresholds(true);
    setMessage('');
    setError('');
    try {
      await policiesAPI.updateThresholds(thresholds);
      setMessage('Adjudication confidence thresholds successfully saved!');
    } catch (err) {
      console.error('Failed to update thresholds:', err);
      setError('Could not update policy thresholds.');
    } finally {
      setSavingThresholds(false);
    }
  };

  const handleSeedDatabase = async () => {
    if (!window.confirm('Trigger demo data re-seed? This will populate initial users, products, and 35 balanced test claims.')) {
      return;
    }
    setSeeding(true);
    setMessage('');
    setError('');
    try {
      const res = await adminAPI.seedDemo();
      setMessage(`Seeding complete: ${res.data.seeded_claims} claims processed.`);
      await loadAdminData();
    } catch (err) {
      console.error('Seeding failed:', err);
      setError('Database seeding encountered an error.');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" className="my-5" />
        <h5 className="text-muted">Loading administrative console...</h5>
      </Container>
    );
  }

  return (
    <Container fluid className="px-4 py-4">
      <div className="mb-4">
        <h2 className="fw-extrabold text-white mb-1">Administrative Control Center</h2>
        <p className="text-muted small mb-0">
          Manage system health, AI arbitration thresholds, and dataset seeding
        </p>
      </div>

      {message && <Alert variant="success" dismissible onClose={() => setMessage('')}>{message}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Row className="g-4 mb-4">
        {/* System Health & Diagnostics */}
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="d-flex align-items-center gap-2">
              <FaDatabase className="text-info" /> Database & System Telemetry
            </Card.Header>
            <Card.Body className="p-4">
              <div className="d-flex align-items-center justify-content-between p-3 rounded bg-surface border border-subtle mb-3">
                <span className="text-muted">System Operational Status</span>
                <Badge bg="success" className="text-uppercase px-2 py-1">
                  {status?.status || 'Operational'}
                </Badge>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-4">
                  <div className="p-3 rounded bg-surface border border-subtle text-center">
                    <div className="text-muted small">Users</div>
                    <div className="fs-4 fw-bold font-mono text-white">{status?.database?.users || 0}</div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-3 rounded bg-surface border border-subtle text-center">
                    <div className="text-muted small">Products</div>
                    <div className="fs-4 fw-bold font-mono text-white">{status?.database?.products || 0}</div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-3 rounded bg-surface border border-subtle text-center">
                    <div className="text-muted small">Claims</div>
                    <div className="fs-4 fw-bold font-mono text-white">{status?.database?.claims || 0}</div>
                  </div>
                </div>
              </div>

              <hr className="border-secondary opacity-25" />

              <h6 className="fw-bold text-light mb-3 d-flex align-items-center gap-2">
                <FaBrain className="text-primary" /> Neural & Tabular Model Verification
              </h6>

              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-muted">1. Tabular AI (XGBoost Classifier):</span>
                {status?.models?.tabular_xgboost_ready ? (
                  <span className="text-success small fw-bold d-flex align-items-center gap-1">
                    <FaCheckCircle /> Ready (best_model.joblib)
                  </span>
                ) : (
                  <Badge bg="danger">Model Missing</Badge>
                )}
              </div>

              <div className="d-flex justify-content-between align-items-center mb-4">
                <span className="small text-muted">2. Vision AI (MobileNetV2 Teachable Machine):</span>
                {status?.models?.teachable_machine_ready ? (
                  <span className="text-success small fw-bold d-flex align-items-center gap-1">
                    <FaCheckCircle /> Ready (keras_model.h5)
                  </span>
                ) : (
                  <Badge bg="danger">Model Missing</Badge>
                )}
              </div>

              <Button
                variant="outline-primary"
                onClick={handleSeedDatabase}
                disabled={seeding}
                className="w-100 d-flex align-items-center justify-content-center gap-2 py-2"
              >
                {seeding ? (
                  <>
                    <Spinner animation="border" size="sm" /> Seeding 35 claims...
                  </>
                ) : (
                  <>
                    <FaRedoAlt /> Re-Seed Benchmark Demo Claims & Products
                  </>
                )}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* AI Arbitration Thresholds */}
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="d-flex align-items-center gap-2">
              <FaSlidersH className="text-warning" /> Autonomous Decision Thresholds
            </Card.Header>
            <Card.Body className="p-4">
              <p className="text-muted small mb-4">
                Configure minimum confidence boundaries required for fully autonomous adjudication versus triggering human reviewer escalation.
              </p>

              <Form onSubmit={handleSaveThresholds}>
                <Form.Group className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <Form.Label className="small mb-0">Autonomous Approval Threshold</Form.Label>
                    <span className="font-mono text-primary fw-bold">
                      {(thresholds.auto_approve_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Form.Range
                    min="0.50"
                    max="0.99"
                    step="0.01"
                    value={thresholds.auto_approve_confidence}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, auto_approve_confidence: parseFloat(e.target.value) })
                    }
                  />
                  <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                    Claims classified as "Likely Valid" with confidence ≥ this threshold are auto-approved without manual review.
                  </small>
                </Form.Group>

                <Form.Group className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <Form.Label className="small mb-0">Autonomous Rejection Threshold</Form.Label>
                    <span className="font-mono text-danger fw-bold">
                      {(thresholds.auto_reject_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Form.Range
                    min="0.50"
                    max="0.99"
                    step="0.01"
                    value={thresholds.auto_reject_confidence}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, auto_reject_confidence: parseFloat(e.target.value) })
                    }
                  />
                  <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                    Claims classified as "Likely Invalid" with confidence ≥ this threshold are auto-rejected.
                  </small>
                </Form.Group>

                <Form.Group className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <Form.Label className="small mb-0">Dual-Model Disagreement Escalation Delta</Form.Label>
                    <span className="font-mono text-warning fw-bold">
                      {(thresholds.disagreement_delta_threshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Form.Range
                    min="0.10"
                    max="0.50"
                    step="0.01"
                    value={thresholds.disagreement_delta_threshold}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, disagreement_delta_threshold: parseFloat(e.target.value) })
                    }
                  />
                  <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                    If confidence delta between Tabular AI and Vision AI exceeds this value, claim is flagged for human adjuster review.
                  </small>
                </Form.Group>

                <Button 
                  type="submit" 
                  variant="primary" 
                  className="w-100 py-2"
                  disabled={savingThresholds}
                >
                  {savingThresholds ? 'Saving Configuration...' : 'Save AI Decision Thresholds'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
