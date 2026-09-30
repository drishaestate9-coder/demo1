import type { SiteConfig } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  DREAMCORE LANDING - CENTRAL CONFIGURATION
 * ─────────────────────────────────────────────────────────────────────────────
 *  Everything the page shows is defined here: brand, navigation, copy, cards,
 *  links, scene colours / assets, and scroll + motion timing.
 *
 *  Asset paths are relative to `/public` (e.g. `assets/thumbs/x.webp` lives at
 *  `public/assets/thumbs/x.webp`).
 *
 *  Copy marked `PLACEHOLDER` could not be transcribed from the reference
 *  recording and was written to match its tone - replace it freely.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const siteConfig: SiteConfig = {
  meta: {
    title: 'Dreamcore - Fall Into Reverie',
    description:
      'An immersive dreamcore atelier. Step through the crystal hollow into a lavender world of cloud and light.',
  },

  brand: {
    name: 'Dreamcore',
    logoLabel: 'Dreamcore - home',
    // Four-point sparkle star (24x24 viewBox).
    logoPath:
      'M12 0.5C12.55 6.6 17.4 11.45 23.5 12C17.4 12.55 12.55 17.4 12 23.5C11.45 17.4 6.6 12.55 0.5 12C6.6 11.45 11.45 6.6 12 0.5Z',
    logoHref: '#top',
  },

  nav: {
    left: [
      { label: 'Worlds', href: '#worlds' },
      { label: 'Atelier', href: '#atelier' },
      { label: 'Immersions', href: '#immersions' },
    ],
    right: [
      { label: 'Craft', href: '#craft' },
      { label: 'Codex', href: '#codex' },
      { label: 'Connect', href: '#connect' },
    ],
  },

  hero: {
    lineOne: 'Fall into',
    lineTwo: 'Reverie',
    italicWords: ['into'],
    // PLACEHOLDER - supporting paragraph
    description:
      'Crystal hollows, drifting citadels and skies the colour of memory. Step through the opening and let the world softly rearrange itself around you.',
    descendLabel: 'Descend',
  },

  previewCards: [
    {
      kind: 'reel',
      id: 'reel-hollow',
      image: 'assets/thumbs/reel-crystal-hollow.webp',
      imageAlt: 'A glowing crystal cluster inside a mossy cavern',
      label: 'View Reel',
      reel: { title: 'The Crystal Hollow', videoSrc: '' },
    },
    {
      kind: 'stat',
      id: 'patrons',
      image: 'assets/thumbs/portal-atrium.webp',
      imageAlt: 'A pale arched portal glowing softly among lavender clouds',
      value: '32',
      label: 'World Patrons',
      href: '#atelier',
    },
    {
      kind: 'reel',
      id: 'reel-citadel',
      image: 'assets/thumbs/reel-cloud-citadel.webp',
      imageAlt: 'A distant pale citadel rising from a sea of pink clouds',
      label: 'View Reel',
      reel: { title: 'The Cloud Citadel', videoSrc: '' },
    },
  ],

  destination: {
    // PLACEHOLDER - destination heading & intro
    eyebrow: 'Beyond the Hollow',
    titleLineOne: 'Drift among',
    titleLineTwo: 'Lucid Realms',
    italicWords: ['among'],
    description: 'Four worlds, suspended in lavender light. Choose where the dream carries you next.',
    cards: [
      {
        number: '01',
        title: 'Mystic Crests',
        // PLACEHOLDER description
        description: 'Moonlit summits where crystal spires hum with forgotten songs.',
        color: '#dccff6',
        ink: '#54438a',
        rotate: -5,
        offsetY: 10,
        href: '#immersions',
      },
      {
        number: '02',
        // PLACEHOLDER title (the blush card's title was not readable)
        title: 'Rosewater Vale',
        description: 'Blush-lit valleys folded into a twilight that never quite ends.',
        color: '#f6d2e2',
        ink: '#874062',
        rotate: 3,
        offsetY: -6,
        href: '#immersions',
      },
      {
        number: '03',
        title: 'Deep Currents',
        // PLACEHOLDER description
        description: 'Luminous tides that drift between sleeping skies.',
        color: '#cbecf2',
        ink: '#2b6a78',
        rotate: -2,
        offsetY: 14,
        href: '#immersions',
      },
      {
        number: '04',
        title: 'Gilded Dusk',
        // PLACEHOLDER description
        description: 'An amber horizon where every evening lingers a little longer.',
        color: '#f7ebba',
        ink: '#7a6224',
        rotate: 5,
        offsetY: -2,
        href: '#immersions',
      },
    ],
  },

  // Content that follows the pinned portal scene (all PLACEHOLDER copy).
  sections: {
    atelier: {
      eyebrow: 'The Atelier',
      title: 'We build places you remember waking from',
      italicWords: ['remember'],
      body: 'Dreamcore is a small studio of world-builders, painters and engineers crafting immersive spaces for brands, artists and the endlessly curious. Every world begins as a feeling and ends as somewhere you can walk.',
      stats: [
        { value: '32', label: 'World patrons' },
        { value: '140+', label: 'Worlds dreamt' },
        { value: '9', label: 'Years adrift' },
      ],
    },
    immersions: {
      eyebrow: 'Immersions',
      title: 'Reels from the far side of sleep',
      italicWords: ['far', 'side'],
      body: 'A selection of recent journeys - each one scored, lit and choreographed as a single continuous breath.',
      tiles: [
        {
          title: 'The Crystal Hollow',
          image: 'assets/thumbs/reel-crystal-hollow.webp',
          imageAlt: 'A glowing crystal cluster inside a mossy cavern',
          reel: { title: 'The Crystal Hollow', videoSrc: '' },
        },
        {
          title: 'The Pale Gate',
          image: 'assets/thumbs/portal-atrium.webp',
          imageAlt: 'A pale arched portal glowing softly among lavender clouds',
          reel: { title: 'The Pale Gate', videoSrc: '' },
        },
        {
          title: 'The Cloud Citadel',
          image: 'assets/thumbs/reel-cloud-citadel.webp',
          imageAlt: 'A distant pale citadel rising from a sea of pink clouds',
          reel: { title: 'The Cloud Citadel', videoSrc: '' },
        },
      ],
    },
    craft: {
      eyebrow: 'Craft',
      title: 'How a reverie is made',
      italicWords: ['reverie'],
      items: [
        { meta: 'I', title: 'Feeling first', body: 'We begin with a mood board of half-remembered places, colours and sounds.' },
        { meta: 'II', title: 'Worlds in layers', body: 'Foreground, threshold and horizon are painted and built as separate depths.' },
        { meta: 'III', title: 'Motion as narrative', body: 'Every scroll, hover and pause is choreographed like a camera move.' },
      ],
    },
    codex: {
      eyebrow: 'Codex',
      title: 'Notes from the lavender archive',
      italicWords: ['lavender'],
      items: [
        { meta: 'Essay', title: 'On liminal light', body: 'Why dusk-coloured skies feel like memory.' },
        { meta: 'Process', title: 'Building the crystal hollow', body: 'Procedural caves, glowing minerals and soft fog.' },
        { meta: 'Field notes', title: 'Cloud cartography', body: 'Mapping the drifting citadels of the upper air.' },
      ],
    },
    connect: {
      eyebrow: 'Connect',
      title: 'Let us dream something together',
      italicWords: ['together'],
      body: 'Tell us about the world you want to build. We answer every letter within two moons.',
      cta: { label: 'hello@dreamcore.studio', href: 'mailto:hello@dreamcore.studio' },
      socials: [
        { label: 'Instagram', href: 'https://instagram.com/' },
        { label: 'Vimeo', href: 'https://vimeo.com/' },
        { label: 'Are.na', href: 'https://www.are.na/' },
      ],
      legal: '© Dreamcore Atelier. All worlds reserved.',
    },
  },

  scene: {
    // Changing the seed regenerates the procedural cave, crystals and clouds.
    seed: 7,
    colors: {
      skyZenith: '#5a45ad',
      skyMid: '#ab93e6',
      skyHorizon: '#f2b9d6',
      sunGlow: '#ffe6d6',
      fog: '#c3aee8',
      rockDark: '#0e0a16',
      rockMid: '#231a2d',
      rockLight: '#4e4260',
      moss: '#1b3524',
      mossBright: '#5b8a45',
      crystals: ['#9b6bff', '#ff6fc8', '#4fdcff', '#ffb257', '#c78bff'],
      portalLight: '#f4cdf2',
      cloudLight: '#fff3f9',
      cloudShadow: '#8f74cf',
      architecture: '#f7f1fb',
    },
    assets: {
      heroPoster: 'assets/posters/hero.webp',
      destinationPoster: 'assets/posters/destination.webp',
    },
  },

  motion: {
    scrollLength: 5,
    scrub: 1,
    stages: {
      heroFadeEnd: 0.14,
      throatAt: 0.62,
      destinationRevealStart: 0.8,
      destinationRevealEnd: 0.95,
    },
    pointerParallax: 0.6,
    idleSway: 0.5,
    warpFov: 16,
    bloom: 0.9,
    entranceDuration: 1.4,
    descendDuration: 4.5,
  },
}
