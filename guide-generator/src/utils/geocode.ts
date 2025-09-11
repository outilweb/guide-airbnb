export type PointInput = { id: string; label: string; address?: string; mapsUrl?: string }
export type GeocodedPoint = { id: string; label: string; lat: number; lng: number; url?: string; isHome?: boolean }
export type GeocodeOptions = { contextAddress?: string }

function parseLatLngFromGoogleUrl(url: string): { lat: number; lng: number } | null {
  try {
    // @lat,lng,zoom pattern
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
    // !3dlat!4dlng pattern used in many shared Google Maps links
    const d3d4d = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
    if (d3d4d) return { lat: parseFloat(d3d4d[1]), lng: parseFloat(d3d4d[2]) }
    // /lat,lng/ in path (dir, place, etc.)
    const pathMatch = url.match(/\/(?:dir\/)?(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:\/|$)/)
    if (pathMatch) return { lat: parseFloat(pathMatch[1]), lng: parseFloat(pathMatch[2]) }
    // q=lat,lng pattern
    const qMatch = url.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
    if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }
    // ll=lat,lng pattern
    const llMatch = url.match(/[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
    if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) }
    // sll=lat,lng pattern
    const sllMatch = url.match(/[?&]sll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
    if (sllMatch) return { lat: parseFloat(sllMatch[1]), lng: parseFloat(sllMatch[2]) }
  } catch { /* ignore */ }
  return null
}

const STORAGE_KEY = 'geocodeCacheV2'
type Cache = Record<string, { lat: number; lng: number }>

function readCache(): Cache {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function writeCache(cache: Cache) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cache)) } catch { /* ignore */ }
}

async function geocodeAddressFree(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}&accept-language=fr`
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) return null
    const data = await res.json() as Array<{ lat: string; lon: string }>
    if (!Array.isArray(data) || !data[0]) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

async function geocodeAddressStructured(parts: { street?: string; city?: string; postal?: string; country?: string }): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({ format: 'json', limit: '1', 'accept-language': 'fr' })
  if (parts.street) params.set('street', parts.street)
  if (parts.city) params.set('city', parts.city)
  if (parts.postal) params.set('postalcode', parts.postal)
  if (parts.country) params.set('country', parts.country)
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) return null
    const data = await res.json() as Array<{ lat: string; lon: string }>
    if (!Array.isArray(data) || !data[0]) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

// --- Helpers for French address normalization ---
const ABBREV_MAP: Array<[RegExp, string]> = [
  [/\bAv\.?\b/gi, 'Avenue'],
  [/\bBd\.?\b/gi, 'Boulevard'],
  [/\bBoulev\.?\b/gi, 'Boulevard'],
  [/\bGd\.?\b/gi, 'Grande'],
  [/\bGrd\.?\b/gi, 'Grande'],
  [/\bSt\.?\b/gi, 'Saint'],
  [/\bSte\.?\b/gi, 'Sainte'],
  [/\bPl\.?\b/gi, 'Place'],
  [/\bRte\.?\b/gi, 'Route'],
  [/\bChem\.?\b/gi, 'Chemin'],
  [/\bAll\.?\b/gi, 'Allée'],
  [/\bAvn\.?\b/gi, 'Avenue'],
]

function extractCityContext(addr?: string): { city?: string; postal?: string } {
  if (!addr) return {}
  const m = addr.match(/(\b\d{5}\b)\s+([A-Za-zÀ-ÖØ-öø-ÿ'\- ]+)/)
  if (m) return { postal: m[1], city: m[2].replace(/^[,\s]+|[,\s]+$/g, '') }
  return {}
}

function normalizeFrenchAddress(raw: string): string {
  let s = raw.trim()
  // Remove PO boxes and industrial zone prefixes which harm geocoding
  s = s.replace(/\bBP\s*\d+\b/gi, '')
  s = s.replace(/\bZI\s+[^,\-]+/gi, '')
  // If there is a hyphen-separated label before the true address, keep the right-most segment
  if (s.includes(' - ')) {
    const parts = s.split(' - ').map(p => p.trim()).filter(Boolean)
    // keep the last segment, which usually contains the street number and name
    s = parts[parts.length - 1]
  }
  // Expand common abbreviations
  ABBREV_MAP.forEach(([re, r]) => { s = s.replace(re, r) })
  // Collapse multiple spaces and commas
  s = s.replace(/\s+,/g, ',').replace(/,\s*,/g, ', ').replace(/\s{2,}/g, ' ').trim()
  return s
}

function ensureCountry(addr: string): string {
  // If no country present, append France to bias geocoding
  if (!/\bfrance\b/i.test(addr)) return `${addr}, France`
  return addr
}

export async function geocodePoints(inputs: PointInput[], options?: GeocodeOptions): Promise<GeocodedPoint[]> {
  const cache = readCache()
  const out: GeocodedPoint[] = []
  const context = extractCityContext(options?.contextAddress)
  for (const p of inputs) {
    const originalAddress = (p.address || '').trim()
    const normalized = originalAddress ? normalizeFrenchAddress(originalAddress) : ''
    const key = `${normalized || originalAddress}|${p.mapsUrl || ''}`.trim()
    let coords: { lat: number; lng: number } | null = null
    if (p.mapsUrl) coords = parseLatLngFromGoogleUrl(p.mapsUrl)
    if (!coords && key && cache[key]) coords = cache[key]
    // Try several geocoding variants to improve accuracy
    if (!coords && normalized) {
      // Parse parts from normalized address
      const parts: { street?: string; city?: string; postal?: string; country?: string } = { country: 'France' }
      // extract postal + city from normalized string
      const postalCity = normalized.match(/\b(\d{5})\b\s+([A-Za-zÀ-ÖØ-öø-ÿ'\- ]+)/)
      if (postalCity) {
        parts.postal = postalCity[1]
        parts.city = postalCity[2].replace(/^[,\s]+|[,\s]+$/g, '')
      } else {
        // fallback to context for city/postal if not present in the address
        if (context.postal) parts.postal = context.postal
        if (context.city) parts.city = context.city
      }
      // street is everything before the postal code or city part
      let street = normalized
      if (postalCity) street = normalized.slice(0, postalCity.index).replace(/[ ,]+$/,'')
      parts.street = street

      // 1) structured query
      // eslint-disable-next-line no-await-in-loop
      coords = await geocodeAddressStructured(parts)
      if (!coords) {
        // 2) free text with normalized + ensured country
        // eslint-disable-next-line no-await-in-loop
        coords = await geocodeAddressFree(ensureCountry(normalized))
      }
      if (!coords && context.city) {
        // 3) append context to normalized
        const attempt3 = ensureCountry(`${normalized}, ${context.city}${context.postal ? ' ' + context.postal : ''}`)
        // eslint-disable-next-line no-await-in-loop
        coords = await geocodeAddressFree(attempt3)
      }
      if (!coords && originalAddress && originalAddress !== normalized) {
        // 4) fallback to original string
        // eslint-disable-next-line no-await-in-loop
        coords = await geocodeAddressFree(ensureCountry(originalAddress))
      }
      if (coords && key) { cache[key] = coords; writeCache(cache) }
    }
    // Fallback: try geocoding the label if address missing or failed
    if (!coords && p.label && !p.address) {
      // eslint-disable-next-line no-await-in-loop
      coords = await geocodeAddressFree(ensureCountry(p.label))
    }
    if (coords) out.push({ id: p.id, label: p.label, lat: coords.lat, lng: coords.lng, url: p.mapsUrl })
  }
  return out
}
