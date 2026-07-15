import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios.js'

const getUser = () => {
  try {
    const stored = localStorage.getItem('user')
    if (stored) {
      const u = JSON.parse(stored)
      if (!u.id && u._id) u.id = u._id.toString()
      return u
    }
    const token = localStorage.getItem('token')
    if (!token) return null
    const decoded = JSON.parse(atob(token.split('.')[1]))
    if (!decoded.id && decoded._id) decoded.id = decoded._id.toString()
    return decoded
  } catch { return null }
}

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function HomePage() {
  const user = getUser()
  const [jobs, setJobs] = useState([])
  const [stats, setStats] = useState({ jobs: 0, messages: 0, payments: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const jobsRes = await api.get('/jobs')
        setJobs(jobsRes.data.slice(0, 4))
        setStats((s) => ({ ...s, jobs: jobsRes.data.length }))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const isLoggedIn = !!user
  const isFreelancer = user?.role === 'freelancer'
  const isAdmin = user?.role === 'admin'

  return (
    <div className="home-dashboard">

      {/* ── Hero greeting ── */}
      <div className="home-hero">
        <div className="home-hero-text">
          <p className="home-greeting">{greeting()}, {user?.username || 'there'} 👋</p>
          <h1 className="home-title">
            {isFreelancer ? 'Find your next gig' : isAdmin ? 'Platform Overview' : 'Post a job, get it done'}
          </h1>
          <p className="home-subtitle">
            {isFreelancer
              ? 'Browse open jobs, submit proposals, and grow your freelance career.'
              : isAdmin
              ? 'Manage users, moderate jobs, and track platform earnings.'
              : 'Connect with skilled students and get your projects delivered fast.'}
          </p>
          <div className="home-hero-actions">
            {isFreelancer && <Link to="/jobs" className="button primary">Browse Jobs</Link>}
            {!isFreelancer && !isAdmin && <Link to="/jobs" className="button primary">Post a Job</Link>}
            {isAdmin && <Link to="/admin" className="button primary">Admin Panel</Link>}
            <Link to="/messages" className="button secondary">Messages</Link>
          </div>
        </div>
        <div className="home-hero-visual">
          <div className="home-orb" />
        </div>
      </div>

      {/* ── Quick stats ── */}
      {isLoggedIn && (
        <div className="home-stats">
          <div className="home-stat">
            <span className="home-stat-icon">🧾</span>
            <div>
              <div className="home-stat-num">{stats.jobs}</div>
              <div className="home-stat-label">Open Jobs</div>
            </div>
          </div>
          <div className="home-stat">
            <span className="home-stat-icon">💬</span>
            <div>
              <div className="home-stat-num">—</div>
              <div className="home-stat-label">Messages</div>
            </div>
          </div>
          <div className="home-stat">
            <span className="home-stat-icon">💳</span>
            <div>
              <div className="home-stat-num">—</div>
              <div className="home-stat-label">Payments</div>
            </div>
          </div>
          <div className="home-stat">
            <span className="home-stat-icon">⭐</span>
            <div>
              <div className="home-stat-num">—</div>
              <div className="home-stat-label">Reviews</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick action cards ── */}
      <div className="home-section">
        <h2 className="home-section-title">Quick Actions</h2>
        <div className="home-actions-grid">
          <Link to="/messages" className="home-action-card">
            <span className="home-action-icon" style={{ background: 'rgba(79,127,255,0.12)', color: 'var(--accent)' }}>💬</span>
            <div>
              <div className="home-action-title">Messages</div>
              <div className="home-action-desc">Chat with clients and freelancers in real time</div>
            </div>
            <span className="home-action-arrow">→</span>
          </Link>
          <Link to="/jobs" className="home-action-card">
            <span className="home-action-icon" style={{ background: 'rgba(5,150,105,0.12)', color: '#059669' }}>🧾</span>
            <div>
              <div className="home-action-title">{isFreelancer ? 'Find Jobs' : 'Post a Job'}</div>
              <div className="home-action-desc">{isFreelancer ? 'Browse open listings and submit proposals' : 'Post projects and receive bids from talent'}</div>
            </div>
            <span className="home-action-arrow">→</span>
          </Link>
          <Link to="/payments" className="home-action-card">
            <span className="home-action-icon" style={{ background: 'rgba(8,145,178,0.12)', color: '#0891b2' }}>💳</span>
            <div>
              <div className="home-action-title">Payments</div>
              <div className="home-action-desc">Manage escrow, track transactions and payouts</div>
            </div>
            <span className="home-action-arrow">→</span>
          </Link>
          <Link to="/my-profile" className="home-action-card">
            <span className="home-action-icon" style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}>👤</span>
            <div>
              <div className="home-action-title">My Profile</div>
              <div className="home-action-desc">Update your bio, skills, and portfolio</div>
            </div>
            <span className="home-action-arrow">→</span>
          </Link>
          {isAdmin && (
            <Link to="/admin" className="home-action-card">
              <span className="home-action-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>🛡</span>
              <div>
                <div className="home-action-title">Admin Panel</div>
                <div className="home-action-desc">Manage users, moderate jobs, track earnings</div>
              </div>
              <span className="home-action-arrow">→</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Recent open jobs ── */}
      <div className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">Latest Open Jobs</h2>
          <Link to="/jobs" className="home-see-all">See all →</Link>
        </div>
        {loading ? (
          <div className="home-jobs-skeleton">
            {[1,2,3,4].map((i) => <div key={i} className="home-job-skeleton" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="home-empty">No open jobs yet. {!isFreelancer && <Link to="/jobs">Post the first one →</Link>}</div>
        ) : (
          <div className="home-jobs-grid">
            {jobs.map((job) => (
              <Link to="/jobs" key={job._id} className="home-job-card">
                <div className="home-job-top">
                  <span className="home-job-category">{job.category}</span>
                  <span className="home-job-budget">${job.budget}</span>
                </div>
                <div className="home-job-title">{job.title}</div>
                <div className="home-job-desc">{job.description?.slice(0, 90)}…</div>
                <div className="home-job-footer">
                  <span className="home-job-by">by {job.postedBy?.username || 'Unknown'}</span>
                  <span className="home-job-deadline">
                    🗓 {new Date(job.deadline).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Getting started checklist (only for new/guest users) ── */}
      {!isLoggedIn && (
        <div className="home-section">
          <h2 className="home-section-title">Get Started</h2>
          <div className="home-checklist">
            <div className="home-check-item">
              <span className="home-check-num">1</span>
              <div>
                <div className="home-check-title">Create an account</div>
                <div className="home-check-desc">Sign up as a client or freelancer</div>
              </div>
              <Link to="/signup" className="button primary" style={{ marginLeft: 'auto', padding: '8px 18px', fontSize: '0.9rem' }}>Sign Up</Link>
            </div>
            <div className="home-check-item">
              <span className="home-check-num">2</span>
              <div>
                <div className="home-check-title">Post or find a job</div>
                <div className="home-check-desc">Browse listings or post your project</div>
              </div>
              <Link to="/jobs" className="button secondary" style={{ marginLeft: 'auto', padding: '8px 18px', fontSize: '0.9rem' }}>Browse</Link>
            </div>
            <div className="home-check-item">
              <span className="home-check-num">3</span>
              <div>
                <div className="home-check-title">Get paid securely</div>
                <div className="home-check-desc">Funds held in escrow until work is done</div>
              </div>
              <Link to="/payments" className="button secondary" style={{ marginLeft: 'auto', padding: '8px 18px', fontSize: '0.9rem' }}>Learn more</Link>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
