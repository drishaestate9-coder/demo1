/** Resolves a path inside `/public` against the deployed base URL. */
export function asset(path: string) {
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
