'use client';

import React, { useState, useEffect } from 'react'
import { Flame, Eye, EyeOff, XCircle, CheckCircle, ArrowRight, Loader2 } from 'lucide-react'

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

  const [reg, setReg] = useState({
    companyName: '', contactName: '', email: '', phone: '', password: '', confirmPassword: ''
  })
  const [regPwdStrength, setRegPwdStrength] = useState(0)
  const mode = 'customer'

  const regPwdLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][regPwdStrength] || ''
  const regPwdColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#10b981'][regPwdStrength] || ''

  useEffect(() => { loadRegistrationSetting() }, [])

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

  useEffect(() => { checkRegPwdStrength() }, [reg.password])

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSignIn = async () => {
    setErrorMessage(''); setSuccessMessage('')
    if (!email || !password) { setErrorMessage('Please enter your email and password'); return }
    if (!validateEmail(email)) { setErrorMessage('Please enter a valid email address'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) { setErrorMessage(data.error || 'Sign in failed. Please check your credentials.'); return }
      const userObj = data.vendor || data.customer || {}
      const role = data.role || userObj.role || 'customer'
      onLogin({ token: data.token, user: userObj, role })
    } catch (err) {
      console.error('Login error:', err)
      setErrorMessage('Connection error. Please try again.')
    } finally { setLoading(false) }
  }

  const handleRegister = async () => {
    setErrorMessage(''); setSuccessMessage('')
    if (!reg.companyName || !reg.contactName || !reg.email || !reg.password) { setErrorMessage('Please fill in all required fields'); return }
    if (!validateEmail(reg.email)) { setErrorMessage('Please enter a valid email address'); return }
    if (reg.password.length < 8) { setErrorMessage('Password must be at least 8 characters'); return }
    if (reg.password !== reg.confirmPassword) { setErrorMessage('Passwords do not match'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: reg.companyName, contactName: reg.contactName, email: reg.email, phone: reg.phone, password: reg.password })
      })
      const data = await res.json()
      if (!res.ok) { setErrorMessage(data.error || 'Registration failed. Please try again.'); return }
      setSuccessMessage('Account request submitted! Admin will review and approve your account.')
      setFormMode('signin')
      setReg({ companyName: '', contactName: '', email: '', phone: '', password: '', confirmPassword: '' })
      setRegPwdStrength(0)
    } catch (err) {
      console.error('Register error:', err)
      setErrorMessage('Connection error. Please try again.')
    } finally { setLoading(false) }
  }

  const loadRegistrationSetting = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.settings) {
          const val = data.settings.allow_registration ?? data.settings.registration_enabled
          setRegistrationEnabled(val === undefined ? true : (val === 'true' || val === true))
        }
      }
    } catch (e) { setRegistrationEnabled(true) }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5 font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-[400px] p-8 max-sm:p-6 max-sm:rounded-xl">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-indigo-500 rounded-xl flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-800 tracking-tight leading-tight">
              <span className="text-indigo-500">DR</span> Prepper
            </div>
            <div className="text-[11px] text-slate-400 font-medium tracking-wide">Wholesale Portal</div>
          </div>
        </div>

        <div className="text-[13px] text-slate-400 font-medium tracking-wide mb-5">Customer Portal</div>

        {errorMessage && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3.5 py-2.5 text-[13px] font-medium mb-3.5">
            <XCircle className="w-4 h-4 shrink-0" /> {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg px-3.5 py-2.5 text-[13px] font-medium mb-3.5">
            <CheckCircle className="w-4 h-4 shrink-0" /> {successMessage}
          </div>
        )}

        {formMode === 'signin' && (
          <div className="flex flex-col gap-3.5">
            <div className="text-xl font-bold text-slate-800 tracking-tight">Sign In</div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
                onKeyUp={(e) => e.key === 'Enter' && handleSignIn()} disabled={loading} autoComplete="email"
                className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  onKeyUp={(e) => e.key === 'Enter' && handleSignIn()} disabled={loading} autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400 focus:bg-white disabled:opacity-60" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex="-1"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-600 transition-colors p-1">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                  className="cursor-pointer accent-indigo-500" />
                Remember me
              </label>
            </div>

            <button onClick={handleSignIn} disabled={loading}
              className="w-full py-3 bg-indigo-500 border-none rounded-xl text-white font-semibold text-[15px] cursor-pointer transition-all flex items-center justify-center gap-2 hover:bg-indigo-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </button>

            {registrationEnabled && mode === 'customer' && (
              <div className="flex items-center justify-center gap-1.5 text-[13px] text-slate-400">
                <span>New customer?</span>
                <button onClick={() => setFormMode('register')}
                  className="border-none bg-transparent text-indigo-500 font-semibold text-[13px] cursor-pointer p-0 underline hover:text-indigo-700">
                  Create account
                </button>
              </div>
            )}
          </div>
        )}

        {formMode === 'register' && (
          <div className="flex flex-col gap-3.5">
            <div className="text-xl font-bold text-slate-800 tracking-tight">Create Account</div>
            <div className="text-xs text-slate-400 -mt-2 leading-relaxed">Submit a request — admin will approve your account</div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Company Name <span className="text-red-500">*</span></label>
              <input type="text" value={reg.companyName} onChange={(e) => setReg({...reg, companyName: e.target.value})}
                placeholder="e.g. Happy Snacks Co." disabled={loading}
                className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400 focus:bg-white disabled:opacity-60" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Contact Name <span className="text-red-500">*</span></label>
              <input type="text" value={reg.contactName} onChange={(e) => setReg({...reg, contactName: e.target.value})}
                placeholder="John Smith" disabled={loading}
                className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400 focus:bg-white disabled:opacity-60" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Email <span className="text-red-500">*</span></label>
              <input type="email" name="reg-email" autoComplete="email" value={reg.email} onChange={(e) => setReg({...reg, email: e.target.value})}
                placeholder="buyer@company.com" disabled={loading}
                className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400 focus:bg-white disabled:opacity-60" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Phone</label>
              <input type="tel" name="reg-phone" autoComplete="tel" value={reg.phone} onChange={(e) => setReg({...reg, phone: e.target.value})}
                placeholder="(555) 000-0000" disabled={loading}
                className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400 focus:bg-white disabled:opacity-60" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={reg.password} onChange={(e) => setReg({...reg, password: e.target.value})}
                  placeholder="Min 8 characters" disabled={loading} autoComplete="new-password"
                  className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400 focus:bg-white disabled:opacity-60" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex="-1"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-600 transition-colors p-1">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {reg.password && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: (regPwdStrength / 5 * 100) + '%', background: regPwdColor }} />
                  </div>
                  <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: regPwdColor }}>{regPwdLabel}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Confirm Password <span className="text-red-500">*</span></label>
              <input type={showPassword ? 'text' : 'password'} value={reg.confirmPassword} onChange={(e) => setReg({...reg, confirmPassword: e.target.value})}
                placeholder="Repeat password" onKeyUp={(e) => e.key === 'Enter' && handleRegister()} disabled={loading} autoComplete="new-password"
                className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400 focus:bg-white disabled:opacity-60" />
              {reg.confirmPassword && reg.password !== reg.confirmPassword && (
                <div className="text-[11px] text-red-500 font-medium">Passwords don&apos;t match</div>
              )}
            </div>

            <button onClick={handleRegister} disabled={loading}
              className="w-full py-3 bg-indigo-500 border-none rounded-xl text-white font-semibold text-[15px] cursor-pointer transition-all flex items-center justify-center gap-2 hover:bg-indigo-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Submit Request <ArrowRight className="w-4 h-4" /></>}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[13px] text-slate-400">
              <span>Already have an account?</span>
              <button onClick={() => setFormMode('signin')}
                className="border-none bg-transparent text-indigo-500 font-semibold text-[13px] cursor-pointer p-0 underline hover:text-indigo-700">
                Sign in
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Login
