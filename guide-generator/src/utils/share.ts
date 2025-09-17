import type { Guide } from '../types'

const SHARE_PARAM = 's'

const base64UrlEncode = (input: string) => {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
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
  return new TextDecoder().decode(bytes)
}

export const SHARE_QUERY_PARAM = SHARE_PARAM

export function encodeGuideSharePayload(guide: Guide): string {
  const json = JSON.stringify(guide)
  return base64UrlEncode(json)
}

export function decodeGuideSharePayload(payload: string): Guide | null {
  try {
    const json = base64UrlDecode(payload)
    return JSON.parse(json) as Guide
  } catch (error) {
    console.error('Impossible de décoder le guide partagé', error)
    return null
  }
}
