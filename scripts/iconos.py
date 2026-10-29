#!/usr/bin/env python3
"""Iconos y pantalla de arranque de Salimos para Android e iPhone.  python3 scripts/iconos.py

Parte de dos dibujos de 1024 px que están en img/ (los dos sacados de img/icono.svg, con la
misma letra Plus Jakarta Sans):
  - icono-fuente-1024.png: el «S?» blanco y ámbar sobre el azul noche, A SANGRE (sin esquinas
    redondeadas: cada sistema recorta las suyas).
  - icono-simbolo-1024.png: solo el «S?», sobre transparente.
Solo hace falta Python y Pillow. Escribe directamente en android/ e ios/."""
import os, sys
try:
    from PIL import Image
except ImportError:
    sys.exit('Falta Pillow: python3 -m pip install Pillow')

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOCHE = (15, 23, 42, 255)        # #0F172A, el fondo del icono
LIENZO = (250, 248, 255, 255)    # #faf8ff, el fondo de la app (surface de Stitch)
ICONO = Image.open(os.path.join(RAIZ, 'img', 'icono-fuente-1024.png')).convert('RGBA')
SIMBOLO = Image.open(os.path.join(RAIZ, 'img', 'icono-simbolo-1024.png')).convert('RGBA')

def icono(lado):
    return ICONO.resize((lado, lado), Image.LANCZOS)

def simbolo_en(lado, proporcion, fondo):
    """Lienzo cuadrado de `lado` con el «S?» ocupando `proporcion` del ancho."""
    s = SIMBOLO.crop(SIMBOLO.getbbox())
    ancho = int(lado * proporcion); alto = int(s.height * ancho / s.width)
    s = s.resize((ancho, alto), Image.LANCZOS)
    im = Image.new('RGBA', (lado, lado), fondo)
    im.paste(s, ((lado - ancho) // 2, (lado - alto) // 2), s)
    return im

def guardar(im, *ruta):
    destino = os.path.join(RAIZ, *ruta)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    im.save(destino, 'PNG')

hechos = 0
# ---------------------------------------------------------------- Android
RES = 'android/app/src/main/res'
for dpi, lado in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    guardar(icono(lado), RES, f'mipmap-{dpi}', 'ic_launcher.png')
    guardar(icono(lado), RES, f'mipmap-{dpi}', 'ic_launcher_round.png')
    # Adaptativo: el sistema recorta un círculo; el símbolo va dentro de la zona segura.
    guardar(simbolo_en(lado * 2, 0.46, (0, 0, 0, 0)), RES, f'mipmap-{dpi}', 'ic_launcher_foreground.png')
    hechos += 3
with open(os.path.join(RAIZ, RES, 'values/ic_launcher_background.xml'), 'w', encoding='utf-8') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0F172A</color>\n</resources>\n')
for sobra in ('drawable/ic_launcher_background.xml', 'drawable-v24/ic_launcher_foreground.xml'):
    ruta = os.path.join(RAIZ, RES, sobra)
    if os.path.exists(ruta):
        os.remove(ruta)          # el dibujo de ejemplo de Capacitor

# Pantalla de arranque: el icono centrado sobre el fondo claro de la app.
def arranque(a, b, prop):
    lienzo = Image.new('RGBA', (a, b), LIENZO)
    lado = int(min(a, b) * prop)
    lienzo.paste(icono(lado), ((a - lado) // 2, (b - lado) // 2))
    return lienzo
for dpi, (an, al) in {'mdpi': (320, 480), 'hdpi': (480, 800), 'xhdpi': (720, 1280),
                      'xxhdpi': (960, 1600), 'xxxhdpi': (1280, 1920)}.items():
    guardar(arranque(an, al, 0.30), RES, f'drawable-port-{dpi}', 'splash.png')
    guardar(arranque(al, an, 0.30), RES, f'drawable-land-{dpi}', 'splash.png')
    hechos += 2
guardar(arranque(480, 800, 0.30), RES, 'drawable', 'splash.png'); hechos += 1

# -------------------------------------------------------------------- iOS
# ⚠️ SIN CANAL ALFA: Apple rechaza el icono grande con transparencia.
guardar(icono(1024).convert('RGB'), 'ios/App/App/Assets.xcassets/AppIcon.appiconset', 'AppIcon-512@2x.png'); hechos += 1
splash = arranque(2732, 2732, 0.20)
for nombre in ('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'):
    guardar(splash, 'ios/App/App/Assets.xcassets/Splash.imageset', nombre); hechos += 1

# -------------------------------------------------------------- Tiendas
guardar(icono(512).convert('RGB'), 'tienda', 'icono-play-512.png'); hechos += 1
print(f'{hechos} imágenes escritas.')
