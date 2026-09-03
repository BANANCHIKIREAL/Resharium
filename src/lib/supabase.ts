import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseSettings } from '../types'

const SETTINGS_KEY = 'resharium.supabase'

const DEFAULT_SETTINGS: SupabaseSettings = {
  url: 'https://bdfghggtvtnedakrocbu.supabase.co',
  publishableKey: 'sb_publishable_DBEA6QahMZu_7ByoezjLmg_UDbMut-x',
}

export function getStoredSettings(): SupabaseSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') as SupabaseSettings | null
    if (!stored?.url && !stored?.publishableKey) return DEFAULT_SETTINGS
    return stored
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function storeSettings(settings: SupabaseSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function isValidSettings(settings: SupabaseSettings) {
  try {
    const parsed = new URL(settings.url)
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co') && settings.publishableKey.length > 20
  } catch {
    return false
  }
}

export function createSupabase(settings: SupabaseSettings): SupabaseClient | null {
  if (!isValidSettings(settings)) return null
  return createClient(settings.url, settings.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  })
}
