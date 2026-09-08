export type AppTheme = 'violet' | 'ocean' | 'emerald' | 'sunset'

export interface AppPreferences {
  theme: AppTheme
  animationsEnabled: boolean
  adBlockEnabled: boolean
  minimizeShortcut: string
  musicEnabled: boolean
  musicVolume: number
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  theme: 'violet',
  animationsEnabled: true,
  adBlockEnabled: true,
  minimizeShortcut: 'CommandOrControl+Shift+M',
  musicEnabled: true,
  musicVolume: 0.12,
}

const themes = new Set<AppTheme>(['violet', 'ocean', 'emerald', 'sunset'])

export function normalizePreferences(value: unknown): AppPreferences {
  if (!value || typeof value !== 'object') return DEFAULT_PREFERENCES
  const stored = value as Partial<AppPreferences>
  return {
    theme: stored.theme && themes.has(stored.theme) ? stored.theme : DEFAULT_PREFERENCES.theme,
    animationsEnabled: typeof stored.animationsEnabled === 'boolean' ? stored.animationsEnabled : DEFAULT_PREFERENCES.animationsEnabled,
    adBlockEnabled: typeof stored.adBlockEnabled === 'boolean' ? stored.adBlockEnabled : DEFAULT_PREFERENCES.adBlockEnabled,
    minimizeShortcut: typeof stored.minimizeShortcut === 'string' ? stored.minimizeShortcut : DEFAULT_PREFERENCES.minimizeShortcut,
    musicEnabled: typeof stored.musicEnabled === 'boolean' ? stored.musicEnabled : DEFAULT_PREFERENCES.musicEnabled,
    musicVolume: typeof stored.musicVolume === 'number' && Number.isFinite(stored.musicVolume) ? Math.min(1, Math.max(0, stored.musicVolume)) : DEFAULT_PREFERENCES.musicVolume,
  }
}

const keyNames: Record<string, string> = {
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  ' ': 'Space', Enter: 'Enter', Backspace: 'Backspace', Delete: 'Delete',
  Insert: 'Insert', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', Tab: 'Tab',
}

const modifierAccelerators: Record<string, string> = {
  Control: 'Control',
  Shift: 'Shift',
  Alt: 'Alt',
  Meta: 'Super',
}

export function modifierKeyToAccelerator(key: string) {
  return modifierAccelerators[key] || null
}

export function isModifierOnlyAccelerator(value: string) {
  return ['Control', 'Shift', 'Alt', 'Super'].includes(value)
}

export function keyboardEventToAccelerator(event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>) {
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return null
  let key = keyNames[event.key]
  if (!key && /^Key[A-Z]$/.test(event.code)) key = event.code.slice(3)
  if (!key && /^Digit\d$/.test(event.code)) key = event.code.slice(5)
  if (!key && /^F(?:[1-9]|1\d|2[0-4])$/.test(event.key)) key = event.key
  if (!key) return null
  const modifiers = [event.ctrlKey || event.metaKey ? 'CommandOrControl' : '', event.altKey ? 'Alt' : '', event.shiftKey ? 'Shift' : ''].filter(Boolean)
  if (!modifiers.length && !/^F/.test(key)) return null
  return [...modifiers, key].join('+')
}

export function displayAccelerator(value: string) {
  if (value === 'Control') return 'Ctrl'
  if (value === 'Super') return 'Win'
  return value.replace('CommandOrControl', 'Ctrl') || 'Не назначено'
}
