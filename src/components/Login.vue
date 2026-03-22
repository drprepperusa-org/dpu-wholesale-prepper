<template>
  <div class="login-page">
    <div class="login-card">
      <!-- Brand Header -->
      <div class="login-brand">
        <div class="brand-logo">🔥</div>
        <div class="brand-text">
          <div class="brand-name"><span>DR</span> Prepper</div>
          <div class="brand-tagline">Wholesale Portal</div>
        </div>
      </div>

      <!-- Customer Portal Only -->
      <div class="login-subtitle">Customer Portal</div>

      <!-- Error Banner -->
      <div v-if="errorMessage" class="login-error">
        ❌ {{ errorMessage }}
      </div>

      <!-- Success Banner -->
      <div v-if="successMessage" class="login-success">
        ✅ {{ successMessage }}
      </div>

      <!-- Sign In Form -->
      <div v-if="formMode === 'signin'" class="login-form">
        <div class="form-title">Sign In</div>

        <div class="form-group">
          <label>Email Address</label>
          <input
            type="email"
            v-model="email"
            placeholder="you@company.com"
            @keyup.enter="handleSignIn"
            :disabled="loading"
            autocomplete="email"
          >
        </div>

        <div class="form-group">
          <label>Password</label>
          <div class="pwd-field">
            <input
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              placeholder="••••••••"
              @keyup.enter="handleSignIn"
              :disabled="loading"
              autocomplete="current-password"
            >
            <button class="pwd-eye" type="button" @click="showPassword = !showPassword" tabindex="-1">
              {{ showPassword ? '🙈' : '👁' }}
            </button>
          </div>
        </div>

        <div class="form-options">
          <label class="remember-me">
            <input type="checkbox" v-model="rememberMe"> Remember me
          </label>
        </div>

        <button
          class="btn-signin"
          @click="handleSignIn"
          :disabled="loading"
        >
          <span v-if="loading" class="spinner">⟳</span>
          <span v-else>Sign In →</span>
        </button>

        <div v-if="registrationEnabled && mode === 'customer'" class="login-footer">
          <span class="footer-text">New customer?</span>
          <button class="link-btn" @click="formMode = 'register'">Create account</button>
        </div>

        <div class="demo-hint" v-if="mode === 'customer'">
          <span class="demo-label">Demo:</span>
          <button class="demo-fill" @click="fillDemo">buyer@happysnacks.com / demo1234</button>
        </div>
        <div class="demo-hint" v-if="mode === 'admin'">
          <span class="demo-label">Admin:</span>
          <button class="demo-fill" @click="fillAdminDemo">admin@drprepper.com</button>
        </div>
      </div>

      <!-- Create Account Form -->
      <div v-if="formMode === 'register'" class="login-form">
        <div class="form-title">Create Account</div>
        <div class="form-subtitle">Submit a request — admin will approve your account</div>

        <div class="form-group">
          <label>Company Name <span class="req">*</span></label>
          <input
            type="text"
            v-model="reg.companyName"
            placeholder="e.g. Happy Snacks Co."
            :disabled="loading"
          >
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Contact Name <span class="req">*</span></label>
            <input
              type="text"
              v-model="reg.contactName"
              placeholder="John Smith"
              :disabled="loading"
            >
          </div>
        </div>

        <div class="form-group">
          <label>Email <span class="req">*</span></label>
          <input
            type="email"
            v-model="reg.email"
            placeholder="buyer@company.com"
            :disabled="loading"
          >
        </div>

        <div class="form-group">
          <label>Phone</label>
          <input
            type="tel"
            v-model="reg.phone"
            placeholder="(555) 000-0000"
            :disabled="loading"
          >
        </div>

        <div class="form-group">
          <label>Password <span class="req">*</span></label>
          <div class="pwd-field">
            <input
              :type="showPassword ? 'text' : 'password'"
              v-model="reg.password"
              placeholder="Min 8 characters"
              @input="checkRegPwdStrength"
              :disabled="loading"
              autocomplete="new-password"
            >
            <button class="pwd-eye" type="button" @click="showPassword = !showPassword" tabindex="-1">
              {{ showPassword ? '🙈' : '👁' }}
            </button>
          </div>
          <div v-if="reg.password" class="pwd-strength">
            <div class="pwd-bar">
              <div class="pwd-fill" :style="{ width: (regPwdStrength / 5 * 100) + '%', background: regPwdColor }"></div>
            </div>
            <span class="pwd-label" :style="{ color: regPwdColor }">{{ regPwdLabel }}</span>
          </div>
        </div>

        <div class="form-group">
          <label>Confirm Password <span class="req">*</span></label>
          <input
            :type="showPassword ? 'text' : 'password'"
            v-model="reg.confirmPassword"
            placeholder="Repeat password"
            @keyup.enter="handleRegister"
            :disabled="loading"
            autocomplete="new-password"
          >
          <div v-if="reg.confirmPassword && reg.password !== reg.confirmPassword" class="field-error">
            Passwords don't match
          </div>
        </div>

        <button
          class="btn-signin"
          @click="handleRegister"
          :disabled="loading"
        >
          <span v-if="loading" class="spinner">⟳</span>
          <span v-else>Submit Request →</span>
        </button>

        <div class="login-footer">
          <span class="footer-text">Already have an account?</span>
          <button class="link-btn" @click="formMode = 'signin'">Sign in</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Login',
  emits: ['login'],
  data() {
    return {
      mode: 'customer',  // Always customer portal
      formMode: 'signin',
      email: '',
      password: '',
      rememberMe: false,
      showPassword: false,
      loading: false,
      errorMessage: '',
      successMessage: '',
      registrationEnabled: true,
      // Registration form
      reg: {
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
      },
      regPwdStrength: 0
    }
  },
  computed: {
    regPwdLabel() {
      const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
      return labels[this.regPwdStrength] || ''
    },
    regPwdColor() {
      const colors = ['', '#c0392b', '#e67e22', '#2980b9', '#2d7a4f', '#2d7a4f']
      return colors[this.regPwdStrength] || ''
    }
  },
  methods: {
    checkRegPwdStrength() {
      const val = this.reg.password
      let score = 0
      if (val.length >= 8) score++
      if (val.length >= 12) score++
      if (/[A-Z]/.test(val)) score++
      if (/[0-9]/.test(val)) score++
      if (/[^A-Za-z0-9]/.test(val)) score++
      this.regPwdStrength = score
    },
    validateEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    },
    async handleSignIn() {
      this.errorMessage = ''
      this.successMessage = ''

      if (!this.email || !this.password) {
        this.errorMessage = 'Please enter your email and password'
        return
      }
      if (!this.validateEmail(this.email)) {
        this.errorMessage = 'Please enter a valid email address'
        return
      }

      this.loading = true

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: this.email, password: this.password })
        })

        const data = await res.json()

        if (!res.ok) {
          this.errorMessage = data.error || 'Sign in failed. Please check your credentials.'
          return
        }

        // Store token + user info
        localStorage.setItem('token', data.token)
        const userObj = data.vendor || data.customer || {}
        localStorage.setItem('user', JSON.stringify(userObj))

        // Role comes from API response (JWT claim), not frontend logic
        const role = data.role || userObj.role || 'customer'
        localStorage.setItem('userRole', role)

        // Emit login event so parent can switch views
        this.$emit('login', {
          token: data.token,
          user: userObj,
          role
        })
      } catch (err) {
        console.error('Login error:', err)
        this.errorMessage = 'Connection error. Please try again.'
      } finally {
        this.loading = false
      }
    },
    async handleRegister() {
      this.errorMessage = ''
      this.successMessage = ''

      if (!this.reg.companyName || !this.reg.contactName || !this.reg.email || !this.reg.password) {
        this.errorMessage = 'Please fill in all required fields'
        return
      }
      if (!this.validateEmail(this.reg.email)) {
        this.errorMessage = 'Please enter a valid email address'
        return
      }
      if (this.reg.password.length < 8) {
        this.errorMessage = 'Password must be at least 8 characters'
        return
      }
      if (this.reg.password !== this.reg.confirmPassword) {
        this.errorMessage = 'Passwords do not match'
        return
      }

      this.loading = true

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: this.reg.companyName,
            contactName: this.reg.contactName,
            email: this.reg.email,
            phone: this.reg.phone,
            password: this.reg.password
          })
        })

        const data = await res.json()

        if (!res.ok) {
          this.errorMessage = data.error || 'Registration failed. Please try again.'
          return
        }

        this.successMessage = 'Account request submitted! Admin will review and approve your account.'
        this.formMode = 'signin'
        this.reg = { companyName: '', contactName: '', email: '', phone: '', password: '', confirmPassword: '' }
        this.regPwdStrength = 0
      } catch (err) {
        console.error('Register error:', err)
        this.errorMessage = 'Connection error. Please try again.'
      } finally {
        this.loading = false
      }
    },
    async loadRegistrationSetting() {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          // API returns { success: true, settings: { key: value, ... } }
          if (data.settings) {
            // API uses 'allow_registration' key
            const val = data.settings.allow_registration ?? data.settings.registration_enabled
            this.registrationEnabled = val === undefined ? true : (val === 'true' || val === true)
          }
        }
      } catch (e) {
        this.registrationEnabled = true // Default to enabled if can't load
      }
    }
  },
  mounted() {
    this.loadRegistrationSetting()
  }
}
</script>

<style scoped>
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
</style>
