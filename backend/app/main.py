import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.api.v1.endpoints.health import check_health
from app.api.v1.router import api_router
from app.core.config import settings
from app.services.billing_scheduler import billing_scheduler
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events management for startup and shutdown."""
    # Startup: Launch automated recurring billing background scheduler if enabled
    if settings.APP_ENV != "testing" and settings.BILLING_SCHEDULER_ENABLED:
        billing_scheduler.start()
    yield
    # Shutdown: Cleanly stop background scheduler and terminate tasks
    if settings.BILLING_SCHEDULER_ENABLED:
        await billing_scheduler.stop()


app = FastAPI(
    title=settings.APP_NAME,
    version=__version__,
    description="Brightloop Subscription Management System API - Modular Monolithic Architecture",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


@app.middleware("http")
async def cors_exception_handling_middleware(request: Request, call_next):
    """
    Ensure all unhandled exceptions return a standardized 500 JSON response
    with explicit CORS headers for permitted origins. Prevents Starlette ServerErrorMiddleware
    from emitting bare text/plain 500 responses lacking Access-Control-Allow-Origin, which
    causes browsers to misreport backend errors as CORS failures.
    """
    try:
        return await call_next(request)
    except Exception as exc:
        # In testing environment, allow pytest assertions like pytest.raises(IntegrityError) to bubble
        if settings.APP_ENV == "testing" and isinstance(exc, IntegrityError):
            raise exc

        logger.exception("Unhandled backend exception on %s %s: %s", request.method, request.url.path, exc)
        origin = request.headers.get("origin")
        allowed_origins = settings.BACKEND_CORS_ORIGINS
        if isinstance(allowed_origins, str):
            allowed_origins = [allowed_origins]

        response = JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error." if not settings.DEBUG else f"Internal server error: {exc}"
            },
        )
        if origin and (origin in allowed_origins or "*" in allowed_origins):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT"
            response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, Origin, X-Requested-With"

        return response


@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    """Fallback exception handler ensuring CORS headers on any unhandled exception."""
    logger.exception("Global exception handler caught: %s", exc)
    origin = request.headers.get("origin")
    allowed_origins = settings.BACKEND_CORS_ORIGINS
    if isinstance(allowed_origins, str):
        allowed_origins = [allowed_origins]

    response = JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error." if not settings.DEBUG else f"Internal server error: {exc}"
        },
    )
    if origin and (origin in allowed_origins or "*" in allowed_origins):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT"
        response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, Origin, X-Requested-With"

    return response


# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Root alias and top-level health endpoint
@app.get("/", tags=["Root"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": __version__,
        "environment": settings.APP_ENV,
        "docs": "/docs",
        "api_v1": settings.API_V1_PREFIX,
        "health": "/health",
    }


@app.get("/health", tags=["Root"])
async def top_level_health():
    """Top-level health check endpoint redirecting to the standard health check."""
    return await check_health()
