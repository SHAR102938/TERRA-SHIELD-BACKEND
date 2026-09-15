import { useState, useMemo, useCallback } from 'react'
import { useScenarioStore, useUIStore } from '@/stores/appStore'
import { MapPin, Ruler, Layers, Wind, Target, Play, Check, Info, ChevronDown, ChevronUp } from 'lucide-react'

const WIZARD_STEPS = [
  { key: 'site', label: 'Site', icon: MapPin, color: 'var(--color-climate-600)' },
  { key: 'geometry', label: 'Geometry', icon: Ruler, color: 'var(--color-structure-500)' },
  { key: 'envelope', label: 'Envelope', icon: Layers, color: 'var(--color-heat-500)' },
  { key: 'operating', label: 'Operating', icon: Wind, color: 'var(--color-heat-600)' },
  { key: 'objectives', label: 'Objectives', icon: Target, color: 'var(--color-comfort-600)' },
  { key: 'simulate', label: 'Simulate', icon: Play, color: 'var(--color-solar-600)' },
]

const CITY_PRESETS = [
  { name: 'Leh, Ladakh', lat: 34.15, lon: 77.58, elev: 3500, zone: 'Cold Desert', preset: 'leh' },
  { name: 'Jaisalmer, Rajasthan', lat: 26.92, lon: 70.90, elev: 225, zone: 'Hot Arid', preset: 'jaisalmer' },
  { name: 'Shimla, HP', lat: 31.10, lon: 77.17, elev: 2276, zone: 'Temperate', preset: 'shimla' },
  { name: 'Chennai, TN', lat: 13.08, lon: 80.27, elev: 6, zone: 'Warm Humid', preset: 'chennai' },
  { name: 'Srinagar, J&K', lat: 34.08, lon: 74.80, elev: 1585, zone: 'Cold', preset: 'srinagar' },
]

function UnitInput({ label, value, unit, onChange, min, max, step = 1 }: {
  label: string; value: number; unit: string; onChange: (v: number) => void; min?: number; max?: number; step?: number
}) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      <div className="input-unit">
        <input
          className="input"
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          style={{ fontFamily: 'var(--font-mono)', paddingRight: '3.5rem' }}
        />
        <span className="unit-suffix">{unit}</span>
      </div>
    </div>
  )
}

export default function ScenarioBuilderPage() {
  const { scenario, updateLocation, updateGeometry, updateOperating, applyPreset } = useScenarioStore()
  const { activeWizardStep, setActiveWizardStep } = useUIStore()
  const [presetBanner, setPresetBanner] = useState<string | null>(null)

  const handleCitySelect = (city: typeof CITY_PRESETS[0]) => {
    updateLocation({ name: city.name, latitude: city.lat, longitude: city.lon, elevation: city.elev, climate_zone: city.zone })
    if (city.preset === 'leh' || city.preset === 'jaisalmer') {
      applyPreset(city.preset)
      setPresetBanner(`Defaults adjusted for ${city.name}'s ${city.zone.toLowerCase()} climate — edit any field to override.`)
    }
  }

  const stepSummary = (step: number): string => {
    switch (step) {
      case 0: return `${scenario.location.name}`
      case 1: return `${scenario.geometry.length}×${scenario.geometry.width}×${scenario.geometry.height}m, ${scenario.geometry.roof_type}`
      case 2: return `${scenario.envelope.wall_layers.length} layers, ${scenario.envelope.windows.length} windows`
      case 3: return `${scenario.operating.occupants} occupants, ${scenario.operating.target_temp}°C target`
      case 4: return `${scenario.operating.hvac_mode} mode`
      default: return ''
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Wizard stepper */}
      <div className="wizard-stepper" style={{ background: 'var(--color-bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)', boxShadow: 'var(--shadow-card)', marginBottom: '1.5rem' }}>
        {WIZARD_STEPS.map((step, i) => {
          const Icon = step.icon
          const isActive = i === activeWizardStep
          const isCompleted = i < activeWizardStep
          return (
            <div
              key={step.key}
              className={`wizard-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => setActiveWizardStep(i)}
              style={isActive ? { borderColor: step.color, color: step.color } : {}}
            >
              <Icon size={14} />
              <span>{step.label}</span>
              {isCompleted && (
                <span className="wizard-step-summary" title={stepSummary(i)}>
                  ✓ {stepSummary(i)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Preset banner */}
      {presetBanner && (
        <div className="banner banner-info" style={{ marginBottom: '1rem' }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>{presetBanner}</span>
          <button className="btn-ghost" style={{ marginLeft: 'auto', fontSize: '0.75rem' }} onClick={() => setPresetBanner(null)}>Dismiss</button>
        </div>
      )}

      {/* 3-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 0.8fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Left: Input forms */}
        <div className="card" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          <h5 style={{ marginBottom: '1rem' }}>
            {WIZARD_STEPS[activeWizardStep]?.label} Configuration
          </h5>

          {activeWizardStep === 0 && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Select Location
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem' }}>
                {CITY_PRESETS.map((city) => (
                  <button
                    key={city.name}
                    onClick={() => handleCitySelect(city)}
                    className={scenario.location.name === city.name ? 'btn btn-climate' : 'btn btn-outline'}
                    style={{ justifyContent: 'space-between', padding: '0.5rem 0.75rem', fontSize: '0.8125rem' }}
                  >
                    <span>{city.name}</span>
                    <span className="chip" style={{ background: scenario.location.name === city.name ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-paper-warm)', fontSize: '0.5625rem' }}>
                      {city.zone}
                    </span>
                  </button>
                ))}
              </div>
              <UnitInput label="Latitude" value={scenario.location.latitude} unit="°N" onChange={(v) => updateLocation({ latitude: v })} min={-90} max={90} step={0.01} />
              <UnitInput label="Longitude" value={scenario.location.longitude} unit="°E" onChange={(v) => updateLocation({ longitude: v })} min={-180} max={180} step={0.01} />
              <UnitInput label="Elevation" value={scenario.location.elevation} unit="m" onChange={(v) => updateLocation({ elevation: v })} min={0} max={9000} />
            </div>
          )}

          {activeWizardStep === 1 && (
            <div>
              <UnitInput label="Length" value={scenario.geometry.length} unit="m" onChange={(v) => updateGeometry({ length: v })} min={1} max={50} step={0.5} />
              <UnitInput label="Width" value={scenario.geometry.width} unit="m" onChange={(v) => updateGeometry({ width: v })} min={1} max={50} step={0.5} />
              <UnitInput label="Height" value={scenario.geometry.height} unit="m" onChange={(v) => updateGeometry({ height: v })} min={1.5} max={10} step={0.1} />
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Roof Type</label>
              <select className="input" value={scenario.geometry.roof_type} onChange={(e) => updateGeometry({ roof_type: e.target.value })} style={{ marginBottom: '0.75rem' }}>
                <option value="flat">Flat</option>
                <option value="gable">Gable</option>
                <option value="shed">Shed</option>
                <option value="hip">Hip</option>
              </select>
              <UnitInput label="Roof Pitch" value={scenario.geometry.roof_pitch} unit="°" onChange={(v) => updateGeometry({ roof_pitch: v })} min={0} max={60} />
              <UnitInput label="Orientation" value={scenario.geometry.orientation} unit="°" onChange={(v) => updateGeometry({ orientation: v })} min={0} max={359} />
            </div>
          )}

          {activeWizardStep === 2 && (
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                Wall assembly: {scenario.envelope.wall_layers.length} layers
              </p>
              {scenario.envelope.wall_layers.map((layer, i) => (
                <div key={layer.id} style={{
                  padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)',
                  background: i % 2 === 0 ? 'var(--color-bg-paper-warm)' : 'transparent',
                  marginBottom: '0.25rem', fontSize: '0.8125rem',
                }}>
                  <div style={{ fontWeight: 500 }}>{layer.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem' }}>
                    <span>{layer.thickness_mm} mm</span>
                    <span>λ = {layer.conductivity} W/(m·K)</span>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--color-structure-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-structure-200)' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-structure-600)', marginBottom: '0.25rem' }}>Wall R-value</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-structure-700)' }}>
                  {(scenario.envelope.wall_layers.reduce((sum, l) => sum + (l.thickness_mm / 1000) / l.conductivity, 0) + 0.17).toFixed(2)}
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '0.25rem' }}>m²·K/W</span>
                </div>
              </div>
            </div>
          )}

          {activeWizardStep === 3 && (
            <div>
              <UnitInput label="Occupants" value={scenario.operating.occupants} unit="ppl" onChange={(v) => updateOperating({ occupants: v })} min={0} max={50} step={1} />
              <UnitInput label="Target Temperature" value={scenario.operating.target_temp} unit="°C" onChange={(v) => updateOperating({ target_temp: v })} min={5} max={35} step={0.5} />
              <UnitInput label="Comfort Band" value={scenario.operating.comfort_band} unit="±°C" onChange={(v) => updateOperating({ comfort_band: v })} min={0.5} max={5} step={0.5} />
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>HVAC Mode</label>
              <select className="input" value={scenario.operating.hvac_mode} onChange={(e) => updateOperating({ hvac_mode: e.target.value })} style={{ marginBottom: '0.75rem' }}>
                <option value="free_running">Free Running</option>
                <option value="heated">Heated</option>
                <option value="cooled">Cooled</option>
                <option value="mixed">Mixed (Heat + Cool)</option>
              </select>
              <UnitInput label="Natural Ventilation ACH" value={scenario.operating.ach_natural} unit="ACH" onChange={(v) => updateOperating({ ach_natural: v })} min={0} max={10} step={0.1} />
              <UnitInput label="Infiltration ACH" value={scenario.operating.ach_infiltration} unit="ACH" onChange={(v) => updateOperating({ ach_infiltration: v })} min={0} max={5} step={0.05} />
            </div>
          )}

          {activeWizardStep === 4 && (
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                Optimization objectives and weighting (used when running parametric optimization).
              </p>
              <UnitInput label="Energy Weight" value={0.4} unit="" onChange={() => {}} min={0} max={1} step={0.1} />
              <UnitInput label="Comfort Weight" value={0.4} unit="" onChange={() => {}} min={0} max={1} step={0.1} />
              <UnitInput label="Cost Weight" value={0.2} unit="" onChange={() => {}} min={0} max={1} step={0.1} />
            </div>
          )}

          {activeWizardStep === 5 && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <Play size={32} color="var(--color-solar-600)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Ready to Simulate</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                All parameters configured. Run a 72-hour transient thermal simulation.
              </p>
              <a href={`/scenario/${scenario.id}/simulate`} className="btn btn-solar" style={{ padding: '0.75rem 2rem' }}>
                <Play size={16} /> Launch Simulation
              </a>
            </div>
          )}

          {/* Nav buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border-light)' }}>
            <button className="btn btn-ghost" disabled={activeWizardStep === 0} onClick={() => setActiveWizardStep(Math.max(0, activeWizardStep - 1))}>
              ← Previous
            </button>
            <button className="btn btn-primary" disabled={activeWizardStep === WIZARD_STEPS.length - 1} onClick={() => setActiveWizardStep(Math.min(WIZARD_STEPS.length - 1, activeWizardStep + 1))}>
              Next →
            </button>
          </div>
        </div>

        {/* Center: 3D preview placeholder */}
        <div className="card" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
          <h5 style={{ marginBottom: '1rem' }}>Live Shelter Preview</h5>
          <div style={{
            flex: 1, background: 'var(--color-bg-paper-warm)', borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--color-border-light)', position: 'relative', overflow: 'hidden', minHeight: '400px',
          }}>
            {/* Isometric SVG shelter */}
            <svg viewBox="0 0 400 300" style={{ width: '100%', maxHeight: '100%' }}>
              <g transform="translate(200, 250)">
                {/* Ground plane */}
                <ellipse cx="0" cy="-10" rx="150" ry="40" fill="var(--color-comfort-50)" stroke="var(--color-comfort-200)" strokeWidth="0.5" />
                {/* Floor */}
                <polygon
                  points={`0,-30 ${scenario.geometry.length * 15},-${30 + scenario.geometry.width * 8} 0,-${30 + scenario.geometry.width * 16} -${scenario.geometry.length * 15},-${30 + scenario.geometry.width * 8}`}
                  fill="var(--color-structure-100)" stroke="var(--color-structure-400)" strokeWidth="1.5"
                />
                {/* Left wall */}
                <polygon
                  points={`-${scenario.geometry.length * 15},-${30 + scenario.geometry.width * 8} -${scenario.geometry.length * 15},-${30 + scenario.geometry.width * 8 + scenario.geometry.height * 20} 0,-${30 + scenario.geometry.width * 16 + scenario.geometry.height * 20} 0,-${30 + scenario.geometry.width * 16}`}
                  fill="var(--color-structure-200)" stroke="var(--color-structure-500)" strokeWidth="1.5"
                />
                {/* Right wall */}
                <polygon
                  points={`0,-${30 + scenario.geometry.width * 16} 0,-${30 + scenario.geometry.width * 16 + scenario.geometry.height * 20} ${scenario.geometry.length * 15},-${30 + scenario.geometry.width * 8 + scenario.geometry.height * 20} ${scenario.geometry.length * 15},-${30 + scenario.geometry.width * 8}`}
                  fill="var(--color-structure-100)" stroke="var(--color-structure-400)" strokeWidth="1.5"
                />
                {/* Roof */}
                {scenario.geometry.roof_type === 'gable' ? (
                  <>
                    <polygon
                      points={`-${scenario.geometry.length * 15},-${30 + scenario.geometry.width * 8 + scenario.geometry.height * 20} 0,-${30 + scenario.geometry.width * 16 + scenario.geometry.height * 20 + 15} 0,-${30 + scenario.geometry.width * 16 + scenario.geometry.height * 20}`}
                      fill="var(--color-heat-100)" stroke="var(--color-heat-400)" strokeWidth="1.5"
                    />
                    <polygon
                      points={`0,-${30 + scenario.geometry.width * 16 + scenario.geometry.height * 20} 0,-${30 + scenario.geometry.width * 16 + scenario.geometry.height * 20 + 15} ${scenario.geometry.length * 15},-${30 + scenario.geometry.width * 8 + scenario.geometry.height * 20}`}
                      fill="var(--color-heat-50)" stroke="var(--color-heat-400)" strokeWidth="1.5"
                    />
                  </>
                ) : (
                  <polygon
                    points={`-${scenario.geometry.length * 15},-${30 + scenario.geometry.width * 8 + scenario.geometry.height * 20} 0,-${30 + scenario.geometry.width * 16 + scenario.geometry.height * 20} ${scenario.geometry.length * 15},-${30 + scenario.geometry.width * 8 + scenario.geometry.height * 20}`}
                    fill="var(--color-heat-100)" stroke="var(--color-heat-400)" strokeWidth="1.5"
                  />
                )}
                {/* Compass */}
                <g transform="translate(140, -230)">
                  <circle cx="0" cy="0" r="12" fill="var(--color-bg-card)" stroke="var(--color-border)" strokeWidth="0.5" />
                  <line x1="0" y1="8" x2="0" y2="-8" stroke="var(--color-warning-500)" strokeWidth="1" />
                  <text x="0" y="-12" fontSize="6" fill="var(--color-warning-600)" fontWeight="700" textAnchor="middle">N</text>
                </g>
              </g>
            </svg>
          </div>
        </div>

        {/* Right: Engineering summary */}
        <div className="card">
          <h5 style={{ marginBottom: '1rem' }}>Engineering Summary</h5>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <SummaryBlock label="Floor Area" value={`${(scenario.geometry.length * scenario.geometry.width).toFixed(1)}`} unit="m²" color="var(--color-structure-600)" />
            <SummaryBlock label="Volume" value={`${(scenario.geometry.length * scenario.geometry.width * scenario.geometry.height).toFixed(1)}`} unit="m³" color="var(--color-structure-600)" />
            <SummaryBlock label="Wall Area" value={`${(2 * (scenario.geometry.length + scenario.geometry.width) * scenario.geometry.height).toFixed(1)}`} unit="m²" color="var(--color-structure-500)" />
            <SummaryBlock
              label="Wall U-value"
              value={(1 / (scenario.envelope.wall_layers.reduce((s, l) => s + (l.thickness_mm / 1000) / l.conductivity, 0) + 0.17)).toFixed(2)}
              unit="W/(m²·K)"
              color="var(--color-heat-600)"
            />
            <SummaryBlock label="Elevation" value={`${scenario.location.elevation}`} unit="m" color="var(--color-climate-600)" />
            <SummaryBlock label="Target Temp" value={`${scenario.operating.target_temp}`} unit="°C" color="var(--color-solar-600)" />
            <SummaryBlock label="Occupants" value={`${scenario.operating.occupants}`} unit="ppl" color="var(--color-comfort-600)" />
          </div>

          {/* Autosave indicator */}
          <div style={{
            marginTop: '1.5rem', paddingTop: '0.75rem',
            borderTop: '1px solid var(--color-border-light)',
            fontSize: '0.6875rem', color: 'var(--color-text-muted)',
            display: 'flex', alignItems: 'center', gap: '0.375rem',
          }}>
            <Check size={12} color="var(--color-comfort-500)" />
            {scenario.lastSaved ? `Saved ${new Date(scenario.lastSaved).toLocaleTimeString()}` : 'Auto-save enabled'}
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryBlock({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-paper-warm)', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: '0.125rem' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {value}
        <span className="data-unit">{unit}</span>
      </div>
    </div>
  )
}
