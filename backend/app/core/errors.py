import logging
from fastapi import FastAPI, Request
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import HTTPException as FastAPIHTTPException
from fastapi.responses import JSONResponse
from typing import Any, Dict, Optional

logger = logging.getLogger("recoverai.errors")

class RecoverAIException(Exception):
    """Base exception class for RecoverAI application errors."""
    def __init__(
        self, 
        message: str, 
        code: str = "BAD_REQUEST", 
        status_code: int = 400, 
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}

def register_error_handlers(app: FastAPI) -> None:
    """
    Registers centralized, production-safe exception handlers on FastAPI instance.
    """
    @app.exception_handler(RecoverAIException)
    async def recoverai_exception_handler(request: Request, exc: RecoverAIException):
        logger.warning(f"RecoverAIException on {request.url.path}: [{exc.code}] {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                }
            }
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        code_mapping = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            422: "UNPROCESSABLE_ENTITY",
        }
        code = code_mapping.get(exc.status_code, "HTTP_ERROR")
        logger.warning(f"HTTPException on {request.url.path}: {exc.status_code} - {exc.detail}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": code,
                    "message": exc.detail if isinstance(exc.detail, str) else "Request error occurred."
                }
            }
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled server error on {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred."
                }
            }
        )
