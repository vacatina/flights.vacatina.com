import { randomUUID } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import pg from "pg"

const { Pool } = pg

loadLocalEnvFiles()

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("Missing DATABASE_URL. Cannot seed application defaults.")
}

const maxPoolSize = Number.parseInt(process.env.DB_POOL_MAX ?? "10", 10)
const pool = new Pool({
  connectionString,
  max: Number.isFinite(maxPoolSize) && maxPoolSize > 0 ? maxPoolSize : 10,
})

try {
  await seedPricingRules()
  await seedBusinessSettings()
} finally {
  await pool.end()
}

async function seedPricingRules() {
  const { rows } = await pool.query(
    "select count(*)::int as count from pricing_rules"
  )
  const existingCount = Number(rows[0]?.count ?? 0)

  if (existingCount > 0) {
    console.log(
      `[pricing seed] skipped, existing pricing rules: ${existingCount}`
    )
    return
  }

  await pool.query(
    `
      insert into pricing_rules (
        id,
        name,
        enabled,
        priority,
        adjustment_type,
        adjustment_value,
        active_from,
        active_to,
        journey_type,
        origin_iata,
        destination_iata,
        airline_iata,
        cabin_class,
        created_at,
        updated_at
      )
      values (
        $1,
        'Global default passthrough',
        true,
        0,
        'percent',
        '10.0000',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        now(),
        now()
      )
    `,
    [`prr_${randomUUID().replaceAll("-", "")}`]
  )

  console.log("[pricing seed] inserted default pricing rule")
}

async function seedBusinessSettings() {
  const { rows } = await pool.query(
    "select count(*)::int as count from business_settings"
  )
  const existingCount = Number(rows[0]?.count ?? 0)

  if (existingCount > 0) {
    console.log(
      `[business settings seed] skipped, existing settings: ${existingCount}`
    )
    return
  }

  await pool.query(
    `
      insert into business_settings (
        id,
        business_name,
        support_email,
        support_phone,
        support_whatsapp,
        address,
        timezone,
        updated_by,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, null, now(), now())
    `,
    [
      "business_settings_default",
      process.env.BUSINESS_NAME?.trim() || "Vacatina Flights",
      process.env.SUPPORT_EMAIL?.trim() || "support@example.com",
      process.env.SUPPORT_PHONE?.trim() || "+10000000000",
      process.env.SUPPORT_WHATSAPP?.trim() || "+10000000000",
      process.env.BUSINESS_ADDRESS?.trim() || "Business address pending",
      process.env.BUSINESS_TIMEZONE?.trim() || "UTC",
    ]
  )

  console.log("[business settings seed] inserted default business settings")
}

function loadLocalEnvFiles() {
  for (const fileName of [".env.local", ".env"]) {
    const filePath = resolve(process.cwd(), fileName)

    if (!existsSync(filePath)) {
      continue
    }

    const content = readFileSync(filePath, "utf8")

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()

      if (!trimmed || trimmed.startsWith("#")) {
        continue
      }

      const separatorIndex = trimmed.indexOf("=")

      if (separatorIndex === -1) {
        continue
      }

      const key = trimmed.slice(0, separatorIndex).trim()

      if (!key || process.env[key] !== undefined) {
        continue
      }

      process.env[key] = parseEnvValue(trimmed.slice(separatorIndex + 1).trim())
    }
  }
}

function parseEnvValue(value) {
  const quote = value[0]

  if (
    (quote === '"' || quote === "'") &&
    value.length >= 2 &&
    value[value.length - 1] === quote
  ) {
    const unquoted = value.slice(1, -1)
    return quote === '"' ? unquoted.replaceAll("\\n", "\n") : unquoted
  }

  const commentIndex = value.indexOf(" #")
  return (commentIndex === -1 ? value : value.slice(0, commentIndex)).trim()
}
