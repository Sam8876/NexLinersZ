#include "LowLightEnhancer.hpp"
#include <cmath>
#include <algorithm>

namespace adas {

LowLightEnhancer::LowLightEnhancer(const EnhancerConfig& config)
    : m_config(config) {
    m_clahe = cv::createCLAHE(m_config.claheClipLimit,
                              cv::Size(m_config.claheTileSize, m_config.claheTileSize));
    m_gammaLUT = cv::Mat(1, 256, CV_8U);
}

float LowLightEnhancer::measureLuminance(const cv::Mat& frame) const {
    // Fast luminance estimation: downsample then compute mean of V channel in HSV
    cv::Mat small;
    cv::resize(frame, small, cv::Size(160, 90), 0, 0, cv::INTER_AREA);

    cv::Mat hsv;
    cv::cvtColor(small, hsv, cv::COLOR_BGR2HSV);

    // Extract V (value/brightness) channel
    std::vector<cv::Mat> channels;
    cv::split(hsv, channels);

    return static_cast<float>(cv::mean(channels[2])[0]);
}

void LowLightEnhancer::buildGammaLUT(float gamma) {
    if (std::abs(gamma - m_lastGamma) < 0.01f) return; // Skip rebuild if gamma unchanged

    uchar* lutPtr = m_gammaLUT.ptr<uchar>(0);
    float invGamma = 1.0f / gamma;
    for (int i = 0; i < 256; ++i) {
        float normalized = static_cast<float>(i) / 255.0f;
        float corrected = std::pow(normalized, invGamma);
        lutPtr[i] = cv::saturate_cast<uchar>(corrected * 255.0f);
    }
    m_lastGamma = gamma;
}

void LowLightEnhancer::applyGammaCorrection(cv::Mat& frame) {
    cv::LUT(frame, m_gammaLUT, frame);
}

void LowLightEnhancer::applyCLAHE(cv::Mat& frame) {
    // Apply CLAHE on the L channel of LAB color space
    // LAB separates luminance from color, preventing color shifts
    cv::Mat lab;
    cv::cvtColor(frame, lab, cv::COLOR_BGR2Lab);

    std::vector<cv::Mat> labChannels;
    cv::split(lab, labChannels);

    m_clahe->apply(labChannels[0], labChannels[0]);

    cv::merge(labChannels, lab);
    cv::cvtColor(lab, frame, cv::COLOR_Lab2BGR);
}

void LowLightEnhancer::applyDenoising(cv::Mat& frame) {
    if (m_config.denoiseD <= 0) return;

    // Bilateral filter preserves edges (lane markings, vehicle contours)
    // while reducing the noise amplified by gamma/CLAHE
    cv::Mat filtered;
    cv::bilateralFilter(frame, filtered, m_config.denoiseD,
                        m_config.denoiseSigmaColor,
                        m_config.denoiseSigmaSpace);
    frame = filtered;
}

void LowLightEnhancer::applyColorCorrection(cv::Mat& frame) {
    if (!m_config.enableColorCorrection) return;

    // Under artificial mine lighting (sodium vapor / tungsten), images skew
    // yellow-orange. Apply a subtle cool shift to normalize white balance.
    // This helps lane detection by making white markings appear whiter.
    cv::Mat lab;
    cv::cvtColor(frame, lab, cv::COLOR_BGR2Lab);

    std::vector<cv::Mat> labChannels;
    cv::split(lab, labChannels);

    // Channel 1 (a) = green-red axis, Channel 2 (b) = blue-yellow axis
    // Shift b channel slightly toward blue to counter warm artificial lighting
    float meanB = static_cast<float>(cv::mean(labChannels[2])[0]);
    if (meanB > 133.0f) { // Image is warm-toned (b > neutral 128)
        float shift = std::min(8.0f, (meanB - 128.0f) * 0.4f);
        labChannels[2] -= static_cast<uchar>(shift);
    }

    cv::merge(labChannels, lab);
    cv::cvtColor(lab, frame, cv::COLOR_Lab2BGR);
}

bool LowLightEnhancer::enhance(cv::Mat& frame) {
    if (frame.empty()) return false;

    // Measure current luminance with EMA smoothing to avoid flicker
    float instantLum = measureLuminance(frame);
    m_smoothedLuminance = m_config.emaAlpha * instantLum +
                          (1.0f - m_config.emaAlpha) * m_smoothedLuminance;

    // Check if enhancement is needed
    if (m_smoothedLuminance >= m_config.lowLightThreshold) {
        m_isActive = false;
        m_currentGamma = 1.0f;
        return false; // Adequate lighting — bypass entirely
    }

    m_isActive = true;

    // Compute adaptive gamma: darker scenes get stronger correction
    // Map luminance range [veryDark, lowLight] -> gamma range [gammaMin, gammaMax]
    float t = (m_smoothedLuminance - m_config.veryDarkThreshold) /
              (m_config.lowLightThreshold - m_config.veryDarkThreshold);
    t = std::max(0.0f, std::min(1.0f, t));
    m_currentGamma = m_config.gammaMin + t * (m_config.gammaMax - m_config.gammaMin);

    // Stage 1: Adaptive gamma correction (fast LUT-based)
    buildGammaLUT(m_currentGamma);
    applyGammaCorrection(frame);

    // Stage 2: CLAHE on LAB lightness for local contrast enhancement
    applyCLAHE(frame);

    // Stage 3: Bilateral denoising to clean up amplified noise
    // Only apply in very dark conditions to save compute budget
    if (m_smoothedLuminance < m_config.veryDarkThreshold) {
        applyDenoising(frame);
    }

    // Stage 4: Color temperature correction for artificial mine lighting
    applyColorCorrection(frame);

    return true;
}

} // namespace adas
