from fastapi import HTTPException, status

class NeuralOpsException(HTTPException):
    """Base exception class for all NeuralOps domain exceptions."""
    def __init__(self, status_code: int, detail: str, headers: dict = None):
        super().__init__(status_code=status_code, detail=detail, headers=headers)

class WorkspaceLimitExceeded(NeuralOpsException):
    def __init__(self, detail: str = "Workspace host registration limit exceeded"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

class InsufficientPermissions(NeuralOpsException):
    def __init__(self, detail: str = "Forbidden: Insufficient role permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )

class InvalidCredentials(NeuralOpsException):
    def __init__(self, detail: str = "Invalid email or password"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )

class TokenExpired(NeuralOpsException):
    def __init__(self, detail: str = "Token has expired"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail
        )

class TokenInvalid(NeuralOpsException):
    def __init__(self, detail: str = "Token is invalid or corrupted"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail
        )

class HostDeactivated(NeuralOpsException):
    def __init__(self, detail: str = "Host is deactivated or deregistered"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )
