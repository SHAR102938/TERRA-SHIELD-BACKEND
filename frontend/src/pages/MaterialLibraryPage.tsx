import { motion } from 'framer-motion'
import { Search, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { fetchMaterials, type Material } from '@/lib/api'
import { useScenarioStore } from '@/stores/appStore'

export default function MaterialLibraryPage() {
  const { scenario, updateEnvelope } = useScenarioStore()
  const [search, setSearch] = useState('')
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const selectedId = scenario.envelope.material_id;

  const handleSelect = (id: number) => {
    updateEnvelope({ material_id: id })
  }

  useEffect(() => {
    fetchMaterials()
      .then(data => { setMaterials(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const filtered = materials.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase())
  )

  // Color map for visual identity
  const colorMap: Record<string, string> = {
    'Insulated Fabric': '#E8D5B7',
    'PU Foam':          '#F5E6A8',
    'Rock Wool':        '#8B7355',
    'Fiberglass':       '#B8D4E8',
    'Aluminium':        '#C0C0C0',
    'Concrete':         '#A0A0A0',
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>Material Library</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Thermal properties database — loaded from backend
          </p>
        </div>
        {loading
          ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}><Loader2 size={14} className="animate-pulse-soft" /> Loading…</span>
          : error
            ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-heat-500)', fontSize: '0.8125rem' }}><AlertTriangle size={14} /> {error}</span>
            : <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-comfort-600)', fontSize: '0.8125rem' }}><CheckCircle2 size={14} /> {materials.length} materials loaded from API</span>
        }
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '320px' }}>
        <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        <input className="input" placeholder="Search materials…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ height: '160px', background: 'var(--color-bg-paper-warm)', opacity: 0.6 }} />
          ))}
        </div>
      )}

      {/* Material cards */}
      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {filtered.map((mat, i) => (
            <motion.div
              key={mat.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="card"
              onClick={() => handleSelect(mat.id)}
              style={{
                cursor: 'pointer',
                border: selectedId === mat.id ? '2px solid var(--color-comfort-500)' : '1px solid var(--color-border-light)',
                outline: selectedId === mat.id ? '0' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '3px', background: colorMap[mat.name] || '#B0B0B0', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{mat.name}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>ID {mat.id} · {mat.thickness * 1000}mm</div>
                </div>
                {selectedId === mat.id && <CheckCircle2 size={14} color="var(--color-comfort-500)" />}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
                <PropBlock label="λ conductivity" value={mat.thermal_conductivity} unit=" W/(m·K)" />
                <PropBlock label="ρ density" value={mat.density} unit=" kg/m³" />
                <PropBlock label="cₚ specific heat" value={mat.specific_heat} unit=" J/(kg·K)" />
                <PropBlock label="R-value" value={(mat.thickness / mat.thermal_conductivity).toFixed(2)} unit=" m²·K/W" />
                <PropBlock label="Cost" value={mat.cost_per_m2} unit=" $/m²" />
                <PropBlock label="Weight" value={mat.weight_per_m2} unit=" kg/m²" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function PropBlock({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <div style={{ padding: '0.375rem 0.5rem', background: 'var(--color-bg-paper-warm)', borderRadius: 'var(--radius-sm)' }}>
      <div style={{ fontSize: '0.5625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 500 }}>
        {value}<span className="data-unit">{unit}</span>
      </div>
    </div>
  )
}
