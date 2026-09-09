#pragma once

#include "Config.hpp"
#include "FastLaneDetector.hpp"
#include "YOLOv26Detector.hpp"
#include "DistanceEstimator.hpp"
#include "AEBSystem.hpp"
#include <opencv2/core.hpp>
#include <vector>

namespace adas {

class HUDVisualizer {
public:
    HUDVisualizer(const AppConfig& config);
    ~HUDVisualizer() = default;

    // Render full ADAS HUD overlay onto the camera frame
    void render(cv::Mat& frame, 
                const LaneDetectionResult& lane, 
                const std::vector<DetectedObject>& objects, 
                const AEBDecision& aebDecision, 
                const DistanceEstimator& distEstimator, 
                float currentFps, 
                float egoSpeedKmph, 
                bool showIPM = false);

private:
    void drawDrivableCorridor(cv::Mat& frame, const LaneDetectionResult& lane, const AEBDecision& aeb);
    void drawSafeDistanceThresholds(cv::Mat& frame, const DistanceEstimator& distEstimator, 
                                    const SafeDistanceThresholds& thresholds, 
                                    float laneWidthM, float lateralOffsetM);
    void drawDetectedObjects(cv::Mat& frame, const std::vector<DetectedObject>& objects, 
                             const AEBDecision& aebDecision);
    void drawCockpitHUD(cv::Mat& frame, const LaneDetectionResult& lane, 
                        const AEBDecision& aebDecision, float currentFps, float egoSpeedKmph);
    void draw3DVehicleBox(cv::Mat& frame, const DetectedObject& obj, const cv::Scalar& color);

    AppConfig m_config;
    int m_flashCounter = 0;
};

} // namespace adas
