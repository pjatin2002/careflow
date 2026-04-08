import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

const REPORTS = [
  { id: 'incidents', title: '30-day incident report', desc: 'All incidents by date range, type, severity, and outcome', icon: '⚠️', color: '#FAEEDA' },
  { id: 'adl', title: 'ADL compliance summary', desc: 'Daily activity completion rates by resident and shift', icon: '📋', color: '#E6F1FB' },
  { id: 'census', title: 'Census & occupancy report', desc: 'Bed occupancy, admissions, and discharges', icon: '🏥', color: '#E1F5EE' },
  { id: 'med_log', title: 'Medication log', desc: 'Complete MAR for all residents — state inspection format', icon: '💊', color: '#EEEDFE' },
  { id: 'care_plan', title: 'Care plan status', desc: 'Review dates, completion, and upcoming reviews', icon: '📝', color: '#EAF3DE' },
  { id: 'vitals', title: 'Vital signs trending', desc: 'Vital trends by resident over selected date range', icon: '📈', color: '#FCEBEB' },
  { id: 'staff_cert', title: 'Staff certification report', desc: 'All licenses, certifications, and expiry dates', icon: '👥', color: '#E1F5EE' },
  { id: 'inspection', title: 'State inspection readiness', desc: 'Full compliance checklist — pre-audit package', icon: '✅', color: '#FAEEDA' },
]

export default function Reports() {
  const { profile } = useAuth()
  const [generating, setGenerating] = useState(null)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const generateReport = async (reportId) => {
    setGenerating(reportId)
    const fid = profile.facility_id

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const start = dateRange.start || thirtyDaysAgo.toISOString()
    const end = dateRange.end ? new Date(dateRange.end).toISOString() : new Date().toISOString()

    let data = []

    if (reportId === 'incidents') {
      const { data: d } = await supabase.from('incidents')
        .select('*, residents(first_name,last_name,room)')
        .eq('facility_id', fid).gte('created_at', start).lte('created_at', end)
        .order('occurred_at', { ascending: false })
      data = d || []
    } else if (reportId === 'adl') {
      const { data: d } = await supabase.from('daily_logs')
        .select('*, residents(first_name,last_name,room)')
        .eq('facility_id', fid).gte('logged_at', start).lte('logged_at', end)
        .order('logged_at', { ascending: false })
      data = d || []
    } else if (reportId === 'census') {
      const { data: d } = await supabase.from('residents')
        .select('*').eq('facility_id', fid).order('last_name')
      data = d || []
    } else if (reportId === 'vitals') {
      const { data: d } = await supabase.from('daily_logs')
        .select('*, residents(first_name,last_name,room)')
        .eq('facility_id', fid).eq('log_type', 'vitals')
        .gte('logged_at', start).lte('logged_at', end)
        .order('logged_at', { ascending: false })
      data = d || []
    }

    if (data.length > 0) {
      const headers = Object.keys(data[0]).filter(k => !['facility_id'].includes(k))
      const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => {
          const val = row[h]
          if (val === null || val === undefined) return ''
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
          return `"${String(val).replace(/"/g, '""')}"`
        }).join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `careflow_${reportId}_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      alert('No data found for this date range. Try adjusting the dates or add some records first.')
    }
    setGenerating(null)
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>Date range</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Start date</label>
            <input className="form-input" type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">End date</label>
            <input className="form-input" type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
          </div>
        </div>
      </div>

      <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '14px' }}>
        Click Export to download a CSV — use these for state inspections, Medicaid audits, and family reporting.
      </div>

      <div className="grid-2">
        {REPORTS.map(r => (
          <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'border-color .15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '9px', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
              {r.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', marginBottom: '2px' }}>{r.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{r.desc}</div>
            </div>
            <button
              className="btn btn-outline btn-sm"
              style={{ flexShrink: 0 }}
              onClick={() => generateReport(r.id)}
              disabled={generating === r.id}
            >
              {generating === r.id ? '...' : 'Export'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
