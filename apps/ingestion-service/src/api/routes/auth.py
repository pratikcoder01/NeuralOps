import logging
from datetime import timedelta
from fastapi import APIRouter, Depends, Response, Cookie, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.postgres import get_async_db
from src.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from src.services.auth_service import AuthService
from src.dependencies import get_current_user_claims
from src.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, response: Response, db: AsyncSession = Depends(get_async_db)):
    """Registers a new workspace and an owner user, returning credentials and httpOnly refresh tokens."""
    token_resp = await AuthService.register_workspace(db, request)
    
    # Issue Refresh Token in secure cookie
    refresh_token = create_refresh_token_cookie(token_resp, response)
    return token_resp

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, response: Response, db: AsyncSession = Depends(get_async_db)):
    """Logs in an existing user and rotates active HTTP credentials."""
    token_resp = await AuthService.login_user(db, request)
    create_refresh_token_cookie(token_resp, response)
    return token_resp

@router.post("/refresh", response_model=TokenResponse)
async def refresh(response: Response, refresh_token: str | None = Cookie(None)):
    """Rotates JWT access and refresh tokens dynamically using httpOnly cookies."""
    if not refresh_token:
        return TokenResponse(access_token="", token_type="bearer", workspace_id="", role="")
        
    token_resp = await AuthService.rotate_tokens(refresh_token)
    create_refresh_token_cookie(token_resp, response)
    return token_resp

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response, claims: dict = Depends(get_current_user_claims)):
    """Invalidates active user sessions and blacklists JWTs in Redis caches."""
    await AuthService.blacklist_token(claims["token"])
    response.delete_cookie(key="refresh_token")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

def create_refresh_token_cookie(token_resp: TokenResponse, response: Response) -> str:
    # Resolve token data payload helper inside security
    from src.core.security import create_refresh_token
    token_data = {
        "sub": str(token_resp.user_id),
        "workspace_id": str(token_resp.workspace_id),
        "role": token_resp.role
    }
    refresh_token = create_refresh_token(token_data)
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        secure=True,
        samesite="lax"
    )
    return refresh_token
