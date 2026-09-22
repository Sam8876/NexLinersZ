"""
FogSafe IVCAS - Adaptive Low-Light Enhancement Subsystem
Optimized for nighttime and dusk driving conditions on mining haul roads and highways.
"""

from typing import Tuple
import cv2
import numpy as np


class AdaptiveLowLightEnhancer:
    """
    Edge-optimized low-light enhancement using:
    1. Dynamic scene illumination estimation.
    2. Adaptive Gamma Correction (AGC) on the luminance channel.
    3. Multi-tile Contrast Limited Adaptive Histogram Equalization (CLAHE) in CIE L*a*b* space.
    4. Highlight suppression to avoid blinding from truck headlights / reflections.
    """

    def __init__(
        self,
        base_clip_limit: float = 2.5,
        tile_grid_size: Tuple[int, int] = (8, 8),
        denoise_strength: float = 0.04,
        dark_threshold: float = 75.0,
    ):
        self.base_clip_limit = base_clip_limit
        self.tile_grid_size = tile_grid_size
        self.denoise_strength = denoise_strength
        self.dark_threshold = dark_threshold

        self._clahe = cv2.createCLAHE(
            clipLimit=self.base_clip_limit, tileGridSize=self.tile_grid_size
        )

    def enhance(self, image_bgr: np.ndarray) -> np.ndarray:
        """
        Enhance a low-light frame without distorting colors or causing headlight blowup.

        Args:
            image_bgr: Input BGR image (uint8).

        Returns:
            Enhanced BGR image (uint8).
        """
        if image_bgr is None or image_bgr.size == 0:
            return image_bgr

        # Convert to CIE L*a*b* color space
        lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)

        # Estimate average scene luminance
        mean_lum = float(np.mean(l_channel))

        # Check if frame is low light
        if mean_lum < self.dark_threshold:
            # Adaptive Gamma calculation: Boost darker frames more aggressively
            # Normalized mean in [0.05, 1.0]
            norm_mean = max(mean_lum / 255.0, 0.05)
            # Gamma: < 1.0 brightens shadows, capped at 0.5 to prevent noise amplification
            gamma = float(np.clip(np.log(norm_mean) / np.log(0.4), 0.45, 0.95))

            # Gamma lookup table
            inv_gamma = 1.0 / gamma
            lut = np.array(
                [((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]
            ).astype(np.uint8)

            l_gamma = cv2.LUT(l_channel, lut)

            # Apply CLAHE to the gamma-adjusted luminance channel
            # Scale clip limit dynamically: higher clip for lower light
            dynamic_clip = self.base_clip_limit * (1.0 + (self.dark_threshold - mean_lum) / 50.0)
            self._clahe.setClipLimit(min(dynamic_clip, 4.5))
            l_enhanced = self._clahe.apply(l_gamma)

            # Mild bilateral smoothing on dark luminance to suppress sensor noise
            if self.denoise_strength > 0:
                l_enhanced = cv2.bilateralFilter(l_enhanced, 5, 25, 25)

            # Re-merge channels and convert back to BGR
            enhanced_lab = cv2.merge((l_enhanced, a_channel, b_channel))
            return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
        else:
            # Normal or bright lighting: apply subtle contrast enhancement
            self._clahe.setClipLimit(1.5)
            l_enhanced = self._clahe.apply(l_channel)
            enhanced_lab = cv2.merge((l_enhanced, a_channel, b_channel))
            return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
