#pragma once

#include <string>
#include <vector>
#include <opencv2/core.hpp>

namespace adas {

struct CameraParams {
    float focalLengthPx = 950.0f;
    float principalX = 640.0f;
    float principalY = 360.0f;
    float mountHeightM = 2.2f;
    float pitchAngleDeg = 4.5f;
    int imageWidth = 1280;
    int imageHeight = 720;
};

struct IPMParams {
    int warpWidth = 480;
    int warpHeight = 640;
    float srcTopLeftX = 0.43f;
    float srcTopLeftY = 0.62f;
    float srcTopRightX = 0.57f;
    float srcTopRightY = 0.62f;
    float srcBottomLeftX = 0.15f;
    float srcBottomLeftY = 0.95f;
    float srcBottomRightX = 0.88f;
    float srcBottomRightY = 0.95f;
    float metersPerPixelY = 0.045f;
    float metersPerPixelX = 0.0075f;
};

struct YOLOv26Config {
    std::string modelPath = "models/yolov26n.onnx";
    int inputWidth = 416;
    int inputHeight = 416;
    float confThreshold = 0.40f;
    float nmsThreshold = 0.45f;
    int inferenceIntervalFrames = 2; // Decoupled execution: every 2nd frame
    bool useFP16 = true;
};

struct AEBParams {
    float driverReactionTimeS = 1.2f;
    float roadFrictionCoeff = 0.55f;
    float safetyMarginM = 3.0f;
    float ttcWarningThresholdS = 3.0f;
    float ttcCriticalThresholdS = 1.6f;
    float simulatedEgoSpeedKmph = 35.0f;
};

struct LKAParams {
    float nominalLaneWidthM = 3.6f;
    float warningThresholdM = 0.35f;
    float criticalThresholdM = 0.60f;
};

struct PerformanceConfig {
    float minTargetFPS = 40.0f;
    float maxTargetFPS = 60.0f;
    bool enableFramePacer = true;
    int numWorkerThreads = 4;
};

class AppConfig {
public:
    CameraParams camera;
    IPMParams ipm;
    YOLOv26Config yolo;
    AEBParams aeb;
    LKAParams lka;
    PerformanceConfig perf;

    bool loadFromFile(const std::string& configPath);
    void printSummary() const;
};

} // namespace adas
