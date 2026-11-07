/**
 * city-store.ts
 * ─────────────────────────────────────────────────────────────
 * مدیریت وضعیت کامل بازی «نگهبان آب» با Zustand.
 * چرخه نوبتی سالانه ۲۰۲۰ تا ۲۰۳۶، اقتصاد شهری، محاسبات عرضه/تقاضا،
 * استهلاک زیرساخت، رخدادهای تصادفی، امتیازدهی نهایی و رابط گرید ساخت.
 *
 * Full game state: yearly turn engine, water math, economy,
 * depreciation, random events, grading & build-grid interface.
 * ─────────────────────────────────────────────────────────────
 */
import { create } from 'zustand'
import {
  ABANDONMENT_POPULATION,
  BANKRUPTCY_LIMIT,
  BASE_LEAKAGE,
  BASE_RESERVE_CAPACITY_ML,
  BASE_SUPPLY_ML,
  EVENTS,
  EVENT_IDS,
  GAME_YEARS,
  GRID_COLS,
  GRID_ROWS,
  INFRASTRUCTURES,
  INITIAL_STATE,
  LEAKAGE_REDUCTION_PER_PIPE,
  MIN_LEAKAGE,
  PER_CAPITA_DEMAND_ML,
  TAX_PER_CAPITA,
  computeGrade,
  faBudgetToman,
  faInt,
  faPercent,
  scaledCost,
  tileKey,
  type EventId,
  type GameOverReason,
  type GradeInfo,
  type HistoryYear,
  type InfraInstance,
  type InfraType,
  type LogEntry,
  type LogKind,
  type Phase,
  type TilePos,
  type WeatherKind,
  type YearlyReport,
} from './city-config'

/* ─────────────────────────────── Estado ─────────────────────────────── */

export interface BuildFx {
  id: number
  x: number
  z: number
  type: InfraType
}

export interface CityStoreState {
  phase: Phase
  year: number
  population: number
  initialPopulation: number
  budget: number
  reserve: number
  /** آخرین عرضه/تقاضای محاسبه‌شده برای HUD */
  supply: number
  demand: number
  weather: WeatherKind
  infra: InfraInstance[]
  log: LogEntry[]
  history: HistoryYear[]
  lastReport: YearlyReport | null
  grade: GradeInfo | null
  gameOverReason: GameOverReason | null
  selectedInfra: InfraType | null
  hoveredTile: string | null
  buildFx: BuildFx | null
  errorMessage: string | null

  /* actions */
  startGame: () => void
  restart: () => void
  selectInfra: (t: InfraType | null) => void
  setHoveredTile: (key: string | null) => void
  build: (tile: TilePos) => void
  endYear: () => void
  confirmReport: () => void
  clearError: () => void
  clearBuildFx: () => void
}

let infraSeq = 0
let logSeq = 0
let fxSeq = 0

const nextInfraId = () => `infra-${++infraSeq}`
const nextLogId = () => `log-${++logSeq}`

/* ────────────────────── موتور محاسبات سالانه (Year Engine) ────────────────────── */

/** بازدهی پس از استهلاک: هر سال ۶٪ افت تا کف ۳۵٪ */
function healthFor(age: number): number {
  return Math.max(0.35, 1 - age * 0.06)
}

function pickEvent(): EventId {
  const total = EVENT_IDS.reduce((s, id) => s + EVENTS[id].weight, 0)
  let roll = Math.random() * total
  for (const id of EVENT_IDS) {
    roll -= EVENTS[id].weight
    if (roll <= 0) return id
  }
  return 'calm'
}

function pushLog(
  log: LogEntry[],
  year: number,
  kind: LogKind,
  text: string,
): LogEntry[] {
  const entry: LogEntry = { id: nextLogId(), year, kind, text }
  return [entry, ...log].slice(0, 60)
}

/* ─────────────────────────────── Store ─────────────────────────────── */

export const useCityStore = create<CityStoreState>((set, get) => ({
  phase: 'start',
  year: GAME_YEARS.start,
  population: INITIAL_STATE.population,
  initialPopulation: INITIAL_STATE.population,
  budget: INITIAL_STATE.budget,
  reserve: INITIAL_STATE.reserve,
  supply: BASE_SUPPLY_ML,
  demand: INITIAL_STATE.population * PER_CAPITA_DEMAND_ML,
  weather: 'clear',
  infra: [],
  log: [
    {
      id: nextLogId(),
      year: GAME_YEARS.start,
      kind: 'info',
      text: 'به آبادیان خوش آمدید! با ساخت زیرساخت‌ها و پایان هر سال، چرخه شهر را مدیریت کنید.',
    },
  ],
  history: [],
  lastReport: null,
  grade: null,
  gameOverReason: null,
  selectedInfra: null,
  hoveredTile: null,
  buildFx: null,
  errorMessage: null,

  startGame: () =>
    set({
      phase: 'playing',
      year: GAME_YEARS.start,
      population: INITIAL_STATE.population,
      initialPopulation: INITIAL_STATE.population,
      budget: INITIAL_STATE.budget,
      reserve: INITIAL_STATE.reserve,
      supply: BASE_SUPPLY_ML,
      demand: INITIAL_STATE.population * PER_CAPITA_DEMAND_ML,
      weather: 'clear',
      infra: [],
      history: [],
      lastReport: null,
      grade: null,
      gameOverReason: null,
      selectedInfra: null,
      hoveredTile: null,
      buildFx: null,
      errorMessage: null,
      log: [
        {
          id: nextLogId(),
          year: GAME_YEARS.start,
          kind: 'info',
          text: `سال ${faInt(GAME_YEARS.start)}: میدان فرمانداری آبادیان به شما سپرده شد. ذخیره آب ${faPercent(INITIAL_STATE.reserve)} است.`,
        },
      ],
    }),

  restart: () => get().startGame(),

  selectInfra: (t) => set({ selectedInfra: t, errorMessage: null }),

  setHoveredTile: (key) => set({ hoveredTile: key }),

  clearError: () => set({ errorMessage: null }),

  clearBuildFx: () => set({ buildFx: null }),

  /**
   * ساخت زیرساخت روی کاشی انتخابی — اعتبارسنجی کامل:
   * فاز بازی، انتخاب فعال، خالی بودن زمین، سقف تعداد و بودجه.
   */
  build: (tile) => {
    const s = get()
    if (s.phase !== 'playing') return
    const type = s.selectedInfra
    if (!type) return
    const def = INFRASTRUCTURES[type]
    const key = tileKey(tile)
    if (s.hoveredTile !== key) set({ hoveredTile: key })

    if (s.infra.some((i) => tileKey(i.tile) === key)) {
      set({ errorMessage: 'این زمین اشغال است! کاشی خالی دیگری انتخاب کنید.' })
      return
    }
    const owned = s.infra.filter((i) => i.type === type).length
    if (owned >= def.maxCount) {
      set({ errorMessage: `سقف ساخت «${def.short}» (${def.maxCount} واحد) پر شده است.` })
      return
    }
    const cost = scaledCost(type, owned)
    if (s.budget < cost) {
      set({ errorMessage: 'بودجه کافی نیست! مالیات شهری منتظر شماست.' })
      return
    }

    const inst: InfraInstance = {
      id: nextInfraId(),
      type,
      tile,
      age: 0,
      health: 1,
    }
    fxSeq += 1
    const { x, z } = { x: (tile.col - (GRID_COLS - 1) / 2) * 2.2, z: (tile.row - (GRID_ROWS - 1) / 2) * 2.2 }

    set({
      infra: [...s.infra, inst],
      budget: s.budget - cost,
      selectedInfra: null,
      errorMessage: null,
      buildFx: { id: fxSeq, x, z, type },
      log: pushLog(
        s.log,
        s.year,
        'build',
        `🏗️ «${def.name}» با هزینه ${faBudgetToman(cost)} ساخته شد.`,
      ),
    })
  },

  /**
   * پایان سال مالی — اجرای کامل چرخه:
   * رخداد ← عرضه/تقاضا ← ذخیره ← مالیات و نگهداری ← جمعیت ← استهلاک
   */
  endYear: () => {
    const s = get()
    if (s.phase !== 'playing') return

    const ev = EVENTS[pickEvent()]
    const year = s.year

    /* ۱) استهلاک و بازدهی زیرساخت‌ها */
    const aged = s.infra.map((i) => {
      const age = i.age + 1
      return { ...i, age, health: healthFor(age) }
    })

    const countOf = (t: InfraType) => aged.filter((i) => i.type === t).length
    const pipeCount = countOf('pipeUpgrade')
    const damCount = countOf('dam')

    /* ۲) تقاضا — جمعیت × سرانه × ضریب رخداد */
    const demand = s.population * PER_CAPITA_DEMAND_ML * ev.demandMult

    /* ۳) عرضه — پایه + زیرساخت×بازدهی×ضریب رخداد − نشت */
    const grossSupply =
      BASE_SUPPLY_ML +
      countOf('rainTank') * INFRASTRUCTURES.rainTank.supplyBonus * ev.rainTankMult +
      countOf('treatment') * INFRASTRUCTURES.treatment.supplyBonus *
        (countOf('treatment') ? ev.treatmentMult : 1) +
      damCount * INFRASTRUCTURES.dam.supplyBonus +
      countOf('recycling') * INFRASTRUCTURES.recycling.supplyBonus +
      countOf('desal') * INFRASTRUCTURES.desal.supplyBonus +
      pipeCount * INFRASTRUCTURES.pipeUpgrade.supplyBonus

    // بازدهی واقعی: میانگین وزنی سلامت
    const infraSupply = grossSupply - BASE_SUPPLY_ML
    const healthAvg =
      aged.length > 0
        ? aged.reduce((sum, i) => sum + i.health * INFRASTRUCTURES[i.type].supplyBonus, 0) /
          aged.reduce((sum, i) => sum + INFRASTRUCTURES[i.type].supplyBonus, 0)
        : 1
    const leakage = Math.max(MIN_LEAKAGE, BASE_LEAKAGE - pipeCount * LEAKAGE_REDUCTION_PER_PIPE)
    let supply = (BASE_SUPPLY_ML + infraSupply * healthAvg) * (1 - leakage)

    // ترکیدگی لوله: افت عرضه که با ارتقای شبکه کم می‌شود
    if (ev.id === 'pipeBurst') {
      supply *= 0.82 + 0.05 * pipeCount
    }
    supply = Math.max(0, supply)

    /* ۴) به‌روزرسانی ذخیره آب */
    const capacity =
      BASE_RESERVE_CAPACITY_ML + damCount * (INFRASTRUCTURES.dam.capacityBonus ?? 0)
    const reserveDelta = ((supply - demand) / capacity) * 100 + ev.reserveFlat
    const reserve = Math.min(100, Math.max(0, s.reserve + reserveDelta))

    /* ۵) اقتصاد — مالیات، نگهداری، خسارت رخداد */
    const taxes = s.population * TAX_PER_CAPITA * ev.taxMult
    const maintenance = aged.reduce(
      (sum, i) => sum + INFRASTRUCTURES[i.type].maintenance * (1 + i.age * 0.1),
      0,
    )
    const pipeRelief = 1 - 0.15 * pipeCount
    const disasterCost = ev.disasterCost * (ev.id === 'pipeBurst' ? pipeRelief : 1)
    const net = taxes - maintenance - disasterCost
    const budget = s.budget + net

    /* ۶) جمعیت بر اساس سلامت منابع */
    let popRate = 0
    if (reserve >= 40) popRate = 0.025
    else if (reserve >= 25) popRate = 0.005
    else if (reserve >= 12) popRate = -0.02
    else if (reserve > 0) popRate = -0.06
    else popRate = -0.1
    popRate += ev.populationMult
    const population = Math.max(1000, Math.round(s.population * (1 + popRate)))
    const populationDelta = population - s.population

    /* ۷) گزارش سال مالی */
    const report: YearlyReport = {
      year,
      event: { id: ev.id, name: ev.name, desc: ev.desc },
      supply,
      demand,
      taxes,
      maintenance,
      disasterCost,
      net,
      reserveBefore: s.reserve,
      reserveAfter: reserve,
      reserveDelta,
      population,
      populationDelta,
      budgetAfter: budget,
      infrastructure: (Object.keys(INFRASTRUCTURES) as InfraType[])
        .map((t) => ({ type: t, count: countOf(t) }))
        .filter((x) => x.count > 0),
    }

    /* ۸) لاگ رویدادها */
    let log = pushLog(s.log, year, 'event', `⚡ ${ev.name}: ${ev.desc}`)
    if (ev.id === 'flood' || ev.id === 'pipeBurst') {
      log = pushLog(log, year, 'danger', `🛠️ خسارت ${faBudgetToman(disasterCost)} به بودجه تحمیل شد.`)
    }
    log = pushLog(
      log,
      year,
      'water',
      `💧 عرضه ${faInt(supply)} در برابر تقاضای ${faInt(demand)} میلیون لیتر — ذخیره ${faPercent(reserve)} (${reserveDelta >= 0 ? '+' : '−'}${faInt(Math.abs(reserveDelta))}).`,
    )
    log = pushLog(
      log,
      year,
      'economy',
      `💰 مالیات ${faBudgetToman(taxes)} − نگهداری ${faBudgetToman(maintenance)} = ${net >= 0 ? '+' : '−'}${faBudgetToman(Math.abs(net))}`,
    )
    if (populationDelta !== 0) {
      log = pushLog(
        log,
        year,
        'info',
        populationDelta > 0
          ? `🏠 ${faInt(populationDelta)} نفر به شهر مهاجرت کردند (جمعیت: ${faInt(population)}).`
          : `🏚️ ${faInt(Math.abs(populationDelta))} نفر شهر را ترک کردند (جمعیت: ${faInt(population)}).`,
      )
    }
    if (budget < 0) {
      log = pushLog(log, year, 'danger', '⚠️ بودجه شهر منفی شد — توسعه متوقف است!')
    }

    /* ۹) پیش‌روی نوبت و شرایط پایان بازی */
    const nextYear = year + 1
    const historyEntry: HistoryYear = {
      year,
      reserve,
      population,
      budget,
      supply,
      demand,
    }
    const history = [...s.history, historyEntry]

    let reason: GameOverReason | null = null
    if (budget < BANKRUPTCY_LIMIT) reason = 'bankrupt'
    else if (population < ABANDONMENT_POPULATION) reason = 'abandoned'
    else if (nextYear > GAME_YEARS.end) reason = 'completed'

    let grade: GradeInfo | null = null
    if (reason) {
      grade = computeGrade({
        reserve,
        population,
        initialPopulation: s.initialPopulation,
        budget,
        infraCount: aged.length,
        reason,
      })
      if (reason === 'completed') {
        log = pushLog(log, year, 'info', `🏆 دور مدیریت پایان یافت — کارنامه: ${grade.grade}`)
      } else if (reason === 'bankrupt') {
        log = pushLog(log, year, 'danger', '🏦 ورشکستگی! خزانه شهر تخلیه شد.')
      } else {
        log = pushLog(log, year, 'danger', '🚪 جمعیت به زیر آستانه رسید؛ آبادیان خالی شد.')
      }
    }

    set({
      phase: reason ? 'gameover' : 'report',
      year: nextYear,
      population,
      budget,
      reserve,
      supply,
      demand,
      weather: ev.weather,
      infra: aged,
      log,
      history,
      lastReport: report,
      grade,
      gameOverReason: reason,
      selectedInfra: null,
      hoveredTile: null,
    })
  },

  /** بستن گزارش سالانه و ادامه بازی */
  confirmReport: () => {
    if (get().phase === 'report') set({ phase: 'playing', lastReport: null })
  },
}))

/** انتخابگرهای کمکی (Selectors) */
export const selectOwnedCount =
  (type: InfraType) => (s: CityStoreState) =>
    s.infra.filter((i) => i.type === type).length

export function tileOccupied(infra: InfraInstance[], tile: TilePos): boolean {
  const k = tileKey(tile)
  return infra.some((i) => tileKey(i.tile) === k)
}
