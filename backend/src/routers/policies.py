"""
AssureX Claim Engine — Policies & Thresholds Router
"""

import os
import json
from fastapi import APIRouter

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
POLICIES_DIR = os.path.join(BASE_DIR, "policies")
THRESHOLDS_PATH = os.path.join(BASE_DIR, "config", "thresholds.json")


@router.get("/")
def get_all_policies():
    """Returns active warranty policy configurations for all product categories dynamically."""
    policies = {}
    if os.path.exists(POLICIES_DIR):
        for fname in sorted(os.listdir(POLICIES_DIR)):
            if fname.endswith("_warranty.json"):
                fpath = os.path.join(POLICIES_DIR, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        cat = data.get("product_category", fname.replace("_warranty.json", "").replace("_", " ").title())
                        policies[cat] = data
                except Exception as e:
                    print(f"Error loading {fname}: {e}")
    return policies


@router.get("/thresholds")
def get_thresholds():
    """Returns model agreement and confidence thresholds."""
    if os.path.exists(THRESHOLDS_PATH):
        try:
            with open(THRESHOLDS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}
