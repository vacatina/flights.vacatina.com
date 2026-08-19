import { z } from "zod"

const liteApiConfigSchema = z.object({
  LITEAPI_KEY: z.string().min(1, "LITEAPI_KEY is required"),
  LITEAPI_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
})

export function getLiteApiConfig() {
  const parsed = liteApiConfigSchema.safeParse({
    LITEAPI_KEY: process.env.LITEAPI_KEY,
    LITEAPI_ENV: process.env.LITEAPI_ENV || "sandbox",
  })

  if (!parsed.success) {
    throw new Error(
      `Invalid LiteAPI configuration: ${parsed.error.issues
        .map((e) => e.message)
        .join(", ")}`
    )
  }

  return {
    apiKey: parsed.data.LITEAPI_KEY,
    env: parsed.data.LITEAPI_ENV,
    baseUrl: "https://api.liteapi.travel/v3.0",
  }
}
