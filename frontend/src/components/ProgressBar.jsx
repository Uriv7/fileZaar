import { JOB_STATUS } from '../store'
export function ProgressBar({ pct, status }) {
  const done  = status === JOB_STATUS.DONE
  const error = status === JOB_STATUS.ERROR
  const w     = done ? 100 : (pct || 0)
  return (
    <div className={`fz-progress${error ? ' fz-progress--error' : ''}`}>
      <div
        className={`fz-progress__fill${done ? ' fz-progress__fill--done' : ''}`}
        style={{ width: `${w}%` }}
      />
    </div>
  )
}
