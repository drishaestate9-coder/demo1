import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  PlaneGeometry,
  ShaderMaterial,
} from 'three'
import type { SceneColors } from '../config/types'
import { journey } from '../lib/journey'
import { createRng, range } from './lib/noise'
import { THROAT_Z } from './lib/layout'
import { createShaftMaterial } from './materials'

/** Drifting luminous motes inside the cave and around the opening. */
function Motes({ seed, colors }: { seed: number; colors: SceneColors }) {
  const { geometry, material } = useMemo(() => {
    const rng = createRng(seed * 7 + 1)
    const count = 520
    const pos: number[] = []
    const col: number[] = []
    const rnd: number[] = []
    const palette = [...colors.crystals, colors.portalLight, colors.cloudLight].map((c) => new Color(c))
    for (let i = 0; i < count; i++) {
      const outside = i > count * 0.78
      pos.push(
        range(rng, -10, 10),
        outside ? range(rng, -4, 16) : range(rng, 0.2, 11),
        outside ? range(rng, THROAT_Z - 30, THROAT_Z - 2) : range(rng, THROAT_Z, 8),
      )
      const c = palette[Math.floor(rng() * palette.length)]
      col.push(c.r, c.g, c.b)
      rnd.push(rng(), range(rng, 0.5, 1.6))
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
    geo.setAttribute('color', new Float32BufferAttribute(col, 3))
    geo.setAttribute('aRnd', new Float32BufferAttribute(rnd, 2))
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexColors: true,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uOpacity: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute vec2 aRnd;
        uniform float uTime;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vTw;
        void main() {
          vec3 p = position;
          float t = uTime * (0.25 + aRnd.x * 0.35);
          p.y += sin(t * 0.6 + aRnd.x * 20.0) * 0.7;
          p.x += sin(t + aRnd.x * 40.0) * 0.4;
          p.z += cos(t * 0.8 + aRnd.x * 20.0) * 0.4;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aRnd.y * 34.0 * uPixelRatio / max(1.0, -mv.z);
          vColor = color;
          vTw = 0.55 + 0.45 * sin(uTime * 2.0 + aRnd.x * 30.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vTw;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          a *= a * vTw * uOpacity;
          gl_FragColor = vec4(vColor * a * 1.6, a);
        }
      `,
    })
    return { geometry: geo, material: mat }
  }, [seed, colors])
  useEffect(() => () => (geometry.dispose(), material.dispose()), [geometry, material])
  useFrame((state) => {
    material.uniforms.uTime.value = journey.reducedMotion ? 0 : state.clock.elapsedTime
    material.uniforms.uPixelRatio.value = state.gl.getPixelRatio()
  })
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

/** Soft rays of light falling through the opening into the cave. */
function Shafts({ colors }: { colors: SceneColors }) {
  const material = useMemo(() => createShaftMaterial(new Color(colors.portalLight)), [colors.portalLight])
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(1, 1, 1, 1)
    g.translate(0, -0.5, 0) // uv.y = 1 at the opening end, 0 at the far end
    return g
  }, [])
  useEffect(() => () => (geometry.dispose(), material.dispose()), [geometry, material])
  const shafts = useMemo(
    () => [
      { x: -2.6, w: 2.4, len: 20, tilt: 0.36, yaw: 0.12, spin: 0.2 },
      { x: 1.8, w: 3.2, len: 22, tilt: 0.3, yaw: -0.08, spin: -0.4 },
      { x: 4.4, w: 1.6, len: 17, tilt: 0.42, yaw: -0.2, spin: 0.9 },
      { x: -0.4, w: 1.8, len: 19, tilt: 0.34, yaw: 0.02, spin: 1.3 },
    ],
    [],
  )
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
    // Fade the rays as the camera flies through them.
    const p = journey.progress
    material.uniforms.uOpacity.value = 0.2 * (1 - Math.min(1, Math.max(0, (p - 0.3) / 0.25)))
  })
  return (
    <group position={[0, 9.4, THROAT_Z + 0.6]}>
      {shafts.map((s, i) => (
        <group key={i} position={[s.x, 0, 0]} rotation={[-(Math.PI / 2 - s.tilt), s.yaw, 0]}>
          <mesh geometry={geometry} material={material} scale={[s.w, s.len, 1]} rotation={[0, s.spin, 0]} />
        </group>
      ))}
    </group>
  )
}

/** Luminous haze filling the opening; fades as the camera passes. */
function PortalGlow({ colors }: { colors: SceneColors }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uColor: { value: new Color(colors.portalLight) }, uOpacity: { value: 0.5 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            vec2 c = (vUv - 0.5) * vec2(1.0, 1.25);
            float d = length(c) * 2.0;
            float a = pow(max(0.0, 1.0 - d), 2.2) * uOpacity;
            gl_FragColor = vec4(uColor * a, a);
          }
        `,
      }),
    [colors.portalLight],
  )
  useEffect(() => () => material.dispose(), [material])
  useFrame((state) => {
    const d = state.camera.position.z - (THROAT_Z - 1)
    material.uniforms.uOpacity.value = 0.14 * Math.min(1, Math.max(0, (d - 3) / 12))
  })
  return (
    <mesh position={[0, 5.8, THROAT_Z - 1]} material={material} renderOrder={3}>
      <planeGeometry args={[24, 20]} />
    </mesh>
  )
}

export function Atmosphere({ seed, colors }: { seed: number; colors: SceneColors }) {
  return (
    <group>
      <Motes seed={seed} colors={colors} />
      <Shafts colors={colors} />
      <PortalGlow colors={colors} />
    </group>
  )
}
