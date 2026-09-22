"""
FogSafe IVCAS - CARLA Foggy & Low-Light Weather Manager
Interfaces with CARLA weather API to create extreme 3-5m visibility fog and low light conditions.
Based on CARLA's dynamic weather model in examples/foggy_weather.py.
"""

from typing import Optional
import carla


class CarlaFogWeatherManager:
    """
    Controls atmospheric scattering, dense fog (3-5m), and low-light / night conditions in CARLA.
    """

    def __init__(
        self,
        world: carla.World,
        fog_distance_m: float = 4.0,
        fog_density: float = 85.0,
        fog_falloff: float = 1.0,
        sun_altitude: float = 45.0,
        sun_azimuth: float = 180.0,
        cloudiness: float = 90.0,
        precipitation: float = 30.0,
        wetness: float = 75.0,
    ):
        self.world = world
        self.fog_distance = float(fog_distance_m)
        self.fog_density = float(fog_density)
        self.fog_falloff = float(fog_falloff)
        self.sun_altitude = float(sun_altitude)
        self.sun_azimuth = float(sun_azimuth)
        self.cloudiness = float(cloudiness)
        self.precipitation = float(precipitation)
        self.wetness = float(wetness)

    def apply(self):
        """
        Apply extreme fog and low-light parameters to the CARLA world.
        """
        weather = self.world.get_weather()

        # Low-light / Night Sun settings
        weather.sun_altitude_angle = self.sun_altitude
        weather.sun_azimuth_angle = self.sun_azimuth

        # Extreme Dense Fog settings (3-5 meters)
        weather.fog_density = self.fog_density
        weather.fog_distance = self.fog_distance
        weather.fog_falloff = self.fog_falloff

        # Atmospheric conditions
        weather.cloudiness = self.cloudiness
        weather.precipitation = self.precipitation
        weather.precipitation_deposits = 50.0  # Puddles
        weather.wetness = self.wetness
        weather.wind_intensity = 15.0

        # Enable scattering parameters if supported
        if hasattr(weather, "scattering_intensity"):
            weather.scattering_intensity = 2.0
        if hasattr(weather, "mie_scattering_scale"):
            weather.mie_scattering_scale = 0.08

        self.world.set_weather(weather)
        print(
            f"[CarlaFogWeatherManager] Weather Applied: Fog Density={self.fog_density}% | "
            f"Fog Distance={self.fog_distance}m | Sun Altitude={self.sun_altitude}°"
        )

    def update_fog_distance(self, distance_m: float):
        """Dynamically adjust fog distance (e.g. for testing varying fog levels)."""
        weather = self.world.get_weather()
        weather.fog_distance = max(1.0, float(distance_m))
        self.world.set_weather(weather)
        self.fog_distance = weather.fog_distance
