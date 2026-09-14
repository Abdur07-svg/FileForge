import math
from PIL import Image, ImageDraw

def create_gradient_mask(width, height, color1, color2, color3):
    img = Image.new("RGBA", (width, height))
    for y in range(height):
        for x in range(width):
            t = (x + y) / (width + height)
            if t < 0.5:
                sub_t = t / 0.5
                r = int(color1[0] + (color2[0] - color1[0]) * sub_t)
                g = int(color1[1] + (color2[1] - color1[1]) * sub_t)
                b = int(color1[2] + (color2[2] - color1[2]) * sub_t)
            else:
                sub_t = (t - 0.5) / 0.5
                r = int(color2[0] + (color3[0] - color2[0]) * sub_t)
                g = int(color2[1] + (color3[1] - color2[1]) * sub_t)
                b = int(color2[2] + (color3[2] - color2[2]) * sub_t)
            img.putpixel((x, y), (r, g, b, 255))
    return img

def render_logo(size, is_maskable=False):
    # Supersampling 4x for extreme vector crispness
    scale = 4
    canvas_size = size * scale
    
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if is_maskable:
        # Full solid dark background for maskable PWA icon
        draw.rectangle([0, 0, canvas_size, canvas_size], fill=(8, 12, 20, 255))
        # Inner icon is placed within 70% safe zone
        icon_scale = canvas_size * 0.72 / 48.0
        offset_x = (canvas_size - (48 * icon_scale)) / 2
        offset_y = (canvas_size - (48 * icon_scale)) / 2
    else:
        icon_scale = canvas_size / 48.0
        offset_x = 0
        offset_y = 0

    def pt(x, y):
        return (offset_x + x * icon_scale, offset_y + y * icon_scale)

    # 1. Rounded rectangle base
    x1, y1 = pt(4, 4)
    x2, y2 = pt(44, 44)
    radius = 12 * icon_scale

    # Create gradient layer
    grad = create_gradient_mask(
        canvas_size, canvas_size,
        (99, 102, 241),   # #6366F1
        (139, 92, 246),   # #8B5CF6
        (236, 72, 153)    # #EC4899
    )
    
    # Mask for rounded rect
    mask = Image.new("L", (canvas_size, canvas_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=255)

    img.paste(grad, (0, 0), mask)

    # 2. File sheet with corner fold
    # Path: M14 14 C14 12.8954 14.8954 12 16 12 H27 L34 19 V34 C34 35.1046 33.1046 36 32 36 H16 C14.8954 36 14 35.1046 14 34 V14Z
    file_poly = [
        pt(16, 12),
        pt(27, 12),
        pt(34, 19),
        pt(34, 34),
        pt(32, 36),
        pt(16, 36),
        pt(14, 34),
        pt(14, 14),
        pt(16, 12)
    ]
    draw.polygon(file_poly, fill=(255, 255, 255, 245))

    # 3. Fold corner details
    # Fold shadow: M27 12L34 19H28C27.4477 19 27 18.5523 27 18V12Z
    fold_poly = [pt(27, 12), pt(34, 19), pt(28, 19), pt(27, 18)]
    draw.polygon(fold_poly, fill=(148, 163, 184, 255))
    
    # Fold flap
    flap_poly = [pt(27, 12), pt(27, 18), pt(34, 18)]
    draw.polygon(flap_poly, fill=(203, 213, 225, 255))

    # 4. Lightning Forge Bolt
    # M25 21L19 28H24L23 33L29 26H24L25 21Z
    bolt_poly = [
        pt(25, 21),
        pt(19, 28),
        pt(24, 28),
        pt(23, 33),
        pt(29, 26),
        pt(24, 26),
        pt(25, 21)
    ]
    
    # Lightning gradient (Yellow to Red-Orange)
    bolt_mask = Image.new("L", (canvas_size, canvas_size), 0)
    bolt_draw = ImageDraw.Draw(bolt_mask)
    bolt_draw.polygon(bolt_poly, fill=255)

    bolt_grad = Image.new("RGBA", (canvas_size, canvas_size))
    for y in range(canvas_size):
        t = y / canvas_size
        r = int(245 + (239 - 245) * t)
        g = int(158 + (68 - 158) * t)
        b = int(11 + (68 - 11) * t)
        for x in range(canvas_size):
            bolt_grad.putpixel((x, y), (r, g, b, 255))

    img.paste(bolt_grad, (0, 0), bolt_mask)

    # Downsample with Lanczos for anti-aliasing
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

import os
os.makedirs("assets/icons", exist_ok=True)

# Generate standard icons
render_logo(192, is_maskable=False).save("assets/icons/icon-192x192.png", "PNG")
render_logo(512, is_maskable=False).save("assets/icons/icon-512x512.png", "PNG")

# Generate maskable icons
render_logo(192, is_maskable=True).save("assets/icons/icon-maskable-192x192.png", "PNG")
render_logo(512, is_maskable=True).save("assets/icons/icon-maskable-512x512.png", "PNG")

# Apple Touch Icon & Favicon
render_logo(180, is_maskable=False).save("assets/icons/apple-touch-icon.png", "PNG")
render_logo(32, is_maskable=False).save("assets/icons/favicon-32x32.png", "PNG")

print("PWA Icons generated successfully!")
