/**
 * Admin Console Page — AssureX Claim Engine
 * Step 5: Advanced Admin Dashboard with 8-Model Performance Benchmark,
 * Executive Claims Analytics, and Autonomous Decision Threshold Controls.
 */

import React, { useState, useEffect } from 'react';
import { Container, Button, Spinner, Alert, Badge, Nav } from 'react-bootstrap';
import { adminAPI, policiesAPI } from '../api';
import { 
  FaCogs, 
  FaBrain, 
  FaChartPie, 
  FaSyncAlt, 
  FaSlidersH,
  FaCheckCircle
} from 'react-icons/fa';

import ModelPerformanceTab from '../components/admin/ModelPerformanceTab';
import ClaimsAnalyticsTab from '../components/admin/ClaimsAnalyticsTab';
import OperationsTab from '../components/admin/OperationsTab';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('models'); // 'models', 'analytics', 'operations'
  
  // Data states
  const [status, setStatus] = useState(null);
  const [modelComparison, setModelComparison] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [thresholds, setThresholds] = useState({
    auto_approve_confidence: 0.85,
    auto_reject_confidence: 0.85,
    disagreement_delta_threshold: 0.25,
  });

  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statusRes, threshRes, modelRes, analyticsRes] = await Promise.all([
        adminAPI.getStatus(),
        policiesAPI.getThresholds(),
        adminAPI.getModelComparison(),
        adminAPI.getAnalytics(),
      ]);

      setStatus(statusRes.data);
      if (threshRes.data) {
        setThresholds(threshRes.data);
      }
      setModelComparison(modelRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setError('Could not load administrative telemetry or model benchmark reports.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveThresholds = async (e) => {
    e.preventDefault();
    setSavingThresholds(true);
    setMessage('');
    setError('');
    try {
      await policiesAPI.updateThresholds(thresholds);
      setMessage('Adjudication confidence thresholds successfully saved!');
    } catch (err) {
      console.error('Failed to update thresholds:', err);
      setError('Could not update policy thresholds.');
    } finally {
      setSavingThresholds(false);
    }
  };

  const handleSeedDatabase = async () => {
    if (!window.confirm('Trigger demo data re-seed? This will populate initial users, products, and 35 balanced test claims.')) {
      return;
    }
    setSeeding(true);
    setMessage('');
    setError('');
    try {
      const res = await adminAPI.seedDemo();
      setMessage(`Seeding complete: ${res.data.seeded_claims} claims processed.`);
      await loadAllAdminData();
    } catch (err) {
      console.error('Seeding failed:', err);
      setError('Database seeding encountered an error.');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" className="my-5" />
        <h5 className="text-muted">Loading administrative intelligence & model telemetry...</h5>
      </Container>
    );
  }

  return (
    <Container fluid className="px-4 py-4">
      {/* Header & Controls */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-extrabold text-white mb-1 d-flex align-items-center gap-2">
            <span>Administrative Intelligence Center</span>
            <Badge bg="primary" className="fs-6 px-2 py-1 text-uppercase" style={{ letterSpacing: '0.05em' }}>
              v2.0
            </Badge>
          </h2>
          <p className="text-muted small mb-0">
            Model performance benchmarks, real-time adjudication analytics, and autonomous arbitration controls
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={loadAllAdminData}
            disabled={loading}
            className="d-flex align-items-center gap-2"
          >
            <FaSyncAlt className={loading ? 'fa-spin' : ''} /> Refresh Telemetry
          </Button>
        </div>
      </div>

      {message && <Alert variant="success" dismissible onClose={() => setMessage('')}>{message}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      {/* Modern High-Contrast Pill Tabs */}
      <div className="mb-4 p-1 rounded bg-surface border border-subtle d-inline-flex flex-wrap gap-1">
        <Button
          variant={activeTab === 'models' ? 'primary' : 'link'}
          className={`d-flex align-items-center gap-2 px-3 py-2 fw-semibold text-decoration-none ${activeTab === 'models' ? 'text-white' : 'text-muted'}`}
          onClick={() => setActiveTab('models')}
        >
          <FaBrain /> Model Performance Benchmark
          <Badge bg={activeTab === 'models' ? 'light' : 'secondary'} className={activeTab === 'models' ? 'text-dark' : 'text-white'}>
            8 Models
          </Badge>
        </Button>

        <Button
          variant={activeTab === 'analytics' ? 'primary' : 'link'}
          className={`d-flex align-items-center gap-2 px-3 py-2 fw-semibold text-decoration-none ${activeTab === 'analytics' ? 'text-white' : 'text-muted'}`}
          onClick={() => setActiveTab('analytics')}
        >
          <FaChartPie /> Claims & Adjudication Analytics
          <Badge bg={activeTab === 'analytics' ? 'light' : 'secondary'} className={activeTab === 'analytics' ? 'text-dark' : 'text-white'}>
            {analytics?.total_claims || 0}
          </Badge>
        </Button>

        <Button
          variant={activeTab === 'operations' ? 'primary' : 'link'}
          className={`d-flex align-items-center gap-2 px-3 py-2 fw-semibold text-decoration-none ${activeTab === 'operations' ? 'text-white' : 'text-muted'}`}
          onClick={() => setActiveTab('operations')}
        >
          <FaSlidersH /> System Telemetry & Thresholds
        </Button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'models' && (
        <ModelPerformanceTab 
          data={modelComparison} 
          loading={loading} 
          onRefresh={loadAllAdminData} 
        />
      )}

      {activeTab === 'analytics' && (
        <ClaimsAnalyticsTab 
          data={analytics} 
          loading={loading} 
          onRefresh={loadAllAdminData} 
        />
      )}

      {activeTab === 'operations' && (
        <OperationsTab 
          status={status}
          thresholds={thresholds}
          setThresholds={setThresholds}
          handleSaveThresholds={handleSaveThresholds}
          handleSeedDatabase={handleSeedDatabase}
          savingThresholds={savingThresholds}
          seeding={seeding}
        />
      )}
    </Container>
  );
}
