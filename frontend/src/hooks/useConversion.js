import { useCallback } from 'react'

import { startConversion } from '../services/api'
import { openJobSocket } from '../services/websocket'
import { useStore, JOB_STATUS } from '../store'

export function useConversion() {
  const { actions } = useStore()

  const convert = useCallback(async (file, fmt) => {
    const jobId = crypto.randomUUID()
    actions.addJob(file, fmt, jobId)
    actions.updateJob(jobId, { status: JOB_STATUS.QUEUED, message: 'Connecting…' })

    // Open WebSocket BEFORE posting — so we don't miss early progress events
    const closeWs = openJobSocket(jobId, msg => {
      if (msg.type === 'progress') {
        actions.updateJob(jobId, {
          status:  JOB_STATUS.CONVERTING,
          pct:     msg.pct,
          message: msg.message,
        })
      } else if (msg.type === 'complete') {
        actions.updateJob(jobId, {
          status:         JOB_STATUS.DONE,
          pct:            100,
          message:        'Done!',
          downloadUrl:    msg.download_url,
          outputFilename: msg.filename,
          outputSize:     msg.size,
        })
        closeWs()
      } else if (msg.type === 'error') {
        actions.updateJob(jobId, {
          status:  JOB_STATUS.ERROR,
          message: msg.message || 'Conversion failed',
          error:   msg.message,
        })
        closeWs()
      }
    })

    try {
      await startConversion(file, fmt, jobId)
      actions.updateJob(jobId, { status: JOB_STATUS.CONVERTING, message: 'Processing…' })
    } catch (e) {
      const msg = e.message || 'Failed to start conversion'
      actions.updateJob(jobId, { status: JOB_STATUS.ERROR, message: msg, error: msg })
      closeWs()
    }

    return jobId
  }, [actions])

  const dismiss = useCallback(id => actions.removeJob(id), [actions])

  return { convert, dismiss }
}
