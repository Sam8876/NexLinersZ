#pragma once

#include "Config.hpp"
#include "YOLOv26Detector.hpp"
#include <opencv2/core.hpp>
#include <vector>

namespace adas {

class DistanceEstimator {
public:
    DistanceEstimator(const AppConfig& config);
    ~DistanceEstimator() = default;

    // Estimate longitudinal distance Z and lateral position X for detected objects
    void estimateDistances(std::vector<DetectedObject>& objects, int frameWidth, int frameHeight);

    // Project real-world ground coordinates (X_m, Z_m) into image pixel coordinates (u, v)
    cv::Point2f projectGroundToImage(float groundX_m, float groundZ_m, int frameWidth, int frameHeight) const;

    // Project image point (u, v) on the ground plane to real-world (X_m, Z_m)
    bool projectImageToGround(cv::Point2f imgPt, float& groundX_m, float& groundZ_m, 
                              int frameWidth, int frameHeight) const;

private:
    AppConfig m_config;
    float m_pitchRad;
};

} // namespace adas
