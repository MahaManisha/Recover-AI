import time
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.product import Product, seed_demo_products, DEFAULT_DEMO_MERCHANT_ID
from app.models.merchant_autonomy import MerchantAutonomy, utc_now
from app.schemas.product import ProductCreate, ProductResponse
from app.schemas.merchant_autonomy import MerchantAutonomyUpdate, MerchantAutonomyResponse
from app.services.rbac import require_merchant
from app.services.auth import security_bearer, get_current_user

router = APIRouter()

@router.get("/access")
async def merchant_access(current_user: User = Depends(require_merchant)):
    """
    Verification endpoint for MERCHANT role access.
    """
    return {
        "message": "Merchant access granted",
        "user_id": current_user.id,
        "role": current_user.role
    }

@router.get("/products", response_model=List[ProductResponse])
async def get_merchant_products(
    merchantId: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Retrieves merchant products stored in the database.
    Optionally filters by merchantId query parameter.
    """
    seed_demo_products(db)

    query = db.query(Product)
    if merchantId:
        query = query.filter(Product.merchantId == merchantId)

    products = query.order_by(Product.created_at.desc()).all()
    return [p.to_dict() for p in products]

@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_merchant_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
):
    """
    Creates a new merchant product and persists it directly into the database.
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

@router.get("/autonomy", response_model=MerchantAutonomyResponse)
async def get_merchant_autonomy(
    merchantId: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Retrieves persistent merchant autonomy configuration from the database.
    Defaults to autonomyEnabled: False if unconfigured.
    """
    target_merchant = (merchantId.strip() if merchantId and merchantId.strip() else None) or DEFAULT_DEMO_MERCHANT_ID
    config = db.query(MerchantAutonomy).filter(MerchantAutonomy.merchantId == target_merchant).first()
    
    if not config:
        return {
            "merchantId": target_merchant,
            "autonomyEnabled": False,
            "updatedAt": utc_now().isoformat()
        }
    return config.to_dict()

@router.put("/autonomy", response_model=MerchantAutonomyResponse)
@router.post("/autonomy", response_model=MerchantAutonomyResponse)
async def update_merchant_autonomy(
    payload: MerchantAutonomyUpdate,
    db: Session = Depends(get_db),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
):
    """
    Updates or creates persistent merchant autonomy configuration in the database.
    Enforces RBAC: CUSTOMER role users cannot modify autonomy configuration.
    """
    current_user = None
    if auth and auth.credentials:
        try:
            current_user = get_current_user(auth=auth, db=db)
        except Exception:
            pass

    if current_user and current_user.role == "CUSTOMER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer users are not authorized to modify merchant autonomy configuration."
        )

    target_merchant = (payload.merchantId.strip() if payload.merchantId and payload.merchantId.strip() else None) or (current_user.id if current_user else DEFAULT_DEMO_MERCHANT_ID)
    
    config = db.query(MerchantAutonomy).filter(MerchantAutonomy.merchantId == target_merchant).first()
    if not config:
        config = MerchantAutonomy(
            id=f"auto_cfg_{uuid.uuid4().hex[:8]}",
            merchantId=target_merchant,
            autonomyEnabled=bool(payload.autonomyEnabled)
        )
        db.add(config)
    else:
        config.autonomyEnabled = bool(payload.autonomyEnabled)

    db.commit()
    db.refresh(config)
    return config.to_dict()


