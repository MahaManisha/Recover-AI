from fastapi import APIRouter, Depends
from app.models.user import User
from app.services.rbac import require_customer

router = APIRouter()

@router.get("/access")
async def customer_access(current_user: User = Depends(require_customer)):
    """
    Verification endpoint for CUSTOMER role access.
    """
    return {
        "message": "Customer access granted",
        "user_id": current_user.id,
        "role": current_user.role
    }
