"""
FogSafe IVCAS - Dumper Camera Geometry & Inverse Perspective Mapping (IPM)
Rigorous 3D ground projection for heavy dumper trucks with elevated cabin cameras.
"""

from typing import Tuple, List, Union
import cv2
import numpy as np


class DumperCameraGeometry:
    """
    Inverse Perspective Mapping (IPM) and projective geometry for heavy dumper trucks.
    
    Vehicle Coordinate Frame (ISO 8855 / SAE):
      +X: Forward along vehicle longitudinal axis (meters ahead of front bumper)
      +Y: Lateral left (meters)
      +Z: Up (meters)
    """

    def __init__(
        self,
        camera_height_m: float = 3.5,
        forward_offset_m: float = 2.2,
        pitch_deg: float = 9.5,
        yaw_deg: float = 0.0,
        roll_deg: float = 0.0,
        fov_h_deg: float = 65.0,
        image_width: int = 1024,
        image_height: int = 512,
    ):
        self.h_cam = float(camera_height_m)
        self.d_bumper = float(forward_offset_m)
        self.pitch_rad = float(np.radians(pitch_deg))
        self.yaw_rad = float(np.radians(yaw_deg))
        self.roll_rad = float(np.radians(roll_deg))
        self.fov_h_rad = float(np.radians(fov_h_deg))
        self.w = image_width
        self.h = image_height

        # Intrinsic Matrix K
        self.fx = (self.w * 0.5) / np.tan(self.fov_h_rad * 0.5)
        # Assuming square pixels
        self.fy = self.fx
        self.cx = self.w * 0.5
        self.cy = self.h * 0.5

        self.K = np.array(
            [[self.fx, 0.0, self.cx], [0.0, self.fy, self.cy], [0.0, 0.0, 1.0]],
            dtype=np.float64,
        )

        # Extrinsic Rotation Matrix R (Pitch, Yaw, Roll)
        # Camera to Vehicle ground coordinate transform
        Rx = np.array(
            [
                [1, 0, 0],
                [0, np.cos(self.pitch_rad), -np.sin(self.pitch_rad)],
                [0, np.sin(self.pitch_rad), np.cos(self.pitch_rad)],
            ]
        )
        Ry = np.array(
            [
                [np.cos(self.yaw_rad), 0, np.sin(self.yaw_rad)],
                [0, 1, 0],
                [-np.sin(self.yaw_rad), 0, np.cos(self.yaw_rad)],
            ]
        )
        Rz = np.array(
            [
                [np.cos(self.roll_rad), -np.sin(self.roll_rad), 0],
                [np.sin(self.roll_rad), np.cos(self.roll_rad), 0],
                [0, 0, 1],
            ]
        )
        # Standard camera frame (x right, y down, z forward)
        self.R = Rz @ Ry @ Rx

        # Compute Ground Plane Homography H (Pixel -> Ground World [X, Y, 1])
        self.H_px2world, self.H_world2px = self._compute_homographies()

    def _compute_homographies(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        Compute direct 3x3 homography matrix between pixel plane and road ground plane.
        """
        # Define 4 reference points on the road ground ahead of the truck:
        # P = [X_fwd (meters), Y_lat (meters), Z=0]
        # X: 8m, 15m, 35m, 60m ahead; Y: -2m to +2m (lane width)
        ground_pts = np.array(
            [
                [6.0, -2.0, 0.0],
                [6.0, 2.0, 0.0],
                [40.0, 2.0, 0.0],
                [40.0, -2.0, 0.0],
            ],
            dtype=np.float64,
        )

        # Project 3D ground points into camera pixel coordinates (u, v)
        px_pts = []
        for pt in ground_pts:
            # Transform to camera optical coordinates:
            # Ground X is vehicle forward (+X), Ground Y is vehicle left (+Y), Z is up (+Z)
            # Camera frame: X_cam = -Y_veh, Y_cam = -Z_veh + h_cam, Z_cam = X_veh - d_bumper
            X_cam = -pt[1]
            Y_cam = self.h_cam - pt[2]
            Z_cam = pt[0] - self.d_bumper

            # Apply pitch rotation
            vec = np.array([X_cam, Y_cam, Z_cam])
            # Pitch down rotates vector
            vec_rot = np.array([
                vec[0],
                vec[1] * np.cos(self.pitch_rad) - vec[2] * np.sin(self.pitch_rad),
                vec[1] * np.sin(self.pitch_rad) + vec[2] * np.cos(self.pitch_rad),
            ])

            if vec_rot[2] > 0.1:
                u = self.fx * (vec_rot[0] / vec_rot[2]) + self.cx
                v = self.fy * (vec_rot[1] / vec_rot[2]) + self.cy
                px_pts.append([u, v])
            else:
                px_pts.append([self.cx, self.h])

        src_px = np.array(px_pts, dtype=np.float32)
        dst_world = np.array([[p[0], p[1]] for p in ground_pts], dtype=np.float32)

        H_px2world, _ = cv2.findHomography(src_px, dst_world)
        H_world2px = np.linalg.inv(H_px2world)

        return H_px2world, H_world2px

    def pixel_to_world(self, u: float, v: float) -> Tuple[float, float]:
        """
        Convert image pixel (u, v) on ground to vehicle coordinates (x_fwd, y_lat) in meters.
        """
        p = np.array([u, v, 1.0], dtype=np.float64)
        w_vec = self.H_px2world @ p
        if abs(w_vec[2]) < 1e-6:
            return 100.0, 0.0
        x_fwd = w_vec[0] / w_vec[2]
        y_lat = w_vec[1] / w_vec[2]
        return float(x_fwd), float(y_lat)

    def world_to_pixel(self, x_fwd: float, y_lat: float) -> Tuple[int, int]:
        """
        Convert vehicle coordinates (x_fwd, y_lat) in meters to image pixel (u, v).
        """
        p = np.array([x_fwd, y_lat, 1.0], dtype=np.float64)
        px_vec = self.H_world2px @ p
        if abs(px_vec[2]) < 1e-6:
            return int(self.cx), int(self.cy)
        u = int(np.round(px_vec[0] / px_vec[2]))
        v = int(np.round(px_vec[1] / px_vec[2]))
        return u, v

    def project_path_corridor(
        self,
        a: float,
        b: float,
        c: float,
        half_width_m: float = 1.9,
        x_range: Tuple[float, float] = (3.0, 45.0),
        step: float = 0.5,
    ) -> Tuple[List[Tuple[int, int]], List[Tuple[int, int]]]:
        """
        Generate left and right polygon pixel coordinates for a lane/path polynomial:
            y = a * x^2 + b * x + c
        """
        left_pts = []
        right_pts = []

        x = x_range[0]
        while x <= x_range[1]:
            y_center = a * (x ** 2) + b * x + c
            y_left = y_center + half_width_m
            y_right = y_center - half_width_m

            ul, vl = self.world_to_pixel(x, y_left)
            ur, vr = self.world_to_pixel(x, y_right)

            # Keep points within or near image bounds
            if -100 <= ul <= self.w + 100 and -100 <= vl <= self.h + 100:
                left_pts.append((ul, vl))
            if -100 <= ur <= self.w + 100 and -100 <= vr <= self.h + 100:
                right_pts.append((ur, vr))

            x += step

        return left_pts, right_pts
