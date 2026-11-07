'use client'

/**
 * Effects.tsx
 * ─────────────────────────────────────────────────────────────
 * جلوه‌های ذرات VFX:
 *  • ستون بخار پیوسته از دودکش تصفیه‌خانه/بازیافت/نمک‌زدایی
 *  • انفجار ذرات غبار هنگام ساخت زیرساخت جدید (یک‌بار مصرف)
 *
 * Particle VFX: continuous chimney steam columns + one-shot
 * construction dust burst when a new infrastructure is placed.
 * ─────────────────────────────────────────────────────────────
 */
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { tileWorldPos, type InfraType } from '@/lib/city-config'
import { useCityStore, type BuildFx } from '@/lib/city-store'

/* بافت نرم ذرات — soft radial sprite */
let softTex: THREE.Texture | null = null
function getSoftTexture(): THREE.Texture {
  if (softTex) return softTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  softTex = new THREE.CanvasTexture(c)
  return softTex
}

/* ─────────────────── ستون بخار پیوسته (Chimney Steam) ─────────────────── */

interface SteamAnchor {
  key: string
  x: number
  y: number
  z: number
  tint: string
  rate: number
}

const STEAM_COUNT = 24

function SteamColumn({ anchor }: { anchor: SteamAnchor }) {
  const pointsRef = useRef<THREE.Points>(null)
  const seeds = useMemo(
    () =>
      Array.from({ length: STEAM_COUNT }, (_, i) => ({
        phase: i / STEAM_COUNT,
        sway: (Math.random() - 0.5) * 0.3,
        speed: 0.55 + Math.random() * 0.25,
      })),
    [],
  )
  const positions = useMemo(() => new Float32Array(STEAM_COUNT * 3), [])
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [positions])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    for (let i = 0; i < STEAM_COUNT; i++) {
      const s = seeds[i]
      const life = (t * s.speed + s.phase) % 1
      const rise = life * 1.5
      positions[i * 3] = anchor.x + Math.sin(life * 6 + s.phase * 12) * 0.14 * life + s.sway * life
      positions[i * 3 + 1] = anchor.y + rise
      positions[i * 3 + 2] = anchor.z + Math.cos(life * 5 + s.phase * 10) * 0.12 * life
    }
    geom.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef} geometry={geom} frustumCulled={false}>
      <pointsMaterial
        size={0.34}
        map={getSoftTexture()}
        color={anchor.tint}
        transparent
        opacity={0.32}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

/* ────────── انفجار ذرات ساخت‌وساز (Construction Dust Burst) ────────── */

const BURST_COUNT = 34
const BURST_LIFE = 1.15

function BuildBurst({ fx, onDone }: { fx: BuildFx; onDone: () => void }) {
  const pointsRef = useRef<THREE.Points>(null)
  const elapsed = useRef(0)
  const done = useRef(false)

  const { velocities, positions, geom } = useMemo(() => {
    const positions = new Float32Array(BURST_COUNT * 3)
    const velocities = Array.from({ length: BURST_COUNT }, () => {
      const a = Math.random() * Math.PI * 2
      const r = 0.8 + Math.random() * 1.4
      return new THREE.Vector3(
        Math.cos(a) * r * (0.5 + Math.random() * 0.5),
        2.2 + Math.random() * 2.4,
        Math.sin(a) * r * (0.5 + Math.random() * 0.5),
      )
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { velocities, positions, geom: g }
  }, [])

  const matRef = useRef<THREE.PointsMaterial>(null)

  useFrame((_, dt) => {
    if (done.current) return
    elapsed.current += dt
    const p = elapsed.current / BURST_LIFE
    for (let i = 0; i < BURST_COUNT; i++) {
      const v = velocities[i]
      positions[i * 3] += v.x * dt
      positions[i * 3 + 1] += v.y * dt
      positions[i * 3 + 2] += v.z * dt
      v.y -= 3.4 * dt
      if (positions[i * 3 + 1] < 0.05) positions[i * 3 + 1] = 0.05
    }
    geom.attributes.position.needsUpdate = true
    if (matRef.current) {
      matRef.current.opacity = Math.max(0, 0.9 * (1 - p))
      matRef.current.size = 0.3 + p * 0.35
    }
    if (elapsed.current >= BURST_LIFE && !done.current) {
      done.current = true
      onDone()
    }
  })

  return (
    <points
      ref={pointsRef}
      geometry={geom}
      position={[fx.x, 0.25, fx.z]}
      frustumCulled={false}
    >
      <pointsMaterial
        ref={matRef}
        size={0.3}
        map={getSoftTexture()}
        color={fx.type === 'desal' ? '#ffc2e0' : '#f0dcae'}
        transparent
        opacity={0.9}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

/* ─────────────────── محاسبه نقاط دودکش از روی زیرساخت‌ها ─────────────────── */

const CHIMNEY_OFFSETS: Record<InfraType, Array<{ x: number; z: number; y: number }>> = {
  rainTank: [],
  pipeUpgrade: [],
  treatment: [{ x: 0.85, z: -0.75, y: 2.05 }],
  dam: [],
  recycling: [{ x: -0.75, z: -0.45, y: 0.92 }],
  desal: [
    { x: -0.15, z: 0.15, y: 1.9 },
    { x: 0.15, z: 0.15, y: 1.9 },
  ],
}

const STEAM_TINT: Partial<Record<InfraType, string>> = {
  treatment: '#eef7f2',
  recycling: '#efeaf8',
  desal: '#fdeef5',
}

function anchorsFromInfra(infra: ReturnType<typeof useCityStore.getState>['infra']): SteamAnchor[] {
  const out: SteamAnchor[] = []
  for (const inst of infra) {
    const offs = CHIMNEY_OFFSETS[inst.type]
    if (!offs?.length) continue
    const { x, z } = tileWorldPos(inst.tile)
    offs.forEach((o, i) => {
      out.push({
        key: `${inst.id}-s${i}`,
        x: x + o.x,
        y: o.y,
        z: z + o.z,
        tint: STEAM_TINT[inst.type] ?? '#eef2f5',
        rate: inst.health,
      })
    })
  }
  return out
}

export default function Effects() {
  const infra = useCityStore((s) => s.infra)
  const buildFx = useCityStore((s) => s.buildFx)
  const clearBuildFx = useCityStore((s) => s.clearBuildFx)
  const anchors = useMemo(() => anchorsFromInfra(infra), [infra])

  return (
    <group>
      {anchors.map((a) => (
        <SteamColumn key={a.key} anchor={a} />
      ))}
      {buildFx && <BuildBurst key={buildFx.id} fx={buildFx} onDone={clearBuildFx} />}
    </group>
  )
}
