import { NavLink, useLocation } from 'react-router-dom'
import { useUIStore } from '@/stores/appStore'
import {
  LayoutDashboard, MapPin, Sun, Box, Layers, Wind, Thermometer,
  Play, BarChart3, GitCompare, Target, CheckCircle2, FileText,
  Settings, ChevronLeft, ChevronRight,
} from 'lucide-react'

const NAV_ITEMS = [
  { section: 'OVERVIEW', items: [
    { to: '/projects', icon: LayoutDashboard, label: 'Projects', color: 'var(--color-text-secondary)' },
  ]},
  { section: 'PIPELINE', items: [
    { to: '/scenario/demo-leh-001', icon: MapPin, label: 'Site & Location', color: 'var(--color-climate-600)' },
    { to: '/scenario/demo-leh-001/climate', icon: Sun, label: 'Climate Data', color: 'var(--color-climate-500)' },
    { to: '/scenario/demo-leh-001/geometry', icon: Box, label: 'Geometry', color: 'var(--color-structure-500)' },
    { to: '/scenario/demo-leh-001/materials', icon: Layers, label: 'Materials', color: 'var(--color-structure-600)' },
    { to: '/scenario/demo-leh-001/envelope', icon: Layers, label: 'Envelope', color: 'var(--color-heat-500)' },
    { to: '/scenario/demo-leh-001/operating', icon: Wind, label: 'Operating', color: 'var(--color-heat-600)' },
  ]},
  { section: 'ANALYSIS', items: [
    { to: '/scenario/demo-leh-001/simulate', icon: Play, label: 'Simulate', color: 'var(--color-solar-600)' },
    { to: '/scenario/demo-leh-001/results', icon: BarChart3, label: 'Results', color: 'var(--color-solar-500)' },
    { to: '/compare', icon: GitCompare, label: 'Compare', color: 'var(--color-structure-500)' },
    { to: '/optimize', icon: Target, label: 'Optimize', color: 'var(--color-comfort-600)' },
    { to: '/scenario/demo-leh-001/validation', icon: CheckCircle2, label: 'Validation', color: 'var(--color-comfort-500)' },
    { to: '/scenario/demo-leh-001/report', icon: FileText, label: 'Report', color: 'var(--color-text-secondary)' },
  ]},
  { section: '', items: [
    { to: '/settings', icon: Settings, label: 'Settings', color: 'var(--color-text-muted)' },
  ]},
]

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const location = useLocation()

  return (
    <aside style={{
      width: sidebarCollapsed ? '3.5rem' : '14rem',
      background: 'var(--color-bg-sidebar)',
      borderRight: '1px solid var(--color-border-light)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: sidebarCollapsed ? '1rem 0.5rem' : '1rem 1rem',
        borderBottom: '1px solid var(--color-border-light)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: '1.75rem', height: '1.75rem', borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(135deg, var(--color-heat-500), var(--color-solar-500))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Thermometer size={14} color="white" />
        </div>
        {!sidebarCollapsed && (
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.875rem',
            color: 'var(--color-text-primary)', whiteSpace: 'nowrap',
          }}>
            THERMASHELL
          </span>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
        {NAV_ITEMS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: '0.75rem' }}>
            {group.section && !sidebarCollapsed && (
              <div style={{
                padding: '0.25rem 0.5rem', fontSize: '0.625rem', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--color-text-muted)', marginBottom: '0.25rem',
              }}>
                {group.section}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.to
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: sidebarCollapsed ? '0.5rem' : '0.375rem 0.5rem',
                    borderRadius: 'var(--radius-sm)', textDecoration: 'none',
                    fontSize: '0.8125rem', fontWeight: isActive ? 500 : 400,
                    color: isActive ? item.color : 'var(--color-text-secondary)',
                    background: isActive ? 'var(--color-bg-card)' : 'transparent',
                    boxShadow: isActive ? 'var(--shadow-card)' : 'none',
                    transition: 'all 0.15s ease',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    marginBottom: '0.125rem',
                  }}
                  title={item.label}
                >
                  <Icon size={16} style={{ flexShrink: 0, strokeWidth: isActive ? 2.2 : 1.8 }} />
                  {!sidebarCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        style={{
          padding: '0.75rem', border: 'none', cursor: 'pointer',
          background: 'transparent', color: 'var(--color-text-muted)',
          borderTop: '1px solid var(--color-border-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  )
}
