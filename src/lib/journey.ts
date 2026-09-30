/**
 * Shared, mutable journey state. GSAP writes `progress` from the pinned
 * scroll timeline; the 3D scene reads it every frame (no React re-renders).
 */
export const journey = {
  /** 0 = hero, 1 = arrived in the cloud world. */
  progress: 0,
  /** Entrance animation 0 -> 1 (camera settles into the hero framing). */
  intro: 1,
  /** Normalised pointer position (-1..1). */
  pointerX: 0,
  pointerY: 0,
  reducedMotion: false,
  /** False while the portal section is scrolled out of view (pauses rendering). */
  visible: true,
  /** Optional fixed camera shot used for rendering thumbnails / posters. */
  shot: null as null | string,
}

export type Journey = typeof journey
