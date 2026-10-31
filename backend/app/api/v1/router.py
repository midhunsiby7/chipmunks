from fastapi import APIRouter

from app.api.v1.endpoints import health, users

api_router = APIRouter()

# Core operational routes
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
