"""
FogSafe IVCAS - Automotive Heads-Up Display (HUD) Renderer
Renders dynamic driving corridors, CIPO tags, fog visibility meters, LDW wings, and AEB banners.
"""

from typing import Dict, Any, List, Tuple, Optional
import os
import cv2
import numpy as np

from ..perception.homography import DumperCameraGeometry


class AutomotiveHudRenderer:
    """
    Renders an automotive-grade HUD overlay for heavy dumper trucks operating in
    severe fog (3-5m visibility) and low-light conditions.
    """

    def __init__(
        self,
        geometry: DumperCameraGeometry,
        assets_dir: str = "fogsafe_ivcas/assets/icons",
        enable_pip_raw_view: bool = True,
    ):
        self.geometry = geometry
        self.assets_dir = assets_dir
        self.enable_pip = enable_pip_raw_view

        # Load icons
        self.icon_brake = self._load_icon("brake.png")
        self.icon_collision = self._load_icon("collision.png")
        self.icon_rldw = self._load_icon("right_lane_departure.png")
        self.icon_lldw = self._load_icon("left_lane_departure.png")

        self.font = cv2.FONT_HERSHEY_DUPLEX
        self.font_bold = cv2.FONT_HERSHEY_SIMPLEX

    def _load_icon(self, filename: str) -> Optional[np.ndarray]:
        path = os.path.join(self.assets_dir, filename)
        if os.path.exists(path):
            img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
            return img
        return None

    def render(
        self,
        enhanced_frame: np.ndarray,
        raw_frame: Optional[np.ndarray],
        segmentation: Dict[str, Any],
        detection: Dict[str, Any],
        aeb_state: Dict[str, Any],
        ldw_state: Dict[str, Any],
        visibility_state: Dict[str, Any],
        ego_speed_ms: float,
        fps: float = 30.0,
        edge_target: str = "Jetson Orin / RPi5",
    ) -> np.ndarray:
        """
        Compose HUD overlays onto the enhanced frame.
        """
        hud = enhanced_frame.copy()
        h, w = hud.shape[:2]

        # 1. Subtle top gradient vignette for readability of gauges
        self._draw_top_vignette(hud)

        # 2. Dynamic Predictive Driving Corridor
        path_poly = segmentation.get("path_poly", (0.0, 0.0, 0.0))
        self._draw_driving_corridor(hud, path_poly, aeb_state)

        # 3. Object Detections & CIPO Highlight
        self._draw_detections(hud, detection)

        # 4. Top Speedometer & Safe Speed Advisory
        self._draw_speedometer(hud, ego_speed_ms, aeb_state.get("safe_max_speed_kmh", 25.0))

        # 5. Fog Visibility Gauge
        self._draw_visibility_gauge(hud, visibility_state)

        # 6. Lane Departure Warning (LDW) Wings (Left / Right)
        self._draw_ldw_wings(hud, ldw_state)

        # 7. Autonomous Emergency Braking (AEB) & FCW Bottom Banner
        self._draw_aeb_banner(hud, aeb_state)

        # 8. Picture-in-Picture (PiP) Raw Camera View (showing fog contrast difference)
        if self.enable_pip and raw_frame is not None:
            self._draw_pip_raw_feed(hud, raw_frame)

        # 9. Edge System Telemetry Footer
        self._draw_telemetry_footer(hud, fps, edge_target, ldw_state.get("cte_m", 0.0))

        return hud

    def _draw_top_vignette(self, img: np.ndarray):
        """Darkens top 25% of frame to make HUD text stand out against sky/fog."""
        fade_h = int(img.shape[0] * 0.25)
        alpha = np.linspace(0.60, 0.0, fade_h)[:, np.newaxis, np.newaxis]
        img[:fade_h, :] = (img[:fade_h, :].astype(np.float32) * (1.0 - alpha)).astype(np.uint8)

    def _draw_driving_corridor(
        self,
        img: np.ndarray,
        poly: Tuple[float, float, float],
        aeb_state: Dict[str, Any],
    ):
        """Draw semi-transparent predictive corridor on road plane."""
        a, b, c = poly
        left_pts, right_pts = self.geometry.project_path_corridor(
            a, b, c, half_width_m=1.9, x_range=(3.0, 35.0), step=0.8
        )

        if len(left_pts) < 2 or len(right_pts) < 2:
            return

        # Polygon vertices: left points forward, right points backward
        poly_pts = left_pts + right_pts[::-1]
        pts_np = np.array(poly_pts, dtype=np.int32)

        # Pick color based on braking severity:
        # Green (normal) -> Yellow (pre-brake) -> Red (AEB)
        if aeb_state.get("aeb_active", False):
            corridor_color = (0, 0, 220)  # Red
            alpha = 0.45
        elif aeb_state.get("prebrake_active", False) or aeb_state.get("fcw_active", False):
            corridor_color = (0, 140, 255)  # Orange
            alpha = 0.38
        else:
            corridor_color = (180, 230, 0)  # Bright Cyan-Green
            alpha = 0.28

        overlay = img.copy()
        cv2.fillPoly(overlay, [pts_np], corridor_color, cv2.LINE_AA)
        cv2.polylines(overlay, [np.array(left_pts)], False, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.polylines(overlay, [np.array(right_pts)], False, (255, 255, 255), 2, cv2.LINE_AA)

        cv2.addWeighted(overlay, alpha, img, 1.0 - alpha, 0.0, img)

    def _draw_detections(self, img: np.ndarray, detection: Dict[str, Any]):
        """Render bounding boxes and CIPO distance / TTC tags."""
        dets = detection.get("detections", [])
        cipo = detection.get("cipo", {})
        cipo_bbox = cipo.get("bbox") if cipo.get("valid", False) else None

        for d in dets:
            x1, y1, x2, y2 = d["bbox"]
            is_cipo = (cipo_bbox is not None) and (d["bbox"] == cipo_bbox)

            if is_cipo:
                # Highlight CIPO in bold Red with distance & TTC
                box_color = (0, 0, 255)
                cv2.rectangle(img, (x1, y1), (x2, y2), box_color, 3, cv2.LINE_AA)

                # Distance & TTC tag
                dist_m = cipo.get("distance_m", 0.0)
                ttc_s = cipo.get("ttc_s", 999.0)
                ttc_str = f"{ttc_s:.1f}s" if ttc_s < 20.0 else ">10s"
                lbl = cipo.get("class_label", "LEAD")
                tag = f"{lbl}: {dist_m:.1f}m | TTC: {ttc_str}"

                (tw, th), _ = cv2.getTextSize(tag, self.font_bold, 0.60, 2)
                tag_y = max(th + 8, y1 - 8)
                cv2.rectangle(
                    img,
                    (x1, tag_y - th - 6),
                    (x1 + tw + 10, tag_y + 4),
                    (0, 0, 180),
                    -1,
                )
                cv2.putText(
                    img,
                    tag,
                    (x1 + 5, tag_y - 2),
                    self.font_bold,
                    0.60,
                    (255, 255, 255),
                    2,
                    cv2.LINE_AA,
                )
            else:
                # Other confirmed in-path / adjacent vehicles (Visual Pilot style: subtle cyan outline)
                x_fwd = d.get("x_fwd", 0.0)
                lbl = d.get("label", "VEHICLE")
                cv2.rectangle(img, (x1, y1), (x2, y2), (220, 200, 0), 2, cv2.LINE_AA)
                sub_tag = f"{lbl} {x_fwd:.0f}m"
                cv2.putText(
                    img,
                    sub_tag,
                    (x1 + 2, max(12, y1 - 4)),
                    self.font,
                    0.40,
                    (220, 200, 0),
                    1,
                    cv2.LINE_AA,
                )

    def _draw_speedometer(
        self, img: np.ndarray, ego_speed_ms: float, safe_speed_kmh: float
    ):
        """Top center digital speedometer."""
        speed_kmh = ego_speed_ms * 3.6
        speed_mph = ego_speed_ms * 2.237

        speed_str = f"{int(round(speed_kmh))}"
        unit_str = "km/h"

        cx = img.shape[1] // 2
        cy = 45

        # Speed numeral
        (nw, nh), _ = cv2.getTextSize(speed_str, self.font, 1.3, 3)
        cv2.putText(
            img, speed_str, (cx - nw // 2, cy), self.font, 1.3, (255, 255, 255), 3, cv2.LINE_AA
        )

        # Unit
        (uw, uh), _ = cv2.getTextSize(unit_str, self.font, 0.45, 1)
        cv2.putText(
            img, unit_str, (cx - uw // 2, cy + 18), self.font, 0.45, (200, 200, 200), 1, cv2.LINE_AA
        )

        # Fog Safe Speed Badge on top-left
        badge_x, badge_y = 18, 18
        badge_w, badge_h = 135, 48
        cv2.rectangle(
            img,
            (badge_x, badge_y),
            (badge_x + badge_w, badge_y + badge_h),
            (30, 30, 30),
            -1,
        )
        cv2.rectangle(
            img,
            (badge_x, badge_y),
            (badge_x + badge_w, badge_y + badge_h),
            (255, 255, 255),
            2,
        )
        cv2.putText(
            img,
            "FOG SAFE LIMIT",
            (badge_x + 8, badge_y + 16),
            self.font,
            0.36,
            (200, 200, 200),
            1,
            cv2.LINE_AA,
        )
        limit_str = f"{int(round(safe_speed_kmh))} km/h"
        cv2.putText(
            img,
            limit_str,
            (badge_x + 15, badge_y + 39),
            self.font,
            0.65,
            (0, 255, 255),
            2,
            cv2.LINE_AA,
        )

    def _draw_visibility_gauge(self, img: np.ndarray, vis_state: Dict[str, Any]):
        """Top right meteorological visibility indicator."""
        vis_m = vis_state.get("visibility_meters", 50.0)
        is_crit = vis_state.get("is_critical_fog", False)

        badge_w = 175
        badge_x = img.shape[1] - badge_w - 18
        badge_y = 18
        badge_h = 48

        # Color based on fog severity
        if is_crit:
            border_color = (0, 0, 255)  # Red for <= 5m visibility
            status_text = "CRITICAL FOG"
            text_color = (0, 100, 255)
        elif vis_m < 15.0:
            border_color = (0, 165, 255)  # Orange
            status_text = "DENSE FOG"
            text_color = (0, 215, 255)
        else:
            border_color = (0, 255, 100)  # Green
            status_text = "CLEAR / MODERATE"
            text_color = (180, 255, 180)

        cv2.rectangle(
            img,
            (badge_x, badge_y),
            (badge_x + badge_w, badge_y + badge_h),
            (20, 20, 20),
            -1,
        )
        cv2.rectangle(
            img,
            (badge_x, badge_y),
            (badge_x + badge_w, badge_y + badge_h),
            border_color,
            2,
        )

        cv2.putText(
            img,
            f"VISIBILITY: {vis_m:.1f}m",
            (badge_x + 10, badge_y + 20),
            self.font,
            0.45,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )
        cv2.putText(
            img,
            status_text,
            (badge_x + 10, badge_y + 40),
            self.font,
            0.40,
            text_color,
            1,
            cv2.LINE_AA,
        )

    def _draw_ldw_wings(self, img: np.ndarray, ldw_state: Dict[str, Any]):
        """Render Left or Right flashing Lane Departure Warning alerts."""
        lldw = ldw_state.get("lldw_active", False)
        rldw = ldw_state.get("rldw_active", False)
        flash = ldw_state.get("flash_state", True)

        if not flash:
            return

        w, h = img.shape[1], img.shape[0]
        wing_w = int(w * 0.12)  # 12% width on sides

        if lldw:
            # Left wing alert
            overlay = img.copy()
            cv2.rectangle(overlay, (0, 0), (wing_w, h), (0, 100, 255), -1)
            cv2.addWeighted(overlay, 0.45, img, 0.55, 0.0, img)
            self._paste_icon(img, self.icon_lldw, wing_w // 2, h // 2, size_px=54)
            cv2.putText(
                img,
                "LEFT LANE",
                (10, h // 2 + 50),
                self.font,
                0.45,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )
            cv2.putText(
                img,
                "DEPARTURE",
                (8, h // 2 + 70),
                self.font,
                0.45,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )

        if rldw:
            # Right wing alert
            overlay = img.copy()
            cv2.rectangle(overlay, (w - wing_w, 0), (w, h), (0, 100, 255), -1)
            cv2.addWeighted(overlay, 0.45, img, 0.55, 0.0, img)
            self._paste_icon(img, self.icon_rldw, w - wing_w // 2, h // 2, size_px=54)
            cv2.putText(
                img,
                "RIGHT LANE",
                (w - wing_w + 8, h // 2 + 50),
                self.font,
                0.45,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )
            cv2.putText(
                img,
                "DEPARTURE",
                (w - wing_w + 10, h // 2 + 70),
                self.font,
                0.45,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )

    def _draw_aeb_banner(self, img: np.ndarray, aeb_state: Dict[str, Any]):
        """Render high-contrast bottom banner when FCW or AEB is triggered."""
        aeb = aeb_state.get("aeb_active", False)
        fcw = aeb_state.get("fcw_active", False)

        if not (aeb or fcw):
            return

        w, h = img.shape[1], img.shape[0]
        banner_h = int(h * 0.16)
        y0 = h - banner_h

        # Color: Deep Red for AEB, Amber for FCW
        bg_color = (0, 0, 180) if aeb else (0, 120, 230)
        label = "EMERGENCY BRAKING ACTIVE" if aeb else "COLLISION WARNING - BRAKE!"
        icon = self.icon_brake if aeb else self.icon_collision

        overlay = img.copy()
        cv2.rectangle(overlay, (0, y0), (w, h), bg_color, -1)
        cv2.addWeighted(overlay, 0.65, img, 0.35, 0.0, img)

        # Draw icon & centered alert label
        cx = w // 2
        cy = y0 + banner_h // 2
        self._paste_icon(img, icon, cx - 180, cy, size_px=48)

        (tw, th), _ = cv2.getTextSize(label, self.font, 0.85, 2)
        cv2.putText(
            img,
            label,
            (cx - tw // 2 + 20, cy + th // 2 - 2),
            self.font,
            0.85,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )

    def _draw_pip_raw_feed(self, img: np.ndarray, raw_frame: np.ndarray):
        """Draw small Picture-in-Picture thumbnail showing original foggy input."""
        pip_w = 190
        pip_h = 95
        pip_x = 18
        pip_y = img.shape[0] - pip_h - 40

        resized_raw = cv2.resize(raw_frame, (pip_w, pip_h), interpolation=cv2.INTER_AREA)

        # Border and overlay
        cv2.rectangle(
            img,
            (pip_x - 2, pip_y - 2),
            (pip_x + pip_w + 2, pip_y + pip_h + 2),
            (255, 255, 255),
            1,
        )
        img[pip_y : pip_y + pip_h, pip_x : pip_x + pip_w] = resized_raw

        # Label
        cv2.rectangle(img, (pip_x, pip_y), (pip_x + 95, pip_y + 16), (0, 0, 0), -1)
        cv2.putText(
            img, "RAW SENSOR", (pip_x + 4, pip_y + 12), self.font, 0.35, (255, 255, 255), 1, cv2.LINE_AA
        )

    def _draw_telemetry_footer(
        self, img: np.ndarray, fps: float, edge_target: str, cte_m: float
    ):
        """Render telemetry details in lower right corner."""
        w, h = img.shape[1], img.shape[0]
        telemetry = f"EDGE: {edge_target} | {fps:.1f} FPS | CTE: {cte_m:+.2f}m"

        (tw, th), _ = cv2.getTextSize(telemetry, self.font, 0.42, 1)
        tx = w - tw - 18
        ty = h - 14

        cv2.putText(
            img, telemetry, (tx, ty), self.font, 0.42, (200, 200, 200), 1, cv2.LINE_AA
        )

    def _paste_icon(
        self,
        base: np.ndarray,
        icon: Optional[np.ndarray],
        cx: int,
        cy: int,
        size_px: int = 50,
    ):
        """Alpha blend BGRA icon onto base image."""
        if icon is None or base is None:
            return

        resized = cv2.resize(icon, (size_px, size_px), interpolation=cv2.INTER_AREA)
        x1 = max(0, cx - size_px // 2)
        y1 = max(0, cy - size_px // 2)
        x2 = min(base.shape[1], x1 + size_px)
        y2 = min(base.shape[0], y1 + size_px)

        if (x2 <= x1) or (y2 <= y1):
            return

        src = resized[: y2 - y1, : x2 - x1]
        roi = base[y1:y2, x1:x2]

        if src.shape[2] == 4:
            alpha = (src[:, :, 3] / 255.0)[:, :, np.newaxis]
            rgb = src[:, :, :3]
            blended = (rgb * alpha + roi * (1.0 - alpha)).astype(np.uint8)
            base[y1:y2, x1:x2] = blended
        else:
            base[y1:y2, x1:x2] = src
