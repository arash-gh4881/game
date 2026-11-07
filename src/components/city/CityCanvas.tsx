'use client'

/**
 * CityCanvas.tsx
 * ─────────────────────────────────────────────────────────────
 * صحنه سه‌بعدی ایزومتریک «نگهبان آب»:
 * دوربین ارتوگرافیک با Pan/Zoom/چرخش محدود، نورپردازی سایه‌دار
 * و ترکیب تمام لایه‌های صحنه (زمین، سازه‌ها، شهر، آب‌وهوا، جلوه‌ها).
 *
 * Isometric orthographic canvas with custom camera rig
 * (pan / wheel-zoom / limited rotation) + shadowed lighting rig.
 * ─────────────────────────────────────────────────────────────
 */
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useCityStore } from '@/lib/city-store'
import Terrain from './Terrain'
import Buildings from './Buildings'
import CityProps from './CityProps'
import NPCs from './NPCs'
import Weather from './Weather'
import Effects from './Effects'

const AZ_DEFAULT = Math.PI / 4
const AZ_LIMIT = 0.7 // چرخش محدود ±۴۰ درجه
const ELEVATION = 0.72 // زاویه ارتفاع دوربین (~۴۱°)
const RADIUS = 30

export const ROTATE_EVENT = 'city-rotate'
export const RESET_EVENT = 'city-reset'
export const ZOOM_EVENT = 'city-zoom'

interface PointerState {
  x: number
  y: number
  button: number
  shift: boolean
}

function CameraRig() {
  const { camera, gl, size } = useThree()
  const target = useRef(new THREE.Vector3(0, 0, 0.8))
  const azCurrent = useRef(AZ_DEFAULT)
  const azTarget = useRef(AZ_DEFAULT)
  const zoomTarget = useRef(38)
  const pointers = useRef(new Map<number, PointerState>())
  const pinchDist = useRef<number | null>(null)
  const initialized = useRef(false)

  /* زوم اولیه متناسب با عرض صفحه */
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      zoomTarget.current = THREE.MathUtils.clamp(size.width / 34, 14, 44)
      camera.zoom = zoomTarget.current
      camera.updateProjectionMatrix()
    }
  }, [size.width, camera])

  /* دکمه‌های چرخش HUD و ریست */
  useEffect(() => {
    const onRotate = (e: Event) => {
      const d = (e as CustomEvent<number>).detail
      azTarget.current = THREE.MathUtils.clamp(
        azTarget.current + d,
        AZ_DEFAULT - AZ_LIMIT,
        AZ_DEFAULT + AZ_LIMIT,
      )
    }
    const onReset = () => {
      azTarget.current = AZ_DEFAULT
      target.current.set(0, 0, 0.8)
      zoomTarget.current = THREE.MathUtils.clamp(size.width / 34, 14, 44)
    }
    const onZoom = (e: Event) => {
      const factor = (e as CustomEvent<number>).detail
      zoomTarget.current = THREE.MathUtils.clamp(zoomTarget.current * factor, 14, 95)
    }
    window.addEventListener(ROTATE_EVENT, onRotate)
    window.addEventListener(RESET_EVENT, onReset)
    window.addEventListener(ZOOM_EVENT, onZoom)
    return () => {
      window.removeEventListener(ROTATE_EVENT, onRotate)
      window.removeEventListener(RESET_EVENT, onReset)
      window.removeEventListener(ZOOM_EVENT, onZoom)
    }
  }, [size.width])

  /* کنترل‌های اشاره‌گر: درگ چپ = Pan، راست/Shift = چرخش، اسکرول = Zoom */
  useEffect(() => {
    const el = gl.domElement
    const getWorldPerPixel = () => 1 / camera.zoom

    const onPointerDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId)
      pointers.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        button: e.button,
        shift: e.shiftKey,
      })
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()]
        pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y)
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.current.get(e.pointerId)
      if (!prev) return
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      pointers.current.set(e.pointerId, { ...prev, x: e.clientX, y: e.clientY })

      const rotateMode = prev.button === 2 || prev.shift

      if (pointers.current.size === 2 && pinchDist.current !== null) {
        /* دو انگشت: pinch zoom + pan با میانگین حرکت */
        const [a, b] = [...pointers.current.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchDist.current > 0) {
          const factor = pinchDist.current / dist
          zoomTarget.current = THREE.MathUtils.clamp(
            zoomTarget.current / factor,
            14,
            95,
          )
        }
        pinchDist.current = dist
        const wpp = getWorldPerPixel()
        const az = azCurrent.current
        const rx = Math.cos(az)
        const rz = -Math.sin(az)
        const fx = -Math.sin(az)
        const fz = -Math.cos(az)
        target.current.x = THREE.MathUtils.clamp(
          target.current.x + (dx / 2) * wpp * rx + (-dy / 2) * wpp * fx,
          -10,
          10,
        )
        target.current.z = THREE.MathUtils.clamp(
          target.current.z + (dx / 2) * wpp * rz + (-dy / 2) * wpp * fz,
          -9,
          10,
        )
        return
      }

      if (rotateMode) {
        azTarget.current = THREE.MathUtils.clamp(
          azTarget.current + dx * 0.005,
          AZ_DEFAULT - AZ_LIMIT,
          AZ_DEFAULT + AZ_LIMIT,
        )
        return
      }

      /* Pan تک‌انگشتی / درگ چپ */
      const wpp = getWorldPerPixel()
      const az = azCurrent.current
      const rx = Math.cos(az)
      const rz = -Math.sin(az)
      const fx = -Math.sin(az)
      const fz = -Math.cos(az)
      target.current.x = THREE.MathUtils.clamp(
        target.current.x + dx * wpp * rx - dy * wpp * fx,
        -10,
        10,
      )
      target.current.z = THREE.MathUtils.clamp(
        target.current.z + dx * wpp * rz - dy * wpp * fz,
        -9,
        10,
      )
    }

    const onPointerUp = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId)
      if (pointers.current.size < 2) pinchDist.current = null
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomTarget.current = THREE.MathUtils.clamp(
        zoomTarget.current * Math.pow(0.998, e.deltaY),
        14,
        95,
      )
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q') {
        azTarget.current = THREE.MathUtils.clamp(
          azTarget.current - 0.12,
          AZ_DEFAULT - AZ_LIMIT,
          AZ_DEFAULT + AZ_LIMIT,
        )
      } else if (e.key === 'e' || e.key === 'E') {
        azTarget.current = THREE.MathUtils.clamp(
          azTarget.current + 0.12,
          AZ_DEFAULT - AZ_LIMIT,
          AZ_DEFAULT + AZ_LIMIT,
        )
      }
    }

    const onContext = (e: Event) => e.preventDefault()

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('contextmenu', onContext)
    window.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('contextmenu', onContext)
      window.removeEventListener('keydown', onKey)
    }
  }, [gl, camera])

  useFrame((_, dt) => {
    const k = Math.min(1, dt * 8)
    azCurrent.current += (azTarget.current - azCurrent.current) * k
    camera.zoom += (zoomTarget.current - camera.zoom) * k
    camera.updateProjectionMatrix()

    const ce = Math.cos(ELEVATION)
    camera.position.set(
      target.current.x + Math.sin(azCurrent.current) * RADIUS * ce,
      Math.sin(ELEVATION) * RADIUS,
      target.current.z + Math.cos(azCurrent.current) * RADIUS * ce,
    )
    camera.lookAt(target.current)
  })

  return null
}

function SceneContent() {
  const weather = useCityStore((s) => s.weather)

  return (
    <>
      <CameraRig />
      <Weather mode={weather} />
      <group position={[0, 0, 0]}>
        <Terrain />
        <Buildings />
        <CityProps />
        <NPCs />
        <Effects />
      </group>
    </>
  )
}

export default function CityCanvas() {
  const setHovered = useCityStore((s) => s.setHoveredTile)

  /* خروج از حالت ساخت هنگام ترک صحنه */
  useEffect(() => {
    const clear = () => setHovered(null)
    window.addEventListener('blur', clear)
    return () => window.removeEventListener('blur', clear)
  }, [setHovered])

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      orthographic
      camera={{
        position: [
          Math.sin(Math.PI / 4) * 30 * Math.cos(0.72),
          Math.sin(0.72) * 30,
          Math.cos(Math.PI / 4) * 30 * Math.cos(0.72),
        ],
        zoom: 38,
        near: -80,
        far: 260,
      }}
      style={{ touchAction: 'none' }}
    >
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  )
}
