"""
Optimization Scoring Configuration
===================================
All scoring weights and feasibility thresholds are defined here.
Do NOT hardcode weights in the optimizer or API layer.

Weights are normalized internally — they do not need to sum to 1.0.
Change these values to adjust priority without modifying engine code.

FEASIBILITY is applied BEFORE scoring.
A candidate failing the comfort_min_percentage threshold is marked
as INFEASIBLE and excluded from ranking regardless of other scores.
"""

# ── Default scoring weights (configurable per request) ──────────────────────
DEFAULT_WEIGHTS = {
    "comfort": 40,      # Thermal comfort score (% time in comfort band)
    "energy":  30,      # Inverse of total heat loss (lower loss = higher score)
    "weight":  15,      # Inverse of total envelope weight (lighter = higher)
    "cost":    15,      # Inverse of total material cost (cheaper = higher)
}

# ── Feasibility threshold ────────────────────────────────────────────────────
# A candidate is INFEASIBLE if comfort % falls below this value.
# Infeasible candidates are NOT ranked. They are returned with rank=None.
FEASIBILITY_MIN_COMFORT_PERCENT = 30.0   # at least 30% of hours must be in-band

# ── Normalization reference ranges ───────────────────────────────────────────
# These are approximate expected ranges for the parameter space explored.
# They are used for min-max normalization to a 0–100 scale.
# They are NOT scientifically validated reference values; they are practical
# bounds based on the material set and typical shelter dimensions.
NORM_RANGES = {
    # Total heat loss (W·h for 72 h sim) — lower is better
    "energy_loss_min":  0,
    "energy_loss_max":  250_000,    # ~250 kWh over 72 h — deliberately wide
    # Total envelope weight (kg) — lighter is better
    "weight_min": 10,
    "weight_max": 5_000,
    # Total material cost (USD) — cheaper is better
    "cost_min": 50,
    "cost_max": 10_000,
}
