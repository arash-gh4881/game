'use client'

import dynamic from 'next/dynamic'
import { Droplets } from 'lucide-react'

/** بازی فقط سمت کلاینت رندر می‌شود (WebGL) */
const Game = dynamic(() => import('@/components/city/Game'), {
  ssr: false,
  loading: () => (
    <main className="flex h-[100dvh] w-full items-center justify-center bg-slate-950" dir="rtl">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400">
          <Droplets className="h-9 w-9 text-white" />
        </div>
        <p className="text-sm font-bold text-sky-200">در حال بارگذاری شهر آبادیان…</p>
      </div>
    </main>
  ),
})

export default function Page() {
  return <Game />
}
