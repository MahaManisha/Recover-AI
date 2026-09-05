from typing import Optional
from pydantic import BaseModel, ConfigDict

class MerchantAutonomyUpdate(BaseModel):
    merchantId: Optional[str] = None
    autonomyEnabled: bool = False

class MerchantAutonomyResponse(BaseModel):
    merchantId: str
    autonomyEnabled: bool
    updatedAt: str

    model_config = ConfigDict(from_attributes=True)
