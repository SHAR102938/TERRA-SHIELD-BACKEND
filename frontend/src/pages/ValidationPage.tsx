import React, { useState, useEffect } from 'react'
import { CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react'

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

// ─── Mini SVG chart ───────────────────────────────────────────────────────────

function CompareChart({ prod, ref, label }: { prod: number[]; ref: number[]; label: string }) {
  const W = 560, H = 180, pad = 24
  const all = [...prod, ...ref]
  const minT = Math.min(...all) - 0.5
  const maxT = Math.max(...all) + 0.5
  const n    = prod.length
  const toX  = (i: number) => pad + (i / (n - 1)) * (W - 2 * pad)
  const toY  = (t: number) => H - pad - ((t - minT) / (maxT - minT + 1e-9)) * (H - 2 * pad)
  const path = (arr: number[]) => arr.map((t, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(t)}`).join(' ')
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>{label}</div>
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 12, height: 3, background: '#3b82f6' }} /> Production
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 12, height: 3, background: '#f59e0b' }} /> Analytical Ref
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--color-border)" />
        <line x1={pad} y1={pad}     x2={pad}     y2={H - pad} stroke="var(--color-border)" />
        <path d={path(ref)}  fill="none" stroke="#f59e0b" strokeWidth="2"   strokeDasharray="6,3" />
        <path d={path(prod)} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      </svg>
    </div>
  )
}

// ─── Metric row ───────────────────────────────────────────────────────────────

function MetricGrid({ c }: { c: Comparison }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
      {[
        ['MAE',      `${c.mae.toFixed(4)} °C`],
        ['RMSE',     `${c.rmse.toFixed(4)} °C`],
        ['Max Error',`${c.max_absolute_error.toFixed(4)} °C`],
        ['Mean Bias',`${c.mean_temperature_difference.toFixed(4)} °C`],
        ['Final ΔT', c.final_temperature_error !== undefined ? `${c.final_temperature_error.toFixed(4)} °C` : '—'],
      ].map(([k, v]) => (
        <div key={k} style={{ padding: '0.6rem', background: 'var(--color-bg-secondary)', borderRadius: 6 }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{k}</div>
          <div style={{ fontWeight: 600 }}>{v}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Case selector ────────────────────────────────────────────────────────────

const CASE_OPTIONS = [
  { id: 'analytical_steady_state', label: 'Steady-State Analytical', type: 'steady' },
  { id: 'transient_rc_A',          label: 'Transient RC — Case A (Moderate τ)', type: 'transient' },
  { id: 'transient_rc_B',          label: 'Transient RC — Case B (Short τ)',    type: 'transient' },
  { id: 'transient_rc_C',          label: 'Transient RC — Case C (Long τ)',     type: 'transient' },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ValidationPage() {
  const [caseId, setCaseId]   = useState('analytical_steady_state')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [steady,  setSteady]  = useState<SteadyStateResult  | null>(null)
  const [transient,setTransient] = useState<TransientResult | null>(null)

  async function fetchCase(id: string) {
    setLoading(true); setError(null); setSteady(null); setTransient(null)
    try {
      const resp = await fetch('http://localhost:8000/api/validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: id }),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      if (data.error) throw new Error(data.error)
      if (id === 'analytical_steady_state') setSteady(data)
      else setTransient(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCase(caseId) }, [caseId])

  const caseOpt = CASE_OPTIONS.find(c => c.id === caseId)!

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={28} color="var(--color-comfort-600)" />
          Validation &amp; Benchmark Engine
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>
          Transient RC response compared against an independent analytical solution.
          <strong> Not claimed as ANSYS validation.</strong>
        </p>
      </div>

      {/* Selector */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {CASE_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => setCaseId(opt.id)}
            style={{
              padding: '0.4rem 0.9rem', borderRadius: 6, cursor: 'pointer',
              border: '1px solid ' + (caseId === opt.id ? 'var(--color-comfort-500)' : 'var(--color-border)'),
              background: caseId === opt.id ? 'var(--color-comfort-100)' : 'transparent',
              fontWeight: caseId === opt.id ? 600 : 400,
              color: caseId === opt.id ? 'var(--color-comfort-700)' : 'var(--color-text-secondary)',
            }}
          >{opt.label}</button>
        ))}
        {loading && <span style={{ alignSelf: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Running…
        </span>}
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, color: '#991b1b' }}>
          Error: {error}
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
            {r1h?.error && (
              <div style={{ padding: '0.75rem', background: '#fee2e2', borderRadius: 6, color: '#991b1b' }}>
                1-hour run FAILED: {r1h.error}
              </div>
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
