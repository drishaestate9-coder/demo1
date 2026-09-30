import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { SceneColors } from '../config/types'
import { CITADEL_POSITION } from './lib/layout'

type Part = { geo: BufferGeometry; at: [number, number, number]; rot?: [number, number, number] }

function place(parts: Part[]) {
  const m = new Matrix4()
  const q = new Quaternion()
  const one = new Vector3(1, 1, 1)
  const geos = parts.map(({ geo, at, rot }) => {
    q.setFromEuler(new Euler(...(rot ?? [0, 0, 0])))
    m.compose(new Vector3(...at), q, one)
    const g = geo.index ? geo.toNonIndexed() : geo.clone()
    geo.dispose()
    g.deleteAttribute('uv')
    g.applyMatrix4(m)
    return g
  })
  const merged = mergeGeometries(geos, false)!
  geos.forEach((g) => g.dispose())
  return merged
}

function tower(x: number, z: number, r: number, h: number, roofH: number, y = 0): Part[] {
  return [
    { geo: new CylinderGeometry(r * 0.92, r, h, 20, 1), at: [x, y + h / 2, z] },
    { geo: new CylinderGeometry(r * 1.12, r * 1.12, h * 0.05, 20, 1), at: [x, y + h, z] },
    { geo: new ConeGeometry(r * 1.15, roofH, 20, 1), at: [x, y + h + roofH / 2 + h * 0.02, z] },
    { geo: new SphereGeometry(r * 0.16, 10, 8), at: [x, y + h + roofH + h * 0.03, z] },
  ]
}

/** Builds the citadel as one merged mesh (cheap to draw, easy to fog). */
function buildCitadel() {
  const parts: Part[] = [
    // foundation / cloud-borne island
    { geo: new CylinderGeometry(30, 22, 10, 28, 1), at: [0, 2, 0] },
    { geo: new ConeGeometry(22, 26, 24, 1), at: [0, -16, 0], rot: [Math.PI, 0, 0] },
    // curtain wall
    { geo: new CylinderGeometry(24, 24, 11, 32, 1, true), at: [0, 12, 0] },
    // central keep
    ...tower(0, -2, 7, 50, 26, 7),
    // twin towers
    ...tower(-13.5, 5, 4.4, 36, 17, 7),
    ...tower(13.5, 5, 4.4, 36, 17, 7),
    // outer towers
    ...tower(-23, 0, 3.3, 24, 12, 7),
    ...tower(23, 0, 3.3, 24, 12, 7),
    // needle spires
    ...tower(-6.5, 9, 1.4, 42, 12, 7),
    ...tower(6.5, 9, 1.4, 42, 12, 7),
    // domed hall behind
    { geo: new CylinderGeometry(9, 9, 14, 24, 1), at: [0, 14, -14] },
    { geo: new SphereGeometry(9.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), at: [0, 21, -14] },
    // connecting halls
    { geo: new BoxGeometry(30, 12, 8), at: [0, 13, 4] },
    { geo: new BoxGeometry(46, 7, 6), at: [0, 10.5, 0] },
  ]
  return place(parts)
}

function buildWindows() {
  const geos: BufferGeometry[] = []
  const win = new BoxGeometry(0.7, 1.6, 0.4)
  const add = (x: number, y: number, z: number) => {
    const g = win.clone()
    g.translate(x, y, z)
    geos.push(g)
  }
  const rows: [number, number, number, number, number][] = [
    // x, z(front face), base y, count, radius
    [0, -2, 16, 7, 7],
    [-13.5, 5, 16, 5, 4.4],
    [13.5, 5, 16, 5, 4.4],
  ]
  for (const [x, z, y0, n, r] of rows) {
    for (let i = 0; i < n; i++) add(x + (i % 2 === 0 ? -r * 0.35 : r * 0.35), y0 + i * 5.5, z + r * 0.95)
  }
  for (let i = -3; i <= 3; i++) add(i * 3.6, 14, 8.2)
  const merged = mergeGeometries(geos, false)!
  geos.forEach((g) => g.dispose())
  win.dispose()
  return merged
}

/** A free-standing arched gateway and a broken colonnade - liminal dream architecture. */
function buildGateway() {
  const parts: Part[] = [
    { geo: new BoxGeometry(2.4, 16, 2.4), at: [-6, 8, 0] },
    { geo: new BoxGeometry(2.4, 16, 2.4), at: [6, 8, 0] },
    { geo: new TorusGeometry(6, 1.2, 10, 32, Math.PI), at: [0, 16, 0] },
    { geo: new BoxGeometry(16, 1.2, 4), at: [0, 0.6, 0] },
    { geo: new BoxGeometry(3.2, 1.2, 3.2), at: [-6, 16.2, 0] },
    { geo: new BoxGeometry(3.2, 1.2, 3.2), at: [6, 16.2, 0] },
  ]
  return place(parts)
}

function buildColonnade() {
  const parts: Part[] = []
  for (let i = 0; i < 5; i++) {
    const x = i * 7
    const h = i === 4 ? 7 : 12
    parts.push({ geo: new CylinderGeometry(0.9, 1.05, h, 14, 1), at: [x, h / 2, 0] })
    if (i < 4) parts.push({ geo: new TorusGeometry(3.5, 0.7, 8, 20, Math.PI), at: [x + 3.5, 12, 0] })
  }
  parts.push({ geo: new BoxGeometry(33, 1.2, 3.4), at: [14, 0.2, 0] })
  return place(parts)
}

export function Architecture({ colors }: { colors: SceneColors }) {
  const { citadel, windows, gateway, colonnade } = useMemo(
    () => ({ citadel: buildCitadel(), windows: buildWindows(), gateway: buildGateway(), colonnade: buildColonnade() }),
    [],
  )
  const stone = useMemo(() => {
    const c = new Color(colors.architecture)
    const m = new MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, emissive: c.clone().multiplyScalar(0.22) })
    // Soft sky fill from the upper right plus a warm rim from the low sun,
    // so pale towers keep their form through the haze.
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uFill = { value: new Color(colors.skyHorizon).lerp(c, 0.5) }
      shader.uniforms.uShade = { value: new Color(colors.cloudShadow) }
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uFill;\nuniform vec3 uShade;')
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          vec3 fillDir = normalize((viewMatrix * vec4(0.55, 0.6, 0.6, 0.0)).xyz);
          float fill = max(dot(normal, fillDir), 0.0);
          totalEmissiveRadiance += mix(uShade * 0.18, uFill * 0.62, fill);`,
        )
    }
    return m
  }, [colors.architecture, colors.skyHorizon, colors.cloudShadow])
  const glass = useMemo(() => new MeshBasicMaterial({ color: new Color('#ffdcb0').multiplyScalar(2.2), toneMapped: false }), [])
  const portal = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(colors.portalLight).multiplyScalar(1.3),
        transparent: true,
        opacity: 0.55,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
    [colors.portalLight],
  )
  useEffect(
    () => () => {
      ;[citadel, windows, gateway, colonnade].forEach((g) => g.dispose())
      ;[stone, glass, portal].forEach((m) => m.dispose())
    },
    [citadel, windows, gateway, colonnade, stone, glass, portal],
  )
  const c = CITADEL_POSITION
  return (
    <group>
      <group position={c}>
        <mesh geometry={citadel} material={stone} />
        <mesh geometry={windows} material={glass} />
      </group>
      {/* Arched gateway floating on a cloud, left of the flight path */}
      <group position={[-78, -8, -205]} rotation={[0, 0.45, 0]}>
        <mesh geometry={gateway} material={stone} />
        <mesh position={[0, 8.6, 0]} material={portal}>
          <planeGeometry args={[9.4, 17.2]} />
        </mesh>
      </group>
      {/* Broken colonnade drifting right */}
      <group position={[70, -10, -235]} rotation={[0, -0.5, 0]}>
        <mesh geometry={colonnade} material={stone} />
      </group>
    </group>
  )
}
