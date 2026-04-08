import { useState, useEffect, useCallback } from 'react'
import { supabase, auditLog } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

const ROUTES = ['PO', 'IV', 'IM', 'SC', 'SL', 'TOP', 'INH', 'PR', 'NG', 'GT']
const FREQUENCIES = ['QD', 'BID', 'TID', 'QID', 'Q4H', 'Q6H', 'Q8H', 'Q12H', 'QHS', 'PRN', 'STAT', 'Weekly', 'Monthly']
const STATUS_STYLES = {
  given:   { bg: '#E1F5EE', color: '#085041', border: '#5DCAA5', label: '✓ Given' },
  refused: { bg: '#FAEEDA', color: '#633806', border: '#EF9F27', label: '✕ Refused' },
  missed:  { bg: '#FCEBEB', color: '#791F1F', border: '#f09595', label: '✕ Missed' },
  held:    { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB', label: '— Held' },
  pending: { bg: '#F1EFE8', color: '#5F5E5A', border: '#e5e3dc', label: 'Pending' },
}

export default function Medications() {
  const { profile } = useAuth()
  const [residents, setResidents] = useState([])
  const [selectedRes, setSelectedRes] = useState(null)
  const [meds, setMeds] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [medsLoading, setMedsLoading] = useState(false)
  const [showAddMed, setShowAddMed] = useState(false)
  const [showAddRes, setShowAddRes] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [activeTab, setActiveTab] = useState('mar')
  const [signing, setSigning] = useState(null)
  const [signNote, setSignNote] = useState('')
  const [controlledLog, setControlledLog] = useState([])
  const [form, setForm] = useState({
    drug_name: '', generic_name: '', dose: '', route: 'PO',
    frequency: 'QD', times: '', prn: false, prn_reason: '',
    prescribing_physician: '', start_date: '', end_date: '', notes: ''
  })

  const fetchResidents = useCallback(async () => {
    if (!profile?.facility_id) return
    const { data } = await supabase.from('residents')
      .select('id,first_name,last_name,room,primary_diagnosis')
      .eq('facility_id', profile.facility_id)
      .in('status', ['active', 'hospital'])
      .order('last_name')
    setResidents(data || [])
    setLoading(false)
  }, [profile])

  useEffect(() => { if (profile?.facility_id) fetchResidents() }, [profile, fetchResidents])

  const fetchMedsAndRecords = useCallback(async () => {
    if (!selectedRes) return
    setMedsLoading(true)
    const dayStart = `${selectedDate}T00:00:00`
    const dayEnd = `${selectedDate}T23:59:59`
    const [{ data: medData }, { data: recData }, { data: ctrlData }] = await Promise.all([
      supabase.from('medications').select('*').eq('resident_id', selectedRes.id).eq('is_active', true).order('drug_name'),
      supabase.from('medication_records').select('*, profiles(full_name)').eq('resident_id', selectedRes.id).gte('scheduled_time', dayStart).lte('scheduled_time', dayEnd),
      supabase.from('medication_records').select('*, medications(drug_name), profiles(full_name)').eq('resident_id', selectedRes.id).eq('status', 'given').order('administered_at', { ascending: false }).limit(20),
    ])
    setMeds(medData || [])
    setRecords(recData || [])
    setControlledLog(ctrlData?.filter(r => r.medications?.drug_name) || [])
    setMedsLoading(false)
  }, [selectedRes, selectedDate])

  useEffect(() => { if (selectedRes) fetchMedsAndRecords() }, [selectedRes, selectedDate, fetchMedsAndRecords])

  const getRecord = (medId, time) => {
    const scheduled = `${selectedDate}T${time}:00`
    return records.find(r => r.medication_id === medId && r.scheduled_time.startsWith(`${selectedDate}T${time}`))
  }

  const recordAdmin = async (med, time, status) => {
    if (signing?.medId === med.id && signing?.time === time) {
      setSigning(null)
      return
    }
    setSigning({ medId: med.id, time, status })
  }

  const confirmSign = async () => {
    if (!signing) return
    setSaving(true)
    const existing = getRecord(signing.medId, signing.time)
    const scheduled = `${selectedDate}T${signing.time}:00`
    if (existing) {
      await supabase.from('medication_records').update({
        status: signing.status,
        administered_at: signing.status === 'given' ? new Date().toISOString() : null,
        administered_by: profile.id,
        notes: signNote || null,
      }).eq('id', existing.id)
      await auditLog('update', 'medication_record', existing.id, { status: existing.status }, { status: signing.status })
    } else {
      const { data } = await supabase.from('medication_records').insert({
        medication_id: signing.medId,
        resident_id: selectedRes.id,
        scheduled_time: scheduled,
        administered_at: signing.status === 'given' ? new Date().toISOString() : null,
        status: signing.status,
        administered_by: profile.id,
        notes: signNote || null,
      }).select().single()
      if (data) await auditLog('create', 'medication_record', data.id, null, data)
    }
    setSigning(null)
    setSignNote('')
    setSaving(false)
    fetchMedsAndRecords()
  }

  const addMedication = async () => {
    if (!form.drug_name || !form.dose || !selectedRes) return
    setSaving(true)
    const times = form.times.split(',').map(t => t.trim()).filter(Boolean)
    const { data, error } = await supabase.from('medications').insert({
      resident_id: selectedRes.id,
      drug_name: form.drug_name,
      generic_name: form.generic_name || null,
      dose: form.dose,
      route: form.route,
      frequency: form.frequency,
      times: times,
      prn: form.prn,
      prn_reason: form.prn_reason || null,
      prescribing_physician: form.prescribing_physician || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      notes: form.notes || null,
      is_active: true,
    }).select().single()
    if (!error) {
      await auditLog('create', 'medication', data.id, null, data)
      fetchMedsAndRecords()
      setShowAddMed(false)
      setForm({ drug_name: '', generic_name: '', dose: '', route: 'PO', frequency: 'QD', times: '', prn: false, prn_reason: '', prescribing_physician: '', start_date: '', end_date: '', notes: '' })
    }
    setSaving(false)
  }

  const discontinueMed = async (medId) => {
    if (!confirm('Discontinue this medication? This cannot be undone.')) return
    await supabase.from('medications').update({ is_active: false }).eq('id', medId)
    await auditLog('update', 'medication', medId, null, { is_active: false })
    fetchMedsAndRecords()
  }

  const complianceRate = () => {
    if (!meds.length) return 100
    let total = 0, given = 0
    meds.forEach(m => {
      if (m.prn) return
      ;(m.times || []).forEach(t => {
        total++
        const rec = getRecord(m.id, t)
        if (rec?.status === 'given') given++
      })
    })
    return total > 0 ? Math.round((given / total) * 100) : 100
  }

  if (loading) return <div className="loading">Loading...</div>

  if (!selectedRes) return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text2)' }}>Select a resident to manage their medications</div>
      </div>
      <div className="grid-3">
        {residents.map((r, i) => {
          const colors = [['#E1F5EE','#085041'],['#E6F1FB','#0C447C'],['#EEEDFE','#3C3489'],['#FAEEDA','#633806'],['#EAF3DE','#27500A'],['#FCEBEB','#791F1F']]
          const [bg, tc] = colors[i % colors.length]
          const initials = (r.first_name[0] + r.last_name[0]).toUpperCase()
          return (
            <div key={r.id} className="card" style={{ cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              onClick={() => setSelectedRes(r)}
            >
              <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '14px', fontWeight: '700', background: bg, color: tc, marginBottom: '10px' }}>{initials}</div>
              <div style={{ fontWeight: '500', marginBottom: '2px' }}>{r.first_name} {r.last_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px' }}>Room {r.room}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{r.primary_diagnosis}</div>
            </div>
          )
        })}
      </div>
      {residents.length === 0 && <div className="empty">No active residents. Add residents first.</div>}
    </div>
  )

  const rate = complianceRate()

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text2)', cursor: 'pointer', marginBottom: '18px' }} onClick={() => setSelectedRes(null)}>
        ← All residents
      </div>

      <div className="panel" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>{selectedRes.first_name} {selectedRes.last_name} — Room {selectedRes.room}</div>
            <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>{selectedRes.primary_diagnosis}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: rate < 80 ? 'var(--red)' : rate < 95 ? 'var(--amber)' : 'var(--teal)' }}>{rate}%</div>
              <div style={{ fontSize: '11px', color: 'var(--text2)' }}>Today compliance</div>
            </div>
            <input type="date" className="form-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ width: '150px' }} />
            <button className="btn btn-primary" onClick={() => setShowAddMed(true)}>+ Add medication</button>
          </div>
        </div>
      </div>

      <div className="tabs">
        {['mar', 'controlled', 'history'].map(t => (
          <div key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t === 'mar' ? 'Medication Administration Record' : t === 'controlled' ? 'Controlled substance log' : 'History'}
          </div>
        ))}
      </div>

      {activeTab === 'mar' && (
        <div>
          {medsLoading && <div className="loading">Loading medications...</div>}
          {!medsLoading && meds.length === 0 && (
            <div className="panel" style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '12px' }}>No active medications for this resident.</div>
              <button className="btn btn-primary" onClick={() => setShowAddMed(true)}>+ Add first medication</button>
            </div>
          )}
          {meds.filter(m => !m.prn).map(med => (
            <div key={med.id} className="panel" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>{med.drug_name}</div>
                  {med.generic_name && <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{med.generic_name}</div>}
                  <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>
                    {med.dose} · {med.route} · {med.frequency}
                    {med.prescribing_physician && ` · Dr. ${med.prescribing_physician}`}
                  </div>
                  {med.notes && <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px', fontStyle: 'italic' }}>{med.notes}</div>}
                </div>
                <button className="btn btn-outline btn-sm" style={{ color: 'var(--red)', borderColor: '#f0a0a0' }} onClick={() => discontinueMed(med.id)}>Discontinue</button>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {(med.times || []).map((t, i) => {
                  const rec = getRecord(med.id, t)
                  const status = rec?.status || 'pending'
                  const style = STATUS_STYLES[status]
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <button
                        style={{ minWidth: '90px', padding: '8px 10px', borderRadius: '8px', border: `1.5px solid ${style.border}`, background: style.bg, color: style.color, fontWeight: '500', fontSize: '12px', cursor: 'pointer', transition: 'all .15s' }}
                        onClick={() => recordAdmin(med, t, status === 'given' ? 'pending' : 'given')}
                      >
                        {style.label}
                      </button>
                      <div style={{ fontSize: '11px', color: 'var(--text2)' }}>{t}</div>
                      {rec?.profiles?.full_name && <div style={{ fontSize: '10px', color: 'var(--text2)' }}>{rec.profiles.full_name}</div>}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {['given', 'refused', 'missed', 'held'].map(s => (
                          <button key={s} style={{ padding: '2px 6px', borderRadius: '4px', border: `1px solid ${STATUS_STYLES[s].border}`, background: STATUS_STYLES[s].bg, color: STATUS_STYLES[s].color, fontSize: '10px', cursor: 'pointer', opacity: status === s ? 1 : 0.5 }}
                            onClick={() => recordAdmin(med, t, s)}>
                            {s[0].toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {meds.filter(m => m.prn).length > 0 && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text2)', margin: '16px 0 10px' }}>PRN medications (as needed)</div>
              {meds.filter(m => m.prn).map(med => (
                <div key={med.id} className="panel" style={{ marginBottom: '10px', borderLeft: '3px solid #EF9F27' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600' }}>{med.drug_name} <span className="badge amber" style={{ fontSize: '10px' }}>PRN</span></div>
                      <div style={{ fontSize: '13px', color: 'var(--text2)' }}>{med.dose} · {med.route}</div>
                      {med.prn_reason && <div style={{ fontSize: '12px', color: 'var(--text2)', fontStyle: 'italic' }}>Reason: {med.prn_reason}</div>}
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => recordAdmin(med, new Date().toTimeString().slice(0,5), 'given')}>
                      Record PRN
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'controlled' && (
        <div className="panel">
          <div className="panel-title">Controlled substance administration log</div>
          {controlledLog.length === 0 && <div className="text-muted">No controlled substances recorded.</div>}
          <table className="table">
            <thead><tr><th>Medication</th><th>Given at</th><th>By</th><th>Notes</th></tr></thead>
            <tbody>
              {controlledLog.map(r => (
                <tr key={r.id}>
                  <td className="fw-500">{r.medications?.drug_name}</td>
                  <td className="text-sm text-muted">{r.administered_at ? new Date(r.administered_at).toLocaleString() : '—'}</td>
                  <td className="text-sm">{r.profiles?.full_name}</td>
                  <td className="text-sm text-muted">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="panel">
          <div className="panel-title">30-day administration history</div>
          <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
            Use the Reports page to export a full 30-day medication log as a PDF for state inspections.
          </div>
        </div>
      )}

      {signing && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">Record medication administration</div>
            <div style={{ marginBottom: '14px', padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius)', fontSize: '13px' }}>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>{meds.find(m => m.id === signing.medId)?.drug_name}</div>
              <div style={{ color: 'var(--text2)' }}>Scheduled: {signing.time} · Status: <span style={{ fontWeight: '500', color: STATUS_STYLES[signing.status]?.color }}>{signing.status}</span></div>
            </div>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Notes (optional — required for refused/missed)</label>
              <textarea className="form-textarea" style={{ minHeight: '70px' }} placeholder="Reason for refusal, patient state, action taken..." value={signNote} onChange={e => setSignNote(e.target.value)} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '14px' }}>
              By confirming, you attest that this record is accurate. Signed as: {profile?.full_name}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setSigning(null); setSignNote('') }}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmSign} disabled={saving}>
                {saving ? 'Signing...' : `Confirm — ${signing.status}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddMed && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">Add medication for {selectedRes.first_name} {selectedRes.last_name}</div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group"><label className="form-label">Drug name *</label><input className="form-input" placeholder="Lisinopril" value={form.drug_name} onChange={e => setForm({ ...form, drug_name: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Generic name</label><input className="form-input" placeholder="Lisinopril" value={form.generic_name} onChange={e => setForm({ ...form, generic_name: e.target.value })} /></div>
            </div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group"><label className="form-label">Dose *</label><input className="form-input" placeholder="10mg" value={form.dose} onChange={e => setForm({ ...form, dose: e.target.value })} /></div>
              <div className="form-group">
                <label className="form-label">Route</label>
                <select className="form-select" value={form.route} onChange={e => setForm({ ...form, route: e.target.value })}>
                  {ROUTES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Frequency</label>
                <select className="form-select" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                  {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Times (comma separated)</label><input className="form-input" placeholder="08:00, 20:00" value={form.times} onChange={e => setForm({ ...form, times: e.target.value })} /></div>
            </div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group"><label className="form-label">Start date</label><input className="form-input" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Prescribing physician</label><input className="form-input" placeholder="Dr. Smith" value={form.prescribing_physician} onChange={e => setForm({ ...form, prescribing_physician: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.prn} onChange={e => setForm({ ...form, prn: e.target.checked })} />
                PRN (as needed)
              </label>
            </div>
            {form.prn && (
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">PRN reason</label>
                <input className="form-input" placeholder="Pain, anxiety, constipation..." value={form.prn_reason} onChange={e => setForm({ ...form, prn_reason: e.target.value })} />
              </div>
            )}
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" style={{ minHeight: '60px' }} placeholder="Special instructions, allergies, interactions..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAddMed(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addMedication} disabled={saving || !form.drug_name || !form.dose}>
                {saving ? 'Adding...' : 'Add medication'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
