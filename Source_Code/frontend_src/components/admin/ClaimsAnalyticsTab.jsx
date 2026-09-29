/**
 * ClaimsAnalyticsTab.jsx — AssureX Claim Engine
 * Step 5: Executive Claims Analytics, Outcomes Distribution,
 * Dual-Model Agreement, Consistency Statuses, and Review Drivers.
 */

import React from 'react';
import { Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { 
  FaChartPie, 
  FaExchangeAlt, 
  FaCalendarAlt, 
  FaExclamationTriangle, 
  FaBoxes, 
  FaTools,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaSyncAlt
} from 'react-icons/fa';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  AreaChart, 
  Area 
} from 'recharts';

export default function ClaimsAnalyticsTab({ data, loading, onRefresh }) {
  if (!data) {
    return (
      <div className="text-center py-5 text-muted">
        <p>No claims analytics data available.</p>
        <Button variant="outline-primary" size="sm" onClick={onRefresh}>
          <FaSyncAlt className="me-1" /> Retry Loading
        </Button>
      </div>
    );
  }

  const {
    total_claims,
    auto_approved_count,
    auto_rejected_count,
    manual_review_count,
    agreement_rate_pct,
    outcomes_chart,
    agreement_chart,
    match_categories_chart,
    confidence_delta_bins,
    timeline_chart,
    review_reasons_chart,
    category_chart,
    top_faults_chart,
  } = data;

  const autoApprovedPct = total_claims > 0 ? ((auto_approved_count / total_claims) * 100).toFixed(1) : 0;
  const autoRejectedPct = total_claims > 0 ? ((auto_rejected_count / total_claims) * 100).toFixed(1) : 0;
  const manualReviewPct = total_claims > 0 ? ((manual_review_count / total_claims) * 100).toFixed(1) : 0;

  // Custom Dark Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded shadow-lg border border-subtle" style={{ backgroundColor: '#1e293b' }}>
          <div className="fw-bold text-white mb-1">{label || payload[0].name}</div>
          <div className="font-mono text-cyan fw-bold">
            {payload[0].value.toLocaleString()} claims
          </div>
          {payload[0].payload?.percentage && (
            <div className="small text-muted">{payload[0].payload.percentage}% of total</div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* 1. EXECUTIVE KPI CARDS */}
      <Row className="g-3 mb-4">
        <Col sm={6} lg={3}>
          <Card className="p-3 border-subtle bg-surface">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Total Adjudications</span>
              <span className="p-1 px-2 rounded bg-primary text-white font-mono small">All-Time</span>
            </div>
            <div className="fs-3 fw-extrabold text-white font-mono">{total_claims?.toLocaleString()}</div>
            <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
              Enriched with 1,500 test claims
            </div>
          </Card>
        </Col>

        <Col sm={6} lg={3}>
          <Card className="p-3 border-subtle bg-surface">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Auto-Approved</span>
              <FaCheckCircle className="text-success" />
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <div className="fs-3 fw-extrabold text-emerald font-mono" style={{ color: '#10b981' }}>
                {auto_approved_count?.toLocaleString()}
              </div>
              <Badge bg="success" className="font-mono">{autoApprovedPct}%</Badge>
            </div>
            <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
              Instant zero-touch approvals
            </div>
          </Card>
        </Col>

        <Col sm={6} lg={3}>
          <Card className="p-3 border-subtle bg-surface">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Auto-Rejected</span>
              <FaTimesCircle className="text-danger" />
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <div className="fs-3 fw-extrabold text-danger font-mono">
                {auto_rejected_count?.toLocaleString()}
              </div>
              <Badge bg="danger" className="font-mono">{autoRejectedPct}%</Badge>
            </div>
            <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
              Definitive policy & fraud blocks
            </div>
          </Card>
        </Col>

        <Col sm={6} lg={3}>
          <Card className="p-3 border-subtle bg-surface">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Dual AI Consensus</span>
              <FaExchangeAlt className="text-info" />
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <div className="fs-3 fw-extrabold text-info font-mono">
                {agreement_rate_pct}%
              </div>
              <Badge bg="info" className="text-dark font-mono">High Agreement</Badge>
            </div>
            <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
              Tabular AI + Vision AI aligned
            </div>
          </Card>
        </Col>
      </Row>

      {/* 2. CHARTS ROW 1: OUTCOMES, AI CONSENSUS, CONSISTENCY STATUS */}
      <Row className="g-4 mb-4">
        {/* Outcome Breakdown Donut */}
        <Col lg={4}>
          <Card className="h-100">
            <Card.Header className="d-flex align-items-center gap-2">
              <FaChartPie className="text-primary" />
              <span className="fw-bold text-white">Adjudication Outcomes</span>
            </Card.Header>
            <Card.Body className="p-3 d-flex flex-column align-items-center justify-content-center">
              <div style={{ width: '100%', height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outcomes_chart}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {outcomes_chart?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="d-flex justify-content-center flex-wrap gap-3 mt-2 small">
                {outcomes_chart?.map((item) => (
                  <div key={item.name} className="d-flex align-items-center gap-1">
                    <span className="d-inline-block rounded-circle" style={{ width: '10px', height: '10px', backgroundColor: item.color }}></span>
                    <span className="text-muted">{item.name}:</span>
                    <strong className="text-white font-mono">{item.value}</strong>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Dual AI Consensus Pie */}
        <Col lg={4}>
          <Card className="h-100">
            <Card.Header className="d-flex align-items-center gap-2">
              <FaExchangeAlt className="text-info" />
              <span className="fw-bold text-white">Dual AI Agreement vs Disagreement</span>
            </Card.Header>
            <Card.Body className="p-3 d-flex flex-column align-items-center justify-content-center">
              <div style={{ width: '100%', height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={agreement_chart}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {agreement_chart?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="d-flex justify-content-center flex-wrap gap-3 mt-2 small">
                {agreement_chart?.map((item) => (
                  <div key={item.name} className="d-flex align-items-center gap-1">
                    <span className="d-inline-block rounded-circle" style={{ width: '10px', height: '10px', backgroundColor: item.color }}></span>
                    <span className="text-muted">{item.name}:</span>
                    <strong className="text-white font-mono">{item.value}</strong>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Consistency Status Breakdown */}
        <Col lg={4}>
          <Card className="h-100">
            <Card.Header className="d-flex align-items-center gap-2">
              <FaCheckCircle className="text-success" />
              <span className="fw-bold text-white">Arbitration Match Categories</span>
            </Card.Header>
            <Card.Body className="p-3">
              <div style={{ width: '100%', height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={match_categories_chart}
                    layout="vertical"
                    margin={{ top: 10, right: 25, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
                    <XAxis type="number" stroke="#cbd5e1" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                    <YAxis 
                      type="category" 
                      dataKey="category" 
                      stroke="#cbd5e1" 
                      tick={{ fill: '#cbd5e1', fontSize: 10 }} 
                      width={125}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Claims" radius={[0, 4, 4, 0]}>
                      {match_categories_chart?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 3. CHARTS ROW 2: CONFIDENCE DELTA HISTOGRAM & TIMELINE */}
      <Row className="g-4 mb-4">
        {/* Confidence Difference Distribution */}
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="d-flex align-items-center gap-2">
              <FaChartPie className="text-warning" />
              <span className="fw-bold text-white">Confidence Delta Distribution (|Tabular - Vision|)</span>
            </Card.Header>
            <Card.Body className="p-3">
              <p className="text-muted small mb-2">
                Gap between Python tabular model confidence and Teachable Machine visual card confidence.
              </p>
              <div style={{ width: '100%', height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={confidence_delta_bins}
                    margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                    <XAxis dataKey="range" stroke="#cbd5e1" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                    <YAxis stroke="#cbd5e1" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Claims" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Claims Volume Over Time */}
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="d-flex align-items-center gap-2">
              <FaCalendarAlt className="text-primary" />
              <span className="fw-bold text-white">Claims Ingestion Velocity</span>
            </Card.Header>
            <Card.Body className="p-3">
              <p className="text-muted small mb-2">
                Daily volume of warranty claim intake across customer and dealer channels.
              </p>
              <div style={{ width: '100%', height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timeline_chart}
                    margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="claimColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                    <XAxis dataKey="date" stroke="#cbd5e1" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                    <YAxis stroke="#cbd5e1" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="claims" stroke="#3b82f6" fillOpacity={1} fill="url(#claimColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 4. CHARTS ROW 3: MANUAL REVIEW DRIVERS & CATEGORIES */}
      <Row className="g-4">
        {/* Manual Review Drivers */}
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="d-flex align-items-center gap-2">
              <FaExclamationTriangle className="text-warning" />
              <span className="fw-bold text-white">Manual Review Escalation Drivers</span>
            </Card.Header>
            <Card.Body className="p-3">
              <p className="text-muted small mb-2">
                Primary reasons why claims were automatically routed to the human reviewer queue.
              </p>
              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={review_reasons_chart}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
                    <XAxis type="number" stroke="#cbd5e1" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                    <YAxis 
                      type="category" 
                      dataKey="reason" 
                      stroke="#cbd5e1" 
                      tick={{ fill: '#cbd5e1', fontSize: 10 }} 
                      width={180}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Escalated Claims" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Product Category Volume */}
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="d-flex align-items-center gap-2">
              <FaBoxes className="text-cyan" />
              <span className="fw-bold text-white">Claims by Category (8 Configured Warranties)</span>
            </Card.Header>
            <Card.Body className="p-3">
              <p className="text-muted small mb-2">
                Distribution across electronics, automotive, smartphones, computers, appliances, and tools.
              </p>
              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={category_chart}
                    margin={{ top: 10, right: 20, left: 0, bottom: 35 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                    <XAxis 
                      dataKey="category" 
                      stroke="#cbd5e1" 
                      tick={{ fill: '#cbd5e1', fontSize: 10 }} 
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis stroke="#cbd5e1" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Claims" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
