import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { Logo } from './Logo'

export function Header() {
  const { state, actions } = useStore()
  const navigate = useNavigate()

  const online = state.health?.status !== 'offline' && state.health?.status !== 'checking'

  return (
    <header className="fz-header">
      <div className="fz-header__inner">
        <Link to="/" className="fz-header__brand">
          <img
            src="/logo.png"
            width={28} height={28}
            alt="FileZaar"
            onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling.style.display='flex' }}
            style={{ borderRadius: 6 }}
          />
          <span style={{ display:'none' }}><Logo size={28} /></span>
          <span className="fz-header__name">FileZaar</span>
        </Link>

        <nav className="fz-header__nav">
          <a href="/#features"      className="fz-nav-link">Features</a>
          <a href="/#how-it-works"  className="fz-nav-link">How it works</a>
          <a href="/#formats"       className="fz-nav-link">Formats</a>
        </nav>

        <div className="fz-header__right">
          <div className={`fz-status fz-status--${online ? 'on' : 'off'}`}>
            <div className="fz-status__dot" />
            <span>{online ? 'Ready' : 'Offline'}</span>
          </div>

          <button
            className="fz-theme-btn"
            onClick={actions.toggleTheme}
            title="Toggle theme"
            aria-label="Toggle dark/light mode"
          >
            {state.theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <button
            className="fz-cta-btn"
            onClick={() => {
              navigate('/')
              setTimeout(() => {
                document.querySelector('.fz-converter-section')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }, 100)
            }}
          >
            Convert Now
          </button>
        </div>
      </div>
    </header>
  )
}
