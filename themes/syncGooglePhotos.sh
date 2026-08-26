#!/bin/bash
# syncGooglePhotos.sh
# Sincroniza un álbum público de Google Photos a una carpeta local.

# === CONFIGURACIÓN ===
ALBUM_URL="https://photos.app.goo.gl/h7EE46K7qDgLpQUv9"
DEST_DIR="$HOME/Imágenes/Wallpapers/Remote"
LOG_FILE="$DEST_DIR/sync.log"

# === INICIO ===
mkdir -p "$DEST_DIR"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Iniciando sincronización..." >> "$LOG_FILE"

# Forzar PATH para encontrar gallery-dl si el servicio no lo ve
export PATH="$HOME/.local/bin:$PATH"

if ! command -v gallery-dl &> /dev/null; then
    echo "ERROR: gallery-dl no está instalado en el PATH." >> "$LOG_FILE"
    exit 1
fi

# gallery-dl es inteligente: solo bajará las fotos nuevas
gallery-dl --directory "$DEST_DIR" --ugoira-conv --no-mtime "$ALBUM_URL" 2>> "$LOG_FILE"

if [ $? -eq 0 ]; then
    echo "Sincronización completada exitosamente." >> "$LOG_FILE"
else
    echo "ERROR durante la sincronización. Revisa el log." >> "$LOG_FILE"
fi

# Limpiamos nombres de archivos con espacios y caracteres raros (para evitar errores en AGS/bash)
cd "$DEST_DIR" || exit 1
for f in *\ *; do 
    if [ -f "$f" ]; then
        # Reemplazar espacios por guiones bajos y limpiar otros caracteres
        new_name=$(echo "$f" | tr ' ' '_' | tr -cd '[:alnum:]_.-')
        mv "$f" "$new_name"
    fi
done

echo "=== FIN ===" >> "$LOG_FILE"
