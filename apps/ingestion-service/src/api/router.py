from fastapi import APIRouter
from src.api.routes import auth, workspaces, users, hosts, metrics, incidents, analytics

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(hosts.router, prefix="/hosts", tags=["Hosts"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["Metrics"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
