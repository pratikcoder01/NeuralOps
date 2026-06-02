from enum import Enum
from typing import List
from fastapi import HTTPException, status

class UserRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    SRE = "sre"
    READONLY = "readonly"

# Precedence levels for RBAC (higher values mean more permissions)
ROLE_PRECEDENCE = {
    UserRole.READONLY: 1,
    UserRole.SRE: 2,
    UserRole.ADMIN: 3,
    UserRole.OWNER: 4
}

def check_minimum_role(user_role: str, required_role: UserRole) -> bool:
    """Checks if a user's role satisfies the required minimum role."""
    try:
        current_enum = UserRole(user_role)
    except ValueError:
        return False
        
    return ROLE_PRECEDENCE.get(current_enum, 0) >= ROLE_PRECEDENCE[required_role]

def require_role(required_role: UserRole):
    """
    Decorator helper for routes (optional, as we can also enforce it 
    elegantly via FastAPI dependencies which is the standard FastAPI way).
    """
    def dependency(user: dict):
        if not check_minimum_role(user.get("role"), required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: requires minimum role '{required_role.value}'"
            )
        return user
    return dependency
