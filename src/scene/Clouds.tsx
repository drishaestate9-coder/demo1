import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearMipmapLinearFilter,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
  type Mesh,
} from 'three'
import type { SceneColors } from '../config/types'
import { journey } from '../lib/journey'
import { generateClouds } from './lib/cloudLayout'
import { createRng } from './lib/noise'
import { SUN_DIRECTION } from './lib/layout'

/** Paints a soft, cauliflower-edged cloud puff: RGB = inner lighting, A = density. */
function createPuffTexture(seed: number) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const rng = createRng(seed)
  ctx.clearRect(0, 0, size, size)
  const blobs = 34
  for (let i = 0; i < blobs; i++) {
    const a = rng() * Math.PI * 2
    const d = Math.pow(rng(), 0.7) * size * 0.23
    const x = size / 2 + Math.cos(a) * d
    // flatter underside: blobs sit higher, fewer below the centre line
    const y = size / 2 + Math.sin(a) * d * (Math.sin(a) > 0 ? 0.45 : 0.9)
    const r = size * (0.09 + rng() * 0.12)
    // light from above: bright core offset upward, denser rim
    const g = ctx.createRadialGradient(x, y - r * 0.45, r * 0.05, x, y, r)
    const lit = 205 + Math.floor(rng() * 50)
    g.addColorStop(0, 'rgba(255,255,255,0.7)')
    g.addColorStop(0.4, `rgba(${lit},${lit},${lit},0.55)`)
    g.addColorStop(0.75, 'rgba(170,170,170,0.22)')
    g.addColorStop(1, 'rgba(150,150,150,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // keep sprite edges invisible
  ctx.globalCompositeOperation = 'destination-in'
  const mask = ctx.createRadialGradient(size / 2, size / 2, size * 0.22, size / 2, size / 2, size * 0.5)
  mask.addColorStop(0, 'rgba(0,0,0,1)')
  mask.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = mask
  ctx.fillRect(0, 0, size, size)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.minFilter = LinearMipmapLinearFilter
  tex.generateMipmaps = true
  return tex
}

/**
 * A vast soft cloud floor beneath the puffs so the sea never shows gaps:
 * animated fbm noise shaded lavender -> blush, fading into the horizon haze.
 */
function CloudFloor({ colors }: { colors: SceneColors }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uLight: { value: new Color(colors.cloudLight) },
          uShadow: { value: new Color(colors.cloudShadow) },
          uHaze: { value: new Color(colors.skyHorizon).lerp(new Color(colors.fog), 0.5) },
          uTime: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uLight;
          uniform vec3 uShadow;
          uniform vec3 uHaze;
          uniform float uTime;
          varying vec3 vWorld;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p); vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
          }
          float fbm(vec2 p) {
            float s = 0.0, a = 0.5;
            for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; }
            return s;
          }
          void main() {
            vec2 p = vWorld.xz * 0.012 + vec2(uTime * 0.004, 0.0);
            float n = fbm(p);
            float billow = smoothstep(0.35, 0.75, n);
            vec3 col = mix(uShadow, uLight, billow * 0.85 + 0.1);
            float d = distance(cameraPosition.xz, vWorld.xz);
            float haze = 1.0 - exp(-d * 0.0019);
            col = mix(col, uHaze, clamp(haze * 0.8, 0.0, 0.72));
            float edge = 1.0 - smoothstep(700.0, 900.0, d);
            gl_FragColor = vec4(col, edge);
            #include <colorspace_fragment>
          }
        `,
      }),
    [colors],
  )
  useEffect(() => () => material.dispose(), [material])
  useFrame((state) => {
    material.uniforms.uTime.value = journey.reducedMotion ? 0 : state.clock.elapsedTime
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -30, -400]} material={material} renderOrder={1}>
      <planeGeometry args={[2000, 1000, 1, 1]} />
    </mesh>
  )
}

export function Clouds({ seed, colors }: { seed: number; colors: SceneColors }) {
  const puffs = useMemo(() => generateClouds(seed), [seed])
  const count = puffs.length
  const texture = useMemo(() => createPuffTexture(seed + 101), [seed])

  const { geometry, attrs } = useMemo(() => {
    const plane = new PlaneGeometry(1, 1)
    const geo = new InstancedBufferGeometry()
    geo.index = plane.index
    geo.setAttribute('position', plane.getAttribute('position'))
    geo.setAttribute('uv', plane.getAttribute('uv'))
    const offset = new InstancedBufferAttribute(new Float32Array(count * 3), 3)
    const data = new InstancedBufferAttribute(new Float32Array(count * 4), 4) // scale, shade, alpha, rotation
    geo.setAttribute('aOffset', offset)
    geo.setAttribute('aData', data)
    geo.instanceCount = count
    return { geometry: geo, attrs: { offset, data } }
  }, [count])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uMap: { value: texture },
          uLight: { value: new Color(colors.cloudLight) },
          uShadow: { value: new Color(colors.cloudShadow) },
          uHaze: { value: new Color(colors.skyHorizon).lerp(new Color(colors.fog), 0.5) },
          uSun: { value: new Color(colors.sunGlow) },
          uSunDir: { value: SUN_DIRECTION.clone() },
          uTime: { value: 0 },
          uOpacity: { value: 1 },
        },
        vertexShader: /* glsl */ `
          attribute vec3 aOffset;
          attribute vec4 aData;
          uniform float uTime;
          varying vec2 vUv;
          varying float vShade;
          varying float vAlpha;
          varying float vDist;
          varying float vLocalY;
          varying vec3 vWorld;
          void main() {
            float scale = aData.x;
            float rot = aData.w + uTime * 0.01 * (fract(aData.w * 3.7) - 0.5);
            vec2 c = position.xy;
            vec2 r = vec2(c.x * cos(rot) - c.y * sin(rot), c.x * sin(rot) + c.y * cos(rot)) * scale;
            vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
            vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
            vec3 drift = vec3(sin(uTime * 0.03 + aOffset.z * 0.01) * 2.0, 0.0, 0.0);
            vec3 world = aOffset + drift + right * r.x + up * r.y;
            vWorld = world;
            vUv = uv;
            vShade = aData.y;
            vLocalY = c.y * 2.0;
            vDist = distance(cameraPosition, aOffset);
            // fade puffs the camera is about to pass through
            vAlpha = aData.z * smoothstep(scale * 0.35, scale * 1.1, vDist);
            gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap;
          uniform vec3 uLight;
          uniform vec3 uShadow;
          uniform vec3 uHaze;
          uniform vec3 uSun;
          uniform vec3 uSunDir;
          uniform float uOpacity;
          varying vec2 vUv;
          varying float vShade;
          varying float vAlpha;
          varying float vDist;
          varying float vLocalY;
          varying vec3 vWorld;
          void main() {
            vec4 tex = texture2D(uMap, vUv);
            float a = tex.a * vAlpha * uOpacity;
            if (a < 0.003) discard;
            float h = clamp(vShade + vLocalY * 0.32, 0.0, 1.0);
            vec3 col = mix(uShadow, uLight, smoothstep(0.02, 0.95, h));
            col *= mix(0.78, 1.1, tex.r);
            // back-lit silver lining towards the low sun
            vec3 v = normalize(vWorld - cameraPosition);
            float sunF = pow(max(dot(v, normalize(uSunDir)), 0.0), 10.0);
            col += uSun * sunF * (1.0 - tex.a) * 0.9;
            // atmospheric perspective
            // warm blush on sunlit crowns
            col += uSun * pow(h, 3.0) * 0.18;
            float haze = 1.0 - exp(-vDist * 0.0016);
            col = mix(col, uHaze, clamp(haze * 0.75, 0.0, 0.6));
            gl_FragColor = vec4(col, a);
            #include <colorspace_fragment>
          }
        `,
      }),
    [texture, colors],
  )

  const meshRef = useRef<Mesh>(null)
  const order = useMemo(() => new Uint32Array(count).map((_, i) => i), [count])
  const dist = useMemo(() => new Float32Array(count), [count])
  const lastCam = useMemo(() => new Vector3(1e9, 0, 0), [])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
      texture.dispose()
    },
    [geometry, material, texture],
  )

  useFrame((state) => {
    material.uniforms.uTime.value = journey.reducedMotion ? 0 : state.clock.elapsedTime
    // Clouds are only glimpsed through the opening at first; skip sorting
    // until the camera has moved noticeably.
    const cam = state.camera.position
    if (cam.distanceToSquared(lastCam) < 0.04) return
    lastCam.copy(cam)
    for (let i = 0; i < count; i++) dist[i] = puffs[i].position.distanceToSquared(cam)
    const sorted = Array.from(order).sort((a, b) => dist[b] - dist[a])
    const o = attrs.offset.array as Float32Array
    const d = attrs.data.array as Float32Array
    for (let k = 0; k < count; k++) {
      const p = puffs[sorted[k]]
      o[k * 3] = p.position.x
      o[k * 3 + 1] = p.position.y
      o[k * 3 + 2] = p.position.z
      d[k * 4] = p.scale
      d[k * 4 + 1] = p.shade
      d[k * 4 + 2] = p.alpha
      d[k * 4 + 3] = p.rotation
    }
    attrs.offset.needsUpdate = true
    attrs.data.needsUpdate = true
  })

  return (
    <>
      <CloudFloor colors={colors} />
      <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />
    </>
  )
}
