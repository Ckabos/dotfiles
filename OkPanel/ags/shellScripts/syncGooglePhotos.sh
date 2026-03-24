#!/bin/bash
# syncGooglePhotos.sh
ALBUM_URL="https://photos.google.com/u/1/share/AF1QipOtA42jn_ReuQVv8uVXpWl0PNjhXRw7e_EGUT3m-2wOVUUfDsX1OUvm5c8_GL2gvg?key=SUxqZ1BMSVVUdjJjbk1DSzZwZ0VEenpxQk1nM3p3"
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
