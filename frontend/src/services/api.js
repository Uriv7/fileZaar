/**
 * services/api.js — HTTP client with retry, caching, and error normalisation
 */

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

// Simple in-memory cache for stable endpoints
const _cache = new Map()

async function fetchWithRetry(url, opts = {}, retries = 2, delay = 800) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...opts, signal: opts.signal })
      if (res.ok) return res
      if (res.status < 500) throw new Error(`HTTP ${res.status}`)  // don't retry 4xx
      if (attempt === retries) throw new Error(`HTTP ${res.status} after ${retries + 1} attempts`)
    } catch (e) {
      if (attempt === retries) throw e
      await new Promise(r => setTimeout(r, delay * (attempt + 1)))
    }
  }
}

export async function getSupportedFormats() {
  const key = 'formats'
  if (_cache.has(key)) return _cache.get(key)
  const res = await fetchWithRetry(`${BASE}/formats`)
  if (!res) throw new Error('Failed to fetch formats')
  const data = await res.json()
  _cache.set(key, data)          // formats never change at runtime
  return data
}

export async function checkHealth() {
  try {
    const res = await fetchWithRetry(`${BASE}/health`, {}, 1, 500)
    return res ? res.json() : { status: 'error', tools: {} }
  } catch {
    return { status: 'offline', tools: {} }
  }
}

export async function startConversion(file, targetFormat, jobId) {
  const form = new FormData()
  form.append('file', file)
  form.append('target_format', targetFormat)
  if (jobId) form.append('job_id', jobId)

  const res = await fetchWithRetry(`${BASE}/convert`, { method: 'POST', body: form }, 0)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Conversion failed to start')
  return data
}

export async function cleanupJob(jobId) {
  try { await fetch(`${BASE}/jobs/${jobId}`, { method: 'DELETE' }) } catch (_) {}
}
