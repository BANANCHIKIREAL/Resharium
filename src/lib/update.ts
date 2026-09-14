export interface GitHubRelease {
  tag_name: string
  html_url: string
  name?: string
  body?: string | null
  draft?: boolean
  prerelease?: boolean
  assets: Array<{ name: string; browser_download_url: string }>
}

export const RELEASE_API_URL = 'https://api.github.com/repos/BANANCHIKIREAL/Resharium/releases/latest'

export async function latestReleaseFor(currentVersion: string): Promise<GitHubRelease | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  let response: Response
  try {
    response = await fetch(RELEASE_API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
  if (!response.ok) throw new Error(`GitHub: HTTP ${response.status}`)
  const release = await response.json() as GitHubRelease
  if (release.draft || release.prerelease || !/^v?\d+\.\d+\.\d+$/.test(release.tag_name)) return null
  const candidate = normalizeVersion(release.tag_name)
  const current = normalizeVersion(currentVersion)
  if (candidate === current) return null
  // The project intentionally restarted its public numbering at 0.x. Only the
  // legacy 1.x line bypasses normal semver ordering; 0.x builds never downgrade.
  if (Number(current.split('.')[0]) >= 1 && Number(candidate.split('.')[0]) === 0) return release
  return isNewerVersion(candidate, current) ? release : null
}

export function normalizeVersion(value: string) {
  return value.trim().replace(/^v/i, '').split('-')[0]
}

export function isNewerVersion(candidate: string, current: string) {
  const left = normalizeVersion(candidate).split('.').map((part) => Number(part) || 0)
  const right = normalizeVersion(current).split('.').map((part) => Number(part) || 0)
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if ((left[index] || 0) !== (right[index] || 0)) return (left[index] || 0) > (right[index] || 0)
  }
  return false
}

export function androidAssetFor(release: GitHubRelease) {
  return release.assets.find((asset) => /Resharium-Android-.*\.apk$/i.test(asset.name))
}
