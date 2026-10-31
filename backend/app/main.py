from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.api.v1.endpoints.health import check_health
from app.api.v1.router import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events management for startup and shutdown."""
    # Startup: Database connection pool verification or warming can be placed here
    yield
    # Shutdown: Cleanly close pools and background tasks


app = FastAPI(
    title=settings.APP_NAME,
    version=__version__,
    description="Brightloop Subscription Management System API - Modular Monolithic Architecture",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

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
