import { isRun, isRunList } from '../shared/run-contract.js'

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

async function request(path, options) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`Pipeline API returned ${response.status}`)
  }

  return response.json()
}

export async function getRuns() {
  const payload = await request('/runs')
  if (!isRunList(payload)) {
    throw new Error('Pipeline API returned runs outside the frontend contract')
  }
  return payload
}

export async function createRun(input) {
  const payload = await request('/runs', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!isRun(payload)) {
    throw new Error('Pipeline API returned a run outside the frontend contract')
  }
  return payload
}
