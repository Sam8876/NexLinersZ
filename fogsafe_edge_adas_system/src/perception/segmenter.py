"""
FogSafe IVCAS - Semantic Road & Lane Segmentation Subsystem
Extracts drivable surface, road boundaries, lane centerline, CTE, and yaw error in extreme fog/low-light.
"""

from typing import Tuple, Dict, Any, Optional
import numpy as np
import cv2

from .homography import DumperCameraGeometry


class RoadLaneSegmenter:
    """
    Context-aware road and lane segmentation tailored for low visibility.
    Extracts the drivable surface, fits a 2nd degree polynomial path:
        y(x) = a * x^2 + b * x + c
    and computes Cross-Track Error (CTE) and Heading Error (epsi) for LDW.
    """

    def __init__(
        self,
        geometry: DumperCameraGeometry,
        road_width_m: float = 4.8,
        truck_width_m: float = 3.8,
        autosteer_session: Optional[Any] = None,
    ):
        self.geometry = geometry
        self.road_width_m = road_width_m
        self.truck_width_m = truck_width_m
        self.autosteer_session = autosteer_session
        self.input_name = self.autosteer_session.get_inputs()[0].name if self.autosteer_session else None

        # Temporal filter for smooth CTE and curvature
        self._prev_a: float = 0.0
        self._prev_b: float = 0.0
        self._prev_c: float = 0.0
        self._alpha: float = 0.35  # Smoothing factor
        self._has_history: bool = False

    def segment(
        self,
        enhanced_bgr: np.ndarray,
        steer_model_output: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Segment road surface and extract lane parameters using AutoSteer AI + Vision.
        """
        h, w = enhanced_bgr.shape[:2]

        # 1. Primary: Run AutoSteer Deep Learning Model
        if self.autosteer_session is not None and self.input_name is not None:
            try:
                # Preprocess: RGB [0, 1] CHW
                if enhanced_bgr.shape[0] != 512 or enhanced_bgr.shape[1] != 1024:
                    inp_img = cv2.resize(enhanced_bgr, (1024, 512))
                else:
                    inp_img = enhanced_bgr
                rgb_f = cv2.cvtColor(inp_img, cv2.COLOR_BGR2RGB).astype(np.float32) * (1.0 / 255.0)
                chw = np.transpose(rgb_f, (2, 0, 1))[np.newaxis, ...]

                outs = self.autosteer_session.run(None, {self.input_name: chw})
                lane_val = outs[0].squeeze()  # (64,) normalized u / 1024
                height = outs[1].squeeze()    # (64,) height confidence logit

                world_x = []
                world_y = []
                N_WP = 64
                for i in range(N_WP):
                    # Height logits > 0.0 indicate high confidence of road surface
                    if height[i] < 0.0:
                        continue
                    v_px = float(i) * (float(h) - 1.0) / float(N_WP - 1)
                    u_px = float(lane_val[i]) * float(w)

                    xw, yw = self.geometry.pixel_to_world(u_px, v_px)
                    if 2.5 <= xw <= 60.0 and abs(yw) <= 6.0:
                        world_x.append(xw)
                        world_y.append(yw)

                if len(world_x) >= 6:
                    poly = np.polyfit(world_x, world_y, 2)
                    a, b, c = float(poly[0]), float(poly[1]), float(poly[2])

                    # Create drivable lane polygon mask from fitted path
                    mask = np.zeros((h, w), dtype=np.uint8)
                    l_pts, r_pts = self.geometry.project_path_corridor(
                        a, b, c, half_width_m=self.road_width_m * 0.5, x_range=(3.0, 40.0), step=1.0
                    )
                    if len(l_pts) >= 2 and len(r_pts) >= 2:
                        corridor_poly = np.array(l_pts + r_pts[::-1], dtype=np.int32)
                        cv2.fillPoly(mask, [corridor_poly], 255)

                    return self._finalize_result(a, b, c, h, w, valid=True, mask=mask)
            except Exception:
                pass

        # 2. Secondary: Adaptive Lane Marking & Gradient Segmentation
        gray = cv2.cvtColor(enhanced_bgr, cv2.COLOR_BGR2GRAY)
        # Apply Sobel horizontal edge gradient to find road lane lines
        sobel_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        abs_sobel64f = np.absolute(sobel_x)
        scaled_sobel = np.uint8(255 * abs_sobel64f / np.maximum(np.max(abs_sobel64f), 1.0))

        # Lane marking brightness mask in bottom 50%
        roi_y = int(h * 0.50)
        lane_thresh = cv2.inRange(scaled_sobel[roi_y:, :], 30, 255) & cv2.inRange(gray[roi_y:, :], 140, 255)

        # Sample lane marking points and project to ground
        white_y, white_x = np.where(lane_thresh > 0)
        if len(white_x) > 30:
            world_pts_x = []
            world_pts_y = []
            # Subsample for speed
            indices = np.random.choice(len(white_x), size=min(120, len(white_x)), replace=False)
            for idx in indices:
                u = float(white_x[idx])
                v = float(white_y[idx] + roi_y)
                xw, yw = self.geometry.pixel_to_world(u, v)
                if 3.0 <= xw <= 45.0 and abs(yw) <= 4.0:
                    world_pts_x.append(xw)
                    world_pts_y.append(yw)

            if len(world_pts_x) >= 8:
                poly = np.polyfit(world_pts_x, world_pts_y, 2)
                a, b, c = float(poly[0]), float(poly[1]), float(poly[2])
                return self._finalize_result(a, b, c, h, w, valid=True)

        # Fallback centered lane ahead if markings and model fail
        return self._finalize_result(0.0, 0.0, 0.0, h, w, valid=False)

    def _finalize_result(
        self,
        a: float,
        b: float,
        c: float,
        h: int,
        w: int,
        valid: bool = True,
        mask: Optional[np.ndarray] = None,
    ) -> Dict[str, Any]:
        """
        Apply temporal smoothing and compute ADAS metrics.
        """
        if self._has_history and valid:
            a = self._alpha * a + (1.0 - self._alpha) * self._prev_a
            b = self._alpha * b + (1.0 - self._alpha) * self._prev_b
            c = self._alpha * c + (1.0 - self._alpha) * self._prev_c

        self._prev_a = a
        self._prev_b = b
        self._prev_c = c
        self._has_history = True

        # Cross-Track Error (CTE): Lateral displacement at x = 0 (vehicle front)
        # In vehicle frame, +Y is left, -Y is right.
        # CTE is defined as: positive when vehicle is right of center (lane is to the left),
        # so CTE = -c.
        cte_m = -float(c)

        # Heading / Yaw Error: Tangent angle at x = 0: y'(0) = b -> epsi = -atan(b)
        yaw_err_rad = -float(np.arctan(b))

        # Road Curvature: kappa = 2*a / (1 + b^2)^1.5
        curvature = float((2.0 * a) / ((1.0 + b ** 2) ** 1.5))

        if mask is None:
            mask = np.zeros((h, w), dtype=np.uint8)

        return {
            "drivable_mask": mask,
            "path_poly": (a, b, c),
            "cte_m": cte_m,
            "yaw_err_rad": yaw_err_rad,
            "curvature": curvature,
            "lane_valid": valid,
        }
