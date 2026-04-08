import { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Onboarding from './pages/Onboarding.jsx'
import FamilyPortal from './pages/FamilyPortal.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Residents from './pages/Residents.jsx'
import Medications from './pages/Medications.jsx'
import DailyLogs from './pages/DailyLogs.jsx'
import Incidents from './pages/Incidents.jsx'
import Handoff from './pages/Handoff.jsx'
import Staff from './pages/Staff.jsx'
import Reports from './pages/Reports.jsx'
import Billing from './pages/Billing.jsx'
import './index.css'

function AppInner() {
  const { user, profile, loading } = useAuth()
  const [page, setPage] = useState('dashboard')

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--teal)', marginBottom: '8px' }}>CareFlow</div>
        <div style={{ fontSize: '13px', color: 'var(--text2)' }}>Loading...</div>
      </div>
    </div>
  )

  if (!user) return <Login />

  if (profile?.role === 'family') return <FamilyPortal />

  if (!profile) return <Onboarding user={user} onComplete={() => window.location.reload()} />

  const navigate = (p) => setPage(p)

  const pages = {
    dashboard:   <Dashboard onNavigate={navigate} />,
    residents:   <Residents />,
    medications: <Medications />,
    dailylogs:   <DailyLogs />,
    incidents:   <Incidents />,
    handoff:     <Handoff />,
    staff:       <Staff />,
    reports:     <Reports />,
    billing:     <Billing />,
  }

  return (
    <Layout page={page} setPage={navigate}>
      {pages[page] || pages.dashboard}
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
