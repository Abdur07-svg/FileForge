import os
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES_DIR = os.path.join(BASE_DIR, 'android', 'app', 'src', 'main', 'res')
SRC_ICON = os.path.join(BASE_DIR, 'assets', 'icons', 'icon-512x512.png')

DENSITIES = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

img = Image.open(SRC_ICON)

for folder, size in DENSITIES.items():
    folder_path = os.path.join(RES_DIR, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    # Standard launcher icon
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(os.path.join(folder_path, 'ic_launcher.png'), 'PNG')
    resized.save(os.path.join(folder_path, 'ic_launcher_round.png'), 'PNG')
    
    # Foreground icon for adaptive icon
    fg_size = int(size * 108 / 72) if folder == 'mipmap-xxhdpi' else int(size * 1.5)
    fg_resized = img.resize((size, size), Image.LANCZOS)
    fg_canvas = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
    offset = ((fg_size - size) // 2, (fg_size - size) // 2)
    fg_canvas.paste(fg_resized, offset)
    fg_canvas.save(os.path.join(folder_path, 'ic_launcher_foreground.png'), 'PNG')

print("Android mipmap icons generated successfully!")
