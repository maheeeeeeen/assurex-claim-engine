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
from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile, Form
from sqlmodel import Session, select, func

from src.database_setup import get_session
from src.models import Claim, ClaimAuditLog, User, Product, Warranty
from src.auth.service import get_current_user, require_role
from src.schemas.claims import (
    ClaimSubmitRequest, 
    ClaimAdjudicationAction, 
    ClaimResponse, 
    ClaimStatsResponse,
    OCRProcessResponse,
    MediaUploadResponse,
    CrossVerificationRequest,
    CrossVerificationResponse,
    DuplicateCheckRequest,
    DuplicateCheckResponse
)
from src.services.adjudication_engine import AdjudicationEngine
from src.services.card_service import CardService
from src.services.ocr_service import OCRService
from src.services.duplicate_detector import DuplicateDetector

router = APIRouter()

# Instantiate single shared adjudication engine for high performance
_adjudication_engine = None


def get_adjudication_engine() -> AdjudicationEngine:
    global _adjudication_engine
    if _adjudication_engine is None:
        _adjudication_engine = AdjudicationEngine()
    return _adjudication_engine


@router.post("/ocr-process", response_model=OCRProcessResponse)
async def process_ocr(
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    """
    Accepts uploaded purchase receipt or invoice document, computes its cryptographic
    SHA-256 hash fingerprint, executes OCR field extraction, and scans database for
    duplicate document reuse.
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty"
        )

    # 1. Compute SHA-256 fingerprint
    file_hash = OCRService.compute_sha256(contents)

    # 2. Save file safely
    upload_dir = os.path.join("uploads", "receipts")
    os.makedirs(upload_dir, exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    safe_filename = f"receipt_{file_hash[:12]}{file_ext}"
    file_path = os.path.join(upload_dir, safe_filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    # 3. Extract structured OCR data
    ocr_result = OCRService.extract_from_image(file_path, file_bytes=contents)

    # 4. Check for duplicate document hash in existing claims
    existing_claim = session.exec(
        select(Claim).where(Claim.receipt_hash == file_hash)
    ).first()

    is_duplicate = existing_claim is not None
    dup_claim_id = existing_claim.claim_id if existing_claim else None

    # 5. Check for duplicate invoice number in existing claims
    inv_num = ocr_result.get("invoice_number")
    is_duplicate_inv = False
    dup_inv_claim_id = None
    if inv_num:
        norm_inv = inv_num.strip().upper()
        existing_inv_claims = session.exec(
            select(Claim).where(Claim.invoice_number.is_not(None))
        ).all()
        for c in existing_inv_claims:
            if c.invoice_number and c.invoice_number.strip().upper() == norm_inv:
                is_duplicate_inv = True
                dup_inv_claim_id = c.claim_id
                break

    return {
        "merchant": ocr_result.get("merchant") or ocr_result.get("retailer") or "Authorized Retailer",
        "retailer": ocr_result.get("retailer") or ocr_result.get("merchant") or "Authorized Retailer",
        "purchase_date": ocr_result.get("purchase_date"),
        "serial_number": ocr_result.get("serial_number"),
        "detected_serials": ocr_result.get("detected_serials", []),
        "model_number": ocr_result.get("model_number"),
        "detected_models": ocr_result.get("detected_models", []),
        "invoice_number": inv_num,
        "purchase_amount": ocr_result.get("purchase_amount"),
        "ocr_confidence": ocr_result.get("ocr_confidence", 0.85),
        "ocr_engine": ocr_result.get("ocr_engine", "Tesseract_OCR"),
        "file_hash": file_hash,
        "file_path": file_path.replace("\\", "/"),
        "is_duplicate_file": is_duplicate,
        "duplicate_claim_id": dup_claim_id,
        "is_duplicate_invoice": is_duplicate_inv,
        "duplicate_invoice_claim_id": dup_inv_claim_id,
        "raw_text": ocr_result.get("raw_text"),
    }


@router.post("/upload-media", response_model=MediaUploadResponse)
async def upload_media(
    file: UploadFile = File(...),
    media_type: str = Form(...)
):
    """
    Accepts evidence uploads for fault photo, fault video, or barcode photo.
    Validates file formats and size constraints, computes SHA-256 cryptographic hash,
    and safely persists file to backend storage.
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file was provided for upload"
        )

    allowed_configs = {
        "fault_photo": {
            "max_size": 15 * 1024 * 1024,  # 15MB
            "exts": {".jpg", ".jpeg", ".png", ".webp"},
            "subfolder": os.path.join("uploads", "evidence", "fault_photos"),
        },
        "fault_video": {
            "max_size": 35 * 1024 * 1024,  # 35MB
            "exts": {".mp4", ".webm", ".mov"},
            "subfolder": os.path.join("uploads", "evidence", "fault_videos"),
        },
        "barcode_photo": {
            "max_size": 15 * 1024 * 1024,  # 15MB
            "exts": {".jpg", ".jpeg", ".png", ".webp"},
            "subfolder": os.path.join("uploads", "evidence", "barcode_photos"),
        },
        "product_image": {
            "max_size": 15 * 1024 * 1024,
            "exts": {".jpg", ".jpeg", ".png", ".webp"},
            "subfolder": os.path.join("uploads", "evidence", "product_images"),
        },
        "receipt": {
            "max_size": 15 * 1024 * 1024,
            "exts": {".jpg", ".jpeg", ".png", ".webp", ".pdf"},
            "subfolder": os.path.join("uploads", "receipts"),
        },
        "warranty_card": {
            "max_size": 15 * 1024 * 1024,
            "exts": {".jpg", ".jpeg", ".png", ".webp", ".pdf"},
            "subfolder": os.path.join("uploads", "evidence", "warranty_cards"),
        },
    }

    if media_type not in allowed_configs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid media_type '{media_type}'. Allowed types: {list(allowed_configs.keys())}"
        )

    config = allowed_configs[media_type]
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in config["exts"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{file_ext}' for {media_type}. Allowed: {', '.join(sorted(config['exts']))}"
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty"
        )

    if len(contents) > config["max_size"]:
        max_mb = config["max_size"] / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {max_mb:.0f}MB"
        )

    # 1. Compute SHA-256 fingerprint
    file_hash = OCRService.compute_sha256(contents)

    # 2. Persist to storage safely
    upload_dir = config["subfolder"]
    os.makedirs(upload_dir, exist_ok=True)
    safe_filename = f"{media_type}_{file_hash[:12]}{file_ext}"
    file_path = os.path.join(upload_dir, safe_filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    norm_path = file_path.replace("\\", "/")

    # Run document extraction for receipts, warranty cards, barcodes, and product images
    serial_number = None
    model_number = None
    detected_serials = []
    detected_models = []
    ocr_confidence = None
    if media_type in ("warranty_card", "barcode_photo", "product_image", "receipt"):
        try:
            ocr_res = OCRService.extract_from_image(file_path, file_bytes=contents, doc_type=media_type)
            serial_number = ocr_res.get("serial_number")
            model_number = ocr_res.get("model_number")
            detected_serials = ocr_res.get("detected_serials", [])
            detected_models = ocr_res.get("detected_models", [])
            ocr_confidence = ocr_res.get("ocr_confidence")
        except Exception:
            pass

    return {
        "media_type": media_type,
        "filename": file.filename,
        "file_path": norm_path,
        "file_url": f"/{norm_path}",
        "file_hash": file_hash,
        "file_size": len(contents),
        "content_type": file.content_type or "application/octet-stream",
        "serial_number": serial_number,
        "model_number": model_number,
        "detected_serials": detected_serials,
        "detected_models": detected_models,
        "ocr_confidence": ocr_confidence,
    }


@router.post("/cross-verify", response_model=CrossVerificationResponse)
def cross_verify_documents(
    payload: CrossVerificationRequest,
    current_user: User = Depends(require_role(["customer", "employee", "admin"]))
):
    """
    Real-time cross-document serial and model number verification.
    Compares entered values against OCR-extracted data from receipts,
    warranty cards, and barcode/product photos.
    """
    receipt_data = None
    if payload.receipt_serial or payload.receipt_model:
        receipt_data = {
            "serial_number": payload.receipt_serial,
            "model_number": payload.receipt_model,
        }

    warranty_card_data = None
    if payload.warranty_card_serial or payload.warranty_card_model:
        warranty_card_data = {
            "serial_number": payload.warranty_card_serial,
            "model_number": payload.warranty_card_model,
        }

    barcode_data = None
    if payload.barcode_serial or payload.barcode_model:
        barcode_data = {
            "serial_number": payload.barcode_serial,
            "model_number": payload.barcode_model,
        }

    return OCRService.cross_verify_all(
        entered_serial=payload.entered_serial,
        entered_model=payload.entered_model,
        receipt_data=receipt_data,
        warranty_card_data=warranty_card_data,
        barcode_data=barcode_data,
    )


@router.post("/check-duplicate", response_model=DuplicateCheckResponse)
def check_duplicate_claim(
    payload: DuplicateCheckRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role(["customer", "employee", "admin"]))
):
    """
    Real-time pre-submission duplicate evaluation across:
    1. Cryptographic document SHA-256 hash matching
    2. Matching invoice / receipt numbers across prior claims
    3. Semantic fault description similarity for the same product or hardware serial number
    """
    res = DuplicateDetector.check_duplicate(
        session=session,
        product_id=payload.product_id,
        serial_number=payload.serial_number_entered,
        fault_description=payload.fault_description,
        invoice_number=payload.invoice_number,
        receipt_hash=payload.receipt_hash,
        current_claim_id=payload.current_claim_id,
    )
    return DuplicateCheckResponse(**res)


@router.post("/submit", response_model=ClaimResponse, status_code=status.HTTP_201_CREATED)
def submit_claim(
    claim_in: ClaimSubmitRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role(["customer", "employee", "admin"]))
):
    """
    Submits a warranty claim, triggers dynamic card generation, runs dual-model AI
    and deterministic business rules, and instantly adjudicates the claim.
    """
    engine = get_adjudication_engine()
    today = datetime.utcnow().date()

    # 0. Enforce Product Registration, Ownership & Active Warranty Validation (Task 3)
    if not claim_in.product_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Claim must be filed against a valid registered product. Please select and link a registered product."
        )

    product = session.exec(select(Product).where(Product.product_id == claim_in.product_id)).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registered product '{claim_in.product_id}' was not found in the product catalog."
        )

    # Ownership validation: Customers may only file claims for products they own
    if current_user and current_user.role == "customer":
        user_warranties = session.exec(
            select(Warranty.product_id).where(Warranty.user_id == current_user.id)
        ).all()
        is_owner = (product.user_id == current_user.id) or (product.product_id in user_warranties)
        if not is_owner and product.user_id is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: You do not have permission to file a claim for product '{product.product_id}' belonging to another customer."
            )

    # Active Warranty validation: Product must have registered warranty
    warranty = session.exec(select(Warranty).where(Warranty.product_id == product.product_id)).first()
    if not warranty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No warranty coverage found for product '{product.product_id}'. Only products with active warranty coverage are eligible for claims."
        )

    if warranty.status and warranty.status.lower() in ["void", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Warranty '{warranty.warranty_id}' for product '{product.product_id}' is void ({warranty.status}). Cannot process claims for void warranties."
        )

    try:
        w_end_dt = datetime.strptime(warranty.end_date[:10], "%Y-%m-%d").date()
        days_remaining = (w_end_dt - today).days
        if days_remaining < -7:  # 7-day grace period matching check_warranty endpoint
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Warranty '{warranty.warranty_id}' expired on {warranty.end_date[:10]} ({abs(days_remaining)} days ago). Claims cannot be filed for expired warranties."
            )
    except (ValueError, TypeError):
        pass

    # Assign claim ownership (if employee/admin assisted intake, assign to customer owner)
    claim_user_id = current_user.id if current_user else None
    if current_user and current_user.role in ["employee", "admin"] and product.user_id:
        claim_user_id = product.user_id

    # Generate claim ID
    short_uuid = str(uuid.uuid4())[:8].upper()
    claim_id = f"CLM-2026-{short_uuid}"
    product_id = product.product_id
    sub_date = today.strftime("%Y-%m-%d")

    try:
        purchase_dt = datetime.strptime(claim_in.purchase_date[:10], "%Y-%m-%d").date()
        warranty_end_dt = datetime.strptime(claim_in.warranty_end[:10], "%Y-%m-%d").date()
        fault_dt = datetime.strptime(claim_in.fault_date[:10], "%Y-%m-%d").date()

        has_date_contradiction = (purchase_dt > fault_dt) or (today < fault_dt)
        product_age_months = round((fault_dt - purchase_dt).days / 30.44, 1)
        remaining_days = float((warranty_end_dt - fault_dt).days)
    except Exception:
        has_date_contradiction = False
        product_age_months = 6.0
        remaining_days = 120.0

    # Calculate missing docs
    has_receipt = claim_in.receipt_uploaded or bool(claim_in.receipt_path)
    has_warranty = claim_in.warranty_card_uploaded or bool(claim_in.warranty_card_path)
    has_product_img = claim_in.product_image_uploaded or bool(claim_in.product_image_path or claim_in.barcode_image_path)
    has_fault_evidence = claim_in.fault_evidence_uploaded or bool(claim_in.fault_evidence_path or claim_in.fault_video_path)

    missing_docs = 0
    if not has_receipt: missing_docs += 1
    if not has_warranty: missing_docs += 1
    if not has_product_img: missing_docs += 1
    if not has_fault_evidence: missing_docs += 1

    # Cross-document serial and model reconciliation across all sources
    receipt_sn = claim_in.serial_number_on_receipt or None
    receipt_mod = claim_in.model_number_on_receipt or None
    card_sn = claim_in.serial_number_on_warranty_card or None
    card_mod = claim_in.model_number_on_warranty_card or None
    barcode_sn = claim_in.serial_number_on_barcode or None
    barcode_mod = claim_in.model_number_on_barcode or None

    receipt_doc = {"serial_number": receipt_sn, "model_number": receipt_mod} if (receipt_sn or receipt_mod) else None
    card_doc = {"serial_number": card_sn, "model_number": card_mod} if (card_sn or card_mod) else None
    barcode_doc = {"serial_number": barcode_sn, "model_number": barcode_mod} if (barcode_sn or barcode_mod) else None

    cross_recon = OCRService.cross_verify_all(
        entered_serial=claim_in.serial_number_entered,
        entered_model=claim_in.model_number,
        receipt_data=receipt_doc,
        warranty_card_data=card_doc,
        barcode_data=barcode_doc,
    )
    has_serial_mismatch = cross_recon["has_serial_mismatch"]
    cross_verification_str = json.dumps(cross_recon)

    # Task 3: Multi-factor duplicate claim detection (hash, invoice number, semantic fault similarity)
    dup_eval = DuplicateDetector.check_duplicate(
        session=session,
        product_id=product_id,
        serial_number=claim_in.serial_number_entered,
        fault_description=claim_in.fault_description,
        invoice_number=claim_in.invoice_number,
        receipt_hash=claim_in.receipt_hash,
    )
    is_duplicate_claim = dup_eval["is_duplicate"]
    duplicate_claim_details = dup_eval["details"]

    claim_dict = {
        "claim_id": claim_id,
        "product_id": product_id,
        "product_name": claim_in.product_name,
        "product_category": claim_in.product_category,
        "brand": claim_in.brand,
        "model_number": claim_in.model_number,
        "serial_number_entered": claim_in.serial_number_entered,
        "serial_number_on_receipt": receipt_sn,
        "model_number_on_receipt": receipt_mod,
        "serial_number_on_warranty_card": card_sn,
        "model_number_on_warranty_card": card_mod,
        "serial_number_on_barcode": barcode_sn,
        "model_number_on_barcode": barcode_mod,
        "cross_verification_json": cross_verification_str,
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
        "receipt_uploaded": has_receipt,
        "warranty_card_uploaded": has_warranty,
        "product_image_uploaded": has_product_img,
        "fault_evidence_uploaded": has_fault_evidence,
        "repair_report_uploaded": claim_in.repair_report_uploaded,
        "missing_doc_count": missing_docs,
        "serial_mismatch_flag": has_serial_mismatch,
        "date_contradiction_flag": has_date_contradiction,
        "excluded_damage": False,
        "duplicate_claim_flag": is_duplicate_claim,
        "duplicate_claim_details": duplicate_claim_details,
        "invoice_number": claim_in.invoice_number,
    }

    # 1. Run Complete Adjudication Engine
    eval_result = engine.adjudicate(claim_dict)

    card_image_rel_path = CardService.get_card_url(claim_id)

    # 2. Construct DB Record
    db_claim = Claim(
        claim_id=claim_id,
        user_id=claim_user_id,
        product_id=product_id,
        product_name=claim_in.product_name,
        product_category=claim_in.product_category,
        brand=claim_in.brand,
        model_number=claim_in.model_number,
        serial_number_entered=claim_in.serial_number_entered,
        serial_number_on_receipt=receipt_sn,
        model_number_on_receipt=receipt_mod,
        serial_number_on_warranty_card=card_sn,
        model_number_on_warranty_card=card_mod,
        serial_number_on_barcode=barcode_sn,
        model_number_on_barcode=barcode_mod,
        cross_verification_json=cross_verification_str,
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
        receipt_uploaded=has_receipt,
        receipt_path=claim_in.receipt_path,
        receipt_hash=claim_in.receipt_hash,
        warranty_card_uploaded=has_warranty,
        warranty_card_path=claim_in.warranty_card_path,
        warranty_card_hash=claim_in.warranty_card_hash,
        product_image_uploaded=has_product_img,
        product_image_path=claim_in.product_image_path,
        product_image_hash=claim_in.product_image_hash,
        fault_evidence_uploaded=has_fault_evidence,
        fault_evidence_path=claim_in.fault_evidence_path,
        fault_evidence_hash=claim_in.fault_evidence_hash,
        fault_video_path=claim_in.fault_video_path,
        fault_video_hash=claim_in.fault_video_hash,
        barcode_image_path=claim_in.barcode_image_path,
        barcode_image_hash=claim_in.barcode_image_hash,
        repair_report_uploaded=claim_in.repair_report_uploaded,
        missing_doc_count=missing_docs,
        card_image_path=card_image_rel_path,
        serial_mismatch_flag=has_serial_mismatch,
        date_contradiction_flag=has_date_contradiction,
        duplicate_claim_flag=is_duplicate_claim,
        duplicate_claim_details=duplicate_claim_details,
        invoice_number=claim_in.invoice_number,
        ocr_extracted_json=claim_in.ocr_extracted_json,
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
    log_warranty = ClaimAuditLog(
        claim_id=claim_id,
        actor="Security_Engine",
        action="WARRANTY_VERIFIED",
        details=f"Product {product.product_id} verified with active warranty {warranty.warranty_id} (Status: {warranty.status}, Ends: {warranty.end_date[:10]}).",
    )
    session.add(log1)
    session.add(log2)
    session.add(log3)
    session.add(log_warranty)

    if has_serial_mismatch:
        log_mismatch = ClaimAuditLog(
            claim_id=claim_id,
            actor="OCR_Reconciliation",
            action="SERIAL_MISMATCH_DETECTED",
            details=f"Entered serial '{claim_in.serial_number_entered}' conflicts with uploaded document scan.",
        )
        session.add(log_mismatch)

    if is_duplicate_claim:
        log_dup = ClaimAuditLog(
            claim_id=claim_id,
            actor="Fraud_Prevention_System",
            action="DUPLICATE_CLAIM_DETECTED",
            details=duplicate_claim_details or "Duplicate submission pattern detected across existing claims.",
        )
        session.add(log_dup)

    if claim_in.fault_evidence_path or claim_in.fault_video_path or claim_in.barcode_image_path:
        attached_media = []
        if claim_in.fault_evidence_path:
            attached_media.append(f"Fault Photo ({claim_in.fault_evidence_hash[:8] if claim_in.fault_evidence_hash else 'verified'})")
        if claim_in.fault_video_path:
            attached_media.append(f"Fault Video ({claim_in.fault_video_hash[:8] if claim_in.fault_video_hash else 'verified'})")
        if claim_in.barcode_image_path:
            attached_media.append(f"Barcode Photo ({claim_in.barcode_image_hash[:8] if claim_in.barcode_image_hash else 'verified'})")
        log_evidence = ClaimAuditLog(
            claim_id=claim_id,
            actor=actor_name,
            action="EVIDENCE_ATTACHED",
            details="Attached evidence media: " + ", ".join(attached_media),
        )
        session.add(log_evidence)

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
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Retrieves filterable list of claims, scoped by user role."""
    query = select(Claim)

    # Scoped access: Customers only see their own claims
    if current_user and current_user.role == "customer":
        query = query.where(Claim.user_id == current_user.id)

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
def get_claim_detail(
    claim_id: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Retrieves full claim dossier, attached audit logs, and explanation JSON."""
    claim = session.exec(select(Claim).where(Claim.claim_id == claim_id)).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    # RBAC check: Customers cannot access claims belonging to other users
    if current_user and current_user.role == "customer":
        if claim.user_id and claim.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You do not have permission to view this claim"
            )

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
        "cross_verification": json.loads(claim.cross_verification_json) if claim.cross_verification_json else None,
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
