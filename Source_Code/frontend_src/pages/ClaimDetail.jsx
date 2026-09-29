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
  FaGavel,
  FaImage,
  FaVideo,
  FaBarcode,
  FaFingerprint,
  FaCertificate,
  FaFilePdf,
  FaDownload,
  FaExchangeAlt,
  FaTrash
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
  const [evidencePreview, setEvidencePreview] = useState(null);

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

  const handleExportHTML = async () => {
    try {
      const res = await claimsAPI.exportHTML(id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/html' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `claim_dossier_${id}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export HTML dossier:', err);
    }
  };

  const handleDeleteClaim = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete claim ${id}? This action cannot be undone.`)) {
      return;
    }
    try {
      await claimsAPI.deleteClaim(id);
      navigate('/claims');
    } catch (err) {
      console.error('Failed to delete claim:', err);
      setError(err.response?.data?.detail || 'Failed to delete claim.');
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
  const crossVerification = dossier.cross_verification || (claim.cross_verification_json ? JSON.parse(claim.cross_verification_json) : null);
  const isReviewerOrAdmin = user?.role === 'reviewer' || user?.role === 'admin';
  const canDeleteClaim = user?.role !== 'viewer' && (
    user?.role === 'admin' || 
    (user?.role === 'customer' && !['Auto-Approved', 'Approved', 'Auto-Rejected', 'Rejected'].includes(claim.adjudication_status))
  );

  // Format image & media URLs
  const resolveMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanPath = path.replace(/\\/g, '/');
    const leading = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
    return `http://localhost:8000/${leading}`;
  };

  const cardUrl = claim.card_image_path ? `http://localhost:8000${claim.card_image_path}` : null;
  const faultPhotoUrl = resolveMediaUrl(claim.fault_evidence_path);
  const faultVideoUrl = resolveMediaUrl(claim.fault_video_path);
  const barcodePhotoUrl = resolveMediaUrl(claim.barcode_image_path);
  const receiptDocUrl = resolveMediaUrl(claim.receipt_path);
  const warrantyCardUrl = resolveMediaUrl(claim.warranty_card_path);

  const hasAnyEvidence = Boolean(faultPhotoUrl || faultVideoUrl || barcodePhotoUrl || receiptDocUrl || warrantyCardUrl);

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
          {(user?.role === 'reviewer' || user?.role === 'admin' || user?.role === 'employee') && (
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={handleExportHTML}
              className="d-flex align-items-center gap-1"
            >
              <FaDownload /> Export Dossier
            </Button>
          )}
          {canDeleteClaim && (
            <Button 
              variant="outline-danger" 
              size="sm"
              onClick={handleDeleteClaim}
              className="d-flex align-items-center gap-1"
            >
              <FaTrash /> Delete Claim
            </Button>
          )}
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

          {/* Evidence Media & Document Integrity Card (Task 1) */}
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span className="fw-bold d-flex align-items-center gap-2">
                <FaShieldAlt className="text-info" /> Cryptographic Evidence Media
              </span>
              <Badge bg="dark" className="border border-secondary text-info fw-normal" style={{ fontSize: '0.65rem' }}>
                SHA-256 Verified
              </Badge>
            </Card.Header>
            <Card.Body className="p-3">
              {!hasAnyEvidence ? (
                <div className="text-center py-3 text-muted small">
                  No additional physical evidence files attached to this claim intake.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {/* Fault / Damage Photo */}
                  {faultPhotoUrl && (
                    <div className="p-2 rounded bg-surface border border-secondary border-opacity-25">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small text-light fw-semibold d-flex align-items-center gap-2">
                          <FaImage className="text-warning" /> Fault / Damage Photo
                        </span>
                        <Badge bg="success" style={{ fontSize: '0.65rem' }}>
                          <FaCheckCircle size={8} className="me-1" /> Attached
                        </Badge>
                      </div>
                      <div className="d-flex align-items-center gap-3 mt-2">
                        <img 
                          src={faultPhotoUrl} 
                          alt="Fault Evidence"
                          className="rounded border border-secondary border-opacity-25"
                          style={{ width: '70px', height: '70px', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => setEvidencePreview({ url: faultPhotoUrl, title: 'Fault / Damage Photo Evidence', type: 'image' })}
                        />
                        <div className="flex-grow-1 overflow-hidden">
                          <div className="text-truncate text-white small" title={claim.fault_evidence_path}>
                            {claim.fault_evidence_path.split(/[\\/]/).pop()}
                          </div>
                          {claim.fault_evidence_hash && (
                            <div className="text-truncate text-info font-mono mt-1" style={{ fontSize: '0.68rem' }} title={claim.fault_evidence_hash}>
                              <FaFingerprint size={10} className="me-1" />
                              SHA-256: {claim.fault_evidence_hash}
                            </div>
                          )}
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 text-decoration-none text-primary mt-1 small"
                            style={{ fontSize: '0.72rem' }}
                            onClick={() => setEvidencePreview({ url: faultPhotoUrl, title: 'Fault / Damage Photo Evidence', type: 'image' })}
                          >
                            <FaSearchPlus size={10} className="me-1" /> View Full Resolution
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fault / Damage Video */}
                  {faultVideoUrl && (
                    <div className="p-2 rounded bg-surface border border-secondary border-opacity-25">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small text-light fw-semibold d-flex align-items-center gap-2">
                          <FaVideo className="text-danger" /> Fault / Damage Video
                        </span>
                        <Badge bg="success" style={{ fontSize: '0.65rem' }}>
                          <FaCheckCircle size={8} className="me-1" /> Attached
                        </Badge>
                      </div>
                      <video 
                        controls 
                        src={faultVideoUrl}
                        className="w-100 rounded mb-2 border border-secondary border-opacity-25"
                        style={{ maxHeight: '180px', backgroundColor: '#000' }}
                      />
                      <div className="overflow-hidden">
                        <div className="text-truncate text-white small" title={claim.fault_video_path}>
                          {claim.fault_video_path.split(/[\\/]/).pop()}
                        </div>
                        {claim.fault_video_hash && (
                          <div className="text-truncate text-info font-mono mt-1" style={{ fontSize: '0.68rem' }} title={claim.fault_video_hash}>
                            <FaFingerprint size={10} className="me-1" />
                            SHA-256: {claim.fault_video_hash}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Product Photo with Barcode */}
                  {barcodePhotoUrl && (
                    <div className="p-2 rounded bg-surface border border-secondary border-opacity-25">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small text-light fw-semibold d-flex align-items-center gap-2">
                          <FaBarcode className="text-info" /> Product & Barcode Photo
                        </span>
                        <Badge bg="success" style={{ fontSize: '0.65rem' }}>
                          <FaCheckCircle size={8} className="me-1" /> Attached
                        </Badge>
                      </div>
                      <div className="d-flex align-items-center gap-3 mt-2">
                        <img 
                          src={barcodePhotoUrl} 
                          alt="Barcode Evidence"
                          className="rounded border border-secondary border-opacity-25"
                          style={{ width: '70px', height: '70px', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => setEvidencePreview({ url: barcodePhotoUrl, title: 'Product & Barcode Photo', type: 'image' })}
                        />
                        <div className="flex-grow-1 overflow-hidden">
                          <div className="text-truncate text-white small" title={claim.barcode_image_path}>
                            {claim.barcode_image_path.split(/[\\/]/).pop()}
                          </div>
                          {claim.barcode_image_hash && (
                            <div className="text-truncate text-info font-mono mt-1" style={{ fontSize: '0.68rem' }} title={claim.barcode_image_hash}>
                              <FaFingerprint size={10} className="me-1" />
                              SHA-256: {claim.barcode_image_hash}
                            </div>
                          )}
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 text-decoration-none text-primary mt-1 small"
                            style={{ fontSize: '0.72rem' }}
                            onClick={() => setEvidencePreview({ url: barcodePhotoUrl, title: 'Product & Barcode Photo', type: 'image' })}
                          >
                            <FaSearchPlus size={10} className="me-1" /> View Full Resolution
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Purchase Receipt Document */}
                  {receiptDocUrl && (
                    <div className="p-2 rounded bg-surface border border-secondary border-opacity-25">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small text-light fw-semibold d-flex align-items-center gap-2">
                          <FaFileContract className="text-primary" /> Purchase Receipt / Invoice
                        </span>
                        <Badge bg="success" style={{ fontSize: '0.65rem' }}>
                          <FaCheckCircle size={8} className="me-1" /> Attached
                        </Badge>
                      </div>
                      <div className="d-flex align-items-center gap-3 mt-2">
                        <img 
                          src={receiptDocUrl} 
                          alt="Purchase Receipt"
                          className="rounded border border-secondary border-opacity-25"
                          style={{ width: '70px', height: '70px', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => setEvidencePreview({ url: receiptDocUrl, title: 'Purchase Receipt Document', type: 'image' })}
                        />
                        <div className="flex-grow-1 overflow-hidden">
                          <div className="text-truncate text-white small" title={claim.receipt_path}>
                            {claim.receipt_path.split(/[\\/]/).pop()}
                          </div>
                          {claim.receipt_hash && (
                            <div className="text-truncate text-info font-mono mt-1" style={{ fontSize: '0.68rem' }} title={claim.receipt_hash}>
                              <FaFingerprint size={10} className="me-1" />
                              SHA-256: {claim.receipt_hash}
                            </div>
                          )}
                          {claim.invoice_number && (
                            <div className="text-truncate text-white font-mono mt-1" style={{ fontSize: '0.70rem' }}>
                              Invoice #: <strong>{claim.invoice_number}</strong>
                            </div>
                          )}
                          <div className="d-flex align-items-center gap-3 mt-1">
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="p-0 text-decoration-none text-primary small"
                              style={{ fontSize: '0.72rem' }}
                              onClick={() => setEvidencePreview({ 
                                url: receiptDocUrl, 
                                title: 'Purchase Receipt Document', 
                                isPdf: Boolean(claim.receipt_path?.toLowerCase().endsWith('.pdf'))
                              })}
                            >
                              <FaSearchPlus size={10} className="me-1" /> View Full Resolution
                            </Button>
                            <a
                              href={receiptDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="text-decoration-none text-info small d-flex align-items-center gap-1"
                              style={{ fontSize: '0.72rem' }}
                            >
                              <FaDownload size={9} /> Download
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Official Warranty Certificate / Card */}
                  {warrantyCardUrl && (
                    <div className="p-2 rounded bg-surface border border-secondary border-opacity-25">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small text-light fw-semibold d-flex align-items-center gap-2">
                          <FaCertificate className="text-warning" /> Warranty Certificate / Card
                        </span>
                        <Badge bg="success" style={{ fontSize: '0.65rem' }}>
                          <FaCheckCircle size={8} className="me-1" /> Attached
                        </Badge>
                      </div>
                      <div className="d-flex align-items-center gap-3 mt-2">
                        {claim.warranty_card_path?.toLowerCase().endsWith('.pdf') ? (
                          <div 
                            className="rounded border border-secondary border-opacity-25 d-flex align-items-center justify-content-center bg-dark"
                            style={{ width: '70px', height: '70px', cursor: 'pointer' }}
                            onClick={() => setEvidencePreview({ url: warrantyCardUrl, title: 'Warranty Certificate / Card', isPdf: true })}
                          >
                            <FaFilePdf size={32} className="text-danger" />
                          </div>
                        ) : (
                          <img 
                            src={warrantyCardUrl} 
                            alt="Warranty Certificate / Card"
                            className="rounded border border-secondary border-opacity-25"
                            style={{ width: '70px', height: '70px', objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => setEvidencePreview({ url: warrantyCardUrl, title: 'Warranty Certificate / Card', isPdf: false })}
                          />
                        )}
                        <div className="flex-grow-1 overflow-hidden">
                          <div className="text-truncate text-white small" title={claim.warranty_card_path}>
                            {claim.warranty_card_path.split(/[\\/]/).pop()}
                          </div>
                          {claim.warranty_card_hash && (
                            <div className="text-truncate text-info font-mono mt-1" style={{ fontSize: '0.68rem' }} title={claim.warranty_card_hash}>
                              <FaFingerprint size={10} className="me-1" />
                              SHA-256: {claim.warranty_card_hash}
                            </div>
                          )}
                          <div className="d-flex align-items-center gap-3 mt-1">
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="p-0 text-decoration-none text-primary small"
                              style={{ fontSize: '0.72rem' }}
                              onClick={() => setEvidencePreview({ 
                                url: warrantyCardUrl, 
                                title: 'Warranty Certificate / Card', 
                                isPdf: Boolean(claim.warranty_card_path?.toLowerCase().endsWith('.pdf'))
                              })}
                            >
                              <FaSearchPlus size={10} className="me-1" /> View Document
                            </Button>
                            <a
                              href={warrantyCardUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="text-decoration-none text-info small d-flex align-items-center gap-1"
                              style={{ fontSize: '0.72rem' }}
                            >
                              <FaDownload size={9} /> Download
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
          {/* AI-Generated Narrative Summary (Task 2/FR xxxii) */}
          {dossier.narrative_summary && (
            <Card className="mb-4">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <span className="fw-bold d-flex align-items-center gap-2">
                  <FaBrain className="text-info" /> AI-Generated Claim Summary
                </span>
                <Badge bg="info" className="font-mono text-uppercase" style={{ fontSize: '0.65rem' }}>
                  Auto-Narrative
                </Badge>
              </Card.Header>
              <Card.Body className="p-3">
                <p className="text-light mb-0" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {dossier.narrative_summary}
                </p>
              </Card.Body>
            </Card>
          )}

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

                {/* 3. Serial & Model Reconciliation (Cross-Document Verification) */}
                <div className="list-group-item bg-transparent border-subtle px-0 py-2 d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-light small fw-semibold">Cross-Document Serial & Model Verification</div>
                    <div className="text-muted font-mono" style={{ fontSize: '0.72rem' }}>
                      Entered SN: {claim.serial_number_entered || 'None'} | Model: {claim.model_number || 'None'}
                      {claim.serial_number_on_receipt && ` • Receipt SN: ${claim.serial_number_on_receipt}`}
                      {claim.serial_number_on_warranty_card && ` • Card SN: ${claim.serial_number_on_warranty_card}`}
                      {claim.serial_number_on_barcode && ` • Barcode SN: ${claim.serial_number_on_barcode}`}
                    </div>
                  </div>
                  <div>
                    {!claim.serial_mismatch_flag ? (
                      <span className="text-success small fw-bold d-flex align-items-center gap-1">
                        <FaCheckCircle /> Verified Match
                      </span>
                    ) : (
                      <span className="text-danger small fw-bold d-flex align-items-center gap-1">
                        <FaTimesCircle /> Mismatch Flagged
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
                <div className="list-group-item bg-transparent border-subtle px-0 py-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="text-light small fw-semibold">Duplicate Submission Verification</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        Semantic fault & cryptographic hash cross-check against prior claims
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
                  {claim.duplicate_claim_flag && claim.duplicate_claim_details && (
                    <div className="mt-2 p-2 rounded bg-danger bg-opacity-10 border border-danger border-opacity-25 text-danger small" style={{ fontSize: '0.74rem' }}>
                      <FaExclamationTriangle className="me-1" />
                      <strong>Flag Details:</strong> {claim.duplicate_claim_details}
                    </div>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Cross-Document Serial & Model Verification Matrix Card (Task 2) */}
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span className="fw-bold d-flex align-items-center gap-2">
                <FaExchangeAlt className="text-info" /> Cross-Document Serial & Model Verification Matrix
              </span>
              {claim.serial_mismatch_flag || crossVerification?.has_mismatch ? (
                <Badge bg="danger" className="d-inline-flex align-items-center gap-1">
                  <FaExclamationTriangle size={10} /> Discrepancy Flagged
                </Badge>
              ) : (
                <Badge bg="success" className="d-inline-flex align-items-center gap-1">
                  <FaCheckCircle size={10} /> Verified Consistent
                </Badge>
              )}
            </Card.Header>
            <Card.Body className="p-3">
              <div className="table-responsive rounded border border-secondary border-opacity-25 mb-3">
                <table className="table table-dark table-sm table-hover mb-0" style={{ fontSize: '0.74rem' }}>
                  <thead>
                    <tr className="text-secondary bg-black bg-opacity-40">
                      <th className="py-2 px-3">Evidence Source</th>
                      <th className="py-2 px-3">Serial Number</th>
                      <th className="py-2 px-3">Model Number</th>
                      <th className="py-2 px-3 text-end">Reconciliation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-3 fw-semibold text-light">Entered Claim Form</td>
                      <td className="py-2 px-3 font-mono text-info fw-bold">{claim.serial_number_entered || '—'}</td>
                      <td className="py-2 px-3 font-mono text-warning fw-bold">{claim.model_number || '—'}</td>
                      <td className="py-2 px-3 text-end"><Badge bg="primary">Entered Baseline</Badge></td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 fw-semibold text-light">Purchase Receipt (OCR)</td>
                      <td className="py-2 px-3 font-mono">{claim.serial_number_on_receipt || <span className="text-muted italic">Not Scanned</span>}</td>
                      <td className="py-2 px-3 font-mono">{claim.model_number_on_receipt || <span className="text-muted italic">Not Scanned</span>}</td>
                      <td className="py-2 px-3 text-end">
                        {!claim.serial_number_on_receipt && !claim.model_number_on_receipt ? (
                          <Badge bg="dark" className="border border-secondary text-muted">Awaiting Scan</Badge>
                        ) : crossVerification?.mismatches?.some(m => m.source_b === 'Receipt' || m.source_a === 'Receipt') ? (
                          <Badge bg="danger">Mismatch</Badge>
                        ) : (
                          <Badge bg="success">Reconciled</Badge>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 fw-semibold text-light">Warranty Certificate / Card</td>
                      <td className="py-2 px-3 font-mono">{claim.serial_number_on_warranty_card || <span className="text-muted italic">Not Scanned</span>}</td>
                      <td className="py-2 px-3 font-mono">{claim.model_number_on_warranty_card || <span className="text-muted italic">Not Scanned</span>}</td>
                      <td className="py-2 px-3 text-end">
                        {!claim.serial_number_on_warranty_card && !claim.model_number_on_warranty_card ? (
                          <Badge bg="dark" className="border border-secondary text-muted">Awaiting Scan</Badge>
                        ) : crossVerification?.mismatches?.some(m => m.source_b === 'Warranty Card' || m.source_a === 'Warranty Card') ? (
                          <Badge bg="danger">Mismatch</Badge>
                        ) : (
                          <Badge bg="success">Reconciled</Badge>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 fw-semibold text-light">Barcode / Product Photo</td>
                      <td className="py-2 px-3 font-mono">{claim.serial_number_on_barcode || <span className="text-muted italic">Not Scanned</span>}</td>
                      <td className="py-2 px-3 font-mono">{claim.model_number_on_barcode || <span className="text-muted italic">Not Scanned</span>}</td>
                      <td className="py-2 px-3 text-end">
                        {!claim.serial_number_on_barcode && !claim.model_number_on_barcode ? (
                          <Badge bg="dark" className="border border-secondary text-muted">Awaiting Scan</Badge>
                        ) : crossVerification?.mismatches?.some(m => m.source_b === 'Barcode / Product Photo' || m.source_a === 'Barcode / Product Photo') ? (
                          <Badge bg="danger">Mismatch</Badge>
                        ) : (
                          <Badge bg="success">Reconciled</Badge>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mismatch Alerts if any */}
              {crossVerification?.mismatches && crossVerification.mismatches.length > 0 && (
                <div className="p-2 rounded bg-danger bg-opacity-10 border border-danger border-opacity-25 text-danger small">
                  <div className="fw-bold d-flex align-items-center gap-2 mb-1">
                    <FaExclamationTriangle /> Discrepancy flags detected during claim adjudication:
                  </div>
                  <ul className="mb-0 ps-3">
                    {crossVerification.mismatches.map((m, idx) => (
                      <li key={idx} style={{ fontSize: '0.72rem' }}>{m.message || m}</li>
                    ))}
                  </ul>
                </div>
              )}
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

      {/* Evidence Full-Res Zoom Modal */}
      <Modal 
        show={Boolean(evidencePreview)} 
        onHide={() => setEvidencePreview(null)} 
        size="lg" 
        centered
        contentClassName="bg-dark text-white border-subtle"
      >
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title className="font-mono fs-6">
            {evidencePreview?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-3">
          {evidencePreview?.url && (
            evidencePreview.isPdf ? (
              <div style={{ height: '70vh' }}>
                <iframe 
                  src={evidencePreview.url} 
                  title={evidencePreview.title} 
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: '4px' }} 
                />
              </div>
            ) : (
              <img 
                src={evidencePreview.url} 
                alt={evidencePreview.title} 
                className="img-fluid rounded border border-secondary border-opacity-25" 
                style={{ maxHeight: '75vh', objectFit: 'contain' }}
              />
            )
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-between border-subtle">
          <small className="text-muted font-mono" style={{ fontSize: '0.72rem' }}>
            Chain of Custody Document Viewer
          </small>
          <div className="d-flex align-items-center gap-2">
            {evidencePreview?.url && (
              <Button 
                variant="outline-info" 
                size="sm" 
                as="a" 
                href={evidencePreview.url} 
                target="_blank" 
                rel="noopener noreferrer"
                download
                className="d-flex align-items-center gap-1"
              >
                <FaDownload size={11} /> Download Original
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setEvidencePreview(null)}>
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
