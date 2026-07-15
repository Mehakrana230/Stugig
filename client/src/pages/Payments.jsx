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
    const d = JSON.parse(atob(token.split('.')[1]))
    if (!d.id && d._id) d.id = d._id.toString()
    return d
  } catch { return null }
}

const STATUS_META = {
  escrowed: { bg: 'rgba(245,158,11,0.12)', color: '#d97706', label: '🔒 In Escrow' },
  released: { bg: 'rgba(5,150,105,0.12)',  color: '#059669', label: '✅ Released'  },
  refunded: { bg: 'rgba(220,38,38,0.12)',  color: '#dc2626', label: '↩ Refunded'  },
}

function Badge({ status }) {
  const m = STATUS_META[status] || STATUS_META.escrowed
  return (
    <span style={{ display:'inline-flex', padding:'4px 12px', borderRadius:'999px',
      background: m.bg, color: m.color, fontSize:'0.82rem', fontWeight:600 }}>
      {m.label}
    </span>
  )
}

function Alert({ type, msg, onClose }) {
  if (!msg) return null
  const styles = {
    success: { bg:'rgba(45,212,191,0.1)', border:'rgba(45,212,191,0.25)', color:'#2DD4BF' },
    error:   { bg:'rgba(220,38,38,0.1)',  border:'rgba(220,38,38,0.2)',   color:'#dc2626' },
  }
  const s = styles[type] || styles.success
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
      padding:'12px 18px', borderRadius:'12px', background:s.bg, border:`1px solid ${s.border}`,
      color:s.color, fontSize:'0.95rem', marginBottom:'16px' }}>
      <span>{msg}</span>
      {onClose && <button onClick={onClose} style={{ background:'none', border:'none', color:s.color, cursor:'pointer', fontSize:'1.1rem', lineHeight:1 }}>×</button>}
    </div>
  )
}

/* ─────────────── CLIENT VIEW ─────────────── */
function ClientPayments({ user }) {
  const [jobs, setJobs]         = useState([])
  const [bids, setBids]         = useState([])
  const [selJob, setSelJob]     = useState(null)
  const [selBid, setSelBid]     = useState(null)
  const [amount, setAmount]     = useState('')
  const [history, setHistory]   = useState([])
  const [tab, setTab]           = useState('pay')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]   = useState('')
  const [error, setError]       = useState('')

  useEffect(() => { loadJobs(); loadHistory() }, [])
  useEffect(() => { if (selJob) { setAmount(selJob.budget); loadBids(selJob._id) } }, [selJob])

  const loadJobs = async () => {
    try {
      const r = await api.get('/jobs')
      const mine = r.data.filter(j => String(j.postedBy?._id || j.postedBy) === String(user.id))
      setJobs(mine)
      if (mine.length) setSelJob(mine[0])
    } catch { setError('Unable to load your jobs.') }
  }

  const loadBids = async (jobId) => {
    try {
      const r = await api.get(`/jobs/${jobId}/bids`)
      setBids(r.data)
      setSelBid(r.data.length ? r.data[0] : null)
    } catch { setBids([]) }
  }

  const loadHistory = async () => {
    try {
      const r = await api.get('/payments/history')
      setHistory(r.data)
    } catch {}
  }

  const handlePay = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!selJob || !selBid) { setError('Select a job and a freelancer bid.'); return }
    setSubmitting(true)
    try {
      await api.post('/payments/demo', {
        jobId: selJob._id,
        freelancerId: selBid.freelancerId?._id || selBid.freelancerId,
        amount: Number(amount),
      })
      setSuccess(`✅ $${Number(amount).toFixed(2)} held in escrow for "${selJob.title}". Release when work is approved.`)
      loadHistory()
      loadJobs()
      setTab('history')
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed.')
    } finally { setSubmitting(false) }
  }

  const handleRelease = async (paymentId, jobTitle) => {
    setError(''); setSuccess('')
    try {
      await api.post(`/payments/${paymentId}/complete`)
      setSuccess(`✅ Funds released for "${jobTitle}". Job marked complete.`)
      loadHistory()
    } catch (err) { setError(err.response?.data?.message || 'Release failed.') }
  }

  const handleRefund = async (paymentId) => {
    if (!window.confirm('Refund this payment? The job will reopen.')) return
    setError(''); setSuccess('')
    try {
      await api.post(`/payments/${paymentId}/refund`)
      setSuccess('↩ Payment refunded. Job reopened.')
      loadHistory()
      loadJobs()
    } catch (err) { setError(err.response?.data?.message || 'Refund failed.') }
  }

  const escrowed = history.filter(p => p.status === 'escrowed')
  const totalEscrowed = escrowed.reduce((s,p) => s + p.amount, 0)
  const totalSpent = history.filter(p => p.status === 'released').reduce((s,p) => s + p.amount, 0)

  return (
    <div>
      <Alert type="success" msg={success} onClose={() => setSuccess('')} />
      <Alert type="error"   msg={error}   onClose={() => setError('')} />

      {/* Stats */}
      <div className="pay-stats">
        <div className="pay-stat-card">
          <span className="pay-stat-icon" style={{ background:'rgba(79,127,255,0.12)', color:'var(--accent)' }}>🧾</span>
          <div><div className="pay-stat-val">{jobs.length}</div><div className="pay-stat-lbl">Your Jobs</div></div>
        </div>
        <div className="pay-stat-card">
          <span className="pay-stat-icon" style={{ background:'rgba(245,158,11,0.12)', color:'#d97706' }}>🔒</span>
          <div><div className="pay-stat-val">${totalEscrowed.toFixed(2)}</div><div className="pay-stat-lbl">In Escrow</div></div>
        </div>
        <div className="pay-stat-card">
          <span className="pay-stat-icon" style={{ background:'rgba(5,150,105,0.12)', color:'#059669' }}>💸</span>
          <div><div className="pay-stat-val">${totalSpent.toFixed(2)}</div><div className="pay-stat-lbl">Total Paid</div></div>
        </div>
        <div className="pay-stat-card">
          <span className="pay-stat-icon" style={{ background:'rgba(124,58,237,0.12)', color:'#7c3aed' }}>🧾</span>
          <div><div className="pay-stat-val">{history.length}</div><div className="pay-stat-lbl">Transactions</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${tab==='pay'?'active':''}`} onClick={() => setTab('pay')}>💳 New Payment</button>
        <button className={`admin-tab ${tab==='escrow'?'active':''}`} onClick={() => setTab('escrow')}>
          🔒 Active Escrow {escrowed.length > 0 && `(${escrowed.length})`}
        </button>
        <button className={`admin-tab ${tab==='history'?'active':''}`} onClick={() => setTab('history')}>
          📋 History {history.length > 0 && `(${history.length})`}
        </button>
      </div>

      {/* New Payment */}
      {tab === 'pay' && (
        <div className="pay-form-wrap">
          <div className="pay-info-box">
            🧪 <strong>Demo mode</strong> — payments are simulated. No real card needed.
          </div>
          {jobs.length === 0 ? (
            <div className="pay-empty">
              <div style={{ fontSize:'2rem' }}>🧾</div>
              <p>You have no open jobs to pay for.</p>
              <a href="/jobs" className="button primary" style={{ marginTop:'8px' }}>Post a Job →</a>
            </div>
          ) : (
            <form className="payment-form" onSubmit={handlePay}>
              {/* Job select */}
              <label>
                Select job
                <select value={selJob?._id || ''} onChange={e => setSelJob(jobs.find(j => j._id === e.target.value))} required>
                  {jobs.map(j => <option key={j._id} value={j._id}>{j.title} — ${j.budget}</option>)}
                </select>
              </label>

              {selJob && (
                <div className="pay-job-preview">
                  <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
                    <span style={{ color:'var(--muted)', fontSize:'0.85rem' }}>📁 {selJob.category}</span>
                    <span style={{ color:'#059669', fontWeight:700 }}>Budget: ${selJob.budget}</span>
                  </div>
                  <p style={{ margin:'8px 0 0', color:'var(--muted)', fontSize:'0.88rem', lineHeight:1.5 }}>{selJob.description?.slice(0,100)}…</p>
                </div>
              )}

              {/* Bid select */}
              <label>
                Select freelancer bid
                <select value={selBid?._id || ''} onChange={e => setSelBid(bids.find(b => b._id === e.target.value))} required disabled={bids.length === 0}>
                  {bids.length === 0
                    ? <option value="">No bids yet on this job</option>
                    : bids.map(b => <option key={b._id} value={b._id}>{b.freelancerId?.username} — ${b.quote} · {b.deliveryTime} days</option>)
                  }
                </select>
              </label>

              {selBid && (
                <div className="pay-proposal-preview">
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px', flexWrap:'wrap', gap:'8px' }}>
                    <strong style={{ color:'var(--text)' }}>👤 {selBid.freelancerId?.username}</strong>
                    <div style={{ display:'flex', gap:'12px' }}>
                      <span style={{ color:'var(--accent)', fontWeight:700 }}>${selBid.quote}</span>
                      <span style={{ color:'var(--muted)', fontSize:'0.85rem' }}>🗓 {selBid.deliveryTime} days</span>
                    </div>
                  </div>
                  <p style={{ margin:0, color:'var(--muted)', fontSize:'0.85rem', lineHeight:1.6 }}>{selBid.proposalText}</p>
                </div>
              )}

              {/* Amount */}
              <label>
                Amount (USD)
                <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
              </label>

              {/* Breakdown */}
              {amount && Number(amount) > 0 && (
                <div className="pay-breakdown">
                  <div className="pay-breakdown-row"><span>Job amount</span><span>${Number(amount).toFixed(2)}</span></div>
                  <div className="pay-breakdown-row"><span style={{ color:'#d97706' }}>Platform fee (15%)</span><span style={{ color:'#d97706' }}>−${(Number(amount)*0.15).toFixed(2)}</span></div>
                  <div className="pay-breakdown-row pay-breakdown-total"><span>Freelancer receives</span><span style={{ color:'#059669' }}>${(Number(amount)*0.85).toFixed(2)}</span></div>
                </div>
              )}

              <button type="submit" className="button primary pay-submit-btn" disabled={submitting || bids.length === 0}>
                {submitting ? '⏳ Processing…' : `🔒 Hold $${Number(amount||0).toFixed(2)} in Escrow`}
              </button>
              <p className="pay-note">Funds are held securely until you approve the completed work.</p>
            </form>
          )}
        </div>
      )}

      {/* Active Escrow */}
      {tab === 'escrow' && (
        <div>
          {escrowed.length === 0 ? (
            <div className="pay-empty"><div style={{ fontSize:'2rem' }}>🔒</div><p>No payments in escrow.</p></div>
          ) : escrowed.map(p => (
            <div key={p._id} className="pay-card">
              <div className="pay-card-left">
                <div className="pay-card-title">{p.jobId?.title || 'Unknown job'}</div>
                <div className="pay-card-meta">
                  <span>👤 Freelancer: <strong>{p.freelancerId?.username}</strong></span>
                  <span>🗓 {new Date(p.createdAt).toLocaleDateString()}</span>
                  <span>📊 Commission: ${p.commission?.toFixed(2)}</span>
                </div>
                <div style={{ marginTop:'8px' }}><Badge status={p.status} /></div>
              </div>
              <div className="pay-card-right">
                <div className="pay-card-amount">${p.amount?.toFixed(2)}</div>
                <div style={{ color:'var(--muted)', fontSize:'0.82rem', marginBottom:'12px' }}>
                  Freelancer gets: <strong style={{ color:'#059669' }}>${p.netAmount?.toFixed(2)}</strong>
                </div>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  <button className="button primary" style={{ padding:'8px 16px', fontSize:'0.85rem' }}
                    onClick={() => handleRelease(p._id, p.jobId?.title)}>
                    ✅ Approve & Release
                  </button>
                  <button className="button secondary" style={{ padding:'8px 16px', fontSize:'0.85rem' }}
                    onClick={() => handleRefund(p._id)}>
                    ↩ Refund
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div>
          {history.length === 0 ? (
            <div className="pay-empty"><div style={{ fontSize:'2rem' }}>📋</div><p>No transactions yet.</p></div>
          ) : history.map(p => (
            <div key={p._id} className="pay-card">
              <div className="pay-card-left">
                <div className="pay-card-title">{p.jobId?.title || 'Unknown job'}</div>
                <div className="pay-card-meta">
                  <span>👤 To: <strong>{p.freelancerId?.username}</strong></span>
                  <span>🗓 {new Date(p.createdAt).toLocaleDateString()}</span>
                  <span>📊 Fee: ${p.commission?.toFixed(2)}</span>
                </div>
                <div style={{ marginTop:'8px' }}><Badge status={p.status} /></div>
              </div>
              <div className="pay-card-right">
                <div className="pay-card-amount">${p.amount?.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────── FREELANCER VIEW ─────────────── */
function FreelancerPayments({ user }) {
  const [history, setHistory]   = useState([])
  const [tab, setTab]           = useState('pending')
  const [success, setSuccess]   = useState('')
  const [error, setError]       = useState('')

  useEffect(() => { loadHistory() }, [])

  const loadHistory = async () => {
    try {
      const r = await api.get('/payments/history')
      setHistory(r.data)
    } catch {}
  }

  const pending  = history.filter(p => p.status === 'escrowed')
  const released = history.filter(p => p.status === 'released')
  const refunded = history.filter(p => p.status === 'refunded')

  const totalEarned   = released.reduce((s,p) => s + (p.netAmount || p.amount * 0.85), 0)
  const totalPending  = pending.reduce((s,p)  => s + (p.netAmount || p.amount * 0.85), 0)

  return (
    <div>
      <Alert type="success" msg={success} onClose={() => setSuccess('')} />
      <Alert type="error"   msg={error}   onClose={() => setError('')} />

      {/* Stats */}
      <div className="pay-stats">
        <div className="pay-stat-card">
          <span className="pay-stat-icon" style={{ background:'rgba(5,150,105,0.12)', color:'#059669' }}>💰</span>
          <div><div className="pay-stat-val">${totalEarned.toFixed(2)}</div><div className="pay-stat-lbl">Total Earned</div></div>
        </div>
        <div className="pay-stat-card">
          <span className="pay-stat-icon" style={{ background:'rgba(245,158,11,0.12)', color:'#d97706' }}>⏳</span>
          <div><div className="pay-stat-val">${totalPending.toFixed(2)}</div><div className="pay-stat-lbl">Pending Release</div></div>
        </div>
        <div className="pay-stat-card">
          <span className="pay-stat-icon" style={{ background:'rgba(79,127,255,0.12)', color:'var(--accent)' }}>📦</span>
          <div><div className="pay-stat-val">{released.length}</div><div className="pay-stat-lbl">Completed Jobs</div></div>
        </div>
        <div className="pay-stat-card">
          <span className="pay-stat-icon" style={{ background:'rgba(124,58,237,0.12)', color:'#7c3aed' }}>🧾</span>
          <div><div className="pay-stat-val">{history.length}</div><div className="pay-stat-lbl">All Transactions</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${tab==='pending'?'active':''}`} onClick={() => setTab('pending')}>
          ⏳ Awaiting Release {pending.length > 0 && `(${pending.length})`}
        </button>
        <button className={`admin-tab ${tab==='earned'?'active':''}`} onClick={() => setTab('earned')}>
          ✅ Earned {released.length > 0 && `(${released.length})`}
        </button>
        <button className={`admin-tab ${tab==='all'?'active':''}`} onClick={() => setTab('all')}>
          📋 All Transactions
        </button>
      </div>

      {/* Awaiting release */}
      {tab === 'pending' && (
        <div>
          {pending.length === 0 ? (
            <div className="pay-empty">
              <div style={{ fontSize:'2rem' }}>⏳</div>
              <p>No payments awaiting release.</p>
              <p style={{ color:'var(--muted)', fontSize:'0.88rem' }}>Payments show here once a client puts funds in escrow for your work.</p>
            </div>
          ) : pending.map(p => (
            <div key={p._id} className="pay-card">
              <div className="pay-card-left">
                <div className="pay-card-title">{p.jobId?.title || 'Unknown job'}</div>
                <div className="pay-card-meta">
                  <span>👤 Client: <strong>{p.clientId?.username}</strong></span>
                  <span>🗓 {new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ marginTop:'8px', display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  <Badge status={p.status} />
                  <span style={{ fontSize:'0.82rem', color:'var(--muted)', padding:'4px 10px', background:'rgba(255,255,255,0.03)', borderRadius:'999px', border:'1px solid var(--border)' }}>
                    Waiting for client approval
                  </span>
                </div>
              </div>
              <div className="pay-card-right">
                <div style={{ color:'var(--muted)', fontSize:'0.82rem', marginBottom:'4px' }}>Total held</div>
                <div className="pay-card-amount">${p.amount?.toFixed(2)}</div>
                <div style={{ marginTop:'6px', color:'#059669', fontWeight:700 }}>
                  You'll receive: ${(p.netAmount || p.amount * 0.85).toFixed(2)}
                </div>
                <div style={{ color:'var(--muted)', fontSize:'0.78rem', marginTop:'2px' }}>
                  After 15% platform fee
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Earned */}
      {tab === 'earned' && (
        <div>
          {released.length === 0 ? (
            <div className="pay-empty"><div style={{ fontSize:'2rem' }}>✅</div><p>No released payments yet.</p></div>
          ) : released.map(p => (
            <div key={p._id} className="pay-card">
              <div className="pay-card-left">
                <div className="pay-card-title">{p.jobId?.title || 'Unknown job'}</div>
                <div className="pay-card-meta">
                  <span>👤 From: <strong>{p.clientId?.username}</strong></span>
                  <span>🗓 {new Date(p.createdAt).toLocaleDateString()}</span>
                  <span>📊 Platform fee: ${p.commission?.toFixed(2)}</span>
                </div>
                <div style={{ marginTop:'8px' }}><Badge status={p.status} /></div>
              </div>
              <div className="pay-card-right">
                <div style={{ color:'var(--muted)', fontSize:'0.82rem' }}>You received</div>
                <div className="pay-card-amount" style={{ color:'#059669' }}>
                  ${(p.netAmount || p.amount * 0.85).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All */}
      {tab === 'all' && (
        <div>
          {history.length === 0 ? (
            <div className="pay-empty"><div style={{ fontSize:'2rem' }}>📋</div><p>No transactions yet.</p></div>
          ) : history.map(p => (
            <div key={p._id} className="pay-card">
              <div className="pay-card-left">
                <div className="pay-card-title">{p.jobId?.title || 'Unknown job'}</div>
                <div className="pay-card-meta">
                  <span>👤 {p.clientId?.username}</span>
                  <span>🗓 {new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ marginTop:'8px' }}><Badge status={p.status} /></div>
              </div>
              <div className="pay-card-right">
                <div className="pay-card-amount">${p.amount?.toFixed(2)}</div>
                <div style={{ color:'#059669', fontSize:'0.88rem' }}>Net: ${(p.netAmount || p.amount*0.85).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────── MAIN PAGE ─────────────── */
export default function PaymentsPage() {
  const user = getUser()

  if (!user) return (
    <main className="page-shell">
      <section className="home-panel" style={{ textAlign:'center' }}>
        <div style={{ fontSize:'2.5rem' }}>💳</div>
        <h2>Payments</h2>
        <p style={{ color:'var(--muted)' }}>Please log in to view your payments.</p>
        <a href="/login" className="button primary">Login →</a>
      </section>
    </main>
  )

  const isClient     = user.role === 'client' || user.role === 'admin'
  const isFreelancer = user.role === 'freelancer'

  return (
    <main className="page-shell" style={{ padding:'24px' }}>
      {/* Page header */}
      <div className="pay-header">
        <div>
          <h1 style={{ margin:0, fontSize:'1.8rem' }}>Payments</h1>
          <p style={{ margin:'4px 0 0', color:'var(--muted)' }}>
            {isClient ? 'Pay freelancers securely with escrow protection' : 'Track your earnings and pending payments'}
          </p>
        </div>
        <span className="pay-role-badge" style={{ background: isClient ? 'rgba(8,145,178,0.12)' : 'rgba(5,150,105,0.12)', color: isClient ? '#0891b2' : '#059669' }}>
          {isClient ? '🏢 Client' : '💼 Freelancer'}
        </span>
      </div>

      {isClient     && <ClientPayments user={user} />}
      {isFreelancer && <FreelancerPayments user={user} />}
    </main>
  )
}
