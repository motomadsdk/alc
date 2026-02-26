"""
Application configuration module.
Supports environment variables for deployment flexibility.
"""
import os
from pathlib import Path

# Get the base directory
BASE_DIR = Path(__file__).resolve().parent

class Config:
    """Base configuration."""
    # Flask
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    TESTING = os.getenv('TESTING', 'False').lower() == 'true'
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # File paths
    CSV_DIR = os.getenv('CSV_DIR', 'data')
    NETWORK_CNF_FILE = os.getenv('NETWORK_CNF_FILE', 'device_network_cnf.csv')
    TRAFFIC_LOG_FILE = os.getenv('TRAFFIC_LOG_FILE', 'traffic_log.csv')
    SOURCES_CSV_FILE = os.getenv('SOURCES_CSV_FILE', 'sources.csv')
    
    # Image folder
    IMAGE_FOLDER = os.getenv('IMAGE_FOLDER', None)
    if IMAGE_FOLDER is None:
        IMAGE_FOLDER = 'images' if os.path.exists(os.path.join(BASE_DIR, 'images')) else os.path.join('static', 'images')
    
    # Cache settings
    CACHE_TTL = int(os.getenv('CACHE_TTL', '60'))  # seconds
    
    # Server settings
    PORT = int(os.getenv('PORT', '5000'))
    HOST = os.getenv('HOST', '0.0.0.0')
    
    # Audio generation settings
    AUDIO_MAX_LATENCY_MS = int(os.getenv('AUDIO_MAX_LATENCY_MS', '1000'))
    AUDIO_SAMPLE_RATE = int(os.getenv('AUDIO_SAMPLE_RATE', '44100'))
    AUDIO_BEEP_FREQ = int(os.getenv('AUDIO_BEEP_FREQ', '1000'))
    AUDIO_BEEP_DURATION_MS = int(os.getenv('AUDIO_BEEP_DURATION_MS', '100'))
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', os.path.join(BASE_DIR, 'app.log'))
    
    @classmethod
    def validate(cls):
        """Validate configuration files and directories exist."""
        if not os.path.exists(cls.CSV_DIR) or not os.path.isdir(cls.CSV_DIR):
            raise FileNotFoundError(f"Missing data directory: {cls.CSV_DIR}")


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    LOG_LEVEL = 'WARNING'


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    CACHE_TTL = 0  # Disable cache for tests


# Select config based on environment
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config(env=None):
    """Get configuration object based on environment."""
    if env is None:
        env = os.getenv('FLASK_ENV', 'development')
    return config.get(env, config['default'])
