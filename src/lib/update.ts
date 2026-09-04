export interface GitHubRelease {
  tag_name: string
  html_url: string
  assets: Array<{ name: string; browser_download_url: string }>
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
