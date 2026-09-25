import { useScenarioStore } from '@/stores/appStore'
import { GripVertical, Plus, Trash2, ArrowUpDown } from 'lucide-react'
import { useState } from 'react'

export default function EnvelopeBuilderPage() {
  const { scenario, updateEnvelope } = useScenarioStore()
  const { wall_layers, roof_layers, floor_layers, windows } = scenario.envelope
  const [activeTab, setActiveTab] = useState<'walls' | 'roof' | 'floor' | 'windows'>('walls')

  const activeLayers = activeTab === 'walls' ? wall_layers : activeTab === 'roof' ? roof_layers : floor_layers
  const totalR = activeLayers.reduce((sum, l) => sum + (l.thickness_mm / 1000) / l.conductivity, 0) + 0.17
  const uValue = 1 / totalR

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>Envelope Builder</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Build layered wall, roof, and floor assemblies — drag to reorder
      </p>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', background: 'var(--color-bg-paper-warm)', borderRadius: 'var(--radius-md)', padding: '0.25rem' }}>
        {(['walls', 'roof', 'floor', 'windows'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '0.5rem', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              background: activeTab === tab ? 'var(--color-bg-card)' : 'transparent',
              boxShadow: activeTab === tab ? 'var(--shadow-card)' : 'none',
              fontSize: '0.8125rem', fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? 'var(--color-heat-600)' : 'var(--color-text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.04em',
              transition: 'all 0.15s ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab !== 'windows' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
          {/* Layer stack */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h5>Layer Stack (Inside → Outside)</h5>
              <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                <Plus size={12} /> Add Layer
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {activeLayers.map((layer, i) => (
                <div key={layer.id} className="card" style={{
                  display: 'grid', gridTemplateColumns: 'auto 1fr auto',
                  alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                  borderLeft: `3px solid ${layer.conductivity < 0.05 ? 'var(--color-solar-400)' : 'var(--color-structure-400)'}`,
                }}>
                  <GripVertical size={14} style={{ color: 'var(--color-text-muted)', cursor: 'grab' }} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{layer.name}</div>
                    <div style={{ display: 'flex', gap: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                      <span>{layer.thickness_mm} mm</span>
                      <span>λ = {layer.conductivity} W/(m·K)</span>
                      <span>R = {((layer.thickness_mm / 1000) / layer.conductivity).toFixed(3)} m²·K/W</span>
                    </div>
                  </div>
                  <button className="btn-ghost" style={{ color: 'var(--color-warning-500)', padding: '0.25rem' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Summary panel */}
          <div>
            <div className="card" style={{ background: 'var(--color-heat-50)', borderColor: 'var(--color-heat-200)' }}>
              <h5 style={{ color: 'var(--color-heat-600)', marginBottom: '1rem' }}>Thermal Performance</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>Total R-value</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-heat-700)' }}>
                    {totalR.toFixed(3)}<span className="data-unit">m²·K/W</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>U-value</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-heat-700)' }}>
                    {uValue.toFixed(3)}<span className="data-unit">W/(m²·K)</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>Total Thickness</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {activeLayers.reduce((s, l) => s + l.thickness_mm, 0)}<span className="data-unit">mm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual section */}
            <div className="card" style={{ marginTop: '1rem' }}>
              <h5 style={{ marginBottom: '0.75rem' }}>Section View</h5>
              <div style={{ display: 'flex', height: '180px', alignItems: 'stretch', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                {activeLayers.map((l, i) => {
                  const total = activeLayers.reduce((s, x) => s + x.thickness_mm, 0)
                  const pct = (l.thickness_mm / total) * 100
                  const isInsulation = l.conductivity < 0.05
                  return (
                    <div key={l.id} style={{
                      width: `${Math.max(pct, 5)}%`,
                      background: isInsulation ? 'var(--color-solar-200)' : i % 2 === 0 ? 'var(--color-structure-200)' : 'var(--color-structure-100)',
                      borderRight: i < activeLayers.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{
                        writingMode: 'vertical-lr', transform: 'rotate(180deg)',
                        fontSize: '0.5rem', fontWeight: 600, color: 'rgba(0,0,0,0.4)',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {l.thickness_mm}mm
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Windows tab */
        <div>
          {windows.map((w, i) => (
            <div key={i} className="card" style={{ marginBottom: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: '0.75rem', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Face</div>
                <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{w.face}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Size</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>{w.width}×{w.height} m</div>
              </div>
              <div>
                <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Count</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>{w.count}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>U-value</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>{w.u_value}<span className="data-unit">W/(m²·K)</span></div>
              </div>
              <div>
                <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>SHGC</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>{w.shgc}</div>
              </div>
              <button className="btn-ghost" style={{ color: 'var(--color-warning-500)' }}><Trash2 size={14} /></button>
            </div>
          ))}
          <button className="btn btn-outline" style={{ marginTop: '0.5rem' }}><Plus size={14} /> Add Window</button>
        </div>
      )}
    </div>
  )
}
