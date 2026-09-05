from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings
from app.core.errors import register_error_handlers
from app.core.database import engine, Base

# Import models to ensure they are registered with SQLAlchemy metadata
import app.models.user
import app.models.product
import app.models.recovery
import app.models.merchant_autonomy
import app.models.authorization

from app.core.db_migration import run_migrations

# Create database tables and perform dynamic migrations automatically
run_migrations()

app = FastAPI(
    title=settings.APP_NAME,
    description="Autonomous Revenue Recovery Agent API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Centralized CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Centralized Error Handlers
register_error_handlers(app)

# Include Central API Router
app.include_router(api_router, prefix=settings.API_PREFIX)

@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "environment": settings.ENVIRONMENT,
        "health_check": f"{settings.API_PREFIX}/health",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
