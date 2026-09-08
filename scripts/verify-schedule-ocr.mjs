import { randomUUID } from 'node:crypto'
import { unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

const imagePath = join(tmpdir(), `resharium-schedule-${randomUUID()}.png`)
const browser = await chromium.launch({ headless: true })

try {
  const maker = await browser.newPage({ viewport: { width: 700, height: 500 } })
  await maker.setContent('<div id="card" style="width:600px;padding:30px;background:white;color:black;font:32px Arial;line-height:1.6">Понедельник<br>1. Математика<br>2. Русский язык<br><br>Вторник<br>1. Физика</div>')
  await maker.locator('#card').screenshot({ path: imagePath })

  const page = await browser.newPage({ viewport: { width: 900, height: 900 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1300)
  await page.getByRole('button', { name: 'Расписание' }).click()
  await page.locator('.file-button input').setInputFiles(imagePath)
  await page.waitForFunction(() => document.querySelector('.schedule-editor textarea')?.value.includes('Понедельник'), undefined, { timeout: 120000 })
  const recognized = await page.locator('.schedule-editor textarea').inputValue()
  if (!recognized.includes('Математика') || !recognized.includes('Физика')) throw new Error(`Неполное распознавание: ${recognized}`)
  if (errors.length) throw new Error(`Ошибки страницы:\n${errors.join('\n')}`)
  console.log(recognized)
} finally {
  await browser.close()
  await unlink(imagePath).catch(() => undefined)
}
