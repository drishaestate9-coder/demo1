#!/usr/bin/env node
/**
 * Renders the preview-card thumbnails and the hero / destination posters
 * straight from the procedural 3D scene, so every image matches the world.
 *
 *   npm run render:assets              # all assets
 *   npm run render:assets -- thumb-portal hero   # only some
 *
 * Output (WebP): public/assets/thumbs/*.webp, public/assets/posters/*.webp
 * Uses the dev server + headless Chromium (SwiftShader). Set RENDER_GPU=1 to
 * use the machine's GPU instead.
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const JOBS = [
  { name: 'hero', query: 'render&p=0&still', size: [1920, 1080], out: 'posters/hero.webp', resize: null, quality: 78 },
  { name: 'destination', query: 'render&p=1&still', size: [1920, 1080], out: 'posters/destination.webp', resize: null, quality: 78 },
  { name: 'thumb-crystal', query: 'render&shot=thumb-crystal', size: [960, 660], out: 'thumbs/reel-crystal-hollow.webp', resize: [640, 440], quality: 82 },
  { name: 'thumb-portal', query: 'render&shot=thumb-portal', size: [960, 660], out: 'thumbs/portal-atrium.webp', resize: [640, 440], quality: 82 },
  { name: 'thumb-citadel', query: 'render&shot=thumb-citadel', size: [960, 660], out: 'thumbs/reel-cloud-citadel.webp', resize: [640, 440], quality: 82 },
]

const only = process.argv.slice(2)
const jobs = only.length ? JOBS.filter((j) => only.includes(j.name)) : JOBS

const server = await createServer({ root, logLevel: 'error', server: { port: 5199, strictPort: false } })
await server.listen()
const base = server.resolvedUrls.local[0]

const args = process.env.RENDER_GPU ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
const browser = await chromium.launch({ args })

try {
  for (const job of jobs) {
    const page = await browser.newPage({ viewport: { width: job.size[0], height: job.size[1] }, deviceScaleFactor: 1 })
    page.on('pageerror', (e) => console.error(`[${job.name}]`, e.message))
    await page.goto(`${base}?${job.query}`, { waitUntil: 'load' })
    await page.waitForFunction(() => window.__dreamReady === true, null, { timeout: 180000 })
    await page.waitForTimeout(1200)
    const png = await page.screenshot({ type: 'png' })
    const dest = path.join(root, 'public/assets', job.out)
    await mkdir(path.dirname(dest), { recursive: true })
    let img = sharp(png)
    if (job.resize) img = img.resize(job.resize[0], job.resize[1], { fit: 'cover' })
    await img.webp({ quality: job.quality, effort: 5 }).toFile(dest)
    console.log('rendered', path.relative(root, dest))
    await page.close()
  }
} finally {
  await browser.close()
  await server.close()
}
