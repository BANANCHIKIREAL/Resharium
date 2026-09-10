import { useState } from 'react'

const DISMISSED_KEY = 'resharium.website-promo-dismissed:v1'
export const WEBSITE_URL = 'https://bananchikireal.github.io/Resharium/'

export function WebsitePromo({ onOpen }: { onOpen: () => void }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === '1' } catch { return false }
  })
  if (dismissed) return null
  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch { /* Still dismiss for this session. */ }
  }
  return <aside className="website-promo" aria-label="Сайт Решариума">
    <div className="website-promo-mark" aria-hidden="true">↗</div>
    <div className="website-promo-copy"><span>ЕЩЁ БЛИЖЕ</span><strong>У Решариума новый сайт</strong><p>Возможности приложения и свежие версии — в одном месте.</p></div>
    <button className="website-promo-link" onClick={onOpen}>Открыть сайт <span aria-hidden="true">↗</span></button>
    <button className="website-promo-close" onClick={dismiss} aria-label="Скрыть карточку сайта">×</button>
  </aside>
}
