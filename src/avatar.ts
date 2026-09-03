export function profileAvatarUrl(metadata: Record<string, unknown> | null | undefined) {
  const candidate = metadata?.avatar_url || metadata?.picture
  return typeof candidate === 'string' && /^https:\/\//i.test(candidate) ? candidate : null
}
