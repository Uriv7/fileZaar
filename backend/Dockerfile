# ═══════════════════════════════════════════════════════════
#  FileZaar Backend — Zero Storage Dockerfile
#  Files processed in RAM only. No disk writes. No data stored.
#  Compatible with Debian Trixie (python:3.11-slim 2025+)
# ═══════════════════════════════════════════════════════════

# ── Stage 1: build Python wheels ─────────────────────────
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libffi-dev libssl-dev \
    libcairo2-dev libpango1.0-dev \
    libgdk-pixbuf-xlib-2.0-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# ── Stage 2: slim runtime ─────────────────────────────────
FROM python:3.11-slim AS runtime

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    LOG_DIR=/tmp/logs \
    # Zero storage: files processed in /dev/shm (RAM) then deleted
    TMPDIR=/tmp

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    pandoc \
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 \
    libgdk-pixbuf-xlib-2.0-0 \
    libffi8 libssl3 \
    fonts-liberation fonts-dejavu-core \
    unar \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -r filezaar && \
    useradd -r -g filezaar -d /app -s /sbin/nologin filezaar

WORKDIR /app

COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels /wheels/* && \
    rm -rf /wheels

COPY --chown=filezaar:filezaar . .

# Only need /tmp/logs — no uploads/ or outputs/ dirs needed (zero storage)
RUN mkdir -p /tmp/logs && chown -R filezaar:filezaar /tmp/logs

USER filezaar

EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:$PORT/api/health || exit 1

# Single worker (no --workers flag) — avoids multiprocess semaphore conflicts
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT --loop uvloop --http httptools --no-access-log"]
