"""
AssureX Claim Engine — Claims Adjudication Router

Provides end-to-end claim lifecycle endpoints:
- Multi-step claim intake & instant multi-model adjudication
- Filterable, searchable claim records
- Deep claim dossier retrieval with audit logs and card image links
- Human-in-the-loop manual review & adjudication action (Approve / Reject / Request Info)
- Real-time executive dashboard KPIs
"""

import os
import json
import uuid
from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, func

from src.database_setup import get_session
from src.models import Claim, ClaimAuditLog, User
from src.auth.service import get_current_user, require_role
from src.schemas.claims import ClaimSubmitRequest, ClaimAdjudicationAction, ClaimResponse, ClaimStatsResponse
from src.services.adjudication_engine import AdjudicationEngine
from src.services.card_service import CardService

router = APIRouter()

# Instantiate single shared adjudication engine for high performance
_adjudication_engine = None


def get_adjudication_engine() -> AdjudicationEngine:
    global _adjudication_engine
    if _adjudication_engine is None:
        _adjudication_engine = AdjudicationEngine()
    return _adjudication_engine


@router.post("/submit", response_model=ClaimResponse, status_code=status.HTTP_201_CREATED)
def submit_claim(
    claim_in: ClaimSubmitRequest,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Submits a warranty claim, triggers dynamic card generation, runs dual-model AI
    and deterministic business rules, and instantly adjudicates the claim.
    """
    engine = get_adjudication_engine()

    # Generate claim ID
    short_uuid = str(uuid.uuid4())[:8].upper()
    claim_id = f"CLM-2026-{short_uuid}"
    product_id = claim_in.product_id or f"PRD-{short_uuid[:6]}"

    # Calculate dates & derived metrics
    today = datetime.utcnow().date()
    sub_date = today.strftime("%Y-%m-%d")

    try:
        purchase_dt = datetime.strptime(claim_in.purchase_date[:10], "%Y-%m-%d").date()
        warranty_end_dt = datetime.strptime(claim_in.warranty_end[:10], "%Y-%m-%d").date()
        fault_dt = datetime.strptime(claim_in.fault_date[:10], "%Y-%m-%d").date()

        product_age_months = round((fault_dt - purchase_dt).days / 30.44, 1)
        remaining_days = float((warranty_end_dt - fault_dt).days)
    except Exception:
        product_age_months = 6.0
        remaining_days = 120.0

    # Calculate missing docs
    missing_docs = 0
    if not claim_in.receipt_uploaded: missing_docs += 1
    if not claim_in.warranty_card_uploaded: missing_docs += 1
    if not claim_in.product_image_uploaded: missing_docs += 1
    if not claim_in.fault_evidence_uploaded: missing_docs += 1

    claim_dict = {
        "claim_id": claim_id,
        "product_id": product_id,
        "product_name": claim_in.product_name,
        "product_category": claim_in.product_category,
        "brand": claim_in.brand,
        "model_number": claim_in.model_number,
        "serial_number_entered": claim_in.serial_number_entered,
        "serial_number_on_receipt": claim_in.serial_number_entered,
        "serial_number_on_warranty_card": claim_in.serial_number_entered,
        "purchase_date": claim_in.purchase_date,
        "purchase_price": claim_in.purchase_price,
        "retailer": claim_in.retailer,
        "warranty_start": claim_in.warranty_start,
        "warranty_end": claim_in.warranty_end,
        "warranty_provider": claim_in.warranty_provider,
        "warranty_type": claim_in.warranty_type,
        "fault_date": claim_in.fault_date,
        "claim_submission_date": sub_date,
        "fault_type": claim_in.fault_type,
        "fault_description": claim_in.fault_description,
        "damage_type": claim_in.damage_type,
        "product_age_months": product_age_months,
        "remaining_warranty_days": remaining_days,
        "repair_history_count": claim_in.repair_history_count,
        "previous_repair_authorized": claim_in.previous_repair_authorized,
        "receipt_uploaded": claim_in.receipt_uploaded,
        "warranty_card_uploaded": claim_in.warranty_card_uploaded,
        "product_image_uploaded": claim_in.product_image_uploaded,
        "fault_evidence_uploaded": claim_in.fault_evidence_uploaded,
        "repair_report_uploaded": claim_in.repair_report_uploaded,
        "missing_doc_count": missing_docs,
        "serial_mismatch_flag": False,
        "date_contradiction_flag": False,
        "excluded_damage": False,
        "duplicate_claim_flag": False,
    }

    # 1. Run Complete Adjudication Engine
    eval_result = engine.adjudicate(claim_dict)

    card_image_rel_path = CardService.get_card_url(claim_id)

    # 2. Construct DB Record
    db_claim = Claim(
        claim_id=claim_id,
        user_id=current_user.id if current_user else None,
        product_id=product_id,
        product_name=claim_in.product_name,
        product_category=claim_in.product_category,
        brand=claim_in.brand,
        model_number=claim_in.model_number,
        serial_number_entered=claim_in.serial_number_entered,
        purchase_date=claim_in.purchase_date,
        purchase_price=claim_in.purchase_price,
        retailer=claim_in.retailer,
        warranty_start=claim_in.warranty_start,
        warranty_end=claim_in.warranty_end,
        warranty_provider=claim_in.warranty_provider,
        warranty_type=claim_in.warranty_type,
        fault_date=claim_in.fault_date,
        claim_submission_date=sub_date,
        fault_type=claim_in.fault_type,
        fault_description=claim_in.fault_description,
        damage_type=claim_in.damage_type,
        product_age_months=product_age_months,
        remaining_warranty_days=remaining_days,
        repair_history_count=claim_in.repair_history_count,
        previous_repair_authorized=claim_in.previous_repair_authorized,
        receipt_uploaded=claim_in.receipt_uploaded,
        warranty_card_uploaded=claim_in.warranty_card_uploaded,
        product_image_uploaded=claim_in.product_image_uploaded,
        fault_evidence_uploaded=claim_in.fault_evidence_uploaded,
        repair_report_uploaded=claim_in.repair_report_uploaded,
        missing_doc_count=missing_docs,
        card_image_path=card_image_rel_path,
        rule_evaluation_json=json.dumps(eval_result["rule_evaluation"]),
        tabular_prediction=eval_result["tabular_prediction"]["predicted_class"],
        tabular_confidence=eval_result["tabular_prediction"]["top_confidence"],
        tabular_probabilities_json=json.dumps(eval_result["tabular_prediction"]["confidence_scores"]),
        tm_prediction=eval_result["tm_prediction"]["predicted_class"],
        tm_confidence=eval_result["tm_prediction"]["top_confidence"],
        tm_probabilities_json=json.dumps(eval_result["tm_prediction"]["confidence_scores"]),
        confidence_difference=eval_result["confidence_difference"],
        models_agreed=eval_result["models_agreed"],
        match_category=eval_result["match_category"],
        adjudication_status=eval_result["adjudication_status"],
        adjudication_stage=eval_result["adjudication_stage"],
        final_confidence=eval_result["final_confidence"],
        decision_reason_summary=eval_result["decision_reason_summary"],
        decision_reasons_json=json.dumps(eval_result["decision_reasons"]),
        adjudication_timestamp=eval_result["adjudication_timestamp"],
    )
    session.add(db_claim)

    # 3. Create Audit Log Entries
    actor_name = current_user.username if current_user else "Customer_Portal"
    log1 = ClaimAuditLog(
        claim_id=claim_id,
        actor=actor_name,
        action="CLAIM_SUBMITTED",
        details=f"Claim submitted for {claim_in.product_name} (SN: {claim_in.serial_number_entered}).",
    )
    log2 = ClaimAuditLog(
        claim_id=claim_id,
        actor="System_AI",
        action="CARD_GENERATED",
        details=f"High-DPI Claim Summary Card rendered at 1200x1680 without predictions.",
    )
    log3 = ClaimAuditLog(
        claim_id=claim_id,
        actor="Decision_Engine",
        action="AUTO_ADJUDICATED",
        details=f"Status: {eval_result['adjudication_status']} | Final Conf: {eval_result['final_confidence']*100:.1f}% | Match: {eval_result['match_category']}.",
    )
    session.add(log1)
    session.add(log2)
    session.add(log3)

    session.commit()
    session.refresh(db_claim)
    return db_claim


@router.get("/", response_model=List[ClaimResponse])
def list_claims(
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    session: Session = Depends(get_session)
):
    """Retrieves filterable list of claims."""
    query = select(Claim)

    if status and status != "all":
        query = query.where(Claim.adjudication_status == status)
    if category and category != "all":
        query = query.where(Claim.product_category == category)
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Claim.claim_id.like(search_filter)) |
            (Claim.product_name.like(search_filter)) |
            (Claim.serial_number_entered.like(search_filter)) |
            (Claim.brand.like(search_filter))
        )

    # Order newest first
    query = query.order_by(Claim.id.desc()).offset(skip).limit(limit)
    claims = session.exec(query).all()
    return claims


@router.get("/stats/summary", response_model=ClaimStatsResponse)
def get_claim_stats(session: Session = Depends(get_session)):
    """Computes real-time executive dashboard KPIs and adjudication rates."""
    all_claims = session.exec(select(Claim)).all()
    total = len(all_claims)

    if total == 0:
        return {
            "total_claims": 0,
            "auto_approved_count": 0,
            "auto_approved_pct": 0.0,
            "auto_rejected_count": 0,
            "auto_rejected_pct": 0.0,
            "manual_review_count": 0,
            "manual_review_pct": 0.0,
            "resolved_count": 0,
            "dual_model_agreement_rate": 0.0,
            "category_counts": {},
            "status_counts": {},
        }

    auto_approved = sum(1 for c in all_claims if c.adjudication_status == "Auto-Approved")
    auto_rejected = sum(1 for c in all_claims if c.adjudication_status == "Auto-Rejected")
    manual_review = sum(1 for c in all_claims if c.adjudication_status in ["Manual Review Required", "Information Requested"])
    resolved = sum(1 for c in all_claims if c.adjudication_status in ["Auto-Approved", "Auto-Rejected", "Approved", "Rejected"])
    agreed = sum(1 for c in all_claims if c.models_agreed is True)

    cat_counts = {}
    stat_counts = {}
    for c in all_claims:
        cat_counts[c.product_category] = cat_counts.get(c.product_category, 0) + 1
        stat_counts[c.adjudication_status] = stat_counts.get(c.adjudication_status, 0) + 1

    return {
        "total_claims": total,
        "auto_approved_count": auto_approved,
        "auto_approved_pct": round(auto_approved / total * 100, 1),
        "auto_rejected_count": auto_rejected,
        "auto_rejected_pct": round(auto_rejected / total * 100, 1),
        "manual_review_count": manual_review,
        "manual_review_pct": round(manual_review / total * 100, 1),
        "resolved_count": resolved,
        "dual_model_agreement_rate": round(agreed / total * 100, 1) if total > 0 else 0.0,
        "category_counts": cat_counts,
        "status_counts": stat_counts,
    }


@router.get("/{claim_id}")
def get_claim_detail(claim_id: str, session: Session = Depends(get_session)):
    """Retrieves full claim dossier, attached audit logs, and explanation JSON."""
    claim = session.exec(select(Claim).where(Claim.claim_id == claim_id)).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    audit_logs = session.exec(
        select(ClaimAuditLog).where(ClaimAuditLog.claim_id == claim_id).order_by(ClaimAuditLog.id.asc())
    ).all()

    return {
        "claim": claim,
        "audit_logs": audit_logs,
        "rule_evaluation": json.loads(claim.rule_evaluation_json) if claim.rule_evaluation_json else {},
        "decision_reasons": json.loads(claim.decision_reasons_json) if claim.decision_reasons_json else [],
        "tabular_probabilities": json.loads(claim.tabular_probabilities_json) if claim.tabular_probabilities_json else {},
        "tm_probabilities": json.loads(claim.tm_probabilities_json) if claim.tm_probabilities_json else {},
    }


@router.post("/{claim_id}/adjudicate")
def adjudicate_claim_manual(
    claim_id: str,
    action_in: ClaimAdjudicationAction,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role(["reviewer", "admin"]))
):
    """
    Human Adjuster Action: Manually Approve, Reject, or Request Additional Info.
    Logs an immutable entry in the audit trail.
    """
    claim = session.exec(select(Claim).where(Claim.claim_id == claim_id)).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    action_raw = action_in.action or action_in.decision or "Approve"
    notes_raw = action_in.reviewer_notes or action_in.notes or ""

    action_map = {
        "Approve": "Approved",
        "Reject": "Rejected",
        "Request Info": "Information Requested",
        "Request Information": "Information Requested",
    }
    new_status = action_map.get(action_raw, action_raw)

    claim.adjudication_status = new_status
    claim.adjudication_stage = "Final"
    claim.reviewed_by = current_user.username
    claim.reviewer_notes = notes_raw
    claim.adjudication_timestamp = datetime.utcnow().isoformat()

    # Log action
    log = ClaimAuditLog(
        claim_id=claim_id,
        actor=current_user.username,
        action=f"REVIEWER_{action_raw.upper().replace(' ', '_')}",
        details=f"Adjuster {current_user.username} set status to '{new_status}'. Notes: {notes_raw}",
    )
    session.add(claim)
    session.add(log)
    session.commit()
    session.refresh(claim)

    return {
        "message": f"Claim {claim_id} updated to {new_status}",
        "claim": claim,
    }
