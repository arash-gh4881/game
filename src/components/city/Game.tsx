'use client'

/**
 * Game.tsx
 * ─────────────────────────────────────────────────────────────
 * پوسته اصلی بازی: ترکیب صحنه سه‌بعدی، HUD، مودال‌ها و
 * صفحه شروع روی یک بوم تمام‌صفحه.
 * ─────────────────────────────────────────────────────────────
 */
import CityCanvas from './CityCanvas'
import CityHUD from './CityHUD'
import Modals from './Modals'
import StartScreen from './StartScreen'
import { useCityStore } from '@/lib/city-store'
import { useEffect } from 'react'
import { dayDebug, dayState } from './Weather'

export default function Game() {
  const phase = useCityStore((s) => s.phase)

  /* دسترسی دیباگ برای تست خودکار */
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    w.__city = useCityStore
    w.__dayDebug = dayDebug
    w.__dayState = dayState
  }, [])

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-slate-950 select-none">
      {/* صحنه سه‌بعدی ایزومتریک */}
      <div className="absolute inset-0">
        <CityCanvas />
      </div>

      {/* رابط کاربری شناور */}
      <CityHUD />

      {/* مودال‌های گزارش و پایان بازی */}
      <Modals />

      {/* صفحه شروع */}
      {phase === 'start' && <StartScreen />}
    </main>
  )
}
