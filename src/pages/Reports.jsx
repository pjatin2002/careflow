import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import {
  generateMedicationLogPDF,
  generateIncidentReportPDF,
  generateCensusReportPDF,
  generateStaffCertPDF,
} from '../lib/pdfGenerator'

export default function Reports() {
  const { profile } = useAuth()
  const [generating, setGenerating] = useState(null)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [selectedResident, setSelectedResident] = useState('')
  const [residents, setResidents] = useState([])
  const [resLoaded, setResLoaded] = useState(false)

  const loadResidents = useCallback(async () => {
    if (resLoaded) return
    const { data } = await supabase.from('residents')
      .select('id,first_name,last_name,room')
      .eq('facility_id', profile.facility_id)
      .in('status', ['active', 'hospital'])
      .order('last_name')
    setResidents(data || [])
    setResLoaded(true)
  }, [profile, resLoaded])

  const generate = async (type) => {
    setGenerating(type)
    const fid = profile.facility_id
    const facilityName = profile.facilities?.name || 'Care Facility'
    const start = dateRange.start + 'T00:00:00'
    const end = dateRange.end + 'T23:59:59'
    const dateRangeLabel = dateRange.start + ' to ' + dateRange.end

    try {
      if (type === 'mar') {
        if (!selectedResident) { alert('Please select a resident first.'); setGenerating(null); return }
        const [{ data: res }, { data: meds }, { data: recs }] = await Promise.all([
          supabase.from('residents').select('*').eq('id', selectedResident).single(),
          supabase.from('medications').select('*').eq('resident_id', selectedResident),
          supabase.from('medication_records').select('*, profiles(full_name)').eq('resident_id', selectedResident).gte('scheduled_time', start).lte('scheduled_time', end),
        ])
        generateMedicationLogPDF({ resident: res, medications: meds || [], records: recs || [], facilityName, dateRange: dateRangeLabel })
      } else if (type === 'incidents') {
        const { data } = await supabase.from('incidents')
          .select('*, residents(first_name,last_name,room)')
          .eq('facility_id', fid).gte('occurred_at', start).lte('occurred_at', end)
          .order('occurred_at', { ascending: false })
        generateIncidentReportPDF({ incidents: data || [], facilityName, dateRange: dateRangeLabel })
      } else if (type === 'census') {
        const { data } = await supabase.from('residents').select('*')
          .eq('facility_id', fid).in('status', ['active', 'hospital']).order('room')
        generateCensusReportPDF({ residents: data || [], facilityName })
      } else if (type === 'staff') {
        const { data } = await supabase.from('profiles').select('*')
          .eq('facility_id', fid).eq('is_active', true).order('full_name')
        generateStaffCertPDF({ staff: data || [], facilityName })
      } else if (type === 'adl') {
        const { data } = await supabase.from('daily_logs')
          .select('*, residents(first_name,last_name,room)')
          .eq('facility_id', fid).gte('logged_at', start).lte('logged_at', end)
          .order('logged_at', { ascending: false })
        const csv = [
          ['Date','Time','Resident','Room','Type','BP','Pulse','Temp','O2','Weight','Meal','%','Notes'].join(','),
          ...(data || []).map(l => [
            new Date(l.logged_at).toLocaleDateString(),
            new Date(l.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            l.residents?.first_name + ' ' + l.residents?.last_name,
            l.residents?.room || '',
            l.log_type,
            l.bp_systolic && l.bp_diastolic ? l.bp_systolic + '/' + l.bp_diastolic : '',
            l.pulse || '', l.temperature || '', l.o2_saturation || '', l.weight || '',
            l.meal_period || '', l.meal_percent || '',
            '"' + (l.notes || '').replace(/"/g, '""') + '"',
          ].join(','))
        ].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'CareFlow_ADL_' + dateRange.start + '_' + dateRange.end + '.csv'
        a.click()
        URL.revokeObjectURL(url)
      } else if (type === 'audit') {
        const { data } = await supabase.from('audit_logs')
          .select('*, profiles(full_name)')
          .eq('facility_id', fid).gte('created_at', start).lte('created_at', end)
          .order('created_at', { ascending: false })
        const csv = [
          ['Date','Time','User','Action','Resource','Resource ID'].join(','),
          ...(data || []).map(a => [
            new Date(a.created_at).toLocaleDateString(),
            new Date(a.created_at).toLocaleTimeString(),
            a.profiles?.full_name || '',
            a.action, a.resource_type, a.resource_id || '',
          ].join(','))
        ].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'CareFlow_AuditLog_' + dateRange.start + '.csv'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.error('Report error:', e)
      alert('Error generating report: ' + e.message)
    }
    setGenerating(null)
  }

  const REPORTS = [
    { id: 'mar', title: '30-day medication log', desc: 'Complete MAR per resident — state inspection format with all administration records', icon: '💊', color: '#E1F5EE', pdf: true },
    { id: 'incidents', title: 'Incident report', desc: 'All incidents by type, severity, and outcome with summary statistics', icon: '⚠️', color: '#FAEEDA', pdf: true },
    { id: 'census', title: 'Census report', desc: 'All residents — room, diagnosis, physician, code status, emergency contacts', icon: '🏥', color: '#E6F1FB', pdf: true },
    { id: 'staff', title: 'Staff certification report', desc: 'All staff with certification status and expiry alerts highlighted', icon: '👥', color: '#EAF3DE', pdf: true },
    { id: 'adl', title: 'Daily logs export', desc: 'All vitals, meals, and ADL entries for the selected date range', icon: '📋', color: '#EEEDFE', pdf: false },
    { id: 'audit', title: 'HIPAA audit log', desc: 'All data access and changes — for compliance audits', icon: '🔒', color: '#FCEBEB', pdf: false },
  ]

  return (
    <div>
      <div className="panel" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>Report settings</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group">
            <label className="form-label">Start date</label>
            <input className="form-input" type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">End date</label>
            <input className="form-input" type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
            <label className="form-label">Resident (required for medication log)</label>
            <select className="form-select" value={selectedResident} onChange={e => setSelectedResident(e.target.value)} onFocus={loadResidents}>
              <option value="">Select resident...</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name} — Rm {r.room}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '14px' }}>
        PDF reports download automatically. All reports are HIPAA-compliant and state inspection ready.
      </div>

      <div className="grid-2">
        {REPORTS.map(r => (
          <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', transition: 'border-color .15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
              {r.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', fontSize: '13px', marginBottom: '2px' }}>
                {r.title}
                <span className={`badge ${r.pdf ? 'red' : 'gray'}`} style={{ marginLeft: '6px', fontSize: '10px' }}>{r.pdf ? 'PDF' : 'CSV'}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{r.desc}</div>
            </div>
            <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => generate(r.id)} disabled={generating === r.id}>
              {generating === r.id ? 'Building...' : 'Download'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
