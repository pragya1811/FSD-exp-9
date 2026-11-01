export const runStatuses = ['queued', 'running', 'success', 'failed']

export function isRun(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof value.id === 'string' &&
      typeof value.branch === 'string' &&
      typeof value.commit === 'string' &&
      runStatuses.includes(value.status) &&
      typeof value.createdAt === 'string' &&
      !Number.isNaN(Date.parse(value.createdAt)),
  )
}

export function isRunList(value) {
  return Array.isArray(value) && value.every(isRun)
}
