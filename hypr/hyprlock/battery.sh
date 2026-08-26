#!/bin/bash

# =========================================================================
# SCRIPT DE BATERÍA PARA HYPRLOCK
# Descripción: Extrae la capacidad y estado de energía consultando 
#              directamente al kernel a través de la interfaz sysfs.
# =========================================================================

# -------------------------------------------------------------------------
# 1. IDENTIFICACIÓN DINÁMICA DE HARDWARE
# -------------------------------------------------------------------------
# Usamos un glob (BAT*) para encontrar la primera batería disponible. 
# Esto previene errores si el kernel asigna la batería a BAT1 en lugar de BAT0.
BAT_PATH=$(ls -d /sys/class/power_supply/BAT* 2>/dev/null | head -1)

# Manejo de excepciones: Si el directorio no existe (ej. PC de escritorio),
# salimos de forma segura para evitar cálculos nulos.
if [ -z "$BAT_PATH" ]; then
    echo "󰂑 Sin Batería"
    exit 0
fi

# -------------------------------------------------------------------------
# 2. LECTURA DE SENSORES (SYSFS)
# -------------------------------------------------------------------------
# Leemos los valores crudos provistos por el módulo ACPI del kernel.
battery_percentage=$(cat "$BAT_PATH/capacity")
battery_status=$(cat "$BAT_PATH/status")

# -------------------------------------------------------------------------
# 3. LÓGICA DE RENDERIZADO VISUAL
# -------------------------------------------------------------------------
# Array base cero (0-9) con iconos Nerd Fonts de incrementos del 10%.
battery_icons=("󰂃" "󰁺" "󰁻" "󰁼" "󰁽" "󰁾" "󰁿" "󰂀" "󰂁" "󰁹")
charging_icon="󰂄"

# Cálculo de índice: Al dividir entre 10 truncamos el decimal.
# Ej: 85 / 10 = 8 (Devuelve el 9º icono de la lista).
icon_index=$((battery_percentage / 10))

# Prevención de desbordamiento de memoria (Index Out of Bounds).
# Si el porcentaje es 100, la división da 10. Como nuestro array 
# llega hasta el índice 9, forzamos el límite superior.
if [ "$icon_index" -ge 10 ]; then
    icon_index=9
fi

# Asignación del glifo correspondiente
battery_icon=${battery_icons[$icon_index]}

# Interceptamos los estados de ACPI ("Charging" o "Full") para 
# sobrescribir el icono de descarga por el del rayo.
if [ "$battery_status" = "Charging" ] || [ "$battery_status" = "Full" ]; then
    battery_icon="$charging_icon"
fi

# -------------------------------------------------------------------------
# 4. SALIDA ESTÁNDAR
# -------------------------------------------------------------------------
# Pasamos la cadena formateada de vuelta al proceso de Hyprlock.
echo "$battery_percentage% $battery_icon"
