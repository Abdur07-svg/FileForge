import urllib.request
import os

os.makedirs("vendor", exist_ok=True)

libraries = {
    "vendor/pdf-lib.min.js": "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js",
    "vendor/pdf.min.js": "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    "vendor/pdf.worker.min.js": "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
    "vendor/jszip.min.js": "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
}

headers = {'User-Agent': 'Mozilla/5.0'}

for local_path, url in libraries.items():
    print(f"Downloading {url} to {local_path}...")
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response, open(local_path, 'wb') as out_file:
        out_file.write(response.read())
    print(f"Saved {local_path} ({os.path.getsize(local_path)} bytes)")

print("All vendor libraries downloaded successfully!")
