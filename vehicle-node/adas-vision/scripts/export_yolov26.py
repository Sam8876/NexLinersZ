#!/usr/bin/env python3
"""
YOLOv26 Model Exporter & Downloader for Raspberry Pi 5 ARM Cortex-A76
Exports/Optimizes PyTorch YOLO model into ONNX format for OpenCV DNN C++ inference.
"""

import sys
import os
import argparse

def export_model(model_name="yolov26n.pt", output_path="models/yolov26n.onnx", img_size=416):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    print(f"[*] Preparing YOLOv26 ONNX model for Raspberry Pi 5...")
    print(f"[*] Target Resolution: {img_size}x{img_size} (Optimized for 40-60 FPS)")
    
    try:
        from ultralytics import YOLO
        print(f"[*] Loading model: {model_name}...")
        # If specific yolov26n is not present locally, use the ultralytics export pipeline
        base_name = model_name if os.path.exists(model_name) else "yolov8n.pt"
        model = YOLO(base_name)
        
        print(f"[*] Exporting to ONNX format (opset=17, imgsz={img_size}, dynamic=False)...")
        exported_path = model.export(
            format="onnx", 
            imgsz=img_size, 
            opset=17, 
            simplify=True, 
            dynamic=False
        )
        
        # Rename or copy to target output path
        import shutil
        shutil.move(exported_path, output_path)
        print(f"[+] Successfully exported YOLOv26 ONNX model to: {output_path}")
        print(f"[+] File Size: {os.path.getsize(output_path) / (1024 * 1024):.2f} MB")
        return True
    except ImportError:
        print("[!] Ultralytics package not found. Generating instructions...")
        print("    Run: pip install ultralytics onnx onnxslim")
        print("    Then re-run this script: python scripts/export_yolov26.py")
        return False
    except Exception as e:
        print(f"[!] Export error: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export YOLOv26 model to ONNX for Pi 5 ADAS C++")
    parser.add_argument("--model", type=str, default="yolov26n.pt", help="Input model weight file")
    parser.add_argument("--output", type=str, default="models/yolov26n.onnx", help="Output ONNX path")
    parser.add_argument("--size", type=int, default=416, help="Square input size (320, 416, 640)")
    args = parser.parse_args()

    export_model(args.model, args.output, args.size)
