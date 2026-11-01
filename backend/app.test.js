import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from './app.js'

const run = {
  id: 'run-123',
  branch: 'main',
  commit: 'abc1234',
  status: 'queued',
  createdAt: '2026-01-15T10:00:00.000Z',
}

describe('pipeline API routes', () => {
  it('returns runs that match the shared frontend contract', async () => {
    const app = createApp({
      runService: { list: vi.fn().mockResolvedValue([run]) },
      version: 'test-release',
    })

    const response = await request(app).get('/api/runs')

    expect(response.status).toBe(200)
    expect(response.headers['x-release-version']).toBe('test-release')
    expect(response.body).toEqual([run])
  })

  it('creates valid runs and rejects invalid requests before calling the service', async () => {
    const runService = {
      create: vi.fn().mockResolvedValue(run),
      list: vi.fn(),
    }
    const app = createApp({ runService })

    const validResponse = await request(app)
      .post('/api/runs')
      .send({ branch: 'main', commit: 'abc1234' })
    expect(validResponse.status).toBe(201)
    expect(validResponse.body).toEqual(run)
    expect(runService.create).toHaveBeenCalledWith({ branch: 'main', commit: 'abc1234' })

    const invalidResponse = await request(app)
      .post('/api/runs')
      .send({ branch: 'main; drop table pipeline_runs', commit: 'abc1234' })
    expect(invalidResponse.status).toBe(400)
    expect(runService.create).toHaveBeenCalledTimes(1)
  })
})
