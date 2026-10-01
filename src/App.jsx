import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import AdminDashboardPage from './components/AdminDashboardPage.jsx'
import DashboardPage from './components/DashboardPage.jsx'
import LoginPage from './components/LoginPage.jsx'
import SuperAdminDashboardPage from './components/SuperAdminDashboardPage.jsx'
import { apiRequest, clearAuthToken, getAuthToken, saveAuthToken } from './api.js'
import './components/ReferenceDashboard.css'

function getDashboardPath(role) {
  const rolePaths = {
    student: '/student',
    faculty: '/faculty',
    'department-admin': '/department-admin',
    'academic-admin': '/academic-admin',
    'super-admin': '/super-admin',
  }
  return rolePaths[role] || '/login'
}

function ProtectedRoute({ session, allowedRoles, children }) {
  if (!session) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(session.role)) return <Navigate to={getDashboardPath(session.role)} replace />
  return children
}

function App() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [restoringSession, setRestoringSession] = useState(() => Boolean(getAuthToken()))

  useEffect(() => {
    if (!getAuthToken()) return
    let active = true

    apiRequest('/auth/me')
      .then(({ user }) => {
        if (active) setSession({ ...user, identity: user.email })
      })
      .catch(() => clearAuthToken())
      .finally(() => {
        if (active) setRestoringSession(false)
      })

    return () => { active = false }
  }, [])

  function handleLogin({ token, user, remember }) {
    saveAuthToken(token, remember)
    const nextSession = { ...user, identity: user.email }
    setSession(nextSession)
    navigate(getDashboardPath(nextSession.role), { replace: true })
  }

  function handleSignOut() {
    clearAuthToken()
    setSession(null)
    navigate('/login', { replace: true })
  }

  if (restoringSession) {
    return <main className="session-loading" role="status">Checking your session...</main>
  }

  return (
    <>
      <div className="bg-mesh" aria-hidden="true" />
      <div className="bg-orb orb-1" aria-hidden="true" />
      <div className="bg-orb orb-2" aria-hidden="true" />
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Navigate to={session ? getDashboardPath(session.role) : '/login'} replace />} />
          <Route path="/login" element={session ? <Navigate to={getDashboardPath(session.role)} replace /> : <LoginPage onLogin={handleLogin} />} />
          <Route path="/student" element={<ProtectedRoute session={session} allowedRoles={['student']}><DashboardPage session={session} onSignOut={handleSignOut} /></ProtectedRoute>} />
          <Route path="/faculty" element={<ProtectedRoute session={session} allowedRoles={['faculty']}><DashboardPage session={session} onSignOut={handleSignOut} /></ProtectedRoute>} />
          <Route path="/department-admin" element={<ProtectedRoute session={session} allowedRoles={['department-admin']}><AdminDashboardPage session={session} onSignOut={handleSignOut} /></ProtectedRoute>} />
          <Route path="/academic-admin" element={<ProtectedRoute session={session} allowedRoles={['academic-admin']}><AdminDashboardPage session={session} onSignOut={handleSignOut} /></ProtectedRoute>} />
          <Route path="/super-admin" element={<ProtectedRoute session={session} allowedRoles={['super-admin']}><SuperAdminDashboardPage session={session} onSignOut={handleSignOut} /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to={session ? getDashboardPath(session.role) : '/login'} replace />} />
        </Routes>
      </div>
    </>
  )
}

export default App
