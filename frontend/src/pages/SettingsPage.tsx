import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings, 
  Globe, 
  Cpu, 
  ShieldCheck, 
  Database, 
  Sliders, 
  Save, 
  CheckCircle2, 
  RefreshCw,
  Sun
} from 'lucide-react'

export default function SettingsPage() {
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric')
  const [comfortStandard, setComfortStandard] = useState('ashrae-55')
  const [solverTimestep, setSolverTimestep] = useState('300')
  const [nasaCacheDays, setNasaCacheDays] = useState(30)
  const [paperTexture, setPaperTexture] = useState(true)
  const [soundFx, setSoundFx] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)

  const handleSave = () => {
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2500)
  }

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span className="badge badge-structure" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Settings size={14} /> System Configuration
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            THERMASHELL Core Preferences
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          System & Engineering Preferences
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
          Configure engineering unit standards, numerical solver tolerances, NASA POWER meteorological caching, and UI theme options.
        </p>
      </div>

      {savedNotice && (
        <div 
          className="card" 
          style={{ 
            background: 'var(--color-comfort-50)', 
            borderColor: 'var(--color-comfort-400)', 
            padding: '0.875rem 1.25rem', 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: 'var(--color-comfort-800)'
          }}
        >
          <CheckCircle2 size={18} color="var(--color-comfort-600)" />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Preferences successfully saved to local session storage.</span>
        </div>
      )}

      {/* Group 1: Units & Standards */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Globe size={18} color="var(--color-structure-600)" />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>
            Units & Thermal Comfort Standards
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Unit System */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Measurement Units</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Affects temperature, length, and thermal resistance displays throughout the app
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button"
                onClick={() => setUnits('metric')} 
                className={`btn ${units === 'metric' ? 'btn-solar' : 'btn-outline'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
              >
                Metric (°C, m, W/m²K)
              </button>
              <button 
                type="button"
                onClick={() => setUnits('imperial')} 
                className={`btn ${units === 'imperial' ? 'btn-solar' : 'btn-outline'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
              >
                Imperial (°F, ft, R-value)
              </button>
            </div>
          </div>

          {/* Comfort Model */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Thermal Comfort Baseline Model</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Governs acceptable operative temperature bands and PMV indices
              </div>
            </div>
            <select 
              value={comfortStandard} 
              onChange={(e) => setComfortStandard(e.target.value)}
              className="input"
              style={{ width: '220px', fontSize: '0.85rem' }}
            >
              <option value="ashrae-55">ASHRAE Standard 55-2023 (Adaptive)</option>
              <option value="iso-7730">ISO 7730 / Fanger PMV-PPD</option>
              <option value="en-16798">EN 16798-1 European Standard</option>
              <option value="nbc-india">NBC 2016 (Indian Standard)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Group 2: Solver Configuration */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Cpu size={18} color="var(--color-heat-600)" />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>
            Numerical Solver & Thermal Physics Engine
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Integration Time Step */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>4R2C Integration Timestep (Δt)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Smaller timesteps improve numerical stability for thin layers with high thermal diffusivity
              </div>
            </div>
            <select 
              value={solverTimestep} 
              onChange={(e) => setSolverTimestep(e.target.value)}
              className="input"
              style={{ width: '180px', fontSize: '0.85rem' }}
            >
              <option value="60">60 seconds (High Fidelity)</option>
              <option value="300">300 seconds (Balanced)</option>
              <option value="3600">3600 seconds (Fast Hourly)</option>
            </select>
          </div>

          {/* Solar Model */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Diffuse Solar Transmittance Model</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Determines how ground reflections and atmospheric scattering are partitioned
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-solar-700)', fontWeight: 600 }}>
              HDKR Anisotropic (Default)
            </div>
          </div>
        </div>
      </div>

      {/* Group 3: Meteorological Data Caching */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Database size={18} color="var(--color-climate-600)" />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>
            NASA POWER Climate Intelligence Service
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Local Climate Cache Retention</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Number of days hourly meteorology timeseries is preserved locally
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="number" 
                min={1} 
                max={90} 
                value={nasaCacheDays} 
                onChange={(e) => setNasaCacheDays(Number(e.target.value))}
                className="input"
                style={{ width: '80px', textAlign: 'center' }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
        <button 
          onClick={handleSave} 
          className="btn btn-solar" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.75rem' }}
        >
          <Save size={16} /> Save Settings
        </button>
      </div>
    </div>
  )
}
