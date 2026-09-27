You are the lead software engineer responsible for completing the TERRA-SHIELD project in this repository.

REPOSITORY:
https://github.com/SHAR102938/TERRA-SHIELD-BACKEND

CURRENT WORKING BRANCH:
meet

IMPORTANT REFERENCE FILES AVAILABLE IN THE WORKSPACE:
1. BUGS_AUDIT.md
2. SIH2026- GROUP 6.pdf

MISSION:
Completely audit, repair, implement, test, and productionize the TERRA-SHIELD project so that the actual software matches the functionality and workflow presented in the SIH2026 presentation.

Do NOT treat this as a superficial UI task.
This is a physics + backend + optimization + frontend + validation + architecture completion task.

The project must become internally consistent, physically defensible, testable, and demonstrable.

==================================================
0. CORE RULES — FOLLOW THESE STRICTLY
==================================================

1. FIRST UNDERSTAND EVERYTHING.
Before modifying code, inspect the entire relevant repository structure and understand:
- backend architecture
- frontend architecture
- API routing
- thermal simulation flow
- climate data flow
- material data flow
- geometry calculations
- optimization engine
- validation engine
- frontend state management
- results/report pages
- compare page
- optimization page
- existing ANSYS benchmark infrastructure
- tests
- database models
- configuration
- scripts
- package/dependency setup

2. USE THE TWO REFERENCE FILES AS REQUIREMENT SOURCES.
BUGS_AUDIT.md is the master list of:
- existing bugs that still need to be fixed
- features that still need to be implemented

SIH2026- GROUP 6.pdf is the product/presentation reference showing what the project promises.

Do NOT silently remove an item from the audit just because the code has partial infrastructure for it.

3. DO NOT BLINDLY TRUST THE AUDIT.
For every audit item:
- inspect current code
- verify whether it is actually fixed
- verify whether it is partially fixed
- verify whether it is still broken
- verify whether the implementation is functionally correct
- verify integration with the rest of the system

The audit is the backlog, but current code is the source of truth for implementation state.

4. DO NOT FAKE FEATURES.
Absolutely no:
- fake physics values
- hardcoded result metrics
- fake PMV/PPD
- fake heating loads
- fake Pareto results
- fake ANSYS verification
- fake retrofit savings
- fake Bukhari savings
- fake North-East climate values
- hardcoded "winner" configurations
- static comparison numbers presented as live calculations

If a value is not actually calculated, calculate it.
If a dependency is unavailable, implement a clearly stated fallback.
Never disguise a placeholder as a real engineering result.

5. PRESERVE WORK THAT IS ALREADY VALID.
Do not rewrite the whole project unnecessarily.
Prefer controlled, targeted changes over destructive rewrites.

6. KEEP API CONTRACTS CONSISTENT.
If an API response changes, update every consumer and every test affected by it.

7. USE REAL UNITS THROUGHOUT.
Explicitly distinguish:
- W
- Wh
- kWh
- J
- J/K
- K/W
- W/m²K
- kg
- ₹
- liters
- hours

Never sum power values as if they were energy.

8. ADD TESTS FOR EVERY IMPORTANT FIX.
A feature is NOT complete merely because the code compiles.
Add unit/integration tests where appropriate.

9. DO NOT CLAIM ANSYS VERIFICATION UNLESS REAL ANSYS DATA EXISTS.
The current benchmark infrastructure may contain analytical test fixtures.
Those are useful for testing the validation pipeline but are NOT genuine ANSYS validation.
Keep provenance explicit.

10. AFTER EVERYTHING:
Run a final audit against every item in BUGS_AUDIT.md and every major capability promised in the SIH PDF.

==================================================
1. PHASE 1 — DEEP REPOSITORY AUDIT, NO CODE CHANGES YET
==================================================

Before editing anything, inspect:

BACKEND:
- backend/main.py
- backend/app/main.py
- backend/api/
- backend/app/api/
- backend/app/services/
- backend/app/models/
- backend/app/data/
- backend/app/config/
- backend/tests/
- climate services
- thermal engine
- comfort engine
- geometry engine
- optimization engine
- validation engine
- ANSYS benchmark services
- DB configuration
- all relevant routers

FRONTEND:
- frontend/src/
- stores
- lib/api.ts
- pages
- components
- optimization UI
- results/report UI
- compare UI
- validation UI
- scenario wizard
- presets
- any mock/demo data

Also inspect:
- package.json
- requirements files
- environment/config files
- startup scripts
- test scripts
- deployment configuration

Inspect Git history and the current `meet` branch state so that you understand what has recently changed.

==================================================
2. PHASE 2 — CREATE A MASTER IMPLEMENTATION PLAN
==================================================

Before making fixes, create:

IMPLEMENTATION_PLAN.md

The plan must contain:

A. CURRENT ARCHITECTURE
Explain:
- how frontend talks to backend
- all backend entrypoints
- all API prefixes
- where simulation starts
- where climate data comes from
- where thermal calculations happen
- where comfort is calculated
- where optimization happens
- where results are transformed for frontend
- how validation works
- where ANSYS benchmark data comes from

B. AUDIT STATUS TABLE

Create a table for EVERY ITEM in BUGS_AUDIT.md:

Columns:
- ID
- Issue/Feature
- Current Status
- Evidence/File
- Root Cause
- Required Fix
- Dependencies
- Tests Required
- Acceptance Criteria

Status must be one of:
- OPEN
- PARTIALLY FIXED
- FIXED BUT UNVERIFIED
- VERIFIED FIXED
- NOT APPLICABLE

Do not mark something fixed merely because code exists.

C. SIH REQUIREMENTS MATRIX

Extract the important promised capabilities from the SIH PDF and map them to:
- existing implementation
- missing implementation
- backend requirement
- frontend requirement
- data requirement
- validation requirement

At minimum cover:
- terrain-specific presets
- physics-based thermal simulation
- transient model
- optimization
- comfort vs fuel vs weight vs cost
- ANSYS validation
- offline climate reliability
- retrofit workflow
- flagged trade-offs/manual engineer review
- terrain preset justification sheet
- ranked design configuration report
- compare workflow
- export capability
- Bukhari/fuel savings
- North-East terrain

D. DEPENDENCY GRAPH

Explicitly show what must happen before what.

Example structure:

Architecture stabilization
    ↓
Physics corrections
    ↓
Unit-consistent thermal outputs
    ↓
Comfort + energy metrics
    ↓
Optimization
    ↓
Fuel/weight/cost objectives
    ↓
Pareto frontier
    ↓
Retrofit engine
    ↓
Terrain presets
    ↓
Compare/report/export
    ↓
Validation
    ↓
Final integration tests

Do not blindly follow this example if repository dependencies suggest a better sequence.

E. FILE-LEVEL CHANGE PLAN

List:
- files to modify
- files to create
- files that should remain untouched
- migrations if required
- test files to add/modify

F. RISKS

Document:
- physics risks
- numerical stability risks
- API compatibility risks
- frontend regression risks
- performance risks
- offline-demo risks
- data provenance risks

==================================================
3. PHASE 3 — IMPLEMENT THE PLAN
==================================================

After the plan is created and reviewed internally, proceed with implementation.

Do NOT stop after writing the plan.
The task is to execute the complete plan in the same task.

Implement in logical phases.

==================================================
4. PHASE 4 — FIX ALL EXISTING BUGS
==================================================

------------------------------------------
BUG 1 — TIME-DEPENDENT SOLAR RADIATION
------------------------------------------

Current issue:
thermal_engine.py uses a static solar_radiation value during the whole simulation.

Replace that behavior with a time-dependent solar model.

Requirements:
- solar gain must be zero or effectively zero during nighttime
- solar radiation must vary with time
- use a physically sensible daily profile
- preserve the ability to use measured/hourly climate data when available
- do not double-count solar gain
- use the simulation timestamp/hour consistently
- support multi-day simulations

If a simplified solar model is used:
- clearly document assumptions
- make parameters configurable
- avoid arbitrary hidden constants

Preferred architecture:
climate data should expose an hourly/daily solar signal where possible.
The thermal engine should consume that signal instead of inventing constant radiation.

Add tests:
- nighttime solar = 0
- daytime solar > 0 when applicable
- daily periodicity
- 72h simulation behaves consistently across days

------------------------------------------
BUG 2 — OUTDOOR TEMPERATURE PHASE
------------------------------------------

Current issue:
sin(2πt/24) makes 6 AM the maximum and 6 PM the minimum.

Fix the phase.

Requirements:
- temperature cycle should have physically sensible daily timing
- configurable peak/minimum hour is preferred
- do not hardcode a scientifically misleading cycle
- preserve support for arbitrary time series data

Add tests:
- verify maximum/minimum timing
- verify 24h periodicity
- verify multi-day consistency

------------------------------------------
BUG 3 — CORS STARTUP
------------------------------------------

Current configuration contains:
allow_origins=["*"]
allow_credentials=True

Fix the configuration.

Requirements:
- local development origins must work
- frontend requests must work
- credentials behavior must be compatible with configured origins
- do not leave invalid wildcard + credential combination
- support environment-based configuration where sensible

Add a startup/integration test proving the app initializes.

------------------------------------------
BUG 4 — POWER VS ENERGY
------------------------------------------

This is critical.

Current system can report heat flows in W and then aggregate them as if they were Wh/kWh.

Fix this properly.

Requirements:
- instantaneous heat flow = W
- energy over timestep = W × seconds/hour conversion
- total energy = integral/sum(P × Δt)
- timestep size must affect integration correctly
- 30 minute and 60 minute runs must produce equivalent energy over the same physical period when using the same underlying conditions
- labels must correctly state W / Wh / kWh

Do not simply divide by 1000.

Audit all energy calculations across:
- thermal engine
- comfort engine
- optimizer
- API response mapping
- frontend store
- results pages
- compare page
- reports/export

Add unit tests using known power/time cases.

Example:
1000 W for 1 hour = 1 kWh.
1000 W for 30 min = 0.5 kWh.
1000 W for 72 hours = 72 kWh.

------------------------------------------
BUG 5 — GABLE WALL GEOMETRY
------------------------------------------

Current wall area excludes triangular gable end areas.

Fix geometry.

For a gable roof, include both triangular end pediments in envelope wall area where appropriate.

Requirements:
- geometry should remain mathematically consistent
- wall area
- roof area
- total height
- volume
- envelope area

must all remain coherent.

Be careful about:
- roof pitch = 0
- valid high pitches
- invalid pitch
- volume contribution of triangular roof

Add analytical geometry tests for a known dimension set.

Do not create double-counting between roof and gable walls.

------------------------------------------
BUG 6 — OPTIMIZER NORMALIZATION
------------------------------------------

Current NORM_RANGES contains a fixed energy-loss upper bound associated with 72h.

This must not silently break for:
- 24h
- 72h
- 168h
- arbitrary simulation durations

Implement duration-aware normalization or a robust dynamic normalization approach.

Requirements:
- optimizer scores remain meaningful across durations
- no arbitrary clamping caused purely by longer simulation duration
- normalization should be centralized
- configuration should be explicit
- document assumptions

Add tests across:
24h
72h
168h

------------------------------------------
BUG 7 — BACKEND ARCHITECTURE / DUAL ENTRYPOINTS
------------------------------------------

Current repository contains:
- backend/main.py
- backend/app/main.py
- classic /api routes
- /api/v1 routes

Unify the architecture.

Choose ONE canonical application entrypoint.

Do not accidentally break:
- existing frontend APIs
- validation
- optimization
- projects
- materials
- climate
- geometry

Create a clear routing structure.

If versioned APIs are retained:
- explicitly define their purpose
- avoid duplicate/conflicting route implementations
- ensure frontend uses the canonical API

Update startup instructions and tests.

There must be a single obvious command for running the backend.

------------------------------------------
BUG 8 — CLIMATE OFFLINE FAILURE
------------------------------------------

Current climate service directly calls NASA POWER and can fail when network is unavailable.

Implement a robust climate provider architecture.

Requirements:
1. live NASA POWER provider
2. local cached provider
3. automatic fallback
4. timeout
5. meaningful error handling
6. source/provenance information

At minimum support cached datasets for:
- Leh / Ladakh
- Jaisalmer
- North-East / Tawang

Use structured data rather than scattered hardcoded values.

The app must still be demoable without internet.

Do not fake current live data.
Clearly mark cached data as cached/historical/reference data.

------------------------------------------
BUG 9 — FRONTEND HARDCODED ZERO RESULTS
------------------------------------------

Remove fake zero values.

Current frontend contains fields such as:
- q_conduction_roof = 0
- conduction_roof_kwh = 0
- conduction_floor_kwh = 0
- conduction_windows_kwh = 0
- heating_energy_kwh = 0
- pmv_mean = 0
- ppd_mean = 0
- peak_heating_load_w = 0
- hours_below_comfort = 0
- hours_above_comfort = 0

These must either:
A. be calculated by backend, or
B. be explicitly marked unavailable.

Do NOT silently display fake zeros.

The backend should return a structured result model with:
- thermal time series
- heat balance
- energy totals
- comfort metrics
- heating/cooling loads
- envelope component losses
- provenance
- assumptions

Frontend should map real results.

------------------------------------------
BUG 10 — MOCK / DEMO DATA LEAKAGE
------------------------------------------

Search for:
- generateDemoResults
- hardcoded benchmark values
- hardcoded winners
- fake compare variants
- random simulation values
- placeholder metrics

Separate:
- actual production calculation
- controlled test fixtures
- explicit demo mode

A normal user running a real scenario must NEVER unknowingly receive fake/random simulation output.

If demo mode is retained, make it explicit.

==================================================
5. BUILD MISSING SIH FEATURES
==================================================

==================================================
FEATURE A — BUKHARI / KEROSENE FUEL MODEL
==================================================

Implement a real fuel-consumption model.

Inputs should include relevant parameters such as:
- required thermal energy
- heater thermal efficiency
- fuel energy density
- operating hours
- baseline heater usage

Calculate:
- fuel consumed
- baseline fuel consumed
- optimized fuel consumed
- liters saved
- percentage fuel reduction
- optionally transport/convoy implications where defensible

Do not invent military logistics numbers unless explicitly configurable and sourced.

Make assumptions visible.

CO-risk representation:
Do NOT pretend to perform medical/toxicological prediction.
Use a transparent operational-risk indicator based on heater operation/exposure conditions and explicitly define assumptions.

Output should support:
Comfort
Fuel
Weight
Cost

as separate optimization objectives.

==================================================
FEATURE B — RETROFIT MODE
==================================================

Implement actual New Build vs Retrofit mode.

UI:
- mode selector
- New Build
- Retrofit Existing Shelter

Retrofit flow:
1. define existing shelter
2. define existing materials/geometry
3. calculate current baseline performance
4. generate candidate interventions
5. simulate each intervention
6. calculate improvement
7. rank interventions

At minimum support interventions such as:
- 50mm insulation
- 100mm insulation
- insulation material alternatives
- secondary glazing / glazing improvements
- air-tightness improvement / ACH reduction
- Trombe wall or equivalent passive intervention where supported by the existing physics model

For every intervention report:
- capital cost
- thermal improvement
- energy saved
- fuel saved
- comfort improvement
- weight change
- implementation assumptions

Ranking must be computed dynamically.

Do not hardcode the recommendation.

==================================================
FEATURE C — NORTH-EAST / TAWANG PRESET
==================================================

Implement a terrain/climate preset for humid North-East high-altitude conditions.

At minimum model:
- location
- elevation
- temperature profile
- humidity
- solar profile
- wind
- rainfall/moisture assumptions where applicable

Add moisture/condensation/dew-point risk logic.

The system should flag cases where:
- indoor surface temperature approaches/exceeds dew-point risk threshold
- insulation strategy may create moisture concerns under configured assumptions

Do not present this as detailed hygrothermal CFD.
Clearly label it as a screening/risk indicator.

Support at least:
- Leh / Ladakh
- Jaisalmer
- Tawang / North-East

Presets must feed actual simulation inputs, not merely change UI text.

==================================================
FEATURE D — FLAGGED / BORDERLINE CONFIGURATION REVIEW
==================================================

Replace the simplistic binary feasibility handling with a meaningful multi-state classification.

At minimum:
- Feasible
- Flagged / Borderline
- Infeasible

Classification criteria must be centralized and configurable.

A flagged candidate must contain reasons such as:
- excessive weight
- excessive cost
- high backup heating requirement
- low comfort margin
- moisture risk
- other clearly defined engineering constraint violations

Do NOT use vague labels without reasons.

Frontend:
- badge
- filter
- explanation
- review section

==================================================
FEATURE E — TERRAIN PRESET JUSTIFICATION SHEET
==================================================

Create a dynamic justification document/view.

It must explain:
- selected terrain
- climate assumptions
- geometry assumptions
- material choice
- insulation choice
- orientation
- passive solar assumptions
- comfort target
- key thermal results
- optimization rationale
- limitations

Where the SIH presentation references:
- DRDO Him Tapak principles
- G.B. Pant passive solar guidance

represent those as references/engineering rationale, not fabricated quotes.

The document should clearly distinguish:
- project assumptions
- computed outputs
- external references

Support export to a useful format if the architecture permits.

==================================================
FEATURE F — OFFLINE PRE-CACHED CLIMATE DATA
==================================================

Implement proper local datasets.

At minimum provide structured datasets for:
- Leh winter
- Jaisalmer summer
- Tawang / North-East representative period

Requirements:
- hourly temperature
- solar radiation
- relative humidity
- wind speed
- timestamps
- provenance
- dataset description

Backend should automatically use cache when live data:
- times out
- fails
- is unavailable
- is explicitly disabled for offline demo mode

Do not generate random fake climate data.

==================================================
FEATURE G — TRUE MULTI-OBJECTIVE PARETO OPTIMIZATION
==================================================

Implement actual Pareto dominance.

Objectives:
- thermal comfort
- fuel consumption
- envelope weight
- cost

The Pareto frontier must be mathematically derived from candidates.

For candidate A to dominate B:
A must be no worse in every objective and strictly better in at least one, respecting objective direction.

Return:
- complete candidate set
- Pareto candidates
- dominated candidates
- objective values
- rankings
- feasibility/classification
- reasons

Do not create a fake "winner".

A composite score may still exist as an optional user-configurable ranking, but it must NOT replace the true Pareto frontier.

==================================================
FEATURE H — DYNAMIC COMPARE PAGE
==================================================

Replace hardcoded `VARIANTS`.

Compare page should dynamically compare:
1. Current active scenario
2. Baseline shelter
3. Top optimizer candidate / selected candidate
4. Retrofit candidate where applicable

Everything must come from actual simulation/optimization results.

At minimum compare:
- geometry
- material layers
- U-values
- heating demand
- cooling demand
- total energy
- comfort %
- PMV/PPD if actually implemented
- peak load
- fuel
- weight
- cost
- risks/flags

Remove hardcoded:
- "Deterministic Winner"
- "Top Choice"
- "Recommended Solution"

unless those labels are dynamically calculated according to explicit criteria.

==================================================
6. COMFORT / PMV / PPD
==================================================

The SIH presentation refers to thermal comfort.

Audit the current comfort implementation carefully.

Do NOT claim Fanger PMV/PPD unless you actually implement the required inputs and equations sufficiently.

If PMV/PPD is implemented:
- use correct units
- define metabolic rate
- clothing
- air speed
- humidity
- air temperature
- mean radiant temperature
- document assumptions

If true PMV/PPD cannot yet be justified:
- do not display fabricated PMV/PPD values
- use the existing transparent comfort metric
- clearly label it as a temperature-band comfort score

The final UI must make it obvious which metric is being used.

==================================================
7. THERMAL MODEL QUALITY
==================================================

Audit the thermal model beyond the explicitly listed bugs.

Check:
- sign conventions
- conduction direction
- convection direction
- radiation direction
- solar gain
- wall thermal mass
- roof thermal mass
- floor contribution
- window contribution
- ventilation
- internal gains
- timestep integration
- numerical stability
- boundary conditions
- initial conditions
- multi-day continuity

Check whether unused variables or dead calculations indicate incomplete physics.

For example:
- unused h_conv_internal
- unused outdoor_temp_profile
- floor_area loaded but not used in heat transfer
- missing envelope components
- simplified exterior radiation
- simplistic sky temperature

Do not arbitrarily turn this into a CFD engine.
Improve correctness while staying within the project's intended reduced-order thermal simulation scope.

==================================================
8. MATERIAL / ENVELOPE MODEL
==================================================

Audit whether the existing material architecture can support multi-layer envelopes.

The SIH system is intended to evaluate design/material options.

Where appropriate support:
- wall layers
- roof layers
- floor layers
- windows

Avoid pretending a multi-layer envelope is equivalent to one homogeneous material.

Calculate effective thermal resistance correctly.

Ensure optimizer candidates actually modify the physical input they claim to modify.

==================================================
9. RESULTS DATA MODEL
==================================================

Define a stable structured response.

Prefer a schema conceptually similar to:

{
  scenario,
  simulation,
  climate,
  geometry,
  thermal_summary,
  energy_summary,
  heat_balance,
  comfort,
  heating_load,
  fuel,
  envelope,
  optimization,
  risks,
  provenance,
  assumptions
}

Include clear units in API documentation/comments.

Do not make frontend infer engineering meaning from ambiguous field names.

==================================================
10. OPTIMIZATION ENGINE QUALITY
==================================================

Audit the optimizer thoroughly.

Ensure:
- candidate generation is real
- candidate parameters actually affect simulation
- comfort is based on actual simulation outputs
- energy is integrated properly
- cost is calculated from selected materials/interventions
- weight is calculated from geometry × density × thickness
- fuel is calculated from actual heating requirement/assumptions
- feasibility happens before ranking where appropriate
- Pareto logic is independent of arbitrary composite scoring

Do not let a candidate win because of a hardcoded constant.

==================================================
11. REPORTING / EXPORT
==================================================

Implement practical exports wherever promised.

At minimum make it possible to generate:
- ranked configuration report
- comparison information
- optimization metrics
- justification information
- provenance/assumptions
- validation summary where available

CSV export is useful for optimizer results.
Make sure exported numbers use correct units.

==================================================
12. VALIDATION / ANSYS
==================================================

Preserve and improve the existing validation infrastructure.

Important:

Current benchmark fixtures may be analytical/reference fixtures.

Do NOT label them as actual ANSYS validation.

The system must expose:
- source type
- dataset provenance
- fixture vs real ANSYS
- validation status
- metrics
- limitations

If real ANSYS files exist:
- inspect their structure
- validate ingestion
- compute comparison metrics

If not:
- keep fixture-only status
- make the pipeline ready for future genuine exports

At minimum support:
- MAE
- RMSE
- max absolute error
- mean bias
- normalized error
- R² / Pearson where meaningful

Do not fabricate acceptable-error thresholds without documenting them.

==================================================
13. FRONTEND REQUIREMENTS
==================================================

Frontend must be data-driven.

Audit:
- appStore.ts
- api.ts
- Results pages
- OptimizePage.tsx
- ComparePage.tsx
- ValidationPage.tsx
- scenario wizard
- preset selectors

Remove fake data from normal runtime.

UI should show:
- data source
- cached vs live climate
- simulation duration
- assumptions
- warnings
- flagged trade-offs
- optimization objectives
- Pareto candidates
- validation provenance

Do not overwhelm the UI with internal debug information.

==================================================
14. PERFORMANCE
==================================================

The system may evaluate thousands of configurations.

Audit performance.

Avoid:
- unnecessary duplicate simulations
- repeated network calls
- recalculating invariant material properties
- blocking external requests where caching can help

Use reasonable caching/memoization where appropriate.

But do NOT sacrifice correctness for performance.

==================================================
15. TESTING REQUIREMENTS
==================================================

Add or update tests for:

THERMAL:
- solar day/night
- temperature phase
- energy integration
- multi-day simulation
- timestep consistency
- sign conventions

GEOMETRY:
- rectangular geometry
- gable roof
- gable triangular area
- volume
- edge cases

CLIMATE:
- live success
- timeout
- fallback
- cached dataset loading
- provenance

OPTIMIZATION:
- normalization duration
- candidate generation
- feasibility
- flagged state
- Pareto dominance
- objective direction

FUEL:
- known kWh -> liters
- efficiency changes
- savings calculation

RETROFIT:
- intervention generation
- recalculation
- ranking
- cost/benefit

API:
- startup
- routes
- schema
- integration

FRONTEND:
- no accidental hardcoded runtime results
- API mapping
- compare data
- optimization data
- validation states where practical

Run:
- backend test suite
- frontend type-check
- frontend build
- linting where available

Fix all errors you introduce.

==================================================
16. CODE QUALITY
==================================================

While implementing:

- remove dead code when safe
- remove duplicate backend logic
- remove unused imports
- add type hints where practical
- add comments for engineering assumptions
- centralize constants
- avoid magic numbers
- avoid hidden unit conversions
- make configuration explicit
- keep functions reasonably small
- keep frontend logic separated from engineering calculations

Do not over-engineer unnecessarily.

==================================================
17. DOCUMENTATION
==================================================

Update documentation so a new developer can run the project.

Document:
- canonical backend entrypoint
- frontend startup
- environment variables
- API structure
- climate sources
- offline mode
- thermal assumptions
- optimization objectives
- Pareto logic
- retrofit logic
- validation provenance
- benchmark fixture limitations
- test commands

If there is an existing README, update it instead of creating contradictory documentation.

==================================================
18. FINAL VERIFICATION PASS
==================================================

After all implementation is complete:

1. Re-read BUGS_AUDIT.md.
2. Re-check EVERY BUG.
3. Re-check EVERY missing feature.
4. Re-read the SIH PDF requirements.
5. Run tests.
6. Run backend.
7. Run frontend.
8. Run at least one end-to-end simulation.
9. Run at least one optimization.
10. Run at least one compare workflow.
11. Run at least one retrofit workflow.
12. Run at least one validation workflow.
13. Test offline climate fallback.
14. Verify no fake values are displayed in normal runtime.
15. Verify units.
16. Verify API compatibility.
17. Verify no duplicate backend entrypoint confusion remains.
18. Verify frontend build succeeds.

Then create:

FINAL_IMPLEMENTATION_AUDIT.md

with:

A. Every BUGS_AUDIT item:
- fixed / verified
- evidence
- tests

B. Every SIH capability:
- implemented / partially implemented / blocked
- evidence

C. Remaining issues:
Only real remaining issues.
Do not hide anything.

D. Validation status:
Clearly distinguish:
- analytical validation
- test fixture comparison
- genuine ANSYS validation

E. Demo readiness:
Explain exactly what can be demonstrated reliably.

==================================================
19. ACCEPTANCE CRITERIA
==================================================

The project is NOT considered complete merely because:
- it builds
- it looks good
- APIs return 200
- pages render

It is complete only when:

1. Thermal physics bugs from BUGS_AUDIT.md are fixed.
2. Units are mathematically consistent.
3. Geometry is correct for the supported shelter type.
4. Climate works online and offline.
5. Frontend displays real backend results.
6. Optimization operates on real simulation results.
7. Pareto optimization is genuinely multi-objective.
8. Fuel/Bukhari modeling exists.
9. Retrofit mode exists.
10. North-East/Tawang preset exists.
11. Flagged trade-off workflow exists.
12. Terrain justification output exists.
13. Compare page is dynamic.
14. Validation infrastructure is honest about provenance.
15. Tests cover critical engineering logic.
16. The SIH presentation workflow is reflected in the actual software.
17. No fake winner/recommendation/result is hardcoded.
18. The entire application can be demonstrated end-to-end without internet dependency for the cached supported terrains.

==================================================
20. IMPORTANT EXECUTION BEHAVIOR
==================================================

Do not rush directly into coding.

First:
- inspect
- understand
- document
- plan

Then:
- implement foundational fixes
- test
- implement dependent features
- test
- integrate
- test
- final audit

Do not jump randomly between frontend and backend.

Respect dependencies.

If you discover that an item in BUGS_AUDIT.md is already fixed, verify it with code/tests and record it as verified rather than reimplementing it.

If a feature requires a new abstraction, implement the abstraction cleanly instead of adding another hardcoded patch.

If a calculation is simplified, document the simplification and ensure the output is not falsely presented as a higher-fidelity model.

If something in the SIH presentation is ambiguous, preserve the presentation's stated intent while using conservative, transparent engineering assumptions.

MOST IMPORTANT:
The final result should be a coherent working engineering application, not a collection of disconnected demos.

Start now.

STEP 1:
Inspect the complete repository and both reference files.

STEP 2:
Create IMPLEMENTATION_PLAN.md.

STEP 3:
Execute the plan fully.

STEP 4:
Run tests and fix regressions.

STEP 5:
Create FINAL_IMPLEMENTATION_AUDIT.md.

STEP 6:
Give a concise final summary containing:
- what was fixed
- what was implemented
- what was tested
- what remains
- exact commands to run the finished project