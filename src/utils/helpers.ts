export const toBoolean = (v: any): boolean => {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const val = v.trim().toLowerCase()
    if (val === 'true' || val === '1') return true
    if (val === 'false' || val === '0' || val === '') return false
    return false
  }
  if (typeof v === 'number') return v === 1
  return Boolean(v)
}
