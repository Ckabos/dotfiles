#!/bin/bash
# remoteWallpapers.sh — previsualización ligera del álbum de Google Photos.
#
# Las URLs base de googleusercontent aceptan parámetros de tamaño:
#   =w320-h180-no  → miniatura ligera (preview, ~15-30 KB)
#   =d             → original full-res (descarga al elegir)
#
# La URL secreta del álbum NO vive aquí: se lee de album.secret.env
# (gitignored), única fuente del secreto (compartida con syncGooglePhotos.sh).
#
# Modos:
#   list        Refresca miniaturas e imprime  <hash>\t<thumbPath>\t<descargado:0|1>
#               Sale 3 si no hay red / no se pudo leer el álbum.
#   fetch HASH  Descarga el full-res a Remote/ y imprime su ruta local.
#   downloaded  Imprime las rutas full-res ya descargadas (fallback offline).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRET_FILE="$SCRIPT_DIR/album.secret.env"

CACHE_DIR="$HOME/.cache/OkPanel/remoteWallpapers"
THUMB_DIR="$CACHE_DIR/thumbs"
INDEX="$CACHE_DIR/index.tsv"
FULL_DIR="$HOME/Imágenes/Wallpapers/Remote"
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"

mkdir -p "$THUMB_DIR" "$FULL_DIR"

album_url() {
    [ -f "$SECRET_FILE" ] || return 1
    # shellcheck source=/dev/null
    source "$SECRET_FILE"
    [ -n "${ALBUM_URL:-}" ] || return 1
    printf '%s' "$ALBUM_URL"
}

# Descarga la miniatura de una URL base si falta. Uso: dl_thumb <baseURL>
dl_thumb() {
    local base="$1"
    local hash thumb
    hash="$(printf '%s' "$base" | md5sum | cut -c1-16)"
    thumb="$THUMB_DIR/$hash.jpg"
    if [ ! -s "$thumb" ]; then
        curl -sfL --max-time 25 "${base}=w320-h180-no" -o "$thumb" || rm -f "$thumb"
    fi
}
export -f dl_thumb
export THUMB_DIR

cmd_list() {
    local url page urls
    url="$(album_url)" || { echo "sin URL de álbum" >&2; exit 3; }

    page="$(curl -sfL --max-time 30 -A "$UA" -H "Accept-Language: en-US" "$url" 2>/dev/null || true)"
    urls="$(printf '%s' "$page" \
        | grep -oE 'https://lh3\.googleusercontent\.com/pw/[A-Za-z0-9_-]+' \
        | sort -u || true)"

    [ -n "$urls" ] || exit 3   # sin red / álbum ilegible → el panel usa el fallback

    # Descarga en paralelo solo las miniaturas faltantes.
    printf '%s\n' "$urls" | xargs -P 10 -I {} bash -c 'dl_thumb "$@"' _ {}

    # Reconstruye el índice y emite las filas para el panel.
    : > "$INDEX"
    local hash thumb downloaded
    while IFS= read -r base; do
        [ -n "$base" ] || continue
        hash="$(printf '%s' "$base" | md5sum | cut -c1-16)"
        thumb="$THUMB_DIR/$hash.jpg"
        [ -s "$thumb" ] || continue
        printf '%s\t%s\n' "$hash" "$base" >> "$INDEX"
        downloaded=0
        [ -s "$FULL_DIR/$hash.jpg" ] && downloaded=1
        printf '%s\t%s\t%s\n' "$hash" "$thumb" "$downloaded"
    done <<< "$urls"
}

cmd_fetch() {
    local hash="$1" base dest
    dest="$FULL_DIR/$hash.jpg"
    if [ -s "$dest" ]; then echo "$dest"; return 0; fi
    base="$(grep -P "^$hash\t" "$INDEX" 2>/dev/null | head -n1 | cut -f2)"
    [ -n "$base" ] || { echo "hash desconocido" >&2; exit 4; }
    curl -sfL --max-time 90 "${base}=d" -o "$dest" || { rm -f "$dest"; echo "descarga falló" >&2; exit 5; }
    echo "$dest"
}

cmd_downloaded() {
    find "$FULL_DIR" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) | sort
}

case "${1:-}" in
    list)       cmd_list ;;
    fetch)      cmd_fetch "${2:?falta hash}" ;;
    downloaded) cmd_downloaded ;;
    *) echo "uso: $0 {list|fetch HASH|downloaded}" >&2; exit 64 ;;
esac
