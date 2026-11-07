'use client'

/**
 * CityHUD.tsx
 * ─────────────────────────────────────────────────────────────
 * رابط کاربری روی لایه سه‌بعدی (RTL فارسی) — نسخه پولیش‌شده:
 *  • نوار بالا: چیپ‌های آماری با حباب آیکون + نوار پیشرفت سال
 *    + گیج ذخیره آب با تیک آستانه‌ها و چیپ وضعیت
 *  • پنل کنار: کارت‌های خرید با نشان «بودجه ناکافی» و حالت تکمیل ظرفیت
 *  • نوار پایین: مقایسه عرضه/تقاضا با درصد پوشش + لاگ با نقطه رنگی
 *  • دکمه‌های دوربین: زوم +/- ، چرخش و بازنشانی در یک قاب شیشه‌ای
 *  • لغو حالت ساخت با ESC یا کلیک راست
 *
 * Polished HUD overlay: stat chips with year progress bar, water
 * gauge with threshold ticks & status chip, affordability badges,
 * coverage %, colored log dots, zoom buttons, ESC/right-click cancel.
 * ─────────────────────────────────────────────────────────────
 */
import { useEffect } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CloudRain,
  Coins,
  Droplets,
  Filter,
  Hammer,
  Maximize2,
  Mountain,
  Recycle,
  RotateCcw,
  RotateCw,
  SkipForward,
  Users,
  Waves,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  GAME_YEARS,
  INFRASTRUCTURES,
  INFRA_ORDER,
  faBudgetToman,
  faCostShort,
  faInt,
  faPercent,
  scaledCost,
  type InfraType,
} from '@/lib/city-config'
import { useCityStore } from '@/lib/city-store'
import { ROTATE_EVENT, RESET_EVENT, ZOOM_EVENT } from './CityCanvas'

const INFRA_ICONS: Record<
  InfraType,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  rainTank: CloudRain,
  pipeUpgrade: Wrench,
  treatment: Filter,
  dam: Mountain,
  recycling: Recycle,
  desal: Waves,
}

const LOG_COLORS: Record<string, string> = {
  event: 'text-amber-300',
  build: 'text-emerald-300',
  economy: 'text-yellow-200',
  water: 'text-sky-300',
  info: 'text-slate-300',
  danger: 'text-red-400',
}

const LOG_DOTS: Record<string, string> = {
  event: 'bg-amber-400',
  build: 'bg-emerald-400',
  economy: 'bg-yellow-300',
  water: 'bg-sky-400',
  info: 'bg-slate-400',
  danger: 'bg-red-500',
}

/* ─────────────────────────── گیج ذخیره آب ─────────────────────────── */

function ReserveGauge() {
  const reserve = useCityStore((s) => s.reserve)
  const bar =
    reserve >= 50 ? 'from-sky-400 to-emerald-400' : reserve >= 25 ? 'from-amber-400 to-yellow-300' : 'from-red-500 to-orange-400'
  const pulse = reserve < 25 ? 'animate-pulse' : ''
  const status =
    reserve >= 50
      ? { label: 'پایدار', cls: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30' }
      : reserve >= 25
        ? { label: 'هشدار', cls: 'bg-amber-400/15 text-amber-300 border-amber-400/30' }
        : { label: 'بحران!', cls: 'bg-red-500/20 text-red-300 border-red-400/40' }

  return (
    <div className="flex min-w-48 flex-col gap-1" title="درصد ذخیره آب شهر — زیر ۲۵٪ وضعیت بحرانی است">
      <div className="flex items-center justify-between text-[11px] text-sky-100/90">
        <span className="flex items-center gap-1.5">
          <Droplets className="h-3.5 w-3.5" />
          ذخیره آب
          <span className={`rounded-full border px-1.5 py-px text-[9px] font-bold leading-4 ${status.cls}`}>
            {status.label}
          </span>
        </span>
        <span className={`text-sm font-black tabular-nums ${reserve < 25 ? 'text-red-300' : 'text-white'}`}>
          {faPercent(reserve)}
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full border border-white/20 bg-slate-900/60">
        <div
          className={`h-full rounded-full bg-gradient-to-l ${bar} transition-all duration-700 ${pulse}`}
          style={{ width: `${Math.max(2, reserve)}%` }}
        />
        {/* تیک آستانه‌های ۲۵٪ و ۵۰٪ */}
        <span className="absolute inset-y-0 left-1/4 w-px bg-white/45" />
        <span className="absolute inset-y-0 left-1/2 w-px bg-white/45" />
      </div>
    </div>
  )
}

/* ─────────────────────────── پنل ساخت زیرساخت ─────────────────────────── */

function BuildCard({ type }: { type: InfraType }) {
  const def = INFRASTRUCTURES[type]
  const owned = useCityStore((s) => s.infra.filter((i) => i.type === type).length)
  const selected = useCityStore((s) => s.selectedInfra === type)
  const budget = useCityStore((s) => s.budget)
  const phase = useCityStore((s) => s.phase)
  const selectInfra = useCityStore((s) => s.selectInfra)
  const Icon = INFRA_ICONS[type]
  const cost = scaledCost(type, owned)
  const maxed = owned >= def.maxCount
  const afford = budget >= cost
  const disabled = phase !== 'playing' || maxed || !afford

  return (
    <button
      onClick={() => selectInfra(selected ? null : type)}
      disabled={disabled}
      title={disabled && !afford ? 'برای ساخت، بودجه کافی ندارید' : def.desc}
      className={`group w-full rounded-xl border p-3 text-right transition-all duration-200 ${
        selected
          ? '-translate-y-0.5 border-emerald-400 bg-emerald-400/15 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
          : disabled
            ? 'border-white/10 bg-slate-800/40 opacity-60'
            : 'border-white/15 bg-slate-800/70 hover:-translate-y-0.5 hover:border-white/40 hover:bg-slate-700/70 hover:shadow-lg'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
          style={{ backgroundColor: `${def.color}22`, border: `1px solid ${def.color}55` }}
        >
          <Icon className="h-5 w-5" style={{ color: def.color }} />
          {maxed && (
            <span className="absolute -left-1.5 -top-1.5 rounded-full bg-slate-600 px-1 text-[9px] font-bold text-white">
              پر
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-bold text-white">{def.name}</h3>
            <span className="shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-200">
              {faInt(owned)}/{faInt(def.maxCount)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {def.tags.map((t) => (
              <span
                key={t}
                className="rounded-full px-1.5 py-0.5 text-[10px]"
                style={{ backgroundColor: `${def.color}1e`, color: def.color }}
              >
                {t}
              </span>
            ))}
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-[11px]">
            <span className={`flex items-center gap-1 ${afford ? 'text-amber-300' : 'font-bold text-red-400'}`}>
              <Coins className="h-3 w-3" />
              {faCostShort(cost)}
            </span>
            <span className="flex items-center gap-1 text-sky-300">
              <Droplets className="h-3 w-3" />+{faInt(def.supplyBonus)}
            </span>
            <span className="text-slate-400">نگهداری {faCostShort(def.maintenance)}/سال</span>
          </div>
          {!afford && !maxed && (
            <div className="mt-1.5 flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              <AlertTriangle className="h-3 w-3" />
              بودجه ناکافی — مالیات شهری را منتظر بمانید
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-slate-400 group-hover:text-slate-300">
        {def.desc}
      </p>
    </button>
  )
}

function SidePanel() {
  const selected = useCityStore((s) => s.selectedInfra)
  const selectedDef = selected ? INFRASTRUCTURES[selected] : null
  return (
    <div className="pointer-events-auto flex max-h-[calc(100vh-13.5rem)] w-80 flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-900/80 shadow-2xl backdrop-blur-md">
      <div className="border-b border-white/10 bg-gradient-to-l from-emerald-500/15 to-transparent px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/20">
              <Hammer className="h-4 w-4 text-emerald-300" />
            </span>
            زیرساخت‌های آبی
          </h2>
          {selected ? (
            <button
              onClick={() => useCityStore.getState().selectInfra(null)}
              className="flex items-center gap-1 rounded-lg bg-red-500/20 px-2 py-1 text-[11px] text-red-200 transition hover:bg-red-500/35"
            >
              <X className="h-3 w-3" />
              لغو (Esc)
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">یکی را انتخاب کنید</span>
          )}
        </div>
      </div>
      {selected && selectedDef && (
        <div className="border-b border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-center text-[11px] text-emerald-200 animate-soft-pulse">
          حالت ساخت «{selectedDef.short}» — روی یکی از کاشی‌های سبز نقشه کلیک کنید
        </div>
      )}
      <div className="city-scrollbar flex flex-col gap-2 overflow-y-auto p-3">
        {INFRA_ORDER.map((t) => (
          <BuildCard key={t} type={t} />
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────── نوار پایین: عرضه/تقاضا + لاگ ─────────────────────────── */

function SupplyDemandBar() {
  const supply = useCityStore((s) => s.supply)
  const demand = useCityStore((s) => s.demand)
  const max = Math.max(supply, demand, 1)
  const deficit = demand > supply
  const coverage = demand > 0 ? Math.round((supply / demand) * 100) : 100
  const covCls =
    coverage >= 100
      ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-300'
      : coverage >= 85
        ? 'border-amber-400/30 bg-amber-400/15 text-amber-300'
        : 'border-red-400/40 bg-red-500/15 text-red-300 animate-pulse'

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1 text-sky-300">
          <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.9)]" />
          عرضه {faInt(supply)}
        </span>
        <span className="text-slate-400">میلیون لیتر/سال</span>
        <span className={`flex items-center gap-1 ${deficit ? 'text-red-300' : 'text-amber-200'}`}>
          <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
          تقاضا {faInt(demand)}
        </span>
      </div>
      <div className="flex h-3.5 w-full overflow-hidden rounded-full border border-white/15 bg-slate-900/70" dir="ltr">
        <div
          className="h-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-700"
          style={{ width: `${(supply / max) * 100}%` }}
        />
        <div
          className="h-full bg-gradient-to-r from-amber-500/90 to-amber-400/90 transition-all duration-700"
          style={{ width: `${(demand / max) * 100}%` }}
        />
      </div>
      <div className="flex items-center justify-center gap-2">
        <span className={`rounded-full border px-2 py-px text-[10px] font-bold ${covCls}`}>
          پوشش تقاضا: {faPercent(Math.min(coverage, 999))}
        </span>
        {deficit && (
          <span className="text-[10px] font-bold text-red-300 animate-soft-pulse">
            کسری عرضه — ذخیره شهر در حال تخلیه است!
          </span>
        )}
      </div>
    </div>
  )
}

function EventLog() {
  const log = useCityStore((s) => s.log)
  return (
    <div className="city-scrollbar flex h-full max-h-24 flex-col gap-1 overflow-y-auto pl-1 text-[11px] leading-5 md:max-h-20">
      {log.slice(0, 8).map((e, i) => (
        <div key={e.id} className={`flex items-start gap-1.5 ${i === 0 ? 'animate-hud-slide' : ''}`}>
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${LOG_DOTS[e.kind] ?? 'bg-slate-400'}`} />
          <span className="shrink-0 tabular-nums text-slate-500">{faInt(e.year)}:</span>
          <span className={`${LOG_COLORS[e.kind] ?? 'text-slate-300'} ${i === 0 ? 'font-bold' : ''}`}>
            {e.text}
          </span>
        </div>
      ))}
    </div>
  )
}

function BottomBar() {
  return (
    <div className="pointer-events-auto mx-auto flex w-[min(56rem,calc(100vw-1.5rem))] flex-col gap-2 rounded-2xl border border-white/15 bg-slate-900/80 p-3 shadow-2xl backdrop-blur-md md:flex-row md:items-center md:gap-4">
      <div className="md:w-64 md:shrink-0">
        <SupplyDemandBar />
      </div>
      <div className="hidden w-px self-stretch bg-white/10 md:block" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <span className="h-1 w-4 rounded-full bg-gradient-to-l from-sky-400 to-emerald-400" />
          تازه‌ترین رویدادهای شهر
        </div>
        <EventLog />
      </div>
    </div>
  )
}

/* ─────────────────────────── دکمه‌های دوربین ─────────────────────────── */

function CameraButtons() {
  const rotate = (d: number) => window.dispatchEvent(new CustomEvent(ROTATE_EVENT, { detail: d }))
  const zoom = (f: number) => window.dispatchEvent(new CustomEvent(ZOOM_EVENT, { detail: f }))
  const btn =
    'flex h-9 w-9 items-center justify-center text-slate-200 transition hover:bg-white/10 active:scale-95'
  return (
    <div className="pointer-events-auto absolute bottom-28 right-4 flex flex-col overflow-hidden rounded-xl border border-white/15 bg-slate-900/80 shadow-xl backdrop-blur-md md:bottom-24">
      <button onClick={() => zoom(1.25)} title="بزرگ‌نمایی" className={btn}>
        <ZoomIn className="h-4 w-4" />
      </button>
      <button onClick={() => zoom(0.8)} title="کوچک‌نمایی" className={btn}>
        <ZoomOut className="h-4 w-4" />
      </button>
      <span className="mx-2 h-px bg-white/15" />
      <button onClick={() => rotate(-0.28)} title="چرخش چپ (کلید Q)" className={btn}>
        <RotateCcw className="h-4 w-4" />
      </button>
      <button onClick={() => rotate(0.28)} title="چرخش راست (کلید E)" className={btn}>
        <RotateCw className="h-4 w-4" />
      </button>
      <span className="mx-2 h-px bg-white/15" />
      <button
        onClick={() => window.dispatchEvent(new Event(RESET_EVENT))}
        title="بازنشانی دوربین"
        className={btn}
      >
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ─────────────────────────── نوار بالای صفحه ─────────────────────────── */

function TopBar() {
  const year = useCityStore((s) => s.year)
  const population = useCityStore((s) => s.population)
  const budget = useCityStore((s) => s.budget)
  const phase = useCityStore((s) => s.phase)
  const endYear = useCityStore((s) => s.endYear)
  const canEnd = phase === 'playing'
  const progress = Math.min(
    100,
    Math.max(0, ((year - GAME_YEARS.start) / (GAME_YEARS.end - GAME_YEARS.start + 1)) * 100),
  )

  const statChip =
    'flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-xs text-slate-200 ring-1 ring-white/5 transition hover:bg-white/10'

  return (
    <div className="pointer-events-auto mx-auto flex w-[min(72rem,calc(100vw-1.5rem))] flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-white/15 bg-slate-900/80 px-4 py-2.5 shadow-2xl backdrop-blur-md">
      <h1 className="flex items-center gap-2 text-base font-black text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 shadow-lg shadow-sky-500/30">
          <Droplets className="h-5 w-5 text-white" />
        </span>
        نگهبان آب
      </h1>

      {/* سال + نوار پیشرفت دوره */}
      <div className={`${statChip} relative flex-col !items-stretch !gap-0.5 !py-1.5`} title="پیشرفت دوره مدیریت">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-sky-300" />
          <span className="font-bold tabular-nums">{faInt(year)}</span>
          <span className="text-slate-500">/ {faInt(GAME_YEARS.end)}</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-l from-sky-400 to-emerald-400 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className={statChip} title="جمعیت شهر آبادیان">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-400/15">
          <Users className="h-3.5 w-3.5 text-emerald-300" />
        </span>
        <span className="font-bold tabular-nums">{faInt(population)}</span>
        <span className="text-slate-400">نفر</span>
      </div>

      <div
        className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs ring-1 ${
          budget < 0
            ? 'bg-red-500/15 text-red-200 ring-red-400/30'
            : 'bg-white/5 text-slate-200 ring-white/5 transition hover:bg-white/10'
        }`}
        title="خزانه شهر (تومان)"
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-lg ${
            budget < 0 ? 'bg-red-400/20' : 'bg-amber-400/15'
          }`}
        >
          <Coins className={`h-3.5 w-3.5 ${budget < 0 ? 'text-red-300' : 'text-amber-300'}`} />
        </span>
        <span className="font-bold tabular-nums">{faBudgetToman(budget)}</span>
      </div>

      <div className="min-w-44 flex-1">
        <ReserveGauge />
      </div>

      <button
        onClick={endYear}
        disabled={!canEnd}
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-lg transition-all ${
          canEnd
            ? 'bg-gradient-to-l from-emerald-500 to-teal-500 text-white hover:scale-[1.04] hover:shadow-emerald-500/40 active:scale-95'
            : 'cursor-not-allowed bg-slate-700 text-slate-400'
        }`}
      >
        <SkipForward className="h-4 w-4" />
        پایان سال
      </button>
    </div>
  )
}

/* ─────────────────────────── پیام خطا شناور ─────────────────────────── */

function ErrorChip() {
  const error = useCityStore((s) => s.errorMessage)
  const clearError = useCityStore((s) => s.clearError)

  useEffect(() => {
    if (!error) return
    const t = setTimeout(clearError, 2800)
    return () => clearTimeout(t)
  }, [error, clearError])

  if (!error) return null
  return (
    <div className="pointer-events-none absolute left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-red-400/40 bg-red-950/85 px-4 py-2 text-xs font-bold text-red-200 shadow-xl backdrop-blur-md animate-hud-slide">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/30">
        <AlertTriangle className="h-3 w-3 text-red-300" />
      </span>
      {error}
    </div>
  )
}

/* ─────────────────────────── HUD اصلی ─────────────────────────── */

export default function CityHUD() {
  const phase = useCityStore((s) => s.phase)
  const selected = useCityStore((s) => s.selectedInfra)
  const selectInfra = useCityStore((s) => s.selectInfra)

  if (phase === 'start') return null

  return (
    <HUDShell
      selected={selected !== null}
      cancel={() => selectInfra(null)}
    />
  )
}

function HUDShell({ selected, cancel }: { selected: boolean; cancel: () => void }) {
  /* لغو حالت ساخت با Escape یا راست‌کلیک ساده (بدون درگ چرخش دوربین) */
  useEffect(() => {
    if (!selected) return
    let downX = 0
    let downY = 0
    const onDown = (e: PointerEvent) => {
      downX = e.clientX
      downY = e.clientY
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel()
    }
    const onCtx = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) cancel()
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('contextmenu', onCtx)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('contextmenu', onCtx)
    }
  }, [selected, cancel])

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col" dir="rtl">
      {/* نوار بالا */}
      <div className="flex justify-center px-3 pt-3">
        <TopBar />
      </div>

      {/* پنل کنار ساخت */}
      <div className="absolute right-3 top-24 hidden lg:block">
        <SidePanel />
      </div>

      <CameraButtons />
      <ErrorChip />

      {/* نوار پایین */}
      <div className="mt-auto flex justify-center px-3 pb-3">
        <BottomBar />
      </div>

      {/* پنل ساخت موبایل — شیت پایین */}
      {selected && (
        <div className="pointer-events-auto absolute bottom-28 left-3 right-3 lg:hidden">
          <div className="rounded-xl border border-emerald-400/40 bg-slate-900/85 px-4 py-2 text-center text-xs text-emerald-200 backdrop-blur-md animate-soft-pulse">
            حالت ساخت فعال: روی کاشی سبز کلیک کنید — لغو با دکمه × پنل
          </div>
        </div>
      )}
      <MobileBuildSheet />
    </div>
  )
}

/* شیت ساخت موبایل: دکمه‌های شناور در صفحات کوچک */
function MobileBuildSheet() {
  const phase = useCityStore((s) => s.phase)
  const infra = useCityStore((s) => s.infra)
  const budget = useCityStore((s) => s.budget)
  const selectedInfra = useCityStore((s) => s.selectedInfra)
  const selectInfra = useCityStore((s) => s.selectInfra)
  if (phase === 'start') return null
  return (
    <div className="pointer-events-auto absolute bottom-28 left-3 flex flex-col gap-1 lg:hidden" dir="rtl">
      {INFRA_ORDER.map((t) => {
        const def = INFRASTRUCTURES[t]
        const Icon = INFRA_ICONS[t]
        const owned = infra.filter((i) => i.type === t).length
        const selected = selectedInfra === t
        const afford = budget >= scaledCost(t, owned)
        const maxed = owned >= def.maxCount
        return (
          <button
            key={t}
            onClick={() => selectInfra(selected ? null : t)}
            disabled={maxed || (!afford && !selected)}
            className={`relative flex h-10 w-10 items-center justify-center rounded-lg border backdrop-blur-md transition disabled:opacity-40 ${
              selected ? 'border-emerald-400 bg-emerald-400/25' : 'border-white/15 bg-slate-900/80'
            }`}
            title={`${def.name} — هزینه ${faCostShort(scaledCost(t, owned))} | نگهداری ${faCostShort(def.maintenance)}/سال | +${faInt(def.supplyBonus)} میلیون لیتر`}
          >
            <Icon className="h-5 w-5" style={{ color: def.color }} />
            {!afford && !maxed && (
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white">
                !
              </span>
            )}
            {maxed && (
              <span className="absolute -right-1 -top-1 rounded-full bg-slate-600 px-1 text-[8px] font-bold text-white">
                پر
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
