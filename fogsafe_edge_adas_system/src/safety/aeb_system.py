"""
FogSafe IVCAS - Autonomous Emergency Braking (AEB) & FCW Controller
Engineered for heavy dumper trucks with multi-stage braking and fog-adaptive speed governance.
"""

from typing import Dict, Any, Optional
import numpy as np

from .dumper_dynamics import HeavyDumperDynamics


class AutonomousEmergencyBrakingSystem:
    """
    AEB Level-2 safety system tailored for Big Dumper vehicles.
    
    States:
      - SAFE (0)
      - FCW (1): Forward Collision Warning
      - STAGE 1 (2): Pre-braking / air chamber pre-fill
      - STAGE 2 (3): Full Emergency Braking (AEB Override)
    """

    def __init__(
        self,
        dynamics: HeavyDumperDynamics,
        ttc_fcw_threshold: float = 2.8,
        ttc_prebrake_threshold: float = 1.8,
        ttc_emergency_threshold: float = 1.1,
        standstill_cushion_m: float = 3.5,
    ):
        self.dynamics = dynamics
        self.ttc_fcw = float(ttc_fcw_threshold)
        self.ttc_prebrake = float(ttc_prebrake_threshold)
        self.ttc_emergency = float(ttc_emergency_threshold)
        self.s0 = float(standstill_cushion_m)

        # Latch for emergency braking to prevent oscillation
        self._aeb_latched: bool = False
        self._aeb_hold_counter: int = 0

    def evaluate(
        self,
        ego_speed_ms: float,
        cipo_data: Dict[str, Any],
        visibility_m: float,
    ) -> Dict[str, Any]:
        """
        Evaluate collision hazard and compute braking actuation.

        Args:
            ego_speed_ms: Current vehicle speed in m/s.
            cipo_data: Closest In-Path Object dictionary from detector.
            visibility_m: Current meteorological visibility in meters.

        Returns:
            Dictionary with:
                - aeb_active: bool
                - fcw_active: bool
                - prebrake_active: bool
                - brake_demand: float [0.0, 1.0]
                - target_decel_ms2: float
                - fog_overspeed: bool
                - safe_max_speed_kmh: float
                - alert_message: str
        """
        ego_speed = max(0.0, float(ego_speed_ms))
        ego_speed_kmh = ego_speed * 3.6

        # Calculate safe speed ceiling for current visibility
        safe_speed_ms = self.dynamics.calculate_fog_safe_speed(visibility_m)
        safe_speed_kmh = safe_speed_ms * 3.6
        fog_overspeed = (visibility_m <= 6.0) and (ego_speed > (safe_speed_ms + 1.0))

        has_cipo = cipo_data.get("valid", False)
        dist_cipo = cipo_data.get("distance_m", 999.0)
        ttc = cipo_data.get("ttc_s", 999.0)
        rel_vel = cipo_data.get("rel_velocity_ms", 0.0)

        # Calculate required stopping distance at current speed
        emergency_stopping_dist = self.dynamics.calculate_stopping_distance(
            ego_speed, is_emergency=True
        )
        service_stopping_dist = self.dynamics.calculate_stopping_distance(
            ego_speed, is_emergency=False
        )

        # Safety-buffered threshold distances for 85t heavy commercial vehicle
        d_emerg_crit = max(emergency_stopping_dist * 1.30, self.dynamics.s0 + 2.5)
        d_service_warn = max(service_stopping_dist * 1.35, d_emerg_crit + 5.0)
        d_fcw_alert = max(d_service_warn * 1.30, 25.0)

        # Effective closing speed and TTC calculation
        v_close = max(ego_speed, ego_speed - rel_vel, -rel_vel, 0.0)
        ttc_eff = (dist_cipo / v_close) if v_close > 0.3 else 999.0
        ttc_min = min(ttc, ttc_eff)

        fcw_active = False
        prebrake_active = False
        aeb_active = False
        hand_brake = False
        brake_demand = 0.0
        target_decel = 0.0
        alert_msg = "CLEAR"

        # Check AEB trigger conditions if in-path object is present
        if has_cipo and (dist_cipo < 60.0):
            # Stage 2: Full Emergency Braking (AEB Override)
            # Triggered if TTC is critical or within emergency stopping buffer
            if (ttc_min <= self.ttc_emergency) or (dist_cipo <= d_emerg_crit) or (dist_cipo <= self.dynamics.s0 + 2.0):
                aeb_active = True
                self._aeb_latched = True
                self._aeb_hold_counter = 30  # Hold for at least 1.5 seconds (at 20Hz)
                brake_demand = 1.0
                hand_brake = (dist_cipo <= self.dynamics.s0 + 1.0)
                target_decel = self.dynamics.a_emergency
                alert_msg = "EMERGENCY BRAKING"

            # Stage 1: Active Pre-braking (Decisive progressive deceleration: 0.60 to 0.85)
            elif (ttc_min <= self.ttc_prebrake) or (dist_cipo <= d_service_warn):
                prebrake_active = True
                fcw_active = True
                frac = np.clip((d_service_warn - dist_cipo) / max(d_service_warn - d_emerg_crit, 1.0), 0.0, 1.0)
                brake_demand = float(0.60 + 0.25 * frac)
                target_decel = self.dynamics.a_service
                alert_msg = "PRE-BRAKE ENGAGED"

            # Forward Collision Warning (FCW): Prompt early deceleration + cut throttle
            elif (ttc_min <= self.ttc_fcw) or (dist_cipo <= d_fcw_alert):
                fcw_active = True
                brake_demand = 0.35  # Active deceleration to shed kinetic energy
                target_decel = 1.5
                alert_msg = "COLLISION ALERT"

        # Handle AEB latch to bring truck to full controlled stop
        if self._aeb_latched:
            if ego_speed > 0.1 and self._aeb_hold_counter > 0:
                aeb_active = True
                brake_demand = 1.0
                target_decel = self.dynamics.a_emergency
                alert_msg = "EMERGENCY BRAKING"
                self._aeb_hold_counter -= 1
            elif has_cipo and dist_cipo <= (self.dynamics.s0 + 2.5):
                # Hold brake at standstill behind obstacle
                brake_demand = 0.85
                alert_msg = "STANDSTILL HOLD"
            else:
                self._aeb_latched = False

        # If fog overspeed warning is active and no collision braking
        if fog_overspeed and not aeb_active and not prebrake_active and not fcw_active:
            brake_demand = 0.25
            target_decel = 1.0
            alert_msg = f"DENSE FOG: REDUCE SPEED (<{int(safe_speed_kmh)} km/h)"

        return {
            "aeb_active": aeb_active,
            "fcw_active": fcw_active,
            "prebrake_active": prebrake_active,
            "hand_brake": hand_brake,
            "brake_demand": float(brake_demand),
            "target_decel_ms2": float(target_decel),
            "fog_overspeed": fog_overspeed,
            "safe_max_speed_kmh": float(np.round(safe_speed_kmh, 1)),
            "stopping_distance_m": float(np.round(emergency_stopping_dist, 1)),
            "alert_message": alert_msg,
        }
