const BLOCKED_HOSTS = [
  '2mdn.net', 'adfox.ru', 'adnxs.com', 'adsrvr.org', 'bidswitch.net',
  'clarity.ms', 'criteo.com', 'criteo.net', 'doubleclick.net', 'facebook.net',
  'google-analytics.com', 'googleadservices.com', 'googlesyndication.com',
  'hotjar.com', 'mytarget.ru', 'openx.net', 'outbrain.com', 'pubmatic.com',
  'rubiconproject.com', 'scorecardresearch.com', 'smartadserver.com',
  'taboola.com', 'tns-counter.ru', 'yandexadexchange.net',
]

const BLOCKED_EXACT_HOSTS = new Set([
  'ad.mail.ru', 'ads.adfox.ru', 'an.yandex.ru', 'counter.yadro.ru',
  'mc.yandex.ru', 'pagead2.googlesyndication.com', 'securepubads.g.doubleclick.net',
])

function isBlockedHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^www\./, '')
  return BLOCKED_EXACT_HOSTS.has(host) || BLOCKED_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))
}

function shouldBlockRequest(url, resourceType = '') {
  if (resourceType === 'mainFrame') return false
  try {
    const parsed = new URL(url)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && isBlockedHost(parsed.hostname)
  } catch {
    return false
  }
}

module.exports = { isBlockedHost, shouldBlockRequest }
