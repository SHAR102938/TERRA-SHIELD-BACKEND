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
    
    # Synthetic Leh winter climate: -15 to -5°C, low humidity, moderate solar
    import math
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
        Opening(name="South Window", width_m=1.2, height_m=1.0, wall_face="south",
                u_value=2.8, shgc=0.65, count=2),
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
        elevation_m=3500.0,
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
        assert u_ins < u_bare, "Adding insulation must reduce U-value"

    def test_more_insulation_reduces_heat_loss(self, brick_wall, insulated_wall):
        q_bare = heat_flux_through_assembly(20, -10, brick_wall, 10.0)
        q_ins = heat_flux_through_assembly(20, -10, insulated_wall, 10.0)
        assert q_ins < q_bare, "More insulation must strictly reduce steady-state heat loss"

    def test_heat_flux_direction(self, brick_wall):
        q = steady_state_heat_flux(20, -10, 2.0, 10.0)
        assert q > 0, "Heat should flow from warm (inside) to cold (outside)"

    def test_heat_flux_reversed(self, brick_wall):
        q = steady_state_heat_flux(-10, 20, 2.0, 10.0)
        assert q < 0, "Heat should flow from warm (outside) to cold (inside)"

    def test_interface_temps_monotonic(self, brick_wall):
        temps = interface_temperatures(20, -10, brick_wall)
        for i in range(len(temps) - 1):
            assert temps[i] >= temps[i+1], "Temperatures should decrease from inside to outside"

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
        v_10m = 5.0
        v_3m = wind_speed_at_height(v_10m, 10.0, 3.0)
        assert v_3m < v_10m


# ── Radiation Tests ──────────────────────────────────────────────────────

class TestRadiation:
    def test_sky_temp_below_air_temp(self):
        t_sky = sky_temperature(20, 50)
        assert t_sky < 20, "Sky temperature should be below air temperature"

    def test_longwave_loss_positive_when_surface_warmer(self):
        q = longwave_radiation_flux(30, -10)
        assert q > 0, "Surface warmer than sky should lose heat"

    def test_solar_absorption_proportional(self):
        q1 = solar_absorption(500, 0.5, 10)
        q2 = solar_absorption(500, 0.9, 10)
        assert q2 > q1, "Higher absorptivity should give more heat gain"


# ── Solar Tests ──────────────────────────────────────────────────────────

class TestSolar:
    def test_declination_range(self):
        for d in range(1, 366):
            dec = solar_declination(d)
            assert -23.5 <= dec <= 23.5

    def test_summer_solstice_positive_declination(self):
        dec = solar_declination(172)  # ~June 21
        assert dec > 20

    def test_no_solar_at_night(self):
        i = incident_solar_on_surface(0, -10, 0, 90, 180)
        assert i == 0.0

    def test_solar_on_vertical_south(self):
        i = incident_solar_on_surface(500, 45, 180, 90, 180)
        assert i > 0


# ── Ventilation Tests ────────────────────────────────────────────────────

class TestVentilation:
    def test_heat_loss_positive_when_inside_warmer(self):
        q = ventilation_heat_transfer(20, 0, 0.5, 72)
        assert q > 0

    def test_more_ach_more_loss(self):
        q1 = total_ventilation_heat_loss(20, 0, 0.3, 0.2, 72)
        q2 = total_ventilation_heat_loss(20, 0, 0.8, 0.2, 72)
        assert q2 > q1


# ── Comfort Tests ────────────────────────────────────────────────────────

class TestComfort:
    def test_neutral_pmv_near_zero(self):
        p = pmv(22, 22, 0.1, 50, 1.2, 1.0)
        assert abs(p) < 1.5, f"PMV at comfortable conditions should be near zero, got {p}"

    def test_cold_pmv_negative(self):
        p = pmv(10, 10, 0.1, 50, 1.0, 1.0)
        assert p < 0, "Cold conditions should give negative PMV"

    def test_hot_pmv_positive(self):
        p = pmv(35, 35, 0.1, 50, 1.0, 0.5)
        assert p > 0, "Hot conditions should give positive PMV"

    def test_ppd_minimum_5_percent(self):
        assert ppd(0.0) >= 5.0

    def test_ppd_increases_away_from_neutral(self):
        assert ppd(2.0) > ppd(0.5)

    def test_operative_temp_average(self):
        t_op = operative_temperature(22, 24, 0.1)
        assert abs(t_op - 23.0) < 0.1


# ── RC Network / Simulation Tests ────────────────────────────────────────

class TestSimulation:
    def test_simulation_runs(self, leh_winter_config):
        result = run_simulation(leh_winter_config)
        assert result.simulation_hours == 72
        assert len(result.indoor_temp_c) == 72
        assert len(result.outdoor_temp_c) == 72

    def test_indoor_temps_reasonable(self, leh_winter_config):
        result = run_simulation(leh_winter_config)
        for t in result.indoor_temp_c:
            assert -30 < t < 50, f"Indoor temp {t}°C is unreasonable"

    def test_heating_energy_positive_in_cold(self, leh_winter_config):
        result = run_simulation(leh_winter_config)
        assert result.heat_balance.heating_energy_kwh > 0, "Leh winter should need heating"

    def test_comfort_metrics_present(self, leh_winter_config):
        result = run_simulation(leh_winter_config)
        assert result.comfort.total_hours == 72
        assert 0 <= result.comfort.comfort_percentage <= 100

    def test_more_insulation_less_heating(self):
        """More insulation must reduce heating energy — the key physical invariant."""
        n_hours = 24
        timestamps = [f"2024-01-15T{h:02d}:00:00" for h in range(n_hours)]
        temps = [-10.0] * n_hours
        rh = [30.0] * n_hours
        wind = [2.0] * n_hours
        ghi = [0.0] * n_hours  # Night only — no solar confusion

        geo = ShelterGeometry(length=6, width=4, height=3, orientation_deg=180, elevation_m=0)

        def make_config(ins_thickness):
            walls = WallAssembly(name="Test", layers=[
                MaterialLayer(name="Concrete", thickness_m=0.200, conductivity=1.4, density=2300, specific_heat=880),
                MaterialLayer(name="Insulation", thickness_m=ins_thickness, conductivity=0.035, density=25, specific_heat=1400),
            ])
            roof = WallAssembly(name="Roof", layers=[
                MaterialLayer(name="Concrete", thickness_m=0.150, conductivity=1.4, density=2300, specific_heat=880),
                MaterialLayer(name="Insulation", thickness_m=ins_thickness, conductivity=0.035, density=25, specific_heat=1400),
            ])
            floor = WallAssembly(name="Floor", layers=[
                MaterialLayer(name="Concrete", thickness_m=0.150, conductivity=1.4, density=2300, specific_heat=880),
            ])
            return SimulationConfig(
                geometry=geo,
                envelope=Envelope(walls=walls, roof=roof, floor=floor),
                climate=ClimateTimeseries(
                    timestamps=timestamps, temperature_c=temps,
                    relative_humidity=rh, wind_speed_ms=wind, solar_ghi=ghi
                ),
                hvac_mode=HVACMode.HEATED, target_temp_c=18.0,
                ach_natural=0.3, ach_infiltration=0.2,
            )

        thin = run_simulation(make_config(0.05))
        thick = run_simulation(make_config(0.15))
        assert thick.heat_balance.heating_energy_kwh < thin.heat_balance.heating_energy_kwh, \
            "More insulation must reduce heating energy"
