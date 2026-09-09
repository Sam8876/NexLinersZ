#include <iostream>
#include <string>
#include <opencv2/opencv.hpp>

#include "Config.hpp"
#include "FastLaneDetector.hpp"
#include "YOLOv26Detector.hpp"
#include "DistanceEstimator.hpp"
#include "AEBSystem.hpp"
#include "HUDVisualizer.hpp"
#include "PipelineManager.hpp"

static void printUsage(const char* progName) {
    std::cout << "\n========================================================================\n"
              << " NMDC ADAS Edge Vision — Raspberry Pi 5 ARM Cortex-A76 Optimized\n"
              << " System: Lane Keeping Assist (LKA) & Autonomous Emergency Braking (AEB)\n"
              << " AI/ML Architecture: YOLOv26 ONNX | Target: 40 - 60 FPS\n"
              << "========================================================================\n\n"
              << "Usage: " << progName << " [options]\n\n"
              << "Options:\n"
              << "  --video <path>       Path to video file (dashcam, haul road, test stream)\n"
              << "  --cam <index>        Live camera device index (default: 0 if no video given)\n"
              << "  --config <path>      Path to calibration YAML (default: config/camera_calibration.yaml)\n"
              << "  --model <path>       Path to YOLOv26 ONNX model (default: models/yolov26n.onnx)\n"
              << "  --speed <kmph>       Simulated ego speed in km/h (default: 35.0)\n"
              << "  --min-fps <fps>      Minimum target FPS bound (default: 40.0)\n"
              << "  --max-fps <fps>      Maximum target FPS bound (default: 60.0)\n"
              << "  --no-pacer           Disable frame pacer (run at unconstrained speed)\n"
              << "  --help               Display this help message\n\n"
              << "Interactive Controls:\n"
              << "  [Space]   Pause / Resume video playback\n"
              << "  [l / L]   Toggle IPM Bird's Eye View overlay\n"
              << "  [h / H]   Toggle HUD telemetry graphics\n"
              << "  [+ / =]   Increase ego vehicle speed by 5 km/h\n"
              << "  [- / _]   Decrease ego vehicle speed by 5 km/h\n"
              << "  [q / ESC] Exit program\n"
              << "========================================================================\n\n";
}

int main(int argc, char** argv) {
    std::string videoPath = "";
    int camIndex = -1;
    std::string configPath = "config/camera_calibration.yaml";
    std::string modelPath = "models/yolov26n.onnx";
    float egoSpeedKmph = 35.0f;
    float minFPS = 40.0f;
    float maxFPS = 60.0f;
    bool enablePacer = true;

    // Parse command line arguments
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--video" && i + 1 < argc) {
            videoPath = argv[++i];
        } else if (arg == "--cam" && i + 1 < argc) {
            camIndex = std::stoi(argv[++i]);
        } else if (arg == "--config" && i + 1 < argc) {
            configPath = argv[++i];
        } else if (arg == "--model" && i + 1 < argc) {
            modelPath = argv[++i];
        } else if (arg == "--speed" && i + 1 < argc) {
            egoSpeedKmph = std::stof(argv[++i]);
        } else if (arg == "--min-fps" && i + 1 < argc) {
            minFPS = std::stof(argv[++i]);
        } else if (arg == "--max-fps" && i + 1 < argc) {
            maxFPS = std::stof(argv[++i]);
        } else if (arg == "--no-pacer") {
            enablePacer = false;
        } else if (arg == "--help") {
            printUsage(argv[0]);
            return 0;
        }
    }

    // 1. Load System Configuration
    adas::AppConfig config;
    config.loadFromFile(configPath);
    config.yolo.modelPath = modelPath;
    config.perf.minTargetFPS = minFPS;
    config.perf.maxTargetFPS = maxFPS;
    config.perf.enableFramePacer = enablePacer;
    config.printSummary();

    // 2. Open Video Capture Source
    cv::VideoCapture cap;
    if (!videoPath.empty()) {
        std::cout << "[Input] Opening video file: " << videoPath << "\n";
        cap.open(videoPath);
    } else {
        if (camIndex < 0) camIndex = 0;
        std::cout << "[Input] Opening live camera index: " << camIndex << "\n";
        cap.open(camIndex);
    }

    if (!cap.isOpened()) {
        std::cerr << "[Error] Failed to open video source. Please verify file path or camera connection.\n";
        printUsage(argv[0]);
        return -1;
    }

    int frameWidth = static_cast<int>(cap.get(cv::CAP_PROP_FRAME_WIDTH));
    int frameHeight = static_cast<int>(cap.get(cv::CAP_PROP_FRAME_HEIGHT));
    std::cout << "[Camera] Stream Resolution: " << frameWidth << "x" << frameHeight << "\n";

    // 3. Initialize ADAS Core Modules
    std::cout << "[Init] Initializing Fast Lane Detector (IPM & LKA)...\n";
    adas::FastLaneDetector laneDetector(config);

    std::cout << "[Init] Initializing YOLOv26 Object Detector (ARM Cortex-A76 NEON)...\n";
    adas::YOLOv26Detector yoloDetector(config);

    std::cout << "[Init] Initializing Pinhole Distance Estimator & Ground Mapping...\n";
    adas::DistanceEstimator distEstimator(config);

    std::cout << "[Init] Initializing AEB & Safe Following Distance System...\n";
    adas::AEBSystem aebSystem(config);

    std::cout << "[Init] Initializing Augmented Reality Cockpit HUD Visualizer...\n";
    adas::HUDVisualizer hud(config);

    std::cout << "[Init] Initializing Frame Pacer (Target: " << minFPS << " - " << maxFPS << " FPS)...\n";
    adas::FramePacer pacer(minFPS, maxFPS, enablePacer);

    const std::string windowName = "NMDC ADAS Vision — Raspberry Pi 5 [YOLOv26 | LKA | AEB]";
    cv::namedWindow(windowName, cv::WINDOW_NORMAL);
    cv::resizeWindow(windowName, 1280, 720);

    bool paused = false;
    bool showIPM = true;
    bool showHUD = true;
    cv::Mat frame;

    auto lastTime = std::chrono::high_resolution_clock::now();

    std::cout << "\n[System] ADAS Vision Pipeline Running. Press 'q' or 'ESC' to quit.\n";

    // 4. Real-Time Processing Loop
    while (true) {
        if (!paused) {
            pacer.startFrame();

            if (!cap.read(frame) || frame.empty()) {
                if (!videoPath.empty()) {
                    // Loop video automatically for demonstration
                    std::cout << "[Input] End of video. Rewinding to start.\n";
                    cap.set(cv::CAP_PROP_POS_FRAMES, 0);
                    continue;
                } else {
                    std::cerr << "[Error] Lost camera connection.\n";
                    break;
                }
            }

            auto currentTime = std::chrono::high_resolution_clock::now();
            float dt = std::chrono::duration<float>(currentTime - lastTime).count();
            lastTime = currentTime;

            // Pipeline Step 1: Real-time Lane Marking & LKA Detection
            adas::LaneDetectionResult laneResult = laneDetector.process(frame);

            // Pipeline Step 2: AI/ML YOLOv26 Obstacle & Vehicle Detection
            std::vector<adas::DetectedObject> objects = yoloDetector.detect(frame);

            // Pipeline Step 3: Pinhole Geometry Distance & Ground Position Estimation
            distEstimator.estimateDistances(objects, frame.cols, frame.rows);

            // Pipeline Step 4: Multi-frame Vehicle Tracking & Time-To-Collision (TTC)
            yoloDetector.trackObjects(objects, dt);

            // Pipeline Step 5: Safe Distance Threshold Marking & AEB Trigger Logic
            adas::AEBDecision aebDecision = aebSystem.evaluate(
                objects, 
                egoSpeedKmph, 
                laneResult.laneWidthM, 
                laneResult.lateralOffsetM
            );

            // Pipeline Step 6: Augmented Reality Cockpit HUD & Visual Threshold Rendering
            if (showHUD) {
                hud.render(frame, laneResult, objects, aebDecision, distEstimator, 
                           pacer.getCurrentFPS(), egoSpeedKmph, showIPM);
            }

            // Display Frame
            cv::imshow(windowName, frame);

            // Step 7: Enforce 40 - 60 FPS frame rate pacing
            pacer.endFrameAndPace();
        }

        // Handle User Keyboard Input
        int key = cv::waitKey(paused ? 30 : 1);
        if (key == 27 || key == 'q' || key == 'Q') { // ESC or q
            std::cout << "[System] Exiting ADAS Vision Pipeline.\n";
            break;
        } else if (key == 32) { // Space
            paused = !paused;
            std::cout << "[System] Playback " << (paused ? "PAUSED" : "RESUMED") << "\n";
        } else if (key == 'l' || key == 'L') {
            showIPM = !showIPM;
            std::cout << "[System] IPM PIP view " << (showIPM ? "ENABLED" : "DISABLED") << "\n";
        } else if (key == 'h' || key == 'H') {
            showHUD = !showHUD;
            std::cout << "[System] HUD overlay " << (showHUD ? "ENABLED" : "DISABLED") << "\n";
        } else if (key == '+' || key == '=') {
            egoSpeedKmph += 5.0f;
            std::cout << "[Vehicle] Ego Speed increased to: " << egoSpeedKmph << " km/h\n";
        } else if (key == '-' || key == '_') {
            egoSpeedKmph = std::max(0.0f, egoSpeedKmph - 5.0f);
            std::cout << "[Vehicle] Ego Speed decreased to: " << egoSpeedKmph << " km/h\n";
        }
    }

    cap.release();
    cv::destroyAllWindows();
    return 0;
}
