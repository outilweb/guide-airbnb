export function publicGuideUrl(guideId: string) {
  const base = import.meta.env.BASE_URL ?? '/'
  const url = new URL(base, window.location.origin)
  url.hash = `/guide/${guideId}`
  return url.toString()
}
