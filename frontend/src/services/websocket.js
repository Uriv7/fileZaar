/**
 * services/websocket.js — WebSocket manager for job progress
 * Fixes: reconnection on drop, no-server fallback, memory leak cleanup
 */

function getWsBase() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
      .replace('https://', 'wss://')
      .replace('http://', 'ws://') + '/ws'
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/ws`
}

const connections = new Map()

export function openJobSocket(jobId, onMessage) {
  if (connections.has(jobId)) {
    try { connections.get(jobId).ws?.close() } catch (_) {}
    connections.delete(jobId)
  }

  let ws = null
  let pingInterval = null
  let timeoutTimer = null
  let reconnectTimer = null
  let reconnectAttempts = 0
  let closed = false                  // set when caller calls the returned close()
  const MAX_RECONNECTS = 3
  const JOB_TIMEOUT_MS = 5 * 60 * 1000   // 5 minutes — fail a stuck job

  function connect() {
    try {
      ws = new WebSocket(`${getWsBase()}/${jobId}`)
    } catch (e) {
      console.warn('WebSocket not available, progress updates disabled')
      return
    }

    ws.onopen = () => {
      reconnectAttempts = 0
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, 15000)

      // Job timeout: if no complete/error within 5 min, surface an error
      clearTimeout(timeoutTimer)
      timeoutTimer = setTimeout(() => {
        if (!closed) {
          onMessage({ type: 'error', job_id: jobId, message: 'Conversion timed out (5 min limit). Please try again.' })
          cleanup()
        }
      }, JOB_TIMEOUT_MS)
    }

    ws.onmessage = (event) => {
      // Any message resets the timeout clock
      clearTimeout(timeoutTimer)
      timeoutTimer = setTimeout(() => {
        if (!closed) {
          onMessage({ type: 'error', job_id: jobId, message: 'Conversion timed out (5 min limit). Please try again.' })
          cleanup()
        }
      }, JOB_TIMEOUT_MS)

      try {
        const msg = JSON.parse(event.data)
        onMessage(msg)
        // Clear timeout on terminal messages
        if (msg.type === 'complete' || msg.type === 'error') {
          clearTimeout(timeoutTimer)
        }
      } catch (e) {}
    }

    ws.onerror = (err) => {
      // Don't surface error immediately — let onclose handle reconnect
      console.warn(`[WS] error on job ${jobId}`, err)
    }

    ws.onclose = (evt) => {
      if (pingInterval) clearInterval(pingInterval)
      pingInterval = null
      connections.delete(jobId)

      if (closed) return   // intentional close by caller

      // Abnormal close (code !== 1000) — attempt reconnect
      if (evt.code !== 1000 && reconnectAttempts < MAX_RECONNECTS) {
        reconnectAttempts++
        const delay = reconnectAttempts * 1500
        console.warn(`[WS] connection lost (code ${evt.code}), reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECTS})`)
        reconnectTimer = setTimeout(() => { if (!closed) connect() }, delay)
      } else if (reconnectAttempts >= MAX_RECONNECTS) {
        onMessage({ type: 'error', job_id: jobId, message: 'Connection to server lost. Please refresh and try again.' })
        cleanup()
      }
    }

    connections.set(jobId, { ws, cleanup })
  }

  function cleanup() {
    closed = true
    clearTimeout(timeoutTimer)
    clearTimeout(reconnectTimer)
    if (pingInterval) clearInterval(pingInterval)
    try { ws?.close(1000) } catch (_) {}
    connections.delete(jobId)
  }

  connect()
  return cleanup
}
