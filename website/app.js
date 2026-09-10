const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')
const precisePointer = matchMedia('(hover: hover) and (pointer: fine)')
if (!reduceMotion.matches && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('motion-ready')
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('visible')
      observer.unobserve(entry.target)
    }
  }, { threshold: 0.08 })
  document.querySelectorAll('.reveal').forEach((element) => observer.observe(element))
}

const scene = document.querySelector('#book-scene')
const visual = document.querySelector('.hero-visual')
visual.addEventListener('pointermove', (event) => {
  if (reduceMotion.matches || !precisePointer.matches) return
  const bounds = visual.getBoundingClientRect()
  scene.style.setProperty('--rotate-y', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 17}deg`)
  scene.style.setProperty('--rotate-x', `${((event.clientY - bounds.top) / bounds.height - 0.5) * -12}deg`)
})
visual.addEventListener('pointerleave', () => {
  scene.style.setProperty('--rotate-x', '0deg')
  scene.style.setProperty('--rotate-y', '0deg')
})

const sampleDays = [
  ['Математика', 'Русский язык', 'Физика'],
  ['Химия', 'Английский язык', 'Биология'],
  ['Беларуская мова', 'Геометрия', 'География'],
  ['Физика', 'Информатика', 'История Беларуси'],
  ['Математика', 'Литература', 'Английский язык'],
]
document.querySelectorAll('[data-day]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-day]').forEach((tab) => {
      tab.classList.toggle('active', tab === button)
      tab.setAttribute('aria-pressed', String(tab === button))
    })
    document.querySelectorAll('.week-lessons b').forEach((label, index) => { label.textContent = sampleDays[Number(button.dataset.day)][index] })
  })
})
document.querySelectorAll('[data-theme]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('[data-preview-theme]').dataset.previewTheme = button.dataset.theme
    document.querySelectorAll('[data-theme]').forEach((swatch) => {
      swatch.classList.toggle('active', swatch === button)
      swatch.setAttribute('aria-pressed', String(swatch === button))
    })
  })
})

// The generated page already has working release links, including with JavaScript disabled.
// Refresh when possible so a newly published version is available before Pages finishes deploying.
const releaseBase = 'https://github.com/BANANCHIKIREAL/Resharium/releases/'
const status = document.querySelector('#release-status')
const formatSize = (bytes) => `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`
async function refreshDownloads() {
  try {
    const response = await fetch('https://api.github.com/repos/BANANCHIKIREAL/Resharium/releases/latest', { signal: AbortSignal.timeout(7000) })
    if (!response.ok) return
    const release = await response.json()
    if (release.draft || release.prerelease || !/^v?\d+\.\d+\.\d+$/.test(release.tag_name) || !release.html_url?.startsWith(releaseBase + 'tag/')) return
    const version = release.tag_name.replace(/^v/, '')
    const assets = Array.isArray(release.assets) ? release.assets : []
    const windows = assets.find((asset) => asset.name === `Resharium-Setup-${version}.exe`)
    const android = assets.find((asset) => asset.name === `Resharium-Android-${version}.apk`)
    if (![windows, android].every((asset) => asset?.state === 'uploaded' && asset.size > 0 && asset.browser_download_url?.startsWith(releaseBase + 'download/'))) return
    for (const [platform, asset] of Object.entries({ windows, android })) {
      document.querySelectorAll(`[data-download="${platform}"]`).forEach((link) => { link.href = asset.browser_download_url })
      document.querySelectorAll(`[data-size="${platform}"]`).forEach((element) => { element.textContent = formatSize(asset.size) })
    }
    document.querySelectorAll('[data-version]').forEach((element) => { element.textContent = version })
    document.querySelectorAll('[data-release-link]').forEach((link) => { link.href = release.html_url })
    status.textContent = `Последний опубликованный релиз · ${version}`
  } catch { /* The build-time links remain available during an API outage or rate limit. */ }
}
void refreshDownloads()
