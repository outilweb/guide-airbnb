import type { Guide } from '../types'
import { sanitizeGuide } from './storage'
import { encodeGuideSharePayload, SHARE_QUERY_PARAM } from './share'

type GuideUrlOptions = {
  includeShare?: boolean
  guide?: Guide
}

export function publicGuideUrl(guideId: string, options?: GuideUrlOptions) {
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

  const baseHash = `/guide/${guideId}`

  if (options?.includeShare) {
    const guide = options.guide ?? null
    if (guide) {
      const sanitized = sanitizeGuide({ ...guide, guideId: guide.guideId ?? guideId })
      const payload = encodeGuideSharePayload(sanitized)
      target.hash = `${baseHash}?${SHARE_QUERY_PARAM}=${payload}`
      return target.toString()
    }
  }

  target.hash = baseHash
  return target.toString()
}
