import { Vector3 } from 'three'

/**
 * World layout shared by the cave generator, props and camera rig.
 * Units are roughly metres. The camera looks down -Z, through the cave
 * throat (the opening) at `THROAT_Z`, and out into the cloud world.
 */

export const THROAT_Z = -16
export const CAVE_START_Z = 15
export const CAVE_END_Z = -21

interface ProfileKey {
  z: number
  halfWidth: number
  floor: number
  ceiling: number
  cx: number
}

// Cross-section keys from the chamber behind the camera to the outer lip.
const PROFILE: ProfileKey[] = [
  { z: 15, halfWidth: 12, floor: -0.6, ceiling: 12, cx: 0 },
  { z: 8, halfWidth: 13, floor: -0.35, ceiling: 13.5, cx: 0.3 },
  { z: 1, halfWidth: 12.4, floor: -0.1, ceiling: 13.4, cx: -0.4 },
  { z: -6, halfWidth: 10.6, floor: 0.2, ceiling: 12.6, cx: 0.3 },
  { z: -11.5, halfWidth: 9.2, floor: 0.45, ceiling: 11.8, cx: 0.1 },
  { z: THROAT_Z, halfWidth: 8.4, floor: 0.6, ceiling: 11.2, cx: 0 },
  { z: -17.6, halfWidth: 12.5, floor: -1.2, ceiling: 14.5, cx: 0 },
  { z: -19.4, halfWidth: 22, floor: -6, ceiling: 24, cx: 0 },
  { z: -21, halfWidth: 34, floor: -14, ceiling: 34, cx: 0 },
]

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}

export interface Profile {
  halfWidth: number
  floor: number
  ceiling: number
  cx: number
}

/** Smoothly interpolated cave cross-section at depth `z`. */
export function profileAt(z: number): Profile {
  const keys = PROFILE
  if (z >= keys[0].z) return { ...keys[0] }
  if (z <= keys[keys.length - 1].z) return { ...keys[keys.length - 1] }
  let i = 0
  while (i < keys.length - 1 && !(z <= keys[i].z && z >= keys[i + 1].z)) i++
  const a = keys[Math.max(0, i - 1)]
  const b = keys[i]
  const c = keys[i + 1]
  const d = keys[Math.min(keys.length - 1, i + 2)]
  const t = (b.z - z) / (b.z - c.z)
  return {
    halfWidth: catmull(a.halfWidth, b.halfWidth, c.halfWidth, d.halfWidth, t),
    floor: catmull(a.floor, b.floor, c.floor, d.floor, t),
    ceiling: catmull(a.ceiling, b.ceiling, c.ceiling, d.ceiling, t),
    cx: catmull(a.cx, b.cx, c.cx, d.cx, t),
  }
}

/** Centre-line of the worn rocky path on the cave floor. */
export function pathX(z: number) {
  return Math.sin(z * 0.17 + 0.6) * 1.1 + Math.sin(z * 0.41) * 0.35
}

/** Where the light through the opening comes from (used for baked glow). */
export const PORTAL_CENTER = new Vector3(0, 5.6, THROAT_Z - 0.5)

/** Direction towards the low sun behind the distant citadel. */
export const SUN_DIRECTION = new Vector3(-0.16, 0.22, -1).normalize()

/** The distant citadel's position (camera looks towards it at the end). */
export const CITADEL_POSITION = new Vector3(0, -6, -330)
