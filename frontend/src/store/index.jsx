import { createContext, useContext, useEffect, useReducer } from 'react'

export const JOB_STATUS = {
  IDLE:       'idle',
  QUEUED:     'queued',
  CONVERTING: 'converting',
  DONE:       'done',
  ERROR:      'error',
}

const savedTheme = typeof localStorage !== 'undefined'
  ? (localStorage.getItem('fz-theme') || 'dark')
  : 'dark'

// Apply theme to <html> immediately on load
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', savedTheme)
}

const init = {
  theme:   savedTheme,
  formats: null,
  health:  { status: 'checking', tools: {} },
  jobs:    [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'THEME': {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      return { ...state, theme: next }
    }
    case 'SET_FORMATS':
      return { ...state, formats: action.payload }
    case 'SET_HEALTH':
      return { ...state, health: action.payload }
    case 'ADD_JOB': {
      const job = {
        jobId:        action.payload.jobId,
        filename:     action.payload.file.name,
        fileSize:     action.payload.file.size,
        targetFormat: action.payload.fmt,
        status:       JOB_STATUS.QUEUED,
        pct:          0,
        message:      'Queued…',
        downloadUrl:  null,
        outputFilename: null,
        outputSize:   null,
        error:        null,
      }
      return { ...state, jobs: [job, ...state.jobs] }
    }
    case 'UPDATE_JOB':
      return {
        ...state,
        jobs: state.jobs.map(j =>
          j.jobId === action.payload.jobId
            ? { ...j, ...action.payload.updates }
            : j
        ),
      }
    case 'REMOVE_JOB':
      return { ...state, jobs: state.jobs.filter(j => j.jobId !== action.payload) }
    case 'CLEAR_COMPLETED':
      return {
        ...state,
        jobs: state.jobs.filter(j =>
          j.status !== JOB_STATUS.DONE && j.status !== JOB_STATUS.ERROR
        ),
      }
    default:
      return state
  }
}

const StoreCtx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, init)

  // Sync theme to localStorage and <html> outside reducer
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('fz-theme', state.theme)
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', state.theme)
    }
  }, [state.theme])

  const actions = {
    toggleTheme:    ()              => dispatch({ type: 'THEME' }),
    setFormats:     payload         => dispatch({ type: 'SET_FORMATS', payload }),
    setHealth:      payload         => dispatch({ type: 'SET_HEALTH',  payload }),
    addJob:         (file, fmt, jobId) => {
      dispatch({ type: 'ADD_JOB', payload: { file, fmt, jobId } })
      return jobId
    },
    updateJob:      (jobId, updates) => dispatch({ type: 'UPDATE_JOB', payload: { jobId, updates } }),
    removeJob:      jobId            => dispatch({ type: 'REMOVE_JOB', payload: jobId }),
    clearCompleted: ()               => dispatch({ type: 'CLEAR_COMPLETED' }),
  }

  return <StoreCtx.Provider value={{ state, actions }}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
