import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFERENCES, displayAccelerator, isModifierOnlyAccelerator, keyboardEventToAccelerator, modifierKeyToAccelerator, normalizePreferences, shouldApplyRemoteLearningProfile } from './preferences'

describe('application preferences', () => {
  it('normalizes incomplete stored settings', () => {
    expect(normalizePreferences({ theme: 'ocean', adBlockEnabled: false })).toEqual({
      ...DEFAULT_PREFERENCES, theme: 'ocean', adBlockEnabled: false,
    })
  })

  it('keeps a valid learning profile and rejects invalid values', () => {
    expect(normalizePreferences({ country: 'KZ', schoolGrade: 9, profileUpdatedAt: 123, onboardingComplete: true })).toMatchObject({ country: 'KZ', schoolGrade: 9, profileUpdatedAt: 123, onboardingComplete: true })
    expect(normalizePreferences({ country: 'XX', schoolGrade: 15 })).toMatchObject({ country: 'BY', schoolGrade: 7 })
  })

  it('does not overwrite a newer local country with stale account metadata', () => {
    const local = { ...DEFAULT_PREFERENCES, country: 'RU' as const, profileUpdatedAt: 200, onboardingComplete: true }
    expect(shouldApplyRemoteLearningProfile(local, 100, true)).toBe(false)
    expect(shouldApplyRemoteLearningProfile(local, 300, true)).toBe(true)
  })

  it('converts a keyboard combination to an Electron accelerator', () => {
    expect(keyboardEventToAccelerator({ key: 'm', code: 'KeyM', ctrlKey: true, metaKey: false, altKey: true, shiftKey: false })).toBe('CommandOrControl+Alt+M')
  })

  it('allows a function key but rejects an unmodified letter', () => {
    expect(keyboardEventToAccelerator({ key: 'F8', code: 'F8', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false })).toBe('F8')
    expect(keyboardEventToAccelerator({ key: 'm', code: 'KeyM', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false })).toBeNull()
  })

  it('recognizes a single modifier for local minimize shortcuts', () => {
    expect(modifierKeyToAccelerator('Control')).toBe('Control')
    expect(modifierKeyToAccelerator('Meta')).toBe('Super')
    expect(isModifierOnlyAccelerator('Shift')).toBe(true)
    expect(isModifierOnlyAccelerator('CommandOrControl+M')).toBe(false)
    expect(displayAccelerator('Control')).toBe('Ctrl')
    expect(displayAccelerator('Super')).toBe('Win')
  })
})
