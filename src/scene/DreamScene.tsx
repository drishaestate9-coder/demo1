import { PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode, type VignetteEffect } from 'postprocessing'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Color } from 'three'
import type { MotionConfig, SceneColors } from '../config/types'
import { journey } from '../lib/journey'
import { Architecture } from './Architecture'
import { Atmosphere } from './Atmosphere'
import { CameraRig } from './CameraRig'
import { Cave } from './Cave'
import { Clouds } from './Clouds'
import { SUN_DIRECTION } from './lib/layout'
import { Sky } from './Sky'

export interface DreamSceneProps {
  seed: number
  colors: SceneColors
  motion: MotionConfig
  active: boolean
  onReady?: () => void
}

/** Signals readiness once a few frames have actually been drawn. */
function ReadySignal({ onReady }: { onReady?: () => void }) {
  const frames = useRef(0)
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    frames.current++
    if (frames.current > 3) {
      done.current = true
      ;(window as unknown as { __dreamReady?: boolean }).__dreamReady = true
      onReady?.()
    }
  })
  return null
}

function Effects({ bloom, multisampling }: { bloom: number; multisampling: number }) {
  const vignette = useRef<VignetteEffect>(null)
  useFrame(() => {
    const p = journey.progress
    // Heavier, darker framing in the cave; airy at the destination.
    const inCave = 1 - Math.min(1, Math.max(0, (p - 0.5) / 0.25))
    if (vignette.current) vignette.current.darkness = 0.28 + inCave * 0.34
  })
  return (
    <EffectComposer multisampling={multisampling}>
      <Bloom mipmapBlur intensity={bloom} luminanceThreshold={0.82} luminanceSmoothing={0.2} radius={0.72} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette ref={vignette} offset={0.22} darkness={0.6} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.03} />
    </EffectComposer>
  )
}

/** Keeps fog + lights in one place so colours stay configurable. */
function Environment({ colors }: { colors: SceneColors }) {
  const scene = useThree((s) => s.scene)
  const sun = useMemo(() => SUN_DIRECTION.clone().multiplyScalar(200), [])
  const hemiSky = useMemo(() => new Color(colors.skyMid), [colors.skyMid])
  const hemiGround = useMemo(() => new Color(colors.rockDark).lerp(new Color(colors.moss), 0.3), [colors.rockDark, colors.moss])
  useEffect(() => {
    scene.background = new Color(colors.skyHorizon)
  }, [scene, colors.skyHorizon])
  return (
    <>
      <fogExp2 attach="fog" args={[colors.fog, 0.0021]} />
      <hemisphereLight args={[hemiSky, hemiGround, 0.32]} />
      <directionalLight position={sun} intensity={0.9} color={colors.sunGlow} />
      <directionalLight position={[0, 60, 120]} intensity={0.35} color={colors.skyMid} />
    </>
  )
}

export function DreamScene({ seed, colors, motion, active, onReady }: DreamSceneProps) {
  const [dpr, setDpr] = useState(1.5)
  const isShot = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('shot')
  const multisampling = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches ? 0 : 4
  return (
    <Canvas
      className="dream-canvas"
      dpr={isShot ? 1 : [1, dpr]}
      frameloop={active ? 'always' : 'never'}
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: isShot }}
      camera={{ fov: 56, near: 0.1, far: 1400, position: [0, 1.9, 10] }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.18
      }}
      aria-hidden
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} flipflops={3} />
      <Environment colors={colors} />
      <Suspense fallback={null}>
        <Sky colors={colors} />
        <Clouds seed={seed} colors={colors} />
        <Architecture colors={colors} />
        <Cave seed={seed} colors={colors} />
        <Atmosphere seed={seed} colors={colors} />
        <ReadySignal onReady={onReady} />
      </Suspense>
      <CameraRig motion={motion} />
      <Effects bloom={motion.bloom} multisampling={multisampling} />
    </Canvas>
  )
}
