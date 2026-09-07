import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { shouldBlockRequest } = require('../../electron/adblock.cjs') as {
  shouldBlockRequest: (url: string, resourceType?: string) => boolean
}

describe('embedded browser ad blocker', () => {
  it('blocks advertising and tracking subrequests', () => {
    expect(shouldBlockRequest('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', 'script')).toBe(true)
    expect(shouldBlockRequest('https://mc.yandex.ru/watch/123', 'image')).toBe(true)
  })

  it('does not block normal pages or top-level navigation', () => {
    expect(shouldBlockRequest('https://resheba.top/7-klass/matematika/', 'script')).toBe(false)
    expect(shouldBlockRequest('https://doubleclick.net/', 'mainFrame')).toBe(false)
  })
})
