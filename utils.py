"""
Utility functions for audio latency calculator.
"""
import re
from typing import Optional, Tuple


def parse_time(time_str: str) -> float:
    """
    Parse time string from CSV (e.g., "2,27ms", "0,21ms (round trip)").
    
    Args:
        time_str: Time string to parse
        
    Returns:
        float: Value in milliseconds, 0.0 if parse fails
    """
    if not time_str or not isinstance(time_str, str):
        return 0.0
    
    try:
        # Remove "ms" and other text, replace comma with dot
        clean_str = (time_str.lower()
                    .replace('ms', '')
                    .replace(',', '.')
                    .split('(')[0]
                    .strip())
        
        return float(clean_str)
    except (ValueError, AttributeError):
        return 0.0


def normalize_name(s: Optional[str]) -> str:
    """
    Normalize name for comparison (lowercase, alphanumeric + underscore).
    
    Args:
        s: String to normalize
        
    Returns:
        str: Normalized string
    """
    if not s:
        return ""
    
    # Replace non-alphanumeric with underscore, collapse multiple underscores
    s = re.sub(r'[^a-zA-Z0-9]', '_', s).lower()
    return re.sub(r'_+', '_', s).strip('_')


def extract_brand(device_name: str) -> str:
    """
    Extract brand from device name (first word).
    
    Args:
        device_name: Full device name
        
    Returns:
        str: Brand name
    """
    if not device_name:
        return "Unknown"
    return device_name.split(' ')[0].strip() or "Unknown"


def validate_latency(latency_ms: float, max_latency: float = 1000.0) -> float:
    """
    Validate and constrain latency value.
    
    Args:
        latency_ms: Latency in milliseconds
        max_latency: Maximum allowed latency
        
    Returns:
        float: Validated latency value
    """
    try:
        value = float(latency_ms)
        return max(0, min(max_latency, value))
    except (ValueError, TypeError):
        return 0.0


def validate_filename(filename: str) -> bool:
    """
    Validate filename to prevent path traversal attacks.
    
    Args:
        filename: Filename to validate
        
    Returns:
        bool: True if safe, False otherwise
    """
    # Reject paths with .. or absolute paths
    if '..' in filename or filename.startswith('/'):
        return False
    
    # Only allow alphanumeric, dots, hyphens, underscores
    if not re.match(r'^[a-zA-Z0-9._\-/]+$', filename):
        return False
    
    return True


def safe_parse_csv_row(row: list, expected_length: int, defaults: dict = None) -> dict:
    """
    Safely parse CSV row with defaults.
    
    Args:
        row: CSV row as list
        expected_length: Expected minimum row length
        defaults: Dict of field names to default values
        
    Returns:
        dict: Parsed row data with defaults applied
    """
    defaults = defaults or {}
    
    if not row or len(row) < expected_length:
        return defaults.copy()
    
    return defaults.copy()
