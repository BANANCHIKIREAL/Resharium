import { Capacitor } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import type { UpdateState } from './types'
import { androidAssetFor, isNewerVersion, type GitHubRelease } from './lib/update'

export const isNativeAndroid = Capacitor.getPlatform() === 'android'

export async function listenForNativeUrls(onUrl: (url: string) => void) {
  if (!isNativeAndroid) return () => undefined

  const launch = await NativeApp.getLaunchUrl()
  if (launch?.url) onUrl(launch.url)

  const listener = await NativeApp.addListener('appUrlOpen', ({ url }) => onUrl(url))
  return () => { void listener.remove() }
}

export async function openNativePage(url: string) {
  await Browser.open({ url, presentationStyle: 'fullscreen' })
}

export async function closeNativePage() {
  if (!isNativeAndroid) return
  try { await Browser.close() } catch { /* Browser may already be closed. */ }
}

let androidUpdateUrl = ''

export async function getAndroidUpdateState(): Promise<UpdateState> {
  const info = await NativeApp.getInfo()
  return { status: 'idle', currentVersion: info.version }
}

export async function checkAndroidUpdate(): Promise<UpdateState> {
  const info = await NativeApp.getInfo()
  try {
    const response = await fetch('https://api.github.com/repos/BANANCHIKIREAL/Resharium/releases/latest', {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!response.ok) throw new Error(`GitHub: HTTP ${response.status}`)
    const release = await response.json() as GitHubRelease
    const asset = androidAssetFor(release)
    if (asset && isNewerVersion(release.tag_name, info.version)) {
      androidUpdateUrl = asset.browser_download_url
      return { status: 'available', currentVersion: info.version, availableVersion: release.tag_name.replace(/^v/i, ''), message: 'Доступна новая версия Android' }
    }
    androidUpdateUrl = ''
    return { status: 'not-available', currentVersion: info.version, message: 'Установлена последняя версия' }
  } catch (error) {
    return { status: 'error', currentVersion: info.version, message: error instanceof Error ? error.message : 'Не удалось проверить обновления' }
  }
}

export async function installAndroidUpdate() {
  if (!androidUpdateUrl) return false
  await Browser.open({ url: androidUpdateUrl, presentationStyle: 'fullscreen' })
  return true
}
