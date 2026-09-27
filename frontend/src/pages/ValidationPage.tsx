import React, { useState, useEffect } from 'react'
import { CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Layers, Cpu, Info, Database, Download } from 'lucide-react'


// ─── Types ────────────────────────────────────────────────────────────────────

interface Comparison {
  mae: number
  rmse: number
  max_absolute_error: number
  mean_temperature_difference: number
  relative_error_percent: number
  final_temperature_error?: number
}

interface SteadyStateResult {
  case_id: string
  description: string
  reference_source: string
  production_result: { mean_temperature: number; time_series: number[] }
  reference_result:  { mean_temperature: number; time_series: number[] }
  comparison: Comparison
  status: string
  limitations: string[]
}

interface TransientSubResult {
  label: string
  rc_params: {
    R_eff_KperW: number; C_air_JperK: number
    tau_seconds: number; tau_hours: number
    T_ss: number; UA_shell_WperK: number; UA_vent_WperK: number
  }
  production_result: { time_series: number[] }
  reference_result:  { time_series: number[]; T_ss: number }
  comparison: Comparison
  status: string
  limitations: string[]
  error?: string
}

interface TransientResult {
  case_id: string
  description: string
  reference_source: string
  rc_params: TransientSubResult['rc_params']
  result_1h_output:  TransientSubResult
  result_30m_output: TransientSubResult
  convergence: { mae_1h: number; mae_30m: number; difference: number }
  overall_status: string
  limitations: string[]
}

interface AnsysResult {
  case_id: string
  description: string
  reference_source: string
  production_result: { time_series: number[] }
  reference_result: { time_series: number[]; T_ss?: number }
  comparison: Comparison
  advanced_metrics: {
    pearson_r?: number
    r_squared?: number
    normalized_rmse_percent?: number
    peak_temperature_error_c?: number
  }
  rc_params: {
    R_eff_KperW: number
    C_air_JperK: number
    tau_seconds: number
    tau_hours: number
    T_ss: number
  }
  status: string
  source_type: string
  is_real_ansys: boolean
  provenance: {
    dataset_status?: string
    description?: string
    generated_by?: string
    reference?: string
  }
  limitations: string[]
}

interface AnsysSystemStatus {
  ansys_integrated: boolean
  has_real_ansys_data: boolean
  status_notice: string
  datasets_available: Array<{
    case_id: string
    display_name: string
    source: string
    status: string
    n_points: number
    duration_s: number
  }>
}

// ─── Mini SVG chart ───────────────────────────────────────────────────────────

function CompareChart({
  prod,
  ref,
  label,
  refLabel = 'Reference Model'
}: {
  prod: number[]
  ref: number[]
  label: string
  refLabel?: string
}) {
  const W = 620, H = 200, pad = 30
  const all = [...prod, ...ref]
  const minT = Math.floor(Math.min(...all) - 1.0)
  const maxT = Math.ceil(Math.max(...all) + 1.0)
  const n    = Math.max(prod.length, ref.length)

  const toX  = (i: number, len: number) => pad + (i / Math.max(len - 1, 1)) * (W - 2 * pad)
  const toY  = (t: number) => H - pad - ((t - minT) / Math.max(maxT - minT, 1e-9)) * (H - 2 * pad)

  const path = (arr: number[]) =>
    arr.map((t, i) => `${i === 0 ? 'M' : 'L'} ${toX(i, arr.length)} ${toY(t)}`).join(' ')

  return (
    <div style={{ background: 'var(--color-bg-secondary)', padding: '1rem', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{label}</span>
        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.75rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 14, height: 3, background: '#3b82f6', borderRadius: 2 }} />
            <strong>Production RC</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 14, height: 3, background: '#f59e0b', borderRadius: 2 }} />
            <strong>{refLabel}</strong>
          </span>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        {/* Y Axis Gridlines */}
        {[0, 0.5, 1].map((pct, idx) => {
          const val = minT + pct * (maxT - minT)
          const y = H - pad - pct * (H - 2 * pad)
          return (
            <g key={idx}>
              <line x1={pad} y1={y} x2={W - pad} y2={y} stroke="var(--color-border)" strokeDasharray="3,3" />
              <text x={pad - 6} y={y + 3} textAnchor="end" fontSize="10" fill="var(--color-text-muted)">
                {val.toFixed(0)}°C
              </text>
            </g>
          )
        })}
        {/* Axes */}
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--color-border)" strokeWidth="1.5" />
        <line x1={pad} y1={pad}     x2={pad}     y2={H - pad} stroke="var(--color-border)" strokeWidth="1.5" />
        {/* Curves */}
        <path d={path(ref)}  fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6,4" />
        <path d={path(prod)} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.4rem', paddingLeft: pad, paddingRight: pad }}>
        <span>t = 0h</span>
        <span>t = {n - 1}h</span>
      </div>
    </div>
  )
}

// ─── Metric row ───────────────────────────────────────────────────────────────

function MetricGrid({ c, adv }: { c: Comparison; adv?: AnsysResult['advanced_metrics'] }) {
  const items = [
    ['MAE', `${c.mae.toFixed(4)} °C`],
    ['RMSE', `${c.rmse.toFixed(4)} °C`],
    ['Max Error', `${c.max_absolute_error.toFixed(4)} °C`],
    ['Mean Bias', `${c.mean_temperature_difference.toFixed(4)} °C`],
  ]

  if (adv?.r_squared !== undefined && adv.r_squared !== null) {
    items.push(['R²', `${adv.r_squared.toFixed(4)}`])
  }
  if (adv?.pearson_r !== undefined && adv.pearson_r !== null) {
    items.push(['Pearson r', `${adv.pearson_r.toFixed(4)}`])
  }
  if (adv?.normalized_rmse_percent !== undefined && adv.normalized_rmse_percent !== null) {
    items.push(['NRMSE', `${adv.normalized_rmse_percent.toFixed(2)} %`])
  }
  if (c.final_temperature_error !== undefined) {
    items.push(['Final ΔT', `${c.final_temperature_error.toFixed(4)} °C`])
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '0.65rem' }}>
      {items.map(([k, v]) => (
        <div key={k} style={{ padding: '0.65rem', background: 'var(--color-bg-secondary)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 2 }}>{k}</div>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>{v}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Case selector options ───────────────────────────────────────────────────

const CASE_OPTIONS = [
  { id: 'analytical_steady_state', label: 'Steady-State Analytical', category: 'analytical' },
  { id: 'transient_rc_A',          label: 'Transient RC — Case A (Mod τ)', category: 'analytical' },
  { id: 'transient_rc_B',          label: 'Transient RC — Case B (Short τ)', category: 'analytical' },
  { id: 'transient_rc_C',          label: 'Transient RC — Case C (Long τ)', category: 'analytical' },
  { id: 'ansys_case_a',            label: 'ANSYS Case A (Moderate τ)', category: 'ansys' },
  { id: 'ansys_case_b',            label: 'ANSYS Case B (High Vent)', category: 'ansys' },
  { id: 'ansys_case_c',            label: 'ANSYS Case C (Heavy Insul)', category: 'ansys' },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ValidationPage() {
  const [caseId, setCaseId]       = useState('ansys_case_a')
  const [loading, setLoading]     = useState(false)
  const [error,   setError]       = useState<string | null>(null)
  const [steady,  setSteady]      = useState<SteadyStateResult | null>(null)
  const [transient, setTransient] = useState<TransientResult | null>(null)
  const [ansys,   setAnsys]       = useState<AnsysResult | null>(null)
  const [sysStatus, setSysStatus] = useState<AnsysSystemStatus | null>(null)

  useEffect(() => {
    fetch('http://localhost:8000/api/validation/ansys-status')
      .then(res => res.json())
      .then(data => setSysStatus(data))
      .catch(() => {})
  }, [])

  async function fetchCase(id: string) {
    setLoading(true); setError(null); setSteady(null); setTransient(null); setAnsys(null)
    try {
      const resp = await fetch('http://localhost:8000/api/validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: id }),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      if (data.error) throw new Error(data.error)

      if (id.startsWith('ansys_')) {
        setAnsys(data)
      } else if (id === 'analytical_steady_state') {
        setSteady(data)
      } else {
        setTransient(data)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCase(caseId) }, [caseId])

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>

      {/* Header */}
      <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <ShieldCheck size={28} color="var(--color-comfort-600)" />
          Validation &amp; ANSYS Benchmark Engine
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: '0.35rem 0 0', fontSize: '0.875rem' }}>
          Transient RC network verification against analytical solutions and external ANSYS benchmark datasets.
        </p>
      </div>

      {/* ANSYS Subsystem Status Notice */}
      <div style={{
        padding: '0.85rem 1.15rem',
        borderRadius: 8,
        border: '1px solid #fed7aa',
        background: '#fffbeb',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}>
        <Info size={18} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: '0.8125rem', color: '#92400e', lineHeight: 1.5 }}>
          <strong>Subsystem Status: </strong>
          {sysStatus?.has_real_ansys_data ? (
            <span style={{ color: '#065f46', fontWeight: 600 }}>Real ANSYS CFD/FEA Data Connected</span>
          ) : (
            <span>Traceable Analytical RC Test Fixtures Active. Real ANSYS Mechanical / Fluent exports can be dropped into <code>backend/app/data/ansys_benchmarks/</code> to achieve formal verification.</span>
          )}
        </div>
      </div>

      {/* Selector with Categories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginRight: '0.5rem' }}>
            ANSYS Benchmarks:
          </span>
          {CASE_OPTIONS.filter(c => c.category === 'ansys').map(opt => (
            <button
              key={opt.id}
              onClick={() => setCaseId(opt.id)}
              style={{
                padding: '0.4rem 0.85rem', borderRadius: 6, cursor: 'pointer',
                border: '1px solid ' + (caseId === opt.id ? '#0d9488' : 'var(--color-border)'),
                background: caseId === opt.id ? '#ecfdf5' : 'transparent',
                fontWeight: caseId === opt.id ? 600 : 400,
                color: caseId === opt.id ? '#0f766e' : 'var(--color-text-secondary)',
                fontSize: '0.8125rem',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginRight: '0.5rem' }}>
            Analytical Models:
          </span>
          {CASE_OPTIONS.filter(c => c.category === 'analytical').map(opt => (
            <button
              key={opt.id}
              onClick={() => setCaseId(opt.id)}
              style={{
                padding: '0.4rem 0.85rem', borderRadius: 6, cursor: 'pointer',
                border: '1px solid ' + (caseId === opt.id ? 'var(--color-comfort-500)' : 'var(--color-border)'),
                background: caseId === opt.id ? 'var(--color-comfort-100)' : 'transparent',
                fontWeight: caseId === opt.id ? 600 : 400,
                color: caseId === opt.id ? 'var(--color-comfort-700)' : 'var(--color-text-secondary)',
                fontSize: '0.8125rem',
              }}
            >
              {opt.label}
            </button>
          ))}
          {loading && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: '0.8125rem', marginLeft: '0.5rem' }}>
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Calculating…
            </span>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, color: '#991b1b', fontSize: '0.875rem' }}>
          Error: {error}
        </div>
      )}

      {/* ── ANSYS Benchmark Result ── */}
      {ansys && (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0d9488', fontWeight: 600, marginBottom: '0.2rem' }}>
                ANSYS Verification Benchmark
              </div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{ansys.description}</h2>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Reference Source: <strong>{ansys.reference_source}</strong>
              </div>
            </div>
            <div style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 6,
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: ansys.status === 'VERIFIED' ? '#dcfce7' : ansys.status === 'FIXTURE_ONLY' ? '#fef3c7' : '#fee2e2',
              color: ansys.status === 'VERIFIED' ? '#15803d' : ansys.status === 'FIXTURE_ONLY' ? '#b45309' : '#b91c1c',
              border: `1px solid ${ansys.status === 'VERIFIED' ? '#86efac' : ansys.status === 'FIXTURE_ONLY' ? '#fde68a' : '#fca5a5'}`,
            }}>
              {ansys.status === 'FIXTURE_ONLY' ? 'TEST FIXTURE ONLY' : ansys.status}
            </div>
          </div>

          {/* Chart */}
          <CompareChart
            prod={ansys.production_result.time_series}
            ref={ansys.reference_result.time_series}
            label="Transient Cooling Response — THERMASHELL Solver vs Benchmark Reference"
            refLabel="Benchmark Curve"
          />

          {/* Statistical Metrics */}
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
              Statistical Goodness-of-Fit Metrics
            </div>
            <MetricGrid c={ansys.comparison} adv={ansys.advanced_metrics} />
          </div>

          {/* RC Parameters */}
          <div style={{ padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.6rem' }}>Derived Physical Constants</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', fontSize: '0.8125rem' }}>
              <div><span style={{ color: 'var(--color-text-muted)' }}>R_eff:</span> <strong>{ansys.rc_params.R_eff_KperW.toFixed(6)} K/W</strong></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>C_air:</span> <strong>{ansys.rc_params.C_air_JperK.toFixed(1)} J/K</strong></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>τ (Time Const):</span> <strong>{ansys.rc_params.tau_hours.toFixed(2)} hours</strong></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>T_ss (Equil):</span> <strong>{ansys.rc_params.T_ss.toFixed(1)} °C</strong></div>
            </div>
          </div>

          {/* Provenance & Limitations */}
          <div style={{ padding: '0.85rem 1.15rem', background: 'var(--color-warning-50)', border: '1px solid var(--color-warning-200)', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-warning-800)', marginBottom: '0.35rem' }}>
              <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Provenance &amp; Verification Status
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: 'var(--color-warning-900)', lineHeight: 1.6 }}>
              {ansys.limitations.map((l, i) => <li key={i}>{l}</li>)}
              {ansys.provenance.description && <li>{ansys.provenance.description}</li>}
            </ul>
          </div>
        </div>
      )}

      {/* ── Steady-state result ── */}
      {steady && (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{steady.description}</h2>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Reference: <strong>{steady.reference_source}</strong> &nbsp;|&nbsp;
              Status: <strong style={{ color: steady.status === 'PASS' ? 'green' : '#d97706' }}>{steady.status}</strong>
            </div>
          </div>
          <CompareChart
            prod={steady.production_result.time_series}
            ref={steady.reference_result.time_series}
            label="72h timeseries — Production vs Analytical Mean"
          />
          <MetricGrid c={steady.comparison} />
          <div style={{ padding: '0.75rem 1rem', background: 'var(--color-warning-50)', border: '1px solid var(--color-warning-200)', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-warning-800)', marginBottom: '0.4rem' }}>
              <AlertTriangle size={14} style={{ verticalAlign: 'middle' }} /> Benchmark Assumptions &amp; Limitations
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: 'var(--color-warning-900)', lineHeight: 1.7 }}>
              {steady.limitations.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* ── Transient RC result ── */}
      {transient && (() => {
        const r1h  = transient.result_1h_output
        const r30m = transient.result_30m_output
        const rc   = transient.rc_params
        return (
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                Independent Analytical Transient RC Benchmark
              </div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{transient.description}</h2>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                {transient.reference_source}
              </div>
            </div>

            {/* RC params */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '0.75rem' }}>
              {[
                ['R_eff (K/W)',  rc.R_eff_KperW.toFixed(6)],
                ['C_air (J/K)', rc.C_air_JperK.toFixed(1)],
                ['τ (hours)',    rc.tau_hours.toFixed(4)],
                ['τ (seconds)', rc.tau_seconds.toFixed(1)],
                ['T_ss (°C)',   rc.T_ss.toFixed(2)],
                ['UA_shell',    rc.UA_shell_WperK.toFixed(3)+' W/K'],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: '0.6rem', background: 'var(--color-bg-secondary)', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{k}</div>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{v}</div>
                </div>
              ))}
            </div>

            {/* 1h chart + metrics */}
            {r1h && !r1h.error && (
              <>
                <CompareChart prod={r1h.production_result.time_series} ref={r1h.reference_result.time_series} label="1-hour output timestep" />
                <MetricGrid c={r1h.comparison} />
              </>
            )}

            {/* 30m chart + metrics */}
            {r30m && !r30m.error && (
              <>
                <CompareChart prod={r30m.production_result.time_series} ref={r30m.reference_result.time_series} label="30-minute output timestep" />
                <MetricGrid c={r30m.comparison} />
              </>
            )}

            {/* Convergence */}
            <div style={{ padding: '0.75rem 1rem', background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem' }}>Timestep Convergence</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div><span style={{ color: 'var(--color-text-muted)' }}>1h MAE:</span> {transient.convergence.mae_1h} °C</div>
                <div><span style={{ color: 'var(--color-text-muted)' }}>30m MAE:</span> {transient.convergence.mae_30m} °C</div>
                <div><span style={{ color: 'var(--color-text-muted)' }}>|Δ MAE|:</span> {transient.convergence.difference} °C</div>
              </div>
            </div>

            {/* Limitations */}
            <div style={{ padding: '0.75rem 1rem', background: 'var(--color-warning-50)', border: '1px solid var(--color-warning-200)', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-warning-800)', marginBottom: '0.4rem' }}>
                <AlertTriangle size={14} style={{ verticalAlign: 'middle' }} /> Benchmark Assumptions &amp; Limitations
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: 'var(--color-warning-900)', lineHeight: 1.7 }}>
                {(transient.limitations ?? []).map((l, i) => <li key={i}>{l}</li>)}
                <li>Wall/roof thermal mass is NOT included in the 1st-order analytical model.</li>
                <li>Explicit Euler solver (60s substep) introduces numerical error relative to the exact exponential solution.</li>
                <li>ANSYS validation: <strong>planned, not yet performed</strong>.</li>
              </ul>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
