import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { CatmullRomCurve3, MathUtils, PerspectiveCamera, Vector3 } from 'three'
import type { MotionConfig } from '../config/types'
import { journey } from '../lib/journey'

/**
 * Scroll-driven camera. `journey.progress` (0-1, written by the GSAP
 * ScrollTrigger timeline) is mapped onto a spline through the cave.
 * Keyframes are spaced so the move starts gently, accelerates through
 * the opening (throat at ~62%) and settles over the cloud world.
 */

// Camera positions at progress = i / 8.
const PATH = [
  [0, 1.9, 8.0],
  [0, 2.0, 6.4],
  [0, 2.3, 3.8],
  [0, 2.9, -0.6],
  [0, 3.9, -6.8],
  [0, 5.2, -14.8],
  [0, 6.3, -24.8],
  [0, 7.0, -34.0],
  [0, 7.3, -40.0],
] as const

// Look-at targets at the same stations.
const LOOK = [
  [0, 6.6, -60],
  [0, 6.7, -62],
  [0, 6.9, -66],
  [0, 7.2, -74],
  [0, 7.6, -90],
  [0, 8.5, -130],
  [0, 11, -200],
  [0, 18, -280],
  [0, 24, -330],
] as const

/** Fixed poses used to render thumbnails & posters (`?shot=name`). */
export const SHOTS: Record<string, { pos: [number, number, number]; look: [number, number, number]; fov: number }> = {
  'thumb-crystal': { pos: [-4.2, 2.2, 7.4], look: [-8.4, 1.4, 3.2], fov: 42 },
  'thumb-portal': { pos: [-58, 0, -160], look: [-78, 2, -205], fov: 40 },
  'thumb-citadel': { pos: [0, 4, -120], look: [0, 22, -330], fov: 30 },
}

function toVecs(list: readonly (readonly number[])[]) {
  return list.map(([x, y, z]) => new Vector3(x, y, z))
}

export function CameraRig({ motion }: { motion: MotionConfig }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const posCurve = useMemo(() => new CatmullRomCurve3(toVecs(PATH), false, 'centripetal'), [])
  const lookCurve = useMemo(() => new CatmullRomCurve3(toVecs(LOOK), false, 'centripetal'), [])
  const pos = useMemo(() => new Vector3(), [])
  const look = useMemo(() => new Vector3(), [])
  const pointer = useRef({ x: 0, y: 0 })

  useFrame((state, delta) => {
    const shot = journey.shot ? SHOTS[journey.shot] : null
    if (shot) {
      camera.position.set(...shot.pos)
      camera.fov = shot.fov
      camera.lookAt(...shot.look)
      camera.updateProjectionMatrix()
      return
    }
    const reduced = journey.reducedMotion
    let p = MathUtils.clamp(journey.progress, 0, 1)
    // Reduced motion: no flight, cut between the two framings (the DOM veil
    // covers the cut).
    if (reduced) p = p < 0.5 ? 0 : 1

    posCurve.getPoint(p, pos)
    lookCurve.getPoint(p, look)

    // Entrance: settle forward into the hero framing.
    const intro = reduced ? 1 : journey.intro
    const introOffset = 1 - MathUtils.smootherstep(intro, 0, 1)
    pos.z += introOffset * 2.4
    pos.y -= introOffset * 0.35

    // Pointer parallax & idle sway (disabled for reduced motion).
    const k = reduced ? 0 : 1
    const damp = 1 - Math.exp(-delta * 3)
    pointer.current.x += (journey.pointerX - pointer.current.x) * damp
    pointer.current.y += (journey.pointerY - pointer.current.y) * damp
    const t = state.clock.elapsedTime
    const par = motion.pointerParallax * k * (1 - p * 0.4)
    const sway = motion.idleSway * k
    pos.x += pointer.current.x * 0.55 * par + Math.sin(t * 0.21) * 0.12 * sway
    pos.y += pointer.current.y * 0.3 * par + Math.sin(t * 0.33) * 0.07 * sway
    look.x += pointer.current.x * 1.4 * par

    camera.position.copy(pos)
    camera.lookAt(look)
    // A breath of roll while passing through the opening.
    camera.rotateZ(Math.sin(p * Math.PI) * 0.018 * k + Math.sin(t * 0.17) * 0.004 * sway)

    // Responsive field of view: keep enough horizontal view on narrow screens.
    const aspect = size.width / Math.max(1, size.height)
    const baseV = 56
    const minH = 60
    const fromH = MathUtils.radToDeg(2 * Math.atan(Math.tan(MathUtils.degToRad(minH / 2)) / aspect))
    const base = MathUtils.clamp(Math.max(baseV, fromH), baseV, 88)
    const warp = reduced ? 0 : motion.warpFov * Math.exp(-(((p - motion.stages.throatAt) / 0.09) ** 2))
    const fov = base + warp
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  })
  return null
}
