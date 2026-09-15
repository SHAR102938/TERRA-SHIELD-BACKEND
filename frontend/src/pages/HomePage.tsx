import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import {
  MapPin, Cloud, Box, Layers, Thermometer, Play, BarChart3,
  Target, CheckCircle2, FileText, ArrowRight, ChevronDown,
  Sun, Wind, Zap, Shield
} from 'lucide-react'

/* ── Scroll-triggered section component ──────────────────────────────── */
function RevealSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/* ── Pipeline stage card ─────────────────────────────────────────────── */
const PIPELINE_STAGES = [
  {
    icon: MapPin, color: '#0F766E', bg: '#ECFDF5', label: 'Site & Climate',
    title: 'Location-Aware Intelligence',
    desc: 'Select any site in India — from Leh\'s cold desert at 3,500m to Jaisalmer\'s hot arid plains. NASA POWER satellite data delivers real hourly climate profiles: temperature, humidity, wind, and solar irradiance.',
    metric: '34.15°N, 77.58°E', metricLabel: 'Leh coordinates',
    visual: 'climate',
  },
  {
    icon: Box, color: '#4338CA', bg: '#EEF2FF', label: 'Shelter Geometry',
    title: 'Parametric Design Workbench',
    desc: 'Define rectangular shelter geometry with interactive 3D visualization. Adjust dimensions, roof type, pitch, and orientation — see U-values and thermal mass update in real time.',
    metric: '6 × 4 × 3 m', metricLabel: 'Floor plan',
    visual: 'geometry',
  },
  {
    icon: Layers, color: '#C2410C', bg: '#FFF7ED', label: 'Envelope & Materials',
    title: 'Layered Envelope Builder',
    desc: 'Drag-and-drop material layers to compose wall, roof, and floor assemblies. Each layer shows thermal resistance, and the stack\'s composite U-value updates instantly.',
    metric: '0.32 W/(m²·K)', metricLabel: 'Wall U-value',
    visual: 'envelope',
  },
  {
    icon: Thermometer, color: '#D97706', bg: '#FFFBEB', label: 'Thermal Simulation',
    title: 'RC-Network Transient Solver',
    desc: 'A lumped-parameter resistance-capacitance model computes indoor temperature hour-by-hour. Watch the simulation pipeline animate in real time as each physics module executes.',
    metric: '72 h', metricLabel: 'Simulation period',
    visual: 'simulation',
  },
  {
    icon: Target, color: '#16A34A', bg: '#F0FDF4', label: 'Optimization',
    title: 'Deterministic Pareto Optimization',
    desc: 'Parametric sweep over insulation, glazing, and ventilation. Weighted scoring ranks designs by energy, comfort, and cost — with fully traceable metric deltas, never black-box AI.',
    metric: '84 designs', metricLabel: 'Evaluated',
    visual: 'optimization',
  },
  {
    icon: CheckCircle2, color: '#0D9488', bg: '#ECFDF5', label: 'Validation',
    title: 'Reference Case Verification',
    desc: 'Compare THERMASHELL predictions against ANSYS reference curves. MAE, RMSE, and bias metrics quantify accuracy — all clearly labeled DEMO/REFERENCE CASE.',
    metric: 'MAE < 1.5°C', metricLabel: 'Accuracy target',
    visual: 'validation',
  },
]

function StageCard({ stage, index }: { stage: typeof PIPELINE_STAGES[0]; index: number }) {
  const Icon = stage.icon

  return (
    <RevealSection delay={index * 0.1}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: index % 2 === 0 ? '1fr 1fr' : '1fr 1fr',
        gap: '3rem',
        alignItems: 'center',
        padding: '3rem 0',
        direction: index % 2 === 0 ? 'ltr' : 'rtl',
      }}>
        {/* Text side */}
        <div style={{ direction: 'ltr' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: 'var(--radius-sm)',
              background: stage.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={16} color={stage.color} strokeWidth={2} />
            </div>
            <span style={{
              fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: stage.color,
            }}>
              {stage.label}
            </span>
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500,
            color: 'var(--color-text-primary)', marginBottom: '1rem', lineHeight: 1.2,
          }}>
            {stage.title}
          </h2>

          <p style={{
            fontSize: '0.9375rem', lineHeight: 1.65, color: 'var(--color-text-secondary)',
            marginBottom: '1.5rem', maxWidth: '480px',
          }}>
            {stage.desc}
          </p>

          <div style={{
            display: 'inline-flex', alignItems: 'baseline', gap: '0.5rem',
            padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
            background: stage.bg, border: `1px solid ${stage.color}20`,
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '1.125rem', fontWeight: 600, color: stage.color,
            }}>
              {stage.metric}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {stage.metricLabel}
            </span>
          </div>
        </div>

        {/* Visual side */}
        <div style={{ direction: 'ltr' }}>
          <StageMiniViz stage={stage} />
        </div>
      </div>
    </RevealSection>
  )
}

/* ── Mini visualizations for each pipeline stage ─────────────────────── */
function StageMiniViz({ stage }: { stage: typeof PIPELINE_STAGES[0] }) {
  const vizStyle: React.CSSProperties = {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border-light)',
    boxShadow: 'var(--shadow-card)',
    padding: '1.5rem',
    minHeight: '220px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  }

  if (stage.visual === 'climate') {
    // Mini temperature chart
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const temps = hours.map((h) => -10 + 5 * Math.sin(2 * Math.PI * h / 24 - Math.PI / 2))
    const maxT = Math.max(...temps), minT = Math.min(...temps)
    const range = maxT - minT || 1

    return (
      <div style={vizStyle}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
          24-Hour Temperature Profile · Leh Winter
        </div>
        <svg viewBox="0 0 300 120" style={{ width: '100%' }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1="30" y1={10 + f * 100} x2="295" y2={10 + f * 100} stroke="var(--color-border-light)" strokeWidth="0.5" />
          ))}
          {/* Temperature curve */}
          <path
            d={`M ${hours.map((h) => `${30 + (h / 23) * 265},${10 + (1 - (temps[h] - minT) / range) * 100}`).join(' L ')}`}
            fill="none" stroke="var(--color-climate-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          />
          {/* Axis labels */}
          <text x="5" y="15" fontSize="7" fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{maxT.toFixed(0)}°C</text>
          <text x="5" y="112" fontSize="7" fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{minT.toFixed(0)}°C</text>
          <text x="30" y="118" fontSize="7" fill="var(--color-text-muted)" fontFamily="var(--font-mono)">00:00</text>
          <text x="260" y="118" fontSize="7" fill="var(--color-text-muted)" fontFamily="var(--font-mono)">23:00</text>
        </svg>
      </div>
    )
  }

  if (stage.visual === 'geometry') {
    return (
      <div style={vizStyle}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
          3D Shelter Preview
        </div>
        <svg viewBox="0 0 300 160" style={{ width: '100%' }}>
          {/* Isometric shelter */}
          <g transform="translate(150, 130)">
            {/* Floor */}
            <polygon points="0,-20 100,-60 0,-100 -100,-60" fill="var(--color-structure-100)" stroke="var(--color-structure-400)" strokeWidth="1.5" />
            {/* Left wall */}
            <polygon points="-100,-60 -100,-120 0,-160 0,-100" fill="var(--color-structure-200)" stroke="var(--color-structure-500)" strokeWidth="1.5" />
            {/* Right wall */}
            <polygon points="0,-100 0,-160 100,-120 100,-60" fill="var(--color-structure-100)" stroke="var(--color-structure-400)" strokeWidth="1.5" />
            {/* Roof left */}
            <polygon points="-100,-120 0,-170 0,-160" fill="var(--color-heat-100)" stroke="var(--color-heat-400)" strokeWidth="1.5" />
            <polygon points="0,-170 100,-120 0,-160" fill="var(--color-heat-50)" stroke="var(--color-heat-400)" strokeWidth="1.5" />
            {/* Dimension lines */}
            <line x1="-100" y1="-50" x2="0" y2="-10" stroke="var(--color-text-muted)" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x="-60" y="-25" fontSize="8" fill="var(--color-structure-600)" fontFamily="var(--font-mono)" transform="rotate(-27, -60, -25)">6 m</text>
            <text x="55" y="-75" fontSize="8" fill="var(--color-structure-600)" fontFamily="var(--font-mono)" transform="rotate(27, 55, -75)">4 m</text>
            {/* North arrow */}
            <g transform="translate(120, -140)">
              <line x1="0" y1="10" x2="0" y2="-10" stroke="var(--color-text-muted)" strokeWidth="1" markerEnd="url(#arrow)" />
              <text x="5" y="-8" fontSize="7" fill="var(--color-text-muted)" fontWeight="600">N</text>
            </g>
          </g>
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-text-muted)" />
            </marker>
          </defs>
        </svg>
      </div>
    )
  }

  if (stage.visual === 'envelope') {
    const layers = [
      { name: 'Plaster', width: 8, color: '#D4C5A9' },
      { name: 'Stone', width: 50, color: '#9B8B7A' },
      { name: 'EPS Insulation', width: 30, color: '#FFD166' },
      { name: 'Plaster', width: 8, color: '#D4C5A9' },
    ]
    return (
      <div style={vizStyle}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
          Wall Section · Layer Stack
        </div>
        <div style={{ display: 'flex', gap: '0', height: '140px', alignItems: 'stretch' }}>
          <div style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', fontSize: '0.625rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', paddingRight: '0.5rem' }}>
            INTERIOR
          </div>
          {layers.map((l, i) => (
            <div key={i} style={{
              width: `${l.width}%`, background: l.color, borderRadius: i === 0 ? '4px 0 0 4px' : i === layers.length - 1 ? '0 4px 4px 0' : '0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
              borderRight: i < layers.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
            }}>
              <span style={{
                writingMode: 'vertical-lr', transform: 'rotate(180deg)',
                fontSize: '0.5625rem', fontWeight: 600, color: 'rgba(0,0,0,0.5)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {l.name}
              </span>
            </div>
          ))}
          <div style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', fontSize: '0.625rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', paddingLeft: '0.5rem' }}>
            EXTERIOR
          </div>
        </div>
      </div>
    )
  }

  if (stage.visual === 'simulation') {
    const stages = ['Climate', 'Solar', 'Thermal', 'Ventilation', 'Comfort', 'Results']
    return (
      <div style={vizStyle}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Simulation Pipeline
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {stages.map((s, i) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
              viewport={{ once: true }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-sm)',
                background: i < 4 ? 'var(--color-comfort-50)' : 'var(--color-bg-paper-warm)',
              }}
            >
              <div style={{
                width: '1.25rem', height: '1.25rem', borderRadius: '50%',
                background: i < 4 ? 'var(--color-comfort-500)' : 'var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {i < 4 && <CheckCircle2 size={10} color="white" />}
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: i < 4 ? 500 : 400, color: i < 4 ? 'var(--color-comfort-700)' : 'var(--color-text-muted)' }}>
                {s}
              </span>
              {i < 4 && (
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--color-comfort-600)' }}>
                  ✓
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  if (stage.visual === 'optimization') {
    // Mini Pareto scatter
    const points = Array.from({ length: 20 }, () => ({
      x: 20 + Math.random() * 260,
      y: 20 + Math.random() * 100,
      pareto: Math.random() > 0.7,
    }))
    return (
      <div style={vizStyle}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
          Pareto Frontier · Energy vs Comfort
        </div>
        <svg viewBox="0 0 300 130" style={{ width: '100%' }}>
          <line x1="30" y1="120" x2="295" y2="120" stroke="var(--color-border)" strokeWidth="0.5" />
          <line x1="30" y1="10" x2="30" y2="120" stroke="var(--color-border)" strokeWidth="0.5" />
          <text x="150" y="128" fontSize="7" fill="var(--color-text-muted)" textAnchor="middle" fontFamily="var(--font-mono)">Energy (kWh)</text>
          <text x="5" y="65" fontSize="7" fill="var(--color-text-muted)" transform="rotate(-90, 10, 65)" fontFamily="var(--font-mono)">Comfort %</text>
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={p.pareto ? 5 : 3}
              fill={p.pareto ? 'var(--color-comfort-500)' : 'var(--color-border)'}
              stroke={p.pareto ? 'var(--color-comfort-700)' : 'none'} strokeWidth="1.5"
              opacity={p.pareto ? 1 : 0.5}
            />
          ))}
          {/* Pareto frontier line */}
          <path d="M 40,100 Q 80,80 120,50 T 250,25" fill="none" stroke="var(--color-comfort-400)" strokeWidth="1.5" strokeDasharray="4,4" />
        </svg>
      </div>
    )
  }

  // Validation
  return (
    <div style={vizStyle}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
        Validation · THERMASHELL vs Reference
      </div>
      <svg viewBox="0 0 300 120" style={{ width: '100%' }}>
        <line x1="30" y1="110" x2="295" y2="110" stroke="var(--color-border)" strokeWidth="0.5" />
        {/* THERMASHELL curve */}
        <path d="M 30,80 Q 80,30 140,55 T 220,45 T 290,65" fill="none" stroke="var(--color-climate-500)" strokeWidth="2" />
        {/* Reference curve */}
        <path d="M 30,78 Q 80,32 140,52 T 220,48 T 290,63" fill="none" stroke="var(--color-heat-500)" strokeWidth="2" strokeDasharray="5,5" />
        {/* Legend */}
        <line x1="40" y1="15" x2="55" y2="15" stroke="var(--color-climate-500)" strokeWidth="2" />
        <text x="60" y="18" fontSize="7" fill="var(--color-text-secondary)">THERMASHELL</text>
        <line x1="140" y1="15" x2="155" y2="15" stroke="var(--color-heat-500)" strokeWidth="2" strokeDasharray="5,5" />
        <text x="160" y="18" fontSize="7" fill="var(--color-text-secondary)">ANSYS Reference</text>
        <rect x="220" y="8" width="70" height="14" rx="3" fill="#FEF3C7" stroke="#D97706" strokeWidth="0.5" strokeDasharray="2,2" />
        <text x="228" y="18" fontSize="6" fill="#92400E" fontWeight="600">DEMO DATA</text>
      </svg>
    </div>
  )
}

/* ── Main HomePage ───────────────────────────────────────────────────── */
export default function HomePage() {
  const [scrollY, setScrollY] = useState(0)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollProgress = Math.min(100, (scrollY / (document.documentElement.scrollHeight - window.innerHeight || 1)) * 100)

  return (
    <div style={{ background: 'var(--color-bg-paper)', minHeight: '100vh' }}>
      {/* Scroll progress */}
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <div ref={heroRef} style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '2rem', position: 'relative',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: '3rem', height: '3rem', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-heat-500), var(--color-solar-500))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(234, 88, 12, 0.25)',
            }}>
              <Shield size={24} color="white" />
            </div>
            <span className="chip chip-demo" style={{ fontSize: '0.625rem' }}>SIH26051</span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1rem',
            letterSpacing: '-0.02em', lineHeight: 1.1,
          }}>
            THERMASHELL
          </h1>

          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1rem, 2vw, 1.375rem)',
            fontWeight: 400, fontStyle: 'italic', color: 'var(--color-text-secondary)',
            marginBottom: '1.5rem', maxWidth: '600px', lineHeight: 1.4,
          }}>
            Software-Based Area-Specific Shelter<br />Thermal Design System
          </p>

          <p style={{
            fontSize: '0.9375rem', color: 'var(--color-text-muted)', marginBottom: '2.5rem',
            maxWidth: '520px', lineHeight: 1.6,
          }}>
            An engineering workbench for designing thermally comfortable shelters
            optimized for India's diverse climate zones — from Ladakh's frozen peaks
            to Rajasthan's scorching deserts.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/scenario/demo-leh-001" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '0.9375rem' }}>
              Open Workspace <ArrowRight size={16} />
            </Link>
            <Link to="/projects" className="btn btn-outline" style={{ padding: '0.75rem 2rem', fontSize: '0.9375rem' }}>
              View Projects
            </Link>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          style={{
            position: 'absolute', bottom: '2rem',
            color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem',
          }}
        >
          <span style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>Explore the Pipeline</span>
          <ChevronDown size={18} />
        </motion.div>
      </div>

      {/* ── Pipeline Narrative ──────────────────────────────────────────── */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '4rem 2rem 8rem' }}>
        <RevealSection>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h5 style={{ marginBottom: '0.5rem' }}>The Complete Pipeline</h5>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 500 }}>
              From Climate Data to Validated Design
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', maxWidth: '560px', margin: '1rem auto 0', lineHeight: 1.6 }}>
              THERMASHELL takes you through a complete engineering workflow — each stage
              building on the last to produce a thermally optimized shelter design.
            </p>
          </div>
        </RevealSection>

        {/* Pipeline stages */}
        {PIPELINE_STAGES.map((stage, i) => (
          <StageCard key={stage.label} stage={stage} index={i} />
        ))}

        {/* Final CTA */}
        <RevealSection>
          <div style={{
            textAlign: 'center', padding: '4rem 2rem', marginTop: '4rem',
            background: 'var(--color-bg-card)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-light)', boxShadow: 'var(--shadow-card)',
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, marginBottom: '1rem' }}>
              Ready to design?
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
              Start with the Leh Winter demo scenario or create your own project.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/scenario/demo-leh-001" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                Launch Demo Scenario <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </RevealSection>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--color-border-light)',
        padding: '2rem', textAlign: 'center',
        fontSize: '0.75rem', color: 'var(--color-text-muted)',
      }}>
        <p>THERMASHELL · Software-Based Area-Specific Shelter Thermal Design System</p>
        <p style={{ marginTop: '0.25rem' }}>SIH26051 · Reduced-order thermal model — not CFD. Demo data clearly labeled.</p>
      </footer>
    </div>
  )
}
