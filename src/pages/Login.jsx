import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--teal)', letterSpacing: '-0.5px' }}>CareFlow</div>
          <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>Sign in to your facility account</div>
        </div>
        <div className="panel">
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Email address</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@facility.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 12px', borderRadius: 'var(--radius)', fontSize: '13px', marginBottom: '14px' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--text2)' }}>
          HIPAA-compliant · Data encrypted at rest and in transit
        </div>
      </div>
    </div>
  )
}
