#!/bin/bash

# --- CONFIGURACIÓN ---
# La URL del álbum ya está definida dentro del script de Python (gphotos_sync.py)
WALLPAPER_DIR=$1
INTERVAL=$2
REMOTE_DIR="$WALLPAPER_DIR/Remote"
PYTHON_SCRAPER="/home/efrain/Varda-Theme/themes/gphotos_sync.py"

echo "Iniciando rotador híbrido táctico de OkPanel."
echo "Buscando local en: $WALLPAPER_DIR"
echo "Usando Scraper de Python para Google Photos."

# Forzar el PATH para encontrar okpanel y python
export PATH="$HOME/.local/bin:/home/efrain/OkPanel/bin:/usr/local/bin:/usr/bin:$PATH"

# Asegurar que la carpeta remota existe (después del chown ya deberías tener permiso)
mkdir -p "$REMOTE_DIR"

while true; do
    # 1. Sincronizar con Google Photos en segundo plano (Python Scraper)
    # Ejecutamos el scraper para que extraiga las URLs frescas y descargue las imágenes
    if [ -f "$PYTHON_SCRAPER" ]; then
        echo "[$(date +'%H:%M:%S')] Lanzando sincronización con Google Photos..."
        python3 "$PYTHON_SCRAPER" > /dev/null 2>&1 &
    else
        echo "[$(date +'%H:%M:%S')] ERROR: No se encontró el script de Python en $PYTHON_SCRAPER"
    fi

    # 2. Elegir un wallpaper al azar (incluyendo la carpeta Remote recién sincronizada)
    RANDOM_WALLPAPER=$(find "$WALLPAPER_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" \) | shuf -n 1)

    if [ -n "$RANDOM_WALLPAPER" ]; then
        echo "[$(date +'%H:%M:%S')] Intentando aplicar: $RANDOM_WALLPAPER"

        # 3. Ejecutar okpanel (esto dispara automáticamente el script de colores/Pywal)
        okpanel wallpaper "$RANDOM_WALLPAPER" 2>&1

        if [ $? -eq 0 ]; then
            echo "-> Cambio exitoso."
        else
            echo "-> ERROR: El comando okpanel falló."
        fi
    else
        echo "Error: No se encontraron imágenes en $WALLPAPER_DIR."
    fi

    echo "Esperando $INTERVAL para el siguiente ciclo..."
    sleep "$INTERVAL"
done
