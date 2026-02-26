# Best Practices Guide

## Development Workflow

### 1. Before Making Changes

```bash
# Activate environment
.venv\Scripts\activate

# Run tests to ensure everything works
python -m unittest test_utils -v

# Check logs
tail -f app.log
```

### 2. Making Changes

**Keep these principles in mind:**

- **Single Responsibility**: Each file has one purpose
- **DRY (Don't Repeat Yourself)**: Reuse code, don't duplicate
- **Error Handling**: Always wrap operations in try-except
- **Logging**: Log important events and errors
- **Type Hints**: Use type annotations in function signatures
- **Documentation**: Document complex logic with docstrings

### 3. Adding New Features

**Example: Add a new CSV handler**

```python
# In csv_handler.py
class NewHandler:
    """Handle new CSV type."""
    
    def __init__(self, filepath: str):
        """Initialize with file path."""
        self.filepath = filepath
    
    def load(self) -> List[Dict]:
        """Load data from CSV file."""
        try:
            return CSVHandler.safe_read_csv(self.filepath)
        except Exception as e:
            logger.error(f"Error loading data: {e}")
            return []

# In app.py
new_handler = NewHandler(Config.NEW_FILE)
```

### 4. Testing New Code

```python
# In test_utils.py - Add test class
class TestNewFeature(unittest.TestCase):
    def test_something(self):
        result = some_function()
        self.assertEqual(result, expected)

# Run tests
python -m unittest test_utils -v
```

## Code Organization

### Module Organization

**Good:**
```python
# config.py - Contains ONLY configuration
class Config:
    pass

# utils.py - Contains ONLY utility functions
def parse_time(): pass
def validate_filename(): pass

# app.py - Contains ONLY Flask routes
@app.route('/')
def index(): pass
```

**Avoid:**
```python
# ❌ Don't mix concerns
# app.py contains config, utils, AND routes
```

### Function Organization

**Good:**
```python
def get_devices() -> List[Dict]:
    """Get devices with proper error handling."""
    try:
        devices = device_handler.load()
        return devices
    except Exception as e:
        logger.error(f"Error: {e}")
        return []
```

**Avoid:**
```python
# ❌ Unclear function
def process():
    # What does this do?
    pass

# ❌ No error handling
def get_data():
    return something_that_might_fail()
```

## Error Handling Patterns

### Good Pattern 1: Try-Except-Log

```python
def safe_operation(data):
    try:
        result = risky_operation(data)
        logger.debug(f"Operation succeeded")
        return result
    except ValueError as e:
        logger.warning(f"Invalid data: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return None
```

### Good Pattern 2: Early Return

```python
def validate_and_process(data):
    if not data:
        logger.warning("Empty data received")
        return None
    
    if not isinstance(data, dict):
        logger.warning("Expected dict")
        return None
    
    # Safe to proceed
    return process(data)
```

### Good Pattern 3: Context Manager

```python
def read_file(filepath):
    try:
        with open(filepath, 'r') as f:
            return f.read()
    except FileNotFoundError:
        logger.error(f"File not found: {filepath}")
        return None
    except IOError as e:
        logger.error(f"IO error: {e}")
        return None
```

## Logging Best Practices

### Good Logging

```python
# DEBUG - Detailed information
logger.debug(f"Processing device: {device_name}")

# INFO - General information
logger.info(f"Loaded {count} devices")

# WARNING - Something unexpected
logger.warning(f"Device {name} missing image")

# ERROR - Something failed
logger.error(f"Failed to parse CSV: {e}")
```

### Avoid

```python
# ❌ Using print() in production code
print("Something happened")

# ❌ Not logging errors
try:
    something()
except:
    pass  # Silent failure!

# ❌ Logging sensitive data
logger.info(f"User password: {password}")
```

## Configuration Best Practices

### Good Configuration

```python
# In config.py - Centralized
class Config:
    MAX_FILE_SIZE = 10_000_000
    CACHE_TTL = 60
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

# In app.py - Using config
file_size = Config.MAX_FILE_SIZE
```

### Avoid

```python
# ❌ Hardcoded values scattered everywhere
MAX_SIZE = 10000  # In utils.py
TIMEOUT = 30      # In csv_handler.py
DEBUG = True      # In app.py
```

## Security Practices

### Input Validation

```python
# Good - Validate all inputs
@app.route('/api/data')
def get_data():
    filename = request.args.get('file', '')
    if not validate_filename(filename):
        return jsonify({"error": "Invalid filename"}), 400
    return send_file(filename)

# Avoid - Trust user input
@app.route('/api/data')
def get_data():
    filename = request.args.get('file')
    return send_file(filename)  # ❌ Path traversal vulnerability!
```

### Error Messages

```python
# Good - Generic error messages
return jsonify({"error": "Failed to load data"}), 500

# Avoid - Exposing internals
return jsonify({"error": str(e)}), 500  # Shows stack trace!
```

## Testing Best Practices

### Good Tests

```python
class TestParseTime(unittest.TestCase):
    def test_parse_time_basic(self):
        """Test basic time parsing."""
        self.assertEqual(parse_time("2,27ms"), 2.27)
    
    def test_parse_time_invalid(self):
        """Test invalid input."""
        self.assertEqual(parse_time("invalid"), 0.0)
    
    def test_parse_time_edge_cases(self):
        """Test edge cases."""
        self.assertEqual(parse_time(""), 0.0)
        self.assertEqual(parse_time(None), 0.0)
```

### Test Coverage

Run tests regularly:
```bash
# Test everything
python -m unittest test_utils -v

# Or use pytest for better output
pip install pytest
pytest test_utils.py -v --cov
```

## Performance Tips

### 1. Use Caching

```python
# Good - Cache with TTL
devices_cache = None
devices_cache_time = None

def get_devices():
    global devices_cache, devices_cache_time
    if devices_cache and is_cache_valid():
        return devices_cache
    devices_cache = load_devices()
    return devices_cache
```

### 2. Lazy Loading

```python
# Good - Load only when needed
def scan_images():
    if not self._scanned:
        self._do_scan()
        self._scanned = True
```

### 3. Early Exit

```python
# Good - Exit early
def process(data):
    if not data:
        return None
    if len(data) < 1:
        return None
    # Now safe to process
```

## Documentation Standards

### Function Documentation

```python
def parse_time(time_str: str) -> float:
    """
    Parse time string from CSV (e.g., "2,27ms", "0,21ms").
    
    Args:
        time_str: Time string to parse
        
    Returns:
        float: Value in milliseconds, 0.0 if parse fails
        
    Examples:
        >>> parse_time("2,27ms")
        2.27
        >>> parse_time("invalid")
        0.0
    """
```

### Class Documentation

```python
class NetworkConfigHandler:
    """Handle network configuration loading from CSV.
    
    Attributes:
        config_file: Path to network config CSV
        configs: Loaded configurations dict
        
    Example:
        >>> handler = NetworkConfigHandler('config.csv')
        >>> config = handler.get('device_name')
    """
```

## Common Mistakes to Avoid

| ❌ Don't | ✅ Do |
|--------|------|
| Use global variables | Pass data as parameters |
| Ignore errors | Log and handle properly |
| Hardcode values | Use configuration |
| Skip documentation | Document all code |
| Write long functions | Keep functions focused |
| Duplicate code | Create reusable functions |
| Trust user input | Always validate |
| Forget error cases | Handle all cases |

## Code Review Checklist

Before committing code, verify:

- [ ] Code follows module organization
- [ ] All errors are caught and logged
- [ ] Inputs are validated
- [ ] Functions have docstrings
- [ ] Type hints are present
- [ ] No hardcoded values
- [ ] Tests pass (100%)
- [ ] Logs are appropriate
- [ ] No security issues
- [ ] Code is DRY (no duplication)

## Deployment Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] No debug code left
- [ ] `.env` properly configured
- [ ] Secrets not in code
- [ ] Logging configured
- [ ] Error handling complete
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Backup made
- [ ] Rollback plan ready

---

**Remember**: Good code is clean, tested, documented, and secure.
