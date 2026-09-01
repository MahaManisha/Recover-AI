from fastapi import APIRouter
from app.api.routes import health, auth, customer, merchant, products

api_router = APIRouter()

# Active sub-routers
api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(customer.router, prefix="/customer", tags=["Customer Verification"])
api_router.include_router(merchant.router, prefix="/merchant", tags=["Merchant Management"])
api_router.include_router(products.router, prefix="/products", tags=["Product Catalog"])

# Structural Placeholders for Future Milestone Routers:
# api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
# api_router.include_router(recovery.router, prefix="/recovery", tags=["Recovery"])
# api_router.include_router(agent.router, prefix="/agent", tags=["Agent"])
# api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
