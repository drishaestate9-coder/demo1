import { useState } from 'react'

function detect() {
  if (typeof window === 'undefined') return false
  if (new URLSearchParams(window.location.search).has('nowebgl')) return false
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/** True when a WebGL context can be created (otherwise posters are used). */
export function useWebGLSupport() {
  const [supported] = useState(detect)
  return supported
}
