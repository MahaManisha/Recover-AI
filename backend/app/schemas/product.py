from pydantic import BaseModel, Field
from typing import Optional

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1)
    price: float = Field(..., gt=0)
    currency: Optional[str] = "INR"
    category: Optional[str] = "General / Digital Product"
    description: Optional[str] = ""
    merchantId: Optional[str] = None
    active: Optional[bool] = True

class ProductResponse(BaseModel):
    id: str
    productId: str
    merchantId: str
    name: str
    price: float
    currency: str
    category: str
    description: str
    active: bool
    formattedPrice: Optional[str] = None

    class Config:
        from_attributes = True
