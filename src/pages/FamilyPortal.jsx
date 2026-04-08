import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

export default function FamilyPortal() {
  const { profile, signOut } = useAuth()
  const [resident, setResident] = useState(null)
  const [logs, setLogs] = useState([])
  const [incidents, setIncidents] = useState([])
  const [meds, setMeds] = useState([])
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('today')

  const loadData = useCallback(async () => {
    if (!profile?.resident_id) { setLoading(false); return }
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const [{ data: res }, { data: logData }, { data: incData }, { data: medData }] = await Promise.all([
      supabase.from('residents').select('*').eq('id', profile.resident_id).single(),
      supabase.from('daily_logs').select('*').eq('resident_id', profile.resident_id).gte('logged_at', today + 'T00:00:00').order('logged_at', { ascending: false }),
      supabase.from('incidents').select('*').eq('resident_id', profile.resident_id).order('occurred_at', { ascending: false }).limit(10),
      supabase.from('medications').select('*').eq('resident_id', profile.resident_id).eq('is_active', true),
    ])
    setResident(res)
    setLogs(logData || [])
    setIncidents(incData || [])
    setMeds(medData || [])
    setLoading(false)
  }, [profile])

  useEffect(() => { if (profile) loadData() }, [profile, loadData])

  const sendMessage = async () => {
    if (!message.trim()) return
    setSending(true)
    await supabase.from('family_messages').insert({
      resident_id: profile.resident_id,
      facility_id: profile.facility_id,
      from_name: profile.full_name,
      message: message.trim(),
      is_from_family: true,
    })
    setMessages([...messages, { from_name: profile.full_name, message: message.trim(), created_at: new Date().toISOString(), is_from_family: true }])
    setMessage('')
    setSending(false)
  }

  const getVitals = () => logs.find(l => l.log_type === 'vitals')
  const getMeals = () => logs.filter(l => l.log_type === 'meals')

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7f4' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '22px', fontWeight: '700', color: '#1D9E75', marginBottom: '8px' }}>CareFlow</div>
        <div style={{ fontSize: '13px', color: '#5f5e5a' }}>Loading your loved one's updates...</div>
      </div>
    </div>
  )

  if (!profile?.resident_id) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7f4', padding: '20px' }}>
      <div style={{ maxWidth: '400px', textAlign: 'center', background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '32px' }}>
        <div style={{ fontSize: '22px', fontWeight: '700', color: '#1D9E75', marginBottom: '8px' }}>CareFlow Family Portal</div>
        <div style={{ fontSize: '14px', color: '#5f5e5a', marginBottom: '20px', lineHeight: '1.6' }}>
          Your account is not linked to a resident yet. Please contact the facility to complete your family portal setup.
        </div>
        <button onClick={signOut} style={{ padding: '8px 20px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          Sign out
        </button>
      </div>
    </div>
  )

  const vitals = getVitals()
  const meals = getMeals()

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
      <div style={{ background: '#1D9E75', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>CareFlow</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.8)' }}>Family Portal</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.9)', textAlign: 'right' }}>
            <div>{profile.full_name}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.7)' }}>Family member</div>
          </div>
          <button onClick={signOut} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>
        {resident && (
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#E1F5EE', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', flexShrink: 0 }}>
                {resident.first_name[0]}{resident.last_name[0]}
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a18' }}>{resident.first_name} {resident.last_name}</div>
                <div style={{ fontSize: '13px', color: '#5f5e5a' }}>Room {resident.room} · {resident.primary_diagnosis}</div>
                <div style={{ fontSize: '12px', color: '#5f5e5a', marginTop: '2px' }}>Physician: {resident.physician}</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ background: '#E1F5EE', color: '#085041', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                  {resident.status}
                </div>
                <div style={{ fontSize: '11px', color: '#5f5e5a', marginTop: '4px' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e5e3dc', marginBottom: '16px' }}>
          {['today', 'medications', 'incidents', 'message'].map(t => (
            <div key={t} onClick={() => setActiveTab(t)} style={{ padding: '10px 16px', fontSize: '13px', cursor: 'pointer', color: activeTab === t ? '#1D9E75' : '#5f5e5a', borderBottom: activeTab === t ? '2px solid #1D9E75' : '2px solid transparent', fontWeight: activeTab === t ? '500' : '400', textTransform: 'capitalize', transition: 'all .15s' }}>
              {t === 'today' ? "Today's updates" : t}
            </div>
          ))}
        </div>

        {activeTab === 'today' && (
          <div>
            {vitals && (
              <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '12px', color: '#1a1a18' }}>Today's vitals</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {vitals.bp_systolic && <div style={{ background: '#f8f7f4', borderRadius: '8px', padding: '10px', textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: '600' }}>{vitals.bp_systolic}/{vitals.bp_diastolic}</div><div style={{ fontSize: '11px', color: '#5f5e5a' }}>Blood pressure</div></div>}
                  {vitals.pulse && <div style={{ background: '#f8f7f4', borderRadius: '8px', padding: '10px', textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: '600' }}>{vitals.pulse}</div><div style={{ fontSize: '11px', color: '#5f5e5a' }}>Pulse (bpm)</div></div>}
                  {vitals.temperature && <div style={{ background: '#f8f7f4', borderRadius: '8px', padding: '10px', textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: '600' }}>{vitals.temperature}°</div><div style={{ fontSize: '11px', color: '#5f5e5a' }}>Temperature</div></div>}
                  {vitals.o2_saturation && <div style={{ background: '#f8f7f4', borderRadius: '8px', padding: '10px', textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: '600' }}>{vitals.o2_saturation}%</div><div style={{ fontSize: '11px', color: '#5f5e5a' }}>O2 saturation</div></div>}
                  {vitals.weight && <div style={{ background: '#f8f7f4', borderRadius: '8px', padding: '10px', textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: '600' }}>{vitals.weight}</div><div style={{ fontSize: '11px', color: '#5f5e5a' }}>Weight (lbs)</div></div>}
                </div>
              </div>
            )}

            {meals.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '10px', color: '#1a1a18' }}>Meals today</div>
                {meals.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < meals.length - 1 ? '1px solid #f1efea' : 'none', fontSize: '13px' }}>
                    <span style={{ textTransform: 'capitalize', color: '#5f5e5a' }}>{m.meal_period}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '80px', height: '6px', background: '#e5e3dc', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: m.meal_percent > 75 ? '#1D9E75' : m.meal_percent > 50 ? '#EF9F27' : '#E24B4A', width: m.meal_percent + '%', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontWeight: '500' }}>{m.meal_percent}% eaten</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {logs.filter(l => l.log_type !== 'vitals' && l.log_type !== 'meals' && l.notes).map(l => (
              <div key={l.id} style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '500', textTransform: 'capitalize', color: '#1D9E75' }}>{l.log_type.replace('_', ' ')}</span>
                  <span style={{ fontSize: '11px', color: '#5f5e5a' }}>{new Date(l.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#5f5e5a', lineHeight: '1.5' }}>{l.notes}</div>
              </div>
            ))}

            {logs.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#5f5e5a', fontSize: '14px' }}>No updates logged yet today.</div>}
          </div>
        )}

        {activeTab === 'medications' && (
          <div>
            {meds.map(m => (
              <div key={m.id} style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
                <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '2px' }}>{m.drug_name}</div>
                <div style={{ fontSize: '13px', color: '#5f5e5a' }}>{m.dose} · {m.route} · {m.frequency}{m.prn ? ' (as needed)' : ''}</div>
                {m.notes && <div style={{ fontSize: '12px', color: '#5f5e5a', marginTop: '4px', fontStyle: 'italic' }}>{m.notes}</div>}
              </div>
            ))}
            {meds.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#5f5e5a' }}>No active medications on file.</div>}
          </div>
        )}

        {activeTab === 'incidents' && (
          <div>
            {incidents.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#5f5e5a' }}>No incidents on record.</div>}
            {incidents.map(inc => (
              <div key={inc.id} style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px', borderLeft: `3px solid ${inc.severity === 'high' || inc.severity === 'critical' ? '#A32D2D' : inc.severity === 'moderate' ? '#EF9F27' : '#1D9E75'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '500', fontSize: '14px', textTransform: 'capitalize' }}>{inc.incident_type.replace('_', ' ')}</span>
                  <span style={{ fontSize: '11px', color: '#5f5e5a' }}>{new Date(inc.occurred_at).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#5f5e5a', lineHeight: '1.5', marginBottom: '6px' }}>{inc.description}</div>
                {inc.immediate_action && <div style={{ fontSize: '12px', color: '#5f5e5a' }}><strong>Action taken:</strong> {inc.immediate_action}</div>}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'message' && (
          <div>
            <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Send a message to the care team</div>
              <div style={{ fontSize: '12px', color: '#5f5e5a', marginBottom: '12px' }}>Staff will respond during business hours.</div>
              <textarea
                style={{ width: '100%', padding: '10px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '13px', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit', outline: 'none' }}
                placeholder="Type your message..."
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <button onClick={sendMessage} disabled={sending || !message.trim()} style={{ marginTop: '8px', padding: '9px 18px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', opacity: !message.trim() ? 0.5 : 1 }}>
                {sending ? 'Sending...' : 'Send message'}
              </button>
            </div>
            {messages.map((m, i) => (
              <div key={i} style={{ background: '#E1F5EE', border: '1px solid #5DCAA5', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: '#085041' }}>{m.from_name}</span>
                  <span style={{ fontSize: '11px', color: '#0F6E56' }}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#085041' }}>{m.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
