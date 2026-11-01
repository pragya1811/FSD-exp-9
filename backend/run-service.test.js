import { describe, expect, it, vi } from 'vitest'
import { createRunService } from './run-service.js'

describe('run service', () => {
  it('persists and publishes a queued run', async () => {
    const run = {
      id: 'run-1',
      branch: 'main',
      commit: 'abc1234',
      status: 'queued',
      createdAt: '2026-01-15T10:00:00.000Z',
    }
    const pool = { query: vi.fn().mockResolvedValue({ rows: [run] }) }
    const publishEvent = vi.fn().mockResolvedValue(undefined)
    const service = createRunService({ pool, publishEvent })

    await expect(service.create({ branch: 'main', commit: 'abc1234' })).resolves.toEqual(run)
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO pipeline_runs'), [
      expect.any(String),
      'main',
      'abc1234',
    ])
    expect(publishEvent).toHaveBeenCalledWith({ type: 'pipeline.run.queued', run })
  })

  it('returns recent runs from the repository', async () => {
    const runs = [{
      id: 'run-1',
      branch: 'main',
      commit: 'abc1234',
      status: 'queued',
      createdAt: '2026-01-15T10:00:00.000Z',
    }]
    const pool = { query: vi.fn().mockResolvedValue({ rows: runs }) }
    const service = createRunService({ pool, publishEvent: vi.fn() })

    await expect(service.list()).resolves.toEqual(runs)
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY created_at DESC'))
  })

  it('propagates persistence and event publishing failures', async () => {
    const pool = { query: vi.fn().mockRejectedValue(new Error('database unavailable')) }
    const service = createRunService({ pool, publishEvent: vi.fn() })

    await expect(service.create({ branch: 'main', commit: 'abc1234' })).rejects.toThrow('database unavailable')
  })
})
