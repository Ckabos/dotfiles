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
    """Boost saturación y luminosidad para efecto neón estándar (OkPanel)."""
    r, g, b = hex_to_rgb(hex_color)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    s = max(s, sat_target)
    l = max(l, light_target)
    l = min(l, 0.80)
    r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
    return rgb_to_hex(r2, g2, b2)

def extreme_neon(hex_color):
    """Fuerza saturación pura y brillo perfecto para que el borde explote como LED."""
    r, g, b = hex_to_rgb(hex_color)
    h, _, _ = colorsys.rgb_to_hls(r, g, b)
    # Ignoramos la luz/saturación original y forzamos S=1.0 (100%) y L=0.55 (Brillo óptimo puro)
    r2, g2, b2 = colorsys.hls_to_rgb(h, 0.55, 1.0)
    return rgb_to_hex(r2, g2, b2)

def adjust_bg(hex_color, min_light=0.15, alpha="80"):
    """Evitar que el fondo sea negro puro y añadir transparencia."""
    r, g, b = hex_to_rgb(hex_color)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    l = max(l, min_light) 
    r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
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
    "barBorder":     primary,        
    "windowBorder":  button_primary, 
}

with open(CONFIG_FILE, "r") as f:
    content = f.read()

for key, color in replacements.items():
    content = re.sub(
        rf'({key}:\s*")#[0-9a-fA-F]+(")',
        rf'\g<1>{color}\2',
        content
    )

with open(CONFIG_FILE, "r+") as f:
    f.seek(0)
    f.write(content)
    f.truncate()

# ── 3. Escribir colores directamente a Hyprland (theme.conf) ────────────────

# Extraemos la paleta principal de acentos de Pywal
palette = [wal["colors"][f"color{i}"] for i in range(1, 7)]

def get_hue(c):
    return colorsys.rgb_to_hls(*hex_to_rgb(c))[0]

def hue_diff(c1, c2):
    d = abs(get_hue(c1) - get_hue(c2))
    return min(d, 1.0 - d)

# ALGORITMO DE MÁXIMO CONTRASTE: Buscar los dos colores con mayor diferencia de matiz
max_d = -1
best_pair = (palette[0], palette[1])
for i in range(len(palette)):
    for j in range(i+1, len(palette)):
        d = hue_diff(palette[i], palette[j])
        if d > max_d:
            max_d = d
            best_pair = (palette[i], palette[j])

# Buscar el tercer color más alejado posible de los dos primeros
c3_hex = palette[0]
max_min_d = -1
for c in palette:
    if c in best_pair: continue
    d_min = min(hue_diff(c, best_pair[0]), hue_diff(c, best_pair[1]))
    if d_min > max_min_d:
        max_min_d = d_min
        c3_hex = c

# Pasamos los 3 elegidos a EXTREME NEON
c1 = extreme_neon(best_pair[0]).lstrip("#") + "ff"
c2 = extreme_neon(best_pair[1]).lstrip("#") + "ff"
c3 = extreme_neon(c3_hex).lstrip("#") + "ff"

# EFECTO CHASER: Creamos un color de fondo oscuro opaco como separador
dark_bg = adjust_bg(wal["special"]["background"], min_light=0.05, alpha="ff").lstrip("#")

# Gradiente con separadores de sombra. Visualmente son 3 estelas de luz girando.
active_gradient = f"rgba({c1}) rgba({dark_bg}) rgba({c2}) rgba({dark_bg}) rgba({c3}) rgba({dark_bg}) rgba({c1}) 45deg"

# Borde inactivo apagado para que no estorbe la visión
inactive_border = f"rgba({dark_bg})"

hypr_fg = fg.lstrip("#") + "ff"
hypr_primary = extreme_neon(primary).lstrip("#") + "ff"
hypr_bg_hex = bg.lstrip("#")

theme_conf_path = os.path.expanduser("~/.config/hypr/conf/theme.conf")

hypr_content = f"""# =============================================================================
# HYPRLAND THEME - Generado dinámicamente por wallpaperUpdate.sh
# =============================================================================

general {{
    col.active_border = {active_gradient}
    col.inactive_border = {inactive_border}
}}

group {{
    col.border_active = {active_gradient}
    col.border_inactive = {inactive_border}
    col.border_locked_active = {active_gradient}
    col.border_locked_inactive = {inactive_border}

    groupbar {{
        col.active = rgba({hypr_primary})
        col.inactive = rgba({hypr_bg_hex})
        col.locked_active = rgba({hypr_primary})
        col.locked_inactive = rgba({hypr_bg_hex})
        text_color = rgba({hypr_fg})
    }}
}}
"""

with open(theme_conf_path, "w") as f:
    f.write(hypr_content)

# ── 3b. Misma paleta en formato Lua (Hyprland 0.55+) ────────────────────────
# Se escribe theme.lua EN PARALELO al theme.conf: así el config nuevo (lua) y
# el legacy (.conf) quedan sincronizados y el rollback conserva colores.
grad_colors = [c1, dark_bg, c2, dark_bg, c3, dark_bg, c1]
lua_gradient = "{ colors = { " + ", ".join(f'"rgba({x})"' for x in grad_colors) + " }, angle = 45 }"

theme_lua_path = os.path.expanduser("~/.config/hypr/conf/theme.lua")
lua_content = f"""-- =============================================================================
-- HYPRLAND THEME - Generado dinámicamente por wallpaperUpdate.sh
-- =============================================================================

hl.config({{
    general = {{
        col = {{
            active_border = {lua_gradient},
            inactive_border = "rgba({dark_bg})",
        }},
    }},
    group = {{
        col = {{
            border_active = {lua_gradient},
            border_inactive = "rgba({dark_bg})",
            border_locked_active = {lua_gradient},
            border_locked_inactive = "rgba({dark_bg})",
        }},
        groupbar = {{
            col = {{
                active = "rgba({hypr_primary})",
                inactive = "rgba({hypr_bg_hex})",
                locked_active = "rgba({hypr_primary})",
                locked_inactive = "rgba({hypr_bg_hex})",
            }},
            text_color = "rgba({hypr_fg})",
        }},
    }},
}})
"""

with open(theme_lua_path, "w") as f:
    f.write(lua_content)

print(f"wallpaperUpdate: bg={bg} fg={fg} primary={primary} buttonPrimary={button_primary} warning={warning}")
PYEOF
