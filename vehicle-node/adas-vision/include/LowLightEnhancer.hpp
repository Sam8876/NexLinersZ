#pragma once

#include "Config.hpp"
#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>

namespace adas {

/**
 * Real-time low-light enhancement for ADAS camera streams.
 *
 * Automatically detects low-light / nighttime conditions by measuring
 * mean frame luminance, then applies a multi-stage enhancement pipeline:
 *
 *   1. Adaptive gamma correction (brightens darks, preserves highlights)
 *   2. Multi-scale CLAHE on LAB lightness channel (local contrast boost)
 *   3. Bilateral denoising (preserves edges while reducing amplified noise)
 *   4. Color temperature correction (compensates for tungsten/sodium lighting)
 *
 * Designed for real-time operation at 40-60 FPS on Raspberry Pi 5 ARM Cortex-A76.
 * Enhancement level auto-scales: stronger in darker conditions, fully bypassed
 * in adequate lighting to avoid wasting compute budget.
 */
class LowLightEnhancer {
public:
    struct EnhancerConfig {
        float lowLightThreshold    = 80.0f;   // Mean luminance below which enhancement activates
        float veryDarkThreshold    = 40.0f;   // Below this, apply aggressive enhancement
        float gammaMin             = 0.4f;    // Gamma for very dark scenes (strong brightening)
        float gammaMax             = 0.85f;   // Gamma for moderately dark scenes
        float claheClipLimit       = 3.0f;    // CLAHE clip limit for local contrast
        int   claheTileSize        = 8;       // CLAHE tile grid size
        int   denoiseD             = 5;       // Bilateral filter diameter (0 = skip)
        float denoiseSigmaColor    = 35.0f;   // Bilateral color sigma
        float denoiseSigmaSpace    = 35.0f;   // Bilateral spatial sigma
        bool  enableColorCorrection = true;    // Compensate warm-toned artificial lighting
        float emaAlpha             = 0.15f;   // Smoothing factor for luminance tracking
    };

    explicit LowLightEnhancer(const EnhancerConfig& config = EnhancerConfig{});
    ~LowLightEnhancer() = default;

    /**
     * Enhance a frame in-place if low-light conditions are detected.
     * Returns true if enhancement was applied, false if bypassed.
     */
    bool enhance(cv::Mat& frame);

    /** Get the current smoothed mean luminance (0-255). */
    float getCurrentLuminance() const { return m_smoothedLuminance; }

    /** Check if enhancement is currently active. */
    bool isActive() const { return m_isActive; }

    /** Get the current gamma being applied. */
    float getCurrentGamma() const { return m_currentGamma; }

private:
    float measureLuminance(const cv::Mat& frame) const;
    void  buildGammaLUT(float gamma);
    void  applyGammaCorrection(cv::Mat& frame);
    void  applyCLAHE(cv::Mat& frame);
    void  applyDenoising(cv::Mat& frame);
    void  applyColorCorrection(cv::Mat& frame);

    EnhancerConfig m_config;
    cv::Ptr<cv::CLAHE> m_clahe;
    cv::Mat m_gammaLUT;
    float m_smoothedLuminance = 128.0f;
    float m_currentGamma = 1.0f;
    bool  m_isActive = false;
    float m_lastGamma = -1.0f; // Track to avoid rebuilding LUT every frame
};

} // namespace adas
