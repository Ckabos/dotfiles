#!/bin/bash

# Obtenemos el ID del workspace enfocado y el ID del monitor actual
CURRENT_WORKSPACE=$(hyprctl activeworkspace -j | jq '.id')
CURRENT_MONITOR_ID=$(hyprctl monitors -j | jq '.[] | select(.focused == true) | .id')

# Buscamos el nombre del OTRO monitor (el que no tiene el foco)
OTHER_MONITOR_NAME=$(hyprctl monitors -j | jq -r ".[] | select(.id != $CURRENT_MONITOR_ID) | .name" | head -n 1)

# Si existe otro monitor, movemos el workspace
if [ -n "$OTHER_MONITOR_NAME" ]; then
    hyprctl dispatch moveworkspacetomonitor "$CURRENT_WORKSPACE $OTHER_MONITOR_NAME"
else
    notify-send "Hyprland" "No se detectó otro monitor para mover el workspace."
fi
