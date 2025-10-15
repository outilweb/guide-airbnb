// Centralized branding & sharing configuration
// Set VITE_BRAND_URL or VITE_GUIDE_SHARE_BASE in your environment to override defaults.

const rawEnv = import.meta.env ?? {}

const toString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

const brand = toString(rawEnv.VITE_BRAND_URL)?.trim()
export const BRAND_URL: string = brand && brand.length > 0
  ? brand
  : 'https://guide-airbnb.vercel.app'

const qrTarget = toString(rawEnv.VITE_QR_TARGET_URL)?.trim()
export const QR_TARGET_URL: string = qrTarget && qrTarget.length > 0
  ? qrTarget
  : 'https://guide-airbnb.vercel.app/qr-photo.png'

const shareBaseRaw = toString(rawEnv.VITE_GUIDE_SHARE_BASE)?.trim()
export const GUIDE_SHARE_BASE: string = shareBaseRaw && shareBaseRaw.length > 0
  ? shareBaseRaw.replace(/\/+$/, '')
  : ''
