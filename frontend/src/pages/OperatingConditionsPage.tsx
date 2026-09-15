import { useScenarioStore } from '@/stores/appStore'
import { Users, Thermometer, Wind, Zap } from 'lucide-react'

export default function OperatingConditionsPage() {
  const { scenario, updateOperating } = useScenarioStore()
  const op = scenario.operating

  function Field({ label, value, unit, onChange, min, max, step = 1, icon: Icon }: any) {
    return (
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.375rem' }}>
          {Icon && <Icon size={13} color="var(--color-text-muted)" />}
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--color-heat-500)' }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 600, minWidth: '4rem', textAlign: 'right' }}>
            {value}<span className="data-unit">{unit}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>Operating Conditions</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Occupancy, HVAC mode, ventilation, and comfort targets
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card section-heat" style={{ paddingLeft: '1.5rem' }}>
          <h5 style={{ marginBottom: '1.25rem' }}>Occupancy & Internal Gains</h5>
          <Field label="Occupants" value={op.occupants} unit=" ppl" onChange={(v: number) => updateOperating({ occupants: v })} min={0} max={20} step={1} icon={Users} />
          <Field label="Metabolic Rate" value={op.metabolic_rate} unit=" W" onChange={(v: number) => updateOperating({ metabolic_rate: v })} min={50} max={200} step={10} />
          <Field label="Equipment/Lighting Gains" value={op.internal_gains} unit=" W" onChange={(v: number) => updateOperating({ internal_gains: v })} min={0} max={1000} step={25} icon={Zap} />

          <div style={{ padding: '0.75rem', background: 'var(--color-solar-50)', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-solar-600)' }}>Total Internal Gains</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-solar-700)' }}>
              {op.occupants * op.metabolic_rate + op.internal_gains}<span className="data-unit">W</span>
            </div>
          </div>
        </div>

        <div className="card section-climate" style={{ paddingLeft: '1.5rem' }}>
          <h5 style={{ marginBottom: '1.25rem' }}>Comfort & HVAC</h5>
          <Field label="Target Temperature" value={op.target_temp} unit="°C" onChange={(v: number) => updateOperating({ target_temp: v })} min={5} max={35} step={0.5} icon={Thermometer} />
          <Field label="Comfort Band" value={op.comfort_band} unit=" ±°C" onChange={(v: number) => updateOperating({ comfort_band: v })} min={0.5} max={5} step={0.5} />

          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>HVAC Mode</label>
          <select className="input" value={op.hvac_mode} onChange={(e) => updateOperating({ hvac_mode: e.target.value })} style={{ marginBottom: '1.25rem' }}>
            <option value="free_running">Free Running (Passive)</option>
            <option value="heated">Heated Only</option>
            <option value="cooled">Cooled Only</option>
            <option value="mixed">Mixed (Heat + Cool)</option>
          </select>

          <Field label="Natural Ventilation" value={op.ach_natural} unit=" ACH" onChange={(v: number) => updateOperating({ ach_natural: v })} min={0} max={10} step={0.1} icon={Wind} />
          <Field label="Infiltration" value={op.ach_infiltration} unit=" ACH" onChange={(v: number) => updateOperating({ ach_infiltration: v })} min={0} max={3} step={0.05} />
        </div>
      </div>
    </div>
  )
}
