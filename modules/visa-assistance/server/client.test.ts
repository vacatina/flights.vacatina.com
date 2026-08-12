import { afterEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { fetchVisaRequirements, VisaApiError } from "./client"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("visa API fallback", () => {
  test("returns the live iVisa response without calling fallback", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ outcome: "document_not_required" }))

    const result = await fetchVisaRequirements("LK", "SG", { fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://www.ivisa.com/visa/destination-requirements/LK/SG"
    )
    expect(result.metadata.source).toBe("ivisa-live")
  })

  test("switches to the Vacatina snapshot after a primary server error", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        Response.json(
          { outcome: "visa_supported" },
          { headers: { "X-Data-Captured-At": "2026-08-10T21:56:05.839Z" } }
        )
      )

    const result = await fetchVisaRequirements("IN", "AE", { fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      "https://vacatina-visa-api.vercel.app/visa/destination-requirements/IN/AE"
    )
    expect(result.metadata).toEqual({
      source: "vacatina-snapshot",
      capturedAt: "2026-08-10T21:56:05.839Z",
    })
  })

  test("switches to fallback after a primary network failure", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("network failed"))
      .mockResolvedValueOnce(Response.json({ outcome: "visa_supported" }))

    const result = await fetchVisaRequirements("IN", "AE", { fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(result.metadata.source).toBe("vacatina-snapshot")
  })

  test("does not hide meaningful primary validation errors with snapshot data", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { error: true, message: "Invalid country code" },
          { status: 422 }
        )
      )

    const request = fetchVisaRequirements("XX", "AE", { fetchImpl })
    await expect(request).rejects.toBeInstanceOf(VisaApiError)
    await expect(request).rejects.toMatchObject({
      status: 422,
      provider: "ivisa",
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
