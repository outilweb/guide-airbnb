import type { Guide } from '../types'
import { sanitizeGuide } from './storage'

const CHUNK_SIZE = 0x8000

const encodeUtf8 = (input: string): Uint8Array => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(input)
  }
  const utf8 = unescape(encodeURIComponent(input))
  const bytes = new Uint8Array(utf8.length)
  for (let i = 0; i < utf8.length; i += 1) {
    bytes[i] = utf8.charCodeAt(i)
  }
  return bytes
}

const decodeUtf8 = (bytes: Uint8Array): string => {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes)
  }
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return decodeURIComponent(escape(binary))
}

const base64UrlEncode = (input: string) => {
  const bytes = encodeUtf8(input)
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE)
    binary += String.fromCharCode(...chunk)
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const base64UrlDecode = (input: string) => {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padding = base64.length % 4
  if (padding) base64 += '='.repeat(4 - padding)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return decodeUtf8(bytes)
}

export const SHARE_QUERY_PARAM = 's'

export function encodeGuideSharePayload(guide: Guide): string {
  const sanitized = sanitizeGuide(guide)
  const json = JSON.stringify(sanitized)
  return base64UrlEncode(json)
}

export function decodeGuideSharePayload(payload: string): Guide | null {
  try {
    const json = base64UrlDecode(payload)
    const parsed = JSON.parse(json) as Guide
    return sanitizeGuide(parsed)
  } catch (error) {
    console.error('Impossible de décoder le guide partagé', error)
    return null
  }
}
