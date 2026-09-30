/**
 * Types for the central site configuration (see `site.config.ts`).
 * Every piece of copy, colour, asset and motion setting the page uses is
 * described here so it can be customised in one place.
 */

export interface NavLink {
  label: string
  /** In-page anchor (`#atelier`) or absolute URL. `#worlds` scrolls to the end of the portal. */
  href: string
}

export interface BrandConfig {
  name: string
  /** Accessible label for the centre emblem link. */
  logoLabel: string
  /**
   * SVG path data for the centre emblem, drawn in a 24x24 viewBox.
   * Replace it with your own mark, or set `logoImage` to use a raster/SVG file.
   */
  logoPath: string
  logoImage?: string
  /** Where the emblem links to. */
  logoHref: string
}

export interface HeroConfig {
  /** First headline line. Words listed in `italicWords` are set in italic. */
  lineOne: string
  /** Dominant second headline line. */
  lineTwo: string
  italicWords: string[]
  description: string
  descendLabel: string
}

export interface ReelConfig {
  title: string
  /** Optional video file (mp4/webm). When empty the reel dialog shows the still. */
  videoSrc?: string
}

export type PreviewCardConfig =
  | {
      kind: 'reel'
      id: string
      image: string
      imageAlt: string
      label: string
      reel: ReelConfig
    }
  | {
      kind: 'stat'
      id: string
      image: string
      imageAlt: string
      value: string
      label: string
      href: string
    }

export interface DestinationCardConfig {
  number: string
  title: string
  description: string
  /** Card surface colour. */
  color: string
  /** Badge and accent ink colour. */
  ink: string
  /** Resting rotation in degrees. */
  rotate: number
  /** Vertical offset in % of card height, used for the staggered layout. */
  offsetY: number
  href: string
}

export interface DestinationConfig {
  eyebrow: string
  titleLineOne: string
  titleLineTwo: string
  italicWords: string[]
  description: string
  cards: DestinationCardConfig[]
}

export interface SectionItem {
  title: string
  body: string
  meta?: string
}

export interface FollowingSectionsConfig {
  atelier: { eyebrow: string; title: string; italicWords: string[]; body: string; stats: { value: string; label: string }[] }
  immersions: {
    eyebrow: string
    title: string
    italicWords: string[]
    body: string
    tiles: { title: string; image: string; imageAlt: string; reel?: ReelConfig }[]
  }
  craft: { eyebrow: string; title: string; italicWords: string[]; items: SectionItem[] }
  codex: { eyebrow: string; title: string; italicWords: string[]; items: SectionItem[] }
  connect: {
    eyebrow: string
    title: string
    italicWords: string[]
    body: string
    cta: { label: string; href: string }
    socials: NavLink[]
    legal: string
  }
}

export interface SceneColors {
  /** Sky gradient, top to horizon. */
  skyZenith: string
  skyMid: string
  skyHorizon: string
  sunGlow: string
  /** Atmospheric fog tint (applies to distance). */
  fog: string
  /** Rock palette. */
  rockDark: string
  rockMid: string
  rockLight: string
  moss: string
  mossBright: string
  /** Crystal palette - clusters pick from these. */
  crystals: string[]
  /** Light spilling in through the cave opening. */
  portalLight: string
  /** Cloud lit / shadow colours. */
  cloudLight: string
  cloudShadow: string
  /** Distant architecture. */
  architecture: string
}

export interface SceneAssets {
  /** Posters shown before WebGL is ready, and as a fallback without WebGL. */
  heroPoster: string
  destinationPoster: string
}

export interface MotionConfig {
  /** Height of the pinned portal in viewport heights. More = slower journey. */
  scrollLength: number
  /** Scrub smoothing in seconds (`true` = instant, number = catch-up time). */
  scrub: number
  /** Timeline stages as fractions of the pinned scroll (0-1). */
  stages: {
    heroFadeEnd: number
    throatAt: number
    destinationRevealStart: number
    destinationRevealEnd: number
  }
  /** 0-1: how much the camera follows the pointer. */
  pointerParallax: number
  /** 0-1: idle breathing sway of the camera. */
  idleSway: number
  /** Extra field of view (degrees) added while passing the opening. */
  warpFov: number
  /** Bloom strength for crystals and sky. */
  bloom: number
  /** Duration of the entrance animation in seconds. */
  entranceDuration: number
  /** Duration of the automatic descent when pressing the DESCEND button. */
  descendDuration: number
}

export interface SiteConfig {
  meta: { title: string; description: string }
  brand: BrandConfig
  nav: { left: NavLink[]; right: NavLink[] }
  hero: HeroConfig
  previewCards: PreviewCardConfig[]
  destination: DestinationConfig
  sections: FollowingSectionsConfig
  scene: { colors: SceneColors; assets: SceneAssets; seed: number }
  motion: MotionConfig
}
