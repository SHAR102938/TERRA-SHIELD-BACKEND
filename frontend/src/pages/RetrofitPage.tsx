import { useState } from 'react'
import { 
  Wrench, ShieldAlert, CheckCircle2, TrendingUp, Flame, 
  DollarSign, Clock, ArrowRight, Download, RefreshCw, AlertTriangle, Layers
} from 'lucide-react'
import { useScenarioStore } from '@/stores/appStore'
import { evaluateRetrofit, type RetrofitResponse, type RetrofitIntervention } from '@/lib/api'

export default function RetrofitPage() {
  const { scenario } = useScenarioStore()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<RetrofitResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedIntervention, setSelectedIntervention] = useState<RetrofitIntervention | null>(null)

  const handleEvaluate = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await evaluateRetrofit({
        geometry: {
          length: scenario.geometry.length,
          width: scenario.geometry.width,
          height: scenario.geometry.height,
          roof_pitch: scenario.geometry.roof_pitch,
        },
        location: {
          latitude: scenario.location.latitude,
          longitude: scenario.location.longitude,
        },
        operating: {
          target_temperature: scenario.operating.target_temp,
          air_changes_per_hour: scenario.operating.ach_natural + scenario.operating.ach_infiltration,
        },
        simulation_hours: 72,
        baseline_material_id: 6, // Uninsulated concrete/stone masonry baseline
      })
      setResults(data)
      setSelectedIntervention(data.top_recommendation)
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate retrofit options.')
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (!results) return
    const headers = ['Rank', 'Intervention', 'Category', 'Comfort (%)', 'Fuel Saved (L)', 'Cost (INR)', 'Payback (Years)', 'CO Risk Score']
    const rows = results.interventions.map(i => [
      i.rank,
      `"${i.name}"`,
      `"${i.category}"`,
      i.comfort_percentage,
      i.fuel_saved_liters,
      i.capital_cost_inr,
      i.payback_years,
      i.co_risk_score,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encoded = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encoded)
    link.setAttribute('download', `TERRA-SHIELD_Retrofit_Recommendations_${scenario.location.name.replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-structure" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Wrench size={12} />
              SIH26051 Feature B
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Location: <b>{scenario.location.name}</b>
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
            Retrofit Advisory & Upgrade Engine
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Calculates minimum-cost thermal upgrades for existing uninsulated defence outposts and high-altitude shelters.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {results && (
            <button className="btn btn-outline" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Download size={14} />
              Export Recommendation List
            </button>
          )}
          <button className="btn btn-primary" onClick={handleEvaluate} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Evaluating Interventions…' : 'Run Retrofit Advisory'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '1rem', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.05)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} color="#ef4444" />
          <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</span>
        </div>
      )}

      {!results && !loading && (
        <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <Wrench size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            Evaluate Thermal Retrofits for Existing Structures
          </h3>
          <p style={{ maxWidth: '540px', margin: '0 auto 1.5rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Click <b>Run Retrofit Advisory</b> to test discrete physical interventions (exterior mineral wool, airtightness weatherstripping, secondary storm glazing, and solar Trombe walls) against this shelter's baseline geometry.
          </p>
          <button className="btn btn-primary" onClick={handleEvaluate}>
            Analyze Existing Outpost
          </button>
        </div>
      )}

      {results && (
        <div>
          {/* Baseline vs Top Recommended Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Baseline Card */}
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                Unretrofitted Baseline
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>{results.baseline.name}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.8125rem' }}>
                <div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Comfort %</div>
                  <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ef4444' }}>
                    {results.baseline.comfort_percentage}%
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Kerosene Burn</div>
                  <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {results.baseline.fuel_liters} L
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>CO Risk Level</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444', marginTop: '0.25rem' }}>
                    {results.baseline.co_risk_level}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Recommendation Card */}
            {results.top_recommendation && (
              <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #22c55e', background: 'rgba(34,197,94,0.03)' }}>
                <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                  #1 Highest Cost-Effectiveness Retrofit
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                  {results.top_recommendation.name}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.8125rem' }}>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Comfort Gain</div>
                    <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#22c55e' }}>
                      +{results.top_recommendation.comfort_gain_pct}%
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Fuel Saved</div>
                    <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-heat-600)' }}>
                      {results.top_recommendation.fuel_saved_liters} L
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Est. Payback</div>
                    <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-solar-600)' }}>
                      {results.top_recommendation.payback_years} yrs
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ranked Interventions Table */}
          <div className="card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Ranked Retrofit Recommendations (Minimum-Cost Interventions)</span>
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Rank</th>
                  <th style={{ padding: '0.75rem' }}>Intervention</th>
                  <th style={{ padding: '0.75rem' }}>Category</th>
                  <th style={{ padding: '0.75rem' }}>Comfort</th>
                  <th style={{ padding: '0.75rem' }}>Fuel Saved</th>
                  <th style={{ padding: '0.75rem' }}>Capital Cost</th>
                  <th style={{ padding: '0.75rem' }}>Seasonal Savings</th>
                  <th style={{ padding: '0.75rem' }}>Payback</th>
                  <th style={{ padding: '0.75rem' }}>CO Risk</th>
                </tr>
              </thead>
              <tbody>
                {results.interventions.map((item) => {
                  const isTop = item.rank === 1
                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedIntervention(item)}
                      style={{ 
                        borderBottom: '1px solid var(--color-border-light)', 
                        background: selectedIntervention?.id === item.id ? 'var(--color-bg-paper-warm)' : isTop ? 'rgba(34,197,94,0.04)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isTop ? '#22c55e' : 'var(--color-text-primary)' }}>
                        #{item.rank}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.description}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className="badge badge-structure" style={{ fontSize: '0.6875rem' }}>{item.category}</span>
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                        <span style={{ fontWeight: 600, color: '#22c55e' }}>{item.comfort_percentage}%</span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginLeft: '4px' }}>(+{item.comfort_gain_pct}%)</span>
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-heat-600)' }}>
                        {item.fuel_saved_liters} L
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                        ₹{item.capital_cost_inr.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-solar-600)' }}>
                        ₹{item.seasonal_fuel_saved_inr.toLocaleString()} / yr
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {item.payback_years} yrs
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ 
                          fontSize: '0.6875rem', 
                          fontWeight: 700,
                          padding: '0.2rem 0.4rem', 
                          borderRadius: '4px',
                          background: item.co_risk_level === 'LOW' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                          color: item.co_risk_level === 'LOW' ? '#22c55e' : '#f59e0b',
                        }}>
                          {item.co_risk_level} ({item.co_risk_score})
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
