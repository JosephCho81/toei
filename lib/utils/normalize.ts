export function normalizeOne<T>(data: T | T[] | null): T | null {
  if (!data) return null
  return Array.isArray(data) ? (data[0] ?? null) : data
}
