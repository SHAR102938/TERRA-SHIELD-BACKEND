import { useScenarioStore } from '@/stores/appStore'
import { Box, Ruler, RotateCw } from 'lucide-react'

export default function GeometryWorkbenchPage() {
  const { scenario, updateGeometry } = useScenarioStore()
  const { length, width, height, roof_type, roof_pitch, orientation } = scenario.geometry

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>Geometry Workbench</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Define shelter dimensions and visualize in 2D plan, section, and 3D views
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.25rem' }}>
        {/* Controls */}
        <div className="card section-structure" style={{ paddingLeft: '1.5rem' }}>
          <h5 style={{ marginBottom: '1rem' }}>Dimensions</h5>
          {[
            { label: 'Length', key: 'length' as const, unit: 'm', val: length, min: 1, max: 50, step: 0.5 },
            { label: 'Width', key: 'width' as const, unit: 'm', val: width, min: 1, max: 50, step: 0.5 },
            { label: 'Height', key: 'height' as const, unit: 'm', val: height, min: 1.5, max: 10, step: 0.1 },
            { label: 'Roof Pitch', key: 'roof_pitch' as const, unit: '°', val: roof_pitch, min: 0, max: 60, step: 1 },
            { label: 'Orientation', key: 'orientation' as const, unit: '°', val: orientation, min: 0, max: 359, step: 5 },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 500 }}>{f.val}{f.unit}</span>
              </div>
              <input
                type="range" min={f.min} max={f.max} step={f.step} value={f.val}
                onChange={(e) => updateGeometry({ [f.key]: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--color-structure-500)' }}
              />
            </div>
          ))}
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Roof Type</label>
          <select className="input" value={roof_type} onChange={(e) => updateGeometry({ roof_type: e.target.value })}>
            <option value="flat">Flat</option>
            <option value="gable">Gable</option>
            <option value="shed">Shed</option>
            <option value="hip">Hip</option>
          </select>

          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--color-structure-50)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-structure-600)' }}>Summary</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              <span>Floor: {(length * width).toFixed(1)} m²</span>
              <span>Volume: {(length * width * height).toFixed(1)} m³</span>
              <span>Walls: {(2 * (length + width) * height).toFixed(1)} m²</span>
            </div>
          </div>
        </div>

        {/* Visualizations */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Floor Plan */}
          <div className="card">
            <h5 style={{ marginBottom: '0.75rem' }}>Floor Plan</h5>
            <svg viewBox="0 0 300 250" style={{ width: '100%' }}>
              <rect x="50" y="40" width={length * 25} height={width * 25} fill="var(--color-structure-50)" stroke="var(--color-structure-500)" strokeWidth="2" />
              {/* Dimension lines */}
              <line x1="50" y1={50 + width * 25 + 15} x2={50 + length * 25} y2={50 + width * 25 + 15} stroke="var(--color-text-muted)" strokeWidth="0.5" />
              <text x={50 + length * 12.5} y={50 + width * 25 + 28} fontSize="9" fill="var(--color-structure-600)" textAnchor="middle" fontFamily="var(--font-mono)">{length} m</text>
              <line x1={60 + length * 25 + 10} y1="40" x2={60 + length * 25 + 10} y2={40 + width * 25} stroke="var(--color-text-muted)" strokeWidth="0.5" />
              <text x={60 + length * 25 + 22} y={40 + width * 12.5} fontSize="9" fill="var(--color-structure-600)" textAnchor="middle" fontFamily="var(--font-mono)" transform={`rotate(90, ${60 + length * 25 + 22}, ${40 + width * 12.5})`}>{width} m</text>
              {/* North arrow */}
              <g transform="translate(25, 30)">
                <line x1="0" y1="15" x2="0" y2="0" stroke="var(--color-warning-500)" strokeWidth="1.5" markerEnd="url(#arrow2)" />
                <text x="0" y="-5" fontSize="8" fill="var(--color-warning-600)" fontWeight="700" textAnchor="middle">N</text>
              </g>
              {/* Window markers on south wall */}
              {scenario.envelope.windows.filter(w => w.face === 'south').map((w, i) => (
                <rect key={i} x={80 + i * 40} y={40 + width * 25 - 2} width={w.width * 20} height="4" fill="var(--color-solar-400)" rx="1" />
              ))}
              <defs>
                <marker id="arrow2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-warning-500)" />
                </marker>
              </defs>
            </svg>
          </div>

          {/* Section View */}
          <div className="card">
            <h5 style={{ marginBottom: '0.75rem' }}>Section View</h5>
            <svg viewBox="0 0 300 250" style={{ width: '100%' }}>
              {/* Ground line */}
              <line x1="20" y1="200" x2="280" y2="200" stroke="var(--color-text-muted)" strokeWidth="1" />
              {/* Hatching below ground */}
              {Array.from({ length: 15 }).map((_, i) => (
                <line key={i} x1={30 + i * 18} y1="200" x2={20 + i * 18} y2="215" stroke="var(--color-text-muted)" strokeWidth="0.5" />
              ))}
              {/* Walls */}
              <rect x="60" y={200 - height * 30} width="12" height={height * 30} fill="var(--color-structure-200)" stroke="var(--color-structure-500)" strokeWidth="1" />
              <rect x={60 + width * 25} y={200 - height * 30} width="12" height={height * 30} fill="var(--color-structure-200)" stroke="var(--color-structure-500)" strokeWidth="1" />
              {/* Floor */}
              <rect x="60" y="200" width={width * 25 + 12} height="8" fill="var(--color-structure-100)" stroke="var(--color-structure-400)" strokeWidth="1" />
              {/* Roof */}
              {roof_type === 'gable' ? (
                <polygon
                  points={`55,${200 - height * 30} ${66 + width * 12.5},${200 - height * 30 - 25} ${77 + width * 25},${200 - height * 30}`}
                  fill="var(--color-heat-100)" stroke="var(--color-heat-500)" strokeWidth="1.5"
                />
              ) : (
                <rect x="55" y={200 - height * 30 - 6} width={width * 25 + 22} height="6" fill="var(--color-heat-100)" stroke="var(--color-heat-500)" strokeWidth="1" />
              )}
              {/* Height dimension */}
              <line x1="40" y1="200" x2="40" y2={200 - height * 30} stroke="var(--color-text-muted)" strokeWidth="0.5" />
              <text x="30" y={200 - height * 15} fontSize="8" fill="var(--color-structure-600)" textAnchor="middle" fontFamily="var(--font-mono)" transform={`rotate(-90, 30, ${200 - height * 15})`}>{height} m</text>
              {/* Wall hatching */}
              {Array.from({ length: Math.floor(height * 3) }).map((_, i) => (
                <line key={i} x1="62" y1={200 - i * 10} x2="70" y2={200 - i * 10 - 8} stroke="var(--color-structure-400)" strokeWidth="0.3" />
              ))}
            </svg>
          </div>

          {/* 3D View spanning full width */}
          <div className="card" style={{ gridColumn: '1 / -1', minHeight: '300px' }}>
            <h5 style={{ marginBottom: '0.75rem' }}>3D Preview</h5>
            <div style={{ background: 'var(--color-bg-paper-warm)', borderRadius: 'var(--radius-md)', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--color-border)' }}>
              <svg viewBox="0 0 400 260" style={{ width: '80%' }}>
                <g transform="translate(200, 220)">
                  <polygon points={`0,-20 ${length*12},-${20+width*6} 0,-${20+width*12} -${length*12},-${20+width*6}`} fill="var(--color-structure-100)" stroke="var(--color-structure-400)" strokeWidth="1.5" />
                  <polygon points={`-${length*12},-${20+width*6} -${length*12},-${20+width*6+height*18} 0,-${20+width*12+height*18} 0,-${20+width*12}`} fill="var(--color-structure-200)" stroke="var(--color-structure-500)" strokeWidth="1.5" />
                  <polygon points={`0,-${20+width*12} 0,-${20+width*12+height*18} ${length*12},-${20+width*6+height*18} ${length*12},-${20+width*6}`} fill="var(--color-structure-100)" stroke="var(--color-structure-400)" strokeWidth="1.5" />
                  {roof_type === 'gable' && (
                    <>
                      <polygon points={`-${length*12},-${20+width*6+height*18} 0,-${20+width*12+height*18+15} 0,-${20+width*12+height*18}`} fill="var(--color-heat-100)" stroke="var(--color-heat-400)" strokeWidth="1.5" />
                      <polygon points={`0,-${20+width*12+height*18} 0,-${20+width*12+height*18+15} ${length*12},-${20+width*6+height*18}`} fill="var(--color-heat-50)" stroke="var(--color-heat-400)" strokeWidth="1.5" />
                    </>
                  )}
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
