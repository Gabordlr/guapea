/*
 * Guapea loaders — dependency-free DOM/SVG animations.
 *
 *   const stop = steps(container)   // basic step
 *   const stop = rueda(container)   // rueda
 *   stop()                          // removes the svg and cancels animation
 *
 * Each call creates its own <svg> inside the container.
 * Typed port of the standalone `GuapeaLoaders` script.
 */

const NS = 'http://www.w3.org/2000/svg'
const STYLE_ID = 'guapea-loaders-style'

/* 1) BASIC STEP (pure CSS animation)
   One cycle = 8 beats = 100%, so each beat is 12.5%.
   A step moves during the first 70% of its beat (8.75%) and then holds.
   Beats 4 and 8 are plain holds: that is the "break". */
const CSS = [
  '.gp-steps{display:block;--gp-cycle:2.88s;--gp-reach:34px}',
  '.gp-footL,.gp-footR,.gp-padL,.gp-padR{animation-duration:var(--gp-cycle);animation-iteration-count:infinite;animation-timing-function:linear}',
  '.gp-footL{animation-name:gp-moveL}',
  '.gp-footR{animation-name:gp-moveR}',
  '.gp-padL{animation-name:gp-weightL}',
  '.gp-padR{animation-name:gp-weightR}',
  '@keyframes gp-moveL{',
  '0%{transform:translateY(0);animation-timing-function:ease-in-out}',
  '8.75%{transform:translateY(calc(var(--gp-reach) * -1))}',
  '25%{transform:translateY(calc(var(--gp-reach) * -1));animation-timing-function:ease-in-out}',
  '33.75%{transform:translateY(0)}',
  '100%{transform:translateY(0)}}',
  '@keyframes gp-moveR{',
  '0%{transform:translateY(0)}',
  '50%{transform:translateY(0);animation-timing-function:ease-in-out}',
  '58.75%{transform:translateY(var(--gp-reach))}',
  '75%{transform:translateY(var(--gp-reach));animation-timing-function:ease-in-out}',
  '83.75%{transform:translateY(0)}',
  '100%{transform:translateY(0)}}',
  '@keyframes gp-weightL{',
  '0%,12%{fill-opacity:1}13.5%,23.5%{fill-opacity:.3}25%,49%{fill-opacity:1}',
  '50.5%,61%{fill-opacity:.3}62.5%,73.5%{fill-opacity:1}75%,98%{fill-opacity:.3}100%{fill-opacity:1}}',
  '@keyframes gp-weightR{',
  '0%,11%{fill-opacity:.3}12.5%,24%{fill-opacity:1}25.5%,48.5%{fill-opacity:.3}',
  '50%,61%{fill-opacity:1}62.5%,73.5%{fill-opacity:.3}75%,98%{fill-opacity:1}100%{fill-opacity:.3}}',
  '@media (prefers-reduced-motion:reduce){.gp-steps *{animation:none!important}}',
].join('')

function injectCSS() {
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = CSS
  document.head.appendChild(s)
}

export type Phase = 0 | 1 | 2

export type StepsOptions = {
  /** rendered width in px */
  size?: number
  /** one beat in ms; a full cycle is 8 beats */
  beatMs?: number
  /** how far a foot travels (viewBox px) */
  reach?: number
  leftColor?: string
  rightColor?: string
  label?: string
}

export function steps(container: Element, opts: StepsOptions = {}): () => void {
  const o = {
    size: 200,
    beatMs: 360,
    reach: 34,
    leftColor: '#EF5F6B',
    rightColor: '#F0A35A',
    label: 'Cargando',
    ...opts,
  }
  injectCSS()

  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('class', 'gp-steps')
  svg.setAttribute('viewBox', '0 0 200 180')
  svg.setAttribute('width', String(o.size))
  svg.setAttribute('height', String(Math.round(o.size * 0.9)))
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', o.label)
  svg.style.setProperty('--gp-cycle', `${(o.beatMs * 8) / 1000}s`)
  svg.style.setProperty('--gp-reach', `${o.reach}px`)
  svg.innerHTML =
    `<g class="gp-footL"><ellipse class="gp-padL" cx="76" cy="90" rx="12" ry="21" fill="${o.leftColor}"/></g>` +
    `<g class="gp-footR"><ellipse class="gp-padR" cx="124" cy="90" rx="12" ry="21" fill="${o.rightColor}"/></g>`
  container.appendChild(svg)

  return function stop() {
    svg.remove()
  }
}

/* 2) RUEDA
   Every dancer stands on the SAME circle. Each couple sits side by side:
     leader   = square, at (couple angle - gap)
     follower = circle, at (couple angle + gap)
   Cycle: guapea  (partners come slightly closer, then apart)
       -> dame    (each follower travels one couple clockwise)
       -> dile que no (the new pair swaps sides, then swaps back) */

export type RuedaOptions = {
  couples?: number
  /** rendered width/height in px */
  size?: number
  radius?: number
  gap?: number
  bow?: number
  crossBow?: number
  sway?: number
  mirror?: boolean
  pause?: number
  times?: Partial<{ basic: number; dame: number; cross: number; settle: number }>
  colors?: string[]
  leaderColor?: string
  guide?: boolean
  guideColor?: string
  label?: string
  onPhase?: ((phase: Phase) => void) | null
}

type Pos = { r: number; a: number }
type Wave = (p: number) => number

const ease = (x: number) =>
  x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
const c01 = (x: number) => Math.min(1, Math.max(0, x))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Piecewise motion: move to each value in turn, holding briefly between moves. */
function makeWave(values: number[], holdW: number): Wave {
  const segs: Array<
    | { move: true; w: number; a: number; b: number }
    | { move: false; w: number; v: number }
  > = []
  let total = 0
  for (let n = 0; n < values.length - 1; n++) {
    segs.push({ move: true, w: 1, a: values[n], b: values[n + 1] })
    total += 1
    if (n < values.length - 2 && holdW > 0) {
      segs.push({ move: false, w: holdW, v: values[n + 1] })
      total += holdW
    }
  }
  return (p) => {
    let x = c01(p) * total
    for (let m = 0; m < segs.length; m++) {
      const s = segs[m]
      if (x <= s.w || m === segs.length - 1) {
        return s.move ? lerp(s.a, s.b, ease(c01(x / s.w))) : s.v
      }
      x -= s.w
    }
    return 0
  }
}

export function rueda(container: Element, opts: RuedaOptions = {}): () => void {
  const defaults = {
    couples: 4,
    size: 300,
    radius: 100,
    gap: 12,
    bow: 20,
    crossBow: 14,
    sway: 5,
    mirror: true,
    pause: 0.45,
    colors: ['#D4537E', '#EF9F27', '#1D9E75', '#7F77DD'],
    leaderColor: '#F3E9E4',
    guide: true,
    guideColor: '#5d4a54',
    label: 'Cargando',
    onPhase: null as ((phase: Phase) => void) | null,
  }
  const o = { ...defaults, ...opts }
  const times = { basic: 2300, dame: 1400, cross: 1800, settle: 800, ...opts.times }

  const CX = 150
  const CY = 150
  const N = o.couples
  const RAD = Math.PI / 180
  const step = 360 / N
  const g = o.gap * RAD
  const stepR = step * RAD
  const tb = times.basic
  const td = tb + times.dame
  const tc = td + times.cross
  const T = tc + times.settle
  const swayA = o.sway / o.radius

  const base = (k: number) => (-90 + k * step) * RAD
  const pol = (r: number, a: number): [number, number] => [
    CX + r * Math.cos(a),
    CY + r * Math.sin(a),
  ]
  const col = (j: number) => o.colors[j % o.colors.length]

  const waveBasic = makeWave([0, 1, -1, 1, -1, 0], o.pause)
  const waveSettle = makeWave([0, 1, 0], o.pause)

  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', '0 0 300 300')
  svg.setAttribute('width', String(o.size))
  svg.setAttribute('height', String(o.size))
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', o.label)
  svg.style.display = 'block'
  container.appendChild(svg)

  function mk<K extends keyof SVGElementTagNameMap>(
    tag: K,
    attrs: Record<string, string | number>,
  ): SVGElementTagNameMap[K] {
    const e = document.createElementNS(NS, tag)
    for (const k in attrs) e.setAttribute(k, String(attrs[k]))
    svg.appendChild(e)
    return e
  }

  if (o.guide) {
    mk('circle', {
      cx: CX,
      cy: CY,
      r: o.radius,
      fill: 'none',
      stroke: o.guideColor,
      'stroke-dasharray': '3 4',
    })
  }

  const linkA: SVGLineElement[] = []
  const linkB: SVGLineElement[] = []
  const ghosts: SVGCircleElement[][] = []
  const leaders: SVGRectElement[] = []
  const followers: SVGCircleElement[] = []

  for (let j = 0; j < N; j++) {
    linkA[j] = mk('line', { stroke: col(j), 'stroke-width': 2 })
    linkB[j] = mk('line', { stroke: col(j), 'stroke-width': 2 })
  }
  for (let j = 0; j < N; j++) {
    ghosts[j] = []
    for (let i = 0; i < 5; i++) {
      ghosts[j][i] = mk('circle', { r: 6, fill: col(j), opacity: 0 })
    }
  }
  for (let k = 0; k < N; k++) {
    leaders[k] = mk('rect', {
      width: 14,
      height: 14,
      rx: 3,
      fill: o.leaderColor,
    })
  }
  for (let j = 0; j < N; j++) {
    followers[j] = mk('circle', { r: 9, fill: col(j) })
  }

  let lastPhase: Phase | -1 = -1
  let raf = 0
  let t0 = 0
  let stopped = false

  function frame(t: number) {
    const c = Math.floor(t / T)
    const u = t % T
    const phase: Phase = u >= tb && u < td ? 1 : u >= td && u < tc ? 2 : 0
    const R = o.radius

    // partners move slightly closer, then slightly apart (0 at both ends)
    const d =
      u < tb
        ? waveBasic(u / tb) * swayA
        : u >= tc
          ? waveSettle((u - tc) / times.settle) * swayA
          : 0
    const dl = d
    const df = o.mirror ? -d : d

    const L: Pos[] = []
    for (let k = 0; k < N; k++) L[k] = { r: R, a: base(k) - g + dl }

    const F: Pos[] = []
    const link1: [number, number][] = []
    const link2: [number, number][] = []

    for (let j = 0; j < N; j++) {
      const mOld = (j + c) % N
      const mNew = (j + c + 1) % N
      if (phase === 0) {
        const m = u < tb ? mOld : mNew
        F[j] = { r: R, a: base(m) + g + df }
        link1[j] = [m, 1]
        link2[j] = [m, 0]
      } else if (phase === 1) {
        const e = ease((u - tb) / times.dame)
        F[j] = {
          r: R - o.bow * Math.sin(Math.PI * e),
          a: base(j) + g + stepR * (c + e),
        }
        link1[j] = [mOld, 1 - e]
        link2[j] = [mNew, e]
      } else {
        const mm = mNew
        const q = (u - td) / times.cross
        let w: number
        let sg: number
        if (q < 0.5) {
          w = ease(q * 2)
          sg = 1
        } else {
          w = 1 - ease((q - 0.5) * 2)
          sg = -1
        }
        const sw = Math.sin(Math.PI * w) * o.crossBow
        const aL = base(mm) - g
        const aF = base(mm) + g
        L[mm] = { r: R - sg * sw, a: lerp(aL, aF, w) }
        F[j] = { r: R + sg * sw, a: lerp(aF, aL, w) }
        link1[j] = [mm, 1]
        link2[j] = [mm, 0]
      }
    }

    for (let k = 0; k < N; k++) {
      const p = pol(L[k].r, L[k].a)
      leaders[k].setAttribute('x', String(p[0] - 7))
      leaders[k].setAttribute('y', String(p[1] - 7))
    }
    for (let j = 0; j < N; j++) {
      const f = pol(F[j].r, F[j].a)
      followers[j].setAttribute('cx', String(f[0]))
      followers[j].setAttribute('cy', String(f[1]))
      const a = pol(L[link1[j][0]].r, L[link1[j][0]].a)
      const b = pol(L[link2[j][0]].r, L[link2[j][0]].a)
      linkA[j].setAttribute('x1', String(f[0]))
      linkA[j].setAttribute('y1', String(f[1]))
      linkA[j].setAttribute('x2', String(a[0]))
      linkA[j].setAttribute('y2', String(a[1]))
      linkA[j].setAttribute('opacity', String(link1[j][1]))
      linkB[j].setAttribute('x1', String(f[0]))
      linkB[j].setAttribute('y1', String(f[1]))
      linkB[j].setAttribute('x2', String(b[0]))
      linkB[j].setAttribute('y2', String(b[1]))
      linkB[j].setAttribute('opacity', String(link2[j][1]))

      for (let i = 0; i < 5; i++) {
        if (phase === 1) {
          const pr = (u - tb) / times.dame
          const ge = ease(c01(pr - (i + 1) * 0.05))
          const gp = pol(
            R - o.bow * Math.sin(Math.PI * ge),
            base(j) + g + stepR * (c + ge),
          )
          ghosts[j][i].setAttribute('cx', String(gp[0]))
          ghosts[j][i].setAttribute('cy', String(gp[1]))
          ghosts[j][i].setAttribute(
            'opacity',
            String(0.4 * (1 - i / 5) * Math.sin(Math.PI * c01(pr))),
          )
        } else {
          ghosts[j][i].setAttribute('opacity', '0')
        }
      }
    }

    if (phase !== lastPhase) {
      lastPhase = phase
      o.onPhase?.(phase)
    }
  }

  // Begin on dame (partner switch), not the in-place guapea sway.
  const startAt = tb

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    frame(startAt)
  } else {
    const loop = (now: number) => {
      if (stopped) return
      if (!t0) t0 = now - startAt
      frame(now - t0)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
  }

  return function stop() {
    stopped = true
    cancelAnimationFrame(raf)
    svg.remove()
  }
}

const api = { steps, rueda }
export default api
