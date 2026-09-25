import { create } from 'zustand'

/* ══════════════════════════════════════════════════════════════════════
   App-level UI state
   ══════════════════════════════════════════════════════════════════════ */

interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  scrollProgress: number
  setScrollProgress: (progress: number) => void
  activeWizardStep: number
  setActiveWizardStep: (step: number) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  scrollProgress: 0,
  setScrollProgress: (progress) => set({ scrollProgress: progress }),
  activeWizardStep: 0,
  setActiveWizardStep: (step) => set({ activeWizardStep: step }),
}))

/* ══════════════════════════════════════════════════════════════════════
   Scenario state — wizard data, current project
   ══════════════════════════════════════════════════════════════════════ */

export interface ScenarioLocation {
  name: string
  latitude: number
  longitude: number
  elevation: number
  climate_zone: string
}

export interface ScenarioGeometry {
  length: number
  width: number
  height: number
  roof_type: string
  roof_pitch: number
  orientation: number
}

export interface MaterialLayerData {
  id: string
  name: string
  thickness_mm: number
  conductivity: number
  density: number
  specific_heat: number
}

export interface EnvelopeData {
  wall_layers: MaterialLayerData[]
  roof_layers: MaterialLayerData[]
  floor_layers: MaterialLayerData[]
  windows: { face: string; width: number; height: number; count: number; u_value: number; shgc: number }[]
}

export interface OperatingData {
  occupants: number
  metabolic_rate: number
  internal_gains: number
  target_temp: number
  comfort_band: number
  hvac_mode: string
  ach_natural: number
  ach_infiltration: number
}

export interface ScenarioData {
  id: string
  name: string
  location: ScenarioLocation
  geometry: ScenarioGeometry
  envelope: EnvelopeData
  operating: OperatingData
  lastSaved: string | null
}

const DEFAULT_LOCATION: ScenarioLocation = {
  name: 'Leh, Ladakh',
  latitude: 34.15,
  longitude: 77.58,
  elevation: 3500,
  climate_zone: 'Cold Desert',
}

const DEFAULT_GEOMETRY: ScenarioGeometry = {
  length: 6,
  width: 4,
  height: 3,
  roof_type: 'gable',
  roof_pitch: 15,
  orientation: 180,
}

const DEFAULT_ENVELOPE: EnvelopeData = {
  wall_layers: [
    { id: '1', name: 'Cement Plaster', thickness_mm: 15, conductivity: 0.7, density: 1300, specific_heat: 840 },
    { id: '2', name: 'Stone Masonry', thickness_mm: 300, conductivity: 1.5, density: 2500, specific_heat: 900 },
    { id: '3', name: 'EPS Insulation', thickness_mm: 100, conductivity: 0.035, density: 25, specific_heat: 1400 },
    { id: '4', name: 'Cement Plaster', thickness_mm: 15, conductivity: 0.7, density: 1300, specific_heat: 840 },
  ],
  roof_layers: [
    { id: '5', name: 'Metal Sheet', thickness_mm: 2, conductivity: 50, density: 7800, specific_heat: 500 },
    { id: '6', name: 'XPS Insulation', thickness_mm: 120, conductivity: 0.034, density: 35, specific_heat: 1400 },
    { id: '7', name: 'Plywood', thickness_mm: 18, conductivity: 0.13, density: 550, specific_heat: 1700 },
  ],
  floor_layers: [
    { id: '8', name: 'Concrete', thickness_mm: 150, conductivity: 1.4, density: 2300, specific_heat: 880 },
    { id: '9', name: 'XPS Insulation', thickness_mm: 80, conductivity: 0.034, density: 35, specific_heat: 1400 },
  ],
  windows: [
    { face: 'south', width: 1.2, height: 1.0, count: 2, u_value: 2.8, shgc: 0.65 },
  ],
}

const DEFAULT_OPERATING: OperatingData = {
  occupants: 4,
  metabolic_rate: 100,
  internal_gains: 200,
  target_temp: 18,
  comfort_band: 2,
  hvac_mode: 'heated',
  ach_natural: 0.3,
  ach_infiltration: 0.2,
}

interface ScenarioState {
  scenario: ScenarioData
  updateLocation: (loc: Partial<ScenarioLocation>) => void
  updateGeometry: (geo: Partial<ScenarioGeometry>) => void
  updateEnvelope: (env: Partial<EnvelopeData>) => void
  updateOperating: (op: Partial<OperatingData>) => void
  setScenarioName: (name: string) => void
  applyPreset: (preset: string) => void
  resetScenario: () => void
}

// Location presets for smart defaults
const PRESETS: Record<string, Partial<ScenarioData>> = {
  leh: {
    location: { ...DEFAULT_LOCATION },
    geometry: { ...DEFAULT_GEOMETRY },
    envelope: { ...DEFAULT_ENVELOPE },
    operating: { ...DEFAULT_OPERATING },
  },
  jaisalmer: {
    location: { name: 'Jaisalmer, Rajasthan', latitude: 26.92, longitude: 70.9, elevation: 225, climate_zone: 'Hot Arid' },
    geometry: { length: 5, width: 4, height: 3.5, roof_type: 'flat', roof_pitch: 5, orientation: 0 },
    envelope: {
      wall_layers: [
        { id: '1', name: 'Lime Plaster', thickness_mm: 20, conductivity: 0.7, density: 1600, specific_heat: 840 },
        { id: '2', name: 'Sandstone', thickness_mm: 350, conductivity: 1.7, density: 2200, specific_heat: 920 },
        { id: '3', name: 'Lime Plaster', thickness_mm: 20, conductivity: 0.7, density: 1600, specific_heat: 840 },
      ],
      roof_layers: [
        { id: '5', name: 'Lime Concrete', thickness_mm: 100, conductivity: 0.7, density: 1800, specific_heat: 880 },
        { id: '6', name: 'Mud Phuska', thickness_mm: 150, conductivity: 0.52, density: 1622, specific_heat: 880 },
        { id: '7', name: 'Brick Tiles', thickness_mm: 25, conductivity: 0.8, density: 1900, specific_heat: 880 },
      ],
      floor_layers: [
        { id: '8', name: 'Sandstone', thickness_mm: 200, conductivity: 1.7, density: 2200, specific_heat: 920 },
      ],
      windows: [
        { face: 'north', width: 1.0, height: 0.8, count: 2, u_value: 5.7, shgc: 0.76 },
      ],
    },
    operating: { occupants: 4, metabolic_rate: 100, internal_gains: 150, target_temp: 26, comfort_band: 2.5, hvac_mode: 'cooled', ach_natural: 0.5, ach_infiltration: 0.3 },
  },
}

export const useScenarioStore = create<ScenarioState>((set) => ({
  scenario: {
    id: 'demo-leh-001',
    name: 'Leh Winter High-Altitude Shelter',
    location: { ...DEFAULT_LOCATION },
    geometry: { ...DEFAULT_GEOMETRY },
    envelope: { ...DEFAULT_ENVELOPE },
    operating: { ...DEFAULT_OPERATING },
    lastSaved: null,
  },
  updateLocation: (loc) =>
    set((s) => ({ scenario: { ...s.scenario, location: { ...s.scenario.location, ...loc }, lastSaved: new Date().toISOString() } })),
  updateGeometry: (geo) =>
    set((s) => ({ scenario: { ...s.scenario, geometry: { ...s.scenario.geometry, ...geo }, lastSaved: new Date().toISOString() } })),
  updateEnvelope: (env) =>
    set((s) => ({ scenario: { ...s.scenario, envelope: { ...s.scenario.envelope, ...env }, lastSaved: new Date().toISOString() } })),
  updateOperating: (op) =>
    set((s) => ({ scenario: { ...s.scenario, operating: { ...s.scenario.operating, ...op }, lastSaved: new Date().toISOString() } })),
  setScenarioName: (name) => set((s) => ({ scenario: { ...s.scenario, name } })),
  applyPreset: (preset) => {
    const p = PRESETS[preset]
    if (p) set((s) => ({ scenario: { ...s.scenario, ...p, lastSaved: new Date().toISOString() } }))
  },
  resetScenario: () =>
    set({
      scenario: {
        id: 'demo-leh-001', name: 'Leh Winter High-Altitude Shelter',
        location: { ...DEFAULT_LOCATION }, geometry: { ...DEFAULT_GEOMETRY },
        envelope: { ...DEFAULT_ENVELOPE }, operating: { ...DEFAULT_OPERATING },
        lastSaved: null,
      },
    }),
}))

/* ══════════════════════════════════════════════════════════════════════
   Simulation state
   ══════════════════════════════════════════════════════════════════════ */

export interface SimulationStage {
  name: string
  label: string
  progress: number
  status: 'pending' | 'running' | 'completed' | 'failed'
}

interface SimulationState {
  jobId: string | null
  status: 'idle' | 'running' | 'completed' | 'failed'
  stages: SimulationStage[]
  overallProgress: number
  results: any | null
  startSimulation: () => void
  updateStage: (name: string, update: Partial<SimulationStage>) => void
  setResults: (results: any) => void
  resetSimulation: () => void
}

const DEFAULT_STAGES: SimulationStage[] = [
  { name: 'climate', label: 'Climate Data', progress: 0, status: 'pending' },
  { name: 'solar', label: 'Solar Model', progress: 0, status: 'pending' },
  { name: 'thermal', label: 'Thermal Network', progress: 0, status: 'pending' },
  { name: 'ventilation', label: 'Ventilation', progress: 0, status: 'pending' },
  { name: 'comfort', label: 'Comfort Analysis', progress: 0, status: 'pending' },
  { name: 'results', label: 'Results', progress: 0, status: 'pending' },
]

export const useSimulationStore = create<SimulationState>((set, get) => ({
  jobId: null,
  status: 'idle',
  stages: DEFAULT_STAGES.map((s) => ({ ...s })),
  overallProgress: 0,
  results: null,

  startSimulation: () => {
    set({
      jobId: `sim-${Date.now()}`,
      status: 'running',
      stages: DEFAULT_STAGES.map((s) => ({ ...s })),
      overallProgress: 0,
      results: null,
    })

    // Simulate progressive stages (demo mode — in production this comes from WebSocket)
    const stages = ['climate', 'solar', 'thermal', 'ventilation', 'comfort', 'results']
    stages.forEach((stage, i) => {
      setTimeout(() => {
        set((s) => {
          const newStages = s.stages.map((st) => {
            if (st.name === stage) return { ...st, status: 'running' as const, progress: 50 }
            return st
          })
          return { stages: newStages, overallProgress: ((i) / stages.length) * 100 }
        })
      }, (i + 1) * 800)

      setTimeout(() => {
        set((s) => {
          const newStages = s.stages.map((st) => {
            if (st.name === stage) return { ...st, status: 'completed' as const, progress: 100 }
            return st
          })
          const allDone = newStages.every((st) => st.status === 'completed')
          return {
            stages: newStages,
            overallProgress: ((i + 1) / stages.length) * 100,
            status: allDone ? 'completed' : s.status,
          }
        })
      }, (i + 1) * 800 + 600)
    })

    // Generate demo results after all stages complete
    setTimeout(() => {
      const demoResults = generateDemoResults()
      set({ results: demoResults, status: 'completed' })
    }, stages.length * 800 + 1200)
  },

  updateStage: (name, update) =>
    set((s) => ({
      stages: s.stages.map((st) => (st.name === name ? { ...st, ...update } : st)),
    })),

  setResults: (results) => set({ results }),
  resetSimulation: () => set({ jobId: null, status: 'idle', stages: DEFAULT_STAGES.map((s) => ({ ...s })), overallProgress: 0, results: null }),
}))

function generateDemoResults() {
  const hours = 72
  const timestamps = Array.from({ length: hours }, (_, h) => `2024-01-${15 + Math.floor(h / 24)}T${String(h % 24).padStart(2, '0')}:00:00`)
  const outdoor = timestamps.map((_, h) => parseFloat((-10 + 5 * Math.sin(2 * Math.PI * h / 24 - Math.PI / 2)).toFixed(1)))
  const indoor = timestamps.map((_, h) => parseFloat((16 + 2.5 * Math.sin(2 * Math.PI * h / 24 - Math.PI / 3) + Math.random() * 0.5).toFixed(1)))
  const solar = timestamps.map((_, h) => {
    const hr = h % 24
    return hr >= 6 && hr <= 18 ? parseFloat((400 * Math.sin(Math.PI * (hr - 6) / 12)).toFixed(0)) : 0
  })

  return {
    timestamps,
    indoor_temp_c: indoor,
    outdoor_temp_c: outdoor,
    operative_temp_c: indoor.map((t) => t - 0.5),
    solar_ghi: solar,
    q_conduction_walls: indoor.map((t, i) => parseFloat((2.1 * 36 * (t - outdoor[i])).toFixed(1))),
    q_conduction_roof: indoor.map((t, i) => parseFloat((0.3 * 24 * (t - outdoor[i])).toFixed(1))),
    q_solar_gain: solar.map((s) => parseFloat((s * 0.65 * 2.4 * 0.3).toFixed(1))),
    q_ventilation: indoor.map((t, i) => parseFloat((0.5 * 72 * 1.225 * 1005 / 3600 * (t - outdoor[i])).toFixed(1))),
    heat_balance: {
      conduction_walls_kwh: 42.5,
      conduction_roof_kwh: 8.2,
      conduction_floor_kwh: 5.8,
      conduction_windows_kwh: 12.3,
      solar_gain_kwh: 18.7,
      internal_gain_kwh: 28.8,
      ventilation_kwh: 15.4,
      heating_energy_kwh: 38.6,
      cooling_energy_kwh: 0,
    },
    comfort: {
      pmv_mean: -0.35,
      ppd_mean: 12.8,
      comfort_hours: 54,
      total_hours: 72,
      comfort_percentage: 75.0,
      operative_temp_mean_c: 17.2,
      hours_below_comfort: 14,
      hours_above_comfort: 4,
    },
    peak_heating_load_w: 3200,
    peak_cooling_load_w: 0,
  }
}
