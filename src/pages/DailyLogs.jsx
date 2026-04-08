import { useState, useEffect, useCallback } from 'react'
import { supabase, auditLog } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

const LOG_TYPES = ['vitals', 'meals', 'adl', 'behavior', 'respiratory', 'skin', 'pain', 'hydration', 'bowel', 'nursing_note', 'other']

export default function DailyLogs() {
  const { profile } = useAuth()
  const [logs, setLogs] = useState([])
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    resident_id: '', log_type: 'vitals',
    bp_systolic: '', bp_diastolic: '', pulse: '', temperature: '', o2_saturation: '', weight: '',
    meal_period: 'breakfast', meal_percent: '',
    notes: '',
  })

  const fetchResidents = useCallback(async () => {
    if (!profile?.facility_id) return
    const { data } = await supabase.from('residents').select('id,first_name,last_name,room')
      .eq('facility_id', profile.facility_id).in('status', ['active', 'hospital'])
    setResidents(data || [])
  }, [profile])

  const fetchLogs = useCallback(async () => {
    if (!profile?.facility_id) return
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('daily_logs')
      .select('*, residents(first_name,last_name,room)')
      .eq('facility_id', profile.facility_id)
      .gte('logged_at', today)
      .order('logged_at', { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }, [profile])

  useEffect(() => {
    if (profile?.facility_id) {
      fetchLogs()
      fetchResidents()
    }
  }, [profile, fetchLogs, fetchResidents])

  const handleSave = async () => {
    if (!form.resident_id) return
    setSaving(true)
    const payload = {
      resident_id: form.resident_id,
      facility_id: profile.facility_id,
      log_type: form.log_type,
      logged_by: profile.id,
      notes: form.notes,
    }
    if (form.log_type === 'vitals') {
      Object.assign(payload, {
        bp_systolic: form.bp_systolic ? parseInt(form.bp_systolic) : null,
        bp_diastolic: form.bp_diastolic ? parseInt(form.bp_diastolic) : null,
        pulse: form.pulse ? parseInt(form.pulse) : null,
        temperature: form.temperature ? parseFloat(form.temperature) : null,
        o2_saturation: form.o2_saturation ? parseInt(form.o2_saturation) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
      })
    }
    if (form.log_type === 'meals') {
      Object.assign(payload, {
        meal_period: form.meal_period,
        meal_percent: form.meal_percent ? parseInt(form.meal_percent) : null,
      })
    }
    const { data, error } = await supabase.from('daily_logs').insert(payload).select().single()
    if (!error) {
      await auditLog('create', 'daily_log', data.id, null, data)
      fetchLogs()
      setForm({ resident_id: '', log_type: 'vitals', bp_systolic: '', bp_diastolic: '', pulse: '', temperature: '', o2_saturation: '', weight: '', meal_period: 'breakfast', meal_percent: '', notes: '' })
    }
    setSaving(false)
  }

  const formatLog = (l) => {
    const parts = []
    if (l.bp_systolic && l.bp_diastolic) parts.push(`BP ${l.bp_systolic}/${l.bp_diastolic}`)
    if (l.pulse) parts.push(`P ${l.pulse}`)
    if (l.temperature) parts.push(`T ${l.temperature}°F`)
    if (l.o2_saturation) parts.push(`O2 ${l.o2_saturation}%`)
    if (l.weight) parts.push(`Wt ${l.weight} lbs`)
    if (l.meal_percent !== null && l.meal_percent !== undefined) parts.push(`${l.meal_period} — ${l.meal_percent}% eaten`)
    if (l.notes) parts.push(l.notes)
    return parts.join(' · ') || 'Entry logged'
  }

  if (loading) return <div className="loading">Loading logs...</div>

  return (
    <div>
      <div className="panel" style={{ marginBottom: '16px' }}>
        <div className="panel-title">New log entry</div>
        <div className="form-row" style={{ marginBottom: '12px' }}>
          <div className="form-group">
            <label className="form-label">Resident</label>
            <select className="form-select" value={form.resident_id} onChange={e => setForm({ ...form, resident_id: e.target.value })}>
              <option value="">Select resident...</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name} — Rm {r.room}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Entry type</label>
            <select className="form-select" value={form.log_type} onChange={e => setForm({ ...form, log_type: e.target.value })}>
              {LOG_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        {form.log_type === 'vitals' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '12px' }}>
            <div className="form-group"><label className="form-label">Systolic</label><input className="form-input" placeholder="128" value={form.bp_systolic} onChange={e => setForm({ ...form, bp_systolic: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Diastolic</label><input className="form-input" placeholder="76" value={form.bp_diastolic} onChange={e => setForm({ ...form, bp_diastolic: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Pulse (bpm)</label><input className="form-input" placeholder="72" value={form.pulse} onChange={e => setForm({ ...form, pulse: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Temp (°F)</label><input className="form-input" placeholder="98.2" value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">O2 sat (%)</label><input className="form-input" placeholder="97" value={form.o2_saturation} onChange={e => setForm({ ...form, o2_saturation: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Weight (lbs)</label><input className="form-input" placeholder="142" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
          </div>
        )}

        {form.log_type === 'meals' && (
          <div className="form-row" style={{ marginBottom: '12px' }}>
            <div className="form-group">
              <label className="form-label">Meal period</label>
              <select className="form-select" value={form.meal_period} onChange={e => setForm({ ...form, meal_period: e.target.value })}>
                {['breakfast', 'lunch', 'dinner', 'snack'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">% eaten</label>
              <input className="form-input" type="number" min="0" max="100" placeholder="75" value={form.meal_percent} onChange={e => setForm({ ...form, meal_percent: e.target.value })} />
            </div>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: '14px' }}>
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" placeholder="Clinical notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.resident_id}>
          {saving ? 'Saving...' : 'Save entry'}
        </button>
      </div>

      <div className="panel">
        <div className="panel-title">Today's entries ({logs.length})</div>
        {logs.length === 0 && <div className="empty">No entries yet today.</div>}
        {logs.map(l => (
          <div key={l.id} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ minWidth: '80px', textAlign: 'right', fontSize: '11px', color: 'var(--text2)', paddingTop: '2px' }}>
              {new Date(l.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '2px', textTransform: 'capitalize' }}>
                {l.residents?.first_name} {l.residents?.last_name} — {l.log_type.replace('_', ' ')}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text2)' }}>{formatLog(l)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
