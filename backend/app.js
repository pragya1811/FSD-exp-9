import express from 'express'
import { isRun } from '../shared/run-contract.js'

export function createApp({ runService, version = 'local' }) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '16kb' }))
  app.use((req, res, next) => {
    res.setHeader('x-release-version', version)
    next()
  })

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', version }))
  app.get('/api/version', (_req, res) => res.json({ version }))

  app.get('/api/runs', async (_req, res, next) => {
    try {
      const runs = await runService.list()
      if (!Array.isArray(runs) || !runs.every(isRun)) {
        return res.status(500).json({ error: 'Run repository returned invalid data' })
      }
      return res.json(runs)
    } catch (error) {
      return next(error)
    }
  })

  app.post('/api/runs', async (req, res, next) => {
    const { branch, commit } = req.body ?? {}
    if (
      typeof branch !== 'string' ||
      !/^[A-Za-z0-9._/-]{1,100}$/.test(branch) ||
      typeof commit !== 'string' ||
      !/^[A-Za-z0-9._-]{1,64}$/.test(commit)
    ) {
      return res.status(400).json({ error: 'branch and commit are required and must be valid strings' })
    }

    try {
      const run = await runService.create({ branch, commit })
      if (!isRun(run)) {
        return res.status(500).json({ error: 'Run service returned invalid data' })
      }
      return res.status(201).json(run)
    } catch (error) {
      return next(error)
    }
  })

  app.use((error, _req, res, _next) => {
    console.error('Pipeline API request failed:', error)
    res.status(500).json({ error: 'Internal server error' })
  })
  return app
}
