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
  material_id: number // Added for backend simulation
  wall_layers: MaterialLayerData[]
  roof_layers: MaterialLayerData[]
  floor_layers: MaterialLayerData[]
  windows: { face: string; width: number; height: number; count: number; u_value: number; shgc: number }[]
}

export interface OperatingData {
  occupants: number
  metabolic_rate: number
  internal_gains: number
  heat_per_person: number   // W per occupant — used directly by optimizer
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
  material_id: 1,
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
  heat_per_person: 50,
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
      material_id: 2, // PU Foam for Jaisalmer as a placeholder
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
    operating: { occupants: 4, metabolic_rate: 100, internal_gains: 150, target_temp: 26, comfort_band: 2.5, hvac_mode: 'cooled', ach_natural: 0.5, ach_infiltration: 0.3, heat_per_person: 50 },
  },
  tawang: {
    location: { name: 'Tawang, Arunachal Pradesh', latitude: 27.58, longitude: 91.86, elevation: 3048, climate_zone: 'Cold and Cloudy' },
    geometry: { length: 6, width: 4, height: 3, roof_type: 'gable', roof_pitch: 25, orientation: 180 },
    envelope: {
      material_id: 3, // Polycarbonate/Lightweight for Tawang
      wall_layers: [
        { id: '1', name: 'Pine Wood', thickness_mm: 25, conductivity: 0.15, density: 500, specific_heat: 2500 },
        { id: '2', name: 'Glass Wool', thickness_mm: 50, conductivity: 0.04, density: 24, specific_heat: 800 },
        { id: '3', name: 'Pine Wood', thickness_mm: 25, conductivity: 0.15, density: 500, specific_heat: 2500 },
      ],
      roof_layers: [
        { id: '4', name: 'CGI Sheet', thickness_mm: 2, conductivity: 50, density: 7800, specific_heat: 500 },
        { id: '5', name: 'Glass Wool', thickness_mm: 100, conductivity: 0.04, density: 24, specific_heat: 800 },
        { id: '6', name: 'Plywood', thickness_mm: 12, conductivity: 0.13, density: 550, specific_heat: 1700 },
      ],
      floor_layers: [
        { id: '7', name: 'Timber Floor', thickness_mm: 50, conductivity: 0.15, density: 500, specific_heat: 2500 },
      ],
      windows: [
        { face: 'south', width: 1.5, height: 1.2, count: 2, u_value: 2.5, shgc: 0.5 },
      ],
    },
    operating: { occupants: 4, metabolic_rate: 100, internal_gains: 200, target_temp: 18, comfort_band: 2.5, hvac_mode: 'heated', ach_natural: 0.2, ach_infiltration: 0.2, heat_per_person: 50 },
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
  startSimulation: (scenarioData?: ScenarioData) => void
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

import { runAnalysis, type AnalysisInput } from '../lib/api'

export const useSimulationStore = create<SimulationState>((set, get) => ({
  jobId: null,
  status: 'idle',
  stages: DEFAULT_STAGES.map((s) => ({ ...s })),
  overallProgress: 0,
  results: null,

  startSimulation: async (scenarioData?: ScenarioData) => {
    set({
      jobId: `sim-${Date.now()}`,
      status: 'running',
      stages: DEFAULT_STAGES.map((s) => ({ ...s })),
      overallProgress: 0,
      results: null,
    })

    if (!scenarioData) {
      set({ status: 'failed' })
      return
    }

    try {
      // Fake progressive stages for UX
      const stages = ['climate', 'solar', 'thermal', 'ventilation', 'comfort', 'results']
      
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        if(currentProgress < 90) {
           currentProgress += 5;
           set({ overallProgress: currentProgress })
        }
      }, 200);

      const input: AnalysisInput = {
        geometry: {
          geometry_type: 'gable_roof',
          length: scenarioData.geometry.length,
          width: scenarioData.geometry.width,
          height: scenarioData.geometry.height,
          roof_pitch: scenarioData.geometry.roof_pitch,
          orientation: scenarioData.geometry.orientation
        },
        material_id: scenarioData.envelope.material_id || 1,
        location: {
          latitude: scenarioData.location.latitude,
          longitude: scenarioData.location.longitude
        },
        operating_conditions: {
          target_temperature: scenarioData.operating.target_temp,
          initial_indoor_temperature: scenarioData.operating.target_temp,
          occupants: scenarioData.operating.occupants,
          heat_per_person: scenarioData.operating.internal_gains / (scenarioData.operating.occupants || 1),
          air_changes_per_hour: scenarioData.operating.ach_natural + scenarioData.operating.ach_infiltration
        },
        simulation: {
          duration_hours: 72,
          timestep_hours: 1
        },
        comfort: {
          comfort_band: scenarioData.operating.comfort_band
        }
      }

      const res = await runAnalysis(input)
      clearInterval(progressInterval);

      // Map backend response to frontend results format
      const mappedResults = {
        timestamps: res.time_series.map(ts => `Hour ${ts.hour}`),
        indoor_temp_c: res.time_series.map(ts => ts.indoor_temperature),
        outdoor_temp_c: res.time_series.map(ts => ts.outdoor_temperature),
        operative_temp_c: res.time_series.map(ts => ts.indoor_temperature), // simplified
        solar_ghi: res.time_series.map(ts => ts.solar_gain / (res.geometry.length * res.geometry.width)),
        q_conduction_walls: res.time_series.map(ts => ts.conduction_walls_loss || 0),
        q_conduction_roof: res.time_series.map(ts => ts.conduction_roof_loss || 0),
        q_solar_gain: res.time_series.map(ts => ts.solar_gain),
        q_ventilation: res.time_series.map(ts => ts.ventilation_loss),
        heat_balance: {
          conduction_walls_kwh: (res.thermal_summary.total_conduction_walls || 0) / 1000,
          conduction_roof_kwh: (res.thermal_summary.total_conduction_roof || 0) / 1000,
          conduction_floor_kwh: (res.thermal_summary.total_conduction_floor || 0) / 1000,
          conduction_windows_kwh: 0,
          solar_gain_kwh: res.thermal_summary.total_solar_gain / 1000,
          internal_gain_kwh: res.thermal_summary.total_internal_heat_gain / 1000,
          ventilation_kwh: res.thermal_summary.total_ventilation_loss / 1000,
          heating_energy_kwh: (res.thermal_summary.total_heating_load || 0) / 1000,
          cooling_energy_kwh: (res.thermal_summary.total_cooling_load || 0) / 1000,
        },
        fuel: {
          kerosene_liters: res.thermal_summary.kerosene_liters || 0,
          kerosene_kg: res.thermal_summary.kerosene_kg || 0,
        },
        comfort: {
          pmv_mean: res.thermal_summary.average_pmv || 0,
          ppd_mean: res.thermal_summary.average_ppd || 0,
          comfort_hours: Math.round((res.comfort.percentage_time_in_comfort_range / 100) * 72),
          total_hours: 72,
          comfort_percentage: Math.round(res.comfort.percentage_time_in_comfort_range),
          operative_temp_mean_c: res.thermal_summary.average_indoor_temperature,
          hours_below_comfort: Math.round(((100 - res.comfort.percentage_time_in_comfort_range) / 100) * 72), // Approx
          hours_above_comfort: 0,
        },
        peak_heating_load_w: res.thermal_summary.peak_heating_load_w || 0,
        peak_cooling_load_w: res.thermal_summary.peak_cooling_load_w || 0,
      }

      set({
        results: mappedResults,
        status: 'completed',
        overallProgress: 100,
        stages: DEFAULT_STAGES.map((s) => ({ ...s, status: 'completed', progress: 100 }))
      })

    } catch (e) {
      console.error("Simulation failed", e)
      set({ status: 'failed' })
    }
  },

  updateStage: (name, update) =>
    set((s) => ({
      stages: s.stages.map((st) => (st.name === name ? { ...st, ...update } : st)),
    })),

  setResults: (results) => set({ results }),
  resetSimulation: () => set({ jobId: null, status: 'idle', stages: DEFAULT_STAGES.map((s) => ({ ...s })), overallProgress: 0, results: null }),
}))

