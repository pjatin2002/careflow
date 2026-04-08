import { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Residents from './pages/Residents'
import DailyLogs from './pages/DailyLogs'
import Incidents from './pages/Incidents'
import Handoff from './pages/Handoff'
import Staff from './pages/Staff'
import Reports from './pages/Reports'
import './index.css'

// Placeholder pages for modules being built
function Medications() {
  return (
    <div className="panel">
      <div className="panel-title">Medications (eMAR)</div>
      <div style={{ color: 'var(--text2)', fontSize: '13px', lineHeight: '1.7' }}>
        The eMAR module is being built. It will include:<br />
        • Medication schedule setup per resident<br />
        • One-tap given / refused / missed / held recording<br />
        • Controlled substance count log<br />
        • Missed dose alerts<br />
        • 30-day medication log PDF export<br /><br />
        To add medications now, use the Supabase dashboard → medications table.
      </div>
    </div>
  )
}

function AppInner() {
  const { user, profile, loading } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [topbarTitle, setTopbarTitle] = useState(null)

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--teal)', marginBottom: '8px' }}>CareFlow</div>
        <div style={{ fontSize: '13px', color: 'var(--text2)' }}>Loading...</div>
      </div>
    </div>
  )

  if (!user) return <Login />

  if (!profile) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '20px' }}>
      <div className="panel" style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Profile setup needed</div>
        <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.7', marginBottom: '16px' }}>
          Your account exists but no profile is linked to a facility yet.<br />
          Run the seed SQL in Supabase to create your facility and link your profile.
        </div>
        <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: 'var(--radius)', fontFamily: 'monospace', fontSize: '12px', textAlign: 'left', marginBottom: '16px' }}>
          {`-- In Supabase SQL Editor, run:\nINSERT INTO facilities (id, name) VALUES\n  ('00000000-0000-0000-0000-000000000001', 'Your Facility Name');\n\nINSERT INTO profiles (id, facility_id, full_name, role) VALUES\n  ('${user.id}', '00000000-0000-0000-0000-000000000001', 'Your Name', 'admin');`}
        </div>
        <button className="btn btn-outline" onClick={() => window.location.reload()}>Reload after running SQL</button>
      </div>
    </div>
  )

  const navigate = (p) => { setPage(p); setTopbarTitle(null) }

  const pages = {
    dashboard: <Dashboard onNavigate={navigate} />,
    residents: <Residents />,
    medications: <Medications />,
    dailylogs: <DailyLogs />,
    incidents: <Incidents />,
    handoff: <Handoff />,
    staff: <Staff />,
    reports: <Reports />,
  }

  return (
    <Layout page={page} setPage={navigate} topbarTitle={topbarTitle}>
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
