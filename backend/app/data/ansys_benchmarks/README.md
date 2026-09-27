# ANSYS Benchmark Datasets for TERRA-SHIELD / THERMASHELL Validation

## Overview

This directory contains reference thermal simulation datasets used to validate
the THERMASHELL RC-network engine against external authoritative solvers.

## Dataset Status

**REAL ANSYS DATA NOT PRESENT** — The infrastructure for ingesting, validating,
and comparing against genuine ANSYS Fluent / Mechanical Transient Thermal exports
is implemented, but no real ANSYS simulation has been performed yet.

The datasets currently included are **test fixtures** generated from independent
analytical solutions, clearly marked with `"source": "TEST_FIXTURE"` in their
metadata.  These fixtures exercise the comparison pipeline end-to-end but **do
not constitute ANSYS verification**.

## Directory Structure

```
ansys_benchmarks/
├── README.md               ← This file
├── manifest.json           ← Registry of all available benchmark cases
├── case_a_moderate_tau/
│   ├── metadata.json       ← Case geometry, BCs, provenance
│   └── temperature.csv     ← time_s, indoor_temperature_c
├── case_b_high_ventilation/
│   ├── metadata.json
│   └── temperature.csv
└── case_c_heavy_insulation/
    ├── metadata.json
    └── temperature.csv
```

## How to Add a Real ANSYS Benchmark

1. Run the ANSYS Fluent / Mechanical Transient Thermal simulation with the
   **exact** geometry, materials, and boundary conditions described in the
   case's `metadata.json`.

2. Export indoor air probe temperature vs. time as CSV:
   ```
   time_s,indoor_temperature_c
   0,30.0
   3600,28.5
   ...
   ```

3. Replace the existing `temperature.csv` with the ANSYS export.

4. Update `metadata.json`:
   - `"source"` → `"ANSYS_FLUENT"` or `"ANSYS_MECHANICAL_TRANSIENT_THERMAL"`
   - `"software_version"` → actual version used
   - `"provenance.dataset_status"` → `"available"`
   - `"provenance.generated_by"` → name/ID of the analyst
   - `"provenance.generated_at"` → ISO timestamp

5. Update `manifest.json` to reflect the new status.

6. The validation API will automatically detect the real data and report
   `"VERIFIED"` or `"FAILED"` based on metric thresholds.

## Validation Metrics

For each benchmark case, the following metrics are computed:

| Metric              | Formula                                      |
|---------------------|----------------------------------------------|
| MAE (°C)            | mean(|T_thermashell − T_reference|)           |
| RMSE (°C)           | sqrt(mean((T_thermashell − T_reference)²))    |
| Pearson r            | correlation coefficient                      |
| R²                  | 1 − SS_res / SS_tot                          |
| Peak Temp Error (°C)| T_peak_thermashell − T_peak_reference         |
| Max Abs Error (°C)  | max(|T_thermashell − T_reference|)            |
| Mean Bias (°C)      | mean(T_thermashell − T_reference)             |

## Acceptance Criterion

Simulations must converge within **5% normalized RMSE**:
```
NRMSE = RMSE / (T_max_ref − T_min_ref) × 100
```
A case is marked `VERIFIED` when NRMSE < 5%.
