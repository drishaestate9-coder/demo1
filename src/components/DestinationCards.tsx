import type { CSSProperties, MouseEvent } from 'react'
import type { DestinationConfig } from '../config/types'
import { Emphasis } from '../lib/text'
import { scrollToHref } from '../lib/scroll'
import './DestinationCards.css'

/**
 * The arrival scene: heading over the cloud world and a spacious,
 * gently rotated arrangement of pastel world cards.
 */
export function DestinationCards({ destination }: { destination: DestinationConfig }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (scrollToHref(href)) e.preventDefault()
  }
  return (
    <div className="destination" id="worlds" aria-labelledby="destination-title">
      <header className="destination__head">
        <p className="eyebrow destination__eyebrow">{destination.eyebrow}</p>
        <h2 className="destination__title" id="destination-title">
          <span className="destination__title-line">
            <Emphasis text={destination.titleLineOne} italic={destination.italicWords} />
          </span>
          <span className="destination__title-line destination__title-line--two">
            <Emphasis text={destination.titleLineTwo} italic={destination.italicWords} />
          </span>
        </h2>
        <p className="destination__text">{destination.description}</p>
      </header>
      <ul className="destination__cards">
        {destination.cards.map((card) => (
          <li
            key={card.number}
            className="world-card"
            data-rotate={card.rotate}
            style={
              {
                '--card-bg': card.color,
                '--card-ink': card.ink,
                '--card-offset': `${card.offsetY}%`,
                transform: `rotate(${card.rotate}deg)`,
              } as CSSProperties
            }
          >
            <a className="world-card__inner" href={card.href} onClick={(e) => onClick(e, card.href)}>
              <span className="world-card__badge" aria-hidden="true">
                {card.number}
              </span>
              <span className="world-card__sparkle" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2c.35 5.3 4.7 9.65 10 10-5.3.35-9.65 4.7-10 10-.35-5.3-4.7-9.65-10-10 5.3-.35 9.65-4.7 10-10Z" fill="currentColor" />
                </svg>
              </span>
              <span className="world-card__body">
                <span className="world-card__title">{card.title}</span>
                <span className="world-card__text">{card.description}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
