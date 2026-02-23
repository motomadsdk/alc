import os

# Render dynamically assigns a port
port = os.environ.get("PORT", "10000")
bind = f"0.0.0.0:{port}"

# Recommended workers for Render's free tier
workers = 2
