#!/bin/bash

# =========================================================================
# SCRIPT DE SALUDO DINÁMICO PARA HYPRLOCK
# Descripción: Genera un saludo basado en la hora local del sistema.
# =========================================================================

# -------------------------------------------------------------------------
# 1. EXTRACCIÓN DEL USUARIO (EN MEMORIA)
# -------------------------------------------------------------------------
# En lugar de leer archivos del disco (grep a hyprlock.conf), utilizamos 
# la variable de entorno nativa de Linux $USER.
# El sufijo ( ${var^} ) es una expansión de parámetros de bash que 
# capitaliza automáticamente la primera letra (ej. efrain -> Efrain).
username="${USER^}"

# Verificación de seguridad en caso de que el entorno esté incompleto
if [ -z "$username" ]; then
    username="Usuario"
fi

# -------------------------------------------------------------------------
# 2. EXTRACCIÓN DE LA HORA (PREVENCIÓN DE OCTAL BUG)
# -------------------------------------------------------------------------
# Utilizamos el parámetro %-H (nota el guion medio). Esto instruye a 'date'
# a devolver la hora sin el cero a la izquierda (ej. "8" en lugar de "08").
# Esto evita que Bash intente evaluar la variable como base octal.
hour=$(date +%-H)

# -------------------------------------------------------------------------
# 3. LÓGICA DE SALUDO (RANGOS DE TIEMPO)
# -------------------------------------------------------------------------
# Evaluaciones aritméticas seguras utilizando variables sin padding.
if [ "$hour" -ge 5 ] && [ "$hour" -lt 12 ]; then
    greeting="Good Morning"
elif [ "$hour" -ge 12 ] && [ "$hour" -lt 17 ]; then
    greeting="Good Afternoon"
elif [ "$hour" -ge 17 ] && [ "$hour" -lt 21 ]; then
    greeting="Good Evening"
elif [ "$hour" -ge 21 ] && [ "$hour" -lt 24 ]; then
    greeting="Good Night"
else
    # Cubre desde la medianoche hasta las 4:59 AM
    greeting="GO TO SLEEP!"
fi

# -------------------------------------------------------------------------
# 4. SALIDA ESTÁNDAR
# -------------------------------------------------------------------------
echo -e "Hello, $username! $greeting"
