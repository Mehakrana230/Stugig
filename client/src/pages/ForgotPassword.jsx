import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios.js'

// step 1 = enter email, step 2 = enter OTP, step 3 = new password, step 4 = success
export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const navigate = useNavigate()

  const startCooldown = () => {
    setResendCooldown(60)
    const t = setInterval(() => {
      setResendCooldown(s => { if (s <= 1) { clearInterval(t); return 0 } return s - 1 })
    }, 1000)
  }

  // Step 1 — send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError(''); setInfo('')
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email })
      if (res.data.otp) {
        setDevOtp(res.data.otp)
        setInfo('Email not configured — your test OTP is shown below.')
      } else {
        setInfo(`OTP sent to ${email}. Check your inbox.`)
      }
      setStep(2)
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.')
    } finally { setLoading(false) }
  }

  // Step 2 — verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) { setError('Enter the 6-digit OTP.'); return }
    setError('')
    setStep(3)
  }

  // Step 3 — set new password
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword })
      setStep(4)
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Please try again.')
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError(''); setDevOtp('')
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email })
      if (res.data.otp) { setDevOtp(res.data.otp); setInfo('New test OTP generated.') }
      else setInfo('New OTP sent to your email.')
      startCooldown()
    } catch (err) { setError(err.response?.data?.message || 'Failed to resend.') }
    finally { setLoading(false) }
  }

  const STEPS = ['Email', 'Verify OTP', 'New Password']

  return (
    <main className="page-shell">
      <section className="home-panel">

        {/* Step indicator */}
        {step < 4 && (
          <div className="otp-steps">
            {STEPS.map((label, i) => (
              <>
                <div key={label} className={`otp-step ${step >= i + 1 ? 'active' : ''}`}>
                  <span className="otp-step-num">{i + 1}</span>
                  <span>{label}</span>
                </div>
                {i < STEPS.length - 1 && <div key={`line-${i}`} className="otp-step-line" />}
              </>
            ))}
          </div>
        )}

        {/* ── Step 1: Enter email ── */}
        {step === 1 && (
          <>
            <h1 style={{ marginTop: '24px' }}>Forgot Password</h1>
            <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
              Enter your registered email address and we'll send you a verification code to reset your password.
            </p>
            <form className="login-form" onSubmit={handleSendOtp} style={{ marginTop: '20px' }}>
              <label>
                Email address
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="you@example.com" autoFocus
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="button primary" disabled={loading}>
                {loading ? 'Sending OTP…' : 'Send Verification Code →'}
              </button>
            </form>
            <p style={{ marginTop: '16px', color: 'var(--muted)', fontSize: '0.9rem' }}>
              Remembered it? <Link to="/login" style={{ color: 'var(--accent)' }}>Back to Login</Link>
            </p>
          </>
        )}

        {/* ── Step 2: Enter OTP ── */}
        {step === 2 && (
          <>
            <h1 style={{ marginTop: '24px' }}>Check your email</h1>
            <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
              We sent a 6-digit code to <strong style={{ color: 'var(--text)' }}>{email}</strong>.<br />
              It expires in 10 minutes.
            </p>

            {devOtp && (
              <div className="otp-dev-box">
                <span>🛠 Dev mode — email not configured</span>
                <div className="otp-dev-code">{devOtp}</div>
              </div>
            )}
            {info && !devOtp && <p className="otp-info">{info}</p>}

            <form className="login-form" onSubmit={handleVerifyOtp} style={{ marginTop: '24px' }}>
              <label>
                Verification code
                <input
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6} placeholder="000000" autoFocus inputMode="numeric"
                  className="otp-input" required
                  style={{ fontSize: '1.8rem', letterSpacing: '12px', textAlign: 'center', padding: '14px', borderRadius: '14px', border: '2px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', width: '100%', boxSizing: 'border-box' }}
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="button primary" disabled={otp.length !== 6}>
                Verify Code →
              </button>
            </form>

            <div style={{ marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || loading}
                style={{ background: 'none', border: 'none', color: resendCooldown > 0 ? 'var(--muted)' : 'var(--accent)', cursor: resendCooldown > 0 ? 'default' : 'pointer', fontSize: '0.9rem', padding: 0 }}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
              <button type="button" onClick={() => { setStep(1); setOtp(''); setError(''); setDevOtp('') }}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>
                ← Change email
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: New password ── */}
        {step === 3 && (
          <>
            <h1 style={{ marginTop: '24px' }}>Set New Password</h1>
            <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
              Choose a strong password for your account.
            </p>
            <form className="login-form" onSubmit={handleResetPassword} style={{ marginTop: '20px' }}>
              <label>
                New password
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    required minLength={6} placeholder="At least 6 characters" autoFocus
                    style={{ paddingRight: '48px' }}
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </label>

              {/* Password strength indicator */}
              {newPassword && (
                <div style={{ marginTop: '-6px' }}>
                  {(() => {
                    const strong = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword)
                    const medium = newPassword.length >= 6
                    const label = strong ? 'Strong' : medium ? 'Medium' : 'Weak'
                    const color = strong ? '#059669' : medium ? '#d97706' : '#dc2626'
                    const width  = strong ? '100%' : medium ? '60%' : '30%'
                    return (
                      <div>
                        <div style={{ height: '4px', borderRadius: '999px', background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width, background: color, transition: 'width 300ms' }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', color, marginTop: '4px', display: 'block' }}>{label} password</span>
                      </div>
                    )
                  })()}
                </div>
              )}

              <label>
                Confirm password
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  required placeholder="Repeat your password"
                />
              </label>
              {confirmPassword && newPassword !== confirmPassword && (
                <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '-6px 0 0' }}>Passwords do not match</p>
              )}
              {error && <p className="form-error">{error}</p>}

              <button type="submit" className="button primary" disabled={loading || newPassword !== confirmPassword}>
                {loading ? 'Resetting…' : '🔒 Reset Password'}
              </button>
            </form>
          </>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>✅</div>
            <h1 style={{ marginBottom: '8px' }}>Password Reset!</h1>
            <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: '28px' }}>
              Your password has been updated successfully.<br />
              You can now log in with your new password.
            </p>
            <button className="button primary" style={{ padding: '12px 32px', fontSize: '1rem' }}
              onClick={() => navigate('/login')}>
              Go to Login →
            </button>
          </div>
        )}

      </section>
    </main>
  )
}
