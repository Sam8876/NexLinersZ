#include "Config.hpp"
#include <iostream>
#include <opencv2/core.hpp>

namespace adas {

bool AppConfig::loadFromFile(const std::string& configPath) {
    cv::FileStorage fs;
    try {
        if (!fs.open(configPath, cv::FileStorage::READ)) {
            std::cerr << "[Config] Warning: Could not open " << configPath 
                      << ". Using default tuned parameters.\n";
            return false;
        }

        // Performance
        cv::FileNode perfNode = fs["performance"];
        if (!perfNode.empty()) {
            perf.minTargetFPS = (float)perfNode["min_target_fps"];
            perf.maxTargetFPS = (float)perfNode["max_target_fps"];
            perf.enableFramePacer = (int)perfNode["enable_frame_pacer"] != 0;
            perf.numWorkerThreads = (int)perfNode["num_worker_threads"];
        }

        // Camera
        cv::FileNode camNode = fs["camera"];
        if (!camNode.empty()) {
            camera.focalLengthPx = (float)camNode["focal_length_px"];
            camera.principalX = (float)camNode["principal_x"];
            camera.principalY = (float)camNode["principal_y"];
            camera.mountHeightM = (float)camNode["mount_height_m"];
            camera.pitchAngleDeg = (float)camNode["pitch_angle_deg"];
            camera.imageWidth = (int)camNode["image_width"];
            camera.imageHeight = (int)camNode["image_height"];
        }

        // IPM
        cv::FileNode ipmNode = fs["ipm"];
        if (!ipmNode.empty()) {
            ipm.warpWidth = (int)ipmNode["warp_width"];
            ipm.warpHeight = (int)ipmNode["warp_height"];
            ipm.srcTopLeftX = (float)ipmNode["src_top_left_x"];
            ipm.srcTopLeftY = (float)ipmNode["src_top_left_y"];
            ipm.srcTopRightX = (float)ipmNode["src_top_right_x"];
            ipm.srcTopRightY = (float)ipmNode["src_top_right_y"];
            ipm.srcBottomLeftX = (float)ipmNode["src_bottom_left_x"];
            ipm.srcBottomLeftY = (float)ipmNode["src_bottom_left_y"];
            ipm.srcBottomRightX = (float)ipmNode["src_bottom_right_x"];
            ipm.srcBottomRightY = (float)ipmNode["src_bottom_right_y"];
            ipm.metersPerPixelY = (float)ipmNode["meters_per_pixel_y"];
            ipm.metersPerPixelX = (float)ipmNode["meters_per_pixel_x"];
        }

        // YOLOv26
        cv::FileNode yoloNode = fs["ai_detector"];
        if (!yoloNode.empty()) {
            yolo.modelPath = (std::string)yoloNode["model_path"];
            yolo.inputWidth = (int)yoloNode["input_width"];
            yolo.inputHeight = (int)yoloNode["input_height"];
            yolo.confThreshold = (float)yoloNode["confidence_threshold"];
            yolo.nmsThreshold = (float)yoloNode["nms_threshold"];
            yolo.inferenceIntervalFrames = (int)yoloNode["inference_interval_frames"];
            yolo.useFP16 = (int)yoloNode["use_fp16"] != 0;
        }

        // AEB
        cv::FileNode aebNode = fs["aeb"];
        if (!aebNode.empty()) {
            aeb.driverReactionTimeS = (float)aebNode["driver_reaction_time_s"];
            aeb.roadFrictionCoeff = (float)aebNode["road_friction_coeff"];
            aeb.safetyMarginM = (float)aebNode["safety_margin_m"];
            aeb.ttcWarningThresholdS = (float)aebNode["ttc_warning_threshold_s"];
            aeb.ttcCriticalThresholdS = (float)aebNode["ttc_critical_threshold_s"];
            aeb.simulatedEgoSpeedKmph = (float)aebNode["simulated_ego_speed_kmph"];
        }

        // LKA
        cv::FileNode lkaNode = fs["lka"];
        if (!lkaNode.empty()) {
            lka.nominalLaneWidthM = (float)lkaNode["nominal_lane_width_m"];
            lka.warningThresholdM = (float)lkaNode["departure_warning_threshold_m"];
            lka.criticalThresholdM = (float)lkaNode["departure_critical_threshold_m"];
        }

        fs.release();
        std::cout << "[Config] Successfully loaded configuration from: " << configPath << "\n";
        return true;
    } catch (const cv::Exception& e) {
        std::cerr << "[Config] Error parsing " << configPath << ": " << e.what() << "\n";
        return false;
    }
}

void AppConfig::printSummary() const {
    std::cout << "\n================ ADAS SYSTEM CONFIGURATION ================\n";
    std::cout << " Platform Target  : Raspberry Pi 5 (ARM Cortex-A76) + SIMD NEON\n";
    std::cout << " Target FPS Bounds: " << perf.minTargetFPS << " FPS min -> " 
              << perf.maxTargetFPS << " FPS max (Pacer: " 
              << (perf.enableFramePacer ? "ENABLED" : "OFF") << ")\n";
    std::cout << " AI Detector Model: YOLOv26 (" << yolo.modelPath << ", "
              << yolo.inputWidth << "x" << yolo.inputHeight 
              << ", cadence: 1/" << yolo.inferenceIntervalFrames << " frames)\n";
    std::cout << " Camera Mounting  : Height=" << camera.mountHeightM << "m, Pitch="
              << camera.pitchAngleDeg << " deg, Focal=" << camera.focalLengthPx << "px\n";
    std::cout << " AEB Dynamics     : Reaction=" << aeb.driverReactionTimeS << "s, Friction(mu)="
              << aeb.roadFrictionCoeff << ", TTC Warning=" << aeb.ttcWarningThresholdS 
              << "s, Critical=" << aeb.ttcCriticalThresholdS << "s\n";
    std::cout << " LKA Departure    : Warning=" << lka.warningThresholdM 
              << "m, Critical=" << lka.criticalThresholdM << "m\n";
    std::cout << "===========================================================\n\n";
}

} // namespace adas
