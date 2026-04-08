import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

const ROLES = ['admin', 'nurse', 'medication_aide', 'cna', 'social_worker']
const SHIFTS = ['Day (6A–2P)', 'Evening (2P–10P)', 'Night (10P–6A)', 'Mon–Fri']
const COLORS = [
  ['#E1F5EE','#085041'], ['#E6F1FB','#0C447C'], ['#EEEDFE','#3C3489'],
  ['#FAEEDA','#633806'], ['#EAF3DE','#27500A'], ['#FCEBEB','#791F1F'],
]

export default function Staff() {
  const { profile } = useAuth()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [showEdit, setShowEdit] = useState(null)
  const [saving, setSaving] = useState(false)
  const [inviteStatus, setInviteStatus] = useState(null)
  const [form, setForm] = useState({ email: '', full_name: '', role: 'cna', shift: SHIFTS[0], certification: '', cert_expiry: '', phone: '' })
  const [editForm, setEditForm] = useState({})

  const fetchStaff = useCallback(async () => {
    if (!profile?.facility_id) return
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*')
      .eq('facility_id', profile.facility_id).eq('is_active', true).order('full_name')
    setStaff(data || [])
    setLoading(false)
  }, [profile])

  useEffect(() => { if (profile?.facility_id) fetchStaff() }, [profile, fetchStaff])

  const sendInvite = async () => {
    if (!form.email || !form.full_name) return
    setSaving(true)
    setInviteStatus(null)
    await supabase.from('profiles').upsert({
      facility_id: profile.facility_id,
      full_name: form.full_name,
      role: form.role,
      shift: form.shift,
      certification: form.certification || null,
      cert_expiry: form.cert_expiry || null,
      phone: form.phone || null,
      is_active: true,
    })
    setInviteStatus({
      type: 'info',
      message: `Profile created for ${form.full_name}. Now go to Supabase → Authentication → Invite user → enter "${form.email}". They will receive a setup email. After they sign in, their profile will be automatically linked.`
    })
    setForm({ email: '', full_name: '', role: 'cna', shift: SHIFTS[0], certification: '', cert_expiry: '', phone: '' })
    fetchStaff()
    setSaving(false)
  }

  const updateStaff = async () => {
    if (!showEdit) return
    setSaving(true)
    await supabase.from('profiles').update(editForm).eq('id', showEdit.id)
    setShowEdit(null)
    fetchStaff()
    setSaving(false)
  }

  const deactivate = async (id) => {
    if (!confirm('Remove this staff member? They will lose access.')) return
    await supabase.from('profiles').update({ is_active: false }).eq('id', id)
    fetchStaff()
  }

  const certExpiringSoon = (expiry) => {
    if (!expiry) return false
    const d = new Date()
    d.setDate(d.getDate() + 60)
    return new Date(expiry) < d
  }

  if (loading) return <div className="loading">Loading staff...</div>

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '500' }}>{staff.length} team members</div>
          <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{staff.filter(s => s.shift?.includes('Day')).length} day shift</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowInvite(true)}>+ Invite staff member</button>
      </div>

      {staff.filter(s => certExpiringSoon(s.cert_expiry)).length > 0 && (
        <div style={{ background: '#FAEEDA', border: '.5px solid #EF9F27', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '14px', fontSize: '13px', color: '#633806' }}>
          Certifications expiring soon: {staff.filter(s => certExpiringSoon(s.cert_expiry)).map(s => s.full_name).join(', ')}
        </div>
      )}

      <div className="grid-3">
        {staff.map((s, i) => {
          const [bg, tc] = COLORS[i % COLORS.length]
          const initials = s.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'CF'
          const expiring = certExpiringSoon(s.cert_expiry)
          return (
            <div key={s.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '14px', fontWeight: '700', background: bg, color: tc }}>{initials}</div>
                <button className="btn btn-outline btn-sm" onClick={() => { setShowEdit(s); setEditForm({ full_name: s.full_name, role: s.role, shift: s.shift, certification: s.certification || '', cert_expiry: s.cert_expiry || '', phone: s.phone || '' }) }}>Edit</button>
              </div>
              <div style={{ fontWeight: '500', marginBottom: '2px' }}>{s.full_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '2px', textTransform: 'capitalize' }}>{s.role?.replace('_', ' ')}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '8px' }}>{s.shift}</div>
              {s.phone && <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '6px' }}>{s.phone}</div>}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="badge green">Active</span>
                {expiring && <span className="badge amber">Cert expiring</span>}
                {s.id !== profile.id && (
                  <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--red)', fontSize: '12px', cursor: 'pointer' }} onClick={() => deactivate(s.id)}>Remove</button>
                )}
              </div>
              {s.certification && <div style={{ fontSize: '11px', color: expiring ? 'var(--amber)' : 'var(--text2)', marginTop: '6px' }}>{s.certification} · expires {s.cert_expiry}</div>}
            </div>
          )
        })}
      </div>

      {staff.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '12px' }}>No staff yet.</div>
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>+ Invite first staff member</button>
        </div>
      )}

      {showInvite && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">Invite staff member</div>
            {inviteStatus && (
              <div style={{ background: '#E6F1FB', border: '.5px solid #85B7EB', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: '13px', color: '#0C447C', marginBottom: '14px', lineHeight: '1.6' }}>
                {inviteStatus.message}
              </div>
            )}
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group"><label className="form-label">Full name *</label><input className="form-input" placeholder="Sarah Chen" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Email address *</label><input className="form-input" type="email" placeholder="sarah@facility.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Shift</label>
                <select className="form-select" value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}>
                  {SHIFTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" placeholder="(330) 555-0100" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Certification</label><input className="form-input" placeholder="CNA, RN, LPN..." value={form.certification} onChange={e => setForm({ ...form, certification: e.target.value })} /></div>
            </div>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Certification expiry</label>
              <input className="form-input" type="date" value={form.cert_expiry} onChange={e => setForm({ ...form, cert_expiry: e.target.value })} style={{ width: '200px' }} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setShowInvite(false); setInviteStatus(null) }}>Close</button>
              <button className="btn btn-primary" onClick={sendInvite} disabled={saving || !form.email || !form.full_name}>
                {saving ? 'Saving...' : 'Create profile + invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">Edit — {showEdit.full_name}</div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group"><label className="form-label">Full name</label><input className="form-input" value={editForm.full_name || ''} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            </div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={editForm.role || ''} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Shift</label>
                <select className="form-select" value={editForm.shift || ''} onChange={e => setEditForm({ ...editForm, shift: e.target.value })}>
                  {SHIFTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: '14px' }}>
              <div className="form-group"><label className="form-label">Certification</label><input className="form-input" value={editForm.certification || ''} onChange={e => setEditForm({ ...editForm, certification: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Cert expiry</label><input className="form-input" type="date" value={editForm.cert_expiry || ''} onChange={e => setEditForm({ ...editForm, cert_expiry: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowEdit(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={updateStaff} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
