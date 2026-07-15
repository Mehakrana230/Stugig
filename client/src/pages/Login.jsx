import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios.js'
import GoogleAuthButton from '../components/GoogleAuthButton.jsx'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const response = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      navigate('/')
    } catch (err) {
      console.error(err)
      if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else if (err.request) {
        setError('Unable to reach the backend. Make sure the server and database are running.')
      } else {
        setError('Login failed. Please check your credentials.')
      }
    }
  }

  return (
    <main className="page-shell">
      <section className="home-panel">
        <h1>Login</h1>
        <p>Enter your email and password to access messages.</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px' }}>
            <Link to="/forgot-password" style={{ color: 'var(--accent)', fontSize: '0.88rem' }}>
              Forgot password?
            </Link>
          </div>
          <button type="submit" className="button primary">
            Login
          </button>
        </form>
        <p>
          Need an account? <Link to="/signup">Sign up</Link>
        </p>
        <GoogleAuthButton label="Continue with Google" />
      </section>
    </main>
  )
}
