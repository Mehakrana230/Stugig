import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import MessagesPage from './pages/Messages.jsx'
import PaymentsPage from './pages/Payments.jsx'
import JobsPage from './pages/Jobs.jsx'
import PublicProfilePage from './pages/PublicProfile.jsx'
import AdminPage from './pages/Admin.jsx'
import LoginPage from './pages/Login.jsx'
import SignupPage from './pages/Signup.jsx'
import HomePage from './pages/Home.jsx'
import ForgotPasswordPage from './pages/ForgotPassword.jsx'
import './App.css'
import DashboardLayout from './components/DashboardLayout'

const getMyId = () => {
  try {
    const stored = localStorage.getItem('user')
    if (stored) {
      const u = JSON.parse(stored)
      return u.id || u._id || null
    }
    const token = localStorage.getItem('token')
    if (!token) return null
    const decoded = JSON.parse(atob(token.split('.')[1]))
    return decoded.id || decoded._id || null
  } catch { return null }
}

function MyProfileRedirect() {
  const id = getMyId()
  if (id) return <Navigate to={`/profile/${id}`} replace />
  return <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/my-profile" element={<MyProfileRedirect />} />
          <Route path="/profile/:userId" element={<PublicProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  )
}

export default App
