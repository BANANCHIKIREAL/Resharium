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
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${name}: ${message.text()}`)
  })

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
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
