"""
AssureX Claim Engine — Admin & Database Seeding Router
"""

import os
import json
import glob
import pandas as pd
from typing import Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from src.database_setup import get_session
from src.models import User, Product, Warranty, Claim, ClaimAuditLog
from src.auth.service import hash_password, get_current_user, require_role
from src.services.card_service import CardService
from src.services.adjudication_engine import AdjudicationEngine

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")
CARDS_TEST_DIR = os.path.join(os.path.dirname(BASE_DIR), "sample_claims", "cards", "test")
CARDS_UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "cards")
os.makedirs(CARDS_UPLOAD_DIR, exist_ok=True)


@router.get("/status")
def get_system_status(session: Session = Depends(get_session)):
    """System health check, database row counts, and AI model readiness."""
    user_count = len(session.exec(select(User)).all())
    product_count = len(session.exec(select(Product)).all())
    claim_count = len(session.exec(select(Claim)).all())

    tab_model_exists = os.path.exists(os.path.join(BASE_DIR, "model", "best_model.joblib"))
    tm_model_exists = os.path.exists(os.path.join(BASE_DIR, "model", "teachable_machine", "keras_model.h5"))

    return {
        "status": "operational",
        "environment": "production",
        "database": {
            "users": user_count,
            "products": product_count,
            "claims": claim_count,
        },
        "models": {
            "tabular_xgboost_ready": tab_model_exists,
            "teachable_machine_ready": tm_model_exists,
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/seed")
def seed_demo_data(session: Session = Depends(get_session)):
    """
    Seeds essential initial users (Admin, Adjuster, Customer),
    catalog products, and 35 realistic claims from the test dataset.
    Safe to run repeatedly (checks for existing records).
    """
    seeded_users = 0
    seeded_products = 0
    seeded_claims = 0

    # 1. Seed Users
    default_users = [
        ("admin", "admin@assurex.com", "Admin@12345", "admin", "Chief Administrator"),
        ("adjuster_sarah", "sarah@assurex.com", "Adjuster@12345", "reviewer", "Sarah Jenkins (Lead Adjuster)"),
        ("customer_mike", "mike@example.com", "Customer@12345", "customer", "Michael Vance (Customer)"),
    ]

    for uname, email, pwd, role, fname in default_users:
        existing = session.exec(select(User).where(User.username == uname)).first()
        if not existing:
            u = User(
                username=uname,
                email=email,
                hashed_password=hash_password(pwd),
                role=role,
                full_name=fname,
            )
            session.add(u)
            seeded_users += 1
    session.commit()

    # 2. Seed Products and Claims from claims_test.csv
    test_csv_path = os.path.join(DATA_DIR, "claims_test.csv")
    if os.path.exists(test_csv_path):
        df_test = pd.read_csv(test_csv_path)

        # Build card map from test folder
        card_map = {}
        for root, _, files in os.walk(CARDS_TEST_DIR):
            for f in files:
                if f.lower().endswith(".png"):
                    cid = f.split("_")[0]
                    card_map[cid] = os.path.join(root, f)

        # Pick 35 balanced claims
        sample_rows = []
        classes = ["Likely Valid", "Likely Invalid", "Manual Review Required"]
        for c in classes:
            c_rows = df_test[df_test["class_label"] == c].head(12)
            sample_rows.append(c_rows)
        df_sample = pd.concat(sample_rows).drop_duplicates(subset=["claim_id"]).head(35)

        # Filter out claims that already exist in DB
        unseeded_rows = []
        for _, row in df_sample.iterrows():
            cid = row["claim_id"]
            if not session.exec(select(Claim).where(Claim.claim_id == cid)).first():
                unseeded_rows.append(row)

        if unseeded_rows:
            engine = AdjudicationEngine()

            # Prepare batch lists
            claim_dicts = [r.to_dict() for r in unseeded_rows]
            card_paths = []

            for row in unseeded_rows:
                cid = row["claim_id"]
                pid = row["product_id"]

                # Seed product if needed
                if not session.exec(select(Product).where(Product.product_id == pid)).first():
                    prod = Product(
                        product_id=pid,
                        name=row["product_name"],
                        category=row["product_category"],
                        brand=row["brand"],
                        model_number=row["model_number"],
                        serial_number=row["serial_number_entered"],
                        purchase_price=float(row["purchase_price"]),
                        retailer=row["retailer"],
                        purchase_date=str(row["purchase_date"]),
                        warranty_duration_months=24,
                    )
                    session.add(prod)
                    seeded_products += 1

                    war = Warranty(
                        warranty_id=f"WAR-{pid}",
                        product_id=pid,
                        provider=row["warranty_provider"],
                        warranty_type=row["warranty_type"],
                        start_date=str(row["warranty_start"]),
                        end_date=str(row["warranty_end"]),
                        status="Active",
                    )
                    session.add(war)

                # Ensure card exists in uploads/cards/
                card_src = card_map.get(cid)
                card_dest_path = os.path.join(CARDS_UPLOAD_DIR, f"{cid}_card.png")
                if card_src and os.path.exists(card_src) and not os.path.exists(card_dest_path):
                    import shutil
                    shutil.copyfile(card_src, card_dest_path)
                card_paths.append(card_dest_path if os.path.exists(card_dest_path) else card_src)

            # High-throughput Vectorized Batch Predictions
            tab_results = engine.tabular_predictor.predict_batch(claim_dicts)
            tm_results = engine.tm_predictor.predict_batch(card_paths)

            # Persist claims & audit logs
            for i in range(len(unseeded_rows)):
                row = unseeded_rows[i]
                cid = row["claim_id"]
                c_dict = claim_dicts[i]
                tab_eval = tab_results[i]
                tm_eval = tm_results[i]
                c_path = card_paths[i]

                eval_res = engine.arbitrate(c_dict, tab_eval, tm_eval, c_path)

                claim_record = Claim(
                    claim_id=cid,
                    product_id=row["product_id"],
                    product_name=row["product_name"],
                    product_category=row["product_category"],
                    brand=row["brand"],
                    model_number=row["model_number"],
                    serial_number_entered=row["serial_number_entered"],
                    serial_number_on_receipt=str(row.get("serial_number_on_receipt", "")),
                    serial_number_on_warranty_card=str(row.get("serial_number_on_warranty_card", "")),
                    purchase_date=str(row["purchase_date"]),
                    purchase_price=float(row["purchase_price"]),
                    retailer=row["retailer"],
                    warranty_start=str(row["warranty_start"]),
                    warranty_end=str(row["warranty_end"]),
                    warranty_provider=row["warranty_provider"],
                    warranty_type=row["warranty_type"],
                    fault_date=str(row["fault_date"]),
                    claim_submission_date=str(row["claim_submission_date"]),
                    fault_type=row["fault_type"],
                    fault_description=row["fault_description"],
                    damage_type=row["damage_type"],
                    product_age_months=float(row["product_age_months"]),
                    remaining_warranty_days=float(row["remaining_warranty_days"]),
                    repair_history_count=int(row["repair_history_count"]),
                    previous_repair_authorized=bool(row["previous_repair_authorized"]),
                    receipt_uploaded=bool(row["receipt_uploaded"]),
                    warranty_card_uploaded=bool(row["warranty_card_uploaded"]),
                    product_image_uploaded=bool(row["product_image_uploaded"]),
                    fault_evidence_uploaded=bool(row["fault_evidence_uploaded"]),
                    repair_report_uploaded=bool(row["repair_report_uploaded"]),
                    missing_doc_count=int(row["missing_doc_count"]),
                    serial_mismatch_flag=bool(row["serial_mismatch_flag"]),
                    date_contradiction_flag=bool(row["date_contradiction_flag"]),
                    excluded_damage=bool(row["excluded_damage"]),
                    duplicate_claim_flag=bool(row["duplicate_claim_flag"]),
                    card_image_path=CardService.get_card_url(cid),
                    rule_evaluation_json=json.dumps(eval_res["rule_evaluation"]),
                    tabular_prediction=eval_res["tabular_prediction"]["predicted_class"],
                    tabular_confidence=eval_res["tabular_prediction"]["top_confidence"],
                    tabular_probabilities_json=json.dumps(eval_res["tabular_prediction"]["confidence_scores"]),
                    tm_prediction=eval_res["tm_prediction"]["predicted_class"],
                    tm_confidence=eval_res["tm_prediction"]["top_confidence"],
                    tm_probabilities_json=json.dumps(eval_res["tm_prediction"]["confidence_scores"]),
                    confidence_difference=eval_res["confidence_difference"],
                    models_agreed=eval_res["models_agreed"],
                    match_category=eval_res["match_category"],
                    adjudication_status=eval_res["adjudication_status"],
                    adjudication_stage=eval_res["adjudication_stage"],
                    final_confidence=eval_res["final_confidence"],
                    decision_reason_summary=eval_res["decision_reason_summary"],
                    decision_reasons_json=json.dumps(eval_res["decision_reasons"]),
                    adjudication_timestamp=eval_res["adjudication_timestamp"],
                )
                session.add(claim_record)

                log = ClaimAuditLog(
                    claim_id=cid,
                    actor="System_Seeder",
                    action="INITIAL_ADJUDICATION",
                    details=f"Demo seed: {eval_res['adjudication_status']} (Conf: {eval_res['final_confidence']*100:.1f}%).",
                )
                session.add(log)
                seeded_claims += 1

            session.commit()

    return {
        "message": "Demo data seeding complete",
        "seeded_users": seeded_users,
        "seeded_products": seeded_products,
        "seeded_claims": seeded_claims,
    }
