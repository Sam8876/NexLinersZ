#include "PipelineManager.hpp"
#include <algorithm>

namespace adas {

FramePacer::FramePacer(float minFPS, float maxFPS, bool enabled)
    : m_minFPS(minFPS), m_maxFPS(maxFPS), m_enabled(enabled) {
    m_minFrameDurationMs = 1000.0f / m_maxFPS; // e.g. 16.66 ms for 60 FPS
    m_maxFrameDurationMs = 1000.0f / m_minFPS; // e.g. 25.00 ms for 40 FPS
    m_lastFrameEndTime = std::chrono::high_resolution_clock::now();
}

void FramePacer::startFrame() {
    m_frameStartTime = std::chrono::high_resolution_clock::now();
}

void FramePacer::endFrameAndPace() {
    auto now = std::chrono::high_resolution_clock::now();
    float elapsedMs = std::chrono::duration<float, std::milli>(now - m_frameStartTime).count();

    // If pacer is enabled, enforce maximum 60 FPS cap
    if (m_enabled && elapsedMs < m_minFrameDurationMs) {
        float sleepMs = m_minFrameDurationMs - elapsedMs;
        std::this_thread::sleep_for(std::chrono::microseconds(static_cast<int64_t>(sleepMs * 1000.0f)));
        now = std::chrono::high_resolution_clock::now();
        elapsedMs = std::chrono::duration<float, std::milli>(now - m_frameStartTime).count();
    }

    m_lastFrameTimeMs = elapsedMs;

    // Exponential smoothing for FPS indicator
    float instantFPS = (elapsedMs > 0.001f) ? (1000.0f / elapsedMs) : 60.0f;
    instantFPS = std::max(m_minFPS * 0.8f, std::min(m_maxFPS * 1.05f, instantFPS));
    m_smoothedFPS = 0.90f * m_smoothedFPS + 0.10f * instantFPS;

    m_lastFrameEndTime = now;
}

} // namespace adas
