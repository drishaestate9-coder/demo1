#!/usr/bin/env node
/**
 * End-to-end verification of the Dreamcore landing page.
 *
 *   npm run verify
 *
 * Starts the Vite dev server, drives headless Chromium and checks:
 *  - hero, 25 / 50 / 75 / 100 % of the portal transition (screenshots)
 *  - reverse scrolling restores the hero (pixel difference vs. first frame)
 *  - release of the pinned scene into the following content
 *  - navigation links, emblem, DESCEND button, reel dialog (open / Esc)
 *  - mobile layout: no horizontal overflow, essential content in view,
 *    menu sheet navigation
 *  - reduced-motion transition and the no-WebGL poster fallback
 *  - console errors and failed requests
 *
 * Screenshots are written to docs/screenshots/ (WebP) and a JSON report to
 * docs/screenshots/report.json. Set VERIFY_URL to test an existing server.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'docs/screenshots')
await mkdir(outDir, { recursive: true })

let server = null
let base = process.env.VERIFY_URL
if (!base) {
  server = await createServer({ root, logLevel: 'error', server: { port: 5198, strictPort: false } })
  await server.listen()
  base = server.resolvedUrls.local[0]
}
const url = (q = '') => `${base}?verify${q ? '&' + q : ''}`

const args = process.env.RENDER_GPU ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
const browser = await chromium.launch({ args })

const results = []
const issues = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  - ' + detail : ''}`)
}

async function shot(page, name) {
  const png = await page.screenshot({ type: 'png' })
  await sharp(png).webp({ quality: 80 }).toFile(path.join(outDir, `${name}.webp`))
  return png
}

async function newPage(opts = {}, label = 'page') {
  const context = await browser.newContext(opts)
  const page = await context.newPage()
  page.on('console', (m) => {
    const t = m.text()
    if (m.type() === 'error') issues.push(`[${label}] console error: ${t}`)
    else if (m.type() === 'warning' && !/THREE\.Clock|GPU stall|ReadPixels|Automatic fallback to software WebGL/i.test(t))
      issues.push(`[${label}] console warning: ${t}`)
  })
  page.on('pageerror', (e) => issues.push(`[${label}] page error: ${e.message}`))
  page.on('response', (r) => {
    if (r.status() >= 400) issues.push(`[${label}] HTTP ${r.status()} ${r.url()}`)
  })
  return { context, page }
}

async function waitReady(page, webgl = true) {
  for (let i = 0; i < 4; i++) {
    try {
      if (webgl) await page.waitForFunction(() => window.__dreamReady === true, null, { timeout: 180000 })
      await page.waitForFunction(() => typeof window.__portalRange === 'function' && window.__portalRange(), null, { timeout: 30000 })
      return
    } catch {
      await page.waitForTimeout(1500) // dev server may reload once while optimising deps
    }
  }
  throw new Error('scene never became ready')
}

const range = (page) => page.evaluate(() => window.__portalRange())

async function scrollToFraction(page, f, { webgl = true } = {}) {
  const r = await range(page)
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(r.start + (r.end - r.start) * f))
  if (webgl) {
    await page
      .waitForFunction((t) => Math.abs(window.__journey.progress - t) < 0.004, f, { timeout: 60000, polling: 100 })
      .catch(() => {})
  }
  await page.waitForTimeout(900)
}

async function diffImages(a, b) {
  const size = { width: 192, height: 120 }
  const [x, y] = await Promise.all([a, b].map((img) => sharp(img).resize(size.width, size.height).removeAlpha().raw().toBuffer()))
  let sum = 0
  for (let i = 0; i < x.length; i++) sum += Math.abs(x[i] - y[i])
  return sum / x.length / 255
}

const opacity = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return -1
    const cs = getComputedStyle(el)
    return cs.visibility === 'hidden' ? 0 : Number(cs.opacity)
  }, sel)

try {
  // ── Desktop journey ──────────────────────────────────────────────────────
  {
    const { context, page } = await newPage({ viewport: { width: 1440, height: 900 } }, 'desktop')
    await page.goto(url(), { waitUntil: 'load' })
    await waitReady(page)
    await page.waitForTimeout(3200) // entrance settles
    const first = await shot(page, 'desktop-000-hero')
    check('hero headline visible', (await opacity(page, '.hero-copy')) > 0.95)
    check('preview cards visible', (await opacity(page, '.preview-cards')) > 0.95)
    check('destination hidden at start', (await opacity(page, '.destination__head')) === 0)

    for (const f of [0.25, 0.5, 0.75, 1]) {
      await scrollToFraction(page, f)
      const p = await page.evaluate(() => window.__journey.progress)
      await shot(page, `desktop-${String(Math.round(f * 100)).padStart(3, '0')}`)
      check(`journey progress at ${f * 100}%`, Math.abs(p - f) < 0.01, `progress=${p.toFixed(3)}`)
    }
    check('hero faded after scroll', (await opacity(page, '.hero-copy')) < 0.05)
    check('destination heading revealed', (await opacity(page, '.destination__head')) > 0.95)
    const cardsVisible = await page.evaluate(() =>
      [...document.querySelectorAll('.world-card')].every((c) => getComputedStyle(c).opacity === '1'),
    )
    check('destination cards revealed', cardsVisible)

    // Release into the following content
    const r = await range(page)
    await page.evaluate((y) => window.scrollTo(0, y), r.end + 450)
    await page.waitForTimeout(1500)
    await shot(page, 'desktop-release')
    const released = await page.evaluate(() => document.querySelector('#after-portal').getBoundingClientRect().top)
    check('pinned scene releases into content', released < 900 && released > 0, `#after-portal top=${Math.round(released)}px`)

    // Reverse all the way back
    await scrollToFraction(page, 0.5)
    await scrollToFraction(page, 0)
    await page.waitForTimeout(1500)
    const back = await shot(page, 'desktop-reverse-000')
    const d = await diffImages(first, back)
    check('reverse scroll restores hero', d < 0.06 && (await opacity(page, '.hero-copy')) > 0.95, `mean pixel diff=${(d * 100).toFixed(2)}%`)
    check('destination hidden again after reverse', (await opacity(page, '.destination__head')) === 0)

    // Navigation
    for (const [label, sel] of [
      ['Atelier', '#atelier'],
      ['Codex', '#codex'],
      ['Connect', '#connect'],
    ]) {
      await page.click(`.nav__group a:text-is("${label}")`)
      await page.waitForTimeout(3600)
      const top = await page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top, sel)
      const atBottom = await page.evaluate(() => Math.abs(window.innerHeight + window.scrollY - document.documentElement.scrollHeight) < 4)
      check(`nav "${label}" scrolls to ${sel}`, Math.abs(top) < 12 || atBottom, `top=${Math.round(top)}px`)
    }
    const light = await page
      .waitForFunction(() => document.querySelector('.nav').classList.contains('nav--light'), null, { timeout: 10000 })
      .then(() => true)
      .catch(() => false)
    check('nav switches to light tone over content', light)
    await shot(page, 'desktop-connect')
    await page.click('.nav__group a:text-is("Worlds")')
    await page.waitForTimeout(3600)
    await page.waitForFunction(() => window.__journey.progress > 0.99, null, { timeout: 30000 }).catch(() => {})
    check('nav "Worlds" lands on destination', (await page.evaluate(() => window.__journey.progress)) > 0.99)
    await page.click('.nav__emblem')
    await page.waitForTimeout(3600)
    check('emblem returns to top', (await page.evaluate(() => window.scrollY)) < 4)

    // DESCEND
    await page.waitForTimeout(800)
    await page.click('.descend__inner')
    const endReached = await page
      .waitForFunction(() => Math.abs(window.scrollY - window.__portalRange().end) < 4, null, { timeout: 30000, polling: 250 })
      .then(() => true)
      .catch(() => false)
    check('DESCEND scrolls through the portal', endReached)

    // Reel dialog
    await scrollToFraction(page, 0)
    await page.waitForTimeout(800)
    await page.click('.preview-card--reel .preview-card__hit >> nth=0')
    await page.waitForTimeout(900)
    const open = await page.evaluate(() => document.querySelector('dialog.reel').open)
    await shot(page, 'desktop-reel-dialog')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    const closed = await page.evaluate(() => !document.querySelector('dialog.reel').open)
    check('View Reel opens dialog, Esc closes it', open && closed)
    const stat = await page.getAttribute('.preview-card--stat a', 'href')
    check('World Patrons card links in-page', stat?.startsWith('#') ?? false, stat ?? '')

    await context.close()
  }

  // ── Mobile ───────────────────────────────────────────────────────────────
  {
    const { context, page } = await newPage(
      { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      'mobile',
    )
    await page.goto(url(), { waitUntil: 'load' })
    await waitReady(page)
    await page.waitForTimeout(3200)
    const inView = (sels) =>
      page.evaluate((list) => {
        const w = window.innerWidth
        const h = window.innerHeight
        return list.map((s) => {
          const els = [...document.querySelectorAll(s)]
          return els.every((el) => {
            const b = el.getBoundingClientRect()
            return b.left >= -1 && b.right <= w + 1 && b.top >= -1 && b.bottom <= h + 1
          })
            ? null
            : s
        })
      }, sels)
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    await shot(page, 'mobile-000-hero')
    let bad = (await inView(['.hero-title', '.hero-copy__text', '.preview-card', '.descend__inner', '.nav__emblem'])).filter(Boolean)
    check('mobile hero content fully in view', bad.length === 0, bad.join(', '))
    check('mobile no horizontal overflow (hero)', (await overflow()) <= 0)
    await scrollToFraction(page, 0.5)
    await shot(page, 'mobile-050')
    await scrollToFraction(page, 1)
    await shot(page, 'mobile-100')
    bad = (await inView(['.destination__title', '.world-card__inner'])).filter(Boolean)
    check('mobile destination content fully in view', bad.length === 0, bad.join(', '))
    check('mobile no horizontal overflow (destination)', (await overflow()) <= 0)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(1500)
    check('mobile no horizontal overflow (footer)', (await overflow()) <= 0)
    await shot(page, 'mobile-footer')
    await page.click('.nav__menu-btn')
    await page.waitForTimeout(400)
    await shot(page, 'mobile-menu')
    await page.click('#nav-sheet a:text-is("Atelier")')
    await page.waitForTimeout(3600)
    const top = await page.evaluate(() => document.querySelector('#atelier').getBoundingClientRect().top)
    const sheetHidden = await page.evaluate(() => document.querySelector('#nav-sheet').hidden)
    check('mobile menu navigates and closes', Math.abs(top) < 12 && sheetHidden, `top=${Math.round(top)}px`)
    await context.close()
  }

  // ── Reduced motion ──────────────────────────────────────────────────────
  {
    const { context, page } = await newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }, 'reduced')
    await page.goto(url(), { waitUntil: 'load' })
    await waitReady(page)
    await page.waitForTimeout(1500)
    check('reduced motion: hero shown without entrance', (await opacity(page, '.hero-copy')) > 0.95)
    await shot(page, 'reduced-000')
    await scrollToFraction(page, 0.5)
    check('reduced motion: veil covers the cut', (await opacity(page, '.portal__veil')) > 0.9)
    await shot(page, 'reduced-050')
    await scrollToFraction(page, 1)
    check('reduced motion: destination revealed', (await opacity(page, '.destination__head')) > 0.95)
    await shot(page, 'reduced-100')
    await context.close()
  }

  // ── No-WebGL poster fallback ────────────────────────────────────────────
  {
    const { context, page } = await newPage({ viewport: { width: 1440, height: 900 } }, 'nowebgl')
    await page.goto(url('nowebgl'), { waitUntil: 'load' })
    await waitReady(page, false)
    await page.waitForTimeout(2500)
    const posterOk = await page.evaluate(() => {
      const img = document.querySelector('.poster--hero')
      return img && img.complete && img.naturalWidth > 0
    })
    check('fallback: hero poster loads', posterOk)
    await shot(page, 'fallback-000')
    await scrollToFraction(page, 1, { webgl: false })
    await page.waitForTimeout(1500)
    check('fallback: destination poster shown', (await opacity(page, '.poster--dest')) > 0.95)
    await shot(page, 'fallback-100')
    await context.close()
  }
} catch (e) {
  check('verification run', false, e.message)
} finally {
  await browser.close()
  if (server) await server.close()
}

check('no console errors / failed requests', issues.length === 0, issues.slice(0, 8).join(' | '))
const failed = results.filter((r) => !r.ok)
await writeFile(path.join(outDir, 'report.json'), JSON.stringify({ date: new Date().toISOString(), results, issues }, null, 2))
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
