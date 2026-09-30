import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshStandardMaterial,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  type IUniform,
} from 'three'

/**
 * Rock: standard PBR material plus a baked per-vertex `aGlow` emissive term
 * (crystal + portal light, computed in caveWorld.ts) and a subtle procedural
 * micro-relief so the stone reads as rough up close.
 */
export function createRockMaterial() {
  const uniforms = { uGlowStrength: { value: 1 } as IUniform<number> }
  const mat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0 })
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uGlowStrength = uniforms.uGlowStrength
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aGlow;\nvarying vec3 vGlow;\nvarying vec3 vWorldPos;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvGlow = aGlow;\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vGlow;
varying vec3 vWorldPos;
uniform float uGlowStrength;
float hash13(vec3 p3) {
  p3 = fract(p3 * .1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float grain = vnoise(vWorldPos * 3.1) * 0.6 + vnoise(vWorldPos * 9.7) * 0.4;
diffuseColor.rgb *= 0.72 + grain * 0.5;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vGlow * uGlowStrength * (0.85 + grain * 0.3);',
      )
  }
  return { material: mat, uniforms }
}

/**
 * Crystals: faceted, self-lit shader with an inner gradient that brightens
 * towards the tip, a fresnel rim, and a slow shimmer per instance.
 * Tips and rims exceed 1.0 so the bloom pass picks them up.
 */
export function createCrystalMaterial() {
  const uniforms = UniformsUtils.merge([
    UniformsLib.fog,
    {
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uLightDir: { value: [0.1, 0.35, -1] },
    },
  ])
  return new ShaderMaterial({
    uniforms,
    fog: true,
    vertexShader: /* glsl */ `
      attribute float aH;
      attribute float aPhase;
      varying vec3 vColor;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      varying float vH;
      varying float vPhase;
      #include <fog_pars_vertex>
      void main() {
        mat4 im = instanceMatrix;
        vec4 world = modelMatrix * im * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * mat3(im) * normal);
        vViewDir = normalize(cameraPosition - world.xyz);
        vH = aH;
        #ifdef USE_INSTANCING_COLOR
          vColor = instanceColor;
        #else
          vColor = vec3(0.7, 0.5, 1.0);
        #endif
        vPhase = aPhase;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uLightDir;
      varying vec3 vColor;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      varying float vH;
      varying float vPhase;
      #include <fog_pars_fragment>
      void main() {
        vec3 n = normalize(vNormalW);
        if (!gl_FrontFacing) n = -n;
        vec3 v = normalize(vViewDir);
        float ndv = abs(dot(n, v));
        float fres = pow(1.0 - ndv, 2.2);
        float facet = 0.5 + 0.5 * dot(n, normalize(uLightDir));
        float shimmer = 0.82 + 0.18 * sin(uTime * 1.1 + vPhase * 6.2831);
        // translucent body: dark core at the base, luminous towards the tip
        vec3 deep = vColor * vColor * 0.12;
        float grad = smoothstep(0.0, 1.0, vH);
        vec3 body = mix(deep, vColor * 0.8, grad * 0.7 + facet * 0.25);
        // internal refraction streaks
        float streak = smoothstep(0.6, 1.0, sin(vH * 15.0 + vPhase * 11.0) * 0.5 + 0.5) * 0.22;
        vec3 col = body + vColor * streak * grad;
        col += mix(vColor, vec3(1.0), 0.25) * fres * 1.1;
        col += vColor * smoothstep(0.66, 1.0, vH) * 1.3;
        col += vec3(1.0, 0.95, 1.0) * pow(facet, 24.0) * 0.45;
        col *= shimmer * uIntensity;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  })
}

/** Grass / fern tufts: darker at the root, lighter at the tips. */
export function createTuftMaterial() {
  const mat = new MeshStandardMaterial({ roughness: 0.8, metalness: 0, side: DoubleSide })
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aShade;\nvarying float vShade;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShade = aShade;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vShade;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.25, 1.35, vShade);')
  }
  return mat
}

/** Additive, soft light shaft (used for rays falling through the opening). */
export function createShaftMaterial(color: Color) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: {
      uColor: { value: color },
      uOpacity: { value: 0.18 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vFacing;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vec3 n = normalize(mat3(modelMatrix) * normal);
        vFacing = abs(dot(n, normalize(cameraPosition - world.xyz)));
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;
      varying float vFacing;
      void main() {
        float along = smoothstep(0.0, 0.75, vUv.y) * (1.0 - smoothstep(0.9, 1.0, vUv.y));
        float across = sin(vUv.x * 3.14159);
        across *= across;
        float flicker = 0.85 + 0.15 * sin(uTime * 0.6 + vUv.x * 12.0);
        float a = along * across * vFacing * uOpacity * flicker;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
  })
}
