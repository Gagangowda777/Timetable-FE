import { useState } from 'react'
import { apiRequest } from '../api.js'
import './LoginPage.css'

const roles = [
  { id: 'student', label: 'Student', identity: 'Student email' },
  { id: 'faculty', label: 'Faculty', identity: 'Faculty email' },
  { id: 'department-admin', label: 'Dept admin', identity: 'Department admin email' },
  { id: 'academic-admin', label: 'Academic admin', identity: 'Academic admin email' },
  { id: 'super-admin', label: 'Super admin', identity: 'Super admin email' },
]

function LoginPage({ onLogin }) {
  const [role, setRole] = useState('student')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const selectedRole = roles.find((item) => item.id === role)

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setSubmitting(true)
    setNotice('')
    try {
      const { token, user } = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email: formData.get('identity'), password: formData.get('password') },
      })
      onLogin({ token, user, remember: formData.get('remember') === 'on' })
    } catch (error) {
      setNotice(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handlePasswordReset() {
    setNotice('Password reset is not available yet. Contact your campus administrator.')
  }

  return (
    <main className="login-page">
      <section className="login-story" aria-labelledby="welcome-heading">
        <div className="story-copy">
          <p className="eyebrow">YOUR CAMPUS, IN SYNC</p>
          <h1 id="welcome-heading">Timetable Allocation &amp; Management Portal</h1>
          <p className="story-description">
            Plan classes, coordinate rooms, and keep campus schedules in one clear view.
          </p>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-heading">
        <div className="login-form-wrap">
          <p className="form-eyebrow">CAMPUS PORTAL</p>
          <h2 id="login-heading">Welcome back.</h2>
          <p className="form-intro">Choose your account type to continue.</p>

          <div className="role-picker" role="group" aria-label="Choose account type">
            {roles.map((item) => (
              <button
                className={`role-option${role === item.id ? ' is-selected' : ''}`}
                key={item.id}
                type="button"
                aria-pressed={role === item.id}
                onClick={() => {
                  setRole(item.id)
                  setNotice('')
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="identity">{selectedRole.identity}</label>
            <input
              className="login-input"
              id="identity"
              name="identity"
              type="text"
              autoComplete="username"
              placeholder="Enter your campus email"
              required
            />

            <div className="password-label-row">
              <label className="field-label" htmlFor="password">Password</label>
              <button className="text-button" type="button" onClick={handlePasswordReset}>
                Forgot password?
              </button>
            </div>
            <div className="password-field">
              <input
                className="login-input"
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <label className="remember-option">
              <input type="checkbox" name="remember" />
              <span>Keep me signed in</span>
            </label>

            <button className="submit-button" type="submit" disabled={submitting}>
              <span>{submitting ? 'Signing in...' : `Sign in as ${selectedRole.label}`}</span>
              <span aria-hidden="true">&#8594;</span>
            </button>
            <p className="form-notice" role="status" aria-live="polite">{notice}</p>
          </form>

          <p className="access-help">Need an account? Contact your campus administrator.</p>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
