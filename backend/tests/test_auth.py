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

def test_register_customer():
    response = client.post("/api/auth/register", json={
        "full_name": "Test Customer",
        "email": "customer@example.com",
        "password": "Password123!",
        "role": "CUSTOMER"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "customer@example.com"
    assert data["role"] == "CUSTOMER"
    assert "password" not in data
    assert "password_hash" not in data

    # Verify in DB that password is hashed
    db = SessionLocal()
    user = db.query(User).filter(User.email == "customer@example.com").first()
    assert user is not None
    assert user.password_hash != "Password123!"
    assert user.password_hash.startswith("$2")
    db.close()

def test_register_merchant():
    response = client.post("/api/auth/register", json={
        "full_name": "Test Merchant",
        "email": "merchant@example.com",
        "password": "MerchantPass123!",
        "role": "MERCHANT"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "MERCHANT"

def test_duplicate_registration_rejected():
    payload = {
        "full_name": "Duplicate User",
        "email": "unique@example.com",
        "password": "Password123!",
        "role": "CUSTOMER"
    }
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 400
    data = res2.json()
    assert "error" in data
    assert data["error"]["code"] == "DUPLICATE_EMAIL"

def test_agent_role_registration_rejected():
    response = client.post("/api/auth/register", json={
        "full_name": "Agent User",
        "email": "agent@example.com",
        "password": "Password123!",
        "role": "AGENT"
    })
    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "PROHIBITED_ROLE"

def test_login_valid_credentials():
    # First register
    client.post("/api/auth/register", json={
        "full_name": "Login User",
        "email": "login@example.com",
        "password": "SecretPassword123!",
        "role": "CUSTOMER"
    })

    # Login
    response = client.post("/api/auth/login", json={
        "email": "login@example.com",
        "password": "SecretPassword123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "login@example.com"
    assert "password_hash" not in data["user"]

def test_login_invalid_credentials():
    client.post("/api/auth/register", json={
        "full_name": "Login User",
        "email": "login2@example.com",
        "password": "SecretPassword123!",
        "role": "CUSTOMER"
    })

    response = client.post("/api/auth/login", json={
        "email": "login2@example.com",
        "password": "WrongPassword!"
    })
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INVALID_CREDENTIALS"

def test_get_current_user_me():
    # Register & Login
    client.post("/api/auth/register", json={
        "full_name": "Me User",
        "email": "me@example.com",
        "password": "Password123!",
        "role": "CUSTOMER"
    })

    login_res = client.post("/api/auth/login", json={
        "email": "me@example.com",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]

    # Call /api/auth/me with Bearer token
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    user_data = res.json()
    assert user_data["email"] == "me@example.com"
    assert user_data["full_name"] == "Me User"

def test_get_current_user_me_missing_or_invalid_token():
    res_no_token = client.get("/api/auth/me")
    assert res_no_token.status_code == 401

    res_invalid_token = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert res_invalid_token.status_code == 401
