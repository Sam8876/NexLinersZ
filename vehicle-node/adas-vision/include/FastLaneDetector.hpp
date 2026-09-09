#pragma once

#include "Config.hpp"
#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <vector>

namespace adas {

enum class LKADepartureState {
    NORMAL,
    WARNING_LEFT,
    WARNING_RIGHT,
    CRITICAL_LEFT,
    CRITICAL_RIGHT,
    NO_LANES_DETECTED
};

struct PolynomialCoeffs {
    float a = 0.0f; // x = a*y^2 + b*y + c
    float b = 0.0f;
    float c = 0.0f;
    bool valid = false;

    float eval(float y) const {
        return a * y * y + b * y + c;
    }
};

struct LaneDetectionResult {
    bool detected = false;
    PolynomialCoeffs leftPoly;
    PolynomialCoeffs rightPoly;
    std::vector<cv::Point2f> leftLanePointsOrig;   // Projected back onto camera view
    std::vector<cv::Point2f> rightLanePointsOrig;
    std::vector<cv::Point> laneCorridorPolygonOrig; // Filled polygon for HUD
    float lateralOffsetM = 0.0f;                    // Negative = Left, Positive = Right
    float radiusOfCurvatureM = 9999.0f;             // Radius in meters
    float laneWidthM = 3.6f;
    LKADepartureState departureState = LKADepartureState::NORMAL;
    cv::Mat birdEyeViewBinary;                      // Binary IPM view for debugging
};

class FastLaneDetector {
public:
    FastLaneDetector(const AppConfig& config);
    ~FastLaneDetector() = default;

    // Process a camera frame and return lane detection & LKA metrics
    LaneDetectionResult process(const cv::Mat& frame);

    // Get homography matrix and inverse
    const cv::Mat& getHomography() const { return m_homography; }
    const cv::Mat& getInvHomography() const { return m_invHomography; }

private:
    void computeHomography(int frameW, int frameH);
    cv::Mat createBinaryWarped(const cv::Mat& warped);
    bool fitPolynomial(const std::vector<cv::Point2i>& points, PolynomialCoeffs& outCoeffs);
    void updateKalman(PolynomialCoeffs& left, PolynomialCoeffs& right);

    AppConfig m_config;
    cv::Mat m_homography;
    cv::Mat m_invHomography;
    bool m_homographyInit = false;

    // Temporal smoothing state
    PolynomialCoeffs m_prevLeft;
    PolynomialCoeffs m_prevRight;
    int m_consecutiveLossFrames = 0;
    const float m_smoothingAlpha = 0.25f; // Exponential moving average weight

    // CLAHE for contrast boost in fog / bad weather
    cv::Ptr<cv::CLAHE> m_clahe;
};

} // namespace adas
