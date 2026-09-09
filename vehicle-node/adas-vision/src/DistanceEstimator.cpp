#include "DistanceEstimator.hpp"
#include <cmath>
#include <algorithm>

namespace adas {

static constexpr float PI_F = 3.14159265358979323846f;

DistanceEstimator::DistanceEstimator(const AppConfig& config)
    : m_config(config) {
    m_pitchRad = m_config.camera.pitchAngleDeg * (PI_F / 180.0f);
}

void DistanceEstimator::estimateDistances(std::vector<DetectedObject>& objects, int frameWidth, int frameHeight) {
    float H = m_config.camera.mountHeightM;
    float fy = m_config.camera.focalLengthPx * (static_cast<float>(frameHeight) / m_config.camera.imageHeight);
    float fx = m_config.camera.focalLengthPx * (static_cast<float>(frameWidth) / m_config.camera.imageWidth);
    float cy = frameHeight * 0.5f;
    float cx = frameWidth * 0.5f;

    for (auto& obj : objects) {
        float u = obj.groundContactPt.x;
        float v = obj.groundContactPt.y;

        // Angle alpha relative to optical axis
        float alpha = std::atan((v - cy) / fy);
        float totalAngle = m_pitchRad + alpha;

        if (totalAngle > 0.01f) {
            float Z = H / std::tan(totalAngle);
            // Realistic clamping for forward vehicular camera
            Z = std::max(1.0f, std::min(Z, 150.0f));
            float X = ((u - cx) * Z) / fx;

            obj.distanceM = Z;
            obj.lateralDistanceM = X;
        } else {
            // Point above horizon
            obj.distanceM = 150.0f;
            obj.lateralDistanceM = 0.0f;
        }
    }
}

cv::Point2f DistanceEstimator::projectGroundToImage(float groundX_m, float groundZ_m, 
                                                   int frameWidth, int frameHeight) const {
    if (groundZ_m <= 0.1f) return cv::Point2f(-1.0f, -1.0f);

    float H = m_config.camera.mountHeightM;
    float fy = m_config.camera.focalLengthPx * (static_cast<float>(frameHeight) / m_config.camera.imageHeight);
    float fx = m_config.camera.focalLengthPx * (static_cast<float>(frameWidth) / m_config.camera.imageWidth);
    float cy = frameHeight * 0.5f;
    float cx = frameWidth * 0.5f;

    // Total downward angle from vehicle to ground point
    float beta = std::atan2(H, groundZ_m);
    float alpha = beta - m_pitchRad;

    float v = cy + fy * std::tan(alpha);
    float u = cx + (groundX_m * fx) / groundZ_m;

    return cv::Point2f(u, v);
}

bool DistanceEstimator::projectImageToGround(cv::Point2f imgPt, float& groundX_m, float& groundZ_m, 
                                            int frameWidth, int frameHeight) const {
    float H = m_config.camera.mountHeightM;
    float fy = m_config.camera.focalLengthPx * (static_cast<float>(frameHeight) / m_config.camera.imageHeight);
    float fx = m_config.camera.focalLengthPx * (static_cast<float>(frameWidth) / m_config.camera.imageWidth);
    float cy = frameHeight * 0.5f;
    float cx = frameWidth * 0.5f;

    float alpha = std::atan((imgPt.y - cy) / fy);
    float totalAngle = m_pitchRad + alpha;

    if (totalAngle <= 0.01f) {
        return false; // Above ground horizon
    }

    groundZ_m = H / std::tan(totalAngle);
    groundX_m = ((imgPt.x - cx) * groundZ_m) / fx;
    return true;
}

} // namespace adas
