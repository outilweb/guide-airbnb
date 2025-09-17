import type { Owner } from '../types'

const USERS_KEY = 'guide-users'
const SESSION_KEY = 'guide-session'

type OwnerMap = Record<string, Owner>

const normalizeEmail = (email: string) => email.trim().toLowerCase()

function readUsers(): OwnerMap {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as OwnerMap
    return parsed ?? {}
  } catch (error) {
    console.error('Impossible de lire les utilisateurs', error)
    return {}
  }
}

function writeUsers(users: OwnerMap) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

async function hashPassword(password: string): Promise<string> {
  if (password.length === 0) throw new Error('Le mot de passe est requis')

  try {
    if (window.crypto?.subtle) {
      const encoded = new TextEncoder().encode(password)
      const digest = await window.crypto.subtle.digest('SHA-256', encoded)
      const bytes = Array.from(new Uint8Array(digest))
      return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
    }
  } catch (error) {
    console.warn('hashPassword: fallback vers base64', error)
  }

  // Fallback simple si SubtleCrypto indisponible
  const base64 = btoa(unescape(encodeURIComponent(password)))
  return base64
}

export function getOwnerById(id: string): Owner | null {
  const users = readUsers()
  return users[id] ?? null
}

export function getOwnerByEmail(email: string): Owner | null {
  const users = readUsers()
  const normalized = normalizeEmail(email)
  return Object.values(users).find((owner) => owner.email === normalized) ?? null
}

export async function registerOwner(email: string, password: string): Promise<Owner> {
  const normalized = normalizeEmail(email)
  if (!normalized) throw new Error('Adresse email invalide')
  const users = readUsers()
  const already = Object.values(users).find((owner) => owner.email === normalized)
  if (already) throw new Error('Un compte existe déjà pour cet email')

  const hash = await hashPassword(password)
  const owner: Owner = {
    id: crypto.randomUUID(),
    email: normalized,
    passwordHash: hash,
    createdAt: Date.now(),
  }
  users[owner.id] = owner
  writeUsers(users)
  setCurrentOwner(owner.id)
  return owner
}

export async function authenticateOwner(email: string, password: string): Promise<Owner> {
  const normalized = normalizeEmail(email)
  if (!normalized) throw new Error('Adresse email invalide')
  const users = readUsers()
  const owner = Object.values(users).find((entry) => entry.email === normalized)
  if (!owner) throw new Error('Aucun compte trouvé pour cet email')

  const hash = await hashPassword(password)
  if (hash !== owner.passwordHash) throw new Error('Mot de passe incorrect')

  setCurrentOwner(owner.id)
  return owner
}

export function getCurrentOwner(): Owner | null {
  const ownerId = localStorage.getItem(SESSION_KEY)
  if (!ownerId) return null
  return getOwnerById(ownerId)
}

export function setCurrentOwner(ownerId: string | null) {
  if (!ownerId) {
    localStorage.removeItem(SESSION_KEY)
  } else {
    localStorage.setItem(SESSION_KEY, ownerId)
  }
}
