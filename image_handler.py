"""
Image file handling and matching.
"""
import os
import logging
from typing import Dict, Optional
from utils import normalize_name

logger = logging.getLogger(__name__)


class ImageHandler:
    """Handles image file discovery and matching."""
    
    SUPPORTED_FORMATS = ('.png', '.jpg', '.jpeg', '.svg', '.webp')
    
    def __init__(self, image_folder: str):
        self.image_folder = image_folder
        self.cache: Dict[str, str] = {}  # filename -> relative path
        self.normalized_map: Dict[str, str] = {}  # normalized name -> path
        self._scanned = False
    
    def scan(self) -> None:
        """Recursively scan image folder and build cache."""
        self.cache = {}
        self.normalized_map = {}
        self._scanned = True
        
        if not os.path.exists(self.image_folder):
            logger.warning(f"Image folder not found: {self.image_folder}")
            return
        
        try:
            for root, _, files in os.walk(self.image_folder):
                for file in files:
                    if file.lower().endswith(self.SUPPORTED_FORMATS):
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, self.image_folder).replace('\\', '/')
                        self.cache[file.lower()] = rel_path
            
            self._build_normalized_map()
            logger.info(f"Scanned {len(self.cache)} images from {self.image_folder}")
        
        except Exception as e:
            logger.error(f"Error scanning images: {e}")
    
    def _build_normalized_map(self) -> None:
        """Build normalized name lookup map."""
        for filename, path in self.cache.items():
            name_without_ext = filename.rsplit('.', 1)[0]
            self.normalized_map[name_without_ext.lower()] = path
            self.normalized_map[normalize_name(name_without_ext)] = path
    
    def find(self, device_name: str) -> Optional[str]:
        """
        Find best matching image for device name.
        
        Args:
            device_name: Name of device
            
        Returns:
            str: Relative path to image, or None if not found
        """
        if not self._scanned:
            self.scan()
        
        # Build candidate names in priority order
        candidates = [
            device_name.lower(),
        ]
        
        # Try base name (before arrow)
        base_name = device_name.split('->')[0].strip()
        if base_name.lower() != device_name.lower():
            candidates.append(base_name.lower())
        
        # Try normalized forms
        candidates.append(normalize_name(device_name))
        candidates.append(normalize_name(base_name))
        
        # Try shortened name (before parentheses)
        short_name = base_name.split('(')[0].strip()
        if short_name and short_name != base_name:
            candidates.append(normalize_name(short_name))
        
        # Search candidates
        for candidate in candidates:
            if candidate in self.normalized_map:
                return self.normalized_map[candidate]
        
        return None
    
    def get_missing_images(self, devices: list) -> list:
        """
        Get list of devices missing images.
        
        Args:
            devices: List of device dicts
            
        Returns:
            list: Device names without images
        """
        return [d['name'] for d in devices if d.get('image') is None]
