import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function SignUpPage() {
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
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
        <h1 className="tc-h2">Create an account</h1>
        <p className="tc-lead">Save your designs, track orders and check out faster.</p>

        <form onSubmit={handleSubmit} className="tc-auth__form">
          <div className="tc-formfield">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" type="text" className="tc-input" required autoComplete="name" value={formData.fullName} onChange={handleChange} />
          </div>
          <div className="tc-formfield">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" className="tc-input" placeholder="you@email.com" required autoComplete="email" value={formData.email} onChange={handleChange} />
          </div>
          <div className="tc-formfield">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" className="tc-input" required autoComplete="new-password" value={formData.password} onChange={handleChange} />
          </div>
          <button type="submit" className="tc-btn tc-btn--primary tc-btn--block" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="tc-auth__alt">
          Already have an account? <Link to="/login" className="tc-link">Log in</Link>
        </p>
      </div>
    </div>
  )
}
