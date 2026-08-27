import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, engine, Base
from app.models.user import User

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def get_tokens():
    # Register Customer
    res_c = client.post("/api/auth/register", json={
        "full_name": "Customer User",
        "email": "customer@example.com",
        "password": "Password123!",
        "role": "CUSTOMER"
    })
    assert res_c.status_code == 201

    login_c = client.post("/api/auth/login", json={
        "email": "customer@example.com",
        "password": "Password123!"
    })
    customer_token = login_c.json()["access_token"]

    # Register Merchant
    res_m = client.post("/api/auth/register", json={
        "full_name": "Merchant User",
        "email": "merchant@example.com",
        "password": "Password123!",
        "role": "MERCHANT"
    })
    assert res_m.status_code == 201

    login_m = client.post("/api/auth/login", json={
        "email": "merchant@example.com",
        "password": "Password123!"
    })
    merchant_token = login_m.json()["access_token"]

    return customer_token, merchant_token

def test_customer_access_by_customer(setup_db):
    c_token, _ = get_tokens()
    res = client.get("/api/customer/access", headers={"Authorization": f"Bearer {c_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["message"] == "Customer access granted"
    assert data["role"] == "CUSTOMER"

def test_customer_access_by_merchant_forbidden(setup_db):
    _, m_token = get_tokens()
    res = client.get("/api/customer/access", headers={"Authorization": f"Bearer {m_token}"})
    assert res.status_code == 403
    data = res.json()
    assert "error" in data or "detail" in data

def test_merchant_access_by_merchant(setup_db):
    _, m_token = get_tokens()
    res = client.get("/api/merchant/access", headers={"Authorization": f"Bearer {m_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["message"] == "Merchant access granted"
    assert data["role"] == "MERCHANT"

def test_merchant_access_by_customer_forbidden(setup_db):
    c_token, _ = get_tokens()
    res = client.get("/api/merchant/access", headers={"Authorization": f"Bearer {c_token}"})
    assert res.status_code == 403

def test_access_no_token(setup_db):
    res_c = client.get("/api/customer/access")
    assert res_c.status_code == 401

    res_m = client.get("/api/merchant/access")
    assert res_m.status_code == 401

def test_access_invalid_token(setup_db):
    res_c = client.get("/api/customer/access", headers={"Authorization": "Bearer invalid.token.value"})
    assert res_c.status_code == 401

def test_inactive_user_rejected(setup_db):
    c_token, _ = get_tokens()

    # Deactivate customer in DB
    db = SessionLocal()
    user = db.query(User).filter(User.email == "customer@example.com").first()
    user.is_active = False
    db.commit()
    db.close()

    res = client.get("/api/customer/access", headers={"Authorization": f"Bearer {c_token}"})
    assert res.status_code == 401
