from fastapi import APIRouter, Depends
from app.models.user import User
from app.services.rbac import require_merchant

router = APIRouter()

@router.get("/access")
async def merchant_access(current_user: User = Depends(require_merchant)):
    """
    Verification endpoint for MERCHANT role access.
    """
    return {
        "message": "Merchant access granted",
        "user_id": current_user.id,
        "role": current_user.role
    }
