import { useState, useEffect, useCallback } from 'react'
import { supabase, auditLog } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

const COLORS = [
  ['#E1F5EE','#085041'], ['#E6F1FB','#0C447C'], ['#EEEDFE','#3C3489'],
  ['#FAEEDA','#633806'], ['#EAF3DE','#27500A'], ['#FCEBEB','#791F1F'],
]

function initials(r) { return ((r.first_name?.[0] || '') + (r.last_name?.[0] || '')).toUpperCase() }

export default function Residents() {
  const { profile } = useAuth()
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [carePlans, setCarePlans] = useState([])
  const [meds, setMeds] = useState([])
  const [logs, setLogs] = useState([])
  const [form, setForm] = useState({
    first_name: '', last_name: '', date_of_birth: '', room: '',
    admission_date: '', primary_diagnosis: '', secondary_diagnoses: '',
    physician: '', physician_phone: '', emergency_contact_name: '',
    emergency_contact_phone: '', emergency_contact_relation: '',
    insurance_type: 'Medicaid', code_status: 'Full Code',
    diet: '', mobility: '', allergies: '', notes: '',
  })

  const fetchResidents = useCallback(async () => {
    if (!profile?.facility_id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('residents')
      .select('*')
      .eq('facility_id', profile.facility_id)
      .in('status', ['active', 'hospital'])
      .order('last_name')
    if (!error) setResidents(data || [])
    setLoading(false)
  }, [profile])

  useEffect(() => {
    if (profile?.facility_id) fetchResidents()
  }, [profile, fetchResidents])

  const openResident = async (r) => {
    setSelected(r)
    setActiveTab('overview')
    const [{ data: cp }, { data: m }, { data: l }] = await Promise.all([
      supabase.from('care_plans').select('*').eq('resident_id', r.id).eq('status', 'active'),
      supabase.from('medications').select('*').eq('resident_id', r.id).eq('is_active', true),
      supabase.from('daily_logs').select('*').eq('resident_id', r.id).order('logged_at', { ascending: false }).limit(10),
    ])
    setCarePlans(cp || [])
    setMeds(m || [])
    setLogs(l || [])
    await auditLog('read', 'resident', r.id)
  }

  const handleAdd = async () => {
    if (!form.first_name || !form.last_name) return
    setSaving(true)
    const { data, error } = await supabase.from('residents').insert({
      ...form, facility_id: profile.facility_id, status: 'active'
    }).select().single()
    if (!error) {
      await auditLog('create', 'resident', data.id, null, data)
      fetchResidents()
      setShowAdd(false)
      setForm({ first_name: '', last_name: '', date_of_birth: '', room: '', admission_date: '', primary_diagnosis: '', secondary_diagnoses: '', physician: '', physician_phone: '', emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '', insurance_type: 'Medicaid', code_status: 'Full Code', diet: '', mobility: '', allergies: '', notes: '' })
    }
    setSaving(false)
  }

  const filtered = residents.filter(r =>
    `${r.first_name} ${r.last_name} ${r.room}`.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="loading">Loading residents...</div>

  if (selected) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text2)', cursor: 'pointer', marginBottom: '18px' }} onClick={() => setSelected(null)}>
        ← Back to residents
      </div>
      <div className="panel" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div className="avatar" style={{ width: '56px', height: '56px', fontSize: '18px', fontWeight: '700', background: COLORS[residents.indexOf(selected) % COLORS.length][0], color: COLORS[residents.indexOf(selected) % COLORS.length][1], flexShrink: 0 }}>
            {initials(selected)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '2px' }}>{selected.first_name} {selected.last_name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '8px' }}>
              Room {selected.room} · DOB {selected.date_of_birth} · Admitted {selected.admission_date}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {selected.primary_diagnosis && <span className="tag">{selected.primary_diagnosis}</span>}
              {selected.physician && <span className="tag">{selected.physician}</span>}
              <span className={`badge ${selected.status === 'active' ? 'green' : 'amber'}`}>{selected.status}</span>
              <span className="badge gray">{selected.code_status}</span>
            </div>
          </div>
          <button className="btn btn-outline btn-sm">Edit profile</button>
        </div>
      </div>

      <div className="tabs">
        {['overview', 'medications', 'logs', 'care plan'].map(t => (
          <div key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid-2">
          <div className="panel">
            <div className="panel-title">Contact & clinical info</div>
            <table className="table">
              <tbody>
                <tr><td className="text-muted text-sm" style={{ width: '140px' }}>Physician</td><td>{selected.physician || '—'} {selected.physician_phone && `· ${selected.physician_phone}`}</td></tr>
                <tr><td className="text-muted text-sm">Emergency contact</td><td>{selected.emergency_contact_name} ({selected.emergency_contact_relation}) {selected.emergency_contact_phone}</td></tr>
                <tr><td className="text-muted text-sm">Insurance</td><td>{selected.insurance_type || '—'}</td></tr>
                <tr><td className="text-muted text-sm">Allergies</td><td>{selected.allergies || 'NKDA'}</td></tr>
                <tr><td className="text-muted text-sm">Diet</td><td>{selected.diet || '—'}</td></tr>
                <tr><td className="text-muted text-sm">Mobility</td><td>{selected.mobility || '—'}</td></tr>
                <tr><td className="text-muted text-sm">Code status</td><td>{selected.code_status}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="panel">
            <div className="panel-title">Recent logs</div>
            {logs.length === 0 && <div className="text-muted text-sm">No logs recorded yet.</div>}
            {logs.slice(0, 6).map(l => (
              <div key={l.id} style={{ padding: '8px 0', borderBottom: '.5px solid var(--border)', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{l.log_type.replace('_', ' ')}</span>
                  <span className="text-muted text-sm">{new Date(l.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {l.notes && <div className="text-muted text-sm">{l.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'medications' && (
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>Active medications — go to Medications (eMAR) to record administration</div>
          {meds.length === 0 && <div className="panel"><div className="text-muted">No active medications. Add via the Medications module.</div></div>}
          <div className="mar-grid">
            {meds.map(m => (
              <div key={m.id} className="mar-card">
                <div className="mar-drug">{m.drug_name}</div>
                <div className="mar-dose">{m.dose} {m.route} {m.frequency}{m.prn ? ' (PRN)' : ''}</div>
                {m.prescribing_physician && <div style={{ fontSize: '11px', color: 'var(--text2)' }}>Dr. {m.prescribing_physician}</div>}
                {m.notes && <div style={{ fontSize: '11px', color: 'var(--text2)', fontStyle: 'italic', marginTop: '4px' }}>{m.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'care plan' && (
        <div className="panel">
          <div className="panel-title">Active care plan<button className="btn btn-primary btn-sm">+ Add problem</button></div>
          {carePlans.length === 0
            ? <div className="text-muted">No care plan items yet.</div>
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

      {filtered.length === 0 && !loading && (
        <div className="empty">
          {search ? 'No residents match your search.' : 'No residents yet. Click "+ Admit resident" to add your first resident.'}
        </div>
      )}

      <div className="grid-3">
        {filtered.map((r, i) => {
          const [bg, tc] = COLORS[i % COLORS.length]
          return (
            <div key={r.id} className="card" style={{ cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              onClick={() => openResident(r)}
            >
              <div className="avatar" style={{ width: '44px', height: '44px', fontSize: '15px', fontWeight: '700', background: bg, color: tc, marginBottom: '10px' }}>
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
              <div className="form-group">
                <label className="form-label">Code status</label>
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
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group"><label className="form-label">Relationship</label><input className="form-input" placeholder="Daughter, Son, Spouse..." value={form.emergency_contact_relation} onChange={e => setForm({ ...form, emergency_contact_relation: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Allergies</label><input className="form-input" placeholder="NKDA or list allergies" value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} /></div>
            </div>
            <div className="form-row" style={{ marginBottom: '14px' }}>
              <div className="form-group"><label className="form-label">Diet</label><input className="form-input" placeholder="Regular, Pureed, Low sodium..." value={form.diet} onChange={e => setForm({ ...form, diet: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Insurance type</label>
                <select className="form-select" value={form.insurance_type} onChange={e => setForm({ ...form, insurance_type: e.target.value })}>
                  {['Medicaid', 'Medicare', 'Private pay', 'Insurance', 'Dual eligible'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
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
