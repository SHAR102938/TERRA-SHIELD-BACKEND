import { motion } from 'framer-motion'
import { useSimulationStore, useScenarioStore } from '@/stores/appStore'
import { Play, CheckCircle2, Clock, AlertCircle, Loader2, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

const STAGE_ICONS = {
  climate: '🌡️',
  solar: '☀️',
  thermal: '🔥',
  ventilation: '💨',
  comfort: '😊',
  results: '📊',
}

const STAGE_COLORS: Record<string, string> = {
  climate: 'var(--color-climate-500)',
  solar: 'var(--color-solar-500)',
  thermal: 'var(--color-heat-500)',
  ventilation: 'var(--color-structure-500)',
  comfort: 'var(--color-comfort-500)',
  results: 'var(--color-comfort-600)',
}

export default function SimulationConsolePage() {
  const { status, stages, overallProgress, startSimulation, resetSimulation, results } = useSimulationStore()
  const { scenario } = useScenarioStore()

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>Simulation Console</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Run transient thermal simulation for {scenario.location.name} · {scenario.geometry.length}×{scenario.geometry.width}×{scenario.geometry.height}m · 72h
      </p>

      {/* Summary card */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Location', value: scenario.location.name, color: 'var(--color-climate-600)' },
          { label: 'Duration', value: '72 h', color: 'var(--color-solar-600)' },
          { label: 'Timestep', value: '3600 s', color: 'var(--color-structure-500)' },
          { label: 'HVAC Mode', value: scenario.operating.hvac_mode.replace('_', ' '), color: 'var(--color-heat-600)' },
        ].map((item) => (
          <div key={item.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>{item.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 500, color: item.color, marginTop: '0.125rem', textTransform: 'capitalize' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Action button */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        {status === 'idle' && (
          <button className="btn btn-solar" onClick={() => startSimulation(scenario)} style={{ padding: '0.875rem 3rem', fontSize: '1rem' }}>
            <Play size={18} /> Run Simulation
          </button>
        )}
        {status === 'running' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <Loader2 size={20} className="animate-pulse-soft" color="var(--color-solar-500)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--color-solar-600)' }}>
              Simulating… {overallProgress.toFixed(0)}%
            </span>
          </div>
        )}
        {status === 'completed' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-comfort-600)' }}>
              <CheckCircle2 size={20} /> <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>Simulation Complete</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link to={`/scenario/${scenario.id}/results`} className="btn btn-primary">View Results</Link>
              <button className="btn btn-outline" onClick={resetSimulation}>Run Again</button>
            </div>
          </div>
        )}
      </div>

      {/* Overall progress bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pipeline Progress</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{overallProgress.toFixed(0)}%</span>
        </div>
        <div style={{ height: '6px', background: 'var(--color-bg-paper-warm)', borderRadius: '3px', overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, var(--color-climate-500), var(--color-solar-500), var(--color-comfort-500))' }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stage pipeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {stages.map((stage, i) => (
          <motion.div
            key={stage.name}
            initial={{ opacity: 0.5 }}
            animate={{
              opacity: stage.status === 'pending' ? 0.5 : 1,
              scale: stage.status === 'running' ? 1.02 : 1,
            }}
            transition={{ duration: 0.3 }}
            className="card"
            style={{
              display: 'grid', gridTemplateColumns: '2rem 1fr auto',
              alignItems: 'center', gap: '1rem',
              padding: '0.75rem 1rem',
              borderLeft: `3px solid ${STAGE_COLORS[stage.name] || 'var(--color-border)'}`,
              background: stage.status === 'running' ? `${STAGE_COLORS[stage.name]}08` : stage.status === 'completed' ? 'var(--color-comfort-50)' : 'var(--color-bg-card)',
            }}
          >
            <div style={{ fontSize: '1.25rem', textAlign: 'center' }}>
              {STAGE_ICONS[stage.name as keyof typeof STAGE_ICONS] || '⚙️'}
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{stage.label}</div>
              {stage.status === 'running' && (
                <div style={{ height: '3px', background: 'var(--color-bg-paper-warm)', borderRadius: '2px', marginTop: '0.375rem', overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', background: STAGE_COLORS[stage.name], borderRadius: '2px' }}
                    animate={{ width: `${stage.progress}%` }}
                  />
                </div>
              )}
            </div>
            <div>
              {stage.status === 'completed' && <CheckCircle2 size={16} color="var(--color-comfort-500)" />}
              {stage.status === 'running' && <Loader2 size={16} className="animate-pulse-soft" color={STAGE_COLORS[stage.name]} />}
              {stage.status === 'pending' && <Clock size={16} color="var(--color-text-muted)" style={{ opacity: 0.4 }} />}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
