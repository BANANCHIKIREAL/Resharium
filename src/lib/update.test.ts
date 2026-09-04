import { describe, expect, it } from 'vitest'
import { androidAssetFor, isNewerVersion } from './update'

describe('Android updater', () => {
  it('compares semantic release versions', () => {
    expect(isNewerVersion('v1.3.0', '1.2.0')).toBe(true)
    expect(isNewerVersion('v1.2.0', '1.2.0')).toBe(false)
    expect(isNewerVersion('v1.1.9', '1.2.0')).toBe(false)
  })

  it('selects only the Android APK release asset', () => {
    expect(androidAssetFor({ tag_name: 'v1.3.0', html_url: '', assets: [
      { name: 'Resharium-Setup-1.3.0.exe', browser_download_url: 'windows' },
      { name: 'Resharium-Android-1.3.0.apk', browser_download_url: 'android' },
    ] })?.browser_download_url).toBe('android')
  })
})
