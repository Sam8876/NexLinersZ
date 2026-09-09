#include "YOLOv26Detector.hpp"
#include <iostream>
#include <fstream>
#include <cmath>
#include <algorithm>

namespace adas {

YOLOv26Detector::YOLOv26Detector(const AppConfig& config)
    : m_config(config) {
    // Standard COCO classes with ADAS prioritization
    m_classNames = {
        "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
        "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
        "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
        "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
        "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
        "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
        "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake",
        "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop",
        "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
        "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
    };

    loadModel(m_config.yolo.modelPath);
}

bool YOLOv26Detector::loadModel(const std::string& modelPath) {
    std::ifstream f(modelPath);
    if (!f.good()) {
        std::cerr << "[YOLOv26] Warning: Model file '" << modelPath 
                  << "' not found. Running in ADAS vision fallback mode.\n";
        m_modelLoaded = false;
        return false;
    }

    try {
        m_net = cv::dnn::readNetFromONNX(modelPath);
        m_net.setPreferableBackend(cv::dnn::DNN_BACKEND_OPENCV);
        m_net.setPreferableTarget(cv::dnn::DNN_TARGET_CPU);

#if CV_VERSION_MAJOR >= 4 && CV_VERSION_MINOR >= 5
        if (m_config.yolo.useFP16) {
            m_net.enableWinograd(true);
        }
#endif
        std::cout << "[YOLOv26] Successfully loaded neural model: " << modelPath 
                  << " (ARM Cortex-A76 CPU optimized)\n";
        m_modelLoaded = true;
        return true;
    } catch (const cv::Exception& e) {
        std::cerr << "[YOLOv26] Failed to load ONNX model: " << e.what() << "\n";
        m_modelLoaded = false;
        return false;
    }
}

cv::Mat YOLOv26Detector::preprocess(const cv::Mat& frame, float& outScale, int& outPadX, int& outPadY) {
    int targetW = m_config.yolo.inputWidth;
    int targetH = m_config.yolo.inputHeight;

    float scale = std::min(static_cast<float>(targetW) / frame.cols,
                           static_cast<float>(targetH) / frame.rows);
    outScale = scale;

    int newW = static_cast<int>(frame.cols * scale);
    int newH = static_cast<int>(frame.rows * scale);

    cv::Mat resized;
    cv::resize(frame, resized, cv::Size(newW, newH), 0, 0, cv::INTER_LINEAR);

    outPadX = (targetW - newW) / 2;
    outPadY = (targetH - newH) / 2;

    cv::Mat padded = cv::Mat::zeros(targetH, targetW, CV_8UC3);
    resized.copyTo(padded(cv::Rect(outPadX, outPadY, newW, newH)));

    return padded;
}

std::vector<DetectedObject> YOLOv26Detector::postprocess(const cv::Mat& outputTensor, const cv::Mat& frame,
                                                        float scale, int padX, int padY) {
    std::vector<DetectedObject> detections;

    // Output shape can be [1, 84, N] or [1, N, 84]
    cv::Mat tensor = outputTensor;
    if (tensor.dims == 3) {
        int d0 = tensor.size[0];
        int d1 = tensor.size[1];
        int d2 = tensor.size[2];

        if (d1 < d2) {
            // Shape is [1, 84, N], reshape and transpose to [N, 84]
            cv::Mat reshaped(d1, d2, CV_32F, tensor.ptr<float>());
            cv::transpose(reshaped, tensor);
        } else {
            // Shape is [1, N, 84]
            tensor = cv::Mat(d1, d2, CV_32F, tensor.ptr<float>());
        }
    }

    int numCandidates = tensor.rows;
    int numAttributes = tensor.cols;
    int numClasses = numAttributes - 4;

    std::vector<int> classIds;
    std::vector<float> confidences;
    std::vector<cv::Rect> boxes;

    for (int i = 0; i < numCandidates; ++i) {
        const float* row = tensor.ptr<float>(i);
        
        // Find best class score among ADAS relevant classes
        float maxScore = 0.0f;
        int bestClassId = -1;

        for (int c = 0; c < numClasses; ++c) {
            float score = row[4 + c];
            if (score > maxScore) {
                maxScore = score;
                bestClassId = c;
            }
        }

        if (maxScore >= m_config.yolo.confThreshold) {
            // Only consider traffic/obstacle classes: person(0), car(2), motorcycle(3), bus(5), truck(7)
            if (bestClassId == 0 || bestClassId == 2 || bestClassId == 3 || 
                bestClassId == 5 || bestClassId == 7) {

                float cx = row[0];
                float cy = row[1];
                float w = row[2];
                float h = row[3];

                // Unpad and scale back to original image
                float origX = (cx - padX - w * 0.5f) / scale;
                float origY = (cy - padY - h * 0.5f) / scale;
                float origW = w / scale;
                float origH = h / scale;

                // Clamp to frame boundary
                origX = std::max(0.0f, std::min(origX, static_cast<float>(frame.cols - 1)));
                origY = std::max(0.0f, std::min(origY, static_cast<float>(frame.rows - 1)));
                origW = std::min(origW, static_cast<float>(frame.cols - origX));
                origH = std::min(origH, static_cast<float>(frame.rows - origY));

                if (origW > 10.0f && origH > 10.0f) {
                    boxes.emplace_back(cvRound(origX), cvRound(origY), cvRound(origW), cvRound(origH));
                    confidences.push_back(maxScore);
                    classIds.push_back(bestClassId);
                }
            }
        }
    }

    // Apply Non-Maximum Suppression (NMS)
    std::vector<int> indices;
    cv::dnn::NMSBoxes(boxes, confidences, m_config.yolo.confThreshold, m_config.yolo.nmsThreshold, indices);

    for (int idx : indices) {
        DetectedObject obj;
        obj.classId = classIds[idx];
        obj.className = (obj.classId < static_cast<int>(m_classNames.size())) ? m_classNames[obj.classId] : "obstacle";
        obj.confidence = confidences[idx];
        obj.box = boxes[idx];
        obj.groundContactPt = cv::Point2f(obj.box.x + obj.box.width * 0.5f, obj.box.y + obj.box.height);
        detections.push_back(obj);
    }

    return detections;
}

std::vector<DetectedObject> YOLOv26Detector::heuristicFallbackDetect(const cv::Mat& frame) {
    // Fast edge/contour fallback detector when running without an ONNX model file
    std::vector<DetectedObject> detections;
    int h = frame.rows;
    int w = frame.cols;

    // Focus on forward roadway region (bottom 40% of frame, center 60%)
    cv::Rect roi(w * 0.2, h * 0.50, w * 0.6, h * 0.45);
    cv::Mat roadROI = frame(roi);

    cv::Mat gray, edges;
    cv::cvtColor(roadROI, gray, cv::COLOR_BGR2GRAY);
    cv::Canny(gray, edges, 60, 180);

    // Dilate edges
    cv::Mat dilated;
    cv::dilate(edges, dilated, cv::Mat(), cv::Point(-1, -1), 2);

    std::vector<std::vector<cv::Point>> contours;
    cv::findContours(dilated, contours, cv::RETR_EXTERNAL, cv::CHAIN_APPROX_SIMPLE);

    for (const auto& c : contours) {
        cv::Rect b = cv::boundingRect(c);
        // Look for vehicle-sized bounding rectangles
        if (b.width > 55 && b.height > 40 && b.width < roi.width * 0.8) {
            float aspect = static_cast<float>(b.width) / b.height;
            if (aspect > 0.6f && aspect < 2.5f) {
                DetectedObject obj;
                obj.classId = 2; // Car/Vehicle
                obj.className = "vehicle";
                obj.confidence = 0.85f;
                obj.box = cv::Rect2f(b.x + roi.x, b.y + roi.y, b.width, b.height);
                obj.groundContactPt = cv::Point2f(obj.box.x + obj.box.width * 0.5f, obj.box.y + obj.box.height);
                detections.push_back(obj);
            }
        }
    }

    return detections;
}

std::vector<DetectedObject> YOLOv26Detector::detect(const cv::Mat& frame) {
    m_frameCounter++;

    // Decoupled execution cadence on ARM Cortex-A76 to preserve 40-60 FPS:
    // Run full deep learning inference every N frames, and track between frames.
    if (m_frameCounter % m_config.yolo.inferenceIntervalFrames != 0 && !m_lastDetections.empty()) {
        return m_lastDetections;
    }

    if (!m_modelLoaded) {
        m_lastDetections = heuristicFallbackDetect(frame);
        return m_lastDetections;
    }

    float scale = 1.0f;
    int padX = 0, padY = 0;
    cv::Mat blobInput = preprocess(frame, scale, padX, padY);

    cv::Mat blob;
    cv::dnn::blobFromImage(blobInput, blob, 1.0 / 255.0, 
                           cv::Size(m_config.yolo.inputWidth, m_config.yolo.inputHeight), 
                           cv::Scalar(), true, false, CV_32F);

    m_net.setInput(blob);

    std::vector<cv::Mat> outputs;
    m_net.forward(outputs, m_net.getUnconnectedOutLayersNames());

    if (!outputs.empty()) {
        m_lastDetections = postprocess(outputs[0], frame, scale, padX, padY);
    } else {
        m_lastDetections.clear();
    }

    return m_lastDetections;
}

void YOLOv26Detector::trackObjects(std::vector<DetectedObject>& detections, float dt) {
    if (dt <= 1e-4f) dt = 0.033f; // Default ~30ms if frame rate isn't available

    // Simple centroid / IoU tracker to correlate objects across frames
    for (auto& det : detections) {
        float bestDist = 1e6f;
        int bestTrackIdx = -1;

        for (size_t t = 0; t < m_trackedObjects.size(); ++t) {
            float dx = det.groundContactPt.x - m_trackedObjects[t].groundContactPt.x;
            float dy = det.groundContactPt.y - m_trackedObjects[t].groundContactPt.y;
            float dist = std::sqrt(dx * dx + dy * dy);

            if (dist < 75.0f && dist < bestDist) {
                bestDist = dist;
                bestTrackIdx = static_cast<int>(t);
            }
        }

        if (bestTrackIdx >= 0) {
            // Matched existing tracked vehicle
            auto& track = m_trackedObjects[bestTrackIdx];
            det.id = track.id;

            // Compute relative velocity based on distance delta (m/s converted to km/h)
            float deltaDistM = det.distanceM - track.distanceM;
            float relVelMps = deltaDistM / dt; // Negative if distance is decreasing (closing in)
            det.relativeSpeedKmph = relVelMps * 3.6f;

            // Calculate Time-To-Collision (TTC) in seconds
            if (relVelMps < -0.4f && det.distanceM > 0.5f) {
                det.ttcS = det.distanceM / (-relVelMps);
            } else {
                det.ttcS = 99.0f; // Safe / Not closing in
            }

            // Update tracked state
            track = det;
            track.missedFrames = 0;
        } else {
            // New vehicle track
            det.id = m_nextObjectId++;
            det.relativeSpeedKmph = 0.0f;
            det.ttcS = 99.0f;
            m_trackedObjects.push_back(det);
        }
    }

    // Prune stale tracks that disappeared
    m_trackedObjects.erase(
        std::remove_if(m_trackedObjects.begin(), m_trackedObjects.end(),
                       [](const DetectedObject& obj) { return obj.missedFrames > 10; }),
        m_trackedObjects.end());
}

} // namespace adas
