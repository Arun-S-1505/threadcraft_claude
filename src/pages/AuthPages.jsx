import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import GoogleButton, { isEmbeddedBrowser } from '../components/GoogleButton'
import { api } from '../lib/api'
import { useAuth } from '../store/AuthContext'

/**
 * Sign in, create account and reset password. Ways in:
 *  - Google (one tap, if configured),
 *  - email + password,
 *  - an emailed 6-digit code (also how a new email is confirmed, so nobody can claim someone else's email).
 */
const COPY = {
  signin: {
    eyebrow: 'Sign in',
    title: 'Welcome back',
    lead: 'Sign in to see your orders and check out faster.',
    alt: ['New here?', 'Create an account', '/signup'],
  },
  signup: {
    eyebrow: 'Create account',
    title: 'Join ThreadCraft',
    lead: 'Track every order in one place and keep your details for faster checkout.',
    alt: ['Already have an account?', 'Sign in', '/login'],
  },
  reset: {
    eyebrow: 'Reset password',
    title: 'Choose a new password',
    lead: 'Enter your email and a new password. We will email you a code to confirm it is you.',
    alt: ['Remembered it?', 'Back to sign in', '/login'],
  },
}

// Only follow same-site paths after signing in (never an address on another website)
const safeNext = (value) => (value && value.startsWith('/') && !value.startsWith('//') ? value : '/account')
const METHOD_KEY = 'tc_auth_method'
const GOOGLE_KEY = 'tc_google_id'
// Remembered for the session so the page does not rearrange itself every time it opens.
// undefined = not known yet, null = not offered, string = client id
const readGoogleCache = () => {
  try {
    const v = sessionStorage.getItem(GOOGLE_KEY)
    return v === null ? undefined : v === 'none' ? null : v
  } catch {
    return undefined
  }
}
const readMethod = () => {
  try {
    return localStorage.getItem(METHOD_KEY) === 'code' ? 'code' : 'password'
  } catch {
    return 'password'
  }
}

function PasswordField({ id, label, value, onChange, autoComplete, hint }) {
  const [show, setShow] = useState(false)
  return (
    <div className="tc-formfield">
      <label htmlFor={id}>{label}</label>
      <div className="tc-pwfield">
        <input id={id} name={id} type={show ? 'text' : 'password'} className="tc-input" value={value} onChange={onChange} autoComplete={autoComplete} />
        <button type="button" className="tc-pwfield__toggle" onClick={() => setShow((v) => !v)} aria-pressed={show}>{show ? 'Hide' : 'Show'}</button>
      </div>
      {hint && <p className="tc-auth__fine">{hint}</p>}
    </div>
  )
}

function AuthFlow({ mode }) {
  const copy = COPY[mode]
  const { user, loading, setUser } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))

  const [method, setMethodState] = useState(readMethod) // sign in only: 'password' | 'code'
  const [step, setStep] = useState('email') // email | code
  const [form, setForm] = useState({ name: '', email: '', password: '', website: '' })
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [wait, setWait] = useState(0)
  const [googleId, setGoogleId] = useState(readGoogleCache)
  const [waited, setWaited] = useState(false)
  const verifying = useRef(false)
  const embedded = isEmbeddedBrowser()

  const setMethod = (m) => {
    setMethodState(m)
    setError('')
    try {
      localStorage.setItem(METHOD_KEY, m)
    } catch {
      /* ignore */
    }
  }

  // Already signed in: go straight on
  useEffect(() => {
    if (user) navigate(next, { replace: true })
  }, [user, next, navigate])

  // Does this site offer Google sign-in?
  useEffect(() => {
    const ctrl = new AbortController()
    api('/api/config', { signal: ctrl.signal })
      .then((c) => {
        const id = c.googleClientId || null
        setGoogleId(id)
        try {
          sessionStorage.setItem(GOOGLE_KEY, id || 'none')
        } catch {
          /* ignore */
        }
      })
      .catch((e) => e.name !== 'AbortError' && setGoogleId((g) => (g === undefined ? null : g)))
    return () => ctrl.abort()
  }, [])

  // Countdown before a new code can be requested
  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  const finish = (u) => {
    setUser(u)
    navigate(next, { replace: true })
  }

  const usesCode = mode !== 'signin' || method === 'code'
  const needsPassword = mode === 'reset'

  const validEmail = () => /^\S+@\S+\.\S+$/.test(form.email.trim())

  const requestCode = async (e) => {
    e?.preventDefault()
    if (busy) return
    setError('')
    if (mode === 'signup' && form.name.trim().length < 2) return setError('Please enter your name.')
    if (!validEmail()) return setError('Please enter a valid email address.')
    if (needsPassword && form.password.length < 8) return setError('Use at least 8 characters for your new password.')
    setBusy(true)
    try {
      await api('/api/auth/request-code', {
        method: 'POST',
        json: { email: form.email.trim(), name: form.name.trim(), password: mode === 'signin' ? '' : form.password, website: form.website },
      })
      setStep('code')
      setCode('')
      setWait(45)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const passwordLogin = async (e) => {
    e.preventDefault()
    if (busy) return
    setError('')
    if (!validEmail()) return setError('Please enter a valid email address.')
    if (!form.password) return setError('Please enter your password.')
    setBusy(true)
    try {
      finish((await api('/api/auth/login', { method: 'POST', json: { email: form.email.trim(), password: form.password } })).user)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const verify = async (value) => {
    if (verifying.current) return
    verifying.current = true
    setBusy(true)
    setError('')
    try {
      finish((await api('/api/auth/verify', { method: 'POST', json: { email: form.email.trim(), code: value } })).user)
    } catch (err) {
      setError(err.message)
      setCode('')
      setBusy(false)
    } finally {
      verifying.current = false
    }
  }

  const onCode = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    if (digits.length === 6) verify(digits) // sign in as soon as the sixth digit is typed or pasted
  }

  const onGoogle = async (credential) => {
    setError('')
    setBusy(true)
    try {
      finish((await api('/api/auth/google', { method: 'POST', json: { credential } })).user)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  // Reserve the Google button's space while we are still finding out, so nothing jumps afterwards
  const googleSpace = mode !== 'reset' && step === 'email' && !embedded && (googleId === undefined || !!googleId)

  // Fade the page in once, when it is stable. A slow network never leaves it blank for more than a moment.
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 1200)
    return () => clearTimeout(t)
  }, [])
  const ready = !user && ((!loading && googleId !== undefined) || waited)

  return (
    <div className="tc-page tc-auth">
      <div className="tc-auth__card" data-ready={ready ? 'true' : 'false'}>
        <p className="tc-eyebrow">{copy.eyebrow}</p>
        <h1 className="tc-h2">{copy.title}</h1>

        {step === 'email' ? (
          <>
            <p className="tc-lead">{copy.lead}</p>

            {googleSpace && (
              <div className="tc-auth__google">
                {googleId ? <GoogleButton clientId={googleId} mode={mode} onCredential={onGoogle} onError={setError} /> : <div className="tc-google" />}
                <p className="tc-or"><span>or use your email</span></p>
              </div>
            )}
            {mode !== 'reset' && googleId && embedded && (
              <p className="tc-auth__fine tc-auth__embedded">
                Google sign-in does not work inside Instagram's built-in browser. Use your email below, or open this page in Chrome or Safari.
              </p>
            )}

            {mode === 'signin' && (
              <div className="tc-seg" role="tablist" aria-label="Sign-in method">
                <button type="button" role="tab" aria-selected={method === 'password'} className={method === 'password' ? 'is-on' : ''} onClick={() => setMethod('password')}>Password</button>
                <button type="button" role="tab" aria-selected={method === 'code'} className={method === 'code' ? 'is-on' : ''} onClick={() => setMethod('code')}>Email code</button>
              </div>
            )}

            <form onSubmit={mode === 'signin' && method === 'password' ? passwordLogin : requestCode} className="tc-auth__form" noValidate>
              {mode === 'signup' && (
                <div className="tc-formfield">
                  <label htmlFor="name">Your name</label>
                  <input id="name" name="name" className="tc-input" value={form.name} onChange={set} autoComplete="name" />
                </div>
              )}
              <div className="tc-formfield">
                <label htmlFor="email">Email address</label>
                <input id="email" name="email" type="email" inputMode="email" className="tc-input" value={form.email} onChange={set} autoComplete={mode === 'signin' && method === 'password' ? 'username' : 'email'} placeholder="you@email.com" />
              </div>

              {mode === 'signin' && method === 'password' && (
                <>
                  <PasswordField id="password" label="Password" value={form.password} onChange={set} autoComplete="current-password" />
                  <div className="tc-auth__row">
                    <Link to="/reset-password" className="tc-link">Forgot password?</Link>
                    <button type="button" className="tc-link" onClick={() => setMethod('code')}>Email me a code instead</button>
                  </div>
                </>
              )}
              {mode === 'signup' && (
                <PasswordField id="password" label="Password (optional)" value={form.password} onChange={set} autoComplete="new-password" hint="Leave empty to sign in with an emailed code each time. At least 8 characters if you set one." />
              )}
              {mode === 'reset' && <PasswordField id="password" label="New password" value={form.password} onChange={set} autoComplete="new-password" hint="At least 8 characters." />}

              {/* Honeypot: invisible to people, bots fill it in */}
              <input name="website" value={form.website} onChange={set} className="tc-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              {error && <p className="tc-error" role="alert">{error}</p>}
              <button type="submit" className="tc-btn tc-btn--primary tc-btn--block" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'signin' && method === 'password' ? 'Sign in' : mode === 'reset' ? 'Email me a code' : usesCode && mode === 'signup' ? 'Create account' : 'Email me a code'}
              </button>
              <p className="tc-auth__fine">
                {mode === 'signin' && method === 'password' ? '' : 'We will email you a 6-digit code to confirm your email. '}
                By continuing you agree to our <Link to="/policies/terms" className="tc-link">Terms</Link> and <Link to="/policies/privacy" className="tc-link">Privacy Policy</Link>.
              </p>
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
                <label htmlFor="code">6-digit code</label>
                <input
                  id="code"
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
                {busy ? 'Checking…' : mode === 'reset' ? 'Set new password' : 'Continue'}
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
export const ResetPasswordPage = () => <AuthFlow mode="reset" />
