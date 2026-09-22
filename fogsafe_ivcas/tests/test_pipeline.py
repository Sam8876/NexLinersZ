"""
End-to-end integration test for FogSafeAdasPipeline.
"""

import unittest
import os
import numpy as np

from fogsafe_ivcas.src.pipeline import FogSafeAdasPipeline


class TestPipeline(unittest.TestCase):

    def test_pipeline_execution(self):
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        config_dir = os.path.join(project_root, "config")
        assets_dir = os.path.join(project_root, "assets", "icons")

        pipeline = FogSafeAdasPipeline(config_dir=config_dir, assets_dir=assets_dir)

        # Create synthetic test frame
        dummy_frame = np.full((512, 1024, 3), 120, dtype=np.uint8)
        dummy_frame[350:, :, :] = 80

        result = pipeline.process_frame(dummy_frame, ego_speed_ms=7.0)

        # Verify output keys
        self.assertIn("hud_frame", result)
        self.assertIn("enhanced_frame", result)
        self.assertIn("aeb_state", result)
        self.assertIn("ldw_state", result)
        self.assertIn("visibility", result)
        self.assertIn("controls", result)

        # Check HUD dimensions
        self.assertEqual(result["hud_frame"].shape, (512, 1024, 3))

        # Check controls
        controls = result["controls"]
        self.assertIn("throttle", controls)
        self.assertIn("brake", controls)
        self.assertIn("steer", controls)
        self.assertTrue(0.0 <= controls["throttle"] <= 1.0)
        self.assertTrue(0.0 <= controls["brake"] <= 1.0)
        self.assertTrue(-1.0 <= controls["steer"] <= 1.0)


if __name__ == "__main__":
    unittest.main()
