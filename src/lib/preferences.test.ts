import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFERENCES, keyboardEventToAccelerator, normalizePreferences } from './preferences'

describe('application preferences', () => {
  it('normalizes incomplete stored settings', () => {
    expect(normalizePreferences({ theme: 'ocean', adBlockEnabled: false })).toEqual({
      ...DEFAULT_PREFERENCES, theme: 'ocean', adBlockEnabled: false,
    })
  })

  it('converts a keyboard combination to an Electron accelerator', () => {
    expect(keyboardEventToAccelerator({ key: 'm', code: 'KeyM', ctrlKey: true, metaKey: false, altKey: true, shiftKey: false })).toBe('CommandOrControl+Alt+M')
  })

  it('allows a function key but rejects an unmodified letter', () => {
    expect(keyboardEventToAccelerator({ key: 'F8', code: 'F8', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false })).toBe('F8')
    expect(keyboardEventToAccelerator({ key: 'm', code: 'KeyM', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false })).toBeNull()
  })
})
