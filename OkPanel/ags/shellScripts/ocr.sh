#!/usr/bin/env bash
#
# OCR de una región de pantalla: selecciona un área, extrae su texto y lo deja
# en el portapapeles.
#
#   ocr.sh [-l <idiomas>] [-s <escala>] [-k]
#
#   -l  idiomas de tesseract, separados por "+" (default: spa+eng)
#   -s  factor de escala de la captura (default: 2). tesseract acierta bastante
#       más sobre texto grande, y el texto de UI suele venir muy chico; capturar
#       a 2x sale mucho mejor que pasarle los píxeles nativos.
#   -k  conserva el PNG de la región en ~/Imágenes/Screenshots (por defecto el
#       temporal se borra: lo que interesa es el texto, no la imagen).
#
# Salida: el texto reconocido va al portapapeles (wl-copy) y se manda una
# notificación con una vista previa. Si cancelas la selección (Esc / clic
# derecho) termina en silencio, sin notificar ni tocar el portapapeles.

set -uo pipefail

LANGS="spa+eng"
SCALE=2
KEEP_IMAGE=0

while getopts "l:s:kh" opt; do
    case "$opt" in
        l) LANGS="$OPTARG" ;;
        s) SCALE="$OPTARG" ;;
        k) KEEP_IMAGE=1 ;;
        h) sed -n '2,20p' "$0" | sed 's/^# \?//'; exit 0 ;;
        *) exit 1 ;;
    esac
done

notify() { notify-send --app-name="OCR" "$@" >/dev/null 2>&1 || true; }

for cmd in slurp grim tesseract wl-copy; do
    command -v "$cmd" >/dev/null || { notify "Falta '$cmd'" "Instálalo para usar OCR."; exit 1; }
done

# Comprobar que los idiomas pedidos estén instalados: tesseract falla con un
# error poco legible si falta el .traineddata, y es el tropiezo más común.
available="$(tesseract --list-langs 2>/dev/null | tail -n +2)"
missing=""
for lang in ${LANGS//+/ }; do
    grep -qx "$lang" <<<"$available" || missing="$missing $lang"
done
if [ -n "$missing" ]; then
    notify "Faltan idiomas de OCR:$missing" \
        "Instálalos con: sudo pacman -S$(printf ' tesseract-data-%s' $missing)"
    exit 1
fi

# Selección de región. slurp devuelve != 0 al cancelar -> salimos callados.
GEOMETRY="$(slurp 2>/dev/null)" || exit 0
[ -n "$GEOMETRY" ] || exit 0

TMP_IMG="$(mktemp --suffix=.png /tmp/okpanel-ocr-XXXXXX)"
cleanup() { [ "$KEEP_IMAGE" -eq 1 ] || rm -f "$TMP_IMG"; }
trap cleanup EXIT

if ! grim -g "$GEOMETRY" -s "$SCALE" "$TMP_IMG" 2>/dev/null; then
    notify "No se pudo capturar la región"
    exit 1
fi

# "stdout" como salida hace que tesseract escriba el texto directo, sin crear
# un .txt intermedio que luego habría que limpiar.
TEXT="$(tesseract "$TMP_IMG" stdout -l "$LANGS" 2>/dev/null)"
# Recortar los renglones vacíos de los extremos, que tesseract agrega casi
# siempre. Se hace con expansión de bash y NO con `sed|tac`: tac reordena y
# pega renglones cuando el texto no termina en salto de línea (que es
# justamente lo que deja `printf '%s'`), y el orden importa mucho aquí —
# un comando o una IP partidos a la mitad no sirven de nada.
TEXT="${TEXT#"${TEXT%%[![:space:]]*}"}"   # whitespace al inicio
TEXT="${TEXT%"${TEXT##*[![:space:]]}"}"   # whitespace al final

if [ -z "$TEXT" ]; then
    notify "Sin texto reconocible" "No se detectó texto en la región seleccionada."
    exit 0
fi

printf '%s' "$TEXT" | wl-copy

if [ "$KEEP_IMAGE" -eq 1 ]; then
    DEST_DIR="$(xdg-user-dir PICTURES)/Screenshots"
    mkdir -p "$DEST_DIR"
    DEST="$DEST_DIR/$(date +%Y_%m_%d_%H_%M_%S)_ocr.png"
    cp "$TMP_IMG" "$DEST"
fi

# Vista previa corta: la notificación no es para leer el texto completo, sino
# para confirmar que se copió lo correcto.
PREVIEW="$(printf '%s' "$TEXT" | head -c 160)"
[ "${#TEXT}" -gt 160 ] && PREVIEW="$PREVIEW…"
LINES="$(printf '%s\n' "$TEXT" | wc -l)"
notify "Texto copiado (${#TEXT} caracteres, $LINES línea(s))" "$PREVIEW"
