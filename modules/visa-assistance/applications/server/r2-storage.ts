import "server-only"

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { getR2Config } from "@/modules/visa-assistance/applications/server/r2-config"

const UPLOAD_URL_TTL_SECONDS = 5 * 60
const DOWNLOAD_URL_TTL_SECONDS = 60

let client: S3Client | null = null

function getClient() {
  if (client) {
    return client
  }

  const config = getR2Config()
  client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
  return client
}

export async function createR2UploadUrl(input: {
  objectKey: string
  contentType: string
}) {
  const config = getR2Config()
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: input.objectKey,
    ContentType: input.contentType,
  })

  return getSignedUrl(getClient(), command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  })
}

export async function createR2DownloadUrl(input: {
  objectKey: string
  filename: string
}) {
  const config = getR2Config()
  const safeFilename = input.filename.replace(/[^A-Za-z0-9._-]/g, "_")
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: input.objectKey,
    ResponseContentDisposition: `attachment; filename="${safeFilename}"`,
  })

  return getSignedUrl(getClient(), command, {
    expiresIn: DOWNLOAD_URL_TTL_SECONDS,
  })
}

export async function headR2Object(objectKey: string) {
  const config = getR2Config()
  return getClient().send(
    new HeadObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
    })
  )
}

export async function deleteR2Object(objectKey: string) {
  const config = getR2Config()
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
    })
  )
}
