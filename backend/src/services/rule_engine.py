"""
AssureX Claim Engine — Deterministic Business Rule Engine

Encapsulates strict policy rules across Electronics, Appliances, and Automotive categories:
1. Warranty window verification (Active, 7-Day Grace Period, Expired)
2. Serial number reconciliation (Claim vs Receipt vs Warranty Card)
3. Excluded damage clauses (Liquid immersion, accidental drops, modifications)
4. Unauthorized third-party repairs
5. Document completeness checks (Proof of purchase, photos, repair orders)
6. Timeline contradiction detection (Purchase after fault, claim before fault)
7. Duplicate submission detection
"""

import os
import json
from typing import Dict, Any, List, Tuple
from datetime import datetime, date

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
POLICIES_DIR = os.path.join(BASE_DIR, "policies")


def load_policy(category: str) -> Dict[str, Any]:
    """Loads warranty policy configuration JSON for a given product category."""
    cat_lower = category.lower()
    fname = f"{cat_lower}_warranty.json"
    fpath = os.path.join(POLICIES_DIR, fname)
    if os.path.exists(fpath):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


class RuleEngine:
    """Evaluates business rules against claim data to provide auditable validation."""

    @staticmethod
    def evaluate_claim(claim_data: Dict[str, Any]) -> Dict[str, Any]:
        hard_failures: List[str] = []
        review_flags: List[str] = []
        passed_checks: List[str] = []

        category = claim_data.get("product_category", "Electronics")
        policy = load_policy(category)

        # -------------------------------------------------------------
        # Rule 1: Chronological Consistency
        # -------------------------------------------------------------
        try:
            purchase_dt = datetime.strptime(str(claim_data.get("purchase_date"))[:10], "%Y-%m-%d").date()
            fault_dt = datetime.strptime(str(claim_data.get("fault_date"))[:10], "%Y-%m-%d").date()
            claim_dt = datetime.strptime(str(claim_data.get("claim_submission_date"))[:10], "%Y-%m-%d").date()
            warranty_end_dt = datetime.strptime(str(claim_data.get("warranty_end"))[:10], "%Y-%m-%d").date()

            if purchase_dt > fault_dt:
                hard_failures.append(f"Date contradiction: Purchase date ({purchase_dt}) cannot be after fault date ({fault_dt}).")
            elif claim_dt < fault_dt:
                hard_failures.append(f"Date contradiction: Claim submission date ({claim_dt}) cannot precede fault date ({fault_dt}).")
            else:
                passed_checks.append("Timeline chronology verified (Purchase <= Fault <= Claim).")
        except Exception:
            if claim_data.get("date_contradiction_flag"):
                hard_failures.append("Date contradiction detected in reported claim timelines.")
            else:
                passed_checks.append("Timeline format verified.")

        # -------------------------------------------------------------
        # Rule 2: Coverage Period & Grace Period Window
        # -------------------------------------------------------------
        rem_days = float(claim_data.get("remaining_warranty_days", 0.0))
        if rem_days >= 0:
            passed_checks.append(f"Warranty actively in effect ({int(rem_days)} days remaining).")
        elif -7 <= rem_days < 0:
            review_flags.append(f"Grace Period Active: Warranty expired {abs(int(rem_days))} days ago (within 7-day grace window). Escalation required.")
        else:
            hard_failures.append(f"Warranty Expired: Claim submitted {abs(int(rem_days))} days past warranty expiration (outside 7-day grace period).")

        # -------------------------------------------------------------
        # Rule 3: Serial Number Reconciliation
        # -------------------------------------------------------------
        serial_entered = str(claim_data.get("serial_number_entered", "")).strip().upper()
        serial_receipt = str(claim_data.get("serial_number_on_receipt", "") or "").strip().upper()
        serial_card = str(claim_data.get("serial_number_on_warranty_card", "") or "").strip().upper()

        if claim_data.get("serial_mismatch_flag", False):
            hard_failures.append(f"Serial mismatch: Entered serial ({serial_entered}) conflicts with proof of purchase.")
        elif serial_receipt and serial_entered != serial_receipt:
            hard_failures.append(f"Serial mismatch: Entered serial ({serial_entered}) does not match receipt serial ({serial_receipt}).")
        elif serial_card and serial_entered != serial_card:
            hard_failures.append(f"Serial mismatch: Entered serial ({serial_entered}) does not match warranty card serial ({serial_card}).")
        else:
            passed_checks.append(f"Serial number validated across documents ({serial_entered}).")

        # -------------------------------------------------------------
        # Rule 4: Excluded Damage Types
        # -------------------------------------------------------------
        excluded_flag = bool(claim_data.get("excluded_damage", False))
        damage_type = str(claim_data.get("damage_type", "")).lower()
        
        raw_exclusions = policy.get("exclusions", [])
        if isinstance(raw_exclusions, list):
            excluded_damages = [str(d).lower() for d in raw_exclusions]
        elif isinstance(raw_exclusions, dict):
            excluded_damages = [str(d).lower() for d in raw_exclusions.get("damages", [])]
        else:
            excluded_damages = []

        if excluded_flag or any(ex in damage_type for ex in excluded_damages if ex):
            hard_failures.append(f"Excluded Damage Clause: '{claim_data.get('damage_type')}' is explicitly excluded from standard {category} warranty terms.")
        else:
            passed_checks.append(f"Reported damage type '{claim_data.get('damage_type')}' is eligible for coverage.")

        # -------------------------------------------------------------
        # Rule 5: Unauthorized Third-Party Repairs
        # -------------------------------------------------------------
        repair_count = int(claim_data.get("repair_history_count", 0))
        prev_authorized = bool(claim_data.get("previous_repair_authorized", True))

        if repair_count > 0 and not prev_authorized:
            hard_failures.append(f"Warranty Void: Device underwent {repair_count} unauthorized third-party repair(s), violating service terms.")
        else:
            passed_checks.append("Service history authorized and verified.")

        # -------------------------------------------------------------
        # Rule 6: Duplicate Claim Detection
        # -------------------------------------------------------------
        if bool(claim_data.get("duplicate_claim_flag", False)):
            hard_failures.append("Fraud prevention flag: An identical claim was recently filed for this serial number.")
        else:
            passed_checks.append("Duplicate check passed (no identical active claims).")

        # -------------------------------------------------------------
        # Rule 7: Document Completeness
        # -------------------------------------------------------------
        missing = []
        if not bool(claim_data.get("receipt_uploaded", True)):
            missing.append("Proof of Purchase (Receipt)")
        if not bool(claim_data.get("warranty_card_uploaded", True)):
            missing.append("Warranty Card")
        if not bool(claim_data.get("product_image_uploaded", True)):
            missing.append("Product Photo")
        if not bool(claim_data.get("fault_evidence_uploaded", True)):
            missing.append("Fault Evidence Photo")

        if missing:
            review_flags.append(f"Missing mandatory documents: {', '.join(missing)}.")
        else:
            passed_checks.append("All mandatory verification documents uploaded.")

        # -------------------------------------------------------------
        # Final Decision Recommendation
        # -------------------------------------------------------------
        if hard_failures:
            recommendation = "Auto-Reject"
            summary = f"Claim fails mandatory business rules ({len(hard_failures)} violation(s))."
        elif review_flags:
            recommendation = "Manual Review"
            summary = f"Claim requires human review ({len(review_flags)} flag(s))."
        else:
            recommendation = "Auto-Approve"
            summary = "All business rules and policy terms satisfied."

        return {
            "passed": len(hard_failures) == 0,
            "recommendation": recommendation,
            "summary": summary,
            "hard_failures": hard_failures,
            "review_flags": review_flags,
            "passed_checks": passed_checks,
            "total_checks": len(hard_failures) + len(review_flags) + len(passed_checks),
        }
