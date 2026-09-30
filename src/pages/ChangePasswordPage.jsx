import { useState } from 'react'
import AccountShell from '../components/AccountShell'

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [error, setError] = useState('')

  const handlePasswordChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setPasswordSaved(false)
    setError('')
  }
  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      setError('The new passwords do not match.')
      return
    }
    setPasswordSaved(true)
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setTimeout(() => setPasswordSaved(false), 3000)
  }

  return (
    <AccountShell title="Password" intro="Choose a strong password that you don't use anywhere else.">
      <section className="tc-acct__section">
        <div className="tc-acct__sechead">
          <h2>Change password</h2>
          {passwordSaved && <span className="tc-acct__saved" role="status">Password updated</span>}
        </div>
        <form onSubmit={handlePasswordSubmit} className="tc-formgrid tc-formgrid--narrow">
          <div className="tc-formfield is-wide">
            <label htmlFor="currentPassword">Current password</label>
            <input id="currentPassword" name="currentPassword" value={form.currentPassword} onChange={handlePasswordChange} type="password" className="tc-input" autoComplete="current-password" />
          </div>
          <div className="tc-formfield is-wide">
            <label htmlFor="newPassword">New password</label>
            <input id="newPassword" name="newPassword" value={form.newPassword} onChange={handlePasswordChange} type="password" className="tc-input" autoComplete="new-password" />
          </div>
          <div className="tc-formfield is-wide">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input id="confirmPassword" name="confirmPassword" value={form.confirmPassword} onChange={handlePasswordChange} type="password" className={`tc-input ${error ? 'is-error' : ''}`} autoComplete="new-password" />
            {error && <p className="tc-error" role="alert">{error}</p>}
          </div>
          <div className="tc-formfield is-wide">
            <button type="submit" className="tc-btn tc-btn--primary">Update password</button>
          </div>
        </form>
      </section>
    </AccountShell>
  )
}
