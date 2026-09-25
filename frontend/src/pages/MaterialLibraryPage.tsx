import { motion } from 'framer-motion'
import { Search, Filter } from 'lucide-react'
import { useState } from 'react'

const MATERIALS = [
  { name: 'Brick (Common)', conductivity: 0.84, density: 1700, specific_heat: 800, category: 'Masonry', color: '#C4664A' },
  { name: 'Stone (Granite)', conductivity: 1.5, density: 2500, specific_heat: 900, category: 'Masonry', color: '#8B8680' },
  { name: 'Sandstone', conductivity: 1.7, density: 2200, specific_heat: 920, category: 'Masonry', color: '#D4A574' },
  { name: 'Concrete (Dense)', conductivity: 1.4, density: 2300, specific_heat: 880, category: 'Masonry', color: '#A0A0A0' },
  { name: 'EPS Insulation', conductivity: 0.035, density: 25, specific_heat: 1400, category: 'Insulation', color: '#E8E4DC' },
  { name: 'XPS Insulation', conductivity: 0.034, density: 35, specific_heat: 1400, category: 'Insulation', color: '#B8D4E8' },
  { name: 'Glass Wool', conductivity: 0.04, density: 16, specific_heat: 840, category: 'Insulation', color: '#F5E6A8' },
  { name: 'Rock Wool', conductivity: 0.038, density: 100, specific_heat: 840, category: 'Insulation', color: '#8B7355' },
  { name: 'Mud Phuska', conductivity: 0.52, density: 1622, specific_heat: 880, category: 'Traditional', color: '#A0826D' },
  { name: 'Timber (Pine)', conductivity: 0.13, density: 550, specific_heat: 1700, category: 'Wood', color: '#C9A96E' },
  { name: 'Plywood', conductivity: 0.13, density: 550, specific_heat: 1700, category: 'Wood', color: '#B89B70' },
  { name: 'Cement Plaster', conductivity: 0.7, density: 1300, specific_heat: 840, category: 'Finish', color: '#D0C8BC' },
  { name: 'Lime Plaster', conductivity: 0.7, density: 1600, specific_heat: 840, category: 'Finish', color: '#E8E0D0' },
  { name: 'Metal Sheet (GI)', conductivity: 50, density: 7800, specific_heat: 500, category: 'Metal', color: '#C0C0C0' },
  { name: 'Glass (Single)', conductivity: 1.0, density: 2500, specific_heat: 840, category: 'Glazing', color: '#B8D8E8' },
]

export default function MaterialLibraryPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const categories = [...new Set(MATERIALS.map((m) => m.category))]
  const filtered = MATERIALS.filter((m) => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter && m.category !== categoryFilter) return false
    return true
  })

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>Material Library</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Thermal properties database for construction materials
          </p>
        </div>
        <span className="chip chip-demo">DEMO DATA</span>
      </div>

      {/* Search and filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input className="input" placeholder="Search materials…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          <button className={`btn ${!categoryFilter ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCategoryFilter(null)} style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>All</button>
          {categories.map((c) => (
            <button key={c} className={`btn ${categoryFilter === c ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCategoryFilter(c)} style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>{c}</button>
          ))}
        </div>
      </div>

      {/* Material cards — styled as physical spec-sheet index cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {filtered.map((mat, i) => (
          <motion.div
            key={mat.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            className="card card-tilted"
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '3px', background: mat.color, border: '1px solid rgba(0,0,0,0.1)' }} />
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{mat.name}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{mat.category}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
              <PropBlock label="λ (conductivity)" value={mat.conductivity} unit="W/(m·K)" />
              <PropBlock label="ρ (density)" value={mat.density} unit="kg/m³" />
              <PropBlock label="cₚ (specific heat)" value={mat.specific_heat} unit="J/(kg·K)" />
              <PropBlock label="R per 100mm" value={(0.1 / mat.conductivity).toFixed(2)} unit="m²·K/W" />
            </div>
          </motion.div>
        ))}
      </div>
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
