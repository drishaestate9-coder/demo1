import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  Color,
  DoubleSide,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
  type BufferGeometry,
  type Material,
  type PointLight,
} from 'three'
import type { SceneColors } from '../config/types'
import { journey } from '../lib/journey'
import { createLeafGeometry, generateCaveWorld, type InstanceData } from './lib/caveWorld'
import { createCrystalGeometry, createRockGeometry, createTuftGeometry } from './lib/geometry'
import { createNoise3D } from './lib/noise'
import { createCrystalMaterial, createRockMaterial, createTuftMaterial } from './materials'

interface CaveProps {
  seed: number
  colors: SceneColors
}

function Instances({
  data,
  geometry,
  material,
  castShadow = false,
  withPhase = false,
}: {
  data: InstanceData
  geometry: BufferGeometry
  material: Material
  castShadow?: boolean
  withPhase?: boolean
}) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    mesh.instanceMatrix.array.set(data.matrices)
    mesh.instanceMatrix.needsUpdate = true
    mesh.instanceColor = new InstancedBufferAttribute(data.colors, 3)
    if (withPhase && data.phases) geometry.setAttribute('aPhase', new InstancedBufferAttribute(data.phases, 1))
    mesh.computeBoundingSphere()
  }, [data, geometry, withPhase])
  if (!data.count) return null
  return <instancedMesh ref={ref} args={[geometry, material, data.count]} castShadow={castShadow} frustumCulled={false} />
}

/**
 * The crystal cave: rock shell, foreground rocks, crystals, vegetation,
 * vines and the local lights that make the crystals feel luminous.
 */
export function Cave({ seed, colors }: CaveProps) {
  const world = useMemo(() => generateCaveWorld(seed, colors), [seed, colors])

  const rock = useMemo(() => createRockMaterial(), [])
  const crystalMat = useMemo(() => createCrystalMaterial(), [])
  const crystalGeo = useMemo(() => createCrystalGeometry(), [])
  const tuftGeo = useMemo(() => createTuftGeometry(7), [])
  const tuftMat = useMemo(() => createTuftMaterial(), [])
  const stoneGeo = useMemo(
    () => createRockGeometry(createNoise3D(seed + 3), { radius: new Vector3(1, 1, 1), detail: 3, flattenBottom: 0.2 }),
    [seed],
  )
  const stoneMat = useMemo(() => new MeshStandardMaterial({ roughness: 0.9, metalness: 0 }), [])
  const budGeo = useMemo(() => new IcosahedronGeometry(1, 1), [])
  const budMat = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), [])
  const leafGeo = useMemo(() => createLeafGeometry(), [])
  const vineMat = useMemo(
    () => new MeshStandardMaterial({ color: new Color(colors.moss).multiplyScalar(0.7), roughness: 0.85, side: DoubleSide }),
    [colors.moss],
  )
  const leafMat = useMemo(() => new MeshStandardMaterial({ roughness: 0.75, side: DoubleSide }), [])

  useEffect(
    () => () => {
      ;[world.shell, world.rocks, world.vines, crystalGeo, tuftGeo, stoneGeo, budGeo, leafGeo].forEach((g) => g.dispose())
      ;[rock.material, crystalMat, tuftMat, stoneMat, budMat, vineMat, leafMat].forEach((m) => m.dispose())
    },
    [world, crystalGeo, tuftGeo, stoneGeo, budGeo, leafGeo, rock, crystalMat, tuftMat, stoneMat, budMat, vineMat, leafMat],
  )

  const lightRefs = useRef<(PointLight | null)[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const calm = journey.reducedMotion ? 0 : 1
    crystalMat.uniforms.uTime.value = t * calm
    // Crystals breathe gently; they fade slightly as we leave the cave.
    const leaving = Math.min(1, Math.max(0, (journey.progress - 0.55) / 0.2))
    crystalMat.uniforms.uIntensity.value = 1 - leaving * 0.25
    rock.uniforms.uGlowStrength.value = 1 + Math.sin(t * 0.7) * 0.05 * calm
    lightRefs.current.forEach((l, i) => {
      if (!l) return
      l.intensity = world.keyLights[i].intensity * (0.9 + Math.sin(t * 1.3 + i * 1.7) * 0.1 * calm)
    })
  })

  return (
    <group>
      <mesh geometry={world.shell} material={rock.material} frustumCulled={false} />
      <mesh geometry={world.rocks} material={rock.material} />
      <Instances data={world.crystals} geometry={crystalGeo} material={crystalMat} withPhase />
      <Instances data={world.stones} geometry={stoneGeo} material={stoneMat} />
      <Instances data={world.tufts} geometry={tuftGeo} material={tuftMat} />
      <Instances data={world.buds} geometry={budGeo} material={budMat} />
      <mesh geometry={world.vines} material={vineMat} />
      <Instances data={world.leaves} geometry={leafGeo} material={leafMat} />
      {world.keyLights.map((l, i) => (
        <pointLight
          key={i}
          ref={(el) => {
            lightRefs.current[i] = el
          }}
          position={l.position}
          color={l.color}
          intensity={l.intensity}
          distance={14}
          decay={1.6}
        />
      ))}
      {/* Light pouring in through the opening */}
      <pointLight position={[0, 6.5, -14.5]} color={colors.portalLight} intensity={8} distance={20} decay={1.5} />
      <pointLight position={[0, 1.8, -9]} color={colors.portalLight} intensity={4} distance={12} decay={1.6} />
    </group>
  )
}
