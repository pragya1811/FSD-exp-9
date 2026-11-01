import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRun, getRuns } from './api.js'
import { isRun, isRunList } from '../shared/run-contract.js'

const validRun = {
  id: 'run-123',
  branch: 'main',
  commit: 'abc1234',
  status: 'queued',
  createdAt: '2026-01-15T10:00:00.000Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('frontend/backend API contract', () => {
  it('accepts a run payload produced by the API', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [validRun],
    })
    vi.stubGlobal('fetch', fetch)

    await expect(getRuns()).resolves.toEqual([validRun])
    expect(fetch).toHaveBeenCalledWith('/api/runs', {
      headers: { 'content-type': 'application/json' },
    })
  })

  it('sends the documented create-run request and validates the response', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validRun,
    })
    vi.stubGlobal('fetch', fetch)

    await expect(createRun({ branch: 'main', commit: 'abc1234' })).resolves.toEqual(validRun)
    expect(fetch).toHaveBeenCalledWith('/api/runs', {
      headers: { 'content-type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ branch: 'main', commit: 'abc1234' }),
    })
  })

  it('rejects payloads that do not match the shared API contract', async () => {
    expect(isRun({ ...validRun, status: 'deployed' })).toBe(false)
    expect(isRunList([validRun, { ...validRun, createdAt: 'not-a-date' }])).toBe(false)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ ...validRun, status: 'deployed' }],
    }))
    await expect(getRuns()).rejects.toThrow('outside the frontend contract')
  })
})
