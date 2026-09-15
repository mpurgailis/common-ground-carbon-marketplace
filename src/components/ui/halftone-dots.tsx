'use client'

import { useEffect, useRef, type CSSProperties } from 'react'

import { cn } from '@/lib/utils'

type Field = {
  r: Float32Array
  rgb: Float32Array
  alpha: Float32Array
}

const hexRgb = (hex: string): [number, number, number] => {
  const n = hex.replace('#', '')
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const MORPH = 200
const MORPH_STAGGER = 220

const MORPH_DIP = 0.5

const CELL = 6

const SUP = 4

const SPILL = 72

const DOT_FLOOR = 0.22
const DOT_COVERAGE = 0.18
const DOT_TONE = 0.52

const TONE_CONTRAST = 1.6

const COLOR_CONTRAST = 1.25

const PAPER_R = 0.3
const PAPER_ALPHA = 0.28

const MARK_INSET = 24

const MARK_CLEAR = CELL * 2 + 6

const MARK_R = 0.7

const LENS_RADIUS = 64
const LENS_BOOST = 0.55
const LENS_FOLLOW = 55
const LENS_FADE_IN = 140
const LENS_FADE_OUT = 220

const LENS_WOBBLE = 0.22
const LENS_DRIFT = 0.0011

const LENS_ATTACK = 60
const LENS_RELEASE = 420

export function HalftoneDots({
  src,
  gradient,
  accent = '#2563eb',
  className,
  style,
}: {

  src: string

  gradient?: [string, string]

  accent?: string
  className?: string
  style?: CSSProperties
}) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)

  const lattice = useRef<{
    cols: number
    rows: number
    x: Float32Array
    y: Float32Array
    w: Float32Array
    maxR: number
    width: number
    height: number
    now: Field
    from: Field
    to: Field
    started: number
    settled: boolean
  } | null>(null)

  const lens = useRef({ x: 0, y: 0, tx: 0, ty: 0, strength: 0, target: 0 })

  const swells = useRef(new Float32Array(0))

  const gradientKey = gradient ? gradient.join('|') : ''

  useEffect(() => {
    const frame_ = box.current
    const surface = canvas.current
    if (!frame_ || !surface) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let gone = false
    let running = false
    let last = 0

    let image: HTMLImageElement | null = null
    let crop = { sx: 0, sy: 0, sw: 1, sh: 1 }

    const blank = (n: number): Field => ({
      r: new Float32Array(n),
      rgb: new Float32Array(n * 3),
      alpha: new Float32Array(n),
    })

    const paperRgb = (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = getComputedStyle(frame_).color
      return hexRgb(String(ctx.fillStyle).slice(0, 7))
    }

    const sample = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
      const boxW = frame_.clientWidth
      const boxH = frame_.clientHeight
      const width = boxW + SPILL * 2
      const height = boxH + SPILL * 2
      const cols = Math.max(1, Math.round(width / CELL))
      const rows = Math.max(1, Math.round(height / CELL))
      const cw = width / cols
      const ch = height / rows
      const maxR = Math.min(cw, ch) / 2
      const n = cols * rows

      const frameX = SPILL - MARK_INSET + MARK_CLEAR
      const frameY = SPILL - MARK_INSET + MARK_CLEAR
      const frameW = boxW + MARK_INSET * 2 - MARK_CLEAR * 2
      const frameH = boxH + MARK_INSET * 2 - MARK_CLEAR * 2
      const fadeX = SPILL - MARK_INSET
      const fadeY = SPILL - MARK_INSET
      const fadeW = boxW + MARK_INSET * 2
      const fadeH = boxH + MARK_INSET * 2
      const fadeReach = SPILL - MARK_INSET

      const bw = cols * SUP
      const bh = rows * SUP
      const sampler = document.createElement('canvas')
      sampler.width = bw
      sampler.height = bh
      const sctx = sampler.getContext('2d')
      if (!sctx) return null
      const px = bw / width
      const { sx, sy, sw, sh } = crop
      const fit = Math.min((frameW * px) / sw, (frameH * px) / sh)
      const dw = sw * fit
      const dh = sh * fit

      sctx.drawImage(
        img,
        sx,
        sy,
        sw,
        sh,
        (frameX + frameW / 2) * px - dw / 2,
        (frameY + frameH) * px - dh,
        dw,
        dh,
      )
      const { data } = sctx.getImageData(0, 0, bw, bh)

      const paper = paperRgb(ctx)
      const ink = hexRgb(accent)
      const top = gradient ? hexRgb(gradient[0]) : null
      const bottom = gradient ? hexRgb(gradient[1]) : null
      const rowTop = frameY / ch
      const rowSpan = frameH / ch

      const x = new Float32Array(n)
      const y = new Float32Array(n)
      const w = new Float32Array(n)
      const field = blank(n)

      const coverage = new Float32Array(n)
      const lum = new Float32Array(n)
      let darkest = 1
      let lightest = 0
      const cx = width / 2
      const cy = height / 2
      const reachOut = Math.hypot(frameW / 2, frameH / 2) || 1

      for (let yy = 0; yy < rows; yy += 1) {
        for (let xx = 0; xx < cols; xx += 1) {
          const i = yy * cols + xx
          x[i] = (xx + 0.5) * cw
          y[i] = (yy + 0.5) * ch
          w[i] = Math.min(1, Math.hypot(x[i]! - cx, y[i]! - cy) / reachOut)
          let cr = 0
          let cg = 0
          let cb = 0
          let ink = 0
          for (let sy2 = 0; sy2 < SUP; sy2 += 1) {
            for (let sx2 = 0; sx2 < SUP; sx2 += 1) {
              const k = ((yy * SUP + sy2) * bw + (xx * SUP + sx2)) * 4
              if (data[k + 3]! < 24) continue
              const r0 = data[k]!
              const g0 = data[k + 1]!
              const b0 = data[k + 2]!

              if ((0.299 * r0 + 0.587 * g0 + 0.114 * b0) / 255 > 0.92) continue
              cr += r0
              cg += g0
              cb += b0
              ink += 1
            }
          }
          if (ink === 0) {

            const dx = Math.max(fadeX - x[i]!, 0, x[i]! - (fadeX + fadeW))
            const dy = Math.max(fadeY - y[i]!, 0, y[i]! - (fadeY + fadeH))
            const out = Math.hypot(dx, dy) / fadeReach
            const fade = out >= 1 ? 0 : (1 - out) * (1 - out)
            field.r[i] = fade > 0 ? maxR * PAPER_R : 0
            field.alpha[i] = PAPER_ALPHA * fade
            field.rgb[i * 3] = paper[0]
            field.rgb[i * 3 + 1] = paper[1]
            field.rgb[i * 3 + 2] = paper[2]
            continue
          }
          coverage[i] = ink / (SUP * SUP)
          lum[i] = (0.299 * cr + 0.587 * cg + 0.114 * cb) / ink / 255
          if (lum[i]! < darkest) darkest = lum[i]!
          if (lum[i]! > lightest) lightest = lum[i]!
          field.alpha[i] = 1
          if (top && bottom) {
            const t = Math.min(1, Math.max(0, (yy - rowTop) / (rowSpan || 1)))
            field.rgb[i * 3] = top[0] + (bottom[0] - top[0]) * t
            field.rgb[i * 3 + 1] = top[1] + (bottom[1] - top[1]) * t
            field.rgb[i * 3 + 2] = top[2] + (bottom[2] - top[2]) * t
          } else {
            field.rgb[i * 3] = cr / ink
            field.rgb[i * 3 + 1] = cg / ink
            field.rgb[i * 3 + 2] = cb / ink
          }
        }
      }

      const range = lightest - darkest || 1
      let inked = 0
      const mean = [0, 0, 0]
      for (let i = 0; i < n; i += 1) {
        if (field.alpha[i] !== 1) continue
        inked += 1
        mean[0]! += field.rgb[i * 3]!
        mean[1]! += field.rgb[i * 3 + 1]!
        mean[2]! += field.rgb[i * 3 + 2]!
      }
      for (let k = 0; k < 3; k += 1) mean[k]! /= inked || 1
      const spread = (t: number) => {
        const c = t - 0.5
        return Math.min(
          1,
          Math.max(0, 0.5 + Math.sign(c) * Math.pow(Math.abs(c) * 2, 1 / TONE_CONTRAST) * 0.5),
        )
      }
      for (let i = 0; i < n; i += 1) {
        if (field.alpha[i] !== 1) continue
        const tone = spread((lightest - lum[i]!) / range)
        field.r[i] =
          maxR * Math.min(0.92, DOT_FLOOR + coverage[i]! * DOT_COVERAGE + tone * DOT_TONE)
        if (!top || !bottom) {
          for (let k = 0; k < 3; k += 1) {
            const v = mean[k]! + (field.rgb[i * 3 + k]! - mean[k]!) * COLOR_CONTRAST
            field.rgb[i * 3 + k] = Math.min(255, Math.max(0, v))
          }
        }
      }

      const setMark = (col: number, row: number) => {
        if (col < 0 || row < 0 || col >= cols || row >= rows) return
        const i = row * cols + col
        field.r[i] = maxR * MARK_R
        field.alpha[i] = 1
        field.rgb[i * 3] = ink[0]
        field.rgb[i * 3 + 1] = ink[1]
        field.rgb[i * 3 + 2] = ink[2]
      }
      const colA = Math.round(fadeX / cw)
      const colB = Math.round((fadeX + fadeW) / cw) - 1
      const rowA = Math.round(fadeY / ch)
      const rowB = Math.round((fadeY + fadeH) / ch) - 1
      for (const [col, row, dc, dr] of [
        [colA, rowA, 1, 1],
        [colB, rowA, -1, 1],
        [colA, rowB, 1, -1],
        [colB, rowB, -1, -1],
      ] as const) {
        setMark(col + dc, row)
        setMark(col, row + dr)
        setMark(col + dc, row + dr)
      }

      return { cols, rows, x, y, w, maxR, width, height, field }
    }

    const render = (animate: boolean) => {
      const ctx = surface.getContext('2d')
      if (!image || !ctx || gone) return
      const laid = sample(ctx, image)
      if (!laid) return
      const { cols, rows, x, y, w, maxR, width, height, field } = laid
      const n = cols * rows

      const ss = Math.min(3, (window.devicePixelRatio || 1) * 1.5)
      surface.width = Math.round(width * ss)
      surface.height = Math.round(height * ss)
      ctx.setTransform(ss, 0, 0, ss, 0, 0)

      const previous = lattice.current
      const sameGrid = previous !== null && previous.cols === cols && previous.rows === rows
      const morph = animate && !still && sameGrid

      const from = blank(n)
      if (sameGrid && previous) {
        from.r.set(previous.now.r)
        from.rgb.set(previous.now.rgb)
        from.alpha.set(previous.now.alpha)
      } else {
        from.r.set(field.r)
        from.rgb.set(field.rgb)
        from.alpha.set(field.alpha)
      }
      const now = blank(n)
      now.r.set(from.r)
      now.rgb.set(from.rgb)
      now.alpha.set(from.alpha)

      lattice.current = {
        cols,
        rows,
        x,
        y,
        w,
        maxR,
        width,
        height,
        now,
        from,
        to: field,
        started: performance.now(),
        settled: !morph,
      }
      if (!sameGrid) swells.current = new Float32Array(n)
      ensureLoop()
    }

    const reach = (angle: number, now: number) =>
      LENS_RADIUS *
      (1 +
        LENS_WOBBLE *
          (0.5 * Math.sin(3 * angle + now * LENS_DRIFT) +
            0.32 * Math.sin(5 * angle - now * LENS_DRIFT * 1.7) +
            0.18 * Math.sin(2 * angle + now * LENS_DRIFT * 0.6)))
    const ask = (x: number, y: number, now: number) => {
      const l = lens.current
      if (l.strength <= 0.001) return 0
      const dx = x - l.x
      const dy = y - l.y
      const dist = Math.hypot(dx, dy)
      if (dist >= LENS_RADIUS * (1 + LENS_WOBBLE)) return 0
      const d = dist / reach(Math.atan2(dy, dx), now)
      if (d >= 1) return 0
      const falloff = (1 - d * d) * (1 - d * d)
      return l.strength * falloff
    }

    const frame = (now: number) => {
      const ctx = surface.getContext('2d')
      const lat = lattice.current
      if (!ctx || !lat || gone) return
      const dt = last ? Math.min(64, now - last) : 16
      last = now

      const l = lens.current
      const follow = 1 - Math.exp(-dt / LENS_FOLLOW)
      l.x += (l.tx - l.x) * follow
      l.y += (l.ty - l.y) * follow
      const fade = 1 - Math.exp(-dt / (l.target > l.strength ? LENS_FADE_IN : LENS_FADE_OUT))
      l.strength += (l.target - l.strength) * fade
      if (Math.abs(l.target - l.strength) < 0.002) l.strength = l.target
      const up = 1 - Math.exp(-dt / LENS_ATTACK)
      const down = 1 - Math.exp(-dt / LENS_RELEASE)
      const held = swells.current
      let residue = 0

      const el = now - lat.started
      let settled = true
      const { x, y, w, maxR, now: cur, from, to } = lat
      ctx.clearRect(0, 0, lat.width, lat.height)
      for (let i = 0; i < x.length; i += 1) {
        if (!lat.settled) {
          const t = Math.min(1, Math.max(0, (el - w[i]! * MORPH_STAGGER) / MORPH))
          if (t < 1) settled = false
          const e = easeInOut(t)

          const dip = 1 - MORPH_DIP * Math.sin(Math.PI * t)
          cur.r[i] = (from.r[i]! + (to.r[i]! - from.r[i]!) * e) * dip
          cur.alpha[i] = from.alpha[i]! + (to.alpha[i]! - from.alpha[i]!) * e
          cur.rgb[i * 3] = from.rgb[i * 3]! + (to.rgb[i * 3]! - from.rgb[i * 3]!) * e
          cur.rgb[i * 3 + 1] =
            from.rgb[i * 3 + 1]! + (to.rgb[i * 3 + 1]! - from.rgb[i * 3 + 1]!) * e
          cur.rgb[i * 3 + 2] =
            from.rgb[i * 3 + 2]! + (to.rgb[i * 3 + 2]! - from.rgb[i * 3 + 2]!) * e
        }

        const want = ask(x[i]!, y[i]!, now)
        const have = held[i]!
        const next = have + (want - have) * (want > have ? up : down)
        held[i] = next < 0.002 && want === 0 ? 0 : next
        if (held[i]! > residue) residue = held[i]!
        const r = Math.min(maxR, cur.r[i]! * (1 + LENS_BOOST * held[i]!))
        const a = cur.alpha[i]!
        if (r <= 0.06 || a <= 0.004) continue
        ctx.globalAlpha = a
        ctx.fillStyle = `rgb(${String(Math.round(cur.rgb[i * 3]!))} ${String(Math.round(cur.rgb[i * 3 + 1]!))} ${String(Math.round(cur.rgb[i * 3 + 2]!))})`
        ctx.beginPath()
        ctx.arc(x[i]!, y[i]!, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (settled) lat.settled = true

      if (!lat.settled || l.strength > 0 || residue > 0) {
        raf.current = requestAnimationFrame(frame)
      } else {
        running = false
        last = 0
      }
    }

    const ensureLoop = () => {
      if (running) return
      running = true
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(frame)
    }

    const hoverable = window.matchMedia('(hover: hover) and (pointer: fine)').matches && !still
    const aim = (event: PointerEvent) => {
      const lat = lattice.current
      if (!lat) return
      const rect = surface.getBoundingClientRect()
      const l = lens.current
      const px = ((event.clientX - rect.left) / rect.width) * lat.width
      const py = ((event.clientY - rect.top) / rect.height) * lat.height
      if (l.target === 0) {

        l.x = px
        l.y = py
      }
      l.tx = px
      l.ty = py
      l.target = 1
      ensureLoop()
    }
    const leave = () => {
      lens.current.target = 0
      ensureLoop()
    }
    if (hoverable) {
      frame_.addEventListener('pointermove', aim)
      frame_.addEventListener('pointerleave', leave)
    }

    const measure = (img: HTMLImageElement) => {
      const scale = Math.min(1, 256 / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const probe = document.createElement('canvas')
      probe.width = w
      probe.height = h
      const pctx = probe.getContext('2d')
      if (!pctx) return { sx: 0, sy: 0, sw: img.width, sh: img.height }
      pctx.drawImage(img, 0, 0, w, h)
      const { data } = pctx.getImageData(0, 0, w, h)
      let left = w
      let right = -1
      let top = h
      let bottom = -1
      for (let yy = 0; yy < h; yy += 1) {
        for (let xx = 0; xx < w; xx += 1) {
          const i = (yy * w + xx) * 4
          if (data[i + 3]! < 24) continue
          if ((0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!) / 255 > 0.92)
            continue
          if (xx < left) left = xx
          if (xx > right) right = xx
          if (yy < top) top = yy
          if (yy > bottom) bottom = yy
        }
      }
      if (right < left) return { sx: 0, sy: 0, sw: img.width, sh: img.height }
      return {
        sx: left / scale,
        sy: top / scale,
        sw: (right - left + 1) / scale,
        sh: (bottom - top + 1) / scale,
      }
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (gone) return
      image = img
      crop = measure(img)
      render(true)
    }
    img.src = src

    const watcher = new ResizeObserver(() => render(false))
    watcher.observe(frame_)
    return () => {
      gone = true
      cancelAnimationFrame(raf.current)
      watcher.disconnect()
      frame_.removeEventListener('pointermove', aim)
      frame_.removeEventListener('pointerleave', leave)
    }

  }, [src, gradientKey, accent])

  return (
    <div ref={box} data-slot="halftone-dots" className={cn('relative', className)} style={style}>

      <canvas
        ref={canvas}
        aria-hidden
        className="pointer-events-none absolute block"
        style={{
          inset: -SPILL,
          width: `calc(100% + ${String(SPILL * 2)}px)`,
          height: `calc(100% + ${String(SPILL * 2)}px)`,
        }}
      />
    </div>
  )
}
