#pragma once

#include "Config.hpp"
#include "YOLOv26Detector.hpp"
#include "DistanceEstimator.hpp"
#include <vector>
#include <optional>

namespace adas {

enum class AEBAlertLevel {
    SAFE,            // Green: No imminent collision
    FCW_WARNING,     // Yellow: Forward Collision Warning (beeping / visual caution)
    AEB_EMERGENCY    // Red: Autonomous Emergency Braking triggered (Full braking command)
};

struct SafeDistanceThresholds {
    float stoppingDistanceM = 0.0f;  // Physical distance required to stop
    float safeDistanceM = 0.0f;      // Safe following distance with reaction time
    float criticalDistanceM = 0.0f;  // Point of no return without emergency braking
    float line10mM = 10.0f;
    float line20mM = 20.0f;
    float line30mM = 30.0f;
    float line50mM = 50.0f;
};

struct AEBDecision {
    AEBAlertLevel alertLevel = AEBAlertLevel::SAFE;
    std::optional<DetectedObject> primaryThreatVehicle;
    float currentTtcS = 99.0f;
    float commandedBrakePressurePct = 0.0f; // 0% (no brake) to 100% (full AEB clamp)
    SafeDistanceThresholds thresholds;
    std::string statusText = "AEB STANDBY: NORMAL";
};

class AEBSystem {
public:
    AEBSystem(const AppConfig& config);
    ~AEBSystem() = default;

    // Evaluate detections, identify Closest In-Path Vehicle (CIPV), compute dynamic thresholds & AEB alert
    AEBDecision evaluate(const std::vector<DetectedObject>& objects, 
                         float egoSpeedKmph, 
                         float laneWidthM, 
                         float lateralOffsetM);

    SafeDistanceThresholds calculateThresholds(float egoSpeedKmph) const;

private:
    AppConfig m_config;
    int m_consecutiveCriticalFrames = 0;
};

} // namespace adas
