import { Kafka } from 'kafkajs'
import pg from 'pg'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { KafkaContainer } from '@testcontainers/kafka'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { createApp } from './app.js'
import { createRunService } from './run-service.js'
import { isRun, isRunList } from '../shared/run-contract.js'

const { Pool } = pg
const topic = `pipeline-events-${Date.now()}`
let postgres
let kafkaContainer
let pool
let admin
let producer
let consumer
let app
let kafka

describe('pipeline API with PostgreSQL and Kafka containers', () => {
  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:16-alpine').start()
    kafkaContainer = await new KafkaContainer('confluentinc/cp-kafka:7.6.1').start()
    pool = new Pool({ connectionString: postgres.getConnectionUri() })
    await pool.query(`
      CREATE TABLE pipeline_runs (
        id UUID PRIMARY KEY,
        branch TEXT NOT NULL,
        commit_sha TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'success', 'failed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    kafka = new Kafka({ clientId: 'pipeline-api-test', brokers: [kafkaContainer.getBootstrapServers()] })
    admin = kafka.admin()
    await admin.connect()
    await admin.createTopics({ topics: [{ topic }], waitForLeaders: true })
    producer = kafka.producer()
    consumer = kafka.consumer({ groupId: `pipeline-test-${Date.now()}` })
    await producer.connect()
    await consumer.connect()
    await consumer.subscribe({ topic, fromBeginning: true })
    app = createApp({
      runService: createRunService({
        pool,
        publishEvent: (event) => producer.send({
          topic,
          messages: [{ key: event.run.id, value: JSON.stringify(event) }],
        }),
      }),
      version: 'integration-test',
    })
  }, 180000)

  afterAll(async () => {
    await consumer?.disconnect()
    await producer?.disconnect()
    await admin?.disconnect()
    await pool?.end()
    await Promise.all([postgres?.stop(), kafkaContainer?.stop()])
  }, 60000)

  it('creates a persisted run, publishes its Kafka event, and returns it in the run list', async () => {
    const messages = []
    const consumePromise = consumer.run({
      eachMessage: async ({ message }) => {
        messages.push(JSON.parse(message.value.toString()))
      },
    })
    const response = await request(app)
      .post('/api/runs')
      .send({ branch: 'main', commit: 'abc1234' })

    expect(response.status).toBe(201)
    expect(isRun(response.body)).toBe(true)
    expect(response.body.branch).toBe('main')
    expect(response.headers['x-release-version']).toBe('integration-test')

    await vi.waitFor(() => expect(messages).toContainEqual({
      type: 'pipeline.run.queued',
      run: response.body,
    }), { timeout: 10000 })

    const persisted = await pool.query('SELECT id FROM pipeline_runs WHERE id = $1', [response.body.id])
    expect(persisted.rowCount).toBe(1)
    const listResponse = await request(app).get('/api/runs')
    expect(listResponse.status).toBe(200)
    expect(isRunList(listResponse.body)).toBe(true)
    expect(listResponse.body[0]).toEqual(response.body)
    await consumer.stop()
    await consumePromise
  }, 60000)

  it('rejects invalid input without writing a database row', async () => {
    const response = await request(app)
      .post('/api/runs')
      .send({ branch: 'main; DROP TABLE pipeline_runs', commit: 'abc1234' })

    expect(response.status).toBe(400)
    const result = await pool.query('SELECT count(*)::int AS count FROM pipeline_runs')
    expect(result.rows[0].count).toBe(1)
  })
})
