import { useState } from 'react'
import { Play, Info, Award, AlertTriangle, TrendingUp, CheckCircle, XCircle, Loader2, Download, Filter, Droplets, Fuel } from 'lucide-react'
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

const DEFAULT_WEIGHTS = { comfort: 35, energy: 20, fuel: 20, weight: 15, cost: 10 }
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
  const isFlagged = Boolean(c.is_flagged)
  const isPareto = Boolean(c.is_pareto)

  let bgColor = 'var(--color-bg-paper)'
  let borderColor = 'var(--color-border)'

  if (!c.feasible) {
    bgColor = 'rgba(239,68,68,0.05)'
    borderColor = 'rgba(239,68,68,0.3)'
  } else if (isFlagged) {
    bgColor = 'rgba(245,158,11,0.06)'
    borderColor = 'rgba(245,158,11,0.35)'
  } else if (isTop) {
    bgColor = 'rgba(34,197,94,0.08)'
    borderColor = 'rgba(34,197,94,0.4)'
  }

  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 'var(--radius-md)', background: bgColor, marginBottom: '0.625rem', overflow: 'hidden' }}>
      {/* Header row */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '2.5rem 1.4fr 1fr 1fr 1fr 1fr auto', gap: '0.5rem', padding: '0.75rem 1rem', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        {/* Rank & Pareto */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 700, color: c.feasible ? 'var(--color-heat-500)' : 'var(--color-text-muted)' }}>
          {c.feasible ? `#${c.rank}` : '—'}
          {isPareto && <div style={{ fontSize: '0.5625rem', color: '#f59e0b', fontWeight: 800, marginTop: '2px' }}>PARETO</div>}
        </div>

        {/* Material + geometry */}
        <div>
          <div style={{ fontWeight: 500, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>{c.material_name}</span>
            {isFlagged && (
              <span title="Flagged: Requires secondary engineering review" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <AlertTriangle size={13} color="#f59e0b" />
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span>{(c.geometry.roof_pitch || 15)}° pitch</span>
            <span>·</span>
            <span>{((c as any).material?.thickness ? ((c as any).material.thickness * 100).toFixed(0) : '15')}cm</span>
            {isFlagged && (
              <span style={{ color: '#d97706', fontWeight: 600, fontSize: '0.6875rem' }}>[Flagged Review]</span>
            )}
          </div>
        </div>

        {/* Comfort % */}
        <div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Comfort</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600, color: c.metrics.comfort_percentage >= 75 ? '#22c55e' : c.metrics.comfort_percentage >= 50 ? '#f59e0b' : '#ef4444' }}>
            {c.metrics.comfort_percentage.toFixed(1)}%
          </div>
        </div>

        {/* Fuel Liters */}
        <div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Fuel (L)</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-heat-600)' }}>
            {(c.metrics.fuel_liters ?? 0).toFixed(1)} L
          </div>
        </div>

        {/* Weight */}
        <div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Weight</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{c.metrics.total_weight_kg.toFixed(0)} kg</div>
        </div>

        {/* Cost */}
        <div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Cost</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>${c.metrics.total_cost_usd.toFixed(0)}</div>
        </div>

        {/* Final score + feasibility */}
        <div style={{ textAlign: 'right' }}>
          {c.feasible
            ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-heat-500)' }}>{c.final_score?.toFixed(1)}</span>
            : <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>INFEASIBLE</span>}
          <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>{c.feasible ? 'score' : c.error ? c.error.slice(0, 25) : 'comfort < 30%'}</div>
        </div>
      </div>

      {/* Score breakdown */}
      {open && c.feasible && c.normalized_scores && (
        <div style={{ padding: '0 1rem 1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {(['comfort', 'energy', 'fuel', 'weight', 'cost'] as const).map(k => (
            <div key={k}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                <span style={{ textTransform: 'capitalize', color: 'var(--color-text-secondary)' }}>{k}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{c.normalized_scores[k]?.toFixed(1) ?? '—'}</span>
              </div>
              <ScoreBar
                value={c.normalized_scores[k] ?? 0}
                color={k === 'comfort' ? '#22c55e' : k === 'energy' ? '#3b82f6' : k === 'fuel' ? '#ef4444' : k === 'weight' ? '#a855f7' : '#f59e0b'}
              />
            </div>
          ))}

          {/* Justification & Flagged Review Details */}
          {c.justification && (
            <div style={{
              gridColumn: '1/-1',
              marginTop: '0.5rem',
              padding: '0.625rem 0.75rem',
              background: isFlagged ? 'rgba(245,158,11,0.08)' : 'var(--color-bg-paper-warm)',
              borderRadius: 'var(--radius-sm)',
              border: isFlagged ? '1px solid rgba(245,158,11,0.3)' : '1px solid var(--color-border)'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isFlagged ? '#d97706' : 'var(--color-text-secondary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {isFlagged ? <AlertTriangle size={13} color="#d97706" /> : <Info size={13} />}
                {isFlagged ? 'Borderline / Flagged Trade-Off (Manual Review)' : 'Engineering Justification'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{c.justification}</div>
              {c.thermal_summary?.condensation_risk && (
                <div style={{ marginTop: '0.35rem', fontSize: '0.6875rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Droplets size={12} />
                  <span>Condensation hazard: inner surface drops to {c.thermal_summary.min_inner_surface_temp_c}°C (dew point {c.thermal_summary.dew_point_c}°C).</span>
                </div>
              )}
            </div>
          )}

          <div style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <span>Min Indoor: <b>{c.thermal_summary?.min_indoor_temperature?.toFixed(1)}°C</b></span>
            <span>Max Indoor: <b>{c.thermal_summary?.max_indoor_temperature?.toFixed(1)}°C</b></span>
            <span>Avg Indoor: <b>{c.thermal_summary?.average_indoor_temperature?.toFixed(1)}°C</b></span>
            <span>CO Risk Score: <b>{c.metrics.co_risk_score ?? 0}/100</b></span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Scatter Plot (Comfort vs Metric) ──────────────────────────────────────────
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

  const xs = feasible.map(c => (c.metrics[xKey] as number) || 0)
  const ys = feasible.map(c => c.metrics.comfort_percentage)
  const xMin = Math.min(...xs), xMax = Math.max(...xs)
  const yMin = Math.min(...ys), yMax = Math.max(...ys)
  const pad = 40
  const W = 420, H = 210

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
        const cx = toX((c.metrics[xKey] as number) || 0)
        const cy = toY(c.metrics.comfort_percentage)
        const isTop = c.rank === 1
        const isPareto = Boolean(c.is_pareto)
        return (
          <g key={i}>
            <circle
              cx={cx} cy={cy}
              r={isTop ? 7 : isPareto ? 5.5 : 4}
              fill={isTop ? '#22c55e' : isPareto ? '#f59e0b' : '#3b82f6'}
              opacity={isPareto ? 0.95 : 0.65}
            />
            {isTop && <circle cx={cx} cy={cy} r={11} fill="none" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="3,2" />}
            {isPareto && !isTop && <circle cx={cx} cy={cy} r={8} fill="none" stroke="#f59e0b" strokeWidth={1} />}
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
  const [candidateFilter, setCandidateFilter] = useState<'all' | 'feasible' | 'flagged' | 'infeasible'>('all')

  const totalWeight = weights.comfort + weights.energy + weights.fuel + weights.weight + weights.cost

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

  const handleExportCSV = () => {
    if (!result?.ranked_candidates.length) return
    const headers = [
      'Rank', 'Candidate ID', 'Material', 'Roof Pitch (deg)',
      'Feasible', 'Flagged For Review', 'Pareto Frontier',
      'Comfort (%)', 'Energy Loss (Wh)', 'Fuel Consumed (L)', 'CO Risk Score',
      'Total Weight (kg)', 'Total Cost (USD)', 'Final Score', 'Justification'
    ]
    const rows = result.ranked_candidates.map(c => [
      c.rank ?? 'N/A',
      c.candidate_id,
      `"${c.material_name}"`,
      c.geometry.roof_pitch ?? 15,
      c.feasible ? 'YES' : 'NO',
      c.is_flagged ? 'YES' : 'NO',
      c.is_pareto ? 'YES' : 'NO',
      c.metrics.comfort_percentage,
      c.metrics.energy_loss_wh,
      c.metrics.fuel_liters ?? 0,
      c.metrics.co_risk_score ?? 0,
      c.metrics.total_weight_kg,
      c.metrics.total_cost_usd,
      c.final_score ?? '',
      `"${(c.justification || '').replace(/"/g, '""')}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `TERRA_SHIELD_optimization_pareto_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const allCandidates = result?.ranked_candidates ?? []
  const feasible = allCandidates.filter(c => c.feasible)
  const flagged = allCandidates.filter(c => c.is_flagged)
  const infeasible = allCandidates.filter(c => !c.feasible)
  const paretoCount = allCandidates.filter(c => c.is_pareto).length
  const best = feasible[0] ?? null

  const displayedCandidates = allCandidates.filter(c => {
    if (candidateFilter === 'feasible') return c.feasible
    if (candidateFilter === 'flagged') return c.is_flagged
    if (candidateFilter === 'infeasible') return !c.feasible
    return true
  })

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>

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
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', margin: 0 }}>Pareto Objectives & Weights</h3>
            <div title="Configurable weights for multi-objective optimization (Comfort vs Fuel vs Weight vs Cost). Feasibility and Pareto dominance are evaluated natively." style={{ cursor: 'help' }}>
              <Info size={14} color="var(--color-text-muted)" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <WeightSlider label="Thermal Comfort" value={weights.comfort} onChange={v => setWeights(w => ({ ...w, comfort: v }))} />
            <WeightSlider label="Energy Efficiency" value={weights.energy} onChange={v => setWeights(w => ({ ...w, energy: v }))} />
            <WeightSlider label="Fuel / Kerosene" value={weights.fuel} onChange={v => setWeights(w => ({ ...w, fuel: v }))} />
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
            <p style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Multi-Objective Pareto Optimizer</p>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem', lineHeight: 1.6, maxWidth: '480px', margin: '0.5rem auto 0' }}>
              Evaluates discrete structural and insulation candidate configurations against thermal comfort, Bukhari kerosene fuel consumption, airlift weight, and capital expenditure.
            </p>
          </div>
        )}

        {result && (
          <>
            {/* Meta banner */}
            <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
              {[
                { label: 'Total Tested', value: result.meta.total_candidates },
                { label: 'Feasible', value: result.meta.feasible_count, color: '#22c55e' },
                { label: 'Pareto Optimal', value: paretoCount, color: '#f59e0b' },
                { label: 'Flagged Review', value: flagged.length, color: '#d97706' },
                { label: 'Runtime', value: `${result.meta.runtime_seconds}s` },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.label}</div>
                  <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: (item as any).color || 'var(--color-text-primary)' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Best candidate highlight */}
            {best && (
              <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem', border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Award size={18} color="#22c55e" />
                    <span style={{ fontWeight: 600, color: '#22c55e' }}>Highest-Ranked Feasible Solution</span>
                    {best.is_pareto && <span className="badge" style={{ background: 'rgba(245,158,11,0.2)', color: '#d97706', fontSize: '0.6875rem' }}>Pareto Frontier</span>}
                  </div>
                  <button onClick={handleExportCSV} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Download size={13} /> Export Pareto CSV
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem', fontSize: '0.8125rem' }}>
                  <div><div style={{ color: 'var(--color-text-muted)' }}>Material</div><b>{best.material_name}</b></div>
                  <div><div style={{ color: 'var(--color-text-muted)' }}>Comfort</div><b>{best.metrics.comfort_percentage.toFixed(1)}%</b></div>
                  <div><div style={{ color: 'var(--color-text-muted)' }}>Kerosene</div><b>{(best.metrics.fuel_liters ?? 0).toFixed(1)} L</b></div>
                  <div><div style={{ color: 'var(--color-text-muted)' }}>Weight</div><b>{best.metrics.total_weight_kg.toFixed(0)} kg</b></div>
                  <div><div style={{ color: 'var(--color-text-muted)' }}>Cost</div><b>${best.metrics.total_cost_usd.toFixed(0)}</b></div>
                  <div><div style={{ color: 'var(--color-text-muted)' }}>Score</div><b style={{ color: 'var(--color-heat-500)', fontSize: '1.1rem' }}>{best.final_score?.toFixed(1)}</b></div>
                </div>

                {/* Scoring methodology note */}
                <details style={{ marginTop: '0.75rem' }}>
                  <summary style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                    Methodology & Pareto Governance
                  </summary>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', lineHeight: 1.6 }}>
                    {result.meta.scoring_methodology}<br />
                    <b>Active Objectives:</b> Comfort ({result.meta.weights_used.comfort}) · Energy ({result.meta.weights_used.energy}) · Fuel ({result.meta.weights_used.fuel ?? 20}) · Weight ({result.meta.weights_used.weight}) · Cost ({result.meta.weights_used.cost})<br />
                    <b>Feasibility & Review Filter:</b> Comfort ≥{result.meta.feasibility_threshold_pct}% required; borderline configurations (50-74% comfort, heavy structural load, or high CO score) flagged for engineer sign-off.
                  </p>
                </details>
              </div>
            )}

            {/* View Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className={activeTab === 'rank' ? 'btn btn-primary' : 'btn btn-outline'}
                  onClick={() => setActiveTab('rank')} style={{ fontSize: '0.8125rem' }}>
                  Ranked Configurations
                </button>
                <button className={activeTab === 'tradeoff' ? 'btn btn-primary' : 'btn btn-outline'}
                  onClick={() => setActiveTab('tradeoff')} style={{ fontSize: '0.8125rem' }}>
                  Pareto Trade-Offs
                </button>
              </div>

              {activeTab === 'rank' && (
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <Filter size={13} color="var(--color-text-muted)" />
                  {(['all', 'feasible', 'flagged', 'infeasible'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setCandidateFilter(f)}
                      className={candidateFilter === f ? 'btn btn-primary' : 'btn btn-outline'}
                      style={{ fontSize: '0.6875rem', padding: '0.2rem 0.5rem', textTransform: 'capitalize' }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tab 1: Ranked Configurations List */}
            {activeTab === 'rank' && (
              <div>
                {displayedCandidates.length === 0 ? (
                  <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No candidates match the active filter ({candidateFilter}).
                  </div>
                ) : (
                  displayedCandidates.map(c => <CandidateCard key={c.candidate_id} c={c} isTop={c.rank === 1} />)
                )}
              </div>
            )}

            {/* Tab 2: Trade-Off Charts (Pareto Multi-Objective Frontier) */}
            {activeTab === 'tradeoff' && feasible.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                    <span>Top Solution</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', border: '1px solid #d97706' }} />
                    <span>Pareto Optimal Frontier</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                    <span>Dominated Feasible Design</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Fuel size={14} color="#ef4444" />
                      <span>Comfort % vs Kerosene Fuel Consumption</span>
                    </div>
                    <TradeoffPlot candidates={result.ranked_candidates} xKey="fuel_liters" xLabel="Kerosene Burned (L)" />
                  </div>
                  <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Comfort % vs Total Energy Loss
                    </div>
                    <TradeoffPlot candidates={result.ranked_candidates} xKey="energy_loss_wh" xLabel="Total Energy Loss (Wh)" />
                  </div>
                  <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Comfort % vs Shelter Envelope Weight
                    </div>
                    <TradeoffPlot candidates={result.ranked_candidates} xKey="total_weight_kg" xLabel="Airlift Mass (kg)" />
                  </div>
                  <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Comfort % vs Material Cost
                    </div>
                    <TradeoffPlot candidates={result.ranked_candidates} xKey="total_cost_usd" xLabel="Capital Cost (USD)" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
