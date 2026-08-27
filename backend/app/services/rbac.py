from fastapi import Depends, HTTPException, status
from app.models.user import User
from app.services.auth import get_current_user

def require_role(required_role: str):
    """
    Factory function producing FastAPI dependencies that enforce backend role authorization.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive."
            )
            
        if current_user.role.upper() != required_role.upper():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires {required_role.upper()} role."
            )
            
        return current_user

    return role_checker

# Reusable Role Dependencies
require_customer = require_role("CUSTOMER")
require_merchant = require_role("MERCHANT")
