from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter()

class HealthCheckResponse(BaseModel):
    status: str = "ok"
    service: str = "recoverai-backend"

@router.get("/health", response_model=HealthCheckResponse, tags=["Health"])
async def get_health(db: Session = Depends(get_db)):
    """
    Health check endpoint returning system status after verifying database connectivity.
    """
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(status_code=503, detail="Database connection error")
    return HealthCheckResponse(
        status="ok",
        service="recoverai-backend"
    )

