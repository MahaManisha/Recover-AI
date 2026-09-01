import uuid
import time
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.recovery import RecoveryEvent
from app.models.product import DEFAULT_DEMO_MERCHANT_ID
from app.schemas.recovery import RecoveryEventCreate, RecoveryEventUpdate, RecoveryEventResponse

router = APIRouter()

def safe_str(val, default=""):
    if val is None:
        return default
    return str(val).strip()

@router.get("/events", response_model=List[RecoveryEventResponse])
async def get_recovery_events(
    merchantId: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Retrieves recovery events from backend database.
    Optionally filters strictly by merchantId query parameter.
    """
    query = db.query(RecoveryEvent)
    if merchantId and merchantId.strip() and merchantId.strip().lower() not in ("undefined", "null", "none"):
        target_merchant = merchantId.strip()
        query = query.filter(
            (RecoveryEvent.merchantId == target_merchant) | (RecoveryEvent.merchantId == DEFAULT_DEMO_MERCHANT_ID)
        )

    events = query.order_by(RecoveryEvent.created_at.desc()).all()
    return [e.to_dict() for e in events]

@router.post("/events", response_model=RecoveryEventResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_recovery_event(
    event_in: RecoveryEventCreate,
    db: Session = Depends(get_db)
):
    """
    Creates a new recovery event or updates an existing event if matching activityId/paymentAttemptId exists.
    """
    existing = None
    if event_in.activityId:
        existing = db.query(RecoveryEvent).filter(RecoveryEvent.activityId == event_in.activityId).first()
    if not existing and event_in.paymentAttemptId:
        existing = db.query(RecoveryEvent).filter(RecoveryEvent.paymentAttemptId == event_in.paymentAttemptId).first()
    if not existing and event_in.status == "RECOVERED" and event_in.merchantId:
        existing = db.query(RecoveryEvent).filter(
            RecoveryEvent.merchantId == safe_str(event_in.merchantId),
            RecoveryEvent.status == "FAILED"
        ).order_by(RecoveryEvent.created_at.desc()).first()

    if existing:
        # Update existing recovery event record
        if event_in.status:
            existing.status = safe_str(event_in.status, existing.status)
        if event_in.recoveredAmount is not None:
            existing.recoveredAmount = float(event_in.recoveredAmount)
        if event_in.recommendedAction:
            existing.recommendedAction = safe_str(event_in.recommendedAction, existing.recommendedAction)
        if event_in.retryCount is not None:
            existing.retryCount = int(event_in.retryCount)
        if event_in.failureCode:
            existing.failureCode = safe_str(event_in.failureCode, existing.failureCode)

        db.commit()
        db.refresh(existing)
        return existing.to_dict()

    rec_id = f"rec_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
    act_id = event_in.activityId or f"act_{event_in.paymentResultId or rec_id}"

    event = RecoveryEvent(
        id=rec_id,
        activityId=act_id,
        customerId=safe_str(event_in.customerId, "customer_demo"),
        merchantId=safe_str(event_in.merchantId, DEFAULT_DEMO_MERCHANT_ID),
        productId=safe_str(event_in.productId, "prod_demo"),
        productName=safe_str(event_in.productName, "Selected Product"),
        amount=float(event_in.amount or 0.0),
        currency=safe_str(event_in.currency, "INR"),
        failureCode=safe_str(event_in.failureCode, "SERVER_ERROR"),
        failureReason=safe_str(event_in.failureReason, "Payment processing error"),
        priority=safe_str(event_in.priority, "CRITICAL"),
        priorityScore=int(event_in.priorityScore if event_in.priorityScore is not None else 85),
        recommendedAction=safe_str(event_in.recommendedAction, "RECOVERY_OUTREACH"),
        channel=safe_str(event_in.channel, "EMAIL"),
        status=safe_str(event_in.status, "FAILED"),
        recoveredAmount=float(event_in.recoveredAmount or 0.0),
        retryCount=int(event_in.retryCount or 1),
        paymentAttemptId=event_in.paymentAttemptId,
        paymentResultId=event_in.paymentResultId
    )

    db.add(event)
    db.commit()
    db.refresh(event)
    return event.to_dict()

@router.put("/events/{event_id}", response_model=RecoveryEventResponse)
async def update_recovery_event(
    event_id: str,
    event_update: RecoveryEventUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates an existing recovery event (e.g. status transition FAILED -> RECOVERED).
    """
    event = db.query(RecoveryEvent).filter(
        (RecoveryEvent.id == event_id) | (RecoveryEvent.activityId == event_id) | (RecoveryEvent.paymentAttemptId == event_id)
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail=f"Recovery event '{event_id}' not found.")

    if event_update.status:
        event.status = safe_str(event_update.status, event.status)
    if event_update.recoveredAmount is not None:
        event.recoveredAmount = float(event_update.recoveredAmount)
    if event_update.recommendedAction:
        event.recommendedAction = safe_str(event_update.recommendedAction, event.recommendedAction)
    if event_update.retryCount is not None:
        event.retryCount = int(event_update.retryCount)

    db.commit()
    db.refresh(event)
    return event.to_dict()
