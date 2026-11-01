# Pulse · Pipeline lab

A runnable release-engineering experiment with a React dashboard, Node API, PostgreSQL, Kafka, automated tests, Docker Compose, and a Kubernetes canary rollout.

## Run locally

Requirements: Node.js 22, Docker, and Docker Compose.

```sh
npm ci
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). The dashboard loads persisted pipeline runs from the API. **Run pipeline** creates a queued run in PostgreSQL and publishes a `pipeline.run.queued` event to Kafka.

For frontend-only development, start the API and its dependencies with `docker compose up postgres kafka api`, then run `npm run dev`. The Vite development server proxies API requests to the local API port. `npm run dev:api` is available when `DATABASE_URL` and `KAFKA_BROKERS` point at reachable services.

## Test strategy

| Layer | Command | Coverage |
|---|---|---|
| Service unit tests | `npm run test:unit` | Run persistence and event-publishing behavior with fakes |
| API integration tests | `npm run test:integration` | Real PostgreSQL and Kafka using Testcontainers; create/list/input validation |
| Frontend/backend contract | `npm run test:contract` | Frontend requests and responses checked against the shared run contract |
| All tests | `npm test` | Runs all Vitest tests |
| Lint/build | `npm run lint` · `npm run build` | Static checks and production frontend build |

Testcontainers needs Docker available to the test process. CI runs all checks on GitHub-hosted Ubuntu runners.

## GitHub Actions and canary deployment

`.github/workflows/ci-cd.yml` runs lint, unit, contract, PostgreSQL/Kafka integration, and frontend build on pull requests and pushes to `main`. A successful `main` build publishes API and web images to GHCR, starts one canary API replica, waits for readiness, runs a health check, then updates the stable deployment and scales the canary down. The API Service selects both stable and canary pods during this window; with three stable replicas and one canary, the approximate canary share is 25% of requests. This is a replica-weighted experiment, not a strict traffic percentage.

Before enabling the `production` GitHub environment, configure:

1. `KUBECONFIG_BASE64` as an environment secret containing the base64-encoded kubeconfig for the target cluster.
2. Before the first deployment, create namespace `pipeline-lab` and a Kubernetes secret named `pipeline-config` in it with `DATABASE_URL` and `KAFKA_BROKERS`. The target cluster must provide reachable PostgreSQL and Kafka services.
3. An NGINX Ingress controller. Point the ingress host/DNS to its external address.
4. The workflow substitutes the generated GHCR image tags in the Kubernetes manifests; keep the manifest placeholder names unchanged.
5. Grant the cluster access to pull the repository's GHCR packages (for private packages, configure an image pull secret).

The workflow deliberately does not create cloud infrastructure or database/Kafka services; provide those managed or cluster services before deployment. Ensure the `pipeline-events` Kafka topic exists if broker-side topic auto-creation is disabled. `docker compose down -v` removes the local database volume and its stored runs.
