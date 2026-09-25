import { useLocation } from 'react-router-dom'
import { MapPin, Cloud, Box, Layers, Wind, Play, BarChart3, Target, CheckCircle2 } from 'lucide-react'

const PIPELINE_STEPS = [
  { key: 'site', icon: MapPin, label: 'Site', color: 'var(--color-climate-600)', paths: ['/scenario/'] },
  { key: 'climate', icon: Cloud, label: 'Climate', color: 'var(--color-climate-500)', paths: ['/climate'] },
  { key: 'geometry', icon: Box, label: 'Geometry', color: 'var(--color-structure-500)', paths: ['/geometry'] },
  { key: 'envelope', icon: Layers, label: 'Envelope', color: 'var(--color-heat-500)', paths: ['/envelope', '/materials'] },
  { key: 'operating', icon: Wind, label: 'Operating', color: 'var(--color-heat-600)', paths: ['/operating'] },
  { key: 'simulate', icon: Play, label: 'Simulate', color: 'var(--color-solar-600)', paths: ['/simulate'] },
  { key: 'results', icon: BarChart3, label: 'Results', color: 'var(--color-solar-500)', paths: ['/results'] },
  { key: 'optimize', icon: Target, label: 'Optimize', color: 'var(--color-comfort-600)', paths: ['/optimize', '/compare'] },
  { key: 'validate', icon: CheckCircle2, label: 'Validate', color: 'var(--color-comfort-500)', paths: ['/validation'] },
]

export default function PipelineBreadcrumb() {
  const location = useLocation()
  const currentPath = location.pathname

  return (
    <div className="pipeline-breadcrumb">
      {PIPELINE_STEPS.map((step, i) => {
        const Icon = step.icon
        const isActive = step.paths.some((p) => currentPath.includes(p))
        // A step is "completed" if it comes before the active one
        const activeIndex = PIPELINE_STEPS.findIndex((s) => s.paths.some((p) => currentPath.includes(p)))
        const isCompleted = activeIndex > -1 && i < activeIndex

        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div
              className={`pipeline-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              title={step.label}
              style={isActive ? { background: `${step.color}15`, color: step.color } : {}}
            >
              <Icon size={14} strokeWidth={isActive ? 2.5 : 1.5} />
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className="pipeline-connector" style={isCompleted ? { background: 'var(--color-comfort-400)' } : {}} />
            )}
          </div>
        )
      })}
    </div>
  )
}
