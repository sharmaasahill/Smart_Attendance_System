"""Logging configuration."""

import logging

from app.core.config import settings


def configure_logging() -> None:
    level = logging.DEBUG if settings.DEBUG else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
