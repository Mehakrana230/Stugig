import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios.js'
import GoogleAuthButton from '../components/GoogleAuthButton.jsx'

export default function SignupPage() {
  const [step, setStep] = useState(1) // 1 = form, 2 = otp
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'freelancer' })
  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState('') // shown when email not configured
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const startCooldown = () => {
    setResendCooldown(60)
    const t = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(t); return 0 }
        return s - 1
      })
    }, 1000)
  }

  // Step 1 — validate form and send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const res = await api.post('/auth/send-otp', { email: form.email })
      // Dev mode: server returns the OTP directly when email isn't configured
      if (res.data.otp) {
        setDevOtp(res.data.otp)
        setInfo(`Email not configured — your test OTP is shown below.`)
      } else {
        setInfo(`OTP sent to ${form.email}. Check your inbox.`)
      }
      setStep(2)
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2 — submit signup with OTP
  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await api.post('/auth/signup', { ...form, otp })
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/send-otp', { email: form.email })
      if (res.data.otp) {
        setDevOtp(res.data.otp)
        setInfo('New test OTP generated.')
      } else {
        setInfo('New OTP sent to your email.')
      }
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="home-panel">

        {/* Step indicator */}
        <div className="otp-steps">
          <div className={`otp-step ${step >= 1 ? 'active' : ''}`}>
            <span className="otp-step-num">1</span>
            <span>Your details</span>
          </div>
          <div className="otp-step-line" />
          <div className={`otp-step ${step >= 2 ? 'active' : ''}`}>
            <span className="otp-step-num">2</span>
            <span>Verify email</span>
          </div>
        </div>

        {/* ── Step 1: Fill form ── */}
        {step === 1 && (
          <>
            <h1 style={{ marginTop: '24px' }}>Create your account</h1>
            <p style={{ color: 'var(--muted)' }}>Join StuGig as a client or freelancer.</p>
            <form className="login-form" onSubmit={handleSendOtp}>
              <label>
                Username
                <input
                  name="username" value={form.username} onChange={handleChange}
                  required minLength={3} maxLength={24} placeholder="e.g. john_dev"
                />
              </label>
              <label>
                Email
                <input
                  type="email" name="email" value={form.email} onChange={handleChange}
                  required placeholder="you@example.com"
                />
              </label>
              <label>
                Password
                <input
                  type="password" name="password" value={form.password} onChange={handleChange}
                  required minLength={6} placeholder="At least 6 characters"
                />
              </label>
              <label>
                Role
                <select name="role" value={form.role} onChange={handleChange}>
                  <option value="freelancer">Freelancer — I want to find work</option>
                  <option value="client">Client — I want to hire talent</option>
                </select>
              </label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="button primary" disabled={loading}>
                {loading ? 'Sending OTP…' : 'Send Verification Code →'}
              </button>
            </form>
            <p style={{ marginTop: '16px', color: 'var(--muted)', fontSize: '0.9rem' }}>
              Already have an account? <Link to="/login" style={{ color: 'var(--accent)' }}>Login</Link>
            </p>
            <GoogleAuthButton role={form.role} label="Continue with Google" />
          </>
        )}

        {/* ── Step 2: Enter OTP ── */}
        {step === 2 && (
          <>
            <h1 style={{ marginTop: '24px' }}>Verify your email</h1>
            <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
              We sent a 6-digit code to <strong style={{ color: 'var(--text)' }}>{form.email}</strong>.<br />
              Enter it below to complete your signup.
            </p>

            {/* Dev mode OTP display */}
            {devOtp && (
              <div className="otp-dev-box">
                <span>🛠 Dev mode — email not configured</span>
                <div className="otp-dev-code">{devOtp}</div>
              </div>
            )}

            {info && !devOtp && <p className="otp-info">{info}</p>}

            <form className="login-form" onSubmit={handleSignup} style={{ marginTop: '24px' }}>
              <label>
                Verification code
                <div className="otp-input-row">
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    placeholder="000000"
                    className="otp-input"
                    autoFocus
                    inputMode="numeric"
                    required
                  />
                </div>
              </label>
              {error && <p className="form-error">{error}</p>}
              <button
                type="submit"
                className="button primary"
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Creating account…' : 'Verify & Create Account'}
              </button>
            </form>

            <div style={{ marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                style={{ background: 'none', border: 'none', color: resendCooldown > 0 ? 'var(--muted)' : 'var(--accent)', cursor: resendCooldown > 0 ? 'default' : 'pointer', fontSize: '0.9rem', padding: 0 }}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(''); setError(''); setDevOtp('') }}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}
              >
                ← Change email
              </button>
            </div>
          </>
        )}

      </section>
    </main>
  )
}
