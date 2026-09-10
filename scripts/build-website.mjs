import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = join(root, 'website-dist')
const headers = { Accept: 'application/vnd.github+json' }
if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`
let release
if (process.env.SITE_RELEASE_FILE) {
  release = JSON.parse(await readFile(resolve(process.env.SITE_RELEASE_FILE), 'utf8'))
} else {
  const response = await fetch('https://api.github.com/repos/BANANCHIKIREAL/Resharium/releases/latest', { headers, signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Cannot resolve current release: HTTP ${response.status}`)
  release = await response.json()
}
if (release.draft || release.prerelease || !/^v?\d+\.\d+\.\d+$/.test(release.tag_name)) throw new Error('A published stable release is required')
const version = release.tag_name.replace(/^v/, '')
const releaseBase = 'https://github.com/BANANCHIKIREAL/Resharium/releases/'
const assets = Object.fromEntries(['windows', 'android'].map((platform) => {
  const name = platform === 'windows' ? `Resharium-Setup-${version}.exe` : `Resharium-Android-${version}.apk`
  const asset = release.assets.find((item) => item.name === name)
  if (!asset || asset.state !== 'uploaded' || !(asset.size > 0) || !asset.browser_download_url.startsWith(`${releaseBase}download/`)) throw new Error(`Missing or incomplete release asset: ${name}`)
  return [platform, asset]
}))
if (!release.html_url.startsWith(`${releaseBase}tag/`)) throw new Error('Unexpected release URL')
const formatSize = (size) => `${(size / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`
const values = {
  VERSION: version,
  WINDOWS_URL: assets.windows.browser_download_url,
  ANDROID_URL: assets.android.browser_download_url,
  WINDOWS_SIZE: formatSize(assets.windows.size),
  ANDROID_SIZE: formatSize(assets.android.size),
  RELEASE_URL: release.html_url,
}
const template = await readFile(join(root, 'website/index.html'), 'utf8')
const html = template.replace(/@@([A-Z_]+)@@/g, (_, key) => {
  if (!values[key]) throw new Error(`Unknown template token: ${key}`)
  return values[key]
})
await mkdir(join(output, 'assets'), { recursive: true })
await writeFile(join(output, 'index.html'), html)
await cp(join(root, 'website/style.css'), join(output, 'style.css'))
await cp(join(root, 'website/app.js'), join(output, 'app.js'))
await cp(join(root, 'assets/app-icon.png'), join(output, 'assets/app-icon.png'))
await cp(join(root, 'assets/providers'), join(output, 'assets'), { recursive: true })
await writeFile(join(output, '.nojekyll'), '')
await writeFile(join(output, 'release.json'), JSON.stringify({ version, url: release.html_url, windows: assets.windows.browser_download_url, android: assets.android.browser_download_url }, null, 2))
console.log(`Website built for ${version}. Windows: ${assets.windows.size} bytes; Android: ${assets.android.size} bytes.`)
