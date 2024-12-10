import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumberWithCommas(value: number) {
  return value.toString().replaceAll(/\B(?=(\d{3})+(?!\d))/g, ",")
}

export function formatNumber(value: number) {
  const intl = new Intl.NumberFormat("en-US")

  return intl.format(value)
}

const units = {
  year: 24 * 60 * 60 * 1000 * 365,
  month: (24 * 60 * 60 * 1000 * 365) / 12,
  day: 24 * 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  min: 60 * 1000,
  second: 1000,
} as const

// 2h 10m, 1d 2h, 1 year 2 months, 3 years 4 months etc.
export function formatTime(seconds: number) {
  let milliseconds = seconds * 1000
  const parts = []

  for (const [unit, value] of Object.entries(units)) {
    if (milliseconds >= value) {
      const amount = Math.floor(milliseconds / value)
      const plural = amount > 1 ? "s" : ""
      const label =
        unit === "month" ? ` month${plural}` : unit === "year" ? ` year${plural}` : unit[0]
      parts.push(`${amount}${label}`)
      milliseconds %= value
    }
  }

  // If no parts (e.g., 0ms), default to "0s"
  if (parts.length === 0) {
    parts.push("0s")
  }

  return parts.slice(0, 2).join(" ")
}
