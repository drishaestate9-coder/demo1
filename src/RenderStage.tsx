import { DreamScene } from './scene/DreamScene'
import { siteConfig } from './config/site.config'

/**
 * Scene-only view used by `scripts/render-assets.mjs` to render posters and
 * thumbnails: `/?render&p=0`, `/?render&shot=thumb-crystal`.
 */
export default function RenderStage() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <DreamScene seed={siteConfig.scene.seed} colors={siteConfig.scene.colors} motion={siteConfig.motion} active />
    </div>
  )
}
