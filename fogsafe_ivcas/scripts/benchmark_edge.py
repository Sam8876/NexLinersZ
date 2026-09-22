#!/usr/bin/env python3
"""
FogSafe IVCAS - Edge AI Performance Benchmarking Tool
Profiles latency (ms) per stage and throughput (FPS) for NVIDIA Jetson Orin Nano & Raspberry Pi 5 AI HAT.
"""

import sys
import os
import time
import argparse
import numpy as np

# Add project root to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.pipeline import FogSafeAdasPipeline


def run_benchmark(iterations: int = 100):
    print("=" * 65)
    print("      FogSafe IVCAS - Edge AI Performance Benchmark")
    print(f"      Running {iterations} Warm-up & Timed Iterations on 1024x512 Frame")
    print("=" * 65)

    config_dir = os.path.join(project_root, "config")
    assets_dir = os.path.join(project_root, "assets", "icons")
    pipeline = FogSafeAdasPipeline(config_dir=config_dir, assets_dir=assets_dir)

    print(f"Active Providers: {pipeline.engine.active_providers}")

    # Generate synthetic foggy/dark frame
    synthetic_frame = np.full((512, 1024, 3), 130, dtype=np.uint8)
    # Add artificial road markings and noise
    synthetic_frame[350:, :, :] = 90
    synthetic_frame[420:440, 480:540, :] = 220  # In-path obstacle blob

    # Warm-up (10 frames)
    print("\nWarming up pipeline...")
    for _ in range(10):
        _ = pipeline.process_frame(synthetic_frame, ego_speed_ms=8.0)

    # Detailed stage profiling
    timings = {
        "dehaze": [],
        "low_light": [],
        "visibility": [],
        "segmentation": [],
        "detection_onnx": [],
        "safety_guardian": [],
        "hud_rendering": [],
        "total_pipeline": [],
    }

    print(f"Benchmarking {iterations} iterations...")
    for i in range(iterations):
        t_start = time.perf_counter()

        # 1. Dehazing
        t0 = time.perf_counter()
        dehazed, trans = pipeline.dehazer.dehaze(synthetic_frame)
        t_dehaze = (time.perf_counter() - t0) * 1000.0

        # 2. Low-Light
        t0 = time.perf_counter()
        enhanced = pipeline.low_light_enhancer.enhance(dehazed)
        t_lowlight = (time.perf_counter() - t0) * 1000.0

        # 3. Visibility
        t0 = time.perf_counter()
        vis_res = pipeline.visibility_meter.estimate(synthetic_frame, trans)
        t_vis = (time.perf_counter() - t0) * 1000.0

        # 4. Segmentation
        t0 = time.perf_counter()
        seg_res = pipeline.segmenter.segment(enhanced)
        t_seg = (time.perf_counter() - t0) * 1000.0

        # 5. Detection & CIPO
        t0 = time.perf_counter()
        det_res = pipeline.detector.detect(enhanced, current_time=time.time(), path_poly=seg_res["path_poly"])
        t_det = (time.perf_counter() - t0) * 1000.0

        # 6. Safety Guardian (AEB & LDW)
        t0 = time.perf_counter()
        aeb_res = pipeline.aeb_system.evaluate(8.0, det_res["cipo"], vis_res["visibility_meters"])
        ldw_res = pipeline.ldw_system.evaluate(seg_res["cte_m"], seg_res["yaw_err_rad"], 8.0, seg_res["lane_valid"])
        t_safety = (time.perf_counter() - t0) * 1000.0

        # 7. HUD Rendering
        t0 = time.perf_counter()
        _ = pipeline.hud_renderer.render(
            enhanced_frame=enhanced,
            raw_frame=synthetic_frame,
            segmentation=seg_res,
            detection=det_res,
            aeb_state=aeb_res,
            ldw_state=ldw_res,
            visibility_state=vis_res,
            ego_speed_ms=8.0,
            fps=30.0,
        )
        t_hud = (time.perf_counter() - t0) * 1000.0

        t_total = (time.perf_counter() - t_start) * 1000.0

        timings["dehaze"].append(t_dehaze)
        timings["low_light"].append(t_lowlight)
        timings["visibility"].append(t_vis)
        timings["segmentation"].append(t_seg)
        timings["detection_onnx"].append(t_det)
        timings["safety_guardian"].append(t_safety)
        timings["hud_rendering"].append(t_hud)
        timings["total_pipeline"].append(t_total)

    print("\n" + "=" * 65)
    print(f"{'Pipeline Subsystem':<26} | {'Mean Latency':<14} | {'Std Dev':<10}")
    print("-" * 65)
    for name, vals in timings.items():
        mean_v = np.mean(vals)
        std_v = np.std(vals)
        print(f"{name:<26} | {mean_v:6.2f} ms      | ±{std_v:4.2f} ms")
    print("=" * 65)

    total_mean = np.mean(timings["total_pipeline"])
    fps = 1000.0 / total_mean
    print(f"\nOverall Throughput: {fps:.1f} FPS (Target: >= 20-30 FPS on Jetson / RPi 5 AI HAT)")
    print("Benchmark complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--iter", type=int, default=50, help="Number of benchmark iterations")
    args = parser.parse_args()
    run_benchmark(args.iter)
