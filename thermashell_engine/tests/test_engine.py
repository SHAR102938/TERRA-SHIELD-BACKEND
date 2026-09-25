"""Tests for thermal engine — conduction, RC network, and comfort modules."""

import pytest
import math
from thermashell_engine.types import (
    ShelterGeometry, MaterialLayer, WallAssembly, Envelope, Opening,
    ClimateTimeseries, SimulationConfig, RoofType, HVACMode
)
from thermashell_engine.conduction import (
    compute_r_value, compute_u_value, steady_state_heat_flux,
    heat_flux_through_assembly, interface_temperatures, thermal_capacity_per_area
)
from thermashell_engine.convection import (
    interior_convection_coefficient, exterior_convection_coefficient,
    wind_speed_at_height
)
from thermashell_engine.radiation import sky_temperature, longwave_radiation_flux, solar_absorption
from thermashell_engine.solar import solar_declination, solar_altitude, incident_solar_on_surface
from thermashell_engine.ventilation import ventilation_heat_transfer, total_ventilation_heat_loss
from thermashell_engine.comfort import pmv, ppd, operative_temperature, is_comfortable
from thermashell_engine.rc_network import run_simulation


# ── Fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture
def brick_wall():
    return WallAssembly(
        name="Standard Brick",
        layers=[
            MaterialLayer(name="Plaster", thickness_m=0.015, conductivity=0.7, density=1300, specific_heat=840),
            MaterialLayer(name="Brick", thickness_m=0.230, conductivity=0.84, density=1700, specific_heat=800),
            MaterialLayer(name="Plaster", thickness_m=0.015, conductivity=0.7, density=1300, specific_heat=840),
        ]
    )


@pytest.fixture
def insulated_wall():
    return WallAssembly(
        name="Insulated Brick",
        layers=[
            MaterialLayer(name="Plaster", thickness_m=0.015, conductivity=0.7, density=1300, specific_heat=840),
            MaterialLayer(name="Brick", thickness_m=0.230, conductivity=0.84, density=1700, specific_heat=800),
            MaterialLayer(name="EPS Insulation", thickness_m=0.100, conductivity=0.035, density=25, specific_heat=1400),
            MaterialLayer(name="Plaster", thickness_m=0.015, conductivity=0.7, density=1300, specific_heat=840),
        ]
    )


@pytest.fixture
def leh_winter_config():
    """72-hour Leh winter demo scenario."""
    n_hours = 72
    timestamps = [f"2024-01-15T{h%24:02d}:00:00" for h in range(n_hours)]
    temps = [round(-10 + 5 * math.sin(2 * math.pi * h / 24 - math.pi/2), 1) for h in range(n_hours)]
    rh = [25.0] * n_hours
    wind = [round(2 + 1.5 * abs(math.sin(2 * math.pi * h / 24)), 1) for h in range(n_hours)]
    ghi = [max(0, round(400 * math.sin(math.pi * (h % 24 - 6) / 12), 1)) if 6 <= h % 24 <= 18 else 0.0 for h in range(n_hours)]

    geometry = ShelterGeometry(
        length=6.0, width=4.0, height=3.0,
        roof_type=RoofType.GABLE, roof_pitch_deg=15.0,
        orientation_deg=180.0, elevation_m=3500.0
    )

    walls = WallAssembly(name="Insulated Stone", layers=[
        MaterialLayer(name="Plaster", thickness_m=0.015, conductivity=0.7, density=1300, specific_heat=840),
        MaterialLayer(name="Stone", thickness_m=0.300, conductivity=1.5, density=2500, specific_heat=900),
        MaterialLayer(name="EPS Insulation", thickness_m=0.100, conductivity=0.035, density=25, specific_heat=1400),
        MaterialLayer(name="Plaster", thickness_m=0.015, conductivity=0.7, density=1300, specific_heat=840),
    ])
    roof = WallAssembly(name="Insulated Roof", layers=[
        MaterialLayer(name="Metal Sheet", thickness_m=0.002, conductivity=50.0, density=7800, specific_heat=500),
        MaterialLayer(name="XPS Insulation", thickness_m=0.120, conductivity=0.034, density=35, specific_heat=1400),
        MaterialLayer(name="Plywood", thickness_m=0.018, conductivity=0.13, density=550, specific_heat=1700),
    ])
    floor = WallAssembly(name="Insulated Floor", layers=[
        MaterialLayer(name="Concrete", thickness_m=0.150, conductivity=1.4, density=2300, specific_heat=880),
        MaterialLayer(name="XPS Insulation", thickness_m=0.080, conductivity=0.034, density=35, specific_heat=1400),
    ])
    openings = [
        Opening(name="South Window", width_m=1.2, height_m=1.0, wall_face="south", u_value=2.8, shgc=0.65, count=2),
    ]

    return SimulationConfig(
        geometry=geometry,
        envelope=Envelope(walls=walls, roof=roof, floor=floor, openings=openings),
        climate=ClimateTimeseries(
            timestamps=timestamps, temperature_c=temps,
            relative_humidity=rh, wind_speed_ms=wind, solar_ghi=ghi
        ),
        occupants=4, metabolic_rate_w=100.0, internal_gains_w=200.0,
        target_temp_c=18.0, comfort_band_c=2.0,
        hvac_mode=HVACMode.HEATED,
        ach_natural=0.3, ach_infiltration=0.2,
    )


# ── Conduction Tests ─────────────────────────────────────────────────────

class TestConduction:
    def test_r_value_positive(self, brick_wall):
        r = compute_r_value(brick_wall)
        assert r > 0

    def test_u_value_inverse_of_r(self, brick_wall):
        r = compute_r_value(brick_wall)
        u = compute_u_value(brick_wall)
        assert abs(u - 1.0/r) < 0.001

    def test_more_insulation_reduces_u_value(self, brick_wall, insulated_wall):
        u_bare = compute_u_value(brick_wall)
        u_ins = compute_u_value(insulated_wall)
        assert u_ins < u_bare

    def test_more_insulation_reduces_heat_loss(self, brick_wall, insulated_wall):
        q_bare = heat_flux_through_assembly(20, -10, brick_wall, 10.0)
        q_ins = heat_flux_through_assembly(20, -10, insulated_wall, 10.0)
        assert q_ins < q_bare

    def test_heat_flux_direction(self, brick_wall):
        q = steady_state_heat_flux(20, -10, 2.0, 10.0)
        assert q > 0

    def test_interface_temps_monotonic(self, brick_wall):
        temps = interface_temperatures(20, -10, brick_wall)
        for i in range(len(temps) - 1):
            assert temps[i] >= temps[i+1]

    def test_thermal_capacity_positive(self, brick_wall):
        c = thermal_capacity_per_area(brick_wall)
        assert c > 0


# ── Convection Tests ─────────────────────────────────────────────────────

class TestConvection:
    def test_interior_coefficient_positive(self):
        h = interior_convection_coefficient(25, 20)
        assert h > 0

    def test_exterior_coefficient_increases_with_wind(self):
        h_calm = exterior_convection_coefficient(0.5)
        h_windy = exterior_convection_coefficient(5.0)
        assert h_windy > h_calm

    def test_wind_speed_decreases_with_lower_height(self):
        v_3m = wind_speed_at_height(5.0, 10.0, 3.0)
        assert v_3m < 5.0


# ── Radiation Tests ──────────────────────────────────────────────────────

class TestRadiation:
    def test_sky_temp_below_air_temp(self):
        assert sky_temperature(20, 50) < 20

    def test_longwave_loss_positive_when_surface_warmer(self):
        assert longwave_radiation_flux(30, -10) > 0

    def test_solar_absorption_proportional(self):
        assert solar_absorption(500, 0.9, 10) > solar_absorption(500, 0.5, 10)


# ── Solar Tests ──────────────────────────────────────────────────────────

class TestSolar:
    def test_declination_range(self):
        for d in range(1, 366):
            assert -23.5 <= solar_declination(d) <= 23.5

    def test_no_solar_at_night(self):
        assert incident_solar_on_surface(0, -10, 0, 90, 180) == 0.0


# ── Ventilation Tests ────────────────────────────────────────────────────

class TestVentilation:
    def test_heat_loss_positive_when_inside_warmer(self):
        assert ventilation_heat_transfer(20, 0, 0.5, 72) > 0

    def test_more_ach_more_loss(self):
        q1 = total_ventilation_heat_loss(20, 0, 0.3, 0.2, 72)
        q2 = total_ventilation_heat_loss(20, 0, 0.8, 0.2, 72)
        assert q2 > q1


# ── Comfort Tests ────────────────────────────────────────────────────────

class TestComfort:
    def test_cold_pmv_negative(self):
        assert pmv(10, 10, 0.1, 50, 1.0, 1.0) < 0

    def test_hot_pmv_positive(self):
        assert pmv(35, 35, 0.1, 50, 1.0, 0.5) > 0

    def test_ppd_minimum_5(self):
        assert ppd(0.0) >= 5.0

    def test_ppd_increases_away_from_neutral(self):
        assert ppd(2.0) > ppd(0.5)


# ── Simulation Tests ─────────────────────────────────────────────────────

class TestSimulation:
    def test_simulation_runs(self, leh_winter_config):
        result = run_simulation(leh_winter_config)
        assert result.simulation_hours == 72
        assert len(result.indoor_temp_c) == 72

    def test_indoor_temps_reasonable(self, leh_winter_config):
        result = run_simulation(leh_winter_config)
        for t in result.indoor_temp_c:
            assert -30 < t < 50

    def test_heating_energy_positive_in_cold(self, leh_winter_config):
        result = run_simulation(leh_winter_config)
        assert result.heat_balance.heating_energy_kwh > 0

    def test_comfort_metrics_present(self, leh_winter_config):
        result = run_simulation(leh_winter_config)
        assert result.comfort.total_hours == 72
        assert 0 <= result.comfort.comfort_percentage <= 100

    def test_more_insulation_less_heating(self):
        n = 24
        ts = [f"2024-01-15T{h:02d}:00:00" for h in range(n)]
        geo = ShelterGeometry(length=6, width=4, height=3, orientation_deg=180, elevation_m=0)
        clim = ClimateTimeseries(
            timestamps=ts, temperature_c=[-10.0]*n,
            relative_humidity=[30.0]*n, wind_speed_ms=[2.0]*n, solar_ghi=[0.0]*n
        )

        def cfg(ins):
            w = WallAssembly(name="T", layers=[
                MaterialLayer(name="C", thickness_m=0.2, conductivity=1.4, density=2300, specific_heat=880),
                MaterialLayer(name="I", thickness_m=ins, conductivity=0.035, density=25, specific_heat=1400),
            ])
            r = WallAssembly(name="R", layers=[
                MaterialLayer(name="C", thickness_m=0.15, conductivity=1.4, density=2300, specific_heat=880),
                MaterialLayer(name="I", thickness_m=ins, conductivity=0.035, density=25, specific_heat=1400),
            ])
            f = WallAssembly(name="F", layers=[
                MaterialLayer(name="C", thickness_m=0.15, conductivity=1.4, density=2300, specific_heat=880),
            ])
            return SimulationConfig(
                geometry=geo, envelope=Envelope(walls=w, roof=r, floor=f),
                climate=clim, hvac_mode=HVACMode.HEATED, target_temp_c=18.0,
                ach_natural=0.3, ach_infiltration=0.2,
            )

        thin = run_simulation(cfg(0.05))
        thick = run_simulation(cfg(0.15))
        assert thick.heat_balance.heating_energy_kwh < thin.heat_balance.heating_energy_kwh
