#!/bin/bash

# =========================================================================
# SCRIPT DE RED PARA HYPRLOCK (Optimizado)
# Descripción: Detecta la conexión activa (Ethernet/Wi-Fi), extrae el SSID
#              y calcula la intensidad de la señal de forma eficiente.
# =========================================================================

# -------------------------------------------------------------------------
# 1. LECTURA DE CONFIGURACIÓN (Segura)
# -------------------------------------------------------------------------
# Extraemos el flag de visibilidad del SSID. 
# Añadimos 2>/dev/null por si el archivo es movido temporalmente.
show_ssid=$(grep -oP '^\$wifi-mode\s*=\s*\K\S+' ~/.config/hypr/hyprlock.conf 2>/dev/null)

# Fallback robusto: Si grep no encuentra nada o devuelve un error, 
# forzamos por defecto a "false" para evitar variables nulas.
if [ "$show_ssid" != "true" ]; then
    show_ssid="false"
fi

# -------------------------------------------------------------------------
# 2. DETECCIÓN DE ETHERNET (Vía sysfs, coste cero)
# -------------------------------------------------------------------------
# En lugar de usar nmcli, consultamos directamente al kernel si existe 
# una interfaz ethernet (e*) cuyo estado operativo sea "up".
# Esto toma 0 milisegundos y nos ahorra ejecutar comandos de red pesados.
if grep -q "up" /sys/class/net/e*/operstate 2>/dev/null; then
    echo "󰈀  Ethernet"
    exit 0
fi

# -------------------------------------------------------------------------
# 3. DETECCIÓN DE WI-FI (Vía sysfs)
# -------------------------------------------------------------------------
# Verificamos si la tarjeta inalámbrica (w*) está encendida.
# Si está apagada (rfkill o desconectada), salimos inmediatamente.
if ! grep -q "up" /sys/class/net/w*/operstate 2>/dev/null; then
    echo "󰤮  Wi-Fi Off"
    exit 0
fi


# -------------------------------------------------------------------------
# 4. EXTRACCIÓN DE DATOS DE RED
# -------------------------------------------------------------------------
# Forzamos el idioma a inglés (LC_ALL=C) para que 'ACTIVE' devuelva 'yes' 
# sin importar si el sistema operativo del usuario está en español ('sí').
wifi_info=$(LC_ALL=C nmcli -t -f ACTIVE,SSID,SIGNAL dev wifi 2>/dev/null | grep '^yes')

# Si la interfaz está "up" pero no hemos negociado una IP con ningún router:
if [ -z "$wifi_info" ]; then
    echo "󰤮  Desconectado"
    exit 0
fi

# El formato devuelto es "yes:NombreDeRed:85". 
# Usamos cut para extraer los campos correspondientes.
ssid=$(echo "$wifi_info" | cut -d':' -f2)
signal_strength=$(echo "$wifi_info" | cut -d':' -f3)

# -------------------------------------------------------------------------
# 5. LÓGICA DE ICONOS (RANGOS DE SEÑAL)
# -------------------------------------------------------------------------
# Array base cero de iconos Nerd Fonts.
wifi_icons=("󰤯" "󰤟" "󰤢" "󰤥" "󰤨")

# Limitador matemático (Clamp): Protege contra valores anómalos de nmcli.
# Asegura que la señal nunca sea menor a 0 ni mayor a 100.
if [ "$signal_strength" -lt 0 ]; then signal_strength=0; fi
if [ "$signal_strength" -gt 100 ]; then signal_strength=100; fi

# Cálculo de índice: Al dividir entre 25 garantizamos 5 rangos exactos (0 a 4).
icon_index=$((signal_strength / 25))

# Asignación del glifo final
wifi_icon=${wifi_icons[$icon_index]}

# -------------------------------------------------------------------------
# 6. SALIDA ESTÁNDAR
# -------------------------------------------------------------------------
# Aplicamos la preferencia del usuario extraída de hyprlock.conf
if [ "$show_ssid" = "true" ]; then
    echo "$wifi_icon  $ssid"
else
    echo "$wifi_icon  Conectado"
fi
