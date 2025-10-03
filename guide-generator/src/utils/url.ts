import type { Guide } from '../types'
import { guideShareInfo } from './exportGuide'

type GuideShareMeta = Pick<Guide, 'guideId' | 'title'> | { guideId?: string; title?: string }

export function publicGuideUrl(meta: GuideShareMeta) {
  if (!meta?.guideId) return ''
  const { shareUrl } = guideShareInfo(meta)
  return shareUrl
}

export function publicGuideFileName(meta: GuideShareMeta) {
  if (!meta?.guideId) return ''
  const { fileName } = guideShareInfo(meta)
  return fileName
}
