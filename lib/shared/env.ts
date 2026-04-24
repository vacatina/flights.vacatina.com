export function parseIntegerFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]

  if (!raw) {
    return fallback
  }

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function parseNumberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]

  if (!raw) {
    return fallback
  }

  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production"
}
