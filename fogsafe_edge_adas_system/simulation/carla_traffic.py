"""
FogSafe IVCAS - CARLA Real-Time Traffic Management Subsystem
Spawns and orchestrates moving background traffic in lockstep with CARLA Synchronous Mode.
Enables vehicle headlights/foglights for severe fog (3-5m) and low-light simulation.
"""

from typing import List, Optional
import random
import time
import logging
import carla
from carla.command import SpawnActor, SetAutopilot, FutureActor, DestroyActor

logger = logging.getLogger("FogSafe.Traffic")


class CarlaTrafficManager:
    """
    Orchestrates real-time ambient vehicular and pedestrian traffic in CARLA.
    Coordinates with CARLA TrafficManager in synchronous mode for 20 FPS lockstep physics.
    """

    def __init__(
        self,
        client: carla.Client,
        world: carla.World,
        tm_port: int = 8000,
        synchronous_mode: bool = True,
        seed: Optional[int] = None,
    ):
        self.client = client
        self.world = world
        self.tm_port = tm_port
        self.synchronous_mode = synchronous_mode
        self.seed = seed

        self.vehicles_list: List[int] = []
        self.walkers_list: List[int] = []
        self.all_walker_ids: List[int] = []
        self.all_walker_controllers: List[carla.WalkerAIController] = []

        # Connect to CARLA TrafficManager daemon
        self.tm = self.client.get_trafficmanager(self.tm_port)
        if self.synchronous_mode:
            self.tm.set_synchronous_mode(True)

        if self.seed is not None:
            self.tm.set_random_device_seed(self.seed)
            random.seed(self.seed)

        # Realistic road behavior
        self.tm.set_global_distance_to_leading_vehicle(3.0)
        self.tm.global_percentage_speed_difference(20.0)  # Cruise at realistic speed

        # Enable hybrid physics to save CPU/GPU cycles for actors beyond 60m
        try:
            self.tm.set_hybrid_physics_mode(True)
            self.tm.set_hybrid_physics_radius(60.0)
        except Exception:
            pass

        print(f"[CarlaTraffic] TrafficManager connected on port {self.tm_port} (sync={self.synchronous_mode}).")

    def spawn_traffic(
        self,
        num_vehicles: int = 25,
        num_walkers: int = 0,
        car_lights_on: bool = True,
        ego_spawn_location: Optional[carla.Location] = None,
        min_distance_from_ego: float = 15.0,
    ) -> int:
        """
        Spawn moving ambient traffic across map spawn points.

        Args:
            num_vehicles: Number of vehicles to spawn.
            num_walkers: Number of pedestrians to spawn.
            car_lights_on: Automatically turn on low beam & fog lights for fog visibility.
            ego_spawn_location: Position of ego dumper truck to prevent spawning inside it.
            min_distance_from_ego: Minimum clearance around ego vehicle.

        Returns:
            Number of successfully spawned vehicles.
        """
        bp_library = self.world.get_blueprint_library()
        vehicle_bps = bp_library.filter("vehicle.*")
        # Filter for standard passenger and commercial road vehicles
        vehicle_bps = [
            x for x in vehicle_bps
            if x.has_attribute("base_type") and str(x.get_attribute("base_type")) in ("car", "truck", "van")
            and not x.id.startswith("vehicle.carlamotors.european_hgv")  # Reserve dumper for ego
        ]
        if not vehicle_bps:
            vehicle_bps = list(bp_library.filter("vehicle.*"))

        spawn_points = self.world.get_map().get_spawn_points()
        if not spawn_points:
            print("[CarlaTraffic] Warning: No spawn points available on current map.")
            return 0

        # Filter out spawn points too close to ego vehicle
        valid_spawns = []
        for sp in spawn_points:
            if ego_spawn_location is not None:
                d = sp.location.distance(ego_spawn_location)
                if d < min_distance_from_ego:
                    continue
            valid_spawns.append(sp)

        random.shuffle(valid_spawns)
        num_to_spawn = min(num_vehicles, len(valid_spawns))

        # 1. Batch spawn vehicles
        batch = []
        for i in range(num_to_spawn):
            transform = valid_spawns[i]
            bp = random.choice(vehicle_bps)

            if bp.has_attribute("color"):
                color = random.choice(bp.get_attribute("color").recommended_values)
                bp.set_attribute("color", color)
            if bp.has_attribute("driver_id"):
                driver_id = random.choice(bp.get_attribute("driver_id").recommended_values)
                bp.set_attribute("driver_id", driver_id)

            bp.set_attribute("role_name", "ambient_traffic")

            # Spawn and automatically bind to TrafficManager autopilot
            cmd = SpawnActor(bp, transform).then(
                SetAutopilot(FutureActor, True, self.tm.get_port())
            )
            batch.append(cmd)

        results = self.client.apply_batch_sync(batch, False)
        for res in results:
            if not res.error:
                self.vehicles_list.append(res.actor_id)
            else:
                logger.debug(f"Vehicle spawn error: {res.error}")

        spawned_count = len(self.vehicles_list)
        print(f"[CarlaTraffic] Spawned {spawned_count} moving traffic vehicles.")

        # 2. Configure lights for fog / low-light conditions
        if car_lights_on and self.vehicles_list:
            actors = self.world.get_actors(self.vehicles_list)
            for actor in actors:
                try:
                    self.tm.update_vehicle_lights(actor, True)
                    # Turn on low beam, position, and fog lights
                    light_state = (
                        carla.VehicleLightState.Position
                        | carla.VehicleLightState.LowBeam
                        | carla.VehicleLightState.Fog
                    )
                    actor.set_light_state(carla.VehicleLightState(light_state))
                except Exception:
                    pass

        # 3. Optional Walkers
        if num_walkers > 0:
            self._spawn_walkers(num_walkers)

        return spawned_count

    def _spawn_walkers(self, num_walkers: int):
        """Spawn pedestrians with AI wander controllers."""
        bp_library = self.world.get_blueprint_library()
        walker_bps = bp_library.filter("walker.pedestrian.*")
        walker_spawn_pts = []
        for _ in range(num_walkers):
            loc = self.world.get_random_location_from_navigation()
            if loc is not None:
                walker_spawn_pts.append(carla.Transform(loc))

        batch = []
        walker_speeds = []
        for sp in walker_spawn_pts:
            walker_bp = random.choice(walker_bps)
            if walker_bp.has_attribute("is_invincible"):
                walker_bp.set_attribute("is_invincible", "false")
            batch.append(SpawnActor(walker_bp, sp))

        results = self.client.apply_batch_sync(batch, True)
        for i, res in enumerate(results):
            if not res.error:
                self.walkers_list.append(res.actor_id)
                walker_speeds.append(1.4)  # 1.4 m/s walking speed

        # Spawn AI controller for each walker
        walker_controller_bp = bp_library.find("controller.ai.walker")
        batch = []
        for walker_id in self.walkers_list:
            batch.append(SpawnActor(walker_controller_bp, carla.Transform(), walker_id))

        results = self.client.apply_batch_sync(batch, True)
        for i, res in enumerate(results):
            if not res.error:
                self.all_walker_ids.append(res.actor_id)

        all_controllers = self.world.get_actors(self.all_walker_ids)
        for i, ctrl in enumerate(all_controllers):
            try:
                ctrl.start()
                ctrl.go_to_location(self.world.get_random_location_from_navigation())
                ctrl.set_max_speed(walker_speeds[i])
            except Exception:
                pass

        print(f"[CarlaTraffic] Spawned {len(self.walkers_list)} pedestrians.")

    def cleanup(self):
        """Cleanly destroy all spawned traffic actors."""
        num_v = len(self.vehicles_list)
        num_w = len(self.walkers_list)
        if num_v == 0 and num_w == 0:
            return

        print(f"[CarlaTraffic] Cleaning up {num_v} vehicles and {num_w} walkers...")

        # Stop walker controllers first
        for wid in self.all_walker_ids:
            try:
                actor = self.world.get_actor(wid)
                if actor is not None:
                    actor.stop()
            except Exception:
                pass

        all_to_destroy = [DestroyActor(x) for x in self.all_walker_ids] + \
                         [DestroyActor(x) for x in self.walkers_list] + \
                         [DestroyActor(x) for x in self.vehicles_list]

        if all_to_destroy:
            self.client.apply_batch(all_to_destroy)

        self.vehicles_list.clear()
        self.walkers_list.clear()
        self.all_walker_ids.clear()
        print("[CarlaTraffic] All traffic actors safely destroyed.")
