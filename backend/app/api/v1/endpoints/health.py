from datetime import datetime, timezone
from fastapi import APIRouter

from app import __version__
from app.core.config import settings
from app.schemas.common import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System Health & Diagnostic Check",
    description="Returns backend status, version, and running environment metadata."
)
async def check_health() -> HealthResponse:
    """Check API server health."""
    return HealthResponse(
        status="healthy",
        app_name=settings.APP_NAME,
        version=__version__,
        environment=settings.APP_ENV,
        timestamp=datetime.now(timezone.utc),
    )
