import { useState } from 'react'
import { RefreshCw, AlertTriangle, Database, CheckCircle2 } from 'lucide-react'
import { useScenarioStore } from '@/stores/appStore'
import { fetchClimate, type ClimateData } from '@/lib/api'

export default function ClimateIntelligencePage() {
  const { scenario } = useScenarioStore()
  const [dataSource, setDataSource] = useState<'live' | 'cached' | 'fallback'>('cached')
  const [isLoading, setIsLoading] = useState(false)
  const [liveClimate, setLiveClimate] = useState<ClimateData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Generate 72h sinusoidal demo data based on the single live API point
  const baseTemp = liveClimate?.temperature ?? -10
  const baseSolar = liveClimate?.solar_radiation ?? 200
  const baseHumidity = liveClimate?.relative_humidity ?? 25
  const baseWind = liveClimate?.wind_speed ?? 2

  const hours = 72
  const timestamps = Array.from({ length: hours }, (_, h) => `${String(h % 24).padStart(2, '0')}:00`)
  const temperature = timestamps.map((_, h) => baseTemp + 5 * Math.sin(2 * Math.PI * h / 24 - Math.PI / 2))
  const humidity    = timestamps.map((_, h) => baseHumidity + 5 * Math.sin(2 * Math.PI * h / 24))
  const wind        = timestamps.map((_, h) => Math.max(0, baseWind + 1.5 * Math.abs(Math.sin(2 * Math.PI * h / 24))))
  const solar       = timestamps.map((_, h) => {
    const hr = h % 24
    return hr >= 6 && hr <= 18 ? Math.max(0, baseSolar * Math.sin(Math.PI * (hr - 6) / 12)) : 0
  })

  const handleFetch = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetchClimate(scenario.location.latitude, scenario.location.longitude)
      setLiveClimate(res.climate)
      setDataSource('live')
    } catch (e: any) {
      setError(e.message || 'NASA POWER unavailable')
      setDataSource('fallback')
    } finally {
      setIsLoading(false)
    }
  }

  function MiniChart({ label, values, color, unit, yMin, yMax }: {
    label: string; values: number[]; color: string; unit: string; yMin: number; yMax: number
  }) {
    const range = yMax - yMin || 1
    const w = 600, h = 120, pad = 40
    const points = values.slice(0, 72).map((v, i) => ({
      x: pad + (i / 71) * (w - pad - 10),
      y: 10 + (1 - (v - yMin) / range) * (h - 20),
    }))
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)

    return (
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h5 style={{ margin: 0, color }}>{label}</h5>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Avg: {avg}{unit}
          </span>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '120px' }}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1={pad} y1={10 + f * (h - 20)} x2={w - 10} y2={10 + f * (h - 20)}
              stroke="var(--color-border-light)" strokeWidth="0.5" />
          ))}
          <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="5" y="15" fontSize="8" fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{yMax.toFixed(0)}{unit}</text>
          <text x="5" y={h - 5} fontSize="8" fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{yMin.toFixed(0)}{unit}</text>
          {[0, 24, 48].map((hr) => (
            <text key={hr} x={pad + (hr / 71) * (w - pad - 10)} y={h - 2} fontSize="7"
              fill="var(--color-text-muted)" textAnchor="middle" fontFamily="var(--font-mono)">
              Day {Math.floor(hr / 24) + 1}
            </text>
          ))}
        </svg>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>Climate Intelligence</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Hourly climate data for {scenario.location.name} · {scenario.location.latitude.toFixed(2)}°N, {scenario.location.longitude.toFixed(2)}°E
          </p>
        </div>
        <button className="btn btn-climate" onClick={handleFetch} disabled={isLoading}>
          <RefreshCw size={14} className={isLoading ? 'animate-pulse-soft' : ''} />
          {isLoading ? 'Fetching from NASA…' : 'Fetch Live NASA POWER'}
        </button>
      </div>

      {/* Status banners */}
      {error && (
        <div className="banner banner-warning" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>Error: </strong>{error} — showing interpolated demo data.
            <button className="btn btn-ghost" style={{ marginLeft: '0.5rem', fontSize: '0.75rem', textDecoration: 'underline' }} onClick={handleFetch}>Retry</button>
          </div>
        </div>
      )}
      {dataSource === 'live' && liveClimate && (
        <div className="banner banner-info" style={{ marginBottom: '1rem', borderColor: 'var(--color-comfort-400)', background: 'var(--color-comfort-50)' }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0, color: 'var(--color-comfort-600)' }} />
          <span style={{ color: 'var(--color-comfort-700)' }}>
            <strong>Live NASA POWER data loaded</strong> — T: <strong>{liveClimate.temperature.toFixed(1)}°C</strong>  ·  Solar: <strong>{liveClimate.solar_radiation.toFixed(0)} W/m²</strong>  ·  RH: <strong>{liveClimate.relative_humidity.toFixed(1)}%</strong>  ·  Wind: <strong>{liveClimate.wind_speed.toFixed(1)} m/s</strong>
          </span>
        </div>
      )}
      {dataSource === 'cached' && (
        <div className="banner banner-info" style={{ marginBottom: '1rem' }}>
          <Database size={16} style={{ flexShrink: 0 }} />
          <span>Showing interpolated demo data · Click <strong>Fetch Live NASA POWER</strong> to load real data <span className="chip chip-demo">DEMO</span></span>
        </div>
      )}

      {/* Live data summary card */}
      {liveClimate && (
        <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Temperature', value: `${liveClimate.temperature.toFixed(1)}°C`, color: 'var(--color-climate-600)' },
            { label: 'Solar Radiation', value: `${liveClimate.solar_radiation.toFixed(0)} W/m²`, color: 'var(--color-solar-600)' },
            { label: 'Rel. Humidity', value: `${liveClimate.relative_humidity.toFixed(1)}%`, color: 'var(--color-climate-500)' },
            { label: 'Wind Speed', value: `${liveClimate.wind_speed.toFixed(1)} m/s`, color: 'var(--color-structure-500)' },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 600, color: item.color, marginTop: '0.125rem' }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        <MiniChart label="Temperature" values={temperature} color="var(--color-climate-500)" unit="°C" yMin={Math.min(...temperature) - 2} yMax={Math.max(...temperature) + 2} />
        <MiniChart label="Relative Humidity" values={humidity} color="var(--color-climate-600)" unit="%" yMin={Math.max(0, Math.min(...humidity) - 5)} yMax={Math.min(100, Math.max(...humidity) + 5)} />
        <MiniChart label="Wind Speed" values={wind} color="var(--color-structure-500)" unit=" m/s" yMin={0} yMax={Math.max(...wind) + 1} />
        <MiniChart label="Solar Irradiance (GHI)" values={solar} color="var(--color-solar-500)" unit=" W/m²" yMin={0} yMax={Math.max(...solar, 100) + 50} />
      </div>
    </div>
  )
}
