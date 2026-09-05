import assert from 'node:assert/strict'
import { chromium } from 'playwright'

// Run against the built app, using an isolated guest session and no live writes.
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 920 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*.supabase.co/**', route => route.fulfill({
    contentType: 'application/json',
    body: route.request().url().includes('/settings') ? '{"external":{"google":true}}' : '[]',
  }))
  await page.goto('http://127.0.0.1:4173')
  await page.locator('.book-card').first().waitFor()
  const checkIcons = () => page.locator('.ui-icon').evaluateAll(nodes => nodes.map(node => ({
    name: node.dataset.icon,
    path: node.querySelector('svg path')?.getAttribute('d'),
    svg: !!node.querySelector('svg'),
  })))
  const icons = await checkIcons()
  assert(icons.length > 80)
  assert(icons.every(icon => icon.svg && icon.path && !/NaN|undefined/.test(icon.path)))
  assert.equal(await page.locator('.material-symbols-rounded').count(), 0)
  assert.equal(await page.locator('.subject-icon svg').count(), 33)

  // Observe intermediate SVG paths, not just the selected CSS class.
  const bookmark = page.locator('.bookmark').first()
  await bookmark.evaluate(button => {
    window.morphSamples = []
    const path = button.querySelector('path')
    window.morphObserver = new MutationObserver(() => window.morphSamples.push(path.getAttribute('d')))
    window.morphObserver.observe(path, { attributes: true, attributeFilter: ['d'] })
  })
  const initial = await bookmark.locator('path').getAttribute('d')
  await bookmark.click()
  await page.waitForTimeout(900)
  const saved = await bookmark.locator('path').getAttribute('d')
  assert.notEqual(initial, saved)
  const frames = await page.evaluate(() => new Set(window.morphSamples).size)
  assert(frames > 3, `Expected animation frames, received ${frames}`)
  // Fast repeated taps must settle back at the same canonical icon.
  await bookmark.click()
  await bookmark.click()
  await bookmark.click()
  await page.waitForTimeout(1000)
  assert.equal(await bookmark.locator('path').getAttribute('d'), initial)
  await page.evaluate(() => window.morphObserver.disconnect())

  const grade = page.locator('.grade-trigger')
  const closed = await grade.locator('path').getAttribute('d')
  await grade.click()
  await page.waitForTimeout(900)
  assert.notEqual(await grade.locator('path').getAttribute('d'), closed)
  await grade.click()
  await page.waitForTimeout(900)
  assert.equal(await grade.locator('path').getAttribute('d'), closed)
  await page.screenshot({ path: 'screenshots/morphicons-desktop.png' })

  // The same paths also render when external networking is unavailable.
  // Local assets represent the files bundled in Electron/Capacitor; block the internet only.
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.book-card').first().click()
  await page.waitForTimeout(350)
  assert((await checkIcons()).every(icon => icon.svg && icon.path))
  assert(await page.locator('.drawer').evaluate(node => node.getBoundingClientRect().width <= innerWidth))
  await page.screenshot({ path: 'screenshots/morphicons-mobile-drawer.png' })
  await page.getByRole('button', { name: 'Закрыть учебник' }).click()
  await page.getByRole('button', { name: 'Аккаунт', exact: true }).click()
  await page.waitForTimeout(300)
  assert(await page.locator('.google-g').evaluate(node => node.complete && node.naturalWidth > 0))
  await page.screenshot({ path: 'screenshots/morphicons-mobile-auth.png' })
  await page.getByRole('button', { name: 'Закрыть окно' }).click()

  // Reduced-motion preference suppresses the morph's intermediate paths.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await bookmark.evaluate(button => {
    window.reducedSamples = []
    const path = button.querySelector('path')
    window.reducedObserver = new MutationObserver(() => window.reducedSamples.push(path.getAttribute('d')))
    window.reducedObserver.observe(path, { attributes: true, attributeFilter: ['d'] })
  })
  await bookmark.click()
  await page.waitForTimeout(250)
  const reducedFrames = await page.evaluate(() => new Set(window.reducedSamples).size)
  assert(reducedFrames <= 1)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ icons: icons.length, subjects: 33, morphFrames: frames, reducedFrames, offline: true, errors }, null, 2))
} finally {
  await browser.close()
}
