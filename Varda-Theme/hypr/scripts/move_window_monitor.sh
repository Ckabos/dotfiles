#!/usr/bin/env bash

# Define tus monitores reales
monitor_primary="DP-1"
monitor_secondary="HDMI-A-1"

# Obtiene el monitor actual y workspace actual
current_monitor_id=$(hyprctl activewindow -j | jq -r '.monitor')
current_monitor=$(hyprctl monitors -j | jq -r ".[] | select(.id == $current_monitor_id) | .name")
current_workspace=$(hyprctl activeworkspace -j | jq -r '.id')

echo "Current monitor: $current_monitor"
echo "Current workspace: $current_workspace"

# Determina el monitor destino
if [[ "$current_monitor" == "$monitor_primary" ]]; then
  target_monitor="$monitor_secondary"
else
  target_monitor="$monitor_primary"
fi

echo "Target monitor: $target_monitor"

# Cambia al workspace deseado en el monitor destino (creándolo si no existe)
hyprctl dispatch workspace "$current_workspace"

# Mueve la ventana activa al workspace destino
hyprctl dispatch movetoworkspace "$current_workspace"

# Mueve la ventana al monitor destino
hyprctl dispatch movewindow mon:"$target_monitor"

