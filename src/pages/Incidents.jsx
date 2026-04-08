import { useState, useEffect, useCallback } from 'react'
import { supabase, auditLog } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

const TYPES = ['fall', 'medical', 'behavioral', 'medication_error', 'elopement', 'injury', 'skin_breakdown', 'other']
const SEVERITIES = ['low', 'moderate', 'high', 'critical']
const TYPE_ICON = { fall: '🏃', medical: '🏥', behavioral: '🧠', medication_error: '💊', elopement: '🚨', injury: '🩹', skin_breakdown: '🩺', other: '⚠️' }
const SEV_CLASS = { low: 'green', moderate: 'amber', high: 'red', critical: 'red' }

export default function Incidents() {
  const { profile } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    resident_id: '', incident_type: 'fall', severity: 'low',
    description: '', location: '', immediate_action: '',
    physician_notified: false, family_notified: false,
    occurred_at: new Date().toISOString().slice(0, 16),
  })

  const fetchIncidents = useCallback(async () => {
    if (!profile?.facility_id) return
    setLoading(true)
    const { data } = await supabase
      .from('incidents')
      .select('*, residents(first_name,last_name,room)')
      .eq('facility_id', profile.facility_id)
      .order('occurred_at', { ascending: false })
    setIncidents(data || [])
    setLoading(false)
  }, [profile])

  const fetchResidents = useCallback(async () => {
    if (!profile?.facility_id) return
    const { data } = await supabase.from('residents').select('id,first_name,last_name,room')
      .eq('facility_id', profile.facility_id).in('status', ['active', 'hospital'])
    setResidents(data || [])
  }, [profile])

  useEffect(() => {
    if (profile?.facility_id) {
      fetchIncidents()
      fetchResidents()
    }
  }, [profile, fetchIncidents, fetchResidents])

  const handleSubmit = async () => {
    if (!form.resident_id || !form.description) return
    setSaving(true)
    const { data, error } = await supabase.from('incidents').insert({
      ...form,
      facility_id: profile.facility_id,
      reported_by: profile.id,
      status: 'reported',
    }).select().single()
    if (!error) {
      await auditLog('create', 'incident', data.id, null, data)
      fetchIncidents()
      setShowModal(false)
      setForm({ resident_id: '', incident_type: 'fall', severity: 'low', description: '', location: '', immediate_action: '', physician_notified: false, family_notified: false, occurred_at: new Date().toISOString().slice(0, 16) })
    }
    setSaving(false)
  }

  const updateStatus = async (id, status) => {
    await supabase.from('incidents').update({ status }).eq('id', id)
    await auditLog('update', 'incident', id, null, { status })
    fetchIncidents()
  }

  if (loading) return <div className="loading">Loading incidents...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text2)' }}>{incidents.length} total reports</div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ File incident report</button>
      </div>

      {incidents.length === 0 && <div className="empty">No incidents on record.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {incidents.map(inc => (
          <div key={inc.id} className="card" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: SEV_CLASS[inc.severity] === 'red' ? 'var(--red-light)' : SEV_CLASS[inc.severity] === 'amber' ? 'var(--amber-light)' : 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              {TYPE_ICON[inc.incident_type] || '⚠️'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <div>
                  <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{inc.incident_type.replace('_', ' ')}</span>
                  {' — '}{inc.residents?.first_name} {inc.residents?.last_name}
                  {inc.residents?.room && <span className="text-muted text-sm"> (Rm {inc.residents.room})</span>}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <span className={`badge ${SEV_CLASS[inc.severity]}`}>{inc.severity}</span>
                  <span className={`badge ${inc.status === 'resolved' ? 'green' : inc.status === 'reported' ? 'amber' : 'blue'}`}>{inc.status}</span>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '6px' }}>
                {new Date(inc.occurred_at).toLocaleString()}{inc.location ? ` · ${inc.location}` : ''}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.5', marginBottom: '8px' }}>{inc.description}</div>
              {inc.immediate_action && <div style={{ fontSize: '12px', color: 'var(--text2)' }}><strong>Action taken:</strong> {inc.immediate_action}</div>}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                {inc.physician_notified && <span className="tag">MD notified</span>}
                {inc.family_notified && <span className="tag">Family notified</span>}
                {inc.status !== 'resolved' && (
                  <button className="btn btn-outline btn-sm" onClick={() => updateStatus(inc.id, 'resolved')}>Mark resolved</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">File incident report</div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Resident *</label>
              <select className="form-select" value={form.resident_id} onChange={e => setForm({ ...form, resident_id: e.target.value })}>
                <option value="">Select resident...</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name} — Rm {r.room}</option>)}
              </select>
            </div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Incident type</label>
                <select className="form-select" value={form.incident_type} onChange={e => setForm({ ...form, incident_type: e.target.value })}>
                  {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Severity</label>
                <select className="form-select" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Date & time occurred</label>
                <input className="form-input" type="datetime-local" value={form.occurred_at} onChange={e => setForm({ ...form, occurred_at: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" placeholder="Bedroom, hallway..." value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Description *</label>
              <textarea className="form-textarea" placeholder="Describe exactly what happened..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Immediate action taken</label>
              <textarea className="form-textarea" style={{ minHeight: '60px' }} placeholder="First aid given, physician called..." value={form.immediate_action} onChange={e => setForm({ ...form, immediate_action: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.physician_notified} onChange={e => setForm({ ...form, physician_notified: e.target.checked })} />
                Physician notified
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.family_notified} onChange={e => setForm({ ...form, family_notified: e.target.checked })} />
                Family notified
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.resident_id || !form.description}>
                {saving ? 'Submitting...' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
