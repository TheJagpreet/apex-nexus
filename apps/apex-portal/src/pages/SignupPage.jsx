import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function EyeIcon({ open }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(key) { return e => setForm(prev => ({ ...prev, [key]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup(form.username, form.email, form.password, form.displayName || undefined)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-split">
      {/* ── Left hero panel ── */}
      <div className="auth-hero">
        <div className="auth-hero__logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="12 2 22 12 12 22 2 12"/>
          </svg>
          <span className="auth-hero__logo-text">Apex Nexus</span>
        </div>
        <div className="auth-hero__content">
          <div className="eyebrow" style={{ marginBottom: 20 }}>Retrieval-Augmented Platform · 2026</div>
          <h1 className="auth-hero__title">
            Knowledge,<br />
            <em>recovered</em> on demand.
          </h1>
          <p className="auth-hero__desc">
            Five microservices, one workspace. Ingest documents, query with hybrid search, and orchestrate agents — all behind your own infrastructure.
          </p>
          <div className="auth-hero__stats">
            <div className="auth-hero__stat">
              <span className="auth-hero__stat-value">5</span>
              <span className="auth-hero__stat-label">Services</span>
            </div>
            <div className="auth-hero__stat">
              <span className="auth-hero__stat-value">2.4ms</span>
              <span className="auth-hero__stat-label">P50 Retrieval</span>
            </div>
            <div className="auth-hero__stat">
              <span className="auth-hero__stat-value">100%</span>
              <span className="auth-hero__stat-label">Self-Hosted</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-panel">
        <div className="auth-panel__inner">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Create account</div>
          <h2 className="auth-panel__heading serif">Join the workspace.</h2>
          <p className="auth-panel__sub">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">Sign in</Link>
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="auth-input"
                type="text"
                value={form.username}
                onChange={set('username')}
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email</label>
              <input
                id="email"
                className="auth-input"
                type="email"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
                required
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="display-name">
                Display name <span className="auth-label-opt">(optional)</span>
              </label>
              <input
                id="display-name"
                className="auth-input"
                type="text"
                value={form.displayName}
                onChange={set('displayName')}
                autoComplete="name"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Password</label>
              <div className="auth-input-wrap">
                <input
                  id="password"
                  className="auth-input auth-input--pw"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                  minLength={4}
                  required
                />
                <button
                  type="button"
                  className="auth-input-eye"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Creating account…' : <>Create account &nbsp;›</>}
            </button>
          </form>

          <div className="auth-footer">
            Apex Nexus · MIT License · v1.4.0
          </div>
        </div>
      </div>
    </div>
  )
}
