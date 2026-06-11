FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install stable system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    pandoc \
    unar \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    libssl-dev \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Create required folders
RUN mkdir -p tmp/uploads tmp/outputs

# Render uses port 10000 by default (overridable via env var)
ENV PORT=10000

# Start app (change if needed)
CMD ["python3", "main.py"]