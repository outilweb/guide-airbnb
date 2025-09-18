export function publicGuideUrl(guideId: string) {
  const basePath = import.meta.env.BASE_URL ?? '/'
  const configured = (import.meta.env.VITE_PUBLIC_SITE_URL ?? '').toString().trim()

  let target: URL | null = null

  if (configured) {
    try {
      const configuredBase = new URL(configured)
      target = new URL(basePath, configuredBase)
    } catch {
      target = null
    }
  }

  if (!target) {
    target = new URL(basePath, window.location.origin)
  }

  target.hash = `/guide/${guideId}`
  return target.toString()
}
