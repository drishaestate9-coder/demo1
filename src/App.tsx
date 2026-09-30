import { useEffect, useState } from 'react'
import { Navigation } from './components/Navigation'
import { PortalTransition } from './components/PortalTransition'
import { ReelDialog, type ReelState } from './components/ReelDialog'
import { FollowingSections } from './components/sections/FollowingSections'
import { siteConfig } from './config/site.config'
import { ScrollTrigger } from './lib/gsap'

export default function App() {
  const config = siteConfig
  const [reel, setReel] = useState<ReelState | null>(null)

  useEffect(() => {
    document.title = config.meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', config.meta.description)
    // Fonts change text metrics; re-measure pinned ranges once they load.
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
  }, [config])

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navigation brand={config.brand} left={config.nav.left} right={config.nav.right} />
      <main id="main" tabIndex={-1}>
        <PortalTransition config={config} onOpenReel={setReel} />
        <FollowingSections config={config} onOpenReel={setReel} />
      </main>
      <ReelDialog reel={reel} onClose={() => setReel(null)} />
    </>
  )
}
