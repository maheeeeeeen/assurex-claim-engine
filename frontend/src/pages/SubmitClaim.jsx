/**
 * Submit Claim Page — AssureX Claim Engine
 * Interactive Multi-Step Intake Wizard with OCR Document Scanning & Instant Dual-Brain AI Adjudication
 */

import { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Form, 
  Button, 
  Alert, 
  Spinner, 
  Badge, 
  Modal 
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { claimsAPI, productsAPI } from '../api';
import { 
  FaShieldAlt, 
  FaUpload, 
  FaBrain, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaExclamationTriangle, 
  FaFileAlt, 
  FaEye 
} from 'react-icons/fa';

export default function SubmitClaim() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // OCR state
  const [receiptFile, setReceiptFile] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  // Result modal state
  const [adjudicationResult, setAdjudicationResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    product_name: 'Samsung 4K Smart TV',
    product_category: 'Electronics',
    brand: 'Samsung',
    model_number: 'QN65Q80B',
    serial_number_entered: 'SN-SAMS-9021',
    purchase_price: 1299.99,
    retailer: 'Best Buy',
    purchase_date: '2025-01-15',
    warranty_start: '2025-01-15',
    warranty_end: '2027-01-15',
    warranty_provider: 'Manufacturer Extended Care',
    warranty_type: 'Extended Warranty',
    fault_date: '2026-03-10',
    fault_type: 'Display Artifacts',
    damage_type: 'Internal Component Failure',
    fault_description: 'Screen displays vertical green line and flickers during operation.',
    repair_history_count: 0,
    previous_repair_authorized: true,
    receipt_uploaded: true,
    warranty_card_uploaded: true,
    product_image_uploaded: true,
    fault_evidence_uploaded: true,
    repair_report_uploaded: false,
  });

  useEffect(() => {
    // Fetch products catalog for quick selection
    const loadProducts = async () => {
      try {
        const res = await productsAPI.getProducts();
        setProducts(res.data || []);
      } catch (err) {
        console.error('Failed to load products list:', err);
      }
    };
    loadProducts();
  }, []);

  const handleProductSelect = (e) => {
    const pid = e.target.value;
    setSelectedProductId(pid);
    if (!pid) return;

    const prod = products.find((p) => p.product_id === pid);
    if (prod) {
      setFormData((prev) => ({
        ...prev,
        product_name: prod.name,
        product_category: prod.category,
        brand: prod.brand,
        model_number: prod.model_number,
        serial_number_entered: prod.serial_number || prev.serial_number_entered,
        purchase_price: prod.purchase_price || prev.purchase_price,
        retailer: prod.retailer || prev.retailer,
        purchase_date: prod.purchase_date || prev.purchase_date,
        warranty_start: prod.purchase_date || prev.warranty_start,
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Live OCR File Processing
  const handleReceiptFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setReceiptFile(file);
    setFormData((prev) => ({ ...prev, receipt_uploaded: true }));

    // Send for OCR pre-processing
    setOcrLoading(true);
    setOcrResult(null);
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await claimsAPI.processOCR(data);
      setOcrResult(res.data);

      // Auto-populate extracted serial number if found
      if (res.data.detected_serials && res.data.detected_serials.length > 0) {
        setFormData((prev) => ({
          ...prev,
          serial_number_entered: res.data.detected_serials[0],
        }));
      }
    } catch (err) {
      console.error('OCR Processing error:', err);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        purchase_price: parseFloat(formData.purchase_price) || 0.0,
        repair_history_count: parseInt(formData.repair_history_count, 10) || 0,
      };

      const res = await claimsAPI.submitClaim(payload);
      setAdjudicationResult(res.data);
      setShowResultModal(true);
    } catch (err) {
      console.error('Failed to submit claim:', err);
      setError(err.response?.data?.detail || 'Claim submission failed. Please verify all inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container fluid className="px-4 py-4">
      {/* Title */}
      <div className="mb-4">
        <h2 className="fw-extrabold text-white mb-1">Warranty Claim Intake Portal</h2>
        <p className="text-muted small mb-0">
          Enter product details, upload purchase documentation, and trigger instant dual-model AI adjudication
        </p>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Row className="g-4">
          {/* Left Column: Product & Incident Information */}
          <Col lg={8}>
            {/* Step 1: Product Identification */}
            <Card className="mb-4">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">1. Product Identification</span>
                {products.length > 0 && (
                  <div className="d-flex align-items-center gap-2">
                    <small className="text-muted">Or pick catalog product:</small>
                    <Form.Select 
                      size="sm" 
                      style={{ width: 220 }}
                      value={selectedProductId}
                      onChange={handleProductSelect}
                    >
                      <option value="">Manual Entry</option>
                      {products.map((p) => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.name} ({p.brand})
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                )}
              </Card.Header>
              <Card.Body className="p-4">
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label>Product Name</Form.Label>
                    <Form.Control 
                      name="product_name"
                      value={formData.product_name}
                      onChange={handleInputChange}
                      required
                    />
                  </Col>

                  <Col md={3}>
                    <Form.Label>Category</Form.Label>
                    <Form.Select 
                      name="product_category"
                      value={formData.product_category}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="Appliances">Appliances</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Automotive">Automotive</option>
                    </Form.Select>
                  </Col>

                  <Col md={3}>
                    <Form.Label>Brand</Form.Label>
                    <Form.Control 
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      required
                    />
                  </Col>

                  <Col md={4}>
                    <Form.Label>Model Number</Form.Label>
                    <Form.Control 
                      name="model_number"
                      value={formData.model_number}
                      onChange={handleInputChange}
                      required
                    />
                  </Col>

                  <Col md={4}>
                    <Form.Label>Hardware Serial Number</Form.Label>
                    <Form.Control 
                      name="serial_number_entered"
                      value={formData.serial_number_entered}
                      onChange={handleInputChange}
                      required
                      className="font-mono"
                    />
                  </Col>

                  <Col md={4}>
                    <Form.Label>Purchase Price ($)</Form.Label>
                    <Form.Control 
                      type="number"
                      step="0.01"
                      name="purchase_price"
                      value={formData.purchase_price}
                      onChange={handleInputChange}
                      required
                    />
                  </Col>

                  <Col md={6}>
                    <Form.Label>Retailer / Merchant</Form.Label>
                    <Form.Control 
                      name="retailer"
                      value={formData.retailer}
                      onChange={handleInputChange}
                      required
                    />
                  </Col>

                  <Col md={6}>
                    <Form.Label>Date of Purchase</Form.Label>
                    <Form.Control 
                      type="date"
                      name="purchase_date"
                      value={formData.purchase_date}
                      onChange={handleInputChange}
                      required
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Step 2: Warranty & Failure Information */}
            <Card className="mb-4">
              <Card.Header className="fw-bold">
                2. Warranty Coverage & Fault Manifestation
              </Card.Header>
              <Card.Body className="p-4">
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Label>Warranty Provider</Form.Label>
                    <Form.Control 
                      name="warranty_provider"
                      value={formData.warranty_provider}
                      onChange={handleInputChange}
                      required
                    />
                  </Col>

                  <Col md={4}>
                    <Form.Label>Coverage Type</Form.Label>
                    <Form.Select 
                      name="warranty_type"
                      value={formData.warranty_type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="Manufacturer Standard">Manufacturer Standard</option>
                      <option value="Extended Warranty">Extended Warranty</option>
                      <option value="Retailer Protection">Retailer Protection</option>
                    </Form.Select>
                  </Col>

                  <Col md={4}>
                    <Form.Label>Warranty Expiration Date</Form.Label>
                    <Form.Control 
                      type="date"
                      name="warranty_end"
                      value={formData.warranty_end}
                      onChange={handleInputChange}
                      required
                    />
                  </Col>

                  <Col md={4}>
                    <Form.Label>Date Fault Occurred</Form.Label>
                    <Form.Control 
                      type="date"
                      name="fault_date"
                      value={formData.fault_date}
                      onChange={handleInputChange}
                      required
                    />
                  </Col>

                  <Col md={4}>
                    <Form.Label>Fault Classification</Form.Label>
                    <Form.Control 
                      name="fault_type"
                      value={formData.fault_type}
                      onChange={handleInputChange}
                      placeholder="e.g. Display Artifacts, Motor Failure"
                      required
                    />
                  </Col>

                  <Col md={4}>
                    <Form.Label>Damage Type</Form.Label>
                    <Form.Select 
                      name="damage_type"
                      value={formData.damage_type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="Internal Component Failure">Internal Component Failure (Covered)</option>
                      <option value="Mechanical Breakdown">Mechanical Breakdown (Covered)</option>
                      <option value="Electrical Short Circuit">Electrical Short Circuit (Covered)</option>
                      <option value="Water Damage">Water Damage (Excluded)</option>
                      <option value="Accidental Drop Damage">Accidental Drop Damage (Excluded)</option>
                      <option value="Wear and Tear">Wear and Tear (Excluded)</option>
                      <option value="Unauthorized Tampering">Unauthorized Tampering (Excluded)</option>
                    </Form.Select>
                  </Col>

                  <Col md={12}>
                    <Form.Label>Detailed Fault Description</Form.Label>
                    <Form.Control 
                      as="textarea"
                      rows={3}
                      name="fault_description"
                      value={formData.fault_description}
                      onChange={handleInputChange}
                      placeholder="Provide thorough description of how the device failed..."
                      required
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Right Column: Documentation, OCR, and Submission */}
          <Col lg={4}>
            {/* Document Uploads & Live OCR */}
            <Card className="mb-4">
              <Card.Header className="fw-bold d-flex align-items-center gap-2">
                <FaUpload className="text-primary" /> 3. Document Scanning & OCR
              </Card.Header>
              <Card.Body className="p-3">
                {/* Receipt Upload Box */}
                <div className="mb-3">
                  <Form.Label className="small text-muted mb-1">
                    Upload Purchase Receipt or Invoice (JPG/PNG/PDF)
                  </Form.Label>
                  <Form.Control 
                    type="file" 
                    accept="image/*,.pdf"
                    onChange={handleReceiptFileChange}
                  />
                  {ocrLoading && (
                    <div className="mt-2 text-primary small d-flex align-items-center gap-2">
                      <Spinner animation="border" size="sm" />
                      Scanning document with OCR engine...
                    </div>
                  )}
                  {ocrResult && (
                    <div className="mt-2 p-2 rounded bg-surface border border-subtle small">
                      <div className="fw-bold text-success d-flex align-items-center gap-1">
                        <FaCheckCircle /> Document Scanned
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                        Merchant: {ocrResult.merchant || 'Recognized'} | Serials Detected: {ocrResult.detected_serials?.join(', ') || 'None'}
                      </div>
                    </div>
                  )}
                </div>

                <hr className="border-secondary opacity-25" />

                {/* Evidence Checklist */}
                <div className="small fw-semibold text-muted mb-2">Evidence Attached Checkbox</div>
                <Form.Check 
                  type="checkbox"
                  id="chk-receipt"
                  name="receipt_uploaded"
                  label="Purchase Receipt Available"
                  checked={formData.receipt_uploaded}
                  onChange={handleInputChange}
                  className="mb-2 small"
                />
                <Form.Check 
                  type="checkbox"
                  id="chk-war"
                  name="warranty_card_uploaded"
                  label="Warranty Certificate / Card Available"
                  checked={formData.warranty_card_uploaded}
                  onChange={handleInputChange}
                  className="mb-2 small"
                />
                <Form.Check 
                  type="checkbox"
                  id="chk-img"
                  name="product_image_uploaded"
                  label="Clear Product Photo Available"
                  checked={formData.product_image_uploaded}
                  onChange={handleInputChange}
                  className="mb-2 small"
                />
                <Form.Check 
                  type="checkbox"
                  id="chk-fault"
                  name="fault_evidence_uploaded"
                  label="Photographic Fault Evidence Available"
                  checked={formData.fault_evidence_uploaded}
                  onChange={handleInputChange}
                  className="mb-2 small"
                />
                <Form.Check 
                  type="checkbox"
                  id="chk-auth"
                  name="previous_repair_authorized"
                  label="Prior Repairs Authorized by Manufacturer"
                  checked={formData.previous_repair_authorized}
                  onChange={handleInputChange}
                  className="mb-3 small"
                />

                {/* Submit Action */}
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg" 
                  className="w-100 py-3 fw-extrabold shadow-sm d-flex align-items-center justify-content-center gap-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Spinner animation="border" size="sm" />
                      <span>Synthesizing Card & Adjudicating...</span>
                    </>
                  ) : (
                    <>
                      <FaBrain />
                      <span>Trigger AI Adjudication</span>
                    </>
                  )}
                </Button>

                <div className="text-center mt-3 text-muted" style={{ fontSize: '0.72rem' }}>
                  ⚡ Auto-renders 1200×1680 card, runs XGBoost tabular inference, MobileNetV2 vision inference, and deterministic rule arbitration.
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Form>

      {/* Adjudication Result Modal */}
      {adjudicationResult && (
        <Modal 
          show={showResultModal} 
          onHide={() => setShowResultModal(false)}
          size="lg"
          centered
          contentClassName="bg-dark text-white border-subtle"
        >
          <Modal.Header closeButton closeVariant="white">
            <Modal.Title className="fw-bold d-flex align-items-center gap-2">
              <FaShieldAlt className="text-primary" /> Adjudication Complete — {adjudicationResult.claim_id}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <div className="text-center mb-4">
              <span className={`badge-status fs-6 px-4 py-2 ${
                adjudicationResult.adjudication_status === 'Auto-Approved'
                  ? 'badge-approved'
                  : adjudicationResult.adjudication_status === 'Auto-Rejected'
                  ? 'badge-rejected'
                  : 'badge-review'
              }`}>
                {adjudicationResult.adjudication_status}
              </span>
              <div className="mt-2 text-muted small">
                Adjudication Stage: <strong>{adjudicationResult.adjudication_stage}</strong>
              </div>
            </div>

            <Row className="g-3 mb-4">
              <Col sm={6}>
                <div className="p-3 rounded bg-surface border border-subtle">
                  <div className="text-muted small">Final Confidence Score</div>
                  <div className="fs-3 fw-extrabold font-mono text-white">
                    {(adjudicationResult.final_confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </Col>
              <Col sm={6}>
                <div className="p-3 rounded bg-surface border border-subtle">
                  <div className="text-muted small">Dual AI Consensus</div>
                  <div className="fs-5 fw-bold text-white mt-1">
                    {adjudicationResult.models_agreed ? (
                      <span className="text-success d-flex align-items-center gap-1">
                        <FaCheckCircle /> Both Models Agreed
                      </span>
                    ) : (
                      <span className="text-warning d-flex align-items-center gap-1">
                        <FaExclamationTriangle /> Models Disagreed
                      </span>
                    )}
                  </div>
                </div>
              </Col>
            </Row>

            <div className="p-3 rounded bg-surface border border-subtle mb-3">
              <div className="fw-bold text-white small mb-1">Decision Explanation</div>
              <div className="text-light small">{adjudicationResult.decision_reason_summary}</div>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-subtle justify-content-between">
            <Button variant="secondary" onClick={() => setShowResultModal(false)}>
              Close
            </Button>
            <Button 
              variant="primary" 
              onClick={() => navigate(`/claims/${adjudicationResult.claim_id}`)}
              className="d-flex align-items-center gap-2"
            >
              <FaEye /> Open Complete Claim Dossier
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </Container>
  );
}
