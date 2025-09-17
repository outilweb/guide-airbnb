import type { PublishedGuide } from '../types'
import { encodeGuideSharePayload, SHARE_QUERY_PARAM } from './share'

type Options = {
  includeShare?: boolean
  sharePayload?: string
}

export function publicGuideUrl(guide: PublishedGuide, options?: Options) {
  const base = import.meta.env.BASE_URL ?? '/'
  const url = new URL(base, window.location.origin)
  const includeShare = options?.includeShare ?? false
  const payload = includeShare ? (options?.sharePayload ?? encodeGuideSharePayload(guide)) : null
  const path = `/guide/${guide.guideId}`
  url.hash = payload ? `${path}?${SHARE_QUERY_PARAM}=${payload}` : path
  return url.toString()
}
