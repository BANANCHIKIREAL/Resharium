import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const baseUrl = process.env.RESHARIUM_PREVIEW_URL || 'http://127.0.0.1:4173'
const screenshots = resolve('screenshots')
await mkdir(screenshots, { recursive: true })

const browser = await chromium.launch({ headless: true })
const errors = []

async function verify(name, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${name}: ${message.text()}`)
  })

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.locator('.book-card').first().waitFor()
  if (!(await page.locator('body').innerText()).trim()) throw new Error(`${name}: empty page`)
  if (await page.locator('.vite-error-overlay').count()) throw new Error(`${name}: Vite error overlay`)
  for (const bookId of ['resheba-460d25eaefa15b39', 'resheba-3264524c9030b0b3']) {
    const cover = page.locator(`[data-book-id="${bookId}"] .book-cover`)
    await cover.waitFor()
    if (await cover.locator('img').count()) throw new Error(`${name}: blurred source cover is still visible for ${bookId}`)
  }
  if (!(await page.locator('[data-book-id="resheba-1c15ec57ae4cd5d8"] .book-cover img').count())) {
    throw new Error(`${name}: verified sharp source cover is missing`)
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
