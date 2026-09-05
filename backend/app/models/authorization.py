import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Integer, UniqueConstraint
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class RecoveryAuthorization(Base):
    __tablename__ = "recovery_authorizations"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    authorization_proof_hash = Column(String(64), nullable=False, index=True)
    merchant_id = Column(String(255), nullable=False, index=True)
    case_id = Column(String(255), nullable=False, index=True)
    activity_id = Column(String(255), nullable=False, index=True)
    proposal_option_id = Column(String(100), nullable=False)
    proposal_fingerprint = Column(String(64), nullable=False)
    action_type = Column(String(100), nullable=False)
    operator_actor_id = Column(String(255), nullable=False)
    status = Column(String(50), default="ISSUED", nullable=False) # ISSUED | CONSUMED | EXPIRED
    expires_at = Column(DateTime(timezone=True), nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "merchantId": self.merchant_id,
            "caseId": self.case_id,
            "activityId": self.activity_id,
            "proposalOptionId": self.proposal_option_id,
            "proposalFingerprint": self.proposal_fingerprint,
            "actionType": self.action_type,
            "operatorActorId": self.operator_actor_id,
            "status": self.status,
            "expiresAt": self.expires_at.isoformat() if self.expires_at else None,
            "consumedAt": self.consumed_at.isoformat() if self.consumed_at else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }

class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    idempotency_key = Column(String(255), nullable=False, index=True)
    merchant_id = Column(String(255), nullable=False, index=True)
    operator_actor_id = Column(String(255), nullable=False, index=True)
    request_fingerprint = Column(String(64), nullable=False)
    response_code = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    status = Column(String(50), default="PROCESSING", nullable=False) # PROCESSING | COMPLETED
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint('merchant_id', 'operator_actor_id', 'idempotency_key', name='uix_merchant_operator_idempotency'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "idempotencyKey": self.idempotency_key,
            "merchantId": self.merchant_id,
            "operatorActorId": self.operator_actor_id,
            "requestFingerprint": self.request_fingerprint,
            "responseCode": self.response_code,
            "responseBody": self.response_body,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "expiresAt": self.expires_at.isoformat() if self.expires_at else None,
        }
