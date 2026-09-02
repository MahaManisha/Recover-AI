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
    A retry attempt (RECOVERED) will update the original FAILED recovery event row.
    """
    print(f"[RECOVERY ROUTE] POST /events received: activityId={event_in.activityId}, paymentAttemptId={event_in.paymentAttemptId}, merchantId={event_in.merchantId}, productId={event_in.productId}, status={event_in.status}")
    if event_in.status == "RECOVERED":
        print(f"[RECOVERY DEBUG] Incoming RECOVERED event: activityId={event_in.activityId}, paymentAttemptId={event_in.paymentAttemptId}, paymentResultId={event_in.paymentResultId}, merchantId={event_in.merchantId}, customerId={event_in.customerId}, productId={event_in.productId}, status={event_in.status}")

    existing = None
    if event_in.activityId:
        existing = db.query(RecoveryEvent).filter(RecoveryEvent.activityId == event_in.activityId).first()
    if not existing and event_in.paymentAttemptId:
        existing = db.query(RecoveryEvent).filter(RecoveryEvent.paymentAttemptId == event_in.paymentAttemptId).first()
    
    # Never match a RECOVERED record for an incoming FAILED event
    if existing and existing.status == "RECOVERED" and event_in.status == "FAILED":
        existing = None

    # The merchantId + productId + customerId fallback may ONLY be used for an explicit RECOVERED retry update
    is_retry_update = event_in.status == "RECOVERED" or (event_in.retryCount is not None and event_in.retryCount > 0)
    if not existing and is_retry_update:
        q = db.query(RecoveryEvent).filter(RecoveryEvent.status == "FAILED")
        if event_in.merchantId:
            q = q.filter(RecoveryEvent.merchantId == safe_str(event_in.merchantId))
        if event_in.productId:
            q = q.filter(RecoveryEvent.productId == safe_str(event_in.productId))
        if event_in.customerId:
            q = q.filter(RecoveryEvent.customerId == safe_str(event_in.customerId))
        existing = q.order_by(RecoveryEvent.created_at.desc()).first()

        if not existing and event_in.merchantId:
            q_merchant = db.query(RecoveryEvent).filter(
                RecoveryEvent.status == "FAILED",
                RecoveryEvent.merchantId == safe_str(event_in.merchantId)
            )
            if event_in.productId:
                q_merchant = q_merchant.filter(RecoveryEvent.productId == safe_str(event_in.productId))
            existing = q_merchant.order_by(RecoveryEvent.created_at.desc()).first()

        if not existing:
            existing = db.query(RecoveryEvent).filter(
                RecoveryEvent.status == "FAILED"
            ).order_by(RecoveryEvent.created_at.desc()).first()

    if existing:
        print(f"[RECOVERY DEBUG] Matched existing FAILED event: event_id={existing.id}, activityId={existing.activityId}, paymentAttemptId={existing.paymentAttemptId}, status before={existing.status}")
        
        # NEVER update a RECOVERED record to FAILED
        if not (existing.status == "RECOVERED" and event_in.status == "FAILED"):
            new_status = safe_str(event_in.status, existing.status)
            existing.status = new_status

            if new_status == "RECOVERED":
                existing.recoveredAmount = float(event_in.recoveredAmount or event_in.amount or existing.amount)
                existing.recommendedAction = "RECOVERED"
            else:
                if event_in.recoveredAmount is not None:
                    existing.recoveredAmount = float(event_in.recoveredAmount)
                if event_in.recommendedAction:
                    existing.recommendedAction = safe_str(event_in.recommendedAction, existing.recommendedAction)

        if event_in.retryCount is not None:
            existing.retryCount = int(event_in.retryCount)
        if event_in.failureCode:
            existing.failureCode = safe_str(event_in.failureCode, existing.failureCode)
        if event_in.productName:
            existing.productName = safe_str(event_in.productName, existing.productName)
        if event_in.amount:
            existing.amount = float(event_in.amount)
        if event_in.paymentResultId:
            existing.paymentResultId = safe_str(event_in.paymentResultId, existing.paymentResultId)

        # Also update any other remaining FAILED records for the same transaction lifecycle
        if existing.status == "RECOVERED":
            other_failed = db.query(RecoveryEvent).filter(
                RecoveryEvent.status == "FAILED",
                (
                    (RecoveryEvent.activityId == existing.activityId) |
                    (
                        (RecoveryEvent.merchantId == existing.merchantId) &
                        (RecoveryEvent.productId == existing.productId)
                    )
                )
            ).all()
            for other_rec in other_failed:
                if other_rec.id != existing.id:
                    other_rec.status = "RECOVERED"
                    other_rec.recoveredAmount = existing.recoveredAmount
                    other_rec.recommendedAction = "RECOVERED"

        db.commit()
        db.refresh(existing)

        print(f"[RECOVERY DEBUG] Updated recovery event: event_id={existing.id}, status after={existing.status}, recoveredAmount={existing.recoveredAmount}")
        return existing.to_dict()

    print(f"[RECOVERY ROUTE] Creating new RecoveryEvent row for status={event_in.status}")
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
        retryCount=int(event_in.retryCount or 0),
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
        # NEVER update a RECOVERED record to FAILED
        if not (event.status == "RECOVERED" and event_update.status == "FAILED"):
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
