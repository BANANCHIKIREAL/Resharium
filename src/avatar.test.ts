import { describe, expect, it } from 'vitest'
import { profileAvatarUrl } from './avatar'

describe('profileAvatarUrl', () => {
  it('uses the Google avatar URL returned by Supabase', () => {
    expect(profileAvatarUrl({ avatar_url: 'https://lh3.googleusercontent.com/avatar' })).toBe('https://lh3.googleusercontent.com/avatar')
  })

  it('supports the Google picture metadata field', () => {
    expect(profileAvatarUrl({ picture: 'https://example.com/picture.png' })).toBe('https://example.com/picture.png')
  })

  it('rejects unsafe non-HTTPS avatar URLs', () => {
    expect(profileAvatarUrl({ avatar_url: 'javascript:alert(1)' })).toBeNull()
  })
})
