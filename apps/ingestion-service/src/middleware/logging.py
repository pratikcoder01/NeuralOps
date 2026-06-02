import time
import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.concurrency import iterate_in_threadpool

# Initialize structlog configurations
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger()

class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that intercepts HTTP requests, captures tenant context, 
    calculates response time, and outputs structured JSON logs.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        
        # Extracted on endpoints (or parsed here if token is available)
        workspace_id = request.headers.get("X-Workspace-ID", "anonymous")
        
        try:
            response = await call_next(request)
            duration = (time.time() - start_time) * 1000
            
            logger.info(
                "http_request",
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                duration_ms=round(duration, 2),
                workspace_id=workspace_id,
                ip_address=request.client.host if request.client else "unknown"
            )
            return response
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(
                "http_request_failed",
                method=request.method,
                path=request.url.path,
                exception=str(e),
                duration_ms=round(duration, 2),
                workspace_id=workspace_id,
                ip_address=request.client.host if request.client else "unknown"
            )
            raise
