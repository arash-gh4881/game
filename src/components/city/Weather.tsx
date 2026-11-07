'use client'

/**
 * Weather.tsx
 * ─────────────────────────────────────────────────────────────
 * سیستم پویا شب/روز + آب‌وهوای رویدادمحور:
 * خورشید متحرک، رنگ آسمان/مه، بارش باران در سیل، تینت خشکسالی/گرما.
 * فکتور شب در dayState برای روشن‌شدن پنجره‌ها و چراغ‌ها اشتراک‌گذاری می‌شود.
 *
 * Dynamic day/night + event-driven weather sky, animated sun,
 * fog, rain particle system; exports shared night factor.
 * ─────────────────────────────────────────────────────────────
 */
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useCityStore } from '@/lib/city-store'
import type { WeatherKind } from '@/lib/city-config'

/** فکتور شب مشترک (0 = روز، 1 = شب) — توسط CityProps خوانده می‌شود */
export const dayState = { night: 0 }

/** هندل دیباگ برای پرش زمانی در تست‌ها */
export const dayDebug = {
  setT: (_v: number) => {},
  freeze: false,
}

const SKY_DAY = new THREE.Color('#9fd4e8')
const SKY_SUNSET = new THREE.Color('#f2a65e')
const SKY_NIGHT = new THREE.Color('#16213e')

const WEATHER_TINT: Record<WeatherKind, { sky: THREE.Color; fog: string; amb: number; sun: number }> = {
  clear: { sky: new THREE.Color('#9fd4e8'), fog: '#b8dbe8', amb: 0.55, sun: 1.35 },
  drought: { sky: new THREE.Color('#e3b95f'), fog: '#e8cf8e', amb: 0.62, sun: 1.7 },
  heat: { sky: new THREE.Color('#f0cf96'), fog: '#f2ddb0', amb: 0.66, sun: 1.85 },
  flood: { sky: new THREE.Color('#5c6b7a'), fog: '#6e7f8d', amb: 0.4, sun: 0.35 },
}

const RAIN_COUNT = 320

function Rain() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const drops = useMemo(
    () =>
      Array.from({ length: RAIN_COUNT }, () => ({
        x: (Math.random() - 0.5) * 30,
        y: Math.random() * 16,
        z: (Math.random() - 0.5) * 30,
        v: 14 + Math.random() * 8,
      })),
    [],
  )

  useFrame((_, dt) => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < RAIN_COUNT; i++) {
      const d = drops[i]
      d.y -= d.v * dt
      if (d.y < 0) {
        d.y = 14 + Math.random() * 3
        d.x = (Math.random() - 0.5) * 30
        d.z = (Math.random() - 0.5) * 30
      }
      dummy.position.set(d.x, d.y, d.z)
      dummy.rotation.set(0.16, 0, 0.1)
      dummy.scale.set(0.035, 0.55, 0.035)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, RAIN_COUNT]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#aebfd4" transparent opacity={0.55} />
    </instancedMesh>
  )
}

export default function Weather({ mode }: { mode: WeatherKind }) {
  const { scene } = useThree()
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const ambRef = useRef<THREE.AmbientLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const tRef = useRef(0.22) // شروع صبح
  dayDebug.setT = (v: number) => {
    tRef.current = v
  }
  const skyColor = useMemo(() => new THREE.Color(SKY_DAY), [])
  const tmp = useMemo(() => new THREE.Color(), [])

  useEffect(() => {
    scene.background = new THREE.Color(SKY_DAY)
    scene.fog = new THREE.Fog('#b8dbe8', 55, 130)
    ;(window as unknown as Record<string, unknown>).__scene = scene
    return () => {
      scene.background = null
      scene.fog = null
    }
  }, [scene])

  useFrame((_, dt) => {
    /* چرخه شبانه‌روز ~۷۵ ثانیه */
    if (!dayDebug.freeze) tRef.current = (tRef.current + dt / 75) % 1
    const a = tRef.current * Math.PI * 2
    const sunH = Math.sin(a) // ارتفاع خورشید -1..1
    const dayF = THREE.MathUtils.smoothstep(sunH, -0.18, 0.3)
    const dayF2 = THREE.MathUtils.smoothstep(sunH, 0.2, 0.75)
    dayState.night = 1 - dayF

    /* رنگ پایه آسمان: شب ← غروب ← روز */
    skyColor.copy(SKY_NIGHT).lerp(SKY_SUNSET, dayF)
    skyColor.lerp(SKY_DAY, dayF2)

    /* تینت آب‌وهوا */
    const wt = WEATHER_TINT[mode]
    tmp.copy(wt.sky)
    const weatherBlend = mode === 'clear' ? 0.25 : 0.62
    skyColor.lerp(tmp, weatherBlend * (0.4 + 0.6 * dayF))

    if (scene.background instanceof THREE.Color) scene.background.copy(skyColor)
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(skyColor).lerp(new THREE.Color(wt.fog), 0.45)
      scene.fog.near = mode === 'flood' ? 38 : 55
    }

    /* خورشید متحرک */
    const sun = sunRef.current
    if (sun) {
      sun.position.set(Math.cos(a) * 22, Math.max(4, sunH * 20 + 6), 8 + Math.sin(a) * 6)
      const base = wt.sun
      sun.intensity =
        mode === 'flood' ? 0.3 : base * (0.15 + dayF * 0.85)
      const warm = 1 - dayF
      sun.color.setRGB(1, 0.96 - warm * 0.22, 0.88 - warm * 0.4)
      if (mode === 'drought' || mode === 'heat') sun.color.lerp(new THREE.Color('#ffd9a0'), 0.5)
    }
    if (ambRef.current) {
      ambRef.current.intensity =
        (0.28 + dayF * 0.35) * (mode === 'flood' ? 1.15 : 1) * (mode === 'drought' || mode === 'heat' ? 1.12 : 1)
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = 0.25 + dayF * 0.35
    }
  })

  return (
    <>
      <ambientLight ref={ambRef} intensity={0.5} />
      <hemisphereLight ref={hemiRef} args={['#cfe8f5', '#5a5040', 0.4]} />
      <directionalLight
        ref={sunRef}
        position={[14, 20, 8]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
      />
      {mode === 'flood' && <Rain />}
    </>
  )
}
