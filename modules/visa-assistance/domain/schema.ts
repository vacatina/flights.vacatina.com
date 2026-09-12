import { z } from "zod"

export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Select a valid country")

export const visaSearchSchema = z
  .object({
    nationality: countryCodeSchema,
    destination: countryCodeSchema,
  })
  .refine((value) => value.nationality !== value.destination, {
    message: "Choose a destination different from your passport country",
    path: ["destination"],
  })

export type VisaSearchValues = z.infer<typeof visaSearchSchema>
