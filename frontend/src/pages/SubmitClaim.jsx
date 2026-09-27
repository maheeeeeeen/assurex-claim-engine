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
  FaEye,
  FaFingerprint,
  FaCheck,
  FaSyncAlt,
  FaSearch,
  FaVideo,
  FaImage,
  FaBarcode,
  FaTrash
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

  // Evidence Media Upload Slots (Task 1)
  const [faultPhoto, setFaultPhoto] = useState({
    file: null,
    preview: null,
    filename: '',
    path: '',
    hash: '',
    size: 0,
    loading: false,
    error: '',
  });

  const [faultVideo, setFaultVideo] = useState({
    file: null,
    preview: null,
    filename: '',
    path: '',
    hash: '',
    size: 0,
    loading: false,
    error: '',
  });

  const [barcodePhoto, setBarcodePhoto] = useState({
    file: null,
    preview: null,
    filename: '',
    path: '',
    hash: '',
    size: 0,
    loading: false,
    error: '',
  });

  // Form Fields — initialized genuinely empty without mock data
  const [formData, setFormData] = useState({
    product_name: '',
    product_category: '',
    brand: '',
    model_number: '',
    serial_number_entered: '',
    purchase_price: '',
    retailer: '',
    purchase_date: '',
    warranty_start: '',
    warranty_end: '',
    warranty_provider: '',
    warranty_type: '',
    fault_date: '',
    fault_type: '',
    damage_type: '',
    fault_description: '',
    repair_history_count: 0,
    previous_repair_authorized: true,
    receipt_uploaded: false,
    warranty_card_uploaded: false,
    product_image_uploaded: false,
    fault_evidence_uploaded: false,
    repair_report_uploaded: false,
    receipt_path: null,
    receipt_hash: null,
    serial_number_on_receipt: null,
    fault_evidence_path: null,
    fault_evidence_hash: null,
    fault_video_path: null,
    fault_video_hash: null,
    barcode_image_path: null,
    barcode_image_hash: null,
    product_image_path: null,
    product_image_hash: null,
  });

  const handleMediaSlotUpload = async (e, mediaType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    const isVideo = mediaType === 'fault_video';
    const isPhoto = mediaType === 'fault_photo';
    const isBarcode = mediaType === 'barcode_photo';

    const setTarget = isPhoto ? setFaultPhoto : (isVideo ? setFaultVideo : setBarcodePhoto);
    const maxSize = isVideo ? 35 * 1024 * 1024 : 15 * 1024 * 1024;
    const maxMb = isVideo ? 35 : 15;

    if (file.size > maxSize) {
      setTarget((prev) => ({ ...prev, error: `File exceeds maximum limit of ${maxMb}MB` }));
      return;
    }

    setTarget((prev) => ({ ...prev, loading: true, error: '' }));

    try {
      const data = new FormData();
      data.append('file', file);
      data.append('media_type', mediaType);

      const res = await claimsAPI.uploadMedia(data);
      const { file_path, file_hash, file_size, filename } = res.data;
      const previewUrl = URL.createObjectURL(file);

      setTarget({
        file,
        preview: previewUrl,
        filename: filename || file.name,
        path: file_path,
        hash: file_hash,
        size: file_size,
        loading: false,
        error: '',
      });

      if (isPhoto) {
        setFormData((prev) => ({
          ...prev,
          fault_evidence_path: file_path,
          fault_evidence_hash: file_hash,
          fault_evidence_uploaded: true,
        }));
      } else if (isVideo) {
        setFormData((prev) => ({
          ...prev,
          fault_video_path: file_path,
          fault_video_hash: file_hash,
          fault_video_uploaded: true,
        }));
      } else if (isBarcode) {
        setFormData((prev) => ({
          ...prev,
          barcode_image_path: file_path,
          barcode_image_hash: file_hash,
          barcode_image_uploaded: true,
          product_image_uploaded: true,
          product_image_path: file_path,
          product_image_hash: file_hash,
        }));
      }
    } catch (err) {
      console.error(`Upload error for ${mediaType}:`, err);
      const msg = err.response?.data?.detail || 'Failed to upload media file. Please try again.';
      setTarget((prev) => ({ ...prev, loading: false, error: msg }));
    }
  };

  const handleRemoveMediaSlot = (mediaType) => {
    if (mediaType === 'fault_photo') {
      if (faultPhoto.preview) URL.revokeObjectURL(faultPhoto.preview);
      setFaultPhoto({ file: null, preview: null, filename: '', path: '', hash: '', size: 0, loading: false, error: '' });
      setFormData((prev) => ({ ...prev, fault_evidence_path: null, fault_evidence_hash: null, fault_evidence_uploaded: false }));
    } else if (mediaType === 'fault_video') {
      if (faultVideo.preview) URL.revokeObjectURL(faultVideo.preview);
      setFaultVideo({ file: null, preview: null, filename: '', path: '', hash: '', size: 0, loading: false, error: '' });
      setFormData((prev) => ({ ...prev, fault_video_path: null, fault_video_hash: null, fault_video_uploaded: false }));
    } else if (mediaType === 'barcode_photo') {
      if (barcodePhoto.preview) URL.revokeObjectURL(barcodePhoto.preview);
      setBarcodePhoto({ file: null, preview: null, filename: '', path: '', hash: '', size: 0, loading: false, error: '' });
      setFormData((prev) => ({ ...prev, barcode_image_path: null, barcode_image_hash: null, barcode_image_uploaded: false, product_image_uploaded: false, product_image_path: null, product_image_hash: null }));
    }
  };

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

      setFormData((prev) => ({
        ...prev,
        receipt_path: res.data.file_path,
        receipt_hash: res.data.file_hash,
        serial_number_on_receipt: res.data.serial_number || prev.serial_number_entered,
      }));
    } catch (err) {
      console.error('OCR Processing error:', err);
      setError('OCR document scanning encountered an error. You may still manually verify data.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleApplyOcrToForm = () => {
    if (!ocrResult) return;
    setFormData((prev) => ({
      ...prev,
      retailer: ocrResult.retailer || ocrResult.merchant || prev.retailer,
      purchase_date: ocrResult.purchase_date || prev.purchase_date,
      warranty_start: ocrResult.purchase_date || prev.warranty_start,
      purchase_price: ocrResult.purchase_amount !== null && ocrResult.purchase_amount !== undefined ? ocrResult.purchase_amount : prev.purchase_price,
      serial_number_entered: ocrResult.serial_number || prev.serial_number_entered,
      serial_number_on_receipt: ocrResult.serial_number || prev.serial_number_on_receipt,
    }));
  };

  const getSerialReconciliation = () => {
    if (!ocrResult || !ocrResult.serial_number) return null;
    const entered = (formData.serial_number_entered || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const detected = (ocrResult.serial_number || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (entered && detected && entered === detected) {
      return { status: 'match', text: 'Verified Match', message: 'Entered serial matches invoice serial exactly.' };
    } else if (entered && detected && (entered.includes(detected) || detected.includes(entered))) {
      return { status: 'partial', text: 'Partial Match', message: 'Entered serial corresponds to invoice document serial.' };
    } else {
      return { status: 'mismatch', text: 'Serial Mismatch', message: `Entered serial (${formData.serial_number_entered}) does not match document (${ocrResult.serial_number}).` };
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
        ocr_extracted_json: ocrResult ? JSON.stringify(ocrResult) : null,
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
                      <option value="">Select Category...</option>
                      <option value="Appliances">Appliances</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Automotive">Automotive</option>
                      <option value="Smartphones & Mobile">Smartphones & Mobile</option>
                      <option value="Computers & Laptops">Computers & Laptops</option>
                      <option value="Wearables & Audio">Wearables & Audio</option>
                      <option value="Home Office & Furniture">Home Office & Furniture</option>
                      <option value="Power Tools & Hardware">Power Tools & Hardware</option>
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
                      <option value="">Select Coverage Type...</option>
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
                      <option value="">Select Damage Type...</option>
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
                    <div className="mt-3 p-3 rounded bg-surface border border-secondary border-opacity-25 shadow-sm">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-bold text-white small d-flex align-items-center gap-1">
                          <FaCheckCircle className="text-success" /> Extracted-Data Verification
                        </span>
                        <div className="d-flex gap-1">
                          <Badge bg="dark" className="border border-secondary text-info fw-normal" style={{ fontSize: '0.65rem' }}>
                            {ocrResult.ocr_engine}
                          </Badge>
                          <Badge bg="success" style={{ fontSize: '0.65rem' }}>
                            {Math.round(ocrResult.ocr_confidence * 100)}% Conf
                          </Badge>
                        </div>
                      </div>

                      {/* Cryptographic SHA-256 Fingerprint */}
                      <div className="p-2 mb-2 rounded bg-black bg-opacity-50 border border-secondary border-opacity-25 small font-mono d-flex align-items-center gap-2">
                        <FaFingerprint className="text-info flex-shrink-0" />
                        <span className="text-truncate text-secondary" style={{ fontSize: '0.70rem' }} title={ocrResult.file_hash}>
                          SHA-256: {ocrResult.file_hash}
                        </span>
                      </div>

                      {/* Duplicate Document Warning */}
                      {ocrResult.is_duplicate_file && (
                        <Alert variant="warning" className="small py-2 px-2 mb-2 d-flex align-items-start gap-2 border-0 bg-warning bg-opacity-10 text-warning">
                          <FaExclamationTriangle className="flex-shrink-0 mt-1" />
                          <div style={{ fontSize: '0.74rem' }}>
                            <strong>Duplicate File Warning:</strong> This document hash was previously used in claim <Badge bg="warning" text="dark">{ocrResult.duplicate_claim_id}</Badge>. Resubmitting identical receipts triggers automated duplicate fraud flags.
                          </div>
                        </Alert>
                      )}

                      {/* Extracted Key-Value Summary */}
                      <div className="small mb-2 p-2 rounded bg-black bg-opacity-25 border border-secondary border-opacity-25">
                        <div className="d-flex justify-content-between py-1 border-bottom border-secondary border-opacity-25">
                          <span className="text-muted">Detected Merchant:</span>
                          <span className="text-white fw-semibold">{ocrResult.merchant || ocrResult.retailer || 'Authorized Retailer'}</span>
                        </div>
                        <div className="d-flex justify-content-between py-1 border-bottom border-secondary border-opacity-25">
                          <span className="text-muted">Invoice Date:</span>
                          <span className="text-white fw-semibold">{ocrResult.purchase_date || 'Not detected'}</span>
                        </div>
                        <div className="d-flex justify-content-between py-1 border-bottom border-secondary border-opacity-25">
                          <span className="text-muted">Purchase Total:</span>
                          <span className="text-white fw-semibold">
                            {ocrResult.purchase_amount ? `$${parseFloat(ocrResult.purchase_amount).toFixed(2)}` : 'Not detected'}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                          <span className="text-muted">Detected Serial:</span>
                          <span className="text-info font-mono fw-semibold">{ocrResult.serial_number || 'None'}</span>
                        </div>
                      </div>

                      {/* Cross-Source Serial Reconciliation Status */}
                      {(() => {
                        const recon = getSerialReconciliation();
                        if (!recon) return null;
                        const isMatch = recon.status === 'match';
                        const isPartial = recon.status === 'partial';
                        const badgeVariant = isMatch ? 'success' : (isPartial ? 'info' : 'danger');
                        const Icon = isMatch ? FaCheckCircle : (isPartial ? FaCheckCircle : FaTimesCircle);
                        return (
                          <div className={`p-2 rounded border small mb-2 ${isMatch ? 'border-success border-opacity-25 bg-success bg-opacity-10' : 'border-danger border-opacity-25 bg-danger bg-opacity-10'}`}>
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="fw-semibold text-light" style={{ fontSize: '0.74rem' }}>
                                Cross-Source Serial Check:
                              </span>
                              <Badge bg={badgeVariant} className="d-inline-flex align-items-center gap-1">
                                <Icon size={10} /> {recon.text}
                              </Badge>
                            </div>
                            <div className="text-secondary mt-1" style={{ fontSize: '0.70rem' }}>
                              {recon.message}
                            </div>
                          </div>
                        );
                      })()}

                      {/* One-Click Apply Button */}
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="w-100 d-flex align-items-center justify-content-center gap-2 mt-1"
                        onClick={handleApplyOcrToForm}
                      >
                        <FaSyncAlt size={11} />
                        <span>Apply Extracted Values to Form</span>
                      </Button>
                    </div>
                  )}
                </div>

                <hr className="border-secondary opacity-25" />

                {/* Evidence Media Upload Slots (Task 1) */}
                <div className="mb-3">
                  <div className="small fw-bold text-white mb-2 d-flex align-items-center gap-2">
                    <FaShieldAlt className="text-info" /> Cryptographic Evidence Media
                  </div>
                  <div className="text-muted small mb-3" style={{ fontSize: '0.75rem' }}>
                    Upload physical evidence files below. Each file is verified and persisted with a cryptographic SHA-256 fingerprint to ensure chain of custody.
                  </div>

                  {/* Slot 1: Fault / Damage Photo */}
                  <div className="p-2 mb-3 rounded bg-surface border border-secondary border-opacity-25">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <Form.Label className="small text-light mb-0 d-flex align-items-center gap-2 fw-semibold">
                        <FaImage className="text-warning" /> Fault / Damage Photo
                      </Form.Label>
                      <Badge bg="dark" className="border border-secondary text-muted" style={{ fontSize: '0.65rem' }}>
                        JPG, PNG, WebP ≤ 15MB
                      </Badge>
                    </div>

                    {!faultPhoto.path ? (
                      <div>
                        <Form.Control 
                          type="file" 
                          size="sm"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={faultPhoto.loading}
                          onChange={(e) => handleMediaSlotUpload(e, 'fault_photo')}
                        />
                        {faultPhoto.loading && (
                          <div className="mt-2 text-primary small d-flex align-items-center gap-2">
                            <Spinner animation="border" size="sm" />
                            Uploading & computing SHA-256 fingerprint...
                          </div>
                        )}
                        {faultPhoto.error && (
                          <div className="text-danger small mt-1" style={{ fontSize: '0.72rem' }}>
                            {faultPhoto.error}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-2 rounded bg-black bg-opacity-40 border border-success border-opacity-25">
                        <div className="d-flex align-items-center gap-3">
                          <img 
                            src={faultPhoto.preview} 
                            alt="Fault Preview" 
                            className="rounded border border-secondary border-opacity-25"
                            style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                          />
                          <div className="flex-grow-1 overflow-hidden">
                            <div className="d-flex align-items-center gap-2">
                              <span className="text-white small fw-semibold text-truncate" title={faultPhoto.filename}>
                                {faultPhoto.filename}
                              </span>
                              <Badge bg="success" className="d-flex align-items-center gap-1" style={{ fontSize: '0.65rem' }}>
                                <FaCheckCircle size={9} /> Uploaded
                              </Badge>
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.70rem' }}>
                              {(faultPhoto.size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                            <div className="text-truncate text-info font-mono mt-1" style={{ fontSize: '0.68rem' }} title={faultPhoto.hash}>
                              <FaFingerprint size={10} className="me-1" />
                              SHA-256: {faultPhoto.hash}
                            </div>
                          </div>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            className="p-1 px-2"
                            title="Remove Photo"
                            onClick={() => handleRemoveMediaSlot('fault_photo')}
                          >
                            <FaTrash size={12} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Slot 2: Fault / Damage Short Video */}
                  <div className="p-2 mb-3 rounded bg-surface border border-secondary border-opacity-25">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <Form.Label className="small text-light mb-0 d-flex align-items-center gap-2 fw-semibold">
                        <FaVideo className="text-danger" /> Fault / Damage Short Video
                      </Form.Label>
                      <Badge bg="dark" className="border border-secondary text-muted" style={{ fontSize: '0.65rem' }}>
                        MP4, WebM, MOV ≤ 35MB
                      </Badge>
                    </div>

                    {!faultVideo.path ? (
                      <div>
                        <Form.Control 
                          type="file" 
                          size="sm"
                          accept="video/mp4,video/webm,video/quicktime"
                          disabled={faultVideo.loading}
                          onChange={(e) => handleMediaSlotUpload(e, 'fault_video')}
                        />
                        {faultVideo.loading && (
                          <div className="mt-2 text-primary small d-flex align-items-center gap-2">
                            <Spinner animation="border" size="sm" />
                            Uploading video & computing SHA-256 fingerprint...
                          </div>
                        )}
                        {faultVideo.error && (
                          <div className="text-danger small mt-1" style={{ fontSize: '0.72rem' }}>
                            {faultVideo.error}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-2 rounded bg-black bg-opacity-40 border border-success border-opacity-25">
                        <video 
                          controls 
                          src={faultVideo.preview}
                          className="w-100 rounded mb-2 border border-secondary border-opacity-25"
                          style={{ maxHeight: '160px', backgroundColor: '#000' }}
                        />
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="overflow-hidden me-2">
                            <div className="d-flex align-items-center gap-2">
                              <span className="text-white small fw-semibold text-truncate" title={faultVideo.filename}>
                                {faultVideo.filename}
                              </span>
                              <Badge bg="success" className="d-flex align-items-center gap-1" style={{ fontSize: '0.65rem' }}>
                                <FaCheckCircle size={9} /> Uploaded
                              </Badge>
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.70rem' }}>
                              {(faultVideo.size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                            <div className="text-truncate text-info font-mono mt-1" style={{ fontSize: '0.68rem' }} title={faultVideo.hash}>
                              <FaFingerprint size={10} className="me-1" />
                              SHA-256: {faultVideo.hash}
                            </div>
                          </div>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            className="p-1 px-2"
                            title="Remove Video"
                            onClick={() => handleRemoveMediaSlot('fault_video')}
                          >
                            <FaTrash size={12} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Slot 3: Product Photo with Barcode / Serial Number */}
                  <div className="p-2 mb-3 rounded bg-surface border border-secondary border-opacity-25">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <Form.Label className="small text-light mb-0 d-flex align-items-center gap-2 fw-semibold">
                        <FaBarcode className="text-info" /> Product Photo (Barcode / Serial Visible)
                      </Form.Label>
                      <Badge bg="dark" className="border border-secondary text-muted" style={{ fontSize: '0.65rem' }}>
                        JPG, PNG, WebP ≤ 15MB
                      </Badge>
                    </div>

                    {!barcodePhoto.path ? (
                      <div>
                        <Form.Control 
                          type="file" 
                          size="sm"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={barcodePhoto.loading}
                          onChange={(e) => handleMediaSlotUpload(e, 'barcode_photo')}
                        />
                        {barcodePhoto.loading && (
                          <div className="mt-2 text-primary small d-flex align-items-center gap-2">
                            <Spinner animation="border" size="sm" />
                            Uploading & computing SHA-256 fingerprint...
                          </div>
                        )}
                        {barcodePhoto.error && (
                          <div className="text-danger small mt-1" style={{ fontSize: '0.72rem' }}>
                            {barcodePhoto.error}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-2 rounded bg-black bg-opacity-40 border border-success border-opacity-25">
                        <div className="d-flex align-items-center gap-3">
                          <img 
                            src={barcodePhoto.preview} 
                            alt="Barcode Preview" 
                            className="rounded border border-secondary border-opacity-25"
                            style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                          />
                          <div className="flex-grow-1 overflow-hidden">
                            <div className="d-flex align-items-center gap-2">
                              <span className="text-white small fw-semibold text-truncate" title={barcodePhoto.filename}>
                                {barcodePhoto.filename}
                              </span>
                              <Badge bg="success" className="d-flex align-items-center gap-1" style={{ fontSize: '0.65rem' }}>
                                <FaCheckCircle size={9} /> Uploaded
                              </Badge>
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.70rem' }}>
                              {(barcodePhoto.size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                            <div className="text-truncate text-info font-mono mt-1" style={{ fontSize: '0.68rem' }} title={barcodePhoto.hash}>
                              <FaFingerprint size={10} className="me-1" />
                              SHA-256: {barcodePhoto.hash}
                            </div>
                          </div>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            className="p-1 px-2"
                            title="Remove Barcode Photo"
                            onClick={() => handleRemoveMediaSlot('barcode_photo')}
                          >
                            <FaTrash size={12} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
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
