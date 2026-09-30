# Dreamcore Landing: *Fall Into Reverie*

This is an immersive fantasy landing page with a scrollytelling portal. It opens in a dark crystal cave. As you scroll, the camera flies through the cave opening and arrives in a lavender cloud world with a distant pale citadel. There, the heading and the pastel "world" cards settle in.

Built with **React 19 + TypeScript**, **GSAP ScrollTrigger** (pinned, scrubbed and reversible timeline) and **React Three Fiber / three.js** (a procedural 3D scene with bloom).

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # static site in dist/ (relative base, deploy anywhere)
npm run preview      # serve the production build
npm run verify       # headless end-to-end checks + screenshots (docs/screenshots)
npm run render:assets  # re-render thumbnails & posters from the 3D scene
```

---

## Reference access and substitutes

The two reference URLs (`motionsites.ai/?prompt=dreamcore-landing` and the
animated WebP on `pub-…r2.dev`) were **blocked by the build environment's network policy**. Image CDNs were blocked as well. So the recording could not be inspected frame by frame, and none of its source artwork could be downloaded.

The implementation follows the written specification exactly: layout, typography, card structure, colours and the scroll choreography. Everything that depends on seeing the recording is listed below so you can replace it quickly.

| Item | Status |
| --- | --- |
| Cave, crystals, moss, vines, path, opening, clouds, citadel | **Substitute.** Procedural 3D scene (`src/scene`). No source artwork was available. |
| Preview-card thumbnails | **Substitute.** Rendered from the same scene (`public/assets/thumbs`). |
| Hero / destination posters (loading + no-WebGL fallback) | **Substitute.** Rendered from the scene (`public/assets/posters`). |
| Reels behind "View Reel" | **Missing.** No video available. The dialog shows the still until you set `videoSrc`. |
| Headline, nav labels, "32 World Patrons", "Descend", card titles *Mystic Crests / Deep Currents / Gilded Dusk* | Taken from the brief. |
| Hero paragraph, destination heading and intro, card descriptions, blush card title (*Rosewater Vale*), following sections | **Placeholder copy**, marked `PLACEHOLDER` in the config. |
| Fonts | Cormorant Garamond (thin high-contrast serif) and Inter, self-hosted via `@fontsource`. These are the closest free matches to the brief; the exact reference fonts could not be identified. |

With network access to the reference, the fastest route to an exact match is:
drop real artwork into `public/assets`, point `scene.assets` / `previewCards[].image` at it, and adjust `destination.cards` (text, colours, rotations, offsets) and `motion.stages` against the recording.

---

## Project structure

```
src/
  config/
    site.config.ts        ← ALL copy, links, colours, assets, motion (edit this)
    types.ts              ← typed shape of the config
  components/
    Navigation.tsx        ← transparent nav: 3 links · star emblem · 3 links (menu sheet on mobile)
    PortalTransition.tsx  ← pinned section + the GSAP scroll timeline (the choreography)
    HeroContent.tsx       ← "FALL INTO / REVERIE" + paragraph
    PreviewCards.tsx      ← three translucent lavender cards (reel / 32 patrons / reel)
    DescendCue.tsx        ← "DESCEND" + circular arrow (auto-plays the journey)
    DestinationCards.tsx  ← arrival heading + rotated pastel cards with number badges
    ReelDialog.tsx        ← accessible <dialog> for reels (video or still)
    sections/FollowingSections.tsx ← Atelier · Immersions · Craft · Codex · Connect
  scene/                  ← the cave scene (React Three Fiber)
    DreamScene.tsx        ← canvas, lights, fog, post-processing (bloom, ACES, vignette, grain)
    CameraRig.tsx         ← scroll progress → camera spline, FOV warp, parallax, render shots
    Cave.tsx              ← rock shell, boulders, crystals, tufts, buds, vines, lights
    Clouds.tsx            ← sorted billboard cumulus + animated cloud floor
    Sky.tsx               ← periwinkle → lavender → blush gradient with low sun
    Architecture.tsx      ← distant citadel, floating gateway, broken colonnade
    Atmosphere.tsx        ← drifting motes, light shafts, portal haze
    lib/caveWorld.ts      ← procedural generation + baked crystal/portal glow
    lib/layout.ts         ← cave profile, throat position, sun direction
  lib/journey.ts          ← shared progress state (GSAP writes, 3D reads)
  lib/scroll.ts           ← anchor scrolling (#worlds = end of the journey)
scripts/
  verify.mjs              ← automated verification (see below)
  render-assets.mjs       ← renders thumbnails/posters from the scene
public/assets/            ← posters + thumbnails (replace with your own freely)
docs/screenshots/         ← latest verification screenshots + report.json
```

---

## Customisation

Everything lives in **`src/config/site.config.ts`**.

- **Brand and logo**: `brand.name`, `brand.logoPath` (SVG path, 24×24 viewBox), or `brand.logoImage` (a file in `public/`), and `brand.logoHref`.
- **Navigation**: `nav.left` / `nav.right` with `{ label, href }`. `#worlds` scrolls to the end of the portal journey. Other `#ids` scroll smoothly. Absolute URLs open normally.
- **Hero**: `hero.lineOne`, `hero.lineTwo`, `hero.italicWords` (words set in italic), `hero.description` and `hero.descendLabel`.
- **Thumbnails / preview cards**: `previewCards[]`. `kind: 'reel'` gives image, label and `reel.videoSrc` (mp4/webm). `kind: 'stat'` gives image, value, label and link.
- **Destination**: `destination.eyebrow`, the title lines, `italicWords` and the description. Each entry in `cards[]` has `number`, `title`, `description`, `color` (surface), `ink` (badge/text), `rotate` (degrees), `offsetY` (% stagger) and `href`.
- **Following sections**: `sections.atelier | immersions (tiles) | craft | codex | connect` (CTA, socials, legal).
- **Scene colours**: `scene.colors` covers the sky gradient, fog, rock and moss, the crystal palette, portal light, cloud light/shadow and architecture. Change `scene.seed` to generate a different cave, crystal and cloud layout.
- **Scene assets**: `scene.assets.heroPoster` / `destinationPoster`.
- **Scroll timing and motion intensity** (`motion`):
  - `scrollLength` is the pinned length in viewport heights. Larger values make a slower journey.
  - `scrub` is the scrub smoothing in seconds.
  - `stages.heroFadeEnd`, `throatAt`, `destinationRevealStart` and `destinationRevealEnd` are fractions of the journey.
  - `pointerParallax`, `idleSway`, `warpFov` (extra FOV through the opening) and `bloom` set motion and glow intensity.
  - `entranceDuration` and `descendDuration` set the two automatic animations.

To make deeper scene changes:
- `src/scene/lib/layout.ts` controls the cave's cross-section, which shapes the opening's size and silhouette.
- `PATH` / `LOOK` in `CameraRig.tsx` set the camera route and framing.
- `lib/cloudLayout.ts` controls the cloud masses.
- `Architecture.tsx` controls the citadel.

After changing the scene, run `npm run render:assets` so the posters and thumbnails match.

### Replacing the procedural scene with painted artwork
Keep `PortalTransition` and swap `<DreamScene>` for layered `<img>`s (cave, crystals, clouds). Drive their `scale` / `translate` from the same timeline: `tl.to('.layer-cave', { scale: 4 }, 0)` and so on. The foreground layers should scale fastest and the sky slowest. `journey.progress` is also available for custom renderers.

---

## Scroll choreography (`PortalTransition.tsx`)

The whole section is pinned for `scrollLength × 100vh`. A single timeline running from 0 to 1 is scrubbed by scroll, so scrolling up reverses everything exactly.

| Progress | What happens |
| --- | --- |
| 0 | Complete hero composition. A 1.4 s entrance settles the text, cards and camera. |
| 0 – 0.14 | Headline, paragraph, cards, DESCEND cue and the legibility scrim fade and blur away. The camera starts a gentle push toward the opening. |
| 0.3 – 0.62 | The camera accelerates along the path. Foreground rocks and crystals rush to the edges while the sky barely moves (true 3D parallax). The FOV widens while crossing the throat (~0.62). |
| 0.62 – 0.8 | Out through the opening and the veil of wisps, into the cloud world. It is the same sky, so there is no background swap. |
| 0.8 – 0.95 | Arrival above the cloud sea, facing the citadel. The heading and the four pastel cards rise into place. |
| 0.95 – 1 | A soft gradient hands the scene over to the following content, and the pin releases. |

**Reduced motion** (`prefers-reduced-motion: reduce`): no entrance, flight, parallax, sway or drift. The scroll crossfades the hero into the destination through a lavender veil, and the pin is shorter.
**No WebGL**: the hero poster pushes in and dissolves into the destination poster.

---

## Verification

`npm run verify` runs 34 checks in headless Chromium and writes WebP screenshots to `docs/screenshots/`:

- the hero, and 25 / 50 / 75 / 100 % of the transition (`desktop-000 … desktop-100`)
- reverse scrolling restores the hero (pixel difference against the first frame)
- the pinned scene releases into the following content
- nav links, the emblem, DESCEND, View Reel (dialog opens and closes on Esc), and the patrons link
- mobile (390×844): no horizontal overflow, essential content inside the viewport, and menu navigation
- the reduced-motion transition and the no-WebGL poster fallback
- no console errors and no failed asset requests

The results are in `docs/screenshots/report.json`.
Headless runs use software WebGL (SwiftShader), so they are slow but deterministic. Set `RENDER_GPU=1` to use a real GPU.

## Performance notes
- three.js is code-split and lazy-loaded. The hero poster paints first and cross-fades to the live scene once it has rendered.
- Rendering pauses when the portal is off-screen or the tab is hidden. The DPR is capped at 1.5 and lowered automatically when frame rate drops.
- Crystal and portal light is baked into vertex attributes, so only six real lights are used.
