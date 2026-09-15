import { useState } from 'react'
import { Icon } from './icons'

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
    <div className="website-promo-mark"><Icon name="public" /></div>
    <div className="website-promo-copy"><span>Сайт Решариума</span><strong>Больше возможностей — в одном месте</strong><p>Новости, свежие версии и загрузка приложения.</p></div>
    <button className="website-promo-link" onClick={onOpen}>Открыть сайт <Icon name="open_in_new" /></button>
    <button className="website-promo-close" onClick={dismiss} aria-label="Скрыть карточку сайта"><Icon name="close" /></button>
  </aside>
}
