import requests
import json

def test_api():
    url = 'http://127.0.0.1:5000/api/data'
    try:
        print(f"Fetching from {url}...")
        response = requests.get(url, timeout=5)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Data received: {len(data)} items")
            if len(data) > 0:
                print("First item sample:")
                print(json.dumps(data[0], indent=2))
        else:
            print("Failed to get data.")
            print(response.text)
            
    except Exception as e:
        print(f"Error connecting to API: {e}")
        print("Make sure the Flask server is running!")

if __name__ == "__main__":
    test_api()
