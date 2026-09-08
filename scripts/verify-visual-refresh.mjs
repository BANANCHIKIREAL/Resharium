import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const baseUrl = process.env.RESHARIUM_PREVIEW_URL || 'http://127.0.0.1:4173'
const screenshots = resolve('screenshots')
await mkdir(screenshots, { recursive: true })

const browser = await chromium.launch({ headless: true })
const errors = []

async function verify(name, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, hasTouch: name === 'mobile' })
  page.setDefaultTimeout(10_000)
  if (name === 'desktop') {
    await page.addInitScript(() => {
      window.desktop = {
        openExternal: async () => undefined,
        getPendingAuthUrl: async () => null,
        clearPendingAuthUrl: async () => undefined,
        onAuthCallback: () => () => undefined,
        getUpdateState: async () => ({ status: 'idle', currentVersion: '1.5.2' }),
        checkForUpdates: async () => ({ status: 'not-available', currentVersion: '1.5.2' }),
        downloadUpdate: async () => false,
        installUpdate: async () => false,
        onUpdateState: () => () => undefined,
        getDesktopSettings: async () => ({ minimizeShortcut: 'CommandOrControl+Shift+M', adBlockEnabled: true }),
        setMinimizeShortcut: async (shortcut) => ({ ok: true, shortcut }),
        setAdBlockEnabled: async (enabled) => enabled,
        setShortcutCapture: async () => undefined,
      }
    })
  }
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${name}: ${message.text()}`)
  })

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.locator('.launch-intro').waitFor()
  await page.waitForTimeout(520)
  await page.locator('.launch-intro').screenshot({ path: resolve(screenshots, `launch-${name}.png`) })
  await page.locator('.launch-intro').waitFor({ state: 'detached' })
  await page.locator('.book-card').first().waitFor()
  if (!(await page.locator('body').innerText()).trim()) throw new Error(`${name}: empty page`)
  if (await page.locator('.vite-error-overlay').count()) throw new Error(`${name}: Vite error overlay`)
  const originalCover = page.locator('[data-book-id="resheba-460d25eaefa15b39"] .book-cover img')
  await originalCover.waitFor()
  if (!(await originalCover.getAttribute('src'))?.includes('resheba.top/_pu/2/36771776.jpg')) throw new Error(`${name}: genuine source cover is missing`)
  await page.waitForFunction(() => document.querySelector('[data-book-id="resheba-460d25eaefa15b39"] .book-cover img')?.naturalWidth > 0)
  const upgradedCover = page.locator('[data-book-id="resheba-3264524c9030b0b3"] .book-cover img')
  await upgradedCover.waitFor()
  if (!(await upgradedCover.getAttribute('src'))?.includes('gdz.by/media/english_07/demchenko-rt23/covers/cover2.webp')) throw new Error(`${name}: verified sharp cover is missing`)
  await page.waitForFunction(() => document.querySelector('[data-book-id="resheba-3264524c9030b0b3"] .book-cover img')?.naturalWidth > 0)
  await page.locator('[data-book-id="resheba-460d25eaefa15b39"]').screenshot({ path: resolve(screenshots, `genuine-workbook-${name}.png`) })
  await page.locator('[data-book-id="resheba-3264524c9030b0b3"]').screenshot({ path: resolve(screenshots, `sharp-workbook-${name}.png`) })
  if (!(await page.locator('[data-book-id="resheba-1c15ec57ae4cd5d8"] .book-cover img').count())) {
    throw new Error(`${name}: verified sharp source cover is missing`)
  }
  if (name === 'desktop') {
    if (await page.locator('.global-search kbd').count()) throw new Error('desktop: obsolete Ctrl K search hint is still visible')
    await page.getByRole('button', { name: 'Настройки', exact: true }).click()
    await page.locator('.shortcut-recorder').waitFor()
    await page.getByRole('button', { name: 'Изменить' }).click()
    await page.keyboard.down('Control')
    await page.keyboard.up('Control')
    await page.getByText('Ctrl', { exact: true }).waitFor()
    await page.getByText('Одиночная клавиша работает, пока окно Решариума активно.', { exact: true }).waitFor()
    await page.screenshot({ path: resolve(screenshots, 'settings-desktop.png'), fullPage: true })
    await page.getByRole('button', { name: 'Главная', exact: true }).click()
    await page.locator('.book-card').first().waitFor()
  }
  if (name === 'mobile') {
    const collectionsButton = page.getByRole('button', { name: 'Мои подборки', exact: true })
    const tapHighlight = await collectionsButton.evaluate((element) => getComputedStyle(element).webkitTapHighlightColor)
    if (tapHighlight !== 'rgba(0, 0, 0, 0)') throw new Error(`mobile: tap highlight is ${tapHighlight}`)
    await collectionsButton.click()
    await page.locator('.collection-heading').waitFor()
    await page.waitForTimeout(300)
    if ((await page.locator('.sidebar nav button.active').getAttribute('aria-label')) !== 'Мои подборки') {
      throw new Error('mobile: collections tab did not become active')
    }
    await page.screenshot({ path: resolve(screenshots, 'liquid-glass-mobile.png'), fullPage: true })
    await page.getByRole('button', { name: 'Настройки', exact: true }).click()
    await page.locator('.settings-page').waitFor()
    await page.getByRole('button', { name: 'Океан' }).click()
    if ((await page.locator('html').getAttribute('data-theme')) !== 'ocean') throw new Error('mobile: selected theme was not applied')
    await page.screenshot({ path: resolve(screenshots, 'settings-mobile.png'), fullPage: true })
    await page.getByRole('button', { name: /Фиолетовая/ }).click()
    await page.getByRole('button', { name: 'Главная' }).click()
    await page.locator('.book-card').first().waitFor()
    await page.locator('.book-card').first().click()
    await page.locator('.drawer').waitFor()
    await page.getByRole('button', { name: 'Закрыть учебник' }).click()
    await page.locator('.drawer').waitFor({ state: 'detached' })
    await page.getByRole('button', { name: 'Недавнее', exact: true }).click()
    await page.locator('.recent-card').first().waitFor()
    await page.waitForTimeout(300)
    if ((await page.locator('.recent-card').count()) !== 1) throw new Error('mobile: opened book was not saved once in recent history')
    if ((await page.locator('.sidebar nav button.active').getAttribute('aria-label')) !== 'Недавнее') throw new Error('mobile: recent tab did not become active')
    if (!(await page.locator('.sidebar nav button.active .ui-icon[data-icon="history"].filled').count())) throw new Error('mobile: recent tab icon has no selected Morphicons state')
    if ((await page.locator('.page').evaluate((element) => element.scrollTop)) !== 0) throw new Error('mobile: recent page did not reset scroll position')
    await page.screenshot({ path: resolve(screenshots, 'recent-mobile.png'), fullPage: true })
    await page.getByRole('button', { name: 'Главная' }).click()
    await page.locator('.book-card').first().waitFor()
  }
  await page.screenshot({ path: resolve(screenshots, `glass-${name}.png`), fullPage: true })

  await page.locator('.book-card').first().click()
  await page.waitForTimeout(90)
  if (!(await page.locator('.book-cover-morph').count())) throw new Error(`${name}: cover morph did not start`)
  await page.screenshot({ path: resolve(screenshots, `morph-${name}.png`) })
  await page.waitForTimeout(480)
  await page.locator('.drawer').waitFor()
  if (!(await page.locator('.morph-target.ready').count())) throw new Error(`${name}: cover morph did not finish`)
  await page.screenshot({ path: resolve(screenshots, `drawer-${name}.png`) })
  await page.close()
}

try {
  await verify('desktop', { width: 1440, height: 900 })
  await verify('mobile', { width: 390, height: 844 })
  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`)
  console.log('Visual refresh verified: desktop + mobile, glass background + cover morph.')
} finally {
  await browser.close()
}
