import { gsap, type ScrollTrigger } from './gsap'
import { journey } from './journey'

let portalTrigger: ScrollTrigger | null = null

/** Registered by the portal so `#worlds` can resolve to the end of the journey. */
export function setPortalTrigger(trigger: ScrollTrigger | null) {
  portalTrigger = trigger
  // Exposed for the verification script (scripts/verify.mjs).
  ;(window as unknown as { __portalRange?: () => { start: number; end: number } | null }).__portalRange = () =>
    portalTrigger ? { start: portalTrigger.start, end: portalTrigger.end } : null
}

function targetY(href: string): number | null {
  if (href === '#top' || href === '#') return 0
  if (href === '#worlds') {
    if (portalTrigger) return portalTrigger.end
    const el = document.getElementById('worlds')
    return el ? el.getBoundingClientRect().top + window.scrollY : null
  }
  const el = document.querySelector<HTMLElement>(href)
  if (!el) return null
  return el.getBoundingClientRect().top + window.scrollY
}

/**
 * Smoothly scrolls to an in-page anchor. Returns false when `href` isn't a
 * resolvable in-page anchor (so the browser can handle it normally).
 */
export function scrollToHref(href: string, opts: { duration?: number; ease?: string } = {}) {
  if (!href.startsWith('#')) return false
  const y = targetY(href)
  if (y === null) return false
  const distance = Math.abs(y - window.scrollY)
  if (journey.reducedMotion) {
    window.scrollTo({ top: y, behavior: 'auto' })
  } else {
    const duration = opts.duration ?? Math.min(2.8, Math.max(0.9, distance / 2600))
    gsap.to(window, { scrollTo: { y, autoKill: true }, duration, ease: opts.ease ?? 'power2.inOut', overwrite: 'auto' })
  }
  // Move focus for keyboard / screen-reader users without jumping.
  const focusTarget = href === '#worlds' ? document.getElementById('worlds') : href.length > 1 ? document.querySelector<HTMLElement>(href) : null
  if (focusTarget) {
    if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1')
    focusTarget.focus({ preventScroll: true })
  }
  return true
}
