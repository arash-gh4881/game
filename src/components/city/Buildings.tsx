'use client'

/**
 * Buildings.tsx
 * ─────────────────────────────────────────────────────────────
 * شش زیرساخت بازی به‌صورت مدل‌های پروسیجرال کم‌پلی:
 * مخزن آب باران (سطح آب موج‌دار و متصل به ذخیره شهر)، ایستگاه
 * لوله‌کشی (جریان متحرک + شیر چرخان)، تصفیه‌خانه (حوضچه‌های
 * چرخان + دودکش)، ایستگاه سد، سایت بازچرخانی آب (حوضچه‌های
 * دوار با آب بنفش) و نمک‌زدایی (مخزن کروی + دودکش‌ها + پنل خورشیدی).
 *
 * Six procedural low-poly infrastructures with animated water
 * waves, flow rings, rotating fans & pop-in build animation.
 * ─────────────────────────────────────────────────────────────
 */
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { INFRASTRUCTURES, tileWorldPos, type InfraInstance, type InfraType } from '@/lib/city-config'
import { useCityStore } from '@/lib/city-store'
import { createWaterMaterial } from './water-material'

const RUST = new THREE.Color('#8a7d6b')

/** رنگ کهنه‌شده بر اساس سلامت زیرساخت (استهلاک) */
function useWeathered(base: number, health: number): string {
  return useMemo(() => {
    const c = new THREE.Color(base)
    return `#${c.lerp(RUST, (1 - health) * 0.45).getHexString()}`
  }, [base, health])
}

/** انیمیشن ظاهرشدن فنری هنگام ساخت */
function usePopIn() {
  const ref = useRef<THREE.Group>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    if (!ref.current || t.current >= 1) return
    t.current = Math.min(1, t.current + dt * 1.6)
    const p = t.current
    const back = 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2) // easeOutBack
    ref.current.scale.setScalar(Math.max(0.001, back))
  })
  return ref
}

/* ─────────────────── ۱) مخزن آب باران — سطح آب موج‌دار ─────────────────── */

function RainTank({ pos, health }: { pos: { x: number; z: number }; health: number }) {
  const body = useWeathered(INFRASTRUCTURES.rainTank.meshColor, health)
  const waterMat = useMemo(() => createWaterMaterial('#9fe0f5', '#2b7fb0', 0.95, 0.02), [])
  const reserve = useCityStore((s) => s.reserve)
  const waterRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    waterMat.uniforms.uTime.value = state.clock.elapsedTime
    if (waterRef.current) {
      /* سطح آب مخزن با ذخیره شهر بالا/پایین می‌رود */
      const level = 0.35 + (reserve / 100) * 0.75
      waterRef.current.position.y = 0.55 + level * 0.85
    }
  })

  return (
    <group position={[pos.x, 0.16, pos.z]}>
      {/* پایه‌ها */}
      {[
        [0.4, 0.4],
        [-0.4, 0.4],
        [0.4, -0.4],
        [-0.4, -0.4],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.25, z]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.5, 8]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
      ))}
      {/* بدنه مخزن */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.62, 0.66, 0.95, 20]} />
        <meshStandardMaterial color={body} metalness={0.35} roughness={0.5} />
      </mesh>
      {/* حلقه لبه بالا */}
      <mesh position={[0, 1.53, 0]} castShadow>
        <torusGeometry args={[0.62, 0.045, 8, 20]} />
        <meshStandardMaterial color="#e5e7eb" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* سطح آب موج‌دار — متصل به ذخیره شهر */}
      <mesh ref={waterRef} position={[0, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.56, 24]} />
        <primitive object={waterMat} attach="material" />
      </mesh>
      {/* لوله ورودی از بالا */}
      <mesh position={[0.62, 1.45, 0]} rotation={[0, 0, Math.PI / 2.6]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}

/* ──────────── ۲) ایستگاه لوله‌کشی — جریان متحرک + شیر چرخان ──────────── */

function PipeStation({ pos, health }: { pos: { x: number; z: number }; health: number }) {
  const body = useWeathered(INFRASTRUCTURES.pipeUpgrade.meshColor, health)
  const ringsRef = useRef<THREE.Group>(null)
  const valveRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    /* حلقه‌های جریان آب درون لوله */
    if (ringsRef.current) {
      ringsRef.current.children.forEach((r, i) => {
        const t = ((state.clock.elapsedTime * 0.9 + i / 3) % 1) * 2.6 - 1.3
        r.position.x = t
      })
    }
    if (valveRef.current) valveRef.current.rotation.z = state.clock.elapsedTime * 1.5
  })

  return (
    <group position={[pos.x, 0.16, pos.z]}>
      {/* ساختمان ایستگاه پمپاژ */}
      <mesh position={[-0.45, 0.42, 0.35]} castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.72, 0.75]} />
        <meshStandardMaterial color={body} roughness={0.8} />
      </mesh>
      <mesh position={[-0.45, 0.84, 0.35]} castShadow>
        <boxGeometry args={[0.95, 0.1, 0.85]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      <mesh position={[-0.45, 0.5, -0.03]}>
        <boxGeometry args={[0.5, 0.22, 0.02]} />
        <meshStandardMaterial
          color="#dff3ff"
          emissive="#9adcf5"
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* لوله اصلی افقی */}
      <mesh position={[0.2, 0.55, -0.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.17, 0.17, 2.05, 12]} />
        <meshStandardMaterial color="#b9c2cc" metalness={0.55} roughness={0.35} />
      </mesh>
      {/* حلقه‌های جریان */}
      <group ref={ringsRef} position={[0.2, 0.55, -0.2]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.19, 0.035, 6, 14]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.7} />
          </mesh>
        ))}
      </group>
      {/* پایه‌های لوله */}
      <mesh position={[0.2, 0.14, -0.2]} castShadow>
        <boxGeometry args={[0.12, 0.3, 0.12]} />
        <meshStandardMaterial color="#7a8494" />
      </mesh>
      <mesh position={[1.05, 0.14, -0.2]} castShadow>
        <boxGeometry args={[0.12, 0.3, 0.12]} />
        <meshStandardMaterial color="#7a8494" />
      </mesh>
      {/* شیر چرخان */}
      <mesh ref={valveRef} position={[-0.25, 0.78, -0.2]} castShadow>
        <torusGeometry args={[0.16, 0.03, 6, 14]} />
        <meshStandardMaterial color="#ef4444" metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  )
}

/* ───────────── ۳) تصفیه‌خانه — حوضچه‌های چرخان + دودکش ───────────── */

function TreatmentPlant({ pos, health }: { pos: { x: number; z: number }; health: number }) {
  const body = useWeathered(INFRASTRUCTURES.treatment.meshColor, health)
  const waterMat = useMemo(() => createWaterMaterial('#8fe3c9', '#1f7a5c', 0.92, 0.015), [])
  const armRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    waterMat.uniforms.uTime.value = state.clock.elapsedTime
    if (armRef.current) armRef.current.rotation.y = state.clock.elapsedTime * 0.8
  })

  return (
    <group position={[pos.x, 0.16, pos.z]}>
      {/* سالن اصلی */}
      <mesh position={[0.3, 0.44, -0.5]} castShadow receiveShadow>
        <boxGeometry args={[1.35, 0.75, 0.85]} />
        <meshStandardMaterial color={body} roughness={0.8} />
      </mesh>
      <mesh position={[0.3, 0.86, -0.5]} castShadow>
        <boxGeometry args={[1.45, 0.1, 0.95]} />
        <meshStandardMaterial color="#2f6e52" />
      </mesh>
      {/* پنجره نوار روشن */}
      <mesh position={[0.3, 0.52, -0.06]}>
        <boxGeometry args={[1.1, 0.2, 0.02]} />
        <meshStandardMaterial color="#eafff5" emissive="#7de8c0" emissiveIntensity={0.45} />
      </mesh>
      {/* دودکش بخار (بخار در Effects رندر می‌شود) */}
      <mesh position={[0.85, 1.35, -0.75]} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 1.3, 10]} />
        <meshStandardMaterial color="#8b8f98" roughness={0.6} />
      </mesh>
      <mesh position={[0.85, 2.02, -0.75]}>
        <torusGeometry args={[0.12, 0.03, 6, 12]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      {/* حوضچه‌های شفاف‌سازی دوتایی */}
      {[-0.5, 0.35].map((zOff, i) => (
        <group key={i} position={[-0.45, 0, 0.25 + zOff * 0.65]}>
          <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.42, 0.45, 0.28, 18]} />
            <meshStandardMaterial color="#d8dee4" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.29, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.37, 18]} />
            <primitive object={waterMat} attach="material" />
          </mesh>
          {/* بازوی چرخان اسکراپر */}
          <group ref={i === 0 ? armRef : undefined} position={[0, 0.32, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.68, 0.03, 0.06]} />
              <meshStandardMaterial color="#f59e0b" />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}

/* ──────────────── ۴) ایستگاه سد — لوله انتقال به رودخانه ──────────────── */

function DamStation({ pos, health }: { pos: { x: number; z: number }; health: number }) {
  const body = useWeathered(INFRASTRUCTURES.dam.meshColor, health)
  const wheelRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (wheelRef.current) wheelRef.current.rotation.x = state.clock.elapsedTime * 1.1
  })
  return (
    <group position={[pos.x, 0.16, pos.z]}>
      {/* برج کنترل */}
      <mesh position={[0.25, 0.5, 0.4]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.85, 0.9]} />
        <meshStandardMaterial color={body} roughness={0.75} />
      </mesh>
      <mesh position={[0.25, 0.98, 0.4]} castShadow>
        <boxGeometry args={[1.05, 0.12, 1.0]} />
        <meshStandardMaterial color="#3f5a78" />
      </mesh>
      <mesh position={[0.25, 1.35, 0.4]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#5d7fa3" />
      </mesh>
      {/* آنتن */}
      <mesh position={[0.25, 1.75, 0.4]}>
        <cylinderGeometry args={[0.02, 0.02, 0.45, 6]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
      <mesh position={[0.25, 1.99, 0.4]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
      </mesh>
      {/* لوله انتقال بزرگ به سمت رودخانه */}
      <mesh position={[-0.55, 0.35, -0.3]} rotation={[Math.PI / 2, 0, 0.5]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 1.6, 12]} />
        <meshStandardMaterial color="#8fa8c4" metalness={0.5} roughness={0.35} />
      </mesh>
      {/* پروانه توربین */}
      <mesh ref={wheelRef} position={[-0.55, 0.35, -0.3]} rotation={[0, 0.5, 0]}>
        <torusGeometry args={[0.26, 0.04, 6, 8]} />
        <meshStandardMaterial color="#60a5fa" metalness={0.45} roughness={0.35} />
      </mesh>
    </group>
  )
}

/* ──────────────── ۵) سایت بازچرخانی آب — حوضچه‌های دوار ──────────────── */

function RecyclingSite({ pos, health }: { pos: { x: number; z: number }; health: number }) {
  const body = useWeathered(INFRASTRUCTURES.recycling.meshColor, health)
  const waterMat = useMemo(() => createWaterMaterial('#cdbdfc', '#5b4a92', 0.92, 0.02), [])
  const armA = useRef<THREE.Group>(null)
  const armB = useRef<THREE.Group>(null)
  useFrame((state) => {
    waterMat.uniforms.uTime.value = state.clock.elapsedTime
    /* بازوهای اسکراپر حوضچه‌ها — چرخش آرام مخالف */
    if (armA.current) armA.current.rotation.y = state.clock.elapsedTime * 0.55
    if (armB.current) armB.current.rotation.y = -state.clock.elapsedTime * 0.48
  })
  return (
    <group position={[pos.x, 0.16, pos.z]}>
      {/* ساختمان فرآیند */}
      <mesh position={[0.2, 0.42, -0.45]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.72, 0.9]} />
        <meshStandardMaterial color={body} roughness={0.8} />
      </mesh>
      <mesh position={[0.2, 0.83, -0.45]} castShadow>
        <boxGeometry args={[1.6, 0.09, 1.0]} />
        <meshStandardMaterial color="#4c4066" />
      </mesh>
      {/* نوار پنجره */}
      <mesh position={[0.2, 0.5, 0.01]}>
        <boxGeometry args={[1.25, 0.18, 0.02]} />
        <meshStandardMaterial color="#f3efff" emissive="#b49df5" emissiveIntensity={0.45} />
      </mesh>
      {/* دودکش تهویه (بخار در Effects رندر می‌شود) */}
      <mesh position={[-0.75, 0.45, -0.45]} castShadow>
        <cylinderGeometry args={[0.08, 0.11, 0.62, 10]} />
        <meshStandardMaterial color="#8b8f98" roughness={0.6} />
      </mesh>
      <mesh position={[-0.75, 0.74, -0.45]}>
        <torusGeometry args={[0.1, 0.026, 6, 12]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      {/* دو حوضچه بازچرخانی با آب بنفش موج‌دار */}
      {([
        { x: -0.55, z: 0.45, arm: armA },
        { x: 0.5, z: 0.5, arm: armB },
      ] as Array<{ x: number; z: number; arm: React.RefObject<THREE.Group | null> }>).map(
        (b, i) => (
          <group key={i} position={[b.x, 0, b.z]}>
            {/* بدنه حوضچه */}
            <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.34, 0.37, 0.3, 18]} />
              <meshStandardMaterial color="#cfc9d6" roughness={0.75} />
            </mesh>
            {/* سطح آب بنفش */}
            <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.3, 20]} />
              <primitive object={waterMat} attach="material" />
            </mesh>
            {/* پل اسکراپر چرخان */}
            <group ref={b.arm} position={[0, 0.36, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.58, 0.03, 0.06]} />
                <meshStandardMaterial color="#f59e0b" />
              </mesh>
              <mesh position={[0, 0.06, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.12, 8]} />
                <meshStandardMaterial color="#6d5aa8" metalness={0.4} />
              </mesh>
            </group>
          </group>
        ),
      )}
      {/* لوله انتقال بین حوضچه‌ها */}
      <mesh position={[-0.02, 0.22, 0.47]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 1.0, 8]} />
        <meshStandardMaterial color="#cdbdfc" metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  )
}

/* ──────────── ۶) نمک‌زدایی — مخزن کروی + دودکش + پنل خورشیدی ──────────── */

function DesalPlant({ pos, health }: { pos: { x: number; z: number }; health: number }) {
  const body = useWeathered(INFRASTRUCTURES.desal.meshColor, health)
  const steamDummy = useRef<THREE.Group>(null)
  return (
    <group position={[pos.x, 0.16, pos.z]}>
      {/* سالن اصلی بزرگ */}
      <mesh position={[0.15, 0.5, -0.5]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.85, 1.0]} />
        <meshStandardMaterial color={body} roughness={0.75} />
      </mesh>
      <mesh position={[0.15, 0.97, -0.5]} castShadow>
        <boxGeometry args={[1.7, 0.1, 1.1]} />
        <meshStandardMaterial color="#7c4468" />
      </mesh>
      {/* نوار پنجره */}
      <mesh position={[0.15, 0.58, 0.01]}>
        <boxGeometry args={[1.35, 0.2, 0.02]} />
        <meshStandardMaterial color="#ffeef7" emissive="#f7a8cf" emissiveIntensity={0.5} />
      </mesh>
      {/* دو دودکش بخار */}
      {[0.75, 1.05].map((xOff, i) => (
        <group key={i} ref={i === 0 ? steamDummy : undefined} position={[xOff - 0.9, 0, 0.15]}>
          <mesh position={[0, 1.15, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.11, 1.35, 10]} />
            <meshStandardMaterial color="#9aa0a6" />
          </mesh>
          <mesh position={[0, 1.85, 0]}>
            <torusGeometry args={[0.1, 0.028, 6, 12]} />
            <meshStandardMaterial color="#f472b6" />
          </mesh>
        </group>
      ))}
      {/* مخزن ذخیره کروی */}
      <group position={[-0.55, 0, 0.55]}>
        {[
          [0.18, 0.18],
          [-0.18, 0.18],
          [0.18, -0.18],
          [-0.18, -0.18],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.14, z]}>
            <cylinderGeometry args={[0.035, 0.045, 0.3, 6]} />
            <meshStandardMaterial color="#6b7280" />
          </mesh>
        ))}
        <mesh position={[0, 0.62, 0]} castShadow>
          <sphereGeometry args={[0.4, 18, 14]} />
          <meshStandardMaterial color="#ffc2e0" metalness={0.25} roughness={0.35} />
        </mesh>
      </group>
      {/* لوله intake به سمت رودخانه */}
      <mesh position={[0.15, 0.25, 0.75]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 1.3, 10]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* پنل‌های خورشیدی روی سقف */}
      {[0.85, 1.15, 1.45].map((zOff, i) => (
        <mesh key={i} position={[0.15, 1.06, 0.5 - zOff + 0.45]} rotation={[0.5, 0, 0]} castShadow>
          <boxGeometry args={[1.2, 0.02, 0.22]} />
          <meshStandardMaterial color="#1e3a5f" metalness={0.6} roughness={0.25} />
        </mesh>
      ))}
    </group>
  )
}

/* ─────────────────────────── مپر نوع → مش ─────────────────────────── */

function InfraMesh({ inst }: { inst: InfraInstance }) {
  const ref = usePopIn()
  const pos = tileWorldPos(inst.tile)
  switch (inst.type) {
    case 'rainTank':
      return (
        <group ref={ref}>
          <RainTank pos={pos} health={inst.health} />
        </group>
      )
    case 'pipeUpgrade':
      return (
        <group ref={ref}>
          <PipeStation pos={pos} health={inst.health} />
        </group>
      )
    case 'treatment':
      return (
        <group ref={ref}>
          <TreatmentPlant pos={pos} health={inst.health} />
        </group>
      )
    case 'dam':
      return (
        <group ref={ref}>
          <DamStation pos={pos} health={inst.health} />
        </group>
      )
    case 'recycling':
      return (
        <group ref={ref}>
          <RecyclingSite pos={pos} health={inst.health} />
        </group>
      )
    case 'desal':
      return (
        <group ref={ref}>
          <DesalPlant pos={pos} health={inst.health} />
        </group>
      )
  }
}

export default function Buildings() {
  const infra = useCityStore((s) => s.infra)
  return (
    <group>
      {infra.map((i) => (
        <InfraMesh key={i.id} inst={i} />
      ))}
    </group>
  )
}
