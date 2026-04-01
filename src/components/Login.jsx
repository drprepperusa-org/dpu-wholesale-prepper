'use client';
import React, { useState, useEffect } from 'react'

function Login({ onLogin }) {
  const [formMode, setFormMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  
  // Registration form
  const [reg, setReg] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [regPwdStrength, setRegPwdStrength] = useState(0)
  const mode = 'customer' // Always customer portal

  const fillDemo = () => {
    setEmail('buyer@happysnacks.com')
    setPassword('demo1234')
  }

  const fillAdminDemo = () => {
    setEmail('admin@drprepper.com')
    setPassword('')
  }

  const regPwdLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][regPwdStrength] || ''
  const regPwdColor = ['', '#c0392b', '#e67e22', '#2980b9', '#2d7a4f', '#2d7a4f'][regPwdStrength] || ''

  useEffect(() => {
    loadRegistrationSetting()
  }, [])

  const checkRegPwdStrength = () => {
    const val = reg.password
    let score = 0
    if (val.length >= 8) score++
    if (val.length >= 12) score++
    if (/[A-Z]/.test(val)) score++
    if (/[0-9]/.test(val)) score++
    if (/[^A-Za-z0-9]/.test(val)) score++
    setRegPwdStrength(score)
  }

  useEffect(() => {
    checkRegPwdStrength()
  }, [reg.password])

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSignIn = async () => {
    setErrorMessage('')
    setSuccessMessage('')

    if (!email || !password) {
      setErrorMessage('Please enter your email and password')
      return
    }
    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error || 'Sign in failed. Please check your credentials.')
        return
      }

      // Store token + user info
      localStorage.setItem('token', data.token)
      
      // server.js returns 'vendor' for admin users and 'customer' for clients
      const userObj = data.vendor || data.customer || {}
      localStorage.setItem('user', JSON.stringify(userObj))

      // Ensure consistent role storage
      const role = data.role || userObj.role || 'customer'
      localStorage.setItem('userRole', role)
      
      // Store duplicate keys for App.jsx initialization compatibility
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('userInfo', JSON.stringify({ ...userObj, role }))

      // Emit login event so parent can switch views
      onLogin({
        token: data.token,
        user: userObj,
        role
      })
    } catch (err) {
      console.error('Login error:', err)
      setErrorMessage('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setErrorMessage('')
    setSuccessMessage('')

    if (!reg.companyName || !reg.contactName || !reg.email || !reg.password) {
      setErrorMessage('Please fill in all required fields')
      return
    }
    if (!validateEmail(reg.email)) {
      setErrorMessage('Please enter a valid email address')
      return
    }
    if (reg.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters')
      return
    }
    if (reg.password !== reg.confirmPassword) {
      setErrorMessage('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: reg.companyName,
          contactName: reg.contactName,
          email: reg.email,
          phone: reg.phone,
          password: reg.password
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error || 'Registration failed. Please try again.')
        return
      }

      setSuccessMessage('Account request submitted! Admin will review and approve your account.')
      setFormMode('signin')
      setReg({ companyName: '', contactName: '', email: '', phone: '', password: '', confirmPassword: '' })
      setRegPwdStrength(0)
    } catch (err) {
      console.error('Register error:', err)
      setErrorMessage('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadRegistrationSetting = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        // API returns { success: true, settings: { key: value, ... } }
        if (data.settings) {
          // API uses 'allow_registration' key
          const val = data.settings.allow_registration ?? data.settings.registration_enabled
          setRegistrationEnabled(val === undefined ? true : (val === 'true' || val === true))
        }
      }
    } catch (e) {
      setRegistrationEnabled(true) // Default to enabled if can't load
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand">
          <div className="brand-logo">🔥</div>
          <div className="brand-text">
            <div className="brand-name"><span>DR</span> Prepper</div>
            <div className="brand-tagline">Wholesale Portal</div>
          </div>
        </div>

        {/* Customer Portal Only */}
        <div className="login-subtitle">Customer Portal</div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="login-error">
            ❌ {errorMessage}
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="login-success">
            ✅ {successMessage}
          </div>
        )}

        {/* Sign In Form */}
        {formMode === 'signin' && (
          <div className="login-form">
            <div className="form-title">Sign In</div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                onKeyUp={(e) => e.key === 'Enter' && handleSignIn()}
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="pwd-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  onKeyUp={(e) => e.key === 'Enter' && handleSignIn()}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button 
                  className="pwd-eye" 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
            </div>

            <button
              className="btn-signin"
              onClick={handleSignIn}
              disabled={loading}
            >
              {loading ? <span className="spinner">⟳</span> : 'Sign In →'}
            </button>

            {registrationEnabled && mode === 'customer' && (
              <div className="login-footer">
                <span className="footer-text">New customer?</span>
                <button className="link-btn" onClick={() => setFormMode('register')}>Create account</button>
              </div>
            )}

            {mode === 'customer' && (
              <div className="demo-hint">
                <span className="demo-label">Demo:</span>
                <button className="demo-fill" onClick={fillDemo}>buyer@happysnacks.com / demo1234</button>
              </div>
            )}
            {mode === 'admin' && (
              <div className="demo-hint">
                <span className="demo-label">Admin:</span>
                <button className="demo-fill" onClick={fillAdminDemo}>admin@drprepper.com</button>
              </div>
            )}
          </div>
        )}

        {/* Create Account Form */}
        {formMode === 'register' && (
          <div className="login-form">
            <div className="form-title">Create Account</div>
            <div className="form-subtitle">Submit a request — admin will approve your account</div>

            <div className="form-group">
              <label>Company Name <span className="req">*</span></label>
              <input
                type="text"
                value={reg.companyName}
                onChange={(e) => setReg({...reg, companyName: e.target.value})}
                placeholder="e.g. Happy Snacks Co."
                disabled={loading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Contact Name <span className="req">*</span></label>
                <input
                  type="text"
                  value={reg.contactName}
                  onChange={(e) => setReg({...reg, contactName: e.target.value})}
                  placeholder="John Smith"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email <span className="req">*</span></label>
              <input
                type="email"
                value={reg.email}
                onChange={(e) => setReg({...reg, email: e.target.value})}
                placeholder="buyer@company.com"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={reg.phone}
                onChange={(e) => setReg({...reg, phone: e.target.value})}
                placeholder="(555) 000-0000"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password <span className="req">*</span></label>
              <div className="pwd-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={reg.password}
                  onChange={(e) => setReg({...reg, password: e.target.value})}
                  placeholder="Min 8 characters"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button className="pwd-eye" type="button" onClick={() => setShowPassword(!showPassword)} tabIndex="-1">
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {reg.password && (
                <div className="pwd-strength">
                  <div className="pwd-bar">
                    <div 
                      className="pwd-fill" 
                      style={{ 
                        width: (regPwdStrength / 5 * 100) + '%', 
                        background: regPwdColor 
                      }}
                    ></div>
                  </div>
                  <span className="pwd-label" style={{ color: regPwdColor }}>{regPwdLabel}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Confirm Password <span className="req">*</span></label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={reg.confirmPassword}
                onChange={(e) => setReg({...reg, confirmPassword: e.target.value})}
                placeholder="Repeat password"
                onKeyUp={(e) => e.key === 'Enter' && handleRegister()}
                disabled={loading}
                autoComplete="new-password"
              />
              {reg.confirmPassword && reg.password !== reg.confirmPassword && (
                <div className="field-error">
                  Passwords don't match
                </div>
              )}
            </div>

            <button
              className="btn-signin"
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? <span className="spinner">⟳</span> : <span>Submit Request →</span>}
            </button>

            <div className="login-footer">
              <span className="footer-text">Already have an account?</span>
              <button className="link-btn" onClick={() => setFormMode('signin')}>Sign in</button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        :root {
          --bg: #f5f4f0;
          --surface: #fff;
          --border: #e2ddd8;
          --red: #c0392b;
          --red-light: #f9eeec;
          --red-mid: #e8c5c0;
          --text: #1a1a18;
          --sub: #5a5750;
          --muted: #9a948c;
          --green: #2d7a4f;
          --green-bg: #edf6f1;
          --shadow: 0 1px 3px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04);
          --shadow-lg: 0 20px 60px rgba(0,0,0,0.18);
          --radius: 10px;
        }

        .login-page {
          min-height: 100vh;
          background: var(--bg, #f5f4f0);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'DM Sans', sans-serif;
        }

        .login-card {
          background: var(--surface, #fff);
          border: 1px solid var(--border, #e2ddd8);
          border-radius: 18px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.12);
          width: 100%;
          max-width: 400px;
          padding: 32px 28px;
        }

        .login-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .brand-logo {
          width: 44px;
          height: 44px;
          background: #c0392b;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-name {
          font-size: 18px;
          font-weight: 700;
          color: var(--text, #1a1a18);
          letter-spacing: -0.4px;
          line-height: 1.2;
        }

        .brand-name span {
          color: #c0392b;
        }

        .brand-tagline {
          font-size: 11px;
          color: var(--muted, #9a948c);
          font-weight: 500;
          letter-spacing: 0.3px;
        }

        .login-subtitle {
          font-size: 13px;
          color: var(--muted, #9a948c);
          font-weight: 500;
          letter-spacing: 0.3px;
          margin-bottom: 20px;
        }

        .login-error {
          background: #fdf0ef;
          border: 1px solid #f0c5c0;
          color: #b03a2e;
          border-radius: 9px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 14px;
          font-weight: 500;
        }

        .login-success {
          background: #edf6f1;
          border: 1px solid #b7dfca;
          color: #2d7a4f;
          border-radius: 9px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 14px;
          font-weight: 500;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text, #1a1a18);
          letter-spacing: -0.4px;
        }

        .form-subtitle {
          font-size: 12px;
          color: var(--muted, #9a948c);
          margin-top: -8px;
          line-height: 1.5;
        }

        .form-row {
          display: flex;
          gap: 10px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
          flex: 1;
        }

        .form-group label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--muted, #9a948c);
        }

        .req {
          color: #c0392b;
        }

        .form-group input {
          padding: 10px 12px;
          border: 1px solid var(--border, #e2ddd8);
          border-radius: 9px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: var(--text, #1a1a18);
          background: var(--bg, #f5f4f0);
          outline: none;
          transition: border-color 0.15s, background 0.15s;
        }

        .form-group input:focus {
          border-color: #c0392b;
          background: #fff;
        }

        .form-group input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pwd-field {
          position: relative;
        }

        .pwd-field input {
          width: 100%;
          padding-right: 40px;
        }

        .pwd-eye {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          padding: 2px;
          opacity: 0.6;
          transition: opacity 0.15s;
        }

        .pwd-eye:hover {
          opacity: 1;
        }

        .pwd-strength {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }

        .pwd-bar {
          flex: 1;
          height: 4px;
          background: #e2ddd8;
          border-radius: 2px;
          overflow: hidden;
        }

        .pwd-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s, background 0.3s;
        }

        .pwd-label {
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
        }

        .field-error {
          font-size: 11px;
          color: #c0392b;
          font-weight: 500;
        }

        .form-options {
          display: flex;
          align-items: center;
        }

        .remember-me {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--sub, #5a5750);
          cursor: pointer;
        }

        .remember-me input {
          cursor: pointer;
          accent-color: #c0392b;
        }

        .btn-signin {
          width: 100%;
          padding: 12px;
          background: #c0392b;
          border: none;
          border-radius: 10px;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.18s;
          letter-spacing: -0.2px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-signin:hover:not(:disabled) {
          background: #a93226;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(192,57,43,0.35);
        }

        .btn-signin:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .spinner {
          display: inline-block;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .login-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 13px;
          color: var(--muted, #9a948c);
        }

        .link-btn {
          border: none;
          background: transparent;
          color: #c0392b;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
        }

        .link-btn:hover {
          color: #a93226;
        }

        .demo-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          color: var(--muted, #9a948c);
        }

        .demo-label {
          font-weight: 600;
        }

        .demo-fill {
          border: none;
          background: transparent;
          color: var(--muted, #9a948c);
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          transition: color 0.15s;
        }

        .demo-fill:hover {
          color: #c0392b;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 24px 20px;
            border-radius: 14px;
          }

          .login-page {
            align-items: flex-start;
            padding-top: 40px;
          }
        }
      `}</style>
    </div>
  )
}

export default Login
