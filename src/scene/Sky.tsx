import { useMemo } from 'react'
import { BackSide, Color, ShaderMaterial } from 'three'
import type { SceneColors } from '../config/types'
import { SUN_DIRECTION } from './lib/layout'

/**
 * Pastel dreamcore sky: periwinkle zenith, lavender middle band, blush
 * horizon and a soft low sun that haloes the distant citadel.
 */
export function Sky({ colors }: { colors: SceneColors }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uZenith: { value: new Color(colors.skyZenith) },
          uMid: { value: new Color(colors.skyMid) },
          uHorizon: { value: new Color(colors.skyHorizon) },
          uBelow: { value: new Color(colors.cloudShadow) },
          uSun: { value: new Color(colors.sunGlow) },
          uSunDir: { value: SUN_DIRECTION.clone() },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uZenith;
          uniform vec3 uMid;
          uniform vec3 uHorizon;
          uniform vec3 uBelow;
          uniform vec3 uSun;
          uniform vec3 uSunDir;
          varying vec3 vDir;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          void main() {
            vec3 d = normalize(vDir);
            float e = d.y;
            vec3 col = mix(uHorizon, uMid, smoothstep(-0.02, 0.22, e));
            col = mix(col, uZenith, smoothstep(0.1, 0.58, e));
            col = mix(col, mix(uHorizon, uBelow, 0.55), smoothstep(0.0, -0.25, e));
            float s = max(dot(d, normalize(uSunDir)), 0.0);
            col += uSun * (pow(s, 6.0) * 0.16 + pow(s, 40.0) * 0.28 + pow(s, 900.0) * 0.9);
            // faint high veil of stars
            vec2 g = floor(d.xz / max(d.y, 0.05) * 90.0);
            float star = step(0.9975, hash(g)) * smoothstep(0.35, 0.8, e) * 0.35;
            col += vec3(star);
            // gentle dithering to avoid banding in the gradients
            col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [colors],
  )
  return (
    <mesh material={material} frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[900, 48, 24]} />
    </mesh>
  )
}
