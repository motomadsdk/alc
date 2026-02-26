# ✅ Installation & Setup Verification

## Prerequisites Check

Before running the application, verify you have:

```powershell
# Check Python version (should be 3.11+)
python --version

# Check if pip works
pip --version

# Check if virtual environment is activated
# You should see (.venv) at start of terminal prompt
```

## Setup Steps

### 1. Navigate to Project Directory
```powershell
cd "C:\Users\mjoen\OneDrive\MOTO\SCRIPTS\AUDIO LATENCY CALC"
```

### 2. Activate Virtual Environment
```powershell
.\.venv\Scripts\Activate.ps1
```

If you get an execution policy error:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 3. Install/Update Dependencies
```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

Expected output should include:
```
Successfully installed:
✓ flask==3.0.0
✓ gunicorn==21.2.0
✓ pandas==2.1.4
✓ numpy==1.24.3
✓ python-dotenv==1.0.0
✓ werkzeug==3.0.1
✓ reportlab==4.0.7
✓ pillow==10.1.0
```

### 4. Verify Data Files
```powershell
# Check if CSV exists
Test-Path "MOTO Audio delay - Ark1.csv"

# Should output: True
```

### 5. Run Application
```powershell
python app.py
```

Expected console output:
```
[2026-02-24 22:58:45,673] INFO in app: Initializing application...
[2026-02-24 22:58:45,685] INFO in app: 859 devices loaded successfully
[2026-02-24 22:58:45,686] INFO in app: Application initialized successfully
* Running on http://127.0.0.1:5000
```

---

## Verification Checklist

### ✅ Imports
```powershell
python -c "import app; print('App imports OK')"
python -c "import pdf_generator; print('PDF generator OK')"
```

### ✅ Data Loading
```powershell
python -c "from csv_handler import DeviceDataHandler; devices = DeviceDataHandler.load_devices(); print(f'Loaded {len(devices)} devices')"
```

Expected: `Loaded 859 devices`

### ✅ CSV Files Present
```powershell
ls *.csv

# Should show:
# - MOTO Audio delay - Ark1.csv
# - device_network_cnf.csv  
# - sources.csv
# - traffic_log.csv
```

### ✅ Template Files
```powershell
Test-Path "templates/index.html"
Test-Path "static/css/enhanced_style.css"
Test-Path "static/js/script.js"
Test-Path "static/js/pdf-export.js"
```

All should return: `True`

### ✅ Configuration
```powershell
# Optional: Create .env file for custom settings
@"
FLASK_ENV=development
FLASK_DEBUG=1
APP_PORT=5000
"@ | Out-File .env

cat .env
```

---

## Running the App

### Development Mode
```powershell
python app.py
# or for hot-reload:
flask --app app run --debug
```

### Production Mode with Gunicorn
```powershell
gunicorn -c gunicorn.conf.py app:app
```

### Docker (if available)
```powershell
docker build -t audio-latency-calc .
docker run -p 5000:5000 audio-latency-calc
```

---

## Accessing the Application

### Local Access
- **URL**: http://localhost:5000
- **Alternative**: http://127.0.0.1:5000
- **Port**: 5000 (configurable in config.py)

### Features Check
1. ✅ Page loads (dark theme visible)
2. ✅ Device library displays 859 devices
3. ✅ Search works (try "Dante")
4. ✅ Can add devices to chain
5. ✅ Latency calculates correctly
6. ✅ PDF export button present
7. ✅ Export generates professional PDF

---

## Troubleshooting

### Issue: Module not found
```
Error: ModuleNotFoundError: No module named 'flask'
```
**Solution**: 
```powershell
pip install -r requirements.txt
```

### Issue: CSV file not found
```
Error: FileNotFoundError: MOTO Audio delay - Ark1.csv
```
**Solution**:
```powershell
# Verify CSV exists
ls *.csv

# Check current directory
pwd
```

### Issue: Port already in use
```
Error: Address already in use
```
**Solution**:
```powershell
# Change port in .env
echo "APP_PORT=5001" >> .env

# Or kill process on port 5000
Stop-Process -Port 5000
```

### Issue: PDF export fails
```
Error: Failed to generate PDF
```
**Solution**:
```powershell
# Verify reportlab installed
pip install reportlab==4.0.7

# Verify pillow installed
pip install pillow==10.1.0
```

### Issue: CSS/JS not loading
```
Browser console shows 404 errors
```
**Solution**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Check file paths are correct

---

## Performance Verification

### Load Time Test
```powershell
# Time how long app takes to load
Measure-Command { python app.py } | Select-Object TotalMilliseconds
```

Expected: 2-5 seconds for first run

### Memory Usage
```powershell
# Check memory while running
Get-Process python | Select-Object Name, WorkingSet

# Should be under 500MB for this app
```

### PDF Generation Speed
1. Add 5-10 devices to chain
2. Click export
3. Should complete in 2-5 seconds

---

## Development Tools

### Testing
```powershell
python -m pytest test_utils.py -v
```

Expected: 7 tests passed

### Code Quality
```powershell
# Install linter
pip install pylint

# Check code quality
pylint app.py
```

### Format Check
```powershell
# Install formatter
pip install black

# Check code formatting
black --check .
```

---

## File Structure Verification

```
C:\Users\mjoen\OneDrive\MOTO\SCRIPTS\AUDIO LATENCY CALC\
├── app.py                          ✓ Main application
├── config.py                       ✓ Configuration
├── logger.py                       ✓ Logging setup
├── utils.py                        ✓ Utility functions
├── csv_handler.py                  ✓ CSV operations
├── image_handler.py                ✓ Image handling
├── pdf_generator.py                ✓ PDF generation (NEW)
├── requirements.txt                ✓ Dependencies
├── Dockerfile                      ✓ Docker config
├── gunicorn.conf.py                ✓ Production config
│
├── templates/
│   └── index.html                  ✓ Main HTML (UPDATED)
│
├── static/
│   ├── css/
│   │   ├── style.css               ✓ Original CSS
│   │   └── enhanced_style.css      ✓ New professional CSS (750+ lines)
│   ├── js/
│   │   ├── script.js               ✓ Main JavaScript (UPDATED)
│   │   └── pdf-export.js           ✓ PDF export module (NEW)
│   └── images/
│       └── (image files)           ✓ Device images
│
├── .env.example                    ✓ Environment template
├── README.md                       ✓ Main documentation
├── QUICKSTART.md                   ✓ Quick start guide
├── BEST_PRACTICES.md               ✓ Best practices
├── IMPROVEMENTS.md                 ✓ Features documented
├── CHANGELOG.md                    ✓ Version history
├── FINAL_SUMMARY.md                ✓ Complete summary (NEW)
├── USER_GUIDE.md                   ✓ User guide (NEW)
└── README_IMPROVEMENTS.md          ✓ Improvements overview
```

---

## Database/CSV Files

### Required CSV Files
```
✓ MOTO Audio delay - Ark1.csv          (859 devices)
✓ device_network_cnf.csv               (network config)
✓ sources.csv                          (audio sources)
```

### Generated Log Files
```
traffic_log.csv                        (API usage tracking)
audit_csv                              (audit directory, if exists)
```

---

## Next Steps

### 1. Start Application
```powershell
python app.py
```

### 2. Open Browser
Navigate to: http://localhost:5000

### 3. Test Features
- [ ] Device library loads
- [ ] Search works
- [ ] Can add/remove devices
- [ ] Latency calculates
- [ ] PDF exports successfully
- [ ] Audio test plays

### 4. Try PDF Export
1. Add 3-5 devices
2. Click "📄 PDF Export"
3. Verify PDF downloads
4. Open PDF and verify flowchart displays correctly

---

## Support & Documentation

### Quick Help
```powershell
# View app configuration
cat config.py

# Check device data
python -c "from csv_handler import DeviceDataHandler; import json; devices = DeviceDataHandler.load_devices(); print(json.dumps([d for d in devices[:2]], indent=2))"

# Test PDF generation
python -c "from pdf_generator import generate_flowchart_pdf; pdf = generate_flowchart_pdf([{'name': 'Test Device', 'inputType': 'Dante', 'outputType': 'Dante', 'latency': 5}], 5); print(f'Generated {len(pdf)} bytes')"
```

### Documentation Files
- 📖 [USER_GUIDE.md](USER_GUIDE.md) - How to use the app
- 📋 [FINAL_SUMMARY.md](FINAL_SUMMARY.md) - Complete project summary
- 🚀 [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- 💡 [BEST_PRACTICES.md](BEST_PRACTICES.md) - Best practices
- 📝 [IMPROVEMENTS.md](IMPROVEMENTS.md) - Feature details

---

## ✅ Deployment Ready

Your application is now:
- ✓ Fully functional locally
- ✓ Ready for production deployment
- ✓ Dockerizable (uses Dockerfile)
- ✓ Gunicorn configured
- ✓ Environment-based configuration
- ✓ Comprehensive error handling

---

**Everything is set up and ready to go! 🚀**

For issues or questions, check the documentation files listed above.
