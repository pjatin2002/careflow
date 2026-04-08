import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Audit log helper — HIPAA requires logging every data access and change
export async function auditLog(action, resourceType, resourceId, oldValue = null, newValue = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase
      .from('profiles').select('facility_id').eq('id', user.id).single()
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      facility_id: profile?.facility_id,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      old_value: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
      new_value: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
    })
  } catch (e) {
    console.error('Audit log error:', e)
  }
}
