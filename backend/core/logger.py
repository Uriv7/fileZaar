"""
core/logger.py — Structured logging for FileZaar.
Uses stdout only on production (Render captures stdout automatically).
Falls back to /tmp/logs if file logging is needed — always writable.
"""

import logging
import os
import sys
from pathlib import Path

_fmt    = "%(asctime)s [%(levelname)s] %(name)s — %(message)s"
_datefmt = "%Y-%m-%d %H:%M:%S"

# Build handlers — stdout always, file only if writable
_handlers = [logging.StreamHandler(sys.stdout)]

# Try to write logs to /tmp/logs (always writable, even as non-root)
try:
    LOG_DIR = Path(os.environ.get("LOG_DIR", "/tmp/logs"))
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    _handlers.append(
        logging.FileHandler(LOG_DIR / "converter.log", encoding="utf-8")
    )
except Exception:
    pass  # File logging unavailable — stdout only (fine for Render/Docker)

logging.basicConfig(
    level=logging.INFO,
    format=_fmt,
    datefmt=_datefmt,
    handlers=_handlers,
)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
