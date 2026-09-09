#include "AEBSystem.hpp"
#include <cmath>
#include <algorithm>

namespace adas {

static constexpr float G_ACCEL = 9.80665f; // m/s^2

AEBSystem::AEBSystem(const AppConfig& config)
    : m_config(config) {}

SafeDistanceThresholds AEBSystem::calculateThresholds(float egoSpeedKmph) const {
    SafeDistanceThresholds t;
    float v_mps = std::max(0.0f, egoSpeedKmph * (1000.0f / 3600.0f));
    float mu = m_config.aeb.roadFrictionCoeff;
    float tr = m_config.aeb.driverReactionTimeS;
    float margin = m_config.aeb.safetyMarginM;

    // Physical braking distance: v^2 / (2 * mu * g)
    float brakingDist = (v_mps * v_mps) / (2.0f * mu * G_ACCEL);

    // Reaction distance: v * tr
    float reactionDist = v_mps * tr;

    t.stoppingDistanceM = brakingDist + margin;
    t.safeDistanceM = reactionDist + brakingDist + margin;
    t.criticalDistanceM = brakingDist + margin;

    t.line10mM = 10.0f;
    t.line20mM = 20.0f;
    t.line30mM = 30.0f;
    t.line50mM = 50.0f;

    return t;
}

AEBDecision AEBSystem::evaluate(const std::vector<DetectedObject>& objects,
                                float egoSpeedKmph,
                                float laneWidthM,
                                float lateralOffsetM) {
    AEBDecision decision;
    decision.thresholds = calculateThresholds(egoSpeedKmph);

    // Lateral corridor boundary: vehicles within half a lane width of ego trajectory
    float inPathHalfWidth = (laneWidthM > 2.0f ? laneWidthM * 0.55f : 1.9f);

    float closestInPathDist = 1e6f;
    const DetectedObject* cipv = nullptr;

    for (const auto& obj : objects) {
        // Lateral distance adjusted for ego offset
        float adjustedLatDist = std::abs(obj.lateralDistanceM - lateralOffsetM);

        // Filter objects in host vehicle path and in front (Z > 0)
        if (adjustedLatDist <= inPathHalfWidth && obj.distanceM > 0.5f) {
            if (obj.distanceM < closestInPathDist) {
                closestInPathDist = obj.distanceM;
                cipv = &obj;
            }
        }
    }

    if (cipv != nullptr) {
        decision.primaryThreatVehicle = *cipv;
        decision.currentTtcS = cipv->ttcS;

        float dist = cipv->distanceM;
        float ttc = cipv->ttcS;

        // AEB Emergency Braking trigger check
        bool isCriticalDistance = (dist <= decision.thresholds.criticalDistanceM);
        bool isCriticalTTC = (ttc <= m_config.aeb.ttcCriticalThresholdS);

        // Forward Collision Warning check
        bool isWarningDistance = (dist <= decision.thresholds.safeDistanceM);
        bool isWarningTTC = (ttc <= m_config.aeb.ttcWarningThresholdS);

        if (isCriticalDistance || isCriticalTTC) {
            m_consecutiveCriticalFrames++;
            // Require 2 consecutive frames to avoid sensor glitch false triggers
            if (m_consecutiveCriticalFrames >= 2) {
                decision.alertLevel = AEBAlertLevel::AEB_EMERGENCY;
                decision.commandedBrakePressurePct = 100.0f;
                decision.statusText = "! EMERGENCY BRAKE: AEB ACTIVATED !";
            } else {
                decision.alertLevel = AEBAlertLevel::FCW_WARNING;
                decision.commandedBrakePressurePct = 40.0f;
                decision.statusText = "FCW CAUTION: CRITICAL PROXIMITY";
            }
        } else if (isWarningDistance || isWarningTTC) {
            m_consecutiveCriticalFrames = 0;
            decision.alertLevel = AEBAlertLevel::FCW_WARNING;
            decision.commandedBrakePressurePct = 25.0f;
            decision.statusText = "FCW WARNING: REDUCE SPEED / INCREASE GAP";
        } else {
            m_consecutiveCriticalFrames = 0;
            decision.alertLevel = AEBAlertLevel::SAFE;
            decision.commandedBrakePressurePct = 0.0f;
            decision.statusText = "AEB ACTIVE: SAFE FOLLOWING DISTANCE";
        }
    } else {
        m_consecutiveCriticalFrames = 0;
        decision.alertLevel = AEBAlertLevel::SAFE;
        decision.commandedBrakePressurePct = 0.0f;
        decision.statusText = "AEB ACTIVE: CLEAR PATH";
    }

    return decision;
}

} // namespace adas
