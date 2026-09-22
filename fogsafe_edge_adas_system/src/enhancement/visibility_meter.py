"""
FogSafe IVCAS - Real-time Visibility Distance Estimator
Measures atmospheric visibility (meteorological optical range in meters) for heavy dumper ADAS.
"""

from typing import Tuple, Dict, Any
import cv2
import numpy as np


class VisibilityEstimator:
    """
    Estimates real-time road visibility distance (in meters) from camera frames.

    Uses:
    1. Local Michelson contrast decay across depth-stratified vertical bands.
    2. Sobel edge gradient energy extinction (Tenengrad criterion).
    3. Projection through camera pitch and mounting height to calculate physical distance.
    4. Fog condition classification (Normal, Light Fog, Heavy Fog, Critical Dense Fog).
    """

    def __init__(
        self,
        camera_height_m: float = 3.5,
        camera_pitch_deg: float = 9.5,
        fov_v_deg: float = 40.0,
        critical_fog_distance_m: float = 5.0,
        extreme_fog_distance_m: float = 3.0,
    ):
        self.h_cam = float(camera_height_m)
        self.pitch_rad = float(np.radians(camera_pitch_deg))
        self.fov_v_rad = float(np.radians(fov_v_deg))
        self.critical_dist_m = float(critical_fog_distance_m)
        self.extreme_dist_m = float(extreme_fog_distance_m)

        # Exponential moving average filter for stable HUD readout
        self._smoothed_visibility: float = 50.0
        self._alpha = 0.20  # EMA smoothing factor

    def _pixel_y_to_distance(self, y: float, img_h: int) -> float:
        """
        Convert pixel row y in image to ground forward distance in meters.
        y = 0 is top of image, y = img_h is bottom of image.
        """
        # Normalized optical center offset: +1.0 at bottom, -1.0 at top
        cy = img_h * 0.5
        fy = cy / np.tan(self.fov_v_rad * 0.5)

        # Angle relative to camera optical axis
        alpha = np.arctan((y - cy) / fy)
        # Total depression angle towards ground
        theta = self.pitch_rad + alpha

        if theta <= 0.02:  # parallel to or above horizon
            return 200.0

        return self.h_cam / np.tan(theta)

    def estimate(
        self, frame_bgr: np.ndarray, transmission_map: np.ndarray = None
    ) -> Dict[str, Any]:
        """
        Analyze frame and return visibility metrics.

        Args:
            frame_bgr: Input BGR image (uint8).
            transmission_map: Optional transmission map from FastKoschmiederDehazer.

        Returns:
            Dictionary with:
                - visibility_meters: float
                - is_critical_fog: bool (visibility <= 5.0m)
                - is_extreme_fog: bool (visibility <= 3.0m)
                - severity: str ("CLEAR", "MODERATE", "HEAVY_FOG", "CRITICAL_FOG")
                - contrast_metric: float
        """
        h, w = frame_bgr.shape[:2]
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)

        # If transmission map is provided, it directly indicates optical density
        if transmission_map is not None:
            # Low transmission (e.g. < 0.25) across bottom 40% indicates dense fog right in front
            lower_roi = transmission_map[int(h * 0.50):, :]
            mean_t = float(np.mean(lower_roi))
            # Koschmieder formula: t = exp(-beta * d)
            # When visibility is 3-5m, mean_t in near field drops sharply
            raw_vis = np.clip(mean_t * 22.0, 2.5, 120.0)
        else:
            # Gradient energy / Tenengrad method across vertical bands
            # Divide lower half of image into 8 depth bands
            num_bands = 8
            start_y = int(h * 0.45)
            band_height = (h - start_y) // num_bands

            vis_estimates = []
            sobel_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
            sobel_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
            grad_mag = cv2.magnitude(sobel_x, sobel_y)

            for b in range(num_bands):
                y0 = start_y + b * band_height
                y1 = y0 + band_height
                band_grad = grad_mag[y0:y1, :]
                band_energy = float(np.mean(band_grad))

                # Distance corresponding to the middle of this band
                mid_y = (y0 + y1) * 0.5
                dist_m = self._pixel_y_to_distance(mid_y, h)

                # Fog cutoff threshold: below 6.0 gradient energy indicates fog extinction
                if band_energy > 6.5:
                    vis_estimates.append(dist_m)

            if vis_estimates:
                raw_vis = float(max(vis_estimates))
            else:
                raw_vis = 3.5  # Heavy fog: no high frequency detail detected even near vehicle

        # Smooth visibility readout
        if not getattr(self, "_has_history", False):
            self._smoothed_visibility = raw_vis
            self._has_history = True
        else:
            self._smoothed_visibility = (
                self._alpha * raw_vis + (1.0 - self._alpha) * self._smoothed_visibility
            )
        curr_vis = float(np.round(self._smoothed_visibility, 1))

        # Classification
        if curr_vis <= self.extreme_dist_m:
            severity = "CRITICAL_EXTREME_FOG"
            is_critical = True
            is_extreme = True
        elif curr_vis <= self.critical_dist_m:
            severity = "CRITICAL_FOG"
            is_critical = True
            is_extreme = False
        elif curr_vis <= 15.0:
            severity = "HEAVY_FOG"
            is_critical = False
            is_extreme = False
        else:
            severity = "NORMAL"
            is_critical = False
            is_extreme = False

        return {
            "visibility_meters": curr_vis,
            "is_critical_fog": is_critical,
            "is_extreme_fog": is_extreme,
            "severity": severity,
        }
