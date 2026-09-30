import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false })
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target
    setFormData({ ...formData, [id]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      localStorage.setItem('isLoggedIn', 'true')
      window.dispatchEvent(new Event('storage'))
      setLoading(false)
      navigate('/')
    }, 1200)
  }

  return (
    <div className="tc-page tc-auth">
      <div className="tc-auth__card">
        <h1 className="tc-h2">Log in</h1>
        <p className="tc-lead">Welcome back. Sign in to view your orders and saved designs.</p>

        <form onSubmit={handleSubmit} className="tc-auth__form">
          <div className="tc-formfield">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" className="tc-input" placeholder="you@email.com" required autoComplete="email" value={formData.email} onChange={handleChange} />
          </div>
          <div className="tc-formfield">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" className="tc-input" required autoComplete="current-password" value={formData.password} onChange={handleChange} />
          </div>
          <div className="tc-auth__row">
            <label className="tc-check">
              <input id="rememberMe" type="checkbox" checked={formData.rememberMe} onChange={handleChange} />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              className="tc-link"
              onClick={() => setNotice('If an account exists for this email, a reset link will be sent.')}
            >
              Forgot password?
            </button>
          </div>
          {notice && <p className="tc-note" role="status">{notice}</p>}
          <button type="submit" className="tc-btn tc-btn--primary tc-btn--block" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="tc-auth__alt">
          New to ThreadCraft? <Link to="/signup" className="tc-link">Create an account</Link>
        </p>
      </div>
    </div>
  )
}
