import type { Guide } from '../types'
import { defaultTheme } from '../types'

const DRAFT_KEY = 'guide-draft'
const PUB_PREFIX = 'guide:'

const makeId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try { return crypto.randomUUID() } catch { /* ignore */ }
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

const toOptionalString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

function ensureGuideShape(raw: any): Guide {
  const now = Date.now()

  const themeRaw = raw?.theme && typeof raw.theme === 'object' ? raw.theme : {}
  const theme = {
    primary: typeof themeRaw.primary === 'string' ? themeRaw.primary : defaultTheme.primary,
    accent: typeof themeRaw.accent === 'string' ? themeRaw.accent : defaultTheme.accent,
    fontHeading: typeof themeRaw.fontHeading === 'string' ? themeRaw.fontHeading : defaultTheme.fontHeading,
    fontBody: typeof themeRaw.fontBody === 'string' ? themeRaw.fontBody : defaultTheme.fontBody,
    logoDataUrl: toOptionalString(themeRaw.logoDataUrl),
    welcomeMessage: typeof themeRaw.welcomeMessage === 'string' ? themeRaw.welcomeMessage : defaultTheme.welcomeMessage,
  }

  const normalizeRule = (rule: any) => ({
    id: typeof rule?.id === 'string' ? rule.id : makeId('rule'),
    text: typeof rule?.text === 'string' ? rule.text.trim() : '',
  })

  const rules = Array.isArray(raw?.rules)
    ? raw.rules.map(normalizeRule).filter((rule: { text: string }) => rule.text.length > 0)
    : []

  const normalizePlace = (place: any) => ({
    id: typeof place?.id === 'string' ? place.id : makeId('place'),
    name: typeof place?.name === 'string' ? place.name : '',
    category: typeof place?.category === 'string' ? place.category : 'Autre',
    subtype: toOptionalString(place?.subtype),
    description: toOptionalString(place?.description),
    address: toOptionalString(place?.address),
    mapsUrl: toOptionalString(place?.mapsUrl),
    siteUrl: toOptionalString(place?.siteUrl),
  })

  const places = Array.isArray(raw?.places) ? raw.places.map(normalizePlace) : []

  const normalizePoint = (point: any) => ({
    id: typeof point?.id === 'string' ? point.id : makeId('point'),
    label: typeof point?.label === 'string' ? point.label : '',
    address: toOptionalString(point?.address),
    mapsUrl: toOptionalString(point?.mapsUrl),
  })

  const mapRaw = raw?.map && typeof raw.map === 'object' ? raw.map : {}
  const map = {
    homeAddress: typeof mapRaw.homeAddress === 'string' ? mapRaw.homeAddress : (typeof raw?.address === 'string' ? raw.address : ''),
    points: Array.isArray(mapRaw.points) ? mapRaw.points.map(normalizePoint) : [],
  }

  const contactRaw = raw?.contact && typeof raw.contact === 'object' ? raw.contact : undefined
  const contact = contactRaw ? {
    name: toOptionalString(contactRaw.name),
    phone: toOptionalString(contactRaw.phone),
    email: toOptionalString(contactRaw.email),
  } : undefined

  const wifiRaw = raw?.wifi && typeof raw.wifi === 'object' ? raw.wifi : undefined
  const wifi = wifiRaw ? {
    ssid: toOptionalString(wifiRaw.ssid),
    password: toOptionalString(wifiRaw.password),
  } : undefined

  const stayRaw = raw?.stay && typeof raw.stay === 'object' ? raw.stay : undefined
  const checkInRaw = stayRaw?.checkIn && typeof stayRaw.checkIn === 'object' ? stayRaw.checkIn : undefined
  const checkOutRaw = stayRaw?.checkOut && typeof stayRaw.checkOut === 'object' ? stayRaw.checkOut : undefined
  const checkIn = checkInRaw ? {
    time: toOptionalString(checkInRaw.time),
    instructions: toOptionalString(checkInRaw.instructions),
    code: toOptionalString(checkInRaw.code),
  } : undefined
  const checkOut = checkOutRaw ? {
    time: toOptionalString(checkOutRaw.time),
    checklist: toOptionalString(checkOutRaw.checklist),
  } : undefined
  const stay = checkIn || checkOut ? { checkIn, checkOut } : undefined

  const links = Array.isArray(raw?.links) ? raw.links.map((link: any) => ({
    id: typeof link?.id === 'string' ? link.id : makeId('link'),
    label: typeof link?.label === 'string' ? link.label : '',
    url: typeof link?.url === 'string' ? link.url : '',
  })) : []

  const createdAt = typeof raw?.createdAt === 'number' ? raw.createdAt : now
  const updatedAt = typeof raw?.updatedAt === 'number' ? raw.updatedAt : createdAt

  const guide: Guide = {
    guideId: typeof raw?.guideId === 'string' ? raw.guideId : undefined,
    title: typeof raw?.title === 'string' ? raw.title : '',
    address: toOptionalString(raw?.address),
    stay,
    contact,
    wifi,
    rules,
    equipmentNotes: toOptionalString(raw?.equipmentNotes) ?? '',
    places,
    map,
    links,
    theme,
    createdAt,
    updatedAt,
  }

  return guide
}

export function sanitizeGuide(raw: any): Guide {
  return ensureGuideShape(raw)
}

export function loadDraft(): Guide | null {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (!raw) return null
  try {
    return sanitizeGuide(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveDraft(guide: Guide) {
  const updated = { ...guide, updatedAt: Date.now() }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(sanitizeGuide(updated)))
}

export function publishGuide(guide: Guide): Guide {
  const guideId = guide.guideId ?? crypto.randomUUID()
  const now = Date.now()
  const finalized: Guide = sanitizeGuide({ ...guide, guideId, createdAt: guide.createdAt ?? now, updatedAt: now })
  localStorage.setItem(`${PUB_PREFIX}${guideId}`, JSON.stringify(finalized))
  localStorage.setItem(DRAFT_KEY, JSON.stringify(finalized))
  return finalized
}

export function loadPublished(guideId: string): Guide | null {
  const raw = localStorage.getItem(`${PUB_PREFIX}${guideId}`)
  if (!raw) return null
  try {
    return sanitizeGuide(JSON.parse(raw))
  } catch {
    return null
  }
}

export function deletePublishedGuide(guideId: string) {
  localStorage.removeItem(`${PUB_PREFIX}${guideId}`)

  const rawDraft = localStorage.getItem(DRAFT_KEY)
  if (!rawDraft) return
  try {
    const draft = JSON.parse(rawDraft) as Guide
    if (draft?.guideId === guideId) {
      localStorage.removeItem(DRAFT_KEY)
    }
  } catch {
    // Draft is malformed: drop it to avoid orphaned data
    localStorage.removeItem(DRAFT_KEY)
  }
}

export function listPublishedGuides(): Guide[] {
  const guides: Guide[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(PUB_PREFIX)) continue
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const parsed = sanitizeGuide(JSON.parse(raw))
      if (parsed.guideId === 'demo') continue
      guides.push(parsed)
    } catch {
      /* ignore malformed entries */
    }
  }

  return guides.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
}
