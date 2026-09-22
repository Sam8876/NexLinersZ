"""
Unit tests for FogSafe IVCAS Enhancement Subsystem (Dehazing, Low-Light, Visibility).
"""

import unittest
import numpy as np

from fogsafe_ivcas.src.enhancement.fog_dehazer import FastKoschmiederDehazer
from fogsafe_ivcas.src.enhancement.low_light_enhancer import AdaptiveLowLightEnhancer
from fogsafe_ivcas.src.enhancement.visibility_meter import VisibilityEstimator


class TestEnhancement(unittest.TestCase):

    def setUp(self):
        # Create a synthetic foggy test image (washed out gray)
        self.foggy_img = np.full((512, 1024, 3), 160, dtype=np.uint8)
        # Add road feature with subtle contrast
        self.foggy_img[350:, :, :] = 130
        self.foggy_img[400:430, 480:540, :] = 200

        # Create a synthetic dark test image
        self.dark_img = np.full((512, 1024, 3), 25, dtype=np.uint8)
        self.dark_img[350:, :, :] = 15

    def test_dehazer_output_shape_and_contrast(self):
        dehazer = FastKoschmiederDehazer(omega=0.88, t0=0.18)
        dehazed, trans = dehazer.dehaze(self.foggy_img)

        self.assertEqual(dehazed.shape, self.foggy_img.shape)
        self.assertEqual(dehazed.dtype, np.uint8)
        self.assertEqual(trans.shape, (512, 1024))

        # Contrast should increase: dynamic range of dehazed >= foggy
        orig_range = int(np.max(self.foggy_img)) - int(np.min(self.foggy_img))
        dehazed_range = int(np.max(dehazed)) - int(np.min(dehazed))
        self.assertGreaterEqual(dehazed_range, orig_range)

    def test_low_light_enhancement(self):
        enhancer = AdaptiveLowLightEnhancer(base_clip_limit=2.5)
        enhanced = enhancer.enhance(self.dark_img)

        self.assertEqual(enhanced.shape, self.dark_img.shape)
        self.assertEqual(enhanced.dtype, np.uint8)

        # Mean luminance should increase in dark scene
        self.assertGreater(float(np.mean(enhanced)), float(np.mean(self.dark_img)))

    def test_visibility_estimator(self):
        meter = VisibilityEstimator(camera_height_m=3.5, critical_fog_distance_m=5.0)

        # High transmission -> higher visibility
        high_trans = np.full((512, 1024), 0.90, dtype=np.float32)
        res_clear = meter.estimate(self.foggy_img, high_trans)
        self.assertFalse(res_clear["is_critical_fog"])

        # Low transmission -> dense fog (< 5m)
        meter_fog = VisibilityEstimator(camera_height_m=3.5, critical_fog_distance_m=5.0)
        low_trans = np.full((512, 1024), 0.15, dtype=np.float32)
        res_fog = meter_fog.estimate(self.foggy_img, low_trans)
        self.assertTrue(res_fog["is_critical_fog"])
        self.assertLessEqual(res_fog["visibility_meters"], 5.5)


if __name__ == "__main__":
    unittest.main()
