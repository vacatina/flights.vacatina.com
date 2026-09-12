import { afterEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { fetchVisaRequirements, VisaApiError } from "./client"

afterEach(() => {
  vi.unstubAllEnvs()
})

function useTestProviderUrls() {
  vi.stubEnv("IVISA_API_BASE_URL", "https://primary.example")
  vi.stubEnv("VACATINA_VISA_API_BASE_URL", "https://fallback.example")
}

describe("visa API fallback", () => {
  test("returns the live iVisa response without calling fallback", async () => {
    useTestProviderUrls()
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ outcome: "document_not_required", documents: {} })
      )

    const result = await fetchVisaRequirements("LK", "SG", { fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://primary.example/visa/destination-requirements/LK/SG"
    )
    expect(result.metadata.source).toBe("ivisa-live")
  })

  test("switches to the Vacatina snapshot after a primary server error", async () => {
    useTestProviderUrls()
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        Response.json(
          { outcome: "visa_supported", documents: {} },
          { headers: { "X-Data-Captured-At": "2026-08-10T21:56:05.839Z" } }
        )
      )

    const result = await fetchVisaRequirements("IN", "AE", { fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      "https://fallback.example/visa/destination-requirements/IN/AE"
    )
    expect(result.metadata).toEqual({
      source: "vacatina-snapshot",
      capturedAt: "2026-08-10T21:56:05.839Z",
    })
  })

  test("switches to fallback after a primary network failure", async () => {
    useTestProviderUrls()
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("network failed"))
      .mockResolvedValueOnce(
        Response.json({ outcome: "visa_supported", documents: {} })
      )

    const result = await fetchVisaRequirements("IN", "AE", { fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(result.metadata.source).toBe("vacatina-snapshot")
  })

  test("retries the fallback once after a transient network failure", async () => {
    useTestProviderUrls()
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("primary network failed"))
      .mockRejectedValueOnce(new TypeError("fallback connection refused"))
      .mockResolvedValueOnce(
        Response.json({ outcome: "visa_supported", documents: {} })
      )

    const result = await fetchVisaRequirements("IN", "AE", { fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(fetchImpl.mock.calls[2]?.[0]).toBe(
      "https://fallback.example/visa/destination-requirements/IN/AE"
    )
    expect(result.metadata.source).toBe("vacatina-snapshot")
  })

  test("does not hide meaningful primary validation errors with snapshot data", async () => {
    useTestProviderUrls()
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

  test("switches to fallback when the primary endpoint returns 404", async () => {
    useTestProviderUrls()
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("<html>Page not found</html>", {
          status: 404,
          headers: { "Content-Type": "text/html" },
        })
      )
      .mockResolvedValueOnce(
        Response.json({ outcome: "visa_supported", documents: {} })
      )

    const result = await fetchVisaRequirements("IN", "AE", { fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(result.metadata.source).toBe("vacatina-snapshot")
  })

  test("switches to fallback when a successful primary response is not usable JSON", async () => {
    useTestProviderUrls()
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("<html>Unexpected page</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        })
      )
      .mockResolvedValueOnce(
        Response.json({ outcome: "visa_supported", documents: {} })
      )

    const result = await fetchVisaRequirements("IN", "AE", { fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(result.metadata.source).toBe("vacatina-snapshot")
  })
})
