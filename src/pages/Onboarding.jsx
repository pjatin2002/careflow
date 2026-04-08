import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [facility, setFacility] = useState({
    name: '', address: '', phone: '', license_number: '', facility_type: 'assisted_living',
  })
  const [profile, setProfile] = useState({
    full_name: '', role: 'admin', phone: '',
  })

  const FACILITY_TYPES = [
    { value: 'assisted_living', label: 'Assisted Living Facility' },
    { value: 'nursing_home', label: 'Skilled Nursing Facility (SNF)' },
    { value: 'group_home', label: 'Group Home' },
    { value: 'memory_care', label: 'Memory Care' },
    { value: 'adult_day', label: 'Adult Day Program' },
    { value: 'other', label: 'Other' },
  ]

  const createFacilityAndProfile = async () => {
    if (!facility.name || !profile.full_name) {
      setError('Facility name and your full name are required.')
      return
    }
    setSaving(true)
    setError('')

    try {
      const { data: facData, error: facError } = await supabase
        .from('facilities')
        .insert({
          name: facility.name,
          address: facility.address || null,
          phone: facility.phone || null,
          license_number: facility.license_number || null,
          subscription_status: 'trial',
        })
        .select()
        .single()

      if (facError) throw new Error(facError.message)

      const { error: profError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          facility_id: facData.id,
          full_name: profile.full_name,
          role: 'admin',
          phone: profile.phone || null,
          is_active: true,
        })

      if (profError) throw new Error(profError.message)

      onComplete()
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '26px', fontWeight: '700', color: 'var(--teal)', marginBottom: '4px' }}>CareFlow</div>
          <div style={{ fontSize: '14px', color: 'var(--text2)' }}>Welcome — let's set up your facility</div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
          {[1, 2].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: step >= s ? 'var(--teal)' : 'var(--border)', color: step >= s ? '#fff' : 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', transition: 'all .2s' }}>
                {s}
              </div>
              <div style={{ fontSize: '12px', color: step >= s ? 'var(--text)' : 'var(--text2)', fontWeight: step === s ? '500' : '400' }}>
                {s === 1 ? 'Facility info' : 'Your profile'}
              </div>
              {s < 2 && <div style={{ width: '32px', height: '1px', background: 'var(--border)', margin: '0 4px' }} />}
            </div>
          ))}
        </div>

        <div className="panel">
          {step === 1 && (
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Tell us about your facility</div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Facility name *</label>
                <input className="form-input" placeholder="Sunrise Care Home" value={facility.name} onChange={e => setFacility({ ...facility, name: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Facility type</label>
                <select className="form-select" value={facility.facility_type} onChange={e => setFacility({ ...facility, facility_type: e.target.value })}>
                  {FACILITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Address</label>
                <input className="form-input" placeholder="123 Main St, Youngstown, OH 44501" value={facility.address} onChange={e => setFacility({ ...facility, address: e.target.value })} />
              </div>
              <div className="form-row" style={{ marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Phone number</label>
                  <input className="form-input" placeholder="(330) 555-0100" value={facility.phone} onChange={e => setFacility({ ...facility, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">License number</label>
                  <input className="form-input" placeholder="OH-LTC-2024-001" value={facility.license_number} onChange={e => setFacility({ ...facility, license_number: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { if (!facility.name) { setError('Facility name is required.'); return; } setError(''); setStep(2) }} disabled={!facility.name}>
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Your administrator profile</div>
              <div style={{ background: 'var(--teal-light)', border: '.5px solid #5DCAA5', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: '13px', color: 'var(--teal-dark)', marginBottom: '16px' }}>
                Setting up <strong>{facility.name}</strong> — you'll be the administrator. You can add staff members after setup.
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Your full name *</label>
                <input className="form-input" placeholder="Jatin Patel" value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Your phone number</label>
                <input className="form-input" placeholder="(330) 555-0100" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
              </div>
              {error && (
                <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 12px', borderRadius: 'var(--radius)', fontSize: '13px', marginBottom: '14px' }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={createFacilityAndProfile} disabled={saving || !profile.full_name}>
                  {saving ? 'Setting up your facility...' : 'Launch CareFlow →'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--text2)' }}>
          14-day free trial · No credit card required · HIPAA-compliant
        </div>
      </div>
    </div>
  )
}
