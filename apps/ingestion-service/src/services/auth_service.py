import logging
import uuid
import time
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.workspace import Workspace
from src.models.user import User
from src.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from src.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from src.core.exceptions import InvalidCredentials, TokenInvalid
from src.core.rbac import UserRole
from src.db.redis import get_redis_client

logger = logging.getLogger(__name__)

class AuthService:
    @staticmethod
    async def register_workspace(db: AsyncSession, request: RegisterRequest) -> TokenResponse:
        """
        Creates a new tenant workspace and registers the owner user in a transaction block.
        """
        logger.info(f"Initiating workspace registration for: {request.workspace_name}")
        
        # 1. Create Workspace
        slug = request.workspace_name.lower().replace(" ", "-").replace("_", "-")
        # Ensure uniqueness of slug or generate unique suffix
        slug_check = await db.execute(select(Workspace).where(Workspace.slug == slug))
        if slug_check.scalar_one_or_none():
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"

        new_workspace = Workspace(
            name=request.workspace_name,
            slug=slug,
            plan="free",
            host_limit=10
        )
        db.add(new_workspace)
        await db.flush() # Flushes to database to acquire Workspace ID
        
        # 2. Check if user already exists
        user_check = await db.execute(select(User).where(User.email == request.email))
        if user_check.scalar_one_or_none():
            raise InvalidCredentials("User email already registered")

        # 3. Create Owner User
        hashed = hash_password(request.password)
        new_user = User(
            workspace_id=new_workspace.id,
            email=request.email,
            name=request.name,
            role=UserRole.OWNER,
            password_hash=hashed
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        logger.info(f"Workspace registered successfully. ID: {new_workspace.id}")
        
        # 4. Mint tokens
        token_data = {
            "sub": str(new_user.id),
            "workspace_id": str(new_workspace.id),
            "role": new_user.role
        }
        
        return TokenResponse(
            access_token=create_access_token(token_data),
            workspace_id=new_workspace.id,
            role=new_user.role,
            user_id=new_user.id
        )

    @staticmethod
    async def login_user(db: AsyncSession, request: LoginRequest) -> TokenResponse:
        """Verifies email/password credentials and issues fresh access+refresh tokens."""
        logger.info(f"Authenticating user login: {request.email}")
        
        result = await db.execute(select(User).where(User.email == request.email))
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(request.password, user.password_hash):
            raise InvalidCredentials()

        # Update last login time
        user.last_login_at = datetime.now(timezone.utc) if 'timezone' in globals() else None
        await db.commit()

        token_data = {
            "sub": str(user.id),
            "workspace_id": str(user.workspace_id),
            "role": user.role
        }

        return TokenResponse(
            access_token=create_access_token(token_data),
            workspace_id=user.workspace_id,
            role=user.role,
            user_id=user.id
        )

    @staticmethod
    async def rotate_tokens(token: str) -> TokenResponse:
        """Decodes refresh tokens and issues fresh access/refresh sequences."""
        try:
            payload = decode_token(token, is_refresh=True)
        except Exception:
            raise TokenInvalid("Invalid or expired refresh token")

        # Re-mint tokens
        token_data = {
            "sub": payload["sub"],
            "workspace_id": payload["workspace_id"],
            "role": payload["role"]
        }

        return TokenResponse(
            access_token=create_access_token(token_data),
            workspace_id=uuid.UUID(payload["workspace_id"]),
            role=payload["role"],
            user_id=uuid.UUID(payload["sub"])
        )

    @staticmethod
    async def blacklist_token(token: str):
        """Blacklists a JWT access token in Redis on logout."""
        redis_client = get_redis_client()
        if redis_client:
            try:
                payload = decode_token(token)
                exp = payload.get("exp")
                if exp:
                    ttl = int(exp - time.time()) if 'time' in globals() else 900
                    if ttl > 0:
                        await redis_client.setex(f"blacklist:{token}", ttl, "1")
            except Exception:
                pass
