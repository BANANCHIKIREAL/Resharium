import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 582, height: 1280 }, deviceScaleFactor: 1 })
const errors = []
page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
page.on('pageerror', (error) => errors.push(error.message))

await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
await page.waitForSelector('.book-card')
const cardCount = await page.locator('.book-card').count()
if (cardCount < 20) throw new Error(`Ожидалось не меньше 20 популярных карточек, найдено ${cardCount}`)

const coverCheck = await page.locator('.book-cover').first().evaluate((element) => ({
  glow: getComputedStyle(element).getPropertyValue('--book-glow').trim(),
  shadow: getComputedStyle(element).boxShadow,
}))
if (!coverCheck.glow || /^#fff/i.test(coverCheck.glow)) throw new Error(`Некорректное свечение: ${JSON.stringify(coverCheck)}`)

await page.locator('.book-card').first().click()
await page.waitForSelector('.drawer')
await page.waitForTimeout(400)
const drawerLayout = await page.evaluate(() => {
  const overlay = document.querySelector('.overlay')
  const sidebar = document.querySelector('.sidebar')
  const drawer = document.querySelector('.drawer')
  if (!overlay || !sidebar || !drawer) return null
  return {
    innerWidth: window.innerWidth,
    mediaMobile: matchMedia('(max-width: 700px)').matches,
    left: drawer.getBoundingClientRect().left,
    width: drawer.getBoundingClientRect().width,
    overlayZ: Number(getComputedStyle(overlay).zIndex),
    sidebarZ: Number(getComputedStyle(sidebar).zIndex),
    clientHeight: drawer.clientHeight,
    scrollHeight: drawer.scrollHeight,
  }
})
if (!drawerLayout || drawerLayout.overlayZ <= drawerLayout.sidebarZ || drawerLayout.left !== 0 || drawerLayout.width !== drawerLayout.innerWidth) throw new Error(`Некорректный drawer: ${JSON.stringify(drawerLayout)}`)
await page.screenshot({ path: 'screenshots/mobile-drawer-1.3.0.png', fullPage: false })

await page.locator('.drawer-head .icon-btn').click()
await page.locator('.topbar .icon-btn').click()
await page.waitForSelector('.modal')
await page.waitForTimeout(300)
const modalLayout = await page.evaluate(() => {
  const modal = document.querySelector('.modal')
  const overlay = document.querySelector('.modal-overlay')
  const sidebar = document.querySelector('.sidebar')
  if (!modal || !overlay || !sidebar) return null
  return {
    overlayZ: Number(getComputedStyle(overlay).zIndex),
    sidebarZ: Number(getComputedStyle(sidebar).zIndex),
    clientHeight: modal.clientHeight,
    scrollHeight: modal.scrollHeight,
  }
})
if (!modalLayout || modalLayout.overlayZ <= modalLayout.sidebarZ) throw new Error(`Нижняя панель перекрывает modal: ${JSON.stringify(modalLayout)}`)
await page.screenshot({ path: 'screenshots/mobile-auth-1.3.0.png', fullPage: false })

await browser.close()
if (errors.length) throw new Error(`Ошибки страницы:\n${errors.join('\n')}`)
console.log(JSON.stringify({ cardCount, coverCheck, drawerLayout, modalLayout }, null, 2))
