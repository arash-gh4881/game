'use client'

/**
 * NPCs.tsx
 * ─────────────────────────────────────────────────────────────
 * تردد پویا روی شبکه جاده حلقه بسته:
 *  • ماشین‌ها در دو لاین مخالف حلقه (راست‌گرد و چپ‌گرد) با
 *    چراغ جلو/عقب در شب — مسیر از خطوط مستقیم + قوس‌های ۹۰°
 *    ساخته می‌شود و هرگز از نقشه خارج نمی‌شوند.
 *  • عابران پیاده روی حلقه پیاده‌روهای محیطی (بیرونی و میانی)
 *    با انیمیشن گام و چرخش در جهت حرکت.
 *
 * Closed-loop traffic: cars run on two opposite ring lanes
 * (clockwise & counter-clockwise, straights + 90° arcs) with
 * night headlights; pedestrians stroll the ring sidewalks —
 * nobody leaves the map anymore.
 * ─────────────────────────────────────────────────────────────
 */
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { dayState } from './Weather'

const CAR_COLORS = ['#e05c5c', '#5cb8e0', '#e0b25c', '#7fd06a', '#c46ad6', '#f0f0f0']

/* ───────────────── هندسه مسیر حلقه بسته (Closed Loop Path) ───────────────── */

interface Seg {
  t: 'line' | 'arc'
  len: number
  /* line */
  x1?: number
  z1?: number
  x2?: number
  z2?: number
  /* arc */
  cx?: number
  cz?: number
  r?: number
  a0?: number
  sweep?: number
}

interface LoopPath {
  segs: Seg[]
  total: number
}

interface Corner {
  p: [number, number]
  a: [number, number]
  b: [number, number]
}

/**
 * ساخت مسیر حلقه مستطیلی با گوشه‌های گرد.
 * راست‌گرد: شرق در z1 ← جنوب در xe ← غرب در z2 ← شمال در xw
 * چپ‌گرد:  شرق در z2 ← شمال در xe ← غرب در z1 ← جنوب در xw
 */
function buildLoop(
  z1: number,
  z2: number,
  xe: number,
  xw: number,
  turn: 'left' | 'right',
  r: number,
): LoopPath {
  const right = turn === 'right'
  const corners: Corner[] = right
    ? [
        { p: [xe, z1], a: [1, 0], b: [0, 1] },
        { p: [xe, z2], a: [0, 1], b: [-1, 0] },
        { p: [xw, z2], a: [-1, 0], b: [0, -1] },
        { p: [xw, z1], a: [0, -1], b: [1, 0] },
      ]
    : [
        { p: [xe, z2], a: [1, 0], b: [0, -1] },
        { p: [xe, z1], a: [0, -1], b: [-1, 0] },
        { p: [xw, z1], a: [-1, 0], b: [0, 1] },
        { p: [xw, z2], a: [0, 1], b: [1, 0] },
      ]

  const arcLen = (Math.PI / 2) * r
  const pts = corners.map((c) => {
    const sx = c.p[0] - c.a[0] * r
    const sz = c.p[1] - c.a[1] * r
    const ex = c.p[0] + c.b[0] * r
    const ez = c.p[1] + c.b[1] * r
    /* نرمال سمت پیچ (داخل قوس) */
    const side: [number, number] = right ? [-c.a[1], c.a[0]] : [c.a[1], -c.a[0]]
    const cx = sx + side[0] * r
    const cz = sz + side[1] * r
    const a0 = Math.atan2(sz - cz, sx - cx)
    return { s: { x: sx, z: sz }, e: { x: ex, z: ez }, arc: { cx, cz, a0 } }
  })

  const segs: Seg[] = []
  for (let i = 0; i < 4; i++) {
    const cur = pts[i]
    const nxt = pts[(i + 1) % 4]
    segs.push({
      t: 'arc',
      len: arcLen,
      cx: cur.arc.cx,
      cz: cur.arc.cz,
      r,
      a0: cur.arc.a0,
      sweep: right ? Math.PI / 2 : -Math.PI / 2,
    })
    const len = Math.hypot(nxt.s.x - cur.e.x, nxt.s.z - cur.e.z)
    if (len > 0.01) {
      segs.push({ t: 'line', len, x1: cur.e.x, z1: cur.e.z, x2: nxt.s.x, z2: nxt.s.z })
    }
  }
  return { segs, total: segs.reduce((sum, s) => sum + s.len, 0) }
}

/** نمونه‌گیری موقعیت + زاویه مماس در طول مسیر (طول کمان) */
function sampleAt(loop: LoopPath, s: number): { x: number; z: number; yaw: number } {
  let u = ((s % loop.total) + loop.total) % loop.total
  for (let i = 0; i < loop.segs.length; i++) {
    const seg = loop.segs[i]
    if (u <= seg.len || i === loop.segs.length - 1) {
      const k = Math.min(u, seg.len)
      if (seg.t === 'line') {
        const f = seg.len > 0 ? k / seg.len : 0
        const dx = seg.x2! - seg.x1!
        const dz = seg.z2! - seg.z1!
        return {
          x: seg.x1! + dx * f,
          z: seg.z1! + dz * f,
          yaw: Math.atan2(-dz, dx),
        }
      }
      const th = seg.a0! + seg.sweep! * (k / seg.len)
      const tx = seg.sweep! > 0 ? -Math.sin(th) : Math.sin(th)
      const tz = seg.sweep! > 0 ? Math.cos(th) : -Math.cos(th)
      return {
        x: seg.cx! + Math.cos(th) * seg.r!,
        z: seg.cz! + Math.sin(th) * seg.r!,
        yaw: Math.atan2(-tz, tx),
      }
    }
    u -= seg.len
  }
  return { x: 0, z: 0, yaw: 0 }
}

/* لاین‌های حلقه — دقیقاً روی لاین‌های موجود جاده‌ها */
const LOOP = {
  /* ماشین‌ها — راست‌گرد (بزرگراه داخلی، پیچ تنگ راست) */
  carCW: buildLoop(-4.75, -8.45, 12.55, -12.55, 'right', 0.3),
  /* ماشین‌ها — چپ‌گرد (پیچ باز چپ) */
  carCCW: buildLoop(-5.65, -7.55, 13.45, -13.45, 'left', 0.88),
  /* عابران — حلقه پیاده‌رو بیرونی */
  pedOuter: buildLoop(-4.25, -8.95, 12.05, -12.05, 'right', 0.35),
  /* عابران — حلقه پیاده‌رو میانی (بین دو خیابان) */
  pedInner: buildLoop(-6.15, -7.05, 13.95, -13.95, 'left', 0.35),
} as const

type LoopKey = keyof typeof LOOP

/* ─────────────────────────────── ماشین‌ها (Cars) ─────────────────────────────── */

interface CarSpec {
  loop: LoopKey
  offset: number // فاز اولیه روی حلقه
  speed: number
  color: string
}

const CARS: CarSpec[] = [
  { loop: 'carCW', offset: 3, speed: 2.5, color: CAR_COLORS[0] },
  { loop: 'carCW', offset: 23, speed: 2.56, color: CAR_COLORS[1] },
  { loop: 'carCW', offset: 43, speed: 2.44, color: CAR_COLORS[2] },
  { loop: 'carCCW', offset: 9, speed: 2.85, color: CAR_COLORS[3] },
  { loop: 'carCCW', offset: 30, speed: 2.9, color: CAR_COLORS[4] },
  { loop: 'carCCW', offset: 51, speed: 2.79, color: CAR_COLORS[5] },
]

function Car({ spec }: { spec: CarSpec }) {
  const g = useRef<THREE.Group>(null)
  const loop = LOOP[spec.loop]
  const headMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#fffbe8',
        emissive: new THREE.Color('#fff2b0'),
        emissiveIntensity: 0,
      }),
    [],
  )
  const tailMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ff5a5a',
        emissive: new THREE.Color('#ff3a3a'),
        emissiveIntensity: 0,
      }),
    [],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const p = sampleAt(loop, t * spec.speed + spec.offset)
    if (g.current) {
      g.current.position.x = p.x
      g.current.position.z = p.z
      g.current.rotation.y = p.yaw
    }
    /* چراغ‌ها در شب روشن */
    headMat.emissiveIntensity = dayState.night * 2
    tailMat.emissiveIntensity = dayState.night * 1.4
  })

  return (
    <group ref={g} position={[0, 0, 0]}>
      {/* بدنه */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.62, 0.18, 0.3]} />
        <meshStandardMaterial color={spec.color} metalness={0.35} roughness={0.4} />
      </mesh>
      {/* کابین */}
      <mesh position={[-0.04, 0.36, 0]} castShadow>
        <boxGeometry args={[0.32, 0.16, 0.26]} />
        <meshStandardMaterial color="#cfe8f5" metalness={0.3} roughness={0.2} />
      </mesh>
      {/* چرخ‌ها */}
      {[
        [0.2, 0.15],
        [-0.2, 0.15],
        [0.2, -0.15],
        [-0.2, -0.15],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.08, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.05, 10]} />
          <meshStandardMaterial color="#2a2d31" roughness={0.9} />
        </mesh>
      ))}
      {/* چراغ جلو / عقب */}
      <mesh position={[0.315, 0.2, 0.09]}>
        <sphereGeometry args={[0.045, 6, 6]} />
        <primitive object={headMat} attach="material" />
      </mesh>
      <mesh position={[0.315, 0.2, -0.09]}>
        <sphereGeometry args={[0.045, 6, 6]} />
        <primitive object={headMat} attach="material" />
      </mesh>
      <mesh position={[-0.315, 0.2, 0.09]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <primitive object={tailMat} attach="material" />
      </mesh>
      <mesh position={[-0.315, 0.2, -0.09]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <primitive object={tailMat} attach="material" />
      </mesh>
    </group>
  )
}

/* ─────────────────────────── عابران پیاده (Pedestrians) ─────────────────────────── */

interface PedSpec {
  loop: LoopKey
  offset: number
  speed: number
  color: string
  skin: string
}

const PEDS: PedSpec[] = [
  { loop: 'pedOuter', offset: 2, speed: 0.55, color: '#d65c8a', skin: '#e8b48c' },
  { loop: 'pedOuter', offset: 22, speed: 0.52, color: '#5c8ad6', skin: '#c98d64' },
  { loop: 'pedOuter', offset: 42, speed: 0.57, color: '#67b56a', skin: '#e8b48c' },
  { loop: 'pedInner', offset: 7, speed: 0.48, color: '#d6a75c', skin: '#8d6244' },
  { loop: 'pedInner', offset: 37, speed: 0.46, color: '#9a6ad6', skin: '#c98d64' },
]

function Pedestrian({ spec }: { spec: PedSpec }) {
  const g = useRef<THREE.Group>(null)
  const loop = LOOP[spec.loop]
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const p = sampleAt(loop, t * spec.speed + spec.offset)
    if (g.current) {
      g.current.position.x = p.x
      g.current.position.z = p.z
      g.current.rotation.y = p.yaw
      /* انیمیشن گام: بالا پایین ملایم */
      g.current.position.y = Math.abs(Math.sin(t * spec.speed * 9)) * 0.03
      g.current.rotation.z = Math.sin(t * spec.speed * 9) * 0.05
    }
  })
  return (
    <group ref={g} position={[0, 0.1, 0]}>
      {/* بدن */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <capsuleGeometry args={[0.07, 0.16, 4, 8]} />
        <meshStandardMaterial color={spec.color} roughness={0.85} />
      </mesh>
      {/* سر */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color={spec.skin} roughness={0.8} />
      </mesh>
    </group>
  )
}

export default function NPCs() {
  return (
    <group>
      {CARS.map((c, i) => (
        <Car key={`car-${i}`} spec={c} />
      ))}
      {PEDS.map((p, i) => (
        <Pedestrian key={`ped-${i}`} spec={p} />
      ))}
    </group>
  )
}
