#!/bin/bash
# Mueve el WORKSPACE activo al siguiente monitor (relativo +1, con vuelta).
# Genérico: no depende de nombres de monitor; Hyprland cicla por todos.
# (Nota: Mod+T ya llama al dispatcher nativo directo desde keybinds.lua;
#  este script queda como utilidad manual equivalente.)
hyprctl dispatch 'hl.dsp.workspace.move({ monitor = "+1" })'
