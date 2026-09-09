# NMDC ADAS Edge Vision System — Real-Time LKA & AEB (OpenCV C++)

### Optimized for Raspberry Pi 5 (ARM Cortex-A76 @ 2.4 GHz + ARM NEON SIMD)
**Target Throughput:** Minimum **40 FPS** — Maximum **60 FPS**  
**AI/ML Model:** **YOLOv26** ONNX Neural Detection Pipeline  

---

## 1. System Overview

This program provides real-time vision intelligence for vehicle forward cameras (haulage dumpers, trucks, and passenger vehicles). It operates autonomously on edge hardware, implementing two critical Level 2 ADAS functions:

1. **Lane Keeping Assist (LKA)**:
   - Inverse Perspective Mapping (IPM / Bird's Eye View).
   - Fog and monsoon contrast enhancement via CLAHE on HLS/LAB color space.
   - Dual-color edge detection combined with sliding-window 2nd-order polynomial curve fitting ($x = ay^2 + by + c$).
   - Temporal stabilization with Kalman filtering.
   - Live computation of vehicle lateral offset ($d_{\text{offset}}$), lane curvature radius ($R$), and Lane Departure Warnings (LDW).
   - Augmented reality drivable corridor projection back into camera perspective.

2. **Autonomous Emergency Braking (AEB) & Safe Distance Threshold Marking**:
   - Pinhole camera projective geometry + ground plane homography estimating physical distance ($Z$ in meters) and lateral offset ($X$ in meters).
   - Inter-frame tracking and relative speed estimation ($\Delta v$) to compute **Time-To-Collision (TTC)**.
   - Real-time road projection of safe following distance lines (10m, 20m, 30m, 50m) and dynamic safe stopping thresholds based on physical vehicle dynamics:
     $$d_{\text{safe}} = v \cdot t_{\text{reaction}} + \frac{v^2}{2 \mu g} + d_{\text{buffer}}$$
   - Three-tier threat state machine:
     - **Normal (Green)**: Safe gap ($Z > d_{\text{safe}}$ or $\text{TTC} > 3.0\text{s}$)
     - **Forward Collision Warning (Amber)**: Caution ($d_{\text{critical}} < Z \le d_{\text{safe}}$ or $1.6\text{s} < \text{TTC} \le 3.0\text{s}$)
     - **AEB Emergency Braking (Red)**: Critical brake engagement ($Z \le d_{\text{critical}}$ or $\text{TTC} \le 1.6\text{s}$).

3. **Cockpit HUD & Visual Telemetry**:
   - 3D-styled perspective bounding brackets on tracked vehicles with live distance, TTC, and relative speed tags.
   - Lateral deviation meter bar showing vehicle position relative to lane center.
   - Speedometer gauge and real-time FPS monitor.
   - Flashing emergency AEB warning banner.

---

## 2. Raspberry Pi 5 ARM CPU Optimizations

To deliver a steady **40 to 60 FPS** on the Raspberry Pi 5 quad-core ARM Cortex-A76 CPU:
- **Compiler Flags**: `-mcpu=cortex-a76 -march=armv8.2-a+simd+fp16 -O3 -ffast-math -ftree-vectorize -fopenmp` enables full ARM NEON SIMD vectorization and FP16 half-precision arithmetic.
- **Decoupled AI Execution**: YOLOv26 deep learning inference runs at an optimal cadence (e.g. every 2nd frame at 416x416 resolution), while an optical/centroid tracker maintains object trajectories at 60 FPS.
- **OpenMP Multi-Core Parallelism**: Heavy pixel-wise operations (CLAHE, Sobel gradients, sliding window histogram calculations) are parallelized across all 4 Cortex-A76 cores.
- **High-Precision Frame Pacer**: Enforces an upper limit of 60 FPS (preventing CPU waste) and monitors frame duration to ensure a guaranteed minimum of 40 FPS.

---

## 3. Directory Structure

```
vehicle-node/adas-vision/
├── CMakeLists.txt              # CMake build script with ARM NEON & OpenMP flags
├── README.md                   # Complete documentation
├── config/
│   └── camera_calibration.yaml # Camera intrinsics, height, tilt, road friction, FPS limits
├── include/
│   ├── Config.hpp              # Configuration data structs
│   ├── FastLaneDetector.hpp    # IPM, sliding window polynomial fit, Kalman tracking
│   ├── YOLOv26Detector.hpp     # YOLOv26 ONNX inference & object tracker
│   ├── DistanceEstimator.hpp   # Pinhole ground projection & distance formulas
│   ├── AEBSystem.hpp           # Braking dynamics model & safe threshold calculations
│   ├── HUDVisualizer.hpp       # AR HUD graphics, corridor, distance grid, telemetry
│   └── PipelineManager.hpp     # 40-60 FPS microsecond frame pacer
├── src/
│   ├── Config.cpp
│   ├── FastLaneDetector.cpp
│   ├── YOLOv26Detector.cpp
│   ├── DistanceEstimator.cpp
│   ├── AEBSystem.cpp
│   ├── HUDVisualizer.cpp
│   ├── PipelineManager.cpp
│   └── main.cpp                # CLI entry point, video loop, keyboard controls
└── scripts/
    └── export_yolov26.py       # Helper script to export YOLOv26 to ONNX
```

---

## 4. Build Instructions

### Prerequisites
- **OpenCV 4.5+** (with `core`, `imgproc`, `highgui`, `videoio`, `dnn`)
- **CMake 3.16+**
- **C++17 compiler** (`g++` 9+ or `clang++` 10+)
- **OpenMP**

### A. Raspberry Pi 5 (Raspberry Pi OS 64-bit / Ubuntu ARM64)
```bash
# 1. Install dependencies
sudo apt-get update
sudo apt-get install -y build-essential cmake git libopencv-dev libomp-dev python3-pip

# 2. Navigate to project directory
cd vehicle-node/adas-vision

# 3. Create build directory and compile
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j4
```

### B. Ubuntu / Debian Linux (x86_64)
```bash
sudo apt-get update
sudo apt-get install -y build-essential cmake libopencv-dev libomp-dev
cd vehicle-node/adas-vision
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
```

### C. Windows (Visual Studio 2022 / vcpkg)
```powershell
# Using vcpkg for OpenCV
vcpkg install opencv4[dnn]:x64-windows

cd vehicle-node/adas-vision
mkdir build; cd build
cmake -DCMAKE_TOOLCHAIN_FILE=[vcpkg-root]/scripts/buildsystems/vcpkg.cmake ..
cmake --build . --config Release
```

---

## 5. Model Setup (YOLOv26)

To export or prepare the YOLOv26 ONNX model:
```bash
pip install ultralytics onnx onnxslim
python scripts/export_yolov26.py --output models/yolov26n.onnx --size 416
```

> **Note:** If no model file is found at `models/yolov26n.onnx`, the program automatically falls back to its built-in edge/contour obstacle detector, allowing you to run and test immediately on any video out-of-the-box!

---

## 6. How to Run

### Run on a video file:
```bash
./adas_vision --video /path/to/dashcam_video.mp4 --model models/yolov26n.onnx --speed 40
```

### Run on a live camera / USB / CSI stream:
```bash
./adas_vision --cam 0 --model models/yolov26n.onnx
```

### Custom FPS bounds and configuration:
```bash
./adas_vision --video test_road.mp4 --min-fps 40 --max-fps 60 --config config/camera_calibration.yaml
```

---

## 7. Interactive Keyboard Controls

| Key | Function |
|---|---|
| `Space` | Pause / Resume playback |
| `l` / `L` | Toggle Bird's Eye View (IPM) Picture-in-Picture window |
| `h` / `H` | Toggle Cockpit HUD telemetry graphics |
| `+` / `=` | Increase simulated ego speed by 5 km/h (expands braking distance threshold) |
| `-` / `_` | Decrease simulated ego speed by 5 km/h |
| `q` / `Esc` | Quit program |
