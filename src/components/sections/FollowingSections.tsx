import type { MouseEvent } from 'react'
import type { NavLink, SiteConfig } from '../../config/types'
import { asset } from '../../lib/assets'
import { gsap, useGSAP } from '../../lib/gsap'
import { scrollToHref } from '../../lib/scroll'
import { Emphasis } from '../../lib/text'
import type { OpenReel } from '../PreviewCards'
import './FollowingSections.css'

function SectionHead({ eyebrow, title, italic, id }: { eyebrow: string; title: string; italic: string[]; id: string }) {
  return (
    <header className="after__head">
      <p className="eyebrow after__eyebrow">{eyebrow}</p>
      <h2 className="after__title" id={id}>
        <Emphasis text={title} italic={italic} />
      </h2>
    </header>
  )
}

/**
 * Content that follows the portal once the pinned scene releases:
 * Atelier, Immersions, Craft, Codex and Connect (all driven by config).
 */
export function FollowingSections({ config, onOpenReel }: { config: SiteConfig; onOpenReel: OpenReel }) {
  const { sections } = config

  // Gentle reveal of each block as it scrolls in.
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.utils.toArray<HTMLElement>('.after [data-reveal]').forEach((el) => {
      gsap.from(el, {
        autoAlpha: 0,
        y: 36,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      })
    })
  })

  const onAnchor = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (scrollToHref(href)) e.preventDefault()
  }

  const external = (l: NavLink) => (/^https?:/.test(l.href) ? { target: '_blank', rel: 'noreferrer' } : {})

  return (
    <div className="after" id="after-portal">
      <section className="after__section after__atelier" id="atelier" aria-labelledby="atelier-title">
        <div className="after__grid" data-reveal>
          <SectionHead eyebrow={sections.atelier.eyebrow} title={sections.atelier.title} italic={sections.atelier.italicWords} id="atelier-title" />
          <div className="after__atelier-body">
            <p className="after__lead">{sections.atelier.body}</p>
            <dl className="after__stats">
              {sections.atelier.stats.map((s) => (
                <div key={s.label} className="after__stat">
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="after__section after__immersions" id="immersions" aria-labelledby="immersions-title">
        <div className="after__row" data-reveal>
          <SectionHead
            eyebrow={sections.immersions.eyebrow}
            title={sections.immersions.title}
            italic={sections.immersions.italicWords}
            id="immersions-title"
          />
          <p className="after__lead after__lead--narrow">{sections.immersions.body}</p>
        </div>
        <ul className="after__reels">
          {sections.immersions.tiles.map((t, i) => (
            <li key={t.title} className="after__reel" data-reveal>
              <figure>
                <div className="after__reel-media">
                  <img src={asset(t.image)} alt={t.imageAlt} loading="lazy" decoding="async" />
                  {t.reel && (
                    <button
                      type="button"
                      className="after__reel-play"
                      onClick={() => onOpenReel({ title: t.reel!.title, image: t.image, imageAlt: t.imageAlt, videoSrc: t.reel!.videoSrc })}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M9 7.2v9.6c0 .5.55.8.97.53l7.2-4.8a.63.63 0 0 0 0-1.06l-7.2-4.8A.63.63 0 0 0 9 7.2Z" fill="currentColor" />
                      </svg>
                      <span>View Reel</span>
                      <span className="sr-only">: {t.title}</span>
                    </button>
                  )}
                </div>
                <figcaption>
                  <span className="after__reel-index">{String(i + 1).padStart(2, '0')}</span>
                  {t.title}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>

      <section className="after__section after__craft" id="craft" aria-labelledby="craft-title">
        <div data-reveal>
          <SectionHead eyebrow={sections.craft.eyebrow} title={sections.craft.title} italic={sections.craft.italicWords} id="craft-title" />
        </div>
        <ol className="after__steps">
          {sections.craft.items.map((item) => (
            <li key={item.title} className="after__step" data-reveal>
              <span className="after__step-meta">{item.meta}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="after__section after__codex" id="codex" aria-labelledby="codex-title">
        <div data-reveal>
          <SectionHead eyebrow={sections.codex.eyebrow} title={sections.codex.title} italic={sections.codex.italicWords} id="codex-title" />
        </div>
        <ul className="after__entries">
          {sections.codex.items.map((item) => (
            <li key={item.title} className="after__entry" data-reveal>
              <span className="after__entry-meta">{item.meta}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <span className="after__entry-arrow" aria-hidden="true">
                →
              </span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="after__section after__connect" id="connect" aria-labelledby="connect-title">
        <div className="after__connect-inner" data-reveal>
          <p className="eyebrow after__eyebrow">{sections.connect.eyebrow}</p>
          <h2 className="after__title after__title--xl" id="connect-title">
            <Emphasis text={sections.connect.title} italic={sections.connect.italicWords} />
          </h2>
          <p className="after__lead after__lead--center">{sections.connect.body}</p>
          <a className="after__cta" href={sections.connect.cta.href}>
            {sections.connect.cta.label}
          </a>
        </div>
        <div className="after__footer">
          <ul className="after__socials">
            {sections.connect.socials.map((s) => (
              <li key={s.label}>
                <a href={s.href} {...external(s)}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <a className="after__top" href="#top" onClick={(e) => onAnchor(e, '#top')}>
            Back to the hollow ↑
          </a>
          <p className="after__legal">{sections.connect.legal}</p>
        </div>
      </footer>
    </div>
  )
}
