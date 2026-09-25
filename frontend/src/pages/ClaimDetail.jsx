/**
 * Claim Detail Page — AssureX Claim Engine
 * Full Adjudication Dossier with High-DPI Summary Card, Dual-Brain AI, and Audit Trail
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button, 
  Badge, 
  Spinner, 
  Alert, 
  Modal, 
  Form 
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { claimsAPI } from '../api';
import { 
  FaArrowLeft, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaExclamationTriangle, 
  FaShieldAlt, 
  FaBrain, 
  FaFileContract, 
  FaSearchPlus, 
  FaHistory, 
  FaGavel 
} from 'react-icons/fa';

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Zoom card modal state
  const [showCardModal, setShowCardModal] = useState(false);

  // Reviewer adjudication action state
  const [actionChoice, setActionChoice] = useState('Approve');
  const [actionNotes, setActionNotes] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    loadClaimDossier();
  }, [id]);

  const loadClaimDossier = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await claimsAPI.getClaimDetail(id);
      setDossier(res.data);
    } catch (err) {
      console.error('Failed to load claim detail:', err);
      setError('Could not load claim dossier.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjusterSubmit = async (e) => {
    e.preventDefault();
    setActionSubmitting(true);
    setActionSuccess('');

    try {
      const payload = {
        decision: actionChoice,
        notes: actionNotes,
      };
      await claimsAPI.adjudicateClaim(id, payload);
      setActionSuccess(`Claim successfully updated to ${actionChoice}!`);
      setActionNotes('');
      // Reload updated dossier
      await loadClaimDossier();
    } catch (err) {
      console.error('Adjudication action failed:', err);
      setError(err.response?.data?.detail || 'Failed to submit adjudication action.');
    } finally {
      setActionSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" className="my-5" />
        <h5 className="text-muted">Loading complete claim dossier...</h5>
      </Container>
    );
  }

  if (error || !dossier) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <h5>Error Loading Claim</h5>
          <p>{error || 'Claim dossier not found.'}</p>
          <Button variant="outline-secondary" onClick={() => navigate('/claims')}>
            Back to Claims
          </Button>
        </Alert>
      </Container>
    );
  }

  const { claim, audit_logs, rule_evaluation, decision_reasons, tabular_probabilities, tm_probabilities } = dossier;
  const isReviewerOrAdmin = user?.role === 'reviewer' || user?.role === 'admin';

  // Format image URL
  const cardUrl = claim.card_image_path ? `http://localhost:8000${claim.card_image_path}` : null;

  return (
    <Container fluid className="px-4 py-4">
      {/* Top Navigation & Status Bar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div className="d-flex align-items-center gap-3">
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="d-flex align-items-center gap-1"
          >
            <FaArrowLeft size={12} /> Back
          </Button>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h3 className="fw-extrabold text-white mb-0 font-mono">{claim.claim_id}</h3>
              <span className={`badge-status ${
                claim.adjudication_status === 'Auto-Approved' || claim.adjudication_status === 'Approved'
                  ? 'badge-approved'
                  : claim.adjudication_status === 'Auto-Rejected' || claim.adjudication_status === 'Rejected'
                  ? 'badge-rejected'
                  : 'badge-review'
              }`}>
                {claim.adjudication_status}
              </span>
            </div>
            <small className="text-muted">
              Submitted on {claim.claim_submission_date} • Stage: {claim.adjudication_stage}
            </small>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="text-end d-none d-md-block">
            <div className="text-muted small">Adjudication Confidence</div>
            <div className="fw-extrabold fs-5 text-white font-mono">
              {(claim.final_confidence * 100).toFixed(1)}%
            </div>
          </div>
          <div className="p-2 rounded bg-primary bg-opacity-15 text-primary">
            <FaShieldAlt size={28} />
          </div>
        </div>
      </div>

      {actionSuccess && (
        <Alert variant="success" dismissible onClose={() => setActionSuccess('')} className="mb-4">
          {actionSuccess}
        </Alert>
      )}

      {/* Main Grid */}
      <Row className="g-4">
        {/* Left Column: High-DPI Claim Card & Evidence */}
        <Col lg={5}>
          {/* Card Viewer */}
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span className="fw-bold d-flex align-items-center gap-2">
                <FaFileContract className="text-primary" /> Claim Summary Card
              </span>
              <Badge bg="secondary" className="font-mono text-uppercase" style={{ fontSize: '0.65rem' }}>
                1200 x 1680 High-DPI
              </Badge>
            </Card.Header>
            <Card.Body className="p-3">
              {cardUrl ? (
                <div className="card-preview-container">
                  <img 
                    src={cardUrl} 
                    alt={`Claim Card ${claim.claim_id}`}
                    className="card-preview-image img-fluid"
                    onClick={() => setShowCardModal(true)}
                  />
                  <div className="mt-2 text-center">
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      className="d-inline-flex align-items-center gap-1"
                      onClick={() => setShowCardModal(true)}
                    >
                      <FaSearchPlus size={12} /> Click to Inspect High-Res Card
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-muted">
                  No Claim Summary Card generated for this record.
                </div>
              )}
              <div className="mt-3 p-2 rounded bg-surface border border-subtle small text-muted">
                🛡️ <strong>Zero-Prediction Guarantee:</strong> Card contains exclusively factual claim metadata without labels, predictions, or scores to prevent neural model leakage.
              </div>
            </Card.Body>
          </Card>

          {/* Audit Trail Timeline */}
          <Card>
            <Card.Header className="d-flex align-items-center gap-2">
              <FaHistory className="text-info" /> Audit Trail & History
            </Card.Header>
            <Card.Body className="p-3">
              <div className="timeline">
                {audit_logs && audit_logs.length > 0 ? (
                  audit_logs.map((log) => (
                    <div key={log.id} className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="d-flex justify-content-between">
                        <strong className="text-light small">{log.action}</strong>
                        <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                        </span>
                      </div>
                      <div className="text-muted small mt-1">{log.details}</div>
                      <small className="text-primary font-mono" style={{ fontSize: '0.68rem' }}>
                        Actor: {log.actor}
                      </small>
                    </div>
                  ))
                ) : (
                  <p className="text-muted small mb-0">No audit history entries recorded.</p>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column: AI Engine, Rule Checklist, and Adjuster Controls */}
        <Col lg={7}>
          {/* Dual-Brain AI Model Arbitration */}
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span className="fw-bold d-flex align-items-center gap-2">
                <FaBrain className="text-purple" style={{ color: '#a78bfa' }} />
                Dual-Brain AI Model Arbitration
              </span>
              {claim.models_agreed ? (
                <span className="pill-agreed d-inline-flex align-items-center gap-1">
                  <FaCheckCircle size={10} /> Dual-Model Consensus
                </span>
              ) : (
                <span className="pill-disagreed d-inline-flex align-items-center gap-1">
                  <FaExclamationTriangle size={10} /> Disagreement Flagged
                </span>
              )}
            </Card.Header>
            <Card.Body className="p-3">
              {/* Decision Reason Summary Banner */}
              <div className="p-3 rounded mb-3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                <div className="fw-bold text-white small mb-1">Adjudication Rationale</div>
                <div className="text-light small">{claim.decision_reason_summary}</div>
              </div>

              {/* Model Comparison Grid */}
              <Row className="g-3 mb-3">
                {/* Tabular Model */}
                <Col sm={6}>
                  <div className="p-3 rounded h-100" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className="text-muted fw-bold text-uppercase">1. Tabular AI (XGBoost)</small>
                      <Badge bg="primary" className="font-mono">{(claim.tabular_confidence * 100).toFixed(1)}%</Badge>
                    </div>
                    <div className="fw-bold text-white fs-6 mb-2">
                      {claim.tabular_prediction}
                    </div>

                    {/* Probability Bars */}
                    {tabular_probabilities && (
                      <div className="small">
                        {Object.entries(tabular_probabilities).map(([label, prob]) => (
                          <div key={label} className="mb-1">
                            <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.72rem' }}>
                              <span>{label}</span>
                              <span className="font-mono">{(prob * 100).toFixed(1)}%</span>
                            </div>
                            <div className="progress" style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                              <div 
                                className={`progress-bar ${label === claim.tabular_prediction ? 'bg-primary' : 'bg-secondary'}`}
                                style={{ width: `${prob * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Col>

                {/* Vision / Teachable Machine */}
                <Col sm={6}>
                  <div className="p-3 rounded h-100" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className="text-muted fw-bold text-uppercase">2. Vision AI (MobileNetV2)</small>
                      <Badge bg="info" className="font-mono text-dark">{(claim.tm_confidence * 100).toFixed(1)}%</Badge>
                    </div>
                    <div className="fw-bold text-white fs-6 mb-2">
                      {claim.tm_prediction}
                    </div>

                    {/* Probability Bars */}
                    {tm_probabilities && (
                      <div className="small">
                        {Object.entries(tm_probabilities).map(([label, prob]) => (
                          <div key={label} className="mb-1">
                            <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.72rem' }}>
                              <span>{label}</span>
                              <span className="font-mono">{(prob * 100).toFixed(1)}%</span>
                            </div>
                            <div className="progress" style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                              <div 
                                className={`progress-bar ${label === claim.tm_prediction ? 'bg-info' : 'bg-secondary'}`}
                                style={{ width: `${prob * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Col>
              </Row>

              {/* Confidence Difference Meter */}
              <div className="p-2 rounded bg-surface border border-subtle d-flex justify-content-between align-items-center small">
                <span className="text-muted">Confidence Delta between models:</span>
                <span className="font-mono fw-bold text-light">
                  {claim.confidence_difference ? (claim.confidence_difference * 100).toFixed(2) : 0.00}%
                </span>
              </div>
            </Card.Body>
          </Card>

          {/* Deterministic Business Rule Checklist */}
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span className="fw-bold d-flex align-items-center gap-2">
                <FaFileContract className="text-warning" /> Deterministic Business Rules
              </span>
              <span className="text-muted small">8-Point Verification</span>
            </Card.Header>
            <Card.Body className="p-3">
              <div className="list-group list-group-flush">
                {/* 1. Date Contradiction */}
                <div className="list-group-item bg-transparent border-subtle px-0 py-2 d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-light small fw-semibold">Chronological Date Validity</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Purchase ({claim.purchase_date}) ≤ Fault ({claim.fault_date}) ≤ Submission ({claim.claim_submission_date})
                    </div>
                  </div>
                  <div>
                    {!claim.date_contradiction_flag ? (
                      <span className="text-success small fw-bold d-flex align-items-center gap-1">
                        <FaCheckCircle /> Pass
                      </span>
                    ) : (
                      <span className="text-danger small fw-bold d-flex align-items-center gap-1">
                        <FaTimesCircle /> Contradiction
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Warranty Window */}
                <div className="list-group-item bg-transparent border-subtle px-0 py-2 d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-light small fw-semibold">Warranty Expiration Window</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Remaining Days: {claim.remaining_warranty_days} (7-Day Grace Period Active)
                    </div>
                  </div>
                  <div>
                    {claim.remaining_warranty_days >= -7 ? (
                      <span className="text-success small fw-bold d-flex align-items-center gap-1">
                        <FaCheckCircle /> Valid Window
                      </span>
                    ) : (
                      <span className="text-danger small fw-bold d-flex align-items-center gap-1">
                        <FaTimesCircle /> Expired
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Serial Reconciliation */}
                <div className="list-group-item bg-transparent border-subtle px-0 py-2 d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-light small fw-semibold">Hardware Serial Reconciliation</div>
                    <div className="text-muted font-mono" style={{ fontSize: '0.72rem' }}>
                      Entered: {claim.serial_number_entered} | Receipt: {claim.serial_number_on_receipt || 'None'}
                    </div>
                  </div>
                  <div>
                    {!claim.serial_mismatch_flag ? (
                      <span className="text-success small fw-bold d-flex align-items-center gap-1">
                        <FaCheckCircle /> Match
                      </span>
                    ) : (
                      <span className="text-danger small fw-bold d-flex align-items-center gap-1">
                        <FaTimesCircle /> Mismatch
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Excluded Damage */}
                <div className="list-group-item bg-transparent border-subtle px-0 py-2 d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-light small fw-semibold">Policy Damage Exclusions</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Reported: {claim.damage_type}
                    </div>
                  </div>
                  <div>
                    {!claim.excluded_damage ? (
                      <span className="text-success small fw-bold d-flex align-items-center gap-1">
                        <FaCheckCircle /> Covered
                      </span>
                    ) : (
                      <span className="text-danger small fw-bold d-flex align-items-center gap-1">
                        <FaTimesCircle /> Excluded
                      </span>
                    )}
                  </div>
                </div>

                {/* 5. Unauthorized Repairs */}
                <div className="list-group-item bg-transparent border-subtle px-0 py-2 d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-light small fw-semibold">Repair Authorization History</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Prior Repairs: {claim.repair_history_count}
                    </div>
                  </div>
                  <div>
                    {claim.previous_repair_authorized ? (
                      <span className="text-success small fw-bold d-flex align-items-center gap-1">
                        <FaCheckCircle /> Authorized
                      </span>
                    ) : (
                      <span className="text-danger small fw-bold d-flex align-items-center gap-1">
                        <FaTimesCircle /> Unauthorized Void
                      </span>
                    )}
                  </div>
                </div>

                {/* 6. Document Completeness */}
                <div className="list-group-item bg-transparent border-subtle px-0 py-2 d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-light small fw-semibold">Mandatory Evidence Uploads</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Receipt: {claim.receipt_uploaded ? '✅' : '❌'} | Warranty Card: {claim.warranty_card_uploaded ? '✅' : '❌'} | Image: {claim.product_image_uploaded ? '✅' : '❌'}
                    </div>
                  </div>
                  <div>
                    {claim.missing_doc_count === 0 ? (
                      <span className="text-success small fw-bold d-flex align-items-center gap-1">
                        <FaCheckCircle /> Complete (0 Missing)
                      </span>
                    ) : (
                      <span className="text-warning small fw-bold d-flex align-items-center gap-1">
                        <FaExclamationTriangle /> {claim.missing_doc_count} Missing
                      </span>
                    )}
                  </div>
                </div>

                {/* 7. Duplicate Claim Check */}
                <div className="list-group-item bg-transparent border-subtle px-0 py-2 d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-light small fw-semibold">Duplicate Submission Verification</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Cross-checked against claim database
                    </div>
                  </div>
                  <div>
                    {!claim.duplicate_claim_flag ? (
                      <span className="text-success small fw-bold d-flex align-items-center gap-1">
                        <FaCheckCircle /> Unique Claim
                      </span>
                    ) : (
                      <span className="text-danger small fw-bold d-flex align-items-center gap-1">
                        <FaTimesCircle /> Duplicate Detected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Adjuster Action Panel (Reviewer / Admin only) */}
          {isReviewerOrAdmin && (
            <Card className="border-primary border-opacity-50">
              <Card.Header className="d-flex align-items-center gap-2 bg-primary bg-opacity-10 text-white">
                <FaGavel className="text-primary" /> Adjuster Adjudication Override Panel
              </Card.Header>
              <Card.Body className="p-3">
                <Form onSubmit={handleAdjusterSubmit}>
                  <Row className="g-3 mb-3">
                    <Col sm={6}>
                      <Form.Label className="small text-muted mb-1">Select Human Adjudication Decision</Form.Label>
                      <Form.Select 
                        value={actionChoice} 
                        onChange={(e) => setActionChoice(e.target.value)}
                        required
                      >
                        <option value="Approve">Approve Claim</option>
                        <option value="Reject">Reject Claim</option>
                        <option value="Request Information">Request Further Information</option>
                      </Form.Select>
                    </Col>
                    <Col sm={6}>
                      <Form.Label className="small text-muted mb-1">Reviewer Identity</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={`${user.full_name} (${user.role})`} 
                        disabled 
                      />
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="small text-muted mb-1">Adjuster Notes & Audit Rationale</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Enter legal/audit reasoning for overriding or confirming this adjudication decision..."
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                    />
                  </Form.Group>

                  <div className="d-flex justify-content-end">
                    <Button 
                      type="submit" 
                      variant="primary" 
                      disabled={actionSubmitting}
                      className="d-flex align-items-center gap-2"
                    >
                      {actionSubmitting ? (
                        <>
                          <Spinner animation="border" size="sm" /> Recording Decision...
                        </>
                      ) : (
                        <>
                          <FaGavel /> Commit Adjudication Decision
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      {/* High-Res Card Zoom Modal */}
      <Modal 
        show={showCardModal} 
        onHide={() => setShowCardModal(false)} 
        size="xl" 
        centered
        contentClassName="bg-dark text-white border-subtle"
      >
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title className="font-mono">
            {claim.claim_id} — High-DPI Claim Summary Card (1200 x 1680)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-3">
          {cardUrl && (
            <img 
              src={cardUrl} 
              alt="High-DPI Claim Summary Card" 
              className="img-fluid rounded" 
              style={{ maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-between border-subtle">
          <small className="text-muted">
            Rendered with zero prediction data per competition requirements
          </small>
          <Button variant="secondary" onClick={() => setShowCardModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
