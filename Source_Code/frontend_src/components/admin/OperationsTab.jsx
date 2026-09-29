/**
 * OperationsTab.jsx — AssureX Claim Engine
 * Step 5: System Telemetry, Dual-Brain AI Verification,
 * Demo Data Seeding, and Autonomous Decision Threshold Controls.
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Spinner, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { notificationsAPI } from '../../api';
import { 
  FaDatabase, 
  FaBrain, 
  FaSlidersH, 
  FaCheckCircle, 
  FaRedoAlt,
  FaBell,
  FaSyncAlt
} from 'react-icons/fa';

export default function OperationsTab({
  status,
  thresholds,
  setThresholds,
  handleSaveThresholds,
  handleSeedDatabase,
  savingThresholds,
  seeding
}) {
  const [adminNotifs, setAdminNotifs] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const fetchAdminNotifs = async () => {
    try {
      setLoadingNotifs(true);
      const res = await notificationsAPI.getNotifications();
      setAdminNotifs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch admin notifications:', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchAdminNotifs();
  }, []);
  return (
    <Row className="g-4">
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
              <span className="small text-muted">1. Tabular AI (Best Model Classifier):</span>
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
          {/* Centralized Admin Activity & Event Notifications Feed */}
      <Col xs={12} className="mt-2">
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span className="fw-bold d-flex align-items-center gap-2">
              <FaBell className="text-warning" /> Centralized Admin Event Notifications & Audit Feed
            </span>
            <div className="d-flex align-items-center gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={fetchAdminNotifs}
                disabled={loadingNotifs}
                className="d-flex align-items-center gap-1"
              >
                <FaSyncAlt className={loadingNotifs ? 'fa-spin' : ''} size={11} /> Refresh Events
              </Button>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            {loadingNotifs && adminNotifs.length === 0 ? (
              <div className="p-4 text-center text-muted">
                <Spinner animation="border" size="sm" className="me-2" /> Loading admin notifications...
              </div>
            ) : adminNotifs.length === 0 ? (
              <div className="p-4 text-center text-muted">
                No recent admin activity notifications recorded yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-dark-custom mb-0 align-middle">
                  <thead>
                    <tr>
                      <th style={{ width: '180px' }}>Event Type</th>
                      <th>Description & Details</th>
                      <th style={{ width: '180px' }}>Timestamp</th>
                      <th style={{ width: '100px' }} className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminNotifs.slice(0, 30).map((n) => (
                      <tr key={n.id}>
                        <td>
                          <Badge
                            bg={
                              n.type.includes('delete')
                                ? 'danger'
                                : n.type.includes('update')
                                ? 'warning'
                                : n.type.includes('submit') || n.type.includes('register')
                                ? 'success'
                                : 'info'
                            }
                            className="font-mono text-uppercase px-2 py-1"
                            style={{ fontSize: '0.72rem' }}
                          >
                            {n.type}
                          </Badge>
                        </td>
                        <td>
                          <div className="fw-semibold text-white">{n.title}</div>
                          <div className="text-muted small">{n.message}</div>
                        </td>
                        <td className="text-muted font-mono small">
                          {n.created_at ? new Date(n.created_at.includes('Z') ? n.created_at : `${n.created_at}Z`).toLocaleString() : 'Recent'}
                        </td>
                        <td className="text-end">
                          {n.link && (
                            <Link to={n.link} className="btn btn-outline-primary btn-sm py-0 px-2" style={{ fontSize: '0.75rem' }}>
                              View
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
