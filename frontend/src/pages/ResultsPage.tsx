import { useSimulationStore, useScenarioStore } from '@/stores/appStore'
import { Link } from 'react-router-dom'
import { AlertTriangle, BarChart3, Flame, Sun, Wind, Thermometer, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ResultsPage() {
  const { results } = useSimulationStore()
  const { scenario } = useScenarioStore()

  if (!results) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <BarChart3 size={48} color="var(--color-text-muted)" style={{ marginBottom: '1rem', opacity: 0.4 }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 500, marginBottom: '0.5rem' }}>No Results Yet</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Run a simulation to see thermal analysis results.</p>
        <Link to={`/scenario/${scenario.id}/simulate`} className="btn btn-solar">Go to Simulation</Link>
      </div>
    )
  }

  const hb = results.heat_balance
  const comfort = results.comfort

  // SVG chart helpers
  function TempChart() {
    const indoor = results.indoor_temp_c
    const outdoor = results.outdoor_temp_c
    const n = indoor.length
    const allTemps = [...indoor, ...outdoor]
    const yMin = Math.floor(Math.min(...allTemps) - 2)
    const yMax = Math.ceil(Math.max(...allTemps) + 2)
    const range = yMax - yMin || 1
    const w = 700, h = 200, pad = 50

    const toPath = (vals: number[]) =>
      vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(pad + (i / (n - 1)) * (w - pad - 10)).toFixed(1)},${(10 + (1 - (v - yMin) / range) * (h - 30)).toFixed(1)}`).join(' ')

    // Comfort band
    const bandTop = 10 + (1 - (scenario.operating.target_temp + scenario.operating.comfort_band - yMin) / range) * (h - 30)
    const bandBot = 10 + (1 - (scenario.operating.target_temp - scenario.operating.comfort_band - yMin) / range) * (h - 30)

    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '220px' }}>
        {/* Comfort band */}
        <rect x={pad} y={bandTop} width={w - pad - 10} height={bandBot - bandTop} fill="var(--color-comfort-100)" opacity="0.5" />
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad} y1={10 + f * (h - 30)} x2={w - 10} y2={10 + f * (h - 30)} stroke="var(--color-border-light)" strokeWidth="0.5" />
        ))}
        {/* Outdoor */}
        <path d={toPath(outdoor)} fill="none" stroke="var(--color-climate-400)" strokeWidth="1.5" strokeDasharray="4,4" />
        {/* Indoor */}
        <path d={toPath(indoor)} fill="none" stroke="var(--color-heat-500)" strokeWidth="2" />
        {/* Labels */}
        <text x="5" y="15" fontSize="8" fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{yMax}°C</text>
        <text x="5" y={h - 15} fontSize="8" fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{yMin}°C</text>
        {/* Legend */}
        <line x1={pad} y1={h - 5} x2={pad + 20} y2={h - 5} stroke="var(--color-heat-500)" strokeWidth="2" />
        <text x={pad + 25} y={h - 2} fontSize="8" fill="var(--color-text-secondary)">Indoor</text>
        <line x1={pad + 80} y1={h - 5} x2={pad + 100} y2={h - 5} stroke="var(--color-climate-400)" strokeWidth="1.5" strokeDasharray="4,4" />
        <text x={pad + 105} y={h - 2} fontSize="8" fill="var(--color-text-secondary)">Outdoor</text>
        <rect x={pad + 170} y={h - 10} width="10" height="10" fill="var(--color-comfort-100)" opacity="0.5" />
        <text x={pad + 185} y={h - 2} fontSize="8" fill="var(--color-text-secondary)">Comfort Band</text>
      </svg>
    )
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>Simulation Results</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            {scenario.location.name} · {results.indoor_temp_c.length}h transient simulation
          </p>
        </div>
      </div>

      {/* Hero metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Comfort Hours', value: `${comfort.comfort_percentage}`, unit: '%', color: 'var(--color-comfort-600)', icon: CheckCircle2 },
          { label: 'Heating Energy', value: `${hb.heating_energy_kwh}`, unit: 'kWh', color: 'var(--color-heat-600)', icon: Flame },
          { label: 'Peak Heating', value: `${results.peak_heating_load_w}`, unit: 'W', color: 'var(--color-solar-600)', icon: Thermometer },
          { label: 'PMV Mean', value: `${comfort.pmv_mean}`, unit: '', color: 'var(--color-structure-600)', icon: BarChart3 },
        ].map((m) => {
          const Icon = m.icon
          return (
            <motion.div key={m.label} className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
                <Icon size={14} color={m.color} />
                <span style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>{m.label}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 600, color: m.color }}>
                {m.value}<span className="data-unit">{m.unit}</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Thermal response chart */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h5 style={{ marginBottom: '0.75rem', color: 'var(--color-heat-600)' }}>Thermal Response — Indoor vs Outdoor Temperature</h5>
        <TempChart />
      </div>

      {/* Heat balance */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h5 style={{ marginBottom: '1rem', color: 'var(--color-solar-600)' }}>Heat Balance Breakdown</h5>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Heat Losses</div>
            {[
              { label: 'Walls', value: hb.conduction_walls_kwh, color: 'var(--color-heat-500)' },
              { label: 'Roof', value: hb.conduction_roof_kwh, color: 'var(--color-heat-400)' },
              { label: 'Floor', value: hb.conduction_floor_kwh, color: 'var(--color-heat-600)' },
              { label: 'Windows', value: hb.conduction_windows_kwh, color: 'var(--color-structure-500)' },
              { label: 'Ventilation', value: hb.ventilation_kwh, color: 'var(--color-climate-500)' },
            ].map((item) => {
              const maxVal = Math.max(hb.conduction_walls_kwh, hb.ventilation_kwh, hb.conduction_windows_kwh, 1)
              return (
                <div key={item.label} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                    <span>{item.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{item.value} kWh</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--color-bg-paper-warm)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(item.value / maxVal) * 100}%`, background: item.color, borderRadius: '3px' }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Heat Gains</div>
            {[
              { label: 'Solar Gain', value: hb.solar_gain_kwh, color: 'var(--color-solar-500)' },
              { label: 'Internal Gains', value: hb.internal_gain_kwh, color: 'var(--color-solar-400)' },
              { label: 'Heating Energy', value: hb.heating_energy_kwh, color: 'var(--color-heat-500)' },
            ].map((item) => {
              const maxVal = Math.max(hb.heating_energy_kwh, hb.internal_gain_kwh, hb.solar_gain_kwh, 1)
              return (
                <div key={item.label} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                    <span>{item.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{item.value} kWh</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--color-bg-paper-warm)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(item.value / maxVal) * 100}%`, background: item.color, borderRadius: '3px' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Comfort analysis */}
      <div className="card">
        <h5 style={{ marginBottom: '1rem', color: 'var(--color-comfort-600)' }}>Comfort Analysis</h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[
            { label: 'Comfort Hours', value: `${comfort.comfort_hours}/${comfort.total_hours}`, sub: `${comfort.comfort_percentage}%`, color: 'var(--color-comfort-600)' },
            { label: 'Hours Below', value: `${comfort.hours_below_comfort}`, sub: 'Too cold', color: 'var(--color-climate-500)' },
            { label: 'Hours Above', value: `${comfort.hours_above_comfort}`, sub: 'Too warm', color: 'var(--color-heat-500)' },
          ].map((m) => (
            <div key={m.label} style={{ textAlign: 'center', padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-paper-warm)' }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>{m.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 600, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
