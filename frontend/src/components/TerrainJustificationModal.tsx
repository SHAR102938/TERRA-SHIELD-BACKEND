import { X, BookOpen, ExternalLink, ShieldCheck, Sun, Layers, Thermometer, Wind } from 'lucide-react'
import { useScenarioStore } from '@/stores/appStore'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function TerrainJustificationModal({ isOpen, onClose }: Props) {
  const { scenario } = useScenarioStore()
  if (!isOpen) return null

  const isLeh = scenario.location.climate_zone.toLowerCase().includes('cold') || scenario.location.name.toLowerCase().includes('leh')
  const isJaisalmer = scenario.location.climate_zone.toLowerCase().includes('arid') || scenario.location.name.toLowerCase().includes('jaisalmer')
  const isTawang = scenario.location.name.toLowerCase().includes('tawang') || scenario.location.climate_zone.toLowerCase().includes('cloudy')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div className="card" style={{
        maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
        padding: '2rem', position: 'relative', background: 'var(--color-bg-paper)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="badge badge-structure" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <BookOpen size={12} />
            SIH26051 Digital Output
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Terrain: <b>{scenario.location.name}</b> ({scenario.location.climate_zone})
          </span>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1rem' }}>
          Terrain Preset Justification Sheet
        </h2>

        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          This document establishes the official engineering rationale, physical boundary conditions, and design constraints applied for the <b>{scenario.location.name}</b> terrain preset, benchmarked against DRDO defence specifications and national high-altitude building guidelines.
        </p>

        {/* Core Rationale Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'var(--color-bg-paper-warm)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--color-solar-600)' }}>
              <Sun size={16} /> Climate & Solar Strategy
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {isLeh && "Cold desert at 3,500m elevation. Extreme sub-zero temperatures (-20°C winter) with high clearness index (>0.7) and intense direct solar radiation (GHI > 700 W/m²). Solar orientation strictly South (180°) to maximize diurnal passive heat storage into heavy thermal mass."}
              {isJaisalmer && "Thar desert arid climate. Extreme ambient summer highs (>42°C) with diurnal swings of 12-15°C. Low relative humidity (<20%). High-albedo reflective roof coatings, small north/east windows, and heavy nocturnal purge ventilation."}
              {isTawang && "High-altitude humid climate (3,048m). High cloud cover, dense monsoon rainfall, and high humidity (>80%). Solar gains are subdued; strategy prioritizes steep 25° gable roof for snow/rain runoff and moisture barrier retarder to prevent interstitial condensation."}
              {!isLeh && !isJaisalmer && !isTawang && "Area-specific microclimate strategy customized for site coordinates and altitude."}
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--color-bg-paper-warm)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--color-heat-600)' }}>
              <Layers size={16} /> Envelope & Material Selection
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {isLeh && "Stone masonry internal thermal storage combined with 100mm exterior EPS/Rockwool insulation. U-value target ≤ 0.35 W/m²K per DRDO DIHAR Leh recommendations, eliminating night heat loss while dampening diurnal thermal swing."}
              {isJaisalmer && "High thermal lag exterior sandstone with lime concrete roof and mud phuska layer. Minimizes thermal transmission during daytime solar peak hours."}
              {isTawang && "Pine timber interior finish with glass wool insulation and exterior corrugated galvanized iron (CGI) envelope. Elevated timber floor to decouple from saturated sub-base moisture."}
              {!isLeh && !isJaisalmer && !isTawang && "Layer assembly optimized for local diurnal temperature variation and transport weight."}
            </p>
          </div>
        </div>

        {/* References Matrix */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>
            Authoritative Engineering & Research References
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <div style={{ padding: '0.625rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
              <b>1. DRDO Him-Tapak (Defence Research & Development Organisation)</b>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                Space Heating Device Bukhari Him-Tapak — Establishes ~50% kerosene fuel consumption reduction and backblast/CO elimination benchmarks for high-altitude military shelters.
              </div>
            </div>
            <div style={{ padding: '0.625rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
              <b>2. DRDO DIHAR (Defence Institute of High Altitude Research, Leh)</b>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                Solar Thermal Heating Technology Transfer — Mandates South-facing passive solar gain design and R-values for military posts across Ladakh/Siachen regions.
              </div>
            </div>
            <div style={{ padding: '0.625rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
              <b>3. G.B. Pant National Institute of Himalayan Environment</b>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                Practical Guide for Passive Solar Heated Buildings (PSHBs) — Technical guidance for solar window-to-wall ratios (WWR 15-20%) and thermal storage mass in the Himalayas.
              </div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Acknowledge Rationale
          </button>
        </div>
      </div>
    </div>
  )
}
