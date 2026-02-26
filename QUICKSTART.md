# Quick Start Guide

## Installation & Setup (5 minutes)

### 1. Create Virtual Environment
```bash
python -m venv .venv
```

### 2. Activate Virtual Environment
**Windows:**
```bash
.venv\Scripts\activate
```

**macOS/Linux:**
```bash
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
```bash
python app.py
```

The application will start on `http://localhost:5000`

---

## Configuration

### Environment Variables (Optional)
Create a `.env` file in the root directory with any of these settings:

```bash
FLASK_ENV=development
DEBUG=False
PORT=5000
LOG_LEVEL=DEBUG
```

Copy from `.env.example` for a complete template.

---

## Testing

### Run Unit Tests
```bash
python -m unittest test_utils -v
```

### Test Results
All 7 tests should pass:
- ✓ Time parsing
- ✓ Name normalization
- ✓ Brand extraction
- ✓ Latency validation
- ✓ Filename validation

---

## File Overview

| File | Purpose |
|------|---------|
| `app.py` | Main Flask application |
| `config.py` | Configuration management |
| `logger.py` | Logging setup |
| `utils.py` | Utility functions |
| `csv_handler.py` | CSV file operations |
| `image_handler.py` | Image handling |
| `test_utils.py` | Unit tests |

---

## API Endpoints

### GET `/`
Main application interface

### GET `/table`
Table view of all devices

### GET `/api/data`
Get all devices as JSON
```json
[
  {
    "id": 0,
    "name": "Device Name",
    "brand": "Brand",
    "latency": 2.27,
    "display_time": "2,27ms",
    "image": "image.png",
    "source": "source",
    "network_config": {...},
    "raw_data": {...}
  }
]
```

### GET `/api/sources`
Get available sources

### GET `/api/audio_preview?latency=50`
Generate audio demonstration of latency

### POST `/api/track`
Log user events
```json
{
  "event": "click",
  "device": "Device Name",
  "brand": "Brand",
  "user_id": "user123"
}
```

### GET `/health`
Health check endpoint

---

## Logging

Logs are written to:
- **Console**: Always (for development)
- **File**: `app.log` (production only)

View real-time logs:
```bash
tail -f app.log
```

---

## Troubleshooting

### Import Error
```
ModuleNotFoundError: No module named 'flask'
```
**Solution:** Install dependencies: `pip install -r requirements.txt`

### CSV File Not Found
```
Error: CSV file 'MOTO Audio delay - Ark1.csv' not found
```
**Solution:** Ensure CSV file exists in the root directory

### Port Already in Use
```
Address already in use
```
**Solution:** Change port in `.env`: `PORT=5001`

### Images Not Found
Check console logs for:
```
INFO: 5 devices missing images
```
**Solution:** Add images to `static/images/` folder

---

## Production Deployment

### With Gunicorn
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### With Docker
```bash
docker build -t audio-latency .
docker run -p 5000:5000 audio-latency
```

### Environment Variables
Set `FLASK_ENV=production` and `DEBUG=False`

---

## Next Steps

1. **Add Images**: Place device images in `static/images/`
2. **Configure CSV**: Update `MOTO Audio delay - Ark1.csv` with device data
3. **Customize**: Edit templates in `templates/` folder
4. **Monitor**: Check `app.log` for production issues

---

## Support

For detailed information, see [IMPROVEMENTS.md](IMPROVEMENTS.md)
