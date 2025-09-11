export function publicGuideUrl(guideId: string) {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/guide/${guideId}`
}
