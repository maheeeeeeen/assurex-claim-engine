/**
 * Review Queue Page — AssureX Claim Engine
 * Specialized Adjuster Workbench for Disputed, Borderline, and Manual-Review Claims
 */

import { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Spinner, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { claimsAPI } from '../api';
import { 
  FaTasks, 
  FaExclamationTriangle, 
  FaEye, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaClock 
} from 'react-icons/fa';

export default function ReviewQueue() {
  const navigate = useNavigate();

  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReviewClaims();
  }, []);

  const fetchReviewClaims = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch manual review claims
      const res = await claimsAPI.getClaims({ limit: 100 });
      // Filter for items requiring human attention
      const queue = (res.data || []).filter(
        (c) =>
          c.adjudication_status === 'Manual Review Required' ||
          c.adjudication_status === 'Information Requested' ||
          c.models_agreed === false
      );
      setClaims(queue);
    } catch (err) {
      console.error('Failed to load review queue:', err);
      setError('Could not retrieve review queue claims.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="px-4 py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h2 className="fw-extrabold text-white mb-0">Human Adjuster Review Queue</h2>
            <Badge bg="warning" className="text-dark fw-bold px-2 py-1">
              {claims.length} Pending Actions
            </Badge>
          </div>
          <p className="text-muted small mb-0">
            Claims flagged for human adjudication due to low confidence, dual-model disagreement, or borderline policy triggers
          </p>
        </div>

        <Button variant="outline-secondary" size="sm" onClick={fetchReviewClaims}>
          Refresh Queue
        </Button>
      </div>

      <Card>
        <Card.Header className="d-flex align-items-center gap-2">
          <FaTasks className="text-warning" />
          <span className="fw-bold">Prioritized Review Docket</span>
        </Card.Header>
        <div className="table-responsive">
          <Table className="table-dark-custom mb-0">
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Product & Retailer</th>
                <th>Review Trigger Reason</th>
                <th>Model Agreement</th>
                <th>Confidence Delta</th>
                <th>Adjudication Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                    Loading review docket...
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <FaCheckCircle className="text-success mb-2" size={28} />
                    <div className="fw-bold text-light">Review Queue is Clear!</div>
                    <small>All automated claims have been triaged or resolved.</small>
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
                      <small className="text-muted">{c.retailer || c.brand}</small>
                    </td>
                    <td>
                      <div className="text-light small text-truncate" style={{ maxWidth: 280 }}>
                        {c.decision_reason_summary}
                      </div>
                    </td>
                    <td>
                      {c.models_agreed ? (
                        <span className="pill-agreed d-inline-flex align-items-center gap-1">
                          <FaCheckCircle size={10} /> Agreed ({c.tabular_prediction})
                        </span>
                      ) : (
                        <span className="pill-disagreed d-inline-flex align-items-center gap-1">
                          <FaExclamationTriangle size={10} /> Disagreed (Tab: {c.tabular_prediction} vs TM: {c.tm_prediction})
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="font-mono small text-light">
                        {c.confidence_difference ? (c.confidence_difference * 100).toFixed(1) : 0}%
                      </span>
                    </td>
                    <td>
                      <span className="badge-status badge-review">
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
                        <FaEye size={12} /> Adjudicate
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
