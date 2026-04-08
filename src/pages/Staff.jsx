import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

const COLORS = [
  { bg: '#E1F5EE', text: '#085041' }, { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#EEEDFE', text: '#3C3489' }, { bg: '#FAEEDA', text: '#633806' },
  { bg: '#EAF3DE', text: '#27500A' }, { bg: '#FCEBEB', text: '#791F1F' },
]

export default function Staff() {
  const { profile } = useAuth()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchStaff = useCallback(async () => {
    if (!profile?.facility_id) return
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('facility_id', profile.facility_id)
      .eq('is_active', true)
      .order('full_name')
    setStaff(data || [])
    setLoading(false)
  }, [profile])

  useEffect(() => {
    if (profile?.facility_id) fetchStaff()
  }, [profile, fetchStaff])

  if (loading) return <div className="loading">Loading staff...</div>

  const sixtyDaysFromNow = new Date()
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text2)' }}>{staff.length} team members</div>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => alert('To add staff: go to Supabase dashboard → Authentication → Invite user. They receive an email to set their password and will appear here after signing in.')}
        >
          How to add staff
        </button>
      </div>

      <div className="grid-3">
        {staff.map((s, i) => {
          const c = COLORS[i % COLORS.length]
          const initials = s.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'CF'
          const expiring = s.cert_expiry && new Date(s.cert_expiry) < sixtyDaysFromNow
          return (
            <div key={s.id} className="card">
              <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '14px', fontWeight: '700', background: c.bg, color: c.text, marginBottom: '10px' }}>
                {initials}
              </div>
              <div style={{ fontWeight: '500', marginBottom: '2px' }}>{s.full_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px', textTransform: 'capitalize' }}>{s.role?.replace('_', ' ')}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '8px' }}>{s.shift}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge green">Active</span>
                {expiring && <span className="badge amber">Cert expiring</span>}
              </div>
              {s.certification && (
                <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '6px' }}>
                  {s.certification} · expires {s.cert_expiry}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {staff.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '12px' }}>No staff profiles yet.</div>
          <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
            Go to your Supabase dashboard → Authentication → Invite user to add team members.
          </div>
        </div>
      )}
    </div>
  )
}
