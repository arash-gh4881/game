'use client'

/**
 * Terrain.tsx
 * ─────────────────────────────────────────────────────────────
 * بورد بازی — نسخه شکیل و کاربرپسند:
 *  • کاشی‌های شطرنجی دولایه با پلینت سنگی و برجستگی هنگام Hover
 *  • حلقه نورانی پالس‌دار سبز/قرمز + راهنمای ظریف حالت ساخت
 *  • قاب سنگی با ستون‌های گوشه و گلوله‌های طلایی
 *  • پیاده‌رو، خط‌کشی عابر پیاده، پل چوبی، نیلوفرهای کنار رودخانه
 *  • چمن‌های پچ‌پچ، گل‌های رنگی (InstancedMesh) و صخره‌های تزئینی
 *  • شبکه جاده حلقه بسته: دو خیابان شرقی-غربی با اتصال در دو انتها
 *
 * Beautified isometric board: checker build tiles with hover lift
 * & glow ring, stone frame, sidewalks, wooden bridge, flowers,
 * rocks & meadow patches.
 * ─────────────────────────────────────────────────────────────
 */
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import {
  GRID_COLS,
  GRID_ROWS,
  TILE_SIZE,
  ISO,
  allTiles,
  tileKey,
  tileWorldPos,
  INFRASTRUCTURES,
  type TilePos,
} from '@/lib/city-config'
import { useCityStore } from '@/lib/city-store'
import { createWaterMaterial } from './water-material'

/* ───────────────────────────── پالت بورد ───────────────────────────── */

const COL = {
  plinth: '#cfc2a0',
  plinthTop: '#ded2b4',
  grassA: '#8fbf6a',
  grassB: '#83b461',
  pad: '#b3aca0',
  padEdge: '#9c948a',
  frame: '#a89a80',
  frameDark: '#8d7f68',
  post: '#93876f',
  gold: '#e8c46a',
  apron: '#5e7f49',
  road: '#41474d',
  sidewalk: '#cfc9bb',
  dash: '#f2eee0',
  wood: '#8a623d',
  woodDark: '#6f4f30',
  rock: '#9aa0a3',
  reed: '#5c8f46',
  reedDark: '#4c7a3a',
} as const

/* ─────────────────────── کاشی‌های ساخت (Build Tiles) ─────────────────────── */

function BuildTile({ tile }: { tile: TilePos }) {
  const key = tileKey(tile)
  const infra = useCityStore((s) => s.infra.some((i) => tileKey(i.tile) === key))
  const hovered = useCityStore((s) => s.hoveredTile === key)
  const building = useCityStore((s) => s.selectedInfra !== null)
  const canBuild = useCityStore(
    (s) => s.phase === 'playing' && s.selectedInfra !== null && !infra,
  )
  const build = useCityStore((s) => s.build)
  const setHoveredTile = useCityStore((s) => s.setHoveredTile)

  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  const checker = (tile.col + tile.row) % 2 === 0
  const pos = tileWorldPos(tile)

  /* رنگ رویه کاشی */
  let topColor: string = checker ? COL.grassA : COL.grassB
  if (infra) topColor = COL.pad

  /* حالت حلقه: hover سبز/قرمز | حالت ساخت: راهنمای ظریف */
  const ringMode: 'ok' | 'bad' | 'idle' | 'off' = hovered
    ? canBuild
      ? 'ok'
      : 'bad'
    : building && canBuild
      ? 'idle'
      : 'off'

  useFrame((state, dt) => {
    /* برجستگی نرم هنگام hover */
    if (groupRef.current) {
      const target = hovered ? 0.045 : 0
      groupRef.current.position.y +=
        (target - groupRef.current.position.y) * Math.min(1, dt * 12)
    }
    /* پالس حلقه */
    if (ringRef.current) {
      const m = ringRef.current.material as THREE.MeshBasicMaterial
      const t = state.clock.elapsedTime
      if (ringMode === 'ok') m.opacity = 0.75 + Math.sin(t * 5) * 0.2
      else if (ringMode === 'bad') m.opacity = 0.7 + Math.sin(t * 9) * 0.25
      else if (ringMode === 'idle') m.opacity = 0.22 + Math.sin(t * 2.2) * 0.1
      const s = ringMode === 'idle' ? 1 + Math.sin(t * 2.2) * 0.02 : 1
      ringRef.current.scale.set(s, s, 1)
    }
  })

  return (
    <group ref={groupRef} position={[pos.x, 0, pos.z]}>
      {/* پلینت سنگی */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[TILE_SIZE - 0.12, 0.08, TILE_SIZE - 0.12]} />
        <meshStandardMaterial
          color={infra ? COL.padEdge : COL.plinth}
          roughness={0.95}
        />
      </mesh>
      {/* رویه چمن / بتن */}
      <mesh
        position={[0, 0.13, 0]}
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation()
          setHoveredTile(key)
          if (canBuild) document.body.style.cursor = 'crosshair'
        }}
        onPointerOut={() => {
          setHoveredTile(null)
          document.body.style.cursor = 'auto'
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (canBuild) build(tile)
        }}
      >
        <boxGeometry args={[TILE_SIZE - 0.26, 0.06, TILE_SIZE - 0.26]} />
        <meshStandardMaterial
          color={topColor}
          roughness={0.9}
          emissive={
            ringMode === 'ok' ? '#2fbf5f' : ringMode === 'bad' ? '#c93a3a' : '#000000'
          }
          emissiveIntensity={ringMode === 'off' ? 0 : 0.28}
        />
      </mesh>
      {/* قاب درونی ظریف کاشی */}
      {!infra && (
        <mesh position={[0, 0.161, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.99, 1.04, 4, 1, Math.PI / 4]} />
          <meshBasicMaterial color={checker ? '#6f9e50' : '#67954a'} transparent opacity={0.5} />
        </mesh>
      )}
      {/* حلقه تعاملی Hover / حالت ساخت */}
      <mesh ref={ringRef} position={[0, 0.175, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={ringMode !== 'off'}>
        <ringGeometry args={[0.84, 1.06, 4, 1, Math.PI / 4]} />
        <meshBasicMaterial
          color={ringMode === 'bad' ? '#ff6b6b' : ringMode === 'ok' ? '#5dff9d' : '#ffffff'}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/* ─────────────── پیش‌نمایش شبح سازه با رنگ زیرساخت (Ghost) ─────────────── */

function GhostPreview() {
  const selected = useCityStore((s) => s.selectedInfra)
  const hoveredKey = useCityStore((s) => s.hoveredTile)
  const infra = useCityStore((s) => s.infra)
  const ref = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const pulse = useRef(0)

  const pos = useMemo(() => {
    if (!hoveredKey) return null
    const [col, row] = hoveredKey.split(',').map(Number)
    if (Number.isNaN(col) || Number.isNaN(row)) return null
    return tileWorldPos({ col, row })
  }, [hoveredKey])

  const occupied = useMemo(() => {
    if (!hoveredKey || !pos) return false
    return infra.some((i) => tileKey(i.tile) === hoveredKey)
  }, [infra, hoveredKey, pos])

  const tint = useMemo(
    () => new THREE.Color(selected ? INFRASTRUCTURES[selected].color : '#7dffb0'),
    [selected],
  )

  useFrame((state, dt) => {
    if (!ref.current) return
    pulse.current += dt
    ref.current.position.y = 0.18 + Math.abs(Math.sin(pulse.current * 3)) * 0.08
    ref.current.rotation.y = state.clock.elapsedTime * 0.6
    if (matRef.current) {
      matRef.current.opacity = 0.42 + Math.sin(pulse.current * 5) * 0.1
      matRef.current.emissiveIntensity = 0.4 + Math.sin(pulse.current * 5) * 0.12
    }
  })

  if (!selected || !pos || occupied) return null
  const round = selected === 'rainTank' || selected === 'desal'

  return (
    <mesh ref={ref} position={[pos.x, 0.18, pos.z]}>
      {round ? <cylinderGeometry args={[0.62, 0.62, 1.1, 18]} /> : <boxGeometry args={[1.25, 1.1, 1.25]} />}
      <meshStandardMaterial
        ref={matRef}
        color={tint}
        transparent
        opacity={0.42}
        emissive={tint}
        emissiveIntensity={0.4}
        depthWrite={false}
      />
    </mesh>
  )
}

/* ─────────────────────── قاب سنگی بورد (Board Frame) ─────────────────────── */

function BoardFrame() {
  const platW = GRID_COLS * TILE_SIZE + 1.4 // ۱۴٫۶
  const platD = GRID_ROWS * TILE_SIZE + 1.4 // ۸٫۰
  const rimW = 0.4
  const hx = platW / 2
  const hz = platD / 2

  return (
    <group>
      {/* سایه‌بان تیره زیر سکو — حس عمق */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[platW + 0.9, 0.05, platD + 0.9]} />
        <meshStandardMaterial color={COL.apron} roughness={1} />
      </mesh>
      {/* سکوی شنی پایه */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[platW, 0.12, platD]} />
        <meshStandardMaterial color={COL.plinthTop} roughness={0.95} />
      </mesh>
      {/* قاب دور سکو */}
      {[
        { args: [platW + rimW, 0.2, rimW], pos: [0, 0.1, hz - rimW / 2] },
        { args: [platW + rimW, 0.2, rimW], pos: [0, 0.1, -hz + rimW / 2] },
        { args: [rimW, 0.2, platD], pos: [hx - rimW / 2, 0.1, 0] },
        { args: [rimW, 0.2, platD], pos: [-hx + rimW / 2, 0.1, 0] },
      ].map((r, i) => (
        <mesh key={i} position={r.pos as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={r.args as [number, number, number]} />
          <meshStandardMaterial color={COL.frame} roughness={0.85} />
        </mesh>
      ))}
      {/* ستون‌های گوشه با گوی طلایی */}
      {([
        [hx - rimW / 2, hz - rimW / 2],
        [hx - rimW / 2, -hz + rimW / 2],
        [-hx + rimW / 2, hz - rimW / 2],
        [-hx + rimW / 2, -hz + rimW / 2],
      ] as Array<[number, number]>).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.32, 0]} castShadow>
            <boxGeometry args={[0.5, 0.42, 0.5]} />
            <meshStandardMaterial color={COL.post} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.62, 0]} castShadow>
            <sphereGeometry args={[0.15, 12, 10]} />
            <meshStandardMaterial color={COL.gold} metalness={0.55} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ─────────────────────────────── جاده‌ها (Roads) ─────────────────────────────── */

function RoadStrip({ z, len }: { z: number; len: number }) {
  const dashes = useMemo(() => {
    const arr: number[] = []
    for (let x = -len / 2 + 0.6; x < len / 2; x += 1.4) arr.push(x)
    return arr
  }, [len])
  return (
    <group position={[0, 0, z]}>
      {/* پیاده‌روها */}
      {[0.95, -0.95].map((dz) => (
        <mesh key={dz} position={[0, 0.028, dz]} receiveShadow>
          <boxGeometry args={[len + 0.6, 0.04, 0.34]} />
          <meshStandardMaterial color={COL.sidewalk} roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.025, 0]} receiveShadow>
        <boxGeometry args={[len, 0.05, 1.5]} />
        <meshStandardMaterial color={COL.road} roughness={0.95} />
      </mesh>
      {dashes.map((x) => (
        <mesh key={x} position={[x, 0.056, 0]}>
          <boxGeometry args={[0.7, 0.012, 0.1]} />
          <meshStandardMaterial color={COL.dash} />
        </mesh>
      ))}
      {/* خط عابر پیاده */}
      {[2.1, 2.42, 2.74, 3.06].map((x) => (
        <mesh key={x} position={[x, 0.058, 0]}>
          <boxGeometry args={[0.22, 0.012, 1.42]} />
          <meshStandardMaterial color={COL.dash} />
        </mesh>
      ))}
    </group>
  )
}

function VerticalRoad({ x, zStart, zEnd }: { x: number; zStart: number; zEnd: number }) {
  const len = Math.abs(zEnd - zStart)
  const mid = (zStart + zEnd) / 2
  const dashes = useMemo(() => {
    const arr: number[] = []
    for (let z = zStart + 0.6; z < zEnd; z += 1.4) arr.push(z)
    return arr
  }, [zStart, zEnd])
  return (
    <group position={[x, 0, mid]}>
      {[0.95, -0.95].map((dx) => (
        <mesh key={dx} position={[dx, 0.028, 0]} receiveShadow>
          <boxGeometry args={[0.34, 0.04, len + 0.6]} />
          <meshStandardMaterial color={COL.sidewalk} roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.024, 0]} receiveShadow>
        <boxGeometry args={[1.5, 0.048, len]} />
        <meshStandardMaterial color={COL.road} roughness={0.95} />
      </mesh>
      {dashes.map((z) => (
        <mesh key={z} position={[0, 0.055, z - mid]}>
          <boxGeometry args={[0.1, 0.012, 0.7]} />
          <meshStandardMaterial color={COL.dash} />
        </mesh>
      ))}
    </group>
  )
}

/* ─────────────────────────── رودخانه و سد (River & Dam) ─────────────────────────── */

function River() {
  const mat = useMemo(
    () => createWaterMaterial('#7fd4e8', '#1d6ea8', 0.94, 0.05),
    [],
  )
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime
  })
  return (
    <mesh position={[0, 0.05, ISO.riverZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[46, ISO.riverWidth, 56, 10]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}

function DamWall() {
  const damCount = useCityStore((s) => s.infra.filter((i) => i.type === 'dam').length)
  const upgraded = damCount > 0
  const gateRef = useRef<THREE.Mesh>(null)
  const foamRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (gateRef.current) {
      gateRef.current.position.y = (upgraded ? 0.9 : 0.6) + Math.sin(state.clock.elapsedTime * 1.4) * 0.05
    }
    if (foamRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.15
      foamRef.current.scale.set(s, 1, s)
    }
  })

  return (
    <group position={[-10.5, 0, ISO.riverZ]}>
      {/* دیواره اصلی سد */}
      <mesh position={[0, upgraded ? 1.05 : 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, upgraded ? 2.1 : 1.4, ISO.riverWidth + 1.4]} />
        <meshStandardMaterial color={upgraded ? '#8fa8c4' : '#9aa0a6'} roughness={0.85} />
      </mesh>
      {/* دریچه جریان آب */}
      <mesh ref={gateRef} position={[0.65, upgraded ? 0.9 : 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.5, 12]} />
        <meshStandardMaterial color={upgraded ? '#4a90c2' : '#b0655a'} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* کف پاشیده زیر دریچه */}
      <mesh ref={foamRef} position={[1.8, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 20]} />
        <meshStandardMaterial color="#cfeaf5" transparent opacity={0.7} />
      </mesh>
      {upgraded && (
        <>
          {/* برجک کنترل ارتقایافته */}
          <mesh position={[0, 2.35, -1.1]} castShadow>
            <boxGeometry args={[0.6, 0.55, 0.6]} />
            <meshStandardMaterial color="#5d7fa3" />
          </mesh>
          <mesh position={[0, 2.72, -1.1]}>
            <coneGeometry args={[0.45, 0.35, 4]} />
            <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.25} />
          </mesh>
        </>
      )}
    </group>
  )
}

/* ─────────────── پل چوبی و نی‌های کنار رودخانه (Bridge & Reeds) ─────────────── */

function WoodenBridge() {
  const x = 4.8
  return (
    <group position={[x, 0, ISO.riverZ]}>
      {/* عرشه */}
      <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.09, ISO.riverWidth + 1.5]} />
        <meshStandardMaterial color={COL.wood} roughness={0.9} />
      </mesh>
      {/* تخته‌ها */}
      {[-1.2, -0.6, 0, 0.6, 1.2].map((dz) => (
        <mesh key={dz} position={[0, 0.372, dz]}>
          <boxGeometry args={[1.56, 0.02, 0.42]} />
          <meshStandardMaterial color={COL.woodDark} roughness={0.9} />
        </mesh>
      ))}
      {/* نرده‌ها */}
      {[0.68, -0.68].map((dx) => (
        <group key={dx}>
          <mesh position={[dx, 0.58, 0]} castShadow>
            <boxGeometry args={[0.07, 0.07, ISO.riverWidth + 1.5]} />
            <meshStandardMaterial color={COL.woodDark} />
          </mesh>
          {[ISO.riverWidth / 2 + 0.55, 0, -(ISO.riverWidth / 2 + 0.55)].map((dz) => (
            <mesh key={dz} position={[dx, 0.4, dz]}>
              <cylinderGeometry args={[0.05, 0.05, 0.5, 6]} />
              <meshStandardMaterial color={COL.wood} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function Reeds({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[i * 0.12 - 0.12, 0.2 + i * 0.04, (i % 2) * 0.08 - 0.04]} castShadow>
          <coneGeometry args={[0.035, 0.42 + i * 0.08, 5]} />
          <meshStandardMaterial color={i === 1 ? COL.reedDark : COL.reed} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

/* ─────────────────────── چمن‌های پچ‌پچ، گل‌ها و صخره‌ها ─────────────────────── */

const PATCHES: Array<[number, number, number, string]> = [
  [-12, 2, 2.2, '#7fa65d'],
  [-15, -2.2, 1.6, '#8ab463'],
  [12.6, -2.2, 1.8, '#75a054'],
  [14.5, 4, 2.0, '#94bd6b'],
  [10.5, 9.5, 2.2, '#7fa65d'],
  [-11, 9.5, 1.8, '#8ab463'],
  [3, 10.5, 2.4, '#75a054'],
  [-4, -12.5, 2.2, '#94bd6b'],
  [7, -12.5, 1.8, '#7fa65d'],
  [13.5, 12, 2.0, '#8ab463'],
  [-16.5, -9.5, 2.2, '#75a054'],
  [16.5, -11, 1.8, '#7fa65d'],
]

const FLOWER_COLORS = ['#ffd166', '#ff8fa3', '#fff3b0', '#c77dff', '#f9f871', '#ff6b6b']
const FLOWER_COUNT = 72

function MeadowDressing() {
  const flowerRef = useRef<THREE.InstancedMesh>(null)

  /* موقعیت گل‌ها — فقط روی چمن‌های بیرون بورد/جاده/رودخانه */
  const flowers = useMemo(() => {
    const out: Array<{ x: number; z: number; s: number; c: THREE.Color }> = []
    let guard = 0
    while (out.length < FLOWER_COUNT && guard++ < 900) {
      const x = (Math.random() - 0.5) * 36
      const z = (Math.random() - 0.5) * 28
      const inPlatform = Math.abs(x) < 7.9 && Math.abs(z) < 4.4
      const inRoads = z > -9.3 && z < -4.0 && Math.abs(x) < 14.5
      const inRiver = Math.abs(z - ISO.riverZ) < 2.1
      const inHouses = z > -11 && z < -9.2 && Math.abs(x) < 12.5
      if (inPlatform || inRoads || inRiver || inHouses) continue
      out.push({
        x,
        z,
        s: 0.7 + Math.random() * 0.6,
        c: new THREE.Color(FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)]),
      })
    }
    return out
  }, [])

  useEffect(() => {
    const mesh = flowerRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    flowers.forEach((f, i) => {
      dummy.position.set(f.x, 0.07, f.z)
      dummy.scale.set(f.s, f.s, f.s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, f.c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [flowers])

  return (
    <group>
      {/* پچ‌های چمن */}
      {PATCHES.map(([x, z, r, c], i) => (
        <mesh key={i} position={[x, 0.01, z]} scale={[1, 0.16, 1]} receiveShadow>
          <sphereGeometry args={[r, 12, 8]} />
          <meshStandardMaterial color={c} roughness={1} />
        </mesh>
      ))}
      {/* گل‌های ریز رنگی */}
      <instancedMesh ref={flowerRef} args={[undefined, undefined, FLOWER_COUNT]} frustumCulled={false}>
        <sphereGeometry args={[0.055, 6, 5]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      {/* صخره‌ها */}
      {([
        [-13.2, 5.2, 0.28],
        [11.8, 6.4, 0.22],
        [-15.5, -6.2, 0.34],
        [15.2, -6.8, 0.26],
        [9.2, -11.2, 0.3],
        [-8.8, -12.2, 0.24],
        [17.5, 2.2, 0.2],
        [-18, 0.5, 0.26],
      ] as Array<[number, number, number]>).map(([x, z, s], i) => (
        <mesh key={i} position={[x, s * 0.6, z]} scale={[s, s * 0.8, s]} rotation={[i * 0.7, i * 1.3, 0]} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={COL.rock} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/* ─────────────────────────────── زمین اصلی (Ground) ─────────────────────────────── */

function Ground() {
  return (
    <group>
      {/* سطح چمن — لبه بالایی زیر ۰ تا رودخانه/جاده‌ها دفن نشوند */}
      <mesh position={[0, -0.11, 0]} receiveShadow>
        <boxGeometry args={[ISO.worldGround, 0.2, ISO.worldGround]} />
        <meshStandardMaterial color="#7fa65d" roughness={1} />
      </mesh>
      {/* لبه رودخانه — ساحل شنی */}
      <mesh position={[0, 0.02, ISO.riverZ - ISO.riverWidth / 2 - 0.35]} receiveShadow>
        <boxGeometry args={[46, 0.08, 0.7]} />
        <meshStandardMaterial color="#d3c49a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.02, ISO.riverZ + ISO.riverWidth / 2 + 0.35]} receiveShadow>
        <boxGeometry args={[46, 0.08, 0.7]} />
        <meshStandardMaterial color="#d3c49a" roughness={1} />
      </mesh>
    </group>
  )
}

/* ─────────────────────────────── کامپوننت اصلی ─────────────────────────────── */

export default function Terrain() {
  const tiles = useMemo(() => allTiles(), [])
  const reedXs = [-6.5, -1.5, 2.5, 7.5, -8.5]
  return (
    <group>
      <Ground />
      <MeadowDressing />
      <BoardFrame />
      <River />
      <DamWall />
      <WoodenBridge />
      {/* نی‌های کنار هر دو ساحل */}
      {reedXs.map((x, i) => (
        <group key={i}>
          <Reeds x={x} z={ISO.riverZ - ISO.riverWidth / 2 - 0.55} />
          <Reeds x={x + 1.2} z={ISO.riverZ + ISO.riverWidth / 2 + 0.55} />
        </group>
      ))}
      {/* جاده حلقه بسته: دو شرقی‌غربی + اتصال عمودی در هر دو انتفا */}
      <RoadStrip z={ISO.roadZ1} len={27.5} />
      <RoadStrip z={ISO.roadZ2} len={27.5} />
      <VerticalRoad x={0} zStart={ISO.roadZ2 - 0.75} zEnd={ISO.roadZ1 + 0.75} />
      <VerticalRoad x={13} zStart={ISO.roadZ2 - 0.75} zEnd={ISO.roadZ1 + 0.75} />
      <VerticalRoad x={-13} zStart={ISO.roadZ2 - 0.75} zEnd={ISO.roadZ1 + 0.75} />
      {tiles.map((t) => (
        <BuildTile key={tileKey(t)} tile={t} />
      ))}
      <GhostPreview />
    </group>
  )
}
