"""
Logging configuration for the application.
"""
import logging
import os
from logging.handlers import RotatingFileHandler
from config import Config

def setup_logging(app):
    """Configure logging for Flask application."""
    if not app.debug:
        # Ensure log directory exists
        log_dir = os.path.dirname(Config.LOG_FILE)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)
        
        # Create rotating file handler
        file_handler = RotatingFileHandler(
            Config.LOG_FILE,
            maxBytes=10485760,  # 10MB
            backupCount=10
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(getattr(logging, Config.LOG_LEVEL))
        app.logger.addHandler(file_handler)
        app.logger.setLevel(getattr(logging, Config.LOG_LEVEL))
    
    # Also log to console
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, Config.LOG_LEVEL))
    console_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s'
    ))
    app.logger.addHandler(console_handler)
    
    return app.logger
