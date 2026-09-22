#!/usr/bin/env python3
"""
FogSafe IVCAS - CARLA Simulation & ADAS Co-Runner
Executes CARLA simulation with FogSafe IVCAS Level-2 ADAS (AEB & LDW) in closed loop.
Simulates severe fog (3-5m visibility) and low light for Big Dumper vehicles with real-time HUD.
"""

import sys
import os
import time
import argparse
import cv2

# Add parent directory to path so fogsafe_ivcas can be imported directly
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import carla
from src.pipeline import FogSafeAdasPipeline
from simulation.carla_weather import CarlaFogWeatherManager
from simulation.carla_vehicle import CarlaDumperVehicle
from simulation.carla_traffic import CarlaTrafficManager


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Run FogSafe IVCAS Level-2 ADAS with CARLA Simulation"
    )
    parser.add_argument("--host", default="127.0.0.1", help="CARLA server IP (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=2000, help="CARLA server TCP port (default: 2000)")
    parser.add_argument("--timeout", type=float, default=15.0, help="Client connection timeout in seconds")

    # Fog & Weather Configuration
    parser.add_argument("--fog-distance", type=float, default=4.0, help="Fog distance in meters (default: 4.0m for 3-5m fog)")
    parser.add_argument("--fog-density", type=float, default=85.0, help="Fog density percent 0-100 (default: 85.0)")
    parser.add_argument("--sun-altitude", type=float, default=45.0, help="Sun altitude angle for daytime (default: 45.0)")

    # Real-Time Moving Traffic Settings
    parser.add_argument("--traffic", dest="traffic", action="store_true", default=True, help="Enable real-time moving ambient traffic (default: True)")
    parser.add_argument("--no-traffic", dest="traffic", action="store_false", help="Disable ambient traffic")
    parser.add_argument("--num-vehicles", type=int, default=25, help="Number of moving traffic vehicles (default: 25)")
    parser.add_argument("--num-walkers", type=int, default=0, help="Number of pedestrians (default: 0)")
    parser.add_argument("--tm-port", type=int, default=8000, help="Traffic Manager communication port (default: 8000)")

    # Dumper & Obstacle Settings
    parser.add_argument("--ego-bp", default="vehicle.carlamotors.european_hgv", help="Ego truck blueprint")
    parser.add_argument("--spawn-lead", action="store_true", default=False, help="Spawn a dedicated lead obstacle vehicle ahead for AEB obstacle testing (default: False - open road)")
    parser.add_argument("--lead-bp", default="vehicle.mercedes.sprinter", help="Lead obstacle blueprint")
    parser.add_argument("--lead-gap", type=float, default=25.0, help="Initial gap to lead vehicle in meters (default: 25.0m)")
    parser.add_argument("--lead-stationary", action="store_true", default=False, help="Keep lead vehicle stationary as a stopped obstacle (default: False - moves with traffic)")
    parser.add_argument("--ego-autopilot", action="store_true", default=True, help="Enable CARLA autopilot on ego truck for continuous route driving (default: True)")
    parser.add_argument("--no-ego-autopilot", dest="ego_autopilot", action="store_false", help="Use ADAS direct steering control instead of CARLA autopilot")
    parser.add_argument("--spawn-point", type=int, default=None, help="Spawn point index")

    # Display & Execution Options
    parser.add_argument("--no-hud-window", action="store_true", help="Run headless without opening OpenCV window")
    parser.add_argument("--save-video", type=str, default="", help="Optional output path to record HUD video")
    parser.add_argument("--max-frames", type=int, default=None, help="Maximum simulation frames to run (default: None for infinite loop)")

    return parser.parse_args()


def set_all_traffic_lights_green(world: carla.World):
    """Freeze all traffic lights to Green for continuous uninterrupted traffic movement."""
    try:
        tls = world.get_actors().filter("traffic.traffic_light")
        for tl in tls:
            tl.set_state(carla.TrafficLightState.Green)
            tl.set_green_time(100000.0)
            tl.freeze(True)
        print(f"[TrafficLights] Frozen {len(tls)} traffic lights to GREEN for continuous movement.")
    except Exception as e:
        print(f"[TrafficLights] Warning: Failed to freeze traffic lights: {e}")


def main():
    args = parse_arguments()
    print("=" * 65)
    print("      FogSafe IVCAS - Real-time CARLA ADAS Co-Runner")
    print("      Level-2 ADAS (AEB & LDW) for Big Dumper Trucks")
    print(f"      Fog Visibility: {args.fog_distance}m | Density: {args.fog_density}%")
    print("=" * 65)

    client = carla.Client(args.host, args.port)
    client.set_timeout(args.timeout)

    world = None
    vehicle_mgr = None
    traffic_mgr = None
    orig_settings = None
    video_writer = None

    try:
        world = client.get_world()
        orig_settings = world.get_settings()

        # Enable Synchronous Mode for deterministic 20 FPS physics
        settings = world.get_settings()
        settings.synchronous_mode = True
        settings.fixed_delta_seconds = 0.05  # 20 FPS
        world.apply_settings(settings)
        print("[Co-Runner] Configured CARLA Synchronous Mode at 20 FPS.")

        # Make all signal lights always green for continuous movement
        set_all_traffic_lights_green(world)

        # 1. Apply Foggy & Low-Light Weather
        weather_mgr = CarlaFogWeatherManager(
            world=world,
            fog_distance_m=args.fog_distance,
            fog_density=args.fog_density,
            sun_altitude=args.sun_altitude,
        )
        weather_mgr.apply()

        # 2. Spawn Big Dumper Vehicle & Camera
        vehicle_mgr = CarlaDumperVehicle(
            world=world,
            ego_blueprint_name=args.ego_bp,
            lead_blueprint_name=args.lead_bp,
            mount_height_m=3.6,
            forward_offset_m=3.2,
            pitch_deg=-6.0,
            image_w=1024,
            image_h=512,
        )
        vehicle_mgr.spawn(
            spawn_idx=args.spawn_point,
            spawn_lead_hazard=args.spawn_lead,
            lead_gap_m=args.lead_gap,
            lead_autopilot=not args.lead_stationary,
            tm_port=args.tm_port,
        )

        # 3. Spawn Real-Time Moving Traffic (Simultaneously)
        if args.traffic:
            try:
                traffic_mgr = CarlaTrafficManager(
                    client=client,
                    world=world,
                    tm_port=args.tm_port,
                    synchronous_mode=True,
                )
                ego_loc = vehicle_mgr.ego_vehicle.get_location() if vehicle_mgr.ego_vehicle else None
                traffic_mgr.spawn_traffic(
                    num_vehicles=args.num_vehicles,
                    num_walkers=args.num_walkers,
                    car_lights_on=True,
                    ego_spawn_location=ego_loc,
                    min_distance_from_ego=20.0,
                )
            except Exception as te:
                print(f"[Co-Runner] Warning: Ambient traffic initialization error: {te}")

        # Enable lead vehicle autopilot if it was spawned and requested to move
        if args.spawn_lead and not args.lead_stationary:
            vehicle_mgr.enable_lead_autopilot(args.tm_port)

        # Enable ego vehicle autopilot for route driving if requested
        ego_autopilot_active = False
        if args.ego_autopilot:
            vehicle_mgr.enable_ego_autopilot(args.tm_port)
            ego_autopilot_active = True
            if traffic_mgr:
                try:
                    traffic_mgr.tm.vehicle_percentage_speed_difference(vehicle_mgr.ego_vehicle, -30.0)
                    traffic_mgr.tm.auto_lane_change(vehicle_mgr.ego_vehicle, False)
                except Exception:
                    pass

        # 4. Initialize FogSafe ADAS Pipeline
        config_dir = os.path.join(project_root, "config")
        assets_dir = os.path.join(project_root, "assets", "icons")
        pipeline = FogSafeAdasPipeline(config_dir=config_dir, assets_dir=assets_dir)
        print("[Co-Runner] FogSafe ADAS Pipeline Initialized Successfully.")

        window_name = "FogSafe IVCAS - Heavy Dumper ADAS HUD"
        if not args.no_hud_window:
            cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
            cv2.resizeWindow(window_name, 1024, 512)

        if args.save_video:
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            video_writer = cv2.VideoWriter(args.save_video, fourcc, 20.0, (1024, 512))

        print("[Co-Runner] Starting closed-loop ADAS loop. Press 'q' or ESC in HUD window to quit.")

        frame_count = 0
        while True:
            # Advance simulation world step
            world.tick()

            # Retrieve camera frame from dumper cabin
            frame = vehicle_mgr.get_latest_frame(timeout=0.5)
            if frame is None:
                continue

            # Read ego dumper telemetry
            ego_speed_ms = vehicle_mgr.get_ego_speed_ms()

            # Execute FogSafe ADAS Cycle: Enhancement -> Perception -> AEB/LDW -> HUD
            result = pipeline.process_frame(
                raw_bgr=frame,
                ego_speed_ms=ego_speed_ms,
                timestamp=time.time(),
            )

            # Apply ADAS control actuation back to CARLA truck
            ctrl = result["controls"]
            if args.ego_autopilot:
                # If AEB or FCW demands braking, override autopilot immediately
                if ctrl["brake"] > 0.05 or ctrl["hand_brake"]:
                    if ego_autopilot_active:
                        vehicle_mgr.disable_ego_autopilot()
                        ego_autopilot_active = False
                    vehicle_mgr.apply_control(
                        throttle=0.0,
                        steer=ctrl["steer"],
                        brake=ctrl["brake"],
                        hand_brake=ctrl["hand_brake"],
                    )
                else:
                    # Clear road: resume autopilot navigation if paused
                    if not ego_autopilot_active:
                        vehicle_mgr.enable_ego_autopilot(args.tm_port)
                        ego_autopilot_active = True
            else:
                # Direct ADAS steering and throttle control
                vehicle_mgr.apply_control(
                    throttle=ctrl["throttle"],
                    steer=ctrl["steer"],
                    brake=ctrl["brake"],
                    hand_brake=ctrl["hand_brake"],
                )

            hud_frame = result["hud_frame"]

            if video_writer is not None:
                video_writer.write(hud_frame)

            if not args.no_hud_window:
                cv2.imshow(window_name, hud_frame)
                key = cv2.waitKey(1) & 0xFF
                if key in (27, ord("q")):
                    print("\n[Co-Runner] Exit requested by user.")
                    break

            # Print telemetry summary every 20 frames (1 second)
            frame_count += 1

            if frame_count == 40 or (args.max_frames and frame_count == args.max_frames - 5):
                snapshot_path = os.path.join(
                    r"C:\Users\samee\.gemini\antigravity\brain\f9b86e59-e022-4e23-b787-ce11298b9814",
                    "carla_open_road_hud.png",
                )
                cv2.imwrite(snapshot_path, hud_frame)
                print(f"\n[Co-Runner] Saved open road HUD snapshot to: {snapshot_path}")

            if args.max_frames and frame_count >= args.max_frames:
                print(f"\n[Co-Runner] Reached target frame count: {args.max_frames}. Exiting loop.")
                break

            if frame_count % 20 == 0:
                aeb_msg = result["aeb_state"]["alert_message"]
                vis_m = result["visibility"]["visibility_meters"]
                speed_kmh = ego_speed_ms * 3.6
                print(
                    f"\r[Speed: {speed_kmh:4.1f} km/h | Vis: {vis_m:4.1f}m | "
                    f"AEB: {aeb_msg:18s} | "
                    f"Brake: {ctrl['brake']:3.2f} | "
                    f"FPS: {result['fps']:4.1f}]",
                    end="",
                    flush=True,
                )

    except KeyboardInterrupt:
        print("\n[Co-Runner] Interrupted by user.")
    except Exception as e:
        print(f"\n[Co-Runner] Error occurred: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("\n[Co-Runner] Shutting down...")
        if video_writer:
            video_writer.release()
        if not args.no_hud_window:
            cv2.destroyAllWindows()
        if traffic_mgr:
            traffic_mgr.cleanup()
        if vehicle_mgr:
            vehicle_mgr.cleanup()
        if world and orig_settings:
            world.apply_settings(orig_settings)
            print("[Co-Runner] Restored original CARLA settings.")
        print("[Co-Runner] Finished.")


if __name__ == "__main__":
    main()
