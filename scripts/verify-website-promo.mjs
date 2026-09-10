import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser = await chromium.launch()
try {
  for (const width of [1440, 393]) {
    const page = await browser.newPage({ viewport: { width, height: 950 }, reducedMotion: 'reduce' })
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.addInitScript(() => { window.open = (url) => { window.__openedWebsite = url; return null } })
    await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' })
    await page.locator('.launch-intro').waitFor({ state: 'detached', timeout: 15000 })
    const promo = page.locator('.website-promo')
    await promo.waitFor()
    await promo.scrollIntoViewIfNeeded()
    const box = await promo.boundingBox()
    assert.ok(box.x >= 0 && box.x + box.width <= width, 'Promo fits screen')
    await page.locator('.website-promo-link').click()
    assert.equal(await page.evaluate(() => window.__openedWebsite), 'https://bananchikireal.github.io/Resharium/')
    await page.screenshot({ path: `screenshots/promo-${width}.png` })
    await page.getByRole('button', { name: 'Скрыть карточку сайта' }).click()
    assert.equal(await promo.count(), 0)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('.launch-intro').waitFor({ state: 'detached', timeout: 15000 })
    await page.locator('.book-card').first().waitFor()
    assert.equal(await promo.count(), 0)
    assert.deepEqual(errors, [])
    console.log(`PASS ${width}px: promo fits, opens correct website, dismissal survives reload, no JS errors`)
    await page.close()
  }
} finally { await browser.close() }
