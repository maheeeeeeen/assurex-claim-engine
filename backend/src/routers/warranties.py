"""
AssureX Claim Engine — Warranties Router
"""

from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from src.database_setup import get_session
from src.models import Warranty, Product

router = APIRouter()


@router.get("/")
def list_warranties(session: Session = Depends(get_session)):
    """List registered warranties."""
    warranties = session.exec(select(Warranty).limit(100)).all()
    return warranties


@router.get("/check/{product_id}")
def check_warranty(product_id: str, session: Session = Depends(get_session)):
    """Evaluate live warranty status for a product."""
    warranty = session.exec(select(Warranty).where(Warranty.product_id == product_id)).first()
    if not warranty:
        raise HTTPException(status_code=404, detail="Warranty not found for product")

    try:
        end_date = datetime.strptime(warranty.end_date[:10], "%Y-%m-%d").date()
        today = datetime.utcnow().date()
        remaining_days = (end_date - today).days

        if remaining_days >= 0:
            status_desc = "Active"
        elif -7 <= remaining_days < 0:
            status_desc = "Grace Period (7 Days)"
        else:
            status_desc = "Expired"
    except Exception:
        remaining_days = 0
        status_desc = warranty.status

    return {
        "warranty": warranty,
        "remaining_days": remaining_days,
        "calculated_status": status_desc,
        "is_claim_eligible": remaining_days >= -7,
    }
