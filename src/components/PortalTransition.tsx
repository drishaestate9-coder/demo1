import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { SiteConfig } from '../config/types'
import { useWebGLSupport } from '../hooks/useWebGLSupport'
import { asset } from '../lib/assets'
import { gsap, useGSAP } from '../lib/gsap'
import { journey } from '../lib/journey'
import { scrollToHref, setPortalTrigger } from '../lib/scroll'
import { DescendCue } from './DescendCue'
import { DestinationCards } from './DestinationCards'
import { HeroContent } from './HeroContent'
import { PreviewCards, type OpenReel } from './PreviewCards'
import './PortalTransition.css'

// three.js is loaded on demand; the poster covers the first paint.
const DreamScene = lazy(() => import('../scene/DreamScene').then((m) => ({ default: m.DreamScene })))

interface PortalTransitionProps {
  config: SiteConfig
  onOpenReel: OpenReel
}

/**
 * The pinned, scroll-scrubbed portal scene. One GSAP timeline (0-1) drives
 * everything: `journey.progress` for the 3D camera, the hero fade-out, and
 * the destination reveal. Scrolling up reverses it exactly.
 */
export function PortalTransition({ config, onOpenReel }: PortalTransitionProps) {
  const { motion, scene } = config
  const sectionRef = useRef<HTMLElement>(null)
  const webgl = useWebGLSupport()
  const [sceneReady, setSceneReady] = useState(false)
  const [active, setActive] = useState(true)
  // Start the camera slightly back when the entrance will play.
  useState(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    journey.intro = reduce || window.scrollY > window.innerHeight * 0.2 ? 1 : 0
  })

  // ── Scroll timeline ───────────────────────────────────────────────────────
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(
        { reduce: '(prefers-reduced-motion: reduce)', full: '(prefers-reduced-motion: no-preference)' },
        (ctx) => {
          const reduce = Boolean(ctx.conditions?.reduce)
          journey.reducedMotion = reduce
          const S = motion.stages
          const length = reduce ? Math.min(2.5, motion.scrollLength) : motion.scrollLength

          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top top',
              end: () => `+=${Math.round(window.innerHeight * length)}`,
              pin: true,
              scrub: reduce ? true : motion.scrub,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                sectionRef.current?.style.setProperty('--scroll-progress', self.progress.toFixed(4))
              },
            },
          })
          setPortalTrigger(tl.scrollTrigger ?? null)

          // Camera journey spans the whole timeline.
          tl.to(journey, { progress: 1, duration: 1 }, 0)

          // Early: hero UI dissolves as we start moving.
          const fadeLen = Math.max(0.04, S.heroFadeEnd - 0.02)
          tl.to(
            '.hero-copy',
            reduce ? { autoAlpha: 0, duration: fadeLen } : { autoAlpha: 0, y: -60, filter: 'blur(10px)', duration: fadeLen },
            0.02,
          )
          tl.to('.preview-cards', { autoAlpha: 0, y: reduce ? 0 : 50, duration: fadeLen * 0.8 }, 0.01)
          tl.to('.descend', { autoAlpha: 0, duration: 0.04 }, 0)
          tl.to('.portal__scrim', { autoAlpha: 0, duration: S.heroFadeEnd }, 0.02)

          if (!webgl) {
            // Poster fallback: push into the hero still, then cross to the destination.
            tl.to('.poster--hero', { scale: reduce ? 1 : 1.6, duration: 0.5, ease: 'power1.in' }, 0)
            tl.to('.poster--dest', { autoAlpha: 1, duration: 0.2 }, 0.4)
          }
          if (reduce || !webgl) {
            // Simplified transition: a lavender veil covers the cut.
            tl.to('.portal__veil', { autoAlpha: 1, duration: 0.14 }, 0.36)
            tl.to('.portal__veil', { autoAlpha: 0, duration: 0.14 }, 0.5)
          }

          // Late: arrival - heading and cards settle in.
          const dStart = S.destinationRevealStart
          const dLen = Math.max(0.04, S.destinationRevealEnd - S.destinationRevealStart)
          tl.fromTo(
            '.destination__head',
            reduce ? { autoAlpha: 0 } : { autoAlpha: 0, y: 40, filter: 'blur(12px)' },
            reduce ? { autoAlpha: 1, duration: dLen * 0.6 } : { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: dLen * 0.6 },
            dStart,
          )
          gsap.utils.toArray<HTMLElement>('.world-card').forEach((el, i) => {
            const rot = Number(el.dataset.rotate ?? 0)
            tl.fromTo(
              el,
              { autoAlpha: 0, y: reduce ? 0 : 110, rotation: reduce ? rot : rot + (i % 2 ? -10 : 10) },
              { autoAlpha: 1, y: 0, rotation: rot, duration: dLen * 0.62, ease: 'power2.out' },
              dStart + dLen * 0.2 + i * dLen * 0.1,
            )
          })
          tl.to('.portal__blend', { autoAlpha: 1, duration: Math.max(0.02, 1 - S.destinationRevealEnd) }, S.destinationRevealEnd)

          return () => {
            setPortalTrigger(null)
          }
        },
      )
    },
    { scope: sectionRef, dependencies: [webgl] },
  )

  // ── Entrance: settles quickly into the complete hero composition ─────────
  useGSAP(
    () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce || window.scrollY > window.innerHeight * 0.2) return
      const d = motion.entranceDuration
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.from('.hero-title__inner', { yPercent: 105, duration: d, stagger: 0.1 }, 0.1)
      tl.from('.hero-copy__text', { autoAlpha: 0, y: 18, duration: d * 0.8, ease: 'power3.out' }, 0.35)
      tl.from('.preview-card', { autoAlpha: 0, y: 26, duration: d * 0.8, stagger: 0.07, ease: 'power3.out' }, 0.4)
      tl.from('.descend__inner', { autoAlpha: 0, y: 12, duration: d * 0.7, ease: 'power3.out' }, 0.6)
    },
    { scope: sectionRef },
  )

  // Camera settles once the scene has actually drawn.
  const onSceneReady = useCallback(() => {
    setSceneReady(true)
    if (journey.intro >= 1) return
    gsap.to(journey, { intro: 1, duration: motion.entranceDuration + 0.8, ease: 'power3.out' })
  }, [motion.entranceDuration])

  // ── Pointer parallax ────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      journey.pointerX = (e.clientX / window.innerWidth) * 2 - 1
      journey.pointerY = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // ── Pause rendering while the portal is off-screen ─────────────────────
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: '120px 0px' })
    io.observe(el)
    const onVis = () => setActive(!document.hidden && el.getBoundingClientRect().bottom > -120)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const descend = () => scrollToHref('#worlds', { duration: motion.descendDuration, ease: 'power1.inOut' })

  return (
    <section ref={sectionRef} id="top" className="portal" aria-label={`${config.hero.lineOne} ${config.hero.lineTwo}`}>
      <div className="portal__scene" aria-hidden="true">
        <div className={`portal__posters${webgl && sceneReady ? ' is-hidden' : ''}`}>
          <img
            className="poster poster--hero"
            src={asset(scene.assets.heroPoster)}
            alt=""
            fetchPriority="high"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <img
            className="poster poster--dest"
            src={asset(scene.assets.destinationPoster)}
            alt=""
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
        {webgl && (
          <Suspense fallback={null}>
            <DreamScene seed={scene.seed} colors={scene.colors} motion={motion} active={active} onReady={onSceneReady} />
          </Suspense>
        )}
      </div>

      <div className="portal__scrim portal__scrim--left" aria-hidden="true" />
      <div className="portal__scrim portal__scrim--bottom" aria-hidden="true" />
      <div className="portal__veil" aria-hidden="true" />

      <div className="portal__hero">
        <HeroContent hero={config.hero} />
        <PreviewCards cards={config.previewCards} onOpenReel={onOpenReel} />
        <DescendCue label={config.hero.descendLabel} onDescend={descend} />
      </div>

      <DestinationCards destination={config.destination} />
      <div className="portal__blend" aria-hidden="true" />
    </section>
  )
}
