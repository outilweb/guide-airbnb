// Utility formatters for display-only normalization

export function formatTimeDisplay(input?: string): string | undefined {
  if (!input) return input
  const raw = String(input).trim().toLowerCase()
  if (!raw) return input

  // Normalize common separators (h, ., comma) to ':' and drop spaces
  let s = raw.replace(/[\.\,]/g, ":").replace(/h/g, ":").replace(/\s+/g, "")

  let hStr = ""
  let mStr = ""

  if (s.includes(":")) {
    const parts = s.split(":")
    hStr = (parts[0] || "").replace(/\D/g, "")
    mStr = ((parts[1] || "").replace(/\D/g, "")) || "00"
  } else if (/^\d{1,4}$/.test(s)) {
    if (s.length <= 2) { hStr = s; mStr = "00" }
    else if (s.length === 3) { hStr = s.slice(0, 1); mStr = s.slice(1) }
    else { hStr = s.slice(0, 2); mStr = s.slice(2) }
  } else {
    return input
  }

  // Truncate minutes to two digits if user typed more
  if (mStr.length > 2) mStr = mStr.slice(0, 2)

  const h = Number.parseInt(hStr || "0", 10)
  const m = Number.parseInt(mStr || "0", 10)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return input
  if (h < 0 || h > 23 || m < 0 || m > 59) return input

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function formatPhoneFR(input?: string): string | undefined {
  if (!input) return input
  const raw = String(input).trim()
  if (!raw) return input

  // If already has spaces, keep user formatting (normalize multiple spaces)
  if (/\s/.test(raw)) return raw.replace(/\s+/g, " ").trim()

  // Keep leading + if present, strip other non-digits
  let s = raw
  // Convert 00 prefix to +
  if (s.startsWith("00")) s = "+" + s.slice(2)

  const hasPlus = s.startsWith("+")
  const digits = s.replace(/[^\d]/g, "")

  // French formatting
  if (hasPlus && s.startsWith("+33")) {
    let rest = digits.slice(2) // remove country code 33
    if (rest.startsWith("0")) rest = rest.slice(1) // drop trunk 0
    if (!rest) return "+33"
    const first = rest.slice(0, 1)
    const tail = rest.slice(1)
    const grouped = tail.replace(/(\d{2})(?=\d)/g, "$1 ").trim()
    return `+33 ${first}${grouped ? " " + grouped : ""}`
  }

  if (!hasPlus && digits.length === 10 && digits.startsWith("0")) {
    // 0X XX XX XX XX
    return digits.replace(/(\d{2})(?=(\d{2})+(?!\d))/g, "$1 ").trim()
  }

  // Fallback: group by 2 for readability
  const grouped = digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim()
  return hasPlus ? `+${grouped}` : grouped
}

