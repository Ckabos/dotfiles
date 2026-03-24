#!/bin/bash
# wallpaperUpdate.sh
# Ejecutado por OkPanel al cambiar wallpaper.
# Argumento $1 = ruta absoluta al wallpaper nuevo.

set -euo pipefail

WALLPAPER="$1"
COLORS_JSON="$HOME/.cache/wal/colors.json"
CONFIG_FILE="$HOME/.config/OkPanel/z4.yaml"

if [ ! -f "$WALLPAPER" ]; then
    echo "wallpaperUpdate: archivo no encontrado: $WALLPAPER"
    exit 1
fi

# ── 1. Generar paleta con pywal ─────────────────────────────────────────────
wal -i "$WALLPAPER" -n -q 2>/dev/null

# ── 2. Actualizar colores en z4.yaml escribiendo en el mismo inode ──────────
# (sed -i crea un nuevo archivo y rompe el file monitor de OkPanel)
python3 << 'PYEOF'
import json, re, colorsys, os

COLORS_JSON = os.path.expanduser("~/.cache/wal/colors.json")
CONFIG_FILE = os.path.expanduser("~/.config/OkPanel/z4.yaml")

# ── Helpers de color ────────────────────────────────────────────────────────
def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def rgb_to_hex(r, g, b):
    return "#{:02X}{:02X}{:02X}".format(int(r*255), int(g*255), int(b*255))

def neonify(hex_color, sat_target=0.95, light_target=0.65):
    """Boost saturación y luminosidad para efecto neón."""
    r, g, b = hex_to_rgb(hex_color)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    # Forzar saturación y luminosidad altas manteniendo el hue del wallpaper
    s = max(s, sat_target)
    l = max(l, light_target)
    l = min(l, 0.80)  # no llegar a blanco
    r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
    return rgb_to_hex(r2, g2, b2)

def adjust_bg(hex_color, min_light=0.15, alpha="80"):
    """
    Evitar que el fondo sea negro puro y añadir transparencia.
    alpha="80" es ~50% de opacidad. "66" es ~40%. "99" es ~60%.
    """
    r, g, b = hex_to_rgb(hex_color)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    l = max(l, min_light) # Si es muy oscuro, lo sube a 15% de luminosidad
    r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
    
    # Añade el canal Alpha al final del código Hexadecimal
    return rgb_to_hex(r2, g2, b2) + alpha

def lighten_fg(hex_color, light_target=0.85):
    """Aclarar el foreground para legibilidad."""
    r, g, b = hex_to_rgb(hex_color)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    l = max(l, light_target)
    r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
    return rgb_to_hex(r2, g2, b2)

# ── Leer paleta de pywal ────────────────────────────────────────────────────
with open(COLORS_JSON) as f:
    wal = json.load(f)

# Aplicamos adjust_bg en lugar de darken y usamos alpha "80"
bg             = adjust_bg(wal["special"]["background"], alpha="80")
fg             = lighten_fg(wal["special"]["foreground"])
# Pywal's color2 y color4 suelen ser más contrastantes que el color1
primary        = neonify(wal["colors"]["color2"])
button_primary = neonify(wal["colors"]["color4"])
warning        = neonify(wal["colors"]["color3"], light_target=0.70)
alert_border   = neonify(wal["colors"]["color5"])

replacements = {
    "background":    bg,
    "foreground":    fg,
    "primary":       primary,
    "buttonPrimary": button_primary,
    "warning":       warning,
    "alertBorder":   alert_border,
    "barBorder":     primary,        # Sincronizamos los bordes de la barra con el color primario
    "windowBorder":  button_primary, # Sincronizamos los bordes de la ventana
}

with open(CONFIG_FILE, "r") as f:
    content = f.read()

# Esta regex ahora buscará y reemplazará cualquier hex (de 6 o de 8 caracteres)
for key, color in replacements.items():
    content = re.sub(
        rf'({key}:\s*")#[0-9a-fA-F]+(")',
        rf'\g<1>{color}\2',
        content
    )

# Escribir en el mismo inode para que el file monitor de OkPanel detecte el cambio
with open(CONFIG_FILE, "r+") as f:
    f.seek(0)
    f.write(content)
    f.truncate()

print(f"wallpaperUpdate: bg={bg} fg={fg} primary={primary} buttonPrimary={button_primary} warning={warning}")
PYEOF
