import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class MerchantAutonomy(Base):
    __tablename__ = "merchant_autonomy_configs"

    id = Column(String(255), primary_key=True, default=generate_uuid, index=True)
    merchantId = Column(String(255), unique=True, index=True, nullable=False)
    autonomyEnabled = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    def to_dict(self):
        return {
            "merchantId": self.merchantId,
            "autonomyEnabled": self.autonomyEnabled,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else utc_now().isoformat()
        }
