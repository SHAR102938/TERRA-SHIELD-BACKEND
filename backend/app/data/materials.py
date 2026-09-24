
materials = [
    {
        "id": 1,
        "name": "Insulated Fabric",
        "thermal_conductivity": 0.04,  # W/mK
        "density": 30,  # kg/m^3
        "specific_heat": 1200,  # J/kgK
        "solar_absorptivity": 0.6,
        "emissivity": 0.9,
        "cost_per_m2": 25,
        "weight_per_m2": 2,
        "thickness": 0.15 #meters
    },
    {
        "id": 2,
        "name": "PU Foam",
        "thermal_conductivity": 0.025,
        "density": 40,
        "specific_heat": 1500,
        "solar_absorptivity": 0.7,
        "emissivity": 0.9,
        "cost_per_m2": 20,
        "weight_per_m2": 4,
        "thickness": 0.1 #meters
    },
    {
        "id": 3,
        "name": "Rock Wool",
        "thermal_conductivity": 0.038,
        "density": 100,
        "specific_heat": 840,
        "solar_absorptivity": 0.5,
        "emissivity": 0.85,
        "cost_per_m2": 15,
        "weight_per_m2": 10,
        "thickness": 0.1 #meters
    },
    {
        "id": 4,
        "name": "Fiberglass",
        "thermal_conductivity": 0.04,
        "density": 12,
        "specific_heat": 840,
        "solar_absorptivity": 0.4,
        "emissivity": 0.8,
        "cost_per_m2": 10,
        "weight_per_m2": 1.2,
        "thickness": 0.1 #meters
    },
    {
        "id": 5,
        "name": "Aluminium",
        "thermal_conductivity": 205,
        "density": 2700,
        "specific_heat": 900,
        "solar_absorptivity": 0.2,
        "emissivity": 0.1,
        "cost_per_m2": 50,
        "weight_per_m2": 5.4,
        "thickness": 0.002 #meters
    },
    {
        "id": 6,
        "name": "Concrete",
        "thermal_conductivity": 1.4,
        "density": 2400,
        "specific_heat": 880,
        "solar_absorptivity": 0.65,
        "emissivity": 0.9,
        "cost_per_m2": 40,
        "weight_per_m2": 240,
        "thickness": 0.1 #meters
    }
]

def get_all_materials():
    return materials

def get_material_by_id(material_id: int):
    for material in materials:
        if material["id"] == material_id:
            return material
    return None