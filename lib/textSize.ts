export type TextSizeLevel = 0 | 1 | 2 | 3

export const TEXT_SIZE_STORAGE = "es-text-size"

export const TEXT_SIZE_LABELS: readonly string[] = [
  "Texto estándar",
  "Texto cómodo",
  "Texto grande",
  "Texto muy grande",
]

const MIN = 0
const MAX = 3

export function clampTextSizeLevel(value: number): TextSizeLevel {
  if (value <= MIN) return MIN
  if (value >= MAX) return MAX
  return value as TextSizeLevel
}

export function readTextSizeLevel(): TextSizeLevel {
  if (typeof window === "undefined") return 0
  try {
    const raw = localStorage.getItem(TEXT_SIZE_STORAGE)
    if (raw == null) return 0
    return clampTextSizeLevel(parseInt(raw, 10))
  } catch {
    return 0
  }
}

export function applyTextSizeLevel(level: TextSizeLevel) {
  if (typeof document === "undefined") return
  const n = clampTextSizeLevel(level)
  document.documentElement.dataset.textSize = String(n)
  try {
    localStorage.setItem(TEXT_SIZE_STORAGE, String(n))
  } catch {
    // ignorar
  }
  window.dispatchEvent(new Event("text-size-changed"))
}
