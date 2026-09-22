#!/usr/bin/env python3
"""
FogSafe IVCAS - Video & Webcam ADAS Tester
Runs the complete FogSafe pipeline with real-time HUD on an input video or live webcam.
"""

import sys
import os
import argparse
import time
import cv2

# Add project root to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.pipeline import FogSafeAdasPipeline


def main():
    parser = argparse.ArgumentParser(description="Test FogSafe IVCAS ADAS on Video or Camera")
    parser.add_argument("--input", default="0", help="Path to video file or webcam index (default: 0)")
    parser.add_argument("--speed-kmh", type=float, default=25.0, help="Simulated vehicle speed in km/h")
    parser.add_argument("--save", type=str, default="", help="Path to save output HUD video")
    parser.add_argument("--no-window", action="store_true", help="Run without UI window")
    args = parser.parse_args()

    # Determine input source
    source = int(args.input) if args.input.isdigit() else args.input
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"Error: Unable to open video source: {args.input}")
        sys.exit(1)

    config_dir = os.path.join(project_root, "config")
    assets_dir = os.path.join(project_root, "assets", "icons")
    pipeline = FogSafeAdasPipeline(config_dir=config_dir, assets_dir=assets_dir)

    writer = None
    window_name = "FogSafe IVCAS - Video Test HUD"
    if not args.no_window:
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(window_name, 1024, 512)

    speed_ms = args.speed_kmh / 3.6
    print(f"Starting FogSafe IVCAS on {args.input} at simulated speed {args.speed_kmh} km/h...")

    try:
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                break

            result = pipeline.process_frame(
                raw_bgr=frame,
                ego_speed_ms=speed_ms,
                timestamp=time.time(),
            )

            hud_frame = result["hud_frame"]

            if args.save:
                if writer is None:
                    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
                    writer = cv2.VideoWriter(args.save, fourcc, 25.0, (hud_frame.shape[1], hud_frame.shape[0]))
                writer.write(hud_frame)

            if not args.no_window:
                cv2.imshow(window_name, hud_frame)
                key = cv2.waitKey(1) & 0xFF
                if key in (27, ord("q")):
                    break

    finally:
        cap.release()
        if writer:
            writer.release()
        if not args.no_window:
            cv2.destroyAllWindows()
        print("Test completed.")


if __name__ == "__main__":
    main()
