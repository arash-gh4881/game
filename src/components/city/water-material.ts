/**
 * water-material.ts
 * ─────────────────────────────────────────────────────────────
 * متریال شیدر آب با موج سینوسی — برای رودخانه، سطح مخازن و حوضچه‌ها.
 * Procedural wave-shader water used by river, tanks & clarifier pools.
 * ─────────────────────────────────────────────────────────────
 */
import * as THREE from 'three'

export function createWaterMaterial(
  shallow: string,
  deep: string,
  opacity = 0.95,
  waveAmp = 0.06,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color(shallow) },
      uDeep: { value: new THREE.Color(deep) },
      uOpacity: { value: opacity },
      uAmp: { value: waveAmp },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uAmp;
      varying vec2 vUv;
      varying float vWave;

      void main() {
        vUv = uv;
        vec3 p = position;
        float w = sin(p.x * 1.6 + uTime * 1.4) * 0.55
                + sin(p.y * 2.6 - uTime * 1.05) * 0.45
                + sin((p.x + p.y) * 3.4 + uTime * 2.1) * 0.22;
        p.z += w * uAmp;
        vWave = w;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uShallow;
      uniform vec3 uDeep;
      uniform float uOpacity;
      varying vec2 vUv;
      varying float vWave;

      void main() {
        float m = smoothstep(-1.1, 1.1, vWave);
        vec3 col = mix(uDeep, uShallow, m * 0.85 + 0.1);
        // برق سطحی ملایم
        float spec = pow(max(vWave, 0.0), 6.0) * 0.25;
        col += vec3(spec);
        gl_FragColor = vec4(col, uOpacity);
      }
    `,
  })
}
