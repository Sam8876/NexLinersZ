#include "FastLaneDetector.hpp"
#include <cmath>
#include <algorithm>
#include <numeric>

namespace adas {

FastLaneDetector::FastLaneDetector(const AppConfig& config)
    : m_config(config) {
    m_clahe = cv::createCLAHE(2.0, cv::Size(8, 8));
}

void FastLaneDetector::computeHomography(int frameW, int frameH) {
    const auto& ipm = m_config.ipm;

    std::vector<cv::Point2f> srcPoints = {
        cv::Point2f(frameW * ipm.srcTopLeftX, frameH * ipm.srcTopLeftY),
        cv::Point2f(frameW * ipm.srcTopRightX, frameH * ipm.srcTopRightY),
        cv::Point2f(frameW * ipm.srcBottomRightX, frameH * ipm.srcBottomRightY),
        cv::Point2f(frameW * ipm.srcBottomLeftX, frameH * ipm.srcBottomLeftY)
    };

    std::vector<cv::Point2f> dstPoints = {
        cv::Point2f(0.0f, 0.0f),
        cv::Point2f(static_cast<float>(ipm.warpWidth), 0.0f),
        cv::Point2f(static_cast<float>(ipm.warpWidth), static_cast<float>(ipm.warpHeight)),
        cv::Point2f(0.0f, static_cast<float>(ipm.warpHeight))
    };

    m_homography = cv::getPerspectiveTransform(srcPoints, dstPoints);
    m_invHomography = cv::getPerspectiveTransform(dstPoints, srcPoints);
    m_homographyInit = true;
}

cv::Mat FastLaneDetector::createBinaryWarped(const cv::Mat& warpedBGR) {
    // 1. Convert to HLS color space to extract Yellow/White lane markings
    cv::Mat hls;
    cv::cvtColor(warpedBGR, hls, cv::COLOR_BGR2HLS);

    std::vector<cv::Mat> hlsChannels;
    cv::split(hls, hlsChannels);
    cv::Mat lChannel = hlsChannels[1]; // Lightness
    cv::Mat sChannel = hlsChannels[2]; // Saturation

    // 2. Fog/Monsoon enhancement via CLAHE on Lightness channel
    cv::Mat lEnhanced;
    m_clahe->apply(lChannel, lEnhanced);

    // 3. Sobel edge detection in X direction (vertical lane lines)
    cv::Mat sobelX, absSobelX, sobelX8u;
    cv::Sobel(lEnhanced, sobelX, CV_32F, 1, 0, 3);
    cv::absdiff(sobelX, cv::Scalar::all(0), absSobelX);
    
    double minVal, maxVal;
    cv::minMaxLoc(absSobelX, &minVal, &maxVal);
    if (maxVal < 1e-4) maxVal = 1.0;
    absSobelX.convertTo(sobelX8u, CV_8U, 255.0 / maxVal);

    // 4. Thresholding masks
    cv::Mat sobelMask;
    cv::threshold(sobelX8u, sobelMask, 35, 255, cv::THRESH_BINARY);

    cv::Mat whiteMask;
    cv::threshold(lEnhanced, whiteMask, 180, 255, cv::THRESH_BINARY);

    cv::Mat yellowMask;
    // Saturation threshold for yellow markings
    cv::threshold(sChannel, yellowMask, 100, 255, cv::THRESH_BINARY);

    // 5. Bitwise combination
    cv::Mat combinedBinary;
    cv::bitwise_or(sobelMask, whiteMask, combinedBinary);
    cv::bitwise_or(combinedBinary, yellowMask, combinedBinary);

    return combinedBinary;
}

bool FastLaneDetector::fitPolynomial(const std::vector<cv::Point2i>& points, PolynomialCoeffs& outCoeffs) {
    if (points.size() < 30) {
        outCoeffs.valid = false;
        return false;
    }

    // Fit quadratic: x = a*y^2 + b*y + c
    int n = static_cast<int>(points.size());
    cv::Mat A(n, 3, CV_32F);
    cv::Mat B(n, 1, CV_32F);

    for (int i = 0; i < n; ++i) {
        float y = static_cast<float>(points[i].y);
        float x = static_cast<float>(points[i].x);
        A.at<float>(i, 0) = y * y;
        A.at<float>(i, 1) = y;
        A.at<float>(i, 2) = 1.0f;
        B.at<float>(i, 0) = x;
    }

    cv::Mat coeffs;
    if (cv::solve(A, B, coeffs, cv::DECOMP_SVD)) {
        outCoeffs.a = coeffs.at<float>(0, 0);
        outCoeffs.b = coeffs.at<float>(1, 0);
        outCoeffs.c = coeffs.at<float>(2, 0);
        outCoeffs.valid = true;
        return true;
    }

    outCoeffs.valid = false;
    return false;
}

void FastLaneDetector::updateKalman(PolynomialCoeffs& left, PolynomialCoeffs& right) {
    if (left.valid) {
        if (m_prevLeft.valid) {
            left.a = (1.0f - m_smoothingAlpha) * m_prevLeft.a + m_smoothingAlpha * left.a;
            left.b = (1.0f - m_smoothingAlpha) * m_prevLeft.b + m_smoothingAlpha * left.b;
            left.c = (1.0f - m_smoothingAlpha) * m_prevLeft.c + m_smoothingAlpha * left.c;
        }
        m_prevLeft = left;
    } else if (m_prevLeft.valid && m_consecutiveLossFrames < 8) {
        left = m_prevLeft; // Reuse previous stable track
    }

    if (right.valid) {
        if (m_prevRight.valid) {
            right.a = (1.0f - m_smoothingAlpha) * m_prevRight.a + m_smoothingAlpha * right.a;
            right.b = (1.0f - m_smoothingAlpha) * m_prevRight.b + m_smoothingAlpha * right.b;
            right.c = (1.0f - m_smoothingAlpha) * m_prevRight.c + m_smoothingAlpha * right.c;
        }
        m_prevRight = right;
    } else if (m_prevRight.valid && m_consecutiveLossFrames < 8) {
        right = m_prevRight;
    }

    if (!left.valid && !right.valid) {
        m_consecutiveLossFrames++;
    } else {
        m_consecutiveLossFrames = 0;
    }
}

LaneDetectionResult FastLaneDetector::process(const cv::Mat& frame) {
    LaneDetectionResult result;
    if (frame.empty()) return result;

    int frameW = frame.cols;
    int frameH = frame.rows;

    if (!m_homographyInit) {
        computeHomography(frameW, frameH);
    }

    int warpW = m_config.ipm.warpWidth;
    int warpH = m_config.ipm.warpHeight;

    // 1. Perspective Warp (IPM)
    cv::Mat warpedBGR;
    cv::warpPerspective(frame, warpedBGR, m_homography, cv::Size(warpW, warpH), cv::INTER_LINEAR);

    // 2. Binary Feature Map
    cv::Mat binary = createBinaryWarped(warpedBGR);
    result.birdEyeViewBinary = binary;

    // 3. Sliding Window Histogram
    // Calculate histogram of bottom half to find left and right base positions
    cv::Mat bottomHalf = binary.rowRange(warpH / 2, warpH);
    std::vector<int> histogram(warpW, 0);

    for (int col = 0; col < warpW; ++col) {
        histogram[col] = cv::countNonZero(bottomHalf.col(col));
    }

    int midPoint = warpW / 2;
    auto maxLeftIter = std::max_element(histogram.begin(), histogram.begin() + midPoint);
    auto maxRightIter = std::max_element(histogram.begin() + midPoint, histogram.end());

    int leftBaseX = static_cast<int>(std::distance(histogram.begin(), maxLeftIter));
    int rightBaseX = static_cast<int>(std::distance(histogram.begin(), maxRightIter));

    // Fallback if histogram peaks are too close or at edges
    if (leftBaseX < 20 || leftBaseX > midPoint - 30) leftBaseX = warpW / 4;
    if (rightBaseX < midPoint + 30 || rightBaseX > warpW - 20) rightBaseX = 3 * warpW / 4;

    // 4. Sliding Windows Setup
    const int numWindows = 9;
    int windowHeight = warpH / numWindows;
    int windowMargin = 45;
    int minPixToRecenter = 40;

    int currentLeftX = leftBaseX;
    int currentRightX = rightBaseX;

    std::vector<cv::Point2i> leftLanePoints;
    std::vector<cv::Point2i> rightLanePoints;

    for (int window = 0; window < numWindows; ++window) {
        int winYLow = warpH - (window + 1) * windowHeight;
        int winYHigh = warpH - window * windowHeight;

        int winXLeftLow = std::max(0, currentLeftX - windowMargin);
        int winXLeftHigh = std::min(warpW - 1, currentLeftX + windowMargin);

        int winXRightLow = std::max(0, currentRightX - windowMargin);
        int winXRightHigh = std::min(warpW - 1, currentRightX + windowMargin);

        std::vector<cv::Point2i> winLeftPts;
        std::vector<cv::Point2i> winRightPts;

        for (int y = winYLow; y < winYHigh; ++y) {
            const uchar* rowPtr = binary.ptr<uchar>(y);
            for (int x = winXLeftLow; x <= winXLeftHigh; ++x) {
                if (rowPtr[x] > 0) winLeftPts.emplace_back(x, y);
            }
            for (int x = winXRightLow; x <= winXRightHigh; ++x) {
                if (rowPtr[x] > 0) winRightPts.emplace_back(x, y);
            }
        }

        leftLanePoints.insert(leftLanePoints.end(), winLeftPts.begin(), winLeftPts.end());
        rightLanePoints.insert(rightLanePoints.end(), winRightPts.begin(), winRightPts.end());

        if (winLeftPts.size() > static_cast<size_t>(minPixToRecenter)) {
            int sumX = 0;
            for (const auto& pt : winLeftPts) sumX += pt.x;
            currentLeftX = sumX / static_cast<int>(winLeftPts.size());
        }

        if (winRightPts.size() > static_cast<size_t>(minPixToRecenter)) {
            int sumX = 0;
            for (const auto& pt : winRightPts) sumX += pt.x;
            currentRightX = sumX / static_cast<int>(winRightPts.size());
        }
    }

    // 5. Fit 2nd Order Polynomials
    PolynomialCoeffs leftPoly, rightPoly;
    fitPolynomial(leftLanePoints, leftPoly);
    fitPolynomial(rightLanePoints, rightPoly);

    // Temporal Filter
    updateKalman(leftPoly, rightPoly);

    result.leftPoly = leftPoly;
    result.rightPoly = rightPoly;
    result.detected = leftPoly.valid || rightPoly.valid;

    // Synthesize missing line if one is strong
    float nominalPixelWidth = (m_config.lka.nominalLaneWidthM / m_config.ipm.metersPerPixelX);
    if (leftPoly.valid && !rightPoly.valid) {
        rightPoly = leftPoly;
        rightPoly.c += nominalPixelWidth;
        rightPoly.valid = true;
    } else if (!leftPoly.valid && rightPoly.valid) {
        leftPoly = rightPoly;
        leftPoly.c -= nominalPixelWidth;
        leftPoly.valid = true;
    }

    if (leftPoly.valid && rightPoly.valid) {
        // 6. Generate points along height in Bird's Eye View
        const int step = 15;
        std::vector<cv::Point2f> leftBEVPts;
        std::vector<cv::Point2f> rightBEVPts;

        for (int y = 0; y <= warpH; y += step) {
            float yF = static_cast<float>(y);
            leftBEVPts.emplace_back(leftPoly.eval(yF), yF);
            rightBEVPts.emplace_back(rightPoly.eval(yF), yF);
        }

        // 7. Project back to Camera Perspective using Inverse Homography
        if (!leftBEVPts.empty() && !m_invHomography.empty()) {
            cv::perspectiveTransform(leftBEVPts, result.leftLanePointsOrig, m_invHomography);
            cv::perspectiveTransform(rightBEVPts, result.rightLanePointsOrig, m_invHomography);

            // Construct filled corridor polygon
            std::vector<cv::Point> corridor;
            for (const auto& pt : result.leftLanePointsOrig) {
                corridor.push_back(cv::Point(cvRound(pt.x), cvRound(pt.y)));
            }
            for (auto it = result.rightLanePointsOrig.rbegin(); it != result.rightLanePointsOrig.rend(); ++it) {
                corridor.push_back(cv::Point(cvRound(it->x), cvRound(it->y)));
            }
            result.laneCorridorPolygonOrig = corridor;
        }

        // 8. Lateral Offset & Radius of Curvature Calculation
        float bottomY = static_cast<float>(warpH);
        float leftXBottom = leftPoly.eval(bottomY);
        float rightXBottom = rightPoly.eval(bottomY);
        float laneCenterBEV = (leftXBottom + rightXBottom) / 2.0f;
        float carCenterBEV = warpW / 2.0f;

        // Offset: positive = vehicle drifted right of center; negative = drifted left
        result.lateralOffsetM = (carCenterBEV - laneCenterBEV) * m_config.ipm.metersPerPixelX;
        result.laneWidthM = (rightXBottom - leftXBottom) * m_config.ipm.metersPerPixelX;

        // Radius of Curvature R = (1 + (2*a*y + b)^2)^(3/2) / |2*a|
        float avgA = (leftPoly.a + rightPoly.a) / 2.0f;
        float avgB = (leftPoly.b + rightPoly.b) / 2.0f;
        if (std::abs(avgA) > 1e-6) {
            float numerator = std::pow(1.0f + std::pow(2.0f * avgA * bottomY + avgB, 2.0f), 1.5f);
            float denominator = std::abs(2.0f * avgA);
            result.radiusOfCurvatureM = (numerator / denominator) * m_config.ipm.metersPerPixelY;
        } else {
            result.radiusOfCurvatureM = 9999.0f; // Straight road
        }

        // 9. LKA Departure Warning Logic
        float absOffset = std::abs(result.lateralOffsetM);
        if (absOffset > m_config.lka.criticalThresholdM) {
            result.departureState = (result.lateralOffsetM < 0.0f) 
                ? LKADepartureState::CRITICAL_LEFT 
                : LKADepartureState::CRITICAL_RIGHT;
        } else if (absOffset > m_config.lka.warningThresholdM) {
            result.departureState = (result.lateralOffsetM < 0.0f) 
                ? LKADepartureState::WARNING_LEFT 
                : LKADepartureState::WARNING_RIGHT;
        } else {
            result.departureState = LKADepartureState::NORMAL;
        }
    } else {
        result.departureState = LKADepartureState::NO_LANES_DETECTED;
    }

    return result;
}

} // namespace adas
