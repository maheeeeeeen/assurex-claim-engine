/**
 * ProfileModal.jsx — User Profile Management Modal
 * 
 * Displays and edits user profile details:
 * - Unique User ID (USR-XXXX) with copy to clipboard
 * - Role badge (Customer / Employee / Reviewer / Admin)
 * - Full Name, Email, Phone
 * - Registration date
 * - Live update through PUT /api/auth/profile
 */

import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Badge, InputGroup, Spinner } from 'react-bootstrap';
import { 
  FaUser, 
  FaIdBadge, 
  FaEnvelope, 
  FaPhone, 
  FaShieldAlt, 
  FaCopy, 
  FaCheck, 
  FaSave,
  FaCalendarAlt
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/auth';

export default function ProfileModal({ show, onHide }) {
  const { user, updateUser } = useAuth();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Load fresh profile details on modal open
  useEffect(() => {
    if (show) {
      setSuccessMsg('');
      setErrorMsg('');
      setCopied(false);

      if (user) {
        setFormData({
          full_name: user.full_name || '',
          email: user.email || '',
          phone: user.phone || '',
        });
      }

      const fetchFreshProfile = async () => {
        setFetching(true);
        try {
          const res = await authAPI.getProfile();
          if (res.data) {
            updateUser(res.data);
            setFormData({
              full_name: res.data.full_name || '',
              email: res.data.email || '',
              phone: res.data.phone || '',
            });
          }
        } catch (err) {
          console.error('Failed to load fresh profile:', err);
        } finally {
          setFetching(false);
        }
      };

      fetchFreshProfile();
    }
  }, [show]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCopyId = () => {
    const idToCopy = user?.user_code || `USR-${String(user?.id || 1).padStart(4, '0')}`;
    navigator.clipboard.writeText(idToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await authAPI.updateProfile({
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || undefined,
      });

      updateUser(res.data);
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'danger';
      case 'reviewer':
        return 'warning';
      case 'employee':
        return 'info';
      case 'customer':
      default:
        return 'primary';
    }
  };

  const userCode = user?.user_code || (user?.id ? `USR-${String(user.id).padStart(4, '0')}` : 'USR-0001');

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" className="profile-modal">
      <Modal.Header closeButton closeVariant="white" className="border-bottom border-secondary border-opacity-25 pb-3">
        <Modal.Title className="d-flex align-items-center gap-2 fw-bold text-white fs-5">
          <FaUser className="text-primary" />
          <span>User Profile Management</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-3 pb-4 px-4">
        {/* Header User Card (Dark Theme High-Contrast) */}
        <div 
          className="rounded-3 p-3 mb-4 d-flex flex-column gap-2"
          style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.15)' }}
        >
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <span className="small d-block fw-semibold" style={{ color: '#94a3b8' }}>Unique User ID</span>
              <div className="d-flex align-items-center gap-2 mt-1">
                <span 
                  className="fw-bold font-monospace text-info fs-6 px-2 py-1 rounded"
                  style={{ backgroundColor: '#1e293b', border: '1px solid rgba(56, 189, 248, 0.3)' }}
                >
                  {userCode}
                </span>
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={handleCopyId}
                  title="Copy User ID"
                  className="py-1 px-2 d-flex align-items-center gap-1 text-light border-secondary"
                >
                  {copied ? <><FaCheck className="text-success" /> <span className="small">Copied</span></> : <><FaCopy /> <span className="small">Copy</span></>}
                </Button>
              </div>
            </div>

            <div className="text-end">
              <span className="small d-block fw-semibold" style={{ color: '#94a3b8' }}>Access Role</span>
              <Badge 
                bg={getRoleBadgeVariant(user?.role)} 
                className="mt-1 text-uppercase px-3 py-2 fw-semibold"
              >
                <FaShieldAlt className="me-1" />
                {user?.role || 'Customer'}
              </Badge>
            </div>
          </div>

          <div 
            className="border-top pt-2 mt-2 d-flex justify-content-between small"
            style={{ borderColor: 'rgba(255, 255, 255, 0.12)', color: '#94a3b8' }}
          >
            <span>Username: <strong className="text-white">@{user?.username}</strong></span>
            {user?.created_at && (
              <span className="d-flex align-items-center gap-1 text-light">
                <FaCalendarAlt size={11} className="text-info" />
                Joined {new Date(user.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Feedback alerts */}
        {successMsg && (
          <Alert variant="success" className="py-2 d-flex align-items-center gap-2 small">
            <FaCheck /> {successMsg}
          </Alert>
        )}
        {errorMsg && (
          <Alert variant="danger" className="py-2 small" dismissible onClose={() => setErrorMsg('')}>
            {errorMsg}
          </Alert>
        )}

        {/* Editable Form */}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="profileFullName">
            <Form.Label className="small fw-semibold text-light">
              <FaIdBadge className="me-1 text-primary" /> Full Name
            </Form.Label>
            <Form.Control
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="profileEmail">
            <Form.Label className="small fw-semibold text-light">
              <FaEnvelope className="me-1 text-primary" /> Email Address
            </Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@example.com"
              required
            />
          </Form.Group>

          <Form.Group className="mb-4" controlId="profilePhone">
            <Form.Label className="small fw-semibold text-light">
              <FaPhone className="me-1 text-primary" /> Phone Number <span className="text-muted fw-normal">(Optional)</span>
            </Form.Label>
            <Form.Control
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. +1 (555) 019-2834"
            />
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="outline-secondary" onClick={onHide} disabled={loading} className="text-light">
              Close
            </Button>
            <Button variant="primary" type="submit" disabled={loading || fetching} className="d-flex align-items-center gap-2">
              {loading ? (
                <>
                  <Spinner size="sm" animation="border" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FaSave />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
