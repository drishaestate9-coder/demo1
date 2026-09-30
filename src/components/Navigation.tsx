import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { BrandConfig, NavLink } from '../config/types'
import { asset } from '../lib/assets'
import { gsap, ScrollTrigger, useGSAP } from '../lib/gsap'
import { journey } from '../lib/journey'
import { scrollToHref } from '../lib/scroll'
import './Navigation.css'

interface NavigationProps {
  brand: BrandConfig
  left: NavLink[]
  right: NavLink[]
}

function StarEmblem({ brand }: { brand: BrandConfig }) {
  if (brand.logoImage) return <img src={asset(brand.logoImage)} alt="" className="nav__emblem-img" />
  return (
    <svg viewBox="0 0 24 24" className="nav__emblem-svg" aria-hidden="true">
      <path d={brand.logoPath} fill="currentColor" />
    </svg>
  )
}

/**
 * Minimal transparent navigation: three links left, star emblem centred,
 * three links right. Collapses into a menu sheet on narrow screens.
 * Switches to plum ink once the light content scrolls under it.
 */
export function Navigation({ brand, left, right }: NavigationProps) {
  const ref = useRef<HTMLElement>(null)
  const [tone, setTone] = useState<'dark' | 'light'>('dark')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const onLink = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      setMenuOpen(false)
      scrollToHref(href)
    }
  }

  // Tone switch when the light sections pass beneath the bar.
  useGSAP(() => {
    const st = ScrollTrigger.create({
      trigger: '#after-portal',
      start: 'top 40px',
      end: 'max',
      refreshPriority: -1,
      // enter/leave-back only: at the very bottom ScrollTrigger reports "left",
      // but the light content is still under the bar.
      onEnter: () => setTone('light'),
      onLeaveBack: () => setTone('dark'),
      onRefresh: (self) => setTone(self.scroll() >= self.start ? 'light' : 'dark'),
    })
    return () => st.kill()
  })

  // Entrance
  useGSAP(
    () => {
      if (journey.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from('.nav__item, .nav__emblem, .nav__menu-btn', {
        autoAlpha: 0,
        y: -12,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.05,
        delay: 0.15,
        clearProps: 'transform,opacity,visibility',
      })
    },
    { scope: ref },
  )

  // Mobile sheet: Escape to close, focus the first link on open.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuButton.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    sheetRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const renderLinks = (links: NavLink[]) =>
    links.map((l) => (
      <li key={l.label} className="nav__item">
        <a className="nav__link" href={l.href} onClick={(e) => onLink(e, l.href)}>
          {l.label}
        </a>
      </li>
    ))

  const all = [...left, ...right]
  const last = right[right.length - 1]

  return (
    <header ref={ref} className={`nav nav--${tone}${menuOpen ? ' nav--open' : ''}`}>
      <nav className="nav__bar" aria-label="Primary">
        <ul className="nav__group nav__group--left">{renderLinks(left)}</ul>
        <button
          ref={menuButton}
          type="button"
          className="nav__menu-btn"
          aria-expanded={menuOpen}
          aria-controls="nav-sheet"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="nav__menu-lines" aria-hidden="true" />
          <span>{menuOpen ? 'Close' : 'Menu'}</span>
        </button>
        <a className="nav__emblem" href={brand.logoHref} aria-label={brand.logoLabel} onClick={(e) => onLink(e, brand.logoHref)}>
          <StarEmblem brand={brand} />
        </a>
        <ul className="nav__group nav__group--right">{renderLinks(right)}</ul>
        {last && (
          <a className="nav__item nav__link nav__compact-link" href={last.href} onClick={(e) => onLink(e, last.href)}>
            {last.label}
          </a>
        )}
      </nav>
      <div id="nav-sheet" ref={sheetRef} className="nav__sheet" hidden={!menuOpen}>
        <ul>
          {all.map((l, i) => (
            <li key={l.label}>
              <a href={l.href} onClick={(e) => onLink(e, l.href)}>
                <span className="nav__sheet-index">{String(i + 1).padStart(2, '0')}</span>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  )
}
