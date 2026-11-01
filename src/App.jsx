import { useEffect, useState } from 'react'
import { createRun, getRuns } from './api.js'
import './App.css'

const stages = [
  { name: 'Unit tests', detail: 'Services · Vitest', icon: '⌘' },
  { name: 'Integration', detail: 'Postgres + Kafka · Testcontainers', icon: '◈' },
  { name: 'Contract', detail: 'Frontend ↔ API · JSON Schema', icon: '⇄' },
  { name: 'Build image', detail: 'Docker · GHCR', icon: '▣' },
  { name: 'Canary release', detail: 'Kubernetes · 25% traffic', icon: '◉' },
]

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function App() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const apiStatus = loading ? 'CONNECTING TO API' : error ? 'API UNAVAILABLE' : 'API CONNECTED'

  async function refreshRuns() {
    try {
      setRuns(await getRuns())
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function loadRuns() {
      try {
        const nextRuns = await getRuns()
        if (active) {
          setRuns(nextRuns)
          setError('')
        }
      } catch (requestError) {
        if (active) setError(requestError.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadRuns()
    const timer = window.setInterval(loadRuns, 10000)
    return () => window.clearInterval(timer)
  }, [])

  async function handleStartRun() {
    setSubmitting(true)
    setError('')
    try {
      await createRun({ branch: 'main', commit: 'manual-trigger' })
      await refreshRuns()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Pulse home">
          <span className="brand-mark"><span /></span>
          <span>pulse<span className="brand-dot">.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switch" type="button">
          <span className="workspace-avatar">P</span>
          pipeline-lab
          <span className="chevron">⌄</span>
        </button>
        <div className="nav-section">BUILD</div>
        <nav aria-label="Main navigation">
          <a className="nav-link active" href="#overview"><span>◫</span> Overview</a>
          <a className="nav-link" href="#runs"><span>⏱</span> Pipeline runs</a>
          <a className="nav-link" href="#quality"><span>◇</span> Quality gates</a>
          <a className="nav-link" href="#deploy"><span>⇧</span> Deployments</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-divider" />
          <a className="nav-link" href="#settings"><span>⚙</span> Settings</a>
          <div className="profile">
            <div className="profile-avatar">L</div>
            <div><strong>Lab workspace</strong><small>CI/CD experiment</small></div>
            <span className="profile-menu">···</span>
          </div>
        </div>
      </aside>

      <section className="main-panel" id="top">
        <header className="topbar">
          <div className="breadcrumbs"><span>pipeline-lab</span><b>/</b><strong>Overview</strong></div>
          <div className="topbar-right">
            <span className="branch-pill"><span className="branch-icon">⑂</span> main</span>
            <span className="avatar-stack"><i>J</i><i>A</i><i>+2</i></span>
            <button className="icon-button" aria-label="Notifications" type="button">♧<span className="notification-dot" /></button>
            <div className="user-avatar">L</div>
          </div>
        </header>

        <div className="content" id="overview">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> RELEASE ENGINEERING</div>
              <h1>Pipeline overview</h1>
              <p className="page-subtitle">Ship with confidence. Every commit, every time.</p>
            </div>
            <button className="primary-button" type="button" onClick={handleStartRun} disabled={submitting}>
              <span className="button-plus">{submitting ? '…' : '+'}</span>
              {submitting ? 'Starting…' : 'Run pipeline'}
            </button>
          </div>

          <section className="pipeline-card" aria-labelledby="pipeline-heading">
            <div className="section-heading">
              <div>
                <div className="card-kicker">AUTOMATION</div>
                <h2 id="pipeline-heading">Your delivery pipeline</h2>
              </div>
              <span className={`active-badge ${error ? 'status-error' : ''}`}><span /> {apiStatus}</span>
            </div>
            <div className="pipeline-flow">
              {stages.map((stage, index) => (
                <div className="stage-wrap" key={stage.name}>
                  <article className={`stage-card ${index === 4 ? 'stage-canary' : ''}`}>
                    <div className="stage-topline"><span className="stage-icon">{stage.icon}</span><span className="stage-check">✓</span></div>
                    <h3>{stage.name}</h3>
                    <p>{stage.detail}</p>
                    <span className="stage-state">{index === 4 ? 'READY TO DEPLOY' : 'CONFIGURED'}</span>
                  </article>
                  {index < stages.length - 1 && <span className="flow-arrow" aria-hidden="true">→</span>}
                </div>
              ))}
            </div>
            <div className="pipeline-footer">
              <span><span className="trigger-icon">↳</span> Triggered on every push to <code>main</code></span>
              <a href="https://docs.github.com/actions" target="_blank" rel="noreferrer">View workflow <span>↗</span></a>
            </div>
          </section>

          <section className="metrics-grid" aria-label="Pipeline metrics">
            <article className="metric-card">
              <div className="metric-label">SUCCESS RATE <span className="metric-symbol green">↗</span></div>
              <div className="metric-value">98.6<span className="metric-unit">%</span></div>
              <div className="metric-caption"><span className="trend-positive">↑ 2.4%</span> vs. last 7 days</div>
              <div className="sparkline green-line"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            </article>
            <article className="metric-card">
              <div className="metric-label">AVG. BUILD TIME <span className="metric-symbol purple">◷</span></div>
              <div className="metric-value">2<span className="metric-unit">m</span> 34<span className="metric-unit">s</span></div>
              <div className="metric-caption"><span className="trend-positive">↓ 18s</span> vs. last 7 days</div>
              <div className="sparkline purple-line"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            </article>
            <article className="metric-card">
              <div className="metric-label">DEPLOYMENTS <span className="metric-symbol orange">⇧</span></div>
              <div className="metric-value">24<span className="metric-unit"> this week</span></div>
              <div className="metric-caption">Across <strong>3 environments</strong></div>
              <div className="sparkline orange-line"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            </article>
            <article className="metric-card quality-card" id="quality">
              <div className="metric-label">QUALITY GATES <span className="metric-symbol blue">◇</span></div>
              <div className="metric-value">4<span className="metric-unit">/4</span></div>
              <div className="metric-caption"><span className="gate-dot" /> All checks passing</div>
              <div className="gate-bars"><i /><i /><i /><i /></div>
            </article>
          </section>

          <section className="runs-panel" id="runs">
            <div className="runs-heading">
              <div>
                <div className="card-kicker">ACTIVITY</div>
                <h2>Recent pipeline runs</h2>
              </div>
              <a className="view-all" href="#runs">View all runs <span>→</span></a>
            </div>
            <div className="runs-table-wrap">
              <table>
                <thead><tr><th>RUN</th><th>COMMIT</th><th>BRANCH</th><th>STATUS</th><th>TRIGGERED</th><th /></tr></thead>
                <tbody>
                  {loading && <tr><td className="empty-row" colSpan="6">Connecting to pipeline API…</td></tr>}
                  {!loading && runs.length === 0 && <tr><td className="empty-row" colSpan="6">{error ? 'Could not load runs.' : 'No runs yet. Start your first pipeline.'}</td></tr>}
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td><span className="run-id"><span className={`run-indicator ${run.status}`} /> #{run.id.slice(0, 7)}</span></td>
                      <td><code>{run.commit}</code></td>
                      <td><span className="table-branch">⑂ {run.branch}</span></td>
                      <td><span className={`status-pill ${run.status}`}>{run.status}</span></td>
                      <td className="time-cell">{formatTime(run.createdAt)}</td>
                      <td className="row-menu">···</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {error && <div className="error-banner" role="alert">{error}</div>}
            <div className="table-footer"><span>Showing latest {runs.length} {runs.length === 1 ? 'run' : 'runs'}</span><span><i className="live-dot" /> Live updates every 10 seconds</span></div>
          </section>

          <footer className="page-footer">
            <span>BUILT FOR BORING DEPLOYMENTS <span className="footer-spark">✳</span></span>
            <span>Pipeline lab <b>·</b> v1.0.0</span>
          </footer>
        </div>
      </section>
    </main>
  )
}

export default App
