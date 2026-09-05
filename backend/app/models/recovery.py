import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, Text
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class RecoveryEvent(Base):
    __tablename__ = "recovery_events"

    id = Column(String(255), primary_key=True, default=generate_uuid, index=True)
    activityId = Column(String(255), index=True, nullable=True)
    customerId = Column(String(255), nullable=False, index=True)
    merchantId = Column(String(255), nullable=False, index=True)
    productId = Column(String(255), nullable=False)
    productName = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    failureCode = Column(String(100), default="SERVER_ERROR")
    failureReason = Column(Text, default="Payment processing error")
    priority = Column(String(50), default="CRITICAL")
    priorityScore = Column(Integer, default=85)
    recommendedAction = Column(String(100), default="RECOVERY_OUTREACH")
    channel = Column(String(50), default="EMAIL")
    status = Column(String(50), default="FAILED", index=True)
    recoveredAmount = Column(Float, default=0.0)
    retryCount = Column(Integer, default=1)
    paymentAttemptId = Column(String(255), nullable=True)
    paymentResultId = Column(String(255), nullable=True)
    server_authorization_id = Column(String(255), nullable=True)
    execution_provenance_id = Column(String(255), nullable=True)
    authorization_audit_id = Column(String(255), nullable=True)
    handoff_audit_id = Column(String(255), nullable=True)
    operator_actor_id = Column(String(255), nullable=True)
    idempotency_key = Column(String(255), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    def to_dict(self):
        pid = self.activityId or self.id
        return {
            "id": self.id,
            "activityId": pid,
            "recoveryId": self.id,
            "customerId": self.customerId,
            "merchantId": self.merchantId,
            "productId": self.productId,
            "productName": self.productName,
            "amount": self.amount,
            "currency": self.currency or "INR",
            "failureCode": self.failureCode or "SERVER_ERROR",
            "failureReason": self.failureReason or "Payment processing error",
            "priority": self.priority or "CRITICAL",
            "priorityScore": self.priorityScore if self.priorityScore is not None else 85,
            "recommendedAction": self.recommendedAction or "RECOVERY_OUTREACH",
            "channel": self.channel or "EMAIL",
            "status": self.status or "FAILED",
            "recoveredAmount": self.recoveredAmount if self.recoveredAmount is not None else 0.0,
            "retryCount": self.retryCount if self.retryCount is not None else 1,
            "paymentAttemptId": self.paymentAttemptId,
            "paymentResultId": self.paymentResultId,
            "serverAuthorizationId": self.server_authorization_id,
            "executionProvenanceId": self.execution_provenance_id,
            "authorizationAuditId": self.authorization_audit_id,
            "handoffAuditId": self.handoff_audit_id,
            "operatorActorId": self.operator_actor_id,
            "idempotencyKey": self.idempotency_key,
            "requiresReconciliation": True if self.status in ("DISPATCHED", "EXECUTION_ACCEPTED") else False,
            "timestamp": self.created_at.isoformat() if self.created_at else utc_now().isoformat()
        }
