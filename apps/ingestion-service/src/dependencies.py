import logging
import uuid
import jwt
from typing import Dict, Any, Optional
from fastapi import Depends, Header, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.postgres import get_async_db
from src.db.redis import get_redis_client
from src.core.security import decode_token
from src.core.rbac import check_minimum_role, UserRole
from src.services.audit_service import AuditService

logger = logging.getLogger(__name__)

security_bearer = HTTPBearer(auto_error=False)

async def get_current_user_claims(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
) -> Dict[str, Any]:
    """
    Decodes the JWT bearer token to extract user claims: user_id, workspace_id, role.
    Verifies that the token has not been blacklisted in Redis.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization credentials"
        )
        
    token = credentials.credentials
    
    # Check blacklist
    redis_client = get_redis_client()
    if redis_client:
        try:
            is_blacklisted = await redis_client.get(f"blacklist:{token}")
            if is_blacklisted:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token blacklisted"
                )
        except Exception as e:
            # Fallback if Redis fails
            pass
            
    try:
        payload = decode_token(token)
        return {
            "user_id": uuid.UUID(payload["sub"]),
            "workspace_id": uuid.UUID(payload["workspace_id"]),
            "role": payload["role"],
            "token": token
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature or malformed token"
        )

class RoleEnforcer:
    """FastAPI dependency that enforces a minimum user role for requests."""
    def __init__(self, required_role: UserRole):
        self.required_role = required_role

    def __call__(self, claims: Dict[str, Any] = Depends(get_current_user_claims)) -> Dict[str, Any]:
        if not check_minimum_role(claims["role"], self.required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: requires minimum role '{self.required_role.value}'"
            )
        return claims

def require_workspace():
    """Extracts valid workspace ID context from claims."""
    def dependency(claims: Dict[str, Any] = Depends(get_current_user_claims)) -> uuid.UUID:
        return claims["workspace_id"]
    return dependency

class AuditLogHook:
    """FastAPI endpoint utility dependency to log database mutations automatically."""
    def __init__(self, action: str, resource: str):
        self.action = action
        self.resource = resource

    async def log(
        self,
        request: Request,
        db: AsyncSession = Depends(get_async_db),
        claims: Dict[str, Any] = Depends(get_current_user_claims)
    ):
        ip_addr = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Read payload body safely or path variables
        payload = {
            "query_params": dict(request.query_params),
            "path_params": dict(request.path_params)
        }
        
        # Write to database audit tables asynchronously
        await AuditService.log_action(
            db=db,
            workspace_id=claims["workspace_id"],
            user_id=claims["user_id"],
            action=self.action,
            resource=self.resource,
            payload=payload,
            ip_address=ip_addr,
            user_agent=user_agent
        )
