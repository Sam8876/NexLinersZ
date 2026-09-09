cmake_minimum_required(VERSION 3.16)
project(adas_vision VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Find OpenCV with required modules
find_package(OpenCV REQUIRED COMPONENTS core imgproc highgui videoio dnn)
message(STATUS "OpenCV found: ${OpenCV_VERSION}")
message(STATUS "OpenCV include dirs: ${OpenCV_INCLUDE_DIRS}")

# OpenMP for multi-core parallelism across Raspberry Pi 5 Cortex-A76 cores
find_package(OpenMP)
if(OpenMP_CXX_FOUND)
    message(STATUS "OpenMP found, enabling multi-threaded acceleration")
endif()

# Threading library
find_package(Threads REQUIRED)

# Compiler Optimization Flags
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    # Base high-performance optimizations
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -ffast-math -Wall -Wextra")

    # Architecture-specific optimizations for Raspberry Pi 5 (ARMv8.2-A / Cortex-A76)
    if(CMAKE_SYSTEM_PROCESSOR MATCHES "aarch64|arm64")
        message(STATUS "Configuring for ARM64 / Raspberry Pi 5 Cortex-A76")
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -march=armv8.2-a+simd+fp16 -mcpu=cortex-a76 -ftree-vectorize")
        add_definitions(-DENABLE_ARM_NEON=1)
    else()
        message(STATUS "Configuring for host architecture: ${CMAKE_SYSTEM_PROCESSOR}")
        # Portable vectorization flags
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -ftree-vectorize")
    endif()

    if(OpenMP_CXX_FOUND)
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${OpenMP_CXX_FLAGS}")
    endif()
elseif(MSVC)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /O2 /fp:fast /W3")
    if(OpenMP_CXX_FOUND)
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${OpenMP_CXX_FLAGS}")
    endif()
endif()

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${OpenCV_INCLUDE_DIRS}
)

set(SOURCES
    src/Config.cpp
    src/FastLaneDetector.cpp
    src/YOLOv26Detector.cpp
    src/DistanceEstimator.cpp
    src/AEBSystem.cpp
    src/HUDVisualizer.cpp
    src/PipelineManager.cpp
    src/main.cpp
)

set(HEADERS
    include/Config.hpp
    include/FastLaneDetector.hpp
    include/YOLOv26Detector.hpp
    include/DistanceEstimator.hpp
    include/AEBSystem.hpp
    include/HUDVisualizer.hpp
    include/PipelineManager.hpp
)

add_executable(adas_vision ${SOURCES} ${HEADERS})

target_link_libraries(adas_vision PRIVATE
    ${OpenCV_LIBS}
    Threads::Threads
)

if(OpenMP_CXX_FOUND)
    target_link_libraries(adas_vision PRIVATE OpenMP::OpenMP_CXX)
endif()

# Standalone single-file executable
add_executable(adas_standalone standalone_adas_vision.cpp)
target_link_libraries(adas_standalone PRIVATE
    ${OpenCV_LIBS}
    Threads::Threads
)
if(OpenMP_CXX_FOUND)
    target_link_libraries(adas_standalone PRIVATE OpenMP::OpenMP_CXX)
endif()

# Output directory configuration
set_target_properties(adas_vision adas_standalone PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}"
)

