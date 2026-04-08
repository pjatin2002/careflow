import { useAuth } from '../hooks/useAuth.jsx'

const navItems = [
  { id: 'dashboard',   label: 'Dashboard',         icon: '⊞', section: 'overview', roles: ['admin','nurse','medication_aide','cna','social_worker'] },
  { id: 'residents',   label: 'Residents',          icon: '👤', section: 'care',    roles: ['admin','nurse','social_worker'] },
  { id: 'medications', label: 'Medications (eMAR)', icon: '💊', section: 'care',    roles: ['admin','nurse','medication_aide'] },
  { id: 'dailylogs',   label: 'Daily Logs',         icon: '📋', section: 'care',    roles: ['admin','nurse','medication_aide','cna'] },
  { id: 'incidents',   label: 'Incidents',          icon: '⚠️', section: 'care',    roles: ['admin','nurse','cna','medication_aide','social_worker'] },
  { id: 'handoff',     label: 'Shift Handoff',      icon: '🔄', section: 'care',    roles: ['admin','nurse','medication_aide','cna'] },
  { id: 'staff',       label: 'Staff',              icon: '👥', section: 'admin',   roles: ['admin'] },
  { id: 'reports',     label: 'Reports',            icon: '📊', section: 'admin',   roles: ['admin','nurse'] },
  { id: 'billing',     label: 'Billing & Plans',    icon: '💳', section: 'admin',   roles: ['admin'] },
]

const sections = ['overview', 'care', 'admin']

const pageTitles = {
  dashboard: 'Dashboard', residents: 'Residents', medications: 'Medications (eMAR)',
  dailylogs: 'Daily Logs', incidents: 'Incidents', handoff: 'Shift Handoff',
  staff: 'Staff', reports: 'Reports', billing: 'Billing & Plans',
}

export default function Layout({ page, setPage, children, topbarTitle }) {
  const { profile, signOut } = useAuth()
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'CF'
  const facilityName = profile?.facilities?.name || 'CareFlow'
  const userRole = profile?.role || 'cna'

  return (
    <div className="app">
      <div className="sidebar">
        <div className="logo">
          <div className="logo-name">CareFlow</div>
          <div className="logo-sub">{facilityName}</div>
        </div>
        <nav className="nav">
          {sections.map(sec => {
            const sectionItems = navItems.filter(n => n.section === sec && n.roles.includes(userRole))
            if (!sectionItems.length) return null
            return (
              <div key={sec}>
                <div className="nav-section">{sec}</div>
                {sectionItems.map(n => (
                  <div
                    key={n.id}
                    className={`nav-item${page === n.id ? ' active' : ''}`}
                    onClick={() => setPage(n.id)}
                  >
                    <span className="nav-icon">{n.icon}</span>
                    {n.label}
                  </div>
                ))}
              </div>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="avatar" style={{ background: 'var(--teal-light)', color: 'var(--teal-dark)', fontSize: '11px' }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name || 'User'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text2)', textTransform: 'capitalize' }}>
                {userRole.replace('_', ' ')}
              </div>
            </div>
            <button
              onClick={signOut}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: '16px', padding: '2px' }}
              title="Sign out"
            >↩</button>
          </div>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{topbarTitle || pageTitles[page]}</div>
          <div className="topbar-right">
            <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{facilityName}</span>
            <div className="avatar" style={{ background: 'var(--teal-light)', color: 'var(--teal-dark)', fontSize: '11px' }}>
              {initials}
            </div>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  )
}
