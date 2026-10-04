import { BrowserStorageError } from './browserStorage'

// Compare loaded record contents as an optimistic version. Timestamps alone are
// insufficient: two saves can occur within the same millisecond.
export const recordVersion = (value, excluded = []) => JSON.stringify(value, (key, item) => {
  if (key === 'updatedAt' || excluded.includes(key)) return undefined
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
  }
  return item
})

const conflict = () => {
  throw new BrowserStorageError('Saved data changed since it was loaded.', { code: 'storage_conflict' })
}

// A center owns groups; a group owns plans. Merge each logical record rather
// than replacing the parent snapshot. Deleting a parent checks its full subtree.
export const mergeWorkspaceChanges = (next, baseline, current, children = []) => {
  const before = new Map(baseline.map((row) => [row.id, row]))
  const after = new Map(next.map((row) => [row.id, row]))
  const stored = new Map(current.map((row) => [row.id, row]))
  const childKey = children[0]

  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const oldRow = before.get(id)
    const nextRow = after.get(id)
    const storedRow = stored.get(id)
    if (recordVersion(oldRow) === recordVersion(nextRow)) continue

    if (!oldRow) {
      if (storedRow) conflict()
      stored.set(id, nextRow)
      continue
    }
    if (!nextRow) {
      if (recordVersion(oldRow) !== recordVersion(storedRow)) conflict()
      stored.delete(id)
      continue
    }
    if (!storedRow) conflict()

    const excluded = childKey ? [childKey] : []
    const ownFieldsChanged = recordVersion(oldRow, excluded) !== recordVersion(nextRow, excluded)
    if (ownFieldsChanged && recordVersion(oldRow, excluded) !== recordVersion(storedRow, excluded)) conflict()
    const merged = ownFieldsChanged ? { ...nextRow } : { ...storedRow }
    if (childKey) {
      merged[childKey] = mergeWorkspaceChanges(
        nextRow[childKey] || [], oldRow[childKey] || [], storedRow[childKey] || [], children.slice(1)
      )
    }
    merged.updatedAt = [storedRow.updatedAt, nextRow.updatedAt].filter(Boolean).sort().at(-1)
    stored.set(id, merged)
  }
  return [...stored.values()]
}
