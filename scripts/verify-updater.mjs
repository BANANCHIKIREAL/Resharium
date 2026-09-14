import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 900, height: 720 } })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
await page.addInitScript(() => {
  window.__openedExternal = ''
  window.desktop = {
    openExternal: async (url) => { window.__openedExternal = url },
    getAppVersion: async () => '0.5.3',
    getPendingAuthUrl: async () => null,
    clearPendingAuthUrl: async () => undefined,
    onAuthCallback: () => () => undefined,
    getDesktopSettings: async () => ({ minimizeShortcut: 'CommandOrControl+Shift+M', adBlockEnabled: true }),
    setMinimizeShortcut: async (shortcut) => ({ ok: true, shortcut }),
    setAdBlockEnabled: async (enabled) => enabled,
    setShortcutCapture: async () => undefined,
  }
})
await page.route('https://api.github.com/repos/BANANCHIKIREAL/Resharium/releases/latest', (route) => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ tag_name: 'v0.6.0', html_url: 'https://github.com/BANANCHIKIREAL/Resharium/releases/tag/v0.6.0', name: 'Решариум 0.6.0', body: 'Новая иконка\nИсправлен обновлятор', draft: false, prerelease: false, assets: [] }),
}))
await page.goto(process.env.RESHARIUM_PREVIEW_URL || 'http://127.0.0.1:4173')
await page.getByRole('dialog').waitFor()
await page.getByText('Новая иконка').waitFor()
await page.getByRole('button', { name: 'Скачать' }).click()
if (await page.evaluate(() => window.__openedExternal) !== 'https://bananchikireal.github.io/Resharium/#download') throw new Error('Updater did not open the website download section')
await browser.close()
if (errors.length) throw new Error(errors.join('\n'))
console.log('Updater verified: automatic check, changelog, and website download action.')
