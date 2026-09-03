import { describe, expect, it } from 'vitest'
import { isValidSettings } from './supabase'

describe('Supabase settings validation', () => {
  it('accepts an HTTPS Supabase project with a publishable key', () => {
    expect(isValidSettings({
      url: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_12345678901234567890',
    })).toBe(true)
  })

  it('rejects insecure and unrelated URLs', () => {
    expect(isValidSettings({ url: 'http://example.supabase.co', publishableKey: 'x'.repeat(32) })).toBe(false)
    expect(isValidSettings({ url: 'https://example.com', publishableKey: 'x'.repeat(32) })).toBe(false)
  })
})
