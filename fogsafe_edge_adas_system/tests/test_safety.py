"""
Unit tests for FogSafe IVCAS Safety Guardian (Dumper Dynamics, AEB, LDW).
"""

import unittest
import numpy as np

from fogsafe_ivcas.src.safety.dumper_dynamics import HeavyDumperDynamics
from fogsafe_ivcas.src.safety.aeb_system import AutonomousEmergencyBrakingSystem
from fogsafe_ivcas.src.safety.ldw_system import LaneDepartureWarningSystem


class TestSafety(unittest.TestCase):

    def setUp(self):
        self.dynamics = HeavyDumperDynamics(
            gross_mass_kg=65000.0,
            pneumatic_lag_s=0.45,
            max_emergency_decel_ms2=4.2,
            service_decel_ms2=2.0,
            standstill_cushion_m=3.5,
        )
        self.aeb = AutonomousEmergencyBrakingSystem(
            dynamics=self.dynamics,
            ttc_fcw_threshold=2.8,
            ttc_prebrake_threshold=1.8,
            ttc_emergency_threshold=1.1,
            standstill_cushion_m=3.5,
        )
        self.ldw = LaneDepartureWarningSystem(
            truck_width_m=3.8,
            lane_width_m=4.8,
            cte_warning_threshold_m=0.35,
            cte_critical_threshold_m=0.60,
        )

    def test_stopping_distance_calculation(self):
        # At 0 m/s, stopping distance is standstill cushion s0
        d_0 = self.dynamics.calculate_stopping_distance(0.0)
        self.assertAlmostEqual(d_0, 3.5, places=1)

        # At 30 km/h (~8.33 m/s)
        # d = 8.33 * 0.45*0.5 + 8.33^2 / (2 * 4.2) + 3.5 = ~13.6m
        d_30 = self.dynamics.calculate_stopping_distance(8.33, is_emergency=True)
        self.assertGreater(d_30, 10.0)
        self.assertLess(d_30, 20.0)

    def test_fog_safe_speed(self):
        # In 4m visibility with 3.5m cushion, available distance is tiny (0.5m)
        v_safe = self.dynamics.calculate_fog_safe_speed(4.0)
        self.assertLessEqual(v_safe * 3.6, 20.0)  # Safe speed should be low (< 20 km/h)

    def test_aeb_hazard_levels(self):
        # Scenario 1: Safe clear road
        cipo_safe = {"valid": False}
        res_safe = self.aeb.evaluate(ego_speed_ms=8.0, cipo_data=cipo_safe, visibility_m=30.0)
        self.assertFalse(res_safe["aeb_active"])
        self.assertFalse(res_safe["fcw_active"])
        self.assertEqual(res_safe["brake_demand"], 0.0)

        # Scenario 2: Imminent collision at 4m distance, closing fast
        cipo_imminent = {
            "valid": True,
            "distance_m": 4.5,
            "ttc_s": 0.9,
            "rel_velocity_ms": -5.0,
        }
        res_aeb = self.aeb.evaluate(ego_speed_ms=8.0, cipo_data=cipo_imminent, visibility_m=4.0)
        self.assertTrue(res_aeb["aeb_active"])
        self.assertEqual(res_aeb["brake_demand"], 1.0)
        self.assertEqual(res_aeb["alert_message"], "EMERGENCY BRAKING")

    def test_ldw_lateral_departure(self):
        # Centered: CTE = 0.0 -> No departure warning
        res_center = self.ldw.evaluate(cte_m=0.0, yaw_err_rad=0.0, ego_speed_ms=6.0)
        self.assertFalse(res_center["lldw_active"])
        self.assertFalse(res_center["rldw_active"])

        # Left drift: CTE = -0.45m (> 0.35m threshold) -> LLDW
        res_left = self.ldw.evaluate(cte_m=-0.45, yaw_err_rad=-0.05, ego_speed_ms=6.0)
        self.assertTrue(res_left["lldw_active"])
        self.assertFalse(res_left["rldw_active"])
        self.assertEqual(res_left["alert_side"], "LEFT")

        # Right drift: CTE = +0.50m -> RLDW
        res_right = self.ldw.evaluate(cte_m=0.50, yaw_err_rad=0.05, ego_speed_ms=6.0)
        self.assertFalse(res_right["lldw_active"])
        self.assertTrue(res_right["rldw_active"])
        self.assertEqual(res_right["alert_side"], "RIGHT")


if __name__ == "__main__":
    unittest.main()
