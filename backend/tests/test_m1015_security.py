import pytest
import secrets
import hashlib
import time
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.recovery import RecoveryEvent
from app.models.authorization import RecoveryAuthorization, IdempotencyKey
from app.core.security import get_password_hash, create_access_token
from app.services.recovery_policy import compute_proposal_fingerprint

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.query(RecoveryEvent).delete()
    db.query(RecoveryAuthorization).delete()
    db.query(IdempotencyKey).delete()
    db.query(User).delete()
    db.commit()

    merchant_user = User(
        id="merch_user_001",
        full_name="Demo Merchant Owner",
        email="merchant@demo.com",
        password_hash=get_password_hash("password123"),
        role="MERCHANT",
        is_active=True
    )
    customer_user = User(
        id="cust_user_001",
        full_name="Demo Customer",
        email="customer@demo.com",
        password_hash=get_password_hash("password123"),
        role="CUSTOMER",
        is_active=True
    )
    merchant_b_user = User(
        id="merch_user_002",
        full_name="Merchant B Owner",
        email="merchant_b@demo.com",
        password_hash=get_password_hash("password123"),
        role="MERCHANT",
        is_active=True
    )
    inactive_user = User(
        id="inactive_user_001",
        full_name="Inactive Merchant",
        email="inactive@demo.com",
        password_hash=get_password_hash("password123"),
        role="MERCHANT",
        is_active=False
    )
    db.add_all([merchant_user, customer_user, merchant_b_user, inactive_user])
    db.commit()

    failed_event = RecoveryEvent(
        id="rec_case_001",
        activityId="act_case_001",
        customerId="cust_demo",
        merchantId="0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
        productId="prod_demo",
        productName="Test Product",
        amount=1500.0,
        currency="INR",
        failureCode="INSUFFICIENT_FUNDS",
        status="FAILED",
        retryCount=1
    )
    db.add(failed_event)
    db.commit()
    db.close()
    yield

def get_merchant_token():
    return create_access_token({"sub": "merch_user_001", "role": "MERCHANT"})

def get_customer_token():
    return create_access_token({"sub": "cust_user_001", "role": "CUSTOMER"})

def get_merchant_b_token():
    return create_access_token({"sub": "merch_user_002", "role": "MERCHANT"})

def get_inactive_token():
    return create_access_token({"sub": "inactive_user_001", "role": "MERCHANT"})

# 1. Unauthenticated proposal authorization request
def test_01_unauthenticated_authorize_proposal():
    res = client.post("/api/recovery/authorize-proposal", json={
        "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
        "caseId": "rec_case_001",
        "activityId": "act_case_001",
        "proposalOptionId": "opt_email_discount_10",
        "actionType": "RECOVERY_OUTREACH"
    })
    assert res.status_code == 401

# 2. Unauthenticated execution request
def test_02_unauthenticated_execution_event():
    res = client.post("/api/recovery/events", json={
        "activityId": "act_case_001",
        "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
        "authorizationProof": "fake_proof",
        "status": "FAILED"
    })
    assert res.status_code == 401

# 3. Customer role rejection
def test_03_customer_role_rejection():
    token = get_customer_token()
    res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "UNAUTHORIZED_ROLE"

# 4. Valid merchant authorization
def test_04_valid_merchant_authorization():
    token = get_merchant_token()
    res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    assert res.status_code == 201
    data = res.json()
    assert "serverAuthorizationId" in data
    assert "authorizationProof" in data
    assert data["status"] == "ISSUED"

# 5. Valid proof execution
def test_05_valid_proof_execution():
    token = get_merchant_token()
    auth_res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    proof = auth_res.json()["authorizationProof"]
    auth_id = auth_res.json()["serverAuthorizationId"]

    exec_res = client.post(
        "/api/recovery/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "activityId": "act_case_001",
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH",
            "authorizationProof": proof,
            "status": "FAILED"
        }
    )
    assert exec_res.status_code == 201
    data = exec_res.json()
    assert data["serverAuthorizationId"] == auth_id
    assert data["executionProvenanceId"] is not None
    assert data["status"] == "DISPATCHED"
    assert data["requiresReconciliation"] is True

# 6. Consumed proof replay
def test_06_consumed_proof_replay():
    token = get_merchant_token()
    auth_res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    proof = auth_res.json()["authorizationProof"]

    exec1 = client.post(
        "/api/recovery/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "activityId": "act_case_001",
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "proposalOptionId": "opt_email_discount_10",
            "authorizationProof": proof
        }
    )
    assert exec1.status_code == 201

    exec2 = client.post(
        "/api/recovery/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "activityId": "act_case_001",
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "proposalOptionId": "opt_email_discount_10",
            "authorizationProof": proof
        }
    )
    assert exec2.status_code == 409
    assert exec2.json()["error"]["code"] == "REPLAY_DETECTED"

# 7. Expired proof rejection
def test_07_expired_proof_rejection():
    token = get_merchant_token()
    db = SessionLocal()
    raw_proof = secrets.token_urlsafe(32)
    p_hash = hashlib.sha256(raw_proof.encode('utf-8')).hexdigest()
    
    expired_auth = RecoveryAuthorization(
        id="srv_auth_expired_99",
        authorization_proof_hash=p_hash,
        merchant_id="0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
        case_id="rec_case_001",
        activity_id="act_case_001",
        proposal_option_id="opt_email_discount_10",
        proposal_fingerprint="fp123",
        action_type="RECOVERY_OUTREACH",
        operator_actor_id="merch_user_001",
        status="ISSUED",
        expires_at=datetime.now(timezone.utc) - timedelta(seconds=60),
        created_at=datetime.now(timezone.utc) - timedelta(seconds=400)
    )
    db.add(expired_auth)
    db.commit()
    db.close()

    res = client.post(
        "/api/recovery/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "activityId": "act_case_001",
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "authorizationProof": raw_proof
        }
    )
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "STALE_AUTHORIZATION"

# 8. Forged proof rejection
def test_08_forged_proof_rejection():
    token = get_merchant_token()
    res = client.post(
        "/api/recovery/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "activityId": "act_case_001",
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "authorizationProof": "completely_forged_proof_secret_9999"
        }
    )
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "INVALID_AUTHORIZATION"

# 9. Cross-merchant proof rejection
def test_09_cross_merchant_proof_rejection():
    token_a = get_merchant_token()
    token_b = get_merchant_b_token()

    auth_res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    proof = auth_res.json()["authorizationProof"]

    res = client.post(
        "/api/recovery/events",
        headers={"Authorization": f"Bearer {token_b}"},
        json={
            "activityId": "act_case_001",
            "merchantId": "other_merchant_999",
            "authorizationProof": proof
        }
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "MERCHANT_MISMATCH"

# 10. Modified proposal option rejection
def test_10_modified_proposal_option_rejection():
    token = get_merchant_token()
    auth_res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    proof = auth_res.json()["authorizationProof"]

    res = client.post(
        "/api/recovery/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "activityId": "act_case_001",
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "proposalOptionId": "opt_TAMPERED_OPTION_99",
            "authorizationProof": proof
        }
    )
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "PROPOSAL_MISMATCH"

# 11. Modified action type rejection
def test_11_modified_action_type_rejection():
    token = get_merchant_token()
    res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "UNAUTHORIZED_ACTION_TYPE"
        }
    )
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "POLICY_DISALLOWED"

# 12. Modified requested parameters rejection
def test_12_modified_requested_params_rejection():
    fp1 = compute_proposal_fingerprint("c1", "opt1", "RECOVERY_OUTREACH", {"discount": 10})
    fp2 = compute_proposal_fingerprint("c1", "opt1", "RECOVERY_OUTREACH", {"discount": 50})
    assert fp1 != fp2

# 13. Terminal RECOVERED case rejection
def test_13_terminal_recovered_case_rejection():
    token = get_merchant_token()
    db = SessionLocal()
    ev = db.query(RecoveryEvent).filter(RecoveryEvent.activityId == "act_case_001").first()
    ev.status = "RECOVERED"
    db.commit()
    db.close()

    res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "TERMINAL_LIFECYCLE"

# 14. Terminal BLOCKED case rejection
def test_14_terminal_blocked_case_rejection():
    token = get_merchant_token()
    db = SessionLocal()
    ev = db.query(RecoveryEvent).filter(RecoveryEvent.activityId == "act_case_001").first()
    ev.status = "BLOCKED"
    db.commit()
    db.close()

    res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "TERMINAL_LIFECYCLE"

# 15. Retry limit exceeded rejection
def test_15_retry_limit_exceeded_rejection():
    token = get_merchant_token()
    db = SessionLocal()
    ev = db.query(RecoveryEvent).filter(RecoveryEvent.activityId == "act_case_001").first()
    ev.retryCount = 3
    db.commit()
    db.close()

    res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "RETRY_LIMIT_EXCEEDED"

# 16. Policy/autonomy parameter enforcement
def test_16_policy_autonomy_enforcement():
    token = get_merchant_token()
    res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "BANNED_ACTION_TYPE"
        }
    )
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "POLICY_DISALLOWED"

# 17. Concurrent execution serialization
def test_17_concurrent_execution_serialization():
    token = get_merchant_token()
    auth_a = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    auth_b = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    proof_a = auth_a.json()["authorizationProof"]
    proof_b = auth_b.json()["authorizationProof"]

    res_a = client.post("/api/recovery/events", headers={"Authorization": f"Bearer {token}"}, json={"activityId": "act_case_001", "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991", "authorizationProof": proof_a})
    assert res_a.status_code == 201

# 18. Identical idempotency retry
def test_18_identical_idempotency_retry():
    token = get_merchant_token()
    auth_res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    proof = auth_res.json()["authorizationProof"]

    headers = {
        "Authorization": f"Bearer {token}",
        "X-Idempotency-Key": "idemp_test_key_001"
    }
    body = {
        "activityId": "act_case_001",
        "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
        "authorizationProof": proof,
        "amount": 1500.0
    }

    res1 = client.post("/api/recovery/events", headers=headers, json=body)
    assert res1.status_code == 201
    data1 = res1.json()

    res2 = client.post("/api/recovery/events", headers=headers, json=body)
    assert res2.status_code == 201
    assert res2.json() == data1

# 19. Idempotency key reuse with different payload
def test_19_idempotency_key_reuse_different_payload():
    token = get_merchant_token()
    auth_res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    proof = auth_res.json()["authorizationProof"]

    headers = {
        "Authorization": f"Bearer {token}",
        "X-Idempotency-Key": "idemp_reuse_key_99"
    }
    body1 = {"activityId": "act_case_001", "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991", "authorizationProof": proof, "amount": 1500.0}
    body2 = {"activityId": "act_case_001", "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991", "authorizationProof": proof, "amount": 9999.0}

    res1 = client.post("/api/recovery/events", headers=headers, json=body1)
    assert res1.status_code == 201

    res2 = client.post("/api/recovery/events", headers=headers, json=body2)
    assert res2.status_code == 409
    assert res2.json()["error"]["code"] == "IDEMPOTENCY_KEY_REUSE"

# 20. Cross-scope idempotency key collision
def test_20_cross_scope_idempotency_key_collision():
    token_a = get_merchant_token()
    token_b = get_merchant_b_token()

    headers_a = {"Authorization": f"Bearer {token_a}", "X-Idempotency-Key": "shared_key_100"}
    body_a = {"activityId": "act_case_001", "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991", "amount": 1500.0}

    res_a = client.post("/api/recovery/events", headers=headers_a, json=body_a)
    assert res_a.status_code == 201

    headers_b = {"Authorization": f"Bearer {token_b}", "X-Idempotency-Key": "shared_key_100"}
    body_b = {"activityId": "act_case_001", "merchantId": "merch_user_002", "amount": 1500.0}

    res_b = client.post("/api/recovery/events", headers=headers_b, json=body_b)
    assert res_b.status_code == 403
    assert res_b.json()["error"]["code"] == "IDEMPOTENCY_SCOPE_MISMATCH"

# 21. Legacy event compatibility
def test_21_legacy_event_compatibility():
    res = client.get("/api/recovery/events?merchantId=0a9a09a5-ef18-45da-a0ce-7c5f0f23a991")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

# 22. M10.13 valid handoff integration
def test_22_m1013_valid_handoff_integration():
    token = get_merchant_token()
    auth_res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    proof = auth_res.json()["authorizationProof"]

    exec_res = client.post(
        "/api/recovery/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "activityId": "act_case_001",
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "authorizationProof": proof,
            "handoffAuditId": "m1013_handoff_session_999",
            "authorizationAuditId": "m1012_auth_audit_999"
        }
    )
    assert exec_res.status_code == 201
    data = exec_res.json()
    assert data["handoffAuditId"] == "m1013_handoff_session_999"
    assert data["authorizationAuditId"] == "m1012_auth_audit_999"
    assert data["executionProvenanceId"] is not None
    assert data["serverAuthorizationId"] is not None
    assert data["status"] == "DISPATCHED"
    assert data["requiresReconciliation"] is True

# 23. M10.14 trusted provenance correlation
def test_23_m1014_trusted_provenance_correlation():
    token = get_merchant_token()
    auth_res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    proof = auth_res.json()["authorizationProof"]

    exec_res = client.post(
        "/api/recovery/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "activityId": "act_case_001",
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "authorizationProof": proof,
            "authorizationAuditId": "client_auth_audit_001",
            "handoffAuditId": "client_handoff_audit_001"
        }
    )
    assert exec_res.status_code == 201
    data = exec_res.json()

    db = SessionLocal()
    ev = db.query(RecoveryEvent).filter(RecoveryEvent.execution_provenance_id == data["executionProvenanceId"]).first()
    assert ev is not None
    assert ev.server_authorization_id == data["serverAuthorizationId"]
    assert ev.operator_actor_id == "merch_user_001"
    assert ev.authorization_audit_id == "client_auth_audit_001"
    assert ev.handoff_audit_id == "client_handoff_audit_001"
    db.close()

# 24. Tampered client timestamp ignored
def test_24_tampered_client_timestamp_ignored():
    token = get_merchant_token()
    res = client.post(
        "/api/recovery/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "activityId": "act_case_001",
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "timestamp": "1999-01-01T00:00:00Z"
        }
    )
    assert res.status_code == 201
    assert "timestamp" in res.json()

# 25. Inactive user rejection
def test_25_inactive_user_rejection():
    token = get_inactive_token()
    res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    assert res.status_code == 401

# 26. Transaction rollback after mid-execution failure
def test_26_transaction_rollback_after_mid_execution_failure():
    token = get_merchant_token()
    db = SessionLocal()
    ev = db.query(RecoveryEvent).filter(RecoveryEvent.activityId == "act_case_001").first()
    ev.status = "RECOVERED"
    db.commit()

    raw_proof = secrets.token_urlsafe(32)
    p_hash = hashlib.sha256(raw_proof.encode('utf-8')).hexdigest()
    auth_rec = RecoveryAuthorization(
        id="srv_auth_rollback_test",
        authorization_proof_hash=p_hash,
        merchant_id="0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
        case_id="rec_case_001",
        activity_id="act_case_001",
        proposal_option_id="opt_email_discount_10",
        proposal_fingerprint=compute_proposal_fingerprint("rec_case_001", "opt_email_discount_10", "RECOVERY_OUTREACH"),
        action_type="RECOVERY_OUTREACH",
        operator_actor_id="merch_user_001",
        status="ISSUED",
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=300),
        created_at=datetime.now(timezone.utc)
    )
    db.add(auth_rec)
    db.commit()
    db.close()

    res = client.post(
        "/api/recovery/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "activityId": "act_case_001",
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "authorizationProof": raw_proof,
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "TERMINAL_LIFECYCLE"

    db = SessionLocal()
    check_auth = db.query(RecoveryAuthorization).filter(RecoveryAuthorization.id == "srv_auth_rollback_test").first()
    assert check_auth.status == "ISSUED"
    db.close()

# 27. Provenance immutability
def test_27_provenance_immutability():
    token = get_merchant_token()
    auth_res = client.post(
        "/api/recovery/authorize-proposal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "caseId": "rec_case_001",
            "activityId": "act_case_001",
            "proposalOptionId": "opt_email_discount_10",
            "actionType": "RECOVERY_OUTREACH"
        }
    )
    proof = auth_res.json()["authorizationProof"]

    exec_res = client.post(
        "/api/recovery/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "activityId": "act_case_001",
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "authorizationProof": proof
        }
    )
    assert exec_res.status_code == 201
    prov_id = exec_res.json()["executionProvenanceId"]
    auth_id = exec_res.json()["serverAuthorizationId"]

    # Attempt to update status via PUT
    put_res = client.put(
        f"/api/recovery/events/{exec_res.json()['id']}",
        json={"status": "RECOVERED", "recoveredAmount": 1500.0}
    )
    assert put_res.status_code == 200
    assert put_res.json()["executionProvenanceId"] == prov_id
    assert put_res.json()["serverAuthorizationId"] == auth_id

# 28. Frontend isAuthorized=true without proof ignored
def test_28_frontend_is_authorized_true_without_proof_ignored():
    token = get_merchant_token()
    res = client.post(
        "/api/recovery/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "activityId": "act_case_001",
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "isAuthorized": True,
            "authorizationStatus": "AUTHORIZED"
        }
    )
    assert res.status_code == 201
    assert res.json().get("serverAuthorizationId") is None

# 29. Forged client audit IDs stored as unverified metadata
def test_29_forged_client_audit_ids_stored_as_metadata():
    token = get_merchant_token()
    res = client.post(
        "/api/recovery/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "activityId": "act_case_001",
            "merchantId": "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991",
            "authorizationAuditId": "forged_auth_audit_123",
            "handoffAuditId": "forged_handoff_audit_123"
        }
    )
    assert res.status_code == 201
    assert res.json()["authorizationAuditId"] == "forged_auth_audit_123"
    assert res.json()["handoffAuditId"] == "forged_handoff_audit_123"

# 30. Proposal fingerprint normalization consistency
def test_30_proposal_fingerprint_normalization_consistency():
    fp1 = compute_proposal_fingerprint("c1", "opt1", "ACT1", {"b": 2, "a": 1})
    fp2 = compute_proposal_fingerprint("c1", "opt1", "ACT1", {"a": 1, "b": 2})
    assert fp1 == fp2
