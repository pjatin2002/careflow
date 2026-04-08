import { useState } from 'react'
import { useResidents } from '../hooks/useResidents'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const COLORS = [
  { bg: '#E1F5EE', text: '#085041' }, { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#EEEDFE', text: '#3C3489' }, { bg: '#FAEEDA', text: '#633806' },
  { bg: '#EAF3DE', text: '#27500A' }, { bg: '#FCEBEB', text: '#791F1F' },
]

function initials(r) { return ((r.first_name?.[0] || '') + (r.last_name?.[0] || '')).toUpperCase() }
function colorFor(id, idx) { return COLORS[idx % COLORS.length] }

export default function Residents() {
  const { profile } = useAuth()
  const { residents, loading, addResident, refetch } = useResidents()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [form, setForm] = useState({
    first_name: '', last_name: '', date_of_birth: '', room: '',
    admission_date: '', primary_diagnosis: '', secondary_diagnoses: '',
    physician: '', physician_phone: '', emergency_contact_name: '',
    emergency_contact_phone: '', emergency_contact_relation: '',
    insurance_type: 'Medicaid', code_status: 'Full Code',
    diet: '', mobility: '', allergies: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [carePlans, setCarePlans] = useState([])
  const [meds, setMeds] = useState([])
  const [logs, setLogs] = useState([])

  const filtered = residents.filter(r =>
    `${r.first_name} ${r.last_name} ${r.room}`.toLowerCase().includes(search.toLowerCase())
  )

  async function openResident(r) {
    setSelected(r)
    setActiveTab('overview')
    const [{ data: cp }, { data: m }, { data: l }] = await Promise.all([
      supabase.from('care_plans').select('*').eq('resident_id', r.id).eq('status', 'active'),
      supabase.from('medications').select('*').eq('resident_id', r.id).eq('is_active', true),
      supabase.from('daily_logs').select('*').eq('resident_id', r.id).order('logged_at', { ascending: false }).limit(20),
    ])
    setCarePlans(cp || [])
    setMeds(m || [])
    setLogs(l || [])
  }

  async function handleAdd() {
    setSaving(true)
    const { error } = await addResident(form)
    setSaving(false)
    if (!error) {
      setShowAdd(false)
      setForm({ first_name: '', last_name: '', date_of_birth: '', room: '', admission_date: '', primary_diagnosis: '', secondary_diagnoses: '', physician: '', physician_phone: '', emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '', insurance_type: 'Medicaid', code_status: 'Full Code', diet: '', mobility: '', allergies: '', notes: '' })
    }
  }

  if (loading) return <div className="loading">Loading residents...</div>

  if (selected) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text2)', cursor: 'pointer', marginBottom: '18px' }} onClick={() => setSelected(null)}>
        ← Back to residents
      </div>
      <div className="panel" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div className="avatar" style={{ width: '56px', height: '56px', fontSize: '18px', fontWeight: '700', background: colorFor(selected.id, residents.indexOf(selected)).bg, color: colorFor(selected.id, residents.indexOf(selected)).text, flexShrink: 0 }}>
            {initials(selected)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '2px' }}>{selected.first_name} {selected.last_name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '8px' }}>
              Room {selected.room} · DOB {selected.date_of_birth} · Admitted {selected.admission_date}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span className="tag">{selected.primary_diagnosis}</span>
              <span className="tag">{selected.physician}</span>
              <span className={`badge ${selected.status === 'active' ? 'green' : 'amber'}`}>{selected.status}</span>
              <span className="badge gray">{selected.code_status}</span>
            </div>
          </div>
          <button className="btn btn-outline btn-sm">Edit profile</button>
        </div>
      </div>

      <div className="tabs">
        {['overview', 'medications', 'logs', 'incidents', 'care plan'].map(t => (
          <div key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid-2">
          <div>
            <div className="panel section-gap">
              <div className="panel-title">Contact information</div>
              <table className="table">
                <tbody>
                  <tr><td className="text-muted text-sm">Physician</td><td>{selected.physician} {selected.physician_phone && `· ${selected.physician_phone}`}</td></tr>
                  <tr><td className="text-muted text-sm">Emergency contact</td><td>{selected.emergency_contact_name} ({selected.emergency_contact_relation}) {selected.emergency_contact_phone}</td></tr>
                  <tr><td className="text-muted text-sm">Insurance</td><td>{selected.insurance_type}</td></tr>
                  <tr><td className="text-muted text-sm">Allergies</td><td>{selected.allergies || 'NKDA'}</td></tr>
                  <tr><td className="text-muted text-sm">Diet</td><td>{selected.diet || '—'}</td></tr>
                  <tr><td className="text-muted text-sm">Mobility</td><td>{selected.mobility || '—'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="panel">
              <div className="panel-title">Recent logs</div>
              {logs.slice(0, 5).map(l => (
                <div key={l.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="fw-500">{l.log_type}</span>
                    <span className="text-muted text-sm">{new Date(l.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-muted text-sm">{l.notes}</div>
                </div>
              ))}
              {logs.length === 0 && <div className="text-muted text-sm">No logs today</div>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'medications' && (
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '14px' }}>Active medications — tap a slot to record administration</div>
          <div className="mar-grid">
            {meds.length === 0 && <div className="text-muted">No active medications on file.</div>}
            {meds.map(m => (
              <div className="mar-card" key={m.id}>
                <div className="mar-drug">{m.drug_name}</div>
                <div className="mar-dose">{m.dose} {m.route} {m.frequency}{m.prn ? ' (PRN)' : ''}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(m.times || []).map((t, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <div className="mar-slot pending">Pending</div>
                      <div className="mar-slot-time">{t}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'care plan' && (
        <div className="panel">
          <div className="panel-title">Active care plan items<button className="btn btn-primary btn-sm">+ Add problem</button></div>
          {carePlans.length === 0
            ? <div className="text-muted">No care plan items. Click "+ Add problem" to start.</div>
            : <table className="table">
              <thead><tr><th>Problem</th><th>Goal</th><th>Intervention</th><th>Frequency</th></tr></thead>
              <tbody>
                {carePlans.map(cp => (
                  <tr key={cp.id}>
                    <td className="fw-500">{cp.problem}</td>
                    <td>{cp.goal}</td>
                    <td>{cp.intervention}</td>
                    <td>{cp.frequency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <input className="form-input" placeholder="Search by name or room..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '280px' }} />
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Admit resident</button>
      </div>

      <div className="grid-3">
        {filtered.map((r, i) => {
          const c = colorFor(r.id, i)
          return (
            <div key={r.id} className="card" style={{ cursor: 'pointer', transition: 'border-color .15s' }} onClick={() => openResident(r)}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div className="avatar" style={{ width: '44px', height: '44px', fontSize: '15px', fontWeight: '700', background: c.bg, color: c.text, marginBottom: '10px' }}>
                {initials(r)}
              </div>
              <div style={{ fontWeight: '500', marginBottom: '2px' }}>{r.first_name} {r.last_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '2px' }}>Room {r.room}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '8px' }}>{r.primary_diagnosis}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge ${r.status === 'active' ? 'green' : 'amber'}`}>{r.status}</span>
                <span style={{ fontSize: '11px', color: 'var(--text2)' }}>{r.physician}</span>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && <div className="empty">No residents found.</div>}

      {showAdd && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">Admit new resident</div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group"><label className="form-label">First name *</label><input className="form-input" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Last name *</label><input className="form-input" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></div>
            </div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group"><label className="form-label">Date of birth</label><input className="form-input" type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Room</label><input className="form-input" placeholder="101A" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} /></div>
            </div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group"><label className="form-label">Admission date</label><input className="form-input" type="date" value={form.admission_date} onChange={e => setForm({ ...form, admission_date: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Code status</label>
                <select className="form-select" value={form.code_status} onChange={e => setForm({ ...form, code_status: e.target.value })}>
                  {['Full Code', 'DNR', 'DNI', 'Comfort Care'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Primary diagnosis</label>
              <input className="form-input" value={form.primary_diagnosis} onChange={e => setForm({ ...form, primary_diagnosis: e.target.value })} />
            </div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group"><label className="form-label">Physician</label><input className="form-input" placeholder="Dr. Smith" value={form.physician} onChange={e => setForm({ ...form, physician: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Physician phone</label><input className="form-input" value={form.physician_phone} onChange={e => setForm({ ...form, physician_phone: e.target.value })} /></div>
            </div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group"><label className="form-label">Emergency contact name</label><input className="form-input" value={form.emergency_contact_name} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Emergency contact phone</label><input className="form-input" value={form.emergency_contact_phone} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} /></div>
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Allergies</label>
              <input className="form-input" placeholder="NKDA or list allergies" value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving || !form.first_name || !form.last_name}>
                {saving ? 'Saving...' : 'Admit resident'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
