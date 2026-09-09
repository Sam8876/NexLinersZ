#pragma once

#include <chrono>
#include <thread>
#include "Config.hpp"

namespace adas {

class FramePacer {
public:
    FramePacer(float minFPS = 40.0f, float maxFPS = 60.0f, bool enabled = true);

    void startFrame();
    void endFrameAndPace();

    float getCurrentFPS() const { return m_smoothedFPS; }
    float getFrameTimeMs() const { return m_lastFrameTimeMs; }

private:
    float m_minFPS;
    float m_maxFPS;
    bool m_enabled;

    std::chrono::high_resolution_clock::time_point m_frameStartTime;
    std::chrono::high_resolution_clock::time_point m_lastFrameEndTime;

    float m_lastFrameTimeMs = 20.0f;
    float m_smoothedFPS = 50.0f;
    float m_minFrameDurationMs; // 1000.0f / maxFPS
    float m_maxFrameDurationMs; // 1000.0f / minFPS
};

} // namespace adas
