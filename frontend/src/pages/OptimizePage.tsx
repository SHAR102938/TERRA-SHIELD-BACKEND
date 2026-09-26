import { useState } from 'react'
import { Play, Info, Award, AlertTriangle, TrendingUp, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useScenarioStore } from '@/stores/appStore'
import { runOptimization, type OptimizeResponse, type CandidateResult } from '@/lib/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_MATERIAL_IDS = [1, 2, 3, 4, 5, 6]
const MATERIAL_LABELS: Record<number, string> = {
  1: 'Insulated Fabric',
  2: 'PU Foam',
  3: 'Rock Wool',
  4: 'Fiberglass',
  5: 'Aluminium',
  6: 'Concrete',
}

const DEFAULT_WEIGHTS = { comfort: 40, energy: 30, weight: 15, cost: 15 }
const THICKNESS_PRESETS = [0.05, 0.10, 0.15, 0.20]
const ROOF_PITCH_PRESETS = [5, 15, 30]

// ── Helpers ───────────────────────────────────────────────────────────────────

function ScoreBar({ value, color = '#3b82f6' }: { value: number; color?: string }) {
  return (
    <div style={{ height: '6px', borderRadius: '3px', background: 'var(--color-border)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, background: color, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function WeightSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
        <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{value}</span>
      </div>
      <input type="range" min={0} max={100} step={5} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--color-heat-500)' }} />
    </div>
  )
}

function CandidateCard({ c, isTop }: { c: CandidateResult; isTop: boolean }) {
  const [open, setOpen] = useState(false)
  const bgColor = !c.feasible ? 'rgba(239,68,68,0.05)' : isTop ? 'rgba(34,197,94,0.08)' : 'var(--color-bg-paper)'
  const borderColor = !c.feasible ? 'rgba(239,68,68,0.3)' : isTop ? 'rgba(34,197,94,0.4)' : 'var(--color-border)'

  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 'var(--radius-md)', background: bgColor, marginBottom: '0.625rem', overflow: 'hidden' }}>
      {/* Header row */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '2rem 1fr 1fr 1fr 1fr auto', gap: '0.75rem', padding: '0.75rem 1rem', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        {/* Rank */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 700, color: c.feasible ? 'var(--color-heat-500)' : 'var(--color-text-muted)' }}>
          {c.feasible ? `#${c.rank}` : '—'}
        </div>

        {/* Material + geometry */}
        <div>
          <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{c.material_name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {(c.geometry.roof_pitch || 15)}° pitch · {((c as any).material?.thickness * 100 || (c.metrics.total_weight_kg / 100 / 1).toFixed(0))}cm
          </div>
        </div>

        {/* Comfort % */}
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Comfort</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: c.metrics.comfort_percentage >= 30 ? '#22c55e' : '#ef4444' }}>
            {c.metrics.comfort_percentage.toFixed(1)}%
          </div>
        </div>

        {/* Weight */}
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Weight</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>{c.metrics.total_weight_kg.toFixed(0)} kg</div>
        </div>

        {/* Cost */}
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Cost</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>${c.metrics.total_cost_usd.toFixed(0)}</div>
        </div>

        {/* Final score + feasibility */}
        <div style={{ textAlign: 'right' }}>
          {c.feasible
            ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-heat-500)' }}>{c.final_score?.toFixed(1)}</span>
            : <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>INFEASIBLE</span>}
          <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>{c.feasible ? 'score' : c.error ? c.error.slice(0, 30) : 'comfort too low'}</div>
        </div>
      </div>

      {/* Score breakdown */}
      {open && c.feasible && c.normalized_scores && (
        <div style={{ padding: '0 1rem 1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {(['comfort', 'energy', 'weight', 'cost'] as const).map(k => (
            <div key={k}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                <span style={{ textTransform: 'capitalize', color: 'var(--color-text-secondary)' }}>{k}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{c.normalized_scores[k]?.toFixed(1)}</span>
              </div>
              <ScoreBar value={c.normalized_scores[k] ?? 0} color={k === 'comfort' ? '#22c55e' : k === 'energy' ? '#3b82f6' : k === 'weight' ? '#a855f7' : '#f59e0b'} />
            </div>
          ))}
          <div style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <span>Min Indoor: <b>{c.thermal_summary?.min_indoor_temperature?.toFixed(1)}°C</b></span>
            <span>Max Indoor: <b>{c.thermal_summary?.max_indoor_temperature?.toFixed(1)}°C</b></span>
            <span>Avg Indoor: <b>{c.thermal_summary?.average_indoor_temperature?.toFixed(1)}°C</b></span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Scatter Plot (Comfort vs X) ───────────────────────────────────────────────
function TradeoffPlot({
  candidates,
  xKey,
  xLabel,
  yLabel = 'Comfort %',
}: {
  candidates: CandidateResult[]
  xKey: keyof CandidateResult['metrics']
  xLabel: string
  yLabel?: string
}) {
  const feasible = candidates.filter(c => c.feasible)
  if (!feasible.length) return null

  const xs = feasible.map(c => c.metrics[xKey] as number)
  const ys = feasible.map(c => c.metrics.comfort_percentage)
  const xMin = Math.min(...xs), xMax = Math.max(...xs)
  const yMin = Math.min(...ys), yMax = Math.max(...ys)
  const pad = 40
  const W = 400, H = 200

  const toX = (v: number) => pad + ((v - xMin) / (xMax - xMin + 1e-9)) * (W - 2 * pad)
  const toY = (v: number) => H - pad - ((v - yMin) / (yMax - yMin + 1e-9)) * (H - 2 * pad)

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {/* Axes */}
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--color-border)" strokeWidth={1} />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="var(--color-border)" strokeWidth={1} />
      {/* Labels */}
      <text x={W / 2} y={H - 6} textAnchor="middle" fill="var(--color-text-muted)" fontSize={10}>{xLabel}</text>
      <text x={12} y={H / 2} textAnchor="middle" fill="var(--color-text-muted)" fontSize={10} transform={`rotate(-90,12,${H / 2})`}>{yLabel}</text>
      {/* Points */}
      {feasible.map((c, i) => {
        const cx = toX(c.metrics[xKey] as number)
        const cy = toY(c.metrics.comfort_percentage)
        const isTop = c.rank === 1
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={isTop ? 7 : 5}
              fill={isTop ? '#f59e0b' : '#3b82f6'} opacity={0.8} />
            {isTop && <circle cx={cx} cy={cy} r={10} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3,2" />}
          </g>
        )
      })}
    </svg>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OptimizePage() {
  const { scenario } = useScenarioStore()

  // Controls state
  const [weights, setWeights] = useState({ ...DEFAULT_WEIGHTS })
  const [selectedMaterials, setSelectedMaterials] = useState<number[]>(ALL_MATERIAL_IDS)
  const [thicknesses, setThicknesses] = useState<number[]>(THICKNESS_PRESETS)
  const [roofPitches, setRoofPitches] = useState<number[]>(ROOF_PITCH_PRESETS)
  const [comfortBand, setComfortBand] = useState(2)
  const [simHours, setSimHours] = useState(72)

  // Results state
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OptimizeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'rank' | 'tradeoff'>('rank')

  const totalWeight = weights.comfort + weights.energy + weights.weight + weights.cost

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await runOptimization({
        geometry: {
          length: scenario.geometry.length,
          width:  scenario.geometry.width,
          height: scenario.geometry.height,
        },
        location: {
          latitude:  scenario.location.latitude,
          longitude: scenario.location.longitude,
        },
        operating: {
          target_temperature:         scenario.operating.target_temp,
          initial_indoor_temperature: scenario.operating.target_temp,
          occupants:                  scenario.operating.occupants,
          heat_per_person:            scenario.operating.heat_per_person ?? 50,
          air_changes_per_hour:       scenario.operating.ach_natural + scenario.operating.ach_infiltration,
        },
        comfort_band:     comfortBand,
        simulation_hours: simHours,
        param_ranges: {
          material_ids: selectedMaterials,
          thicknesses,
          roof_pitches: roofPitches,
        },
        weights,
      })
      setResult(res)
    } catch (e: any) {
      setError(e.message || 'Optimization failed')
    } finally {
      setLoading(false)
    }
  }

  const feasible = result?.ranked_candidates.filter(c => c.feasible) ?? []
  const infeasible = result?.ranked_candidates.filter(c => !c.feasible) ?? []
  const best = feasible[0] ?? null

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>

      {/* ── Left: Controls ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '1rem' }}>Location & Geometry</h3>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <div>📍 {scenario.location.name}</div>
            <div>📐 {scenario.geometry.length}m × {scenario.geometry.width}m × {scenario.geometry.height}m</div>
            <div>🌡️ Target: {scenario.operating.target_temp}°C</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '1rem' }}>Materials to Test</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {ALL_MATERIAL_IDS.map(id => {
              const selected = selectedMaterials.includes(id)
              return (
                <button key={id}
                  onClick={() => setSelectedMaterials(prev => selected ? prev.filter(x => x !== id) : [...prev, id])}
                  className={selected ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}>
                  {MATERIAL_LABELS[id]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '1rem' }}>Thickness Variants (m)</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[0.05, 0.10, 0.15, 0.20, 0.25, 0.30].map(t => {
              const sel = thicknesses.includes(t)
              return (
                <button key={t}
                  onClick={() => setThicknesses(prev => sel ? prev.filter(x => x !== t) : [...prev, t])}
                  className={sel ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}>
                  {(t * 100).toFixed(0)}cm
                </button>
              )
            })}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '1rem' }}>Roof Pitch Variants (°)</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[5, 15, 30, 45].map(p => {
              const sel = roofPitches.includes(p)
              return (
                <button key={p}
                  onClick={() => setRoofPitches(prev => sel ? prev.filter(x => x !== p) : [...prev, p])}
                  className={sel ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}>
                  {p}°
                </button>
              )
            })}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', margin: 0 }}>Scoring Weights</h3>
            <div title="Weights are configurable. Feasibility (comfort ≥ threshold) is always checked first." style={{ cursor: 'help' }}>
              <Info size={14} color="var(--color-text-muted)" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <WeightSlider label="Thermal Comfort" value={weights.comfort} onChange={v => setWeights(w => ({ ...w, comfort: v }))} />
            <WeightSlider label="Energy Efficiency" value={weights.energy} onChange={v => setWeights(w => ({ ...w, energy: v }))} />
            <WeightSlider label="Shelter Weight" value={weights.weight} onChange={v => setWeights(w => ({ ...w, weight: v }))} />
            <WeightSlider label="Material Cost" value={weights.cost}   onChange={v => setWeights(w => ({ ...w, cost: v }))} />
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            Total: {totalWeight} — normalised before scoring
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Comfort Band (±°C)</label>
              <input type="number" className="input" value={comfortBand} min={0.5} max={10} step={0.5}
                onChange={e => setComfortBand(Number(e.target.value))} style={{ width: '100%', marginTop: '0.25rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Simulation Hours</label>
              <input type="number" className="input" value={simHours} min={24} max={168} step={24}
                onChange={e => setSimHours(Number(e.target.value))} style={{ width: '100%', marginTop: '0.25rem' }} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Candidates: <b>{selectedMaterials.length} materials × {thicknesses.length} thicknesses × {roofPitches.length} pitches = {selectedMaterials.length * thicknesses.length * roofPitches.length}</b>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleRun} disabled={loading || selectedMaterials.length === 0}>
            {loading ? <><Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />Running Optimization…</> : <><Play size={16} style={{ marginRight: '0.5rem' }} />Run Optimization</>}
          </button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div>
        {error && (
          <div className="card" style={{ padding: '1rem', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.05)', marginBottom: '1rem' }}>
            <AlertTriangle size={16} color="#ef4444" style={{ marginRight: '0.5rem', display: 'inline' }} />
            <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</span>
          </div>
        )}

        {!result && !loading && (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <TrendingUp size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontSize: '0.9375rem' }}>Configure parameters and click <b>Run Optimization</b></p>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
              The optimizer will run deterministic grid search across all candidate configurations,
              apply the feasibility filter, then rank by weighted score.
            </p>
          </div>
        )}

        {result && (
          <>
            {/* Meta banner */}
            <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { label: 'Candidates Tested', value: result.meta.total_candidates },
                { label: 'Feasible', value: result.meta.feasible_count, color: '#22c55e' },
                { label: 'Infeasible', value: result.meta.infeasible_count, color: '#ef4444' },
                { label: 'Runtime', value: `${result.meta.runtime_seconds}s` },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.label}</div>
                  <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: (item as any).color || 'var(--color-text-primary)' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Best candidate highlight */}
            {best && (
              <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem', border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Award size={18} color="#22c55e" />
                  <span style={{ fontWeight: 600, color: '#22c55e' }}>Highest-ranked feasible configuration</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', fontSize: '0.8125rem' }}>
                  <div><div style={{ color: 'var(--color-text-muted)' }}>Material</div><b>{best.material_name}</b></div>
                  <div><div style={{ color: 'var(--color-text-muted)' }}>Comfort</div><b>{best.metrics.comfort_percentage.toFixed(1)}%</b></div>
                  <div><div style={{ color: 'var(--color-text-muted)' }}>Weight</div><b>{best.metrics.total_weight_kg.toFixed(0)} kg</b></div>
                  <div><div style={{ color: 'var(--color-text-muted)' }}>Cost</div><b>${best.metrics.total_cost_usd.toFixed(0)}</b></div>
                  <div><div style={{ color: 'var(--color-text-muted)' }}>Final Score</div><b style={{ color: 'var(--color-heat-500)' }}>{best.final_score?.toFixed(1)}</b></div>
                </div>

                {/* Scoring methodology note */}
                <details style={{ marginTop: '0.75rem' }}>
                  <summary style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                    How is the score calculated?
                  </summary>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', lineHeight: 1.6 }}>
                    {result.meta.scoring_methodology}<br />
                    <b>Weights used:</b> Comfort {result.meta.weights_used.comfort} · Energy {result.meta.weights_used.energy} · Weight {result.meta.weights_used.weight} · Cost {result.meta.weights_used.cost}<br />
                    <b>Feasibility threshold:</b> ≥{result.meta.feasibility_threshold_pct}% hours in comfort band.
                  </p>
                </details>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {['rank', 'tradeoff'].map(tab => (
                <button key={tab} className={activeTab === tab ? 'btn btn-primary' : 'btn btn-outline'}
                  onClick={() => setActiveTab(tab as any)} style={{ textTransform: 'capitalize', fontSize: '0.8125rem' }}>
                  {tab === 'rank' ? 'Ranked Configurations' : 'Trade-off Charts'}
                </button>
              ))}
            </div>

            {activeTab === 'rank' && (
              <div>
                {feasible.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <CheckCircle size={14} color="#22c55e" />
                      <span style={{ fontSize: '0.8125rem', color: '#22c55e', fontWeight: 600 }}>Feasible ({feasible.length})</span>
                    </div>
                    {feasible.map(c => <CandidateCard key={c.candidate_id} c={c} isTop={c.rank === 1} />)}
                  </div>
                )}
                {infeasible.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <XCircle size={14} color="#ef4444" />
                      <span style={{ fontSize: '0.8125rem', color: '#ef4444', fontWeight: 600 }}>Infeasible – comfort too low ({infeasible.length})</span>
                    </div>
                    {infeasible.map(c => <CandidateCard key={c.candidate_id} c={c} isTop={false} />)}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tradeoff' && feasible.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Comfort vs Energy Loss</div>
                  <TradeoffPlot candidates={result.ranked_candidates} xKey="energy_loss_wh" xLabel="Energy Loss (Wh)" />
                </div>
                <div className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Comfort vs Weight</div>
                  <TradeoffPlot candidates={result.ranked_candidates} xKey="total_weight_kg" xLabel="Weight (kg)" />
                </div>
                <div className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Comfort vs Cost</div>
                  <TradeoffPlot candidates={result.ranked_candidates} xKey="total_cost_usd" xLabel="Cost (USD)" />
                </div>
                <div className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Cost vs Weight</div>
                  <TradeoffPlot candidates={result.ranked_candidates} xKey="total_cost_usd" xLabel="Cost (USD)" yLabel="Comfort %" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
