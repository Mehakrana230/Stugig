import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios.js'

const getMe = () => {
  try {
    const stored = localStorage.getItem('user')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (!parsed.id && parsed._id) parsed.id = parsed._id.toString()
      return parsed
    }
    const token = localStorage.getItem('token')
    if (!token) return null
    const decoded = JSON.parse(atob(token.split('.')[1]))
    if (!decoded.id && decoded._id) decoded.id = decoded._id.toString()
    return decoded
  } catch { return null }
}

// ── Star rating picker ──
function StarPicker({ value, onChange, label }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)' }}>{label}</span>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n} type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
              fontSize: '1.6rem', lineHeight: 1,
              color: n <= (hover || value) ? '#f59e0b' : 'var(--border)',
              filter: n <= (hover || value) ? 'drop-shadow(0 0 4px rgba(245,158,11,0.5))' : 'none',
              transition: 'color 100ms, filter 100ms',
            }}
          >★</button>
        ))}
        {value > 0 && (
          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem', alignSelf: 'center', marginLeft: '4px' }}>
            {value}/5
          </span>
        )}
      </div>
    </div>
  )
}

// ── Display stars (read-only) ──
function StarDisplay({ value }) {
  const avg = Number(value) || 0
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ fontSize: '1rem', color: n <= Math.round(avg) ? '#f59e0b' : 'rgba(245,158,11,0.2)' }}>★</span>
      ))}
      <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.88rem', marginLeft: '4px' }}>{avg.toFixed(1)}</span>
    </span>
  )
}

export default function PublicProfilePage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const me = getMe()

  useEffect(() => {
    if (!userId || userId === 'undefined') {
      if (me?.id) navigate(`/profile/${me.id}`, { replace: true })
      else navigate('/login', { replace: true })
    }
  }, [userId, me, navigate])

  const isOwnProfile = me?.id === userId || me?._id === userId

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Edit state
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const [skills, setSkills] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Review state
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({ communication: 0, quality: 0, timeliness: 0, comment: '' })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewMsg, setReviewMsg] = useState({ text: '', type: 'success' })

  const loadProfile = async () => {
    try {
      const response = await api.get(`/users/${userId}`)
      setProfile(response.data)
      setBio(response.data.user.bio || '')
      setSkills(response.data.user.skills || [])
    } catch (err) {
      console.error(err)
      setError('Profile not found.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (userId && userId !== 'undefined') loadProfile() }, [userId])

  const handleAddSkill = () => {
    const s = skillInput.trim()
    if (s && !skills.includes(s) && skills.length < 10) setSkills(prev => [...prev, s])
    setSkillInput('')
  }

  const handleSave = async () => {
    setSaving(true); setSaveMsg('')
    try {
      const response = await api.put('/users/profile', { bio, skills })
      const updated = { ...me, bio: response.data.bio, skills: response.data.skills }
      localStorage.setItem('user', JSON.stringify(updated))
      setProfile(prev => ({ ...prev, user: { ...prev.user, bio: response.data.bio, skills: response.data.skills } }))
      setSaveMsg('Profile updated successfully.')
      setEditing(false)
    } catch (err) {
      setSaveMsg(err.response?.data?.message || 'Failed to save profile.')
    } finally { setSaving(false) }
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    const { communication, quality, timeliness, comment } = reviewForm
    if (!communication || !quality || !timeliness) {
      setReviewMsg({ text: 'Please fill all star ratings.', type: 'error' }); return
    }
    setReviewSubmitting(true); setReviewMsg({ text: '', type: 'success' })
    try {
      await api.post('/reviews', { toUserId: userId, communication, quality, timeliness, comment })
      setReviewMsg({ text: '✅ Review submitted successfully!', type: 'success' })
      setReviewForm({ communication: 0, quality: 0, timeliness: 0, comment: '' })
      setShowReviewForm(false)
      loadProfile() // refresh to show new review
    } catch (err) {
      setReviewMsg({ text: err.response?.data?.message || 'Failed to submit review.', type: 'error' })
    } finally { setReviewSubmitting(false) }
  }

  if (loading) return (
    <main className="page-shell">
      <section className="home-panel" style={{ textAlign: 'center', padding: '60px' }}>
        <div className="admin-spinner" /><p style={{ color: 'var(--muted)', marginTop: '16px' }}>Loading profile…</p>
      </section>
    </main>
  )

  if (error || !profile) return (
    <main className="page-shell">
      <section className="home-panel">
        <h1>Profile not found</h1><p>{error}</p>
        <button className="button secondary" onClick={() => navigate(-1)}>Go back</button>
      </section>
    </main>
  )

  const u = profile.user
  const avgRating = u.averageRating || 0
  const alreadyReviewed = profile.reviews?.some(r => String(r.fromUserId?._id || r.fromUserId) === String(me?.id))
  const canReview = !isOwnProfile && me && !alreadyReviewed

  return (
    <main className="page-shell">
      <section className="home-panel">

        {/* ── Header ── */}
        <div className="profile-header">
          <div className="profile-avatar">{u.username?.slice(0, 2).toUpperCase()}</div>
          <div className="profile-meta">
            <h1 style={{ margin: 0 }}>{u.username}</h1>
            <span className="profile-role-badge">{u.role}</span>
            <div style={{ marginTop: '8px' }}>
              <StarDisplay value={avgRating} />
              <span style={{ color: 'var(--muted)', fontSize: '0.82rem', marginLeft: '8px' }}>
                ({profile.reviews?.length || 0} review{profile.reviews?.length !== 1 ? 's' : ''})
              </span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {isOwnProfile && !editing && (
              <button className="button secondary" onClick={() => setEditing(true)}>Edit Profile</button>
            )}
            {!isOwnProfile && me && (
              <a href={`/messages?user=${u._id}`} className="button secondary">💬 Message</a>
            )}
            {canReview && (
              <button className="button primary" onClick={() => setShowReviewForm(s => !s)}>
                {showReviewForm ? 'Cancel' : '⭐ Leave a Review'}
              </button>
            )}
          </div>
        </div>

        {/* ── Review form ── */}
        {showReviewForm && (
          <div className="review-form-box">
            <h3 style={{ margin: '0 0 16px' }}>Write a Review for {u.username}</h3>

            {reviewMsg.text && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.9rem',
                background: reviewMsg.type === 'error' ? 'rgba(220,38,38,0.1)' : 'rgba(45,212,191,0.1)',
                color: reviewMsg.type === 'error' ? '#dc2626' : 'var(--success)',
                border: `1px solid ${reviewMsg.type === 'error' ? 'rgba(220,38,38,0.25)' : 'rgba(45,212,191,0.25)'}`,
              }}>{reviewMsg.text}</div>
            )}

            <form onSubmit={handleReviewSubmit}>
              <div className="review-ratings-grid">
                <StarPicker label="Communication" value={reviewForm.communication}
                  onChange={v => setReviewForm(f => ({ ...f, communication: v }))} />
                <StarPicker label="Quality of Work" value={reviewForm.quality}
                  onChange={v => setReviewForm(f => ({ ...f, quality: v }))} />
                <StarPicker label="Timeliness" value={reviewForm.timeliness}
                  onChange={v => setReviewForm(f => ({ ...f, timeliness: v }))} />
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '8px' }}>
                  Your review (optional)
                </label>
                <textarea
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                  rows={4} maxLength={500}
                  placeholder={`Share your experience working with ${u.username}…`}
                  style={{ width: '100%', borderRadius: '14px', border: '1px solid var(--border)', padding: '12px 14px', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box', fontSize: '0.93rem' }}
                />
                <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--muted)', marginTop: '4px' }}>
                  {reviewForm.comment.length}/500
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="submit" className="button primary" disabled={reviewSubmitting}>
                  {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                </button>
                <button type="button" className="button secondary" onClick={() => setShowReviewForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* ── Bio ── */}
        <div style={{ marginTop: '28px' }}>
          <h3 style={{ marginBottom: '8px' }}>About</h3>
          {editing ? (
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} maxLength={500}
              placeholder="Tell clients about yourself..."
              style={{ width: '100%', borderRadius: '14px', border: '1px solid var(--border)', padding: '12px 14px', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical' }}
            />
          ) : (
            <p style={{ color: u.bio ? 'var(--text)' : 'var(--muted)', lineHeight: 1.7 }}>
              {u.bio || 'No bio added yet.'}
            </p>
          )}
        </div>

        {/* ── Skills ── */}
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: '10px' }}>Skills</h3>
          <div className="tag-list">
            {skills.map(skill => (
              <span key={skill} className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {skill}
                {editing && (
                  <button type="button" onClick={() => setSkills(prev => prev.filter(s => s !== skill))}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '0 2px', fontSize: '1rem', lineHeight: 1 }}>×</button>
                )}
              </span>
            ))}
            {skills.length === 0 && <span style={{ color: 'var(--muted)' }}>No skills listed yet.</span>}
          </div>
          {editing && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                placeholder="Add a skill and press Enter"
                style={{ flex: 1, borderRadius: '14px', border: '1px solid var(--border)', padding: '10px 14px', background: 'var(--bg)', color: 'var(--text)' }}
              />
              <button type="button" className="button primary" onClick={handleAddSkill}>Add</button>
            </div>
          )}
        </div>

        {editing && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button className="button primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            <button className="button secondary" onClick={() => { setEditing(false); setBio(profile.user.bio || ''); setSkills(profile.user.skills || []) }}>Cancel</button>
          </div>
        )}
        {saveMsg && <p style={{ marginTop: '12px', color: saveMsg.includes('success') ? 'var(--success)' : '#dc2626' }}>{saveMsg}</p>}

        {/* ── Reviews ── */}
        <div style={{ marginTop: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ margin: 0 }}>Reviews</h2>
            {profile.reviews?.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StarDisplay value={avgRating} />
                <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>from {profile.reviews.length} review{profile.reviews.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {reviewMsg.text && !showReviewForm && (
            <div style={{ padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.9rem',
              background: 'rgba(45,212,191,0.1)', color: 'var(--success)', border: '1px solid rgba(45,212,191,0.25)' }}>
              {reviewMsg.text}
            </div>
          )}

          {profile.reviews?.length === 0 ? (
            <div style={{ padding: '40px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⭐</div>
              <p style={{ margin: 0 }}>No reviews yet.{canReview && ' Be the first to leave one!'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {profile.reviews.map(review => {
                const avg = ((review.communication + review.quality + review.timeliness) / 3).toFixed(1)
                return (
                  <article key={review._id} className="review-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--accent-strong))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem', flexShrink: 0 }}>
                          {(review.fromUserId?.username || 'A').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text)' }}>{review.fromUserId?.username || 'Anonymous'}</strong>
                          <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: '2px' }}>
                            {new Date(review.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <StarDisplay value={avg} />
                    </div>

                    {review.comment && (
                      <p style={{ margin: '12px 0 12px', color: 'var(--text)', lineHeight: 1.7, fontSize: '0.93rem' }}>
                        "{review.comment}"
                      </p>
                    )}

                    <div className="review-ratings-row">
                      <span>💬 Communication <strong style={{ color: '#f59e0b' }}>{review.communication}/5</strong></span>
                      <span>✅ Quality <strong style={{ color: '#f59e0b' }}>{review.quality}/5</strong></span>
                      <span>⏱ Timeliness <strong style={{ color: '#f59e0b' }}>{review.timeliness}/5</strong></span>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {/* Already reviewed notice */}
          {!isOwnProfile && me && alreadyReviewed && (
            <p style={{ marginTop: '16px', color: 'var(--muted)', fontSize: '0.88rem', textAlign: 'center' }}>
              ✅ You've already reviewed this user.
            </p>
          )}
          {!me && !isOwnProfile && (
            <p style={{ marginTop: '16px', color: 'var(--muted)', fontSize: '0.88rem', textAlign: 'center' }}>
              <a href="/login" style={{ color: 'var(--accent)' }}>Log in</a> to leave a review.
            </p>
          )}
        </div>

      </section>
    </main>
  )
}
