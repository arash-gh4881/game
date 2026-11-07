'use client'

/**
 * StartScreen.tsx
 * ─────────────────────────────────────────────────────────────
 * صفحه شروع بازی «نگهبان آب»: معرفی داستان، راهنمای کنترل
 * دوربین ایزومتریک و دکمه آغاز دوره مدیریت ۲۰۲۰ تا ۲۰۳۶.
 * ─────────────────────────────────────────────────────────────
 */
import {
  Building2,
  CloudRain,
  Droplets,
  Gamepad2,
  MousePointerClick,
  Move3d,
  Play,
  ZoomIn,
} from 'lucide-react'
import { GAME_YEARS, faInt } from '@/lib/city-config'
import { useCityStore } from '@/lib/city-store'

export default function StartScreen() {
  const startGame = useCityStore((s) => s.startGame)

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-gradient-to-b from-slate-950/92 via-sky-950/90 to-slate-950/95 p-4 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="city-scrollbar max-h-[92vh] w-[min(38rem,100%)] overflow-y-auto rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-2xl md:p-8">
        {/* لوگو و عنوان */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 shadow-lg shadow-sky-500/30">
            <Droplets className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">نگهبان آب</h1>
          <p className="mt-2 text-sm leading-6 text-sky-200/90">
            بازی ایزومتریک مدیریت منابع آب شهری
          </p>
        </div>

        {/* داستان */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[13px] leading-7 text-slate-200">
            شهر کوچک <b className="text-white">«آبادیان»</b> در آستانه بحران آب ایستاده است. از سال{' '}
            <b className="text-sky-300 tabular-nums">{faInt(GAME_YEARS.start)}</b> تا{' '}
            <b className="text-sky-300 tabular-nums">{faInt(GAME_YEARS.end)}</b> فرماندار شهر باشید:
            بودجه را هوشمندانه خرج کنید، با خشکسالی‌ها و سیل‌ها مقابله کنید و با ساخت مخازن باران،
            تصفیه‌خانه، سایت بازچرخانی و آب شیرین‌کن، تعادل <b className="text-white">عرضه و تقاضا</b> را
            حفظ کنید. در پایان، کارنامه مدیریت شما از <b className="text-amber-300">A</b> تا{' '}
            <b className="text-red-300">F</b> اعلام می‌شود.
          </p>
        </div>

        {/* امکانات */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            {
              icon: Building2,
              title: '۶ زیرساخت',
              desc: 'مخزن باران تا نمک‌زدایی با استهلاک واقعی',
            },
            {
              icon: CloudRain,
              title: 'رخدادهای تصادفی',
              desc: 'خشکسالی، سیل، ترکیدگی لوله و گردشگری',
            },
            {
              icon: Gamepad2,
              title: 'دنیای زنده سه‌بعدی',
              desc: 'چرخه شب/روز، آب‌وهوا، ماشین و عابر',
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <f.icon className="mx-auto mb-1.5 h-5 w-5 text-sky-300" />
              <div className="text-xs font-bold text-white">{f.title}</div>
              <div className="mt-1 text-[10px] leading-4 text-slate-400">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* راهنمای کنترل */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-[11px] text-slate-300">
          <span className="flex items-center gap-1.5">
            <Move3d className="h-3.5 w-3.5 text-sky-300" />
            درگ: جابه‌جایی نقشه
          </span>
          <span className="flex items-center gap-1.5">
            <ZoomIn className="h-3.5 w-3.5 text-sky-300" />
            اسکرول/Pinch: زوم
          </span>
          <span className="flex items-center gap-1.5">
            <Move3d className="h-3.5 w-3.5 text-sky-300" />
            Shift+درگ یا Q/E: چرخش
          </span>
          <span className="flex items-center gap-1.5">
            <MousePointerClick className="h-3.5 w-3.5 text-emerald-300" />
            کلیک روی کاشی سبز: ساخت
          </span>
        </div>

        {/* دکمه شروع */}
        <button
          onClick={startGame}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-500 via-teal-500 to-sky-500 py-3.5 text-base font-black text-white shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.02] hover:shadow-emerald-400/40"
        >
          <Play className="h-5 w-5" />
          آغاز دوره مدیریت
        </button>
      </div>
    </div>
  )
}
