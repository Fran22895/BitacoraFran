import type { SupabaseClient } from '@supabase/supabase-js'
import type { DocumentCategory } from '../domain/types'

export const tripDocumentsBucket = 'trip-documents'
const storageUrlPrefix = `storage://${tripDocumentsBucket}/`

function safeFileName(fileName: string) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export function buildTripStoragePath(tripId: string, category: DocumentCategory | 'fotos', fileName: string) {
  return `${tripId}/${category}/${Date.now()}-${safeFileName(fileName)}`
}

export function isStorageFileUrl(fileUrl: string) {
  return fileUrl.startsWith(storageUrlPrefix)
}

export function toStorageFileUrl(path: string) {
  return `${storageUrlPrefix}${path}`
}

export function parseStorageFileUrl(fileUrl: string) {
  if (!isStorageFileUrl(fileUrl)) return null
  return fileUrl.slice(storageUrlPrefix.length)
}

export async function uploadTripFile(
  client: SupabaseClient,
  tripId: string,
  category: DocumentCategory | 'fotos',
  file: File,
) {
  const path = buildTripStoragePath(tripId, category, file.name)
  const { error } = await client.storage.from(tripDocumentsBucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) throw error
  return toStorageFileUrl(path)
}

export async function resolveTripFileUrl(client: SupabaseClient, fileUrl: string, expiresIn = 60 * 60) {
  const path = parseStorageFileUrl(fileUrl)
  if (!path) return fileUrl

  const { data, error } = await client.storage.from(tripDocumentsBucket).createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}
