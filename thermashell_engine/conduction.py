"""
Conduction heat transfer through multi-layer wall/roof/floor assemblies.

Implements:
  - Steady-state heat flux through composite walls (Fourier's law)
  - R-value / U-value computation with surface resistances
  - Transient conduction approximation using thermal mass weighting
"""

from __future__ import annotations

import math
from thermashell_engine.types import WallAssembly, MaterialLayer


# Standard surface thermal resistances (m²·K/W) per ISO 6946
R_SI_HORIZONTAL = 0.13   # Interior, horizontal heat flow (walls)
R_SE_HORIZONTAL = 0.04   # Exterior, horizontal heat flow (walls)
R_SI_UPWARD = 0.10       # Interior, upward heat flow (roof)
R_SE_UPWARD = 0.04       # Exterior, upward heat flow (roof)
R_SI_DOWNWARD = 0.17     # Interior, downward heat flow (floor)
R_SE_DOWNWARD = 0.04     # Exterior, downward heat flow (floor)


def compute_r_value(assembly: WallAssembly, surface_type: str = "wall") -> float:
    """
    Compute total thermal resistance of an assembly including surface resistances.

    Args:
        assembly: Wall/roof/floor layer stack
        surface_type: "wall", "roof", or "floor" — determines surface R values

    Returns:
        Total R-value in m²·K/W
    """
    if surface_type == "roof":
        r_si, r_se = R_SI_UPWARD, R_SE_UPWARD
    elif surface_type == "floor":
        r_si, r_se = R_SI_DOWNWARD, R_SE_DOWNWARD
    else:
        r_si, r_se = R_SI_HORIZONTAL, R_SE_HORIZONTAL

    r_layers = sum(layer.r_value for layer in assembly.layers)
    return r_si + r_layers + r_se


def compute_u_value(assembly: WallAssembly, surface_type: str = "wall") -> float:
    """
    Compute U-value (thermal transmittance) in W/(m²·K).

    U = 1 / R_total
    """
    r_total = compute_r_value(assembly, surface_type)
    return 1.0 / r_total


def steady_state_heat_flux(
    t_inside: float,
    t_outside: float,
    u_value: float,
    area: float
) -> float:
    """
    Steady-state heat transfer rate through a surface.

    Args:
        t_inside: Indoor temperature °C
        t_outside: Outdoor temperature °C
        u_value: U-value in W/(m²·K)
        area: Surface area in m²

    Returns:
        Heat flow rate in W (positive = heat loss from inside to outside)
    """
    return u_value * area * (t_inside - t_outside)


def heat_flux_through_assembly(
    t_inside: float,
    t_outside: float,
    assembly: WallAssembly,
    area: float,
    surface_type: str = "wall"
) -> float:
    """
    Compute heat flow through a complete wall assembly.

    Returns:
        Heat flow rate in W (positive = heat loss)
    """
    u = compute_u_value(assembly, surface_type)
    return steady_state_heat_flux(t_inside, t_outside, u, area)


def interface_temperatures(
    t_inside: float,
    t_outside: float,
    assembly: WallAssembly,
    surface_type: str = "wall"
) -> list[float]:
    """
    Compute temperature at each layer interface (inside to outside).

    Returns a list of temperatures [T_inner_surface, T_1-2, T_2-3, ..., T_outer_surface]
    """
    if surface_type == "roof":
        r_si, r_se = R_SI_UPWARD, R_SE_UPWARD
    elif surface_type == "floor":
        r_si, r_se = R_SI_DOWNWARD, R_SE_DOWNWARD
    else:
        r_si, r_se = R_SI_HORIZONTAL, R_SE_HORIZONTAL

    r_total = compute_r_value(assembly, surface_type)
    q = (t_inside - t_outside) / r_total  # Heat flux density W/m²

    temps = []
    # Inner surface temperature
    t_current = t_inside - q * r_si
    temps.append(t_current)

    # Interface temperatures through each layer
    for layer in assembly.layers:
        t_current -= q * layer.r_value
        temps.append(t_current)

    return temps


def thermal_capacity_per_area(assembly: WallAssembly) -> float:
    """
    Total thermal capacity per unit area in J/(m²·K).

    Useful for RC network node capacitance computation.
    """
    return sum(layer.thermal_mass for layer in assembly.layers)


def equivalent_rc_params(
    assembly: WallAssembly,
    area: float,
    surface_type: str = "wall"
) -> tuple[float, float]:
    """
    Compute lumped RC parameters for a wall assembly.

    Returns:
        (R, C) where:
            R = total thermal resistance for the whole surface in K/W
            C = total thermal capacitance in J/K
    """
    r_total = compute_r_value(assembly, surface_type)
    R = r_total / area  # K/W for the whole surface
    C = thermal_capacity_per_area(assembly) * area  # J/K
    return R, C
