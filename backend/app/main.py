"""FastAPI application factory and entrypoint."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings, validate_security
from app.core.limiter import limiter
from app.core.logging import configure_logging, get_logger
from app.db.session import run_migrations
from app.api.routers import (
    admin,
    analytics,
    attendance,
    auth,
    face,
    users,
)

configure_logging()
logger = get_logger("smart_attendance")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail fast on insecure production configuration.
    validate_security(settings)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.DATASET_DIR, exist_ok=True)
    run_migrations()
    logger.info(f"{settings.PROJECT_NAME} v{settings.API_VERSION} started")
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.API_VERSION,
        lifespan=lifespan,
    )

    # Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Total-Count"],
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()"
        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    @app.get("/", tags=["health"])
    async def root():
        return {"message": f"{settings.PROJECT_NAME} API", "version": settings.API_VERSION}

    @app.get("/health", tags=["health"])
    async def health():
        return {"status": "ok"}

    for router in (auth.router, face.router, attendance.router, users.router, admin.router, analytics.router):
        app.include_router(router)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)
