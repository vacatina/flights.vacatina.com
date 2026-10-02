export function uploadFile(
  uploadUrl: string,
  file: File,
  onProgress: (progress: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("PUT", uploadUrl)
    request.timeout = 60000
    request.addEventListener("timeout", () =>
      reject(new Error("Upload timed out. Try again."))
    )
    request.addEventListener("abort", () =>
      reject(new Error("Upload cancelled. Try again."))
    )
    request.setRequestHeader("Content-Type", file.type)
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.max(1, Math.round((event.loaded / event.total) * 95)))
      }
    })
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        resolve()
      } else {
        reject(new Error("Upload failed. Try again."))
      }
    })
    request.addEventListener("error", () => {
      reject(new Error("Upload failed. Check your connection and try again."))
    })
    request.send(file)
  })
}
