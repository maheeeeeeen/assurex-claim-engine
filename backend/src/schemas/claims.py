"""
AssureX Claim Engine — Warranty Claim Schemas
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ClaimSubmitRequest(BaseModel):
    product_id: Optional[str] = None
    product_name: str
    product_category: str  # Electronics, Appliances, Automotive
    brand: str
    model_number: str
    serial_number_entered: str

    purchase_date: str
    purchase_price: float
    retailer: str
    warranty_start: str
    warranty_end: str
    warranty_provider: str
    warranty_type: str = "Standard"

    fault_date: str
    fault_type: str
    fault_description: str
    damage_type: str

    repair_history_count: int = 0
    previous_repair_authorized: bool = True

    # Upload indicator flags (when submitting raw multipart or mocked paths)
    receipt_uploaded: bool = True
    warranty_card_uploaded: bool = True
    product_image_uploaded: bool = True
    fault_evidence_uploaded: bool = True
    repair_report_uploaded: bool = False


class ClaimAdjudicationAction(BaseModel):
    decision: Optional[str] = None
    action: Optional[str] = None  # Approve, Reject, Request Information
    notes: Optional[str] = None
    reviewer_notes: Optional[str] = None


class ClaimResponse(BaseModel):
    id: int
    claim_id: str
    user_id: Optional[int] = None
    product_id: str
    product_name: str
    product_category: str
    brand: str
    model_number: str
    serial_number_entered: str
    purchase_date: str
    purchase_price: float
    retailer: str
    warranty_start: str
    warranty_end: str
    warranty_provider: str
    warranty_type: str
    fault_date: str
    claim_submission_date: str
    fault_type: str
    fault_description: str
    damage_type: str
    product_age_months: float
    remaining_warranty_days: float
    repair_history_count: int
    previous_repair_authorized: bool

    # Document & Anomaly Flags
    receipt_uploaded: bool
    warranty_card_uploaded: bool
    product_image_uploaded: bool
    fault_evidence_uploaded: bool
    serial_mismatch_flag: bool
    date_contradiction_flag: bool
    excluded_damage: bool
    duplicate_claim_flag: bool

    # Paths
    card_image_path: Optional[str] = None
    receipt_path: Optional[str] = None

    # Dual ML Predictions
    tabular_prediction: Optional[str] = None
    tabular_confidence: Optional[float] = None
    tabular_probabilities_json: Optional[str] = None

    tm_prediction: Optional[str] = None
    tm_confidence: Optional[float] = None
    tm_probabilities_json: Optional[str] = None

    confidence_difference: Optional[float] = None
    models_agreed: Optional[bool] = None
    match_category: Optional[str] = None

    # Decision
    adjudication_status: str
    adjudication_stage: str
    final_confidence: float
    decision_reason_summary: str
    decision_reasons_json: Optional[str] = None

    reviewed_by: Optional[str] = None
    reviewer_notes: Optional[str] = None
    adjudication_timestamp: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class ClaimStatsResponse(BaseModel):
    total_claims: int
    auto_approved_count: int
    auto_approved_pct: float
    auto_rejected_count: int
    auto_rejected_pct: float
    manual_review_count: int
    manual_review_pct: float
    resolved_count: int
    dual_model_agreement_rate: float
    category_counts: Dict[str, int]
    status_counts: Dict[str, int]
