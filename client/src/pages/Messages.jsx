import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import api from '../api/axios.js'

const socketBase = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'http://localhost:5000'

const getToken = () => localStorage.getItem('token')
const decodeUser = () => {
  try {
    const token = getToken()
    if (!token) return null
    const payload = token.split('.')[1]
    if (!payload) return null
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

const formatTime = (value) => {
  try {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

const parseAttachment = (value) => {
  try { return JSON.parse(value) } catch { return { name: value, url: value } }
}

const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export default function MessagesPage() {
  const [user] = useState(() => {
    const decoded = decodeUser()
    if (decoded) return decoded
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [thread, setThread] = useState([])
  const [messageText, setMessageText] = useState('')
  const [attachments, setAttachments] = useState([])
  const [typingStatus, setTypingStatus] = useState({})
  const [error, setError] = useState('')
  const socketRef = useRef(null)
  const threadEndRef = useRef(null)
  // Track selected partner ID to avoid re-fetching thread on unrelated state updates
  const selectedPartnerIdRef = useRef(null)

  // New chat search state
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()

  // Socket setup
  useEffect(() => {
    if (!user) return
    const token = getToken()
    const socket = io(socketBase, { auth: { token }, transports: ['websocket'] })

    socket.on('connect_error', (err) => console.error('Socket error:', err.message))

    socket.on('new_message', (message) => {
      const conversationId = message.senderId === user.id ? message.receiverId : message.senderId
      setConversations((prev) => {
        const existing = prev.find((item) => item.user.id === conversationId)
        const result = {
          user: existing?.user || { id: conversationId, username: 'User' },
          lastMessage: message.content || 'Shared a file',
          attachments: message.attachments,
          lastUpdated: message.createdAt,
          unreadCount: (existing?.unreadCount ?? 0) + (message.receiverId === user.id ? 1 : 0),
        }
        return [result, ...prev.filter((item) => item.user.id !== conversationId)]
      })
      // Only append to thread if this conversation is open — deduplicate by _id
      if (selectedPartnerIdRef.current === conversationId) {
        setThread((prev) => {
          if (prev.some(m => m._id && m._id === message._id)) return prev
          return [...prev, message]
        })
      }
    })

    socket.on('typing', ({ from, isTyping }) => {
      setTypingStatus((prev) => ({ ...prev, [from]: isTyping }))
    })

    socketRef.current = socket
    return () => { socket.disconnect(); socketRef.current = null }
  }, [user])

  // Load conversations on mount
  useEffect(() => {
    if (!user) return
    fetchConversations()
  }, [user])

  // Auto-open conversation from ?user= query param
  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams(location.search)
    const userParam = params.get('user')
    if (!userParam) return

    const existing = conversations.find((c) => c.user.id === userParam)
    if (existing) { setSelectedConversation(existing); return }

    ;(async () => {
      try {
        const resp = await api.get(`/users/${userParam}`)
        const partner = resp.data.user
        const conv = {
          user: { id: userParam, username: partner.username || 'User' },
          lastMessage: '',
          attachments: [],
          lastUpdated: new Date().toISOString(),
          unreadCount: 0,
        }
        setSelectedConversation(conv)
        params.delete('user')
        navigate({ pathname: location.pathname, search: params.toString() }, { replace: true })
      } catch (err) { console.error('Unable to load user for conversation', err) }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, user, conversations])

  // Load thread only when the actual partner changes
  useEffect(() => {
    if (!selectedConversation) return
    const partnerId = selectedConversation.user.id
    if (selectedPartnerIdRef.current === partnerId) return // same partner, don't reload
    selectedPartnerIdRef.current = partnerId
    fetchThread(partnerId)
  }, [selectedConversation])

  // Scroll to bottom when thread updates
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  const fetchConversations = async () => {
    try {
      const response = await api.get('/messages/conversations')
      setConversations(response.data)
      if (response.data.length > 0) setSelectedConversation(response.data[0])
    } catch (err) {
      console.error(err)
      setError('Unable to load conversations.')
    }
  }

  const fetchThread = async (partnerId) => {
    try {
      const response = await api.get(`/messages/thread/${partnerId}`)
      setThread(response.data)
    } catch (err) {
      console.error(err)
    }
  }

  // Search users for new chat
  const handleSearch = async (query) => {
    setSearchQuery(query)
    if (!query.trim()) { setSearchResults([]); return }
    setSearching(true)
    try {
      const resp = await api.get(`/users/search?q=${encodeURIComponent(query)}`)
      setSearchResults(resp.data.filter((u) => u._id !== user.id && u.id !== user.id))
    } catch {
      // fallback: show no results
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleStartChat = (partner) => {
    const conv = {
      user: { id: partner._id || partner.id, username: partner.username },
      lastMessage: '',
      attachments: [],
      lastUpdated: new Date().toISOString(),
      unreadCount: 0,
    }
    selectedPartnerIdRef.current = null // reset so thread fetches fresh
    setSelectedConversation(conv)
    setThread([])
    setShowNewChat(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const updateTyping = (isTyping) => {
    if (!socketRef.current || !selectedConversation) return
    socketRef.current.emit('typing', { to: selectedConversation.user.id, isTyping })
  }

  const handleInputChange = (e) => {
    setMessageText(e.target.value)
    updateTyping(e.target.value.length > 0)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSelectConversation = (conversation) => {
    selectedPartnerIdRef.current = null // reset so fetchThread runs for new partner
    setSelectedConversation(conversation)
    setTypingStatus({})
    setThread([])
  }

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || [])
    const fileAttachments = []
    for (const file of files) {
      const dataUrl = await readFileAsDataURL(file)
      fileAttachments.push(JSON.stringify({ name: file.name, url: dataUrl }))
    }
    setAttachments((current) => [...current, ...fileAttachments])
    event.target.value = ''
  }

  const handleSend = () => {
    if (!selectedConversation || (!messageText.trim() && attachments.length === 0)) return
    const payload = {
      to: selectedConversation.user.id,
      content: messageText.trim(),
      attachments,
    }
    socketRef.current?.emit('send_message', payload)
    // Don't add optimistically — the server echoes new_message back to sender
    setMessageText('')
    setAttachments([])
    updateTyping(false)
  }

  const typingIndicator = useMemo(() => {
    if (!selectedConversation) return ''
    return typingStatus[selectedConversation.user.id]
      ? `${selectedConversation.user.username} is typing...`
      : ''
  }, [typingStatus, selectedConversation])

  if (!user) {
    return (
      <main className="page-shell">
        <div className="home-panel">
          <h2>Messages</h2>
          <p>Please log in to use the real-time chat feature.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="messages-shell">
      {/* Left: conversation list */}
      <section className="conversation-list">
        <header>
          <h2>Conversations</h2>
          <button
            type="button"
            className="new-chat-btn"
            onClick={() => setShowNewChat((s) => !s)}
            title="New conversation"
          >＋</button>
        </header>

        {/* New chat search panel */}
        {showNewChat && (
          <div className="new-chat-panel">
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by username..."
              className="new-chat-search"
            />
            {searching && <div className="new-chat-hint">Searching...</div>}
            {!searching && searchQuery && searchResults.length === 0 && (
              <div className="new-chat-hint">No users found.</div>
            )}
            {searchResults.map((u) => (
              <button
                key={u._id || u.id}
                type="button"
                className="new-chat-result"
                onClick={() => handleStartChat(u)}
              >
                <span className="new-chat-avatar">{u.username.slice(0, 2).toUpperCase()}</span>
                <span>{u.username}</span>
                <span className="new-chat-role">{u.role}</span>
              </button>
            ))}
          </div>
        )}

        {conversations.length === 0 && !showNewChat ? (
          <div className="empty-state">No conversations yet. Click ＋ to start a chat.</div>
        ) : (
          conversations.map((conversation) => (
            <button
              key={conversation.user.id}
              type="button"
              className={`conversation-item ${selectedConversation?.user.id === conversation.user.id ? 'active' : ''}`}
              onClick={() => handleSelectConversation(conversation)}
            >
              <div className="conv-avatar">{conversation.user.username.slice(0, 2).toUpperCase()}</div>
              <div className="conv-info">
                <div className="conversation-title">{conversation.user.username}</div>
                <div className="conversation-subtitle">
                  <span>{conversation.lastMessage}</span>
                  {conversation.unreadCount > 0 && (
                    <span className="badge">{conversation.unreadCount}</span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </section>

      {/* Right: chat thread */}
      <section className="chat-thread">
        <header>
          <h2>{selectedConversation?.user?.username || 'Select a conversation'}</h2>
          {typingIndicator && <span className="typing-indicator">{typingIndicator}</span>}
        </header>

        <div className="thread-messages">
          {!selectedConversation && (
            <div className="thread-empty">Select a conversation or start a new one.</div>
          )}
          {selectedConversation && thread.length === 0 && (
            <div className="thread-empty">No messages yet. Say hello! 👋</div>
          )}
          {thread.map((message) => {
            const isOwn = message.senderId === user.id
            return (
              <div key={message._id || message.id} className={`message-row ${isOwn ? 'user' : ''}`}>
                {!isOwn && (
                  <div className="msg-avatar">
                    {selectedConversation?.user?.username?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="message-bubble">
                  {message.content && <div>{message.content}</div>}
                  {message.attachments?.map((attachment, index) => {
                    const item = parseAttachment(attachment)
                    return (
                      <div key={`${message._id || message.id}-att-${index}`} className="message-attachment">
                        <span>📎 {item.name || 'Attachment'}</span>
                        {item.url && (
                          <a href={item.url} download={item.name} target="_blank" rel="noreferrer">
                            Download
                          </a>
                        )}
                      </div>
                    )
                  })}
                  <time>{formatTime(message.createdAt)}</time>
                </div>
              </div>
            )
          })}
          <div ref={threadEndRef} />
        </div>

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="attachment-preview">
            {attachments.map((att, i) => {
              const item = parseAttachment(att)
              return (
                <span key={i} className="attachment-chip">
                  📎 {item.name}
                  <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}>×</button>
                </span>
              )
            })}
          </div>
        )}

        <div className="chat-input">
          <textarea
            value={messageText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={selectedConversation ? 'Type a message… (Enter to send)' : 'Select a conversation to start messaging.'}
            disabled={!selectedConversation}
            rows={2}
          />
          <div className="send-controls">
            <label className="attach-label" title="Attach file">
              📎
              <input type="file" multiple onChange={handleFiles} disabled={!selectedConversation} />
            </label>
            <button
              type="button"
              className="send-btn"
              onClick={handleSend}
              disabled={!selectedConversation || (!messageText.trim() && attachments.length === 0)}
            >
              Send
            </button>
          </div>
        </div>
        {error && <p className="error-message" style={{ padding: '0 18px 12px' }}>{error}</p>}
      </section>
    </main>
  )
}
