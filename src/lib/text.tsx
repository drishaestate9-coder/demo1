import { Fragment } from 'react'

const clean = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

/** Renders `text`, setting any word listed in `italic` in <em>. */
export function Emphasis({ text, italic = [] }: { text: string; italic?: string[] }) {
  const set = new Set(italic.map(clean))
  const parts = text.split(/(\s+)/)
  return (
    <>
      {parts.map((part, i) =>
        set.has(clean(part)) ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  )
}
