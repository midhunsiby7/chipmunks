from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.analytics import AnalyticsDashboardResponse
from app.services.analytics_service import analytics_service

router = APIRouter()


@router.get("/dashboard", response_model=AnalyticsDashboardResponse, summary="Get Executive Dashboard Analytics")
async def get_dashboard_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> AnalyticsDashboardResponse:
    return await analytics_service.get_dashboard_metrics(db=db, current_user=current_user)
