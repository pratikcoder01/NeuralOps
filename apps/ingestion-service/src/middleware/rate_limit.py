import time
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from src.db.redis import get_redis_client
from src.config import settings

class SlidingWindowRateLimiter(BaseHTTPMiddleware):
    """
    Redis-backed sliding-window rate limiter.
    Limits:
      - 1000 req/min for `/api/v1/metrics/ingest` per workspace.
      - 100 req/min for other endpoints per workspace.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        # 1. Resolve workspace context
        # Check standard headers or resolve anonymized
        workspace_id = request.headers.get("X-Workspace-ID")
        
        # If no workspace header is present, fall back to client IP to prevent unauthenticated abuse
        rate_key_prefix = f"rate_limit:{workspace_id}" if workspace_id else f"rate_limit_ip:{request.client.host if request.client else 'unknown'}"
        
        # 2. Match rate limiting thresholds based on path
        is_metrics_path = "/metrics/ingest" in request.url.path
        limit = settings.RATE_LIMIT_METRICS_PER_MIN if is_metrics_path else settings.RATE_LIMIT_STANDARD_PER_MIN
        endpoint_type = "metrics" if is_metrics_path else "standard"
        
        redis_client = get_redis_client()
        if redis_client is None:
            # Redis offline: bypass rate limiter to maintain high availability
            return await call_next(request)
            
        current_time = time.time()
        window_size = 60 # 60 seconds
        
        key = f"{rate_key_prefix}:{endpoint_type}"
        
        try:
            # Multi-transaction script to clean, add, and query atomic sliding window
            pipe = redis_client.pipeline()
            # Clean old records
            pipe.zremrangebyscore(key, 0, current_time - window_size)
            # Add current hit
            pipe.zadd(key, {str(current_time): current_time})
            # Query card
            pipe.zcard(key)
            # Set expiry to reclaim space
            pipe.expire(key, window_size + 10)
            
            results = await pipe.execute()
            current_hits = results[2]
            
            if current_hits > limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": "Too Many Requests",
                        "message": f"Rate limit of {limit} requests per minute exceeded.",
                        "limit": limit,
                        "retry_after_seconds": int(window_size - (current_time % window_size))
                    }
                )
                
        except HTTPException:
            # Re-raise standard rate limit exceptions
            raise
        except Exception:
            # Catch Redis connectivity errors to maintain high availability
            pass

        return await call_next(request)
