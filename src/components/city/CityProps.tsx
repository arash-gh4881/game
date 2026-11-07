'use client'

/**
 * CityProps.tsx
 * ─────────────────────────────────────────────────────────────
 * عناصر شهری: خانه‌های کم‌پلی با پنجره‌های شب‌تاب، درختان
 * پویا (سرسبز ↔ پژمرده بر اساس خشکسالی و ذخیره آب)، بوته‌ها
 * و چراغ‌های خیابانی با روشنایی خودکار در شب.
 *
 * Low-poly houses with night-glowing windows, dynamic trees
 * (lush ↔ withered by drought/reserve), bushes & street lamps.
 * ─────────────────────────────────────────────────────────────
 */
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useCityStore } from '@/lib/city-store'
import { dayState } from './Weather'

const LUSH = new THREE.Color('#3f9254')
const DRY = new THREE.Color('#a37b45')

/* ─────────────────────────────── خانه‌ها (Houses) ─────────────────────────────── */

const HOUSE_ROW1_X = [-8, -4.5, -1, 2.5, 6, 9.5]
const HOUSE_ROW2_X = [-6.25, -2.75, 0.75, 4.25, 7.75, 11]

const HOUSE_COLORS = ['#e8d5b0', '#dfc09a', '#d8cba8', '#e3cfae', '#d9c294', '#ecdcbd']

function House({
  x,
  z,
  variant,
}: {
  x: number
  z: number
  variant: number
}) {
  const windowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffe9b8',
        emissive: new THREE.Color('#ffd88a'),
        emissiveIntensity: 0,
      }),
    [],
  )

  useFrame(() => {
    windowMat.emissiveIntensity = dayState.night * 1.4
  })

  const w = 1.15 + (variant % 3) * 0.12
  const h = 0.75 + (variant % 2) * 0.16
  const roofH = 0.45 + (variant % 3) * 0.08

  return (
    <group position={[x, 0, z]} rotation={[0, variant % 2 ? Math.PI : 0, 0]}>
      {/* بدنه */}
      <mesh position={[0, h / 2 + 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, 0.95]} />
        <meshStandardMaterial color={HOUSE_COLORS[variant % HOUSE_COLORS.length]} roughness={0.9} />
      </mesh>
      {/* سقف هرمی */}
      <mesh position={[0, h + 0.1 + roofH / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[w * 0.82, roofH, 4]} />
        <meshStandardMaterial color="#a85f4c" roughness={0.85} />
      </mesh>
      {/* در */}
      <mesh position={[0, 0.33, 0.48]}>
        <boxGeometry args={[0.24, 0.42, 0.03]} />
        <meshStandardMaterial color="#6b4a36" />
      </mesh>
      {/* دو پنجره شب‌تاب */}
      <mesh position={[-w / 4, h / 2 + 0.22, 0.48]}>
        <boxGeometry args={[0.22, 0.2, 0.02]} />
        <primitive object={windowMat} attach="material" />
      </mesh>
      <mesh position={[w / 4, h / 2 + 0.22, 0.48]}>
        <boxGeometry args={[0.22, 0.2, 0.02]} />
        <primitive object={windowMat} attach="material" />
      </mesh>
    </group>
  )
}

/* ──────────────── درختان پویا (سرسبز ↔ پژمرده) ──────────────── */

const TREE_SPOTS: Array<[number, number, number]> = [
  [-8.5, 0, 3.4],
  [-5.5, 0, 3.6],
  [-2, 0, 3.5],
  [1.5, 0, 3.7],
  [5, 0, 3.5],
  [8.5, 0, 3.6],
  [11.5, 0, 3.4],
  [-9.5, 0, -1.5],
  [-9.8, 0, 1.2],
  [9.8, 0, -1.8],
  [10.2, 0, 1.4],
  [-8, 0, -10.8],
  [-1.5, 0, -11],
  [5.5, 0, -10.9],
  [10, 0, -10.6],
]

function Tree({
  x,
  z,
  variant,
  wither,
}: {
  x: number
  z: number
  variant: number
  wither: number
}) {
  const foliageRef = useRef<THREE.Group>(null)
  const colorTmp = useMemo(() => new THREE.Color(), [])
  const scaleTmp = useMemo(() => new THREE.Vector3(), [])
  const s = 0.85 + (variant % 4) * 0.09

  useFrame(() => {
    if (!foliageRef.current) return
    foliageRef.current.children.forEach((child) => {
      const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
      if (m && m.color) {
        colorTmp.copy(LUSH).lerp(DRY, wither)
        m.color.lerp(colorTmp, 0.06)
      }
    })
    /* پژمردگی: کمی کوچک‌شدن */
    const targetScale = s * (1 - wither * 0.18)
    scaleTmp.set(targetScale, targetScale, targetScale)
    foliageRef.current.scale.lerp(scaleTmp, 0.05)
  })

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.56, 7]} />
        <meshStandardMaterial color="#7a5233" roughness={0.95} />
      </mesh>
      <group ref={foliageRef}>
        <mesh position={[0, 0.75 + (variant % 2) * 0.08, 0]} castShadow>
          <sphereGeometry args={[0.42, 10, 8]} />
          <meshStandardMaterial color="#3f9254" roughness={0.95} flatShading />
        </mesh>
        <mesh position={[0.18, 1.02, 0.1]} castShadow>
          <sphereGeometry args={[0.26, 9, 7]} />
          <meshStandardMaterial color="#48a560" roughness={0.95} flatShading />
        </mesh>
        {variant % 3 === 0 && (
          <mesh position={[-0.16, 1.05, -0.08]} castShadow>
            <sphereGeometry args={[0.22, 9, 7]} />
            <meshStandardMaterial color="#357d47" roughness={0.95} flatShading />
          </mesh>
        )}
      </group>
    </group>
  )
}

/* ──────────────── چراغ خیابانی (نور خودکار شب) ──────────────── */

const LAMP_SPOTS: Array<[number, number]> = [
  [-6, -4.2],
  [-2, -4.2],
  [2, -4.2],
  [6, -4.2],
  [-4.5, -9],
  [3.5, -9],
]

function Lamp({ x, z }: { x: number; z: number }) {
  const bulbMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#fff7d6',
        emissive: new THREE.Color('#ffd985'),
        emissiveIntensity: 0,
      }),
    [],
  )
  useFrame(() => {
    bulbMat.emissiveIntensity = dayState.night * 2.2
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 1.1, 6]} />
        <meshStandardMaterial color="#52565c" />
      </mesh>
      <mesh position={[0.14, 1.12, 0]} rotation={[0, 0, -0.35]}>
        <cylinderGeometry args={[0.025, 0.025, 0.32, 6]} />
        <meshStandardMaterial color="#52565c" />
      </mesh>
      <mesh position={[0.24, 1.18, 0]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <primitive object={bulbMat} attach="material" />
      </mesh>
    </group>
  )
}

/* ─────────────────────────── بوته‌ها و تزئینات ─────────────────────────── */

const BUSH_SPOTS: Array<[number, number]> = [
  [-9, 2.4],
  [-6.8, 2.6],
  [3.4, 2.5],
  [7.2, 2.6],
  [10.8, 2.3],
  [-9.2, -4.1],
  [11.6, -4.1],
]

function Bush({ x, z, wither }: { x: number; z: number; wither: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const tmp = useMemo(() => new THREE.Color(), [])
  useFrame(() => {
    if (!ref.current) return
    const m = ref.current.material as THREE.MeshStandardMaterial
    tmp.copy(LUSH).lerp(DRY, wither)
    m.color.lerp(tmp, 0.05)
  })
  return (
    <mesh ref={ref} position={[x, 0.16, z]} castShadow>
      <sphereGeometry args={[0.2, 8, 6]} />
      <meshStandardMaterial color="#4a9a5c" roughness={1} flatShading />
    </mesh>
  )
}

/* ──────────── فواره میدان با آب متحرک (Fountain Plaza) ──────────── */

function Fountain({ x, z }: { x: number; z: number }) {
  const jetRef = useRef<THREE.Mesh>(null)
  const rippleRef = useRef<THREE.Mesh>(null)
  const waterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8fd8ef',
        transparent: true,
        opacity: 0.85,
        roughness: 0.25,
        metalness: 0.1,
      }),
    [],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    /* ستون آب با کشش پالس‌دار */
    if (jetRef.current) {
      const s = 1 + Math.sin(t * 3.2) * 0.22
      jetRef.current.scale.set(1, s, 1)
      jetRef.current.position.y = 0.62 + (s * 0.5) / 2
    }
    /* موج حلقه‌ای حوض */
    if (rippleRef.current) {
      const rs = 0.35 + ((t * 0.55) % 1) * 0.85
      rippleRef.current.scale.set(rs, rs, 1)
      ;(rippleRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.5 * (1 - ((t * 0.55) % 1))
    }
  })

  return (
    <group position={[x, 0, z]}>
      {/* کف میدان */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[2.3, 2.4, 0.06, 28]} />
        <meshStandardMaterial color="#d8cfae" roughness={0.95} />
      </mesh>
      {/* بدنه حوض */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.15, 1.25, 0.44, 24]} />
        <meshStandardMaterial color="#b8b0a0" roughness={0.9} />
      </mesh>
      {/* آب حوض */}
      <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.02, 24]} />
        <primitive object={waterMat} attach="material" />
      </mesh>
      {/* حلقه موج */}
      <mesh ref={rippleRef} position={[0, 0.415, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.4, 24]} />
        <meshBasicMaterial color="#eafcff" transparent opacity={0.4} depthWrite={false} />
      </mesh>
      {/* ستون میانی و کاسه بالا */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 0.5, 10]} />
        <meshStandardMaterial color="#a8a090" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.86, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.1, 0.18, 14]} />
        <meshStandardMaterial color="#b8b0a0" roughness={0.85} />
      </mesh>
      {/* ستون آب */}
      <mesh ref={jetRef} position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.07, 0.045, 1, 8]} />
        <meshStandardMaterial color="#bfeaf8" transparent opacity={0.75} roughness={0.2} />
      </mesh>
    </group>
  )
}

/* ──────────────────── نیمکت پارک (Park Bench) ──────────────────── */

function Bench({ x, z, ry }: { x: number; z: number; ry?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, ry ?? 0, 0]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.85, 0.07, 0.32]} />
        <meshStandardMaterial color="#9a6b42" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.52, -0.13]} rotation={[-0.22, 0, 0]} castShadow>
        <boxGeometry args={[0.85, 0.26, 0.05]} />
        <meshStandardMaterial color="#9a6b42" roughness={0.9} />
      </mesh>
      {[-0.34, 0.34].map((dx) => (
        <mesh key={dx} position={[dx, 0.14, 0]}>
          <boxGeometry args={[0.07, 0.28, 0.28]} />
          <meshStandardMaterial color="#5d5a55" metalness={0.3} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/* ─────────────── تپه‌های دورافتاده برای عمق افق (Distant Hills) ─────────────── */

const HILLS: Array<[number, number, number, string]> = [
  [-17.5, -14, 4.2, '#6f9e50'],
  [16.5, -16, 5.0, '#7fae58'],
  [-19.5, 9, 3.6, '#6f9e50'],
  [19, 11.5, 4.6, '#7fae58'],
  [1.5, -18.5, 3.2, '#84b25c'],
]

function DistantHills() {
  return (
    <group>
      {HILLS.map(([x, z, r, c], i) => (
        <mesh key={i} position={[x, 0, z]} scale={[1, 0.38, 1]}>
          <sphereGeometry args={[r, 14, 10]} />
          <meshStandardMaterial color={c} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/* ─────────────────────────────── کامپوننت اصلی ─────────────────────────────── */

export default function CityProps() {
  const weather = useCityStore((s) => s.weather)
  const reserve = useCityStore((s) => s.reserve)

  /* ضریب پژمردگی: خشکسالی/گرما کامل، ذخیره کم نیمه */
  const wither =
    weather === 'drought' ? 1 : weather === 'heat' ? 0.8 : reserve < 25 ? 0.55 : 0

  return (
    <group>
      {/* دو ردیف خانه */}
      {HOUSE_ROW1_X.map((x, i) => (
        <House key={`h1-${i}`} x={x} z={-6.6} variant={i} />
      ))}
      {HOUSE_ROW2_X.map((x, i) => (
        <House key={`h2-${i}`} x={x} z={-10.1} variant={i + 3} />
      ))}
      {/* درختان */}
      {TREE_SPOTS.map(([x, , z], i) => (
        <Tree key={`t-${i}`} x={x} z={z} variant={i} wither={wither} />
      ))}
      {/* بوته‌ها */}
      {BUSH_SPOTS.map(([x, z], i) => (
        <Bush key={`b-${i}`} x={x} z={z} wither={wither} />
      ))}
      {/* چراغ‌های خیابانی */}
      {LAMP_SPOTS.map(([x, z], i) => (
        <Lamp key={`l-${i}`} x={x} z={z} />
      ))}
      {/* تپه‌های دورافتاده */}
      <DistantHills />
      {/* میدان فواره و نیمکت‌ها */}
      <Fountain x={13.2} z={0.8} />
      <Bench x={10.4} z={2.4} ry={Math.PI / 2.4} />
      <Bench x={12.1} z={3.3} ry={-0.4} />
      <Bench x={-4.2} z={4.7} ry={Math.PI} />
      <Bench x={8.6} z={4.7} ry={Math.PI} />
    </group>
  )
}
