import { useState, useEffect, useCallback } from 'react'
import { supabase, auditLog } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'

export function useResidents() {
  const { profile } = useAuth()
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)

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
    if (profile?.facility_id) return
    fetchResidents()
  }, [profile?.facility_id])

  const getResident = async (id) => {
    const { data } = await supabase
      .from('residents')
      .select('*, care_plans(*), medications(*)')
      .eq('id', id)
      .single()
    await auditLog('read', 'resident', id)
    return data
  }

  const addResident = async (values) => {
    const { data, error } = await supabase
      .from('residents')
      .insert({ ...values, facility_id: profile.facility_id })
      .select()
      .single()
    if (!error) {
      await auditLog('create', 'resident', data.id, null, data)
      fetchResidents()
    }
    return { data, error }
  }

  const updateResident = async (id, values) => {
    const old = residents.find(r => r.id === id)
    const { data, error } = await supabase
      .from('residents')
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error) {
      await auditLog('update', 'resident', id, old, data)
      fetchResidents()
    }
    return { data, error }
  }

  return { residents, loading, getResident, addResident, updateResident, refetch: fetchResidents }
}
