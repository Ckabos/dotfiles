# dotfiles

Configuración completa de mi escritorio: **Arch Linux + Hyprland + OkPanel** (barra propia sobre AGS/Astal).

Esta rama (`dotfiles`) reúne **todo en un solo lugar**. Las otras ramas del repo:
`master` = OkPanel como proyecto publicable · `varda-theme` = repo del sistema de temas.

---

## 📁 Estructura

```
.config/
├── hypr/         Hyprland — config en Lua (0.55+): keybinds, monitores, arranque, tema dinámico
├── OkPanel/      temas/config de la barra (el proyecto vive en ./OkPanel y en la rama master)
├── systemd/user/ servicios: okpanel.service (límites de RAM), wallpaper-rotator.service
├── fontconfig/   fix de fuentes WPS (Cambria/Candara)
├── kitty/ rofi/ wal/            terminal, launcher, pywal (color dinámico)
├── yazi/ ranger/ nvim/          gestores de archivos, editor
├── cava/ btop/ fastfetch/ cliphist/
OkPanel/          proyecto AGS/Astal de la barra (incluye contrib/ con los parches)
.zshrc .zprofile .bashrc .gitconfig
```

Los **secretos** (API keys, llaves SSH, `*.secret.env`) están **fuera del repo por diseño** — ver `.gitignore`.

---

## 🛡️ Stack anti-crash (IMPORTANTE para que el sistema no truene)

OkPanel corre sobre las librerías **Astal**, que tienen dos bugs que tumbaban el panel entero.
Los parches viven en **`OkPanel/contrib/`** y son **indispensables**:

| Parche | Qué arregla |
|---|---|
| `libastal-hyprland-utf8fix` | El panel se **congelaba** con títulos de ventana no-UTF8 (WPS Office abriendo archivos con acento). Sanea el JSON del IPC de Hyprland. |
| `libastal-network-bssid-fix` | El panel **crasheaba (SIGSEGV)** en redes wifi densas: Astal indexa APs por BSSID y `nm_access_point_get_bssid()` puede devolver NULL. Descarta los APs sin BSSID. |

### Instalar los parches

```sh
cd OkPanel/contrib/libastal-hyprland-utf8fix   && makepkg -f && sudo pacman -U *.pkg.tar.zst
cd ../libastal-network-bssid-fix               && makepkg -f --holdver && sudo pacman -U *.pkg.tar.zst
```

### FIJAR las versiones parcheadas (si no, `yay -Syu` las revierte)

En `/etc/pacman.conf`:

```ini
IgnorePkg = libastal-hyprland-git libastal-network-git hyprland
```

(`hyprland` fijado en 0.56.1 hasta migrar del todo; la config ya está en Lua para 0.57.)

### Límites de RAM del panel

`okpanel.service` incluye `MemoryHigh=1800M` / `MemoryMax=2500M` para acotar el consumo de gjs.
Se lanza desde Hyprland (`exec-once`), **no** por systemd (evita la carrera de arranque):

```sh
systemctl --user disable okpanel.service   # que lo lance Hyprland, no systemd
```

---

## 🎨 Notas de la config

- **Hyprland en Lua:** migrado de `.conf` (hyprlang, deprecado en 0.57) a Lua. Los `.conf` originales quedan como respaldo/rollback (`rm ~/.config/hypr/hyprland.lua` vuelve al `.conf`).
- **Monitores genéricos:** regla comodín (output vacío) auto-configura N monitores; layout fijo `DP-2 | eDP-1 | HDMI-A-1`. Mover workspace al siguiente monitor: `Mod+T` (relativo `+1`, cicla por todos).
- **Tema dinámico:** `wallpaperUpdate.sh` y `setTheme.sh` (repo Varda-Theme) generan `conf/theme.lua` con los colores del wallpaper.
- **Fuentes WPS:** `fontconfig/conf.d/50-wps-office-fonts.conf` + `ttf-vista-fonts` arreglan Cambria/Candara faltantes.

---

## 📦 Assets fuera del repo (se instalan/generan aparte)

Temas por app, cursores (miku), iconos, fuentes y wallpapers no se versionan aquí (son GB de binarios).
El sistema de temas y sus scripts viven en el repo **Varda-Theme** (rama `varda-theme`).
