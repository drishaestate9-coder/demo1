import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  TubeGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { SceneColors } from '../../config/types'
import { CAVE_END_Z, CAVE_START_Z, PORTAL_CENTER, THROAT_Z, pathX, profileAt } from './layout'
import { clamp01, createNoise3D, createRng, fbm, lerp, pick, range, ridged, smoothstep, type Noise3D, type Rng } from './noise'
import { createRockGeometry } from './geometry'

/**
 * Procedurally generates the crystal cave: the rock shell (a displaced,
 * irregular tunnel ending in the opening), foreground boulders, crystal
 * clusters, moss / fern tufts, glowing buds, hanging vines and the path.
 * Crystal and portal light is baked into a per-vertex `aGlow` attribute
 * so the rock glows around every cluster without dozens of real lights.
 */

export interface CrystalCluster {
  position: Vector3
  normal: Vector3
  color: Color
  size: number
}

export interface InstanceData {
  count: number
  matrices: Float32Array
  colors: Float32Array
  phases?: Float32Array
}

export interface CaveWorld {
  shell: BufferGeometry
  rocks: BufferGeometry
  crystals: InstanceData
  tufts: InstanceData
  buds: InstanceData
  stones: InstanceData
  vines: BufferGeometry
  leaves: InstanceData
  keyLights: { position: Vector3; color: Color; intensity: number }[]
}

const UP = new Vector3(0, 1, 0)

function linearColor(hex: string) {
  return new Color(hex) // hex is sRGB, Color stores linear (ColorManagement)
}

// ── Rock shell ──────────────────────────────────────────────────────────────

interface ShellData {
  positions: Float32Array
  displacement: Float32Array
  index: Uint32Array
  rings: number
  segs: number
}

function buildShell(noise: Noise3D): ShellData {
  const dz = 0.2
  const segs = 256
  const rings = Math.floor((CAVE_START_Z - CAVE_END_Z) / dz) + 1
  const positions = new Float32Array(rings * segs * 3)
  const displacement = new Float32Array(rings * segs)
  const p = new Vector3()
  for (let r = 0; r < rings; r++) {
    const z = CAVE_START_Z - r * dz
    const prof = profileAt(z)
    const cyc = (prof.floor + prof.ceiling) / 2
    const hh = (prof.ceiling - prof.floor) / 2
    const throatness = Math.exp(-(((z - THROAT_Z) / 3.2) ** 2))
    const irregular = 0.1 + 0.16 * throatness
    for (let s = 0; s < segs; s++) {
      const theta = (s / segs) * Math.PI * 2
      const c = Math.cos(theta)
      const sn = Math.sin(theta)
      const sx = Math.sign(c) * Math.abs(c) ** (2 / 2.5)
      const sy = sn >= 0 ? Math.sign(sn) * Math.abs(sn) ** (2 / 2.15) : -(Math.abs(sn) ** (2 / 6))
      // Irregular silhouette: low-frequency wobble of the section outline.
      const m = 1 + irregular * fbm(noise, c * 1.3 + 11.3, sn * 1.3 + 3.1, z * 0.085, 3) * 1.6
      const floorness = smoothstep(-0.45, -0.85, sn)
      const px = prof.cx + prof.halfWidth * sx * lerp(m, 1 + (m - 1) * 0.4, floorness)
      let py = cyc + hh * sy * (sn >= 0 ? m : 1)
      if (sn < 0) py = Math.max(py, prof.floor - 0.4)
      p.set(px, py, z)
      // Inward direction: towards the tunnel axis (up for the floor).
      const inX = prof.cx - px
      const inY = (cyc - py) * 0.85
      const len = Math.hypot(inX, inY) || 1
      let dx = inX / len
      let dy = inY / len
      dx = lerp(dx, 0, floorness)
      dy = lerp(dy, 1, floorness)
      const n2 = Math.hypot(dx, dy) || 1
      dx /= n2
      dy /= n2
      const big = fbm(noise, p.x * 0.2, p.y * 0.2, p.z * 0.2, 4)
      const crag = ridged(noise, p.x * 0.6 + 7, p.y * 0.6, p.z * 0.6, 3) - 0.45
      const fine = fbm(noise, p.x * 1.7 + 3, p.y * 1.7, p.z * 1.7, 2)
      const amp = lerp(1, 0.3, floorness)
      const d = (big * 1.5 + crag * 0.9 + fine * 0.16) * amp
      p.x += dx * d
      p.y += dy * d
      p.z += fbm(noise, p.x * 0.3 + 50, p.y * 0.3, p.z * 0.3, 2) * 0.7 * (1 - floorness)
      const i = r * segs + s
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
      displacement[i] = d
    }
  }
  const index = new Uint32Array((rings - 1) * segs * 6)
  let k = 0
  for (let r = 0; r < rings - 1; r++) {
    for (let s = 0; s < segs; s++) {
      const a = r * segs + s
      const b = r * segs + ((s + 1) % segs)
      const c = (r + 1) * segs + s
      const d = (r + 1) * segs + ((s + 1) % segs)
      index[k++] = a
      index[k++] = b
      index[k++] = c
      index[k++] = b
      index[k++] = d
      index[k++] = c
    }
  }
  return { positions, displacement, index, rings, segs }
}

/** Ensures triangles face into the cave (floor normals point up). */
function orientInward(geo: BufferGeometry, probeIndex: number) {
  const n = geo.getAttribute('normal')
  if (n.getY(probeIndex) < 0) {
    const idx = geo.getIndex()!
    for (let i = 0; i < idx.count; i += 3) {
      const t = idx.getX(i + 1)
      idx.setX(i + 1, idx.getX(i + 2))
      idx.setX(i + 2, t)
    }
    idx.needsUpdate = true
    geo.computeVertexNormals()
  }
}

// ── Surface shading bake (albedo + glow) ────────────────────────────────────

interface BakeContext {
  noise: Noise3D
  colors: SceneColors
  clusters: CrystalCluster[]
  portal: Color
}

function bakeSurface(geo: BufferGeometry, ctx: BakeContext, displacement?: Float32Array, glowScale = 1) {
  const pos = geo.getAttribute('position')
  const nor = geo.getAttribute('normal')
  const count = pos.count
  const albedo = new Float32Array(count * 3)
  const glow = new Float32Array(count * 3)
  const { noise, colors } = ctx
  const rockDark = linearColor(colors.rockDark)
  const rockMid = linearColor(colors.rockMid)
  const rockLight = linearColor(colors.rockLight)
  const moss = linearColor(colors.moss)
  const mossBright = linearColor(colors.mossBright)
  const base = new Color()
  const tmp = new Color()
  const g = new Color()
  const p = new Vector3()
  const n = new Vector3()
  const toC = new Vector3()
  for (let i = 0; i < count; i++) {
    p.fromBufferAttribute(pos, i)
    n.fromBufferAttribute(nor, i)
    // Albedo -----------------------------------------------------------
    const tone = fbm(noise, p.x * 0.16 + 100, p.y * 0.16, p.z * 0.16, 3)
    base.copy(rockDark).lerp(rockMid, clamp01(0.42 + tone * 1.1))
    const strata = ridged(noise, p.x * 0.3, p.y * 1.3 + 4, p.z * 0.3 + 30, 3)
    base.lerp(rockLight, smoothstep(0.55, 0.92, strata) * 0.45)
    const mossNoise = fbm(noise, p.x * 0.33 + 200, p.y * 0.33, p.z * 0.33, 3)
    let mossMask = smoothstep(0.2, 0.75, n.y) * smoothstep(-0.45, 0.15, mossNoise)
    mossMask += (1 - Math.abs(n.y)) * smoothstep(0.08, 0.42, fbm(noise, p.x * 0.45 + 300, p.y * 0.45, p.z * 0.45, 3)) * 0.85
    tmp.copy(moss).lerp(mossBright, clamp01(0.35 + fbm(noise, p.x * 1.1 + 400, p.y * 1.1, p.z * 1.1, 2) * 1.2))
    base.lerp(tmp, clamp01(mossMask) * 0.88)
    // Worn path on the floor
    if (n.y > 0.55 && p.z < 8 && p.z > THROAT_Z - 0.5) {
      const w = 1 - smoothstep(0.7, 1.9, Math.abs(p.x - pathX(p.z)))
      base.lerp(tmp.copy(rockLight).multiplyScalar(0.85), w * 0.55)
    }
    if (displacement) {
      const ao = clamp01(0.5 + displacement[i] * 0.45)
      base.multiplyScalar(0.45 + ao * 0.7)
    }
    albedo[i * 3] = base.r
    albedo[i * 3 + 1] = base.g
    albedo[i * 3 + 2] = base.b

    // Glow ------------------------------------------------------------
    g.setRGB(0, 0, 0)
    for (const c of ctx.clusters) {
      toC.subVectors(c.position, p)
      const d = toC.length()
      const reach = c.size * 1.7 + 0.8
      if (d > reach) continue
      toC.divideScalar(d || 1)
      const facing = 0.2 + 0.8 * Math.max(0, n.dot(toC))
      const f = (1 - d / reach) ** 2.4 * facing * (0.1 + c.size * 0.08)
      g.r += c.color.r * f
      g.g += c.color.g * f
      g.b += c.color.b * f
    }
    // keep overlapping clusters from blowing out
    const gm = Math.max(g.r, g.g, g.b)
    if (gm > 0.32) g.multiplyScalar(0.32 / gm)
    // Light spilling in through the opening: a bright rim at the throat
    // edge, a softer spill across the floor, and a faint depth haze.
    const inside = p.z - THROAT_Z
    const rim = Math.exp(-Math.max(0, inside) / 1.0) * 0.22
    const spill = Math.exp(-Math.max(0, inside) / 5) * 0.1 * (0.3 + 0.7 * Math.max(0, n.y))
    const toPortal = toC.subVectors(PORTAL_CENTER, p).normalize()
    const face = 0.3 + 0.7 * Math.max(0, n.dot(toPortal))
    const haze = smoothstep(-2, THROAT_Z + 1, p.z) * 0.035
    const outside = inside < 0 ? 0.06 : 0
    const portalAmt = (rim * face + spill + haze + outside) * glowScale
    g.r += ctx.portal.r * portalAmt
    g.g += ctx.portal.g * portalAmt
    g.b += ctx.portal.b * portalAmt
    glow[i * 3] = g.r
    glow[i * 3 + 1] = g.g
    glow[i * 3 + 2] = g.b
  }
  geo.setAttribute('color', new BufferAttribute(albedo, 3))
  geo.setAttribute('aGlow', new BufferAttribute(glow, 3))
}

// ── Crystal clusters ────────────────────────────────────────────────────────

function randomUnit(rng: Rng, out = new Vector3()) {
  const u = rng() * 2 - 1
  const a = rng() * Math.PI * 2
  const r = Math.sqrt(1 - u * u)
  return out.set(r * Math.cos(a), u, r * Math.sin(a))
}

function tangentBasis(n: Vector3) {
  const t = Math.abs(n.y) < 0.9 ? new Vector3().crossVectors(n, UP).normalize() : new Vector3(1, 0, 0)
  const b = new Vector3().crossVectors(n, t).normalize()
  return { t, b }
}

interface ClusterSiteOptions {
  positions: BufferAttribute
  normals: BufferAttribute
  rng: Rng
  attempts: number
  accept: (p: Vector3, n: Vector3) => number // probability 0-1
  minSpacing: (p: Vector3) => number
  size: (p: Vector3) => number
  palette: Color[]
  weights: number[]
  existing: CrystalCluster[]
}

function scatterClusters(o: ClusterSiteOptions) {
  const p = new Vector3()
  const n = new Vector3()
  const out: CrystalCluster[] = []
  for (let a = 0; a < o.attempts; a++) {
    const i = Math.floor(o.rng() * o.positions.count)
    p.fromBufferAttribute(o.positions, i)
    n.fromBufferAttribute(o.normals, i).normalize()
    if (o.rng() > o.accept(p, n)) continue
    const spacing = o.minSpacing(p)
    let ok = true
    for (const c of o.existing) {
      if (c.position.distanceToSquared(p) < spacing * spacing) {
        ok = false
        break
      }
    }
    if (!ok) continue
    // weighted palette pick
    let r = o.rng() * o.weights.reduce((s, w) => s + w, 0)
    let ci = 0
    while (r > o.weights[ci] && ci < o.weights.length - 1) r -= o.weights[ci++]
    const cluster = { position: p.clone(), normal: n.clone(), color: o.palette[ci].clone(), size: o.size(p) }
    o.existing.push(cluster)
    out.push(cluster)
  }
  return out
}

function growCrystals(clusters: CrystalCluster[], rng: Rng, palette: Color[]) {
  const matrices: number[] = []
  const colors: number[] = []
  const phases: number[] = []
  const m = new Matrix4()
  const q = new Quaternion()
  const s = new Vector3()
  const dir = new Vector3()
  const jitter = new Vector3()
  const pos = new Vector3()
  const c = new Color()
  for (const cl of clusters) {
    const count = Math.round(range(rng, 3, 7) + cl.size * 3)
    const axis = cl.normal.clone().add(randomUnit(rng, jitter).multiplyScalar(0.25)).normalize()
    const { t, b } = tangentBasis(axis)
    const secondary = rng() < 0.3 ? pick(rng, palette) : null
    for (let k = 0; k < count; k++) {
      const main = k === 0
      const spread = main ? 0.12 : range(rng, 0.25, 0.75)
      dir.copy(axis).add(randomUnit(rng, jitter).multiplyScalar(spread)).normalize()
      if (dir.dot(cl.normal) < 0.2) dir.lerp(cl.normal, 0.6).normalize()
      const length = cl.size * (main ? range(rng, 0.9, 1.1) : range(rng, 0.28, 0.8))
      const radius = length * (main ? range(rng, 0.13, 0.17) : range(rng, 0.14, 0.24))
      const off = main ? 0 : cl.size * range(rng, 0.08, 0.38)
      const ang = rng() * Math.PI * 2
      pos
        .copy(cl.position)
        .addScaledVector(t, Math.cos(ang) * off)
        .addScaledVector(b, Math.sin(ang) * off)
        .addScaledVector(dir, -length * 0.12)
      q.setFromUnitVectors(UP, dir)
      s.set(radius * 2, length, radius * 2)
      m.compose(pos, q, s)
      matrices.push(...m.elements)
      c.copy(secondary && rng() < 0.45 ? secondary : cl.color)
      c.offsetHSL(range(rng, -0.02, 0.02), 0, range(rng, -0.04, 0.05))
      colors.push(c.r, c.g, c.b)
      phases.push(rng())
    }
  }
  return {
    count: phases.length,
    matrices: new Float32Array(matrices),
    colors: new Float32Array(colors),
    phases: new Float32Array(phases),
  }
}

// ── Foreground rocks, stalactites & stalagmites ─────────────────────────────

interface RockSpec {
  at: [number, number, number]
  radius: [number, number, number]
  rotY?: number
  hang?: boolean
  taper?: number
  detail?: number
}

const ROCKS: RockSpec[] = [
  // Foreground framing masses (left / right) and boulders near the lower edge
  { at: [-9.4, -0.4, 2.2], radius: [3.4, 6.2, 3.2], rotY: 0.4, taper: 0.35, detail: 14 },
  { at: [-5.6, -0.4, 4.6], radius: [2.2, 1.5, 1.9], rotY: 1.2 },
  { at: [-3.1, -0.4, 6.1], radius: [1.0, 0.55, 0.9], rotY: 0.2, detail: 6 },
  { at: [9.8, -0.4, 0.4], radius: [3.6, 7.2, 3.1], rotY: -0.3, taper: 0.4, detail: 14 },
  { at: [6.1, -0.4, 3.6], radius: [2.0, 1.45, 1.8], rotY: 2.1 },
  { at: [3.3, -0.4, 6.4], radius: [0.8, 0.45, 0.8], rotY: 0.8, detail: 6 },
  // Mid-cave stalagmites
  { at: [7.4, 0.0, -7.2], radius: [1.1, 3.6, 1.0], taper: 0.7 },
  { at: [-7.9, 0.1, -9.2], radius: [1.3, 4.4, 1.2], taper: 0.7 },
  { at: [-5.2, 0.2, -12.6], radius: [0.8, 2.2, 0.8], taper: 0.7, detail: 7 },
  // Stalactites
  { at: [-3.4, 12.6, -4.5], radius: [0.9, 3.2, 0.9], hang: true, taper: 0.85 },
  { at: [4.6, 12.4, -8.4], radius: [1.0, 3.8, 0.9], hang: true, taper: 0.85 },
  { at: [1.2, 11.9, -12.2], radius: [0.7, 2.4, 0.7], hang: true, taper: 0.85, detail: 7 },
  { at: [2.6, 11.2, -15.4], radius: [0.8, 2.7, 0.8], hang: true, taper: 0.8, detail: 7 },
  // Irregular throat silhouette
  { at: [-4.8, 11.0, -15.6], radius: [3.4, 2.4, 2.2], rotY: 0.3, hang: true, taper: 0.3 },
  { at: [6.2, 0.6, -15.0], radius: [2.4, 2.0, 1.9], rotY: 0.9 },
  { at: [-6.6, 0.6, -14.4], radius: [2.6, 2.7, 2.1], rotY: -0.6, taper: 0.3 },
]

function buildRocks(noise: Noise3D, rng: Rng) {
  const geos: BufferGeometry[] = []
  const m = new Matrix4()
  const q = new Quaternion()
  for (const spec of ROCKS) {
    const [rx, ry, rz] = spec.radius
    const geo = createRockGeometry(noise, {
      radius: new Vector3(rx, ry, rz),
      detail: spec.detail ?? 10,
      roughness: 1,
      flattenBottom: 0.3,
      seedOffset: new Vector3(range(rng, -50, 50), range(rng, -50, 50), range(rng, -50, 50)),
    })
    if (spec.taper) {
      const pos = geo.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i)
        const t = clamp01(y / ry)
        const k = 1 - spec.taper * t * t
        pos.setX(i, pos.getX(i) * k)
        pos.setZ(i, pos.getZ(i) * k)
      }
    }
    q.setFromAxisAngle(UP, spec.rotY ?? 0)
    if (spec.hang) q.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI))
    m.compose(new Vector3(...spec.at), q, new Vector3(1, 1, 1))
    geo.applyMatrix4(m)
    geo.computeVertexNormals()
    geos.push(geo)
  }
  const merged = mergeGeometries(geos, false)!
  geos.forEach((g) => g.dispose())
  return merged
}

// ── Floor height lookup (for placing path stones) ───────────────────────────

function buildFloorLookup(positions: BufferAttribute, normals: BufferAttribute) {
  const cell = 0.4
  const map = new Map<string, number>()
  for (let i = 0; i < positions.count; i++) {
    if (normals.getY(i) < 0.45) continue
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    const key = `${Math.round(x / cell)},${Math.round(z / cell)}`
    const prev = map.get(key)
    if (prev === undefined || y > prev) map.set(key, y)
  }
  return (x: number, z: number, fallback: number) => {
    const cx = Math.round(x / cell)
    const cz = Math.round(z / cell)
    for (let r = 0; r <= 3; r++) {
      let best: number | undefined
      for (let i = -r; i <= r; i++)
        for (let j = -r; j <= r; j++) {
          const v = map.get(`${cx + i},${cz + j}`)
          if (v !== undefined && (best === undefined || v > best)) best = v
        }
      if (best !== undefined) return best
    }
    return fallback
  }
}

// ── Main entry ──────────────────────────────────────────────────────────────

export function generateCaveWorld(seed: number, colors: SceneColors): CaveWorld {
  const rng = createRng(seed)
  const noise = createNoise3D(seed)
  const palette = colors.crystals.map(linearColor)
  // violet, pink, cyan, amber, lilac
  const weights = [0.3, 0.24, 0.24, 0.12, 0.1].slice(0, palette.length)
  while (weights.length < palette.length) weights.push(0.1)
  const portal = linearColor(colors.portalLight)

  // Shell --------------------------------------------------------------------
  const shellData = buildShell(noise)
  const shell = new BufferGeometry()
  shell.setAttribute('position', new BufferAttribute(shellData.positions, 3))
  shell.setIndex(new BufferAttribute(shellData.index, 1))
  shell.computeVertexNormals()
  // probe: a floor vertex (theta = 3π/2) in a middle ring
  const probe = Math.floor(shellData.rings / 2) * shellData.segs + Math.floor(shellData.segs * 0.75)
  orientInward(shell, probe)

  // Rocks --------------------------------------------------------------------
  const rocks = buildRocks(noise, rng)

  // Crystal clusters ------------------------------------------------------------
  const clusters: CrystalCluster[] = []
  const shellPos = shell.getAttribute('position') as BufferAttribute
  const shellNor = shell.getAttribute('normal') as BufferAttribute
  const rockPos = rocks.getAttribute('position') as BufferAttribute
  const rockNor = rocks.getAttribute('normal') as BufferAttribute

  // Hero clusters on the foreground rocks: large, facing the camera.
  scatterClusters({
    positions: rockPos,
    normals: rockNor,
    rng,
    attempts: 5000,
    accept: (p, n) => {
      if (p.z < -1.5 || p.z > 7.5) return 0
      const towardCam = n.z * 0.7 + n.y * 0.5 + (Math.sign(-p.x) * n.x) * 0.4
      return towardCam > 0.35 ? 0.9 : 0
    },
    minSpacing: () => 1.25,
    size: (p) => (p.y > 2.5 ? range(rng, 1.1, 1.9) : range(rng, 1.3, 2.3)),
    palette,
    weights,
    existing: clusters,
  })
  // Throat rim & mid-cave rocks
  scatterClusters({
    positions: rockPos,
    normals: rockNor,
    rng,
    attempts: 1600,
    accept: (p, n) => (p.z < -6 && n.z > 0.1 ? 0.6 : 0),
    minSpacing: () => 1.4,
    size: () => range(rng, 0.7, 1.3),
    palette,
    weights,
    existing: clusters,
  })
  // Walls, floor edges and ceiling of the shell
  scatterClusters({
    positions: shellPos,
    normals: shellNor,
    rng,
    attempts: 14000,
    accept: (p, n) => {
      if (p.z > 9 || p.z < THROAT_Z - 0.6) return 0
      const onFloor = n.y > 0.6
      if (onFloor && Math.abs(p.x - pathX(p.z)) < 3.2) return 0
      const prof = profileAt(p.z)
      const low = p.y < prof.floor + 4.5 ? 1 : p.y < prof.floor + 8 ? 0.3 : 0.12
      const near = p.z > -7 ? 1 : 0.55
      const rimZone = p.z < THROAT_Z + 3.5 ? 1.2 : 1
      return 0.5 * low * near * rimZone
    },
    minSpacing: (p) => (p.z < THROAT_Z + 3 ? 1.5 : 2.1),
    size: (p) => {
      const d = clamp01((p.z - THROAT_Z) / 22)
      return range(rng, 0.55, 1.0) * lerp(0.9, 1.7, d)
    },
    palette,
    weights,
    existing: clusters,
  })

  const crystals = growCrystals(clusters, rng, palette)

  // Bake surfaces ---------------------------------------------------------------
  const ctx: BakeContext = { noise, colors, clusters, portal }
  bakeSurface(shell, ctx, shellData.displacement)
  bakeSurface(rocks, ctx, undefined, 1)

  // Key lights: brightest large clusters near the camera + portal lights
  const keyLights = [...clusters]
    .filter((c) => c.position.z > -12)
    .sort((a, b) => b.size - a.size)
    .slice(0, 4)
    .map((c) => ({
      position: c.position.clone().addScaledVector(c.normal, c.size * 0.9),
      color: c.color.clone(),
      intensity: 6 + c.size * 6,
    }))

  // Path stones -------------------------------------------------------------------
  const floorAt = buildFloorLookup(shellPos, shellNor)
  const stoneMats: number[] = []
  const stoneCols: number[] = []
  const m = new Matrix4()
  const q = new Quaternion()
  const light = linearColor(colors.rockLight)
  const mid = linearColor(colors.rockMid)
  const mossC = linearColor(colors.moss)
  for (let z = 7; z > THROAT_Z + 0.6; z -= range(rng, 0.62, 0.95)) {
    for (let side = 0; side < (rng() < 0.35 ? 2 : 1); side++) {
      const x = pathX(z) + range(rng, -0.55, 0.55)
      const zz = z + range(rng, -0.15, 0.15)
      const y = floorAt(x, zz, profileAt(zz).floor)
      const w = range(rng, 0.38, 0.66)
      q.setFromAxisAngle(UP, rng() * Math.PI)
      m.compose(new Vector3(x, y - 0.02, zz), q, new Vector3(w, range(rng, 0.1, 0.18), w * range(rng, 0.6, 0.9)))
      stoneMats.push(...m.elements)
      const c = mid.clone().lerp(light, range(rng, 0.35, 0.8)).lerp(mossC, range(rng, 0, 0.25))
      stoneCols.push(c.r, c.g, c.b)
    }
  }
  // scattered pebbles
  for (let i = 0; i < 180; i++) {
    const z = range(rng, THROAT_Z + 0.8, 7.5)
    const prof = profileAt(z)
    const x = range(rng, -prof.halfWidth * 0.65, prof.halfWidth * 0.65)
    if (Math.abs(x - pathX(z)) < 0.9) continue
    const y = floorAt(x, z, prof.floor)
    const w = range(rng, 0.06, 0.22)
    q.setFromAxisAngle(UP, rng() * Math.PI)
    m.compose(new Vector3(x, y, z), q, new Vector3(w, w * range(rng, 0.4, 0.8), w * range(rng, 0.7, 1)))
    stoneMats.push(...m.elements)
    const c = mid.clone().lerp(light, range(rng, 0, 0.5))
    stoneCols.push(c.r, c.g, c.b)
  }
  const stones: InstanceData = {
    count: stoneCols.length / 3,
    matrices: new Float32Array(stoneMats),
    colors: new Float32Array(stoneCols),
  }

  // Tufts (ferns / grass) and glowing buds -------------------------------------------
  const tuftMats: number[] = []
  const tuftCols: number[] = []
  const budMats: number[] = []
  const budCols: number[] = []
  const green = linearColor(colors.moss)
  const greenBright = linearColor(colors.mossBright)
  const p = new Vector3()
  const n = new Vector3()
  const place = (positions: BufferAttribute, normals: BufferAttribute, attempts: number) => {
    for (let a = 0; a < attempts; a++) {
      const i = Math.floor(rng() * positions.count)
      p.fromBufferAttribute(positions, i)
      n.fromBufferAttribute(normals, i)
      if (n.y < 0.42 || p.z > 9 || p.z < THROAT_Z - 0.4) continue
      if (Math.abs(p.x - pathX(p.z)) < 1.1 && n.y > 0.8) continue
      const moss = fbm(noise, p.x * 0.33 + 200, p.y * 0.33, p.z * 0.33, 3)
      if (moss < -0.15 && rng() < 0.7) continue
      const sc = range(rng, 0.28, 0.62) * (p.z < -8 ? 0.8 : 1)
      q.setFromUnitVectors(UP, n.clone().lerp(UP, 0.55).normalize())
      q.multiply(new Quaternion().setFromAxisAngle(UP, rng() * Math.PI * 2))
      m.compose(p.clone().addScaledVector(n, -0.03), q, new Vector3(sc, sc * range(rng, 0.8, 1.4), sc))
      tuftMats.push(...m.elements)
      const c = green.clone().lerp(greenBright, range(rng, 0.45, 1))
      tuftCols.push(c.r, c.g, c.b)
      if (rng() < 0.3) {
        const budCount = 1 + Math.floor(rng() * 3)
        const col = pick(rng, palette)
        for (let b = 0; b < budCount; b++) {
          const bp = p
            .clone()
            .add(new Vector3(range(rng, -0.35, 0.35), range(rng, 0.25, 0.75) * sc, range(rng, -0.35, 0.35)))
          const bs = range(rng, 0.028, 0.06)
          m.compose(bp, new Quaternion(), new Vector3(bs, bs, bs))
          budMats.push(...m.elements)
          const bc = col.clone().multiplyScalar(range(rng, 2.5, 5))
          budCols.push(bc.r, bc.g, bc.b)
        }
      }
    }
  }
  place(shellPos, shellNor, 3200)
  place(rockPos, rockNor, 900)
  const tufts: InstanceData = { count: tuftCols.length / 3, matrices: new Float32Array(tuftMats), colors: new Float32Array(tuftCols) }
  const buds: InstanceData = { count: budCols.length / 3, matrices: new Float32Array(budMats), colors: new Float32Array(budCols) }

  // Hanging vines ---------------------------------------------------------------
  const vineGeos: BufferGeometry[] = []
  const leafMats: number[] = []
  const leafCols: number[] = []
  let vinesMade = 0
  for (let a = 0; a < 8000 && vinesMade < 12; a++) {
    const i = Math.floor(rng() * shellPos.count)
    p.fromBufferAttribute(shellPos, i)
    n.fromBufferAttribute(shellNor, i)
    if (n.y > -0.35 || p.z > -9 || p.z < THROAT_Z - 0.2 || Math.abs(p.x) > 7.5) continue
    vinesMade++
    const length = range(rng, 1.4, 4.2)
    const pts: Vector3[] = []
    const swayX = range(rng, -0.6, 0.6)
    const swayZ = range(rng, -0.4, 0.4)
    const ph = rng() * 6
    for (let k = 0; k <= 8; k++) {
      const t = k / 8
      pts.push(
        new Vector3(
          p.x + Math.sin(t * 3 + ph) * 0.25 + swayX * t * t,
          p.y + 0.15 - length * t,
          p.z + Math.cos(t * 2.4 + ph) * 0.2 + swayZ * t,
        ),
      )
    }
    const curve = new CatmullRomCurve3(pts)
    const tube = new TubeGeometry(curve, 28, range(rng, 0.025, 0.05), 5, false)
    tube.deleteAttribute('uv')
    vineGeos.push(tube)
    const leafCount = Math.floor(length * 11)
    for (let k = 0; k < leafCount; k++) {
      const t = k / leafCount
      const lp = curve.getPoint(t)
      const dirL = randomUnit(rng).setY(range(rng, -0.4, 0.3)).normalize()
      q.setFromUnitVectors(new Vector3(0, 0, 1), dirL)
      const ls = range(rng, 0.2, 0.38) * (1 - t * 0.35)
      m.compose(lp, q, new Vector3(ls, ls * 0.55, ls))
      leafMats.push(...m.elements)
      const c = green.clone().lerp(greenBright, range(rng, 0.2, 0.9))
      leafCols.push(c.r, c.g, c.b)
    }
  }
  const vines = vineGeos.length ? mergeGeometries(vineGeos, false)! : new BufferGeometry()
  vineGeos.forEach((g) => g.dispose())
  const leaves: InstanceData = { count: leafCols.length / 3, matrices: new Float32Array(leafMats), colors: new Float32Array(leafCols) }

  return { shell, rocks, crystals, tufts, buds, stones, vines, leaves, keyLights }
}

/** Leaf: a flat diamond pointing along +Z. */
export function createLeafGeometry() {
  const geo = new BufferGeometry()
  const v = [0, 0, 0, 0.5, 0, 0.45, 0, 0, 1, 0, 0, 0, 0, 0, 1, -0.5, 0, 0.45]
  geo.setAttribute('position', new Float32BufferAttribute(v, 3))
  geo.computeVertexNormals()
  return geo
}
