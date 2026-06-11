# FileZaar — Production Readiness Guide

## Current State: NOT production-ready out of the box
### What's missing and how to fix it — step by step.

---

## 1. What Works Right Now (Dev-Ready)
- ✅ All 256 conversion paths work correctly
- ✅ WebSocket progress updates
- ✅ Auto-cleanup of expired files
- ✅ Concurrent job semaphore (max 4)
- ✅ File size check before reading into memory
- ✅ Friendly error messages for unsupported formats
- ✅ CORS configured for Cloudflare Pages

## 2. What's Missing for Production

| Gap | Impact | Fix |
|-----|--------|-----|
| No HTTPS/TLS | Security | Cloudflare proxy or nginx+certbot |
| Single process, no workers | Concurrency | uvicorn --workers or gunicorn |
| No rate limiting | Abuse/DoS | nginx rate zones (included) |
| No auth on /outputs | Anyone can download any job | Add job token to download URL |
| Secrets in code | Security risk | Move to environment variables |
| No error monitoring | Silent failures | Add Sentry |
| No persistent storage | Files lost on restart | Mount a volume or use S3 |
| No CDN for frontend | Slow global load | Cloudflare Pages (already used) |

---

## 3. Deployment: Current Stack (Render.com + Cloudflare Pages)

### Backend → Render.com
```bash
# 1. Push to GitHub
git init && git add . && git commit -m "FileZaar v4"
git remote add origin https://github.com/yourname/filezaar.git
git push -u origin main

# 2. Go to render.com → New → Web Service → Connect repo
#    Runtime: Docker
#    Dockerfile path: backend/Dockerfile
#    Plan: Starter ($7/mo) — Free tier sleeps after 15 min inactivity

# 3. Set environment variables in Render dashboard:
#    PORT=8000
#    CORS_ORIGINS=https://filezaar.pages.dev
```

### Frontend → Cloudflare Pages
```bash
cd frontend
# In Cloudflare Pages dashboard:
# Build command: npm run build
# Build output: dist
# Environment variable: VITE_API_URL=https://filezaar-api.onrender.com
```

---

## 4. Capacity: Current Setup

### Single Render Starter instance ($7/mo, 512MB RAM, 0.5 CPU):
- **Concurrent conversions**: 4 (semaphore)
- **WebSocket connections**: ~200 (FastAPI async)
- **HTTP requests/sec**: ~50
- **Concurrent active users**: **~50–150**
  - Most users are idle (waiting for WS events)
  - Bottleneck: CPU during conversion (FFmpeg, Pandoc)
  - A single PDF→DOCX conversion uses 100% of 0.5 vCPU for ~3s

### Render Standard ($25/mo, 2GB RAM, 1 CPU):
- **Concurrent conversions**: 6–8
- **Concurrent active users**: **~300–500**

---

## 5. Scaling to 100K Concurrent Users

### What "100K concurrent" actually means for FileZaar:
- 100K users have the browser open
- ~5% are actively converting at any moment = **5,000 active jobs**
- Each job takes 2–30s of CPU
- You need ~500–2,000 vCPUs depending on job mix

### Architecture Required:

```
                    ┌─────────────────────────────┐
                    │   Cloudflare CDN + WAF       │
                    │   (frontend static files)    │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │   Cloudflare Workers /        │
                    │   AWS API Gateway             │
                    │   (rate limiting, auth)       │
                    └──────┬──────────┬────────────┘
                           │          │
              ┌────────────▼─┐   ┌────▼───────────┐
              │  WebSocket   │   │  REST API       │
              │  (progress)  │   │  (job submit)   │
              │  Redis Pub/  │   │  10 API pods    │
              │  Sub         │   │  k8s autoscale  │
              └──────────────┘   └────────┬────────┘
                                          │
                           ┌──────────────▼────────────────┐
                           │        Job Queue               │
                           │   Redis / AWS SQS / RabbitMQ  │
                           │   (decouple submit from work)  │
                           └──────────────┬────────────────┘
                                          │
          ┌───────────────────────────────▼───────────────────────────┐
          │                   Worker Pool                              │
          │   Image workers  │ Doc workers  │ Media workers  │ Archive │
          │   (Pillow/AVIF)  │ (Pandoc)     │ (FFmpeg)       │ (py7zr) │
          │   Auto-scaled    │ Auto-scaled  │ GPU-optional   │         │
          │   50-200 pods    │ 50-200 pods  │ 50-200 pods    │ 20 pods │
          └──────────────────────────────────────────────────────────┘
                                          │
                    ┌─────────────────────▼──────────────────┐
                    │         Output Storage                  │
                    │   AWS S3 / Cloudflare R2                │
                    │   (presigned URLs, auto-expire 1hr)    │
                    └─────────────────────────────────────────┘
```

### Step-by-step to reach 100K:

#### Step 1 — 0 to 1,000 concurrent ($50–200/mo)
```
Platform: Railway.app or Render
- 3× Standard instances ($25/mo each)
- Redis Cloud free tier (30MB)  
- nginx load balancer
- Cloudflare Pages (free) for frontend
→ Handles ~1,000 concurrent users, ~100 active jobs
```

#### Step 2 — 1K to 10K concurrent ($200–2,000/mo)
```
Platform: AWS / GCP / Hetzner
- ECS or k8s cluster, 10–30 worker pods
- Redis Elasticache (job queue + WS pub/sub)
- S3 for output storage (replace local disk)
- CloudFront CDN for downloads
- AWS SQS for decoupled job queue
→ Handles ~10K concurrent, ~500 active jobs
```

#### Step 3 — 10K to 100K concurrent ($2,000–20,000/mo)
```
Platform: AWS/GCP with auto-scaling
- Kubernetes HPA (Horizontal Pod Autoscaler)
- Separate worker pools per engine type:
    ffmpeg workers: GPU instances for video
    pandoc workers: CPU-optimised instances
    image workers: ARM Graviton (cheap, fast for Pillow)
- Redis Cluster (job queue, pub/sub, rate limiting)
- S3 + CloudFront for all outputs (presigned URLs)
- WAF + DDoS protection (Cloudflare Enterprise)
- CDN for frontend (already on CF Pages)
- Database (PostgreSQL) for job history/analytics
→ Handles 100K+ concurrent, 5,000+ active jobs
Estimated cost: $5,000–$15,000/month
```

#### Step 4 — Code changes needed for 100K scale:
```python
# 1. Replace local disk with S3
#    backend/storage.py — add S3Client class
#    outputs go to S3, download URL = presigned S3 URL

# 2. Replace in-process semaphore with Redis queue
#    backend/queue.py — add RedisJobQueue
#    workers pull jobs from queue, report progress via Redis pub/sub

# 3. WebSocket progress via Redis pub/sub
#    Any API pod can receive the WS connection
#    Worker pod publishes progress to Redis channel
#    API pod subscribes and forwards to browser

# 4. Split into microservices:
#    api-service   (FastAPI, stateless, 10 pods)
#    ws-service    (WebSocket server, 5 pods)
#    worker-image  (Pillow workers, 20 pods)
#    worker-doc    (Pandoc workers, 20 pods)
#    worker-media  (FFmpeg workers, 20 pods, GPU)
#    worker-arc    (Archive workers, 5 pods)
```

---

## 6. Quick Wins Before Launch (Do These Now)

### A. Add rate limiting to the backend (no nginx needed)
Install: `pip install slowapi`
```python
# main.py — add these 5 lines
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Then decorate the convert endpoint:
@app.post("/api/convert")
@limiter.limit("10/minute")
async def convert_file(request: Request, ...):
```

### B. Add Sentry error tracking
```bash
pip install sentry-sdk[fastapi]
```
```python
# main.py top
import sentry_sdk
sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=0.1)
```

### C. Add job download token (security)
```python
# Prevent job ID enumeration attacks
import secrets
download_token = secrets.token_urlsafe(16)
# Include token in download URL, verify on /outputs/{job_id}?token={token}
```

### D. Use uvloop + httptools for 2× throughput
```bash
pip install uvloop httptools
# Already in the CMD in Dockerfile
```

### E. Run multiple uvicorn workers
```bash
# On a 2-vCPU machine (formula: 2 × CPU + 1)
uvicorn main:app --workers 5 --host 0.0.0.0 --port 8000
# But: semaphore must move to Redis for multi-worker to work correctly
```
