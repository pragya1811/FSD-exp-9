import { Kafka } from 'kafkajs'
import pg from 'pg'
import { createApp } from './app.js'
import { createRunService } from './run-service.js'

const { Pool } = pg
const port = Number(process.env.PORT || 3000)
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const kafka = new Kafka({
  clientId: 'pipeline-lab-api',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
})
const producer = kafka.producer()

async function start() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id UUID PRIMARY KEY,
      branch TEXT NOT NULL,
      commit_sha TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'success', 'failed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await producer.connect()
  const runService = createRunService({
    pool,
    publishEvent: (event) => producer.send({
      topic: process.env.KAFKA_TOPIC || 'pipeline-events',
      messages: [{ key: event.run.id, value: JSON.stringify(event) }],
    }),
  })
  const app = createApp({ runService, version: process.env.RELEASE_VERSION || 'local' })
  const server = app.listen(port, () => console.log(`Pipeline API listening on ${port}`))

  const shutdown = async () => {
    server.close(async () => {
      await producer.disconnect()
      await pool.end()
      process.exit(0)
    })
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

start().catch(async (error) => {
  console.error('Could not start pipeline API:', error)
  await producer.disconnect().catch(() => {})
  await pool.end()
  process.exitCode = 1
})
