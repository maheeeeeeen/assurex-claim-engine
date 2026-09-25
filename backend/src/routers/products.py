"""
AssureX Claim Engine — Products Router
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from src.database_setup import get_session
from src.models import Product, Warranty

router = APIRouter()


@router.get("/")
def list_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    session: Session = Depends(get_session)
):
    """List products with optional search and category filters."""
    query = select(Product)
    if category:
        query = query.where(Product.category == category)
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Product.name.like(search_filter)) |
            (Product.serial_number.like(search_filter)) |
            (Product.model_number.like(search_filter)) |
            (Product.brand.like(search_filter))
        )
    query = query.limit(limit)
    products = session.exec(query).all()
    return products


@router.get("/{product_id}")
def get_product(product_id: str, session: Session = Depends(get_session)):
    """Retrieve product details and attached warranty terms."""
    product = session.exec(select(Product).where(Product.product_id == product_id)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    warranty = session.exec(select(Warranty).where(Warranty.product_id == product_id)).first()
    return {
        "product": product,
        "warranty": warranty,
    }
