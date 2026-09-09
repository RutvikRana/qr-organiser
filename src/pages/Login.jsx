import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { QrIcon } from '../components/icons.jsx'

function friendlyError(error) {
  const msg = error?.message ?? ''
  if (/invalid login/i.test(msg)) return 'Wrong email or password. Try again.'
  if (/email not confirmed/i.test(msg)) return 'Your email isn\u2019t confirmed yet — check your inbox for the confirmation link.'
  if (/rate limit/i.test(msg)) return 'Too many attempts. Wait a minute and try again.'
  if (/signups not allowed/i.test(msg)) return 'New sign-ups are disabled. Ask the account owner to invite you.'
  if (/at least 6|password.*short/i.test(msg)) return 'Password must be at least 6 characters.'
  if (/valid email/i.test(msg)) return 'That doesn\u2019t look like a valid email address.'
  return msg || 'Something went wrong. Try again.'
}

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const { error: signInError } = await signIn(email.trim(), password)
      if (signInError) throw signInError
      navigate(from, { replace: true })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-brand">
        <span className="tape">QR</span>
        <h1 className="login-title">Organiser</h1>
        <p className="login-sub">Private storage &middot; sign in to see your boxes</p>
      </div>

      <form className="card login-card" onSubmit={handleSubmit}>
        {error && <div className="error-banner">{error}</div>}

        <div className="field-group">
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="field"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="password">Password</label>
          <div className="password-wrap">
            <input
              id="password"
              className="field password-field"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Signing in\u2026' : 'Sign in'}
        </button>

        <p className="login-footnote">
          <QrIcon size={13} /> Scans work the same once you&rsquo;re in — nothing changes.
        </p>
      </form>
    </div>
  )
}
