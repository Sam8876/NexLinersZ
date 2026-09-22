"""
FogSafe IVCAS - Lane Departure Warning (LDW) System
Tightened lateral tolerances and Time-To-Lane-Crossing (TLC) calculations for heavy dumper trucks.
"""

from typing import Dict, Any
import numpy as np


class LaneDepartureWarningSystem:
    """
    LDW system specifically tuned for wide-track heavy dumper vehicles.
    
    Since a 3.8m dumper has only ~0.5m lateral clearance inside a 4.8m haul lane,
    the departure threshold is tightened to |CTE| > 0.35m to prevent ditch rollovers.
    """

    def __init__(
        self,
        truck_width_m: float = 3.8,
        lane_width_m: float = 4.8,
        cte_warning_threshold_m: float = 0.35,
        cte_critical_threshold_m: float = 0.60,
        tlc_warning_threshold_s: float = 1.2,
        min_speed_kmh: float = 8.0,
    ):
        self.truck_w = float(truck_width_m)
        self.lane_w = float(lane_width_m)
        self.cte_warn = float(cte_warning_threshold_m)
        self.cte_crit = float(cte_critical_threshold_m)
        self.tlc_warn = float(tlc_warning_threshold_s)
        self.min_speed = float(min_speed_kmh)

        # Flashing state for HUD visual alert
        self._flash_counter: int = 0

    def evaluate(
        self,
        cte_m: float,
        yaw_err_rad: float,
        ego_speed_ms: float,
        lane_valid: bool = True,
    ) -> Dict[str, Any]:
        """
        Evaluate lateral lane departure risk.

        Args:
            cte_m: Cross-Track Error in meters (+ right, - left of center).
            yaw_err_rad: Heading error relative to road centerline.
            ego_speed_ms: Vehicle forward speed in m/s.
            lane_valid: Boolean indicating whether lane was detected.

        Returns:
            Dictionary with:
                - lldw_active: bool (Left Lane Departure Warning)
                - rldw_active: bool (Right Lane Departure Warning)
                - ldw_critical: bool
                - tlc_s: float (Time-To-Lane Crossing)
                - cte_m: float
                - alert_side: str ("NONE", "LEFT", "RIGHT")
                - flash_state: bool (for blinking UI indicators)
        """
        ego_speed_kmh = max(0.0, float(ego_speed_ms)) * 3.6
        self._flash_counter = (self._flash_counter + 1) % 10
        flash_state = self._flash_counter < 6

        if not lane_valid or (ego_speed_kmh < self.min_speed):
            return {
                "lldw_active": False,
                "rldw_active": False,
                "ldw_critical": False,
                "tlc_s": 999.0,
                "cte_m": float(cte_m),
                "alert_side": "NONE",
                "flash_state": False,
            }

        # Available lateral clearance to lane boundary on each side:
        # Lane boundary is at ± (lane_w / 2), truck tire edge is at (cte ± truck_w / 2)
        half_clearance = (self.lane_w - self.truck_w) * 0.5  # ~0.5 meters
        dist_left_m = half_clearance + cte_m   # CTE < 0 closes left gap
        dist_right_m = half_clearance - cte_m  # CTE > 0 closes right gap

        # Lateral drift velocity: v_lat = v_ego * sin(yaw_err)
        v_lat = float(ego_speed_ms * np.sin(yaw_err_rad))

        # Time-To-Lane Crossing (TLC)
        tlc_left = dist_left_m / (-v_lat) if v_lat < -0.1 else 999.0
        tlc_right = dist_right_m / v_lat if v_lat > 0.1 else 999.0
        min_tlc = float(min(tlc_left, tlc_right))

        lldw_active = False
        rldw_active = False
        is_critical = False
        alert_side = "NONE"

        # Left departure: CTE is negative (drifting left towards shoulder/ditch)
        if (cte_m < -self.cte_warn) or (0.0 < tlc_left < self.tlc_warn):
            lldw_active = True
            alert_side = "LEFT"
            if cte_m < -self.cte_crit:
                is_critical = True

        # Right departure: CTE is positive (drifting right towards opposite lane/shoulder)
        elif (cte_m > self.cte_warn) or (0.0 < tlc_right < self.tlc_warn):
            rldw_active = True
            alert_side = "RIGHT"
            if cte_m > self.cte_crit:
                is_critical = True

        return {
            "lldw_active": lldw_active,
            "rldw_active": rldw_active,
            "ldw_critical": is_critical,
            "tlc_s": float(np.round(min_tlc, 2)),
            "cte_m": float(np.round(cte_m, 2)),
            "alert_side": alert_side,
            "flash_state": flash_state,
        }
