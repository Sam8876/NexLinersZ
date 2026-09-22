"""
Unit tests for FogSafe IVCAS - CARLA Traffic Integration
"""

import unittest
from unittest.mock import MagicMock
from fogsafe_ivcas.simulation.carla_traffic import CarlaTrafficManager


class TestCarlaTrafficManager(unittest.TestCase):
    def setUp(self):
        self.mock_client = MagicMock()
        self.mock_world = MagicMock()
        self.mock_tm = MagicMock()
        self.mock_client.get_trafficmanager.return_value = self.mock_tm

    def test_traffic_manager_init(self):
        mgr = CarlaTrafficManager(
            client=self.mock_client,
            world=self.mock_world,
            tm_port=8000,
            synchronous_mode=True,
        )
        self.assertEqual(mgr.tm_port, 8000)
        self.assertTrue(mgr.synchronous_mode)
        self.mock_tm.set_synchronous_mode.assert_called_with(True)

    def test_traffic_cleanup_empty(self):
        mgr = CarlaTrafficManager(
            client=self.mock_client,
            world=self.mock_world,
            tm_port=8000,
            synchronous_mode=True,
        )
        # Cleanup when empty should not raise errors
        mgr.cleanup()
        self.assertEqual(len(mgr.vehicles_list), 0)


if __name__ == "__main__":
    unittest.main()
