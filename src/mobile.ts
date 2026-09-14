import { Capacitor, registerPlugin } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'

export const isNativeAndroid = Capacitor.getPlatform() === 'android'

interface AdBlockBrowserPlugin {
  open(options: { url: string; adBlockEnabled: boolean }): Promise<void>
}

interface QuickSettingsPlugin {
  requestTile(): Promise<{ supported: boolean; added: boolean; status?: number }>
}

const AdBlockBrowser = registerPlugin<AdBlockBrowserPlugin>('AdBlockBrowser')
const QuickSettings = registerPlugin<QuickSettingsPlugin>('QuickSettings')

export async function requestQuickSettingsTile() {
  if (!isNativeAndroid) return { supported: false, added: false }
  return QuickSettings.requestTile()
}

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

export async function openNativeSourcePage(url: string, adBlockEnabled = true) {
  if (!isNativeAndroid) return openNativePage(url)
  await AdBlockBrowser.open({ url, adBlockEnabled })
}

export async function closeNativePage() {
  if (!isNativeAndroid) return
  try { await Browser.close() } catch { /* Browser may already be closed. */ }
}

export async function getAndroidAppVersion() {
  const info = await NativeApp.getInfo()
  return info.version
}
