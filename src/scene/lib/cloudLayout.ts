import { Vector3 } from 'three'
import { createRng, range, type Rng } from './noise'

/**
 * Cloud masses for the lavender world beyond the opening. Each mass is a
 * set of soft billboard "puffs"; `shade` (0 = underside, 1 = sunlit top)
 * drives the lighting gradient in the cloud shader.
 */
export interface Puff {
  position: Vector3
  scale: number
  shade: number
  alpha: number
  rotation: number
}

interface Mass {
  base: [number, number, number]
  width: number
  depth?: number
  height: number
  puffs: number
  scale?: number
}

function cumulus(rng: Rng, m: Mass, out: Puff[]) {
  const depth = m.depth ?? m.width * 0.7
  const scaleK = m.scale ?? 1
  for (let k = 0; k < m.puffs; k++) {
    const t = Math.pow(rng(), 0.85)
    const radius = Math.sqrt(Math.max(0, 1 - Math.pow(t, 1.7)))
    const a = rng() * Math.PI * 2
    const d = Math.sqrt(rng()) * radius
    const x = m.base[0] + Math.cos(a) * d * m.width * 0.5
    const z = m.base[2] + Math.sin(a) * d * depth * 0.5
    const y = m.base[1] + t * m.height
    const s = m.width * 0.5 * (1 - t * 0.4) * range(rng, 0.7, 1.2) * scaleK
    out.push({ position: new Vector3(x, y, z), scale: s, shade: Math.min(1, t * 1.05 + range(rng, -0.08, 0.1)), alpha: range(rng, 0.7, 0.95), rotation: rng() * Math.PI * 2 })
  }
}

export function generateClouds(seed: number): Puff[] {
  const rng = createRng(seed * 31 + 5)
  const puffs: Puff[] = []

  // Towering cumulus framing the view (left & right), near to far.
  const towers: Mass[] = [
    { base: [-44, -22, -92], width: 34, height: 40, puffs: 48 },
    { base: [-92, -26, -170], width: 58, height: 76, puffs: 70 },
    { base: [-170, -30, -290], width: 90, height: 96, puffs: 70 },
    { base: [50, -22, -104], width: 36, height: 36, puffs: 48 },
    { base: [104, -26, -196], width: 64, height: 86, puffs: 70 },
    { base: [190, -30, -320], width: 96, height: 90, puffs: 64 },
    // Backdrop behind the citadel
    { base: [-70, -28, -470], width: 150, height: 70, puffs: 70, scale: 1.1 },
    { base: [85, -28, -500], width: 150, height: 60, puffs: 60, scale: 1.1 },
    { base: [0, -26, -560], width: 220, height: 44, puffs: 60, scale: 1.2 },
    // Small nearby cumulus just beyond the lip
    { base: [-18, -16, -52], width: 16, height: 10, puffs: 22 },
    { base: [22, -18, -62], width: 18, height: 12, puffs: 22 },
    // Cloud bank carrying the citadel
    { base: [0, -22, -330], width: 110, depth: 60, height: 22, puffs: 70 },
  ]
  towers.forEach((m) => cumulus(rng, m, puffs))

  // The cloud sea: broad, low masses stretching to the horizon.
  for (let z = -60; z > -640; z -= range(rng, 44, 62)) {
    const far = (-z - 60) / 580
    const spacing = 55 + far * 60
    for (let x = -460; x < 460; x += spacing * range(rng, 0.8, 1.2)) {
      if (Math.abs(x) < 10 && z > -90) continue
      cumulus(
        rng,
        {
          base: [x + range(rng, -15, 15), -32 + range(rng, -3, 3), z + range(rng, -12, 12)],
          width: spacing * 1.25,
          depth: 50,
          height: range(rng, 8, 16) + far * 8,
          puffs: far > 0.5 ? 4 : 6,
          scale: 1.05 + far * 0.3,
        },
        puffs,
      )
    }
  }

  // Wisps around the flight path just outside the cave: the camera passes
  // through a thin veil on the way out.
  const wisps: [number, number, number, number][] = [
    [-9, 3, -27, 7],
    [10, 9, -30, 8],
    [-3, 12, -34, 6],
    [6, 1, -37, 7],
    [-13, 7, -41, 9],
    [15, 4, -46, 10],
  ]
  for (const [x, y, z, s] of wisps) {
    for (let k = 0; k < 5; k++) {
      puffs.push({
        position: new Vector3(x + range(rng, -3, 3), y + range(rng, -1.5, 1.5), z + range(rng, -2, 2)),
        scale: s * range(rng, 0.7, 1.2),
        shade: range(rng, 0.55, 0.95),
        alpha: range(rng, 0.35, 0.6),
        rotation: rng() * Math.PI * 2,
      })
    }
  }
  return puffs
}
