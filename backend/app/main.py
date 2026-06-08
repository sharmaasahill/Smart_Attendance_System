"""FastAPI application factory and entrypoint."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.db.session import init_db
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
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.DATASET_DIR, exist_ok=True)
    init_db()
    logger.info(f"{settings.PROJECT_NAME} v{settings.API_VERSION} started")
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.API_VERSION,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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
