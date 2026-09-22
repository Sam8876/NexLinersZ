"""
FogSafe IVCAS - CARLA Simulation Subsystem
Closed-loop simulation of heavy dumper trucks under extreme fog (3-5m) and low light.
"""

from .carla_weather import CarlaFogWeatherManager
from .carla_vehicle import CarlaDumperVehicle
from .carla_traffic import CarlaTrafficManager

__all__ = ["CarlaFogWeatherManager", "CarlaDumperVehicle", "CarlaTrafficManager"]
