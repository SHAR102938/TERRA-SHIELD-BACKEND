import { useState, useMemo } from 'react'
import { Cloud, RefreshCw, AlertTriangle, Database } from 'lucide-react'
import { useScenarioStore } from '@/stores/appStore'

export default function ClimateIntelligencePage() {
  const { scenario } = useScenarioStore()
  const [dataSource, setDataSource] = useState<'live' | 'cached' | 'fallback'>('cached')
  const [isLoading, setIsLoading] = useState(false)

  // Generate demo climate data
  const hours = 72
  const data = useMemo(() => {
    const ts = Array.from({ length: hours }, (_, h) => `${String(h % 24).padStart(2, '0')}:00`)
    return {
      timestamps: ts,
      temperature: ts.map((_, h) => -10 + 5 * Math.sin(2 * Math.PI * h / 24 - Math.PI / 2) + Math.random() * 0.5),
      humidity: ts.map((_, h) => 25 + 5 * Math.sin(2 * Math.PI * h / 24) + Math.random() * 2),
      wind: ts.map((_, h) => 2 + 1.5 * Math.abs(Math.sin(2 * Math.PI * h / 24)) + Math.random() * 0.5),
      solar: ts.map((_, h) => {
        const hr = h % 24
        return hr >= 6 && hr <= 18 ? Math.max(0, 400 * Math.sin(Math.PI * (hr - 6) / 12) + Math.random() * 20) : 0
      }),
    }
  }, [])

  const handleFetch = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/v1/climate/power?lat=${scenario.location.latitude}&lon=${scenario.location.longitude}&start=20240115&end=20240117&params=T2M,RH2M,WS10M,ALLSKY_SFC_SW_DWN`)
      const json = await res.json()
      if (json._cache?.is_fallback) setDataSource('fallback')
      else if (json._cache?.hit) setDataSource('cached')
      else setDataSource('live')
    } catch {
      setDataSource('fallback')
    }
    setIsLoading(false)
  }

  function MiniChart({ label, values, color, unit, yMin, yMax }: { label: string; values: number[]; color: string; unit: string; yMin: number; yMax: number }) {
    const range = yMax - yMin || 1
    const w = 600, h = 120, pad = 40
    const points = values.slice(0, 72).map((v, i) => ({
      x: pad + (i / 71) * (w - pad - 10),
      y: 10 + (1 - (v - yMin) / range) * (h - 20),
    }))
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

    return (
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h5 style={{ margin: 0, color }}>{label}</h5>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Avg: {(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)}{unit}
          </span>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '120px' }}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1={pad} y1={10 + f * (h - 20)} x2={w - 10} y2={10 + f * (h - 20)} stroke="var(--color-border-light)" strokeWidth="0.5" />
          ))}
          <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="5" y="15" fontSize="8" fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{yMax.toFixed(0)}{unit}</text>
          <text x="5" y={h - 5} fontSize="8" fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{yMin.toFixed(0)}{unit}</text>
          {[0, 24, 48].map((hr) => (
            <text key={hr} x={pad + (hr / 71) * (w - pad - 10)} y={h - 2} fontSize="7" fill="var(--color-text-muted)" textAnchor="middle" fontFamily="var(--font-mono)">
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
          {isLoading ? 'Fetching…' : 'Fetch NASA POWER'}
        </button>
      </div>

      {/* Data source banner */}
      {dataSource === 'fallback' && (
        <div className="banner banner-warning" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>NASA POWER unavailable</strong> — using cached demo snapshot: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>LEH-WINTER-72H</span>
            <button className="btn btn-ghost" style={{ marginLeft: '0.5rem', fontSize: '0.75rem', textDecoration: 'underline' }} onClick={handleFetch}>Retry</button>
          </div>
        </div>
      )}
      {dataSource === 'cached' && (
        <div className="banner banner-info" style={{ marginBottom: '1rem' }}>
          <Database size={16} style={{ flexShrink: 0 }} />
          <span>Showing cached climate data · <span className="chip chip-demo">DEMO DATA</span></span>
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        <MiniChart label="Temperature" values={data.temperature} color="var(--color-climate-500)" unit="°C" yMin={-16} yMax={-4} />
        <MiniChart label="Relative Humidity" values={data.humidity} color="var(--color-climate-600)" unit="%" yMin={15} yMax={40} />
        <MiniChart label="Wind Speed" values={data.wind} color="var(--color-structure-500)" unit=" m/s" yMin={0} yMax={5} />
        <MiniChart label="Solar Irradiance (GHI)" values={data.solar} color="var(--color-solar-500)" unit=" W/m²" yMin={0} yMax={450} />
      </div>
    </div>
  )
}
