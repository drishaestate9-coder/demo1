import type { MouseEvent } from 'react'
import type { PreviewCardConfig } from '../config/types'
import type { ReelState } from './ReelDialog'
import { asset } from '../lib/assets'
import { scrollToHref } from '../lib/scroll'
import './PreviewCards.css'

export type OpenReel = (reel: ReelState) => void

function PlayIcon() {
  return (
    <span className="preview-card__play" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M9 7.2v9.6c0 .5.55.8.97.53l7.2-4.8a.63.63 0 0 0 0-1.06l-7.2-4.8A.63.63 0 0 0 9 7.2Z" fill="currentColor" />
      </svg>
    </span>
  )
}

/** Three compact glass cards: reel / world patrons / reel. */
export function PreviewCards({ cards, onOpenReel }: { cards: PreviewCardConfig[]; onOpenReel: OpenReel }) {
  return (
    <ul className="preview-cards" aria-label="Featured">
      {cards.map((card) => (
        <li key={card.id} className={`preview-card preview-card--${card.kind}`}>
          {card.kind === 'reel' ? (
            <button type="button" className="preview-card__hit" onClick={() =>
                onOpenReel({ title: card.reel.title, image: card.image, imageAlt: card.imageAlt, videoSrc: card.reel.videoSrc })
              }>
              <span className="preview-card__media">
                <img src={asset(card.image)} alt={card.imageAlt} loading="eager" decoding="async" />
              </span>
              <span className="preview-card__meta">
                <PlayIcon />
                <span className="preview-card__label">{card.label}</span>
                <span className="sr-only">: {card.reel.title}</span>
              </span>
            </button>
          ) : (
            <a
              className="preview-card__hit"
              href={card.href}
              onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                if (scrollToHref(card.href)) e.preventDefault()
              }}
            >
              <span className="preview-card__media">
                <img src={asset(card.image)} alt={card.imageAlt} loading="eager" decoding="async" />
              </span>
              <span className="preview-card__meta preview-card__meta--stat">
                <span className="preview-card__value">{card.value}</span>
                <span className="preview-card__label preview-card__label--stat">{card.label}</span>
              </span>
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}
