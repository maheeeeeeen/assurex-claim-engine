/**
 * Products & Warranties Page — AssureX Claim Engine
 * Browse registered hardware assets, register new products, and track warranty expiry lifecycles
 */

import { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Table, 
  Button, 
  Spinner, 
  InputGroup, 
  Form, 
  Badge, 
  Modal, 
  Alert,
  Nav
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { productsAPI, warrantiesAPI } from '../api';
import { 
  FaBox, 
  FaSearch, 
  FaPlusCircle, 
  FaShieldAlt, 
  FaCalendarAlt, 
  FaClock, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaTimesCircle,
  FaTag
} from 'react-icons/fa';

export default function Products() {
  const navigate = useNavigate();

  // Tab state: 'products' | 'warranties'
  const [activeTab, setActiveTab] = useState('products');

  // Products state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productSearch, setProductSearch] = useState('');

  // Warranties state
  const [warranties, setWarranties] = useState([]);
  const [loadingWarranties, setLoadingWarranties] = useState(false);
  const [warrantyFilter, setWarrantyFilter] = useState('all'); // all, active, expiring_soon, expired
  const [warrantySearch, setWarrantySearch] = useState('');

  // Registration Modal state
  const [showRegModal, setShowRegModal] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: 'Electronics',
    brand: '',
    model_number: '',
    serial_number: '',
    purchase_price: '',
    retailer: '',
    purchase_date: new Date().toISOString().split('T')[0],
    warranty_duration_months: 24,
    warranty_provider: 'Manufacturer Extended Care',
    warranty_type: 'Standard',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (activeTab === 'warranties') {
      fetchWarranties();
    }
  }, [activeTab, warrantyFilter]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await productsAPI.getProducts();
      setProducts(res.data || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchWarranties = async () => {
    setLoadingWarranties(true);
    try {
      const params = {};
      if (warrantyFilter !== 'all') {
        params.status = warrantyFilter;
      }
      const res = await warrantiesAPI.getWarranties(params);
      setWarranties(res.data || []);
    } catch (err) {
      console.error('Failed to load warranties:', err);
    } finally {
      setLoadingWarranties(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegisterProduct = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!formData.name || !formData.serial_number || !formData.brand || !formData.purchase_price) {
      setRegError('Please complete all mandatory fields.');
      return;
    }

    setRegLoading(true);
    try {
      const payload = {
        ...formData,
        purchase_price: parseFloat(formData.purchase_price),
        warranty_duration_months: parseInt(formData.warranty_duration_months, 10),
      };

      const res = await productsAPI.createProduct(payload);
      setRegSuccess(`Product '${res.data.product.name}' (ID: ${res.data.product.product_id}) successfully registered!`);
      
      // Refresh list
      fetchProducts();
      if (activeTab === 'warranties') {
        fetchWarranties();
      }

      // Reset form after short delay
      setTimeout(() => {
        setShowRegModal(false);
        setRegSuccess('');
        setFormData({
          name: '',
          category: 'Electronics',
          brand: '',
          model_number: '',
          serial_number: '',
          purchase_price: '',
          retailer: '',
          purchase_date: new Date().toISOString().split('T')[0],
          warranty_duration_months: 24,
          warranty_provider: 'Manufacturer Extended Care',
          warranty_type: 'Standard',
        });
      }, 1500);
    } catch (err) {
      setRegError(err.response?.data?.detail || 'Failed to register product. Please check serial number.');
    } finally {
      setRegLoading(false);
    }
  };

  // Filter products by search
  const filteredProducts = products.filter((p) => {
    const q = productSearch.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.model_number?.toLowerCase().includes(q) ||
      p.serial_number?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.product_id?.toLowerCase().includes(q)
    );
  });

  // Filter warranties by search
  const filteredWarranties = warranties.filter((w) => {
    const q = warrantySearch.toLowerCase();
    const prod = w.product;
    return (
      w.warranty_id?.toLowerCase().includes(q) ||
      w.product_id?.toLowerCase().includes(q) ||
      prod?.name?.toLowerCase().includes(q) ||
      prod?.serial_number?.toLowerCase().includes(q) ||
      prod?.brand?.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (calculatedStatus, remainingDays) => {
    if (remainingDays < 0) {
      return (
        <Badge bg="danger" className="d-inline-flex align-items-center gap-1 px-2 py-1">
          <FaTimesCircle size={11} /> Expired ({Math.abs(remainingDays)}d ago)
        </Badge>
      );
    } else if (remainingDays <= 30) {
      return (
        <Badge bg="warning" text="dark" className="d-inline-flex align-items-center gap-1 px-2 py-1 fw-bold">
          <FaExclamationTriangle size={11} /> Expiring Soon ({remainingDays}d)
        </Badge>
      );
    } else if (remainingDays <= 60) {
      return (
        <Badge bg="info" text="dark" className="d-inline-flex align-items-center gap-1 px-2 py-1">
          <FaClock size={11} /> Nearing Expiry ({remainingDays}d)
        </Badge>
      );
    } else {
      return (
        <Badge bg="success" className="d-inline-flex align-items-center gap-1 px-2 py-1">
          <FaCheckCircle size={11} /> Active ({remainingDays}d)
        </Badge>
      );
    }
  };

  return (
    <Container fluid className="px-4 py-4">
      {/* Header and Action Banner */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-extrabold text-white mb-1">Products & Warranty Management</h2>
          <p className="text-muted small mb-0">
            Hardware asset catalog and unified multi-stage warranty lifecycle tracking
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Button 
            variant="primary" 
            className="d-flex align-items-center gap-2 shadow-sm"
            onClick={() => setShowRegModal(true)}
          >
            <FaPlusCircle />
            <span>Register New Product</span>
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <Nav variant="tabs" className="mb-4 border-secondary border-opacity-25">
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'products'} 
            onClick={() => setActiveTab('products')}
            className={`d-flex align-items-center gap-2 fw-semibold ${activeTab === 'products' ? 'text-primary border-primary border-bottom-0' : 'text-light'}`}
            style={{ cursor: 'pointer' }}
          >
            <FaBox />
            <span>Products Catalog ({products.length})</span>
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'warranties'} 
            onClick={() => setActiveTab('warranties')}
            className={`d-flex align-items-center gap-2 fw-semibold ${activeTab === 'warranties' ? 'text-primary border-primary border-bottom-0' : 'text-light'}`}
            style={{ cursor: 'pointer' }}
          >
            <FaShieldAlt />
            <span>Warranty Lifecycle Records</span>
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* TAB 1: PRODUCTS CATALOG */}
      {activeTab === 'products' && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <span className="text-secondary small fw-medium">
              Showing {filteredProducts.length} registered hardware assets
            </span>
            <div style={{ maxWidth: 320 }} className="w-100">
              <InputGroup size="sm">
                <Form.Control
                  type="text"
                  placeholder="Search product, model, or serial..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="bg-dark border-secondary text-white"
                />
                <Button variant="primary">
                  <FaSearch />
                </Button>
              </InputGroup>
            </div>
          </div>

          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="table-responsive">
              <Table className="table-dark-custom mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Product ID</th>
                    <th>Asset Name & Brand</th>
                    <th>Category</th>
                    <th>Model #</th>
                    <th>Hardware Serial #</th>
                    <th>Purchase Price</th>
                    <th>Purchase Date</th>
                    <th>Warranty Status</th>
                    <th className="text-end">Claim Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingProducts ? (
                    <tr>
                      <td colSpan="9" className="text-center py-5">
                        <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                        Loading product catalog...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-5 text-muted">
                        No products found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => (
                      <tr key={p.product_id}>
                        <td>
                          <span className="font-mono fw-bold text-info fs-6">{p.product_id}</span>
                        </td>
                        <td>
                          <div className="fw-semibold text-white">{p.name}</div>
                          <small className="text-muted">{p.brand} • {p.retailer}</small>
                        </td>
                        <td>
                          <span className="badge bg-secondary bg-opacity-25 text-light">{p.category}</span>
                        </td>
                        <td className="font-mono text-muted small">{p.model_number}</td>
                        <td className="font-mono text-light small fw-bold">{p.serial_number}</td>
                        <td className="font-mono text-success small">${p.purchase_price ? p.purchase_price.toFixed(2) : '0.00'}</td>
                        <td className="text-muted small">{p.purchase_date}</td>
                        <td>
                          <Badge 
                            bg={p.warranty_status === 'Expired' ? 'danger' : 'success'} 
                            className="d-inline-flex align-items-center gap-1 px-2 py-1"
                          >
                            {p.warranty_status === 'Expired' ? <FaTimesCircle size={10} /> : <FaCheckCircle size={10} />}
                            <span>{p.warranty_status || 'Active'}</span>
                          </Badge>
                        </td>
                        <td className="text-end">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => navigate('/claims/submit')}
                            className="py-1 px-3 d-inline-flex align-items-center gap-1"
                          >
                            <FaShieldAlt size={12} /> File Claim
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        </>
      )}

      {/* TAB 2: WARRANTY LIFECYCLE RECORDS */}
      {activeTab === 'warranties' && (
        <>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-2 flex-wrap">
            {/* Quick Status Filter Pills */}
            <div className="d-flex align-items-center gap-1 flex-wrap">
              <Button 
                size="sm" 
                variant={warrantyFilter === 'all' ? 'primary' : 'outline-secondary'}
                onClick={() => setWarrantyFilter('all')}
                className="py-1 px-3"
              >
                All Warranties
              </Button>
              <Button 
                size="sm" 
                variant={warrantyFilter === 'active' ? 'success' : 'outline-secondary'}
                onClick={() => setWarrantyFilter('active')}
                className="py-1 px-3 d-flex align-items-center gap-1"
              >
                <FaCheckCircle size={12} /> Active
              </Button>
              <Button 
                size="sm" 
                variant={warrantyFilter === 'expiring_soon' ? 'warning' : 'outline-secondary'}
                onClick={() => setWarrantyFilter('expiring_soon')}
                className="py-1 px-3 d-flex align-items-center gap-1 text-dark fw-bold"
              >
                <FaExclamationTriangle size={12} /> Expiring Soon (&lt; 30d)
              </Button>
              <Button 
                size="sm" 
                variant={warrantyFilter === 'expired' ? 'danger' : 'outline-secondary'}
                onClick={() => setWarrantyFilter('expired')}
                className="py-1 px-3 d-flex align-items-center gap-1"
              >
                <FaTimesCircle size={12} /> Expired
              </Button>
            </div>

            <div style={{ maxWidth: 320 }} className="w-100">
              <InputGroup size="sm">
                <Form.Control
                  type="text"
                  placeholder="Search warranty ID, serial, product..."
                  value={warrantySearch}
                  onChange={(e) => setWarrantySearch(e.target.value)}
                  className="bg-dark border-secondary text-white"
                />
                <Button variant="primary">
                  <FaSearch />
                </Button>
              </InputGroup>
            </div>
          </div>

          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="table-responsive">
              <Table className="table-dark-custom mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Warranty ID</th>
                    <th>Linked Product</th>
                    <th>Hardware Serial #</th>
                    <th>Provider & Type</th>
                    <th>Coverage Period</th>
                    <th>Calculated Status</th>
                    <th className="text-end">Claim Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingWarranties ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                        Evaluating warranty lifecycles...
                      </td>
                    </tr>
                  ) : filteredWarranties.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        No warranty records found for this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredWarranties.map((w) => (
                      <tr key={w.warranty_id}>
                        <td>
                          <span className="font-mono fw-bold text-info fs-6">{w.warranty_id}</span>
                          <div className="text-muted small">{w.product_id}</div>
                        </td>
                        <td>
                          <div className="fw-semibold text-white">{w.product?.name || 'Hardware Asset'}</div>
                          <small className="text-muted">{w.product?.brand} • {w.product?.category}</small>
                        </td>
                        <td className="font-mono text-light small fw-bold">
                          {w.product?.serial_number || 'N/A'}
                        </td>
                        <td>
                          <div className="text-light small">{w.provider}</div>
                          <Badge bg="secondary" className="bg-opacity-25 text-light text-uppercase" style={{ fontSize: '0.65rem' }}>
                            {w.warranty_type}
                          </Badge>
                        </td>
                        <td className="small">
                          <div className="text-white">{w.start_date} <span className="text-muted">to</span> {w.end_date}</div>
                        </td>
                        <td>
                          {getStatusBadge(w.calculated_status, w.remaining_days)}
                        </td>
                        <td className="text-end">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => navigate('/claims/submit')}
                            className="py-1 px-3 d-inline-flex align-items-center gap-1"
                          >
                            <FaShieldAlt size={12} /> File Claim
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        </>
      )}

      {/* PRODUCT REGISTRATION MODAL */}
      <Modal 
        show={showRegModal} 
        onHide={() => setShowRegModal(false)} 
        size="lg" 
        centered 
        backdrop="static"
      >
        <Modal.Header closeButton closeVariant="white" className="border-bottom border-secondary border-opacity-25 pb-3">
          <Modal.Title className="d-flex align-items-center gap-2 fw-bold text-white fs-5">
            <FaBox className="text-primary" />
            <span>Register New Product & Warranty</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          {regSuccess && (
            <Alert variant="success" className="py-2 d-flex align-items-center gap-2 small">
              <FaCheckCircle /> {regSuccess}
            </Alert>
          )}
          {regError && (
            <Alert variant="danger" className="py-2 small" dismissible onClose={() => setRegError('')}>
              {regError}
            </Alert>
          )}

          <Form onSubmit={handleRegisterProduct}>
            <Row className="g-3">
              <Col md={7}>
                <Form.Group controlId="prodName">
                  <Form.Label className="small fw-semibold text-light">Product Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Sony Bravia 55 inch OLED 4K TV"
                    required
                    autoFocus
                  />
                </Form.Group>
              </Col>

              <Col md={5}>
                <Form.Group controlId="prodCategory">
                  <Form.Label className="small fw-semibold text-light">Category *</Form.Label>
                  <Form.Select 
                    name="category" 
                    value={formData.category} 
                    onChange={handleInputChange}
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Appliances">Appliances</option>
                    <option value="Automotive">Automotive</option>
                    <option value="Smart Home">Smart Home</option>
                    <option value="Wearables & Audio">Wearables & Audio</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="prodBrand">
                  <Form.Label className="small fw-semibold text-light">Brand *</Form.Label>
                  <Form.Control
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleInputChange}
                    placeholder="e.g. Sony"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="prodModel">
                  <Form.Label className="small fw-semibold text-light">Model Number *</Form.Label>
                  <Form.Control
                    type="text"
                    name="model_number"
                    value={formData.model_number}
                    onChange={handleInputChange}
                    placeholder="e.g. XR-55A80L"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="prodSerial">
                  <Form.Label className="small fw-semibold text-light">Unique Hardware Serial Number *</Form.Label>
                  <Form.Control
                    type="text"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleInputChange}
                    placeholder="e.g. SN-SONY-78219"
                    required
                  />
                  <Form.Text className="text-secondary small">
                    Must be unique across catalog. Used for fraud prevention.
                  </Form.Text>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="prodRetailer">
                  <Form.Label className="small fw-semibold text-light">Retailer / Dealer *</Form.Label>
                  <Form.Control
                    type="text"
                    name="retailer"
                    value={formData.retailer}
                    onChange={handleInputChange}
                    placeholder="e.g. Best Buy / Amazon"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group controlId="prodPrice">
                  <Form.Label className="small fw-semibold text-light">Purchase Price (USD) *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text className="bg-dark border-secondary text-secondary">$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="1"
                      name="purchase_price"
                      value={formData.purchase_price}
                      onChange={handleInputChange}
                      placeholder="1299.99"
                      required
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group controlId="prodPurchaseDate">
                  <Form.Label className="small fw-semibold text-light">Purchase Date *</Form.Label>
                  <Form.Control
                    type="date"
                    name="purchase_date"
                    value={formData.purchase_date}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group controlId="prodWarrantyMonths">
                  <Form.Label className="small fw-semibold text-light">Warranty Duration *</Form.Label>
                  <Form.Select 
                    name="warranty_duration_months" 
                    value={formData.warranty_duration_months} 
                    onChange={handleInputChange}
                  >
                    <option value="12">12 Months (1 Year)</option>
                    <option value="24">24 Months (2 Years)</option>
                    <option value="36">36 Months (3 Years)</option>
                    <option value="60">60 Months (5 Years)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary border-opacity-25">
              <Button 
                variant="outline-secondary" 
                onClick={() => setShowRegModal(false)}
                disabled={regLoading}
                className="text-light"
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit" 
                disabled={regLoading}
                className="d-flex align-items-center gap-2"
              >
                {regLoading ? (
                  <>
                    <Spinner size="sm" animation="border" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <FaPlusCircle />
                    <span>Save & Register Product</span>
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}
