import { useEffect, useRef } from 'react'
import { asset } from '../lib/assets'
import './ReelDialog.css'

export interface ReelState {
  title: string
  image: string
  imageAlt: string
  videoSrc?: string
}

/**
 * Accessible reel viewer built on <dialog>. Plays `videoSrc` when set in
 * the config; otherwise shows the still with a slow cinematic drift.
 */
export function ReelDialog({ reel, onClose }: { reel: ReelState | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (reel && !d.open) d.showModal()
    if (!reel && d.open) d.close()
  }, [reel])

  return (
    <dialog
      ref={ref}
      className="reel"
      aria-labelledby="reel-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {reel && (
        <div className="reel__panel">
          <div className="reel__media">
            {reel.videoSrc ? (
              <video src={asset(reel.videoSrc)} poster={asset(reel.image)} controls autoPlay playsInline />
            ) : (
              <img src={asset(reel.image)} alt={reel.imageAlt} />
            )}
          </div>
          <div className="reel__bar">
            <p className="eyebrow reel__eyebrow">Reel</p>
            <h2 className="reel__title" id="reel-title">
              {reel.title}
            </h2>
            <button type="button" className="reel__close" onClick={onClose} autoFocus>
              <span className="sr-only">Close reel</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
