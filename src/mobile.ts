import { Capacitor } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'

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
