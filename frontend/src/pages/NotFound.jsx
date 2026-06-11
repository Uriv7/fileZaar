import { Link } from 'react-router-dom'
export default function NotFound() {
  return (
    <div className="fz-error-page">
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" className="fz-btn fz-btn--primary">← Back to FileZaar</Link>
    </div>
  )
}
