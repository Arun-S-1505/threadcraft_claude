import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/AuthContext'

/**
 * Sign in / create account. Both use an emailed 6-digit code, so there is no password to
 * remember, leak or reset. Only the wording and the fields differ between the two pages.
 */
const COPY = {
  signin: {
    eyebrow: 'Sign in',
    title: 'Welcome back',
    lead: 'Enter your email and we will send you a code to sign in.',
    button: 'Email me a code',
    alt: ['New here?', 'Create an account', '/signup'],
  },
  signup: {
    eyebrow: 'Create account',
    title: 'Join ThreadCraft',
    lead: 'Track every order in one place and keep your details for faster checkout.',
    button: 'Email me a code',
    alt: ['Already have an account?', 'Sign in', '/login'],
  },
}

// Only follow same-site paths after signing in (never an address on another website)
const safeNext = (value) => (value && value.startsWith('/') && !value.startsWith('//') ? value : '/account')

function AuthFlow({ mode }) {
  const copy = COPY[mode]
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))

  const [step, setStep] = useState('email') // email | code
  const [form, setForm] = useState({ name: '', email: '', website: '' })
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [wait, setWait] = useState(0)
  const verifying = useRef(false)

  // Already signed in: go straight on
  useEffect(() => {
    if (user) navigate(next, { replace: true })
  }, [user, next, navigate])

  // Countdown before a new code can be requested
  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const requestCode = async (e) => {
    e?.preventDefault()
    if (busy) return
    setError('')
    if (mode === 'signup' && form.name.trim().length < 2) return setError('Please enter your name.')
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('Please enter a valid email address.')
    setBusy(true)
    try {
      await api('/api/auth/request-code', { method: 'POST', json: { email: form.email.trim(), name: form.name.trim(), website: form.website } })
      setStep('code')
      setCode('')
      setWait(45)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const verify = async (value) => {
    if (verifying.current) return
    verifying.current = true
    setBusy(true)
    setError('')
    try {
      const res = await api('/api/auth/verify', { method: 'POST', json: { email: form.email.trim(), code: value } })
      setUser(res.user)
      navigate(next, { replace: true })
    } catch (err) {
      setError(err.message)
      setCode('')
    } finally {
      verifying.current = false
      setBusy(false)
    }
  }

  const onCode = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    if (digits.length === 6) verify(digits) // sign in as soon as the sixth digit is typed or pasted
  }

  return (
    <div className="tc-page tc-auth">
      <div className="tc-auth__card">
        <p className="tc-eyebrow">{copy.eyebrow}</p>
        <h1 className="tc-h2">{copy.title}</h1>

        {step === 'email' ? (
          <>
            <p className="tc-lead">{copy.lead}</p>
            <form onSubmit={requestCode} className="tc-auth__form" noValidate>
              {mode === 'signup' && (
                <div className="tc-formfield">
                  <label htmlFor="a-name">Your name</label>
                  <input id="a-name" name="name" className="tc-input" value={form.name} onChange={set} autoComplete="name" />
                </div>
              )}
              <div className="tc-formfield">
                <label htmlFor="a-email">Email address</label>
                <input id="a-email" name="email" type="email" inputMode="email" className="tc-input" value={form.email} onChange={set} autoComplete="email" placeholder="you@email.com" />
              </div>
              {/* Honeypot: invisible to people, bots fill it in */}
              <input name="website" value={form.website} onChange={set} className="tc-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              {error && <p className="tc-error" role="alert">{error}</p>}
              <button type="submit" className="tc-btn tc-btn--primary tc-btn--block" disabled={busy}>
                {busy ? 'Sending…' : copy.button}
              </button>
              <p className="tc-auth__fine">No password needed. By continuing you agree to our <Link to="/policies/terms" className="tc-link">Terms</Link> and <Link to="/policies/privacy" className="tc-link">Privacy Policy</Link>.</p>
            </form>
            <p className="tc-auth__alt">
              {copy.alt[0]} <Link to={copy.alt[2]} className="tc-link">{copy.alt[1]}</Link>
            </p>
          </>
        ) : (
          <>
            <p className="tc-lead">
              We sent a 6-digit code to <strong>{form.email.trim()}</strong>. It works for 10 minutes. Check your spam folder if you do not see it.
            </p>
            <div className="tc-auth__form">
              <div className="tc-formfield">
                <label htmlFor="a-code">6-digit code</label>
                <input
                  id="a-code"
                  className="tc-input tc-codeinput"
                  value={code}
                  onChange={onCode}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="······"
                  autoFocus
                  disabled={busy}
                />
              </div>
              {error && <p className="tc-error" role="alert">{error}</p>}
              <button type="button" className="tc-btn tc-btn--primary tc-btn--block" disabled={busy || code.length !== 6} onClick={() => verify(code)}>
                {busy ? 'Checking…' : 'Continue'}
              </button>
              <div className="tc-auth__row">
                <button type="button" className="tc-link" onClick={requestCode} disabled={busy || wait > 0}>
                  {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
                </button>
                <button type="button" className="tc-link" onClick={() => { setStep('email'); setError('') }}>
                  Use a different email
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export const SignInPage = () => <AuthFlow mode="signin" />
export const SignUpPage = () => <AuthFlow mode="signup" />
