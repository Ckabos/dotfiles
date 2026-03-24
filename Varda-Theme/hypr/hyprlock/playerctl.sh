#!/bin/bash

# =========================================================================
# SCRIPT DE REPRODUCTOR MULTIMEDIA PARA HYPRLOCK
# Descripción: Extrae metadatos de MPRIS de forma segura y maneja el
#              truncamiento de texto para no romper la interfaz gráfica.
# =========================================================================

if [ $# -eq 0 ]; then
    echo "Uso: $0 --title | --artist | --album | --source | --source-symbol | --status | --status-symbol"
    exit 1
fi

# -------------------------------------------------------------------------
# 1. FUNCIONES BASE
# -------------------------------------------------------------------------

# Función centralizada para obtener metadatos y evitar redundancia de código
get_metadata() {
    local key=$1
    # Consultamos a todos los reproductores disponibles de forma genérica
    playerctl metadata --format "{{ $key }}" 2>/dev/null
}

# Función para truncar textos largos (Evita que títulos gigantes rompan el widget)
truncate_with_ellipsis() {
    local text=$1
    local max_length=$2
    if [ ${#text} -gt $max_length ]; then
        echo "${text:0:$((max_length - 3))}..."
    else
        echo "$text"
    fi
}

# -------------------------------------------------------------------------
# 2. EVALUACIÓN DE ARGUMENTOS
# -------------------------------------------------------------------------

case "$1" in
--title)
    title=$(get_metadata "xesam:title")
    if [ -n "$title" ]; then
        truncate_with_ellipsis "$title" 28
    else
        echo ""
    fi
    ;;

--artist)
    artist=$(get_metadata "xesam:artist")
    if [ -n "$artist" ]; then
        truncate_with_ellipsis "$artist" 28
    else
        echo ""
    fi
    ;;

--album)
    album=$(get_metadata "xesam:album")
    if [ -n "$album" ]; then
        # LÓGICA CORREGIDA: Truncamos el álbum si existe y es muy largo
        truncate_with_ellipsis "$album" 28 
    else
        # Validamos si hay algo reproduciéndose antes de poner "Sin Álbum"
        status=$(playerctl status 2>/dev/null)
        if [[ "$status" == "Playing" || "$status" == "Paused" ]]; then
            echo "Sin álbum"
        else
            echo ""
        fi
    fi
    ;;

--status-symbol)
    status=$(playerctl status 2>/dev/null)
    if [[ "$status" == "Playing" ]]; then
        echo "󰎆"
    elif [[ "$status" == "Paused" ]]; then
        echo "󰏥"
    else
        echo ""
    fi
    ;;

--status)
    status=$(playerctl status 2>/dev/null)
    if [[ "$status" == "Playing" ]]; then
        echo "Reproduciendo"
    elif [[ "$status" == "Paused" ]]; then
        echo "Pausado"
    else
        echo ""
    fi
    ;;

--source-symbol)
    # MECANISMO CORREGIDO: Usamos playerName en lugar de trackid
    player_name=$(get_metadata "playerName" | tr '[:upper:]' '[:lower:]')
    
    if [[ "$player_name" == *"firefox"* || "$player_name" == *"librewolf"* ]]; then
        echo -e "󰈹"
    elif [[ "$player_name" == *"spotify"* ]]; then
        echo -e ""
    elif [[ "$player_name" == *"chromium"* || "$player_name" == *"chrome"* || "$player_name" == *"brave"* ]]; then
        echo -e ""
    elif [[ "$player_name" == *"vlc"* ]]; then
        echo -e "󰕼"
    elif [ -n "$player_name" ]; then
        # Icono genérico de música si el reproductor no está en la lista
        echo -e "󰎆" 
    else
        echo ""
    fi
    ;;

--source)
    player_name=$(get_metadata "playerName" | tr '[:upper:]' '[:lower:]')
    
    if [[ "$player_name" == *"firefox"* || "$player_name" == *"librewolf"* ]]; then
        echo -e "Firefox"
    elif [[ "$player_name" == *"spotify"* ]]; then
        echo -e "Spotify"
    elif [[ "$player_name" == *"chromium"* || "$player_name" == *"chrome"* ]]; then
        echo -e "Chrome"
    elif [[ "$player_name" == *"brave"* ]]; then
        echo -e "Brave"
    elif [[ "$player_name" == *"vlc"* ]]; then
        echo -e "VLC"
    elif [ -n "$player_name" ]; then
        # Truncamos el nombre del reproductor desconocido por seguridad
        truncate_with_ellipsis "${player_name^}" 10
    else
        echo ""
    fi
    ;;

*)
    echo "Opción inválida: $1"
    echo "Uso: $0 --title | --artist | --album | --source | --source-symbol | --status | --status-symbol"
    exit 1
    ;;
esac
