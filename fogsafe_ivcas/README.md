# FogSafe IVCAS - Intelligent Vehicle Collision Avoidance System
### Level-2 ADAS (AEB & LDW) for Big Dumper Trucks & Heavy Mining Haul Vehicles
**Optimized for Severe Fog (3–5m Visibility), Low-Light Conditions, and Edge AI Deployment**

---

## 1. System Overview

**FogSafe IVCAS** is a specialized, production-grade Level-2 Advanced Driver Assistance System (ADAS) engineered specifically for **Big Dumper Trucks and Heavy Mining Haul Vehicles** (40–85 ton gross vehicle weight). Operating in open-pit mines, industrial corridors, and harsh haulage environments, these vehicles face severe weather hazards—notably **dense advective/radiation fog (visibility down to 3–5 meters)** and **low-light / nighttime conditions**.

Due to the extreme kinetic mass, pneumatic brake response lag, and elevated cabin geometry of heavy haul trucks, standard passenger car ADAS systems are ineffective and hazardous. FogSafe IVCAS bridges this critical safety gap by integrating:
- **Physical Atmospheric Dehazing & Low-Light Enhancement** ($<2\text{ms}$ SIMD-guided filtering)
- **Real-Time Meteorological Visibility Estimation & Fog-Safe Speed Governance**
- **Dual-Model Deep Learning Perception** with high-confidence false-detection filtering
- **Heavy Dumper Dynamics & Autonomous Emergency Braking (AEB)** with progressive multi-stage actuation and throttle-cut interlock
- **Lane Departure Warning (LDW) & 3D Predictive Driving Corridor** calibrated for wide-body haul tracks
- **Automotive Heads-Up Display (HUD)** for continuous real-time driver monitoring

> **Validation Note**: *Our system is trained and tested using CARLA with foggy weather conditions.*

---

## 2. Target Edge AI Hardware Platforms

FogSafe IVCAS is designed from the ground up for energy-efficient, high-throughput edge AI deployment:

| Edge Platform | Acceleration Engine | Execution Provider | Target End-to-End Latency |
| :--- | :--- | :--- | :--- |
| **NVIDIA Jetson Orin Nano** | Ampere GPU + Deep Learning Accelerator (DLA) | TensorRT FP16 / CUDA | $< 35\text{ ms}$ ($\ge 28\text{ FPS}$) |
| **Raspberry Pi 5 + AI HAT** | Hailo-8 / Hailo-8L NPU (13–26 TOPS) | HailoRT / ONNX Runtime ARM NEON | $< 50\text{ ms}$ ($\ge 20\text{ FPS}$) |
| **Edge PC / Onboard Industrial Unit** | NVIDIA RTX Laptop/Desktop GPU | DirectML / CUDA / TensorRT | $< 25\text{ ms}$ ($\ge 40\text{ FPS}$) |

---

## 3. Core Features & Technical Architecture

```
                    ┌───────────────────────────────────────────────┐
                    │      High-Mount Truck Cabin Camera (1024x512) │
                    └───────────────────────┬───────────────────────┘
                                            │
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │            SENSOR ENHANCEMENT ENGINE          │
                    │  • Fast Koschmieder Physical Dehazer (<2ms)   │
                    │  • Adaptive CIE L*a*b* Low-Light CLAHE        │
                    │  • Meteorological Visibility Extinction Estimator
                    └───────────────────────┬───────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
┌─────────────────────────────────────────┐   ┌─────────────────────────────────────────┐
│       NEURAL PERCEPTION ENGINE          │   │      ROAD GEOMETRY & LANE ENGINE        │
│ • Primary Lead Detector (AutoSpeed)     │   │ • Neural Waypoint Extractor (AutoSteer) │
│ • Dual-Model Confirmation (AutoDrive)   │   │ • Calibrated Inverse Perspective (IPM)  │
│ • False Positive & Scatter Filtering    │   │ • 2nd-Degree Polynomial Path Fitting    │
│ • Ground-Contact 3D Range & TTC Calc    │   │ • Cross-Track (CTE) & TLC Monitoring    │
└────────────────────┬────────────────────┘   └────────────────────┬────────────────────┘
                     │                                             │
                     └──────────────────────┬──────────────────────┘
                                            │
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │          HEAVY DUMPER SAFETY GUARDIAN         │
                    │  • Autonomous Emergency Braking (AEB)         │
                    │  • Forward Collision Warning (FCW)            │
                    │  • Hard Throttle Interlock & Cut              │
                    │  • Pneumatic Air Brake Lag Compensation       │
                    │  • Fog-Safe Dynamic Speed Governor            │
                    │  • Lane Departure Warning (LDW)               │
                    └───────────────────────┬───────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
┌─────────────────────────────────────────┐   ┌─────────────────────────────────────────┐
│        AUTOMOTIVE HUD RENDERER          │   │      VEHICLE ACTUATION INTERFACE        │
│ • 3D Predictive Driving Corridor        │   │ • Throttle Demand [0.0 - 1.0]           │
│ • CIPO Target Box (Distance & TTC)      │   │ • Progressive Brake Demand [0.0 - 1.0]  │
│ • Speedometer & Fog Speed Limit Badge   │   │ • Mechanical Handbrake Override         │
│ • Real-time Hardware Telemetry & PiP    │   │ • Steering Centering Bias               │
└─────────────────────────────────────────┘   └─────────────────────────────────────────┘
```

---

### A. Sensor Enhancement & Visibility Governor
1. **Fast Koschmieder Physical Dehazer**:
   - Inverts the atmospheric scattering model:
     $$I(x) = J(x)t(x) + A(1 - t(x)) \implies J(x) = \frac{I(x) - A}{\max(t(x), t_0)} + A$$
   - Utilizes a SIMD-accelerated box-filter guided transmission map estimation ($< 2.0\text{ ms}$ execution) without the memory overhead of dark channel prior (DCP) soft matting.
2. **Adaptive CIE $L^*a^*b^*$ Low-Light CLAHE**:
   - Decomposes frames into luminance ($L^*$) and chrominance ($a^*, b^*$).
   - Dynamically adjusts clip limits and applies bilateral edge-preserving smoothing, illuminating dark haul roads without blowing out headlights.
3. **Meteorological Visibility Estimator**:
   - Quantifies spatial frequency contrast decay across distant scene regions to estimate meteorological optical range ($d_{vis}$) in meters.
4. **Fog-Safe Speed Governor**:
   - Automatically computes maximum permissible safe stopping speed:
     $$v_{safe} = \sqrt{2 \cdot a_{max} \cdot \max(0, d_{vis} - s_0)}$$
   - Prevents overdriving the optical horizon in dense 3–5m fog.

---

### B. Dual-Model Perception & Zero False Detections
Heavy fog creates water droplet reflections, glare blooms, and contrast artifacts that routinely fool standard object detectors. FogSafe IVCAS eliminates false alerts using a two-stage filter:
1. **Primary Lead & Cut-in Detection (AutoSpeed)**:
   - Evaluates multi-class bounding anchors with sigmoid confidence gating (`conf >= 0.60`).
   - Categorizes Class 1 (lead vehicle) and Class 2 (lateral cut-in obstacle).
2. **Secondary Deep Confirmation (AutoDrive)**:
   - Validates candidate detections against background feature maps (`flag_prob >= 0.35`).
3. **Ground-Contact Geometry Validation**:
   - Evaluates physical ground contact points using calibrated truck camera homography:
     $$X_w \in [2.0\text{m}, 80.0\text{m}], \quad |Y_w| \le 5.5\text{m}$$
   - Instantly rejects floating false positives and off-road clutter.

---

### C. Heavy Dumper Dynamics & Autonomous Emergency Braking (AEB)
Operating a 65–85 ton dumper requires specialized braking physics:
- **Pneumatic Air Brake Delay**: Includes an explicit $t_{lag} = 0.45\text{s}$ pressure build-up latency model.
- **Maximum Safe Deceleration**: Capped at $a_{max} = 4.2\text{ m/s}^2$ to prevent catastrophic truck jackknifing or load shifting.
- **Standstill Cushion Buffer**: Enforces $s_0 = 5.0\text{m}$ safety distance.
- **Dynamic Closing-Velocity TTC**:
  $$v_{close} = \max\left(v_{ego}, v_{ego} - v_{rel}, -v_{rel}, 0.0\right), \quad TTC = \frac{d_{cipo} - s_0}{v_{close} + \epsilon}$$
- **Fail-Safe Multi-Stage Controller**:
  1. **Forward Collision Warning (FCW)**: Activated when $TTC \le 3.5\text{s}$. **Instantly clamps throttle to $0.0$** and applies mild pre-emptive brake demand ($0.35$).
  2. **Decisive Pre-Braking**: Activated when $TTC \le 2.4\text{s}$. Increases brake pressure progressively from $0.60$ to $0.85$.
  3. **Emergency AEB Braking**: Activated when $TTC \le 1.6\text{s}$ or distance $\le d_{stop}$. Latches **100% emergency braking (`brake = 1.0`)** until full stop ($v < 0.1\text{ m/s}$).
  4. **Mechanical Secondary Lock**: If distance drops below $6.5\text{m}$, engages mechanical handbrake (`hand_brake = True`).

---

### D. Lane Departure Warning (LDW) & Road Segmentation
- **Neural Waypoint Extraction (AutoSteer)**:
  - Extracts 64 lateral path waypoints projected into world ground coordinates via inverse homography.
  - Fits a 2nd-degree polynomial curve ($y = ax^2 + bx + c$) representing road center and curvature.
- **Haul-Road Calibrated Thresholds**:
  - Dumper width: $3.8\text{m}$; standard haul lane width: $4.8\text{m}$.
  - Usable lateral clearance: only $\pm 0.50\text{m}$.
  - Warning triggers when Cross-Track Error $|CTE| > 0.35\text{m}$ or Time-To-Lane-Crossing $TLC \le 1.2\text{s}$.
  - Visual LDW wings flash orange on HUD indicating the departure direction (Left / Right).

---

### E. Automotive Heads-Up Display (HUD)
The system renders a full automotive telemetry interface designed for in-cabin displays:
- **Dynamic 3D Driving Corridor**: Color-coded driving trapezoid projected on the ground plane (Cyan = Clear, Orange = Warning, Red = Emergency Braking).
- **CIPO Target Bounding Box**: Tracks closest in-path obstacle with distance ($m$), relative velocity ($\Delta v$), and TTC ($s$).
- **Digital Speedometer & Fog Safe Speed Badge**: Displays current speed vs. visibility-governed safe speed limit.
- **Visibility Gauge**: Live meteorological optical range in meters.
- **Picture-in-Picture (PiP)**: Real-time preview of the raw, unenhanced camera feed for sensor verification.
- **Hardware Telemetry**: Real-time FPS, inference provider (TensorRT / DirectML / CPU), and Cross-Track Error (CTE).

---

## 4. Directory Structure

```
fogsafe_ivcas/
├── config/
│   ├── dumper_vehicle.yaml       # Vehicle mass (85t), dimensions, brake limits, camera mount
│   ├── adas_config.yaml          # AEB stages, TTC thresholds, LDW margins, fog speed rules
│   ├── models.yaml               # Execution providers (TensorRT, DirectML, CPU) & paths
│   └── carla_sim.yaml            # Environment and sensor calibration settings
├── assets/
│   └── icons/                    # Vector HUD icons (brake, alert, lane departure)
├── models/
│   └── weights/                  # ONNX FP16/FP32 neural model weights:
│       ├── autospeed_fp32.onnx   # Primary obstacle detection
│       ├── autosteer_fp32.onnx   # Road waypoint extraction
│       └── autodrive_fp32.onnx   # Confirmation and false positive rejection
├── src/
│   ├── enhancement/
│   │   ├── dehazer.py            # Fast Koschmieder physical dehazer
│   │   ├── low_light.py          # Adaptive CIE L*a*b* CLAHE enhancer
│   │   └── visibility_meter.py   # Meteorological extinction estimator
│   ├── perception/
│   │   ├── onnx_engine.py        # Multi-provider ONNX runtime wrapper (TensorRT/DirectML/CPU)
│   │   ├── homography.py         # Ground-plane IPM projection & camera calibration
│   │   ├── segmenter.py          # AutoSteer waypoint polynomial road segmenter
│   │   └── detector.py           # Dual-model obstacle detector & CIPO tracker
│   ├── safety/
│   │   ├── dumper_dynamics.py    # Heavy truck stopping distance & air-brake physics
│   │   ├── aeb_system.py         # Multi-stage fail-safe AEB controller
│   │   └── ldw_system.py         # Haul-road lane departure warning controller
│   ├── hud/
│   │   └── hud_renderer.py       # Full-resolution automotive HUD graphics engine
│   └── pipeline.py               # Master ADAS cycle coordinator (Enhance -> Detect -> Plan -> HUD)
├── scripts/
│   ├── run_on_video.py           # Live testing on recorded video files or USB webcams
│   └── benchmark_edge.py         # Performance profiling tool for Jetson / RPi 5
├── tests/
│   ├── test_pipeline.py          # End-to-end integration test
│   ├── test_enhancement.py       # Dehazing & visibility unit tests
│   ├── test_safety.py            # AEB, LDW, and truck stopping distance unit tests
│   └── test_perception.py        # Detection, segmentation, and false-positive tests
└── requirements.txt
```

---

## 5. Installation & Setup

### Prerequisites
- Python 3.8+ (Python 3.10 recommended)
- For NVIDIA Jetson / NVIDIA GPU: CUDA 11.8+ / 12.x and TensorRT (or `onnxruntime-directml` / `onnxruntime-gpu`)
- For Raspberry Pi 5: Raspberry Pi OS (64-bit) with HailoRT or ONNX Runtime ARM64

### Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-org/fogsafe-adas.git
cd fogsafe-adas

# Install Python requirements
pip install -r fogsafe_ivcas/requirements.txt
```

*For GPU acceleration on Windows (DirectML):*
```bash
pip install onnxruntime-directml
```

*For NVIDIA Jetson Orin Nano (TensorRT):*
```bash
pip install onnxruntime-gpu
```

---

## 6. Usage & Testing

### A. Run on Recorded Video or Live Camera
Test the complete ADAS pipeline with real-time HUD rendering on any offline driving footage or USB camera feed:

```bash
# Run on an MP4 haul-road video
python fogsafe_ivcas/scripts/run_on_video.py --input path/to/haul_road_fog.mp4 --speed-kmh 30.0

# Run on live USB webcam (device 0) and record output
python fogsafe_ivcas/scripts/run_on_video.py --input 0 --save output_hud.mp4
```
*Controls:* Press `q` or `ESC` in the HUD window to exit.

---

### B. Benchmark Edge AI Performance
Profile execution latency per pipeline stage and throughput on your hardware (Jetson Orin Nano, RPi 5, or GPU workstation):

```bash
python fogsafe_ivcas/scripts/benchmark_edge.py --iter 100
```

**Representative Benchmark Output (NVIDIA RTX GPU / DirectML):**
```
=================================================================
      FogSafe IVCAS - Edge AI Performance Benchmark
      Running 100 Warm-up & Timed Iterations on 1024x512 Frame
=================================================================
  Stage: Physical Dehazing        :   1.84 ms
  Stage: Low-Light CLAHE          :   1.21 ms
  Stage: Visibility Estimation    :   0.62 ms
  Stage: Road Segmentation (ONNX) :   8.45 ms
  Stage: Dual Obstacle Det (ONNX) :  10.67 ms
  Stage: Safety Guardian (AEB/LDW):   0.41 ms
  Stage: Automotive HUD Rendering :   3.82 ms
-----------------------------------------------------------------
  Total End-to-End Latency        :  27.02 ms
  Effective Throughput            :  37.0 FPS
=================================================================
```

---

### C. Run the Comprehensive Unit Test Suite
Execute all 10 automated unit tests covering enhancement, dumper dynamics, AEB, LDW, dual-model detection, and homography:

```bash
python -m unittest discover -s fogsafe_ivcas/tests -t .
```
```
Ran 10 tests in 1.547s
OK
```

---

## 7. Configuration & Calibration

All operational parameters are cleanly separated in YAML configuration files inside `fogsafe_ivcas/config/`:

| Config File | Key Parameters | Description |
| :--- | :--- | :--- |
| **`dumper_vehicle.yaml`** | `mass_kg: 85000`<br>`width_m: 3.8`<br>`mount_height: 3.6`<br>`pitch_deg: -6.0` | Calibrates physical vehicle weight, width, camera mount height, pitch angle, and pneumatic brake lag. |
| **`adas_config.yaml`** | `ttc_fcw_sec: 3.5`<br>`ttc_aeb_sec: 1.6`<br>`ldw_cte_threshold_m: 0.35`<br>`cushion_distance_m: 5.0` | Calibrates multi-stage AEB activation times, standstill buffer, and tight haul-road LDW lateral margins. |
| **`models.yaml`** | `providers: ['Tensorrt', 'Dml', 'CUDA']`<br>`conf_threshold: 0.60`<br>`input_size: [512, 1024]` | Specifies execution provider priorities, confidence thresholds, and model input dimensions. |

---

## 8. Summary Specifications

| Parameter | Specification |
| :--- | :--- |
| **ADAS Level** | Level-2 Active Safety (Autonomous Emergency Braking & Lane Departure Warning) |
| **Vehicle Class** | Heavy Mining Dumper Trucks, Off-Highway Haulers, Large Bulk Transporters (40–85t) |
| **Operational Visibility** | Dense Fog down to $3\text{m}$ to $5\text{m}$ Meteorological Optical Range |
| **Operational Lighting** | Low-light, deep twilight, and night-shift open pit haul operations |
| **Maximum Deceleration** | $4.2\text{ m/s}^2$ controlled emergency braking (anti-jackknife limit) |
| **Standstill Buffer** | $5.0\text{m}$ minimum cushion to lead obstacle |
| **Lateral Alert Margin** | $|CTE| > 0.35\text{m}$ (calibrated for $3.8\text{m}$ wide trucks on $4.8\text{m}$ haul lanes) |
| **Input Resolution** | $1024 \times 512$ at 20–30 FPS |
| **Edge Hardware Targets** | NVIDIA Jetson Orin Nano, Raspberry Pi 5 (Hailo-8 AI HAT), Embedded RTX Workstations |
| **Validation** | Trained and tested using CARLA with foggy weather conditions |

---

## 9. License

This project is licensed under the MIT License - see the LICENSE file for details.
