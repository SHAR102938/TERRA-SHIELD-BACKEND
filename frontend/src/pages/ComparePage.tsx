import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowRight, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp, 
  Layers, 
  ShieldCheck, 
  Zap, 
  DollarSign, 
  Thermometer, 
  Award,
  Sparkles,
  Plus
} from 'lucide-react'
import { useScenarioStore } from '@/stores/appStore'

interface ShelterVariant {
  id: string
  name: string
  tag: string
  wall_u: number
  roof_u: number
  glazing_shgc: number
  annual_heating_kwh: number
  comfort_pct: number
  peak_heating_kw: number
  est_cost_inr: number
  layers_summary: string
  is_winner?: boolean
  winner_reason?: string
}

const VARIANTS: ShelterVariant[] = [
  {
    id: 'base',
    name: 'Base Design (Stone + 50mm EPS)',
    tag: 'Current Baseline',
    wall_u: 0.58,
    roof_u: 0.32,
    glazing_shgc: 0.65,
    annual_heating_kwh: 4280,
    comfort_pct: 68.5,
    peak_heating_kw: 4.8,
    est_cost_inr: 345000,
    layers_summary: '300mm Stone + 50mm EPS + Double Glazed',
  },
  {
    id: 'opt-a',
    name: 'Variant A: High Thermal Mass',
    tag: 'Phase Change Optimized',
    wall_u: 0.36,
    roof_u: 0.22,
    glazing_shgc: 0.72,
    annual_heating_kwh: 3120,
    comfort_pct: 82.0,
    peak_heating_kw: 3.4,
    est_cost_inr: 412000,
    layers_summary: '300mm Stone + 100mm Rockwool + Trombe Wall',
  },
  {
    id: 'opt-b',
    name: 'Variant B: Super-Insulated Passive',
    tag: 'Recommended Solution',
    wall_u: 0.24,
    roof_u: 0.16,
    glazing_shgc: 0.68,
    annual_heating_kwh: 2390,
    comfort_pct: 91.4,
    peak_heating_kw: 2.3,
    est_cost_inr: 458000,
    layers_summary: '300mm Stone + 150mm EPS + Triple Glazing Low-E',
    is_winner: true,
    winner_reason: 'Reduces heating demand by 44.2% while achieving 91.4% winter comfort band compliance.'
  },
]

export default function ComparePage() {
  const { scenario } = useScenarioStore()
  const [selectedIds, setSelectedIds] = useState<string[]>(['base', 'opt-a', 'opt-b'])
  const baseline = VARIANTS[0]

  const activeVariants = VARIANTS.filter((v) => selectedIds.includes(v.id))

  const calcDelta = (val: number, baseVal: number, lowerIsBetter = true) => {
    const diffPct = ((val - baseVal) / baseVal) * 100
    const isGood = lowerIsBetter ? diffPct <= 0 : diffPct >= 0
    return {
      text: `${diffPct > 0 ? '+' : ''}${diffPct.toFixed(1)}%`,
      isGood,
      raw: diffPct
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span className="badge badge-structure" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Layers size={14} /> Design Comparison Workbench
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Location: <strong>{scenario.location.name}</strong>
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Multi-Variant Performance Benchmark
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', maxWidth: '800px' }}>
          Side-by-side parametric evaluation against your active baseline. Evaluates thermal resistance, annual auxiliary heating loads, comfort hours, and lifecycle material trade-offs.
        </p>
      </div>

      {/* Recommended Design Winner Banner */}
      <div 
        className="card" 
        style={{ 
          marginBottom: '2rem', 
          background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #FAF8F3 100%)',
          borderColor: 'var(--color-solar-400)',
          borderWidth: '1.5px',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div 
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%', 
                background: 'var(--color-solar-500)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0
              }}
            >
              <Award size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-solar-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Deterministic Winner
                </span>
                <span className="badge badge-comfort" style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem' }}>
                  Pareto Optimal
                </span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 600, color: 'var(--color-solar-800)', margin: 0 }}>
                Variant B: Super-Insulated Passive
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0 }}>
                {VARIANTS[2].winner_reason}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Annual Energy Savings</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-comfort-600)' }}>
                -44.2%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Comfort Compliance</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-solar-600)' }}>
                91.4%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${activeVariants.length}, minmax(280px, 1fr))`, 
          gap: '1.25rem',
          marginBottom: '2.5rem'
        }}
      >
        {activeVariants.map((variant) => {
          const isBase = variant.id === baseline.id
          const energyDelta = isBase ? null : calcDelta(variant.annual_heating_kwh, baseline.annual_heating_kwh, true)
          const comfortDelta = isBase ? null : calcDelta(variant.comfort_pct, baseline.comfort_pct, false)
          const costDelta = isBase ? null : calcDelta(variant.est_cost_inr, baseline.est_cost_inr, true)

          return (
            <motion.div
              key={variant.id}
              className="card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                position: 'relative',
                border: variant.is_winner ? '2px solid var(--color-solar-500)' : undefined,
                background: variant.is_winner ? '#FFFCF7' : 'var(--color-bg-card)',
                boxShadow: variant.is_winner ? 'var(--shadow-md)' : undefined,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {variant.is_winner && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '16px',
                    background: 'var(--color-solar-500)',
                    color: '#fff',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Sparkles size={12} /> Top Choice
                </div>
              )}

              <div>
                {/* Variant Header */}
                <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <span className={`badge ${isBase ? 'badge-neutral' : variant.is_winner ? 'badge-solar' : 'badge-climate'}`} style={{ marginBottom: '0.5rem' }}>
                    {variant.tag}
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>
                    {variant.name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', minHeight: '36px' }}>
                    {variant.layers_summary}
                  </div>
                </div>

                {/* Key Metrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.5rem' }}>
                  {/* Heating Load */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-paper)', padding: '0.625rem 0.75rem', borderRadius: '6px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Heating Demand</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1rem', color: 'var(--color-heat-600)' }}>
                        {variant.annual_heating_kwh.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>kWh/yr</span>
                      </div>
                    </div>
                    {energyDelta && (
                      <span 
                        style={{ 
                          fontFamily: 'var(--font-mono)', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: energyDelta.isGood ? 'var(--color-comfort-100)' : 'var(--color-warning-100)',
                          color: energyDelta.isGood ? 'var(--color-comfort-700)' : 'var(--color-warning-700)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        {energyDelta.isGood ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                        {energyDelta.text}
                      </span>
                    )}
                  </div>

                  {/* Comfort Hours */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-paper)', padding: '0.625rem 0.75rem', borderRadius: '6px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Comfort Compliance</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1rem', color: 'var(--color-comfort-600)' }}>
                        {variant.comfort_pct}%
                      </div>
                    </div>
                    {comfortDelta && (
                      <span 
                        style={{ 
                          fontFamily: 'var(--font-mono)', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: comfortDelta.isGood ? 'var(--color-comfort-100)' : 'var(--color-warning-100)',
                          color: comfortDelta.isGood ? 'var(--color-comfort-700)' : 'var(--color-warning-700)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        {comfortDelta.isGood ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {comfortDelta.text}
                      </span>
                    )}
                  </div>

                  {/* Peak Heating Capacity */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-paper)', padding: '0.625rem 0.75rem', borderRadius: '6px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Peak HVAC Sizing</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1rem', color: 'var(--color-solar-600)' }}>
                        {variant.peak_heating_kw} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>kW</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Design -15°C
                    </span>
                  </div>

                  {/* Envelope U-values */}
                  <div style={{ borderTop: '1px dashed var(--color-border-subtle)', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Wall U-Value:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{variant.wall_u} W/m²K</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Roof U-Value:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{variant.roof_u} W/m²K</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Glazing SHGC:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{variant.glazing_shgc}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estimated Capital Cost */}
              <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '1rem', marginTop: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Est. Envelope Cost</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>
                    ₹{variant.est_cost_inr.toLocaleString()}
                  </div>
                </div>
                {costDelta && (
                  <div style={{ fontSize: '0.75rem', textAlign: 'right', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    {costDelta.text} vs baseline
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Visual Comparison Chart Section */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Comparative Heating Energy Breakdown (kWh / year)
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
          Direct breakdown showing the impact of wall conduction, roof losses, and infiltration mitigation.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {activeVariants.map((v) => {
            const maxVal = 4500
            const pct = (v.annual_heating_kwh / maxVal) * 100
            return (
              <div key={v.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{v.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.875rem' }}>
                    {v.annual_heating_kwh} kWh
                  </span>
                </div>
                <div style={{ height: '24px', background: 'var(--color-bg-paper)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                  <div 
                    style={{ 
                      width: `${pct}%`, 
                      background: v.is_winner ? 'var(--color-comfort-500)' : 'var(--color-heat-400)', 
                      transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' 
                    }} 
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
