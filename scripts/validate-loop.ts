/**
 * validate-loop.ts — sanity check for the closed-loop path math in NPCs.tsx.
 * Reimplements buildLoop/sampleAt and asserts every sampled point of the
 * car loops stays on road asphalt, and prints extents for ped loops.
 */

interface Seg {
  t: 'line' | 'arc'
  len: number
  x1?: number; z1?: number; x2?: number; z2?: number
  cx?: number; cz?: number; r?: number; a0?: number; sweep?: number
}
interface LoopPath { segs: Seg[]; total: number }

function buildLoop(
  z1: number, z2: number, xe: number, xw: number,
  turn: 'left' | 'right', r: number,
): LoopPath {
  const right = turn === 'right'
  const corners = right
    ? [
        { p: [xe, z1], a: [1, 0], b: [0, 1] },
        { p: [xe, z2], a: [0, 1], b: [-1, 0] },
        { p: [xw, z2], a: [-1, 0], b: [0, -1] },
        { p: [xw, z1], a: [0, -1], b: [1, 0] },
      ]
    : [
        { p: [xe, z2], a: [1, 0], b: [0, -1] },
        { p: [xe, z1], a: [0, -1], b: [-1, 0] },
        { p: [xw, z1], a: [-1, 0], b: [0, 1] },
        { p: [xw, z2], a: [0, 1], b: [1, 0] },
      ]
  const arcLen = (Math.PI / 2) * r
  const pts = corners.map((c) => {
    const sx = c.p[0] - c.a[0] * r, sz = c.p[1] - c.a[1] * r
    const ex = c.p[0] + c.b[0] * r, ez = c.p[1] + c.b[1] * r
    const side = right ? [-c.a[1], c.a[0]] : [c.a[1], -c.a[0]]
    const cx = sx + side[0] * r, cz = sz + side[1] * r
    const a0 = Math.atan2(sz - cz, sx - cx)
    return { s: { x: sx, z: sz }, e: { x: ex, z: ez }, arc: { cx, cz, a0 } }
  })
  const segs: Seg[] = []
  for (let i = 0; i < 4; i++) {
    const cur = pts[i], nxt = pts[(i + 1) % 4]
    segs.push({ t: 'arc', len: arcLen, cx: cur.arc.cx, cz: cur.arc.cz, r, a0: cur.arc.a0, sweep: right ? Math.PI / 2 : -Math.PI / 2 })
    const len = Math.hypot(nxt.s.x - cur.e.x, nxt.s.z - cur.e.z)
    if (len > 0.01) segs.push({ t: 'line', len, x1: cur.e.x, z1: cur.e.z, x2: nxt.s.x, z2: nxt.s.z })
  }
  return { segs, total: segs.reduce((s, x) => s + x.len, 0) }
}

function sampleAt(loop: LoopPath, s: number) {
  let u = ((s % loop.total) + loop.total) % loop.total
  for (let i = 0; i < loop.segs.length; i++) {
    const seg = loop.segs[i]
    if (u <= seg.len || i === loop.segs.length - 1) {
      const k = Math.min(u, seg.len)
      if (seg.t === 'line') {
        const f = seg.len > 0 ? k / seg.len : 0
        const dx = seg.x2! - seg.x1!, dz = seg.z2! - seg.z1!
        return { x: seg.x1! + dx * f, z: seg.z1! + dz * f, yaw: Math.atan2(-dz, dx) }
      }
      const th = seg.a0! + seg.sweep! * (k / seg.len)
      const tx = seg.sweep! > 0 ? -Math.sin(th) : Math.sin(th)
      const tz = seg.sweep! > 0 ? Math.cos(th) : -Math.cos(th)
      return { x: seg.cx! + Math.cos(th) * seg.r!, z: seg.cz! + Math.sin(th) * seg.r!, yaw: Math.atan2(-tz, tx) }
    }
    u -= seg.len
  }
  return { x: 0, z: 0, yaw: 0 }
}

/* asphalt rectangles: road1, road2, east connector, west connector */
const ASPHALT = [
  { x0: -13.75, x1: 13.75, z0: -5.95, z1: -4.45 },
  { x0: -13.75, x1: 13.75, z0: -8.75, z1: -7.25 },
  { x0: 12.25, x1: 13.75, z0: -8.75, z1: -4.45 },
  { x0: -13.75, x1: -12.25, z0: -8.75, z1: -4.45 },
]
const onAsphalt = (x: number, z: number) =>
  ASPHALT.some((a) => x >= a.x0 - 1e-9 && x <= a.x1 + 1e-9 && z >= a.z0 - 1e-9 && z <= a.z1 + 1e-9)

const carCW = buildLoop(-4.75, -8.45, 12.55, -12.55, 'right', 0.3)
const carCCW = buildLoop(-5.65, -7.55, 13.45, -13.45, 'left', 0.88)
const pedOuter = buildLoop(-4.25, -8.95, 12.05, -12.05, 'right', 0.35)
const pedInner = buildLoop(-6.15, -7.05, 13.95, -13.95, 'left', 0.35)

let fail = 0
for (const [name, loop] of [['carCW', carCW], ['carCCW', carCCW]] as const) {
  let worst = 0
  for (let s = 0; s < loop.total; s += 0.01) {
    const p = sampleAt(loop, s)
    if (!onAsphalt(p.x, p.z)) {
      fail++
      if (fail <= 5) console.log(`  OFF-ASPHALT ${name} s=${s.toFixed(2)} x=${p.x.toFixed(2)} z=${p.z.toFixed(2)}`)
    }
  }
  console.log(`${name}: total=${loop.total.toFixed(2)}  offAsphaltSamples=${fail}`)
}

let pf = 0
for (const [name, loop] of [['pedOuter', pedOuter], ['pedInner', pedInner]] as const) {
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9
  for (let s = 0; s < loop.total; s += 0.02) {
    const p = sampleAt(loop, s)
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z)
  }
  console.log(`${name}: total=${loop.total.toFixed(2)}  x∈[${minX.toFixed(2)},${maxX.toFixed(2)}] z∈[${minZ.toFixed(2)},${maxZ.toFixed(2)}]`)
}

/* spot-check headings: CW east-bound lane yaw≈0 (facing +x), CCW west lane yaw≈π */
const e = sampleAt(carCW, 10)
const w = sampleAt(carCCW, 30)
console.log(`carCW @s=10   -> x=${e.x.toFixed(2)} z=${e.z.toFixed(2)} yaw=${e.yaw.toFixed(3)} (expect z=-4.75, yaw≈0)`)
console.log(`carCCW @s=30  -> x=${w.x.toFixed(2)} z=${w.z.toFixed(2)} yaw=${w.yaw.toFixed(3)} (expect z=-5.65, yaw≈±π)`)
console.log(fail === 0 && pf === 0 ? 'PASS' : `FAIL: cars off asphalt=${fail}`)
