import { useEffect, useMemo, useState } from 'react'
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

const CATEGORIES = [
  'Web Development', 'Backend Development', 'Mobile Development',
  'UI/UX Design', 'Graphic Design', 'Data Science', 'Scripting',
  'Content Writing', 'Marketing', 'SEO', 'Other',
]

function Toast({ msg, type = 'success' }) {
  if (!msg) return null
  const bg = type === 'error' ? 'rgba(220,38,38,0.12)' : 'rgba(45,212,191,0.1)'
  const color = type === 'error' ? '#dc2626' : 'var(--success)'
  const border = type === 'error' ? 'rgba(220,38,38,0.25)' : 'rgba(45,212,191,0.25)'
  return (
    <div style={{ padding: '12px 18px', borderRadius: '12px', background: bg, border: `1px solid ${border}`, color, fontSize: '0.93rem', marginBottom: '18px' }}>
      {msg}
    </div>
  )
}

// ─────────────────────────────────────────────
// Tab 1: Browse & Bid (all users, mainly freelancers)
// ─────────────────────────────────────────────
function BrowseTab({ user }) {
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [quote, setQuote] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [proposalText, setProposalText] = useState('')
  const [toast, setToast] = useState({ msg: '', type: 'success' })
  const [loading, setLoading] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [search, setSearch] = useState('')

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast({ msg: '', type: 'success' }), 4000) }

  const freelancerProfile = useMemo(() => {
    let skills = ['Web Development', 'React', 'Node.js']
    try {
      const stored = localStorage.getItem('user')
      if (stored) { const u = JSON.parse(stored); if (Array.isArray(u.skills) && u.skills.length > 0) skills = u.skills }
    } catch { /* */ }
    return { username: user?.username || 'Freelancer', skills }
  }, [user])

  useEffect(() => {
    api.get('/jobs').then(r => {
      setJobs(r.data)
      if (r.data.length > 0) setSelectedJob(r.data[0])
    }).catch(console.error)
  }, [])

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (job) => {
    setSelectedJob(job)
    setQuote(''); setDeliveryTime(''); setProposalText('')
  }

  const handleAISuggest = async () => {
    if (!selectedJob) return
    setSuggesting(true)
    try {
      const r = await api.post('/assistant/proposal', { job: selectedJob, freelancer: freelancerProfile })
      setQuote(String(r.data.quote))
      setDeliveryTime(String(r.data.deliveryTime))
      setProposalText(r.data.proposalText)
      showToast('AI proposal generated — review and edit before submitting.')
    } catch { showToast('Unable to generate suggestion.', 'error') }
    finally { setSuggesting(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedJob || !quote || !deliveryTime || !proposalText) {
      showToast('Fill all fields before submitting.', 'error'); return
    }
    setLoading(true)
    try {
      await api.post(`/jobs/${selectedJob._id}/bids`, {
        quote: Number(quote), deliveryTime: Number(deliveryTime), proposalText,
      })
      showToast('✅ Proposal submitted successfully!')
      setQuote(''); setDeliveryTime(''); setProposalText('')
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to submit proposal.', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <Toast msg={toast.msg} type={toast.type} />
      <div className="job-grid">
        {/* Left: job list */}
        <div className="job-list-card">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs…"
            style={{ width: '100%', borderRadius: '10px', border: '1px solid var(--border)', padding: '9px 12px', background: 'var(--surface)', color: 'var(--text)', marginBottom: '12px', boxSizing: 'border-box', fontSize: '0.88rem' }}
          />
          {filtered.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>No jobs found.</p>}
          {filtered.map(job => (
            <button key={job._id} type="button"
              className={`job-list-item ${selectedJob?._id === job._id ? 'active' : ''}`}
              onClick={() => handleSelect(job)}
            >
              <strong>{job.title}</strong>
              <span>${job.budget}</span>
              <small>{job.category}</small>
            </button>
          ))}
        </div>

        {/* Right: proposal form */}
        <form className="job-detail-card" onSubmit={handleSubmit}>
          {selectedJob ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px' }}>{selectedJob.title}</h2>
                  <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '999px', background: 'rgba(79,127,255,0.1)', color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 600 }}>{selectedJob.category}</span>
                </div>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>${selectedJob.budget}</span>
              </div>
              <p style={{ color: 'var(--muted)', lineHeight: 1.7, margin: '14px 0' }}>{selectedJob.description}</p>
              <div style={{ display: 'flex', gap: '14px', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '18px', flexWrap: 'wrap' }}>
                <span>👤 {selectedJob.postedBy?.username || 'Client'}</span>
                <span>🗓 Deadline: {new Date(selectedJob.deadline).toLocaleDateString()}</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 18px' }} />
              <h3 style={{ margin: '0 0 14px', fontSize: '1rem' }}>Your Proposal</h3>
            </>
          ) : (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>👈</div>
              Select a job to draft a proposal.
            </div>
          )}

          {selectedJob && (
            <>
              <div className="field-row">
                <label>
                  Your price (USD)
                  <input type="number" min="1" value={quote} onChange={e => setQuote(e.target.value)} required placeholder="e.g. 200" />
                </label>
                <label>
                  Delivery (days)
                  <input type="number" min="1" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} required placeholder="e.g. 7" />
                </label>
              </div>
              <label>
                Proposal message
                <textarea value={proposalText} onChange={e => setProposalText(e.target.value)} rows={7} required placeholder="Describe your approach, experience, and why you're a great fit…" />
              </label>
              <div className="button-row">
                <button type="button" className="button secondary" onClick={handleAISuggest} disabled={suggesting}>
                  {suggesting ? '✨ Generating…' : '✨ AI Suggest'}
                </button>
                <button type="submit" className="button primary" disabled={loading}>
                  {loading ? 'Submitting…' : 'Submit Proposal'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Tab 2: Post a Job (clients only)
// ─────────────────────────────────────────────
function PostJobTab({ user }) {
  const blank = { title: '', description: '', budget: '', deadline: '', category: CATEGORIES[0] }
  const [form, setForm] = useState(blank)
  const [toast, setToast] = useState({ msg: '', type: 'success' })
  const [loading, setLoading] = useState(false)
  const [myJobs, setMyJobs] = useState([])

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast({ msg: '', type: 'success' }), 4000) }

  useEffect(() => {
    fetchMyJobs()
  }, [])

  const fetchMyJobs = async () => {
    try {
      const r = await api.get('/jobs')
      setMyJobs(r.data.filter(j => String(j.postedBy?._id || j.postedBy) === String(user?.id)))
    } catch { /* */ }
  }

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/jobs', { ...form, budget: Number(form.budget) })
      showToast('✅ Job posted successfully!')
      setForm(blank)
      fetchMyJobs()
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to post job.', 'error')
    } finally { setLoading(false) }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px,480px) 1fr', gap: '24px' }}>
      {/* Post form */}
      <div className="job-detail-card">
        <h2 style={{ marginTop: 0 }}>Post a New Job</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '20px', fontSize: '0.9rem' }}>Fill in the details and receive proposals from skilled freelancers.</p>
        <Toast msg={toast.msg} type={toast.type} />
        <form className="payment-form" onSubmit={handleSubmit}>
          <label>
            Job title
            <input name="title" value={form.title} onChange={handleChange} required placeholder="e.g. Build a React Dashboard" />
          </label>
          <label>
            Description
            <textarea name="description" value={form.description} onChange={handleChange} required rows={5}
              placeholder="Describe what needs to be done, requirements, expected output…"
              style={{ borderRadius: '14px', border: '1px solid var(--border)', padding: '12px 14px', background: 'var(--surface)', color: 'var(--text)', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
            />
          </label>
          <div className="field-row">
            <label>
              Budget (USD)
              <input name="budget" type="number" min="1" value={form.budget} onChange={handleChange} required placeholder="e.g. 300" />
            </label>
            <label>
              Deadline
              <input name="deadline" type="date" min={today} value={form.deadline} onChange={handleChange} required
                style={{ borderRadius: '14px', border: '1px solid var(--border)', padding: '12px 14px', background: 'var(--surface)', color: 'var(--text)', width: '100%', boxSizing: 'border-box' }}
              />
            </label>
          </div>
          <label>
            Category
            <select name="category" value={form.category} onChange={handleChange}
              style={{ borderRadius: '14px', border: '1px solid var(--border)', padding: '12px 14px', background: 'var(--surface)', color: 'var(--text)', width: '100%' }}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <button type="submit" className="button primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
            {loading ? 'Posting…' : '🚀 Post Job'}
          </button>
        </form>
      </div>

      {/* My posted jobs */}
      <div>
        <h3 style={{ marginTop: 0, marginBottom: '14px' }}>Your Posted Jobs ({myJobs.length})</h3>
        {myJobs.length === 0 ? (
          <div style={{ color: 'var(--muted)', padding: '32px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
            No jobs posted yet. Use the form to post your first job.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myJobs.map(job => (
              <div key={job._id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>{job.title}</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.82rem' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '999px', background: 'rgba(79,127,255,0.1)', color: 'var(--accent)' }}>{job.category}</span>
                      <span style={{ color: 'var(--muted)' }}>🗓 {new Date(job.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontWeight: 700, color: '#059669', fontSize: '1.1rem' }}>${job.budget}</span>
                    <span style={{
                      padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
                      background: job.status === 'open' ? 'rgba(5,150,105,0.1)' : job.status === 'in_progress' ? 'rgba(79,127,255,0.1)' : 'rgba(107,114,128,0.1)',
                      color: job.status === 'open' ? '#059669' : job.status === 'in_progress' ? 'var(--accent)' : 'var(--muted)',
                      textTransform: 'capitalize',
                    }}>{job.status.replace('_', ' ')}</span>
                  </div>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '10px 0 0', lineHeight: 1.5 }}>
                  {job.description?.slice(0, 120)}{job.description?.length > 120 ? '…' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Tab 3: My Bids (freelancer) / Incoming Bids (client)
// ─────────────────────────────────────────────
function MyBidsTab({ user }) {
  const isClient = user?.role === 'client' || user?.role === 'admin'
  const [myJobs, setMyJobs] = useState([])
  const [bidsMap, setBidsMap] = useState({})
  const [expandedJob, setExpandedJob] = useState(null)
  const [toast, setToast] = useState({ msg: '', type: 'success' })
  const [actionLoading, setActionLoading] = useState(null) // bidId being acted on

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast({ msg: '', type: 'success' }), 4000) }

  useEffect(() => {
    if (isClient) {
      api.get('/jobs').then(r => {
        const mine = r.data.filter(j => String(j.postedBy?._id || j.postedBy) === String(user?.id))
        setMyJobs(mine)
        if (mine.length > 0) { setExpandedJob(mine[0]._id); fetchBids(mine[0]._id) }
      }).catch(console.error)
    }
  }, [isClient, user])

  const fetchBids = async (jobId) => {
    try {
      const r = await api.get(`/jobs/${jobId}/bids`)
      setBidsMap(prev => ({ ...prev, [jobId]: r.data }))
    } catch { /* */ }
  }

  const handleExpand = (jobId) => {
    setExpandedJob(jobId === expandedJob ? null : jobId)
    if (!bidsMap[jobId]) fetchBids(jobId)
  }

  const handleBidAction = async (jobId, bidId, status) => {
    setActionLoading(bidId)
    try {
      await api.put(`/jobs/${jobId}/bids/${bidId}`, { status })
      showToast(status === 'accepted' ? '✅ Bid accepted! Other bids have been declined.' : 'Bid declined.')
      fetchBids(jobId)
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed.', 'error')
    } finally { setActionLoading(null) }
  }

  const BID_STATUS = {
    pending:  { bg: 'rgba(79,127,255,0.1)',   color: 'var(--accent)', label: 'Pending' },
    accepted: { bg: 'rgba(5,150,105,0.12)',   color: '#059669',       label: '✅ Accepted' },
    rejected: { bg: 'rgba(220,38,38,0.1)',    color: '#dc2626',       label: '✗ Declined' },
  }

  if (!isClient) {
    return (
      <div style={{ color: 'var(--muted)', padding: '32px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📋</div>
        This tab shows incoming bids for clients. As a freelancer, your submitted proposals appear on the job listings.
      </div>
    )
  }

  return (
    <div>
      <Toast msg={toast.msg} type={toast.type} />
      <h3 style={{ marginTop: 0, marginBottom: '18px' }}>Incoming Proposals on Your Jobs</h3>
      {myJobs.length === 0 ? (
        <div style={{ color: 'var(--muted)', padding: '40px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
          You have no posted jobs yet. Go to <strong>Post a Job</strong> to create one.
        </div>
      ) : (
        myJobs.map(job => {
          const bids = bidsMap[job._id] || []
          const isOpen = expandedJob === job._id
          const acceptedBid = bids.find(b => b.status === 'accepted')
          return (
            <div key={job._id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', marginBottom: '12px', overflow: 'hidden' }}>
              {/* Job header */}
              <button type="button" onClick={() => handleExpand(job._id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', gap: '12px' }}
              >
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 700 }}>{job.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '2px' }}>${job.budget} · {job.category}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {acceptedBid && (
                    <span style={{ padding: '3px 10px', borderRadius: '999px', background: 'rgba(5,150,105,0.12)', color: '#059669', fontSize: '0.78rem', fontWeight: 600 }}>
                      ✅ Hired
                    </span>
                  )}
                  <span style={{ padding: '4px 12px', borderRadius: '999px', background: 'rgba(79,127,255,0.1)', color: 'var(--accent)', fontSize: '0.82rem', fontWeight: 600 }}>
                    {bids.length} proposal{bids.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Bids list */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {bids.length === 0 ? (
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No proposals yet.</p>
                  ) : bids.map(bid => {
                    const st = BID_STATUS[bid.status] || BID_STATUS.pending
                    const isActing = actionLoading === bid._id
                    return (
                      <div key={bid._id} style={{ background: 'var(--panel)', border: `1px solid ${bid.status === 'accepted' ? 'rgba(5,150,105,0.4)' : 'var(--border)'}`, borderRadius: '14px', padding: '16px 18px' }}>
                        {/* Bid header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--accent-strong))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                              {bid.freelancerId?.username?.slice(0, 2).toUpperCase() || 'FR'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700 }}>{bid.freelancerId?.username || 'Freelancer'}</div>
                              <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>🗓 {bid.deliveryTime} day{bid.deliveryTime !== 1 ? 's' : ''} delivery</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#059669' }}>${bid.quote}</span>
                            <span style={{ padding: '3px 10px', borderRadius: '999px', background: st.bg, color: st.color, fontSize: '0.8rem', fontWeight: 600 }}>{st.label}</span>
                          </div>
                        </div>

                        {/* Proposal text */}
                        <p style={{ color: 'var(--muted)', fontSize: '0.87rem', lineHeight: 1.65, margin: '0 0 14px', whiteSpace: 'pre-wrap' }}>
                          {bid.proposalText}
                        </p>

                        {/* Accept / Decline buttons — only show if pending and no one accepted yet */}
                        {bid.status === 'pending' && !acceptedBid && (
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                              type="button" disabled={isActing}
                              onClick={() => handleBidAction(job._id, bid._id, 'accepted')}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '999px', background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.3)', color: '#059669', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', transition: 'background 150ms' }}
                            >
                              {isActing ? '⏳' : '✅'} Accept Bid
                            </button>
                            <button
                              type="button" disabled={isActing}
                              onClick={() => handleBidAction(job._id, bid._id, 'rejected')}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '999px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', transition: 'background 150ms' }}
                            >
                              {isActing ? '⏳' : '✗'} Decline
                            </button>
                          </div>
                        )}

                        {/* Accepted — show hire confirmation */}
                        {bid.status === 'accepted' && (
                          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', color: '#059669', fontSize: '0.88rem', fontWeight: 500 }}>
                            ✅ You hired <strong>{bid.freelancerId?.username}</strong> for this job. Go to <a href="/payments" style={{ color: '#059669', textDecoration: 'underline' }}>Payments</a> to send the escrow payment.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Jobs Page
// ─────────────────────────────────────────────
export default function JobsPage() {
  const user = getUser()
  const isClient = user?.role === 'client' || user?.role === 'admin'

  const [tab, setTab] = useState(isClient ? 'post' : 'browse')

  const tabs = [
    { id: 'browse', label: '🔍 Browse & Bid' },
    ...(isClient ? [
      { id: 'post',   label: '➕ Post a Job' },
      { id: 'bids',   label: '📋 Incoming Proposals' },
    ] : []),
  ]

  return (
    <main className="page-shell" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Jobs</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>
          {isClient ? 'Post jobs, review proposals, and hire the best talent.' : 'Browse open jobs and submit your proposals.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="admin-tabs" style={{ marginBottom: '28px' }}>
        {tabs.map(t => (
          <button key={t.id} className={`admin-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'browse' && <BrowseTab user={user} />}
      {tab === 'post'   && <PostJobTab user={user} />}
      {tab === 'bids'   && <MyBidsTab user={user} />}
    </main>
  )
}
