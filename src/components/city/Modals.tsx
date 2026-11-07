'use client'

/**
 * Modals.tsx
 * ─────────────────────────────────────────────────────────────
 * مودال گزارش پایان سال (صورت‌مالی کامل) و مودال پایان بازی
 * با کارنامه، گرید A تا F و جدول تاریخچه سال‌های مدیریت.
 *
 * Yearly report modal (full income/expense statement) and the
 * game-over modal with report card, A–F grade & history table.
 * ─────────────────────────────────────────────────────────────
 */
import {
  CheckCircle2,
  CloudRain,
  Coffee,
  Coins,
  Droplets,
  FileBarChart2,
  RotateCcw,
  Sun,
  ThermometerSun,
  Trophy,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import {
  GAME_YEARS,
  INFRASTRUCTURES,
  faBudgetToman,
  faInt,
  faPercent,
  faSignedToman,
  type EventId,
  type YearlyReport,
} from '@/lib/city-config'
import { useCityStore } from '@/lib/city-store'

/* آیکون و رنگ هر رخداد برای کارت گزارش */
const EVENT_STYLE: Record<EventId, { Icon: LucideIcon; cls: string; iconCls: string }> = {
  drought: { Icon: Sun, cls: 'border-amber-400/30 bg-amber-400/10', iconCls: 'text-amber-300' },
  heatwave: { Icon: ThermometerSun, cls: 'border-orange-400/30 bg-orange-400/10', iconCls: 'text-orange-300' },
  flood: { Icon: CloudRain, cls: 'border-sky-400/30 bg-sky-400/10', iconCls: 'text-sky-300' },
  pipeBurst: { Icon: Wrench, cls: 'border-red-400/30 bg-red-400/10', iconCls: 'text-red-300' },
  tourist: { Icon: Users, cls: 'border-violet-400/30 bg-violet-400/10', iconCls: 'text-violet-300' },
  calm: { Icon: Coffee, cls: 'border-emerald-400/30 bg-emerald-400/10', iconCls: 'text-emerald-300' },
}

/* ─────────────────────────── مودال گزارش سالانه ─────────────────────────── */

function ReportRow({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-1.5 text-xs">
      <span className="text-slate-400">{label}</span>
      <span
        className={`font-bold tabular-nums ${
          tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-red-300' : 'text-slate-100'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function YearlyReportModal({ report }: { report: YearlyReport }) {
  const confirm = useCityStore((s) => s.confirmReport)
  const deficit = report.demand > report.supply

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" dir="rtl">
      <div className="city-scrollbar animate-pop-in max-h-[88vh] w-[min(30rem,100%)] overflow-y-auto rounded-2xl border border-white/15 bg-slate-900/95 shadow-2xl">
        {/* هدر گرادیانی */}
        <div className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-white/10 bg-gradient-to-l from-sky-500/25 via-slate-900/95 to-slate-900/95 px-5 py-3.5 backdrop-blur-md">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/20 ring-1 ring-sky-400/40">
            <FileBarChart2 className="h-5 w-5 text-sky-300" />
          </span>
          <div>
            <h2 className="text-base font-black text-white">گزارش سال مالی {faInt(report.year)}</h2>
            <p className="text-[10px] text-slate-400">صورت عملکرد شهر آبادیان در این سال</p>
          </div>
        </div>

        <div className="p-5 pt-4">
        {/* کارت رخداد */}
        {report.event && (() => {
          const st = EVENT_STYLE[report.event.id]
          return (
            <div className={`mb-3 flex items-start gap-3 rounded-xl border p-3 ${st.cls}`}>
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10`}>
                <st.Icon className={`h-5 w-5 ${st.iconCls}`} />
              </span>
              <div>
                <div className="text-xs font-black text-white">رخداد سال: {report.event.name}</div>
                <p className="mt-1 text-[11px] leading-5 text-slate-300">{report.event.desc}</p>
              </div>
            </div>
          )
        })()}

        {/* آب */}
        <div className={`mb-3 rounded-xl border p-3 ${deficit ? 'border-red-400/30 bg-red-400/10' : 'border-sky-400/30 bg-sky-400/10'}`}>
          <div className="flex items-center justify-between text-xs font-bold text-white">
            <span className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-sky-300" />
              موازنه آب
            </span>
            <span className={deficit ? 'text-red-300' : 'text-emerald-300'}>
              {deficit ? 'کسری عرضه!' : 'تعادل برقرار است'}
            </span>
          </div>
          <div className="mt-2">
            <ReportRow label="عرضه (میلیون لیتر)" value={faInt(report.supply)} />
            <ReportRow label="تقاضا (میلیون لیتر)" value={faInt(report.demand)} />
            <ReportRow
              label="تغییر ذخیره آب"
              value={`${faPercent(report.reserveBefore)} ← ${faPercent(report.reserveAfter)} (${report.reserveDelta >= 0 ? '+' : '−'}${faInt(Math.abs(report.reserveDelta))})`}
              tone={report.reserveDelta >= 0 ? 'good' : 'bad'}
            />
          </div>
        </div>

        {/* اقتصاد */}
        <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-white">
            <Coins className="h-4 w-4 text-amber-300" />
            صورت مالی شهر
          </div>
          <ReportRow label="درآمد مالیات شهری" value={faBudgetToman(report.taxes)} tone="good" />
          <ReportRow label="هزینه نگهداری زیرساخت" value={`−${faBudgetToman(report.maintenance)}`} tone="bad" />
          {report.disasterCost > 0 && (
            <ReportRow label="خسارت رخداد" value={`−${faBudgetToman(report.disasterCost)}`} tone="bad" />
          )}
          <ReportRow
            label="خالص درآمد سال"
            value={faSignedToman(report.net)}
            tone={report.net >= 0 ? 'good' : 'bad'}
          />
          <ReportRow label="بودجه پایان سال" value={faBudgetToman(report.budgetAfter)} />
          <ReportRow
            label="جمعیت شهر"
            value={`${faInt(report.population)} نفر (${report.populationDelta >= 0 ? '+' : '−'}${faInt(Math.abs(report.populationDelta))})`}
            tone={report.populationDelta >= 0 ? 'good' : 'bad'}
          />
        </div>

        {/* زیرساخت */}
        {report.infrastructure.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {report.infrastructure.map(({ type, count }) => (
              <span key={type} className="rounded-lg bg-white/10 px-2 py-1 text-[10px] text-slate-200">
                {INFRASTRUCTURES[type].short} × {faInt(count)} — سلامت{' '}
                {faPercent(
                  Math.round(
                    useCityStore
                      .getState()
                      .infra.filter((i) => i.type === type)
                      .reduce((s, i) => s + i.health, 0) / count * 100,
                  ),
                )}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={confirm}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-emerald-500 to-teal-500 py-2.5 text-sm font-black text-white shadow-lg transition hover:scale-[1.01] active:scale-95"
        >
          <CheckCircle2 className="h-4 w-4" />
          ادامه مدیریت — سال {faInt(report.year + 1)}
        </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── مودال پایان بازی ─────────────────────────── */

function GameOverModal() {
  const grade = useCityStore((s) => s.grade)
  const reason = useCityStore((s) => s.gameOverReason)
  const year = useCityStore((s) => s.year)
  const population = useCityStore((s) => s.population)
  const budget = useCityStore((s) => s.budget)
  const reserve = useCityStore((s) => s.reserve)
  const infra = useCityStore((s) => s.infra)
  const history = useCityStore((s) => s.history)
  const restart = useCityStore((s) => s.restart)

  if (!grade || !reason) return null

  const reasonText =
    reason === 'completed'
      ? `دوره مدیریت شما از سال ${faInt(GAME_YEARS.start)} تا ${faInt(GAME_YEARS.end)} به پایان رسید.`
      : reason === 'bankrupt'
        ? `در سال ${faInt(year - 1)} خزانه شهر ورشکست شد و مدیریت از شما سلب گردید.`
        : `در سال ${faInt(year - 1)} جمعیت شهر به زیر آستانه بحران رسید و آبادیان خالی از سکنه شد.`

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" dir="rtl">
      <div className="city-scrollbar animate-pop-in max-h-[88vh] w-[min(34rem,100%)] overflow-y-auto rounded-2xl border border-white/15 bg-slate-900/95 shadow-2xl">
        <div className="flex flex-col items-center bg-gradient-to-b from-amber-400/10 to-transparent px-5 pt-6 text-center">
          <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15 ring-1 ring-amber-300/40">
            <Trophy className="h-6 w-6 text-amber-300" />
          </span>
          <h2 className="text-lg font-black text-white">کارنامه نگهبان آب</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">{reasonText}</p>

          {/* نشان گرید */}
          <div
            className="animate-pop-in mt-4 flex h-24 w-24 items-center justify-center rounded-3xl text-5xl font-black shadow-xl"
            style={{
              backgroundColor: `${grade.color}22`,
              border: `3px solid ${grade.color}`,
              boxShadow: `0 0 34px ${grade.color}55, inset 0 0 18px ${grade.color}22`,
              color: grade.color,
            }}
          >
            {grade.grade}
          </div>
          <div className="mt-2 text-sm font-bold" style={{ color: grade.color }}>
            {grade.title}
          </div>
        </div>

        <div className="p-5 pt-4">

        {/* خلاصه وضعیت نهایی */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          {[
            { label: 'ذخیره نهایی آب', value: faPercent(reserve) },
            { label: 'جمعیت پایانی', value: `${faInt(population)} نفر` },
            { label: 'خزانه شهر', value: faBudgetToman(budget) },
            { label: 'زیرساخت‌ها', value: `${faInt(infra.length)} واحد` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-center">
              <div className="text-[10px] text-slate-400">{s.label}</div>
              <div className="mt-0.5 text-sm font-black tabular-nums text-white">{s.value}</div>
            </div>
          ))}
        </div>

        {/* جدول تاریخچه */}
        {history.length > 0 && (
          <div className="mb-4 overflow-hidden rounded-xl border border-white/10">
            <div className="city-scrollbar max-h-44 overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-slate-800 text-slate-300">
                  <tr>
                    <th className="px-2 py-1.5 text-right font-bold">سال</th>
                    <th className="px-2 py-1.5 text-right font-bold">ذخیره</th>
                    <th className="px-2 py-1.5 text-right font-bold">جمعیت</th>
                    <th className="px-2 py-1.5 text-right font-bold">خزانه (میلیارد)</th>
                    <th className="px-2 py-1.5 text-right font-bold">عرضه/تقاضا</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {history.map((h) => (
                    <tr key={h.year} className="border-t border-white/5">
                      <td className="px-2 py-1 tabular-nums">{faInt(h.year)}</td>
                      <td className={`px-2 py-1 tabular-nums ${h.reserve < 25 ? 'text-red-300' : ''}`}>
                        {faPercent(h.reserve)}
                      </td>
                      <td className="px-2 py-1 tabular-nums">{faInt(h.population)}</td>
                      <td className="px-2 py-1 tabular-nums">{(h.budget / 1e9).toFixed(1)}</td>
                      <td className="px-2 py-1 tabular-nums">
                        {faInt(h.supply)}/{faInt(h.demand)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={restart}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-sky-500 to-cyan-500 py-2.5 text-sm font-black text-white shadow-lg transition hover:scale-[1.01] active:scale-95"
        >
          <RotateCcw className="h-4 w-4" />
          مدیریت دوباره آبادیان
        </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── رابط اصلی مودال‌ها ─────────────────────────── */

export default function Modals() {
  const phase = useCityStore((s) => s.phase)
  const lastReport = useCityStore((s) => s.lastReport)

  if (phase === 'report' && lastReport) return <YearlyReportModal report={lastReport} />
  if (phase === 'gameover') return <GameOverModal />
  return null
}
