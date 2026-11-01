import { randomUUID } from 'node:crypto'

function serializeRun(row) {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
  }
}

export function createRunService({ pool, publishEvent }) {
  return {
    async create({ branch, commit }) {
      const id = randomUUID()
      const result = await pool.query(
        `INSERT INTO pipeline_runs (id, branch, commit_sha, status)
         VALUES ($1, $2, $3, 'queued')
         RETURNING id, branch, commit_sha AS commit, status, created_at AS "createdAt"`,
        [id, branch, commit],
      )
      const run = serializeRun(result.rows[0])
      await publishEvent({ type: 'pipeline.run.queued', run })
      return run
    },

    async list() {
      const result = await pool.query(
        `SELECT id, branch, commit_sha AS commit, status, created_at AS "createdAt"
         FROM pipeline_runs
         ORDER BY created_at DESC
         LIMIT 50`,
      )
      return result.rows.map(serializeRun)
    },
  }
}
