"""
FogSafe IVCAS - Master ADAS Pipeline
Coordinates real-time fog/low-light enhancement, segmentation, CIPO detection,
heavy dumper AEB/LDW evaluation, HUD rendering, and closed-loop control output.
"""

from typing import Dict, Any, Tuple, Optional
import time
import os
import yaml
import numpy as np
import cv2

from .enhancement import (
    FastKoschmiederDehazer,
    AdaptiveLowLightEnhancer,
    VisibilityEstimator,
)
from .perception import (
    EdgeInferenceEngine,
    DumperCameraGeometry,
    RoadLaneSegmenter,
    InPathObstacleDetector,
)
from .safety import (
    HeavyDumperDynamics,
    AutonomousEmergencyBrakingSystem,
    LaneDepartureWarningSystem,
)
from .hud import AutomotiveHudRenderer


class FogSafeAdasPipeline:
    """
    Main ADAS processing pipeline for FogSafe IVCAS.
    Processes each incoming camera frame through:
      1. Fog Dehazing & Low-Light Enhancement
      2. Real-time Visibility Estimation
      3. Semantic Drivable Corridor & Lane Segmentation
      4. In-Path Obstacle & CIPO Detection
      5. Heavy Dumper Safety Guardian (AEB & LDW)
      6. Automotive HUD Composition
    """

    def __init__(
        self,
        config_dir: str = "fogsafe_ivcas/config",
        assets_dir: str = "fogsafe_ivcas/assets/icons",
    ):
        self.config_dir = config_dir
        self.assets_dir = assets_dir

        # Load YAML configurations
        self.vehicle_cfg = self._load_yaml(os.path.join(config_dir, "dumper_vehicle.yaml"))["vehicle"]
        self.adas_cfg = self._load_yaml(os.path.join(config_dir, "adas_config.yaml"))["adas"]
        self.models_cfg = self._load_yaml(os.path.join(config_dir, "models.yaml"))["models"]

        # 1. Camera Geometry & Inverse Perspective Mapping (IPM)
        cam_cfg = self.vehicle_cfg["camera"]
        self.geometry = DumperCameraGeometry(
            camera_height_m=cam_cfg["mount_height"],
            forward_offset_m=cam_cfg["forward_offset"],
            pitch_deg=cam_cfg["downward_pitch_deg"],
            yaw_deg=cam_cfg["yaw_deg"],
            fov_h_deg=cam_cfg["fov_horizontal_deg"],
            image_width=cam_cfg["processing_resolution"][0],
            image_height=cam_cfg["processing_resolution"][1],
        )

        # 2. Enhancement Subsystems
        enh_cfg = self.adas_cfg["enhancement"]
        self.enable_dehaze = enh_cfg.get("enable_dehaze", True)
        self.enable_low_light = enh_cfg.get("enable_low_light", True)

        self.dehazer = FastKoschmiederDehazer(
            omega=enh_cfg.get("dehaze_omega", 0.88),
            t0=enh_cfg.get("dehaze_t0", 0.18),
        )
        self.low_light_enhancer = AdaptiveLowLightEnhancer(
            base_clip_limit=enh_cfg.get("clahe_clip_limit", 2.5),
        )
        self.visibility_meter = VisibilityEstimator(
            camera_height_m=cam_cfg["mount_height"],
            camera_pitch_deg=cam_cfg["downward_pitch_deg"],
            critical_fog_distance_m=self.adas_cfg["fog_safety"]["critical_visibility_m"],
            extreme_fog_distance_m=self.adas_cfg["fog_safety"]["extreme_visibility_m"],
        )

        # 3. Edge Inference Engine & Perception Models
        self.engine = EdgeInferenceEngine(
            target_platform=self.models_cfg.get("target_platform", "auto"),
            intra_op_num_threads=self.models_cfg["inference"].get("num_threads", 4),
        )

        project_root = os.path.dirname(os.path.abspath(self.config_dir))
        def _resolve_path(p: str) -> str:
            if not p:
                return ""
            if os.path.isabs(p) and os.path.exists(p):
                return p
            p_cand = os.path.join(project_root, p)
            if os.path.exists(p_cand):
                return p_cand
            return p

        detector_type = self.models_cfg.get("detector_type", "auto")
        yolo_path = _resolve_path(self.models_cfg["weights"].get("yolov8n", ""))
        autospeed_path = _resolve_path(self.models_cfg["weights"].get("autospeed_int8", ""))
        if not os.path.exists(autospeed_path):
            autospeed_path = _resolve_path(self.models_cfg["weights"].get("autospeed_fp32", ""))

        if (detector_type in ("yolo", "auto")) and os.path.exists(yolo_path):
            primary_model_path = yolo_path
        else:
            primary_model_path = autospeed_path

        autodrive_path = _resolve_path(self.models_cfg["weights"].get("autodrive_fp32", ""))
        autosteer_path = _resolve_path(self.models_cfg["weights"].get("autosteer_fp32", ""))
        self.autosteer_session = self.engine.create_session(autosteer_path) if autosteer_path and os.path.exists(autosteer_path) else None

        self.detector = InPathObstacleDetector(
            engine=self.engine,
            model_path=primary_model_path,
            geometry=self.geometry,
            autodrive_path=autodrive_path,
            conf_threshold=self.models_cfg["inference"].get("yolo_conf_threshold", 0.40),
            autospeed_conf_threshold=self.models_cfg["inference"].get("autospeed_conf_threshold", 0.60),
            iou_threshold=self.models_cfg["inference"].get("iou_threshold", 0.45),
            enable_autodrive_confirmation=self.models_cfg.get("fusion", {}).get("enable_autodrive_confirmation", True),
        )

        self.segmenter = RoadLaneSegmenter(
            geometry=self.geometry,
            road_width_m=4.8,
            truck_width_m=self.vehicle_cfg["dimensions"]["width"],
            autosteer_session=self.autosteer_session,
        )

        # 4. Heavy Dumper Safety Guardian
        dyn_cfg = self.vehicle_cfg["dynamics"]
        self.dynamics = HeavyDumperDynamics(
            gross_mass_kg=self.vehicle_cfg["dimensions"]["gross_weight"],
            pneumatic_lag_s=dyn_cfg["pneumatic_lag_time"],
            driver_reaction_s=dyn_cfg["driver_reaction_time"],
            max_emergency_decel_ms2=dyn_cfg["emergency_decel"],
            service_decel_ms2=dyn_cfg["max_service_decel"],
            standstill_cushion_m=self.adas_cfg["aeb"]["standstill_margin_s0"],
        )

        aeb_cfg = self.adas_cfg["aeb"]
        self.aeb_system = AutonomousEmergencyBrakingSystem(
            dynamics=self.dynamics,
            ttc_fcw_threshold=aeb_cfg["ttc_fcw_threshold"],
            ttc_prebrake_threshold=aeb_cfg["ttc_prebrake_threshold"],
            ttc_emergency_threshold=aeb_cfg["ttc_emergency_threshold"],
            standstill_cushion_m=aeb_cfg["standstill_margin_s0"],
        )

        ldw_cfg = self.adas_cfg["ldw"]
        self.ldw_system = LaneDepartureWarningSystem(
            truck_width_m=self.vehicle_cfg["dimensions"]["width"],
            lane_width_m=4.8,
            cte_warning_threshold_m=ldw_cfg["cte_warning_threshold"],
            cte_critical_threshold_m=ldw_cfg["cte_critical_threshold"],
            tlc_warning_threshold_s=ldw_cfg["tlc_warning_threshold"],
            min_speed_kmh=ldw_cfg["min_speed_kmh"],
        )

        # 5. Automotive HUD Renderer
        self.hud_renderer = AutomotiveHudRenderer(
            geometry=self.geometry,
            assets_dir=self.assets_dir,
            enable_pip_raw_view=True,
        )

        # FPS calculation state
        self._last_frame_time = time.time()
        self._fps = 30.0

    @staticmethod
    def _load_yaml(path: str) -> Dict[str, Any]:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def process_frame(
        self,
        raw_bgr: np.ndarray,
        ego_speed_ms: float,
        timestamp: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Execute one full cycle of FogSafe ADAS pipeline.

        Args:
            raw_bgr: Raw input image from camera (any resolution, resized to 1024x512).
            ego_speed_ms: Ego vehicle velocity in m/s.
            timestamp: Current timestamp in seconds (defaults to time.time()).

        Returns:
            Dictionary with:
                - hud_frame: Output image with complete HUD overlay.
                - enhanced_frame: Low-light / dehazed frame without overlays.
                - aeb_state: AEB and FCW alert & actuation status.
                - ldw_state: Lane departure warning status.
                - visibility: Visibility estimation results.
                - controls: Dict[throttle, steer, brake] recommended vehicle actuation.
                - fps: float
        """
        now = timestamp if timestamp is not None else time.time()
        dt = max(0.001, now - self._last_frame_time)
        self._last_frame_time = now
        inst_fps = 1.0 / dt
        self._fps = 0.15 * inst_fps + 0.85 * self._fps

        target_w, target_h = self.geometry.w, self.geometry.h
        if raw_bgr.shape[1] != target_w or raw_bgr.shape[0] != target_h:
            raw_resized = cv2.resize(raw_bgr, (target_w, target_h), interpolation=cv2.INTER_LINEAR)
        else:
            raw_resized = raw_bgr

        # Step 1: Fog Dehazing
        transmission = None
        if self.enable_dehaze:
            dehazed, transmission = self.dehazer.dehaze(raw_resized)
        else:
            dehazed = raw_resized

        # Step 2: Low-Light Enhancement
        if self.enable_low_light:
            enhanced = self.low_light_enhancer.enhance(dehazed)
        else:
            enhanced = dehazed

        # Step 3: Visibility Distance Estimation
        vis_state = self.visibility_meter.estimate(raw_resized, transmission)

        # Step 4: Semantic Road & Lane Segmentation
        seg_result = self.segmenter.segment(enhanced)

        # Step 5: In-Path Obstacle & CIPO Detection
        det_result = self.detector.detect(
            enhanced, current_time=now, path_poly=seg_result["path_poly"]
        )

        # Step 6: Safety Guardian (AEB & LDW)
        aeb_state = self.aeb_system.evaluate(
            ego_speed_ms=ego_speed_ms,
            cipo_data=det_result["cipo"],
            visibility_m=vis_state["visibility_meters"],
        )

        ldw_state = self.ldw_system.evaluate(
            cte_m=seg_result["cte_m"],
            yaw_err_rad=seg_result["yaw_err_rad"],
            ego_speed_ms=ego_speed_ms,
            lane_valid=seg_result["lane_valid"],
        )

        # Step 7: Compute Vehicle Actuation Output
        has_cipo = det_result["cipo"].get("valid", False)
        cipo_dist = det_result["cipo"].get("distance_m", 999.0)
        hand_brake = aeb_state.get("hand_brake", False)

        if aeb_state["aeb_active"]:
            recommended_brake = aeb_state["brake_demand"]
            recommended_throttle = 0.0
        elif aeb_state["prebrake_active"]:
            recommended_brake = aeb_state["brake_demand"]
            recommended_throttle = 0.0
        elif aeb_state.get("fcw_active", False):
            # FCW active: CUT THROTTLE IMMEDIATELY and apply alert deceleration
            recommended_brake = aeb_state["brake_demand"]
            recommended_throttle = 0.0
        elif aeb_state.get("fog_overspeed", False):
            recommended_brake = aeb_state["brake_demand"]
            recommended_throttle = 0.05
        elif has_cipo and (cipo_dist < 32.0):
            # Proportional Headway Following Distance Control:
            target_buffer = max(18.0, ego_speed_ms * 2.2 + 5.0)
            if cipo_dist < target_buffer:
                recommended_throttle = 0.0
                dist_deficit = target_buffer - cipo_dist
                recommended_brake = float(np.clip(0.15 + (dist_deficit / target_buffer) * 0.50, 0.10, 0.65))
            else:
                recommended_brake = 0.0
                recommended_throttle = 0.25
        else:
            recommended_brake = 0.0
            recommended_throttle = 0.35  # Smooth, safe cruising speed

        # Steering: Steering centering towards lane center
        Kp_cte = 0.20
        Kp_yaw = 0.40
        recommended_steer = float(np.clip(-Kp_cte * seg_result["cte_m"] - Kp_yaw * seg_result["yaw_err_rad"], -0.5, 0.5))

        control_output = {
            "throttle": recommended_throttle,
            "steer": recommended_steer,
            "brake": recommended_brake,
            "hand_brake": hand_brake,
        }

        # Step 8: Automotive HUD Rendering
        if "Tensorrt" in str(self.engine.active_providers):
            edge_label = "Jetson Orin (TensorRT)"
        elif "CUDA" in str(self.engine.active_providers):
            edge_label = "NVIDIA GPU (CUDA)"
        elif "Dml" in str(self.engine.active_providers):
            edge_label = "RTX 4060 GPU (DirectML)"
        elif "RPi" in str(self.engine.target_platform):
            edge_label = "RPi 5 AI HAT (Hailo/CPU)"
        else:
            edge_label = "CPU SIMD / Edge"
        hud_frame = self.hud_renderer.render(
            enhanced_frame=enhanced,
            raw_frame=raw_resized,
            segmentation=seg_result,
            detection=det_result,
            aeb_state=aeb_state,
            ldw_state=ldw_state,
            visibility_state=vis_state,
            ego_speed_ms=ego_speed_ms,
            fps=self._fps,
            edge_target=edge_label,
        )

        return {
            "hud_frame": hud_frame,
            "enhanced_frame": enhanced,
            "raw_frame": raw_resized,
            "aeb_state": aeb_state,
            "ldw_state": ldw_state,
            "visibility": vis_state,
            "segmentation": seg_result,
            "detection": det_result,
            "controls": control_output,
            "fps": self._fps,
        }
