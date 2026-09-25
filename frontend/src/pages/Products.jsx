/**
 * Products Catalog Page — AssureX Claim Engine
 * Browse registered hardware assets and initiate direct warranty claims
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Spinner, InputGroup, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { productsAPI } from '../api';
import { FaBox, FaSearch, FaPlusCircle, FaShieldAlt } from 'react-icons/fa';

export default function Products() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await productsAPI.getProducts();
      setProducts(res.data || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.model_number?.toLowerCase().includes(q) ||
      p.serial_number?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  return (
    <Container fluid className="px-4 py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-extrabold text-white mb-1">Registered Products & Assets</h2>
          <p className="text-muted small mb-0">
            Catalog of customer appliances, consumer electronics, and automotive components under warranty coverage
          </p>
        </div>

        <div style={{ maxWidth: 320 }}>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Search product, model, or serial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="primary">
              <FaSearch />
            </Button>
          </InputGroup>
        </div>
      </div>

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span className="fw-bold d-flex align-items-center gap-2">
            <FaBox className="text-primary" /> {filteredProducts.length} Registered Products
          </span>
        </Card.Header>
        <div className="table-responsive">
          <Table className="table-dark-custom mb-0">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Asset Name & Brand</th>
                <th>Category</th>
                <th>Model #</th>
                <th>Hardware Serial #</th>
                <th>Purchase Price</th>
                <th>Purchase Date</th>
                <th className="text-end">Claim Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                    Loading product catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.product_id}>
                    <td>
                      <span className="font-mono fw-bold text-primary">{p.product_id}</span>
                    </td>
                    <td>
                      <div className="fw-semibold text-white">{p.name}</div>
                      <small className="text-muted">{p.brand} • {p.retailer}</small>
                    </td>
                    <td>
                      <span className="badge bg-secondary bg-opacity-25 text-light">{p.category}</span>
                    </td>
                    <td className="font-mono text-muted small">{p.model_number}</td>
                    <td className="font-mono text-light small">{p.serial_number}</td>
                    <td className="font-mono text-success small">${p.purchase_price ? p.purchase_price.toFixed(2) : '0.00'}</td>
                    <td className="text-muted small">{p.purchase_date}</td>
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
    </Container>
  );
}
