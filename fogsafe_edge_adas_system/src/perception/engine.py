"""
FogSafe IVCAS - Multi-Backend Edge AI Inference Engine
Optimized for NVIDIA Jetson Orin Nano (TensorRT/CUDA FP16) and Raspberry Pi 5 AI HAT (Hailo-8 / CPU NEON).
"""

from typing import List, Dict, Any, Optional
import os
import logging
import cv2
import numpy as np
import onnxruntime as ort

logger = logging.getLogger("FogSafe.Engine")


class EdgeInferenceEngine:
    """
    Unified multi-backend inference engine that detects and configures the optimal
    Execution Provider (EP) for the current edge platform.
    """

    def __init__(
        self,
        target_platform: str = "auto",
        intra_op_num_threads: int = 4,
        inter_op_num_threads: int = 1,
        enable_fp16: bool = True,
    ):
        self.target_platform = target_platform
        self.intra_op_threads = intra_op_num_threads
        self.inter_op_threads = inter_op_num_threads
        self.enable_fp16 = enable_fp16

        self.available_providers = ort.get_available_providers()
        self.active_providers: List[Any] = self._resolve_execution_providers()
        logger.info(f"EdgeInferenceEngine initialized with providers: {self.active_providers}")

    def _resolve_execution_providers(self) -> List[Any]:
        """
        Detect hardware and select best available ONNXRuntime providers.
        """
        providers = []

        # Check for TensorRT / CUDA (Jetson Orin Nano / NVIDIA GPU)
        if "TensorrtExecutionProvider" in self.available_providers and self.target_platform in ("auto", "jetson_orin_nano"):
            trt_options = {
                "device_id": 0,
                "trt_max_workspace_size": 1073741824,  # 1GB
                "trt_fp16_enable": self.enable_fp16,
            }
            providers.append(("TensorrtExecutionProvider", trt_options))

        if "CUDAExecutionProvider" in self.available_providers and self.target_platform in ("auto", "jetson_orin_nano"):
            cuda_options = {
                "device_id": 0,
                "arena_extend_strategy": "kNextPowerOfTwo",
                "cudnn_conv_algo_search": "EXHAUSTIVE",
            }
            providers.append(("CUDAExecutionProvider", cuda_options))

        # Check for DirectML (Windows GPU acceleration)
        if "DmlExecutionProvider" in self.available_providers and self.target_platform in ("auto", "pc"):
            providers.append("DmlExecutionProvider")

        # Raspberry Pi 5 AI Hat / CPU NEON provider
        cpu_options = {
            "arena_extend_strategy": "kSameAsRequested",
        }
        providers.append(("CPUExecutionProvider", cpu_options))

        return providers

    def create_session(self, model_path: str) -> Optional[ort.InferenceSession]:
        """
        Create and optimize an ONNX InferenceSession for the given model path.
        """
        if not os.path.exists(model_path):
            logger.warning(f"Model file not found: {model_path}")
            return None

        sess_options = ort.SessionOptions()
        sess_options.intra_op_num_threads = self.intra_op_threads
        sess_options.inter_op_num_threads = self.inter_op_threads
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        # Enable memory arena shrinkage for low-RAM edge devices (RPi 5 / Jetson 8GB)
        sess_options.add_session_config_entry(
            "session.enable_memory_arena_shrinkage", "cpu:0;gpu:0"
        )

        try:
            session = ort.InferenceSession(
                model_path,
                sess_options=sess_options,
                providers=self.active_providers,
            )
            logger.info(f"Loaded ONNX model: {os.path.basename(model_path)} using {session.get_providers()}")
            return session
        except Exception as e:
            logger.error(f"Failed to load ONNX model {model_path}: {e}. Falling back to CPU.")
            return ort.InferenceSession(
                model_path,
                sess_options=sess_options,
                providers=["CPUExecutionProvider"],
            )

    @staticmethod
    def preprocess_chw(
        image_bgr: np.ndarray, target_w: int = 1024, target_h: int = 512
    ) -> np.ndarray:
        """
        Resize, convert BGR to RGB, normalize [0, 1], and transpose to [1, 3, H, W] float32.
        """
        if (image_bgr.shape[1] != target_w) or (image_bgr.shape[0] != target_h):
            resized = cv2.resize(image_bgr, (target_w, target_h), interpolation=cv2.INTER_LINEAR)
        else:
            resized = image_bgr

        # BGR -> RGB
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        # HWC -> CHW float32 normalized
        chw = np.transpose(rgb.astype(np.float32) / 255.0, (2, 0, 1))
        # Add batch dim -> [1, 3, H, W]
        return np.expand_dims(chw, axis=0)
