import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Thermometer, MapPin, Clock, MoreHorizontal, Search, X, Loader2 } from 'lucide-react'
import { useScenarioStore } from '@/stores/appStore'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icon in Vite
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, 10, { duration: 1.5 })
  }, [center, map])
  return null
}

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
  const [projects, setProjects] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<any>(null)
  
  // Default map center (India)
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629])
  
  const navigate = useNavigate()
  const { updateLocation, resetScenario, setScenarioName } = useScenarioStore()

  useEffect(() => {
    import('@/lib/api').then(api => {
      api.fetchProjects().then(data => {
        if (data && data.length > 0) {
          setProjects(data)
        } else {
          setProjects(DEMO_PROJECTS) // Fallback for pure frontend demo if DB is empty
        }
      }).catch(e => {
        console.error("Failed to fetch projects, using demo", e)
        setProjects(DEMO_PROJECTS)
      })
    })
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`)
      const data = await res.json()
      setSearchResults(data)
      
      // Auto-select first result if exists
      if (data && data.length > 0) {
        handleSelectLocation(data[0])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectLocation = (res: any) => {
    setSelectedLocation(res)
    setMapCenter([parseFloat(res.lat), parseFloat(res.lon)])
    setSearchResults([]) // Hide results after selection
    setSearchQuery(res.display_name.split(',')[0])
  }

  const handleCreateProject = async () => {
    if (!projectName.trim() || !selectedLocation) return
    
    const newId = `proj-${Date.now()}`
    const locName = selectedLocation.display_name.split(',')[0]
    const lat = parseFloat(selectedLocation.lat)
    const lon = parseFloat(selectedLocation.lon)
    
    try {
      const { createProject } = await import('@/lib/api')
      const newProj = await createProject({
        id: newId,
        name: projectName,
        description: 'Newly created project',
        location_name: locName,
        latitude: lat,
        longitude: lon,
      })
      
      // Navigate and update local store state to match the fresh project
      resetScenario()
      setScenarioName(projectName)
      updateLocation({
        name: locName,
        latitude: lat,
        longitude: lon,
        elevation: 0,
        climate_zone: 'Unknown'
      })
      
      setIsModalOpen(false)
      navigate(`/scenario/${newId}`)
    } catch (e) {
      console.error("Error creating project:", e)
    }
  }

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
        <button className="btn btn-primary" onClick={() => {
          setIsModalOpen(true)
          setProjectName('')
          setSearchQuery('')
          setSelectedLocation(null)
          setSearchResults([])
        }}>
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
                      <MapPin size={12} /> {project.location_name || project.location}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> {project.lastModified || 'Just now'}
                    </span>
                    <span className="chip" style={{ background: 'var(--color-bg-paper-warm)', color: 'var(--color-text-secondary)' }}>
                      {project.climate_zone || project.climate}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {project.scenarios || 1} scenario{project.scenarios !== 1 ? 's' : ''}
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

      {/* New Project Modal with Map */}
      <AnimatePresence>
        {isModalOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card"
              style={{ width: '100%', maxWidth: '700px', padding: '1.5rem', position: 'relative', display: 'flex', flexDirection: 'column' }}
            >
              <button className="btn-ghost" onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.5rem', zIndex: 10 }}>
                <X size={16} />
              </button>
              
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 500, marginBottom: '1.5rem' }}>
                Create New Project
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Project Name
                  </label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Desert Shelter v2" 
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div style={{ position: 'relative', zIndex: 1000 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Search Location
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="Enter city or region..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      style={{ flex: 1 }}
                    />
                    <button className="btn btn-outline" onClick={handleSearch} disabled={isSearching}>
                      {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div style={{ 
                      position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.25rem',
                      background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)', 
                      borderRadius: 'var(--radius-sm)', maxHeight: '200px', overflowY: 'auto',
                      boxShadow: 'var(--shadow-lg)'
                    }}>
                      {searchResults.map((res: any, idx: number) => (
                        <div 
                          key={idx} 
                          onClick={() => handleSelectLocation(res)}
                          style={{ 
                            padding: '0.5rem 0.75rem', 
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                            borderBottom: idx < searchResults.length - 1 ? '1px solid var(--color-border-light)' : 'none'
                          }}
                        >
                          <div style={{ fontWeight: 500 }}>{res.display_name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Map View */}
              <div style={{ height: '300px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border-light)', position: 'relative', zIndex: 1 }}>
                <MapContainer center={mapCenter} zoom={4} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  {selectedLocation && (
                    <Marker position={[parseFloat(selectedLocation.lat), parseFloat(selectedLocation.lon)]} />
                  )}
                  <MapUpdater center={mapCenter} />
                </MapContainer>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  {selectedLocation && (
                    <span><MapPin size={12} style={{ display: 'inline', marginRight: '4px' }}/>{parseFloat(selectedLocation.lat).toFixed(4)}°N, {parseFloat(selectedLocation.lon).toFixed(4)}°E</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button 
                    className="btn btn-primary" 
                    disabled={!projectName.trim() || !selectedLocation}
                    onClick={handleCreateProject}
                  >
                    Create Project
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
