"""
Source Sheet Layout Analysis Service
====================================
A robust document layout analyzer specifically tuned for Hebrew/Aramaic source sheets.

Uses multiple detection strategies:
1. Projection Profile Analysis - finds gaps by summing pixel intensities
2. Contour-Based Detection - finds connected text regions
3. Smart Merging - combines related regions
4. Column Detection - handles multi-column layouts

Author: AI Assistant
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from PIL import Image
import io
import base64
from dataclasses import dataclass
from typing import List, Tuple, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)


@dataclass
class BoundingBox:
    """Represents a detected text region"""
    x: int      # Left edge (pixels)
    y: int      # Top edge (pixels)
    width: int  # Width (pixels)
    height: int # Height (pixels)
    confidence: float = 1.0
    
    @property
    def x2(self) -> int:
        return self.x + self.width
    
    @property
    def y2(self) -> int:
        return self.y + self.height
    
    @property
    def area(self) -> int:
        return self.width * self.height
    
    @property
    def center(self) -> Tuple[int, int]:
        return (self.x + self.width // 2, self.y + self.height // 2)
    
    def overlaps(self, other: 'BoundingBox', threshold: float = 0.3) -> bool:
        """Check if boxes overlap significantly"""
        x_overlap = max(0, min(self.x2, other.x2) - max(self.x, other.x))
        y_overlap = max(0, min(self.y2, other.y2) - max(self.y, other.y))
        overlap_area = x_overlap * y_overlap
        min_area = min(self.area, other.area)
        return (overlap_area / min_area) > threshold if min_area > 0 else False
    
    def merge(self, other: 'BoundingBox') -> 'BoundingBox':
        """Merge two boxes into one"""
        new_x = min(self.x, other.x)
        new_y = min(self.y, other.y)
        new_x2 = max(self.x2, other.x2)
        new_y2 = max(self.y2, other.y2)
        return BoundingBox(new_x, new_y, new_x2 - new_x, new_y2 - new_y)
    
    def to_normalized(self, img_width: int, img_height: int) -> dict:
        """Convert to 0-1000 normalized coordinates"""
        return {
            'title': '',
            'box_2d': [
                int((self.y / img_height) * 1000),
                int((self.x / img_width) * 1000),
                int((self.y2 / img_height) * 1000),
                int((self.x2 / img_width) * 1000)
            ]
        }


class LayoutAnalyzer:
    """
    Comprehensive document layout analyzer
    """
    
    def __init__(self, image: np.ndarray):
        self.original = image
        self.height, self.width = image.shape[:2]
        self.gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        self.binary = None
        self.boxes: List[BoundingBox] = []
        
    def preprocess(self):
        """Prepare image for analysis"""
        # Denoise
        denoised = cv2.fastNlMeansDenoising(self.gray, h=10)
        
        # Adaptive threshold - works better for documents with varying lighting
        self.binary = cv2.adaptiveThreshold(
            denoised, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            blockSize=15,
            C=10
        )
        
        # Remove small noise
        kernel_noise = np.ones((2, 2), np.uint8)
        self.binary = cv2.morphologyEx(self.binary, cv2.MORPH_OPEN, kernel_noise)
        
        logger.info(f"Preprocessed image: {self.width}x{self.height}")
        return self
    
    def find_horizontal_gaps(self) -> List[int]:
        """
        Find horizontal gaps (white rows) using projection profile
        Returns Y coordinates of gap centers
        """
        # Calculate horizontal projection (sum of each row)
        h_projection = np.sum(self.binary, axis=1)
        
        # Normalize to 0-1
        h_projection = h_projection / (self.width * 255)
        
        # Find rows with very low ink density (less than 5%)
        threshold = 0.05
        gaps = []
        in_gap = False
        gap_start = 0
        
        for y, density in enumerate(h_projection):
            if density < threshold:
                if not in_gap:
                    in_gap = True
                    gap_start = y
            else:
                if in_gap:
                    gap_end = y
                    gap_height = gap_end - gap_start
                    # Only consider gaps that are at least 0.5% of image height
                    if gap_height >= self.height * 0.005:
                        gaps.append((gap_start + gap_end) // 2)
                    in_gap = False
        
        logger.info(f"Found {len(gaps)} horizontal gaps")
        return gaps
    
    def find_vertical_gaps(self) -> List[int]:
        """
        Find vertical gaps (white columns) using projection profile
        Returns X coordinates of gap centers
        """
        # Calculate vertical projection (sum of each column)
        v_projection = np.sum(self.binary, axis=0)
        
        # Normalize
        v_projection = v_projection / (self.height * 255)
        
        # Find columns with very low ink density
        threshold = 0.03
        gaps = []
        in_gap = False
        gap_start = 0
        
        for x, density in enumerate(v_projection):
            if density < threshold:
                if not in_gap:
                    in_gap = True
                    gap_start = x
            else:
                if in_gap:
                    gap_end = x
                    gap_width = gap_end - gap_start
                    # Only consider gaps that are at least 2% of image width
                    if gap_width >= self.width * 0.02:
                        gaps.append((gap_start + gap_end) // 2)
                    in_gap = False
        
        logger.info(f"Found {len(gaps)} vertical gaps")
        return gaps
    
    def detect_via_contours(self) -> List[BoundingBox]:
        """
        Detect text blocks using contour analysis
        """
        # Connect text using morphological operations
        # Horizontal kernel - connects characters into words/lines
        kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
        connected_h = cv2.dilate(self.binary, kernel_h, iterations=2)
        
        # Vertical kernel - connects lines into paragraphs
        kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 15))
        connected_v = cv2.dilate(connected_h, kernel_v, iterations=2)
        
        # Final connection to merge nearby blocks
        kernel_final = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 25))
        connected = cv2.dilate(connected_v, kernel_final, iterations=2)
        
        # Find contours
        contours, _ = cv2.findContours(connected, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        boxes = []
        min_area = self.width * self.height * 0.005  # At least 0.5% of page
        max_area = self.width * self.height * 0.95   # Not the whole page
        
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            area = w * h
            
            # Filter by size
            if area < min_area or area > max_area:
                continue
            if w < 50 or h < 30:  # Too small
                continue
            
            # Add some padding
            padding = 5
            x = max(0, x - padding)
            y = max(0, y - padding)
            w = min(self.width - x, w + 2 * padding)
            h = min(self.height - y, h + 2 * padding)
            
            boxes.append(BoundingBox(x, y, w, h))
        
        logger.info(f"Contour detection found {len(boxes)} regions")
        return boxes
    
    def detect_via_projection(self) -> List[BoundingBox]:
        """
        Detect text blocks using projection profile analysis
        Creates a grid from horizontal and vertical gaps
        """
        h_gaps = self.find_horizontal_gaps()
        v_gaps = self.find_vertical_gaps()
        
        # Add image boundaries
        y_splits = [0] + sorted(h_gaps) + [self.height]
        x_splits = [0] + sorted(v_gaps) + [self.width]
        
        boxes = []
        min_height = self.height * 0.03
        min_width = self.width * 0.1
        
        for i in range(len(y_splits) - 1):
            for j in range(len(x_splits) - 1):
                y1, y2 = y_splits[i], y_splits[i + 1]
                x1, x2 = x_splits[j], x_splits[j + 1]
                
                w = x2 - x1
                h = y2 - y1
                
                if h >= min_height and w >= min_width:
                    # Check if this region actually has content
                    region = self.binary[y1:y2, x1:x2]
                    ink_density = np.sum(region) / (w * h * 255)
                    
                    if ink_density > 0.02:  # At least 2% ink
                        boxes.append(BoundingBox(x1, y1, w, h))
        
        logger.info(f"Projection detection found {len(boxes)} regions")
        return boxes
    
    def merge_overlapping(self, boxes: List[BoundingBox]) -> List[BoundingBox]:
        """
        Merge overlapping bounding boxes
        """
        if not boxes:
            return boxes
        
        merged = list(boxes)
        changed = True
        
        while changed:
            changed = False
            new_merged = []
            used = set()
            
            for i, box1 in enumerate(merged):
                if i in used:
                    continue
                    
                current = box1
                used.add(i)
                
                for j, box2 in enumerate(merged):
                    if j in used or j <= i:
                        continue
                    
                    if current.overlaps(box2, threshold=0.2):
                        current = current.merge(box2)
                        used.add(j)
                        changed = True
                
                new_merged.append(current)
            
            merged = new_merged
        
        logger.info(f"After merging: {len(merged)} regions")
        return merged
    
    def filter_boxes(self, boxes: List[BoundingBox]) -> List[BoundingBox]:
        """
        Filter out invalid boxes
        """
        min_area = self.width * self.height * 0.01
        max_area = self.width * self.height * 0.9
        
        filtered = []
        for box in boxes:
            if box.area < min_area or box.area > max_area:
                continue
            if box.width < 50 or box.height < 30:
                continue
            filtered.append(box)
        
        return filtered
    
    def sort_boxes(self, boxes: List[BoundingBox]) -> List[BoundingBox]:
        """
        Sort boxes in reading order (top to bottom, right to left for Hebrew)
        """
        # Group by rows (within 10% height tolerance)
        row_tolerance = self.height * 0.05
        rows = []
        
        for box in sorted(boxes, key=lambda b: b.y):
            placed = False
            for row in rows:
                if abs(box.y - row[0].y) < row_tolerance:
                    row.append(box)
                    placed = True
                    break
            if not placed:
                rows.append([box])
        
        # Sort each row by X (right to left for Hebrew)
        result = []
        for row in rows:
            row.sort(key=lambda b: -b.x)  # Reverse for RTL
            result.extend(row)
        
        return result
    
    def analyze(self) -> List[BoundingBox]:
        """
        Run full analysis pipeline
        """
        self.preprocess()
        
        # Try both detection methods
        contour_boxes = self.detect_via_contours()
        projection_boxes = self.detect_via_projection()
        
        # Use whichever found more regions (indicates better detection)
        if len(contour_boxes) >= len(projection_boxes):
            boxes = contour_boxes
            logger.info("Using contour-based detection")
        else:
            boxes = projection_boxes
            logger.info("Using projection-based detection")
        
        # If both methods found very few, combine them
        if len(contour_boxes) < 3 and len(projection_boxes) < 3:
            boxes = contour_boxes + projection_boxes
            logger.info("Combining both detection methods")
        
        # Post-process
        boxes = self.merge_overlapping(boxes)
        boxes = self.filter_boxes(boxes)
        boxes = self.sort_boxes(boxes)
        
        # If still nothing, return full page
        if not boxes:
            boxes = [BoundingBox(0, 0, self.width, self.height)]
            logger.warning("No regions detected, returning full page")
        
        self.boxes = boxes
        return boxes
    
    def get_normalized_regions(self) -> List[dict]:
        """
        Get regions in normalized format for frontend
        """
        regions = []
        for i, box in enumerate(self.boxes):
            region = box.to_normalized(self.width, self.height)
            region['title'] = f'Source {i + 1}'
            regions.append(region)
        return regions


@app.route('/analyze', methods=['POST'])
def analyze():
    """Endpoint to analyze uploaded image"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        image_bytes = file.read()
        
        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'error': 'Invalid image'}), 400
        
        # Analyze
        analyzer = LayoutAnalyzer(img)
        analyzer.analyze()
        regions = analyzer.get_normalized_regions()
        
        # Return result
        img_base64 = base64.b64encode(image_bytes).decode('utf-8')
        mime_type = file.content_type or 'image/png'
        
        return jsonify({
            'success': True,
            'regions': regions,
            'image': f'data:{mime_type};base64,{img_base64}',
            'count': len(regions),
            'width': analyzer.width,
            'height': analyzer.height
        })
        
    except Exception as e:
        logger.exception("Error analyzing image")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'version': '2.0'})


if __name__ == '__main__':
    print("=" * 50)
    print("Source Sheet Layout Analysis Service")
    print("=" * 50)
    print("Starting on http://localhost:5000")
    print("Endpoints:")
    print("  POST /analyze - Upload image for analysis")
    print("  GET  /health  - Health check")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)
