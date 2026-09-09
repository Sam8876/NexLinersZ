#include "HUDVisualizer.hpp"
#include <opencv2/imgproc.hpp>
#include <iomanip>
#include <sstream>
#include <cmath>

namespace adas {

HUDVisualizer::HUDVisualizer(const AppConfig& config)
    : m_config(config) {}

void HUDVisualizer::drawDrivableCorridor(cv::Mat& frame, const LaneDetectionResult& lane, 
                                        const AEBDecision& aeb) {
    if (!lane.detected || lane.laneCorridorPolygonOrig.empty()) return;

    // Pick corridor color based on AEB threat or LKA status
    cv::Scalar corridorColor;
    if (aeb.alertLevel == AEBAlertLevel::AEB_EMERGENCY) {
        corridorColor = cv::Scalar(0, 0, 220); // Emergency Red
    } else if (aeb.alertLevel == AEBAlertLevel::FCW_WARNING) {
        corridorColor = cv::Scalar(0, 180, 240); // Caution Yellow
    } else if (lane.departureState == LKADepartureState::CRITICAL_LEFT || 
               lane.departureState == LKADepartureState::CRITICAL_RIGHT) {
        corridorColor = cv::Scalar(0, 70, 230); // Departure Red
    } else if (lane.departureState == LKADepartureState::WARNING_LEFT || 
               lane.departureState == LKADepartureState::WARNING_RIGHT) {
        corridorColor = cv::Scalar(0, 200, 255); // Warning Amber
    } else {
        corridorColor = cv::Scalar(40, 220, 60); // Centered Green
    }

    // Blend filled corridor onto frame
    cv::Mat overlay = frame.clone();
    std::vector<std::vector<cv::Point>> polys = { lane.laneCorridorPolygonOrig };
    cv::fillPoly(overlay, polys, corridorColor);
    cv::addWeighted(overlay, 0.28, frame, 0.72, 0.0, frame);

    // Draw solid lane boundaries
    for (size_t i = 1; i < lane.leftLanePointsOrig.size(); ++i) {
        cv::line(frame, lane.leftLanePointsOrig[i - 1], lane.leftLanePointsOrig[i], 
                 cv::Scalar(255, 255, 255), 3, cv::LINE_AA);
    }
    for (size_t i = 1; i < lane.rightLanePointsOrig.size(); ++i) {
        cv::line(frame, lane.rightLanePointsOrig[i - 1], lane.rightLanePointsOrig[i], 
                 cv::Scalar(255, 255, 255), 3, cv::LINE_AA);
    }
}

void HUDVisualizer::drawSafeDistanceThresholds(cv::Mat& frame, const DistanceEstimator& distEstimator, 
                                               const SafeDistanceThresholds& thresholds, 
                                               float laneWidthM, float lateralOffsetM) {
    int w = frame.cols;
    int h = frame.rows;
    float halfWidth = (laneWidthM > 2.0f ? laneWidthM * 0.5f : 1.8f);

    struct DistanceMarker {
        float distanceM;
        cv::Scalar color;
        std::string label;
        bool isDynamicThreshold;
    };

    std::vector<DistanceMarker> markers = {
        { thresholds.criticalDistanceM, cv::Scalar(0, 0, 255), "AEB CRITICAL BRAKE", true },
        { thresholds.safeDistanceM, cv::Scalar(0, 215, 255), "SAFE GAP THRESHOLD", true },
        { 10.0f, cv::Scalar(0, 0, 200), "10m DANGER", false },
        { 20.0f, cv::Scalar(0, 140, 255), "20m CAUTION", false },
        { 30.0f, cv::Scalar(0, 220, 220), "30m WATCH", false },
        { 50.0f, cv::Scalar(50, 205, 50), "50m SAFE", false }
    };

    for (const auto& marker : markers) {
        if (marker.distanceM < 2.0f || marker.distanceM > 90.0f) continue;

        // Project left and right boundary of the threshold line on the road
        float leftX = -halfWidth + lateralOffsetM;
        float rightX = halfWidth + lateralOffsetM;

        cv::Point2f ptLeft = distEstimator.projectGroundToImage(leftX, marker.distanceM, w, h);
        cv::Point2f ptRight = distEstimator.projectGroundToImage(rightX, marker.distanceM, w, h);

        if (ptLeft.y > 0 && ptLeft.y < h && ptRight.y > 0 && ptRight.y < h) {
            int thickness = marker.isDynamicThreshold ? 3 : 2;
            int lineType = marker.isDynamicThreshold ? cv::LINE_AA : cv::LINE_4;

            // Draw line across host vehicle's travel lane
            cv::line(frame, ptLeft, ptRight, marker.color, thickness, lineType);

            // Distance & status label
            std::ostringstream ss;
            ss << marker.label << " (" << std::fixed << std::setprecision(1) << marker.distanceM << "m)";
            cv::Point labelPt(static_cast<int>(ptRight.x + 8), static_cast<int>(ptRight.y + 4));

            if (labelPt.x < w - 180) {
                cv::putText(frame, ss.str(), labelPt, cv::FONT_HERSHEY_SIMPLEX, 0.40, 
                            cv::Scalar(0, 0, 0), 2, cv::LINE_AA);
                cv::putText(frame, ss.str(), labelPt, cv::FONT_HERSHEY_SIMPLEX, 0.40, 
                            marker.color, 1, cv::LINE_AA);
            }
        }
    }
}

void HUDVisualizer::draw3DVehicleBox(cv::Mat& frame, const DetectedObject& obj, const cv::Scalar& color) {
    // Render 3D-styled bounding corner brackets
    cv::Rect2f b = obj.box;
    int cornerLen = std::min(static_cast<int>(b.width * 0.25f), 18);
    int x1 = static_cast<int>(b.x);
    int y1 = static_cast<int>(b.y);
    int x2 = static_cast<int>(b.x + b.width);
    int y2 = static_cast<int>(b.y + b.height);

    // Top-Left
    cv::line(frame, cv::Point(x1, y1), cv::Point(x1 + cornerLen, y1), color, 2);
    cv::line(frame, cv::Point(x1, y1), cv::Point(x1, y1 + cornerLen), color, 2);
    // Top-Right
    cv::line(frame, cv::Point(x2, y1), cv::Point(x2 - cornerLen, y1), color, 2);
    cv::line(frame, cv::Point(x2, y1), cv::Point(x2, y1 + cornerLen), color, 2);
    // Bottom-Left
    cv::line(frame, cv::Point(x1, y2), cv::Point(x1 + cornerLen, y2), color, 2);
    cv::line(frame, cv::Point(x1, y2), cv::Point(x1, y2 - cornerLen), color, 2);
    // Bottom-Right
    cv::line(frame, cv::Point(x2, y2), cv::Point(x2 - cornerLen, y2), color, 2);
    cv::line(frame, cv::Point(x2, y2), cv::Point(x2, y2 - cornerLen), color, 2);

    // Ground contact marker dot
    cv::circle(frame, cv::Point(cvRound(obj.groundContactPt.x), cvRound(obj.groundContactPt.y)), 
               4, color, -1);
}

void HUDVisualizer::drawDetectedObjects(cv::Mat& frame, const std::vector<DetectedObject>& objects, 
                                       const AEBDecision& aebDecision) {
    for (const auto& obj : objects) {
        bool isCIPV = aebDecision.primaryThreatVehicle.has_value() && 
                      (aebDecision.primaryThreatVehicle->id == obj.id);

        cv::Scalar boxColor;
        if (isCIPV) {
            if (aebDecision.alertLevel == AEBAlertLevel::AEB_EMERGENCY) {
                boxColor = cv::Scalar(0, 0, 255); // Red Emergency
            } else if (aebDecision.alertLevel == AEBAlertLevel::FCW_WARNING) {
                boxColor = cv::Scalar(0, 200, 255); // Yellow Caution
            } else {
                boxColor = cv::Scalar(255, 200, 0); // Cyan Tracked Lead
            }
        } else {
            boxColor = cv::Scalar(200, 200, 200); // Standard Grey/White
        }

        draw3DVehicleBox(frame, obj, boxColor);

        // HUD Target Badge above bounding box
        std::ostringstream ss;
        ss << "[" << obj.className << " #" << obj.id << "] " 
           << std::fixed << std::setprecision(1) << obj.distanceM << "m";

        std::ostringstream ss2;
        if (obj.ttcS < 20.0f) {
            ss2 << "TTC: " << std::fixed << std::setprecision(1) << obj.ttcS << "s | "
                << std::showpos << cvRound(obj.relativeSpeedKmph) << " km/h";
        } else {
            ss2 << "SAFE | " << std::showpos << cvRound(obj.relativeSpeedKmph) << " km/h";
        }

        int textY = std::max(25, static_cast<int>(obj.box.y) - 10);
        cv::Point badgePt(static_cast<int>(obj.box.x), textY);

        // Badge background
        cv::Rect badgeRect(badgePt.x - 2, badgePt.y - 22, 160, 24);
        cv::rectangle(frame, badgeRect, cv::Scalar(20, 20, 20), -1);
        cv::rectangle(frame, badgeRect, boxColor, 1);

        cv::putText(frame, ss.str(), cv::Point(badgePt.x + 2, badgePt.y - 10), 
                    cv::FONT_HERSHEY_SIMPLEX, 0.38, cv::Scalar(255, 255, 255), 1, cv::LINE_AA);
        cv::putText(frame, ss2.str(), cv::Point(badgePt.x + 2, badgePt.y - 1), 
                    cv::FONT_HERSHEY_SIMPLEX, 0.34, boxColor, 1, cv::LINE_AA);
    }
}

void HUDVisualizer::drawCockpitHUD(cv::Mat& frame, const LaneDetectionResult& lane, 
                                  const AEBDecision& aebDecision, float currentFps, float egoSpeedKmph) {
    int w = frame.cols;
    int h = frame.rows;
    m_flashCounter = (m_flashCounter + 1) % 60;

    // 1. Top Cockpit Telemetry Bar
    cv::Rect topBar(0, 0, w, 46);
    cv::Mat topOverlay = frame(topBar).clone();
    cv::rectangle(topOverlay, cv::Rect(0, 0, w, 46), cv::Scalar(15, 18, 22), -1);
    cv::addWeighted(topOverlay, 0.75, frame(topBar), 0.25, 0.0, frame(topBar));
    cv::line(frame, cv::Point(0, 46), cv::Point(w, 46), cv::Scalar(70, 70, 70), 1);

    // Speed & FPS
    std::ostringstream ssSpeed;
    ssSpeed << "SPEED: " << std::fixed << std::setprecision(0) << egoSpeedKmph << " KM/H";
    cv::putText(frame, ssSpeed.str(), cv::Point(20, 30), cv::FONT_HERSHEY_DUPLEX, 0.65, 
                cv::Scalar(255, 255, 255), 1, cv::LINE_AA);

    std::ostringstream ssFps;
    ssFps << "FPS: " << std::fixed << std::setprecision(1) << currentFps << " [Pi5 Cortex-A76]";
    cv::putText(frame, ssFps.str(), cv::Point(240, 30), cv::FONT_HERSHEY_SIMPLEX, 0.50, 
                (currentFps >= 40.0f ? cv::Scalar(50, 220, 50) : cv::Scalar(0, 165, 255)), 1, cv::LINE_AA);

    // AI Model Tag
    cv::putText(frame, "AI: YOLOv26 NEON SIMD", cv::Point(490, 30), cv::FONT_HERSHEY_SIMPLEX, 
                0.50, cv::Scalar(240, 180, 0), 1, cv::LINE_AA);

    // 2. LKA Departure Gauge
    int gaugeX = w - 340;
    int gaugeY = 28;
    cv::putText(frame, "LKA:", cv::Point(gaugeX - 45, gaugeY), cv::FONT_HERSHEY_SIMPLEX, 
                0.45, cv::Scalar(220, 220, 220), 1, cv::LINE_AA);

    // Draw offset meter bar [-0.8m ... 0 ... +0.8m]
    cv::line(frame, cv::Point(gaugeX, gaugeY - 6), cv::Point(gaugeX + 160, gaugeY - 6), 
             cv::Scalar(100, 100, 100), 2);
    cv::line(frame, cv::Point(gaugeX + 80, gaugeY - 12), cv::Point(gaugeX + 80, gaugeY), 
             cv::Scalar(255, 255, 255), 2); // Center notch

    int markerPos = gaugeX + 80 + cvRound((lane.lateralOffsetM / 0.8f) * 80.0f);
    markerPos = std::max(gaugeX, std::min(gaugeX + 160, markerPos));

    cv::Scalar lkaColor = cv::Scalar(50, 220, 50);
    if (lane.departureState == LKADepartureState::CRITICAL_LEFT || 
        lane.departureState == LKADepartureState::CRITICAL_RIGHT) {
        lkaColor = cv::Scalar(0, 0, 255);
    } else if (lane.departureState == LKADepartureState::WARNING_LEFT || 
               lane.departureState == LKADepartureState::WARNING_RIGHT) {
        lkaColor = cv::Scalar(0, 200, 255);
    }

    cv::circle(frame, cv::Point(markerPos, gaugeY - 6), 5, lkaColor, -1);

    std::ostringstream ssOffset;
    ssOffset << std::showpos << std::fixed << std::setprecision(2) << lane.lateralOffsetM << "m";
    cv::putText(frame, ssOffset.str(), cv::Point(gaugeX + 170, gaugeY), cv::FONT_HERSHEY_SIMPLEX, 
                0.45, lkaColor, 1, cv::LINE_AA);

    // 3. Emergency AEB Flashing Banner (if emergency braking is active)
    if (aebDecision.alertLevel == AEBAlertLevel::AEB_EMERGENCY) {
        bool flashOn = (m_flashCounter / 15) % 2 == 0;
        if (flashOn) {
            int bannerH = 50;
            int bannerY = h - 90;
            cv::Rect alertRect(w / 4, bannerY, w / 2, bannerH);
            cv::Mat alertOverlay = frame(alertRect).clone();
            cv::rectangle(alertOverlay, cv::Rect(0, 0, alertRect.width, bannerH), cv::Scalar(0, 0, 200), -1);
            cv::addWeighted(alertOverlay, 0.85, frame(alertRect), 0.15, 0.0, frame(alertRect));
            cv::rectangle(frame, alertRect, cv::Scalar(255, 255, 255), 2);

            std::string alertMsg = ">>> EMERGENCY BRAKING: AEB ENGAGED <<<";
            cv::putText(frame, alertMsg, cv::Point(alertRect.x + 25, bannerY + 32), 
                        cv::FONT_HERSHEY_DUPLEX, 0.65, cv::Scalar(255, 255, 255), 2, cv::LINE_AA);
        }
    } else if (aebDecision.alertLevel == AEBAlertLevel::FCW_WARNING) {
        int bannerH = 36;
        int bannerY = h - 75;
        cv::Rect alertRect(w / 3, bannerY, w / 3, bannerH);
        cv::Mat alertOverlay = frame(alertRect).clone();
        cv::rectangle(alertOverlay, cv::Rect(0, 0, alertRect.width, bannerH), cv::Scalar(0, 160, 230), -1);
        cv::addWeighted(alertOverlay, 0.80, frame(alertRect), 0.20, 0.0, frame(alertRect));
        cv::rectangle(frame, alertRect, cv::Scalar(255, 255, 255), 1);

        std::string alertMsg = "COLLISION WARNING: IMMINENT IMPACT";
        cv::putText(frame, alertMsg, cv::Point(alertRect.x + 15, bannerY + 24), 
                    cv::FONT_HERSHEY_SIMPLEX, 0.52, cv::Scalar(0, 0, 0), 2, cv::LINE_AA);
        cv::putText(frame, alertMsg, cv::Point(alertRect.x + 15, bannerY + 24), 
                    cv::FONT_HERSHEY_SIMPLEX, 0.52, cv::Scalar(255, 255, 255), 1, cv::LINE_AA);
    }
}

void HUDVisualizer::render(cv::Mat& frame, 
                           const LaneDetectionResult& lane, 
                           const std::vector<DetectedObject>& objects, 
                           const AEBDecision& aebDecision, 
                           const DistanceEstimator& distEstimator, 
                           float currentFps, 
                           float egoSpeedKmph, 
                           bool showIPM) {
    if (frame.empty()) return;

    // 1. Draw Drivable Corridor
    drawDrivableCorridor(frame, lane, aebDecision);

    // 2. Draw Distance Thresholds onto road surface
    drawSafeDistanceThresholds(frame, distEstimator, aebDecision.thresholds, 
                               lane.laneWidthM, lane.lateralOffsetM);

    // 3. Draw Detected Vehicles / Obstacles
    drawDetectedObjects(frame, objects, aebDecision);

    // 4. Draw Cockpit ADAS Telemetry HUD
    drawCockpitHUD(frame, lane, aebDecision, currentFps, egoSpeedKmph);

    // 5. Optional IPM Picture-in-Picture window for debugging lane detection
    if (showIPM && !lane.birdEyeViewBinary.empty()) {
        int pipW = 160;
        int pipH = 200;
        cv::Mat pip;
        cv::cvtColor(lane.birdEyeViewBinary, pip, cv::COLOR_GRAY2BGR);
        cv::resize(pip, pip, cv::Size(pipW, pipH));
        cv::Rect pipRect(frame.cols - pipW - 15, 60, pipW, pipH);
        pip.copyTo(frame(pipRect));
        cv::rectangle(frame, pipRect, cv::Scalar(255, 255, 255), 1);
        cv::putText(frame, "IPM VIEW", cv::Point(pipRect.x + 8, pipRect.y + 18), 
                    cv::FONT_HERSHEY_SIMPLEX, 0.40, cv::Scalar(0, 255, 255), 1);
    }
}

} // namespace adas
