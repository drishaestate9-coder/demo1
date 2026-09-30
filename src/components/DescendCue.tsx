import './DescendCue.css'

/** "DESCEND" label with a circular downward arrow; starts the journey. */
export function DescendCue({ label, onDescend }: { label: string; onDescend: () => void }) {
  return (
    <div className="descend">
      <button type="button" className="descend__inner" onClick={onDescend}>
        <span className="descend__label">{label}</span>
        <span className="descend__circle" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 5v13m0 0-5-5m5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
    </div>
  )
}
