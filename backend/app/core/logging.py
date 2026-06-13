"""Logging configuration."""

import logging

from app.core.config import settings

# Third-party loggers that are far too chatty at DEBUG level.
_NOISY_LOGGERS = (
    "multipart",
    "multipart.multipart",
    "python_multipart",
    "watchfiles",
    "watchfiles.main",
)


def configure_logging() -> None:
    level = logging.DEBUG if settings.DEBUG else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    )
    # Keep our own logs at the chosen level but silence noisy libraries.
    for name in _NOISY_LOGGERS:
        logging.getLogger(name).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)

