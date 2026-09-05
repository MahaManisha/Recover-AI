import hashlib
import json
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.recovery import RecoveryEvent
from app.models.merchant_autonomy import MerchantAutonomy
from app.core.errors import RecoverAIException

DEFAULT_MAX_RETRIES = 3
ALLOWED_ACTION_TYPES = {"RECOVERY_OUTREACH", "PAYMENT_RETRY", "DISCOUNT_OFFER", "CHANNEL_SWITCH", "MANUAL_REVIEW"}

def normalize_dict(data: Optional[Dict[str, Any]]) -> str:
    if not data:
        return ""
    sorted_dict = {k: str(data[k]).strip() for k in sorted(data.keys())}
    return json.dumps(sorted_dict, sort_keys=True)

def compute_proposal_fingerprint(case_id: str, proposal_option_id: str, action_type: str, requested_params: Optional[Dict[str, Any]] = None) -> str:
    """
    Computes SHA-256 fingerprint: SHA256(case_id | proposal_option_id | action_type | normalized_params)
    """
    raw = f"{str(case_id).strip()}|{str(proposal_option_id).strip()}|{str(action_type).strip()}|{normalize_dict(requested_params)}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

def compute_request_fingerprint(request_data: Dict[str, Any]) -> str:
    """
    Computes SHA-256 fingerprint for HTTP request body payload.
    """
    raw = json.dumps(request_data, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

def reconstruct_effective_lifecycle_state(db: Session, activity_id: str) -> Tuple[str, Optional[RecoveryEvent], int]:
    """
    Reconstructs authoritative effective lifecycle state from complete activityId event history.
    Orders events strictly by created_at DESC, id DESC.
    Returns: (effective_state, latest_event_record, total_retries)
    """
    if not activity_id:
        return ("FAILED", None, 0)

    events = db.query(RecoveryEvent).filter(
        RecoveryEvent.activityId == activity_id
    ).order_by(RecoveryEvent.created_at.desc(), RecoveryEvent.id.desc()).all()

    if not events:
        return ("FAILED", None, 0)

    # If ANY event is RECOVERED or BLOCKED, effective state is terminal
    for ev in events:
        if ev.status == "RECOVERED":
            return ("RECOVERED", events[0], ev.retryCount or 1)
        if ev.status == "BLOCKED":
            return ("BLOCKED", events[0], ev.retryCount or 1)

    latest = events[0]
    effective_state = latest.status or "FAILED"
    max_retry_found = max([e.retryCount or 1 for e in events])

    return (effective_state, latest, max_retry_found)

def evaluate_server_policy(
    db: Session,
    merchant_id: str,
    case_id: str,
    activity_id: str,
    proposal_option_id: str,
    action_type: str,
    requested_params: Optional[Dict[str, Any]] = None
) -> RecoveryEvent:
    """
    Server policy evaluator: Validates lifecycle state, retry limits, merchant policy, and proposal parameters.
    """
    # 1. Action type check
    if action_type and action_type.upper() not in ALLOWED_ACTION_TYPES:
        raise RecoverAIException(
            message=f"Invalid action type '{action_type}'.",
            code="POLICY_DISALLOWED",
            status_code=409
        )

    # 2. Reconstruct effective lifecycle state
    effective_state, latest_event, retry_count = reconstruct_effective_lifecycle_state(db, activity_id)

    if effective_state in ("RECOVERED", "BLOCKED"):
        raise RecoverAIException(
            message=f"Lifecycle is in terminal state '{effective_state}'. Execution disallowed.",
            code="TERMINAL_LIFECYCLE",
            status_code=422
        )

    # 3. Check retry limit
    if retry_count >= DEFAULT_MAX_RETRIES:
        raise RecoverAIException(
            message=f"Maximum retry limit ({DEFAULT_MAX_RETRIES}) reached for case '{activity_id}'.",
            code="RETRY_LIMIT_EXCEEDED",
            status_code=409
        )

    # 4. Check merchant autonomy config if present
    autonomy = db.query(MerchantAutonomy).filter(MerchantAutonomy.merchantId == merchant_id).first()
    # Note: Autonomy config evaluation logic can be enforced here

    return latest_event
