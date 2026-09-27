# 🚨 TERRA-SHIELD CODEBASE AUDIT: THE "HALL OF SHAME"
> **Document Purpose**: Technical autopsy of physics failures, mathematical blunders, architectural chaos, and missing features in the TERRA-SHIELD repository.
> **Date**: September 2026 | **Target**: SIH2026 Problem Statement SIH26051 | **Team**: SHVAAM

---

## 📑 TABLE OF CONTENTS
- [Part 1: The 10 Critical Bugs & Blunders](#part-1-the-10-critical-bugs--blunders)
  1. [The "Midnight Sun" Phenomenon (Solar Radiation at 2 AM)](#1-the-midnight-sun-phenomenon)
  2. [The Upside-Down Day (Peak Summer Heat at 6:00 AM)](#2-the-upside-down-day-phase-inversion)
  3. [Instant Server Suicide on Startup (Starlette CORS Crash)](#3-instant-server-suicide-on-startup)
  4. [High School Physics Failure: Watts vs Watt-Hours](#4-high-school-physics-failure-watts-vs-watt-hours)
  5. [Geometry Blindspot: The Vanishing Gable Walls](#5-geometry-blindspot-the-vanishing-gable-walls)
  6. [The Hardcoded 72-Hour Optimizer Trap](#6-the-hardcoded-72-hour-optimizer-trap)
  7. [Split Personality Backend (Dual Entrypoints & 404s)](#7-split-personality-backend)
  8. [The "Hackathon Wi-Fi Suicide" (Zero Climate Fallback)](#8-the-hackathon-wi-fi-suicide)
  9. [Frontend Fraud: Hardcoded Zeroes Masquerading as Physics](#9-frontend-fraud-hardcoded-zeroes)
  10. [Ghost Features: Zero Bukhari Fuel & Zero Retrofit Mode](#10-ghost-features-zero-bukhari-fuel--zero-retrofit-mode)
- [Part 2: What Still Needs to be Implemented (The SIH Presentation Gaps)](#part-2-what-still-needs-to-be-implemented-the-sih-gaps)
  - [Gap 1: Bukhari Fuel / Kerosene Savings Calculator (Slide 2, 3, 5)](#gap-1-bukhari-fuel--kerosene-savings-calculator)
  - [Gap 2: Retrofit Mode & Advisory Service (Slide 3, 4, 6)](#gap-2-retrofit-mode--advisory-service)
  - [Gap 3: North-East (Humid Subtropical) Terrain Preset (Slide 2, 3, 6)](#gap-3-north-east-humid-subtropical-terrain-preset)
  - [Gap 4: Flagged Trade-Offs & Borderline Config Review (Slide 3)](#gap-4-flagged-trade-offs--borderline-config-review)
  - [Gap 5: Terrain Preset Justification Sheet (Slide 3)](#gap-5-terrain-preset-justification-sheet)
  - [Gap 6: Offline Pre-cached Climate Datasets (Slide 3, 4)](#gap-6-offline-pre-cached-climate-datasets)
  - [Gap 7: Dynamic Multi-Objective Pareto Chart (Slide 3, 6)](#gap-7-dynamic-multi-objective-pareto-chart)
  - [Gap 8: Dynamic Compare Page (Not Static Mocks)](#gap-8-dynamic-compare-page-not-static-mocks)
- [Part 3: Master Fix & Implementation Roadmap](#part-3-master-fix--implementation-roadmap)

---

# PART 1: THE 10 CRITICAL BUGS & BLUNDERS

### 1. The "Midnight Sun" Phenomenon
- **Location**: [`backend/app/services/thermal_engine.py:L134-136`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/backend/app/services/thermal_engine.py#L134-L136)
- **The Code**:
  ```python
  q_solar_roof = solar_radiation * roof_area * solar_absorptivity
  q_solar_wall = solar_radiation * (wall_area / 2) * solar_absorptivity
  ```
- **The Crime**: `solar_radiation` is a static scalar pulled from the climate dict. It **never changes with time**.
- **The Roast**: Congratulations, our shelter is located on the surface of Mercury. At 1:00 AM, 2:30 AM, and 4:00 AM, hundreds of Watts of blazing direct sunlight are actively penetrating the roof. Someone literally left a comment saying *"A better model would vary this with time of day"* and then committed it to production anyway.

---

### 2. The Upside-Down Day (Phase Inversion)
- **Location**: [`backend/app/services/thermal_engine.py:L93-94`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/backend/app/services/thermal_engine.py#L93-L94), [`L121`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/backend/app/services/thermal_engine.py#L121)
- **The Code**:
  ```python
  T_outdoor_C = T_outdoor_mean_C + T_amplitude_C * math.sin(2 * math.pi * current_hour / 24)
  ```
- **The Crime**: Trigonometry is hard.
  - At $t = 0$ (Midnight): $\sin(0) = 0$ (Average temperature).
  - At $t = 6$ (6:00 AM, Dawn): $\sin(\pi/2) = \mathbf{+1}$ (**PEAK MAXIMUM HEAT** of the day).
  - At $t = 18$ (6:00 PM, Dusk): $\sin(3\pi/2) = \mathbf{-1}$ (**COLDEST FREEZING MINIMUM** of the day).
- **The Roast**: In what universe is 6:00 AM the hottest hour of the day and 6:00 PM the coldest? The entire diurnal cycle is phase-shifted by 12 hours. The simulation cooks the soldiers at breakfast and freezes them at dinner.

---

### 3. Instant Server Suicide on Startup
- **Location**: [`backend/app/main.py:L37-43`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/backend/app/main.py#L37-L43)
- **The Code**:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
- **The Crime**: Combining `allow_origins=["*"]` with `allow_credentials=True`.
- **The Roast**: Starlette/FastAPI raises a hard `ValueError` on startup:
  > *"ValueError: Cannot use ['*'] for allow_origins when allow_credentials is True"*
  
  The backend literally **does not boot**. Anyone claiming they tested the full stack together was looking at cached browser responses or hallucinating.

---

### 4. High School Physics Failure: Watts vs Watt-Hours
- **Location**: [`backend/app/services/comfort_engine.py:L88-91`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/backend/app/services/comfort_engine.py#L88-L91) & [`frontend/src/stores/appStore.ts:L332-340`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/frontend/src/stores/appStore.ts#L332-L340)
- **The Code**:
  ```python
  "total_conduction_loss": sum(s.get("conduction_loss", 0) for s in time_series)
  ```
  ```typescript
  conduction_walls_kwh: res.thermal_summary.total_conduction_loss / 1000
  ```
- **The Crime**: Power ($W = J/s$) is being summed directly across timesteps without multiplying by $\Delta t$ ($\text{hours}$).
- **The Roast**: $\text{Energy} \ne \sum \text{Power}$. If someone runs a simulation with 30-minute timesteps ($0.5\text{ hr}$), the total heat loss magically **doubles**. Then the frontend nonchalantly divides this random sum by 1000 and labels it `kWh`. Newton is rolling in his grave.

---

### 5. Geometry Blindspot: The Vanishing Gable Walls
- **Location**: [`backend/app/services/geometry_engine.py:L12`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/backend/app/services/geometry_engine.py#L12)
- **The Code**:
  ```python
  floor_area = length * width
  wall_area = 2 * (length * height) + 2 * (width * height)
  ```
- **The Crime**: A gable roof sits on top of two triangular end pediments.
- **The Roast**: Where did the triangular gable walls go? $2 \times (\frac{1}{2} \times \text{width} \times \text{roof\_rise}) = \text{width} \times \text{roof\_rise}$. In this engine, the two triangular ends of the shelter are open to the sky. Heat conduction simply ignores both triangular walls.

---

### 6. The Hardcoded 72-Hour Optimizer Trap
- **Location**: [`backend/app/config/optimization_config.py:L36`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/backend/app/config/optimization_config.py#L36)
- **The Code**:
  ```python
  NORM_RANGES = {
      "energy_loss_min":  0,
      "energy_loss_max":  250_000,    # ~250 kWh over 72 h
      ...
  }
  ```
- **The Crime**: The normalization reference range is hardcoded to $250,000\text{ Wh}$ for a 72-hour run.
- **The Roast**: The frontend UI on `OptimizePage.tsx` lets users select 24 hours, 72 hours, or 168 hours (1 week). If a user runs 168 hours, energy loss easily surpasses 250,000, clamping the score to 0. If they run 24 hours, all configurations look like God-tier energy savers. The optimizer math breaks every time anyone moves the slider.

---

### 7. Split Personality Backend
- **Location**: [`backend/main.py`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/backend/main.py) vs [`backend/app/main.py`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/backend/app/main.py)
- **The Crime**: Two completely conflicting backend structures:
  - `backend/main.py` mounts `/api/v1` routes.
  - `backend/app/main.py` mounts `/api/geometry`, `/api/materials`, `/api/climate`, `/api/analysis`, `/api/optimize`.
  - Frontend (`frontend/src/lib/api.ts`) exclusively calls the `/api/*` endpoints.
- **The Roast**: If you run standard `uvicorn main:app` inside `backend/`, **every single API call from the frontend returns 404 Not Found**. Two developers were clearly working in their own silos without talking to each other, creating twin backends that don't match.

---

### 8. The "Hackathon Wi-Fi Suicide"
- **Location**: [`backend/app/services/climate_service.py:L20-44`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/backend/app/services/climate_service.py#L20-L44)
- **The Crime**: Live, synchronous, un-cached HTTP calls to NASA POWER API on every single request.
- **The Roast**:
  - Hackathon Wi-Fi goes down? **Crash with 503.**
  - NASA POWER API rate-limits or times out? **Crash with 503.**
  - Meanwhile, somebody wrote an entire SQLite cache and offline Leh dataset in [`backend/services/climate_service.py`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/backend/services/climate_service.py), but forgot to connect it to the main router. Pure dead code.

---

### 9. Frontend Fraud: Hardcoded Zeroes
- **Location**: [`frontend/src/stores/appStore.ts:L325-354`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/frontend/src/stores/appStore.ts#L325-L354)
- **The Code**:
  ```typescript
  q_conduction_roof: res.time_series.map(ts => 0), // Not separated
  heat_balance: {
    conduction_roof_kwh: 0,
    conduction_floor_kwh: 0,
    heating_energy_kwh: 0, // Simplified for now
    ...
  },
  comfort: {
    pmv_mean: 0,
    ppd_mean: 0,
    peak_heating_load_w: 0,
    ...
  }
  ```
- **The Crime**: The UI claims to show Fanger PMV/PPD thermal comfort indices, peak heating loads, and roof conduction loss on the Results & Report pages.
- **The Roast**: It's all literally `0`. They built the charts, styled the cards, added shiny gradients, and then hardcoded `0` because their backend engine was too lazy to calculate them.

---

### 10. Ghost Features: Zero Bukhari Fuel & Zero Retrofit Mode
- **Location**: The Entire Codebase vs [SIH2026- GROUP 6.pdf](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/SIH2026-%20GROUP%206.pdf)
- **The Crime**:
  1. **Bukhari Fuel Savings**: The presentation's #1 selling point on Slide 2 is *"Fuel-based heaters (Bukhari) cause CO poisoning... DRDO cut fuel consumption by ~50%"*. In the code? **Zero kerosene calculation, zero CO risk metric, zero fuel convoy reduction.**
  2. **Retrofit Mode**: Slide 3 & 4 promise a *"Retrofit Recommendation List (for existing structures)"*. In the code? The word `retrofit` appears **once** in the entire repo—as a comment in [`backend/app/models/db_models.py:L19`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/backend/app/models/db_models.py#L19). There is no UI, no endpoint, and no logic.
  3. **North-East Preset**: The PDF boasts about North-East humid terrain. Only Leh and Jaisalmer exist in `appStore.ts`.

---

# PART 2: WHAT STILL NEEDS TO BE IMPLEMENTED (THE SIH GAPS)
> Everything in this section was promised directly to the judges in **SIH2026- GROUP 6.pdf**, but **does not exist anywhere in the code**.

### Gap 1: Bukhari Fuel / Kerosene Savings Calculator
- **Promised on**: Slide 2, Slide 3, Slide 5
- **What the PDF says**:
  > *"Fuel-based heaters (Bukhari) cause CO poisoning and fatalities at high-altitude posts."*
  > *"DRDO's redesign cut fuel consumption by ~50% (saves thousands of crores)."*
  > *"Pareto frontier: comfort vs fuel vs weight vs cost."*
- **What's in the Code**: **NOTHING.** Zero lines of code calculate fuel.
- **What must be implemented**:
  1. **Fuel Consumption Formula**: Convert heating load ($\text{kWh}$) to liters of kerosene burned based on typical Bukhari thermal efficiency ($\approx 40-50\%$, $10\text{ kWh/liter}$).
  2. **Convoy Reduction Metric**: Calculate liters saved $\rightarrow$ Army kerosene barrels/truck convoy trips eliminated.
  3. **Soldier Safety / CO Risk Score**: Quantify CO risk reduction based on hours Bukhari is shut off or reduced.

---

### Gap 2: Retrofit Mode & Advisory Service
- **Promised on**: Slide 3, Slide 4, Slide 6
- **What the PDF says**:
  > *"Run New-Build or Retrofit Mode"*
  > *"Retrofit Recommendation List (for existing structures): Standalone paid service ranking minimum-cost upgrades for existing shelters/huts."*
  > *"Ranked minimum-cost intervention list."*
- **What's in the Code**: `project_type = Column(String, default="new-build") # 'new-build' or 'retrofit'` in [`db_models.py`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/backend/app/models/db_models.py). That's it. No UI button, no backend endpoint, no upgrade advisor.
- **What must be implemented**:
  1. **UI Mode Switcher**: Toggle between `New Build` and `Retrofit Existing Shelter`.
  2. **Intervention Engine**: Takes an existing poorly insulated shelter (e.g. 300mm uninsulated stone) and tests discrete upgrades:
     - Add 50mm / 100mm exterior EPS/Rockwool
     - Add secondary glazing / poly-carbonate layer
     - Air-tightness seal (reduce ACH from 1.5 to 0.4)
     - Trombe wall addition
  3. **Ranked Payoff Table**: Shows Cost (₹) vs Thermal Comfort Gain vs Fuel Saved for each intervention.

---

### Gap 3: North-East (Humid Subtropical) Terrain Preset
- **Promised on**: Slide 2, Slide 3, Slide 4, Slide 6
- **What the PDF says**:
  > *"Terrain-Specific: Presets for Siachen/Ladakh, desert and North-East."*
  > *"Auto-loads cold-desert / arid / humid-NE climate + constraint profile."*
- **What's in the Code**: Only **Leh** (Cold-Desert) and **Jaisalmer** (Hot-Arid) exist in [`appStore.ts:L150`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/frontend/src/stores/appStore.ts#L150). The entire North-East terrain is missing.
- **What must be implemented**:
  1. **Tawang / Sikkim Preset**: High altitude, high rainfall, high relative humidity ($RH > 80\%$), low diurnal temperature swing.
  2. **Moisture & Condensation Check**: In humid cold zones, insulation without vapour barrier causes condensation; add moisture/dew-point risk flag.

---

### Gap 4: Flagged Trade-Offs & Borderline Config Review
- **Promised on**: Slide 3
- **What the PDF says**:
  > *"Review Flagged Trade-Offs: Borderline configs routed to manual engineer review rather than auto-accepted."*
- **What's in the Code**: The optimizer currently has a dumb binary switch: comfort $\ge 30\%$ = `Feasible`, comfort $< 30\%$ = `Infeasible`.
- **What must be implemented**:
  1. Three-tier classification in `optimizer.py`:
     - **Optimal / Feasible**: Comfort $\ge 75\%$
     - **Flagged / Borderline**: Comfort $50\% - 74\%$ (flagged with specific warning: e.g. *"Heavy transport weight required"* or *"High fuel backup required"*).
     - **Infeasible**: Comfort $< 50\%$.
  2. UI badge & filter on `OptimizePage.tsx` for "Flagged for Engineer Review".

---

### Gap 5: Terrain Preset Justification Sheet
- **Promised on**: Slide 3
- **What the PDF says**:
  > *"Digital Output: Terrain Preset Justification Sheet"*
- **What's in the Code**: **NOTHING.** No sheet, modal, or page exists.
- **What must be implemented**:
  1. A structured view / export explaining **why** the design was selected for the terrain:
     - Reference DRDO Him-Tapak design principles
     - Reference G.B. Pant Institute Passive Solar Architecture guidelines (PSHBs)
     - Specify solar passive heat gains vs R-value requirements for Ladakh vs Tawang.

---

### Gap 6: Offline Pre-cached Climate Datasets
- **Promised on**: Slide 3, Slide 4
- **What the PDF says**:
  > *"Validation & Data: Offline ANSYS benchmark runs, NASA POWER climate API, cached datasets for offline demo reliability"*
  > *"Secure local computation, no internet dependency for cached climate data"*
- **What's in the Code**: [`backend/app/services/climate_service.py`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/backend/app/services/climate_service.py) exclusively makes live requests to NASA POWER. If the demo hall doesn't have internet, it crashes.
- **What must be implemented**:
  1. Seed JSON/SQLite bundles for:
     - `leh_winter_hourly.json`
     - `jaisalmer_summer_hourly.json`
     - `tawang_monsoon_winter_hourly.json`
  2. Automatic local fallback if external NASA API times out ($>2\text{s}$).

---

### Gap 7: Dynamic Multi-Objective Pareto Chart
- **Promised on**: Slide 2, Slide 3, Slide 6
- **What the PDF says**:
  > *"Plotly for graphs"*
  > *"Comfort vs Fuel vs Weight vs Cost Pareto Chart"*
  > *"Pareto Output & Export (Generates ranked CSV + comparison charts)"*
- **What's in the Code**: `OptimizePage.tsx` only has an SVG 2D scatter plot plotting Comfort against a single axis. No 4D Pareto frontier (Comfort, Fuel, Weight, Cost), and no Plotly charts despite `plotly.js` being installed in `package.json`.
- **What must be implemented**:
  1. True Pareto frontier identification in the optimizer (candidates where no other candidate beats them in all 4 metrics).
  2. Interactive multi-metric Pareto chart using Plotly (already in dependencies).

---

### Gap 8: Dynamic Compare Page (Not Static Mocks)
- **Location**: [`frontend/src/pages/ComparePage.tsx:L35-65`](file:///c:/Users/aryan/Desktop/TERRA-SHIELD-BACKEND/frontend/src/pages/ComparePage.tsx#L35-L65)
- **The Crime**: `ComparePage.tsx` has a hardcoded array:
  `const VARIANTS = [{ name: 'Base Design (Stone + 50mm EPS)', annual_heating_kwh: 4280 ... }]`
- **What must be implemented**:
  1. Allow comparing the **Current Active Scenario** vs **Top Optimizer Ranked Candidate** vs **Baseline Shelter**.
  2. Real dynamic calculations instead of fake hardcoded static cards.

---

## 🏆 COMPLETE SUMMARY SCORECARD
| Category | Score | Real State |
| :--- | :---: | :--- |
| **Physics Accuracy** | **2 / 10** | Sun at midnight, hottest at 6 AM, open-ended gable walls. |
| **Math Integrity** | **3 / 10** | Summing Watts as Joules, static 72h optimizer divisor. |
| **Architecture** | **3 / 10** | Dual backends, CORS crash on boot, unlinked caching. |
| **SIH Presentation Fidelity** | **3 / 10** | Bukhari fuel, Retrofit mode, North-East preset, and Justification Sheet are completely missing. |

---

# PART 3: MASTER FIX & IMPLEMENTATION ROADMAP

```mermaid
flowchart TD
    subgraph Step 1: Emergency Bug Fixes
        A1[Fix CORS Starlette Startup Crash]
        A2[Fix Diurnal Cycle Phase Shift]
        A3[Fix Midnight Sun / Diurnal Solar Modulation]
        A4[Fix Power W vs Energy Wh Integration]
        A5[Add Missing Triangular Gable Walls]
    end

    subgraph Step 2: Architecture Unification
        B1[Unify into single backend/main.py]
        B2[Plug in Offline Climate Cache for Leh, Jaisalmer, Tawang]
        B3[Feed real PMV/PPD & heating load to frontend]
    end

    subgraph Step 3: Implement Missing SIH Features
        C1[Bukhari Kerosene & Fuel Savings Engine]
        C2[Retrofit Advisory Mode & Intervention Table]
        C3[North-East Tawang Humid Preset]
        C4[Three-Tier Borderline Review in Optimizer]
        C5[Terrain Justification Sheet & Dynamic Compare Page]
    end

    Step 1 --> Step 2 --> Step 3
```
