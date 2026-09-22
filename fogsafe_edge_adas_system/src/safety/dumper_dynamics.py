"""
FogSafe IVCAS - Heavy Dumper Vehicle Dynamics
Calculates realistic stopping envelopes, air brake latencies, and fog-safe speed ceilings.
"""

from typing import Tuple
import numpy as np


class HeavyDumperDynamics:
    """
    Physical dynamics and braking characteristics for heavy dumper and mining haul trucks.
    """

    def __init__(
        self,
        gross_mass_kg: float = 65000.0,
        pneumatic_lag_s: float = 0.45,
        driver_reaction_s: float = 0.65,
        max_emergency_decel_ms2: float = 4.2,
        service_decel_ms2: float = 2.0,
        standstill_cushion_m: float = 3.5,
    ):
        self.mass = float(gross_mass_kg)
        self.pneumatic_lag = float(pneumatic_lag_s)
        self.reaction_time = float(driver_reaction_s)
        self.a_emergency = float(max_emergency_decel_ms2)
        self.a_service = float(service_decel_ms2)
        self.s0 = float(standstill_cushion_m)

    def calculate_stopping_distance(
        self, ego_velocity_ms: float, is_emergency: bool = True
    ) -> float:
        """
        Calculate total stopping distance in meters for the heavy truck:
            d_stopping = v * (t_react + t_lag) + (v^2) / (2 * a) + s0
        """
        v = max(0.0, float(ego_velocity_ms))
        if v < 0.1:
            return self.s0

        decel = self.a_emergency if is_emergency else self.a_service
        lag_time = self.pneumatic_lag + (self.reaction_time if not is_emergency else self.pneumatic_lag * 0.5)

        # Distance covered during brake pressure buildup
        d_reaction = v * lag_time
        # Distance covered during deceleration
        d_braking = (v ** 2) / (2.0 * decel)

        return float(d_reaction + d_braking + self.s0)

    def calculate_fog_safe_speed(
        self, visibility_distance_m: float
    ) -> float:
        """
        Calculate maximum allowable safe driving speed (in m/s and km/h) such that
        the truck can come to a full stop within the available visibility horizon.

        Available stopping distance: d_avail = max(0.0, visibility_m - s0)
        Using: v * t_lag + v^2 / (2 * a) <= d_avail
        Solving quadratic for v:
            v_safe = -a*t_lag + sqrt( (a*t_lag)^2 + 2 * a * d_avail )
        """
        d_avail = max(0.5, float(visibility_distance_m) - self.s0)
        a = self.a_emergency
        t_lag = self.pneumatic_lag

        # Quadratic solution
        b_term = a * t_lag
        v_safe_ms = -b_term + np.sqrt(b_term ** 2 + 2.0 * a * d_avail)
        return float(np.clip(v_safe_ms, 1.5, 15.0))  # Capped between ~5 km/h and 54 km/h
