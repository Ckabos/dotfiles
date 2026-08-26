#!/usr/bin/env bash
# Mueve la VENTANA activa al siguiente monitor (relativo +1, con vuelta).
# Genérico: no depende de nombres de monitor; Hyprland cicla por todos.
# (Config Lua 0.55+: hyprctl dispatch interpreta la entrada como Lua.)
hyprctl dispatch 'hl.dsp.window.move({ monitor = "+1" })'
