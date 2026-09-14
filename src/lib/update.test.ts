import { afterEach, describe, expect, it, vi } from 'vitest'
import { androidAssetFor, isNewerVersion, latestReleaseFor } from './update'

afterEach(() => vi.unstubAllGlobals())

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

  it('detects a published release even after the project version-number reset', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      tag_name: 'v0.6.0', html_url: 'https://github.com/BANANCHIKIREAL/Resharium/releases/tag/v0.6.0', assets: [], draft: false, prerelease: false,
    }), { status: 200 }))))
    expect((await latestReleaseFor('1.6.0'))?.tag_name).toBe('v0.6.0')
    expect(await latestReleaseFor('0.6.0')).toBeNull()
  })
})
