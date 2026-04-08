import { useAuth } from '../hooks/useAuth.jsx'

const navItems = [
  { id: 'dashboard',   label: 'Dashboard',         icon: '⊞', section: 'overview', roles: ['admin','nurse','medication_aide','cna','social_worker'] },
  { id: 'residents',   label: 'Residents',          icon: '👤', section: 'care',    roles: ['admin','nurse','social_worker'] },
  { id: 'medications', label: 'Medications',        icon: '💊', section: 'care',    roles: ['admin','nurse','medication_aide'] },
  { id: 'dailylogs',   label: 'Daily Logs',         icon: '📋', section: 'care',    roles: ['admin','nurse','medication_aide','cna'] },
  { id: 'incidents',   label: 'Incidents',          icon: '⚠️', section: 'care',    roles: ['admin','nurse','cna','medication_aide','social_worker'] },
  { id: 'handoff',     label: 'Shift Handoff',      icon: '🔄', section: 'care',    roles: ['admin','nurse','medication_aide','cna'] },
  { id: 'staff',       label: 'Staff',              icon: '👥', section: 'admin',   roles: ['admin'] },
  { id: 'reports',     label: 'Reports',            icon: '📊', section: 'admin',   roles: ['admin','nurse'] },
  { id: 'billing',     label: 'Billing',            icon: '💳', section: 'admin',   roles: ['admin'] },
]

const mobileNav = [
  { id: 'dashboard',   icon: '⊞', label: 'Home',      roles: ['admin','nurse','medication_aide','cna','social_worker'] },
  { id: 'residents',   icon: '👤', label: 'Residents', roles: ['admin','nurse','social_worker'] },
  { id: 'medications', icon: '💊', label: 'Meds',      roles: ['admin','nurse','medication_aide'] },
  { id: 'dailylogs',   icon: '📋', label: 'Logs',      roles: ['admin','nurse','medication_aide','cna'] },
  { id: 'incidents',   icon: '⚠️', label: 'Incidents', roles: ['admin','nurse','cna','medication_aide','social_worker'] },
  { id: 'handoff',     icon: '🔄', label: 'Handoff',   roles: ['admin','nurse','medication_aide','cna'] },
]

const sections = ['overview', 'care', 'admin']

const pageTitles = {
  dashboard: 'Dashboard', residents: 'Residents', medications: 'Medications (eMAR)',
  dailylogs: 'Daily Logs', incidents: 'Incidents', handoff: 'Shift Handoff',
  staff: 'Staff', reports: 'Reports', billing: 'Billing',
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
          <div className="logo-mark">
            <div className="logo-icon">CF</div>
            <div className="logo-name">CareFlow</div>
          </div>
          <div className="logo-sub">{facilityName}</div>
        </div>

        <nav className="nav">
          {sections.map(sec => {
            const items = navItems.filter(n => n.section === sec && n.roles.includes(userRole))
            if (!items.length) return null
            return (
              <div key={sec}>
                <div className="nav-section">{sec}</div>
                {items.map(n => (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(15,155,110,.25)', color: '#5BA58A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#C8C4BC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name || 'User'}
              </div>
              <div style={{ fontSize: '11px', color: '#6B6660', textTransform: 'capitalize' }}>
                {userRole.replace('_', ' ')}
              </div>
            </div>
            <button
              onClick={signOut}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6660', fontSize: '15px', padding: '2px', transition: 'color .15s' }}
              onMouseEnter={e => e.target.style.color = '#C8C4BC'}
              onMouseLeave={e => e.target.style.color = '#6B6660'}
              title="Sign out"
            >↩</button>
          </div>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{topbarTitle || pageTitles[page]}</div>
          <div className="topbar-right">
            <div style={{ fontSize: '12px', color: 'var(--text3)', letterSpacing: '.01em' }}>{facilityName}</div>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--teal-light)', color: 'var(--teal-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600' }}>
              {initials}
            </div>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>

      <div className="mobile-nav">
        {mobileNav
          .filter(n => n.roles.includes(userRole))
          .map(n => (
            <div
              key={n.id}
              className={`mobile-nav-item${page === n.id ? ' active' : ''}`}
              onClick={() => setPage(n.id)}
            >
              <span className="mob-icon">{n.icon}</span>
              <span className="mob-label">{n.label}</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}
