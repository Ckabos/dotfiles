#!/bin/bash
# syncGooglePhotos.sh
# La URL del álbum es secreta y vive en album.secret.env (gitignored).
# Este script ya puede versionarse sin filtrar nada.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRET_FILE="$SCRIPT_DIR/album.secret.env"

if [ ! -f "$SECRET_FILE" ]; then
    echo "Falta $SECRET_FILE (define ALBUM_URL). Es un secreto, no se versiona." >&2
    exit 1
fi
# shellcheck source=/dev/null
source "$SECRET_FILE"

DEST_DIR="$HOME/Imágenes/Wallpapers/Remote"

mkdir -p "$DEST_DIR"

# Usamos un contenedor de docker o una herramienta como 'gallery-dl'
# que es excelente para bajar álbumes completos sin configurar APIs complejas.
if ! command -v gallery-dl &> /dev/null; then
    echo "Instalando gallery-dl..."
    pip install gallery-dl
fi

# Descarga las fotos nuevas del álbum
gallery-dl --directory "$DEST_DIR" "$ALBUM_URL"

# Limpiamos nombres de archivos con espacios (para evitar errores en AGS)
cd "$DEST_DIR"
for f in *\ *; do [ -f "$f" ] && mv "$f" "${f// /_}"; done
