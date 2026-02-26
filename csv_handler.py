"""
CSV handling module for device data, network config, and tracking.
"""
import os
import csv
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
from utils import normalize_name, parse_time, extract_brand, safe_parse_csv_row

logger = logging.getLogger(__name__)


class CSVHandler:
    """Handles CSV file operations."""
    
    @staticmethod
    def safe_read_csv(filepath: str, encoding: str = 'utf-8') -> List[Dict[str, str]]:
        """
        Safely read CSV file with error handling.
        
        Args:
            filepath: Path to CSV file
            encoding: File encoding
            
        Returns:
            List of dictionaries representing rows
        """
        data = []
        
        if not os.path.exists(filepath):
            logger.warning(f"CSV file not found: {filepath}")
            return data
        
        try:
            with open(filepath, mode='r', encoding=encoding) as f:
                reader = csv.DictReader(f)
                if reader.fieldnames is None:
                    logger.error(f"CSV file is empty or has no header: {filepath}")
                    return data
                
                for idx, row in enumerate(reader, 1):
                    try:
                        if not any(row.values()):  # Skip empty rows
                            continue
                        data.append(row)
                    except Exception as e:
                        logger.warning(f"Error parsing row {idx} in {filepath}: {e}")
                        continue
        
        except Exception as e:
            logger.error(f"Error reading CSV file {filepath}: {e}")
        
        return data
    
    @staticmethod
    def append_csv_row(filepath: str, fieldnames: List[str], row_data: Dict[str, Any],
                       encoding: str = 'utf-8') -> bool:
        """
        Append a row to CSV file, creating it if needed.
        
        Args:
            filepath: Path to CSV file
            fieldnames: List of field names
            row_data: Dictionary of field names to values
            encoding: File encoding
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            file_exists = os.path.exists(filepath)
            
            with open(filepath, mode='a', encoding=encoding, newline='') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                
                if not file_exists:
                    writer.writeheader()
                
                writer.writerow(row_data)
            
            return True
        
        except Exception as e:
            logger.error(f"Error appending to CSV {filepath}: {e}")
            return False


class NetworkConfigHandler:
    """Handles network configuration loading."""
    
    def __init__(self, config_file: str):
        self.config_file = config_file
        self.configs: Dict[str, Dict[str, Any]] = {}
        self.load()
    
    def load(self) -> None:
        """Load network configurations from CSV."""
        self.configs = {}
        
        if not os.path.exists(self.config_file):
            logger.debug(f"Network config file not found: {self.config_file}")
            return
        
        try:
            rows = CSVHandler.safe_read_csv(self.config_file)
            
            for row in rows:
                device_name = row.get('device_name', '').strip()
                if not device_name:
                    continue
                
                if device_name not in self.configs:
                    self.configs[device_name] = {'interfaces': []}
                
                self.configs[device_name]['interfaces'].append({
                    'name': row.get('interface_name', 'IP'),
                    'protocol': row.get('protocol', '-'),
                    'ip_type': row.get('ip_type', '-')
                })
            
            logger.info(f"Loaded network config for {len(self.configs)} devices")
        
        except Exception as e:
            logger.error(f"Error parsing network config: {e}")
    
    def get(self, device_name: str) -> Dict[str, Any]:
        """
        Get network config for device.
        
        Args:
            device_name: Device name
            
        Returns:
            dict: Network config or default
        """
        return self.configs.get(device_name, {
            'interfaces': [{'name': 'IP', 'protocol': '-', 'ip_type': '-'}]
        })


class DeviceDataHandler:
    """Handles device data loading from multiple CSVs in a directory."""
    
    def __init__(self, csv_dir: str, network_handler: NetworkConfigHandler, 
                 image_finder=None):
        self.csv_dir = csv_dir
        self.network_handler = network_handler
        self.image_finder = image_finder
        self.devices: List[Dict[str, Any]] = []
    
    def load(self) -> List[Dict[str, Any]]:
        """
        Load devices from all CSV files in the directory.
        
        Returns:
            List of device dictionaries
        """
        self.devices = []
        
        if not os.path.exists(self.csv_dir) or not os.path.isdir(self.csv_dir):
            logger.error(f"CSV data directory not found: {self.csv_dir}")
            return self.devices
        
        try:
            global_idx = 0
            for filename in os.listdir(self.csv_dir):
                if not filename.endswith('.csv'):
                    continue
                # Skip the master and sources csvs
                if filename in ['MOTO Audio delay - Ark1.csv', 'sources.csv']:
                    continue
                    
                filepath = os.path.join(self.csv_dir, filename)
                rows = CSVHandler.safe_read_csv(filepath)
                
                for row in rows:
                    try:
                        global_idx += 1
                        device = self._parse_device_row(row, global_idx)
                        if device:
                            self.devices.append(device)
                    except Exception as e:
                        logger.warning(f"Error parsing device row {global_idx} in {filename}: {e}")
            
            logger.info(f"Loaded {len(self.devices)} devices from {self.csv_dir}")
        
        except Exception as e:
            logger.error(f"Error loading devices from directory: {e}")
        
        return self.devices
    
    def _parse_device_row(self, row: dict, idx: int) -> Optional[Dict[str, Any]]:
        """Parse a single device row from CSV."""
        # Handle both old and new column names for compatibility
        name = row.get('Device Name', row.get('Name', '')).strip() if row else None
        
        if not name:
            return None
        
        return {
            'id': idx,
            'name': name,
            'brand': extract_brand(name),
            'latency': parse_time(row.get('Latency', '')),
            'display_time': row.get('Latency', ''),
            'image': self.image_finder(name) if self.image_finder else None,
            'source': row.get('Source', '-').strip(),
            'network_config': self.network_handler.get(name),
            'raw_data': {
                'input_type': row.get('Input Type', '').strip(),
                'output_type': row.get('Output Type', '').strip(),
                'input_sr': row.get('Input Sample Rate', row.get('Input SR', '')).strip(),
                'output_sr': row.get('Output Sample Rate', row.get('Output SR', '')).strip(),
                'input_count': row.get('Input Count', '2').strip(),
                'output_count': row.get('Output Count', '2').strip(),
            }
        }


class TrafficLogger:
    """Handles traffic/usage logging."""
    
    def __init__(self, log_file: str):
        self.log_file = log_file
        self.fieldnames = ['Timestamp', 'Event', 'Device', 'Brand', 'UserID']
    
    def log_event(self, event: str, device: str, brand: str, user_id: str = 'anonymous') -> bool:
        """
        Log a user event.
        
        Args:
            event: Event name
            device: Device name
            brand: Brand name
            user_id: User identifier
            
        Returns:
            bool: True if successful, False otherwise
        """
        row_data = {
            'Timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'Event': event,
            'Device': device,
            'Brand': brand,
            'UserID': user_id
        }
        
        return CSVHandler.append_csv_row(
            self.log_file,
            self.fieldnames,
            row_data
        )
    
    def get_popularity(self) -> Dict[str, int]:
        """
        Get device popularity from traffic log.
        
        Returns:
            dict: Device name -> count mapping
        """
        popularity = {}
        
        rows = CSVHandler.safe_read_csv(self.log_file)
        for row in rows:
            device = row.get('Device', '')
            if device:
                popularity[device] = popularity.get(device, 0) + 1
        
        return popularity
