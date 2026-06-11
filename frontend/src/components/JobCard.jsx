import { ProgressBar } from './ProgressBar'
import { JOB_STATUS } from '../store'

function sz(b) {
  if (!b) return ''
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

const ICON = {
  [JOB_STATUS.IDLE]:       '○',
  [JOB_STATUS.QUEUED]:     '◌',
  [JOB_STATUS.CONVERTING]: '◐',
  [JOB_STATUS.DONE]:       '●',
  [JOB_STATUS.ERROR]:      '✕',
}

export function JobCard({ job, onDismiss }) {
  const download = async () => {
    if (!job.downloadUrl) return
    try {
      // Fetch the file bytes (one-time download — server deletes after serving)
      const BASE = import.meta.env.VITE_API_URL || ''
      const res  = await fetch(BASE + job.downloadUrl)
      if (!res.ok) { alert('Download expired. Please convert again.'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = job.outputFilename || 'converted'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      // Tell server to delete the in-memory result (cleanup after download)
      try { await fetch(BASE + `/api/jobs/${job.jobId}`, { method: 'DELETE' }) } catch (_) {}
    } catch (e) {
      alert('Download failed: ' + e.message)
    }
  }

  return (
    <div className={`fz-job fz-job--${job.status}`}>
      <div className="fz-job__header">
        <span className={`fz-job__icon fz-job__icon--${job.status}`}>
          {ICON[job.status]}
        </span>
        <div className="fz-job__names">
          <span className="fz-job__input" title={job.filename}>{job.filename}</span>
          <span className="fz-job__arrow">→</span>
          <span className="fz-job__output">.{job.targetFormat}</span>
        </div>
        <button
          className="fz-job__dismiss"
          onClick={() => onDismiss(job.jobId)}
          title="Remove"
        >×</button>
      </div>

      <ProgressBar pct={job.pct} status={job.status} />

      <div className="fz-job__footer">
        <span className="fz-job__msg">{job.message}</span>
        <div className="fz-job__actions">
          {job.status === JOB_STATUS.DONE && job.outputSize && (
            <span className="fz-job__size">{sz(job.outputSize)}</span>
          )}
          {job.status === JOB_STATUS.DONE && job.downloadUrl && (
            <button className="fz-btn fz-btn--download" onClick={download}>
              ↓ Download
            </button>
          )}
          {job.status === JOB_STATUS.ERROR && (
            <span className="fz-job__err-label">Failed</span>
          )}
        </div>
      </div>
    </div>
  )
}
