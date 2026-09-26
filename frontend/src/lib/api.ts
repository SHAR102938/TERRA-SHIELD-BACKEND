/**
 * TERRA-SHIELD API Client
 * Centralized fetch layer for all FastAPI backend calls.
 */

const BASE_URL = 'http://localhost:8000'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClimateData {
  temperature: number
  solar_radiation: number
  relative_humidity: number
  wind_speed: number
}

export interface ClimateResponse {
  location: { latitude: number; longitude: number }
  climate: ClimateData
  source: string
}

export interface Material {
  id: number
  name: string
  thermal_conductivity: number
  density: number
  specific_heat: number
  solar_absorptivity: number
  emissivity: number
  cost_per_m2: number
  weight_per_m2: number
  thickness: number
}

export interface CalculatedGeometry {
  floor_area: number
  wall_area: number
  roof_area: number
  envelope_area: number
  roof_slope: number
  roof_rise: number
  total_height: number
  volume: number
}

export interface GeometryResponse {
  geometry: {
    geometry_type: string
    length: number
    width: number
    height: number
    roof_pitch: number
    orientation: number
  }
  calculated: CalculatedGeometry
}

export interface AnalysisInput {
  geometry: {
    geometry_type: string
    length: number
    width: number
    height: number
    roof_pitch: number
    orientation: number
  }
  material_id: number
  location: { latitude: number; longitude: number }
  operating_conditions: {
    target_temperature: number
    initial_indoor_temperature: number
    occupants: number
    heat_per_person: number
    air_changes_per_hour: number
  }
  simulation: {
    duration_hours: number
    timestep_hours: number
  }
  comfort: {
    comfort_band: number
  }
}

export interface ThermalSummary {
  min_indoor_temperature: number
  max_indoor_temperature: number
  average_indoor_temperature: number
  final_indoor_temperature: number
  min_wall_temperature: number
  max_wall_temperature: number
  min_roof_temperature: number
  max_roof_temperature: number
  total_conduction_loss: number
  total_solar_gain: number
  total_internal_heat_gain: number
  total_ventilation_loss: number
}

export interface ComfortResults {
  score: number
  classification: string
  percentage_time_in_comfort_range: number
  average_temperature_deviation: number
}

export interface TimeSeriesPoint {
  hour: number
  outdoor_temperature: number
  wall_temperature: number
  roof_temperature: number
  indoor_temperature: number
  solar_gain: number
  conduction_loss: number
  ventilation_loss: number
  internal_heat_gain: number
}

export interface AnalysisResponse {
  geometry: AnalysisInput['geometry']
  material: Material
  location: { latitude: number; longitude: number }
  climate: ClimateData
  simulation: { duration_hours: number; timestep_hours: number }
  thermal_summary: ThermalSummary
  comfort: ComfortResults
  time_series: TimeSeriesPoint[]
}

// ─── API Functions ─────────────────────────────────────────────────────────────

/**
 * Fetch real climate data from NASA POWER via backend
 */
export async function fetchClimate(latitude: number, longitude: number): Promise<ClimateResponse> {
  const res = await fetch(`${BASE_URL}/api/climate?latitude=${latitude}&longitude=${longitude}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Failed to fetch climate data')
  }
  return res.json()
}

/**
 * Fetch all materials from backend
 */
export async function fetchMaterials(): Promise<Material[]> {
  const res = await fetch(`${BASE_URL}/api/materials`)
  if (!res.ok) throw new Error('Failed to fetch materials')
  return res.json()
}

/**
 * Fetch single material by ID
 */
export async function fetchMaterial(id: number): Promise<Material> {
  const res = await fetch(`${BASE_URL}/api/materials/${id}`)
  if (!res.ok) throw new Error(`Material ${id} not found`)
  return res.json()
}

/**
 * Calculate geometry via backend physics engine
 */
export async function calculateGeometry(params: {
  length: number
  width: number
  height: number
  roof_pitch: number
  orientation: number
}): Promise<GeometryResponse> {
  const res = await fetch(`${BASE_URL}/api/geometry/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ geometry_type: 'gable_roof', ...params }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Geometry calculation failed')
  }
  return res.json()
}

/**
 * Run full thermal simulation
 */
export async function runAnalysis(input: AnalysisInput): Promise<AnalysisResponse> {
  const res = await fetch(`${BASE_URL}/api/analysis/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Analysis failed')
  }
  return res.json()
}

export interface ProjectResponse {
  id: string
  name: string
  description: string
  climate_zone: string
  location_name: string
  latitude: number
  longitude: number
  elevation: number
  scenario_data: string
  status: string
}

export interface ProjectCreate {
  id: string
  name: string
  description?: string
  climate_zone?: string
  location_name: string
  latitude: number
  longitude: number
  elevation?: number
  scenario_data?: string
}

export async function fetchProjects(): Promise<ProjectResponse[]> {
  const res = await fetch(`${BASE_URL}/api/projects`)
  if (!res.ok) throw new Error('Failed to fetch projects')
  return res.json()
}

export async function fetchProject(id: string): Promise<ProjectResponse> {
  const res = await fetch(`${BASE_URL}/api/projects/${id}`)
  if (!res.ok) throw new Error('Project not found')
  return res.json()
}

export async function createProject(input: ProjectCreate): Promise<ProjectResponse> {
  const res = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Failed to create project')
  return res.json()
}

// --- Optimization --------------------------------------------------------------

export interface ScoringWeights {
  comfort: number
  energy: number
  weight: number
  cost: number
}

export interface OptimizeParamRanges {
  material_ids: number[]
  thicknesses: number[]
  roof_pitches: number[]
}

export interface OptimizeRequest {
  geometry: { length: number; width: number; height: number }
  location: { latitude: number; longitude: number }
  operating: {
    target_temperature: number
    initial_indoor_temperature: number
    occupants: number
    heat_per_person: number
    air_changes_per_hour: number
  }
  comfort_band: number
  simulation_hours: number
  param_ranges: OptimizeParamRanges
  weights: ScoringWeights
}

export interface CandidateMetrics {
  comfort_percentage: number
  comfort_score_raw: number
  energy_loss_wh: number
  total_weight_kg: number
  total_cost_usd: number
}

export interface CandidateResult {
  candidate_id: number
  feasible: boolean
  rank: number | null
  geometry: { length: number; width: number; height: number; roof_pitch: number }
  material_id: number
  material_name: string
  metrics: CandidateMetrics
  normalized_scores: { comfort: number; energy: number; weight: number; cost: number }
  final_score: number | null
  thermal_summary: {
    min_indoor_temperature: number
    max_indoor_temperature: number
    average_indoor_temperature: number
    total_conduction_loss: number
    total_ventilation_loss: number
    total_solar_gain: number
  }
  comfort: {
    score: number
    classification: string
    percentage_time_in_comfort_range: number
    average_temperature_deviation: number
  }
  error?: string
}

export interface OptimizeResponse {
  meta: {
    total_candidates: number
    feasible_count: number
    infeasible_count: number
    runtime_seconds: number
    feasibility_threshold_pct: number
    weights_used: ScoringWeights
    normalized_weights: ScoringWeights
    scoring_methodology: string
  }
  ranked_candidates: CandidateResult[]
}

export async function runOptimization(input: OptimizeRequest): Promise<OptimizeResponse> {
  const res = await fetch(`${BASE_URL}/api/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Optimization failed')
  }
  return res.json()
}
