import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { gsap } from './lib/gsap'
import { journey } from './lib/journey'
import './styles/global.css'

const params = new URLSearchParams(window.location.search)
const renderMode = params.has('render')

if (renderMode) {
  journey.progress = Number(params.get('p') ?? 0)
  journey.shot = params.get('shot')
  journey.intro = 1
  journey.reducedMotion = params.has('still')
}

// `?verify`: used by scripts/verify.mjs - software-rendered headless frames
// are slow, so disable GSAP lag smoothing to keep scrub timing honest.
if (params.has('verify')) {
  gsap.ticker.lagSmoothing(0)
  ;(window as unknown as { __journey: typeof journey }).__journey = journey
}

const RenderStage = lazy(() => import('./RenderStage'))

if ('scrollRestoration' in history && !renderMode) history.scrollRestoration = 'manual'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {renderMode ? (
      <Suspense fallback={null}>
        <RenderStage />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
