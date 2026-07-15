import { useEffect, useState } from 'react'
import api from '../api/axios.js'

const TABS = ['Overview', 'Users', 'Jobs', 'Earnings']

const roleBadge = (role) => {
  const colors = { admin: '#7c3aed', client: '#0891b2', freelancer: '#059669' }
  return (
    <span style={{
      display: 'inline-flex', padding: '3px 10px', borderRadius: '999px',
      background: colors[role] ? colors[role] + '22' : '#ffffff11',
      color: colors[role] || 'var(--muted)', fontSize: '0.8rem', fontWeight: 600,
      textTransform: 'capitalize',
    }}>{role}</span>
  )
}

const statusBadge = (status) => {
  const colors = { open: '#059669', closed: '#6b7280', completed: '#0891b2', cancelled: '#dc2626' }
  return (
    <span style={{
      display: 'inline-flex', padding: '3px 10px', borderRadius: '999px',
      background: colors[status] ? colors[status] + '22' : '#ffffff11',
      color: colors[status] || 'var(--muted)', fontSize: '0.8rem', fontWeight: 600,
      textTransform: 'capitalize',
    }}>{status}</span>
  )
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [users, setUsers] = useState([])
  const [jobs, setJobs] = useState([])
  const [earnings, setEarnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [toast, setToast] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [jobSearch, setJobSearch] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, jobsRes, earningsRes] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/jobs'),
          api.get('/admin/earnings'),
        ])
        setUsers(usersRes.data)
        setJobs(jobsRes.data)
        setEarnings(earningsRes.data)
      } catch (err) {
        console.error(err)
        if (err.response?.status === 403) setAccessDenied(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const updateRole = async (userId, role) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role })
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role } : u))
      showToast('Role updated successfully.')
    } catch { showToast('Unable to update role.') }
  }

  const updateJobStatus = async (jobId, status) => {
    try {
      await api.put(`/admin/jobs/${jobId}`, { status })
      setJobs((prev) => prev.map((j) => j._id === jobId ? { ...j, status } : j))
      showToast('Job status updated.')
    } catch { showToast('Unable to update job.') }
  }

  const deleteUser = async (userId, username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/users/${userId}`)
      setUsers((prev) => prev.filter((u) => u._id !== userId))
      showToast('User deleted.')
    } catch { showToast('Unable to delete user.') }
  }

  // Stats
  const totalRevenue = earnings.reduce((s, p) => s + (p.amount || 0), 0)
  const totalCommission = earnings.reduce((s, p) => s + (p.commission || 0), 0)
  const openJobs = jobs.filter((j) => j.status === 'open').length
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  )
  const filteredJobs = jobs.filter((j) =>
    j.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
    (j.postedBy?.username || '').toLowerCase().includes(jobSearch.toLowerCase())
  )

  if (loading) return (
    <main className="page-shell">
      <section className="home-panel" style={{ textAlign: 'center', padding: '60px' }}>
        <div className="admin-spinner" />
        <p style={{ color: 'var(--muted)', marginTop: '16px' }}>Loading admin data...</p>
      </section>
    </main>
  )

  if (accessDenied) return (
    <main className="page-shell">
      <section className="home-panel" style={{ textAlign: 'center', padding: '60px' }}>
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--muted)' }}>You need admin privileges to view this panel.</p>
      </section>
    </main>
  )

  return (
    <main className="page-shell" style={{ padding: '24px' }}>
      {/* Toast */}
      {toast && (
        <div className="admin-toast">{toast}</div>
      )}

      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Admin Panel</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>Manage users, jobs, and platform earnings</p>
        </div>
        <span className="admin-badge">Admin</span>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >{tab}</button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'Overview' && (
        <div>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-icon" style={{ background: 'rgba(79,127,255,0.12)', color: 'var(--accent)' }}>👥</div>
              <div>
                <div className="admin-stat-value">{users.length}</div>
                <div className="admin-stat-label">Total Users</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon" style={{ background: 'rgba(5,150,105,0.12)', color: '#059669' }}>🧾</div>
              <div>
                <div className="admin-stat-value">{jobs.length}</div>
                <div className="admin-stat-label">Total Jobs</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon" style={{ background: 'rgba(8,145,178,0.12)', color: '#0891b2' }}>💼</div>
              <div>
                <div className="admin-stat-value">{openJobs}</div>
                <div className="admin-stat-label">Open Jobs</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon" style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}>💰</div>
              <div>
                <div className="admin-stat-value">${totalRevenue.toFixed(2)}</div>
                <div className="admin-stat-label">Total Revenue</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>📊</div>
              <div>
                <div className="admin-stat-value">${totalCommission.toFixed(2)}</div>
                <div className="admin-stat-label">Commission Earned</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#dc2626' }}>💳</div>
              <div>
                <div className="admin-stat-value">{earnings.length}</div>
                <div className="admin-stat-label">Transactions</div>
              </div>
            </div>
          </div>

          {/* Role breakdown */}
          <div className="admin-section">
            <h3>User Role Breakdown</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
              {['client', 'freelancer', 'admin'].map((role) => {
                const count = users.filter((u) => u.role === role).length
                return (
                  <div key={role} className="admin-role-pill">
                    {roleBadge(role)}
                    <span style={{ marginLeft: '8px', fontWeight: 700 }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent jobs */}
          <div className="admin-section">
            <h3>Recent Jobs</h3>
            <div className="admin-table">
              <div className="admin-table-head">
                <span>Title</span><span>Posted By</span><span>Budget</span><span>Status</span>
              </div>
              {jobs.slice(0, 5).map((job) => (
                <div key={job._id} className="admin-table-row">
                  <span style={{ fontWeight: 600 }}>{job.title}</span>
                  <span style={{ color: 'var(--muted)' }}>{job.postedBy?.username || '—'}</span>
                  <span style={{ color: 'var(--accent)' }}>${job.budget}</span>
                  <span>{statusBadge(job.status)}</span>
                </div>
              ))}
              {jobs.length === 0 && <div className="admin-empty">No jobs yet.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── Users ── */}
      {activeTab === 'Users' && (
        <div>
          <div className="admin-toolbar">
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by username or email..."
              className="admin-search"
            />
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="admin-table">
            <div className="admin-table-head" style={{ gridTemplateColumns: '1fr 1.5fr 120px 120px 80px' }}>
              <span>Username</span><span>Email</span><span>Role</span><span>Joined</span><span>Actions</span>
            </div>
            {filteredUsers.map((u) => (
              <div key={u._id} className="admin-table-row" style={{ gridTemplateColumns: '1fr 1.5fr 120px 120px 80px' }}>
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="admin-avatar-sm">{u.username.slice(0, 2).toUpperCase()}</span>
                  {u.username}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{u.email}</span>
                <span>
                  <select
                    value={u.role}
                    onChange={(e) => updateRole(u._id, e.target.value)}
                    className="admin-select"
                  >
                    <option value="client">Client</option>
                    <option value="freelancer">Freelancer</option>
                    <option value="admin">Admin</option>
                  </select>
                </span>
                <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </span>
                <span>
                  <button
                    className="admin-del-btn"
                    onClick={() => deleteUser(u._id, u.username)}
                    title="Delete user"
                  >🗑</button>
                </span>
              </div>
            ))}
            {filteredUsers.length === 0 && <div className="admin-empty">No users found.</div>}
          </div>
        </div>
      )}

      {/* ── Jobs ── */}
      {activeTab === 'Jobs' && (
        <div>
          <div className="admin-toolbar">
            <input
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              placeholder="Search by title or poster..."
              className="admin-search"
            />
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="admin-table">
            <div className="admin-table-head" style={{ gridTemplateColumns: '2fr 1fr 80px 120px 140px' }}>
              <span>Title</span><span>Posted By</span><span>Budget</span><span>Status</span><span>Deadline</span>
            </div>
            {filteredJobs.map((job) => (
              <div key={job._id} className="admin-table-row" style={{ gridTemplateColumns: '2fr 1fr 80px 120px 140px' }}>
                <span style={{ fontWeight: 600 }}>{job.title}</span>
                <span style={{ color: 'var(--muted)' }}>{job.postedBy?.username || '—'}</span>
                <span style={{ color: 'var(--accent)' }}>${job.budget}</span>
                <span>
                  <select
                    value={job.status}
                    onChange={(e) => updateJobStatus(job._id, e.target.value)}
                    className="admin-select"
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </span>
                <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                  {new Date(job.deadline).toLocaleDateString()}
                </span>
              </div>
            ))}
            {filteredJobs.length === 0 && <div className="admin-empty">No jobs found.</div>}
          </div>
        </div>
      )}

      {/* ── Earnings ── */}
      {activeTab === 'Earnings' && (
        <div>
          <div className="admin-earnings-summary">
            <div className="admin-earnings-card">
              <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Total Revenue</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)' }}>${totalRevenue.toFixed(2)}</span>
            </div>
            <div className="admin-earnings-card">
              <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Platform Commission</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#059669' }}>${totalCommission.toFixed(2)}</span>
            </div>
            <div className="admin-earnings-card">
              <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Transactions</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 700 }}>{earnings.length}</span>
            </div>
          </div>

          <div className="admin-table" style={{ marginTop: '20px' }}>
            <div className="admin-table-head" style={{ gridTemplateColumns: '2fr 1fr 1fr 100px 100px 120px' }}>
              <span>Job</span><span>Client</span><span>Freelancer</span><span>Amount</span><span>Commission</span><span>Status</span>
            </div>
            {earnings.map((p) => (
              <div key={p._id} className="admin-table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 100px 100px 120px' }}>
                <span style={{ fontWeight: 600 }}>{p.jobId?.title || 'Unknown job'}</span>
                <span style={{ color: 'var(--muted)' }}>{p.clientId?.username || '—'}</span>
                <span style={{ color: 'var(--muted)' }}>{p.freelancerId?.username || '—'}</span>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>${p.amount}</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>${p.commission}</span>
                <span>
                  <span style={{
                    display: 'inline-flex', padding: '3px 10px', borderRadius: '999px',
                    background: p.status === 'released' ? '#05996922' : p.status === 'refunded' ? '#dc262622' : '#d9770622',
                    color: p.status === 'released' ? '#059669' : p.status === 'refunded' ? '#dc2626' : '#d97706',
                    fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize',
                  }}>{p.status}</span>
                </span>
              </div>
            ))}
            {earnings.length === 0 && <div className="admin-empty">No transactions yet.</div>}
          </div>
        </div>
      )}
    </main>
  )
}
