import "server-only"

const BUCKET_NAME = "chore-photos"

export const CHORE_PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const CHORE_PHOTO_BUCKET = BUCKET_NAME

const MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const

export type ChorePhotoMime = keyof typeof MIME_EXTENSIONS

export function getChorePhotoExtension(mimeType: string): string | null {
  return MIME_EXTENSIONS[mimeType as ChorePhotoMime] ?? null
}

export function hasValidImageSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value)
  }
  if (mimeType === "image/webp") {
    return bytes.length >= 12
      && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF"
      && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  }
  return false
}

export function isAuthorizedChorePhotoPath(path: string, familyId: string, childId?: string): boolean {
  const prefix = childId ? `${familyId}/${childId}/` : `${familyId}/`
  return path.startsWith(prefix)
    && path.length <= 250
    && !path.includes("..")
    && /^[a-zA-Z0-9/_-]+\.(?:jpg|png|webp)$/.test(path)
}

export function normalizeStoredChorePhotoPath(value: string): string | null {
  if (!value) return null
  if (!value.startsWith("http")) return value

  const marker = `/storage/v1/object/public/${BUCKET_NAME}/`
  try {
    const url = new URL(value)
    const markerIndex = url.pathname.indexOf(marker)
    return markerIndex >= 0 ? decodeURIComponent(url.pathname.slice(markerIndex + marker.length)) : null
  } catch {
    return null
  }
}

export function chorePhotoUrl(path: string): string {
  return `/api/chore-photo?path=${encodeURIComponent(path)}`
}
