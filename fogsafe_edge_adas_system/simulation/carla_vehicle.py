"""
FogSafe IVCAS - CARLA Heavy Dumper Vehicle & Sensor Interface
Spawns heavy truck, attaches high-mount cabin camera, spawns lead obstacle, and applies controls.
"""

from typing import Optional, Tuple
import queue
import numpy as np
import carla


class CarlaDumperVehicle:
    """
    Manages the ego heavy dumper truck actor, lead obstacle, and cabin camera sensor in CARLA.
    """

    def __init__(
        self,
        world: carla.World,
        ego_blueprint_name: str = "vehicle.carlamotors.european_hgv",
        lead_blueprint_name: str = "vehicle.mercedes.sprinter",
        mount_height_m: float = 3.6,
        forward_offset_m: float = 3.2,
        pitch_deg: float = -6.0,
        image_w: int = 1024,
        image_h: int = 512,
        fov_deg: float = 65.0,
    ):
        self.world = world
        self.bp_library = world.get_blueprint_library()
        self.ego_bp_name = ego_blueprint_name
        self.lead_bp_name = lead_blueprint_name
        self.cam_height = mount_height_m
        self.cam_offset = forward_offset_m
        self.cam_pitch = pitch_deg
        self.w = image_w
        self.h = image_h
        self.fov = fov_deg

        self.ego_vehicle: Optional[carla.Vehicle] = None
        self.lead_vehicle: Optional[carla.Vehicle] = None
        self.camera_sensor: Optional[carla.Sensor] = None
        self.image_queue = queue.Queue(maxsize=4)

    def spawn(
        self,
        spawn_idx: Optional[int] = None,
        spawn_lead_hazard: bool = False,
        lead_gap_m: float = 25.0,
        lead_autopilot: bool = True,
        tm_port: int = 8000,
    ) -> carla.Transform:
        """
        Spawn ego heavy truck and optional lead vehicle.
        """
        spawn_points = self.world.get_map().get_spawn_points()
        if not spawn_points:
            raise RuntimeError("No spawn points available in CARLA map!")

        # 1. Spawn Ego Heavy Truck (Robust collision-free search)
        ego_bp = self.bp_library.find(self.ego_bp_name)
        if not ego_bp:
            ego_bp = self.bp_library.filter("vehicle.carlamotors.*")[0]
        ego_bp.set_attribute("role_name", "hero_dumper")

        ego_transform = None
        # If user specified a spawn index, try it first
        candidate_indices = []
        if spawn_idx is not None and spawn_idx < len(spawn_points):
            candidate_indices.append(spawn_idx)
        # Add remaining spawn points
        candidate_indices.extend([i for i in range(len(spawn_points)) if i != spawn_idx])

        for idx in candidate_indices:
            sp = carla.Transform(
                carla.Location(
                    x=spawn_points[idx].location.x,
                    y=spawn_points[idx].location.y,
                    z=spawn_points[idx].location.z + 0.5,  # slight elevation clearance for truck suspension
                ),
                spawn_points[idx].rotation,
            )
            self.ego_vehicle = self.world.try_spawn_actor(ego_bp, sp)
            if self.ego_vehicle is not None:
                ego_transform = sp
                print(f"[CarlaDumperVehicle] Spawned Ego Truck: {ego_bp.id} at spawn point #{idx} ({sp.location})")
                break

        if self.ego_vehicle is None:
            raise RuntimeError("Could not find any clear collision-free spawn point in CARLA map!")

        # 2. Attach Cabin-Mounted Front Camera
        cam_bp = self.bp_library.find("sensor.camera.rgb")
        cam_bp.set_attribute("image_size_x", str(self.w))
        cam_bp.set_attribute("image_size_y", str(self.h))
        cam_bp.set_attribute("fov", str(self.fov))
        cam_bp.set_attribute("sensor_tick", "0.05")  # 20 FPS

        # Mount at elevated dumper cabin height (z=3.5m) with downward pitch
        cam_transform = carla.Transform(
            carla.Location(x=self.cam_offset, y=0.0, z=self.cam_height),
            carla.Rotation(pitch=self.cam_pitch, yaw=0.0, roll=0.0),
        )
        self.camera_sensor = self.world.spawn_actor(
            cam_bp, cam_transform, attach_to=self.ego_vehicle
        )
        self.camera_sensor.listen(self._on_camera_frame)
        print(f"[CarlaDumperVehicle] Attached Cabin Camera: z={self.cam_height}m, pitch={self.cam_pitch}°")

        # 3. Spawn Lead Obstacle Vehicle Ahead for AEB Test
        if spawn_lead_hazard:
            lead_bp = self.bp_library.find(self.lead_bp_name)
            if not lead_bp:
                lead_bp = self.bp_library.filter("vehicle.*")[1]

            lead_bp.set_attribute("role_name", "lead_hazard")

            # Calculate position ahead in same heading
            yaw_rad = np.radians(ego_transform.rotation.yaw)
            lead_x = ego_transform.location.x + lead_gap_m * np.cos(yaw_rad)
            lead_y = ego_transform.location.y + lead_gap_m * np.sin(yaw_rad)
            lead_z = ego_transform.location.z + 0.5

            lead_transform = carla.Transform(
                carla.Location(x=lead_x, y=lead_y, z=lead_z),
                ego_transform.rotation,
            )

            try:
                self.lead_vehicle = self.world.spawn_actor(lead_bp, lead_transform)
                if lead_autopilot:
                    try:
                        self.lead_vehicle.set_autopilot(True, tm_port)
                    except Exception:
                        pass
                print(f"[CarlaDumperVehicle] Spawned Lead Vehicle: {lead_bp.id} at {lead_gap_m}m ahead (autopilot={lead_autopilot})")
            except Exception as e:
                print(f"[CarlaDumperVehicle] Warning: Failed to spawn lead vehicle: {e}")

        return ego_transform

    def _on_camera_frame(self, carla_image: carla.Image):
        """Callback from CARLA camera sensor."""
        # Convert raw BGRA buffer to NumPy BGR image
        array = np.frombuffer(carla_image.raw_data, dtype=np.dtype("uint8"))
        array = np.reshape(array, (carla_image.height, carla_image.width, 4))
        bgr = array[:, :, :3]  # Drop alpha channel

        # Put into queue (drop older frames if pipeline is lagging)
        if self.image_queue.full():
            try:
                self.image_queue.get_nowait()
            except queue.Empty:
                pass
        self.image_queue.put(bgr)

    def get_latest_frame(self, timeout: float = 1.0) -> Optional[np.ndarray]:
        """Fetch latest frame from camera queue."""
        try:
            return self.image_queue.get(timeout=timeout)
        except queue.Empty:
            return None

    def get_ego_speed_ms(self) -> float:
        """Get current ego speed in meters per second."""
        if not self.ego_vehicle:
            return 0.0
        vel = self.ego_vehicle.get_velocity()
        return float(np.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2))

    def apply_control(
        self, throttle: float, steer: float, brake: float, hand_brake: bool = False
    ):
        """Send vehicle actuation control to CARLA ego truck."""
        if not self.ego_vehicle:
            return

        ctrl = carla.VehicleControl()
        ctrl.throttle = float(np.clip(throttle, 0.0, 1.0))
        ctrl.steer = float(np.clip(steer, -1.0, 1.0))
        ctrl.brake = float(np.clip(brake, 0.0, 1.0))
        ctrl.hand_brake = hand_brake
        ctrl.manual_gear_shift = False

        self.ego_vehicle.apply_control(ctrl)

    def enable_ego_autopilot(self, tm_port: int = 8000) -> None:
        """Enable CARLA TrafficManager autopilot on ego truck for continuous route driving."""
        if self.ego_vehicle and self.ego_vehicle.is_alive:
            try:
                self.ego_vehicle.set_autopilot(True, tm_port)
                print(f"[CarlaDumperVehicle] Ego truck autopilot enabled on TM port {tm_port}.")
            except Exception as e:
                print(f"[CarlaDumperVehicle] Warning: Failed to enable ego autopilot: {e}")

    def disable_ego_autopilot(self) -> None:
        """Disable CARLA TrafficManager autopilot on ego truck."""
        if self.ego_vehicle and self.ego_vehicle.is_alive:
            try:
                self.ego_vehicle.set_autopilot(False)
            except Exception:
                pass

    def enable_lead_autopilot(self, tm_port: int = 8000) -> None:
        """Enable CARLA TrafficManager autopilot on lead vehicle."""
        if self.lead_vehicle and self.lead_vehicle.is_alive:
            try:
                self.lead_vehicle.set_autopilot(True, tm_port)
                print(f"[CarlaDumperVehicle] Lead vehicle autopilot enabled on TM port {tm_port}.")
            except Exception as e:
                print(f"[CarlaDumperVehicle] Warning: Failed to enable lead autopilot: {e}")

    def cleanup(self):
        """Destroy actors upon exit."""
        print("[CarlaDumperVehicle] Cleaning up CARLA simulation actors...")
        if self.camera_sensor and self.camera_sensor.is_alive:
            self.camera_sensor.stop()
            self.camera_sensor.destroy()
        if self.lead_vehicle and self.lead_vehicle.is_alive:
            self.lead_vehicle.destroy()
        if self.ego_vehicle and self.ego_vehicle.is_alive:
            self.ego_vehicle.destroy()
        print("[CarlaDumperVehicle] Cleanup complete.")
