import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Thermometer, MapPin, Clock, MoreHorizontal, Trash2 } from 'lucide-react'

const DEMO_PROJECTS = [
  {
    id: 'demo-leh-001',
    name: 'Leh Winter High-Altitude Shelter',
    description: 'Cold-desert shelter at 3,500m elevation — 72h winter simulation',
    location: 'Leh, Ladakh (34.15°N, 77.58°E)',
    scenarios: 3,
    lastModified: '2 hours ago',
    status: 'active',
    climate: 'Cold Desert',
  },
  {
    id: 'demo-jaisalmer-001',
    name: 'Jaisalmer Hot-Arid Shelter',
    description: 'Traditional sandstone shelter optimized for extreme heat',
    location: 'Jaisalmer, Rajasthan (26.92°N, 70.90°E)',
    scenarios: 1,
    lastModified: '1 day ago',
    status: 'draft',
    climate: 'Hot Arid',
  },
  {
    id: 'demo-shimla-001',
    name: 'Shimla Hill Station Cottage',
    description: 'Temperate hill station — passive heating with solar gain',
    location: 'Shimla, Himachal Pradesh (31.10°N, 77.17°E)',
    scenarios: 2,
    lastModified: '3 days ago',
    status: 'completed',
    climate: 'Temperate',
  },
]

export default function ProjectsPage() {
  const [projects] = useState(DEMO_PROJECTS)

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, marginBottom: '0.375rem' }}>
            Projects
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Manage shelter design projects and scenarios
          </p>
        </div>
        <button className="btn btn-primary">
          <Plus size={16} /> New Project
        </button>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {projects.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
          >
            <Link to={`/scenario/${project.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', cursor: 'pointer' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                    <div style={{
                      width: '1.75rem', height: '1.75rem', borderRadius: 'var(--radius-sm)',
                      background: 'linear-gradient(135deg, var(--color-heat-500), var(--color-solar-500))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Thermometer size={12} color="white" />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 500, margin: 0 }}>{project.name}</h3>
                    <span className={`chip ${project.status === 'active' ? 'chip-climate' : project.status === 'completed' ? 'chip-comfort' : 'chip-structure'}`}>
                      {project.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                    {project.description}
                  </p>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={12} /> {project.location}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> {project.lastModified}
                    </span>
                    <span className="chip" style={{ background: 'var(--color-bg-paper-warm)', color: 'var(--color-text-secondary)' }}>
                      {project.climate}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {project.scenarios} scenario{project.scenarios !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button className="btn-ghost" onClick={(e) => e.preventDefault()} style={{ padding: '0.25rem' }}>
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
