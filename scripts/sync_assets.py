import os
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DEST = os.path.join(BASE_DIR, 'android', 'app', 'src', 'main', 'assets')

def sync_assets():
    os.makedirs(ASSETS_DEST, exist_ok=True)

    # 1. Copy index.html
    shutil.copy2(os.path.join(BASE_DIR, 'index.html'), os.path.join(ASSETS_DEST, 'index.html'))

    # 2. Copy style.css
    shutil.copy2(os.path.join(BASE_DIR, 'style.css'), os.path.join(ASSETS_DEST, 'style.css'))

    # 3. Copy js directory
    shutil.copytree(os.path.join(BASE_DIR, 'js'), os.path.join(ASSETS_DEST, 'js'), dirs_exist_ok=True)

    # 4. Copy assets directory
    shutil.copytree(os.path.join(BASE_DIR, 'assets'), os.path.join(ASSETS_DEST, 'assets'), dirs_exist_ok=True)

    # 5. Copy vendor directory
    shutil.copytree(os.path.join(BASE_DIR, 'vendor'), os.path.join(ASSETS_DEST, 'vendor'), dirs_exist_ok=True)

    print(f"Successfully synced website codebase into Android assets: {ASSETS_DEST}")

if __name__ == '__main__':
    sync_assets()
