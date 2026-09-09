#pragma once

#include "Config.hpp"
#include <opencv2/core.hpp>
#include <opencv2/dnn.hpp>
#include <vector>
#include <string>
#include <memory>

namespace adas {

struct DetectedObject {
    int id = -1;
    int classId = 0;
    std::string className;
    float confidence = 0.0f;
    cv::Rect2f box;               // 2D bounding box on input frame
    cv::Point2f groundContactPt;  // Center-bottom of bounding box on road
    float distanceM = 0.0f;       // Estimated longitudinal distance (m)
    float lateralDistanceM = 0.0f;// Estimated lateral distance (m)
    float relativeSpeedKmph = 0.0f;// Relative velocity (km/h, negative = closing in)
    float ttcS = 99.0f;           // Time-To-Collision in seconds
    int missedFrames = 0;
};

class YOLOv26Detector {
public:
    YOLOv26Detector(const AppConfig& config);
    ~YOLOv26Detector() = default;

    // Load YOLOv26 ONNX model and configure for ARM Cortex-A76 CPU
    bool loadModel(const std::string& modelPath);

    // Detect obstacles & vehicles in the given frame
    std::vector<DetectedObject> detect(const cv::Mat& frame);

    // Track objects across frames to compute relative velocity and smooth boxes
    void trackObjects(std::vector<DetectedObject>& detections, float dt);

    bool isModelLoaded() const { return m_modelLoaded; }

private:
    cv::Mat preprocess(const cv::Mat& frame, float& outScale, int& outPadX, int& outPadY);
    std::vector<DetectedObject> postprocess(const cv::Mat& outputTensor, const cv::Mat& frame, 
                                            float scale, int padX, int padY);
    std::vector<DetectedObject> heuristicFallbackDetect(const cv::Mat& frame);

    AppConfig m_config;
    cv::dnn::Net m_net;
    bool m_modelLoaded = false;
    std::vector<std::string> m_classNames;
    std::vector<DetectedObject> m_trackedObjects;
    int m_nextObjectId = 1;
    int m_frameCounter = 0;
    std::vector<DetectedObject> m_lastDetections;
};

} // namespace adas
