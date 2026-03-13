"""
generar_assets.py - Genera icon.png, splash.png y adaptive-icon.png
para la app Expo a partir del logo de Tacos Aragon.
"""

from PIL import Image, ImageDraw
import numpy as np
import os

LOGO_SRC = r"C:\Users\gumaro_gonzalez\Desktop\tax_aragon_bot\web\static\logos\logo1.png"
ASSETS   = r"C:\Users\gumaro_gonzalez\Desktop\ecosistema-aragon\tacos-aragon-app\assets"
os.makedirs(ASSETS, exist_ok=True)

NARANJA  = (255, 107, 53)
BLANCO   = (255, 255, 255)

logo = Image.open(LOGO_SRC).convert("RGBA")

def quitar_fondo_blanco(img, umbral=230):
    data = np.array(img)
    mask = (data[:,:,0] > umbral) & (data[:,:,1] > umbral) & (data[:,:,2] > umbral)
    data[mask, 3] = 0
    return Image.fromarray(data)

# ── 1. icon.png  1024x1024 ────────────────────────────────────────────────────
SIZE = 1024
icon = Image.new("RGB", (SIZE, SIZE), NARANJA)
logo_sz = int(SIZE * 0.78)
logo_r  = quitar_fondo_blanco(logo.resize((logo_sz, logo_sz), Image.LANCZOS))
off = (SIZE - logo_sz) // 2
icon.paste(logo_r, (off, off), logo_r)
icon.save(os.path.join(ASSETS, "icon.png"), "PNG")
print("[OK] icon.png")

# ── 2. splash.png  1284x2778 ─────────────────────────────────────────────────
W, H = 1284, 2778
splash = Image.new("RGB", (W, H), NARANJA)
draw = ImageDraw.Draw(splash)
for y in range(H):
    t  = y / H
    r2 = int(NARANJA[0] * (1 - t * 0.22))
    g2 = int(NARANJA[1] * (1 - t * 0.22))
    b2 = int(NARANJA[2] * (1 - t * 0.22))
    draw.line([(0, y), (W, y)], fill=(r2, g2, b2))
lw  = int(W * 0.70)
ly  = int(H * 0.38) - lw // 2
lg  = quitar_fondo_blanco(logo.resize((lw, lw), Image.LANCZOS))
splash.paste(lg, ((W - lw) // 2, ly), lg)
splash.save(os.path.join(ASSETS, "splash.png"), "PNG")
print("[OK] splash.png")

# ── 3. adaptive-icon.png  1024x1024 (transparente) ───────────────────────────
adap = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
la   = int(SIZE * 0.82)
lr   = logo.resize((la, la), Image.LANCZOS)
oa   = (SIZE - la) // 2
adap.paste(lr, (oa, oa), lr)
adap.save(os.path.join(ASSETS, "adaptive-icon.png"), "PNG")
print("[OK] adaptive-icon.png")

print("[LISTO] Assets en:", ASSETS)
