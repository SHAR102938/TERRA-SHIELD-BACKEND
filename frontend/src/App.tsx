import { Routes, Route } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import HomePage from './pages/HomePage'
import ProjectsPage from './pages/ProjectsPage'
import ScenarioBuilderPage from './pages/ScenarioBuilderPage'
import ClimateIntelligencePage from './pages/ClimateIntelligencePage'
import GeometryWorkbenchPage from './pages/GeometryWorkbenchPage'
import MaterialLibraryPage from './pages/MaterialLibraryPage'
import EnvelopeBuilderPage from './pages/EnvelopeBuilderPage'
import OperatingConditionsPage from './pages/OperatingConditionsPage'
import SimulationConsolePage from './pages/SimulationConsolePage'
import ResultsPage from './pages/ResultsPage'
import ComparePage from './pages/ComparePage'
import OptimizePage from './pages/OptimizePage'
import ValidationPage from './pages/ValidationPage'
import ReportPage from './pages/ReportPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      {/* Marketing / Overview — full-width, no sidebar */}
      <Route path="/" element={<HomePage />} />

      {/* Workspace routes — with sidebar layout */}
      <Route element={<AppShell />}>
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/scenario/:id" element={<ScenarioBuilderPage />} />
        <Route path="/scenario/:id/climate" element={<ClimateIntelligencePage />} />
        <Route path="/scenario/:id/geometry" element={<GeometryWorkbenchPage />} />
        <Route path="/scenario/:id/materials" element={<MaterialLibraryPage />} />
        <Route path="/scenario/:id/envelope" element={<EnvelopeBuilderPage />} />
        <Route path="/scenario/:id/operating" element={<OperatingConditionsPage />} />
        <Route path="/scenario/:id/simulate" element={<SimulationConsolePage />} />
        <Route path="/scenario/:id/results" element={<ResultsPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/optimize" element={<OptimizePage />} />
        <Route path="/scenario/:id/validation" element={<ValidationPage />} />
        <Route path="/scenario/:id/report" element={<ReportPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Top-level shortcut aliases */}
        <Route path="/envelope" element={<EnvelopeBuilderPage />} />
        <Route path="/conditions" element={<OperatingConditionsPage />} />
        <Route path="/simulation" element={<SimulationConsolePage />} />
        <Route path="/simulate" element={<SimulationConsolePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/validation" element={<ValidationPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Route>
    </Routes>
  )
}
