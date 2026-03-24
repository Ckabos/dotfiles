#!/bin/bash

# =========================================================================
# SCRIPT DE CLIMA PARA HYPRLOCK
# Descripción: Obtiene la geolocalización por IP y consulta el clima actual
#              usando wttr.in. Diseñado para no bloquear el renderizado.
# Dependencias: curl (peticiones HTTP), jq (procesamiento JSON ligero).
# =========================================================================

# -------------------------------------------------------------------------
# 1. GEOLOCALIZACIÓN
# -------------------------------------------------------------------------
# Utilizamos la API pública de ip-api.com (sin token).
# -s: Modo silencioso, oculta la barra de progreso de curl.
# --max-time 3: Timeout estricto. Aborta la petición a los 3 segundos.
# 2>/dev/null: Redirige los errores estándar a null para no ensuciar el output.
location_data=$(curl -s --max-time 3 "http://ip-api.com/json/" 2>/dev/null)

# -------------------------------------------------------------------------
# 2. EXTRACCIÓN DE DATOS (PARSEO)
# -------------------------------------------------------------------------
# Procesamos el payload JSON devuelto por la API.
# -r: Output "raw", elimina las comillas de los strings JSON devueltos.
# // empty: Si el campo no existe, devuelve vacío en lugar de "null".
CITY=$(echo "$location_data" | jq -r '.city // empty')
COUNTRY=$(echo "$location_data" | jq -r '.countryCode // empty')

# -------------------------------------------------------------------------
# 3. VALIDACIÓN Y SANITIZACIÓN
# -------------------------------------------------------------------------
# Verificamos que las variables no estén vacías (-n) antes de proceder.
if [[ -n "$CITY" && -n "$COUNTRY" ]]; then
    
    # Sanitización de la URL:
    # Reemplazamos todos los espacios en blanco de la variable $CITY por un signo '+'.
    # Ejemplo: "Buenos Aires" se convierte en "Buenos+Aires".
    # Esto previene peticiones GET malformadas.
    CITY_FORMATTED="${CITY// /+}"

    # ---------------------------------------------------------------------
    # 4. PETICIÓN DEL CLIMA
    # ---------------------------------------------------------------------
    # Consultamos wttr.in solicitando un formato específico.
    # %c = Condición (emoji), %C = Condición (texto), %t = Temperatura.
    # Mantenemos el timeout de 3 segundos como medida de seguridad.
    weather_info=$(curl -s --max-time 3 "wttr.in/${CITY_FORMATTED}?format=%c+%C+%t" 2>/dev/null)

    # ---------------------------------------------------------------------
    # 5. MANEJO DE ERRORES DE RESPUESTA
    # ---------------------------------------------------------------------
    # wttr.in ocasionalmente falla devolviendo páginas HTML de error 503 
    # o strings indicando "Unknown location". Filtramos esos falsos positivos.
    if [[ -n "$weather_info" && "$weather_info" != *"<html"* && "$weather_info" != *"Unknown location"* ]]; then
        # Salida exitosa (El formato que Hyprlock renderizará)
        echo "$COUNTRY, $CITY: $weather_info"
    else
        # Fallo silencioso controlado
        echo "Clima no disponible ($CITY)"
    fi
else
    # Fallo en la etapa de geolocalización
    echo "Ubicación desconocida"
fi
