import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Dashboard({ onNavigate }) {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ residents: 0, alerts: 0, missedMeds: 0, compliance: 0 })
  const [recentIncidents, setRecentIncidents] = useState([])
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    if (!profile?.facility_id) return
    setLoading(true)
    const fid = profile.facility_id
    const today = new Date().toISOString().split('T')[0]

    const [{ count: resCount }, { data: incidents }, { data: resData }, { count: missedCount }] =
      await Promise.all([
        supabase.from('residents').select('*', { count: 'exact', head: true }).eq('facility_id', fid).in('status', ['active', 'hospital']),
        supabase.from('incidents').select('*, residents(first_name,last_name,room)').eq('facility_id', fid).in('status', ['reported', 'investigating']).order('created_at', { ascending: false }).limit(5),
        supabase.from('residents').select('id,first_name,last_name,room,status,physician').eq('facility_id', fid).in('status', ['active', 'hospital']).order('last_name'),
        supabase.from('medication_records').select('*', { count: 'exact', head: true }).eq('status', 'missed').gte('scheduled_time', today),
      ])

    setStats({
      residents: resCount || 0,
      alerts: (incidents || []).length,
      missedMeds: missedCount || 0,
      compliance: missedCount ? Math.max(0, 100 - (missedCount * 5)) : 98,
    })
    setRecentIncidents(incidents || [])
    setResidents(resData || [])
    setLoading(false)
  }, [profile])

  useEffect(() => {
    if (profile?.facility_id) loadDashboard()
  }, [profile, loadDashboard])

  const severityColor = { low: 'green', moderate: 'amber', high: 'red', critical: 'red' }

  if (loading) return <div className="loading">Loading dashboard...</div>

  return (
    <div>
      <div className="stat-grid">
        <div className="stat green">
          <div className="stat-label">Total residents</div>
          <div className="stat-val">{stats.residents}</div>
          <div className="stat-sub">Active census</div>
        </div>
        <div className={`stat ${stats.alerts > 0 ? 'amber' : 'green'}`}>
          <div className="stat-label">Open alerts</div>
          <div className="stat-val">{stats.alerts}</div>
          <div className="stat-sub">Incidents needing attention</div>
        </div>
        <div className={`stat ${stats.missedMeds > 0 ? 'red' : 'green'}`}>
          <div className="stat-label">Missed meds today</div>
          <div className="stat-val">{stats.missedMeds}</div>
          <div className="stat-sub">Requires documentation</div>
        </div>
        <div className="stat blue">
          <div className="stat-label">Compliance score</div>
          <div className="stat-val">{stats.compliance}%</div>
          <div className="stat-sub">Documentation rate</div>
        </div>
      </div>

      <div className="grid-2 section-gap">
        <div className="panel">
          <div className="panel-title">
            Open incidents
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('incidents')}>View all</button>
          </div>
          {recentIncidents.length === 0
            ? <div style={{ fontSize: '13px', color: 'var(--text2)', padding: '16px 0' }}>No open incidents — great work!</div>
            : recentIncidents.map(inc => (
              <div className="alert-item" key={inc.id}>
                <div className={`alert-dot ${severityColor[inc.severity] || 'amber'}`}></div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>
                    {inc.incident_type.replace('_', ' ')} — {inc.residents?.first_name} {inc.residents?.last_name} (Rm {inc.residents?.room})
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>
                    {new Date(inc.created_at).toLocaleString()} · <span className={`badge ${severityColor[inc.severity]}`}>{inc.severity}</span>
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        <div className="panel">
          <div className="panel-title">
            Census
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('residents')}>View all</button>
          </div>
          <table className="table">
            <thead>
              <tr><th>Room</th><th>Resident</th><th>Status</th><th>Physician</th></tr>
            </thead>
            <tbody>
              {residents.slice(0, 8).map(r => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => onNavigate('residents')}>
                  <td style={{ fontWeight: '500' }}>{r.room}</td>
                  <td>{r.first_name} {r.last_name}</td>
                  <td>
                    <span className={`badge ${r.status === 'active' ? 'green' : r.status === 'hospital' ? 'amber' : 'gray'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="text-muted text-sm">{r.physician}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
