import { BufferGeometry, Float32BufferAttribute, IcosahedronGeometry, Vector3 } from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { fbm, ridged, type Noise3D } from './noise'

/**
 * Hexagonal crystal: a slightly tapered prism with a pyramid tip.
 * Base sits at y = 0, tip at y = 1, radius 0.5 (so scale = diameter).
 * `aH` stores the normalised height for the shader's inner gradient.
 */
export function createCrystalGeometry() {
  const sides = 6
  const shoulder = 0.7
  const rBase = 0.5
  const rShoulder = 0.44
  const positions: number[] = []
  const heights: number[] = []
  const ring = (r: number, y: number, i: number) => {
    const a = (i / sides) * Math.PI * 2 + Math.PI / 6
    return [Math.cos(a) * r, y, Math.sin(a) * r]
  }
  const push = (v: number[], h: number) => {
    positions.push(v[0], v[1], v[2])
    heights.push(h)
  }
  for (let i = 0; i < sides; i++) {
    const b0 = ring(rBase, 0, i)
    const b1 = ring(rBase, 0, i + 1)
    const s0 = ring(rShoulder, shoulder, i)
    const s1 = ring(rShoulder, shoulder, i + 1)
    const tip = [0, 1, 0]
    // side quad (two triangles, CCW seen from outside)
    push(b0, 0); push(s1, shoulder); push(b1, 0)
    push(b0, 0); push(s0, shoulder); push(s1, shoulder)
    // tip facet
    push(s0, shoulder); push(tip, 1); push(s1, shoulder)
    // base cap (rarely visible, keeps the solid closed)
    push([0, 0, 0], 0); push(b1, 0); push(b0, 0)
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setAttribute('aH', new Float32BufferAttribute(heights, 1))
  geo.computeVertexNormals()
  return geo
}

export interface RockOptions {
  radius: Vector3
  detail?: number
  roughness?: number
  /** Flatten the underside so the rock can sit on the ground. */
  flattenBottom?: number
  seedOffset?: Vector3
}

/** A lumpy boulder: displaced icosphere with merged vertices for smooth normals. */
export function createRockGeometry(noise: Noise3D, opts: RockOptions) {
  const { radius, detail = 10, roughness = 1, flattenBottom = 0.35, seedOffset = new Vector3() } = opts
  let geo: BufferGeometry = new IcosahedronGeometry(1, detail)
  geo.deleteAttribute('normal')
  geo.deleteAttribute('uv')
  geo = mergeVertices(geo)
  const pos = geo.getAttribute('position')
  const v = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const nx = v.x * 0.9 + seedOffset.x
    const ny = v.y * 0.9 + seedOffset.y
    const nz = v.z * 0.9 + seedOffset.z
    const big = fbm(noise, nx, ny, nz, 3) * 0.38
    const detailN = (ridged(noise, nx * 3.1, ny * 3.1, nz * 3.1, 3) - 0.5) * 0.16
    const d = 1 + (big + detailN) * roughness
    v.multiplyScalar(d)
    if (v.y < 0) v.y *= flattenBottom
    v.set(v.x * radius.x, v.y * radius.y, v.z * radius.z)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  return geo
}

/** A fan of curved grass / fern blades in one geometry, base at origin. */
export function createTuftGeometry(blades = 7) {
  const positions: number[] = []
  const shade: number[] = []
  for (let b = 0; b < blades; b++) {
    const angle = (b / blades) * Math.PI * 2 + b * 0.7
    const lean = 0.25 + ((b * 37) % 10) / 22
    const height = 0.55 + ((b * 53) % 10) / 20
    const width = 0.06
    const segs = 4
    const dir = new Vector3(Math.cos(angle), 0, Math.sin(angle))
    const side = new Vector3(-dir.z, 0, dir.x)
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs
      const t1 = (s + 1) / segs
      const p = (t: number) => {
        const bend = lean * t * t
        return new Vector3(dir.x * bend, height * t, dir.z * bend)
      }
      const w0 = width * (1 - t0)
      const w1 = width * (1 - t1)
      const a0 = p(t0).addScaledVector(side, -w0)
      const a1 = p(t0).addScaledVector(side, w0)
      const b0 = p(t1).addScaledVector(side, -w1)
      const b1 = p(t1).addScaledVector(side, w1)
      positions.push(a0.x, a0.y, a0.z, a1.x, a1.y, a1.z, b1.x, b1.y, b1.z)
      positions.push(a0.x, a0.y, a0.z, b1.x, b1.y, b1.z, b0.x, b0.y, b0.z)
      shade.push(t0, t0, t1, t0, t1, t1)
    }
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setAttribute('aShade', new Float32BufferAttribute(shade, 1))
  geo.computeVertexNormals()
  return geo
}
