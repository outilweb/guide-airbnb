import type { Guide } from '../types'

const DRAFT_KEY = 'guide-draft'
const PUB_PREFIX = 'guide:'

export function loadDraft(): Guide | null {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as Guide } catch { return null }
}

export function saveDraft(guide: Guide) {
  const updated = { ...guide, updatedAt: Date.now() }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(updated))
}

export function publishGuide(guide: Guide): Guide {
  const guideId = guide.guideId ?? crypto.randomUUID()
  const now = Date.now()
  const finalized: Guide = { ...guide, guideId, createdAt: guide.createdAt ?? now, updatedAt: now }
  localStorage.setItem(`${PUB_PREFIX}${guideId}`, JSON.stringify(finalized))
  localStorage.setItem(DRAFT_KEY, JSON.stringify(finalized))
  return finalized
}

export function loadPublished(guideId: string): Guide | null {
  const raw = localStorage.getItem(`${PUB_PREFIX}${guideId}`)
  if (!raw) return null
  try { return JSON.parse(raw) as Guide } catch { return null }
}

export function listPublishedGuides(): Guide[] {
  const guides: Guide[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(PUB_PREFIX)) continue
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw) as Guide
      guides.push(parsed)
    } catch {
      /* ignore malformed entries */
    }
  }

  return guides.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
}
