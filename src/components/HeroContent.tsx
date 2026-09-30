import type { HeroConfig } from '../config/types'
import { Emphasis } from '../lib/text'
import './HeroContent.css'

/** "FALL INTO / REVERIE" headline with the supporting paragraph. */
export function HeroContent({ hero }: { hero: HeroConfig }) {
  return (
    <div className="hero-copy">
      <h1 className="hero-title">
        <span className="hero-title__line hero-title__line--one">
          <span className="hero-title__inner">
            <Emphasis text={hero.lineOne} italic={hero.italicWords} />
          </span>
        </span>
        <span className="hero-title__line hero-title__line--two">
          <span className="hero-title__inner">
            <Emphasis text={hero.lineTwo} italic={hero.italicWords} />
          </span>
        </span>
      </h1>
      <p className="hero-copy__text">{hero.description}</p>
    </div>
  )
}
