
import math

def calculate_geometry(length: float, width: float, height: float, roof_pitch: float):
    """
    Calculates the geometry of a gable-roof shelter.
    """
    if length <= 0 or width <= 0 or height <= 0 or roof_pitch < 0:
        raise ValueError("Dimensions must be positive")

    floor_area = length * width
    wall_area = 2 * (length * height) + 2 * (width * height)

    # Roof calculations
    half_width = width / 2
    roof_pitch_rad = math.radians(roof_pitch)
    
    if math.cos(roof_pitch_rad) == 0:
        raise ValueError("Roof pitch cannot be 90 degrees")

    roof_slope_length = half_width / math.cos(roof_pitch_rad)
    roof_area = 2 * length * roof_slope_length
    
    roof_rise = half_width * math.tan(roof_pitch_rad)
    total_height = height + roof_rise

    # Volume calculation
    rectangular_volume = floor_area * height
    triangular_roof_volume = 0.5 * width * roof_rise * length
    total_volume = rectangular_volume + triangular_roof_volume
    
    envelope_area = wall_area + roof_area

    return {
        "floor_area": floor_area,
        "wall_area": wall_area,
        "roof_area": roof_area,
        "envelope_area": envelope_area,
        "roof_slope": roof_slope_length,
        "roof_rise": roof_rise,
        "total_height": total_height,
        "volume": total_volume,
    }