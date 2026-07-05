/**
 * WrappedStory — the full 11-section scroll-snap "GitHub Wrapped" experience.
 *
 * This is a faithful port of the vanilla-JS prototype
 * ("GitHub Wrapped Experience.dc.html") into React. The markup of every section
 * is rendered by React (so real WrappedStats values flow in), and the prototype's
 * imperative animation engine (the particle field, gradient crossfade, mascot,
 * count-ups, calendar/weekday/language builders, confetti burst, parallax frame
 * handler, intro overlay) is ported almost verbatim into a single useEffect that
 * drives those nodes via refs + querySelector('[data-id="..."]'), exactly like the
 * original. Nothing is invented: every number, label, and copy string comes from
 * the `stats` prop.
 *
 * Section map (index -> label):
 *   0 Cover · 1 Big Number · 2 Year in Squares · 3 Streak · 4 Feral Day
 *   5 Rhythm · 6 Languages · 7 Top Repo · 8 Receipts · 9 Personality · 10 Trophy
 */

import { useEffect, useRef } from 'react'
import type { WrappedStats } from '../../lib/wrapped/types'
import { ShareBar } from './ShareBar'

const BRICOLAGE = "'Bricolage Grotesque', sans-serif"
const MONO = "'JetBrains Mono', monospace"
const SPACE = "'Space Grotesk', sans-serif"

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
function monthFromISO(iso: string): string {
  const m = parseInt(iso.slice(5, 7), 10) - 1
  return MONTHS[m] || ''
}

/** Deterministic seed from a username so each user's fallback identicon differs. */
function seedFrom(s: string): number {
  let h = 4231
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 233280
  return h || 4231
}

/** The green identicon used as the avatar fallback (and the dissolve source). */
function drawIdenticon(o: CanvasRenderingContext2D, S: number, seed: number) {
  o.fillStyle = '#04140d'
  o.fillRect(0, 0, S, S)
  const greens = ['#0e4429', '#1f7a4d', '#2fb968', '#5df08a', '#9bff5e']
  const n = 7, cell = S / n
  let r = seed
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280 }
  for (let x = 0; x < Math.ceil(n / 2); x++) for (let y = 0; y < n; y++) {
    if (rnd() > 0.44) {
      const col = greens[(rnd() * greens.length) | 0]
      o.fillStyle = col
      o.fillRect(x * cell, y * cell, cell + 1, cell + 1)
      o.fillRect((n - 1 - x) * cell, y * cell, cell + 1, cell + 1)
    }
  }
}

export function WrappedStory({ stats }: { stats: WrappedStats }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const w = wrapRef.current
    if (!w) return
    const q = (s: string) => w.querySelector(`[data-id="${s}"]`) as HTMLElement | null
    const scroller = q('scroller')
    if (!scroller) return

    const E = {
      bgA: q('bgA'), bgB: q('bgB'), field: q('field'), prog: q('prog'),
      statNum: q('statNum'), calGrid: q('calGrid'), streakNum: q('streakNum'), bigDayNum: q('bigDayNum'),
      weekWrap: q('weekWrap'), langWrap: q('langWrap'), repoName: q('repoName'), repoStars: q('repoStars'),
      persoName: q('persoName'), mosaic: q('mosaic'), mosaic2: q('mosaic2'),
      speech: q('speech'), bob: q('mascotBob'), bgTop: q('bgTop'), bgBot: q('bgBot'), antTip: q('antTip'),
      eyeLr: q('eyeLr'), eyeRr: q('eyeRr'), mouth: q('mouth'), prop: q('prop'), burst: q('burst'),
    }
    if (!E.bgA || !E.bgB || !E.field) return
    const bgA = E.bgA, bgB = E.bgB, field = E.field

    const sections = Array.from(scroller.querySelectorAll('section[data-sec]')) as HTMLElement[]
    const contents = sections.map((s) => s.querySelector('[data-content]') as HTMLElement | null)
    const nSec = sections.length
    // Each particle is a continuously-animating compositor layer; keep the count
    // modest, and lighter on phones where the GPU/memory budget is smaller.
    const N = typeof window !== 'undefined' && window.innerWidth < 700 ? 24 : 42
    const seed = seedFrom(stats.username || '')

    let cur = -1
    let bgFrom = -1
    let chC = 1, maxC = 0 // cached clientHeight / max scroll (only change on resize)
    const snapSizes: number[] = []
    let raf = 0
    let avRaf = 0
    let avStopped = false
    let gone = false
    const parts: Array<{ el: HTMLElement; rx: number; ry: number; rd: number; ra: number }> = []

    // Real avatar (drawn into every canvas); identicon is the graceful fallback.
    let avatarImg: HTMLImageElement | null = null
    let avatarReady = false
    const redrawFns: Array<() => void> = []
    if (stats.avatarUrl) {
      const im = new Image()
      im.crossOrigin = 'anonymous'
      im.referrerPolicy = 'no-referrer'
      im.onload = () => { avatarReady = true; redrawFns.forEach((f) => f()) }
      im.onerror = () => { avatarReady = false }
      im.src = stats.avatarUrl
      avatarImg = im
    }
    const drawSource = (ctx: CanvasRenderingContext2D, S: number) => {
      if (avatarReady && avatarImg) {
        try { ctx.drawImage(avatarImg, 0, 0, S, S); return } catch { /* tainted */ }
      }
      drawIdenticon(ctx, S, seed)
    }

    const GRAD = [
      'radial-gradient(135% 130% at 80% 6%, #ccff4d 0%, #56e08a 30%, #07a861 58%, #02160e 100%)',
      'radial-gradient(125% 125% at 50% 16%, #ff2e7e 0%, #ff5e8a 26%, #ff9b3d 72%, #b3145e 100%)',
      'radial-gradient(130% 130% at 50% 10%, #1edb7c 0%, #0a9d63 36%, #064d36 70%, #021c14 100%)',
      'radial-gradient(125% 125% at 50% 12%, #ff6ad5 0%, #9b3cff 38%, #4a1a8c 70%, #160832 100%)',
      'radial-gradient(125% 125% at 22% 82%, #b6ff5e 0%, #14c98a 34%, #0a7d6a 70%, #042b2a 100%)',
      'radial-gradient(125% 125% at 78% 14%, #6aa8ff 0%, #2a5bff 36%, #1a2a8c 70%, #070a33 100%)',
      'radial-gradient(125% 125% at 78% 14%, #5be7ff 0%, #2a8bff 34%, #1238b8 70%, #07123f 100%)',
      'radial-gradient(125% 125% at 26% 22%, #ffcf5e 0%, #ff9b3d 32%, #e0561a 70%, #5e2208 100%)',
      'radial-gradient(125% 125% at 50% 16%, #ff5e8a 0%, #ff2e7e 30%, #c41259 66%, #4a0820 100%)',
      'radial-gradient(130% 125% at 78% 16%, #00e5ff 0%, #6a3cff 40%, #3a0ca3 72%, #14052e 100%)',
      'radial-gradient(120% 120% at 50% 28%, #7a3cff 0%, #3a0ca3 50%, #14052e 100%)',
    ]
    const PAL = [
      ['#1f9d5a', '#34c06d', '#5fe085', '#9bff5e', '#eaffd0'],
      ['#c81e63', '#ff2e7e', '#ff6f9c', '#ff9b3d', '#ffe6bf'],
      ['#0e7a4d', '#1fae6a', '#39e08a', '#9bff5e', '#eaffd0'],
      ['#7a3cff', '#9b3cff', '#b06aff', '#ff8ae0', '#ffd0f4'],
      ['#0a7d6a', '#14c98a', '#39e0a0', '#9bff5e', '#eaffd0'],
      ['#2a5bff', '#4a7cff', '#6aa8ff', '#9bd0ff', '#eaf3ff'],
      ['#2a8bff', '#4aa8ff', '#5be7ff', '#9be9ff', '#eaf8ff'],
      ['#e0561a', '#ff8a3d', '#ffb05e', '#ffd28a', '#ffeccf'],
      ['#c41259', '#ff2e7e', '#ff6f9c', '#ff9b3d', '#ffe6bf'],
      ['#5b2bff', '#6a3cff', '#8b5cff', '#00e5ff', '#d6fbff'],
      ['#6a3cff', '#8b5cff', '#ff2e7e', '#00e5ff', '#d6fbff'],
    ]
    const MASCOT = [
      { top: '#3ad36c', bot: '#0f8a44', ant: '#c8ff5e', mood: 'happy', say: "let's relive your year." },
      { top: '#ff7aa8', bot: '#e0356f', ant: '#ffd24d', mood: 'wow', say: 'you did HOW much?!' },
      { top: '#39e08a', bot: '#0a9d63', ant: '#c8ff5e', mood: 'happy', say: 'look at it all fill in.' },
      { top: '#c86aff', bot: '#8a2be0', ant: '#ff8ae0', mood: 'proud', say: 'you showed up. daily.' },
      { top: '#39e0a0', bot: '#0f9d6a', ant: '#b6ff5e', mood: 'wow', say: 'that one day went feral.' },
      { top: '#5b8cff', bot: '#2a5bff', ant: '#9bd0ff', mood: 'happy', say: 'your power day is set.' },
      { top: '#5bb8ff', bot: '#2a6bff', ant: '#7af9ff', mood: 'happy', say: 'polyglot behaviour.' },
      { top: '#ff9b3d', bot: '#e0561a', ant: '#ffd28a', mood: 'proud', say: 'your second home.' },
      { top: '#ff7aa8', bot: '#c41259', ant: '#ffd24d', mood: 'wow', say: "the receipts don't lie." },
      { top: '#8b6aff', bot: '#5b2bff', ant: '#00e5ff', mood: 'proud', say: 'we knew it all along.' },
      { top: '#8b6aff', bot: '#5b2bff', ant: '#00e5ff', mood: 'party', say: 'screenshot. flex. repeat.' },
    ]
    // Make the mascot's "feral day" and "power day" chatter accurate to this user
    // (the prototype hard-coded "march 14" / "tuesdays"); these are flavor, not stats.
    const DAY_FULL: Record<string, string> = { Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday', Sat: 'saturday', Sun: 'sunday' }
    if (stats.busiestDay) MASCOT[4].say = `${stats.busiestDay.label.toLowerCase()} went feral.`
    else MASCOT[4].say = 'a calm, even year.'
    MASCOT[5].say = `${DAY_FULL[stats.busiestWeekday] || stats.busiestWeekday.toLowerCase()}s are yours.`

    function buildField() {
      field.innerHTML = ''
      parts.length = 0
      const frag = document.createDocumentFragment()
      for (let i = 0; i < N; i++) {
        // ONE element per particle (no nesting, no always-on breathe animation) =
        // a single promoted layer. frame() writes only transform + opacity each
        // scroll frame; size/color/glow snap on a boundary cross.
        const el = document.createElement('div')
        el.style.cssText = 'position:absolute;top:0;left:0;width:14px;height:14px;border-radius:4px;background:#34c06d;will-change:transform,opacity;transition:background .5s ease,box-shadow .5s ease'
        frag.appendChild(el)
        parts.push({ el, rx: Math.random(), ry: Math.random(), rd: Math.random(), ra: Math.random() * Math.PI * 2 })
      }
      field.appendChild(frag)
    }

    type Spot = { cx: number; cy: number; op: number; size: number; color: string; glow: boolean }
    let LAYOUTS: Spot[][] = []
    // Compute (not apply) a section's particle layout. Positions are interpolated
    // by scroll in frame(); size/color/glow snap when a section boundary is crossed.
    function computeFormation(i: number): Spot[] {
      const vw = field.clientWidth || window.innerWidth, vh = field.clientHeight || window.innerHeight
      const P = parts, pal = PAL[i], cx = vw / 2, cy = vh / 2
      const out: Spot[] = new Array(N)
      const cg = (): [string, boolean] => { const r = Math.random(); if (r < .46) return [pal[4], true]; if (r < .78) return [pal[3], true]; if (r < .9) return ['#ffffff', true]; return [pal[2], false] }
      const place = (k: number, x: number, y: number, s: number, op: number) => { const c = cg(); out[k] = { cx: x, cy: y, op, size: s, color: c[0], glow: c[1] } }
      const hide = (k: number) => { out[k] = { cx, cy, op: 0, size: 6, color: pal[2], glow: false } }
      if (i === 0) { const cols = 15, rows = 8, mx = vw * 0.06, my = vh * 0.12, gw = (vw - mx * 2) / (cols - 1), gh = (vh * 0.76) / (rows - 1); for (let k = 0; k < N; k++) { const c = k % cols, r = (k / cols | 0); if (r >= rows) { hide(k); continue } const s = 11 + (P[k].rd * 7 | 0); place(k, mx + c * gw, my + r * gh, s, 0.7 + P[k].rd * 0.3) } }
      else if (i === 1) { for (let k = 0; k < N; k++) { const a = k * 2.39996, rad = vh * 0.20 + (k / N) * vh * 0.22; place(k, cx + Math.cos(a) * rad * 1.4, cy + Math.sin(a) * rad, 9 + (P[k].rd * 9 | 0), 0.7 + P[k].rd * 0.3) } }
      else if (i === 2) { for (let k = 0; k < N; k++) { place(k, P[k].rx * vw, P[k].ry * vh, 4 + (P[k].rd * 6 | 0), 0.18 + P[k].rd * 0.22) } }
      else if (i === 3) { for (let k = 0; k < N; k++) { const x = (k / N) * vw * 1.04 - vw * 0.02; const y = cy + Math.sin(k * 0.5) * vh * 0.05 + (P[k].ry - 0.5) * 40; place(k, x, y, 8 + (P[k].rd * 10 | 0), 0.6 + P[k].rd * 0.4) } }
      else if (i === 4) { const bx = cx + vw * 0.22, by = vh * 0.9, ty = vh * 0.14; for (let k = 0; k < N; k++) { const t = k / N, y = by - (by - ty) * t, wd = vw * 0.17 * (1 - t * 0.7), x = bx + (P[k].rx - 0.5) * wd; place(k, x, y, 9 + ((1 - t) * 12 | 0), 0.7 + (1 - t) * 0.3) } }
      else if (i === 5) { for (let k = 0; k < N; k++) { const day = k % 7; const col = vw * 0.12 + day * (vw * 0.76 / 6); const idx = (k / 7 | 0); const y = vh * 0.30 + (idx % 9) * (vh * 0.42 / 9) + (day === 1 ? -vh * 0.06 : 0); place(k, col + (P[k].rx - 0.5) * 30, y, 7 + (P[k].rd * 7 | 0), 0.4 + P[k].rd * 0.4) } }
      else if (i === 6) { for (let k = 0; k < N; k++) { const left = k % 2 === 0; const col = left ? vw * 0.07 : vw * 0.93; const idx = (k / 2 | 0); const y = vh * 0.1 + (idx / (N / 2)) * vh * 0.8; place(k, col + (P[k].rx - 0.5) * vw * 0.05, y, 10 + (P[k].rd * 8 | 0), 0.6 + P[k].rd * 0.4) } }
      else if (i === 7) { for (let k = 0; k < N; k++) { const a = k * 2.39996, rad = vh * 0.16 + (k / N) * vh * 0.16; place(k, cx + Math.cos(a) * rad * 1.5, cy + Math.sin(a) * rad, 8 + (P[k].rd * 10 | 0), 0.5 + P[k].rd * 0.45) } }
      else if (i === 8) { for (let k = 0; k < N; k++) { place(k, P[k].rx * vw, P[k].ry * vh, 8 + (P[k].rd * 14 | 0), 0.55 + P[k].rd * 0.45) } }
      else if (i === 9) { for (let k = 0; k < N; k++) { const a = k * 2.39996, rad = (k < N * 0.6) ? vh * 0.26 : vh * 0.30 + (k / N) * vh * 0.16; place(k, cx + Math.cos(a + P[k].rd) * rad * 1.25, cy + Math.sin(a + P[k].rd) * rad, 8 + (P[k].rd * 8 | 0), 0.7 + P[k].rd * 0.3) } }
      else { for (let k = 0; k < N; k++) { const edge = P[k].rd > 0.55; let x, y; if (edge) { x = P[k].rx * vw; y = P[k].ry * vh * 0.42 + (P[k].ra > 3.14 ? vh * 0.58 : 0) } else { x = P[k].rx * vw; y = P[k].ry * vh } place(k, x, y, 8 + (P[k].rd * 14 | 0), 0.7 + P[k].rd * 0.3) } }
      for (let k = 0; k < N; k++) if (!out[k]) hide(k)
      return out
    }
    function recomputeLayouts() { LAYOUTS = []; for (let i = 0; i < nSec; i++) LAYOUTS.push(computeFormation(i)); bgFrom = -1 }

    function setMascot(i: number) {
      const c = MASCOT[i]; if (!c) return
      if (E.bgTop) E.bgTop.setAttribute('stop-color', c.top)
      if (E.bgBot) E.bgBot.setAttribute('stop-color', c.bot)
      if (E.antTip) E.antTip.setAttribute('fill', c.ant)
      if (E.bob) { E.bob.style.transition = 'none'; E.bob.style.transform = 'translateY(-16px) scale(1.06)'; setTimeout(() => { if (E.bob) { E.bob.style.transition = 'transform .5s cubic-bezier(.2,1.4,.4,1)'; E.bob.style.transform = '' } }, 20) }
      if (E.speech) { E.speech.style.opacity = '0'; E.speech.style.transform = 'translateY(6px)'; setTimeout(() => { if (E.speech) { E.speech.textContent = c.say; E.speech.style.opacity = '1'; E.speech.style.transform = 'translateY(0)' } }, 170) }
      const m = c.mood
      const eh = (h: number) => { if (E.eyeLr) { E.eyeLr.setAttribute('height', String(h)); E.eyeLr.setAttribute('y', String(81 - h / 2)) } if (E.eyeRr) { E.eyeRr.setAttribute('height', String(h)); E.eyeRr.setAttribute('y', String(81 - h / 2)) } }
      if (m === 'wow') { eh(16); E.mouth?.setAttribute('d', 'M58 95 Q66 106 74 95 Q66 90 58 95') }
      else if (m === 'sleepy') { eh(4); E.mouth?.setAttribute('d', 'M58 97 Q66 95 74 97') }
      else if (m === 'proud') { eh(13); E.mouth?.setAttribute('d', 'M52 93 Q66 107 80 93') }
      else if (m === 'party') { eh(13); E.mouth?.setAttribute('d', 'M54 94 Q66 108 78 94') }
      else { eh(13); E.mouth?.setAttribute('d', 'M54 95 Q66 103 78 95') }
      let prop = ''
      if (m === 'sleepy') prop = '<text x="104" y="44" font-family="JetBrains Mono,monospace" font-size="13" fill="#ffd0f4" opacity=".9">z</text>'
      else if (m === 'wow') prop = '<g fill="#ffe14d"><circle cx="22" cy="40" r="3"/><circle cx="108" cy="50" r="3"/><circle cx="30" cy="22" r="2.4"/></g>'
      else if (m === 'party') prop = '<g><rect x="20" y="34" width="6" height="6" rx="1.5" fill="#ff2e7e" transform="rotate(20 23 37)"/><rect x="104" y="40" width="6" height="6" rx="1.5" fill="#00e5ff" transform="rotate(-15 107 43)"/><rect x="30" y="20" width="5" height="5" rx="1.5" fill="#9bff5e"/></g>'
      if (E.prop) E.prop.innerHTML = prop
    }

    function countTo(el: HTMLElement | null, target: number, dur: number, suffix?: string) {
      if (!el) return
      const st = performance.now()
      const step = (t: number) => {
        let p = Math.min(1, (t - st) / dur); p = 1 - Math.pow(1 - p, 3)
        el.textContent = Math.round(target * p).toLocaleString() + (suffix || '')
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }

    function buildCalendar() {
      const el = E.calGrid; if (!el) return
      const cal = stats.calendar || []
      const rows = 7
      const cols = Math.max(1, Math.ceil(cal.length / rows))
      el.style.cssText = 'display:grid;grid-template-rows:repeat(7,1fr);grid-auto-flow:column;grid-auto-columns:1fr;gap:clamp(2px,.5vw,4px);width:min(900px,92vw);aspect-ratio:' + (cols / rows) + ';margin:18px auto 0'
      el.innerHTML = ''
      const pal = ['rgba(255,255,255,.07)', '#0e4429', '#1f7a4d', '#2fb968', '#5df08a']
      const bright = ['#7bff8a', '#b6ffb0', '#eaffd0']
      const frag = document.createDocumentFragment()
      for (let i = 0; i < cal.length; i++) {
        const day = cal[i]
        const d = document.createElement('div'); d.style.borderRadius = '2px'
        let col: string
        if (monthFromISO(day.date) === stats.brightestMonth && day.level >= 1) {
          col = bright[Math.min(2, day.level - 1)]
          d.style.boxShadow = '0 0 7px ' + col
        } else {
          col = pal[day.level] || pal[0]
          if (day.level >= 4) d.style.boxShadow = '0 0 6px ' + col
        }
        d.style.background = col
        d.style.animation = 'ignitePop .4s ease-out backwards'
        d.style.animationDelay = (Math.floor(i / rows) * 22) + 'ms'
        frag.appendChild(d)
      }
      el.appendChild(frag)
    }

    function buildWeekday() {
      const el = E.weekWrap; if (!el) return
      const dist = stats.weekdayDistribution || []
      const busiest = stats.busiestWeekday
      el.style.cssText = 'display:flex;align-items:flex-end;gap:clamp(8px,1.8vw,22px);height:clamp(170px,32vh,300px);margin-top:26px'
      el.innerHTML = ''
      dist.forEach((d, i) => {
        const hot = d.day === busiest
        const colWrap = document.createElement('div')
        colWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:10px'
        const bar = document.createElement('div')
        bar.style.cssText = 'width:100%;border-radius:8px 8px 4px 4px;height:0;transition:height .9s cubic-bezier(.2,.9,.25,1);transition-delay:' + (i * 70) + 'ms;background:' + (hot ? 'linear-gradient(180deg,#9be9ff,#2a8bff)' : 'linear-gradient(180deg,#5be7ff,#1238b8)') + ';' + (hot ? 'box-shadow:0 0 26px #5be7ff;' : 'opacity:.7;')
        const lab = document.createElement('div'); lab.textContent = d.day
        lab.style.cssText = "font-family:'JetBrains Mono',monospace;font-size:clamp(11px,1.4vw,15px);color:" + (hot ? '#eaf8ff' : 'rgba(234,248,255,.6)')
        colWrap.appendChild(bar); colWrap.appendChild(lab); el.appendChild(colWrap)
        requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.height = Math.max(2, d.pct) + '%' }))
      })
    }

    function buildBars() {
      const wrap = E.langWrap; if (!wrap) return
      wrap.innerHTML = ''
      const langs = stats.languages || []
      langs.forEach((L, li) => {
        const row = document.createElement('div')
        row.style.cssText = 'display:flex;align-items:center;gap:clamp(10px,1.6vw,20px)'
        const name = document.createElement('div'); name.textContent = L.name
        name.style.cssText = "font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:clamp(17px,2.3vw,28px);color:#f2fbff;width:clamp(102px,13vw,168px);flex:none"
        const bar = document.createElement('div')
        bar.style.cssText = 'display:flex;gap:clamp(2px,.4vw,5px);flex:1;height:clamp(18px,2.6vw,32px)'
        const Nc = 28, lit = Math.round(L.pct / 100 * Nc)
        for (let i = 0; i < Nc; i++) {
          const c = document.createElement('div'); c.style.cssText = 'flex:1;border-radius:4px;'
          if (i < lit) { c.style.background = L.color; c.style.boxShadow = '0 0 10px ' + L.color; c.style.animation = 'ignitePop .42s ease-out backwards'; c.style.animationDelay = (li * 120 + i * 42) + 'ms' }
          else { c.style.background = 'rgba(255,255,255,0.10)' }
          bar.appendChild(c)
        }
        const pct = document.createElement('div'); pct.textContent = '0%'
        pct.style.cssText = "font-family:'JetBrains Mono',monospace;font-weight:600;font-size:clamp(15px,1.9vw,24px);color:#cdeeff;width:60px;text-align:right;flex:none"
        row.appendChild(name); row.appendChild(bar); row.appendChild(pct); wrap.appendChild(row)
        countTo(pct, L.pct, 900 + li * 120, '%')
      })
    }

    function buildMosaic(el: HTMLElement | null) {
      if (!el) return
      const sq = 11
      const pat = [[0, 0, 1, 0, 0], [0, 1, 1, 1, 0], [1, 1, 1, 1, 1], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0]]
      el.style.cssText = 'display:grid;grid-template-columns:repeat(5,' + sq + 'px);grid-auto-rows:' + sq + 'px;gap:2px'
      el.innerHTML = ''
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
        const on = pat[r][c] === 1, d = document.createElement('div')
        d.style.cssText = 'width:' + sq + 'px;height:' + sq + 'px;border-radius:2px;background:' + (on ? '#39ff9a' : 'rgba(255,255,255,0.10)') + ';' + (on ? 'box-shadow:0 0 8px #39ff9a;' : '') + 'animation:ignitePop .4s ease-out backwards;animation-delay:' + (300 + (r * 5 + c) * 28) + 'ms'
        el.appendChild(d)
      }
    }

    function stampIn(sec: HTMLElement | undefined) {
      if (!sec) return
      sec.querySelectorAll('[data-stamp]').forEach((node, i) => {
        const el = node as HTMLElement
        el.style.animation = 'none'; void el.offsetWidth
        el.style.animation = 'stamp .55s cubic-bezier(.2,1.5,.4,1) backwards'
        el.style.animationDelay = (i * 0.42) + 's'
      })
    }

    function burst() {
      const el = E.burst; if (!el) return
      el.innerHTML = ''
      const vw = el.clientWidth || window.innerWidth, vh = el.clientHeight || window.innerHeight, cx = vw / 2, cy = vh * 0.42
      const cols = ['#00e5ff', '#7a3cff', '#ff2e7e', '#9bff5e', '#ffd84d', '#ffffff']
      const frag = document.createDocumentFragment()
      const items: Array<{ d: HTMLElement; tx: number; ty: number; r: number }> = []
      for (let i = 0; i < 32; i++) {
        const d = document.createElement('div'); const s = 8 + Math.random() * 14
        const ang = Math.random() * Math.PI * 2; const dist = 130 + Math.random() * Math.min(vw, vh) * 0.42
        const c = cols[(Math.random() * cols.length) | 0]
        d.style.cssText = 'position:absolute;left:' + cx + 'px;top:' + cy + 'px;width:' + s + 'px;height:' + s + 'px;border-radius:4px;background:' + c + ';box-shadow:0 0 12px ' + c + ';transform:translate(-50%,-50%) scale(0);opacity:1;transition:transform 1.15s cubic-bezier(.15,.72,.2,1),opacity 1.15s ease;will-change:transform,opacity'
        items.push({ d, tx: Math.cos(ang) * dist, ty: Math.sin(ang) * dist, r: (Math.random() * 200 - 100) })
        frag.appendChild(d)
      }
      el.appendChild(frag)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        items.forEach(({ d, tx, ty, r }) => { d.style.transform = 'translate(calc(-50% + ' + tx + 'px),calc(-50% + ' + ty + 'px)) scale(1) rotate(' + r + 'deg)'; d.style.opacity = '0' })
      }))
      setTimeout(() => { el.innerHTML = '' }, 1500)
    }

    function unblur(el: HTMLElement | null, delay: number) {
      if (!el) return
      el.style.filter = 'blur(16px)'
      setTimeout(() => { el.style.transition = 'filter .65s ease'; el.style.filter = 'blur(0px)' }, delay)
    }

    function activate(i: number) {
      if (cur === i) return; cur = i
      setMascot(i)
      if (i === 1) countTo(E.statNum, stats.totalContributions, 1900)
      else if (i === 2) buildCalendar()
      else if (i === 3) countTo(E.streakNum, stats.longestStreak, 1300)
      else if (i === 4) { if (stats.busiestDay) countTo(E.bigDayNum, stats.busiestDay.count, 1100) }
      else if (i === 5) buildWeekday()
      else if (i === 6) buildBars()
      else if (i === 7) { unblur(E.repoName, 950); if (E.repoStars && stats.topRepo) countTo(E.repoStars, stats.topRepo.stars, 1500) }
      else if (i === 8) stampIn(sections[8])
      else if (i === 9) { unblur(E.persoName, 850); buildMosaic(E.mosaic); setTimeout(() => { if (cur === 9) burst() }, 900) }
      else if (i === 10) buildMosaic(E.mosaic2)
    }

    function frame() {
      const st = scroller!.scrollTop, ch = chC, max = maxC
      if (E.prog) E.prog.style.width = (max > 0 ? st / max * 100 : 0) + '%'
      for (let k = 0; k < nSec; k++) {
        const c = contents[k]; if (!c) continue
        let d = (st - k * ch) / ch; if (d > 1) d = 1; if (d < -1) d = -1
        const ad = Math.abs(d)
        c.style.transform = 'translateY(' + (d * -46) + 'px) scale(' + (1 - ad * 0.06).toFixed(3) + ')'
        c.style.opacity = Math.max(0, 1 - ad * 0.82).toFixed(3)
      }
      // Scroll-coupled background + particles: morph from section `from` to `to`
      // by the fractional scroll position, so both move continuously WITH scroll.
      const f = st / ch
      const from = Math.max(0, Math.min(nSec - 1, Math.floor(f)))
      const to = Math.max(0, Math.min(nSec - 1, from + 1))
      let prog = f - from; if (prog < 0) prog = 0; else if (prog > 1) prog = 1
      if (from !== bgFrom) {
        // Crossed a boundary: repaint the two gradient layers + snap particle
        // size/color/glow to `from` (these are non-composited, so do them once here).
        bgFrom = from
        bgA.style.background = GRAD[from]; bgA.style.opacity = '1'
        bgB.style.background = GRAD[to]
        const Lf = LAYOUTS[from] || []
        for (let k = 0; k < N; k++) {
          const s = Lf[k]; if (!s) continue
          const el = parts[k].el; snapSizes[k] = s.size
          el.style.width = s.size + 'px'; el.style.height = s.size + 'px'
          el.style.background = s.color
          el.style.boxShadow = s.glow ? ('0 0 ' + (s.size * 1.1) + 'px ' + s.color) : 'none'
        }
      }
      bgB.style.opacity = prog.toFixed(3)
      const La = LAYOUTS[from], Lb = LAYOUTS[to]
      if (La && Lb) {
        for (let k = 0; k < N; k++) {
          const a = La[k], b = Lb[k]; if (!a || !b) continue
          const sz = snapSizes[k] || a.size
          const x = Math.round(a.cx + (b.cx - a.cx) * prog - sz / 2)
          const y = Math.round(a.cy + (b.cy - a.cy) * prog - sz / 2)
          const op = a.op + (b.op - a.op) * prog
          const el = parts[k].el
          el.style.transform = 'translate(' + x + 'px,' + y + 'px)'
          el.style.opacity = op <= 0 ? '0' : op >= 1 ? '1' : op.toFixed(2)
        }
      }
      const idx = Math.max(0, Math.min(nSec - 1, Math.round(st / ch)))
      if (idx !== cur) activate(idx)
    }

    // ── Avatar canvases ──────────────────────────────────────────────────────
    function miniAvatar(cv: HTMLCanvasElement | null) {
      if (!cv) return
      const S = cv.width || 80
      const ctx = cv.getContext('2d'); if (!ctx) return
      const paint = () => { ctx.save(); ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.clip(); drawSource(ctx, S); ctx.restore() }
      paint(); redrawFns.push(paint)
    }
    function initAvatar(cv: HTMLCanvasElement | null) {
      if (!cv) return
      const S = 560; cv.width = cv.height = S
      const ctx = cv.getContext('2d'); if (!ctx) return
      const off = document.createElement('canvas'); off.width = off.height = S
      const offCtx = off.getContext('2d'); if (!offCtx) return
      drawSource(offCtx, S); redrawFns.push(() => drawSource(offCtx, S))
      const bs = Math.round(S / 16); const boxes: Array<{ x: number; y: number; s: number; d: number }> = []
      for (let x = 0; x <= S; x += bs) for (let y = 0; y <= S; y += bs) boxes.push({ x, y, s: 0, d: 0 })
      const m = { x: S / 2, y: S / 2, tx: S / 2, ty: S / 2, s: 1.4 }; let auto = 0, hp = false; const T = Math.PI * 2
      const loop = () => {
        auto += 0.018; if (!hp) { m.tx = S / 2 + Math.cos(auto) * S * 0.26; m.ty = S / 2 + Math.sin(auto * 1.3) * S * 0.2 }
        m.x += (m.tx - m.x) * 0.08; m.y += (m.ty - m.y) * 0.08
        const dd = Math.hypot(m.tx - m.x, m.ty - m.y); const ts = Math.max(0.95, Math.min(2.2, 1.15 + dd / S * 3)); m.s += (ts - m.s) * 0.06
        ctx.clearRect(0, 0, S, S); ctx.save(); ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, T); ctx.clip(); ctx.drawImage(off, 0, 0)
        boxes.forEach((b) => { b.d = Math.hypot(b.x - m.x, b.y - m.y); b.s = 1 - Math.max(0, Math.min(1, b.d / S / m.s)); if (b.s < 0.001) return; const z = bs * b.s; ctx.drawImage(off, b.x + z / 2, b.y + z / 2, bs - z, bs - z, b.x, b.y, bs, bs) })
        ctx.fillStyle = '#eaffd0'; boxes.forEach((b) => { if (b.s < 0.02) return; ctx.beginPath(); ctx.arc(b.x, b.y, bs * 0.16 * b.s, 0, T); ctx.fill() })
        ctx.restore(); if (!avStopped) avRaf = requestAnimationFrame(loop)
      }
      loop()
      cv.addEventListener('pointermove', (e) => { const rc = cv.getBoundingClientRect(); m.tx = (e.clientX - rc.left) / rc.width * S; m.ty = (e.clientY - rc.top) / rc.height * S; hp = true })
      cv.addEventListener('pointerleave', () => { hp = false })
    }

    // ── Boot the engine ───────────────────────────────────────────────────────
    buildField()
    recomputeLayouts()
    const measureScroller = () => { chC = scroller.clientHeight || 1; maxC = Math.max(0, scroller.scrollHeight - chC) }
    measureScroller()
    // No opacity transition (written every frame to track scroll) + promote both
    // gradient layers so the blend composites instead of repainting each frame.
    bgA.style.transition = 'none'; bgB.style.transition = 'none'
    bgA.style.willChange = 'opacity'; bgB.style.willChange = 'opacity'
    bgA.style.background = GRAD[0]; bgA.style.opacity = '1'; bgB.style.background = GRAD[1]; bgB.style.opacity = '0'
    const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; frame() }) }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    const onResize = () => { measureScroller(); recomputeLayouts() }
    window.addEventListener('resize', onResize)
    frame(); activate(0)
    initAvatar(q('avatar') as HTMLCanvasElement | null)
    miniAvatar(q('coverAvatar') as HTMLCanvasElement | null)
    miniAvatar(q('cardAvatar') as HTMLCanvasElement | null)

    const intro = q('intro')
    const dismiss = () => {
      if (gone || !intro) return; gone = true
      // Stop the intro avatar's continuous canvas-redraw loop the moment the intro
      // is dismissed, so it stops burning the main thread behind the whole scroll.
      avStopped = true
      if (avRaf) { cancelAnimationFrame(avRaf); avRaf = 0 }
      intro.style.pointerEvents = 'none'; intro.style.opacity = '0'
      setTimeout(() => { if (intro) intro.style.display = 'none' }, 820)
    }
    if (intro) {(['click', 'wheel', 'touchstart', 'keydown'] as const).forEach((ev) => intro.addEventListener(ev, dismiss, { passive: true })) }

    return () => {
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (raf) cancelAnimationFrame(raf)
      if (avRaf) cancelAnimationFrame(avRaf)
    }
  }, [stats])

  const topRepoName = stats.topRepo?.fullName ?? ''
  const slash = topRepoName.indexOf('/')
  const repoOwner = slash >= 0 ? topRepoName.slice(0, slash) : topRepoName
  const repoBase = slash >= 0 ? topRepoName.slice(slash + 1) : ''

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#02160e', fontFamily: SPACE }}
    >
      <style>{STORY_CSS}</style>

      <div data-id="bgA" style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 1 }} />
      <div data-id="bgB" style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0, transition: 'opacity .9s ease' }} />
      <div data-id="field" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }} />

      <div
        ref={scrollerRef}
        data-id="scroller"
        style={{ position: 'absolute', inset: 0, zIndex: 2, overflowY: 'scroll', overflowX: 'hidden', scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}
      >
        {/* 0 Cover */}
        <section data-sec={0} data-screen-label="01 Cover" style={{ position: 'relative', height: '100vh', scrollSnapAlign: 'start', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'clamp(28px,6vw,96px)' }}>
          <div data-content="" className="coverShift" style={{ willChange: 'transform,opacity', width: '100%' }}>
            <div className="coverWrap">
              <div className="coverPortrait">
                <canvas data-id="coverAvatar" width={320} height={320} />
                <div>
                  <div style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 'clamp(20px,2.4vw,30px)', color: '#eaffd0', lineHeight: 1.06 }}>{stats.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 'clamp(12px,1.4vw,16px)', color: '#9bff5e', marginTop: 5 }}>@{stats.username}</div>
                </div>
              </div>
              <div className="coverText">
                <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 'clamp(12px,1.45vw,15px)', letterSpacing: '.24em', color: '#eaffd0', textShadow: '0 1px 8px rgba(0,30,15,.5)' }}>// GITHUB WRAPPED · {stats.year}</div>
                <div style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 'clamp(44px,8.6vw,128px)', lineHeight: .86, letterSpacing: '-.035em', color: '#eaffd0', textShadow: '0 8px 60px rgba(0,30,15,.55)', marginTop: '.18em' }}>{stats.username},<br />your {stats.year}<br />in code.</div>
                <div className="coverSub" style={{ fontFamily: SPACE, fontSize: 'clamp(15px,1.7vw,21px)', color: '#dfffb0', opacity: .9, marginTop: 'clamp(16px,2vw,28px)' }}>{stats.copy.coverSub}</div>
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 'clamp(24px,3.4vw,44px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 13, letterSpacing: '.12em', color: '#dfffb0' }}>
            <span style={{ opacity: .8 }}>scroll to begin</span>
            <span style={{ fontSize: 20, animation: 'drawHint 1.8s ease-in-out infinite' }}>↓</span>
          </div>
        </section>

        {/* 1 Big Number */}
        <section data-sec={1} data-screen-label="02 Big Number" style={{ position: 'relative', height: '100vh', scrollSnapAlign: 'start', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 'clamp(28px,6vw,96px)' }}>
          <div data-content="" style={{ willChange: 'transform,opacity' }}>
            <div style={{ fontFamily: SPACE, fontWeight: 600, fontSize: 'clamp(18px,2.4vw,30px)', color: '#ffe3c2' }}>You made</div>
            <div data-id="statNum" style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 'clamp(110px,24vw,360px)', lineHeight: .84, letterSpacing: '-.05em', color: '#fff4e0', textShadow: '0 12px 70px rgba(120,0,40,.5)' }}>0</div>
            <div style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 'clamp(28px,4.5vw,62px)', color: '#fff4e0', letterSpacing: '-.02em', lineHeight: 1, marginTop: '-.1em' }}>contributions this year</div>
            <div style={{ fontFamily: SPACE, fontSize: 'clamp(15px,1.8vw,21px)', color: '#fff', marginTop: 'clamp(12px,1.6vw,22px)' }}>{stats.copy.bigNumberSub}</div>
          </div>
        </section>

        {/* 2 Year in Squares */}
        <section data-sec={2} data-screen-label="03 Year in Squares" style={{ position: 'relative', height: '100vh', scrollSnapAlign: 'start', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'clamp(28px,6vw,80px)' }}>
          <div data-content="" style={{ willChange: 'transform,opacity', width: '100%', maxWidth: 960, textAlign: 'center' }}>
            <div style={{ fontFamily: MONO, fontSize: 'clamp(12px,1.4vw,15px)', letterSpacing: '.24em', color: '#9bff5e' }}>// YOUR YEAR, ONE SQUARE AT A TIME</div>
            <div style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 'clamp(32px,5.5vw,78px)', lineHeight: .92, letterSpacing: '-.03em', color: '#eaffd0', margin: '.12em 0 .1em' }}>{renderMultiline(stats.copy.squaresHeadline)}</div>
            <div data-id="calGrid" style={{ margin: '0 auto' }} />
          </div>
        </section>

        {/* 3 Streak */}
        <section data-sec={3} data-screen-label="04 Streak" style={{ position: 'relative', height: '100vh', scrollSnapAlign: 'start', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 'clamp(28px,6vw,96px)' }}>
          <div data-content="" style={{ willChange: 'transform,opacity' }}>
            <div style={{ fontFamily: MONO, fontSize: 'clamp(12px,1.4vw,15px)', letterSpacing: '.24em', color: '#ffd6f4' }}>// THE STREAK</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '.18em', flexWrap: 'wrap', justifyContent: 'center', marginTop: '.1em' }}>
              <span data-id="streakNum" style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 'clamp(110px,24vw,340px)', lineHeight: .82, letterSpacing: '-.05em', color: '#ffe9fb', textShadow: '0 12px 70px rgba(80,0,80,.5)' }}>0</span>
              <span style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 'clamp(28px,4.6vw,64px)', color: '#ffb3ec', letterSpacing: '-.02em' }}>days straight</span>
            </div>
            <div style={{ fontFamily: SPACE, fontSize: 'clamp(15px,1.9vw,22px)', color: '#ffe9fb', marginTop: 'clamp(12px,1.6vw,22px)', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>{stats.copy.streakSub}</div>
          </div>
        </section>

        {/* 4 Feral Day */}
        <section data-sec={4} data-screen-label="05 Feral Day" style={{ position: 'relative', height: '100vh', scrollSnapAlign: 'start', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'clamp(28px,6vw,96px)' }}>
          <div data-content="" style={{ willChange: 'transform,opacity', width: '100%', maxWidth: 1100 }}>
            <div style={{ fontFamily: MONO, fontSize: 'clamp(12px,1.4vw,15px)', letterSpacing: '.24em', color: '#04231b' }}>// THE DAY SOMETHING SNAPPED</div>
            <div style={{ fontFamily: SPACE, fontWeight: 600, fontSize: 'clamp(18px,2.4vw,30px)', color: '#03392c', marginTop: '.2em' }}>{stats.copy.feralIntro}</div>
            {stats.busiestDay ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '.16em' }}>
                <span data-id="bigDayNum" style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 'clamp(110px,24vw,360px)', lineHeight: .82, letterSpacing: '-.05em', color: '#04231b', textShadow: '0 10px 50px rgba(0,60,40,.3)' }}>0</span>
                <span style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 'clamp(28px,4.5vw,64px)', color: '#04231b', letterSpacing: '-.02em', paddingBottom: '.16em' }}>commits</span>
              </div>
            ) : (
              <div style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 'clamp(40px,7vw,96px)', lineHeight: .9, letterSpacing: '-.03em', color: '#04231b', margin: '.12em 0' }}>a steady, even year.</div>
            )}
            <div style={{ fontFamily: SPACE, fontSize: 'clamp(15px,1.9vw,22px)', color: '#03392c', marginTop: 'clamp(10px,1.4vw,18px)', maxWidth: 520 }}>{stats.copy.feralSub}</div>
          </div>
        </section>

        {/* 5 Rhythm */}
        <section data-sec={5} data-screen-label="06 Rhythm" style={{ position: 'relative', height: '100vh', scrollSnapAlign: 'start', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'clamp(28px,6vw,96px)' }}>
          <div data-content="" style={{ willChange: 'transform,opacity', width: '100%', maxWidth: 880, textAlign: 'center' }}>
            <div style={{ fontFamily: MONO, fontSize: 'clamp(12px,1.4vw,15px)', letterSpacing: '.24em', color: '#cdeeff' }}>// YOUR RHYTHM</div>
            <div style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 'clamp(34px,6vw,86px)', lineHeight: .9, letterSpacing: '-.03em', color: '#f2fbff', margin: '.1em 0 0' }}>{renderMultiline(stats.copy.rhythmHeadline)}</div>
            <div data-id="weekWrap" style={{ marginTop: 8 }} />
            <div style={{ fontFamily: SPACE, fontSize: 'clamp(15px,1.8vw,21px)', color: '#cdeeff', marginTop: 18 }}>{stats.copy.rhythmSub}</div>
          </div>
        </section>

        {/* 6 Languages */}
        <section data-sec={6} data-screen-label="07 Languages" style={{ position: 'relative', height: '100vh', scrollSnapAlign: 'start', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'clamp(28px,6vw,96px)' }}>
          <div data-content="" style={{ willChange: 'transform,opacity', width: '100%', maxWidth: 900 }}>
            <div style={{ fontFamily: MONO, fontSize: 'clamp(12px,1.4vw,15px)', letterSpacing: '.24em', color: '#aef' }}>// LANGUAGE AS IDENTITY</div>
            <div style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 'clamp(34px,6vw,82px)', lineHeight: .92, letterSpacing: '-.03em', color: '#eafdff', margin: '.1em 0 .5em' }}>{renderMultiline(stats.copy.languagesHeadline)}</div>
            <div data-id="langWrap" style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px,1.8vw,22px)' }} />
            <div style={{ fontFamily: SPACE, fontSize: 'clamp(15px,1.8vw,21px)', color: '#cdeeff', marginTop: 22 }}>{stats.copy.languagesSub}</div>
          </div>
        </section>

        {/* 7 Top Repo */}
        <section data-sec={7} data-screen-label="08 Top Repo" style={{ position: 'relative', height: '100vh', scrollSnapAlign: 'start', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 'clamp(28px,6vw,96px)' }}>
          <div data-content="" style={{ willChange: 'transform,opacity', width: '100%', maxWidth: 1000 }}>
            <div style={{ fontFamily: SPACE, fontWeight: 600, fontSize: 'clamp(18px,2.4vw,30px)', color: '#ffe0b8' }}>{stats.copy.topRepoIntro}</div>
            <div data-id="repoName" style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 'clamp(40px,8vw,128px)', lineHeight: .86, letterSpacing: '-.03em', color: '#fff3df', margin: '.14em 0', filter: 'blur(16px)', textShadow: '0 10px 50px rgba(120,50,0,.4)' }}>
              {stats.topRepo ? (<>{repoOwner}/<br />{repoBase}</>) : 'a little of everything'}
            </div>
            {stats.topRepo ? (
              <div style={{ fontFamily: SPACE, fontSize: 'clamp(16px,2vw,24px)', color: '#fff' }}>
                <span data-id="repoStars" style={{ fontFamily: BRICOLAGE, fontWeight: 700 }}>0</span> stars. {stats.copy.topRepoSub}
              </div>
            ) : (
              <div style={{ fontFamily: SPACE, fontSize: 'clamp(16px,2vw,24px)', color: '#fff' }}>{stats.copy.topRepoSub}</div>
            )}
          </div>
        </section>

        {/* 8 Receipts */}
        <section data-sec={8} data-screen-label="09 Receipts" style={{ position: 'relative', height: '100vh', scrollSnapAlign: 'start', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'clamp(28px,6vw,96px)' }}>
          <div data-content="" style={{ willChange: 'transform,opacity', width: '100%', maxWidth: 900 }}>
            <div data-stamp="" style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 'clamp(40px,7vw,104px)', lineHeight: .9, letterSpacing: '-.03em', color: '#fff', marginBottom: '.3em' }}>The receipts.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(14px,2vw,26px)' }}>
              {stats.receipts.map((r, i) => (
                <div key={i} data-stamp="" style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 'clamp(34px,5vw,68px)', color: r.color, letterSpacing: '-.02em' }}>{r.value}</span>
                  <span style={{ fontFamily: SPACE, fontSize: 'clamp(15px,1.8vw,21px)', color: 'rgba(255,255,255,.92)' }}>{r.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 9 Personality */}
        <section data-sec={9} data-screen-label="10 Personality" style={{ position: 'relative', height: '100vh', scrollSnapAlign: 'start', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 'clamp(28px,6vw,96px)' }}>
          <div data-content="" style={{ willChange: 'transform,opacity', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(12px,1.8vw,22px)' }}>
            <div style={{ fontFamily: MONO, fontSize: 'clamp(12px,1.4vw,15px)', letterSpacing: '.24em', color: '#cdeaff' }}>{stats.copy.personalityKicker}</div>
            <div style={{ position: 'relative', width: 'clamp(120px,13vw,158px)', height: 'clamp(120px,13vw,158px)' }}>
              <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', background: 'conic-gradient(from 0deg,#00e5ff,#7a3cff,#ff2e7e,#00e5ff)', filter: 'blur(9px)', opacity: .9, animation: 'spinRing 6s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#140a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.22)' }}><div data-id="mosaic" /></div>
            </div>
            <div style={{ fontFamily: SPACE, fontSize: 'clamp(14px,1.6vw,19px)', color: 'rgba(255,255,255,.75)' }}>You are</div>
            <div data-id="persoName" style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 'clamp(46px,9vw,140px)', lineHeight: .84, letterSpacing: '-.025em', background: 'linear-gradient(100deg,#7af9ff,#c9a3ff,#ff8ac4)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: '#eafcff', filter: 'blur(16px)' }}>{stats.personality.name}</div>
            <div style={{ fontFamily: SPACE, fontSize: 'clamp(15px,1.9vw,22px)', color: 'rgba(255,255,255,.92)', maxWidth: 560 }}>{stats.personality.blurb}</div>
          </div>
        </section>

        {/* 10 Trophy Card */}
        <section data-sec={10} data-screen-label="11 Trophy Card" style={{ position: 'relative', height: '100vh', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 'clamp(18px,4vw,56px)' }}>
          <div data-content="" style={{ willChange: 'transform,opacity', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 'min(430px,86vw)', borderRadius: 30, padding: '30px 28px', overflow: 'hidden', background: 'linear-gradient(158deg, rgba(255,255,255,.2), rgba(255,255,255,.06))', border: '1px solid rgba(255,255,255,.3)', boxShadow: '0 40px 100px -24px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, transparent 32%, rgba(255,255,255,.28) 50%, transparent 68%)', backgroundSize: '250% 100%', animation: 'shimmer 4.8s linear infinite', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <canvas data-id="cardAvatar" width={80} height={80} style={{ width: 40, height: 40, borderRadius: '50%', boxShadow: '0 0 0 2px rgba(122,249,255,.3)' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontFamily: SPACE, fontWeight: 700, fontSize: 15, color: '#fff' }}>@{stats.username}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: 'rgba(255,255,255,.65)' }}>GITHUB WRAPPED {stats.year}</div>
                  </div>
                </div>
                <div style={{ position: 'relative', width: 54, height: 54 }}>
                  <div style={{ position: 'absolute', inset: -5, borderRadius: '50%', background: 'conic-gradient(from 0deg,#00e5ff,#7a3cff,#ff2e7e,#00e5ff)', filter: 'blur(4px)', opacity: .9, animation: 'spinRing 6s linear infinite' }} />
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#140a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div data-id="mosaic2" /></div>
                </div>
              </div>
              <div style={{ position: 'relative', fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 34, lineHeight: .92, letterSpacing: '-.02em', marginTop: 20, background: 'linear-gradient(100deg,#7af9ff,#c9a3ff,#ff8ac4)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: '#eafcff' }}>{stats.personality.name}</div>
              {!stats.isQuietYear && (
                <div style={{ position: 'relative', fontFamily: SPACE, fontSize: 12.5, color: 'rgba(255,255,255,.82)', marginTop: 6 }}>{stats.personality.axes.join(' · ')}</div>
              )}
              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 10px', marginTop: 22 }}>
                {stats.cardStats.map((s, i) => (
                  <div key={i} style={{ textAlign: 'left' }}>
                    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: 'rgba(255,255,255,.6)' }}>{s.label}</div>
                    <div style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 24, color: '#fff', marginTop: 2 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <ShareBar
              username={stats.username}
              year={stats.year}
              personalityName={stats.personality.name}
              onReplay={() => scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            />
          </div>
        </section>
      </div>

      <div data-id="burst" style={{ position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 70, pointerEvents: 'none', boxShadow: 'inset 0 0 220px 50px rgba(0,0,0,.34)' }} />

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, zIndex: 60, background: 'rgba(255,255,255,.12)' }}>
        <div data-id="prog" style={{ height: '100%', width: 0, background: 'linear-gradient(90deg,#9bff5e,#00e5ff,#ff2e7e)', transition: 'width .15s linear' }} />
      </div>

      <div style={{ position: 'absolute', right: 'clamp(14px,3vw,42px)', bottom: 'clamp(14px,3vw,36px)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, pointerEvents: 'none' }}>
        <div data-id="speech" style={{ fontFamily: MONO, fontSize: 12.5, color: '#13131a', background: '#fff', padding: '9px 14px', borderRadius: '14px 14px 4px 14px', boxShadow: '0 10px 28px rgba(0,0,0,.3)', maxWidth: 210, lineHeight: 1.35, transition: 'opacity .35s,transform .35s' }}>booting up your year...</div>
        <div data-id="mascotBob" style={{ animation: 'bob 3.4s ease-in-out infinite', filter: 'drop-shadow(0 12px 16px rgba(0,0,0,.32))' }}>
          <svg width={132} height={150} viewBox="0 0 132 150">
            <defs>
              <linearGradient id="bodyG" x1="0" y1="0" x2="0" y2="1">
                <stop data-id="bgTop" offset="0" stopColor="#3ad36c" />
                <stop data-id="bgBot" offset="1" stopColor="#0f8a44" />
              </linearGradient>
            </defs>
            <ellipse cx={66} cy={142} rx={36} ry={6} fill="rgba(0,0,0,.22)" />
            <path d="M30 64 A40 40 0 0 1 102 64" fill="none" stroke="#181820" strokeWidth={8} strokeLinecap="round" />
            <rect x={18} y={60} width={18} height={34} rx={8} fill="#181820" />
            <rect x={96} y={60} width={18} height={34} rx={8} fill="#181820" />
            <rect x={14} y={68} width={8} height={14} rx={4} fill="#00e5ff" />
            <rect x={110} y={68} width={8} height={14} rx={4} fill="#00e5ff" />
            <line x1={66} y1={42} x2={66} y2={24} stroke="#0c5a32" strokeWidth={4} />
            <circle data-id="antTip" cx={66} cy={20} r={6} fill="#c8ff5e" />
            <rect x={28} y={42} width={76} height={80} rx={24} fill="url(#bodyG)" />
            <rect x={37} y={49} width={30} height={13} rx={7} fill="rgba(255,255,255,.28)" />
            <rect x={38} y={60} width={56} height={44} rx={15} fill="#0a1410" />
            <g data-id="eyeL" style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'blink 4.2s infinite' }}><rect data-id="eyeLr" x={50} y={74} width={9} height={13} rx={4.5} fill="#7af9ff" /></g>
            <g data-id="eyeR" style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'blink 4.2s .2s infinite' }}><rect data-id="eyeRr" x={73} y={74} width={9} height={13} rx={4.5} fill="#7af9ff" /></g>
            <path data-id="mouth" d="M54 95 Q66 103 78 95" stroke="#7af9ff" strokeWidth={3} fill="none" strokeLinecap="round" />
            <circle data-id="hand" cx={106} cy={92} r={10} fill="url(#bodyG)" style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'handWave 1.5s ease-in-out infinite' }} />
            <rect x={46} y={120} width={15} height={13} rx={6} fill="#0c5a32" />
            <rect x={71} y={120} width={15} height={13} rx={6} fill="#0c5a32" />
            <g data-id="prop" />
          </svg>
        </div>
      </div>

      <div data-id="intro" style={{ position: 'absolute', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 'clamp(12px,1.8vw,20px)', textAlign: 'center', padding: 24, background: 'radial-gradient(125% 120% at 50% 28%, #0c7a4f 0%, #064d36 45%, #02160e 100%)', transition: 'opacity .8s ease', cursor: 'pointer' }}>
        <div style={{ fontFamily: MONO, fontSize: 'clamp(12px,1.5vw,15px)', letterSpacing: '.3em', color: '#9bff5e' }}>// GITHUB WRAPPED · {stats.year}</div>
        <canvas data-id="avatar" style={{ width: 'min(280px,58vw)', height: 'min(280px,58vw)', borderRadius: '50%', boxShadow: '0 24px 70px rgba(0,0,0,.55), 0 0 0 6px rgba(155,255,94,.12)' }} />
        <div style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 'clamp(34px,6vw,68px)', letterSpacing: '-.02em', color: '#eaffd0', marginTop: '.1em' }}>{stats.name}</div>
        <div style={{ fontFamily: MONO, fontSize: 'clamp(13px,1.6vw,17px)', color: '#9bff5e' }}>@{stats.username}</div>
        <div style={{ fontFamily: SPACE, fontSize: 'clamp(15px,1.8vw,20px)', color: '#dfffb0', opacity: .9, marginTop: 4 }}>Your year in code is ready.</div>
        <div data-id="introBtn" style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: MONO, fontWeight: 600, fontSize: 'clamp(14px,1.7vw,17px)', color: '#04140d', background: '#9bff5e', padding: '14px 30px', borderRadius: 999, marginTop: 8, boxShadow: '0 12px 30px rgba(0,80,30,.4)' }}><span style={{ fontSize: 13 }}>▶</span> Press play</div>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '.1em', color: '#9bff5e', opacity: .65, marginTop: 2, animation: 'drawHint 1.8s ease-in-out infinite' }}>tap anywhere to begin</div>
      </div>
    </div>
  )
}

/** Render a copy string that may contain "\n" as <br/>-separated lines. */
function renderMultiline(s: string) {
  const lines = s.split('\n')
  return lines.map((line, i) => (
    <span key={i}>
      {line}
      {i < lines.length - 1 ? <br /> : null}
    </span>
  ))
}

const STORY_CSS = `
@keyframes breathe{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(.82)}}
@keyframes spinRing{to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes bob{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-9px) rotate(1.5deg)}}
@keyframes blink{0%,90%,100%{transform:scaleY(1)}95%{transform:scaleY(.12)}}
@keyframes handWave{0%,100%{transform:rotate(6deg)}50%{transform:rotate(-30deg)}}
@keyframes drawHint{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(8px);opacity:1}}
@keyframes twinkle{0%,100%{opacity:.3}50%{opacity:1}}
@keyframes ignitePop{0%{opacity:0;transform:scale(.2)}100%{opacity:1;transform:scale(1)}}
@keyframes stamp{0%{opacity:0;transform:scale(1.5) rotate(-3deg)}60%{opacity:1}100%{opacity:1;transform:scale(1) rotate(0)}}
[data-id="scroller"]{scrollbar-width:none;-ms-overflow-style:none;overscroll-behavior-y:none}
[data-id="scroller"]::-webkit-scrollbar{width:0;height:0}
/* Force a stop at every section even on a hard flick, so one gesture advances
   one section instead of skipping several (loud's scroll feel). */
[data-id="scroller"]>section[data-sec]{scroll-snap-stop:always}
/* Cover (section 0): text column on the left, large portrait on the right.
   Reflows to a stacked column (portrait on top) on narrow screens. */
.coverWrap{display:flex;align-items:center;justify-content:center;gap:clamp(50px,5.5vw,96px);width:100%;max-width:1200px;margin:0 auto}
.coverText{flex:0 1 auto;min-width:0}
.coverSub{max-width:520px}
.coverShift{margin-top:clamp(40px,6.5vh,88px)}
.coverPortrait{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:clamp(12px,1.4vw,18px);text-align:center}
.coverPortrait canvas{width:clamp(196px,21vw,288px);height:clamp(196px,21vw,288px);border-radius:50%;box-shadow:0 26px 80px rgba(0,0,0,.45),0 0 0 6px rgba(155,255,94,.16)}
@media(max-width:760px){
.coverWrap{flex-direction:column;gap:clamp(22px,5vw,34px);text-align:center}
.coverText{text-align:center}
.coverSub{margin-left:auto;margin-right:auto}
.coverShift{margin-top:0;margin-bottom:clamp(74px,13vh,150px)}
.coverPortrait canvas{width:clamp(140px,42vw,210px);height:clamp(140px,42vw,210px)}
}
`

export default WrappedStory
