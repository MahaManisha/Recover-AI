from typing import Optional
from pydantic import BaseModel, ConfigDict

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
    retryCount: Optional[int] = 1
    paymentAttemptId: Optional[str] = None
    paymentResultId: Optional[str] = None

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
    timestamp: str

    model_config = ConfigDict(from_attributes=True)
