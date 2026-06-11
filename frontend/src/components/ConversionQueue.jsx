import { JobCard } from './JobCard'
import { useStore, JOB_STATUS } from '../store'

export function ConversionQueue() {
  const { state, actions } = useStore()
  const { jobs } = state
  if (jobs.length === 0) return null
  const done = jobs.filter(j => j.status === JOB_STATUS.DONE || j.status === JOB_STATUS.ERROR).length
  return (
    <section className="fz-queue">
      <div className="fz-queue__header">
        <h2 className="fz-queue__title">
          Queue <span className="fz-queue__badge">{jobs.length}</span>
        </h2>
        {done > 0 && (
          <button className="fz-btn fz-btn--ghost fz-btn--sm" onClick={actions.clearCompleted}>
            Clear done
          </button>
        )}
      </div>
      <div className="fz-queue__list">
        {jobs.map(j => (
          <JobCard key={j.jobId} job={j} onDismiss={actions.removeJob} />
        ))}
      </div>
    </section>
  )
}
