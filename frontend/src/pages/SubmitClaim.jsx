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
import { claimsAPI, productsAPI, warrantiesAPI } from '../api';
import { useAuth } from '../context/AuthContext';
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
  FaTrash,
  FaLink,
  FaUnlink,
  FaUndo,
  FaExchangeAlt,
  FaCertificate,
  FaFilePdf
} from 'react-icons/fa';

const INITIAL_FORM_STATE = {
  product_id: null,
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
  previous_repair_authorized: false,
  receipt_uploaded: false,
  warranty_card_uploaded: false,
  product_image_uploaded: false,
  fault_evidence_uploaded: false,
  repair_report_uploaded: false,
  receipt_path: null,
  receipt_hash: null,
  serial_number_on_receipt: null,
  warranty_card_path: null,
  warranty_card_hash: null,
  fault_evidence_path: null,
  fault_evidence_hash: null,
  fault_video_path: null,
  fault_video_hash: null,
  barcode_image_path: null,
  barcode_image_hash: null,
  product_image_path: null,
  product_image_hash: null,
};

export default function SubmitClaim() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const isAssistedIntake = role === 'employee' || role === 'admin';

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [linkedProduct, setLinkedProduct] = useState(null);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
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

  const [warrantyCard, setWarrantyCard] = useState({
    file: null,
    preview: null,
    filename: '',
    path: '',
    hash: '',
    size: 0,
    isPdf: false,
    loading: false,
    error: '',
  });

  // Form Fields — initialized genuinely empty without mock data
  const [formData, setFormData] = useState({ ...INITIAL_FORM_STATE });

  const handleMediaSlotUpload = async (e, mediaType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    const isVideo = mediaType === 'fault_video';
    const isPhoto = mediaType === 'fault_photo';
    const isBarcode = mediaType === 'barcode_photo';
    const isWarranty = mediaType === 'warranty_card';

    const setTarget = isPhoto 
      ? setFaultPhoto 
      : (isVideo ? setFaultVideo : (isBarcode ? setBarcodePhoto : setWarrantyCard));
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
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const previewUrl = isPdf ? null : URL.createObjectURL(file);

      setTarget({
        file,
        preview: previewUrl,
        filename: filename || file.name,
        path: file_path,
        hash: file_hash,
        size: file_size,
        isPdf,
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
      } else if (isWarranty) {
        setFormData((prev) => ({
          ...prev,
          warranty_card_path: file_path,
          warranty_card_hash: file_hash,
          warranty_card_uploaded: true,
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
    } else if (mediaType === 'warranty_card') {
      if (warrantyCard.preview) URL.revokeObjectURL(warrantyCard.preview);
      setWarrantyCard({ file: null, preview: null, filename: '', path: '', hash: '', size: 0, isPdf: false, loading: false, error: '' });
      setFormData((prev) => ({ ...prev, warranty_card_path: null, warranty_card_hash: null, warranty_card_uploaded: false }));
    }
  };

  useEffect(() => {
    // Fetch user products and warranties in parallel, enriching products with warranty coverage dates
    const loadProductsAndWarranties = async () => {
      try {
        const [prodRes, warRes] = await Promise.allSettled([
          productsAPI.getProducts(),
          warrantiesAPI.getWarranties(),
        ]);

        const prodList = prodRes.status === 'fulfilled' ? (prodRes.value.data || []) : [];
        const warList = warRes.status === 'fulfilled' ? (warRes.value.data || []) : [];

        const warrantyMap = {};
        warList.forEach((w) => {
          if (w.product_id) {
            warrantyMap[w.product_id] = w;
          }
        });

        const enriched = prodList.map((p) => {
          const war = warrantyMap[p.product_id];
          return {
            ...p,
            warranty_id: war?.warranty_id || null,
            warranty_start: war?.start_date || p.purchase_date || '',
            warranty_end: war?.end_date || '',
            warranty_provider: war?.provider || '',
            warranty_type: war?.warranty_type || 'Manufacturer Standard',
            warranty_status: war?.calculated_status || war?.status || 'Active',
          };
        });

        setProducts(enriched);
      } catch (err) {
        console.error('Failed to load products and warranties:', err);
      }
    };
    loadProductsAndWarranties();
  }, []);

  // Check if form has user-entered data before overwriting
  const hasExistingData = () => {
    const fieldsToCheck = [
      'product_name', 'brand', 'model_number', 'serial_number_entered',
      'purchase_price', 'retailer', 'purchase_date', 'warranty_start',
      'warranty_end', 'warranty_provider', 'warranty_type', 'product_category'
    ];
    return fieldsToCheck.some((f) => (formData[f] ?? '').toString().trim() !== '');
  };

  // Trigger autofill with overwrite protection
  const handleTriggerAutofill = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.product_id === selectedProductId);
    if (!prod) return;

    if (hasExistingData()) {
      setPendingProduct(prod);
      setShowOverwriteModal(true);
    } else {
      applyAutofill(prod);
    }
  };

  // Apply registered product & warranty specifications to form
  const applyAutofill = (prod) => {
    setFormData((prev) => ({
      ...prev,
      product_id: prod.product_id,
      product_name: prod.name || '',
      product_category: prod.category || '',
      brand: prod.brand || '',
      model_number: prod.model_number || '',
      serial_number_entered: prod.serial_number || '',
      purchase_price: prod.purchase_price !== undefined && prod.purchase_price !== null ? prod.purchase_price : '',
      retailer: prod.retailer || '',
      purchase_date: prod.purchase_date || '',
      warranty_start: prod.warranty_start || prod.purchase_date || '',
      warranty_end: prod.warranty_end || '',
      warranty_provider: prod.warranty_provider || '',
      warranty_type: prod.warranty_type || 'Manufacturer Standard',
    }));

    setLinkedProduct(prod);
    setShowOverwriteModal(false);
    setPendingProduct(null);
  };

  // Detach product link while preserving current field values
  const handleUnlinkProduct = () => {
    setLinkedProduct(null);
    setSelectedProductId('');
    setFormData((prev) => ({ ...prev, product_id: null }));
  };

  // Full form reset to genuine empty defaults
  const handleConfirmReset = () => {
    if (faultPhoto.preview) URL.revokeObjectURL(faultPhoto.preview);
    if (faultVideo.preview) URL.revokeObjectURL(faultVideo.preview);
    if (barcodePhoto.preview) URL.revokeObjectURL(barcodePhoto.preview);
    if (warrantyCard.preview) URL.revokeObjectURL(warrantyCard.preview);

    setFaultPhoto({ file: null, preview: null, filename: '', path: '', hash: '', size: 0, loading: false, error: '' });
    setFaultVideo({ file: null, preview: null, filename: '', path: '', hash: '', size: 0, loading: false, error: '' });
    setBarcodePhoto({ file: null, preview: null, filename: '', path: '', hash: '', size: 0, loading: false, error: '' });
    setWarrantyCard({ file: null, preview: null, filename: '', path: '', hash: '', size: 0, isPdf: false, loading: false, error: '' });

    setReceiptFile(null);
    setOcrResult(null);
    setOcrLoading(false);
    setSelectedProductId('');
    setLinkedProduct(null);
    setPendingProduct(null);
    setFormData({ ...INITIAL_FORM_STATE });
    setError('');
    setShowResetModal(false);
  };

  // Calculate discrepancies between entered form values and linked product specifications
  const fieldLabels = {
    product_name: 'Product Name',
    brand: 'Brand',
    model_number: 'Model Number',
    serial_number_entered: 'Hardware Serial Number',
    product_category: 'Category',
    purchase_price: 'Purchase Price',
    retailer: 'Retailer',
    purchase_date: 'Date of Purchase',
    warranty_start: 'Warranty Start Date',
    warranty_end: 'Warranty Expiration Date',
    warranty_provider: 'Warranty Provider',
    warranty_type: 'Coverage Type',
  };

  const fieldMismatches = (() => {
    if (!linkedProduct) return {};
    const mismatches = {};

    const check = (formKey, origVal) => {
      const cur = (formData[formKey] ?? '').toString().trim();
      const orig = (origVal ?? '').toString().trim();
      if (orig && cur !== orig) {
        mismatches[formKey] = { current: cur, original: orig };
      }
    };

    check('product_name', linkedProduct.name);
    check('product_category', linkedProduct.category);
    check('brand', linkedProduct.brand);
    check('model_number', linkedProduct.model_number);
    check('serial_number_entered', linkedProduct.serial_number);
    check('retailer', linkedProduct.retailer);
    check('purchase_date', linkedProduct.purchase_date);
    check('warranty_start', linkedProduct.warranty_start);
    check('warranty_end', linkedProduct.warranty_end);
    check('warranty_provider', linkedProduct.warranty_provider);
    check('warranty_type', linkedProduct.warranty_type);

    if (linkedProduct.purchase_price !== undefined && linkedProduct.purchase_price !== null && linkedProduct.purchase_price !== '') {
      const curPrice = parseFloat(formData.purchase_price);
      const origPrice = parseFloat(linkedProduct.purchase_price);
      if (!isNaN(curPrice) && !isNaN(origPrice) && curPrice !== origPrice) {
        mismatches.purchase_price = {
          current: formData.purchase_price,
          original: `$${origPrice.toFixed(2)}`,
        };
      }
    }

    return mismatches;
  })();

  // Task 3: Evaluate warranty eligibility for linked registered product
  const warrantyEligibility = (() => {
    if (!linkedProduct) {
      return {
        eligible: false,
        status: 'unselected',
        badgeVariant: 'secondary',
        badgeText: 'No Product Selected',
        reason: 'A registered product must be selected and linked before a claim can be submitted.',
      };
    }

    if (!linkedProduct.warranty_id && !linkedProduct.warranty_end) {
      return {
        eligible: false,
        status: 'no_warranty',
        badgeVariant: 'danger',
        badgeText: 'No Warranty Record',
        reason: `Product '${linkedProduct.product_id}' has no registered warranty on file. Only products with active warranty coverage are eligible for claims.`,
      };
    }

    const statusLower = (linkedProduct.warranty_status || '').toLowerCase();
    if (statusLower.includes('void') || statusLower.includes('cancel')) {
      return {
        eligible: false,
        status: 'void',
        badgeVariant: 'danger',
        badgeText: `Warranty ${linkedProduct.warranty_status || 'Void'}`,
        reason: `Warranty for product '${linkedProduct.product_id}' is marked as ${linkedProduct.warranty_status}. Ineligible for claim processing.`,
      };
    }

    if (linkedProduct.warranty_end) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [y, m, d] = linkedProduct.warranty_end.slice(0, 10).split('-').map(Number);
        const endDate = new Date(y, m - 1, d);
        const diffTime = endDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < -7) {
          return {
            eligible: false,
            status: 'expired',
            badgeVariant: 'danger',
            badgeText: 'Warranty Expired',
            remainingDays: diffDays,
            reason: `Warranty for product '${linkedProduct.product_id}' expired on ${linkedProduct.warranty_end.slice(0, 10)} (${Math.abs(diffDays)} days ago, beyond the 7-day grace period). Claims cannot be filed for expired warranties.`,
          };
        } else if (diffDays < 0) {
          return {
            eligible: true,
            status: 'grace_period',
            badgeVariant: 'warning',
            badgeText: `Grace Period (${diffDays + 7}d left)`,
            remainingDays: diffDays,
            reason: null,
          };
        } else if (diffDays <= 30) {
          return {
            eligible: true,
            status: 'expiring_soon',
            badgeVariant: 'warning',
            badgeText: `Expiring Soon (${diffDays}d left)`,
            remainingDays: diffDays,
            reason: null,
          };
        } else {
          return {
            eligible: true,
            status: 'active',
            badgeVariant: 'success',
            badgeText: `Active Coverage (${diffDays}d left)`,
            remainingDays: diffDays,
            reason: null,
          };
        }
      } catch (err) {
        // Fallback to checking status string
      }
    }

    if (statusLower.includes('expired')) {
      return {
        eligible: false,
        status: 'expired',
        badgeVariant: 'danger',
        badgeText: 'Warranty Expired',
        reason: `Warranty for product '${linkedProduct.product_id}' has expired.`,
      };
    }

    return {
      eligible: true,
      status: 'active',
      badgeVariant: 'success',
      badgeText: linkedProduct.warranty_status || 'Active Coverage',
      reason: null,
    };
  })();

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

    if (!linkedProduct || !formData.product_id) {
      setError('A registered product must be selected and linked before submitting a claim.');
      return;
    }

    if (!warrantyEligibility.eligible) {
      setError(warrantyEligibility.reason || 'This product is ineligible for warranty claim submission.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        product_id: linkedProduct.product_id,
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

      {/* Top Action Panel: Registered Product Quick-Link & Form Controls */}
      <Card className="mb-4 border-primary border-opacity-25 bg-surface">
        <Card.Body className="p-3">
          <Row className="align-items-center g-3">
            <Col lg={8}>
              <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-2">
                <Form.Label className="small text-light mb-0 fw-semibold text-nowrap d-flex align-items-center gap-2">
                  <FaShieldAlt className="text-primary" /> Registered Product:
                </Form.Label>
                <Form.Select 
                  id="registered-product-select"
                  size="sm"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="bg-dark text-white border-secondary"
                  style={{ minWidth: 260 }}
                >
                  <option value="">-- Choose a registered product --</option>
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_id} — {p.name} ({p.brand}) [{p.warranty_status || 'Registered'}]
                    </option>
                  ))}
                </Form.Select>
                <Button 
                  id="btn-autofill-product"
                  variant="primary" 
                  size="sm" 
                  className="text-nowrap d-flex align-items-center gap-2"
                  disabled={!selectedProductId}
                  onClick={handleTriggerAutofill}
                >
                  <FaLink size={12} />
                  <span>Autofill Product & Warranty Details</span>
                </Button>
              </div>
            </Col>
            <Col lg={4} className="text-lg-end">
              <Button 
                id="btn-reset-form-top"
                variant="outline-secondary" 
                size="sm"
                className="d-inline-flex align-items-center gap-2 text-muted"
                onClick={() => setShowResetModal(true)}
              >
                <FaUndo size={11} />
                <span>Reset Form</span>
              </Button>
            </Col>
          </Row>

          {/* Unlinked Product Requirement Notice (Task 3) */}
          {!linkedProduct && (
            <div 
              className="mt-3 p-3 rounded d-flex align-items-center gap-2 small"
              style={{
                backgroundColor: 'rgba(13, 202, 240, 0.12)',
                border: '1px solid rgba(13, 202, 240, 0.35)',
                color: '#e0f7fa'
              }}
            >
              <FaShieldAlt className="flex-shrink-0 text-info" size={16} />
              <div>
                <strong className="text-info">Product Selection Required:</strong>{' '}
                <span>
                  Warranty claims must be filed against an owned, registered product with active warranty coverage. Select your product from the dropdown above and click <strong>"Autofill Product & Warranty Details"</strong>.
                </span>
              </div>
            </div>
          )}

          {/* Linked Product Active Indicator & Warranty Eligibility */}
          {linkedProduct && (
            <div className="mt-3 p-3 rounded bg-info bg-opacity-10 border border-info border-opacity-25">
              <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2">
                <div className="d-flex flex-wrap align-items-center gap-2 small">
                  <Badge bg="info" className="text-dark fw-bold">
                    <FaLink size={10} className="me-1" /> LINKED
                  </Badge>
                  {isAssistedIntake && (
                    <Badge bg="warning" className="text-dark fw-bold">
                      <FaShieldAlt size={9} className="me-1" /> ASSISTED INTAKE
                    </Badge>
                  )}
                  <Badge 
                    bg={warrantyEligibility.badgeVariant} 
                    className={warrantyEligibility.badgeVariant === 'warning' ? 'text-dark fw-bold' : 'fw-bold'}
                  >
                    {warrantyEligibility.badgeText}
                  </Badge>
                  <span className="text-white">
                    Linked to Product <strong className="font-mono text-info">{linkedProduct.product_id}</strong> — {linkedProduct.name} ({linkedProduct.brand})
                  </span>
                  <span className="text-muted font-mono" style={{ fontSize: '0.75rem' }}>
                    [SN: {linkedProduct.serial_number}]
                  </span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline-info" 
                    className="py-0 px-2"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => {
                      const el = document.getElementById('registered-product-select');
                      if (el) el.focus();
                    }}
                  >
                    <FaExchangeAlt size={10} className="me-1" /> Change Product
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline-danger" 
                    className="py-0 px-2"
                    style={{ fontSize: '0.75rem' }}
                    onClick={handleUnlinkProduct}
                  >
                    <FaUnlink size={10} className="me-1" /> Unlink
                  </Button>
                </div>
              </div>

              {/* Ineligible Warranty Alert — High-contrast translucent red styling */}
              {!warrantyEligibility.eligible && (
                <div 
                  className="mt-3 p-3 rounded d-flex align-items-start gap-2"
                  style={{
                    backgroundColor: 'rgba(220, 53, 69, 0.15)',
                    border: '1px solid rgba(220, 53, 69, 0.45)',
                    color: '#f8d7da'
                  }}
                >
                  <FaTimesCircle className="flex-shrink-0 mt-1 text-danger" size={16} />
                  <div className="small">
                    <strong className="text-danger d-block mb-1" style={{ fontSize: '0.88rem' }}>
                      Warranty Ineligible for Claims
                    </strong>
                    <span style={{ color: '#fca5a5' }}>
                      {warrantyEligibility.reason}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Soft Mismatch Warning Banner */}
          {linkedProduct && Object.keys(fieldMismatches).length > 0 && (
            <div 
              className="mt-3 p-3 rounded d-flex align-items-start gap-2 small"
              style={{
                backgroundColor: 'rgba(255, 193, 7, 0.12)',
                border: '1px solid rgba(255, 193, 7, 0.35)',
                color: '#fff3cd'
              }}
            >
              <FaExclamationTriangle className="flex-shrink-0 mt-1 text-warning" size={16} />
              <div>
                <strong className="text-warning">Modified from registered product data:</strong>{' '}
                <span className="text-light">
                  You have edited {Object.keys(fieldMismatches).length} field(s) away from the registered specs ({Object.keys(fieldMismatches).map((k) => fieldLabels[k] || k).join(', ')}). This will not block submission, but discrepancies may require manual review by an adjudicator.
                </span>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      <Form onSubmit={handleSubmit}>
        <Row className="g-4">
          {/* Left Column: Product & Incident Information */}
          <Col lg={8}>
            {/* Step 1: Product Identification */}
            <Card className="mb-4">
              <Card.Header className="fw-bold">
                1. Product Identification
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
                      disabled={!linkedProduct}
                      placeholder={!linkedProduct ? "Select registered product above..." : ""}
                      className={fieldMismatches.product_name ? 'border-warning' : ''}
                    />
                    {fieldMismatches.product_name && (
                      <div className="text-warning small mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                        <FaExclamationTriangle size={10} className="flex-shrink-0" />
                        <span>Modified from registered: <strong>{fieldMismatches.product_name.original}</strong> (may require manual review)</span>
                      </div>
                    )}
                  </Col>

                  <Col md={3}>
                    <Form.Label>Category</Form.Label>
                    <Form.Select 
                      name="product_category"
                      value={formData.product_category}
                      onChange={handleInputChange}
                      required
                      disabled={!linkedProduct}
                      className={fieldMismatches.product_category ? 'border-warning' : ''}
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
                    {fieldMismatches.product_category && (
                      <div className="text-warning small mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                        <FaExclamationTriangle size={10} className="flex-shrink-0" />
                        <span>Modified from registered: <strong>{fieldMismatches.product_category.original}</strong> (may require manual review)</span>
                      </div>
                    )}
                  </Col>

                  <Col md={3}>
                    <Form.Label>Brand</Form.Label>
                    <Form.Control 
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      required
                      disabled={!linkedProduct}
                      placeholder={!linkedProduct ? "Select registered product above..." : ""}
                      className={fieldMismatches.brand ? 'border-warning' : ''}
                    />
                    {fieldMismatches.brand && (
                      <div className="text-warning small mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                        <FaExclamationTriangle size={10} className="flex-shrink-0" />
                        <span>Modified from registered: <strong>{fieldMismatches.brand.original}</strong> (may require manual review)</span>
                      </div>
                    )}
                  </Col>

                  <Col md={4}>
                    <Form.Label>Model Number</Form.Label>
                    <Form.Control 
                      name="model_number"
                      value={formData.model_number}
                      onChange={handleInputChange}
                      required
                      disabled={!linkedProduct}
                      placeholder={!linkedProduct ? "Select registered product above..." : ""}
                      className={fieldMismatches.model_number ? 'border-warning' : ''}
                    />
                    {fieldMismatches.model_number && (
                      <div className="text-warning small mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                        <FaExclamationTriangle size={10} className="flex-shrink-0" />
                        <span>Modified from registered: <strong>{fieldMismatches.model_number.original}</strong> (may require manual review)</span>
                      </div>
                    )}
                  </Col>

                  <Col md={4}>
                    <Form.Label>Hardware Serial Number</Form.Label>
                    <Form.Control 
                      name="serial_number_entered"
                      value={formData.serial_number_entered}
                      onChange={handleInputChange}
                      required
                      disabled={!linkedProduct}
                      placeholder={!linkedProduct ? "Select registered product above..." : ""}
                      className={`font-mono ${fieldMismatches.serial_number_entered ? 'border-warning' : ''}`}
                    />
                    {fieldMismatches.serial_number_entered && (
                      <div className="text-warning small mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                        <FaExclamationTriangle size={10} className="flex-shrink-0" />
                        <span>Modified from registered: <strong className="font-mono">{fieldMismatches.serial_number_entered.original}</strong> (may require manual review)</span>
                      </div>
                    )}
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
                      disabled={!linkedProduct}
                      placeholder={!linkedProduct ? "0.00" : ""}
                      className={fieldMismatches.purchase_price ? 'border-warning' : ''}
                    />
                    {fieldMismatches.purchase_price && (
                      <div className="text-warning small mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                        <FaExclamationTriangle size={10} className="flex-shrink-0" />
                        <span>Modified from registered: <strong>{fieldMismatches.purchase_price.original}</strong> (may require manual review)</span>
                      </div>
                    )}
                  </Col>

                  <Col md={6}>
                    <Form.Label>Retailer / Merchant</Form.Label>
                    <Form.Control 
                      name="retailer"
                      value={formData.retailer}
                      onChange={handleInputChange}
                      required
                      disabled={!linkedProduct}
                      placeholder={!linkedProduct ? "Select registered product above..." : ""}
                      className={fieldMismatches.retailer ? 'border-warning' : ''}
                    />
                    {fieldMismatches.retailer && (
                      <div className="text-warning small mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                        <FaExclamationTriangle size={10} className="flex-shrink-0" />
                        <span>Modified from registered: <strong>{fieldMismatches.retailer.original}</strong> (may require manual review)</span>
                      </div>
                    )}
                  </Col>

                  <Col md={6}>
                    <Form.Label>Date of Purchase</Form.Label>
                    <Form.Control 
                      type="date"
                      name="purchase_date"
                      value={formData.purchase_date}
                      onChange={handleInputChange}
                      required
                      disabled={!linkedProduct}
                      className={fieldMismatches.purchase_date ? 'border-warning' : ''}
                    />
                    {fieldMismatches.purchase_date && (
                      <div className="text-warning small mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                        <FaExclamationTriangle size={10} className="flex-shrink-0" />
                        <span>Modified from registered: <strong>{fieldMismatches.purchase_date.original}</strong> (may require manual review)</span>
                      </div>
                    )}
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
                      disabled={!linkedProduct}
                      placeholder={!linkedProduct ? "Select registered product above..." : ""}
                      className={fieldMismatches.warranty_provider ? 'border-warning' : ''}
                    />
                    {fieldMismatches.warranty_provider && (
                      <div className="text-warning small mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                        <FaExclamationTriangle size={10} className="flex-shrink-0" />
                        <span>Modified from registered: <strong>{fieldMismatches.warranty_provider.original}</strong> (may require manual review)</span>
                      </div>
                    )}
                  </Col>

                  <Col md={4}>
                    <Form.Label>Coverage Type</Form.Label>
                    <Form.Select 
                      name="warranty_type"
                      value={formData.warranty_type}
                      onChange={handleInputChange}
                      required
                      disabled={!linkedProduct}
                      className={fieldMismatches.warranty_type ? 'border-warning' : ''}
                    >
                      <option value="">Select Coverage Type...</option>
                      <option value="Manufacturer Standard">Manufacturer Standard</option>
                      <option value="Extended Warranty">Extended Warranty</option>
                      <option value="Retailer Protection">Retailer Protection</option>
                    </Form.Select>
                    {fieldMismatches.warranty_type && (
                      <div className="text-warning small mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                        <FaExclamationTriangle size={10} className="flex-shrink-0" />
                        <span>Modified from registered: <strong>{fieldMismatches.warranty_type.original}</strong> (may require manual review)</span>
                      </div>
                    )}
                  </Col>

                  <Col md={4}>
                    <Form.Label>Warranty Expiration Date</Form.Label>
                    <Form.Control 
                      type="date"
                      name="warranty_end"
                      value={formData.warranty_end}
                      onChange={handleInputChange}
                      required
                      disabled={!linkedProduct}
                      className={fieldMismatches.warranty_end ? 'border-warning' : ''}
                    />
                    {fieldMismatches.warranty_end && (
                      <div className="text-warning small mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                        <FaExclamationTriangle size={10} className="flex-shrink-0" />
                        <span>Modified from registered: <strong>{fieldMismatches.warranty_end.original}</strong> (may require manual review)</span>
                      </div>
                    )}
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

                  {/* Slot 4: Warranty Card / Certificate */}
                  <div className="p-2 mb-3 rounded bg-surface border border-secondary border-opacity-25">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <Form.Label className="small text-light mb-0 d-flex align-items-center gap-2 fw-semibold">
                        <FaCertificate className="text-warning" /> Warranty Card / Certificate
                      </Form.Label>
                      <Badge bg="dark" className="border border-secondary text-muted" style={{ fontSize: '0.65rem' }}>
                        PDF, JPG, PNG, WebP ≤ 15MB
                      </Badge>
                    </div>

                    {!warrantyCard.path ? (
                      <div>
                        <Form.Control 
                          type="file" 
                          size="sm"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          disabled={warrantyCard.loading}
                          onChange={(e) => handleMediaSlotUpload(e, 'warranty_card')}
                        />
                        {warrantyCard.loading && (
                          <div className="mt-2 text-primary small d-flex align-items-center gap-2">
                            <Spinner animation="border" size="sm" />
                            Uploading & computing SHA-256 fingerprint...
                          </div>
                        )}
                        {warrantyCard.error && (
                          <div className="text-danger small mt-1" style={{ fontSize: '0.72rem' }}>
                            {warrantyCard.error}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-2 rounded bg-black bg-opacity-40 border border-success border-opacity-25">
                        <div className="d-flex align-items-center gap-3">
                          {warrantyCard.preview ? (
                            <img 
                              src={warrantyCard.preview} 
                              alt="Warranty Card Preview" 
                              className="rounded border border-secondary border-opacity-25"
                              style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                            />
                          ) : (
                            <div 
                              className="rounded border border-secondary border-opacity-25 d-flex align-items-center justify-content-center bg-dark"
                              style={{ width: '60px', height: '60px' }}
                            >
                              <FaFilePdf size={28} className="text-danger" />
                            </div>
                          )}
                          <div className="flex-grow-1 overflow-hidden">
                            <div className="d-flex align-items-center gap-2">
                              <span className="text-white small fw-semibold text-truncate" title={warrantyCard.filename}>
                                {warrantyCard.filename}
                              </span>
                              <Badge bg="success" className="d-flex align-items-center gap-1" style={{ fontSize: '0.65rem' }}>
                                <FaCheckCircle size={9} /> Uploaded
                              </Badge>
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.70rem' }}>
                              {(warrantyCard.size / (1024 * 1024)).toFixed(2)} MB {warrantyCard.isPdf ? '(PDF Document)' : ''}
                            </div>
                            <div className="text-truncate text-info font-mono mt-1" style={{ fontSize: '0.68rem' }} title={warrantyCard.hash}>
                              <FaFingerprint size={10} className="me-1" />
                              SHA-256: {warrantyCard.hash}
                            </div>
                          </div>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            className="p-1 px-2"
                            title="Remove Warranty Card"
                            onClick={() => handleRemoveMediaSlot('warranty_card')}
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
                <div className="small fw-semibold text-muted mb-2">Evidence Attached Status</div>
                <Form.Check 
                  type="checkbox"
                  id="chk-receipt"
                  name="receipt_uploaded"
                  label="Purchase Receipt Available"
                  checked={formData.receipt_uploaded}
                  onChange={handleInputChange}
                  className="mb-2 small"
                />
                <div className="d-flex align-items-center justify-content-between mb-2 small text-light ps-1">
                  <span className="d-flex align-items-center gap-2">
                    <FaCertificate className="text-warning" size={12} /> Warranty Card / Certificate:
                  </span>
                  {formData.warranty_card_uploaded ? (
                    <Badge bg="success" className="d-flex align-items-center gap-1" style={{ fontSize: '0.68rem' }}>
                      <FaCheckCircle size={8} /> Attached
                    </Badge>
                  ) : (
                    <Badge bg="dark" className="border border-secondary text-muted" style={{ fontSize: '0.68rem' }}>
                      Not Attached
                    </Badge>
                  )}
                </div>
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

                {/* Submit Action & Reset Button */}
                <div className="d-flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline-secondary" 
                    className="py-3 px-3 d-flex align-items-center gap-2 text-muted"
                    onClick={() => setShowResetModal(true)}
                    title="Reset all form data"
                  >
                    <FaUndo />
                  </Button>
                  <Button 
                    id="btn-trigger-adjudication"
                    type="submit" 
                    variant={!linkedProduct || !warrantyEligibility.eligible ? "secondary" : "primary"} 
                    size="lg" 
                    className="flex-grow-1 py-3 fw-extrabold shadow-sm d-flex align-items-center justify-content-center gap-2"
                    disabled={submitting || !linkedProduct || !warrantyEligibility.eligible}
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
                </div>

                {!linkedProduct ? (
                  <div className="text-center mt-3 text-warning small fw-semibold d-flex align-items-center justify-content-center gap-1">
                    <FaExclamationTriangle size={12} />
                    <span>Select and link a registered product above to enable claim submission.</span>
                  </div>
                ) : !warrantyEligibility.eligible ? (
                  <div className="text-center mt-3 text-danger small fw-semibold d-flex align-items-center justify-content-center gap-1">
                    <FaTimesCircle size={12} />
                    <span>{warrantyEligibility.reason}</span>
                  </div>
                ) : (
                  <div className="text-center mt-3 text-muted" style={{ fontSize: '0.72rem' }}>
                    ⚡ Auto-renders 1200×1680 card, runs XGBoost tabular inference, MobileNetV2 vision inference, and deterministic rule arbitration.
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Form>

      {/* Overwrite Confirmation Modal */}
      <Modal 
        show={showOverwriteModal} 
        onHide={() => {
          setShowOverwriteModal(false);
          setPendingProduct(null);
        }}
        centered
        contentClassName="bg-dark text-white border-warning border-opacity-50"
      >
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2 text-warning">
            <FaExclamationTriangle /> Confirm Overwrite of Entered Data
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <p className="mb-2">
            You have already entered product or warranty details in the claim form.
          </p>
          <p className="text-muted small mb-0">
            Autofilling from <strong>{pendingProduct?.product_id} — {pendingProduct?.name}</strong> will overwrite your currently entered details with the registered product specifications. Are you sure you want to proceed?
          </p>
        </Modal.Body>
        <Modal.Footer className="border-secondary border-opacity-25 justify-content-between">
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowOverwriteModal(false);
              setPendingProduct(null);
            }}
          >
            Cancel & Keep Entered Data
          </Button>
          <Button 
            variant="warning" 
            className="fw-bold text-dark"
            onClick={() => {
              if (pendingProduct) applyAutofill(pendingProduct);
            }}
          >
            Overwrite & Autofill
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reset Form Confirmation Modal */}
      <Modal 
        show={showResetModal} 
        onHide={() => setShowResetModal(false)}
        centered
        contentClassName="bg-dark text-white border-danger border-opacity-50"
      >
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2 text-danger">
            <FaUndo /> Clear All Entered Data?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <p className="mb-2">
            Are you sure you want to reset the claim form?
          </p>
          <p className="text-muted small mb-0">
            All entered product specifications, warranty dates, fault details, and uploaded evidence files will be cleared. This action cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer className="border-secondary border-opacity-25 justify-content-between">
          <Button variant="secondary" onClick={() => setShowResetModal(false)}>
            Keep Editing
          </Button>
          <Button variant="danger" className="fw-bold" onClick={handleConfirmReset}>
            Yes, Reset Form
          </Button>
        </Modal.Footer>
      </Modal>

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
