import time
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.product import Product, seed_demo_products, DEFAULT_DEMO_MERCHANT_ID
from app.schemas.product import ProductCreate, ProductResponse
from app.services.auth import security_bearer, get_current_user

router = APIRouter()

@router.get("", response_model=List[ProductResponse])
@router.get("/", response_model=List[ProductResponse])
async def list_products(
    merchantId: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    GET /api/products — Retrieves products from backend database.
    Supports optional merchantId filtering via query parameter.
    """
    seed_demo_products(db)

    query = db.query(Product)
    if merchantId:
        query = query.filter(Product.merchantId == merchantId)

    products = query.order_by(Product.created_at.desc()).all()
    return [p.to_dict() for p in products]

@router.get("/merchant/{merchant_id}", response_model=List[ProductResponse])
@router.get("/merchants/{merchant_id}", response_model=List[ProductResponse])
async def get_merchant_specific_products(
    merchant_id: str,
    db: Session = Depends(get_db)
):
    """
    GET /api/products/merchants/{merchant_id} — Retrieves products belonging to a specific merchant.
    """
    seed_demo_products(db)

    products = db.query(Product).filter(Product.merchantId == merchant_id).order_by(Product.created_at.desc()).all()
    return [p.to_dict() for p in products]

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
):
    """
    POST /api/products — Creates a product directly in the database.
    """
    current_user = None
    if auth and auth.credentials:
        try:
            current_user = get_current_user(auth=auth, db=db)
        except Exception:
            pass

    target_merchant_id = product_in.merchantId or (current_user.id if current_user else DEFAULT_DEMO_MERCHANT_ID)
    prod_id = f"prod_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"

    product = Product(
        id=prod_id,
        productId=prod_id,
        merchantId=target_merchant_id,
        name=product_in.name.strip(),
        price=float(product_in.price),
        currency=product_in.currency.strip() if product_in.currency else "INR",
        category=product_in.category.strip() if product_in.category else "General / Digital Product",
        description=product_in.description.strip() if product_in.description else "",
        active=product_in.active if product_in.active is not None else True
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    return product.to_dict()
