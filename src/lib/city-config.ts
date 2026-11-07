/**
 * city-config.ts
 * ─────────────────────────────────────────────────────────────
 * پیکربندی کامل بازی «نگهبان آب» — انواع داده، ثابت‌های اقتصادی،
 * کاتالوگ زیرساخت‌ها، رخدادهای تصادفی و توابع کمکی قالب‌بندی.
 *
 * Water Guardian game configuration: types, economy constants,
 * infrastructure catalog, random events & formatting helpers.
 * ─────────────────────────────────────────────────────────────
 */

/* ─────────────────────────── انواع پایه (Core Types) ─────────────────────────── */

export type Phase = 'start' | 'playing' | 'report' | 'gameover'

export type InfraType =
  | 'rainTank'
  | 'pipeUpgrade'
  | 'treatment'
  | 'dam'
  | 'recycling'
  | 'desal'

export type WeatherKind = 'clear' | 'drought' | 'heat' | 'flood'

export type EventId =
  | 'drought'
  | 'heatwave'
  | 'flood'
  | 'pipeBurst'
  | 'tourist'
  | 'calm'

export type LogKind = 'event' | 'build' | 'economy' | 'water' | 'info' | 'danger'

export interface TilePos {
  col: number // 0..5
  row: number // 0..2
}

export interface InfraInstance {
  id: string
  type: InfraType
  tile: TilePos
  age: number // سن به سال — age in years
  health: number // 0.35..1 — بازدهی پس از استهلاک
}

export interface LogEntry {
  id: string
  year: number
  kind: LogKind
  text: string
}

export interface YearlyReport {
  year: number
  event: { id: EventId; name: string; desc: string } | null
  supply: number // میلیون لیتر
  demand: number // میلیون لیتر
  taxes: number // تومان
  maintenance: number // تومان
  disasterCost: number // تومان
  net: number // تومان
  reserveBefore: number
  reserveAfter: number
  reserveDelta: number
  population: number
  populationDelta: number
  budgetAfter: number
  infrastructure: Array<{ type: InfraType; count: number }>
}

export interface HistoryYear {
  year: number
  reserve: number
  population: number
  budget: number
  supply: number
  demand: number
}

export type GameOverReason = 'completed' | 'bankrupt' | 'abandoned'

/* ─────────────────────── ثابت‌های بازی (Game Constants) ─────────────────────── */

export const GAME_YEARS = { start: 2020, end: 2036 } as const

export const INITIAL_STATE = {
  population: 12_000,
  budget: 50_000_000_000, // ۵۰ میلیارد تومان
  reserve: 55, // درصد ذخیره آب
} as const

/** تقاضای سرانه آب — میلیون لیتر به ازای هر نفر در سال (~۱۲۳ لیتر/روز) */
export const PER_CAPITA_DEMAND_ML = 0.045

/** مالیات سرانه سالانه — تومان به ازای هر نفر */
export const TAX_PER_CAPITA = 130_000

/** عرضه پایه از آب‌های زیرزمینی و سد قدیمی — میلیون لیتر در سال */
export const BASE_SUPPLY_ML = 560

/** ظرفیت مخزن ذخیره — میلیون لیتر (هر ارتقای سد ۲۰۰+ اضافه می‌کند) */
export const BASE_RESERVE_CAPACITY_ML = 1200

/** نشت پیش‌فرض شبکه لوله‌کشی */
export const BASE_LEAKAGE = 0.12
export const LEAKAGE_REDUCTION_PER_PIPE = 0.04
export const MIN_LEAKAGE = 0.02

/** آستانه‌های بحران */
export const BANKRUPTCY_LIMIT = -5_000_000_000
export const ABANDONMENT_POPULATION = 6_000

/** گرید ساخت — ۶ ستون × ۳ ردیف (قابل گسترش در config) */
export const GRID_COLS = 6
export const GRID_ROWS = 3
export const TILE_SIZE = 2.2

/** ابعاد رندر جعبه‌ها */
export const ISO = {
  worldGround: 44,
  riverZ: 6.2,
  riverWidth: 2.6,
  roadZ1: -5.2,
  roadZ2: -8.0,
} as const

/* ─────────────────── کاتالوگ زیرساخت‌ها (Infrastructure Catalog) ─────────────────── */

export interface InfraDef {
  type: InfraType
  name: string
  short: string
  desc: string
  cost: number // تومان — هزینه ساخت پایه
  maintenance: number // تومان در سال
  supplyBonus: number // میلیون لیتر در سال (در بازدهی کامل)
  capacityBonus?: number // افزایش ظرفیت مخزن (میلیون لیتر)
  maxCount: number
  costGrowth: number // ضریب رشد هزینه با هر واحد ساخته‌شده
  tags: string[]
  color: string // رنگ کارت UI
  /** ضریب اثر پژمرده‌شدن آسمان — برای ابرها/خشکسالی روی مش سه‌بعدی */
  meshColor: number
  accent: number
}

export const INFRASTRUCTURES: Record<InfraType, InfraDef> = {
  rainTank: {
    type: 'rainTank',
    name: 'مخازن آب باران',
    short: 'مخزن باران',
    desc: 'ذخیره‌سازی آب باران برای فصول خشک. در خشکسالی بازدهی شدیدی از دست می‌دهد اما در بارندگی رشد می‌کند.',
    cost: 2_000_000_000,
    maintenance: 150_000_000,
    supplyBonus: 60,
    maxCount: 4,
    costGrowth: 1.35,
    tags: ['ارزان', 'وابسته به بارش'],
    color: '#38bdf8',
    meshColor: 0x4a90c2,
    accent: 0x8fd8f5,
  },
  pipeUpgrade: {
    type: 'pipeUpgrade',
    name: 'ارتقای شبکه لوله‌کشی',
    short: 'لوله‌کشی',
    desc: 'ایستگاه پمپاژ و تعویض لوله‌های فرسوده: کاهش نشت شبکه، کاهش خسارت ترکیدگی و بازیابی بخشی از آب هدررفته.',
    cost: 3_000_000_000,
    maintenance: 200_000_000,
    supplyBonus: 25,
    maxCount: 3,
    costGrowth: 1.4,
    tags: ['کاهش نشت', 'ضد حادثه'],
    color: '#94a3b8',
    meshColor: 0x8a94a6,
    accent: 0xd7dee8,
  },
  treatment: {
    type: 'treatment',
    name: 'تصفیه‌خانه آب',
    short: 'تصفیه‌خانه',
    desc: 'تصفیه آب خام سد و چاه‌ها برای افزایش عرضه پایدار. در سیلاب به کمک رسوب‌زدگی، بازدهی بیشتری دارد.',
    cost: 8_000_000_000,
    maintenance: 450_000_000,
    supplyBonus: 120,
    maxCount: 3,
    costGrowth: 1.4,
    tags: ['پایدار', 'هزینه متوسط'],
    color: '#34d399',
    meshColor: 0x3fae7a,
    accent: 0x9be8c5,
  },
  dam: {
    type: 'dam',
    name: 'ارتقای سد',
    short: 'ارتقای سد',
    desc: 'افزایش ارتفاع دیواره و ظرفیت مخزن سد: هم عرضه بیشتری می‌دهد و هم ظرفیت ذخیره شهر را بالا می‌برد.',
    cost: 10_000_000_000,
    maintenance: 400_000_000,
    supplyBonus: 150,
    capacityBonus: 200,
    maxCount: 2,
    costGrowth: 1.5,
    tags: ['ظرفیت+', 'سازنده', 'گران'],
    color: '#60a5fa',
    meshColor: 0x5d7fa3,
    accent: 0xa9c6e8,
  },
  recycling: {
    type: 'recycling',
    name: 'سایت بازچرخانی آب',
    short: 'بازچرخانی آب',
    desc: 'بازچرخانی فاضلاب شهری تا کیفیت مصرف کشاورزی و فضای سبز با حوضچه‌های تصفیه؛ موتور عرضه در سال‌های بی‌باران.',
    cost: 12_000_000_000,
    maintenance: 600_000_000,
    supplyBonus: 180,
    maxCount: 3,
    costGrowth: 1.45,
    tags: ['بازدهی بالا', 'مدرن'],
    color: '#a78bfa',
    meshColor: 0x7d6fb8,
    accent: 0xcdbdfc,
  },
  desal: {
    type: 'desal',
    name: 'نمک‌زدایی آب دریا',
    short: 'نمک‌زدایی',
    desc: 'آب شیرین‌کن ساحلی با بزرگ‌ترین سهم عرضه؛ اما هزینه ساخت و نگهداری سنگینی دارد.',
    cost: 18_000_000_000,
    maintenance: 900_000_000,
    supplyBonus: 260,
    maxCount: 2,
    costGrowth: 1.5,
    tags: ['عرضه عظیم', 'پرهزینه'],
    color: '#f472b6',
    meshColor: 0xc96a9a,
    accent: 0xffc2e0,
  },
}

export const INFRA_ORDER: InfraType[] = [
  'rainTank',
  'pipeUpgrade',
  'treatment',
  'dam',
  'recycling',
  'desal',
]

/* ─────────────────── رخدادهای تصادفی سالانه (Random Events) ─────────────────── */

export interface EventDef {
  id: EventId
  name: string
  desc: string
  weight: number
  weather: WeatherKind
  /** ضریب تقاضا */
  demandMult: number
  /** ضریب عرضه مخازن باران */
  rainTankMult: number
  /** ضریب عرضه تصفیه‌خانه‌ها */
  treatmentMult: number
  /** تغییر مستقیم ذخیره (واحد: درصد) */
  reserveFlat: number
  /** خسارت مالی مستقیم (تومان) */
  disasterCost: number
  /** ضریب درآمد مالیاتی */
  taxMult: number
  /** ضریب تغییر جمعیت اضافی */
  populationMult: number
}

export const EVENTS: Record<EventId, EventDef> = {
  drought: {
    id: 'drought',
    name: 'خشکسالی',
    desc: 'بارش‌ها به حداقل رسیده؛ مخازن باران تقریباً خالی‌اند و ذخیره سد به‌سرعت مصرف می‌شود.',
    weight: 3,
    weather: 'drought',
    demandMult: 1.05,
    rainTankMult: 0.3,
    treatmentMult: 0.9,
    reserveFlat: -4,
    disasterCost: 0,
    taxMult: 1,
    populationMult: -0.01,
  },
  heatwave: {
    id: 'heatwave',
    name: 'موج گرما',
    desc: 'دمای هوا رکورد زد؛ مصرف سرانه بالا رفته و شبکه زیر فشار است.',
    weight: 2,
    weather: 'heat',
    demandMult: 1.28,
    rainTankMult: 0.85,
    treatmentMult: 1,
    reserveFlat: -1,
    disasterCost: 0,
    taxMult: 1,
    populationMult: 0,
  },
  flood: {
    id: 'flood',
    name: 'سیل',
    desc: 'بارش سیل‌آسا مخازن را پر کرد اما خسارت‌های شهری به بودجه فشار آورد.',
    weight: 1.5,
    weather: 'flood',
    demandMult: 0.95,
    rainTankMult: 1.7,
    treatmentMult: 1.25,
    reserveFlat: 7,
    disasterCost: 800_000_000,
    taxMult: 1,
    populationMult: -0.012,
  },
  pipeBurst: {
    id: 'pipeBurst',
    name: 'ترکیدگی لوله',
    desc: 'لوله اصلی فرسوده ترکید؛ مقدار قابل‌توجهی آب و هزینه تعمیر از دست رفت.',
    weight: 2.5,
    weather: 'clear',
    demandMult: 1,
    rainTankMult: 1,
    treatmentMult: 1,
    reserveFlat: -2,
    disasterCost: 1_000_000_000,
    taxMult: 1,
    populationMult: -0.004,
  },
  tourist: {
    id: 'tourist',
    name: 'فصل گردشگری',
    desc: 'هجوم گردشگران به شهر: درآمد مالیاتی بالا رفت و مصرف آب چند برابر شد.',
    weight: 2,
    weather: 'clear',
    demandMult: 1.22,
    rainTankMult: 1,
    treatmentMult: 1,
    reserveFlat: 0,
    disasterCost: 0,
    taxMult: 1.35,
    populationMult: 0.005,
  },
  calm: {
    id: 'calm',
    name: 'سال آرام',
    desc: 'سالِ بی‌حوادثی بود؛ فرصتی برای پس‌انداز و توسعه زیرساخت.',
    weight: 3,
    weather: 'clear',
    demandMult: 1,
    rainTankMult: 1.05,
    treatmentMult: 1,
    reserveFlat: 1,
    disasterCost: 0,
    taxMult: 1,
    populationMult: 0,
  },
}

export const EVENT_IDS = Object.keys(EVENTS) as EventId[]

/* ─────────────────── سیستم امتیازدهی نهایی (Final Grading) ─────────────────── */

export interface GradeInfo {
  grade: string
  title: string
  color: string
}

export function computeGrade(opts: {
  reserve: number
  population: number
  initialPopulation: number
  budget: number
  infraCount: number
  reason: GameOverReason
}): GradeInfo {
  if (opts.reason === 'bankrupt') {
    return { grade: 'F', title: 'شهر ورشکست شد', color: '#ef4444' }
  }
  if (opts.reason === 'abandoned') {
    return { grade: 'F', title: 'ساکنان شهر را ترک کردند', color: '#ef4444' }
  }
  const popRatio = opts.population / opts.initialPopulation
  const popScore = Math.min(Math.max((popRatio - 0.8) / 0.4, 0), 1) * 25
  const waterScore = Math.min(opts.reserve, 90) * 0.45
  const budgetScore = Math.min(Math.max(opts.budget / 20_000_000_000, 0), 1) * 15
  const infraScore = (Math.min(opts.infraCount, 8) / 8) * 15
  const total = waterScore + popScore + budgetScore + infraScore

  if (total >= 78) return { grade: 'A', title: 'نگهبان طلایی آب!', color: '#facc15' }
  if (total >= 64) return { grade: 'B', title: 'مدیریت شایسته', color: '#34d399' }
  if (total >= 50) return { grade: 'C', title: 'قابل قبول', color: '#60a5fa' }
  if (total >= 36) return { grade: 'D', title: 'در آستانه بحران', color: '#f97316' }
  if (total >= 22) return { grade: 'E', title: 'مدیریت ضعیف', color: '#fb7185' }
  return { grade: 'F', title: 'شکست در نگهبانی آب', color: '#ef4444' }
}

/* ─────────────────────── توابع کمکی (Formatting Helpers) ─────────────────────── */

const faNum = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 })
const faNum1 = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 })

/** عدد صحیح با ارقام فارسی */
export function faInt(n: number): string {
  return faNum.format(Math.round(n))
}

/** بودجه به «میلیارد تومان» با یک رقم اعشار */
export function faBudgetToman(n: number): string {
  const b = n / 1_000_000_000
  return `${faNum1.format(b)} میلیارد تومان`
}

/** هزینه کوتاه برای کارت‌ها — «۲ میلیارد» */
export function faCostShort(n: number): string {
  const b = n / 1_000_000_000
  return b >= 1 ? `${faNum1.format(b)} میلیارد` : `${faInt(n / 1_000_000)} میلیون`
}

/** سال شمسی‌شده */
export function faYear(y: number): string {
  return faInt(y)
}

/** درصد فارسی */
export function faPercent(n: number, digits = 0): string {
  return `${(digits === 0 ? faNum : faNum1).format(n)}٪`
}

/** مبلغ تومانی خالص با علامت */
export function faSignedToman(n: number): string {
  const b = n / 1_000_000_000
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${faNum1.format(Math.abs(b))} میلیارد تومان`
}

/** کلید یکتای کاشی */
export function tileKey(t: TilePos): string {
  return `${t.col},${t.row}`
}

/** موقعیت جهانی مرکز کاشی */
export function tileWorldPos(t: TilePos): { x: number; z: number } {
  return {
    x: (t.col - (GRID_COLS - 1) / 2) * TILE_SIZE,
    z: (t.row - (GRID_ROWS - 1) / 2) * TILE_SIZE,
  }
}

export function allTiles(): TilePos[] {
  const tiles: TilePos[] = []
  for (let r = 0; r < GRID_ROWS; r++)
    for (let c = 0; c < GRID_COLS; c++) tiles.push({ col: c, row: r })
  return tiles
}

/** هزینه واقعی ساخت بعد از n واحد موجود */
export function scaledCost(type: InfraType, ownedCount: number): number {
  const def = INFRASTRUCTURES[type]
  return Math.round(def.cost * Math.pow(def.costGrowth, ownedCount))
}
