import { act, renderHook, waitFor, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  applicationFixture,
  documentFixture,
} from "../testing/application-fixture"
import { getDocumentSlots } from "../domain"

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  intent: vi.fn(),
  complete: vi.fn(),
  remove: vi.fn(),
  put: vi.fn(),
}))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))
vi.mock("../server/actions", () => ({
  createVisaDocumentUploadIntentAction: mocks.intent,
  completeVisaDocumentUploadAction: mocks.complete,
  deleteVisaDocumentAction: mocks.remove,
}))
vi.mock("./upload-file", () => ({ uploadFile: mocks.put }))
import { useDocumentUploads } from "./use-document-uploads"

beforeEach(() => {
  vi.resetAllMocks()
  mocks.intent.mockResolvedValue({
    ok: true,
    documentId: "new-file",
    uploadUrl: "https://test/upload",
  })
  mocks.complete.mockResolvedValue({
    ok: true,
    document: documentFixture({ id: "new-file" }),
  })
  mocks.put.mockResolvedValue(undefined)
  mocks.remove.mockResolvedValue({ ok: true })
})
afterEach(cleanup)

describe("visa upload interaction state", () => {
  it("replaces a visible slot immediately after verification", async () => {
    const detail = applicationFixture()
    detail.documents = [documentFixture()]
    const { result } = renderHook(() => useDocumentUploads(detail))
    await act(async () => {
      await result.current.upload(
        getDocumentSlots(detail)[0],
        new File(["passport"], "passport.pdf", { type: "application/pdf" })
      )
    })
    expect(result.current.documents.map((doc) => doc.id)).toEqual(["new-file"])
    expect(result.current.busy).toBe(false)
    expect(mocks.refresh).toHaveBeenCalled()
  })
  it("preserves the existing file when a replacement fails and allows retry", async () => {
    const detail = applicationFixture()
    detail.documents = [documentFixture()]
    mocks.complete.mockResolvedValueOnce({
      ok: false,
      message: "Verification failed",
    })
    const { result } = renderHook(() => useDocumentUploads(detail))
    const slot = getDocumentSlots(detail)[0]
    const file = new File(["passport"], "passport.pdf", {
      type: "application/pdf",
    })
    await act(async () => {
      await result.current.upload(slot, file)
    })
    expect(result.current.documents[0].id).toBe("document-1")
    expect(result.current.uploads[slot.key].message).toBe("Verification failed")
    await act(async () => {
      await result.current.upload(slot, file)
    })
    expect(result.current.documents[0].id).toBe("new-file")
  })
  it("marks a failed removal pending, then removes the row on retry", async () => {
    const detail = applicationFixture()
    detail.documents = [documentFixture()]
    mocks.remove.mockResolvedValueOnce({ ok: false, message: "Please retry" })
    const { result } = renderHook(() => useDocumentUploads(detail))
    await act(async () => {
      await result.current.remove("document-1")
    })
    expect(result.current.documents[0].status).toBe("deletion_pending")
    expect(result.current.pageError).toBe("Please retry")
    await act(async () => {
      await result.current.remove("document-1")
    })
    expect(result.current.documents).toHaveLength(0)
  })
  it("blocks duplicate operations while storage verification is pending", async () => {
    let resolve!: (value: {
      ok: true
      document: ReturnType<typeof documentFixture>
    }) => void
    mocks.complete.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r
        })
    )
    const detail = applicationFixture()
    const { result } = renderHook(() => useDocumentUploads(detail))
    const slot = getDocumentSlots(detail)[0]
    const file = new File(["passport"], "passport.pdf", {
      type: "application/pdf",
    })
    let upload!: Promise<void>
    act(() => {
      upload = result.current.upload(slot, file)
    })
    await waitFor(() => expect(mocks.complete).toHaveBeenCalled())
    expect(result.current.busy).toBe(true)
    await act(async () => {
      await result.current.upload(slot, file)
    })
    expect(mocks.intent).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolve({ ok: true, document: documentFixture() })
      await upload
    })
    expect(result.current.busy).toBe(false)
  })
})
