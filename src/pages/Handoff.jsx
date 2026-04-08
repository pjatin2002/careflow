import { useState, useEffect, useCallback } from 'react'
import { supabase, auditLog } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

const SHIFTS = ['Day Shift (6A–2P)', 'Evening Shift (2P–10P)', 'Night Shift (10P–6A)']

export default function Handoff() {
  const { profile } = useAuth()
  const [handoffs, setHandoffs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ from_shift: SHIFTS[0], to_shift: SHIFTS[1], notes: '', priority: 'normal', tags: '' })

  const fetchHandoffs = useCallback(async () => {
    if (!profile?.facility_id) return
    setLoading(true)
    const { data } = await supabase
      .from('shift_handoffs')
      .select('*, profiles!created_by(full_name)')
      .eq('facility_id', profile.facility_id)
      .order('created_at', { ascending: false })
      .limit(30)
    setHandoffs(data || [])
    setLoading(false)
  }, [profile])

  useEffect(() => {
    if (profile?.facility_id) fetchHandoffs()
  }, [profile, fetchHandoffs])

  const handleSubmit = async () => {
    if (!form.notes) return
    setSaving(true)
    const { data, error } = await supabase.from('shift_handoffs').insert({
      facility_id: profile.facility_id,
      from_shift: form.from_shift,
      to_shift: form.to_shift,
      notes: form.notes,
      priority: form.priority,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      created_by: profile.id,
    }).select().single()
    if (!error) {
      await auditLog('create', 'shift_handoff', data.id, null, data)
      fetchHandoffs()
      setShowModal(false)
      setForm({ from_shift: SHIFTS[0], to_shift: SHIFTS[1], notes: '', priority: 'normal', tags: '' })
    }
    setSaving(false)
  }

  const acknowledge = async (id) => {
    await supabase.from('shift_handoffs').update({
      acknowledged: true,
      acknowledged_by: profile.id,
      acknowledged_at: new Date().toISOString()
    }).eq('id', id)
    fetchHandoffs()
  }

  if (loading) return <div className="loading">Loading handoffs...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text2)' }}>Shift-to-shift communication log</div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New handoff note</button>
      </div>

      {handoffs.length === 0 && <div className="empty">No handoff notes yet.</div>}

      {handoffs.map(h => (
        <div key={h.id} style={{ background: 'var(--white)', border: '1px solid var(--border)', borderLeft: `3px solid ${h.priority === 'critical' ? 'var(--red)' : h.priority === 'high' ? '#EF9F27' : 'var(--teal)'}`, borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <div style={{ fontWeight: '500', fontSize: '14px' }}>{h.from_shift} → {h.to_shift}</div>
              <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>
                {new Date(h.created_at).toLocaleString()} · {h.profiles?.full_name || 'Staff'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {h.priority !== 'normal' && <span className={`badge ${h.priority === 'critical' ? 'red' : 'amber'}`}>{h.priority}</span>}
              {h.acknowledged
                ? <span className="badge green">Acknowledged</span>
                : <button className="btn btn-outline btn-sm" onClick={() => acknowledge(h.id)}>Acknowledge</button>
              }
            </div>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6', marginBottom: '8px' }}>{h.notes}</div>
          {h.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {h.tags.map(t => <span key={t} className="tag">{t}</span>)}
            </div>
          )}
        </div>
      ))}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">New shift handoff note</div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">From shift</label>
                <select className="form-select" value={form.from_shift} onChange={e => setForm({ ...form, from_shift: e.target.value })}>
                  {SHIFTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">To shift</label>
                <select className="form-select" value={form.to_shift} onChange={e => setForm({ ...form, to_shift: e.target.value })}>
                  {SHIFTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Handoff notes *</label>
              <textarea className="form-textarea" style={{ minHeight: '120px' }} placeholder="Resident updates, pending tasks, physician orders..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma separated)</label>
                <input className="form-input" placeholder="Fall watch, O2 monitor" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.notes}>
                {saving ? 'Submitting...' : 'Submit handoff'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
