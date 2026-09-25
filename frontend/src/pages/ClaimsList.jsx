/**
 * Claims List Page — AssureX Claim Engine
 * Search, filter, and inspect warranty claim records
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Spinner, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { claimsAPI } from '../api';
import { 
  FaSearch, 
  FaFilter, 
  FaCheckCircle, 
  FaExchangeAlt, 
  FaEye, 
  FaPlusCircle, 
  FaUndo 
} from 'react-icons/fa';

export default function ClaimsList() {
  const navigate = useNavigate();

  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchClaims();
  }, [statusFilter, categoryFilter]);

  const fetchClaims = async (searchTerm = search) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        limit: 100,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: searchTerm.trim() ? searchTerm.trim() : undefined,
      };
      const res = await claimsAPI.getClaims(params);
      setClaims(res.data || []);
    } catch (err) {
      console.error('Error fetching claims:', err);
      setError('Failed to retrieve claim records.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchClaims(search);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    fetchClaims('');
  };

  return (
    <Container fluid className="px-4 py-4">
      {/* Title & Action Bar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-extrabold text-white mb-1">Warranty Claims Repository</h2>
          <p className="text-muted small mb-0">
            Browse, search, and audit all submitted claims with dual-model adjudication scores
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => navigate('/claims/submit')}
          className="d-flex align-items-center gap-2"
        >
          <FaPlusCircle /> Submit Claim
        </Button>
      </div>

      {/* Filter Card */}
      <Card className="mb-4">
        <Card.Body className="p-3">
          <Form onSubmit={handleSearchSubmit}>
            <Row className="g-3 align-items-end">
              <Col md={4}>
                <Form.Label className="small text-muted mb-1">Search Identifier / Product / SN</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Search by Claim ID, Product, Serial #..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Button variant="primary" type="submit">
                    <FaSearch />
                  </Button>
                </InputGroup>
              </Col>

              <Col sm={6} md={3}>
                <Form.Label className="small text-muted mb-1">Adjudication Status</Form.Label>
                <Form.Select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Adjudication Statuses</option>
                  <option value="Auto-Approved">Auto-Approved</option>
                  <option value="Auto-Rejected">Auto-Rejected</option>
                  <option value="Manual Review Required">Manual Review Required</option>
                  <option value="Approved">Approved (Adjuster)</option>
                  <option value="Rejected">Rejected (Adjuster)</option>
                  <option value="Information Requested">Information Requested</option>
                </Form.Select>
              </Col>

              <Col sm={6} md={3}>
                <Form.Label className="small text-muted mb-1">Product Category</Form.Label>
                <Form.Select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  <option value="Appliances">Appliances</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Automotive">Automotive</option>
                </Form.Select>
              </Col>

              <Col md={2} className="d-flex gap-2">
                <Button 
                  variant="outline-secondary" 
                  onClick={handleResetFilters}
                  className="w-100 d-flex align-items-center justify-content-center gap-1"
                >
                  <FaUndo size={12} /> Reset
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* Claims Table Card */}
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span className="fw-bold">
            Showing {claims.length} Claim Records
          </span>
          <span className="text-muted small">
            Click 'View Dossier' to review cards, rule checklists, and probability matrices
          </span>
        </Card.Header>
        <div className="table-responsive">
          <Table className="table-dark-custom mb-0">
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Product & Serial</th>
                <th>Category</th>
                <th>Fault Details</th>
                <th>Dual AI Agreement</th>
                <th>Final Confidence</th>
                <th>Adjudication Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                    Loading claims...
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    No claims match your filter criteria.
                  </td>
                </tr>
              ) : (
                claims.map((c) => (
                  <tr key={c.claim_id}>
                    <td>
                      <span className="font-mono fw-bold text-primary">{c.claim_id}</span>
                      <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                        {c.claim_submission_date}
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold text-white">{c.product_name}</div>
                      <small className="text-muted font-mono" style={{ fontSize: '0.75rem' }}>
                        {c.brand} • SN: {c.serial_number_entered}
                      </small>
                    </td>
                    <td>
                      <span className="badge bg-secondary bg-opacity-25 text-light">{c.product_category}</span>
                    </td>
                    <td>
                      <div className="text-truncate" style={{ maxWidth: 200 }}>
                        <span className="fw-semibold text-light">{c.fault_type}</span>
                        <div className="text-muted small text-truncate">{c.damage_type}</div>
                      </div>
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
                        <div className="progress flex-grow-1" style={{ height: 4, width: 45, backgroundColor: 'rgba(255,255,255,0.1)' }}>
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
                    <td className="text-end">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => navigate(`/claims/${c.claim_id}`)}
                        className="py-1 px-3 d-inline-flex align-items-center gap-1"
                      >
                        <FaEye size={12} /> Dossier
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
