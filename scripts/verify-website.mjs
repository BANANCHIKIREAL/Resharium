import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import assert from 'node:assert/strict'

const root = resolve('website-dist')
const server = createServer(async (req, res) => {
  const path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname.replace(/\/$/, '/index.html'))
  if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return }
  try {
    const data = await readFile(path)
    res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' })[extname(path)] || 'application/octet-stream')
    res.end(data)
  } catch { res.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const url = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch()
await mkdir('screenshots', { recursive: true })
try {
  for (const width of [1440, 768, 393, 360]) {
    const page = await browser.newPage({ viewport: { width, height: 950 }, reducedMotion: 'reduce' })
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.route('https://api.github.com/**', route => route.fulfill({ status: 503, body: '{}' }))
    await page.goto(url)
    await page.locator('h1').waitFor()
    await page.screenshot({ path: `screenshots/website-${width}.png`, fullPage: true })
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right })).slice(0, 15)))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}`)
    await page.locator('[data-day="1"]').click()
    assert.equal(await page.locator('.week-lessons b').first().textContent(), 'Химия')
    const swatch = page.locator('[data-theme]').last()
    await swatch.click()
    assert.equal(await page.locator('[data-preview-theme]').getAttribute('data-preview-theme'), await swatch.getAttribute('data-theme'))
    for (const platform of ['windows', 'android']) {
      const href = await page.locator(`[data-download="${platform}"]`).getAttribute('href')
      assert.match(href, /^https:\/\/github.com\/BANANCHIKIREAL\/Resharium\/releases\/download\//)
      assert.ok(href.endsWith(platform === 'windows' ? '.exe' : '.apk'))
    }
    await page.locator('summary').first().click()
    assert.equal(await page.locator('details').first().evaluate(el => el.open), true)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: `screenshots/website-${width}.png`, fullPage: true })
    assert.deepEqual(errors, [])
    await page.close()
    console.log(`PASS ${width}px: layout, schedule, themes, downloads, FAQ, no JS errors; API failure fallback`)
  }
  const page = await browser.newPage({ javaScriptEnabled: false })
  await page.goto(url)
  assert.match(await page.locator('[data-download="android"]').getAttribute('href'), /\.apk$/)
  console.log('PASS downloads without JavaScript')
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
