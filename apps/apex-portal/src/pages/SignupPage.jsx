import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' })
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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Apex</div>
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
            <label className="auth-label" htmlFor="display-name">Display name <span className="auth-label-opt">(optional)</span></label>
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
            <input
              id="password"
              className="auth-input"
              type="password"
              value={form.password}
              onChange={set('password')}
              autoComplete="new-password"
              required
            />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
