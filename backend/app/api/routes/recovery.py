import uuid
import time
import secrets
import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Header, status, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.recovery import RecoveryEvent
from app.models.authorization import RecoveryAuthorization, IdempotencyKey
from app.models.user import User
from app.models.product import DEFAULT_DEMO_MERCHANT_ID
from app.schemas.recovery import (
    AuthorizeProposalRequest,
    AuthorizeProposalResponse,
    RecoveryEventCreate,
    RecoveryEventUpdate,
    RecoveryEventResponse,
)
from app.services.auth import get_current_user, security_bearer
from app.services.recovery_policy import (
    compute_proposal_fingerprint,
    compute_request_fingerprint,
    reconstruct_effective_lifecycle_state,
    evaluate_server_policy,
)
from app.core.errors import RecoverAIException

router = APIRouter()

def safe_str(val, default=""):
    if val is None:
        return default
    return str(val).strip()

def validate_merchant_tenancy(user: User, target_merchant_id: str):
    """
    Independent server-side tenancy guard.
    Customer users cannot perform merchant recovery execution actions.
    Merchant users must match the target merchant ID or demo scope.
    """
    user_role = (user.role or "").upper().strip()
    if user_role == "CUSTOMER":
        raise RecoverAIException(
            message="Customer users are prohibited from performing merchant recovery execution actions.",
            code="UNAUTHORIZED_ROLE",
            status_code=403
        )
    
    if user_role != "MERCHANT":
        raise RecoverAIException(
            message=f"Role '{user.role}' is unauthorized to perform recovery execution actions.",
            code="UNAUTHORIZED_ROLE",
            status_code=403
        )

    target_merchant = safe_str(target_merchant_id, DEFAULT_DEMO_MERCHANT_ID)
    
    # Demo merchant scope compatibility
    if target_merchant == DEFAULT_DEMO_MERCHANT_ID:
        return

    if user.id != target_merchant and safe_str(user.email).lower() != target_merchant.lower():
        raise RecoverAIException(
            message=f"Merchant scope mismatch. User '{user.id}' is not authorized for merchant '{target_merchant}'.",
            code="MERCHANT_MISMATCH",
            status_code=403
        )

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

@router.post("/authorize-proposal", response_model=AuthorizeProposalResponse, status_code=status.HTTP_201_CREATED)
async def authorize_proposal(
    req: AuthorizeProposalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    M10.15 Endpoint: Issues a short-lived, single-use authorization proof for a recovery proposal.
    Requires Bearer JWT authentication & MERCHANT role.
    """
    # 1. Tenancy Guard
    validate_merchant_tenancy(current_user, req.merchantId)

    # 2. Re-read DB state & Evaluate Server Policy
    latest_event = evaluate_server_policy(
        db=db,
        merchant_id=req.merchantId,
        case_id=req.caseId,
        activity_id=req.activityId,
        proposal_option_id=req.proposalOptionId,
        action_type=req.actionType,
        requested_params=req.requestedParams
    )

    # 3. Compute Proposal Fingerprint
    proposal_fingerprint = compute_proposal_fingerprint(
        case_id=req.caseId,
        proposal_option_id=req.proposalOptionId,
        action_type=req.actionType,
        requested_params=req.requestedParams
    )

    # 4. Generate Raw Cryptographic Secret (256-bit entropy)
    raw_authorization_proof = secrets.token_urlsafe(32)
    proof_hash = hashlib.sha256(raw_authorization_proof.encode('utf-8')).hexdigest()

    # 5. Persist Authorization Record (TTL = 300 seconds)
    auth_id = f"srv_auth_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=300)

    auth_record = RecoveryAuthorization(
        id=auth_id,
        authorization_proof_hash=proof_hash,
        merchant_id=req.merchantId,
        case_id=req.caseId,
        activity_id=req.activityId,
        proposal_option_id=req.proposalOptionId,
        proposal_fingerprint=proposal_fingerprint,
        action_type=req.actionType,
        operator_actor_id=current_user.id,
        status="ISSUED",
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc)
    )

    db.add(auth_record)
    db.commit()
    db.refresh(auth_record)

    return AuthorizeProposalResponse(
        serverAuthorizationId=auth_record.id,
        authorizationProof=raw_authorization_proof, # Raw secret returned ONCE
        expiresAt=expires_at.isoformat(),
        proposalFingerprint=proposal_fingerprint,
        status="ISSUED"
    )

@router.post("/events", response_model=RecoveryEventResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_recovery_event(
    event_in: RecoveryEventCreate,
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    db: Session = Depends(get_db),
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
):
    """
    M10.15 Endpoint: Authenticates operator, validates single-use authorization nonces,
    enforces idempotency, serializes execution, and persists execution provenance.
    """
    print(f"[RECOVERY ROUTE] POST /events received: activityId={event_in.activityId}, merchantId={event_in.merchantId}, status={event_in.status}")

    # Determine if request has authentication or is a governed execution request
    current_user = None
    if auth_credentials and auth_credentials.credentials:
        try:
            current_user = get_current_user(auth=auth_credentials, db=db)
        except Exception as e:
            if event_in.authorizationProof:
                raise e
            current_user = None

    is_governed_execution = bool(event_in.authorizationProof or (event_in.status in ("DISPATCHED", "EXECUTION_ACCEPTED") and current_user and current_user.role == "MERCHANT"))

    # Governed execution requires strict authentication & authorization proof
    if event_in.authorizationProof and not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for governed recovery execution.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    operator_actor_id = current_user.id if current_user else "system_actor"
    merchant_id = safe_str(event_in.merchantId, DEFAULT_DEMO_MERCHANT_ID)

    if current_user and is_governed_execution:
        validate_merchant_tenancy(current_user, merchant_id)

    # Concurrency Lock on activityId
    act_id = event_in.activityId or event_in.paymentAttemptId or f"act_{int(time.time()*1000)}"
    if db.bind and db.bind.name == "sqlite":
        try:
            db.execute(text("BEGIN IMMEDIATE"))
        except Exception:
            pass
    elif db.bind and db.bind.name == "postgresql":
        act_hash = int(hashlib.md5(act_id.encode('utf-8')).hexdigest()[:8], 16) - (1 << 31)
        db.execute(text("SELECT pg_advisory_xact_lock(:lock_id)"), {"lock_id": act_hash})

    # 1. Evaluate Request Idempotency if Header Present
    idemp_record = None
    if x_idempotency_key and current_user:
        payload_data = event_in.model_dump(exclude_none=True)
        req_fingerprint = compute_request_fingerprint(payload_data)

        idemp_record = db.query(IdempotencyKey).filter(
            IdempotencyKey.idempotency_key == x_idempotency_key
        ).first()

        if idemp_record:
            # Scope check
            if idemp_record.merchant_id != merchant_id or idemp_record.operator_actor_id != current_user.id:
                raise RecoverAIException(
                    message="Idempotency key collision across scopes.",
                    code="IDEMPOTENCY_SCOPE_MISMATCH",
                    status_code=403
                )
            # Request fingerprint check
            if idemp_record.request_fingerprint != req_fingerprint:
                raise RecoverAIException(
                    message="Same idempotency key used with different payload.",
                    code="IDEMPOTENCY_KEY_REUSE",
                    status_code=409
                )
            # Return cached response if completed
            if idemp_record.status == "COMPLETED" and idemp_record.response_body:
                cached_json = json.loads(idemp_record.response_body)
                return cached_json
        else:
            # Create PROCESSING idempotency record under current atomic transaction
            idemp_record = IdempotencyKey(
                id=f"idemp_{uuid.uuid4().hex}",
                idempotency_key=x_idempotency_key,
                merchant_id=merchant_id,
                operator_actor_id=current_user.id,
                request_fingerprint=req_fingerprint,
                status="PROCESSING",
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
            )
            db.add(idemp_record)
            db.flush()

    # 2. Verify Authorization Proof Nonce if Provided
    server_auth_record = None
    if event_in.authorizationProof:
        incoming_hash = hashlib.sha256(event_in.authorizationProof.encode('utf-8')).hexdigest()
        
        server_auth_record = db.query(RecoveryAuthorization).filter(
            RecoveryAuthorization.authorization_proof_hash == incoming_hash
        ).first()

        if not server_auth_record:
            raise RecoverAIException(
                message="Invalid or unrecognized authorization proof.",
                code="INVALID_AUTHORIZATION",
                status_code=404
            )

        # Verify Merchant Scope
        if server_auth_record.merchant_id != merchant_id:
            raise RecoverAIException(
                message="Authorization proof merchant mismatch.",
                code="MERCHANT_MISMATCH",
                status_code=403
            )

        # Verify Operator Scope
        if current_user and server_auth_record.operator_actor_id != current_user.id:
            raise RecoverAIException(
                message="Authorization proof operator mismatch.",
                code="MERCHANT_MISMATCH",
                status_code=403
            )

        # Verify Expiry
        now_utc = datetime.now(timezone.utc)
        auth_expires = server_auth_record.expires_at
        if auth_expires.tzinfo is None:
            auth_expires = auth_expires.replace(tzinfo=timezone.utc)

        if auth_expires <= now_utc:
            raise RecoverAIException(
                message="Authorization proof has expired.",
                code="STALE_AUTHORIZATION",
                status_code=409
            )

        # Verify Status
        if server_auth_record.status == "CONSUMED":
            raise RecoverAIException(
                message="Authorization proof has already been consumed.",
                code="REPLAY_DETECTED",
                status_code=409
            )

        if server_auth_record.status != "ISSUED":
            raise RecoverAIException(
                message=f"Authorization proof status '{server_auth_record.status}' is invalid.",
                code="STALE_AUTHORIZATION",
                status_code=409
            )

        # Verify Proposal Fingerprint Matching
        exec_fingerprint = compute_proposal_fingerprint(
            case_id=server_auth_record.case_id,
            proposal_option_id=event_in.proposalOptionId or server_auth_record.proposal_option_id,
            action_type=event_in.actionType or server_auth_record.action_type,
            requested_params=event_in.requestedParams or {}
        )

        if exec_fingerprint != server_auth_record.proposal_fingerprint:
            if event_in.proposalOptionId and event_in.proposalOptionId != server_auth_record.proposal_option_id:
                raise RecoverAIException(
                    message="Execution payload does not match authorized proposal option.",
                    code="PROPOSAL_MISMATCH",
                    status_code=422
                )
            elif event_in.requestedParams is not None:
                raise RecoverAIException(
                    message="Execution payload requestedParams mismatch with authorized proposal.",
                    code="PROPOSAL_MISMATCH",
                    status_code=422
                )

        # Atomic Proof Consumption
        updated_count = db.query(RecoveryAuthorization).filter(
            RecoveryAuthorization.id == server_auth_record.id,
            RecoveryAuthorization.status == "ISSUED"
        ).update({
            "status": "CONSUMED",
            "consumed_at": datetime.now(timezone.utc)
        })

        if updated_count == 0:
            db.rollback()
            raise RecoverAIException(
                message="Concurrent replay detected. Authorization already consumed.",
                code="REPLAY_DETECTED",
                status_code=409
            )

    # 3. Re-evaluate Effective Lifecycle State under lock
    effective_state, existing_record, retry_count = reconstruct_effective_lifecycle_state(db, act_id)

    if effective_state in ("RECOVERED", "BLOCKED"):
        raise RecoverAIException(
            message=f"Cannot execute recovery on case '{act_id}' in terminal state '{effective_state}'.",
            code="TERMINAL_LIFECYCLE",
            status_code=422
        )

    if retry_count >= 3:
        raise RecoverAIException(
            message=f"Maximum retry limit reached for case '{act_id}'.",
            code="RETRY_LIMIT_EXCEEDED",
            status_code=409
        )

    # 4. Generate Trusted Execution Provenance ID
    execution_provenance_id = f"srv_prov_{uuid.uuid4().hex[:12]}"
    server_auth_id = server_auth_record.id if server_auth_record else None

    # 5. Persist / Update RecoveryEvent Record
    execution_status = event_in.status
    if is_governed_execution and execution_status == "FAILED":
        execution_status = "DISPATCHED"

    existing = None
    if event_in.activityId:
        existing = db.query(RecoveryEvent).filter(RecoveryEvent.activityId == event_in.activityId).first()
    if not existing and event_in.paymentAttemptId:
        existing = db.query(RecoveryEvent).filter(RecoveryEvent.paymentAttemptId == event_in.paymentAttemptId).first()

    if existing:
        if not (existing.status == "RECOVERED" and execution_status == "FAILED"):
            existing.status = safe_str(execution_status, existing.status)
            if execution_status == "RECOVERED":
                existing.recoveredAmount = float(event_in.recoveredAmount or event_in.amount or existing.amount)
                existing.recommendedAction = "RECOVERED"
            elif event_in.recommendedAction:
                existing.recommendedAction = safe_str(event_in.recommendedAction, existing.recommendedAction)

        if server_auth_id:
            existing.server_authorization_id = server_auth_id
        existing.execution_provenance_id = execution_provenance_id
        if event_in.authorizationAuditId:
            existing.authorization_audit_id = event_in.authorizationAuditId
        if event_in.handoffAuditId:
            existing.handoff_audit_id = event_in.handoffAuditId
        existing.operator_actor_id = operator_actor_id
        if x_idempotency_key:
            existing.idempotency_key = x_idempotency_key

        db.flush()
        res_dict = existing.to_dict()
    else:
        rec_id = f"rec_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        event = RecoveryEvent(
            id=rec_id,
            activityId=act_id,
            customerId=safe_str(event_in.customerId, "customer_demo"),
            merchantId=merchant_id,
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
            status=execution_status,
            recoveredAmount=float(event_in.recoveredAmount or 0.0),
            retryCount=int(event_in.retryCount or 0),
            paymentAttemptId=event_in.paymentAttemptId,
            paymentResultId=event_in.paymentResultId,
            server_authorization_id=server_auth_id,
            execution_provenance_id=execution_provenance_id,
            authorization_audit_id=event_in.authorizationAuditId,
            handoff_audit_id=event_in.handoffAuditId,
            operator_actor_id=operator_actor_id,
            idempotency_key=x_idempotency_key
        )
        db.add(event)
        db.flush()
        res_dict = event.to_dict()

    # 6. Complete Idempotency Record if Key Provided
    if idemp_record:
        idemp_record.status = "COMPLETED"
        idemp_record.response_code = 201
        idemp_record.response_body = json.dumps(res_dict)

    db.commit()
    return res_dict

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
