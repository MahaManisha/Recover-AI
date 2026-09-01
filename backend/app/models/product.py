import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, Text
from sqlalchemy.orm import Session
from app.core.database import Base

DEFAULT_DEMO_MERCHANT_ID = "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991"

INITIAL_DEMO_PRODUCTS = [
    {
        "id": "prod_ai_fullstack_001",
        "productId": "prod_ai_fullstack_001",
        "merchantId": DEFAULT_DEMO_MERCHANT_ID,
        "name": "AI & Full-Stack Development Program",
        "description": "Build practical industry-ready skills in AI, backend development, frontend development, and modern application engineering.",
        "category": "Education / Online Program",
        "price": 2000.0,
        "currency": "INR",
        "active": True
    },
    {
        "id": "prod_ai_microservices_002",
        "productId": "prod_ai_microservices_002",
        "merchantId": DEFAULT_DEMO_MERCHANT_ID,
        "name": "Advanced AI Microservices & Autonomous Agents",
        "description": "Master multi-agent orchestration, autonomous decision flows, production LLM pipelines, and system reliability.",
        "category": "Education / Advanced Systems",
        "price": 3500.0,
        "currency": "INR",
        "active": True
    }
]

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class Product(Base):
    __tablename__ = "products"

    id = Column(String(255), primary_key=True, default=generate_uuid, index=True)
    productId = Column(String(255), index=True, nullable=True)
    merchantId = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    category = Column(String(255), default="General / Digital Product")
    description = Column(Text, default="")
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    def to_dict(self):
        pid = self.productId or self.id
        return {
            "id": pid,
            "productId": pid,
            "merchantId": self.merchantId,
            "name": self.name,
            "price": self.price,
            "currency": self.currency,
            "category": self.category or "General / Digital Product",
            "description": self.description or "",
            "active": self.active,
            "formattedPrice": f"₹{int(self.price):,}" if self.currency == "INR" else f"{self.currency} {self.price}"
        }

def seed_demo_products(db: Session):
    """
    Seeds initial demo products into the database if the products table is empty.
    """
    try:
        count = db.query(Product).count()
        if count == 0:
            for p_data in INITIAL_DEMO_PRODUCTS:
                prod = Product(
                    id=p_data["id"],
                    productId=p_data["productId"],
                    merchantId=p_data["merchantId"],
                    name=p_data["name"],
                    description=p_data["description"],
                    category=p_data["category"],
                    price=p_data["price"],
                    currency=p_data["currency"],
                    active=p_data["active"]
                )
                db.add(prod)
            db.commit()
    except Exception as err:
        db.rollback()
        print(f"[Product Model] Error seeding demo products: {err}")
