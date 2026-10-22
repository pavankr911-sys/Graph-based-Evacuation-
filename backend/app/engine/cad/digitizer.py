import cv2
import numpy as np
import math
from uuid import uuid4
from typing import Dict, Any, List, Optional, Tuple

def snap_to_grid(val: float, grid_size: float = 0.5) -> float:
    return round(val / grid_size) * grid_size

def merge_colinear_segments(segments: List[Tuple[float, float, float, float]], tol: float = 0.8) -> List[Tuple[float, float, float, float]]:
    """
    Merges segments that lie along the same line and either overlap or have a small gap.
    Each segment is (x1, y1, x2, y2).
    """
    if not segments:
        return []

    horizontal = []
    vertical = []
    diagonal = []

    for seg in segments:
        x1, y1, x2, y2 = seg
        # Normalize order
        if x1 > x2 or (x1 == x2 and y1 > y2):
            x1, y1, x2, y2 = x2, y2, x1, y1

        if abs(y1 - y2) <= tol:
            horizontal.append((min(x1, x2), (y1 + y2) / 2, max(x1, x2), (y1 + y2) / 2))
        elif abs(x1 - x2) <= tol:
            vertical.append(((x1 + x2) / 2, min(y1, y2), (x1 + x2) / 2, max(y1, y2)))
        else:
            diagonal.append((x1, y1, x2, y2))

    merged = []

    # Merge horizontals
    horizontal.sort(key=lambda s: (round(s[1] / tol), s[0]))
    idx = 0
    while idx < len(horizontal):
        curr_x1, curr_y, curr_x2, _ = horizontal[idx]
        idx += 1
        while idx < len(horizontal):
            nxt_x1, nxt_y, nxt_x2, _ = horizontal[idx]
            if abs(nxt_y - curr_y) <= tol and nxt_x1 <= curr_x2 + tol * 2:
                curr_x2 = max(curr_x2, nxt_x2)
                curr_y = (curr_y + nxt_y) / 2
                idx += 1
            else:
                break
        merged.append((curr_x1, curr_y, curr_x2, curr_y))

    # Merge verticals
    vertical.sort(key=lambda s: (round(s[0] / tol), s[1]))
    idx = 0
    while idx < len(vertical):
        curr_x, curr_y1, _, curr_y2 = vertical[idx]
        idx += 1
        while idx < len(vertical):
            nxt_x, nxt_y1, _, nxt_y2 = vertical[idx]
            if abs(nxt_x - curr_x) <= tol and nxt_y1 <= curr_y2 + tol * 2:
                curr_y2 = max(curr_y2, nxt_y2)
                curr_x = (curr_x + nxt_x) / 2
                idx += 1
            else:
                break
        merged.append((curr_x, curr_y1, curr_x, curr_y2))

    merged.extend(diagonal)
    return merged

def digitize_blueprint(
    image_bytes: bytes,
    width_meters: float = 50.0,
    height_meters: float = 30.0,
    floor_id: Optional[str] = None,
    grid_snap: float = 0.5
) -> Dict[str, Any]:
    """
    Analyzes an architectural CAD sketch or floorplan image using Computer Vision (OpenCV)
    and extracts geometric wall elements and room boundaries scaled to real-world meters.
    """
    actual_floor_id = floor_id or str(uuid4())

    # Decode image from buffer
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image file: Unable to decode.")

    h_px, w_px = img.shape[:2]

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Invert if white background
    mean_val = np.mean(gray)
    if mean_val > 127:
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 5
        )
    else:
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 5
        )

    # Morphological kernels to isolate horizontal and vertical walls
    scale_kernel_h = max(10, int(w_px * 0.02))
    scale_kernel_v = max(10, int(h_px * 0.02))
    kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (scale_kernel_h, 1))
    kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (1, scale_kernel_v))

    h_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_h)
    v_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_v)
    walls_mask = cv2.bitwise_or(h_lines, v_lines)

    # Hough Line Transform on combined mask
    min_length = int(min(w_px, h_px) * 0.03)
    max_gap = int(min(w_px, h_px) * 0.02)
    raw_lines = cv2.HoughLinesP(
        walls_mask,
        rho=1,
        theta=np.pi / 180,
        threshold=25,
        minLineLength=max(15, min_length),
        maxLineGap=max(5, max_gap)
    )

    if raw_lines is None:
        # Fallback to threshold directly if morphological mask was too aggressive
        raw_lines = cv2.HoughLinesP(
            thresh,
            rho=1,
            theta=np.pi / 180,
            threshold=30,
            minLineLength=20,
            maxLineGap=8
        )

    detected_segments = []
    if raw_lines is not None:
        scale_x = width_meters / w_px
        scale_y = height_meters / h_px

        for line in raw_lines:
            coords = line.flatten() if hasattr(line, 'flatten') else (line[0] if len(line) == 1 else line)
            x1_px, y1_px, x2_px, y2_px = int(coords[0]), int(coords[1]), int(coords[2]), int(coords[3])
            x1_m = x1_px * scale_x
            y1_m = y1_px * scale_y
            x2_m = x2_px * scale_x
            y2_m = y2_px * scale_y

            # Filter out tiny specks (< 1.0 meter)
            if math.hypot(x2_m - x1_m, y2_m - y1_m) >= 1.0:
                detected_segments.append((x1_m, y1_m, x2_m, y2_m))

    # Merge overlapping/colinear segments
    merged_segments = merge_colinear_segments(detected_segments, tol=grid_snap * 1.5)

    walls: List[Dict[str, Any]] = []
    for x1, y1, x2, y2 in merged_segments:
        sx = snap_to_grid(x1, grid_snap)
        sy = snap_to_grid(y1, grid_snap)
        ex = snap_to_grid(x2, grid_snap)
        ey = snap_to_grid(y2, grid_snap)

        if math.hypot(ex - sx, ey - sy) >= 1.0:
            walls.append({
                "id": str(uuid4()),
                "floor_id": actual_floor_id,
                "type": "WALL",
                "start_x": sx,
                "start_y": sy,
                "end_x": ex,
                "end_y": ey,
                "is_combustible": False
            })

    # Room detection via contour hierarchy
    rooms: List[Dict[str, Any]] = []
    dilated_walls = cv2.dilate(walls_mask, np.ones((5, 5), np.uint8), iterations=2)
    inverted_rooms = cv2.bitwise_not(dilated_walls)
    
    contours, hierarchy = cv2.findContours(
        inverted_rooms, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE
    )

    room_count = 0
    scale_x = width_meters / w_px
    scale_y = height_meters / h_px

    if hierarchy is not None:
        for idx, cnt in enumerate(contours):
            area_px = cv2.contourArea(cnt)
            # Filter contours by size (skip tiny artifacts or the giant outer background)
            total_area_px = w_px * h_px
            if area_px < (total_area_px * 0.01) or area_px > (total_area_px * 0.70):
                continue

            rx_px, ry_px, rw_px, rh_px = cv2.boundingRect(cnt)
            
            # Convert bounding rectangle to meters
            x1 = snap_to_grid(rx_px * scale_x, grid_snap)
            y1 = snap_to_grid(ry_px * scale_y, grid_snap)
            x2 = snap_to_grid((rx_px + rw_px) * scale_x, grid_snap)
            y2 = snap_to_grid((ry_px + rh_px) * scale_y, grid_snap)

            # Ensure minimum room dimension (at least 2m x 2m)
            if (x2 - x1) >= 2.0 and (y2 - y1) >= 2.0:
                room_count += 1
                rooms.append({
                    "id": str(uuid4()),
                    "floor_id": actual_floor_id,
                    "type": "ROOM",
                    "name": f"Room {room_count}",
                    "room_type": "STANDARD",
                    "geometry": {
                        "type": "rectangle",
                        "coordinates": [
                            {"x": x1, "y": y1},
                            {"x": x2, "y": y1},
                            {"x": x2, "y": y2},
                            {"x": x1, "y": y2}
                        ]
                    },
                    "is_accessible": True
                })

    return {
        "floor_id": actual_floor_id,
        "walls": walls,
        "rooms": rooms,
        "summary": {
            "wall_count": len(walls),
            "room_count": len(rooms),
            "image_resolution": [w_px, h_px],
            "dimensions_meters": [width_meters, height_meters]
        }
    }
