import type { Guide, Owner, PublishedGuide } from '../types'

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

export function publishGuide(guide: Guide, owner?: Owner | null): Guide {
  const guideId = guide.guideId ?? crypto.randomUUID()
  const now = Date.now()
  const ownerId = owner?.id ?? guide.ownerId
  const ownerEmail = owner?.email ?? guide.ownerEmail
  const finalized: Guide = {
    ...guide,
    guideId,
    ownerId,
    ownerEmail,
    createdAt: guide.createdAt ?? now,
    updatedAt: now,
  }
  localStorage.setItem(`${PUB_PREFIX}${guideId}`, JSON.stringify(finalized))
  localStorage.setItem(DRAFT_KEY, JSON.stringify(finalized))
  return finalized
}

export function loadPublished(guideId: string): Guide | null {
  const raw = localStorage.getItem(`${PUB_PREFIX}${guideId}`)
  if (!raw) return null
  try { return JSON.parse(raw) as Guide } catch { return null }
}

export function listPublishedGuides(filter?: { ownerId?: string; ownerEmail?: string }): PublishedGuide[] {
  const guides: PublishedGuide[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(PUB_PREFIX)) continue
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw) as Guide
      if (!parsed.guideId) continue
      if (parsed.guideId === 'demo') continue
      if (filter?.ownerId && parsed.ownerId !== filter.ownerId) {
        if (!(filter.ownerEmail && parsed.ownerEmail === filter.ownerEmail)) continue
      } else if (filter?.ownerEmail && parsed.ownerEmail !== filter.ownerEmail) {
        continue
      }
      guides.push(parsed as PublishedGuide)
    } catch {
      /* ignore malformed entries */
    }
  }

  return guides.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
}
