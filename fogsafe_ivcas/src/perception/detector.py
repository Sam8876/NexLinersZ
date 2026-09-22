"""
FogSafe IVCAS - In-Path Obstacle & CIPO Detection Subsystem
Supports both Visual Pilot's AutoSpeed/AutoDrive Fusion and Modern YOLO (YOLOv8/v11).
Specifically filtered to eliminate false positives in complex urban/mining environments.
"""

from typing import List, Dict, Any, Optional, Tuple
import os
import numpy as np
import cv2

from .engine import EdgeInferenceEngine
from .homography import DumperCameraGeometry


class InPathObstacleDetector:
    """
    High-precision obstacle detector and CIPO (Closest In-Path Object) identifier.
    
    Supports:
    1. Visual Pilot AutoSpeed (with proper L1/L2 class filtering and conf_thres >= 0.60).
    2. Ultralytics YOLOv8 / YOLO11 (automotive classes: car, truck, bus, motorcycle, person).
    3. AutoDrive Dual-Confirmation Fusion (cross-validating in-path presence).
    4. Heavy Dumper 3D Ground-Contact Geometric Verification.
    """

    def __init__(
        self,
        engine: EdgeInferenceEngine,
        model_path: str,
        geometry: DumperCameraGeometry,
        autodrive_path: Optional[str] = None,
        conf_threshold: float = 0.40,
        autospeed_conf_threshold: float = 0.60,
        iou_threshold: float = 0.45,
        in_path_corridor_half_width_m: float = 2.0,
        enable_autodrive_confirmation: bool = True,
    ):
        self.engine = engine
        self.geometry = geometry
        self.conf_threshold = conf_threshold
        self.autospeed_conf_threshold = autospeed_conf_threshold
        self.iou_threshold = iou_threshold
        self.corridor_half_w = in_path_corridor_half_width_m
        self.enable_autodrive = enable_autodrive_confirmation

        # Primary detector session
        self.session = self.engine.create_session(model_path)
        self.input_name = self.session.get_inputs()[0].name if self.session else ""
        self.output_name = self.session.get_outputs()[0].name if self.session else ""

        # Determine model architecture
        self.is_yolo = False
        self.is_autospeed = False
        if self.session is not None:
            out_shape = self.session.get_outputs()[0].shape
            # YOLO outputs [batch, 84, 10752] or [batch, 10752, 84] (80 classes + 4 coords)
            if len(out_shape) >= 2 and (84 in out_shape or 85 in out_shape):
                self.is_yolo = True
            elif len(out_shape) >= 2 and 8 in out_shape:
                self.is_autospeed = True
            else:
                # Fallback check based on filename
                if "yolo" in os.path.basename(model_path).lower():
                    self.is_yolo = True
                else:
                    self.is_autospeed = True

        # Optional AutoDrive session for Dual-Network Confirmation
        self.autodrive_session = None
        self._prev_frame_chw: Optional[np.ndarray] = None
        if self.enable_autodrive and autodrive_path and os.path.exists(autodrive_path):
            self.autodrive_session = self.engine.create_session(autodrive_path)

        # Tracking state for relative velocity
        self._prev_cipo_dist: Optional[float] = None
        self._prev_timestamp: Optional[float] = None
        self._filtered_rel_velocity: float = 0.0

        # COCO Automotive classes for YOLO
        # 0: person, 1: bicycle, 2: car, 3: motorcycle, 5: bus, 7: truck
        self.yolo_auto_classes = {0: "person", 1: "bicycle", 2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}
        self._ad_mean = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(1, 3, 1, 1)
        self._ad_std = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(1, 3, 1, 1)

    def detect(
        self,
        frame_bgr: np.ndarray,
        current_time: float,
        path_poly: Tuple[float, float, float] = (0.0, 0.0, 0.0),
    ) -> Dict[str, Any]:
        """
        Run detection, verify with ground geometry, and identify CIPO.
        """
        h, w = frame_bgr.shape[:2]
        raw_detections: List[Dict[str, Any]] = []

        # Prepare normalized RGB tensor
        if frame_bgr.shape[0] != 512 or frame_bgr.shape[1] != 1024:
            f_norm = cv2.resize(frame_bgr, (1024, 512))
        else:
            f_norm = frame_bgr
        rgb_f = cv2.cvtColor(f_norm, cv2.COLOR_BGR2RGB).astype(np.float32) * (1.0 / 255.0)
        chw_base = np.transpose(rgb_f, (2, 0, 1))[np.newaxis, ...]

        # 1. Run AutoDrive In-Path Presence Confirmation (Visual Pilot Methodology)
        ad_confirmed = True
        ad_flag_prob = 1.0
        ad_dist_norm = 1.0

        if self.autodrive_session is not None:
            curr_ad_input = (chw_base - self._ad_mean) / self._ad_std

            if self._prev_frame_chw is None:
                self._prev_frame_chw = curr_ad_input

            try:
                ad_in_names = [i.name for i in self.autodrive_session.get_inputs()]
                ad_outs = self.autodrive_session.run(
                    None, {ad_in_names[0]: self._prev_frame_chw, ad_in_names[1]: curr_ad_input}
                )
                ad_dist_norm = float(ad_outs[0][0][0])
                ad_flag_logit = float(ad_outs[2][0][0])
                ad_flag_prob = 1.0 / (1.0 + np.exp(-ad_flag_logit))
                # Visual Pilot rule: CIPO_PROB_MIN = 0.40
                ad_confirmed = (ad_flag_prob >= 0.35)
            except Exception:
                ad_confirmed = True

            self._prev_frame_chw = curr_ad_input

        # 2. Run Object Detection Model (AutoSpeed or YOLO)
        if self.session is not None:
            chw = chw_base
            try:
                outputs = self.session.run([self.output_name], {self.input_name: chw})
                tensor = outputs[0]

                if self.is_yolo:
                    raw_detections = self._post_process_yolo(tensor, w, h)
                else:
                    raw_detections = self._post_process_autospeed(tensor, w, h)
            except Exception as e:
                pass

        # 3. Ground-Contact Geometry & Dumper Camera Sanity Filter
        valid_detections = []
        cipo_det = None
        min_dist = 999.0
        a, b, c = path_poly

        for det in raw_detections:
            x1, y1, x2, y2 = det["bbox"]
            bw = x2 - x1
            bh = y2 - y1

            # Discard unreasonable boxes:
            # 1. Floating in the sky (bottom edge y2 in upper 35% of frame)
            if y2 < int(h * 0.35):
                continue
            # 2. Tiny noise boxes or full-screen blown-out boxes
            if (bw < 14) or (bh < 14) or (bw > w * 0.85) or (bh > h * 0.85):
                continue

            u_center = (x1 + x2) * 0.5
            v_bottom = float(y2)

            # Project ground-contact point through Dumper IPM
            x_fwd, y_lat = self.geometry.pixel_to_world(u_center, v_bottom)
            det["x_fwd"] = x_fwd
            det["y_lat"] = y_lat

            # Physical road constraint: distance must be within realistic forward range
            if not (1.5 <= x_fwd <= 80.0 and abs(y_lat) <= 5.5):
                continue

            # In-path lateral corridor check
            y_expected = a * (x_fwd ** 2) + b * x_fwd + c
            lateral_offset = abs(y_lat - y_expected)
            is_in_path = (lateral_offset <= self.corridor_half_w)
            det["in_path"] = is_in_path

            valid_detections.append(det)

            # AutoSpeed Class 1 or YOLO in-path
            if is_in_path and (x_fwd < min_dist):
                min_dist = x_fwd
                cipo_det = det

        # 4. Visual Pilot Dual Confirmation:
        # If AutoDrive says no vehicle ahead (ad_flag_prob < 35%) and no confident close detector box:
        if (not ad_confirmed) and (min_dist > 15.0):
            # Suppress false alarms on empty road
            cipo_det = None
            valid_detections = []

        # 5. Compute Relative Velocity and TTC for CIPO
        cipo_info = {
            "valid": False,
            "distance_m": 150.0,
            "lateral_m": 0.0,
            "rel_velocity_ms": 0.0,
            "ttc_s": 999.0,
            "bbox": None,
            "class_label": "NONE",
            "ad_flag_prob": float(np.round(ad_flag_prob, 3)),
        }

        if cipo_det is not None:
            dist = cipo_det["x_fwd"]
            lat = cipo_det["y_lat"]

            rel_vel = 0.0
            if (self._prev_cipo_dist is not None) and (self._prev_timestamp is not None):
                dt = current_time - self._prev_timestamp
                if 0.001 < dt < 1.0:
                    raw_vel = (dist - self._prev_cipo_dist) / dt
                    self._filtered_rel_velocity = 0.3 * raw_vel + 0.7 * self._filtered_rel_velocity
                    rel_vel = self._filtered_rel_velocity

            self._prev_cipo_dist = dist
            self._prev_timestamp = current_time

            closing_speed = -rel_vel
            ttc = (dist / closing_speed) if closing_speed > 0.5 else 999.0

            cipo_info = {
                "valid": True,
                "distance_m": float(np.round(dist, 1)),
                "lateral_m": float(np.round(lat, 2)),
                "rel_velocity_ms": float(np.round(rel_vel, 2)),
                "ttc_s": float(np.round(ttc, 2)),
                "bbox": cipo_det["bbox"],
                "class_label": cipo_det.get("label", "VEHICLE"),
                "ad_flag_prob": float(np.round(ad_flag_prob, 3)),
            }
        else:
            self._prev_cipo_dist = None

        return {"detections": valid_detections, "cipo": cipo_info}

    def _post_process_autospeed(
        self, output_tensor: np.ndarray, img_w: int, img_h: int
    ) -> List[Dict[str, Any]]:
        """
        Post-process AutoSpeed output [1, 8, 10752] strictly matching Visual Pilot's methodology.
        """
        data = output_tensor[0]  # Shape [8, N]
        C, N = data.shape
        num_classes = C - 4

        candidates = []
        conf_thres = self.autospeed_conf_threshold  # Default 0.60

        for n in range(N):
            best_prob = -1.0
            best_cls = 0
            for c in range(num_classes):
                # Sigmoid matching visual_pilot's auto_speed.cpp
                prob = 1.0 / (1.0 + np.exp(-data[4 + c, n]))
                if prob > best_prob:
                    best_prob = prob
                    best_cls = c

            # Visual Pilot rule: Only Level 1 (in-path lead) and Level 2 (cut-in)
            # Class 0 is general background/noise; Class 3 is distant background.
            if best_cls in (1, 2) and best_prob >= conf_thres:
                cx = float(data[0, n])
                cy = float(data[1, n])
                w = float(data[2, n])
                h = float(data[3, n])

                x1 = max(0, int(cx - w * 0.5))
                y1 = max(0, int(cy - h * 0.5))
                x2 = min(img_w, int(cx + w * 0.5))
                y2 = min(img_h, int(cy + h * 0.5))

                lbl = "L1_LEAD" if best_cls == 1 else "L2_CUTIN"
                candidates.append({
                    "bbox": [x1, y1, x2, y2],
                    "class_id": best_cls,
                    "score": best_prob,
                    "label": lbl,
                })

        return self._nms(candidates, self.iou_threshold)

    def _post_process_yolo(
        self, output_tensor: np.ndarray, img_w: int, img_h: int
    ) -> List[Dict[str, Any]]:
        """
        Post-process Ultralytics YOLO output [1, 84, 10752].
        """
        data = output_tensor[0]
        # Transpose if [N, 84]
        if data.shape[0] != 84 and data.shape[1] == 84:
            data = data.T

        boxes = data[:4, :]       # [4, N]
        class_scores = data[4:, :] # [80, N]
        N = data.shape[1]

        candidates = []
        conf_thres = self.conf_threshold  # Default 0.40

        for n in range(N):
            scores = class_scores[:, n]
            best_cls = int(np.argmax(scores))
            max_score = float(scores[best_cls])

            # Filter strictly for automotive targets (car, truck, bus, motorcycle, person)
            if (best_cls in self.yolo_auto_classes) and (max_score >= conf_thres):
                cx = float(boxes[0, n])
                cy = float(boxes[1, n])
                w = float(boxes[2, n])
                h = float(boxes[3, n])

                x1 = max(0, int(cx - w * 0.5))
                y1 = max(0, int(cy - h * 0.5))
                x2 = min(img_w, int(cx + w * 0.5))
                y2 = min(img_h, int(cy + h * 0.5))

                candidates.append({
                    "bbox": [x1, y1, x2, y2],
                    "class_id": best_cls,
                    "score": max_score,
                    "label": self.yolo_auto_classes[best_cls].upper(),
                })

        return self._nms(candidates, self.iou_threshold)

    @staticmethod
    def _nms(dets: List[Dict[str, Any]], iou_thres: float) -> List[Dict[str, Any]]:
        if not dets:
            return []

        boxes = [d["bbox"] for d in dets]
        scores = [d["score"] for d in dets]

        indices = cv2.dnn.NMSBoxes(
            bboxes=boxes,
            scores=scores,
            score_threshold=0.0,
            nms_threshold=iou_thres,
        )

        keep = []
        if len(indices) > 0:
            for idx in indices.flatten():
                keep.append(dets[idx])
        return keep
