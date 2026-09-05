from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class AuthorizeProposalRequest(BaseModel):
    merchantId: str
    caseId: str
    activityId: str
    proposalOptionId: str
    actionType: str
    requestedParams: Optional[Dict[str, Any]] = {}

class AuthorizeProposalResponse(BaseModel):
    serverAuthorizationId: str
    authorizationProof: str
    expiresAt: str
    proposalFingerprint: str
    status: str

class RecoveryEventCreate(BaseModel):
    activityId: Optional[str] = None
    customerId: Optional[str] = "customer_demo"
    merchantId: Optional[str] = "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991"
    productId: Optional[str] = "prod_demo"
    productName: Optional[str] = "Selected Product"
    amount: Optional[float] = 0.0
    currency: Optional[str] = "INR"
    failureCode: Optional[str] = "SERVER_ERROR"
    failureReason: Optional[str] = "Payment processing error"
    priority: Optional[str] = "CRITICAL"
    priorityScore: Optional[int] = 85
    recommendedAction: Optional[str] = "RECOVERY_OUTREACH"
    channel: Optional[str] = "EMAIL"
    status: Optional[str] = "FAILED"
    recoveredAmount: Optional[float] = 0.0
    retryCount: Optional[int] = 0
    paymentAttemptId: Optional[str] = None
    paymentResultId: Optional[str] = None
    
    # M10.15 Governed Execution Provenance Inputs
    authorizationProof: Optional[str] = None
    authorizationAuditId: Optional[str] = None
    handoffAuditId: Optional[str] = None
    proposalOptionId: Optional[str] = None
    actionType: Optional[str] = None
    requestedParams: Optional[Dict[str, Any]] = None

class RecoveryEventUpdate(BaseModel):
    status: Optional[str] = None
    recoveredAmount: Optional[float] = None
    recommendedAction: Optional[str] = None
    retryCount: Optional[int] = None

class RecoveryEventResponse(BaseModel):
    id: str
    activityId: str
    customerId: str
    merchantId: str
    productId: str
    productName: str
    amount: float
    currency: str
    failureCode: str
    failureReason: str
    priority: str
    priorityScore: int
    recommendedAction: str
    channel: str
    status: str
    recoveredAmount: float
    retryCount: int
    paymentAttemptId: Optional[str] = None
    paymentResultId: Optional[str] = None
    
    # M10.15 Provenance Output Fields
    serverAuthorizationId: Optional[str] = None
    executionProvenanceId: Optional[str] = None
    authorizationAuditId: Optional[str] = None
    handoffAuditId: Optional[str] = None
    operatorActorId: Optional[str] = None
    idempotencyKey: Optional[str] = None
    requiresReconciliation: Optional[bool] = False
    timestamp: str

    model_config = ConfigDict(from_attributes=True)
